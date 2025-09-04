import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTemplatesStore } from '@/inventory-smart/stores/templates.js'

describe('templatesStore', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
  })

  it('create/list/delete/updateName', async () => {
    const store = useTemplatesStore()
    await store.init()
    const id = await store.createTemplate({ name: 'A' })
    expect(store.listTemplates().length).toBe(1)
    await store.updateName(id, 'B')
    expect(store.getTemplate(id).name).toBe('B')
    await store.deleteTemplate(id)
    expect(store.listTemplates().length).toBe(0)
  })

  it('unicidad por nombre', async () => {
    const store = useTemplatesStore()
    await store.init()
    await store.createTemplate({ name: 'Test' })
    const found = store.findByNameInsensitive('test')
    expect(found.name).toBe('Test')
  })
})
