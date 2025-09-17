import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FloorForm from '../FloorForm'

describe('FloorForm', () => {
  it('deshabilita dimensiones cuando el piso es elástico', async () => {
    const wrapper = mount(FloorForm, {
      props: {
        initialValues: { width: 120, length: 140, height: 60, isElastic: false },
      },
    })

    const widthInput = wrapper.get('#floor-width')
    const lengthInput = wrapper.get('#floor-length')
    const heightInput = wrapper.get('#floor-height')

    expect(widthInput.element.hasAttribute('disabled')).toBe(false)
    expect(lengthInput.element.hasAttribute('disabled')).toBe(false)
    expect(heightInput.element.hasAttribute('disabled')).toBe(false)

    const checkbox = wrapper.get('#floor-isElastic')
    await checkbox.setValue(true)

    expect(widthInput.element.hasAttribute('disabled')).toBe(true)
    expect(lengthInput.element.hasAttribute('disabled')).toBe(true)
    expect(heightInput.element.hasAttribute('disabled')).toBe(true)
  })

  it('omite la validación de > 0 cuando el piso es elástico', async () => {
    const wrapper = mount(FloorForm, {
      props: {
        initialValues: { width: 0, length: 80, height: 70, isElastic: false },
      },
    })

    const form = wrapper.get('form')
    await form.trigger('submit.prevent')

    const widthError = wrapper.get('[data-error="width"]')
    expect(widthError.text()).toContain('Debe ser mayor a 0')
    expect(wrapper.emitted('submit')).toBeUndefined()

    const checkbox = wrapper.get('#floor-isElastic')
    await checkbox.setValue(true)

    await form.trigger('submit.prevent')

    expect(wrapper.find('[data-error="width"]').exists()).toBe(false)
    const submissions = wrapper.emitted('submit')
    expect(submissions).toBeTruthy()
    const payload = submissions?.[submissions.length - 1]?.[0] as { isElastic: boolean; width: number }
    expect(payload.isElastic).toBe(true)
    expect(payload.width).toBe(0)
  })
})
