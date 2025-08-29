import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingToolbar from '../components/FloatingToolbar.vue'

describe('FloatingToolbar UI (refactor visuals)', () => {
  const mountToolbar = (overrides = {}) =>
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

  it('switch group is rounded-[14px]', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
  })

  it('slider rounded-[12px], duration-250 ease-out and translates 0px -> 40px', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const slider = group.get('div[aria-hidden="true"]')
    expect(slider.classes()).toContain('rounded-[12px]')
    expect(slider.classes()).toContain('duration-250')
    expect(slider.classes()).toContain('ease-out')
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(0\)/)
    await wrapper.setProps({ activeMode: 'edit' })
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(40px\)/)
  })

  it('active icon uses text-white via button state', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const [dragBtn, editBtn] = group.findAll('button')
    expect(dragBtn.classes()).toContain('!text-white')
    expect(editBtn.classes()).not.toContain('!text-white')
    await wrapper.setProps({ activeMode: 'edit' })
    expect(group.findAll('button')[1].classes()).toContain('!text-white')
  })
})

