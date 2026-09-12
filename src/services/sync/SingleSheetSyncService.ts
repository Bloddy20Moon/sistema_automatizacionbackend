import { GoogleSheetsReader } from "./GoogleSheetsReader";
import { SalesDataTransformer, TransformedSaleRecord } from "./SalesDataTransformer";
import { SalesDatabaseRepository } from "./SalesDatabaseRepository";

export interface SingleSheetSyncResult {
  sheetId: string;
  tabName: string;
  success: boolean;
  totalRowsRead: number;
  recordsTransformed: number;
  salesUpserted: number;
  orphanSalesCount: number;
  errorsCount: number;
  durationMs: number;
  errorMessage?: string;
}

export class SingleSheetSyncService {
  private transformer: SalesDataTransformer;
  private repository: SalesDatabaseRepository;

  constructor() {
    this.transformer = new SalesDataTransformer();
    this.repository = new SalesDatabaseRepository();
  }

  /**
   * Ejecuta y mide la sincronización de una única hoja de cálculo
   */
  public async syncSheet(
    spreadsheetId: string,
    tabName: string = "VENTAS",
    customRange?: string
  ): Promise<SingleSheetSyncResult> {
    const startTime = Date.now();
    const range = customRange || `'${tabName}'!A2:BL`;

    try {
      // 1. Lectura en bloque de la hoja
      const reader = new GoogleSheetsReader({
        spreadsheetId,
        tabName,
        range,
      });
      const rawRows = await reader.fetchRows(range);

      if (rawRows.length === 0) {
        return {
          sheetId: spreadsheetId,
          tabName,
          success: true,
          totalRowsRead: 0,
          recordsTransformed: 0,
          salesUpserted: 0,
          orphanSalesCount: 0,
          errorsCount: 0,
          durationMs: Date.now() - startTime,
        };
      }

      // 2. Transformación y desagregación multilínea en memoria
      const records = this.transformer.transformRows(rawRows);

      // 3. Auditoría de ventas huérfanas
      const registeredDnis = await this.repository.getRegisteredAdviserDnis();
      let orphanSalesCount = 0;
      for (const record of records) {
        if (record.dniAsesor && !registeredDnis.has(record.dniAsesor)) {
          orphanSalesCount++;
        }
      }

      // 4. Ingesta masiva optimizada por lotes
      const { upsertedCount, errorsCount } = await this.repository.bulkUpsertSales(records, 100);

      const durationMs = Date.now() - startTime;

      return {
        sheetId: spreadsheetId,
        tabName,
        success: errorsCount === 0,
        totalRowsRead: rawRows.length,
        recordsTransformed: records.length,
        salesUpserted: upsertedCount,
        orphanSalesCount,
        errorsCount,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return {
        sheetId: spreadsheetId,
        tabName,
        success: false,
        totalRowsRead: 0,
        recordsTransformed: 0,
        salesUpserted: 0,
        orphanSalesCount: 0,
        errorsCount: 1,
        durationMs,
        errorMessage: err.message || "Error desconocido al procesar la hoja",
      };
    }
  }
}
