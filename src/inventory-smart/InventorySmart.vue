<template>
  <div id="inventory-smart">
    <!-- Panel de plantas -->
    <PlantasPanel @configChanged="handleConfigChanged" />

    <!-- Navegación jerárquica -->
    <NavegacionJerarquica />

    <main class="app-main relative">
      <!-- Sidebar con tabs -->
      <div class="app-sidebar-left">
        <SidebarPanel />
      </div>

      <!-- Canvas principal -->
      <div class="app-canvas">
        <CanvasView :safeRight="canvasStore.mostrarPropiedades ? 320 : 20" />
      </div>

      <!-- Panel de propiedades (superpuesto para no empujar el canvas) -->
      <div
        class="app-sidebar-right absolute inset-y-0 right-0"
        v-if="canvasStore.elementoSeleccionado"
        data-properties-panel
      >
        <PropiedadesPanel />
      </div>
    </main>
    <!-- Contenedor de toasts -->
    <ToastContainer />
    <!-- Modal de confirmación global -->
    <ConfirmModal />
    <!-- Loader global -->
    <LoaderOverlay />
    <WorkspaceEditor />

    <!-- Modal de aviso: el servidor trae cambios más recientes; se descartarán locales -->
    <ConfirmReplaceModal
      :mostrar="showReplaceNotice"
      modo="notice"
      tipo="danger"
      titulo="Configuración más reciente del servidor"
      :mensaje="replaceNoticeMessage"
      :closeOnBackdrop="true"
      @confirmar="applyPendingServerConfig"
      @cerrar="applyPendingServerConfig"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import SidebarPanel from './components/SidebarPanel.vue'
import CanvasView from './components/CanvasView.vue'
import PlantasPanel from './components/PlantasPanel.vue'
import PropiedadesPanel from './components/PropiedadesPanel.vue'
import NavegacionJerarquica from './components/NavegacionJerarquica.vue'
import WorkspaceEditor from './components/WorkspaceEditor.vue'
import { useCanvasImportExport } from './composables/useCanvasImportExport'
import { useCanvasWithHistory } from './composables/useCanvasWithHistory'
import { useCanvasBuffer } from './composables/useCanvasBuffer'
import { useDeleteElement } from './composables/useDeleteElement'
import { useAutoPaste } from './composables/useAutoPaste'
import { useToast } from './composables/useToast'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import LoaderOverlay from './components/LoaderOverlay.vue'
import { AUTOSAVE_CONFIG } from '@/inventory-smart/utils/constants'
import ConfirmReplaceModal from '@/inventory-smart/components/modals/ConfirmReplaceModal.vue'

const props = defineProps({
  configCanvas: {
    type: [String, null],
    default: () => '',
  },
})

// Definir emits para comunicar cambios al componente padre
const emit = defineEmits(['configUpdated'])

const { exportarCanvas, importarCanvas, validarJSON } = useCanvasImportExport()
const { undo, redo, store: canvasStore } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
const { deleteSelected } = useDeleteElement()
const { handlePaste } = useAutoPaste()
const { showToast } = useToast()

// Estado del modal de aviso de reemplazo por servidor
const showReplaceNotice = ref(false)
let pendingServerConfig = null
const replaceNoticeMessage = computed(() => {
  if (!pendingServerConfig) return 'Se aplicará la configuración del servidor. Se descartarán los cambios locales.'
  try {
    const d = JSON.parse(pendingServerConfig)
    const ts = d?.meta?.timestamp
    const when = ts ? new Date(ts).toLocaleString('es-ES') : 'reciente'
    return (
      `Se detectó una configuración más reciente del servidor (${when}).\n` +
      'Se aplicará esta configuración y se descartarán los cambios locales para evitar conflictos con nuevas validaciones (por ejemplo, uso de contenedores).'
    )
  } catch {
    return 'Se aplicará la configuración más reciente del servidor y se descartarán los cambios locales.'
  }
})

const applyPendingServerConfig = () => {
  if (!pendingServerConfig) {
    showReplaceNotice.value = false
    return
  }
  try {
    showToast('Aplicando configuración del servidor…', 'info')
    canvasStore.deserialize(pendingServerConfig)
  } finally {
    pendingServerConfig = null
    showReplaceNotice.value = false
  }
}

// Manejador para cuando PlantasPanel emite cambios de configuración
const handleConfigChanged = (configSerializada) => {
  try {
    // Validar que se recibió una configuración
    if (!configSerializada) {
      console.warn('No se recibió configuración para actualizar')
      return
    }

    // Emitir al componente padre la configuración actualizada
    emit('configUpdated', configSerializada)

    console.log('Configuración actualizada emitida al componente padre')
  } catch (error) {
    console.error('Error al procesar la configuración actualizada:', error)
    showToast('Error al procesar la configuración actualizada', 'error')
  }
}

