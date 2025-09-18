<!--
  AgregarCuartoModal.vue

  Modal para agregar cuartos o espacios con configuración de pisos/niveles.

  Props:
  - visible: Boolean - controla la visibilidad del modal
  - modo: String - 'cuarto' o 'espacio' para determinar el tipo a crear (cuartos o elementos)
-->

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" @click="cerrarModal" />
    <div
      class="relative z-10 bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 h-[90vh] flex flex-col"
    >
      <div class="px-6 py-4 flex-shrink-0">
        <div class="flex items-center justify-center">
          <h2 class="text-xl font-semibold text-primary">
            Agregar {{ modo === 'cuarto' ? 'cuarto' : 'espacio' }}
          </h2>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 flex-1 min-h-0 overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <!-- Card Izquierda - Datos Generales y Dimensiones -->
          <div class="bg-gray-50 rounded-lg p-6 h-full min-h-0 overflow-y-auto">
            <!-- Datos Generales -->
            <div class="mb-6">
              <h3 class="text-lg font-medium text-gray-800 mb-4">Datos generales</h3>
              <div class="space-y-4">
                <!-- Nombre y Color -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nombre*</label>
                    <input
                      v-model="datosGenerales.nombre"
                      type="text"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        touchedGeneral.nombre && !validNombre ? 'border-red-400' : 'border-gray-300'
                      "
                      :placeholder="`Nombre del ${modo}`"
                      @blur="touchedGeneral.nombre = true"
                    />
                    <p
                      v-if="touchedGeneral.nombre && !validNombre"
                      class="mt-1 text-xs text-red-600"
                    >
                      Nombre requerido.
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div class="flex items-center gap-3">
                      <input
                        v-model="datosGenerales.color"
                        type="color"
                        class="!w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        v-model="datosGenerales.color"
                        type="text"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                </div>

                <!-- Tipo (De forma interna se maneja como Categorías) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de {{ modo }}*
                  </label>
                  <select
                    v-model="datosGenerales.tipoSeleccionado"
                    class="w-full cursor-pointer px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="
                      touchedGeneral.tipoSeleccionado && !validTipo
                        ? 'border-red-400'
                        : 'border-gray-300'
                    "
                    @change="touchedGeneral.tipoSeleccionado = true"
                    @blur="touchedGeneral.tipoSeleccionado = true"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option
                      v-for="tipoItem in tiposDisponibles"
                      :key="tipoItem.id"
                      :value="tipoItem.id"
                    >
                      {{ tipoItem.nombre }}
                    </option>
                  </select>
                  <p
                    v-if="touchedGeneral.tipoSeleccionado && !validTipo"
                    class="mt-1 text-xs text-red-600"
                  >
                    Selecciona un tipo.
                  </p>
                </div>

                <!-- Orientación (siempre visible) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Orientación*</label>
                  <select
                    v-model="datosGenerales.orientacion"
                    class="w-full cursor-pointer px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="
                      touchedGeneral.orientacion && !validOrientacion
                        ? 'border-red-400'
                        : 'border-gray-300'
                    "
                    @change="touchedGeneral.orientacion = true"
                    @blur="touchedGeneral.orientacion = true"
                  >
                    <option value="">Seleccionar orientación</option>
                    <option v-for="opt in ORIENTACIONES" :key="opt.id" :value="opt.id">
                      {{ opt.nombre }}
                    </option>
                  </select>
                  <p
                    v-if="touchedGeneral.orientacion && !validOrientacion"
                    class="mt-1 text-xs text-red-600"
                  >
                    Selecciona una orientación.
                  </p>
                </div>

                <!-- Descripción -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    v-model="datosGenerales.descripcion"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :placeholder="`Descripción del ${modo}`"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Dimensiones Físicas -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 mb-4">Dimensiones físicas</h3>
              <div class="space-y-4">
                <!-- Forma de la base -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Forma de la base*</label
                  >
                  <select
                    v-model="dimensiones.forma"
                    class="w-full px-3 py-2 cursor-pointer border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :class="
                      touchedGeneral.forma && !validForma ? 'border-red-400' : 'border-gray-300'
                    "
                    @change="touchedGeneral.forma = true"
                    @blur="touchedGeneral.forma = true"
                  >
                    <option value="">Seleccionar forma</option>
                    <option v-for="forma in formasDisponibles" :key="forma.id" :value="forma.id">
                      {{ forma.nombre }}
                    </option>
                  </select>
                  <p v-if="touchedGeneral.forma && !validForma" class="mt-1 text-xs text-red-600">
                    Selecciona una forma.
                  </p>
                </div>

                <!-- Largo y Alto -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Largo (m)*</label>
                    <input
                      v-model.number="dimensiones.largo"
                      type="number"
                      min="0.1"
                      step="0.1"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        touchedGeneral.largo && !validLargo ? 'border-red-400' : 'border-gray-300'
                      "
                      @blur="touchedGeneral.largo = true"
                    />
                    <p v-if="touchedGeneral.largo && !validLargo" class="mt-1 text-xs text-red-600">
                      Ingresa un valor mayor a 0.
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Alto (m)*</label>
                    <input
                      v-model.number="dimensiones.alto"
                      type="number"
                      min="0.1"
                      step="0.1"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        touchedGeneral.alto && !validAlto ? 'border-red-400' : 'border-gray-300'
                      "
                      @blur="touchedGeneral.alto = true"
                    />
                    <p v-if="touchedGeneral.alto && !validAlto" class="mt-1 text-xs text-red-600">
                      Ingresa un valor mayor a 0.
                    </p>
                  </div>
                </div>

                <!-- Ancho y Capacidad -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ancho (m)*</label>
                    <input
                      v-model.number="dimensiones.ancho"
                      type="number"
                      min="0.1"
                      step="0.1"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        touchedGeneral.ancho && !validAncho ? 'border-red-400' : 'border-gray-300'
                      "
                      @blur="touchedGeneral.ancho = true"
                    />
                    <p v-if="touchedGeneral.ancho && !validAncho" class="mt-1 text-xs text-red-600">
                      Ingresa un valor mayor a 0.
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Capacidad de carga (kg)*</label
                    >
                    <input
                      v-model.number="dimensiones.capacidadCarga"
                      type="number"
                      min="0"
                      step="1"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        touchedGeneral.capacidadCarga && !validCapacidad
                          ? 'border-red-400'
                          : 'border-gray-300'
                      "
                      @blur="touchedGeneral.capacidadCarga = true"
                    />
                    <p
                      v-if="touchedGeneral.capacidadCarga && !validCapacidad"
                      class="mt-1 text-xs text-red-600"
                    >
                      Ingresa un valor mayor a 0.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Derecha - Configuración de Pisos/Niveles -->
          <div class="bg-gray-50 rounded-lg p-6 flex flex-col h-full min-h-0">
            <div class="flex items-center mb-4 flex-shrink-0">
              <h3 class="text-lg font-medium text-gray-800">
                Configuración de {{ modo === 'cuarto' ? 'pisos' : 'niveles' }}
              </h3>
            </div>

            <div class="space-y-6 overflow-y-auto flex-1">
              <div
                v-for="(pisoNivel, index) in pisosNiveles"
                :key="pisoNivel.id"
                class="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium text-gray-800">
                      {{ modo === 'cuarto' ? 'Piso' : 'Nivel' }} {{ index + 1 }}
                    </h4>
                    <!-- Custom inline tooltip trigger -->
                    <button
                      type="button"
                      class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[11px] font-semibold cursor-help"
                      aria-label="Información"
                      @mouseenter="
                        openTooltip(
                          $event,
                          'Considere que al no definir dimensiones, estas se calcularán automáticamente',
                        )
                      "
                      @focus="
                        openTooltip(
                          $event,
                          'Considere que al no definir dimensiones, estas se calcularán automáticamente',
                        )
                      "
                      @mouseleave="closeTooltip"
                      @blur="closeTooltip"
                    >
                      i
                    </button>
                  </div>
                  <UiTooltip
                    v-if="index > 0"
                    class="relative"
                    :label="'Eliminar ' + (modo === 'cuarto' ? 'piso' : 'nivel')"
                    position="left"
                    :delay="300"
                  >
                    <button
                      v-if="index > 0"
                      @click="eliminarPisoNivel(index)"
                      class="text-red-500 cursor-pointer hover:text-red-700 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </UiTooltip>
                </div>

                <div class="space-y-4">
                  <!-- Nombre -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del {{ modo === 'cuarto' ? 'piso' : 'nivel' }}
                    </label>
                    <input
                      v-model="pisoNivel.nombre"
                      type="text"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      :class="
                        pisoNivel._touched?.nombre && !(pisoNivel.nombre && pisoNivel.nombre.trim())
                          ? 'border-red-400'
                          : 'border-gray-300'
                      "
                      :placeholder="`${modo === 'cuarto' ? 'Piso' : 'Nivel'} ${index + 1}`"
                      @blur="ensureTouchedForLevel(pisoNivel) && (pisoNivel._touched.nombre = true)"
                    />
                    <p
                      v-if="
                        pisoNivel._touched?.nombre && !(pisoNivel.nombre && pisoNivel.nombre.trim())
                      "
                      class="mt-1 text-xs text-red-600"
                    >
                      El nombre es requerido.
                    </p>
                  </div>

                  <!-- Largo y Alto (opcionales: se auto-calculan si no se definen) -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Largo (m)</label>
                      <input
                        v-model.number="pisoNivel.largo"
                        type="number"
                        min="0.10"
                        step="any"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Alto (m)</label>
                      <input
                        v-model.number="pisoNivel.alto"
                        type="number"
                        min="0.10"
                        step="any"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <!-- Ancho y Capacidad (opcionales: se auto-calculan si no se definen) -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Ancho (m)</label>
                      <input
                        v-model.number="pisoNivel.ancho"
                        type="number"
                        min="0.10"
                        step="any"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2"
                        >Capacidad de carga (kg)</label
                      >
                      <input
                        v-model.number="pisoNivel.capacidadCarga"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <!-- Características -->
                  <div class="pt-4">
                    <h5 class="font-medium text-gray-700 mb-3">
                      Características del {{ modo === 'cuarto' ? 'piso' : 'nivel' }}
                    </h5>

                    <!-- Tipos de productos admitidos (dropdown con checkboxes) -->
                    <div class="mb-4" :ref="(el) => setDropdownRef(pisoNivel.id, el)">
                      <label class="block text-sm font-medium text-gray-700 mb-2"
                        >Tipos de productos admitidos*</label
                      >
                      <!-- Field -->
                      <div
                        class="w-full px-3 py-2 border rounded-lg text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer bg-white flex items-center justify-between gap-2"
                        :class="
                          pisoNivel._touched?.tiposProductos &&
                          (!pisoNivel.tiposProductos || pisoNivel.tiposProductos.length === 0)
                            ? 'border-red-400'
                            : 'border-gray-300'
                        "
                        @click.stop="
                          ensureTouchedForLevel(pisoNivel) &&
                          (pisoNivel._touched.tiposProductos = true) &&
                          (openDropdownId = openDropdownId === pisoNivel.id ? null : pisoNivel.id)
                        "
                        @focusin="
                          ensureTouchedForLevel(pisoNivel) &&
                          (pisoNivel._touched.tiposProductos = true)
                        "
                      >
                        <div class="flex flex-wrap items-center gap-1 min-h-[1.25rem]">
                          <template
                            v-if="pisoNivel.tiposProductos && pisoNivel.tiposProductos.length"
                          >
                            <span
                              v-for="idSel in pisoNivel.tiposProductos"
                              :key="idSel"
                              class="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs"
                            >
                              {{ mapaTiposProducto[idSel] || idSel }}
                            </span>
                          </template>
                          <span v-else class="text-gray-400">Selecciona tipos de productos</span>
                        </div>
                        <svg
                          class="w-4 h-4 text-gray-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      <p
                        v-if="
                          pisoNivel._touched?.tiposProductos &&
                          (!pisoNivel.tiposProductos || pisoNivel.tiposProductos.length === 0)
                        "
                        class="mt-1 text-xs text-red-600"
                      >
                        Selecciona al menos un tipo de producto.
                      </p>
                      <!-- Dropdown -->
                      <div v-if="openDropdownId === pisoNivel.id" class="relative">
                        <div
                          class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        >
                          <div
                            class="p-2 border-b bg-gray-50 text-xs text-gray-600 flex justify-between"
                          >
                            <button
                              class="hover:text-blue-600 cursor-pointer"
                              @click.stop="
                                seleccionarTodosTipos(pisoNivel) &&
                                ensureTouchedForLevel(pisoNivel) &&
                                (pisoNivel._touched.tiposProductos = true)
                              "
                            >
                              Seleccionar todos
                            </button>
                            <button
                              class="hover:text-blue-600 cursor-pointer"
                              @click.stop="
                                limpiarTipos(pisoNivel) &&
                                ensureTouchedForLevel(pisoNivel) &&
                                (pisoNivel._touched.tiposProductos = true)
                              "
                            >
                              Limpiar
                            </button>
                          </div>
                          <ul class="p-2 space-y-1">
                            <li
                              v-for="opt in TIPOS_PRODUCTO_ADMITIDOS"
                              :key="opt.id"
                              class="px-2 py-1 rounded hover:bg-gray-50"
                            >
                              <label
                                :for="`tp-${pisoNivel.id}-${opt.id}`"
                                class="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  :id="`tp-${pisoNivel.id}-${opt.id}`"
                                  type="checkbox"
                                  class="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                  :value="opt.id"
                                  v-model="pisoNivel.tiposProductos"
                                  @click.stop
                                  @change="
                                    ensureTouchedForLevel(pisoNivel) &&
                                    (pisoNivel._touched.tiposProductos = true)
                                  "
                                />
                                <span class="text-sm text-gray-700">{{ opt.nombre }}</span>
                              </label>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <!-- Radio buttons para tipo de zona (2 opciones) -->
                    <div class="mb-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2"
                        >Tipo de zona*</label
                      >
                      <div class="flex items-center gap-6 w-full">
                        <label
                          v-for="(tipoZona, idx) in tiposZonaUI"
                          :key="tipoZona.id"
                          :class="['flex items-center gap-2', idx === 1 ? 'ml-auto' : '']"
                        >
                          <input
                            v-model="pisoNivel.tipoZona"
                            type="radio"
                            :value="tipoZona.id"
                            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            @change="
                              ensureTouchedForLevel(pisoNivel) &&
                              (pisoNivel._touched.tipoZona = true)
                            "
                          />
                          <span class="ml-2 text-sm text-gray-700">{{ tipoZona.nombre }}</span>
                        </label>
                      </div>
                      <p
                        v-if="pisoNivel._touched?.tipoZona && !pisoNivel.tipoZona"
                        class="mt-1 text-xs text-red-600"
                      >
                        Selecciona el tipo de zona.
                      </p>
                    </div>

                    <!-- Checkbox materiales frágiles -->
                    <div>
                      <label class="flex items-center">
                        <input
                          v-model="pisoNivel.permiteFragiles"
                          type="checkbox"
                          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span class="ml-2 text-sm text-gray-700">Permite materiales frágiles</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-4 flex justify-center flex-shrink-0">
              <button
                @click="agregarPisoNivel"
                class="px-4 py-2 cursor-pointer bg-primary text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                Agregar un {{ modo === 'cuarto' ? 'piso' : 'nivel' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 flex justify-center gap-3 flex-shrink-0">
        <button
          @click="cerrarModal"
          class="px-4 py-2 cursor-pointer text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="guardar"
          :disabled="!esFormularioValido"
          class="bg-primary cursor-pointer px-4 py-2 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
    <teleport to="body" v-if="tooltip?.visible">
      <div
        class="fixed z-[9999] -translate-x-1/2 translate-y-[-100%] px-2.5 py-1.5 rounded bg-primary text-white text-xs shadow-lg max-w-[240px] whitespace-pre-line break-words"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        {{ tooltip.text }}
        <div
          class="absolute left-1/2 translate-x-[-50%] w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent"
          :style="{ borderTopColor: 'var(--color-primary, #3B82F6)', top: '100%' }"
        />
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from '@/inventory-smart/composables/useToast'
import {
  FORMAS_DISPONIBLES,
  TIPOS_CUARTO,
  TIPOS_ESPACIO,
  TIPOS_ZONA_CUARTO,
  TIPOS_ZONA_ESPACIO,
  TIPOS_PRODUCTO_ADMITIDOS,
  ORIENTACIONES,
} from '@/inventory-smart/utils/constants'
import UiTooltip from './ui/UiTooltip.vue'

