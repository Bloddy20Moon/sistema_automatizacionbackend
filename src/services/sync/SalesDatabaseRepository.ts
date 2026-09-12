import prisma from "@/lib/prisma";
import { TransformedSaleRecord } from "./SalesDataTransformer";

export class SalesDatabaseRepository {
  /**
   * Obtiene la lista de DNIs registrados para verificar ventas huérfanas
   */
  public async getRegisteredAdviserDnis(): Promise<Set<string>> {
    const users = await prisma.user.findMany({
      select: { dni: true },
    });
    return new Set(users.map((u) => u.dni.trim()));
  }

  /**
   * Ejecuta UPSERT masivo optimizado por lotes para evitar sobrecargar conexiones
   */
  public async bulkUpsertSales(
    records: TransformedSaleRecord[],
    batchSize: number = 100
  ): Promise<{ upsertedCount: number; errorsCount: number }> {
    let upsertedCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (record) => {
          try {
            await prisma.sale.upsert({
              where: {
                idOt_correlative: {
                  idOt: record.idOt,
                  correlative: record.correlative,
                },
              },
              create: {
                idOt: record.idOt,
                correlative: record.correlative,
                fechaVenta: record.fechaVenta,
                estado: record.estado,
                tipoVenta: record.tipoVenta,
                venta: record.venta,
                fechaActivacion: record.fechaActivacion,
                campana: record.campana,
                dniCliente: record.dniCliente,
                nombreCliente: record.nombreCliente,
                numeroPortarRenovar: record.numeroPortarRenovar,
                tipoEntrega: record.tipoEntrega,
                linkBotmaker: record.linkBotmaker,
                dniAsesor: record.dniAsesor,
                nombreAsesor: record.nombreAsesor,
                reingreso: record.reingreso,
                resultadoEntrega: record.resultadoEntrega,
                estadoSiebel: record.estadoSiebel,
                motivoSiebel: record.motivoSiebel,
              },
              update: {
                fechaVenta: record.fechaVenta,
                estado: record.estado,
                tipoVenta: record.tipoVenta,
                venta: record.venta,
                fechaActivacion: record.fechaActivacion,
                campana: record.campana,
                dniCliente: record.dniCliente,
                nombreCliente: record.nombreCliente,
                numeroPortarRenovar: record.numeroPortarRenovar,
                tipoEntrega: record.tipoEntrega,
                linkBotmaker: record.linkBotmaker,
                dniAsesor: record.dniAsesor,
                nombreAsesor: record.nombreAsesor,
                reingreso: record.reingreso,
                resultadoEntrega: record.resultadoEntrega,
                estadoSiebel: record.estadoSiebel,
                motivoSiebel: record.motivoSiebel,
              },
            });
            upsertedCount++;
          } catch (error) {
            errorsCount++;
            console.error(`Error en upsert OT ${record.idOt}-${record.correlative}:`, error);
          }
        })
      );
    }

    return { upsertedCount, errorsCount };
  }
}
