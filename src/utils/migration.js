/**
 * migration.js
 *
 * Utilidades para migrar datos existentes al nuevo sistema de tipos jerárquicos
 */

/**
 * Migra elementos existentes agregando el campo 'tipo' según su categoría
 */
export const migrarElementosATipos = (elementos) => {
  const categoriasTipoElementos = ['anaqueles', 'estantes', 'mesas', 'armarios']
  const categoriasTipoContenedores = ['cajas', 'bins', 'bandejas', 'contenedores']

  return elementos.map((elemento) => {
    // Si ya tiene tipo, no modificar
    if (elemento.tipo) {
      return elemento
    }

    // Determinar tipo basado en categoría
    let tipo = 'elementos' // por defecto

    if (categoriasTipoContenedores.includes(elemento.categoria)) {
      tipo = 'contenedores'
    } else if (categoriasTipoElementos.includes(elemento.categoria)) {
      tipo = 'elementos'
    }

    return {
      ...elemento,
      tipo,
    }
  })
}

/**
 * Valida que un elemento tenga los campos requeridos para el nuevo sistema
 */
export const validarEstructuraElemento = (elemento) => {
  const errores = []

  // Verificar tipo
  if (!elemento.tipo) {
    errores.push('Falta campo tipo')
  } else if (!['elementos', 'contenedores'].includes(elemento.tipo)) {
    errores.push(`Tipo '${elemento.tipo}' no válido`)
  }

  // Verificar categoría
  if (!elemento.categoria) {
    errores.push('Falta campo categoria')
  }

  // Verificar jerarquía si tiene padre
  if (elemento.padre) {
    // Los contenedores deben tener padres de tipo elementos
    // Los elementos pueden tener padres de tipo contenedores
    // No verificamos aquí ya que no tenemos acceso al padre,
    // se validará en el store
  }

  return {
    valido: errores.length === 0,
    errores,
  }
}

/**
 * Migra plantas existentes al nuevo sistema de contexto de navegación
 */
export const migrarContextoNavegacion = (contextoActual) => {
  if (!contextoActual) {
    return {
      tipo: 'plantas',
      id: 'planta_1',
      path: [],
    }
  }

  // Migrar tipos de contexto obsoletos
  if (contextoActual.tipo === 'planta') {
    return {
      ...contextoActual,
      tipo: 'plantas',
      path:
        contextoActual.path?.map((item) => ({
          ...item,
          tipo: item.tipo === 'planta' ? 'plantas' : item.tipo,
        })) || [],
    }
  }

  if (contextoActual.tipo === 'elemento') {
    // Los elementos antiguos se consideran como 'elementos' en el nuevo sistema
    return {
      ...contextoActual,
      tipo: 'elementos',
      path:
        contextoActual.path?.map((item) => ({
          ...item,
          tipo:
            item.tipo === 'planta' ? 'plantas' : item.tipo === 'elemento' ? 'elementos' : item.tipo,
        })) || [],
    }
  }

  return contextoActual
}

/**
 * Estadísticas de migración
 */
export const obtenerEstadisticasMigracion = (elementos, plantas, contexto) => {
  const elementosSinTipo = elementos.filter((el) => !el.tipo).length
  const elementosConTipo = elementos.filter((el) => el.tipo).length

  const tiposDistribucion = elementos.reduce((acc, el) => {
    if (el.tipo) {
      acc[el.tipo] = (acc[el.tipo] || 0) + 1
    }
    return acc
  }, {})

  const contextoMigrado = contexto?.tipo !== 'planta' && contexto?.tipo !== 'elemento'

  return {
    total: elementos.length,
    elementosSinTipo,
    elementosConTipo,
    tiposDistribucion,
    plantas: plantas.length,
    contextoMigrado,
    requiereMigracion: elementosSinTipo > 0 || !contextoMigrado,
  }
}