// Atajos de teclado globales
const handleKeydown = (e) => {
  // Solo procesar si no estamos en un input
  if (e.target.matches('input, textarea, select, [contenteditable]')) {
    return
  }

  // Bloquear si hay texto seleccionado
  if (window.getSelection().toString()) {
    return
  }

  // Bloquear si hay drag global activo
  if (typeof window !== 'undefined' && window.__dvCanvasDragActive) {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    } else if (e.key === 'c') {
      e.preventDefault()
      handleCopyToBuffer()
    } else if (e.key === 'v') {
      e.preventDefault()
      handlePaste()
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Supr o Retroceso -> eliminar seleccionado
    const hasSelection = !!canvasStore.elementoSeleccionado
    if (hasSelection) {
      e.preventDefault()
      // No es necesario await; el modal gestiona la interacción
      deleteSelected({ withConfirm: true })
    }
  }
}

// Handlers para buffer
const handleCopyToBuffer = () => {
  const elementoSeleccionado = canvasStore.elementoSeleccionado
  if (elementoSeleccionado) {
    buffer.copyToBuffer(elementoSeleccionado)
    console.log('📋 Estructura copiada al buffer')
  }
}

// ======= Resolución de conflictos (Servidor vs Backups locales) =======
// Helper: obtener timestamp (ms) desde una configuración serializada
const getConfigTimestamp = (jsonString) => {
  try {
    const data = JSON.parse(jsonString)
    const ts = data?.meta?.timestamp
    const t = ts ? Date.parse(ts) : NaN
    return Number.isFinite(t) ? t : null
  } catch (e) {
    return null
  }
}

// Helper: carga la copia de seguridad local más reciente
const getLatestLocalBackup = () => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_CONFIG.STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const backups = Array.isArray(parsed?.backups) ? parsed.backups : []
    if (!backups.length) return null
    // Elegir por timestamp más reciente (fallback a meta interna si existe)
    const withTs = backups.map((b) => {
      let t = b?.timestamp ? Date.parse(b.timestamp) : NaN
      if (!Number.isFinite(t)) {
        try {
          const d = JSON.parse(b?.data || '{}')
          const mt = Date.parse(d?.meta?.timestamp)
          if (Number.isFinite(mt)) t = mt
        } catch (e) { /* noop */ }
      }
      return { ...b, _ts: Number.isFinite(t) ? t : 0 }
    })
    withTs.sort((a, b) => b._ts - a._ts)
    const latest = withTs[0]
    // Normalizar resultado
    return latest ? { id: latest.id, timestamp: latest.timestamp, ts: latest._ts, data: latest.data } : null
  } catch (e) {
    return null
  }
}

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-ES')
  } catch {
    return iso || ''
  }
}

