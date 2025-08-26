<!--
  PropiedadesPanel.vue
  Panel de propiedades del elemento seleccionado en el canvas.
-->

<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200" data-properties-panel>
    <!-- Header -->
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800">Propiedades</h2>
    </div>

    <!-- Contenido (scroll) -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Sin elemento seleccionado -->
      <div v-if="!elementoSeleccionado" class="text-center py-12">
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
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z"
          />
        </svg>
        <p class="text-gray-500 text-sm">
          Selecciona un elemento en el canvas<br />
          para ver sus propiedades
        </p>
      </div>

      <!-- Panel de propiedades -->
      <div v-else class="space-y-6">
        <!-- Información básica -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Información Básica</h3>

          <!-- ID (solo lectura) -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> ID del Elemento </label>
            <input
              :value="elementoSeleccionado.id"
              type="text"
              disabled
              class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">
              El ID se genera automáticamente y no puede modificarse
            </p>
          </div>

          <TagFilter
            class="pb-3"
            :selected-ids="elementoSeleccionado.etiquetas || []"
            @add="handleAgregarEtiqueta"
            @remove="handleQuitarEtiqueta"
            @create="abrirModalCrearEtiqueta"
          />

          <!-- Tipo y Categoría -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <input
                :value="getTipoNombre(elementoSeleccionado.tipo)"
                type="text"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <input
                :value="getCategoriaDisplay(elementoSeleccionado.categoria)"
                type="text"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed capitalize"
              />
            </div>
          </div>

          <!-- Nombre editable -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Nombre </label>
            <input
              v-model="propiedadesEditables.nombre"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del elemento"
              @input="actualizarPropiedad('nombre', $event.target.value)"
            />
          </div>

          <!-- Color editable -->
          <div class="mb-4">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Color </label>
            <div class="flex items-center gap-3">
              <input
                v-model="propiedadesEditables.color"
                type="color"
                class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                @input="actualizarPropiedad('color', $event.target.value)"
              />
              <input
                v-model="propiedadesEditables.color"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#3B82F6"
                @input="actualizarPropiedad('color', $event.target.value)"
              />
            </div>
          </div>
        </div>

        <!-- Posición y dimensiones -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Posición y Dimensiones</h3>

          <div class="grid grid-cols-2 gap-3">
            <!-- Posición X -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> X (px) </label>
              <input
                :value="Math.round(elementoSeleccionado.x)"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Posición Y -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Y (px) </label>
              <input
                :value="Math.round(elementoSeleccionado.y)"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Ancho -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Ancho (px) </label>
              <input
                :value="elementoSeleccionado.width"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Largo -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1"> Largo (px) </label>
              <input
                :value="elementoSeleccionado.height"
                type="number"
                disabled
                class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            Vista desde arriba: Ancho=X, Largo=Y.
            Vista de frente: Ancho=X, Largo=Z.
          </p>

          <!-- Dimensiones físicas adicionales (si están disponibles) -->
          <div class="mt-6">
            <h4 class="font-semibold text-gray-700 mb-3">Dimensiones Físicas (cm)</h4>
            <div class="space-y-3">
              <!-- Campo Ancho -->
              <div class="grid grid-cols-2 items-center">
                <label for="prop-ancho" class="text-sm text-gray-500">Ancho</label>
                <input
                  id="prop-ancho"
                  type="number"
                  :value="cambiosPendientes.dimensiones.ancho !== null ? cambiosPendientes.dimensiones.ancho : elementoSeleccionado.dimensiones?.ancho"
                  @change="actualizarDimension('ancho', $event.target.value)"
                  class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <!-- Campo Largo -->
            <div class="grid grid-cols-2 items-center">
              <label for="prop-largo" class="text-sm text-gray-500">Largo</label>
              <input
                id="prop-largo"
                type="number"
                :disabled="!canvasStore.estaEnPlanta"
                :value="cambiosPendientes.dimensiones.largo !== null ? cambiosPendientes.dimensiones.largo : elementoSeleccionado.dimensiones?.largo"
                @change="actualizarDimension('largo', $event.target.value)"
                class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <!-- Campo Alto -->
            <div class="grid grid-cols-2 items-center">
              <label for="prop-alto" class="text-sm text-gray-500">Alto</label>
              <input
                id="prop-alto"
                type="number"
                :disabled="canvasStore.estaEnPlanta"
                :value="cambiosPendientes.dimensiones.alto !== null ? cambiosPendientes.dimensiones.alto : elementoSeleccionado.dimensiones?.alto"
                @change="actualizarDimension('alto', $event.target.value)"
                class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
            Vista desde arriba: Ancho y Largo del elemento.
            <br />
            Vista de frente: Ancho y Alto del elemento.
          </p>
      </div>
    </div>

    <!-- === NUEVA SECCIÓN DE PROPIEDADES ADICIONALES === -->
    <div class="mt-6">
      <h4 class="font-semibold text-gray-700 mb-3">Propiedades Adicionales</h4>
      <div class="space-y-3">
        <!-- Campo Capacidad de Carga -->
        <div class="grid grid-cols-2 items-center">
          <label for="prop-peso-max" class="text-sm text-gray-500">Capacidad de Carga (kg)</label>
          <input
            id="prop-peso-max"
            type="number"
            :value="cambiosPendientes.pesoMaximo !== null ? cambiosPendientes.pesoMaximo : elementoSeleccionado.pesoMaximo"
            @change="actualizarPropiedadSimple('pesoMaximo', $event.target.value)"
            class="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: 100"
          />
        </div>
        <p class="text-xs text-gray-500">
          Peso máximo teórico que este elemento puede soportar
        </p>

        <!-- Mensaje de validación de peso (si existe) -->
        <div v-if="errorValidacion" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {{ errorValidacion }}
        </div>

        <!-- Información de peso total si tiene elementos hijos -->
        <div v-if="elementoSeleccionado.hijos && elementoSeleccionado.hijos.length > 0" class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          Este elemento contiene {{ elementoSeleccionado.hijos.length }} elementos con una capacidad de carga total requerida.
        </div>

        <!-- Información sobre capacidad del padre o planta contenedora -->
        <div v-if="infoPesoContenedor.mostrar" class="mt-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          {{ infoPesoContenedor.mensaje }}
        </div>
      </div>
    </div>

          <!-- Información específica para elementos de pared -->
          <div
            v-if="
              elementoSeleccionado.ubicacion === 'pared' &&
              elementoSeleccionado.alturaRespectoAlSuelo !== undefined
            "
            class="mt-3 pt-3 border-t border-gray-200"
          >
            <h4 class="text-xs font-medium text-gray-600 mb-2">Posicionamiento en Pared</h4>
            <div class="text-xs text-gray-500">
              <div>Altura del suelo: {{ elementoSeleccionado.alturaRespectoAlSuelo }}cm</div>
              <div class="text-xs text-gray-400 mt-1">
                Base del elemento a {{ elementoSeleccionado.alturaRespectoAlSuelo }}cm del suelo
              </div>
            </div>
          </div>
        </div>

        <!-- Jerarquía -->
        <div
          v-if="elementoSeleccionado.padre || elementoSeleccionado.hijos?.length"
          class="bg-gray-50 rounded-lg p-4"
        >
          <h3 class="text-sm font-medium text-gray-700 mb-3">Jerarquía</h3>

          <!-- Elemento padre -->
          <div v-if="elementoSeleccionado.padre" class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1"> Elemento Padre </label>
            <div
              class="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-blue-700">{{
                obtenerNombreElementoPorId(elementoSeleccionado.padre)
              }}</span>
            </div>
          </div>

          <!-- Elementos hijos -->
          <div v-if="elementoSeleccionado.hijos?.length" class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">
              Elementos Hijos ({{ elementoSeleccionado.hijos.length }})
            </label>
            <div class="space-y-1">
              <div
                v-for="hijoId in elementoSeleccionado.hijos"
                :key="hijoId"
                class="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
              >
                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-green-700">{{ obtenerNombreElementoPorId(hijoId) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer fijo con acciones -->
    <div v-if="elementoSeleccionado" class="p-4 border-t border-gray-200 bg-white">
      <div v-if="cambiosPendientes.dimensiones.ancho !== null ||
                  cambiosPendientes.dimensiones.largo !== null ||
                  cambiosPendientes.dimensiones.alto !== null ||
                  cambiosPendientes.pesoMaximo !== null"
           class="mb-2">
        <button
          @click="aplicarCambios"
          class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          Confirmar Cambios
        </button>
      </div>

      <div class="flex gap-2 mb-2">
        <button
          @click="onDeleteClick"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          :aria-label="isLockedSelected ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
          :title="isLockedSelected ? 'Elemento bloqueado — desbloquéalo para eliminar' : 'Eliminar (Supr)'"
        >
          Eliminar
        </button>
      </div>

      <div class="flex gap-2">
        <button
          @click="resetearPropiedades"
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Restablecer
        </button>
        <button
          @click="deseleccionarElemento"
          class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          Deseleccionar
        </button>
      </div>
    </div>
  </div>
  <CreateTagModal
    :show="modalCrearEtiquetaVisible"
    :initial-text="textoNuevaEtiqueta"
    @close="modalCrearEtiquetaVisible = false"
    @save="guardarYAsignarNuevaEtiqueta"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore.js'
