import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { saleId, idOt, oldIdOt, newIdOt, newDni, newName } = body;

    // Caso 1: Corrección de Número de Orden (OT) equivocada (ej: 901885392 -> 901885391)
    if (oldIdOt && newIdOt) {
      const cleanOld = oldIdOt.toString().trim();
      const cleanNew = newIdOt.toString().trim();

      const existing = await prisma.sale.findMany({
        where: { idOt: cleanOld },
      });

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: `No se encontró ninguna venta con la OT ${cleanOld}.` },
          { status: 404 }
        );
      }

      const updated = await prisma.sale.updateMany({
        where: { idOt: cleanOld },
        data: { idOt: cleanNew },
      });

      return NextResponse.json({
        success: true,
        message: `Orden corregida con éxito: La OT ${cleanOld} fue cambiada a ${cleanNew}.`,
        updatedRecords: updated.count,
      });
    }

    // Caso 2: Reasignación de DNI y Nombre de Asesor
    if (!saleId && !idOt) {
      return NextResponse.json(
        { success: false, error: "Debe proporcionar 'saleId' o 'idOt' para identificar la venta a corregir, o ('oldIdOt' y 'newIdOt') para corregir la orden." },
        { status: 400 }
      );
    }

    if (!newDni) {
      return NextResponse.json(
        { success: false, error: "Debe proporcionar el 'newDni' del asesor al que se reasignará la venta." },
        { status: 400 }
      );
    }

    const cleanDni = newDni.toString().trim();

    let advisorName = newName ? newName.toString().trim() : "";
    if (!advisorName) {
      const user = await prisma.user.findUnique({
        where: { dni: cleanDni },
        select: { name: true },
      });
      advisorName = user ? user.name : "ASESOR ASIGNADO";
    }

    let updatedCount = 0;

    if (saleId) {
      await prisma.sale.update({
        where: { id: saleId },
        data: {
          dniAsesor: cleanDni,
          nombreAsesor: advisorName,
        },
      });
      updatedCount = 1;
    } else if (idOt) {
      const updated = await prisma.sale.updateMany({
        where: { idOt: idOt.toString().trim() },
        data: {
          dniAsesor: cleanDni,
          nombreAsesor: advisorName,
        },
      });
      updatedCount = updated.count;
    }

    return NextResponse.json({
      success: true,
      message: `Venta(s) reasignada(s) con éxito al asesor ${advisorName} (DNI: ${cleanDni}).`,
      updatedRecords: updatedCount,
    });
  } catch (error: any) {
    console.error("Error al reasignar o corregir venta:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
