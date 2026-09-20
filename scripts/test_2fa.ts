import prisma from "../src/lib/prisma";

async function main() {
  const codeRecord = await prisma.verificationCode.findFirst({
    where: { dni: "74980211", used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!codeRecord) {
    console.log("No hay código activo.");
    return;
  }

  console.log("Código encontrado:", codeRecord.code);

  const response = await fetch("http://localhost:3000/api/auth/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dni: "74980211",
      code: codeRecord.code,
    }),
  });

  const data = await response.json();
  console.log("Respuesta de login-verify:", data);

  await prisma.$disconnect();
}

main().catch(console.error);
