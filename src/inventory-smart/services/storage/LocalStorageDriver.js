export default class LocalStorageDriver {
  constructor(namespace = 'templates') {
    this.ns = namespace
  }
  _key(id) {
    return `${this.ns}:${id}`
  }
  async getAll() {
    const res = []
    for (let i = 0; i < (typeof localStorage !== 'undefined' ? localStorage.length : 0); i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.ns + ':')) {
        try {
          res.push(JSON.parse(localStorage.getItem(key)))
        } catch {
          /* ignore */
        }
      }
    }
    return res
  }
  async put(id, data) {
    localStorage.setItem(this._key(id), JSON.stringify(data))
  }
  async get(id) {
    const raw = localStorage.getItem(this._key(id))
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  async delete(id) {
    localStorage.removeItem(this._key(id))
  }
}
