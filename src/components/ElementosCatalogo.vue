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
    <div class="catalogo-header p-4 border-b border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-gray-800 m-0">{{ tituloContextual }}</h2>
        <button
          v-if="puedeCrearElementosPersonalizados"
          @click="mostrarModalCrear = true"
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          title="Crear nuevo elemento"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <!-- Búsqueda y filtro de categoría en una sola fila -->
      <div class="grid grid-cols-1 gap-3">
        <!-- Barra de búsqueda -->
        <div class="relative">
          <input
            v-model="filtroTexto"
            type="text"
            placeholder="Buscar elementos..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
          />
          <svg
            class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <!-- Filtro por categoría (select) -->
        <div>
          <label for="filtroCategoria" class="sr-only">Categoría</label>
          <select
            id="filtroCategoria"
            v-model="categoriaSeleccionada"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
          >
            <option :value="null">Todas las categorías</option>
            <option
              v-for="categoria in categoriasDisponibles"
              :key="categoria.id"
              :value="categoria.id"
            >
              {{ categoria.nombre }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de elementos -->
    <div class="elementos-lista flex-1 overflow-y-auto p-4">
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
          <div class="elemento-preview flex items-center justify-center mb-3">
            <div
              class="preview-shape w-12 h-8 rounded flex items-center justify-center relative shadow-sm border border-white/20"
              :class="getShapeClass(elemento.forma)"
              :style="{
                backgroundColor:
                  elemento.color || elemento.colorBase || getColorCategoria(elemento.categoria),
              }"
            >
              <component :is="getIconComponent(elemento.icono)" class="w-4 h-4 text-white" />
              <span
                v-if="elemento.ubicacion === 'pared'"
                class="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
              ></span>
            </div>
          </div>

          <!-- Información del elemento -->
          <div class="elemento-info space-y-1">
            <h3 class="font-semibold text-sm text-gray-800 mb-1">{{ elemento.nombre }}</h3>
            <p class="text-xs text-gray-500 mb-2">{{ elemento.descripcion }}</p>

            <!-- Dimensiones -->
            <div class="elemento-specs space-y-1">
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Dim:</span>
                <span class="spec-value text-gray-700"
                  >{{ elemento.dimensiones.ancho }}×{{ elemento.dimensiones.largo }}×{{
                    elemento.dimensiones.alto
                  }}</span
                >
              </div>
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Peso:</span>
                <span class="spec-value text-gray-700">{{ elemento.pesoMaximo }}kg</span>
              </div>
              <div class="spec-item flex justify-between text-xs">
                <span class="spec-label text-gray-500 font-medium">Ubic:</span>
                <span class="spec-value text-gray-700 capitalize">{{ elemento.ubicacion }}</span>
              </div>
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

          <!-- Indicador de arrastre -->
          <div
            class="drag-indicator absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <svg
              class="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import {
  ELEMENTOS_PREDEFINIDOS,
  TODAS_LAS_CATEGORIAS,
  TIPOS_ENTIDAD,
  getColorPorTipo,
  FORMAS_DISPONIBLES,
  UBICACIONES_DISPONIBLES,
} from '@/utils/constants'

import ElementEditor from './modals/ElementEditor.vue'

// Store
const canvasStore = useCanvasStore()

// Estado local
const filtroTexto = ref('')
const categoriaSeleccionada = ref(null)
const mostrarModalCrear = ref(false)
const elementosPersonalizados = ref([])

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

// Computed: título dinámico según el contexto
const tituloContextual = computed(() => {
  const contexto = canvasStore.contextoActual.tipo

  if (contexto === 'plantas') {
    return 'Catálogo de Elementos'
  } else if (contexto === 'elementos') {
    return 'Catálogo de Contenedores'
  } else if (contexto === 'contenedores') {
    return 'Catálogo (Elementos + Contenedores)'
  }

  return 'Catálogo de Elementos'
})

// Computed: determina si se pueden crear elementos personalizados
const puedeCrearElementosPersonalizados = computed(() => {
  const contexto = canvasStore.contextoActual.tipo
  // Solo permitir creación personalizada en plantas (elementos)
  // Los contenedores son solo predefinidos
  return contexto === 'plantas'
})