const openDropdownId = ref(null)
const dropdownRefs = new Map()
const setDropdownRef = (id, el) => {
  if (el) dropdownRefs.set(id, el)
}

const mapaTiposProducto = Object.fromEntries(
  (TIPOS_PRODUCTO_ADMITIDOS || []).map((t) => [t.id, t.nombre]),
)

const handleClickOutside = (e) => {
  if (!openDropdownId.value) return
  const el = dropdownRefs.get(openDropdownId.value)
  if (el && !el.contains(e.target)) {
    openDropdownId.value = null
  }
}

// Inline tooltip state/logic
const tooltip = ref({ visible: false, text: '', x: 0, y: 0 })
let tooltipTimer = null
const openTooltip = (evt, text) => {
  clearTimeout(tooltipTimer)
  const rect = evt.currentTarget.getBoundingClientRect()
  tooltip.value.text = text
  tooltip.value.x = rect.left + rect.width / 2
  tooltip.value.y = rect.top - 8
  // small delay for hover intention
  tooltipTimer = setTimeout(() => {
    tooltip.value.visible = true
  }, 120)
}
const closeTooltip = () => {
  clearTimeout(tooltipTimer)
  tooltip.value.visible = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const toggleTipoProducto = (pisoNivel, id) => {
  if (!Array.isArray(pisoNivel.tiposProductos)) pisoNivel.tiposProductos = []
  const idx = pisoNivel.tiposProductos.indexOf(id)
  if (idx === -1) pisoNivel.tiposProductos.push(id)
  else pisoNivel.tiposProductos.splice(idx, 1)
}

const seleccionarTodosTipos = (pisoNivel) => {
  pisoNivel.tiposProductos = TIPOS_PRODUCTO_ADMITIDOS.map((t) => t.id)
}

const limpiarTipos = (pisoNivel) => {
  pisoNivel.tiposProductos = []
}

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  modo: {
    type: String,
    required: true,
    validator: (value) => ['cuarto', 'espacio'].includes(value),
  },
})

