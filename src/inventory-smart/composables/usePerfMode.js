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
    shapeFill: shape?.getAttr ? shape.getAttr('fill') : undefined,
    shapeOpacity: shape?.getAttr ? shape.getAttr('opacity') : undefined,
    childrenAttrs: [] // Almacenar atributos de los hijos
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

    // Si el shape es un grupo, también optimizar sus hijos
    if (shape && shape.getChildren && typeof shape.getChildren === 'function') {
      const children = shape.getChildren()
      children.forEach((child) => {
        if (child && child.getAttr && child.setAttrs) {
          // Guardar estado original de cada hijo
          const childPrev = {
            shadowEnabled: child.getAttr('shadowEnabled'),
            shadowBlur: child.getAttr('shadowBlur'),
            blurEnabled: child.getAttr('blurEnabled'),
            fill: child.getAttr('fill'),
            opacity: child.getAttr('opacity')
          }
          prev.childrenAttrs.push({ child, attrs: childPrev })

          // Aplicar optimizaciones manteniendo el fill y opacity
          child.setAttrs({
            shadowEnabled: false,
            shadowBlur: 0,
            blurEnabled: false,
            // Mantener fill y opacity para que el color no se pierda
          })
        }
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
      if (prev.shapeFill !== undefined) attrs.fill = prev.shapeFill
      if (prev.shapeOpacity !== undefined) attrs.opacity = prev.shapeOpacity
      shape.setAttrs(attrs)
    }

    // Restaurar atributos de los hijos
    if (prev.childrenAttrs && Array.isArray(prev.childrenAttrs)) {
      prev.childrenAttrs.forEach(({ child, attrs }) => {
        if (child && child.setAttrs && attrs) {
          const restoreAttrs = {}
          if (attrs.shadowEnabled !== undefined) restoreAttrs.shadowEnabled = attrs.shadowEnabled
          if (attrs.shadowBlur !== undefined) restoreAttrs.shadowBlur = attrs.shadowBlur
          if (attrs.blurEnabled !== undefined) restoreAttrs.blurEnabled = attrs.blurEnabled
          if (attrs.fill !== undefined) restoreAttrs.fill = attrs.fill
          if (attrs.opacity !== undefined) restoreAttrs.opacity = attrs.opacity
          child.setAttrs(restoreAttrs)
        }
      })
    }
  } catch (_) { /* ignore */ }
}