// Computed: categorías disponibles según el contexto
const categoriasDisponibles = computed(() => {
  const contexto = canvasStore.contextoActual.tipo

  if (contexto === 'plantas') {
    // En plantas solo se pueden crear elementos
    return TODAS_LAS_CATEGORIAS.filter((cat) => cat.tipo === 'elementos')
  } else if (contexto === 'elementos') {
    // En elementos solo se pueden crear contenedores
    return TODAS_LAS_CATEGORIAS.filter((cat) => cat.tipo === 'contenedores')
  } else if (contexto === 'contenedores') {
    // En contenedores se pueden crear elementos Y contenedores
    return TODAS_LAS_CATEGORIAS.filter(
      (cat) => cat.tipo === 'elementos' || cat.tipo === 'contenedores',
    )
  }

  return TODAS_LAS_CATEGORIAS
})

// Computed: elementos filtrados según contexto y filtros
const elementosFiltrados = computed(() => {
  let elementos = [...ELEMENTOS_PREDEFINIDOS, ...elementosPersonalizados.value]

  // Filtrar por contexto (solo mostrar elementos apropiados)
  const contexto = canvasStore.contextoActual.tipo
  if (contexto === 'plantas') {
    elementos = elementos.filter((el) => el.tipo === 'elementos')
  } else if (contexto === 'elementos') {
    elementos = elementos.filter((el) => el.tipo === 'contenedores')
  } else if (contexto === 'contenedores') {
    // Los contenedores pueden contener elementos Y otros contenedores
    elementos = elementos.filter((el) => el.tipo === 'elementos' || el.tipo === 'contenedores')
  }

  // Filtrar por texto
  if (filtroTexto.value) {
    const texto = filtroTexto.value.toLowerCase()
    elementos = elementos.filter(
      (elemento) =>
        elemento.nombre.toLowerCase().includes(texto) ||
        elemento.descripcion.toLowerCase().includes(texto) ||
        elemento.categoria.includes(texto),
    )
  }

  // Filtrar por categoría
  if (categoriaSeleccionada.value) {
    elementos = elementos.filter((elemento) => elemento.categoria === categoriaSeleccionada.value)
  }

  return elementos
})

const onGuardarElemento = (elemento) => {
  const elementoNuevo = {
    ...elemento,
    id: `custom_${Date.now()}`,
    icono: 'box',
    personalizado: true,
    // Asegurar que tenga la propiedad tipo basada en la categoría
    tipo: elemento.categoria === 'contenedores' ? 'contenedores' : 'elementos',
  }
  elementosPersonalizados.value.push(elementoNuevo)
  cerrarModal()
  categoriaSeleccionada.value = elementoNuevo.categoria
  filtroTexto.value = ''
}

// Métodos
const getTipoNombre = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.nombre || 'Desconocido'
}

const getCategoriaName = (categoriaId) => {
  const categoria = TODAS_LAS_CATEGORIAS.find((c) => c.id === categoriaId)
  return categoria ? categoria.nombre : 'Sin categoría'
}

const getIconComponent = (iconType) => {
  // Retornamos un componente SVG simple para el icono
  const icons = {
    rack: 'svg',
    shelf: 'svg',
    table: 'svg',
    cabinet: 'svg',
    box: 'svg',
  }
  return icons[iconType] || 'svg'
}

const getShapeClass = (forma) => {
  switch (forma) {
    case 'rectangular':
      return 'rounded-sm'
    case 'circular':
      return 'rounded-full'
    default:
      return 'rounded-sm'
  }
}

// Drag and Drop
const iniciarArrastre = (elemento, event) => {
  console.log('Iniciando arrastre del elemento:', elemento)
  const datosArrastre = {
    tipo: 'elemento-catalogo',
    elemento: elemento,
    offset: {
      x: event.offsetX || 0,
      y: event.offsetY || 0,
    },
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
  // El formulario se resetea automáticamente al abrir el modal
}

// Cargar elementos personalizados del localStorage
onMounted(() => {
  const elementosGuardados = localStorage.getItem('elementos-personalizados')
  if (elementosGuardados) {
    try {
      elementosPersonalizados.value = JSON.parse(elementosGuardados)
    } catch (error) {
      console.error('Error cargando elementos personalizados:', error)
    }
  }
})

// Guardar elementos personalizados en localStorage
const guardarElementosPersonalizados = () => {
  localStorage.setItem('elementos-personalizados', JSON.stringify(elementosPersonalizados.value))
}

// Observar cambios en elementos personalizados para guardar
watch(
  () => elementosPersonalizados.value,
  () => {
    guardarElementosPersonalizados()
  },
  { deep: true },
)
</script>

<style scoped>
/* Estilos eliminados: todo se maneja con clases de Tailwind en el template */
</style>
