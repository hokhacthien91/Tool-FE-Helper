// Color math utilities shared across the UI.
// Keep this file "boring JS" for maximum compatibility with the Figma plugin UI runtime.

export function getColorBrightness(hex) {
  // Perceived brightness (0..255). Useful for sorting dark -> light.
  if (!hex) return 0;
  const cleanHex = String(hex).replace("#", "");
  if (cleanHex.length < 6) return 0;

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;

  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function getColorDistance(color1, color2) {
  // Euclidean distance in RGB space.
  const hex1 = String(color1 || "").replace("#", "");
  const hex2 = String(color2 || "").replace("#", "");
  if (hex1.length < 6 || hex2.length < 6) return Infinity;

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  if ([r1, g1, b1, r2, g2, b2].some((v) => isNaN(v))) return Infinity;

  const dr = r2 - r1;
  const dg = g2 - g1;
  const db = b2 - b1;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getRelativeLuminance(hex) {
  const hexClean = String(hex || "").replace("#", "");
  if (hexClean.length < 6) return 0;

  const r = parseInt(hexClean.substring(0, 2), 16) / 255;
  const g = parseInt(hexClean.substring(2, 4), 16) / 255;
  const b = parseInt(hexClean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;

  const rLin = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLin = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLin = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function calculateContrastRatio(color1Hex, color2Hex) {
  const lum1 = getRelativeLuminance(color1Hex);
  const lum2 = getRelativeLuminance(color2Hex);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}