import { useWeightValidation } from '@/composables/useWeightValidation.js'
import { TIPOS_ENTIDAD, TODAS_LAS_CATEGORIAS } from '@/utils/constants'
import { useDeleteElement } from '@/composables/useDeleteElement'
import TagFilter from './TagFilter.vue'
import CreateTagModal from './CreateTagModal.vue'

// Store
const canvasStore = useCanvasStore()
const { deleteSelected } = useDeleteElement()
const weightValidation = useWeightValidation()

// Referencias reactivas
const propiedadesEditables = ref({
  nombre: '',
  color: '#3B82F6',
})

// Referencias para los cambios pendientes
const cambiosPendientes = ref({
  dimensiones: {
    ancho: null,
    largo: null,
    alto: null
  },
  pesoMaximo: null
})

// Estado para almacenar errores
const errorValidacion = ref('')

const modalCrearEtiquetaVisible = ref(false)
const textoNuevaEtiqueta = ref('')

// Computed
const elementoSeleccionado = computed(() => canvasStore.elementoSeleccionadoCompleto)
const isLockedSelected = computed(() => {
  const el = elementoSeleccionado.value
  return !!(el && (el.bloqueado === true || el.locked === true))
})

// Información sobre la capacidad del contenedor padre o planta
const infoPesoContenedor = computed(() => {
  const elemento = elementoSeleccionado.value
  if (!elemento) return { mostrar: false, mensaje: '' }

  // Verificar si el elemento tiene un padre
  if (elemento.padre) {
    const padreId = elemento.padre
    const padre = canvasStore.elementoPorId(padreId)

    if (padre && padre.pesoMaximo > 0) {
      const nombrePadre = padre.nombre || obtenerNombreElementoPorId(padreId)
      const tipoElementoPadre = padre.tipo || 'elementos'
      const resultado = weightValidation.calcularPesoDisponible(padreId, tipoElementoPadre)

      if (resultado.limiteDePeso) {
        return {
          mostrar: true,
          mensaje: `Contenedor: "${nombrePadre}" - Capacidad disponible: ${Math.round(resultado.disponible * 10) / 10} kg de ${resultado.maximo} kg (${Math.round(resultado.porcentajeUsado)}% en uso)`
        }
      }
    }
  }
  // Verificar si el elemento está en una planta sin padre (elemento de primer nivel)
  else if (elemento.plantaId) {
    const plantaId = elemento.plantaId
    const planta = canvasStore.plantaPorId(plantaId)

    if (planta && planta.pesoMaximoSoportado > 0) {
      const resultado = weightValidation.calcularPesoDisponible(plantaId, 'plantas')

      if (resultado.limiteDePeso) {
        return {
          mostrar: true,
          mensaje: `Planta: "${planta.nombre}" - Capacidad disponible: ${Math.round(resultado.disponible * 10) / 10} kg de ${resultado.maximo} kg (${Math.round(resultado.porcentajeUsado)}% en uso)`
        }
      }
    }
  }

  return { mostrar: false, mensaje: '' }
})

