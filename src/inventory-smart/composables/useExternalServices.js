import { useServicesStore } from '../stores/services.js'

export function useExternalServices() {

  const servicesStore = useServicesStore()

  const api = {
    callService: servicesStore.callService,
    listServices: servicesStore.listServices,
    hasServices: servicesStore.hasServices,
    clearCache: servicesStore.clearCache,
    cleanExpiredCache: servicesStore.cleanExpiredCache,
    getCacheInfo: servicesStore.getCacheInfo,
    isServiceLoading: servicesStore.isServiceLoading,
    getServiceError: servicesStore.getServiceError,
    CACHE_TTL: servicesStore.CACHE_TTL
  }

  const callService = async (serviceName, params = null, options = {}) => {
    return await api.callService(serviceName, params, options)
  }

  const getAvailableServices = () => {
    return api.listServices()
  }

  const hasExternalServices = () => {
    return api.hasServices.value || api.hasServices
  }

  const clearServicesCache = (serviceName = null) => {
    api.clearCache(serviceName)
  }

  const cleanExpiredCache = () => {
    return api.cleanExpiredCache?.() || 0
  }

  const getCacheInfo = () => {
    return api.getCacheInfo?.() || { totalEntries: 0, validEntries: 0, expiredEntries: 0, entries: [] }
  }

  const getCacheTTL = () => {
    return api.CACHE_TTL || 30000
  }

  const isLoading = (serviceName) => {
    return api.isServiceLoading(serviceName)
  }

  const getError = (serviceName) => {
    return api.getServiceError(serviceName)
  }

  /**
   * Obtiene productos de un contenedor
   * @param {string} containerId - ID/código del contenedor
   * @param {string} filter - Filtro de texto opcional
   * @param {Object} pagination - Datos de paginación opcionales
   * @returns {Promise<Object>} - Productos del contenedor
   */
  const getContainerProducts = async (containerId, filter = '', pagination = {}) => {
    const services = getAvailableServices()
    const containerService = services.find(s => s.type === 'container_products')

    if (!containerService) {
      throw new Error('No container_products service available')
    }

    const params = {
      containerId,
      filter,
      pagination
    }

    return await callService(containerService.name, params)
  }

  return {
    callService,
    getAvailableServices,
    hasExternalServices,
    clearServicesCache,
    cleanExpiredCache,
    getCacheInfo,
    getCacheTTL,
    isLoading,
    getError,
    getContainerProducts
  }
}
