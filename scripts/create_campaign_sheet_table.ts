import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Creando tabla CampaignSheet en PostgreSQL...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CampaignSheet" (
      "id" TEXT PRIMARY KEY,
      "queue" "Queue" NOT NULL,
      "period" TEXT NOT NULL,
      "spreadsheetId" TEXT NOT NULL,
      "tabName" TEXT NOT NULL DEFAULT 'VENTAS',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastSyncAt" TIMESTAMP WITHOUT TIME ZONE,
      "lastSyncStatus" TEXT,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CampaignSheet_queue_period_key" ON "CampaignSheet"("queue", "period");
    CREATE INDEX IF NOT EXISTS "CampaignSheet_isActive_idx" ON "CampaignSheet"("isActive");
  `);

  console.log("Tabla CampaignSheet y sus índices creados correctamente.");

  // Insertar la hoja que ya probamos como registro inicial para el periodo 2026-07
  await prisma.$executeRawUnsafe(`
    INSERT INTO "CampaignSheet" ("id", "queue", "period", "spreadsheetId", "tabName", "isActive", "createdAt", "updatedAt")
    VALUES (
      'default-july-sheet',
      'WSP_DIGITAL',
      '2026-07',
      '1FH1T53l3dhc1212BfC2C9bJbY3GH1kpxrUlt4W4Xd0c',
      'VENTAS',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT ("queue", "period") DO NOTHING;
  `);

  console.log("Registro inicial de hoja configurado.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
