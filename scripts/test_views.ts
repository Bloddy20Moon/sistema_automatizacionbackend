import "dotenv/config";
import prisma from "../src/lib/prisma";

async function test() {
  const result: any[] = await prisma.$queryRawUnsafe("SELECT * FROM vista_resumen_asesor");
  console.log("Filas retornadas de vista_resumen_asesor:", result.length);
  console.log(result);
  await prisma.$disconnect();
}

test().catch(console.error);
