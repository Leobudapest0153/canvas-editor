export const messages = {
  views: {
    front: 'Vista de frente',
    aerial: 'Vista aérea',
  },
};

export function t(path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), messages) || path;
}

export const viewLabels = {
  XZ: messages.views.front,
  XY: messages.views.aerial,
};
