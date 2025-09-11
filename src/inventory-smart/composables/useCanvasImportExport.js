/**
 * useCanvasImportExport.js
 *
 * Composable para funcionalidades de importación y exportación del canvas.
 * Proporciona métodos para guardar y cargar el estado completo del canvas.
 */

import { useCanvasStore } from './useCanvasStore'
import { useStatePersistence } from './useStatePersistence'

export const useCanvasImportExport = () => {
  const canvasStore = useCanvasStore()
  const { validateStructure, generateValidationReport } = useStatePersistence()

  /**
   * Exporta el estado actual del canvas a un archivo JSON
   * @param {string} nombreArchivo - Nombre del archivo (opcional)
   */
  const exportarCanvas = (nombreArchivo = null) => {
    try {
      // Serializar el estado
      const jsonData = canvasStore.serialize()

      // Generar nombre de archivo si no se proporciona
      const fecha = new Date().toISOString().split('T')[0]
      const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
      const filename = nombreArchivo || `canvas-export-${fecha}-${hora}.json`

      // Crear blob y descargar
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      console.log('Canvas exportado exitosamente:', filename)
      return true
    } catch (error) {
      console.error('Error al exportar canvas:', error)
      return false
    }
  }

  /**
   * Importa el estado del canvas desde un archivo JSON
   * @param {File} archivo - Archivo JSON a importar
   * @returns {Promise<boolean>} true si la importación fue exitosa
   */
  const importarCanvas = (archivo) => {
    return new Promise((resolve, reject) => {
      if (!archivo) {
        reject(new Error('No se proporcionó archivo'))
        return
      }

      if (!archivo.name.endsWith('.json')) {
        reject(new Error('El archivo debe ser un JSON'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const jsonString = e.target.result

          // Validación mejorada con reporte detallado
          const validacion = validateStructure(jsonString, true) // Modo estricto

          if (!validacion.valid) {
            // Generar reporte detallado para mejor debugging
            const reporte = generateValidationReport(jsonString)
            console.error('📋 Reporte de validación:', reporte)

            let errorMessage = `Archivo JSON inválido: ${validacion.error}`

            if (validacion.errors?.length > 0) {
              errorMessage += `\n\nErrores encontrados:\n${validacion.errors.map(e => `• ${e}`).join('\n')}`
            }

            if (validacion.warnings?.length > 0) {
              errorMessage += `\n\nAdvertencias:\n${validacion.warnings.map(w => `• ${w}`).join('\n')}`
            }

            reject(new Error(errorMessage))
            return
          }

          // Mostrar información de validación exitosa
          if (validacion.warnings?.length > 0) {
            console.warn('⚠️ Archivo válido pero con advertencias:', validacion.warnings)
          }

          const exito = canvasStore.deserialize(jsonString)

          if (exito) {
            // Asegurar navegación correcta después de importar
            const plantaActiva = canvasStore.plantaActiva
            if (plantaActiva) {
              canvasStore.navegarAPlanta(plantaActiva)
            } else {
              // Si no hay planta activa pero hay plantas, navegar a la primera
              const plantas = canvasStore.plantas
              if (plantas && plantas.length > 0) {
                canvasStore.navegarAPlanta(plantas[0].id)
              }
            }

            console.log('Canvas importado exitosamente desde:', archivo.name)
            resolve(true)
          } else {
            reject(new Error('Error al deserializar el archivo JSON'))
          }
        } catch (error) {
          reject(new Error(`Error al leer el archivo: ${error.message}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'))
      }

      reader.readAsText(archivo)
    })
  }



  /**
   * Copia el estado serializado al portapapeles
   */
  const copiarAlPortapapeles = async () => {
    try {
      const jsonData = canvasStore.serialize()
      await navigator.clipboard.writeText(jsonData)
      console.log('Estado copiado al portapapeles')
      return true
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error)
      return false
    }
  }

  /**
   * Pega y deserializa desde el portapapeles
   */
  const pegarDesdePortapapeles = async () => {
    try {
      const jsonString = await navigator.clipboard.readText()
      const exito = canvasStore.deserialize(jsonString)

      if (exito) {
        console.log('Estado pegado desde portapapeles')
        return true
      } else {
        throw new Error('JSON inválido en el portapapeles')
      }
    } catch (error) {
      console.error('Error al pegar desde portapapeles:', error)
      return false
    }
  }

  /**
   * Valida si un JSON tiene la estructura correcta para importar
   * @param {string} jsonString - String JSON a validar
   * @returns {object} Resultado de la validación
   */
  const validarJSON = (jsonString) => {
    const result = validateStructure(jsonString)
    return {
      valido: result.valid,
      error: result.error,
      plantas: result.plantas,
      elementos: result.elementos,
      version: result.version,
      fecha: result.timestamp,
    }
  }

  return {
    // Funciones principales
    exportarCanvas,
    importarCanvas,

    // Funciones de portapapeles
    copiarAlPortapapeles,
    pegarDesdePortapapeles,

    // Utilidades
    validarJSON,

    // Utilidades avanzadas de validación
    obtenerEstadisticasArchivo: (jsonString) => {
      const reporte = generateValidationReport(jsonString)
      return {
        valido: reporte.summary.valid,
        plantas: reporte.details.plantas.count,
        elementos: reporte.details.elementos.count,
        elementosPorTipo: reporte.details.elementos.byType,
        errores: reporte.summary.criticalIssues,
        advertencias: reporte.summary.warnings,
        recomendaciones: reporte.recommendations
      }
    },

    generarReporteCompleto: generateValidationReport,
  }
}
