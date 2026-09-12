import prisma from "@/lib/prisma";
import { Queue } from "@prisma/client";

export interface CreateCampaignSheetInput {
  queue: Queue;
  period: string; // ej. "2026-10"
  spreadsheetId: string;
  tabName?: string;
  isActive?: boolean;
}

export class CampaignConfigRepository {
  /**
   * Obtiene todas las hojas de cálculo marcadas como activas para sincronización
   */
  public async getActiveCampaignSheets() {
    return prisma.campaignSheet.findMany({
      where: { isActive: true },
      orderBy: { queue: "asc" },
    });
  }

  /**
   * Registra o actualiza la hoja de cálculo de una campaña para un periodo dado
   */
  public async upsertCampaignSheet(input: CreateCampaignSheetInput) {
    return prisma.campaignSheet.upsert({
      where: {
        queue_period: {
          queue: input.queue,
          period: input.period,
        },
      },
      create: {
        queue: input.queue,
        period: input.period,
        spreadsheetId: input.spreadsheetId,
        tabName: input.tabName || "VENTAS",
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
      update: {
        spreadsheetId: input.spreadsheetId,
        tabName: input.tabName || "VENTAS",
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    });
  }

  /**
   * Actualiza el estado de sincronización tras la ejecución del robot
   */
  public async updateSyncStatus(
    id: string,
    status: "SUCCESS" | "ERROR",
    errorMessage?: string | null
  ) {
    return prisma.campaignSheet.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        errorMessage: errorMessage || null,
      },
    });
  }
}
