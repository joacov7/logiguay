// Abreviaciones de provincias argentinas para la vista compacta de ruta
const PROVINCE_ABBR: Record<string, string> = {
  'buenos aires': 'BsAs',
  'ciudad autónoma de buenos aires': 'CABA',
  'ciudad de buenos aires': 'CABA',
  'caba': 'CABA',
  'córdoba': 'Cba',
  'cordoba': 'Cba',
  'santa fe': 'SF',
  'entre ríos': 'ER',
  'entre rios': 'ER',
  'mendoza': 'Mza',
  'tucumán': 'Tuc',
  'tucuman': 'Tuc',
  'salta': 'Sal',
  'misiones': 'Mis',
  'chaco': 'Cha',
  'corrientes': 'Ctes',
  'santiago del estero': 'SE',
  'san juan': 'SJ',
  'jujuy': 'Juj',
  'río negro': 'RN',
  'rio negro': 'RN',
  'neuquén': 'Nqn',
  'neuquen': 'Nqn',
  'formosa': 'For',
  'la pampa': 'LP',
  'chubut': 'Chu',
  'san luis': 'SL',
  'catamarca': 'Cat',
  'la rioja': 'LR',
  'santa cruz': 'SC',
  'tierra del fuego': 'TDF',
};

function abbreviateProvince(raw: string): string {
  const key = raw.trim().toLowerCase();
  return PROVINCE_ABBR[key] ?? raw.trim();
}

/**
 * Convierte una dirección larga en una etiqueta corta de ciudad + provincia.
 *
 * Ejemplos:
 *   "Av. Vélez Sarsfield 1234, Bell Ville, Departamento Unión, Córdoba"
 *   → "Bell Ville (Cba)"
 *
 *   "Belgrano, Ciudad Autónoma de Buenos Aires"
 *   → "Belgrano (CABA)"
 *
 *   "General Roca"
 *   → "General Roca" (sin provincia detectada, se muestra tal cual)
 *
 * La lógica:
 *   - Partir por coma.
 *   - Último segmento = provincia (abreviar).
 *   - Primer segmento que no empiece con palabras de calle ("Av.", "Calle",
 *     "Ruta", "RN", "RP", número) = ciudad.
 *   - Si solo hay 1 segmento: truncar a 22 caracteres.
 */
export function formatAddressShort(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return address;
  if (parts.length === 1) {
    return parts[0].length > 22 ? parts[0].slice(0, 22) + '…' : parts[0];
  }

  const province = abbreviateProvince(parts[parts.length - 1]);

  // Busca la primera parte que no luzca como nombre de calle
  const streetPrefixes = /^(av\.?|calle|ruta|rn\s|rp\s|\d)/i;
  let city = parts[0];
  for (const part of parts) {
    if (!streetPrefixes.test(part) && !/^departamento|^partido|^distrito/i.test(part)) {
      city = part;
      break;
    }
  }

  // Evitar mostrar "provincia (provincia)"
  if (city.toLowerCase() === parts[parts.length - 1].toLowerCase()) {
    return abbreviateProvince(city);
  }

  return `${city} (${province})`;
}

/**
 * Formatea una ruta completa como "Ciudad A (Prov) → Ciudad B (Prov)".
 * Usada en la tarjeta de la bolsa para reemplazar las direcciones largas
 * y mejorar la legibilidad a primera vista.
 */
export function formatRouteShort(origin: string, destination: string): string {
  return `${formatAddressShort(origin)} → ${formatAddressShort(destination)}`;
}
