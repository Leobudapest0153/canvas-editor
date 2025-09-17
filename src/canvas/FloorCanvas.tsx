import type { MiniReactElement } from '@/lib/mini-react/jsx-runtime'
import { DEFAULT_ELASTIC_AREA, DEFAULT_ELASTIC_PADDING } from '@/constants/floor'

export interface FloorShape {
  width: number
  length: number
  height: number
  isElastic: boolean
}

export interface ItemBounds {
  id: string
  x: number
  y: number
  width: number
  length: number
  height?: number
  z?: number
}

export interface AreaBounds {
  width: number
  length: number
  height: number
}

export interface ElasticBoundsController {
  readonly bounds: AreaBounds
  include: (rect: ItemBounds) => AreaBounds
  reset: (floor: FloorShape) => AreaBounds
}

export interface FloorCanvasProps {
  floor: FloorShape
  items: ItemBounds[]
  padding?: number
  onBoundsChange?: (bounds: AreaBounds) => void
  controller?: ElasticBoundsController
}

function cloneBounds(bounds: AreaBounds): AreaBounds {
  return {
    width: bounds.width,
    length: bounds.length,
    height: bounds.height,
  }
}

function baseBoundsFromFloor(floor: FloorShape): AreaBounds {
  if (floor.isElastic) {
    return cloneBounds(DEFAULT_ELASTIC_AREA)
  }
  return {
    width: Math.max(0, floor.width),
    length: Math.max(0, floor.length),
    height: Math.max(0, floor.height),
  }
}

function expandBoundsWithPadding(current: AreaBounds, rect: ItemBounds, padding: number): AreaBounds {
  const padX = rect.width * padding
  const padY = rect.length * padding
  const padZ = (rect.height ?? 0) * padding

  const nextWidth = Math.max(current.width, rect.x + rect.width + padX)
  const nextLength = Math.max(current.length, rect.y + rect.length + padY)
  const referenceHeight = rect.height ?? current.height
  const nextHeight = Math.max(current.height, (rect.z ?? 0) + referenceHeight + padZ)

  if (nextWidth === current.width && nextLength === current.length && nextHeight === current.height) {
    return current
  }

  return {
    width: nextWidth,
    length: nextLength,
    height: nextHeight,
  }
}

export function createElasticBoundsController(
  floor: FloorShape,
  padding: number = DEFAULT_ELASTIC_PADDING,
): ElasticBoundsController {
  let currentFloor: FloorShape = { ...floor }
  let internalBounds: AreaBounds = baseBoundsFromFloor(currentFloor)

  const ensureElasticBounds = (rect: ItemBounds): AreaBounds => {
    if (!currentFloor.isElastic) {
      return cloneBounds(internalBounds)
    }
    const expanded = expandBoundsWithPadding(internalBounds, rect, padding)
    if (expanded !== internalBounds) {
      internalBounds = expanded
    }
    return cloneBounds(internalBounds)
  }

  return {
    get bounds() {
      return cloneBounds(internalBounds)
    },
    include(rect: ItemBounds) {
      return ensureElasticBounds(rect)
    },
    reset(nextFloor: FloorShape) {
      currentFloor = { ...nextFloor }
      internalBounds = baseBoundsFromFloor(currentFloor)
      return cloneBounds(internalBounds)
    },
  }
}

export function FloorCanvas({
  floor,
  items,
  padding = DEFAULT_ELASTIC_PADDING,
  onBoundsChange,
  controller,
}: FloorCanvasProps): MiniReactElement {
  const boundsController = controller ?? createElasticBoundsController(floor, padding)
  if (!controller) {
    boundsController.reset(floor)
  }
  const snapshot = boundsController.bounds

  const outline = floor.isElastic ? (
    <div
      className="elastic-outline"
      data-role="elastic-outline"
      style={{ width: snapshot.width, height: snapshot.length }}
    />
  ) : null

  const itemNodes = items.map((item) => (
    <div
      key={item.id}
      className="canvas-item"
      data-id={item.id}
      data-x={item.x}
      data-y={item.y}
      data-width={item.width}
      data-length={item.length}
      data-height={item.height ?? ''}
      onMove={(nextBounds: ItemBounds) => {
        const updated = boundsController.include(nextBounds)
        if (floor.isElastic) {
          onBoundsChange?.(updated)
        }
      }}
    />
  ))

  return (
    <div
      className="floor-canvas"
      data-width={snapshot.width}
      data-length={snapshot.length}
      data-height={snapshot.height}
    >
      {outline}
      {itemNodes}
    </div>
  )
}
