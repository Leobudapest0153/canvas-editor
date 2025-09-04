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

  const filteredTemplates = computed(() => {
    const q = searchText.value.toLowerCase()
    return templates.value
      .filter((t) => t.name.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  })

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

  const getTemplateByName = (name) =>
    templates.value.find((t) => t.name.toLowerCase() === name.toLowerCase())

  const saveTemplatesToLocalStorage = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('inventory.templates', JSON.stringify(templates.value))
    }
  }

  const loadTemplatesFromLocalStorage = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem('inventory.templates')
      if (raw) {
        templates.value = JSON.parse(raw)
      }
    } catch {
      templates.value = []
    }
  }

  loadTemplatesFromLocalStorage()

  const searchTemplates = (query) => {
    const q = query.toLowerCase()
    return templates.value.filter((t) => t.name.toLowerCase().includes(q))
  }

  return {
    items,
    searchText,
    selectedCategory,
    selectedCatalog,
    catalogContext,
    setCatalogContext,
    setSelectedCatalog,
    allowedTypesForContext,
    baseSystemGuard,
    filteredCatalogItems,
    templates,
    filteredTemplates,
    addTemplate,
    removeTemplate,
    getTemplateByName,
    loadTemplatesFromLocalStorage,
    saveTemplatesToLocalStorage,
    searchTemplates,
  }
})
