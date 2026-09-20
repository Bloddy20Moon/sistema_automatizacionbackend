import nodemailer from "nodemailer";

export interface SendOtpInput {
  toEmail: string;
  userName: string;
  otpCode: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true para 465, false para 587
        auth: { user, pass },
      });
    }
  }

  /**
   * Envía un código OTP de 6 dígitos optimizado para evitar filtros de SPAM
   */
  public async sendOtpEmail(input: SendOtpInput): Promise<{ sent: boolean; message: string }> {
    const { toEmail, userName, otpCode } = input;

    // Texto plano alternativo (Crucial para que Gmail y Outlook no lo marquen como SPAM)
    const textContent = `Hola ${userName},\n\nTu código de verificación para ingresar a la Plataforma Comercial TRUSCORP es: ${otpCode}\n\nEste código es válido por 10 minutos.\nSi no solicitaste este acceso, por favor ignora este mensaje.\n\nAtentamente,\nEquipo de Seguridad TRUSCORP`;

    // Plantilla HTML profesional y limpia sin scripts ni enlaces sospechosos
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificación TRUSCORP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="500" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #0f172a; padding: 25px 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">TRUSCORP</h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Sistema de Control de Efectividad Comercial</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="color: #1e293b; margin: 0 0 12px 0; font-size: 18px;">Hola, ${userName}</h2>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 25px 0;">
                Has solicitado iniciar sesión en la plataforma. Utiliza el siguiente código de seguridad de 6 dígitos para completar tu acceso:
              </p>
              
              <!-- OTP Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background-color: #f1f5f9; border: 2px dashed #0284c7; border-radius: 8px; padding: 18px 25px; display: inline-block;">
                      <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; font-family: monospace;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 25px 0 0 0; text-align: center;">
                ⏳ Este código es válido por <strong>10 minutos</strong> y de un solo uso.<br>
                Si no intentaste iniciar sesión, comunícate de inmediato con tu supervisor.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                © 2026 TRUSCORP S.A.C. - Mensaje de seguridad transaccional automatizado.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    if (!this.transporter) {
      console.log("\n=============================================================");
      console.log(`🔑 [DESARROLLO 2FA] CÓDIGO DE VERIFICACIÓN PARA ${userName} (${toEmail}):`);
      console.log(`👉👉👉  ${otpCode}  👈👈👈 (Expira en 10 minutos)`);
      console.log("=============================================================\n");
      return {
        sent: true,
        message: `Modo desarrollo: El código OTP es ${otpCode} (Configura SMTP_USER y SMTP_PASS en .env para entrega real por Gmail).`,
      };
    }

    try {
      await this.transporter.sendMail({
        from: `"TRUSCORP Seguridad" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Tu código de verificación TRUSCORP: ${otpCode}`,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Priority": "1", // Alta prioridad
          "X-MSMail-Priority": "High",
          Importance: "high",
        },
      });

      return { sent: true, message: `Código de verificación enviado exitosamente a ${toEmail}.` };
    } catch (error: any) {
      console.error("Error al enviar correo OTP:", error);
      return { sent: false, message: `Error al enviar correo: ${error.message}` };
    }
  }
}
