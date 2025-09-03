<!--
  BackupModal.vue

  Modal para gestionar copias de seguridad automáticas.
  Permite ver, restaurar y eliminar copias de seguridad.
-->

<template>
  <div v-if="mostrar" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="cerrar">
    <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-[90%] max-h-[90vh] overflow-hidden" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 21q-3.15 0-5.575-1.912T3.275 14.2q-.1-.375.15-.687t.675-.363q.4-.05.725.15t.45.6q.6 2.25 2.475 3.675T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H8q.425 0 .713.288T9 9t-.288.713T8 10H4q-.425 0-.712-.288T3 9V5q0-.425.288-.712T4 4t.713.288T5 5v1.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m1-9.4l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T11 11.975V8q0-.425.288-.712T12 7t.713.288T13 8z"
            />
          </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">Copias de Seguridad</h2>
            <p class="text-sm text-slate-500">Restaura versiones anteriores del canvas</p>
          </div>
        </div>

        <button @click="cerrar" class="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Estado del Autosave -->
        <div class="mb-6 p-4 bg-slate-50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                autoSave.isEnabled.value ? 'bg-green-500' : 'bg-slate-400'
              ]"></div>
              <div>
                <h3 class="font-medium text-slate-800">Guardado Automático</h3>
                <p class="text-sm text-slate-600">
                  {{ autoSave.isEnabled.value ?
                    `Activo cada ${autoSave.config.intervalSeconds}s` :
                    'Desactivado'
                  }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- <button
                @click="toggleAutoSave"
                :class="[
                  'px-4 py-2 cursor-pointer rounded-lg text-sm font-medium transition-colors',
                  autoSave.isEnabled.value
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                ]"
              >
                {{ autoSave.isEnabled.value ? 'Desactivar' : 'Activar' }}
              </button> -->

              <button
                @click="realizarBackupManual"
                :disabled="autoSave.isLoading.value"
                class="px-4 py-2 cursor-pointer bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ autoSave.isLoading.value ? 'Guardando...' : 'Crear nueva copia' }}
              </button>
            </div>
          </div>

          <div v-if="autoSave.lastSaveTime.value" class="mt-3 text-sm text-slate-600">
            Último guardado: {{ formatearFecha(autoSave.lastSaveTime.value) }}
          </div>
        </div>

        <!-- Lista de Copias -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <!-- <h3 class="font-medium text-slate-800">
              Copias Disponibles ({{ backups.length }}/{{ autoSave.config.maxBackups }})
            </h3> -->

            <!-- <button
              v-if="backups.length > 0"
              @click="confirmarLimpiezaTotal"
              class="text-sm cursor-pointer text-red-600 hover:text-red-700 transition-colors"
            >
              Eliminar todas
            </button> -->
          </div>

          <!-- Loading State -->
          <div v-if="cargando" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="backups.length === 0" class="text-center py-8">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-.707.293H7a4 4 0 01-4-4V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p class="text-slate-500 mb-2">No hay copias de seguridad disponibles</p>
            <p class="text-sm text-slate-400">Las copias se crearán automáticamente cada {{ autoSave.config.intervalSeconds }} segundos</p>
          </div>

          <!-- Lista de Backups -->
          <div v-else class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="backup in backups"
              :key="backup.id"
              class="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="text-sm font-medium text-slate-800">
                      {{ backup.formattedDate }}
                    </div>
                    <div class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {{ formatearTamaño(backup.size) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-4 text-sm text-slate-600">
                    <span>🏢 {{ backup.plantas }} plantas</span>
                    <span>📦 {{ backup.elementos }} elementos</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    @click="confirmarRestauracion(backup)"
                    class="px-3 py-1.5 cursor-pointer bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Restaurar
                  </button>

                  <!-- <button
                    @click="eliminarBackup(backup.id)"
                    class="px-3 py-1.5 cursor-pointer bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Eliminar
                  </button> -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje de estado -->
        <div v-if="mensaje" :class="[
          'mt-4 p-3 rounded-lg flex items-center gap-2',
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' :
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        ]">
          <svg v-if="mensaje.tipo === 'exito'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <svg v-else-if="mensaje.tipo === 'error'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm">{{ mensaje.texto }}</span>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación -->
    <div v-if="mostrarConfirmacion" class="fixed inset-0 bg-black/60 flex items-center justify-center z-60" @click="cancelarConfirmacion">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-[90%] p-6" @click.stop>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-800">{{ confirmacion.titulo }}</h3>
        </div>

        <p class="text-slate-600 mb-6">{{ confirmacion.mensaje }}</p>

        <div class="flex items-center gap-3 justify-end">
          <button
            @click="cancelarConfirmacion"
            class="px-4 py-2 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="ejecutarConfirmacion"
            :disabled="autoSave.isLoading.value"
            :class="[
              'px-4 py-2 cursor-pointer rounded-lg text-white font-medium transition-colors disabled:opacity-50',
              confirmacion.tipo === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            ]"
          >
            {{ autoSave.isLoading.value ? 'Procesando...' : confirmacion.boton }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  mostrar: {
    type: Boolean,
    default: false,
  },
  autoSave: {
    type: Object,
    required: true,
  }
})

