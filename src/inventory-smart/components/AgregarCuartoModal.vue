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
            {{ props.initialForm && typeof props.initialForm === 'object' ? 'Editar' : 'Agregar' }} {{ modo === 'cuarto' ? 'cuarto' : 'espacio' }}
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
                      @input="touchedGeneral.nombre = true"
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

                <!-- Bloque específico para espacios: orientación, ubicación y altura en pared -->
                <template v-if="modo === 'espacio'">
                  <!-- Orientación y Ubicación en la misma fila -->
                  <div class="grid grid-cols-2 gap-4">
                    <!-- Orientación -->
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

                    <!-- Ubicación -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Ubicación*</label>
                      <select
                        v-model="datosGenerales.ubicacion"
                        class="w-full cursor-pointer px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="
                          touchedGeneral.ubicacion && !validUbicacion
                            ? 'border-red-400'
                            : 'border-gray-300'
                        "
                        @change="touchedGeneral.ubicacion = true"
                      >
                        <option value="">Seleccionar ubicación</option>
                        <option v-for="ubicacion in UBICACIONES_DISPONIBLES" :key="ubicacion.id" :value="ubicacion.id">
                          {{ ubicacion.nombre }}
                        </option>
                      </select>
                      <p
                        v-if="touchedGeneral.ubicacion && !validUbicacion"
                        class="mt-1 text-xs text-red-600"
                      >
                        Selecciona una ubicación.
                      </p>
                    </div>
                  </div>

                  <!-- Altura respecto al suelo (solo espacios en pared) -->
                  <div v-if="datosGenerales.ubicacion === 'pared'" class="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Altura respecto al suelo (m)*</label>
                      <input
                        v-model.number="datosGenerales.alturaRespectoAlSuelo"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="
                          touchedGeneral.alturaRespectoAlSuelo && !validAlturaRespectoAlSuelo
                            ? 'border-red-400'
                            : 'border-gray-300'
                        "
                        @input="touchedGeneral.alturaRespectoAlSuelo = true"
                        @blur="touchedGeneral.alturaRespectoAlSuelo = true"
                      />
                      <p v-if="touchedGeneral.alturaRespectoAlSuelo && !validAlturaRespectoAlSuelo" class="mt-1 text-xs text-red-600">
                        Ingresa una altura válida mayor a 0.
                      </p>
                    </div>
                  </div>
                </template>

                <!-- Orientación solo (para cuartos) -->
                <div v-else>
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

                <!-- Dimensiones dinámicas según forma -->
                <template v-if="dimensiones.forma === 'circular'">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Diámetro (m)*</label>
                      <input
                        v-model.number="diametro"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.ancho && !validAncho ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.ancho = true; touchedGeneral.largo = true"
                        @blur="touchedGeneral.ancho = true; touchedGeneral.largo = true"
                      />
                      <p v-if="(touchedGeneral.ancho || touchedGeneral.largo) && !validAncho" class="mt-1 text-xs text-red-600">
                        Ingresa un valor mayor a 0.
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Alto (m)*</label>
                      <input
                        v-model.number="dimensiones.alto"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.alto && !validAlto ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.alto = true"
                        @blur="touchedGeneral.alto = true"
                      />
                      <p v-if="touchedGeneral.alto && !validAlto" class="mt-1 text-xs text-red-600">
                        Ingresa un valor mayor a 0.
                      </p>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Capacidad de carga (kg)*</label>
                      <input
                        v-model.number="dimensiones.capacidadCarga"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.capacidadCarga && !validCapacidad ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.capacidadCarga = true"
                        @blur="touchedGeneral.capacidadCarga = true"
                      />
                      <p v-if="touchedGeneral.capacidadCarga && !validCapacidad" class="mt-1 text-xs text-red-600">
                        Ingresa un valor mayor a 0.
                      </p>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <!-- Largo y Alto -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Largo (m)*</label>
                      <input
                        v-model.number="dimensiones.largo"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.largo && !validLargo ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.largo = true"
                        @blur="touchedGeneral.largo = true"
                      />
                      <p v-if="touchedGeneral.largo && !validLargo" class="mt-1 text-xs text-red-600">Ingresa un valor mayor a 0.</p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Alto (m)*</label>
                      <input
                        v-model.number="dimensiones.alto"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.alto && !validAlto ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.alto = true"
                        @blur="touchedGeneral.alto = true"
                      />
                      <p v-if="touchedGeneral.alto && !validAlto" class="mt-1 text-xs text-red-600">Ingresa un valor mayor a 0.</p>
                    </div>
                  </div>
                  <!-- Ancho y Capacidad -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Ancho (m)*</label>
                      <input
                        v-model.number="dimensiones.ancho"
                        type="number"
                        min="0.10"
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.ancho && !validAncho ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.ancho = true"
                        @blur="touchedGeneral.ancho = true"
                      />
                      <p v-if="touchedGeneral.ancho && !validAncho" class="mt-1 text-xs text-red-600">Ingresa un valor mayor a 0.</p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Capacidad de carga (kg)*</label>
                      <input
                        v-model.number="dimensiones.capacidadCarga"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="touchedGeneral.capacidadCarga && !validCapacidad ? 'border-red-400' : 'border-gray-300'"
                        @input="touchedGeneral.capacidadCarga = true"
                        @blur="touchedGeneral.capacidadCarga = true"
                      />
                      <p v-if="touchedGeneral.capacidadCarga && !validCapacidad" class="mt-1 text-xs text-red-600">Ingresa un valor mayor a 0.</p>
                    </div>
                  </div>
                </template>
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
              <!-- Errores agregados de sumas globales -->
              <div v-if="excesoAltoNiveles || excesoCapacidadNiveles" class="mb-2 space-y-1">
                <p v-if="excesoAltoNiveles" class="text-xs text-red-600">
                  La suma de los altos de los {{ modo === 'cuarto' ? 'pisos' : 'niveles' }} excede el alto total ({{ dimensiones.alto }} m)
                </p>
                <p v-if="excesoCapacidadNiveles" class="text-xs text-red-600">
                  La suma de las capacidades de carga excede la capacidad total ({{ dimensiones.capacidadCarga }} kg)
                </p>
              </div>
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
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="excedeLargo(pisoNivel) ? 'border-red-400' : 'border-gray-300'"
                      />
                      <p v-if="excedeLargo(pisoNivel)" class="mt-1 text-xs text-red-600">
                        El largo excede el largo total ({{ dimensiones.largo || 0 }} m)
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Alto (m)</label>
                      <input
                        v-model.number="pisoNivel.alto"
                        type="number"
                        min="0.10"
                        step="0.01"
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
                        step="0.01"
                        class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        :class="excedeAncho(pisoNivel) ? 'border-red-400' : 'border-gray-300'"
                      />
                      <p v-if="excedeAncho(pisoNivel)" class="mt-1 text-xs text-red-600">
                        El ancho excede el ancho total ({{ dimensiones.ancho || 0 }} m)
                      </p>
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

                    <!-- Tipos de productos admitidos (componente reutilizable) -->
                    <div class="mb-4">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Tipos de productos admitidos*</label>
                      <ProductTypesMultiSelect
                        v-model="pisoNivel.tiposProductos"
                        :error="pisoNivel._touched?.tiposProductos && (!pisoNivel.tiposProductos || pisoNivel.tiposProductos.length === 0)"
                        error-message="Selecciona al menos un tipo de producto."
                        @changed="ensureTouchedForLevel(pisoNivel) && (pisoNivel._touched.tiposProductos = true)"
                      />
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
          class="bg-primary cursor-pointer px-4 py-2 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
