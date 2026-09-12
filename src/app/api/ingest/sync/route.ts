import { NextResponse } from "next/server";
import { syncGoogleSheetsToDb } from "@/services/sheetsIngest";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body vacío o no enviado
    }

    const result = await syncGoogleSheetsToDb({
      spreadsheetId: body.spreadsheetId,
      tabName: body.tabName,
      range: body.range,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error: any) {
    console.error("Error en API de sincronización:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno al sincronizar con Google Sheets",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await syncGoogleSheetsToDb();
    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error: any) {
    console.error("Error en GET /api/ingest/sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno al sincronizar con Google Sheets",
      },
      { status: 500 }
    );
  }
}
