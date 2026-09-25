import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campana = searchParams.get("campana"); // Opcional: filtrar por campaña específica
    const periodo = searchParams.get("periodo") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const soloAlertas = searchParams.get("soloAlertas") === "true"; // Filtrar solo los críticos/alerta

    // 1. Obtener todas las metas del periodo para asesores (targetType = 'USER')
    const metasPeriodo = await prisma.meta.findMany({
      where: {
        period: periodo,
        targetType: "USER",
      },
    });
    const metaMap = new Map<string, number>();
    metasPeriodo.forEach((m) => metaMap.set(m.targetId.trim(), m.quota));

    // 2. Query de agregación por Asesor y Campaña
    const whereConditions: string[] = [];
    if (periodo) {
      whereConditions.push(`TO_CHAR("fechaVenta", 'YYYY-MM') = '${periodo}'`);
    }
    if (campana && campana !== "TODAS") {
      whereConditions.push(`campana = '${campana}'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const advisersQuery: any = await prisma.$queryRawUnsafe(`
      SELECT 
        TRIM("dniAsesor") AS dni,
        "nombreAsesor" AS nombre,
        campana,
        COUNT(*)::int AS total_ventas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS caidas,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END)::int AS pendientes,
        ROUND(
          (COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS efectividad_pct,
        ROUND(
          (COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS tasa_caida_pct
      FROM "Sale"
      ${whereClause}
      GROUP BY TRIM("dniAsesor"), "nombreAsesor", campana
      ORDER BY activadas DESC, total_ventas DESC;
    `);

    // 3. Evaluar Semáforos de Meta y Niveles de Alerta para cada Asesor
    let advisersList = advisersQuery.map((adv: any) => {
      const dni = adv.dni || "";
      const quota = metaMap.get(dni) || 0;
      const activadas = adv.activadas || 0;
      const total = adv.total_ventas || 0;
      const caidas = adv.caidas || 0;
      const efectividad = parseFloat(adv.efectividad_pct || "0");
      const tasaCaida = parseFloat(adv.tasa_caida_pct || "0");

      const pctAvanceMeta = quota > 0 ? parseFloat(((activadas / quota) * 100).toFixed(2)) : 0;

      // Semáforo de Cuota
      let semaforoMeta = "SIN_META";
      if (quota > 0) {
        if (pctAvanceMeta >= 85) semaforoMeta = "VERDE";
        else if (pctAvanceMeta >= 60) semaforoMeta = "AMARILLO";
        else semaforoMeta = "ROJO";
      }

      // Nivel de Alerta Operativa y Diagnóstico
      let nivelAlerta = "OPTIMO"; // 'CRITICO' | 'PRECAUCION' | 'OPTIMO'
      const motivosAlerta: string[] = [];

      if (tasaCaida >= 40) {
        motivosAlerta.push(`Tasa de caídas elevada (${tasaCaida}%)`);
      }
      if (efectividad < 45 && total >= 5) {
        motivosAlerta.push(`Efectividad baja (${efectividad}%)`);
      }
      if (quota > 0 && pctAvanceMeta < 60) {
        motivosAlerta.push(`Avance de meta atrasado (${pctAvanceMeta}%)`);
      }

      if (motivosAlerta.length >= 2 || tasaCaida >= 50 || (quota > 0 && pctAvanceMeta < 40)) {
        nivelAlerta = "CRITICO";
      } else if (motivosAlerta.length === 1) {
        nivelAlerta = "PRECAUCION";
      }

      return {
        dni,
        nombre: adv.nombre,
        campana: adv.campana,
        total_ventas: total,
        activadas,
        caidas,
        pendientes: adv.pendientes,
        efectividad_pct: efectividad,
        tasa_caida_pct: tasaCaida,
        cuota_meta: quota,
        meta_avance_pct: pctAvanceMeta,
        semaforo_meta: semaforoMeta,
        nivel_alerta: nivelAlerta,
        diagnostico_alerta: motivosAlerta.length > 0 ? motivosAlerta.join(" | ") : "Rendimiento dentro de parámetros",
      };
    });

    // 4. Si se solicita solo alertas, filtrar por CRITICO o PRECAUCION
    if (soloAlertas) {
      advisersList = advisersList.filter((a: any) => a.nivel_alerta === "CRITICO" || a.nivel_alerta === "PRECAUCION");
    }

    // 5. Estadísticas de Alertas para la Campaña
    const totalAsesores = advisersList.length;
    const criticosCount = advisersList.filter((a: any) => a.nivel_alerta === "CRITICO").length;
    const precaucionCount = advisersList.filter((a: any) => a.nivel_alerta === "PRECAUCION").length;
    const optimosCount = advisersList.filter((a: any) => a.nivel_alerta === "OPTIMO").length;

    return NextResponse.json({
      success: true,
      periodo,
      campana: campana || "TODAS",
      resumen_alertas: {
        total_asesores: totalAsesores,
        criticos_rojo: criticosCount,
        precaucion_amarillo: precaucionCount,
        optimos_verde: optimosCount,
      },
      data: advisersList,
    });
  } catch (error: any) {
    console.error("Error en reporte de asesores de campaña:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