import { storeToRefs } from 'pinia'
import { useCanvasStore } from '@/inventory-smart/composables/useCanvasStore'
import { useToast } from '@/inventory-smart/composables/useToast'
import {
  FORMAS_DISPONIBLES,
  TIPOS_ZONA_CUARTO,
  TIPOS_ZONA_ESPACIO,
  ORIENTACIONES,
  UBICACIONES_DISPONIBLES,
} from '@/inventory-smart/utils/constants'
import UiTooltip from './ui/UiTooltip.vue'
import ProductTypesMultiSelect from './ui/ProductTypesMultiSelect.vue'


// Catálogos dinámicos desde el store
const canvasStore = useCanvasStore()
const { catalogos } = storeToRefs(canvasStore)



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


// Helpers locales desde catálogos dinámicos




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
  // Formulario inicial opcional para modo edición
  initialForm: {
    type: Object,
    default: null,
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
  ubicacion: '',
  alturaRespectoAlSuelo: null,
})

const dimensiones = ref({
  forma: '',
  largo: null,
  alto: null,
  ancho: null,
  capacidadCarga: null,
})

// Diámetro (solo aplica si forma === 'circular')
const diametro = ref(null)

const pisosNiveles = ref([])

const touchedGeneral = ref({
  nombre: false,
  tipoSeleccionado: false,
  orientacion: false,
  ubicacion: false,
  alturaRespectoAlSuelo: false,
  forma: false,
  largo: false,
  alto: false,
  ancho: false,
  capacidadCarga: false,
})
const validNombre = computed(() => datosGenerales.value.nombre.trim() !== '')
const validTipo = computed(() => datosGenerales.value.tipoSeleccionado !== '')
const validOrientacion = computed(() => datosGenerales.value.orientacion !== '')
const validUbicacion = computed(() => datosGenerales.value.ubicacion !== '')
const validAlturaRespectoAlSuelo = computed(() => {
  // Obligatorio solo cuando es espacio y ubicación = 'pared'
  if (props.modo !== 'espacio') return true
  if (datosGenerales.value.ubicacion !== 'pared') return true
  const v = Number(datosGenerales.value.alturaRespectoAlSuelo)
  return Number.isFinite(v) && v > 0
})
const validForma = computed(() => dimensiones.value.forma !== '')
const validLargo = computed(() => Number(dimensiones.value.largo) > 0)
const validAlto = computed(() => Number(dimensiones.value.alto) > 0)
const validAncho = computed(() => Number(dimensiones.value.ancho) > 0)
const validCapacidad = computed(() => Number(dimensiones.value.capacidadCarga) > 0)

