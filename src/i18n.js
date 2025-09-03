export const messages = {
  es: {
    views: {
      label: 'Vista',
      XY: 'Vista aérea',
      XZ: 'Vista de frente',
    },
  },
}

export function t(key, locale = 'es') {
  return key.split('.').reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), messages[locale]) ?? key
}
