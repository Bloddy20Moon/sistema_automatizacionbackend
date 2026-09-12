import { MultiSheetSyncOrchestrator } from "../src/services/sync/MultiSheetSyncOrchestrator";

const INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES || "10", 10);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

async function runScheduler() {
  const orchestrator = new MultiSheetSyncOrchestrator();
  console.log(`[Scheduler] ⏰ Programador de sincronización iniciado (Intervalo: cada ${INTERVAL_MINUTES} minutos).`);

  async function executeCycle() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] 🔄 Ejecutando ciclo automático de sincronización...`);
    try {
      const result = await orchestrator.syncAllActiveCampaigns();
      console.log(`[${timestamp}] ✅ Sincronización completada: ${result.totalSalesUpserted} ventas procesadas de ${result.sheetsProcessed} campañas en ${result.totalDurationMs}ms.`);
    } catch (error: any) {
      console.error(`[${timestamp}] ❌ Error en ciclo de sincronización:`, error.message);
    }
  }

  // Ejecución inmediata al arrancar
  await executeCycle();

  // Programación periódica
  setInterval(executeCycle, INTERVAL_MS);
}

runScheduler().catch((err) => {
  console.error("Error fatal en el programador:", err);
  process.exit(1);
});