// Watchers
watch(
  elementoSeleccionado,
  (nuevoElemento) => {
    if (nuevoElemento) {
      // Inicializar propiedades editables con los valores actuales
      propiedadesEditables.value = {
        nombre: nuevoElemento.nombre || generarNombrePorDefecto(nuevoElemento),
        color: nuevoElemento.color || '#3B82F6',
      }

      // Inicializar cambios pendientes con los valores actuales
      cambiosPendientes.value = {
        dimensiones: {
          ancho: nuevoElemento.dimensiones?.ancho || null,
          largo: nuevoElemento.dimensiones?.largo || null,
          alto: nuevoElemento.dimensiones?.alto || null
        },
        pesoMaximo: nuevoElemento.pesoMaximo || null
      }

      // Limpiar mensajes de error
      errorValidacion.value = ''
    }
  },
  { immediate: true },
)

// Métodos
const getTipoNombre = (tipo) => {
  const tipoInfo = TIPOS_ENTIDAD.find((t) => t.id === tipo)
  return tipoInfo?.nombre || tipo || 'Desconocido'
}

const getCategoriaDisplay = (categoria) => {
  const categoriaInfo = TODAS_LAS_CATEGORIAS.find((c) => c.id === categoria)
  return categoriaInfo?.nombre || categoria || 'Sin categoría'
}

