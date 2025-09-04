/**
 * useAutoSave.js
 *
 * Composable para gestionar guardados automáticos del canvas.
 * Características:
 * - Guardado automático cada X segundos (configurable)
 * - Almacenamiento en localStorage por defecto
 * - Gestión de copias de seguridad con límite máximo
 * - Extensible para otros destinos de almacenamiento
 * - Control de habilitación/deshabilitación
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { AUTOSAVE_CONFIG } from '@/inventory-smart/utils/constants'
import { useStatePersistence } from './useStatePersistence'

export function useAutoSave(canvasStore, options = {}) {
  const { validateStructure } = useStatePersistence()
  // Configuración con valores por defecto
  const config = {
    intervalMs: options.intervalMs || AUTOSAVE_CONFIG.INTERVAL_MS,
    maxBackups: options.maxBackups || AUTOSAVE_CONFIG.MAX_BACKUPS,
    storageKey: options.storageKey || AUTOSAVE_CONFIG.STORAGE_KEY,
    enabled: options.enabled !== undefined ? options.enabled : AUTOSAVE_CONFIG.ENABLED,
    storageAdapter: options.storageAdapter || createLocalStorageAdapter(),
  }

  // Estado reactivo
  const isEnabled = ref(config.enabled)
  const lastSaveTime = ref(null)
  const totalBackups = ref(0)
  const isLoading = ref(false)

  // Timer interno
  let autoSaveTimer = null

  /**
   * Adaptador para localStorage (por defecto)
   */
  function createLocalStorageAdapter() {
    return {
      async save(key, data) {
        try {
          localStorage.setItem(key, JSON.stringify(data))
          return true
        } catch (error) {
          console.error('Error guardando en localStorage:', error)
          return false
        }
      },

      async load(key) {
        try {
          const data = localStorage.getItem(key)
          return data ? JSON.parse(data) : null
        } catch (error) {
          console.error('Error cargando desde localStorage:', error)
          return null
        }
      },

      async remove(key) {
        try {
          localStorage.removeItem(key)
          return true
        } catch (error) {
          console.error('Error eliminando de localStorage:', error)
          return false
        }
      }
    }
  }

  /**
   * Genera metadatos para la copia de seguridad
   */
  function createBackupMetadata(canvasData) {
    const parsed = typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData
    const validation = validateStructure(JSON.stringify(parsed))

    return {
      timestamp: new Date().toISOString(),
      id: `backup_${Date.now()}`,
      plantas: validation.plantas || 0,
      elementos: validation.elementos || 0,
      size: JSON.stringify(parsed).length, // tamaño en bytes
      version: validation.version || '1.0.0',
    }
  }

  /**
   * Carga la lista de copias de seguridad
   */
  async function loadBackupsList() {
    const backupsData = await config.storageAdapter.load(config.storageKey)
    return backupsData?.backups || []
  }

  /**
   * Guarda la lista de copias de seguridad
   */
  async function saveBackupsList(backups) {
    const backupsData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      backups: backups,
    }
    return await config.storageAdapter.save(config.storageKey, backupsData)
  }

  /**
   * Realiza una copia de seguridad del estado actual
   */
  async function performBackup() {
    if (!isEnabled.value || !canvasStore) {
      return false
    }

    try {
      isLoading.value = true

      // Serializar el estado actual del canvas
      const canvasData = canvasStore.serialize()
      const metadata = createBackupMetadata(canvasData)

      // Cargar lista existente de copias
      const existingBackups = await loadBackupsList()

      // Crear nueva entrada
      const newBackup = {
        ...metadata,
        data: canvasData,
      }

      // Agregar al inicio de la lista
      const updatedBackups = [newBackup, ...existingBackups]

      // Limitar número de copias según configuración
      if (updatedBackups.length > config.maxBackups) {
        updatedBackups.splice(config.maxBackups)
      }

      // Guardar lista actualizada
      const success = await saveBackupsList(updatedBackups)

      if (success) {
        lastSaveTime.value = new Date()
        totalBackups.value = updatedBackups.length
        console.log('✅ Autosave realizado:', metadata.id)
        return true
      } else {
        console.error('❌ Error guardando autosave')
        return false
      }

    } catch (error) {
      console.error('❌ Error en performBackup:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Obtiene todas las copias de seguridad disponibles
   */
  async function getBackups() {
    try {
      const backups = await loadBackupsList()
      totalBackups.value = backups.length
      return backups.map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        plantas: backup.plantas,
        elementos: backup.elementos,
        plantaActiva: backup.plantaActiva,
        size: backup.size,
        version: backup.version,
        date: new Date(backup.timestamp),
        formattedDate: new Date(backup.timestamp).toLocaleString('es-ES'),
      }))
    } catch (error) {
      console.error('Error obteniendo copias de seguridad:', error)
      return []
    }
  }

  /**
   * Restaura una copia de seguridad específica
   */
  async function restoreBackup(backupId) {
    try {
      isLoading.value = true

      const backups = await loadBackupsList()
      const backup = backups.find(b => b.id === backupId)

      if (!backup) {
        throw new Error('Copia de seguridad no encontrada')
      }

      // Deserializar y restaurar en el canvas store
      const success = canvasStore.deserialize(backup.data)

      if (success) {
        console.log('✅ Copia de seguridad restaurada:', backupId)
        return true
      } else {
        throw new Error('Error al deserializar la copia de seguridad')
      }

    } catch (error) {
      console.error('❌ Error restaurando copia de seguridad:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Elimina una copia de seguridad específica
   */
  async function deleteBackup(backupId) {
    try {
      const backups = await loadBackupsList()
      const filteredBackups = backups.filter(b => b.id !== backupId)

      const success = await saveBackupsList(filteredBackups)
      if (success) {
        totalBackups.value = filteredBackups.length
        console.log('🗑️ Copia de seguridad eliminada:', backupId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error eliminando copia de seguridad:', error)
      return false
    }
  }

  /**
   * Limpia todas las copias de seguridad
   */
  async function clearAllBackups() {
    try {
      const success = await config.storageAdapter.remove(config.storageKey)
      if (success) {
        totalBackups.value = 0
        console.log('🧹 Todas las copias de seguridad eliminadas')
        return true
      }
      return false
    } catch (error) {
      console.error('Error limpiando copias de seguridad:', error)
      return false
    }
  }

  /**
   * Inicia el temporizador de autosave
   */
  function startAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
    }

    if (isEnabled.value) {
      autoSaveTimer = setInterval(() => {
        performBackup()
      }, config.intervalMs)

      console.log(`🔄 Autosave iniciado (cada ${config.intervalMs/1000}s)`)
    }
  }

  /**
   * Detiene el temporizador de autosave
   */
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
      console.log('⏸️ Autosave detenido')
    }
  }

  /**
   * Habilita/deshabilita el autosave
   */
  function toggleAutoSave(enabled) {
    isEnabled.value = enabled
    if (enabled) {
      startAutoSave()
    } else {
      stopAutoSave()
    }
  }

  // Watcher para cambios en isEnabled
  watch(isEnabled, (newValue) => {
    if (newValue) {
      startAutoSave()
    } else {
      stopAutoSave()
    }
  })

  // Lifecycle hooks
  onMounted(async () => {
    // Cargar información inicial de backups
    const backups = await getBackups()
    totalBackups.value = backups.length

    // Iniciar autosave si está habilitado
    if (isEnabled.value) {
      startAutoSave()
    }
  })

  onUnmounted(() => {
    stopAutoSave()
  })

  // API pública
  return {
    // Estado reactivo
    isEnabled,
    lastSaveTime,
    totalBackups,
    isLoading,

    // Acciones principales
    performBackup,
    getBackups,
    restoreBackup,
    deleteBackup,
    clearAllBackups,

    // Control del autosave
    startAutoSave,
    stopAutoSave,
    toggleAutoSave,

    // Configuración
    config: {
      intervalMs: config.intervalMs,
      maxBackups: config.maxBackups,
      intervalSeconds: Math.floor(config.intervalMs / 1000),
    }
  }
}