// Mantener ancho y largo iguales cuando sea circular
watch(
  () => dimensiones.value.forma,
  (nueva) => {
    if (nueva === 'circular') {
      // Inicializar diametro tomando el ancho o largo existente
      const base = Number(dimensiones.value.ancho) || Number(dimensiones.value.largo) || null
      if (base) {
        diametro.value = base
        dimensiones.value.ancho = base
        dimensiones.value.largo = base
      } else {
        diametro.value = null
      }
    }
  }
)

watch(
  () => diametro.value,
  (nuevo) => {
    if (dimensiones.value.forma === 'circular' && Number(nuevo) > 0) {
      dimensiones.value.ancho = Number(nuevo)
      dimensiones.value.largo = Number(nuevo)
    }
  }
)

// Si el usuario cambia manualmente ancho estando circular (por autofill u otros), reflejar
watch(
  () => dimensiones.value.ancho,
  (nuevoAncho) => {
    if (dimensiones.value.forma === 'circular' && Number(nuevoAncho) > 0) {
      dimensiones.value.largo = Number(nuevoAncho)
      diametro.value = Number(nuevoAncho)
    }
  }
)

const ensureTouchedForLevel = (nivel) => {
  if (!nivel._touched) nivel._touched = { tiposProductos: false, tipoZona: false, nombre: false }
  return nivel._touched
}

