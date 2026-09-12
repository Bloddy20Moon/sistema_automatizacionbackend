import { NextResponse } from "next/server";
import { MultiSheetSyncOrchestrator } from "@/services/sync/MultiSheetSyncOrchestrator";
import { SingleSheetSyncService } from "@/services/sync/SingleSheetSyncService";

const multiOrchestrator = new MultiSheetSyncOrchestrator();
const singleService = new SingleSheetSyncService();

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body vacío
    }

    // Si se pasa un spreadsheetId específico, se sincroniza solo esa hoja
    if (body.spreadsheetId) {
      const result = await singleService.syncSheet(
        body.spreadsheetId,
        body.tabName || "VENTAS",
        body.range
      );
      return NextResponse.json(
        { success: result.success, mode: "SINGLE", data: result },
        { status: result.success ? 200 : 207 }
      );
    }

    // Por defecto: Sincroniza todas las campañas activas configuradas en la base de datos
    const multiResult = await multiOrchestrator.syncAllActiveCampaigns();
    return NextResponse.json(
      { success: multiResult.success, mode: "MULTI_CAMPAIGN", data: multiResult },
      { status: multiResult.success ? 200 : 207 }
    );
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
    // Sincroniza todas las campañas activas
    const multiResult = await multiOrchestrator.syncAllActiveCampaigns();
    return NextResponse.json(
      { success: multiResult.success, mode: "MULTI_CAMPAIGN", data: multiResult },
      { status: multiResult.success ? 200 : 207 }
    );
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
