import * as fs from "fs";
import * as path from "path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
let content = fs.readFileSync(schemaPath, "utf8");

if (!content.includes("email        String?")) {
  content = content.replace("name         String", "name         String\n  email        String?");
}

if (!content.includes("model VerificationCode")) {
  content += `\nmodel VerificationCode {\n  id        String   @id @default(uuid())\n  dni       String\n  email     String\n  code      String\n  expiresAt DateTime\n  used      Boolean  @default(false)\n  createdAt DateTime @default(now())\n\n  @@index([dni, code])\n  @@index([expiresAt])\n}\n`;
}

fs.writeFileSync(schemaPath, content, "utf8");
console.log("schema.prisma actualitzado con éxito!");
