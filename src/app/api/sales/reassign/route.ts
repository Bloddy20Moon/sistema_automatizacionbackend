import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { saleId, idOt, newDni, newName, changedBy } = body;

    if (!saleId && !idOt) {
      return NextResponse.json(
        { success: false, error: "Debe proporcionar 'saleId' o 'idOt' para identificar la venta a corregir." },
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

    // Obtener el nombre del asesor si no fue enviado
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
      const updated = await prisma.sale.update({
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
    console.error("Error al reasignar venta:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
