import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Asegurando compatibilidad de base de datos para ingesta...");

  // 1. Desvincular clave foránea estricta para permitir ventas huérfanas
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_dniAsesor_fkey";
  `);
  console.log("1. Clave foránea Sale_dniAsesor_fkey eliminada (permite ventas huérfanas sin error).");

  // 2. Columna createdAt
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  `);
  console.log("2. Columna createdAt verificada.");

  console.log("Base de datos lista.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
