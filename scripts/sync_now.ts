import { syncGoogleSheetsToDb } from "../src/services/sheetsIngest";
import prisma from "../src/lib/prisma";

async function run() {
  console.log("Iniciando sincronización con Google Sheets (JULIO - VENTAS)...");
  
  // Limitar el rango para una prueba rápida de las primeras 100 filas
  const result = await syncGoogleSheetsToDb({
    range: "'VENTAS'!A2:BL100",
  });

  console.log("\n================ RESULTADO DE LA SINCRONIZACIÓN ================");
  console.log("Estado:", result.success ? "EXITOSA ✅" : "CON ADVERTENCIAS ⚠️");
  console.log("Total filas leídas en Sheet:", result.totalSheetRows);
  console.log("Ventas insertadas/actualizadas en PostgreSQL:", result.salesUpserted);
  console.log("Ventas huérfanas detectadas:", result.orphanSalesCount);
  console.log("Tiempo de ejecución:", result.durationMs, "ms");
  console.log("Mensaje:", result.message);
  console.log("=================================================================\n");

  // Consultar registros en PostgreSQL para comprobar que se guardaron
  const count = await prisma.sale.count();
  console.log(`Total de ventas actualmente en la base de datos PostgreSQL: ${count}`);

  const sampleSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      idOt: true,
      correlative: true,
      campana: true,
      tipoVenta: true,
      venta: true,
      numeroPortarRenovar: true,
      tipoEntrega: true,
      nombreAsesor: true,
      estado: true,
      estadoSiebel: true,
    }
  });

  console.log("Muestra de 5 registros insertados en PostgreSQL:");
  console.table(sampleSales);

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Error al ejecutar sincronización:", err);
  process.exit(1);
});
