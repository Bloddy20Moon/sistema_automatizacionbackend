import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Creando vistas analíticas en PostgreSQL...");

  // 1. Vista de Resumen y Efectividad por Asesor
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vista_resumen_asesor AS
    SELECT 
        u.dni AS dni_asesor,
        u.name AS nombre_asesor,
        u.queue AS cola,
        TO_CHAR(s."fechaVenta", 'YYYY-MM') AS periodo,
        COUNT(s.id)::int AS total_ingresadas,
        COUNT(CASE WHEN s.estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN s.estado = 'PENDIENTE' THEN 1 END)::int AS total_pendientes,
        COUNT(CASE WHEN s.estado = 'CAIDA' THEN 1 END)::int AS total_caidas,
        ROUND(
            (COUNT(CASE WHEN s.estado = 'ACTIVADO' THEN 1 END)::numeric / 
             NULLIF(COUNT(s.id), 0)) * 100, 2
        ) AS pct_efectividad,
        COALESCE(m.quota, 0)::int AS meta_mes,
        ROUND(
            (COUNT(CASE WHEN s.estado = 'ACTIVADO' THEN 1 END)::numeric / 
             NULLIF(COALESCE(m.quota, 0), 0)) * 100, 2
        ) AS pct_avance_meta
    FROM "User" u
    LEFT JOIN "Sale" s ON u.dni = s."dniAsesor"
    LEFT JOIN "Meta" m ON m."targetId" = u.dni AND m.period = TO_CHAR(s."fechaVenta", 'YYYY-MM')
    WHERE u.role = 'AGENT'
    GROUP BY u.dni, u.name, u.queue, TO_CHAR(s."fechaVenta", 'YYYY-MM'), m.quota;
  `);
  console.log("✔ Vista 1 creada: vista_resumen_asesor");

  // 2. Vista Comparativa por Campaña / Cola
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vista_rendimiento_colas AS
    SELECT 
        s.campana AS cola,
        TO_CHAR(s."fechaVenta", 'YYYY-MM') AS periodo,
        COUNT(s.id)::int AS total_ventas,
        COUNT(CASE WHEN s.estado = 'ACTIVADO' THEN 1 END)::int AS total_activadas,
        COUNT(CASE WHEN s.estado = 'CAIDA' THEN 1 END)::int AS total_caidas,
        ROUND(
            (COUNT(CASE WHEN s.estado = 'ACTIVADO' THEN 1 END)::numeric / 
             NULLIF(COUNT(s.id), 0)) * 100, 2
        ) AS efectividad_cola,
        COUNT(DISTINCT s."dniAsesor")::int AS asesores_activos
    FROM "Sale" s
    GROUP BY s.campana, TO_CHAR(s."fechaVenta", 'YYYY-MM');
  `);
  console.log("✔ Vista 2 creada: vista_rendimiento_colas");

  // 3. Vista de Pareto de Motivos de Caída
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vista_analisis_caidas AS
    SELECT 
        s.campana AS cola,
        COALESCE(s."motivoSiebel", 'SIN ESPECIFICAR') AS motivo_caida,
        COUNT(s.id)::int AS cantidad_caidas,
        ROUND(
            (COUNT(s.id)::numeric / 
             NULLIF(SUM(COUNT(s.id)) OVER (PARTITION BY s.campana), 0)) * 100, 2
        ) AS porcentaje_del_total
    FROM "Sale" s
    WHERE s.estado = 'CAIDA'
    GROUP BY s.campana, s."motivoSiebel";
  `);
  console.log("✔ Vista 3 creada: vista_analisis_caidas");

  // 4. Vista de Cuarentena para Ventas Huérfanas
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE VIEW vista_ventas_huerfanas AS
    SELECT 
        s.id AS sale_id,
        s."idOt",
        s."correlative",
        s."dniAsesor" AS dni_erroneo,
        s."nombreAsesor",
        s.campana AS cola,
        s."numeroPortarRenovar",
        s."fechaVenta",
        s.estado
    FROM "Sale" s
    LEFT JOIN "User" u ON s."dniAsesor" = u.dni
    WHERE u.dni IS NULL;
  `);
  console.log("✔ Vista 4 creada: vista_ventas_huerfanas");

  console.log("¡Todas las vistas analíticas han sido creadas exitosamente en PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("Error al crear las vistas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
