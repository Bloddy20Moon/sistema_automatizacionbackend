import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TargetType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7); // YYYY-MM por defecto

    // 1. Obtener todas las metas configuradas para el periodo
    const metas = await prisma.meta.findMany({
      where: { period },
      orderBy: [{ targetType: "asc" }, { targetId: "asc" }],
    });

    // 2. Calcular el avance real para cada meta
    const metasWithProgress = await Promise.all(
      metas.map(async (meta) => {
        let activadas = 0;
        let totalIngresadas = 0;

        if (meta.targetType === "QUEUE") {
          // Conteo por campaña
          const result: any = await prisma.$queryRawUnsafe(`
            SELECT 
              COUNT(*)::int AS total,
              COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas
            FROM "Sale"
            WHERE (campana ILIKE '%${meta.targetId}%' OR campana = '${meta.targetId}')
              AND TO_CHAR("fechaVenta", 'YYYY-MM') = '${meta.period}';
          `);
          if (result && result.length > 0) {
            totalIngresadas = result[0].total || 0;
            activadas = result[0].activadas || 0;
          }
        } else {
          // Conteo individual por DNI de asesor
          const result: any = await prisma.$queryRawUnsafe(`
            SELECT 
              COUNT(*)::int AS total,
              COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS activadas
            FROM "Sale"
            WHERE TRIM("dniAsesor") = '${meta.targetId}'
              AND TO_CHAR("fechaVenta", 'YYYY-MM') = '${meta.period}';
          `);
          if (result && result.length > 0) {
            totalIngresadas = result[0].total || 0;
            activadas = result[0].activadas || 0;
          }
        }

        const pctAvance = meta.quota > 0 ? parseFloat(((activadas / meta.quota) * 100).toFixed(2)) : 0;

        // Semáforo comercial de TRUSCORP:
        // Verde >= 85%, Amarillo >= 60% y < 85%, Rojo < 60%
        let semaforo = "ROJO";
        if (pctAvance >= 85) {
          semaforo = "VERDE";
        } else if (pctAvance >= 60) {
          semaforo = "AMARILLO";
        }

        return {
          id: meta.id,
          targetId: meta.targetId,
          targetType: meta.targetType,
          period: meta.period,
          quota: meta.quota,
          activadas,
          totalIngresadas,
          pctAvance,
          semaforo,
        };
      })
    );

    return NextResponse.json({
      success: true,
      period,
      count: metasWithProgress.length,
      data: metasWithProgress,
    });
  } catch (error: any) {
    console.error("Error al obtener metas:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetId, targetType, period, quota } = body;

    if (!targetId || !targetType || !period || quota === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos obligatorios: targetId (DNI o nombre de Cola), targetType ('USER' | 'QUEUE'), period (YYYY-MM), quota (número).",
        },
        { status: 400 }
      );
    }

    if (!["USER", "QUEUE"].includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "targetType debe ser 'USER' o 'QUEUE'." },
        { status: 400 }
      );
    }

    const quotaNum = parseInt(quota, 10);
    if (isNaN(quotaNum) || quotaNum < 0) {
      return NextResponse.json(
        { success: false, error: "quota debe ser un número entero mayor o igual a 0." },
        { status: 400 }
      );
    }

    const savedMeta = await prisma.meta.upsert({
      where: {
        targetId_period: {
          targetId: targetId.toString().trim(),
          period: period.toString().trim(),
        },
      },
      create: {
        targetId: targetId.toString().trim(),
        targetType: targetType as TargetType,
        period: period.toString().trim(),
        quota: quotaNum,
      },
      update: {
        quota: quotaNum,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Meta mensual configurada exitosamente.",
        data: savedMeta,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al configurar meta:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
