import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dni, code } = body;

    if (!dni || !code) {
      return NextResponse.json(
        { success: false, error: "El DNI y el código de 6 dígitos son obligatorios." },
        { status: 400 }
      );
    }

    const cleanDni = dni.toString().trim();
    const cleanCode = code.toString().trim();

    // 1. Buscar código de verificación activo y no utilizado
    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        dni: cleanDni,
        code: cleanCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Código de verificación inválido o expirado. Solicita un nuevo código.",
        },
        { status: 401 }
      );
    }

    // 2. Marcar código como utilizado para evitar reutilización
    await prisma.verificationCode.update({
      where: { id: verificationRecord.id },
      data: { used: true },
    });

    // 3. Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { dni: cleanDni },
      select: {
        dni: true,
        name: true,
        email: true,
        role: true,
        queue: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Cuenta inactiva o no encontrada." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Autenticación exitosa.",
      user,
    });
  } catch (error: any) {
    console.error("Error en login-verify:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