const emit = defineEmits(['close', 'save'])

const { showError } = useToast()

const datosGenerales = ref({
  nombre: '',
  color: '#3B82F6',
  tipoSeleccionado: '',
  descripcion: '',
  orientacion: '',
})

const dimensiones = ref({
  forma: '',
  largo: null,
  alto: null,
  ancho: null,
  capacidadCarga: null,
})

const pisosNiveles = ref([])

const touchedGeneral = ref({
  nombre: false,
  tipoSeleccionado: false,
  orientacion: false,
  forma: false,
  largo: false,
  alto: false,
  ancho: false,
  capacidadCarga: false,
})
const validNombre = computed(() => datosGenerales.value.nombre.trim() !== '')
const validTipo = computed(() => datosGenerales.value.tipoSeleccionado !== '')
const validOrientacion = computed(() => datosGenerales.value.orientacion !== '')
const validForma = computed(() => dimensiones.value.forma !== '')
const validLargo = computed(() => Number(dimensiones.value.largo) > 0)
const validAlto = computed(() => Number(dimensiones.value.alto) > 0)
const validAncho = computed(() => Number(dimensiones.value.ancho) > 0)
const validCapacidad = computed(() => Number(dimensiones.value.capacidadCarga) > 0)

const ensureTouchedForLevel = (nivel) => {
  if (!nivel._touched) nivel._touched = { tiposProductos: false, tipoZona: false, nombre: false }
  return nivel._touched
}