const generarNombrePorDefecto = (elemento) => {
  return `${elemento.tipo.charAt(0).toUpperCase() + elemento.tipo.slice(1)} ${elemento.id.split('_')[1] || ''}`
}

// La función obtenerNombreElementoPorId se define más adelante en el componente

const actualizarPropiedad = (propiedad, valor) => {
  if (!elementoSeleccionado.value) return

  // Actualizar el valor local
  propiedadesEditables.value[propiedad] = valor

  // Actualizar en el store (tiempo real)
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
    [propiedad]: valor,
  })
}

const resetearPropiedades = () => {
  if (!elementoSeleccionado.value) return

  const propiedadesOriginales = {
    nombre: generarNombrePorDefecto(elementoSeleccionado.value),
    color: '#3B82F6',
  }

  // Restaurar propiedades editables
  propiedadesEditables.value = { ...propiedadesOriginales }

  // Actualizar en tiempo real solo para el nombre y color
  canvasStore.actualizarElemento(elementoSeleccionado.value.id, propiedadesOriginales)

  // Restablecer los cambios pendientes
  cambiosPendientes.value = {
    dimensiones: {
      ancho: null,
      largo: null,
      alto: null
    },
    pesoMaximo: null
  }

  // Limpiar mensajes de error
  errorValidacion.value = ''
}

const deseleccionarElemento = () => {
  canvasStore.seleccionarElemento(null)
}

const onDeleteClick = () => {
  deleteSelected({ withConfirm: true })
}

// Funciones para obtener nombres de elementos por ID
const obtenerNombreElementoPorId = (elementoId) => {
  const elemento = canvasStore.elementoPorId(elementoId)
  return elemento ? elemento.nombre || generarNombrePorDefecto(elemento) : `ID: ${elementoId}`
}

const handleAgregarEtiqueta = (etiquetaId) => {
  if (!elementoSeleccionado.value) return
  canvasStore.agregarEtiquetaAElemento(elementoSeleccionado.value.id, etiquetaId)
}

const handleQuitarEtiqueta = (etiquetaId) => {
  if (!elementoSeleccionado.value) return
  canvasStore.quitarEtiquetaDeElemento(elementoSeleccionado.value.id, etiquetaId)
}

