import { NextResponse } from "next/server";
import { CampaignConfigRepository } from "@/services/sync/CampaignConfigRepository";
import prisma from "@/lib/prisma";

const repo = new CampaignConfigRepository();

export async function GET() {
  try {
    const sheets = await prisma.campaignSheet.findMany({
      orderBy: [{ period: "desc" }, { queue: "asc" }],
    });
    return NextResponse.json({ success: true, data: sheets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { queue, period, spreadsheetId, tabName, isActive } = body;

    if (!queue || !period || !spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos obligatorios: queue, period, spreadsheetId",
        },
        { status: 400 }
      );
    }

    const saved = await repo.upsertCampaignSheet({
      queue,
      period,
      spreadsheetId,
      tabName,
      isActive,
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