// Computed
const tiposDisponibles = computed(() => {
  return props.modo === 'cuarto' ? TIPOS_CUARTO : TIPOS_ESPACIO
})

const formasDisponibles = computed(() => {
  return FORMAS_DISPONIBLES
})

const zonasCatalogoMap = computed(() => {
  const all = [...TIPOS_ZONA_CUARTO, ...TIPOS_ZONA_ESPACIO]
  return all.reduce((acc, z) => {
    acc[z.id] = z.nombre
    return acc
  }, {})
})

// Solo 2 opciones: 'almacenaje' y la dependiente del tipo ('cross_docking' si cuarto, 'picking' si espacio)
const tiposZonaUI = computed(() => {
  const secondId = props.modo === 'cuarto' ? 'cross_docking' : 'picking'
  return [
    { id: 'almacenaje', nombre: zonasCatalogoMap.value['almacenaje'] || 'Zona de almacenaje' },
    {
      id: secondId,
      nombre:
        zonasCatalogoMap.value[secondId] ||
        (props.modo === 'cuarto' ? 'Zona de Cross-docking' : 'Zona de picking'),
    },
  ]
})

const esFormularioValido = computed(() => {
  const dg = datosGenerales.value
  const dim = dimensiones.value
  const hasGeneral =
    dg.nombre.trim() !== '' && dg.tipoSeleccionado !== '' && dg.color && dg.orientacion !== ''
  const hasDims =
    dim.forma !== '' && dim.largo > 0 && dim.alto > 0 && dim.ancho > 0 && dim.capacidadCarga > 0
  // En niveles/pisos, solo los campos de "Características" son obligatorios (tipoZona). Los demás se auto-calculan.
  const hasLevels =
    pisosNiveles.value.length > 0 &&
    pisosNiveles.value.every((piso) => {
      const hasNombre = !!(piso.nombre && piso.nombre.trim())
      const hasZona = piso.tipoZona !== ''
      const hasTipos = Array.isArray(piso.tiposProductos) && piso.tiposProductos.length > 0
      return hasNombre && hasZona && hasTipos
    })
  return hasGeneral && hasDims && hasLevels
})

