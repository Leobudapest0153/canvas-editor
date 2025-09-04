import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ELEMENTOS_PREDEFINIDOS, JERARQUIA_PERMITIDA, CATALOGO } from '@/inventory-smart/utils/constants'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref(ELEMENTOS_PREDEFINIDOS)
  const searchText = ref('')
  const selectedCategory = ref(null)
  const selectedCatalog = ref('elementos')
  const templates = ref([])

  const catalogContext = ref({ mode: 'root', currentId: undefined, currentType: undefined })

  const baseSystemGuard = (item) =>
    item?.props?.system === true && item?.props?.catalogVisible !== false

  const allowedTypesForContext = (context) => {
    const map = {
      root: 'plantas',
      'detail-element': 'elementos',
      'detail-container': 'contenedores',
    }
    const parent = map[context.mode]
    return parent ? JERARQUIA_PERMITIDA[parent] || [] : []
  }

  const match = (texto) => (e) =>
    e?.nombre?.toLowerCase?.().includes(texto?.toLowerCase?.() ?? '')

  const filteredCatalogItems = computed(() => {
    let result = items.value.filter(baseSystemGuard)

    if (catalogContext.value.mode === 'root') {
      result = result.filter((item) => CATALOGO.SISTEMA_BASE_KEYS.includes(item.id))
    } else {
      const allowed = allowedTypesForContext(catalogContext.value)
      result = result.filter((item) => allowed.includes(item.tipo))
    }

    if (searchText.value) {
      result = result.filter(match(searchText.value))
    }

    if (selectedCategory.value) {
      result = result.filter((item) => item.categoria === selectedCategory.value)
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
    return templates.value.filter((t) => t.name?.toLowerCase?.().includes(q))
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
