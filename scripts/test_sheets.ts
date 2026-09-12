import { google } from "googleapis";

async function main() {
  const spreadsheetId = "1FH1T53l3dhc1212BfC2C9bJbY3GH1kpxrUlt4W4Xd0c";
  const keyFilePath = "c:\\Users\\adria\\Desktop\\TRUSCORP\\sistema_automatizacionbackend\\credentials.json";

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'VENTAS'!A2:BL30",
  });

  const rows = response.data.values || [];
  console.log(`Leídas ${rows.length} filas.`);

  rows.slice(0, 10).forEach((row, i) => {
    const idOt = row[52] || ""; // BA
    const campana = row[1] || ""; // B
    const fechaVenta = row[2] || ""; // C
    const tipoVenta = row[6] || ""; // G
    const venta = row[8] || ""; // I
    const dniCli = row[10] || ""; // K
    const num = row[18] || ""; // S
    const entrega = row[37] || ""; // AL
    const botmaker = row[45] || ""; // AT
    const dniAsesor = row[47] || ""; // AV
    const nomAsesor = row[48] || ""; // AW
    const resEntrega = row[57] || ""; // BF
    const estSiebel = row[58] || ""; // BG
    const motSiebel = row[59] || ""; // BH
    const fActiv = row[60] || ""; // BI
    const estado = row[61] || ""; // BJ

    console.log(`[Fila ${i + 2}] OT: "${idOt}" | Camp: "${campana}" | Venta: "${venta}" | Num: "${num}" | Lugar: "${entrega}" | Estado: "${estado}" | Siebel: "${estSiebel}/${motSiebel}"`);
  });
}
main().catch(console.error);
