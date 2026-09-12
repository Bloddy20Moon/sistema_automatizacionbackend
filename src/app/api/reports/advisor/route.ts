import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Desactiva cualquier caché estático de Next.js para que cada petición con diferente DNI responda en tiempo real
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawDni = searchParams.get("dni");
    const rawPeriodo = searchParams.get("periodo"); // Opcional ej. "2026-07"

    if (!rawDni || rawDni.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "El parámetro 'dni' es obligatorio. Ejemplo: /api/reports/advisor?dni=74980211",
        },
        { status: 400 }
      );
    }

    const dni = rawDni.trim();
    const periodoFilter = rawPeriodo && rawPeriodo.trim() !== ""
      ? `AND TO_CHAR("fechaVenta", 'YYYY-MM') = '${rawPeriodo.trim()}'`
      : "";

    // 1. Resumen y KPIs globales del Asesor (todas sus ventas consolidadas)
    const kpis: any = await prisma.$queryRawUnsafe(`
      SELECT 
        TRIM("dniAsesor") AS dni,
        MAX(TRIM("nombreAsesor")) AS nombre,
        COUNT(*)::int AS total_ingresadas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END)::int AS total_pendientes,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS total_caidas,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS pct_efectividad,
        COUNT(DISTINCT "idOt")::int AS ordenes_unicas
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}'
      ${periodoFilter}
      GROUP BY TRIM("dniAsesor");
    `);

    if (!kpis || kpis.length === 0) {
      return NextResponse.json(
        {
          success: false,
          dniConsultado: dni,
          message: `No se encontraron ventas para el asesor con DNI ${dni}.`,
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    // 2. Campañas en las que participa el asesor
    const campanas: any = await prisma.$queryRawUnsafe(`
      SELECT 
        campana,
        COUNT(*)::int AS ventas_en_campana,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}'
      ${periodoFilter}
      GROUP BY campana
      ORDER BY ventas_en_campana DESC;
    `);

    // 3. Desglose por Tipo de Venta (Portabilidad, Renovación, Línea Nueva)
    const tiposVenta: any = await prisma.$queryRawUnsafe(`
      SELECT 
        "tipoVenta" AS tipo_venta,
        COUNT(*)::int AS cantidad,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}'
      ${periodoFilter}
      GROUP BY "tipoVenta"
      ORDER BY cantidad DESC;
    `);

    // 4. Desglose por Tipo de Entrega (DELIVERY vs PICKUP)
    const tiposEntrega: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("tipoEntrega", 'DESCONOCIDO') AS tipo_entrega,
        COUNT(*)::int AS cantidad
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}'
      ${periodoFilter}
      GROUP BY "tipoEntrega";
    `);

    // 5. Motivos de Caída específicos de este Asesor
    const motivosCaida: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("motivoSiebel", 'SIN ESPECIFICAR') AS motivo_caida,
        COUNT(*)::int AS cantidad,
        ROUND(
          (COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM "Sale" WHERE TRIM("dniAsesor") = '${dni}' AND estado = 'CAIDA' ${periodoFilter}), 0)) * 100, 2
        ) AS porcentaje
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}' AND estado = 'CAIDA'
      ${periodoFilter}
      GROUP BY "motivoSiebel"
      ORDER BY cantidad DESC;
    `);

    // 6. Últimas 10 ventas del Asesor para la tabla de detalle
    const ultimasVentas: any = await prisma.$queryRawUnsafe(`
      SELECT 
        "idOt",
        "correlative",
        "fechaVenta",
        "campana",
        "tipoVenta",
        "venta",
        "dniCliente",
        "nombreCliente",
        "numeroPortarRenovar",
        "tipoEntrega",
        "estado",
        "resultadoEntrega",
        "estadoSiebel",
        "motivoSiebel",
        "fechaActivacion"
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${dni}'
      ${periodoFilter}
      ORDER BY "fechaVenta" DESC
      LIMIT 10;
    `);

    return NextResponse.json(
      {
        success: true,
        dniConsultado: dni,
        data: {
          kpis_asesor: kpis[0],
          campanas_participadas: campanas,
          desglose_tipo_venta: tiposVenta,
          desglose_entrega: tiposEntrega,
          analisis_caidas: motivosCaida,
          ultimas_ventas: ultimasVentas,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error al consultar asesor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
