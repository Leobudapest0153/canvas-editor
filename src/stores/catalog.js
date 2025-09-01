import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ELEMENTOS_PREDEFINIDOS, JERARQUIA_PERMITIDA, CATALOGO } from '@/utils/constants'

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref([...ELEMENTOS_PREDEFINIDOS])
  const searchText = ref('')
  const selectedCategory = ref(null)
  const catalogContext = ref({ mode: 'root', currentId: undefined, currentType: undefined })

  const baseSystemGuard = (item) =>
    item?.props?.system === true && item?.props?.catalogVisible !== false

  const allowedTypesForContext = (context) => {
    switch (context.mode) {
      case 'root':
        return JERARQUIA_PERMITIDA.plantas || []
      case 'detail-element':
        return JERARQUIA_PERMITIDA.elementos || []
      case 'detail-container':
        return JERARQUIA_PERMITIDA.contenedores || []
      default:
        return []
    }
  }

  const isOneOfSystemBaseTypes = (item) =>
    CATALOGO.SISTEMA_BASE_KEYS.includes(item.id)

  const isAllowedByHierarchy = (context) => (item) =>
    allowedTypesForContext(context).includes(item.tipo)

  const match = (texto) => (e) =>
    e?.nombre?.toLowerCase?.().includes(texto?.toLowerCase?.() ?? '')

  const filteredCatalogItems = computed(() => {
    let result = items.value.filter(baseSystemGuard)

    if (catalogContext.value.mode === 'root') {
      result = result.filter(isOneOfSystemBaseTypes)
    } else {
      result = result.filter(isAllowedByHierarchy(catalogContext.value))
    }

    if (searchText.value) {
      result = result.filter(match(searchText.value))
    }

    if (selectedCategory.value) {
      result = result.filter((item) => item.categoria === selectedCategory.value)
    }

    return result
  })

  const setContext = (ctx) => {
    catalogContext.value = { ...catalogContext.value, ...ctx }
  }

  const addCustomItem = (item) => {
    items.value.push(item)
  }

  return {
    items,
    searchText,
    selectedCategory,
    catalogContext,
    baseSystemGuard,
    allowedTypesForContext,
    filteredCatalogItems,
    setContext,
    addCustomItem,
  }
})
