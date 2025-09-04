import LocalStorageDriver from './LocalStorageDriver.js'

export default class IndexedDbDriver {
  constructor(namespace = 'templates') {
    this.ns = namespace
    this.available = typeof indexedDB !== 'undefined'
    if (!this.available) {
      this.fallback = new LocalStorageDriver(namespace)
    }
  }
  async getAll() {
    if (!this.available) return this.fallback.getAll()
    // Simplified: use fallback as implementation
    return this.fallback.getAll()
  }
  async put(id, data) {
    if (!this.available) return this.fallback.put(id, data)
    return this.fallback.put(id, data)
  }
  async get(id) {
    if (!this.available) return this.fallback.get(id)
    return this.fallback.get(id)
  }
  async delete(id) {
    if (!this.available) return this.fallback.delete(id)
    return this.fallback.delete(id)
  }
}
