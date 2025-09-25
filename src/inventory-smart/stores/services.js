import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

// Estado reactivo de la store
const state = reactive({
  services: [],
  cache: new Map(),
  loading: new Map(),
  errors: new Map(),
})

function validateServiceFunction(serviceFunction) {
  if (!serviceFunction || typeof serviceFunction !== 'object') {
    return false
  }

  const { name, type, handler } = serviceFunction

  if (!name || typeof name !== 'string') {
    console.error('La función del servicio debe tener un nombre válido (string)')
    return false
  }

  if (!['container_products', 'change_history'].includes(type)) {
    console.error(
      `El tipo de función del servicio "${type}" no está soportado. Permitidos: 'container_products', 'change_history'.`,
    )
    return false
  }

  if (!handler || typeof handler !== 'function') {
    console.error('La función del servicio debe tener un manejador válido (function)')
    return false
  }

  return true
}

function validateServiceResponse(type, response) {
  if (!response) return false
  if (type === 'container_products') {
    return Array.isArray(response.products) && typeof response.totalCount === 'number'
  }
  if (type === 'change_history') {
    const ok = Array.isArray(response.items) &&
      typeof response.total === 'number' &&
      typeof response.page === 'number' &&
      typeof response.pageSize === 'number' &&
      typeof response.totalPages === 'number'
    return ok
  }
  return true
}

function getCacheKey(serviceName, params = null) {
  const paramStr = params ? JSON.stringify(params) : ''
  return `${serviceName}:${paramStr}`
}

// TTL de cache en milisegundos (30 segundos)
const CACHE_TTL = 30 * 1000

function isCacheExpired(cacheEntry) {
  return Date.now() - cacheEntry.timestamp > CACHE_TTL
}

function setCacheEntry(key, data) {
  return {
    data,
    timestamp: Date.now(),
  }
}

function getCacheEntry(cacheMap, key) {
  const entry = cacheMap.get(key)
  if (!entry) return null

  if (isCacheExpired(entry)) {
    cacheMap.delete(key)
    return null
  }

  return entry.data
}

export const useServicesStore = defineStore('services', () => {
  const registerServices = (servicesArray) => {
    if (!Array.isArray(servicesArray)) {
      console.error('Los servicios deben proporcionarse como un array')
      return
    }

    const validServices = servicesArray.filter((service) => {
      const isValid = validateServiceFunction(service)
      if (!isValid) {
        console.error(`Función de servicio inválida:`, service)
      }
      return isValid
    })

    state.services = []
    state.cache.clear()
    state.loading.clear()
    state.errors.clear()
    state.services = validServices
  }

  const updateServices = (servicesArray) => {
    registerServices(servicesArray)
  }

  const getService = (serviceName) => {
    return state.services.find((service) => service.name === serviceName) || null
  }

  const listServices = () => {
    return state.services.map((service) => ({
      name: service.name,
      type: service.type,
      description: service.description || `Servicio de tipo ${service.type}`,
    }))
  }

  const callService = async (serviceName, params = null, options = {}) => {
    const { useCache = true, timeout = 5000 } = options

    const service = getService(serviceName)
    if (!service) {
      throw new Error(`Servicio "${serviceName}" no encontrado`)
    }

    const cacheKey = getCacheKey(serviceName, params)

    // Verificar cache con TTL
    if (useCache) {
      const cachedData = getCacheEntry(state.cache, cacheKey)
      if (cachedData !== null) {
        console.log(`Cache encontrado para el servicio "${serviceName}" (TTL: ${CACHE_TTL}ms)`)
        return cachedData
      }
    }

    state.loading.set(serviceName, true)
    state.errors.delete(serviceName)

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Service "${serviceName}" timed out`)), timeout)
      })

      const servicePromise = service.handler(params)
      const response = await Promise.race([servicePromise, timeoutPromise])

  const isValidResponse = validateServiceResponse(service.type, response)
      if (!isValidResponse) {
        throw new Error(`Invalid response from service "${serviceName}"`)
      }

      // Guardar en cache con timestamp
      if (useCache) {
        state.cache.set(cacheKey, setCacheEntry(cacheKey, response))
      }

      return response
    } catch (error) {
      console.error(`Error al llamar al servicio "${serviceName}":`, error)
      state.errors.set(serviceName, error.message)
      throw error
    } finally {
      state.loading.set(serviceName, false)
    }
  }

  const clearCache = (serviceName = null) => {
    if (serviceName) {
      const keysToDelete = []
      for (const key of state.cache.keys()) {
        if (key.startsWith(`${serviceName}:`)) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach((key) => state.cache.delete(key))
    } else {
      state.cache.clear()
    }
  }

  // Limpiar entradas expiradas del cache
  const cleanExpiredCache = () => {
    const keysToDelete = []
    for (const [key, entry] of state.cache.entries()) {
      if (isCacheExpired(entry)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => state.cache.delete(key))
    return keysToDelete.length
  }

  // Obtener información del estado del cache
  const getCacheInfo = () => {
    const entries = Array.from(state.cache.entries())
    const now = Date.now()

    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([, entry]) => !isCacheExpired(entry)).length,
      expiredEntries: entries.filter(([, entry]) => isCacheExpired(entry)).length,
      entries: entries.map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        age: now - entry.timestamp,
        expired: isCacheExpired(entry),
      })),
    }
  }

  const isServiceLoading = (serviceName) => {
    return state.loading.get(serviceName) || false
  }

  const getServiceError = (serviceName) => {
    return state.errors.get(serviceName) || null
  }

  const hasServices = computed(() => state.services.length > 0)
  const servicesCount = computed(() => state.services.length)

  // Limpieza automática del cache cada minuto
  setInterval(() => {
    cleanExpiredCache()
  }, 60 * 1000)

  return {
    services: computed(() => state.services),
    registerServices,
    updateServices,
    getService,
    listServices,
    callService,
    clearCache,
    cleanExpiredCache,
    getCacheInfo,
    isServiceLoading,
    getServiceError,
    hasServices,
    servicesCount,
    CACHE_TTL,
  }
})
