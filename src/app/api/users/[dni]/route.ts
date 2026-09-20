import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, Queue } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params;
    const cleanDni = dni.trim();

    const user = await prisma.user.findUnique({
      where: { dni: cleanDni },
      select: {
        dni: true,
        name: true,
        email: true,
        role: true,
        queue: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `Usuario con DNI ${cleanDni} no encontrado.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params;
    const cleanDni = dni.trim();
    const body = await req.json();
    const { name, email, password, role, queue, isActive } = body;

    const existing = await prisma.user.findUnique({
      where: { dni: cleanDni },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Usuario con DNI ${cleanDni} no encontrado.` },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name && typeof name === "string" && name.trim() !== "") {
      updateData.name = name.trim();
    }

    if (email && typeof email === "string" && email.trim() !== "") {
      updateData.email = email.trim().toLowerCase();
    }

    if (role && ["JEFE", "SUPERVISOR", "ASESOR"].includes(role)) {
      updateData.role = role as Role;
    }

    if (queue && ["WSP_APP", "WSP_APP_RENO", "WSP_DIGITAL", "C2C_APP", "C2C_DIGITAL"].includes(queue)) {
      updateData.queue = queue as Queue;
    }

    if (isActive !== undefined && isActive !== null) {
      updateData.isActive = Boolean(isActive);
    }

    if (password && typeof password === "string" && password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { dni: cleanDni },
      data: updateData,
      select: {
        dni: true,
        name: true,
        email: true,
        role: true,
        queue: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado exitosamente.",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params;
    const cleanDni = dni.trim();

    const existing = await prisma.user.findUnique({
      where: { dni: cleanDni },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Usuario con DNI ${cleanDni} no encontrado.` },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { dni: cleanDni },
    });

    return NextResponse.json({
      success: true,
      message: `Usuario con DNI ${cleanDni} eliminado exitosamente del sistema. Sus ventas históricas permanecen intactas en auditoría.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
