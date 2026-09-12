import { GoogleSheetsReader, SheetsReaderConfig } from "./GoogleSheetsReader";
import { SalesDataTransformer, TransformedSaleRecord } from "./SalesDataTransformer";
import { SalesDatabaseRepository } from "./SalesDatabaseRepository";

export interface SyncResult {
  success: boolean;
  totalSheetRows: number;
  transformedRecords: number;
  salesUpserted: number;
  orphanSalesCount: number;
  errorsCount: number;
  durationMs: number;
  message: string;
}

export class SalesSyncOrchestrator {
  private reader: GoogleSheetsReader;
  private transformer: SalesDataTransformer;
  private repository: SalesDatabaseRepository;

  constructor(config?: SheetsReaderConfig) {
    this.reader = new GoogleSheetsReader(config);
    this.transformer = new SalesDataTransformer();
    this.repository = new SalesDatabaseRepository();
  }

  /**
   * Ejecuta el pipeline completo de sincronización de manera desacoplada y eficiente
   */
  public async executeSync(customRange?: string): Promise<SyncResult> {
    const startTime = Date.now();

    // 1. Lectura en bloque desde Google Sheets (1 sola petición HTTP)
    const rawRows = await this.reader.fetchRows(customRange);

    if (rawRows.length === 0) {
      return {
        success: true,
        totalSheetRows: 0,
        transformedRecords: 0,
        salesUpserted: 0,
        orphanSalesCount: 0,
        errorsCount: 0,
        durationMs: Date.now() - startTime,
        message: "No se encontraron filas con datos en Google Sheets.",
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

    // 4. Ingesta masiva optimizada por lotes en PostgreSQL
    const { upsertedCount, errorsCount } = await this.repository.bulkUpsertSales(records, 100);

    const durationMs = Date.now() - startTime;

    return {
      success: errorsCount === 0,
      totalSheetRows: rawRows.length,
      transformedRecords: records.length,
      salesUpserted: upsertedCount,
      orphanSalesCount,
      errorsCount,
      durationMs,
      message: `Sincronización completada con éxito: ${upsertedCount} ventas procesadas (con ${orphanSalesCount} huérfanas) en ${durationMs}ms.`,
    };
  }
}
