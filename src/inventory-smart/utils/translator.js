// Utilidad ligera de "traducción"/etiquetas.
// Mantiene una tabla de claves -> texto y expone translate (alias t).

const dictionary = {
  // Vistas
  'views.label': 'Vista',
  'views.XY': 'Vista aérea',
  'views.XZ': 'Vista de frente',

  // Unidades
  'units.cm': 'cm',
  'units.m': 'm',
}

export function translate(key) {
  return Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : key
}

// Alias para compatibilidad con el uso actual en plantillas
export const t = translate

export default translate
