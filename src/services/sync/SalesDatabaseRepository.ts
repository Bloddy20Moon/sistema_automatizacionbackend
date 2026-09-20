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
   * Ejecuta UPSERT masivo optimizado por lotes
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

  /**
   * Reconcilia la base de datos eliminando OTs "fantasmas" que fueron modificadas o borradas en el Excel.
   * Si en el Excel cambiaron la OT 901885392 por 901885391, esta función elimina la 901885392 obsoleta.
   */
  public async reconcileObsoleteOts(
    currentValidOts: string[],
    campanasPresentes: string[]
  ): Promise<number> {
    if (!currentValidOts || currentValidOts.length === 0 || campanasPresentes.length === 0) {
      return 0;
    }

    try {
      const result = await prisma.sale.deleteMany({
        where: {
          campana: { in: campanasPresentes },
          idOt: { notIn: currentValidOts },
        },
      });

      if (result.count > 0) {
        console.log(`[Reconciliación] Se eliminaron ${result.count} registros obsoletos/corregidos que ya no existen en el Excel.`);
      }

      return result.count;
    } catch (err) {
      console.error("Error durante la reconciliación de OTs:", err);
      return 0;
    }
  }
}
