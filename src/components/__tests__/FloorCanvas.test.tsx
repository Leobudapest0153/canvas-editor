import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import FloorCanvas, { type FloorCanvasItem } from '../FloorCanvas'
import { DEFAULT_ELASTIC_AREA, DEFAULT_ELASTIC_PADDING } from '../../constants/floor'

describe('FloorCanvas', () => {
  it('usa el área elástica por defecto al iniciar', async () => {
    const wrapper = mount(FloorCanvas, {
      props: {
        floor: { width: 20, length: 25, height: 30, isElastic: true },
        items: [],
      },
    })

    await nextTick()

    const canvas = wrapper.get('[data-testid="floor-canvas"]')
    expect(canvas.attributes('data-area-width')).toBe(String(DEFAULT_ELASTIC_AREA.width))
    expect(canvas.attributes('data-area-length')).toBe(String(DEFAULT_ELASTIC_AREA.length))
    expect(canvas.attributes('data-area-height')).toBe(String(DEFAULT_ELASTIC_AREA.height))
    expect(wrapper.find('[data-testid="elastic-outline"]').exists()).toBe(true)
  })

  it('expande los límites al arrastrar elementos más allá del área actual', async () => {
    const initialItem: FloorCanvasItem = {
      id: 'rack',
      x: 10,
      y: 15,
      width: 40,
      length: 35,
      height: 25,
    }

    const wrapper = mount(FloorCanvas, {
      props: {
        floor: { width: 80, length: 80, height: 60, isElastic: true },
        items: [initialItem],
      },
    })

    const node = wrapper.get('[data-testid="floor-item-rack"]')
    await node.trigger('dragend', { clientX: 220, clientY: 190 })
    await nextTick()

    const expectedWidth = Math.ceil((220 + initialItem.width) * (1 + DEFAULT_ELASTIC_PADDING))
    const expectedLength = Math.ceil((190 + initialItem.length) * (1 + DEFAULT_ELASTIC_PADDING))

    const canvas = wrapper.get('[data-testid="floor-canvas"]')
    expect(Number(canvas.attributes('data-area-width'))).toBe(expectedWidth)
    expect(Number(canvas.attributes('data-area-length'))).toBe(expectedLength)
  })

  it('amplía el área cuando se coloca un nuevo elemento', async () => {
    const wrapper = mount(FloorCanvas, {
      props: {
        floor: { width: 50, length: 50, height: 40, isElastic: true },
        items: [],
      },
    })

    const api = wrapper.vm as unknown as { placeItem: (item: FloorCanvasItem) => void }
    api.placeItem({ id: 'new', x: 260, y: 40, width: 60, length: 45, height: 30 })

    await nextTick()

    const expectedWidth = Math.ceil((260 + 60) * (1 + DEFAULT_ELASTIC_PADDING))
    const expectedLength = Math.ceil((40 + 45) * (1 + DEFAULT_ELASTIC_PADDING))

    const canvas = wrapper.get('[data-testid="floor-canvas"]')
    expect(Number(canvas.attributes('data-area-width'))).toBe(expectedWidth)
    expect(Number(canvas.attributes('data-area-length'))).toBe(expectedLength)
  })
})
