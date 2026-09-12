import prisma from "../src/lib/prisma";

async function main() {
  const orphans: any = await prisma.$queryRawUnsafe(`
    SELECT "dniAsesor", "nombreAsesor", COUNT(*) as total_ventas
    FROM "Sale"
    WHERE "dniAsesor" NOT IN (SELECT dni FROM "User")
    GROUP BY "dniAsesor", "nombreAsesor"
    ORDER BY total_ventas DESC
    LIMIT 10;
  `);

  console.log("Top 10 Asesores en Google Sheets que tienen ventas pero no están aún creados en User:");
  console.table(orphans);

  await prisma.$disconnect();
}
main().catch(console.error);