const emit = defineEmits(['cerrar'])

// Estado local
const backups = ref([])
const cargando = ref(false)
const mensaje = ref(null)
const mostrarConfirmacion = ref(false)
const confirmacion = ref({})

// Métodos
const cerrar = () => {
  emit('cerrar')
  limpiarMensaje()
}

const mostrarMensaje = (texto, tipo = 'info') => {
  mensaje.value = { texto, tipo }
  setTimeout(() => {
    mensaje.value = null
  }, 4000)
}

const limpiarMensaje = () => {
  mensaje.value = null
}

const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleString('es-ES', { timeZone: 'UTC', hour12: true })
}

const formatearTamaño = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const cargarBackups = async () => {
  try {
    cargando.value = true
    backups.value = await props.autoSave.getBackups()
  } catch (error) {
    mostrarMensaje('Error cargando copias de seguridad', 'error')
  } finally {
    cargando.value = false
  }
}

const toggleAutoSave = () => {
  props.autoSave.toggleAutoSave(!props.autoSave.isEnabled.value)
  mostrarMensaje(
    props.autoSave.isEnabled.value ? 'Autosave activado' : 'Autosave desactivado',
    'exito'
  )
}

const realizarBackupManual = async () => {
  try {
    const success = await props.autoSave.performBackup()
    if (success) {
      mostrarMensaje('Backup manual creado exitosamente', 'exito')
      await cargarBackups()
    } else {
      mostrarMensaje('Error creando backup manual', 'error')
    }
  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error')
  }
}

const confirmarRestauracion = (backup) => {
  confirmacion.value = {
    titulo: 'Restaurar Copia de Seguridad',
    mensaje: `¿Estás seguro de que quieres restaurar la copia del ${backup.formattedDate}? Los cambios actuales se perderán.`,
    boton: 'Restaurar',
    tipo: 'danger',
    accion: () => restaurarBackup(backup.id)
  }
  mostrarConfirmacion.value = true
}

const restaurarBackup = async (backupId) => {
  try {
    await props.autoSave.restoreBackup(backupId)
    mostrarMensaje('Copia de seguridad restaurada exitosamente', 'exito')
    cerrar()
  } catch (error) {
    mostrarMensaje('Error restaurando copia: ' + error.message, 'error')
  }
}

const eliminarBackup = async (backupId) => {
  try {
    const success = await props.autoSave.deleteBackup(backupId)
    if (success) {
      mostrarMensaje('Copia eliminada', 'exito')
      await cargarBackups()
    } else {
      mostrarMensaje('Error eliminando copia', 'error')
    }
  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error')
  }
}

const confirmarLimpiezaTotal = () => {
  confirmacion.value = {
    titulo: 'Eliminar Todas las Copias',
    mensaje: '¿Estás seguro de que quieres eliminar todas las copias de seguridad? Esta acción no se puede deshacer.',
    boton: 'Eliminar Todas',
    tipo: 'danger',
    accion: limpiarTodasLasCopias
  }
  mostrarConfirmacion.value = true
}

const limpiarTodasLasCopias = async () => {
  try {
    const success = await props.autoSave.clearAllBackups()
    if (success) {
      mostrarMensaje('Todas las copias eliminadas', 'exito')
      await cargarBackups()
    } else {
      mostrarMensaje('Error eliminando copias', 'error')
    }
  } catch (error) {
    mostrarMensaje('Error: ' + error.message, 'error')
  }
}

const cancelarConfirmacion = () => {
  mostrarConfirmacion.value = false
  confirmacion.value = {}
}

const ejecutarConfirmacion = async () => {
  await confirmacion.value.accion()
  cancelarConfirmacion()
}

// Lifecycle
onMounted(() => {
  if (props.mostrar) {
    cargarBackups()
  }
})

// Watch para cargar backups cuando se abre el modal
watch(() => props.mostrar, (newValue) => {
  if (newValue) {
    cargarBackups()
  }
})
</script>
