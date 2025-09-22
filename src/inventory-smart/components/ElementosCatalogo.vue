<!--
  ElementosCatalogo.vue

  Panel lateral con catálogo de elementos predefinidos para arrastrar al canvas.

  Responsabilidades:
  - Mostrar catálogo organizado de elementos (anaqueles, estantes, mesas, etc.)
  - Categorizar elementos por tipo o función
  - Permitir búsqueda y filtrado de elementos
  - Implementar drag and drop desde el catálogo al canvas
  - Mostrar preview/thumbnail de cada elemento
  - Gestionar propiedades predefinidas de elementos del catálogo
  - Integrar con el buffer panel para movimientos temporales
-->

<template>
  <div class="elementos-catalogo h-full flex flex-col bg-white border-r border-gray-200">
    <!-- Header del catálogo -->
    <div class="catalogo-header p-1 border-gray-200">
  <div class="relative px-4 mb-1" v-if="hayElementosEnTab">
        <div class="flex items-center justify-between" ref="filtrosBotonRef">
          <UiTooltip position="top" label="Desplegar filtros" :delay="200" class="w-full">
            <button
              @click="toggleFiltros"
              class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-1.586l-3.707-3.707A1 1 0 018 12V6.414L3.293 4.707A1 1 0 013 4z"
                />
              </svg>
              <span>Filtros</span>
              <span v-if="hayFiltrosActivos" class="w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
          </UiTooltip>
        </div>
        <transition name="unroll">
          <div
            v-if="filtrosVisibles"
            class="absolute top-full left-0 w-full bg-gray-50 shadow-lg z-10"
            ref="filtrosPanelRef"
          >
            <div class="p-3 grid grid-cols-1 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  v-model="filtroTexto"
                  @keyup.enter="() => (filtrosVisibles = false)"
                  placeholder="Nombre..."
                  class="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  v-model="categoriaSeleccionada"
                  class="w-full cursor-pointer px-3 py-2 border rounded-md text-sm bg-white"
                >
                  <option :value="null">Todas</option>
                  <option v-for="c in categoriasDisponibles" :key="c.id" :value="c.id">
                    {{ c.nombre }}
                  </option>
                </select>
              </div>
              <div v-if="modo !== 'cuarto'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                <select
                  v-model="ubicacionSeleccionada"
                  class="w-full cursor-pointer px-3 py-2 border rounded-md text-sm bg-white"
                >
                  <option value="">Todas</option>
                  <option
                    v-for="u in ubicacionesDisponibles"
                    :key="u.id"
                    :value="u.id"
                  >
                    {{ u.nombre }}
                  </option>
                </select>
              </div>
              <div class="pt-1">
                <button
                  v-if="hayFiltrosActivos"
                  @click="limpiarFiltros"
                  class="px-3 py-2 bg-gray-100 rounded-md text-xs"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Botón modal agregar espacio/cuarto -->
    <div class="pb-2 flex justify-center">
      <UiTooltip
        :label="
          'Crea y guarda un nuevo ' + (modo === 'cuarto' ? 'cuarto' : 'espacio') + ' en el catálogo'
        "
        position="bottom"
        :delay="500"
      >
        <button
          @click="mostrarModalAgregarEspacio = true"
          class="flex justify-center items-center flex-row px-2 py-1 cursor-pointer bg-primary hover:bg-primary-600 text-white rounded-xl text-xs"
        >
          <!-- icono de + -->
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span class="ml-1 text-sm">
            Agregar {{ modo === 'cuarto' ? 'cuarto' : 'espacio' }}
          </span>
        </button></UiTooltip
      >
    </div>

    <!-- Lista de elementos -->
    <div class="elementos-lista flex-1 overflow-y-auto px-4 py-2">
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="elemento in elementosFiltrados"
          :key="elemento.id"
          :draggable="true"
          @dragstart="iniciarArrastre(elemento, $event)"
          @dragend="finalizarArrastre"
          class="group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab mb-3 hover:shadow-md transition-all duration-200 border-l-4 hover:scale-[1.02]"
          :style="{
            borderLeftColor:
              elemento.color || elemento.colorBase || getColorCategoria(elemento.categoria),
          }"
        >
          <!-- Preview del elemento -->
          <div class="flex items-center justify-center mb-3">
            <component
              :is="getIconComponentForElement(elemento)"
              :backgroundColor="elemento.color || elemento.colorBase || getColorCategoria(elemento.categoria)"
              class="w-12 h-8"
            />
          </div>

          <!-- Información del elemento -->
          <div class="elemento-info space-y-1">
            <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ elemento.nombre }}</h3>
            <p class="text-xs text-gray-500 mb-2">{{ elemento.descripcion }}</p>

            <!-- Dimensiones -->
            <div class="elemento-specs space-y-1">
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Dimensiones:</span>
                <span class="spec-value text-gray-700">
                  {{ formatLengthsCm([
                    getCardDims(elemento).ancho,
                    getCardDims(elemento).largo,
                    getCardDims(elemento).alto
                  ]) }}
                </span>
              </div>
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Capacidad de carga:</span>
                <span class="spec-value text-gray-700">{{ elemento.pesoMaximo }}kg</span>
              </div>
              <!-- <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Ubicación:</span>
                <span class="spec-value text-gray-700 capitalize">{{ elemento.ubicacion }}</span>
              </div> -->
            </div>

            <!-- Badge de tipo y categoría -->
            <div class="mt-2 flex gap-1">
              <span
                class="inline-block px-2 py-1 text-xs rounded-full text-white"
                :style="{ backgroundColor: getColorPorTipo(elemento.tipo) }"
              >
                {{ getTipoNombre(elemento.tipo) }}
              </span>
              <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                {{ getCategoriaName(elemento.categoria) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje cuando no hay elementos -->
      <div v-if="elementosFiltrados.length === 0" class="text-center py-12">
        <svg
          class="w-12 h-12 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0v5m0-5v-5"
          />
        </svg>
        <p class="text-gray-500 text-center">No se encontraron elementos</p>
        <p class="text-gray-400 text-sm text-center mt-1">
          Prueba con otros filtros o crea uno nuevo
        </p>
      </div>
    </div>

    <ElementEditor
      :visible="mostrarModalCrear"
      :categorias="categoriasDisponibles"
      :formas="FORMAS_DISPONIBLES"
      :ubicaciones="UBICACIONES_DISPONIBLES"
      :value="nuevoElemento"
      @cancel="cerrarModal"
      @save="onGuardarElemento"
    />

    <AgregarCuartoModal
      :visible="mostrarModalAgregarEspacio"
      :modo
      @close="mostrarModalAgregarEspacio = false"
      @save="onGuardarEspacio"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import UiTooltip from '@/inventory-smart/components/ui/UiTooltip.vue'
import {
  TODAS_LAS_CATEGORIAS,
  TIPOS_ENTIDAD,
  getColorPorTipo,
  getColorCategoria,
  FORMAS_DISPONIBLES,
  UBICACIONES_DISPONIBLES,
  TIPOS_ESPACIO,
  TIPOS_CUARTO,
} from '@/inventory-smart/utils/constants'
import { CATALOGO } from '@/inventory-smart/utils/constants'
import { computeDimsByAxisScale } from '@/inventory-smart/utils/dimensionPolicy'

import ElementEditor from './modals/ElementEditor.vue'
import AgregarCuartoModal from './AgregarCuartoModal.vue'
import {
  buildStructureFromForm,
  toCatalogItemFromStructure,
} from '@/inventory-smart/composables/useStructureManager'
import { formatLengthsCm } from '../utils/units'
import SpaceIcon from '@/inventory-smart/icons/SpaceIcon.vue'
import SpaceOnWallIcon from '@/inventory-smart/icons/SpaceOnWallIcon.vue'
import RoomIcon from '@/inventory-smart/icons/RoomIcon.vue'

// Props
const props = defineProps({
  modo: {
    type: String,
    default: 'espacio',
    validator: (v) => ['espacio', 'cuarto'].includes(v),
  },
})
const modo = computed(() => props.modo)

// Stores
const canvasStore = useCanvasStore()
const catalogStore = useCatalogStore()
const { filteredCatalogItems, catalogContext, searchText, selectedCategory, items } =
  storeToRefs(catalogStore)

// Estado local
const filtroTexto = searchText
const categoriaSeleccionada = selectedCategory
// Filtros UI
const filtrosVisibles = ref(false)
const ubicacionSeleccionada = ref('')
const filtrosBotonRef = ref(null)
const filtrosPanelRef = ref(null)

const hayFiltrosActivos = computed(() => {
  return !!(filtroTexto.value || categoriaSeleccionada.value || ubicacionSeleccionada.value)
})

const toggleFiltros = () => {
  filtrosVisibles.value = !filtrosVisibles.value
}

const limpiarFiltros = () => {
  filtroTexto.value = ''
  categoriaSeleccionada.value = null
  ubicacionSeleccionada.value = ''
}

const handleClickOutside = (event) => {
  if (
    filtrosVisibles.value &&
    filtrosBotonRef.value &&
    !filtrosBotonRef.value.contains(event.target) &&
    filtrosPanelRef.value &&
    !filtrosPanelRef.value.contains(event.target)
  ) {
    filtrosVisibles.value = false
  }
}
const mostrarModalCrear = ref(false)
const mostrarModalAgregarEspacio = ref(false)

// Formulario para nuevo elemento
const nuevoElemento = ref({
  nombre: '',
  categoria: '',
  forma: '',
  colorBase: '#3b82f6',
  dimensiones: {
    ancho: 100,
    largo: 100,
    alto: 75,
  },
  pesoMaximo: 50,
  ubicacion: 'suelo',
  descripcion: '',
  icono: 'box',
})

// const tituloContextual = computed(() => {
//   if (catalogContext.value.mode === 'root') {
//     return ''
//   } else if (catalogContext.value.mode === 'detail-element') {
//     return 'Catálogo de Contenedores'
//   } else if (catalogContext.value.mode === 'detail-container') {
//     return 'Catálogo (Elementos + Contenedores)'
//   }
//   return 'Catálogo de Elementos'
// })

// const puedeCrearElementosPersonalizados = computed(() => catalogContext.value.mode !== 'root')

// Computed: categorías disponibles según el tab (requerimiento: Espacios -> TIPOS_ESPACIO, Cuartos -> TIPOS_CUARTO)
const categoriasDisponibles = computed(() => (modo.value === 'cuarto' ? TIPOS_CUARTO : TIPOS_ESPACIO))

// Ubicaciones disponibles según el modo actual
const ubicacionesDisponibles = computed(() => {
  // Mapear el modo a los tipos que aplican en constantes
  const aplicaTipo = modo.value === 'cuarto' ? 'cuartos' : 'elementos'
  return UBICACIONES_DISPONIBLES.filter((u) => (u.aplicaA || []).includes(aplicaTipo))
})

// Si la ubicación seleccionada ya no es válida para el modo, limpiar
watch([ubicacionSeleccionada, ubicacionesDisponibles], () => {
  const ids = new Set(ubicacionesDisponibles.value.map((u) => u.id))
  if (ubicacionSeleccionada.value && !ids.has(ubicacionSeleccionada.value)) {
    ubicacionSeleccionada.value = ''
  }
})

// Base por modo (sin filtros de texto/categoría/ubicación) — sirve para decidir si mostrar Filtros
const elementosBasePorModo = computed(() => {
  const base = Array.isArray(filteredCatalogItems.value)
    ? filteredCatalogItems.value.slice()
    : Array.isArray(items.value)
      ? items.value.slice()
      : []
  return modo.value === 'cuarto'
    ? base.filter((el) => el.tipo === 'cuartos')
    : base.filter((el) => el.tipo !== 'cuartos')
})

const hayElementosEnTab = computed(() => (elementosBasePorModo.value.length > 0))

// Computed local para filtrar los elementos del catálogo (igual que en CapasTab.vue)
const elementosFiltrados = computed(() => {
  // Partimos del base por modo y aplicamos filtros UI
  let out = elementosBasePorModo.value.slice()

  // Filtro por texto (nombre o descripción)
  if (filtroTexto && filtroTexto.value) {
    const q = String(filtroTexto.value).toLowerCase()
    out = out.filter((el) => {
      const nombre = String(el.nombre || '').toLowerCase()
      const desc = String(el.descripcion || '').toLowerCase()
      return nombre.includes(q) || desc.includes(q)
    })
  }

  // Filtro por categoría
  if (categoriaSeleccionada.value) {
    out = out.filter((el) => el.categoria === categoriaSeleccionada.value)
  }

  // Filtro por ubicación
  if (ubicacionSeleccionada.value) {
    out = out.filter((el) => el.ubicacion === ubicacionSeleccionada.value)
  }

  return out
})

// Cerrar panel de filtros si el tab queda sin elementos base
watch(hayElementosEnTab, (val) => {
  if (!val) filtrosVisibles.value = false
})

const onGuardarElemento = (elemento) => {
  const elementoNuevo = {
    ...elemento,
    id: `custom_${Date.now()}`,
    icono: 'box',
    personalizado: true,
    tipo: elemento.tipo,
  }
  items.value.push(elementoNuevo)
  cerrarModal()
  categoriaSeleccionada.value = elementoNuevo.categoria
  filtroTexto.value = ''
}

const onGuardarEspacio = (datosEspacio) => {
  try {
    const structure = buildStructureFromForm(datosEspacio)
    const kind = datosEspacio.tipo === 'cuarto' ? 'room' : 'space'
    const item = toCatalogItemFromStructure({
      name: datosEspacio.datosGenerales?.nombre,
      description: datosEspacio.datosGenerales?.descripcion,
      structure,
      kind,
      color: datosEspacio.datosGenerales?.color,
    })
    items.value.push(item)
    categoriaSeleccionada.value = null
    filtroTexto.value = ''
    mostrarModalAgregarEspacio.value = false
  } catch (e) {
    console.error('No se pudo crear estructura desde formulario', e)
  }
}

// Evitar que el select quede con un valor no listado
watch([() => categoriaSeleccionada.value, () => categoriasDisponibles.value], () => {
  const ids = new Set((categoriasDisponibles.value || []).map((c) => c.id))
  if (categoriaSeleccionada.value && !ids.has(categoriaSeleccionada.value)) {
    categoriaSeleccionada.value = null
  }
})

// Si cambiamos a modo 'cuarto', limpiar la ubicación para que no quede filtro oculto aplicado
watch(modo, (nuevo) => {
  if (nuevo === 'cuarto') {
    ubicacionSeleccionada.value = ''
  }
})

const getTipoNombre = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.nombre || 'Desconocido'
}

const getCategoriaName = (categoriaId) => {
  const categoria = TODAS_LAS_CATEGORIAS.find((c) => c.id === categoriaId)
  return categoria ? categoria.nombre : 'Sin categoría'
}

const getIconComponentForElement = (elemento) => {
  // Determinar el componente de icono basado en tipo y ubicación
  if (elemento.tipo === 'cuartos') {
    return RoomIcon
  } else if (elemento.ubicacion === 'pared') {
    return SpaceOnWallIcon
  } else {
    return SpaceIcon
  }
}

// Dims preview para elementos de sistema por defecto
const isSystemDefaultItem = (item) =>
  !!(item?.props?.system === true && CATALOGO?.SISTEMA_BASE_KEYS?.includes?.(item.id))

const getCardDims = (item) => {
  try {
    if (!item?.dimensiones) return { ancho: 0, largo: 0, alto: 0 }
    if (!isSystemDefaultItem(item)) return item.dimensiones
    const planta = canvasStore.plantaActivaData
    const dimsPlanta = planta?.dimensiones
    if (!dimsPlanta) return item.dimensiones
    const parentDims = { w: dimsPlanta.ancho, h: dimsPlanta.largo, d: dimsPlanta.alto }
    const dims = computeDimsByAxisScale(item.id, parentDims, { snap: true })
    return dims || item.dimensiones
  } catch {
    return item?.dimensiones || { ancho: 0, largo: 0, alto: 0 }
  }
}

// Drag and Drop
const iniciarArrastre = (elemento, event) => {
  console.log('Iniciando arrastre del elemento:', elemento)
  // Si el item trae payload de estructura (plantilla/room/space), arrastrar como 'plantilla-catalogo'
  const isStructured = !!elemento?.payload?.rootId && Array.isArray(elemento?.payload?.elements)
  const datosArrastre = isStructured
    ? {
        tipo: 'plantilla-catalogo',
        payload: elemento.payload,
        offset: { x: event.offsetX || 0, y: event.offsetY || 0 },
      }
    : {
        tipo: 'elemento-catalogo',
        elemento: elemento,
        offset: { x: event.offsetX || 0, y: event.offsetY || 0 },
      }
  console.log('Datos de arrastre:', datosArrastre)

  try {
    const dataString = JSON.stringify(datosArrastre)
    event.dataTransfer.setData('application/json', dataString)
    event.dataTransfer.effectAllowed = 'copy'
    console.log('Data set en dataTransfer:', dataString)

    // Efecto visual de arrastre con Tailwind (sin clases en <style>)
    const card = event.currentTarget
    if (card && card.classList) card.classList.add('opacity-50', 'scale-95')
  } catch (error) {
    console.error('Error en iniciarArrastre:', error)
  }
}

const finalizarArrastre = (event) => {
  console.log('Finalizando arrastre')
  const card = event.currentTarget
  if (card && card.classList) card.classList.remove('opacity-50', 'scale-95')
}

const cerrarModal = () => {
  mostrarModalCrear.value = false
}

// Cargar elementos personalizados del localStorage
onMounted(() => {
  const elementosGuardados = localStorage.getItem('elementos-personalizados')
  if (elementosGuardados) {
    try {
      JSON.parse(elementosGuardados).forEach((el) => {
        if (!items.value.some((existing) => existing.id === el.id)) {
          items.value.push(el)
        }
      })
    } catch (error) {
      console.error('Error cargando elementos personalizados:', error)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
})

// Guardar elementos personalizados en localStorage
const guardarElementosPersonalizados = () => {
  const personalizados = items.value.filter((el) => el.personalizado)
  localStorage.setItem('elementos-personalizados', JSON.stringify(personalizados))
}

// Observar cambios en elementos personalizados para guardar
watch(
  () => items.value,
  () => {
    guardarElementosPersonalizados()
  },
  { deep: true },
)

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

// Observar cambios en el contexto para verificar validez del filtro de categoría
watch(
  () => canvasStore.contextoActual,
  (ctx) => {
    if (ctx.tipo === 'plantas') {
      catalogStore.setCatalogContext({ mode: 'root' })
    } else if (ctx.tipo === 'cuartos') {
      catalogStore.setCatalogContext({
        mode: 'detail-room',
        currentId: ctx.id,
        currentType: 'room',
      })
    } else if (ctx.tipo === 'pisos') {
      catalogStore.setCatalogContext({
        mode: 'detail-floor',
        currentId: ctx.id,
        currentType: 'floor',
      })
    } else if (ctx.tipo === 'elementos') {
      catalogStore.setCatalogContext({
        mode: 'detail-element',
        currentId: ctx.id,
        currentType: 'element',
      })
    } else if (ctx.tipo === 'contenedores') {
      catalogStore.setCatalogContext({
        mode: 'detail-container',
        currentId: ctx.id,
        currentType: 'container',
      })
    } else if (ctx.tipo === 'pasillos') {
      catalogStore.setCatalogContext({
        mode: 'detail-aisle',
        currentId: ctx.id,
        currentType: 'aisle',
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.unroll-enter-active,
.unroll-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}
.unroll-enter-from,
.unroll-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
  overflow: hidden;
}
</style>
