import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FIELD_LABELS } from '../constants/fieldLabels'

// Utilidad simple para clonar profundo seguro
const deepClone = (obj) => JSON.parse(JSON.stringify(obj || null))

// Campos considerados para diffs de elementos y plantas
const FIELDS_PLANTA = ['nombre', 'descripcion', 'dimensiones', 'capacidadCargaSoportado']
const FIELDS_ELEMENTO = [
  'nombre', 'tipo', 'categoria', 'dimensiones',
  'alturaRespectoAlSuelo', 'orientacion', 'hijos', 'codigo', 'codigoEsl'
]

const isEmptyish = (v) => {
  if (v == null) return true // null o undefined
  if (typeof v === 'string') return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v).length === 0
  return false
}

const deepEqual = (a, b) => {
  // Normalizar valores vacíos como null para comparaciones
  const na = isEmptyish(a) ? null : a
  const nb = isEmptyish(b) ? null : b
  const isObj = (v) => v && typeof v === 'object'
  if (isObj(na) || isObj(nb)) {
    try { return JSON.stringify(na) === JSON.stringify(nb) } catch { return false }
  }
  return na === nb
}

const diffFields = (before, after, fields) => {
  const changes = []
  for (const key of fields) {
    const a = before?.[key]
    const b = after?.[key]
    // Si ambos lados son "vacíos", omitir
    if (isEmptyish(a) && isEmptyish(b)) continue
    const same = deepEqual(a, b)
    if (!same) {
      changes.push({ path: key, before: deepClone(a), after: deepClone(b) })
    }
  }
  return changes
}

export const useChangeHistoryStore = defineStore('changeHistory', () => {
  const entries = ref([]) // [{ id, timestamp, author: {id,name}, changes: [...], summary, plantaIdHint? }]
  const lastSnapshot = ref({ plantas: [], elementos: [] })
  const nextId = ref(1)

  const getSnapshotFromState = (state) => ({
    plantas: (state?.plantas || []).map((p) => ({ id: p.id, nombre: p.nombre, ...deepClone(p) })),
    elementos: (state?.elementos || []).map((e) => ({ id: e.id, nombre: e.nombre, plantaId: e.plantaId, ...deepClone(e) })),
  })

  const computeDiff = (prev, curr) => {
    const changes = []

    // Mapas por id
    const prevPlantas = new Map((prev.plantas || []).map((p) => [p.id, p]))
    const currPlantas = new Map((curr.plantas || []).map((p) => [p.id, p]))
    const prevElems = new Map((prev.elementos || []).map((e) => [e.id, e]))
    const currElems = new Map((curr.elementos || []).map((e) => [e.id, e]))

    // Plantas creadas/actualizadas/eliminadas
    for (const [id, p] of currPlantas.entries()) {
      if (!prevPlantas.has(id)) {
        changes.push({ entityType: 'planta', op: 'create', id, name: p.nombre, fields: diffFields(null, p, FIELDS_PLANTA) })
      } else {
        const before = prevPlantas.get(id)
        const fields = diffFields(before, p, FIELDS_PLANTA)
        if (fields.length) changes.push({ entityType: 'planta', op: 'update', id, name: p.nombre, fields })
      }
    }
    for (const [id, p] of prevPlantas.entries()) {
      if (!currPlantas.has(id)) {
        changes.push({ entityType: 'planta', op: 'delete', id, name: p.nombre, fields: [] })
      }
    }

    // Elementos creados/actualizados/eliminados
    for (const [id, e] of currElems.entries()) {
      if (!prevElems.has(id)) {
        changes.push({ entityType: 'elemento', op: 'create', id, code: e.codigo, name: e.nombre, plantaId: e.plantaId, fields: diffFields(null, e, FIELDS_ELEMENTO) })
      } else {
        const before = prevElems.get(id)
        const fields = diffFields(before, e, FIELDS_ELEMENTO)
        if (fields.length) changes.push({ entityType: 'elemento', op: 'update', id, code: e.codigo, name: e.nombre, plantaId: e.plantaId, fields })
      }
    }
    for (const [id, e] of prevElems.entries()) {
      if (!currElems.has(id)) {
        changes.push({ entityType: 'elemento', op: 'delete', id, code: e.codigo, name: e.nombre, plantaId: e.plantaId, fields: [] })
      }
    }

    const summary = {
      total: changes.length,
      created: changes.filter(c => c.op === 'create').length,
      updated: changes.filter(c => c.op === 'update').length,
      deleted: changes.filter(c => c.op === 'delete').length,
    }

    return { changes, summary }
  }

  const recordSave = (canvasState, author) => {
    const curr = getSnapshotFromState(canvasState)
    const prev = lastSnapshot.value?.plantas?.length || lastSnapshot.value?.elementos?.length ? lastSnapshot.value : { plantas: [], elementos: [] }
    const { changes, summary } = computeDiff(prev, curr)
    const ts = new Date().toISOString()

    if (changes.length === 0) {
      // Actualizar baseline aunque no haya cambios (primera vez)
      lastSnapshot.value = deepClone(curr)
      return null
    }

    const entry = {
      id: nextId.value++,
      timestamp: ts,
      author: author && author.id && author.name ? { id: String(author.id), name: String(author.name) } : { id: 'unknown', name: 'Desconocido' },
      summary,
      changes,
    }

    entries.value.unshift(entry) // más reciente primero
    lastSnapshot.value = deepClone(curr)
    return entry
  }

  const setEntries = (list) => {
    entries.value = Array.isArray(list) ? list : []
    // Recalcular nextId
    const maxId = entries.value.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0)
    nextId.value = maxId + 1
  }

  const setBaseline = (state) => {
    lastSnapshot.value = getSnapshotFromState(state)
  }

  const clear = () => {
    entries.value = []
    nextId.value = 1
    lastSnapshot.value = { plantas: [], elementos: [] }
  }

  // Serialización/deserialización para integrarse con canvasStore
  const serialize = () => ({ entries: deepClone(entries.value) })
  const deserialize = (data) => {
    try {
      if (data && Array.isArray(data.entries)) setEntries(data.entries)
      return true
    } catch {
      return false
    }
  }

  // Paginación simple en cliente
  const getPaginated = ({ page = 1, pageSize = 10, plantaId = null } = {}) => {
    let items = entries.value
    if (plantaId) {
      items = items.filter((e) => e.changes.some((c) => (c.entityType === 'planta' && c.id === plantaId) || (c.entityType === 'elemento' && c.plantaId === plantaId)))
    }
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const p = Math.min(Math.max(1, page), totalPages)
    const start = (p - 1) * pageSize
    const paged = items.slice(start, start + pageSize)
    return { items: paged, total, page: p, pageSize, totalPages }
  }

  return {
    entries,
    lastSnapshot,
    FIELD_LABELS,
    recordSave,
    setEntries,
    setBaseline,
    clear,
    serialize,
    deserialize,
    getPaginated,
  }
})