// Helpers para cálculo/validación de niveles
const autoCompletarDimensionesNiveles = () => {
  const total = pisosNiveles.value.length || 1
  const largoG = Number(dimensiones.value.largo) || 0
  const anchoG = Number(dimensiones.value.ancho) || 0
  const altoG = Number(dimensiones.value.alto) || 0
  const capG = Number(dimensiones.value.capacidadCarga) || 0

  // Nombre por defecto y largo/ancho por defecto (si no se definieron)
  pisosNiveles.value.forEach((p, idx) => {
    const pref = props.modo === 'cuarto' ? 'Piso' : 'Nivel'
    if (!p.nombre || !p.nombre.trim()) p.nombre = `${pref} ${idx + 1}`
    if (!(Number(p.largo) > 0)) p.largo = largoG
    if (!(Number(p.ancho) > 0)) p.ancho = anchoG
  })

  // Distribución de alto: los definidos se respetan, los no definidos se reparten del remanente
  let sumaAltoDefinido = 0
  const nivelesAltoNoDef = []
  pisosNiveles.value.forEach((p) => {
    const a = Number(p.alto)
    if (a > 0) sumaAltoDefinido += a
    else nivelesAltoNoDef.push(p)
  })
  const remAlto = Math.max(altoG - sumaAltoDefinido, 0)
  const cuotaAlto = nivelesAltoNoDef.length > 0 ? remAlto / nivelesAltoNoDef.length : 0
  nivelesAltoNoDef.forEach((p) => {
    p.alto = cuotaAlto
  })

  // Distribución de capacidad de carga: mismo criterio que alto
  let sumaCapDefinida = 0
  const nivelesCapNoDef = []
  pisosNiveles.value.forEach((p) => {
    const c = Number(p.capacidadCarga)
    if (c > 0) sumaCapDefinida += c
    else nivelesCapNoDef.push(p)
  })
  const remCap = Math.max(capG - sumaCapDefinida, 0)
  const cuotaCap = nivelesCapNoDef.length > 0 ? remCap / nivelesCapNoDef.length : 0
  nivelesCapNoDef.forEach((p) => {
    p.capacidadCarga = cuotaCap
  })
}