const abrirModalCrearEtiqueta = (texto) => {
  textoNuevaEtiqueta.value = texto
  modalCrearEtiquetaVisible.value = true
}

const guardarYAsignarNuevaEtiqueta = (nuevaEtiqueta) => {
  if (!elementoSeleccionado.value) return
  canvasStore.crearYAsignarEtiquetaAElemento(elementoSeleccionado.value.id, nuevaEtiqueta)
  modalCrearEtiquetaVisible.value = false
}

const actualizarDimension = (dimension, valor) => {
  if (!elementoSeleccionado.value) return
  const valorNumerico = parseFloat(valor)
  if (isNaN(valorNumerico)) return // Evitar enviar valores no numéricos

  // Almacenar en cambios pendientes
  cambiosPendientes.value.dimensiones[dimension] = valorNumerico

  // Limpiar error si existe
  errorValidacion.value = ''
}

const actualizarPropiedadSimple = (propiedad, valor) => {
  if (!elementoSeleccionado.value) return
  const valorNumerico = parseFloat(valor)
  if (isNaN(valorNumerico)) return

  // Almacenar en cambios pendientes
  cambiosPendientes.value[propiedad] = valorNumerico

  // Limpiar error si existe
  errorValidacion.value = ''
}

const aplicarCambios = () => {
  if (!elementoSeleccionado.value) return

  const nuevoPesoMaximo = cambiosPendientes.value.pesoMaximo

  // 1. Validar el peso máximo si hay elementos hijos (validación hacia abajo)
  if (elementoSeleccionado.value.hijos && elementoSeleccionado.value.hijos.length > 0 && nuevoPesoMaximo !== null) {
    const elementoId = elementoSeleccionado.value.id
    const tipoElemento = elementoSeleccionado.value.tipo || 'elementos'

    // Calcular el peso total actual de los elementos hijos
    const resultado = weightValidation.calcularPesoDisponible(elementoId, tipoElemento)
    const pesoActualHijos = resultado.usado

    // Si el nuevo peso máximo es menor que el peso actual de los hijos, mostrar error
    if (resultado.limiteDePeso && nuevoPesoMaximo < pesoActualHijos) {
      errorValidacion.value = `La capacidad de carga debe ser al menos ${pesoActualHijos} kg para soportar los elementos actuales contenidos.`
      return
    }
  }

  // 2. Validar si el nuevo peso máximo excede la capacidad del padre (validación hacia arriba)
  if (nuevoPesoMaximo !== null && elementoSeleccionado.value.padre) {
    const padreId = elementoSeleccionado.value.padre
    const padre = canvasStore.elementoPorId(padreId)

    if (padre && padre.pesoMaximo > 0) { // Si el padre tiene límite de peso definido
      // Obtener la diferencia entre el nuevo y viejo peso máximo
      const pesoMaximoActual = elementoSeleccionado.value.pesoMaximo || 0
      const diferenciaPeso = nuevoPesoMaximo - pesoMaximoActual

      if (diferenciaPeso > 0) {
        // Calcular el peso disponible en el padre
        const tipoElementoPadre = padre.tipo || 'elementos'
        const resultadoPadre = weightValidation.calcularPesoDisponible(padreId, tipoElementoPadre)

        // Si el incremento de peso excede la capacidad disponible en el padre
        if (resultadoPadre.limiteDePeso && diferenciaPeso > resultadoPadre.disponible) {
          errorValidacion.value = `El incremento de capacidad de carga (${diferenciaPeso} kg) excede la capacidad disponible del elemento padre (${resultadoPadre.disponible} kg).`
          return
        }
      }
    }
  }

  // También validar si el elemento está en una planta con límite de peso
  if (nuevoPesoMaximo !== null && !elementoSeleccionado.value.padre && elementoSeleccionado.value.plantaId) {
    const plantaId = elementoSeleccionado.value.plantaId
    const planta = canvasStore.plantaPorId(plantaId)

    if (planta && planta.pesoMaximoSoportado > 0) {
      // Obtener la diferencia entre el nuevo y viejo peso máximo
      const pesoMaximoActual = elementoSeleccionado.value.pesoMaximo || 0
      const diferenciaPeso = nuevoPesoMaximo - pesoMaximoActual

      if (diferenciaPeso > 0) {
        // Calcular el peso disponible en la planta
        const resultadoPlanta = weightValidation.calcularPesoDisponible(plantaId, 'plantas')

        // Si el incremento de peso excede la capacidad disponible en la planta
        if (resultadoPlanta.limiteDePeso && diferenciaPeso > resultadoPlanta.disponible) {
          errorValidacion.value = `El incremento de capacidad de carga (${diferenciaPeso} kg) excede la capacidad disponible de la planta (${resultadoPlanta.disponible} kg).`
          return
        }
      }
    }
  }

  // Si no hay errores, aplicar cambios
  const actualizaciones = {}

  // Actualizar dimensiones
  if (cambiosPendientes.value.dimensiones.ancho !== null ||
      cambiosPendientes.value.dimensiones.largo !== null ||
      cambiosPendientes.value.dimensiones.alto !== null) {

    const dimensionesActuales = elementoSeleccionado.value.dimensiones || {}

    actualizaciones.dimensiones = {
      ancho: cambiosPendientes.value.dimensiones.ancho !== null
        ? cambiosPendientes.value.dimensiones.ancho
        : dimensionesActuales.ancho,
      largo: cambiosPendientes.value.dimensiones.largo !== null
        ? cambiosPendientes.value.dimensiones.largo
        : dimensionesActuales.largo,
      alto: cambiosPendientes.value.dimensiones.alto !== null
        ? cambiosPendientes.value.dimensiones.alto
        : dimensionesActuales.alto
    }
  }

  // Actualizar peso máximo
  if (cambiosPendientes.value.pesoMaximo !== null) {
    actualizaciones.pesoMaximo = cambiosPendientes.value.pesoMaximo
  }

  // Si hay actualizaciones, aplicarlas
  if (Object.keys(actualizaciones).length > 0) {
    canvasStore.actualizarElemento(elementoSeleccionado.value.id, actualizaciones)

    // También actualizar las propiedades de renderizado width/height según la vista actual
    const CM_TO_PX = 10 // Factor de conversión

    if (actualizaciones.dimensiones) {
      if (canvasStore.vistaActiva === 'XY') {
        // Vista superior: ancho->width, largo->height
        if (actualizaciones.dimensiones.ancho !== undefined) {
          canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
            width: actualizaciones.dimensiones.ancho * CM_TO_PX
          })
        }
        if (actualizaciones.dimensiones.largo !== undefined) {
          canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
            height: actualizaciones.dimensiones.largo * CM_TO_PX
          })
        }
      } else if (canvasStore.vistaActiva === 'XZ') {
        // Vista frontal: ancho->width, alto->height
        if (actualizaciones.dimensiones.ancho !== undefined) {
          canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
            width: actualizaciones.dimensiones.ancho * CM_TO_PX
          })
        }
        if (actualizaciones.dimensiones.alto !== undefined) {
          canvasStore.actualizarElemento(elementoSeleccionado.value.id, {
            height: actualizaciones.dimensiones.alto * CM_TO_PX
          })
        }
      }
    }

    // Limpiar mensaje de error si existe
    errorValidacion.value = ''
  }
}
</script>

<style scoped>
/* Estilos personalizados para mejor UX */
input[type='color'] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: none;
  cursor: pointer;
}

input[type='color']::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type='color']::-webkit-color-swatch {
  border: none;
  border-radius: 0.375rem;
}

input[type='color']::-moz-color-swatch {
  border: none;
  border-radius: 0.375rem;
}

input[disabled] {
  cursor: not-allowed;
}

.cursor-not-allowed {
  cursor: not-allowed !important;
}
</style>
