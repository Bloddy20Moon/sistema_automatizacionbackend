import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get("dni");
    const periodo = searchParams.get("periodo"); // Opcional ej. "2026-07"

    if (!dni) {
      return NextResponse.json(
        { success: false, error: "El parámetro 'dni' es obligatorio. Ejemplo: /api/reports/advisor?dni=74980211" },
        { status: 400 }
      );
    }

    const periodoFilter = periodo ? `AND TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : "";

    // 1. Resumen y KPIs individuales del Asesor
    const kpis: any = await prisma.$queryRawUnsafe(`
      SELECT 
        "dniAsesor" AS dni,
        "nombreAsesor" AS nombre,
        campana AS campana_frecuente,
        COUNT(*)::int AS total_ingresadas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END)::int AS total_pendientes,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS total_caidas,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS pct_efectividad,
        COUNT(DISTINCT "idOt")::int AS ordenes_unicas
      FROM "Sale"
      WHERE "dniAsesor" = '${dni}'
      ${periodoFilter}
      GROUP BY "dniAsesor", "nombreAsesor", campana
      ORDER BY total_ingresadas DESC
      LIMIT 1;
    `);

    if (!kpis || kpis.length === 0) {
      return NextResponse.json(
        { success: false, message: `No se encontraron ventas para el asesor con DNI ${dni}.` },
        { status: 404 }
      );
    }

    // 2. Desglose por Tipo de Venta (Portabilidad, Renovación, Línea Nueva)
    const tiposVenta: any = await prisma.$queryRawUnsafe(`
      SELECT 
        "tipoVenta" AS tipo_venta,
        COUNT(*)::int AS cantidad,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas
      FROM "Sale"
      WHERE "dniAsesor" = '${dni}'
      ${periodoFilter}
      GROUP BY "tipoVenta"
      ORDER BY cantidad DESC;
    `);

    // 3. Desglose por Tipo de Entrega (DELIVERY vs PICKUP)
    const tiposEntrega: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("tipoEntrega", 'DESCONOCIDO') AS tipo_entrega,
        COUNT(*)::int AS cantidad
      FROM "Sale"
      WHERE "dniAsesor" = '${dni}'
      ${periodoFilter}
      GROUP BY "tipoEntrega";
    `);

    // 4. Motivos de Caída específicos de este Asesor
    const motivosCaida: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("motivoSiebel", 'SIN ESPECIFICAR') AS motivo_caida,
        COUNT(*)::int AS cantidad,
        ROUND(
          (COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM "Sale" WHERE "dniAsesor" = '${dni}' AND estado = 'CAIDA' ${periodoFilter}), 0)) * 100, 2
        ) AS porcentaje
      FROM "Sale"
      WHERE "dniAsesor" = '${dni}' AND estado = 'CAIDA'
      ${periodoFilter}
      GROUP BY "motivoSiebel"
      ORDER BY cantidad DESC;
    `);

    // 5. Últimas 10 ventas del Asesor para la tabla de detalle
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
      WHERE "dniAsesor" = '${dni}'
      ${periodoFilter}
      ORDER BY "fechaVenta" DESC
      LIMIT 10;
    `);

    return NextResponse.json({
      success: true,
      data: {
        kpis_asesor: kpis[0],
        desglose_tipo_venta: tiposVenta,
        desglose_entrega: tiposEntrega,
        analisis_caidas: motivosCaida,
        ultimas_ventas: ultimasVentas,
      },
    });
  } catch (error: any) {
    console.error("Error al consultar asesor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
