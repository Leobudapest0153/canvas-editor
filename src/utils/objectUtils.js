export function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function makePatch(original, edited) {
  const patch = {}
  if (edited.nombre !== original.nombre) patch.nombre = edited.nombre
  if (edited.tipo !== original.tipo) patch.tipo = edited.tipo
  if (edited.categoria !== original.categoria) patch.categoria = edited.categoria
  if (edited.color !== original.color) patch.color = edited.color

  if (!deepEqual(edited.dimensiones, original.dimensiones)) {
    patch.dimensiones = { ...edited.dimensiones }
  }

  if (edited.pesoMaximo !== original.pesoMaximo) patch.pesoMaximo = edited.pesoMaximo

  if (edited.volumenMaximo !== undefined && edited.volumenMaximo !== original.volumenMaximo) {
    patch.volumenMaximo = edited.volumenMaximo
  }

  return patch
}
