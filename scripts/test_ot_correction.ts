import prisma from "../src/lib/prisma";

async function main() {
  console.log("Creando temporalmente venta con OT errónea 901885392...");

  // 1. Limpieza preventiva
  await prisma.sale.deleteMany({ where: { idOt: { in: ["901885392", "901885391"] } } });

  // 2. Insertar OT errónea
  await prisma.sale.create({
    data: {
      idOt: "901885392",
      correlative: 1,
      fechaVenta: new Date(),
      campana: "VENTA:   SS_PUB_SEO_Direct_TRS",
      tipoVenta: "PORTA",
      dniCliente: "11223344",
      nombreCliente: "Cliente Prueba OT",
      dniAsesor: "74980211",
      nombreAsesor: "Brajhann Saldarriaga",
    },
  });
  console.log("OT 901885392 creada en base de datos.");

  // 3. Invocar endpoint PATCH /api/sales/reassign cambiando 901885392 por 901885391
  const response = await fetch("http://localhost:3000/api/sales/reassign", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      oldIdOt: "901885392",
      newIdOt: "901885391",
    }),
  });

  const result = await response.json();
  console.log("Respuesta del servidor:", result);

  // 4. Verificar que la OT vieja ya no existe y la nueva sí existe
  const oldCheck = await prisma.sale.findFirst({ where: { idOt: "901885392" } });
  const newCheck = await prisma.sale.findFirst({ where: { idOt: "901885391" } });

  console.log("¿Existe la OT antigua 901885392?:", oldCheck !== null ? "SÍ (ERROR)" : "NO (Eliminada/Reemplazada) ✅");
  console.log("¿Existe la OT nueva 901885391?:", newCheck !== null ? "SÍ (Corregida exitosamente) ✅" : "NO (ERROR)");

  // 5. Limpieza
  await prisma.sale.deleteMany({ where: { idOt: { in: ["901885392", "901885391"] } } });
  console.log("Limpieza completada.");

  await prisma.$disconnect();
}

main().catch(console.error);
