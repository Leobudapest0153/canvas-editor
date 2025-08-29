import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UiIconButton from '../components/ui/UiIconButton.vue'

describe('UiIconButton', () => {
  const mountBtn = (state = 'off') =>
    mount(UiIconButton, {
      props: { state, ariaLabel: 'Botón de prueba' },
      slots: {
        default: '<svg class="h-4 w-4 pointer-events-none" />',
      },
    })

  it('renders OFF state with expected classes and attrs', () => {
    const wrapper = mountBtn('off')
    const btn = wrapper.get('button')
    expect(btn.attributes('data-state')).toBe('off')
    expect(btn.attributes('aria-label')).toBe('Botón de prueba')
    expect(btn.classes()).toContain('h-[var(--btn-size)]')
    expect(btn.classes()).toContain('w-[var(--btn-size)]')
    expect(btn.classes()).not.toContain('!text-white')
  })

  it('renders ON state with !text-white and hover opacity class', () => {
    const wrapper = mountBtn('on')
    const btn = wrapper.get('button')
    expect(btn.attributes('data-state')).toBe('on')
    expect(btn.classes()).toContain('!text-white')
    expect(btn.attributes('class')).toMatch(/\[data-state=on\]:hover:opacity-95/)
    // slot renders and svg has pointer-events-none
    expect(wrapper.get('svg').classes()).toContain('pointer-events-none')
  })
})

