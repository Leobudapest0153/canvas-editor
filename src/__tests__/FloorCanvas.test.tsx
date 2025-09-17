import { describe, expect, it } from 'vitest'

import { DEFAULT_ELASTIC_AREA, DEFAULT_ELASTIC_PADDING } from '@/constants/floor'
import {
  FloorCanvas,
  createElasticBoundsController,
  type AreaBounds,
  type FloorShape,
  type ItemBounds,
} from '@/canvas/FloorCanvas'
import { findElement } from './mini-react-helpers'

function createFloor(overrides: Partial<FloorShape> = {}): FloorShape {
  return {
    width: 120,
    length: 120,
    height: 40,
    isElastic: true,
    ...overrides,
  }
}

function createItem(overrides: Partial<ItemBounds> = {}): ItemBounds {
  return {
    id: 'rack',
    x: 40,
    y: 40,
    width: 20,
    length: 20,
    height: 10,
    z: 0,
    ...overrides,
  }
}

describe('FloorCanvas elastic bounds', () => {
  it('initializes elastic bounds from defaults', () => {
    const floor = createFloor({ isElastic: true })
    const controller = createElasticBoundsController(floor, DEFAULT_ELASTIC_PADDING)
    const tree = FloorCanvas({ floor, items: [], controller })

    const outline = findElement(tree, (element) => element.props.className === 'elastic-outline')
    expect(outline).not.toBeNull()

    expect(outline!.props.style.width).toBe(DEFAULT_ELASTIC_AREA.width)
    expect(outline!.props.style.height).toBe(DEFAULT_ELASTIC_AREA.length)

    const canvas = findElement(tree, (element) => element.props.className === 'floor-canvas')
    expect(canvas?.props['data-width']).toBe(DEFAULT_ELASTIC_AREA.width)
    expect(canvas?.props['data-length']).toBe(DEFAULT_ELASTIC_AREA.length)
  })

  it('expands bounds with padding when an item moves close to the edge', () => {
    const floor = createFloor({ isElastic: true })
    const controller = createElasticBoundsController(floor, DEFAULT_ELASTIC_PADDING)
    const onBoundsChange: AreaBounds[] = []

    const item = createItem({ x: 80, y: 90, width: 18, length: 15, height: 12, z: 95 })
    const initialTree = FloorCanvas({ floor, items: [item], controller, onBoundsChange: (next) => onBoundsChange.push(next) })

    const draggable = findElement(initialTree, (element) => element.props.className === 'canvas-item')
    expect(draggable).not.toBeNull()

    const nextItemState: ItemBounds = { ...item, x: 120, y: 125, z: 102 }
    draggable!.props.onMove(nextItemState)

    const rerender = FloorCanvas({ floor, items: [], controller })
    const outline = findElement(rerender, (element) => element.props.className === 'elastic-outline')
    expect(outline).not.toBeNull()

    const expectedWidth = Math.max(
      DEFAULT_ELASTIC_AREA.width,
      nextItemState.x + nextItemState.width + nextItemState.width * DEFAULT_ELASTIC_PADDING,
    )
    const expectedLength = Math.max(
      DEFAULT_ELASTIC_AREA.length,
      nextItemState.y + nextItemState.length + nextItemState.length * DEFAULT_ELASTIC_PADDING,
    )
    const expectedHeight = Math.max(
      DEFAULT_ELASTIC_AREA.height,
      (nextItemState.z ?? 0) + (nextItemState.height ?? 0) + (nextItemState.height ?? 0) * DEFAULT_ELASTIC_PADDING,
    )

    expect(outline!.props.style.width).toBeCloseTo(expectedWidth)
    expect(outline!.props.style.height).toBeCloseTo(expectedLength)

    const canvas = findElement(rerender, (element) => element.props.className === 'floor-canvas')
    expect(canvas?.props['data-width']).toBeCloseTo(expectedWidth)
    expect(canvas?.props['data-length']).toBeCloseTo(expectedLength)
    expect(canvas?.props['data-height']).toBeCloseTo(expectedHeight)

    const reported = onBoundsChange.at(-1)
    expect(reported?.width).toBeCloseTo(expectedWidth)
    expect(reported?.length).toBeCloseTo(expectedLength)
    expect(reported?.height).toBeCloseTo(expectedHeight)
  })
})
