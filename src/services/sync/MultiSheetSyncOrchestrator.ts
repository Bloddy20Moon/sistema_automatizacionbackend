import { CampaignConfigRepository } from "./CampaignConfigRepository";
import { SingleSheetSyncService, SingleSheetSyncResult } from "./SingleSheetSyncService";

export interface MultiSheetSyncResult {
  success: boolean;
  sheetsConfigured: number;
  sheetsProcessed: number;
  totalSalesUpserted: number;
  totalOrphanSales: number;
  totalDurationMs: number;
  sheetDetails: Array<{
    queue: string;
    period: string;
    result: SingleSheetSyncResult;
  }>;
}

export class MultiSheetSyncOrchestrator {
  private configRepo: CampaignConfigRepository;
  private singleSheetService: SingleSheetSyncService;

  constructor() {
    this.configRepo = new CampaignConfigRepository();
    this.singleSheetService = new SingleSheetSyncService();
  }

  /**
   * Sincroniza todas las hojas activas configuradas en la base de datos
   */
  public async syncAllActiveCampaigns(): Promise<MultiSheetSyncResult> {
    const globalStartTime = Date.now();
    const activeSheets = await this.configRepo.getActiveCampaignSheets();

    const details: Array<{
      queue: string;
      period: string;
      result: SingleSheetSyncResult;
    }> = [];

    let totalSalesUpserted = 0;
    let totalOrphanSales = 0;
    let overallSuccess = true;

    for (const sheet of activeSheets) {
      console.log(`[MultiSheetSync] Sincronizando campaña ${sheet.queue} (${sheet.period})...`);

      const result = await this.singleSheetService.syncSheet(
        sheet.spreadsheetId,
        sheet.tabName
      );

      // Actualizar estado en el catálogo de base de datos
      await this.configRepo.updateSyncStatus(
        sheet.id,
        result.success ? "SUCCESS" : "ERROR",
        result.errorMessage
      );

      if (!result.success) {
        overallSuccess = false;
      }

      totalSalesUpserted += result.salesUpserted;
      totalOrphanSales += result.orphanSalesCount;

      details.push({
        queue: sheet.queue,
        period: sheet.period,
        result,
      });
    }

    const totalDurationMs = Date.now() - globalStartTime;

    return {
      success: overallSuccess,
      sheetsConfigured: activeSheets.length,
      sheetsProcessed: details.length,
      totalSalesUpserted,
      totalOrphanSales,
      totalDurationMs,
      sheetDetails: details,
    };
  }
}
