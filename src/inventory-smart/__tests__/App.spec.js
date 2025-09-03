import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renderiza el título del editor', () => {
    const wrapper = shallowMount(App, {
      global: {
        stubs: {
          'v-stage': true,
          'v-layer': true,
          'v-rect': true,
          'v-circle': true,
          'v-line': true,
          'v-text': true,
        },
      },
    })
    expect(wrapper.text()).toContain('DV Canvas Editor')
  })
})
