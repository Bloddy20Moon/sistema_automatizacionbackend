import { GoogleSheetsReader, SheetsReaderConfig } from "./sync/GoogleSheetsReader";
import { SalesDataTransformer, TransformedSaleRecord } from "./sync/SalesDataTransformer";
import { SalesDatabaseRepository } from "./sync/SalesDatabaseRepository";
import { SalesSyncOrchestrator, SyncResult } from "./sync/SalesSyncOrchestrator";

export {
  GoogleSheetsReader,
  SalesDataTransformer,
  SalesDatabaseRepository,
  SalesSyncOrchestrator,
};
export type { SheetsReaderConfig, TransformedSaleRecord, SyncResult };

/**
 * Función fachada para compatibilidad directa con rutas API y scripts
 */
export async function syncGoogleSheetsToDb(options?: {
  spreadsheetId?: string;
  tabName?: string;
  range?: string;
}): Promise<SyncResult> {
  const orchestrator = new SalesSyncOrchestrator({
    spreadsheetId: options?.spreadsheetId,
    tabName: options?.tabName,
    range: options?.range,
  });

  return orchestrator.executeSync(options?.range);
}
