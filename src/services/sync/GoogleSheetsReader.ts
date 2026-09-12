import { google, sheets_v4 } from "googleapis";
import * as path from "path";

export interface SheetsReaderConfig {
  spreadsheetId?: string;
  tabName?: string;
  range?: string;
  credentialsPath?: string;
}

export class GoogleSheetsReader {
  private spreadsheetId: string;
  private tabName: string;
  private range: string;
  private credentialsPath: string;
  private sheetsClient: sheets_v4.Sheets | null = null;

  constructor(config?: SheetsReaderConfig) {
    this.spreadsheetId =
      config?.spreadsheetId ||
      process.env.GOOGLE_SPREADSHEET_ID ||
      "1FH1T53l3dhc1212BfC2C9bJbY3GH1kpxrUlt4W4Xd0c";
    this.tabName = config?.tabName || process.env.GOOGLE_SHEET_TAB || "VENTAS";
    this.range = config?.range || `'${this.tabName}'!A2:BL`;
    this.credentialsPath =
      config?.credentialsPath ||
      process.env.GOOGLE_CREDENTIALS_PATH ||
      path.join(process.cwd(), "credentials.json");
  }

  private async getClient(): Promise<sheets_v4.Sheets> {
    if (!this.sheetsClient) {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.credentialsPath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      this.sheetsClient = google.sheets({ version: "v4", auth });
    }
    return this.sheetsClient;
  }

  /**
   * Lee todas las filas del rango configurado en una sola petición (0 costo)
   */
  public async fetchRows(customRange?: string): Promise<any[][]> {
    const sheets = await this.getClient();
    const rangeToRead = customRange || this.range;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: rangeToRead,
    });

    return response.data.values || [];
  }
}
