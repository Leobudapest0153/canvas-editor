import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  ELEMENTOS_PREDEFINIDOS,
  JERARQUIA_PERMITIDA,
  CATALOGO,
} from '@/utils/constants'
import { useCanvasStore } from '@/composables/useCanvasStore'

export const baseSystemGuard = (item) =>
  item?.props?.system === true && item?.props?.catalogVisible !== false

export const allowedTypesForContext = (context) => {
  if (context.mode === 'root') {
    return CATALOGO.SISTEMA_BASE_KEYS
  }
  if (context.mode === 'detail-element') {
    return JERARQUIA_PERMITIDA.elementos || []
  }
  if (context.mode === 'detail-container') {
    return JERARQUIA_PERMITIDA.contenedores || []
  }
  return []
}

export const match = (texto) => (e) =>
  e?.nombre?.toLowerCase?.().includes(texto?.toLowerCase?.() ?? '')

export const useCatalogStore = defineStore('catalog', () => {
  const canvasStore = useCanvasStore()

  const items = ref([...ELEMENTOS_PREDEFINIDOS])
  const catalogContext = ref({ mode: 'root' })

  const syncContext = () => {
    const ctx = canvasStore.contextoActual
    if (ctx.tipo === 'plantas') {
      catalogContext.value = { mode: 'root' }
    } else if (ctx.tipo === 'elementos') {
      catalogContext.value = {
        mode: 'detail-element',
        currentId: ctx.id,
        currentType: 'element',
      }
    } else if (ctx.tipo === 'contenedores') {
      catalogContext.value = {
        mode: 'detail-container',
        currentId: ctx.id,
        currentType: 'container',
      }
    }
  }

  syncContext()
  watch(
    () => canvasStore.contextoActual,
    () => syncContext(),
    { deep: true }
  )

  const searchText = ref('')
  const selectedCategory = ref(null)

  const filteredCatalogItems = computed(() => {
    let result = items.value.filter(baseSystemGuard)
    const context = catalogContext.value
    if (context.mode === 'root') {
      result = result.filter((e) => CATALOGO.SISTEMA_BASE_KEYS.includes(e.id))
    } else {
      const allowed = allowedTypesForContext(context)
      result = result.filter((e) => allowed.includes(e.tipo))
    }
    if (searchText.value) {
      result = result.filter(match(searchText.value))
    }
    if (selectedCategory.value) {
      result = result.filter((e) => e.categoria === selectedCategory.value)
    }
    return result
  })

  const addCustomItem = (item) => {
    items.value.push(item)
  }

  return {
    items,
    catalogContext,
    searchText,
    selectedCategory,
    filteredCatalogItems,
    addCustomItem,
    allowedTypesForContext,
  }
})
