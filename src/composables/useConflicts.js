/**
 * useConflicts.js
 *
 * Estado mínimo para pintar conflictos en UI (sin modal ni supresiones).
 */

import { ref, computed } from 'vue'

const conflictsState = ref({
  list: [], // { aId, bId, clase, xyOverlap, zOverlap, permitido, bloqueante, warning }
  lastMovingId: null,
})

export function useConflicts() {
  const conflicts = computed(() => conflictsState.value.list)
  const hasConflicts = computed(() => conflictsState.value.list.length > 0)

  const conflictsById = computed(() => {
    const map = new Map()
    for (const c of conflictsState.value.list) {
      if (!map.has(c.aId)) map.set(c.aId, [])
      if (!map.has(c.bId)) map.set(c.bId, [])
      map.get(c.aId).push(c)
      map.get(c.bId).push(c)
    }
    return map
  })

  const setConflicts = (list, movingId = null) => {
    conflictsState.value.list = Array.isArray(list) ? list : []
    conflictsState.value.lastMovingId = movingId || null
  }

  const clear = () => {
    conflictsState.value.list = []
    conflictsState.value.lastMovingId = null
  }

  return {
    conflicts,
    hasConflicts,
    conflictsById,
    lastMovingId: computed(() => conflictsState.value.lastMovingId),
    setConflicts,
    clear,
  }
}
