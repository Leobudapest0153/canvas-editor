import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementosTab from '@/inventory-smart/components/tabs/ElementosTab.vue'

describe('ElementosTab', () => {
  it('switches between catalog and templates', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(ElementosTab, {
      global: {
        plugins: [pinia],
        stubs: { ElementosCatalogo: true, TemplatesPanel: true },
      },
    })
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    await select.setValue('templates')
    expect(wrapper.vm.view).toBe('templates')
  })
})
