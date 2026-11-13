import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

class ResendMailer implements Mailer {
  private readonly client: Resend;
  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({ from: this.from, ...message });
    if (error) throw new Error(`Resend: ${error.name}`);
  }
}

/** Sin credenciales: no se envía nada. Solo registra el hecho, sin contenido sensible. */
class UnconfiguredMailer implements Mailer {
  async send(message: EmailMessage): Promise<void> {
    console.warn("email_not_configured", { subject: message.subject });
    if (process.env.NODE_ENV !== "production") {
      // Útil en desarrollo local: permite seguir el enlace sin un proveedor de correo.
      console.info(`[email:dev] ${message.subject} -> ${message.to}\n${message.text}`);
    }
  }
}

let override: Mailer | null = null;
let cached: Mailer | null = null;

/** Para pruebas: inyecta un mailer falso (null restablece el comportamiento normal). */
export function setMailer(mailer: Mailer | null): void {
  override = mailer;
}

export function getMailer(): Mailer {
  if (override) return override;
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  cached = apiKey && from ? new ResendMailer(apiKey, from) : new UnconfiguredMailer();
  return cached;
}