const tiposDisponibles = computed(() => {
  const tipos = props.modo === 'cuarto' ? catalogos.value.tiposCuarto : catalogos.value.tiposEspacio
  return tipos.filter((t) => t.id !== 'pasillo')
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

  let hasGeneral = dg.nombre.trim() !== '' && dg.tipoSeleccionado !== '' && dg.color && dg.orientacion !== ''

  // Para espacios, también validar ubicación y, si es pared, alturaRespectoAlSuelo
  if (props.modo === 'espacio') {
    hasGeneral = hasGeneral && dg.ubicacion !== '' && validAlturaRespectoAlSuelo.value
  }

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

// Validaciones en tiempo real para niveles
const eps = 1e-6
const excesoAltoNiveles = computed(() => {
  const altoG = Number(dimensiones.value.alto)
  if (!(altoG > 0)) return false
  const sumaAlto = pisosNiveles.value.reduce((acc, p) => acc + Number(p.alto || 0), 0)
  return sumaAlto > altoG + eps
})
const excesoCapacidadNiveles = computed(() => {
  const capG = Number(dimensiones.value.capacidadCarga)
  if (!(capG > 0)) return false
  const sumaCap = pisosNiveles.value.reduce((acc, p) => acc + Number(p.capacidadCarga || 0), 0)
  return sumaCap > capG + eps
})
const excedeLargo = (p) => {
  const largoG = Number(dimensiones.value.largo)
  if (!(largoG > 0)) return false
  return Number(p.largo) > largoG + eps
}
const excedeAncho = (p) => {
  const anchoG = Number(dimensiones.value.ancho)
  if (!(anchoG > 0)) return false
  return Number(p.ancho) > anchoG + eps
}

// Métodos
const inicializarFormulario = () => {
  // Si viene un formulario inicial (editar), poblar desde ahí
  const f = props.initialForm
  if (f && typeof f === 'object') {
    // Modo lo controla el padre, aquí solo tomamos los valores
    const dg = f.datosGenerales || {}
    datosGenerales.value = {
      nombre: dg.nombre || '',
      color: dg.color || '#3B82F6',
      tipoSeleccionado: dg.tipoSeleccionado || '',
      descripcion: dg.descripcion || '',
      orientacion: dg.orientacion || '',
      ubicacion: props.modo === 'espacio' ? (dg.ubicacion || '') : '',
      alturaRespectoAlSuelo:
        props.modo === 'espacio' && dg.ubicacion === 'pared'
          ? (typeof dg.alturaRespectoAlSuelo === 'number' ? dg.alturaRespectoAlSuelo : null)
          : null,
    }

    const dim = f.dimensiones || {}
    dimensiones.value = {
      forma: dim.forma || '',
      largo: dim.largo ?? null,
      alto: dim.alto ?? null,
      ancho: dim.ancho ?? null,
      capacidadCarga: dim.capacidadCarga ?? null,
    }

    const niveles = Array.isArray(f.pisosNiveles) ? f.pisosNiveles : []
    pisosNiveles.value = niveles.length
      ? niveles.map((n, idx) => ({
          id: idx + 1,
          nombre: n.nombre || `${props.modo === 'cuarto' ? 'Piso' : 'Nivel'} ${idx + 1}`,
          largo: n.largo ?? null,
          alto: n.alto ?? null,
          ancho: n.ancho ?? null,
          capacidadCarga: n.capacidadCarga ?? null,
          tiposProductos: Array.isArray(n.tiposProductos) ? n.tiposProductos.slice() : [],
          tipoZona: n.tipoZona || 'almacenaje',
          permiteFragiles: !!n.permiteFragiles,
          _touched: { tiposProductos: false, tipoZona: false, nombre: false },
        }))
      : [
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
    return
  }

  // Caso creación (sin formulario inicial)
  datosGenerales.value = {
    nombre: '',
    color: '#3B82F6',
    tipoSeleccionado: '',
    descripcion: '',
    orientacion: '',
    ubicacion: '',
    alturaRespectoAlSuelo: null,
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
    ubicacion: false,
    alturaRespectoAlSuelo: false,
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

const marcarTodoInvalido = () => {
  Object.keys(touchedGeneral.value).forEach(k => touchedGeneral.value[k] = true)
  pisosNiveles.value.forEach(p => {
    ensureTouchedForLevel(p)
    p._touched.nombre = true
    p._touched.tiposProductos = true
    p._touched.tipoZona = true
  })
}

const guardar = () => {
  // Si algo es inválido, marcar y salir
  if (!esFormularioValido.value) {
    marcarTodoInvalido()
    return
  }

  // Completar automáticamente dimensiones faltantes de niveles
  autoCompletarDimensionesNiveles()

  // Validar excedentes después de autocompletar
  if (excesoAltoNiveles.value || excesoCapacidadNiveles.value || pisosNiveles.value.some(p => excedeLargo(p) || excedeAncho(p))) {
    marcarTodoInvalido()
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

watch(
  () => props.initialForm,
  (val) => {
    if (props.visible && val) inicializarFormulario()
  },
  { deep: true },
)

inicializarFormulario()
</script>

<style scoped></style>
