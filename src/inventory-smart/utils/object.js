export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function makePatch(original, edited) {
  const patch = {}
  for (const key in edited) {
    const val = edited[key]
    const orig = original[key]
    if (!deepEqual(val, orig)) {
      patch[key] = typeof val === 'object' && val !== null ? deepClone(val) : val
    }
  }
  return patch
}
