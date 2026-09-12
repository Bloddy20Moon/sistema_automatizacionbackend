export type TransactionTypeEnum = "PORTA" | "LINEA_NUEVA" | "ADICIONAL" | "RENO";
export type OpStateEnum = "PENDIENTE" | "ACTIVADO" | "CAIDA";

export interface TransformedSaleRecord {
  idOt: string;
  correlative: number;
  fechaVenta: Date;
  estado: OpStateEnum;
  tipoVenta: TransactionTypeEnum;
  venta: string | null;
  fechaActivacion: Date | null;
  campana: string;
  dniCliente: string;
  nombreCliente: string;
  numeroPortarRenovar: string | null;
  tipoEntrega: string;
  linkBotmaker: string | null;
  dniAsesor: string;
  nombreAsesor: string;
  reingreso: string | null;
  resultadoEntrega: string | null;
  estadoSiebel: string | null;
  motivoSiebel: string | null;
}

export class SalesDataTransformer {
  /**
   * Parsea fechas en formato peruano común (DD/MM/YYYY o DD/MM/YYYY HH:mm:ss)
   */
  public parsePeruvianDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr || typeof dateStr !== "string") return null;
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === "-" || trimmed === "N/A") return null;

    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
    const match = trimmed.match(regex);
    if (!match) {
      const fallback = new Date(trimmed);
      return isNaN(fallback.getTime()) ? null : fallback;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;

    const date = new Date(year, month, day, hour, minute, second);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Extrae números móviles de 9 dígitos peruanos que inician con 9
   */
  public extractPhoneNumbers(text: string | undefined | null): string[] {
    if (!text || typeof text !== "string") return [];
    const numbers: string[] = [];
    const regex = /(?:(?:\+?51)|0)?([9]\d{8})/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const num = match[1];
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers;
  }

  /**
   * CASA y TRABAJO es DELIVERY, RETIRO EN TIENDA es PICKUP
   */
  public normalizeDelivery(lugar: string | undefined | null): string {
    if (!lugar) return "DELIVERY";
    const upper = lugar.toUpperCase().trim();
    if (upper.includes("TIENDA") || upper.includes("PICKUP") || upper.includes("RETIRO")) {
      return "PICKUP";
    }
    if (upper.includes("CASA") || upper.includes("TRABAJO") || upper.includes("DELIVERY")) {
      return "DELIVERY";
    }
    return upper || "DELIVERY";
  }

  /**
   * Normaliza la columna VENTA: Mono es 1, doble es 2, triple es 3, cuadruple 4, quintuple 5
   */
  public normalizeVenta(ventaStr: string | undefined | null, numCount: number): string {
    if (ventaStr) {
      const upper = ventaStr.toUpperCase().trim();
      if (upper.includes("MONO")) return "MONO (1)";
      if (upper.includes("DOBLE")) return "DOBLE (2)";
      if (upper.includes("TRIPLE")) return "TRIPLE (3)";
      if (upper.includes("CUADRUPLE") || upper.includes("CUÁDRUPLE")) return "CUADRUPLE (4)";
      if (upper.includes("QUINTUPLE") || upper.includes("QUÍNTUPLE")) return "QUINTUPLE (5)";
    }

    if (numCount === 1) return "MONO (1)";
    if (numCount === 2) return "DOBLE (2)";
    if (numCount === 3) return "TRIPLE (3)";
    if (numCount === 4) return "CUADRUPLE (4)";
    if (numCount >= 5) return "QUINTUPLE (5)";

    return ventaStr ? ventaStr.trim() : "MONO (1)";
  }

  /**
   * Mapea el texto del tipo de venta al enum de Prisma: PORTA, LINEA_NUEVA, ADICIONAL, RENO
   */
  public normalizeTransactionType(tipoVenta: string | undefined | null): TransactionTypeEnum {
    if (!tipoVenta) return "LINEA_NUEVA";
    const upper = tipoVenta.toUpperCase().trim();
    if (upper.includes("PORTA")) return "PORTA";
    if (upper.includes("RENO")) return "RENO";
    if (upper.includes("ADICIONAL")) return "ADICIONAL";
    if (upper.includes("REGULAR") || upper.includes("NUEVA")) return "LINEA_NUEVA";
    return "LINEA_NUEVA";
  }

  /**
   * Mapea el estado operativo: ACTIVADO, CAIDA, PENDIENTE
   */
  public normalizeOpState(estado: string | undefined | null): OpStateEnum {
    if (!estado) return "PENDIENTE";
    const upper = estado.toUpperCase().trim();
    if (upper.includes("ACTIVADO") && !upper.includes("NO")) return "ACTIVADO";
    if (upper.includes("NO ACTIVADO") || upper.includes("CAIDA") || upper.includes("CANCEL")) return "CAIDA";
    return "PENDIENTE";
  }

  /**
   * Transforma filas crudas de Google Sheets aplicando reglas y desagregación multilínea
   */
  public transformRows(rawRows: any[][]): TransformedSaleRecord[] {
    const records: TransformedSaleRecord[] = [];

    for (const row of rawRows) {
      const rawIdOt = (row[52] || "").toString().trim(); // Col BA [52]
      if (!rawIdOt || rawIdOt === "-" || rawIdOt.toUpperCase() === "ID OT") {
        continue;
      }

      const campana = (row[1] || "GENERAL").toString().trim(); // Col B [1]
      const fechaVenta = this.parsePeruvianDate(row[2]) || new Date(); // Col C [2]
      const tipoVenta = this.normalizeTransactionType(row[6]); // Col G [6]
      const rawVenta = row[8] ? row[8].toString().trim() : null; // Col I [8]
      const dniCliente = (row[10] || "-").toString().trim(); // Col K [10]
      const nombreCliente = (row[11] || "CLIENTE").toString().trim(); // Col L [11]
      const rawNumero = row[18] ? row[18].toString().trim() : ""; // Col S [18]
      const tipoEntrega = this.normalizeDelivery(row[37]); // Col AL [37]
      const linkBotmaker = row[45] ? row[45].toString().trim() : null; // Col AT [45]
      const dniAsesor = (row[47] || "00000000").toString().trim(); // Col AV [47]
      const nombreAsesor = (row[48] || "ASESOR").toString().trim(); // Col AW [48]
      const reingreso = row[54] ? row[54].toString().trim() : null; // Col BC [54]
      const resultadoEntrega = row[57] ? row[57].toString().trim() : null; // Col BF [57]
      const estadoSiebel = row[58] ? row[58].toString().trim() : null; // Col BG [58]
      const motivoSiebel = row[59] ? row[59].toString().trim() : null; // Col BH [59]
      const fechaActivacion = this.parsePeruvianDate(row[60]); // Col BI [60]
      const estado = this.normalizeOpState(row[61]); // Col BJ [61]

      const phoneList = this.extractPhoneNumbers(rawNumero);
      const venta = this.normalizeVenta(rawVenta, phoneList.length);

      if (phoneList.length > 1) {
        // Desagregación multilínea: 1 registro por cada número con correlativo secuencial
        phoneList.forEach((phone, idx) => {
          records.push({
            idOt: rawIdOt,
            correlative: idx + 1,
            fechaVenta,
            estado,
            tipoVenta,
            venta,
            fechaActivacion,
            campana,
            dniCliente,
            nombreCliente,
            numeroPortarRenovar: phone,
            tipoEntrega,
            linkBotmaker,
            dniAsesor,
            nombreAsesor,
            reingreso,
            resultadoEntrega,
            estadoSiebel,
            motivoSiebel,
          });
        });
      } else {
        records.push({
          idOt: rawIdOt,
          correlative: 1,
          fechaVenta,
          estado,
          tipoVenta,
          venta,
          fechaActivacion,
          campana,
          dniCliente,
          nombreCliente,
          numeroPortarRenovar: phoneList.length === 1 ? phoneList[0] : (rawNumero !== "-" ? rawNumero : null),
          tipoEntrega,
          linkBotmaker,
          dniAsesor,
          nombreAsesor,
          reingreso,
          resultadoEntrega,
          estadoSiebel,
          motivoSiebel,
        });
      }
    }

    return records;
  }
}
