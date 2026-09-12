import { syncGoogleSheetsToDb } from "../src/services/sheetsIngest";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("===============================================================");
  console.log("🚀 INICIANDO SINCRONIZACIÓN MODULAR MASIVA DE TODAS LAS FILAS");
  console.log("===============================================================");

  const startTime = Date.now();
  // Al no especificar número de fila final en el rango, lee todo hasta el final (las ~3,700 filas)
  const result = await syncGoogleSheetsToDb();

  console.log("\n📊 RESULTADOS DE LA EJECUCIÓN:");
  console.log("---------------------------------------------------------------");
  console.log("Estado de Sincronización       :", result.success ? "ÉXITO TOTAL ✅" : "CON ERRORES ❌");
  console.log("Filas leídas de Google Sheets :", result.totalSheetRows);
  console.log("Registros transformados (OTs)  :", result.transformedRecords);
  console.log("Ventas guardadas en PostgreSQL :", result.salesUpserted);
  console.log("Ventas huérfanas detectadas    :", result.orphanSalesCount);
  console.log("Errores de inserción           :", result.errorsCount);
  console.log("Tiempo total de procesamiento  :", result.durationMs, "ms (" + (result.durationMs / 1000).toFixed(2) + " segundos)");
  console.log("Mensaje                        :", result.message);
  console.log("---------------------------------------------------------------");

  const totalInDb = await prisma.sale.count();
  console.log(`\n📦 Total de ventas almacenadas en la base de datos PostgreSQL: ${totalInDb}`);

  const sample = await prisma.sale.findMany({
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
      dniAsesor: true,
      nombreAsesor: true,
      estado: true,
      estadoSiebel: true,
    }
  });

  console.log("\n🔍 Muestra de los primeros registros insertados en PostgreSQL:");
  console.table(sample);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error fatal durante la sincronización:", err);
  process.exit(1);
});
