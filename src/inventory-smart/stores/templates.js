import { defineStore } from 'pinia'
import { ref } from 'vue'
import IndexedDbDriver from '@/inventory-smart/services/storage/IndexedDbDriver.js'
import LocalStorageDriver from '@/inventory-smart/services/storage/LocalStorageDriver.js'

export const useTemplatesStore = defineStore('templates', () => {
  const items = ref({})
  const loaded = ref(false)
  const namespace = 'templates'

  let driver
  try {
    driver = new IndexedDbDriver(namespace)
  } catch {
    driver = new LocalStorageDriver(namespace)
  }

  const init = async () => {
    const arr = await driver.getAll()
    const map = {}
    arr.forEach((tpl) => {
      if (tpl && tpl.id) map[tpl.id] = tpl
    })
    items.value = map
    loaded.value = true
  }

  const createTemplate = async (payload) => {
    const id = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36))
    const tpl = { ...payload, id, createdAt: Date.now(), updatedAt: Date.now() }
    items.value[id] = tpl
    await driver.put(id, tpl)
    return id
  }

  const listTemplates = () => Object.values(items.value)
  const getTemplate = (id) => items.value[id]

  const deleteTemplate = async (id) => {
    delete items.value[id]
    await driver.delete(id)
  }

  const updateName = async (id, name) => {
    const tpl = items.value[id]
    if (!tpl) return
    tpl.name = name
    tpl.updatedAt = Date.now()
    await driver.put(id, tpl)
  }

  const findByNameInsensitive = (name) => {
    const lower = name.toLowerCase()
    return Object.values(items.value).find((t) => t.name?.toLowerCase() === lower)
  }

  return {
    items,
    loaded,
    init,
    createTemplate,
    listTemplates,
    getTemplate,
    deleteTemplate,
    updateName,
    findByNameInsensitive,
  }
})
