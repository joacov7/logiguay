/**
 * Enmascara información de contacto en los mensajes del chat para evitar la
 * disintermediación (que dador y transportista cierren por fuera de la
 * plataforma y se salteen la comisión).
 *
 * Detecta y reemplaza por "[contacto oculto]":
 *  - Emails
 *  - URLs / dominios
 *  - Números de teléfono (secuencias largas de dígitos, con o sin separadores)
 *  - Menciones a apps de mensajería externas (whatsapp, wsp, telegram, etc.)
 *  - Handles tipo @usuario
 *
 * El texto enmascarado es lo único que se persiste: la PII nunca toca la base.
 */

const PLACEHOLDER = '[contacto oculto]';

// Email
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// URLs y dominios (incluye www. y dominios sueltos como "miempresa.com.ar")
const URL = /\b((https?:\/\/)?(www\.)?[A-Za-z0-9-]+(\.[A-Za-z]{2,})+(\/[^\s]*)?)\b/g;

// Handles @usuario (instagram/telegram/etc.)
const HANDLE = /(^|\s)@[A-Za-z0-9._]{2,}/g;

// Apps de mensajería / palabras señuelo seguidas eventualmente de un número
const MESSAGING_APPS = /\b(whats\s?app|whatsapp|wsp|wpp|wasap|telegram|tel[eé]fono|tel\.?|cel(ular)?|llamame|llam[aá]|contactame|mi\s?n[uú]mero)\b/gi;

// Secuencias de dígitos que parecen teléfonos: 7+ dígitos permitiendo
// espacios, guiones, puntos, comas, barras, paréntesis y prefijo +.
// Ej: +54 9 351 123-4567, 11/5555/4444, 11,5555,4444
const PHONE = /(\+?\d[\d\s().,/-]{6,}\d)/g;

// Formatos de precio aceptados tras "$":
//  - Miles agrupados, con decimales opcionales: 1.250.000 / 1.250.000,50
//  - Dígitos corridos hasta 7 (con decimales opcionales): 1500000 / 250000,50
// Un run corrido de 8+ dígitos tras $ se sigue enmascarando: es el largo
// típico de un teléfono y sería el bypass "$1155554444".
const PRICE_FORMAT = /^(\d{1,3}([.,]\d{3})+|\d{1,7})([.,]\d{1,2})?$/;

export interface MaskResult {
  masked: string;
  hadContact: boolean;
}

export function maskContactInfo(input: string): MaskResult {
  if (!input) return { masked: '', hadContact: false };

  let hadContact = false;
  const flag = (replacer: () => string) => {
    hadContact = true;
    return replacer();
  };

  let out = input;
  out = out.replace(EMAIL, () => flag(() => PLACEHOLDER));
  out = out.replace(URL, (m) => {
    // Evita enmascarar cosas que no son dominios reales (sin TLD razonable ya filtrado por regex)
    return flag(() => PLACEHOLDER);
  });
  out = out.replace(PHONE, (m, _g, offset: number, full: string) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 7) return m;
    // No enmascarar precios: solo se exceptúa si viene precedido por "$" Y
    // tiene formato estricto de miles (ej: $1.250.000). "$1155554444" no
    // califica: sería un bypass trivial para pasar un teléfono.
    const before = full.slice(0, offset).trimEnd();
    if (before.endsWith('$') && PRICE_FORMAT.test(m.trim())) return m;
    return flag(() => PLACEHOLDER);
  });
  out = out.replace(HANDLE, (m, pre) => flag(() => `${pre}${PLACEHOLDER}`));
  out = out.replace(MESSAGING_APPS, () => flag(() => PLACEHOLDER));

  // Colapsa placeholders repetidos consecutivos
  out = out.replace(new RegExp(`(${escapeRegex(PLACEHOLDER)}\\s*){2,}`, 'g'), `${PLACEHOLDER} `).trim();

  return { masked: out, hadContact };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
