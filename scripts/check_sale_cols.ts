import prisma from "../src/lib/prisma";

async function main() {
  const fks: any = await prisma.$queryRawUnsafe(`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'Sale';
  `);
  console.log("Foreign keys en tabla Sale:");
  console.table(fks);

  // Asegurar createdAt en Sale si no existe
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  `);
  console.log("Columna createdAt verificada/agregada en Sale.");

  // Convertir tipoVenta y estado a TEXT para admitir todos los valores reales de Google Sheets sin fallar
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale" ALTER COLUMN "tipoVenta" TYPE TEXT;
    ALTER TABLE "Sale" ALTER COLUMN "estado" TYPE TEXT;
  `);
  console.log("tipoVenta y estado convertidos a TEXT para máxima flexibilidad.");

  await prisma.$disconnect();
}
main().catch(console.error);
