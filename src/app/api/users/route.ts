import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, Queue } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") as Role | null;
    const queue = searchParams.get("queue") as Queue | null;
    const isActiveParam = searchParams.get("isActive");
    const search = searchParams.get("search");

    const whereClause: any = {};

    if (role && ["JEFE", "SUPERVISOR", "ASESOR"].includes(role)) {
      whereClause.role = role;
    }

    if (queue && ["WSP_APP", "WSP_APP_RENO", "WSP_DIGITAL", "C2C_APP", "C2C_DIGITAL"].includes(queue)) {
      whereClause.queue = queue;
    }

    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
      whereClause.isActive = isActiveParam === "true";
    }

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { dni: { contains: search.trim() } },
        { name: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(
      { success: true, count: users.length, data: users },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dni, name, email, password, role, queue } = body;

    if (!dni || !name || !password || !role || !queue) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos obligatorios: dni, name, password, role, queue.",
        },
        { status: 400 }
      );
    }

    const cleanDni = dni.toString().trim();
    const cleanName = name.toString().trim();
    const cleanEmail = email ? email.toString().trim().toLowerCase() : null;

    const existing = await prisma.user.findUnique({
      where: { dni: cleanDni },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe un usuario registrado con el DNI ${cleanDni}.`,
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        dni: cleanDni,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: role as Role,
        queue: queue as Queue,
        isActive: true,
      },
      select: {
        dni: true,
        name: true,
        email: true,
        role: true,
        queue: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "Usuario creado exitosamente.", data: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
