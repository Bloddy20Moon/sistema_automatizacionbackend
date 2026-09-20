import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Actualizando estructura de base de datos para Email y 2FA...");

  // 1. Agregar columna email a User
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
  `);
  console.log("1. Columna email agregada a User.");

  // 2. Crear tabla VerificationCode para el código de 6 dígitos de Gmail
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VerificationCode" (
      "id" TEXT PRIMARY KEY,
      "dni" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "expiresAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      "used" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VerificationCode_dni_code_idx" ON "VerificationCode"("dni", "code");
    CREATE INDEX IF NOT EXISTS "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");
  `);
  console.log("2. Tabla VerificationCode e índices creados correctamente.");

  // 3. Asignar un correo por defecto a los usuarios existentes si no tienen
  await prisma.$executeRawUnsafe(`
    UPDATE "User" SET email = 'supervisor.truscorp@gmail.com' WHERE dni = '12345678' AND email IS NULL;
    UPDATE "User" SET email = 'asesor.truscorp@gmail.com' WHERE dni = '87654321' AND email IS NULL;
  `);
  console.log("3. Correos iniciales asignados.");

  console.log("Base de datos lista para 2FA y Gestión con Gmail.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
