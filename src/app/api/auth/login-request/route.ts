import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EmailService } from "@/services/email/EmailService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const emailService = new EmailService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dni, name } = body;

    if (!dni) {
      return NextResponse.json(
        { success: false, error: "El DNI es obligatorio." },
        { status: 400 }
      );
    }

    const cleanDni = dni.toString().trim();

    // 1. Buscar usuario en base de datos
    const user = await prisma.user.findUnique({
      where: { dni: cleanDni },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado con el DNI proporcionado." },
        { status: 404 }
      );
    }

    // 2. Validar que la cuenta esté activa
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Tu cuenta ha sido desactivada por el Jefe de Operaciones. Comunícate con administración.",
        },
        { status: 403 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          error: "El usuario no tiene un correo Gmail registrado. El Jefe debe asignarle un correo en el módulo de usuarios.",
        },
        { status: 400 }
      );
    }

    // 3. Generar código aleatorio seguro de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // 4. Guardar en tabla VerificationCode
    await prisma.verificationCode.create({
      data: {
        dni: cleanDni,
        email: user.email,
        code: otpCode,
        expiresAt,
        used: false,
      },
    });

    // 5. Enviar por correo Gmail con formato anti-spam
    const emailResult = await emailService.sendOtpEmail({
      toEmail: user.email,
      userName: user.name,
      otpCode,
    });

    // Enmascarar correo para privacidad (ej: b***@gmail.com)
    const [userPart, domainPart] = user.email.split("@");
    const maskedEmail = `${userPart.charAt(0)}***@${domainPart}`;

    return NextResponse.json({
      success: true,
      message: `Código de verificación enviado al correo ${maskedEmail}.`,
      emailMasked: maskedEmail,
      expiresInMinutes: 10,
      devMessage: emailResult.message,
    });
  } catch (error: any) {
    console.error("Error en login-request:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
