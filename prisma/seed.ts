import "dotenv/config";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, Queue } from "@prisma/client";

async function main() {
  console.log("Iniciando Seed de la base de datos...");

  const defaultPassword = await bcrypt.hash("123456", 10);

  // 1. Jefe de Supervisión (Admin)
  const admin = await prisma.user.upsert({
    where: { dni: "00000001" },
    update: {},
    create: {
      dni: "00000001",
      name: "Jefe de Supervisión General",
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      queue: Queue.WSP_APP,
    },
  });

  // 2. Supervisor de Cola WSP APP
  const supervisor = await prisma.user.upsert({
    where: { dni: "00000002" },
    update: {},
    create: {
      dni: "00000002",
      name: "Supervisor WSP APP",
      passwordHash: defaultPassword,
      role: Role.SUPERVISOR,
      queue: Queue.WSP_APP,
    },
  });

  // 3. Asesor 1
  const agent1 = await prisma.user.upsert({
    where: { dni: "12345678" },
    update: {},
    create: {
      dni: "12345678",
      name: "Asesor Juan Perez",
      passwordHash: defaultPassword,
      role: Role.AGENT,
      queue: Queue.WSP_APP,
    },
  });

  // 4. Asesor 2
  const agent2 = await prisma.user.upsert({
    where: { dni: "87654321" },
    update: {},
    create: {
      dni: "87654321",
      name: "Asesora Maria Lopez",
      passwordHash: defaultPassword,
      role: Role.AGENT,
      queue: Queue.WSP_APP,
    },
  });

  console.log("Usuarios iniciales creados exitosamente:");
  console.log(`- Admin: ${admin.dni} (${admin.name})`);
  console.log(`- Supervisor: ${supervisor.dni} (${supervisor.name})`);
  console.log(`- Asesor 1: ${agent1.dni} (${agent1.name})`);
  console.log(`- Asesor 2: ${agent2.dni} (${agent2.name})`);
  console.log("Contraseña por defecto para todos: 123456");
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
