// Design tokens — "Clean Industrial"
// Claro pero sobrio: fondo gris piedra, bordes en lugar de sombras,
// esquinas angulares, verde solo donde importa.

export const T = {
  // Backgrounds
  bgApp: '#F0F0F0',       // fondo de pantalla (gris piedra)
  bgCard: '#FFFFFF',      // tarjeta / superficie
  bgHeader: '#FFFFFF',    // header de pantalla
  bgMuted: '#F7F7F7',     // fila alternada / input

  // Borders
  border: '#E3E3E3',      // borde estándar
  borderStrong: '#C8C8C8',// borde prominente

  // Text
  textPrimary: '#111111',   // texto principal
  textSecondary: '#555555', // texto secundario
  textMuted: '#999999',     // texto apagado / labels

  // Accent (usar con moderación)
  accent: '#15A66A',        // verde marca
  accentLight: '#E8F5EE',   // fondo verde suave

  // Status (sin fondos de colores vivos — solo texto)
  statusActive: '#15A66A',
  statusWarning: '#C47B00',
  statusDanger: '#C0392B',
  statusNeutral: '#888888',

  // Radius
  radius: 6,
  radiusSm: 4,

  // Typography
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 18,
  fontSizeXl: 24,

  // Spacing
  spaceSm: 8,
  spaceMd: 16,
  spaceLg: 24,
} as const;
