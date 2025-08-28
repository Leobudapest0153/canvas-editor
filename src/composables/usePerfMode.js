// Enables a performance-friendly mode on a Konva Layer during drag.
// Disables hit graph and listening, and turns off heavy effects on the shape.

export function enablePerfMode(layer, opts = {}) {
  if (!layer) return { restore: () => {} }
  const shape = opts.shape
  const prev = {
    listening: layer.listening ? layer.listening() : undefined,
    perfectDrawEnabled: layer.perfectDrawEnabled ? layer.perfectDrawEnabled() : undefined,
    shapeShadowEnabled: shape?.getAttr ? shape.getAttr('shadowEnabled') : undefined,
    shapeShadowBlur: shape?.getAttr ? shape.getAttr('shadowBlur') : undefined,
    shapeBlurEnabled: shape?.getAttr ? shape.getAttr('blurEnabled') : undefined,
    shapeStrokeWidth: shape?.getAttr ? shape.getAttr('strokeWidth') : undefined,
    shapeStrokeScaleEnabled: shape?.getAttr ? shape.getAttr('strokeScaleEnabled') : undefined,
  }
  try {
    // Konva 9+: optimizar solo el dibujo, no tocar listening para no afectar dragBound
    layer.perfectDrawEnabled && layer.perfectDrawEnabled(false)
    if (shape && shape.setAttrs) {
      shape.setAttrs({
        shadowEnabled: false,
        shadowBlur: 0,
        blurEnabled: false,
        strokeScaleEnabled: false,
        strokeWidth: 1,
      })
    }
  } catch (_) { /* ignore */ }

  return {
    restore: () => disablePerfMode(layer, { shape, prev }),
  }
}

export function disablePerfMode(layer, ctx = {}) {
  const shape = ctx.shape
  const prev = ctx.prev || {}
  try {
    if (layer) {
      // No tocamos listening durante perf mode; evitamos restaurar explícitamente
      if (layer.perfectDrawEnabled) {
        if (prev.perfectDrawEnabled !== undefined) layer.perfectDrawEnabled(prev.perfectDrawEnabled)
        else layer.perfectDrawEnabled(true)
      }
    }
    if (shape && shape.setAttrs) {
      const attrs = {}
      if (prev.shapeShadowEnabled !== undefined) attrs.shadowEnabled = prev.shapeShadowEnabled
      if (prev.shapeShadowBlur !== undefined) attrs.shadowBlur = prev.shapeShadowBlur
      if (prev.shapeBlurEnabled !== undefined) attrs.blurEnabled = prev.shapeBlurEnabled
      if (prev.shapeStrokeScaleEnabled !== undefined) attrs.strokeScaleEnabled = prev.shapeStrokeScaleEnabled
      if (prev.shapeStrokeWidth !== undefined) attrs.strokeWidth = prev.shapeStrokeWidth
      shape.setAttrs(attrs)
    }
  } catch (_) { /* ignore */ }
}
