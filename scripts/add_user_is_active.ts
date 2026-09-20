import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Agregando columna isActive a User...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("Columna isActive agregada con éxito.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
