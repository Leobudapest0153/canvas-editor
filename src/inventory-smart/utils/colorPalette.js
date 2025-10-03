// utils/colorPalette.js

function hexToHsl(hex) {
  hex = hex.replace(/^#/, "");

  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c/2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

export function generatePalette(hex) {
  const { h, s, l } = hexToHsl(hex);

  // Escalas parecidas a Tailwind (lightness y saturación)
  const scale = [
    { step: 50,  l: 95, s: s * 0.4 },
    { step: 100, l: 90, s: s * 0.5 },
    { step: 200, l: 80, s: s * 0.6 },
    { step: 300, l: 70, s: s * 0.7 },
    { step: 400, l: 60, s: s * 0.85 },
    { step: 500, l: l,  s: s },       // base color
    { step: 600, l: l - 10, s: s * 1.1 },
    { step: 700, l: l - 20, s: s * 1.05 },
    { step: 800, l: l - 30, s: s * 0.9 },
    { step: 900, l: l - 40, s: s * 0.8 },
    { step: 950, l: 5, s: s * 0.6 }
  ];

  return scale.map(({ step, l, s }) => ({
    step,
    hex: hslToHex(h, Math.min(100, Math.max(0, s)), Math.min(100, Math.max(0, l)))
  }));
}
