import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

const FROM = 'Logiguay <notificaciones@logiguay.com.ar>';
const LOGO = 'https://logiguay.com.ar/logo-logiguay.png';
const GREEN = '#15A66A';
const DARK = '#0d3d22';

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Logiguay</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${DARK};padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">LOGIGUAY</span>
                  <span style="color:${GREEN};font-size:11px;display:block;margin-top:2px;letter-spacing:1px;text-transform:uppercase;">Cargas que mueven al país</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              © ${new Date().getFullYear()} Logiguay · Plataforma de logística y transporte<br/>
              <a href="https://logiguay.com.ar" style="color:${GREEN};text-decoration:none;">logiguay.com.ar</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${GREEN};color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:20px;">${text}</a>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:12px 0;color:#4b5563;font-size:15px;line-height:1.6;">${text}</p>`;
}

function infoBox(rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;width:140px;">${label}</td>
      <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;">${value}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin:20px 0;">${cells}</table>`;
}

export interface QuotaReceivedParams {
  to: string;
  dadoName: string;
  transportistaName: string;
  cargoType: string;
  origin: string;
  destination: string;
  amount: number;
  cargoId: string;
}

export interface QuoteAcceptedParams {
  to: string;
  transportistaName: string;
  dadoName: string;
  cargoType: string;
  origin: string;
  destination: string;
  amount: number;
  tripId: string;
}

export interface TripStatusParams {
  to: string;
  recipientName: string;
  cargoType: string;
  origin: string;
  destination: string;
  newStatus: string;
  tripId: string;
}

export interface TripFinalizedParams {
  to: string;
  recipientName: string;
  cargoType: string;
  origin: string;
  destination: string;
  amount: number;
  tripId: string;
}

export interface ContactRequestParams {
  to: string;
  transportistaName: string;
  dadoName: string;
  mensaje: string;
  origen?: string;
  destino?: string;
  toneladas?: number;
  tarifaOfrecida?: number;
}

