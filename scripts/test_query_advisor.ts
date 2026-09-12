import prisma from "../src/lib/prisma";

async function main() {
  const dnis = ["74980211", "41592926", "77439993", "45615130"];

  for (const d of dnis) {
    const kpis: any = await prisma.$queryRawUnsafe(`
      SELECT 
        TRIM("dniAsesor") AS dni,
        TRIM("nombreAsesor") AS nombre,
        COUNT(*)::int AS total_ingresadas,
        COUNT(CASE WHEN estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN estado = 'CAIDA' THEN 1 END)::int AS total_caidas
      FROM "Sale"
      WHERE TRIM("dniAsesor") = '${d}'
      GROUP BY TRIM("dniAsesor"), TRIM("nombreAsesor")
      ORDER BY total_ingresadas DESC;
    `);

    console.log(`DNI: ${d}`);
    console.table(kpis);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
