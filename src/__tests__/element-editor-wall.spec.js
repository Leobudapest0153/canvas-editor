/* eslint-env vitest, jsdom */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ElementEditor from '@/components/modals/ElementEditor.vue'

vi.mock('@/composables/useCanvasStore', () => ({
  useCanvasStore: () => ({
    plantaActivaData: ref({ dimensiones: { alto: 300 } }),
  }),
}))

describe('ElementEditor wall validation', () => {
  const baseProps = {
    visible: true,
    categorias: [{ id: 'cat', nombre: 'Cat' }],
    formas: [{ id: 'rectangular', nombre: 'Rect' }],
    ubicaciones: [
      { id: 'Suelo', nombre: 'Suelo' },
      { id: 'Pared', nombre: 'Pared' },
    ],
  }

  const fillRequired = (wrapper) => {
    wrapper.vm.localElemento.nombre = 'Elem'
    wrapper.vm.localElemento.categoria = 'cat'
    wrapper.vm.localElemento.forma = 'rectangular'
    wrapper.vm.localElemento.pesoMaximo = 10
    wrapper.vm.localElemento.dimensiones.ancho = 50
    wrapper.vm.localElemento.dimensiones.largo = 50
  }

  it('muestra error si zBase es inválido', async () => {
    const wrapper = mount(ElementEditor, { props: baseProps })
    fillRequired(wrapper)
    wrapper.vm.localElemento.ubicacion = 'Pared'
    wrapper.vm.localElemento.dimensiones.alto = 100
    wrapper.vm.localElemento.alturaRespectoAlSuelo = 0
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('muestra error si zBase + alto excede alturaBodega', async () => {
    const wrapper = mount(ElementEditor, { props: baseProps })
    fillRequired(wrapper)
    wrapper.vm.localElemento.ubicacion = 'Pared'
    wrapper.vm.localElemento.dimensiones.alto = 200
    wrapper.vm.localElemento.alturaRespectoAlSuelo = 150
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('emite save cuando zBase + alto es igual a alturaBodega', async () => {
    const wrapper = mount(ElementEditor, { props: baseProps })
    fillRequired(wrapper)
    wrapper.vm.localElemento.ubicacion = 'Pared'
    wrapper.vm.localElemento.dimensiones.alto = 100
    wrapper.vm.localElemento.alturaRespectoAlSuelo = 200
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