onMounted(() => {
  try {
    window.addEventListener('keydown', handleKeydown)
  } catch (error) {
    window.removeEventListener('keydown', handleKeydown)
    showToast('Ha ocurrido un error al importar la configuración', 'error')
    console.error('Error al importar la configuración:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => props.configCanvas,
  (newConfig) => {
    try {
      // Si no se provee una configuracion inicial
      if (!newConfig) {
        showToast('Iniciando área de trabajo', 'info')
        const plantaInicial = canvasStore.plantas.find((p) => p.activa) || canvasStore.plantas[0]
        if (plantaInicial) {
          canvasStore.navegarAPlanta(plantaInicial.id)
        }
        return
      }

      // Validar la prop con validarJSON de useCanvasImportExport
      const isValid = validarJSON(newConfig)
      if (!isValid) {
        showToast('La configuración importada no es válida', 'error')
        return
      }

      // Comparar timestamps entre servidor y backup local más reciente
      const serverTs = getConfigTimestamp(newConfig)
      const latestBackup = getLatestLocalBackup()
      const backupTs = latestBackup?.ts ?? null

      // Decisión:
      // 1) Si hay backup y es más reciente que el servidor -> restaurar backup automáticamente
      if (latestBackup && backupTs && (!serverTs || backupTs > serverTs)) {
        const restored = canvasStore.deserialize(latestBackup.data)
        if (restored) {
          showToast(
            `Se restauró la copia de seguridad local más reciente (${fmtDate(latestBackup.timestamp)}).`,
            'info',
          )
          // Notificar al padre la nueva config aplicada (opcional pero útil para sincronía)
          emit('configUpdated', latestBackup.data)
          return
        }
        // Si falló, continuar con la del servidor
      }

      // 2) Si el servidor es más reciente que el backup local -> solo avisar y aplicar servidor
      if (serverTs && latestBackup && backupTs && serverTs > backupTs) {
        pendingServerConfig = newConfig
        showReplaceNotice.value = true
        return
      }

      // 3) Caso por defecto: aplicar servidor
      showToast('Iniciando área de trabajo', 'info' )
      canvasStore.deserialize(newConfig)
    } catch (error) {
      showToast('Ha ocurrido un error al importar la configuración', 'error')
      console.error('Error al importar la configuración:', error)
    }
  },
  { immediate: true },
)
</script>

<style>
@import 'tailwindcss';

/* Ignorar warning de unknown at rule */
@theme {
  --color-primary: #1c1e4d;
  --color-primary-100: #f0f1f5;
  --color-primary-200: #d9dbec;
  --color-primary-300: #b3b6d9;
  --color-primary-400: #8c91c6;
  --color-primary-500: #666bb3;
  --color-primary-600: #4d5190;
  --color-primary-700: #33366d;
  --color-primary-800: #1a1b4a;
  --color-primary-900: #0d0e2a;
}

:root {
  --ui-bg: rgba(255, 255, 255, 0.92);
  --ui-bg-dark: rgba(15, 17, 20, 0.92);
  --ui-border: rgba(0, 0, 0, 0.08);
  --ui-border-dark: rgba(255, 255, 255, 0.06);
  --ui-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --ui-radius: 16px;
  --btn-size: 40px;
  --gap: 8px;
  --primary: #2563eb;
  --danger: #ef4444;
  --warning: #f59e0b;
  --muted: #64748b;
}

@media (max-width: 480px) {
  :root {
    --btn-size: 36px;
  }
}

/* Dark mode overrides */
.dark {
  --ui-bg: var(--ui-bg-dark);
  --ui-border: var(--ui-border-dark);
}

/* Utility helpers */
.ui-surface {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  backdrop-filter: saturate(140%) blur(10px);
}

.dark .ui-surface {
  background: var(--ui-bg-dark);
  border: 1px solid var(--ui-border-dark);
}

/* Keep .ui-ring consistent with surface look */
.ui-ring {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  backdrop-filter: saturate(140%) blur(10px);
}

.dark .ui-ring {
  background: var(--ui-bg-dark);
  border: 1px solid var(--ui-border-dark);
}

/* ====== INVENTORY: Estilos para el conmutador de Catálogo (Elementos | Plantillas) ======
   Contexto: pestaña Elementos — controla catálogo visible.
   NOTA: no mover ni duplicar en otros archivos. Mantener aquí.
======================================================================================== */
.catalog-switch {
  display: flex;
  gap: var(--gap);
  margin-bottom: var(--gap);
}

.catalog-switch--compact {
  display: none;
}

.catalog-tab {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 9999px;
  background: var(--ui-bg);
  color: #334155;
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.catalog-tab:hover {
  background: #f1f5f9;
}

.catalog-tab.is-active {
  background: var(--color-primary);
  color: #fff;
}

.catalog-tab.kb-focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 479px) {
  .catalog-switch {
    display: none;
  }

  .catalog-switch.catalog-switch--compact {
    display: block;
  }

  .catalog-switch--compact select {
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.375rem;
  }
}

/* ====== Modal 'Guardar como plantilla' ====== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.modal {
  width: 420px;
  max-width: 92vw;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.modal-header .close {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
}
.modal-body {
  padding: 16px;
  color: #374151;
}
.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}
.btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.template-modal__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.template-modal__label {
  font-weight: 600;
  font-size: 0.95rem;
}
.template-modal__input,
.template-modal__textarea {
  width: 100%;
  border: 1px solid var(--border-color, #e3e6eb);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  font: inherit;
}
.template-modal__input:focus,
.template-modal__textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(38, 132, 255, 0.25);
}
.template-modal__summary {
  font-size: 0.9rem;
  color: var(--text-muted, #5b6473);
  background: var(--bg-muted, #f7f8fa);
  border: 1px solid var(--border-color, #e3e6eb);
  border-radius: 8px;
  padding: 10px;
}
.template-modal__error {
  color: #c62828;
  font-size: 0.85rem;
}

/* === Estilos para validaciones: arrastre desde Catálogo de Plantillas === */
/* No crear archivos nuevos; mantener consistencia con el resto del proyecto */
.template-drag--invalid {
  outline: 2px dashed red;
}
</style>

<style scoped>
#inventory-smart {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  background: #1e293b;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.header-btn:hover {
  background: rgba(59, 130, 246, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-btn .icon {
  width: 16px;
  height: 16px;
}

.import-export-btn {
  background: rgba(34, 197, 94, 0.8) !important;
}

.import-export-btn:hover {
  background: rgba(34, 197, 94, 1) !important;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
}

.header-info span {
  font-size: 0.875rem;
  opacity: 0.8;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar-left {
  width: 320px;
  min-width: 320px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.app-sidebar-right {
  width: 300px;
  min-width: 300px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
}

.app-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-canvas {
  width: 100%;
  height: 100%;
}
</style>