const STATUS_LABELS: Record<string, string> = {
  EN_CAMINO_ORIGEN: 'En camino al origen',
  EN_CARGA: 'En carga',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'En descarga',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly appUrl: string;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://logiguay.com.ar';
    if (key) {
      this.resend = new Resend(key);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY no configurada — los emails están deshabilitados');
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({ from: FROM, to, subject, html });
      this.logger.log(`Email enviado a ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${to}: ${(err as Error).message}`);
    }
  }

  // ── 1. Nueva cotización recibida (al DADOR) ──────────────────────────────────
  async sendQuoteReceived(p: QuotaReceivedParams) {
    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const url = `${this.appUrl}/cargas`;
    const html = base(`
      ${h1('Recibiste una nueva cotización')}
      ${p(`Hola <strong>${p.dadoName}</strong>, <strong>${p.transportistaName}</strong> cotizó tu carga de ${p.cargoType}.`)}
      ${infoBox([
        ['Tipo de carga', p.cargoType],
        ['Origen', p.origin],
        ['Destino', p.destination],
        ['Monto ofrecido', fmt(p.amount)],
        ['Transportista', p.transportistaName],
      ])}
      ${p('Entrá a Logiguay para comparar cotizaciones y elegir la que más te convenga.')}
      ${btn('Ver cotizaciones', url)}
    `);
    await this.send(p.to, `Nueva cotización de ${p.transportistaName} — ${p.cargoType}`, html);
  }

  // ── 2. Cotización aceptada (al TRANSPORTISTA) ─────────────────────────────────
  async sendQuoteAccepted(p: QuoteAcceptedParams) {
    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const url = `${this.appUrl}/viajes`;
    const html = base(`
      ${h1('¡Tu cotización fue aceptada!')}
      ${p(`Hola <strong>${p.transportistaName}</strong>, <strong>${p.dadoName}</strong> aceptó tu cotización.`)}
      ${infoBox([
        ['Tipo de carga', p.cargoType],
        ['Origen', p.origin],
        ['Destino', p.destination],
        ['Tarifa acordada', fmt(p.amount)],
        ['Dador de carga', p.dadoName],
      ])}
      ${p('El viaje ya aparece en tu sección de Viajes. Coordiná la asignación de vehículo y chofer.')}
      ${btn('Ver mis viajes', url)}
    `);
    await this.send(p.to, `¡Cotización aceptada! ${p.cargoType} — ${p.origin} → ${p.destination}`, html);
  }

  // ── 3. Cambio de estado del viaje ─────────────────────────────────────────────
  async sendTripStatusUpdate(p: TripStatusParams) {
    const label = STATUS_LABELS[p.newStatus] ?? p.newStatus;
    const url = `${this.appUrl}/viajes`;
    const isCancel = p.newStatus === 'CANCELADO';
    const html = base(`
      ${h1(isCancel ? 'Viaje cancelado' : `Viaje actualizado: ${label}`)}
      ${p(`Hola <strong>${p.recipientName}</strong>, el estado de tu viaje cambió.`)}
      ${infoBox([
        ['Carga', p.cargoType],
        ['Origen', p.origin],
        ['Destino', p.destination],
        ['Nuevo estado', label],
      ])}
      ${isCancel
        ? p('Si tenés dudas, comunicate con la otra parte a través de la plataforma.')
        : p('Podés seguir el viaje en tiempo real desde Logiguay.')
      }
      ${btn('Ver viaje', url)}
    `);
    await this.send(p.to, `Viaje ${label} — ${p.cargoType}`, html);
  }

  // ── 4. Viaje finalizado (a ambos) ─────────────────────────────────────────────
  async sendTripFinalized(p: TripFinalizedParams) {
    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const url = `${this.appUrl}/viajes`;
    const html = base(`
      ${h1('¡Viaje finalizado!')}
      ${p(`Hola <strong>${p.recipientName}</strong>, el viaje se completó exitosamente.`)}
      ${infoBox([
        ['Carga', p.cargoType],
        ['Origen', p.origin],
        ['Destino', p.destination],
        ['Tarifa', fmt(p.amount)],
      ])}
      <div style="background:#f0faf5;border-left:4px solid ${GREEN};padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0;">
        <p style="margin:0;color:#0d6e46;font-size:14px;font-weight:600;">⭐ ¿Cómo fue la experiencia?</p>
        <p style="margin:8px 0 0;color:#4b5563;font-size:13px;">Calificá el viaje para ayudar a otros usuarios de la comunidad.</p>
      </div>
      ${btn('Calificar y ver detalle', url)}
    `);
    await this.send(p.to, `Viaje finalizado — ${p.cargoType} (${p.origin} → ${p.destination})`, html);
  }

  // ── 5. Solicitud de contacto de un dador (al TRANSPORTISTA) ──────────────────
  async sendContactRequest(p: ContactRequestParams) {
    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const url = `${this.appUrl}/alertas`;
    const rows: [string, string][] = [['De', p.dadoName]];
    if (p.origen) rows.push(['Origen', p.origen]);
    if (p.destino) rows.push(['Destino', p.destino]);
    if (p.toneladas) rows.push(['Toneladas', `${p.toneladas} t`]);
    if (p.tarifaOfrecida) rows.push(['Tarifa ofrecida', fmt(p.tarifaOfrecida)]);
    const html = base(`
      ${h1('Recibiste una solicitud de carga')}
      ${p(`Hola <strong>${p.transportistaName}</strong>, <strong>${p.dadoName}</strong> quiere contactarte.`)}
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-size:14px;font-weight:600;">Mensaje:</p>
        <p style="margin:8px 0 0;color:#78350f;font-size:14px;line-height:1.6;">"${p.mensaje}"</p>
      </div>
      ${infoBox(rows)}
      ${p('Respondé a través de Logiguay para coordinar los detalles.')}
      ${btn('Ver en mis alertas', url)}
    `);
    await this.send(p.to, `${p.dadoName} quiere contratarte — Logiguay`, html);
  }
}
