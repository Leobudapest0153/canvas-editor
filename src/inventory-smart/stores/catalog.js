import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ELEMENTOS_PREDEFINIDOS, JERARQUIA_PERMITIDA } from '@/inventory-smart/utils/constants'
import { toCatalogItemFromStructure } from '@/inventory-smart/composables/useStructureManager'

export const useCatalogStore = defineStore('catalog', () => {
  // Normaliza items predefinidos (constants) para que cuartos y espacios tengan la misma estructura
  // que los creados desde el modal (payload con root/elements, catalogKind, meta, etc.).
  const normalizePredefined = (list) => {
    try {
      return (list || []).map((it) => {
        if (!it || typeof it !== 'object') return it
        if (it.tipo !== 'cuartos' && it.tipo !== 'elementos') return it

        const kind = it.tipo === 'cuartos' ? 'room' : 'space'
        const root = {
          id: `${it.id}__root`,
          nombre: it.nombre,
          tipo: it.tipo,
          categoria: it.categoria,
          forma: it.forma,
          orientacion: it.orientacion,
          color: it.colorBase || it.color || '#3B82F6',
          colorBase: it.colorBase || it.color || '#3B82F6',
          dimensiones: { ...(it.dimensiones || {}) }, // ya en cm en constants
          capacidadCarga: Number(it.capacidadCarga) || 0,
          ubicacion: it.ubicacion || 'suelo',
          descripcion: it.descripcion || '',
          icono: it.icono || (kind === 'room' ? 'home' : 'box'),
          hijos: [],
          meta: { tienePisosGenerados: false },
          x: 0,
          y: 0,
          // Opcionalmente podemos calcular width/height si fuera necesario en la UI
        }

        if(it.alturaRespectoAlSuelo) {
          root.alturaRespectoAlSuelo = it.alturaRespectoAlSuelo
        }

        // Crear hijos internos desde constants.pisosNiveles si existen; si no, crear uno por defecto
        const children = []
        if (Array.isArray(it.pisosNiveles) && it.pisosNiveles.length > 0) {
          const esCuarto = it.tipo === 'cuartos'
          it.pisosNiveles.forEach((niv, idx) => {
            const childId = `${it.id}__${esCuarto ? 'piso' : 'nivel'}_${idx + 1}`
            const child = {
              id: childId,
              nombre: niv?.nombre || (esCuarto ? `Piso ${idx + 1}` : `Nivel ${idx + 1}`),
              tipo: esCuarto ? 'pisos' : 'contenedores',
              categoria: esCuarto ? 'piso' : 'nivel',
              padre: root.id,
              color: root.color,
              colorBase: root.colorBase,
              x: 0,
              y: idx * 50,
              // Si el nivel/piso no define dimensiones, heredar las del root
              dimensiones: {
                ancho: typeof niv?.ancho === 'number' ? niv.ancho : (root.dimensiones?.ancho ?? undefined),
                largo: typeof niv?.largo === 'number' ? niv.largo : (root.dimensiones?.largo ?? undefined),
                alto: typeof niv?.alto === 'number' ? niv.alto : (root.dimensiones?.alto ?? undefined),
              },
              capacidadCarga: Number.isFinite(Number(niv?.capacidadCarga))
                ? Number(niv.capacidadCarga)
                : (Number(root.capacidadCarga) || 0),
              tiposProductos: Array.isArray(niv?.tiposProductos) ? niv.tiposProductos.slice() : [],
              tipoZona: niv?.tipoZona || 'almacenaje',
              permiteFragiles: !!niv?.permiteFragiles,
              props: { catalogVisible: false },
              meta: esCuarto
                ? { esPisoInterno: true, indicePiso: idx + 1 }
                : { esNivelInterno: true, indiceNivel: idx + 1 },
            }
            root.hijos.push(childId)
            children.push(child)
          })
          root.meta.tienePisosGenerados = true
        } else if (it.tipo === 'cuartos' || it.tipo === 'elementos') {
          const esCuarto = it.tipo === 'cuartos'
          const childId = `${it.id}__${esCuarto ? 'piso' : 'nivel'}_1`
          const child = {
            id: childId,
            nombre: esCuarto ? 'Piso 1' : 'Nivel 1',
            tipo: esCuarto ? 'pisos' : 'contenedores',
            categoria: esCuarto ? 'piso' : 'nivel',
            padre: root.id,
            color: root.color,
            colorBase: root.colorBase,
            x: 0,
            y: 0,
            dimensiones: { ...(root.dimensiones || {}) },
            capacidadCarga: Number(root.capacidadCarga) || 0,
            tiposProductos: [],
            tipoZona: 'almacenaje',
            permiteFragiles: false,
            props: { catalogVisible: false },
            meta: esCuarto
              ? { esPisoInterno: true, indicePiso: 1 }
              : { esNivelInterno: true, indiceNivel: 1 },
          }
          root.hijos.push(childId)
          children.push(child)
          root.meta.tienePisosGenerados = true
        }

        const structure = { root, payload: { rootId: root.id, elements: [root, ...children] }, meta: { kind, childrenCount: children.length } }
        const mapped = toCatalogItemFromStructure({
          name: it.nombre,
          description: it.descripcion,
          structure,
          kind,
          color: it.colorBase || it.color,
        })
        // Preservar id y props del item original
        mapped.id = it.id
        mapped.props = { ...(mapped.props || {}), ...(it.props || {}) }
        mapped.createdAt = mapped.createdAt || new Date().toISOString()
        mapped.updatedAt = mapped.updatedAt || new Date().toISOString()
        return mapped
      })
    } catch {
      return list || []
    }
  }

  // Inicializar con elementos por defecto
  const items = ref(normalizePredefined(ELEMENTOS_PREDEFINIDOS))
  const searchText = ref('')
  const selectedCategory = ref(null)
  const selectedCatalog = ref('elementos')
  const templates = ref([])

  const catalogContext = ref({ mode: 'root', currentId: undefined, currentType: undefined })

  // Función para actualizar elementos predefinidos desde props
  const setPredefinedElements = (predefinedElements) => {
    if (predefinedElements && Array.isArray(predefinedElements)) {
      items.value = normalizePredefined(predefinedElements)
    } else {
      // Si no se proporcionan elementos, usar los por defecto
      items.value = normalizePredefined(ELEMENTOS_PREDEFINIDOS)
    }
  }

  const baseSystemGuard = (item) =>
    item?.props?.system === true && item?.props?.catalogVisible !== false

  const allowedTypesForContext = (context) => {
    const map = {
      root: 'plantas',
      'detail-element': 'elementos',
      'detail-container': 'contenedores',
      'detail-room': 'cuartos',
      'detail-floor': 'pisos',
      'detail-aisle': 'pasillos',
    }
    const parent = map[context.mode]
    return parent ? JERARQUIA_PERMITIDA[parent] || [] : []
  }

  const match = (texto) => (e) =>
    e?.nombre?.toLowerCase?.().includes(texto?.toLowerCase?.() ?? '')

  const filteredCatalogItems = computed(() => {
    let result = items.value.filter(baseSystemGuard)

    if (catalogContext.value.mode === 'root') {
      // En la raíz (plantas):
      // - Si estamos viendo Elementos, mostramos los tipos permitidos para plantas (cuartos, elementos, pasillos, ...)
      //   en lugar de restringir solo a SISTEMA_BASE_KEYS para permitir ver elementos creados por el usuario.
      // - Para otros catálogos, mantenemos el filtro por SISTEMA_BASE_KEYS.
      // if (selectedCatalog.value === 'elementos') {
        const allowed = allowedTypesForContext(catalogContext.value)
        result = result.filter((item) => allowed.includes(item.tipo))
      // } else {
      //   result = result.filter((item) => CATALOGO.SISTEMA_BASE_KEYS.includes(item.id))
      // }
    } else {
      const allowed = allowedTypesForContext(catalogContext.value)
      result = result.filter((item) => allowed.includes(item.tipo))
    }

    if (searchText.value) {
      result = result.filter(match(searchText.value))
    }

    // Normalizar categoría seleccionada: vacío => null, y validar que exista
    const selCat = selectedCategory.value || null
    if (selCat) {
      result = result.filter((item) => item.categoria === selCat)
    }

    return result
  })

  const setCatalogContext = (ctx) => {
    catalogContext.value = ctx
  }

  const setSelectedCatalog = (val) => {
    selectedCatalog.value = val
  }

  const addTemplate = (template) => {
    templates.value.push(template)
    saveTemplatesToLocalStorage()
  }

  const removeTemplate = (id) => {
    const idx = templates.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      templates.value.splice(idx, 1)
      saveTemplatesToLocalStorage()
    }
  }

  const loadTemplatesFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem('inventory.templates')
      templates.value = raw ? JSON.parse(raw) : []
    } catch {
      templates.value = []
    }
  }

  const saveTemplatesToLocalStorage = () => {
    try {
      localStorage.setItem('inventory.templates', JSON.stringify(templates.value))
    } catch {
      /* ignore */
    }
  }

  const getTemplateByName = (name) => {
    const n = name?.toLowerCase?.() || ''
    return templates.value.find((t) => t.name?.toLowerCase?.() === n)
  }

  const searchTemplates = (query) => {
    const q = query?.toLowerCase?.() || ''
    return templates.value
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .filter(
        (t) =>
          t.name?.toLowerCase?.().includes(q) ||
          t.notes?.toLowerCase?.().includes(q)
      )
  }

  return {
    items,
    searchText,
    selectedCategory,
    selectedCatalog,
    templates,
    catalogContext,
    setCatalogContext,
    setSelectedCatalog,
    setPredefinedElements,
    addTemplate,
    removeTemplate,
    loadTemplatesFromLocalStorage,
    saveTemplatesToLocalStorage,
    getTemplateByName,
    searchTemplates,
    allowedTypesForContext,
    baseSystemGuard,
    filteredCatalogItems,
  }
})
