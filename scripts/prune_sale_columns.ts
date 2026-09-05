import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Limpiando columnas no deseadas de la tabla Sale...");

  const columnsToDrop = [
    "cd",
    "tuHicisteCvoz",
    "validador",
    "detalleVenta",
    "oferta",
    "numeroReferencia",
    "operadorActual",
    "origenLinea",
    "ciclo",
    "tipoPlan",
    "planesNuevos",
    "planesAntiguos",
    "lineaAsociada",
    "sku",
    "cantidadCuotas",
    "cuotasMensuales",
    "promocion",
    "motivoRt",
    "modalidad",
    "motivo24h72h",
    "fechaEntrega",
    "lugarEntrega",
    "direccionEntrega",
    "referenciaEntrega",
    "coordenadas",
    "direccionFacturacion",
    "medioVenta",
    "turno",
    "idValkiria",
    "resultado",
    "excepciones",
    "observacionCalidad",
    "calidad",
    "gtrVenta",
    "condicional",
    "marcaTemporal"
  ];

  for (const col of columnsToDrop) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" DROP COLUMN IF EXISTS "${col}";`);
    } catch (e: any) {
      console.warn(`Aviso al eliminar columna ${col}:`, e.message);
    }
  }

  console.log("¡Columnas no deseadas eliminadas exitosamente de PostgreSQL!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