const validarNivelesContraGlobal = () => {
  const errs = []
  const eps = 1e-6
  const largoG = Number(dimensiones.value.largo)
  const anchoG = Number(dimensiones.value.ancho)
  const altoG = Number(dimensiones.value.alto)
  const capG = Number(dimensiones.value.capacidadCarga)

  let sumaAlto = 0
  let sumaCap = 0
  pisosNiveles.value.forEach((p, idx) => {
    if (p.largo > largoG + eps)
      errs.push(
        `El largo del ${props.modo === 'cuarto' ? 'piso' : 'nivel'} ${idx + 1} excede el largo total`,
      )
    if (p.ancho > anchoG + eps)
      errs.push(
        `El ancho del ${props.modo === 'cuarto' ? 'piso' : 'nivel'} ${idx + 1} excede el ancho total`,
      )
    sumaAlto += Number(p.alto || 0)
    sumaCap += Number(p.capacidadCarga || 0)
  })
  if (Math.abs(sumaAlto - altoG) > eps)
    errs.push('La suma de los altos de los niveles/pisos no coincide con el alto total')
  if (Math.abs(sumaCap - capG) > eps)
    errs.push(
      'La suma de las capacidades de carga de los niveles/pisos no coincide con la capacidad total',
    )
  return errs
}

