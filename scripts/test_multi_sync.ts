import { MultiSheetSyncOrchestrator } from "../src/services/sync/MultiSheetSyncOrchestrator";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("==================================================================");
  console.log("🚀 EJECUTANDO ORQUESTADOR MULTI-HOJA (CONCATENACIÓN DE CAMPAÑAS)");
  console.log("==================================================================");

  const orchestrator = new MultiSheetSyncOrchestrator();
  const result = await orchestrator.syncAllActiveCampaigns();

  console.log("\n📊 RESULTADO GLOBAL:");
  console.log("------------------------------------------------------------------");
  console.log("Estado Global                  :", result.success ? "ÉXITO TOTAL ✅" : "CON ADVERTENCIAS ⚠️");
  console.log("Hojas configuradas en catálogo :", result.sheetsConfigured);
  console.log("Hojas procesadas               :", result.sheetsProcessed);
  console.log("Total Ventas guardadas         :", result.totalSalesUpserted);
  console.log("Total Ventas huérfanas         :", result.totalOrphanSales);
  console.log("Tiempo total de procesamiento  :", result.totalDurationMs, "ms (" + (result.totalDurationMs / 1000).toFixed(2) + " seg)");
  console.log("------------------------------------------------------------------");

  console.log("\n📋 DETALLE POR HOJA Y CAMPAÑA:");
  result.sheetDetails.forEach((item, idx) => {
    console.log(`\n[${idx + 1}] Campaña: ${item.queue} | Periodo: ${item.period}`);
    console.log(`    - Filas leídas en Google Sheets : ${item.result.totalRowsRead}`);
    console.log(`    - Registros OTs transformados   : ${item.result.recordsTransformed}`);
    console.log(`    - Ventas guardadas en PostgreSQL: ${item.result.salesUpserted}`);
    console.log(`    - Tiempo de ejecución           : ${item.result.durationMs}ms`);
    console.log(`    - Estado                        : ${item.result.success ? "OK" : "ERROR: " + item.result.errorMessage}`);
  });

  console.log("\nEstado en base de datos de CampaignSheet:");
  const configs = await prisma.campaignSheet.findMany();
  console.table(configs);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error fatal en orquestador multi-hoja:", err);
  process.exit(1);
});
