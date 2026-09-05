import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Actualizando enum Role en PostgreSQL...");

  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'JEFE';`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ASESOR';`);
  console.log("Valores JEFE y ASESOR añadidos al enum Role.");

  await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'JEFE' WHERE role::text = 'ADMIN';`);
  await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'ASESOR' WHERE role::text = 'AGENT';`);
  console.log("Usuarios existentes actualizados a JEFE y ASESOR.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
