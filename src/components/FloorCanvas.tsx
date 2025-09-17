import { computed, defineComponent, h, ref, watch } from 'vue'
import type { PropType } from 'vue'

import {
  DEFAULT_ELASTIC_AREA,
  DEFAULT_ELASTIC_PADDING,
  type FloorDimensions,
} from '../constants/floor'

export type FloorCanvasItem = {
  id: string
  x: number
  y: number
  z?: number
  width: number
  length: number
  height: number
}

type Bounds = {
  width: number
  length: number
  height: number
}

const clamp = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return value < 0 ? 0 : value
}

const toBaseBounds = (floor: FloorDimensions): Bounds => {
  const base = {
    width: clamp(floor.width ?? 0),
    length: clamp(floor.length ?? 0),
    height: clamp(floor.height ?? 0),
  }

  if (!floor.isElastic) {
    return base
  }

  return {
    width: Math.max(DEFAULT_ELASTIC_AREA.width, base.width),
    length: Math.max(DEFAULT_ELASTIC_AREA.length, base.length),
    height: Math.max(DEFAULT_ELASTIC_AREA.height, base.height),
  }
}

const expandBoundsWithItem = (bounds: Bounds, item: FloorCanvasItem): Bounds => {
  const paddingFactor = 1 + DEFAULT_ELASTIC_PADDING
  const maxX = clamp(item.x) + clamp(item.width)
  const maxY = clamp(item.y) + clamp(item.length)
  const maxZ = clamp(item.z ?? 0) + clamp(item.height)

  return {
    width: Math.max(bounds.width, Math.ceil(maxX * paddingFactor)),
    length: Math.max(bounds.length, Math.ceil(maxY * paddingFactor)),
    height: Math.max(bounds.height, Math.ceil(maxZ * paddingFactor)),
  }
}

const cloneItems = (items: FloorCanvasItem[]): FloorCanvasItem[] =>
  items.map((item) => ({ ...item }))

export default defineComponent({
  name: 'FloorCanvas',
  props: {
    floor: {
      type: Object as PropType<FloorDimensions>,
      required: true,
    },
    items: {
      type: Array as PropType<FloorCanvasItem[]>,
      default: () => [] as FloorCanvasItem[],
    },
  },
  emits: ['update:items'],
  setup(props, { emit, expose }) {
    const localItems = ref<FloorCanvasItem[]>(cloneItems(props.items))

    watch(
      () => props.items,
      (next) => {
        localItems.value = cloneItems(next)
      },
      { deep: true },
    )

    const updateItems = (updater: (items: FloorCanvasItem[]) => FloorCanvasItem[]) => {
      const draft = updater(cloneItems(localItems.value))
      localItems.value = cloneItems(draft)
      emit('update:items', cloneItems(localItems.value))
    }

    const moveItem = (id: string, partial: Partial<FloorCanvasItem>) => {
      updateItems((items) =>
        items.map((item) => (item.id === id ? { ...item, ...partial } : item)),
      )
    }

    const areaBounds = computed<Bounds>(() => {
      const base = toBaseBounds(props.floor)
      if (!props.floor.isElastic) {
        return base
      }
      return localItems.value.reduce(expandBoundsWithItem, base)
    })

    const handleDragEnd = (event: DragEvent, itemId: string) => {
      event.preventDefault()
      const nextX = clamp(event.clientX)
      const nextY = clamp(event.clientY)
      moveItem(itemId, { x: nextX, y: nextY })
    }

    const placeItem = (item: FloorCanvasItem) => {
      updateItems((items) => [...items, { ...item }])
    }

    expose({ placeItem })

    return () =>
      h(
        'div',
        {
          class: 'floor-canvas',
          'data-testid': 'floor-canvas',
          'data-area-width': String(areaBounds.value.width),
          'data-area-length': String(areaBounds.value.length),
          'data-area-height': String(areaBounds.value.height),
          style: {
            position: 'relative',
            width: `${areaBounds.value.width}px`,
            height: `${areaBounds.value.length}px`,
          },
        },
        [
          props.floor.isElastic
            ? h('div', {
                class: 'elastic-outline',
                'data-testid': 'elastic-outline',
                style: {
                  width: `${areaBounds.value.width}px`,
                  height: `${areaBounds.value.length}px`,
                },
              })
            : null,
          ...localItems.value.map((item) =>
            h('div', {
              key: item.id,
              class: 'floor-item',
              'data-testid': `floor-item-${item.id}`,
              draggable: true,
              style: {
                position: 'absolute',
                left: `${clamp(item.x)}px`,
                top: `${clamp(item.y)}px`,
                width: `${clamp(item.width)}px`,
                height: `${clamp(item.length)}px`,
              },
              onDragend: (event: DragEvent) => handleDragEnd(event, item.id),
            }),
          ),
        ],
      )
  },
})
