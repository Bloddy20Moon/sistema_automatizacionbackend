import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo"); // Opcional ej. "2026-07"

    // 1. Métricas Globales Consolidadas
    const globalStats: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int AS total_ventas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END)::int AS total_pendientes,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS total_caidas,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS efectividad_global_pct,
        COUNT(DISTINCT "idOt")::int AS total_ordenes_unicas,
        COUNT(DISTINCT "dniAsesor")::int AS total_asesores_activos
      FROM "Sale"
      ${periodo ? `WHERE TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : ''}
    `);

    // 2. Rendimiento Consolidado por Campaña (Cola)
    const rendimientoColas: any = await prisma.$queryRawUnsafe(`
      SELECT 
        campana AS cola,
        COUNT(*)::int AS total_ventas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS caidas,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END)::int AS pendientes,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS pct_efectividad
      FROM "Sale"
      ${periodo ? `WHERE TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : ''}
      GROUP BY campana
      ORDER BY total_ventas DESC;
    `);

    // 3. Pareto de Motivos de Caída
    const motivosCaida: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("motivoSiebel", 'SIN ESPECIFICAR') AS motivo,
        COUNT(*)::int AS cantidad,
        ROUND(
          (COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM "Sale" WHERE estado = 'CAIDA'), 0)) * 100, 2
        ) AS porcentaje
      FROM "Sale"
      WHERE estado = 'CAIDA'
      ${periodo ? `AND TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : ''}
      GROUP BY "motivoSiebel"
      ORDER BY cantidad DESC
      LIMIT 10;
    `);

    // 4. Top 10 Asesores
    const topAsesores: any = await prisma.$queryRawUnsafe(`
      SELECT 
        "dniAsesor" AS dni,
        "nombreAsesor" AS nombre,
        COUNT(*)::int AS total_ventas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS caidas,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS pct_efectividad
      FROM "Sale"
      ${periodo ? `WHERE TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : ''}
      GROUP BY "dniAsesor", "nombreAsesor"
      ORDER BY total_ventas DESC
      LIMIT 10;
    `);

    // 5. Desglose por Tipo de Entrega (DELIVERY vs PICKUP)
    const tipoEntregaStats: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE("tipoEntrega", 'DESCONOCIDO') AS tipo_entrega,
        COUNT(*)::int AS total
      FROM "Sale"
      ${periodo ? `WHERE TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'` : ''}
      GROUP BY "tipoEntrega";
    `);

    return NextResponse.json({
      success: true,
      data: {
        resumen_general: globalStats[0] || {},
        rendimiento_por_campana: rendimientoColas,
        analisis_motivos_caida: motivosCaida,
        top_10_asesores: topAsesores,
        distribucion_entrega: tipoEntregaStats,
      },
    });
  } catch (error: any) {
    console.error("Error en reporte consolidado:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
