import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingToolbar from '../components/FloatingToolbar.vue'

describe('FloatingToolbar UI (segmented control)', () => {
  const mountToolbar = (overrides: Record<string, any> = {}) =>
    mount(FloatingToolbar, {
      props: {
        activeMode: 'drag',
        isElementSelected: true,
        isElementLocked: false,
        isContainer: true,
        isSnappingEnabled: true,
        isSnapping: false,
        avoidOverlap: false,
        ...overrides,
      },
    })

  it('container has rounded-[20px] and backdrop-blur-xl', () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.classes()).toContain('rounded-[20px]')
    expect(toolbar.classes()).toContain('backdrop-blur-xl')
  })

  it('group has rounded-[14px]', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
  })

  it('slider rounded/duration and moves 0 -> calc(40px + 8px)', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const slider = wrapper.get('.seg-slider')
    expect(slider.classes()).toContain('rounded-[12px]')
    expect(slider.classes()).toContain('duration-250')
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(0\)/)
    await wrapper.setProps({ activeMode: 'edit' })
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(calc\(40px \+ 8px\)\)/)
  })

  it('active button icon has text-white', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const [dragBtn, editBtn] = group.findAll('button')
    expect(dragBtn.get('svg').classes()).toContain('text-white')
    expect(editBtn.get('svg').classes()).not.toContain('text-white')
    await wrapper.setProps({ activeMode: 'edit' })
    const [, editBtn2] = group.findAll('button')
    expect(editBtn2.get('svg').classes()).toContain('text-white')
  })
})

