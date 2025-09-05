export const validateTemplateDTO = (dto) => {
  const errors = []
  if (!dto || typeof dto !== 'object') return { valid: false, errors: ['DTO no es un objeto'] }
  if (!dto.id) errors.push('Falta id')
  if (!dto.name) errors.push('Falta name')
  if (!dto.createdAt) errors.push('Falta createdAt')
  if (!dto.updatedAt) errors.push('Falta updatedAt')
  if (typeof dto.schemaVersion !== 'number') errors.push('schemaVersion inválido')
  if (!dto.meta) errors.push('Falta meta')
  if (dto.meta) {
    if (typeof dto.meta.elementType !== 'string') errors.push('meta.elementType inválido')
    ;['width','height','depth','childrenCount'].forEach(k=>{
      if (typeof dto.meta[k] !== 'number') errors.push(`meta.${k} inválido`)
    })
  }
  if (!dto.estructura) errors.push('Falta estructura')
  if (dto.estructura) {
    if (!dto.estructura.rootId) errors.push('estructura.rootId requerido')
    if (!Array.isArray(dto.estructura.nodos)) errors.push('estructura.nodos debe ser array')
    if (Array.isArray(dto.estructura.nodos)) {
      dto.estructura.nodos.forEach((n, i) => {
        if (!n || typeof n !== 'object') { errors.push(`Nodo ${i} inválido`); return }
        if (!n.id) errors.push(`Nodo ${i} falta id`)
        if (!n.tipo) errors.push(`Nodo ${i} falta tipo`)
        if (!n.offsets || typeof n.offsets.dx !== 'number' || typeof n.offsets.dy !== 'number') errors.push(`Nodo ${i} offsets inválidos`)
        if (!n.canvas || typeof n.canvas.width !== 'number' || typeof n.canvas.height !== 'number') errors.push(`Nodo ${i} canvas inválido`)
      })
    }
  }
  return { valid: errors.length === 0, errors }
}

export const validateTemplatesDTOArray = (arr) => {
  if (!Array.isArray(arr)) return { valid: false, errors: ['El contenedor de plantillas no es un array'] }
  const allErrors = []
  arr.forEach((dto, idx) => {
    const r = validateTemplateDTO(dto)
    if (!r.valid) allErrors.push(`Template index ${idx}: ${r.errors.join(', ')}`)
  })
  return { valid: allErrors.length === 0, errors: allErrors }
}

export { validateTemplateDTO as _validateTemplateDTOInternal }