// Métodos
const inicializarFormulario = () => {
  datosGenerales.value = {
    nombre: '',
    color: '#3B82F6',
    tipoSeleccionado: '',
    descripcion: '',
    orientacion: '',
  }

  dimensiones.value = {
    forma: '',
    largo: null,
    alto: null,
    ancho: null,
    capacidadCarga: null,
  }

  // Crear el primer piso/nivel por defecto
  pisosNiveles.value = [
    {
      id: 1,
      nombre: `${props.modo === 'cuarto' ? 'Piso' : 'Nivel'} 1`,
      largo: null,
      alto: null,
      ancho: null,
      capacidadCarga: null,
      tiposProductos: [],
      tipoZona: 'almacenaje',
      permiteFragiles: false,
      _touched: { tiposProductos: false, tipoZona: false, nombre: false },
    },
  ]
  resetTouched()
}

const agregarPisoNivel = () => {
  const nuevoNumero = pisosNiveles.value.length + 1
  pisosNiveles.value.push({
    id: nuevoNumero,
    nombre: `${props.modo === 'cuarto' ? 'Piso' : 'Nivel'} ${nuevoNumero}`,
    largo: null,
    alto: null,
    ancho: null,
    capacidadCarga: null,
    tiposProductos: [],
    tipoZona: 'almacenaje',
    permiteFragiles: false,
    _touched: { tiposProductos: false, tipoZona: false, nombre: false },
  })
}

const eliminarPisoNivel = (index) => {
  pisosNiveles.value.splice(index, 1)
  // Actualizar nombres de pisos/niveles
  pisosNiveles.value.forEach((piso, idx) => {
    piso.id = idx + 1
    if (!piso.nombre || piso.nombre.startsWith(`${props.modo === 'cuarto' ? 'Piso' : 'Nivel'}`)) {
      piso.nombre = `${props.modo === 'cuarto' ? 'Piso' : 'Nivel'} ${idx + 1}`
    }
  })
}

const resetTouched = () => {
  touchedGeneral.value = {
    nombre: false,
    tipoSeleccionado: false,
    orientacion: false,
    forma: false,
    largo: false,
    alto: false,
    ancho: false,
    capacidadCarga: false,
  }
  pisosNiveles.value.forEach(
    (n) => (n._touched = { tiposProductos: false, tipoZona: false, nombre: false }),
  )
}

const cerrarModal = () => {
  resetTouched()
  emit('close')
}

const guardar = () => {
  if (!esFormularioValido.value) return

  // Completar automáticamente dimensiones faltantes de niveles
  autoCompletarDimensionesNiveles()

  // Validar consistencia respecto a dimensiones globales
  const errores = validarNivelesContraGlobal()
  if (errores.length > 0) {
    showError(errores.join('\n'))
    return
  }

  const datos = {
    datosGenerales: datosGenerales.value,
    dimensiones: dimensiones.value,
    pisosNiveles: pisosNiveles.value,
    modo: props.modo,
  }

  emit('save', datos)
  cerrarModal()
}

watch(
  () => props.visible,
  (nuevoValor) => {
    if (nuevoValor) {
      inicializarFormulario()
    }
  },
)

inicializarFormulario()
</script>

<style scoped></style>
