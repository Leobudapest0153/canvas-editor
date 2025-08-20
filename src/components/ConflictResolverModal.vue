<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-header">
        <h3>Resolver Conflictos</h3>
        <button class="close" @click="close">×</button>
      </header>
      <section class="modal-body">
        <div v-if="!conflicts.length" class="empty">No hay conflictos activos.</div>
        <div v-else class="conflicts-list">
          <div v-for="c in conflicts" :key="c.aId + '::' + c.bId" class="conflict-item">
            <div class="preview">
              <div class="mini" title="Preview A/B">
                <div class="a"></div>
                <div class="b"></div>
              </div>
            </div>
            <div class="info">
              <div class="line">
                <strong>Par:</strong>
                <span>{{ getName(c.aId) }}</span>
                <span>—</span>
                <span>{{ getName(c.bId) }}</span>
              </div>
              <div class="line"><strong>Clase:</strong> {{ c.clase }}</div>
              <div class="line"><strong>XY:</strong> {{ c.xyOverlap ? 'superpuesto' : 'ok' }}</div>
              <div class="line"><strong>Z:</strong> {{ c.zOverlap ? ('conflicto (' + Math.round(c.zAmount) + 'cm)') : 'ok' }}</div>
            </div>
            <div class="actions">
              <div class="group">
                <button @click="quick('alignTopToSoil', c.aId)">A linear A a top suelo</button>
                <button @click="quick('alignTopToSoil', c.bId)">A linear B a top suelo</button>
              </div>
              <div class="group">
                <button @click="quick('raise', c.aId, 5)">Subir A +5cm</button>
                <button @click="quick('lower', c.aId, 5)">Bajar A -5cm</button>
              </div>
              <div class="group">
                <button @click="quick('thicker', c.aId, 1)">Espesar A +1cm</button>
                <button @click="quick('thinner', c.aId, 1)">Afinar A -1cm</button>
              </div>
              <div class="group alt">
                <button class="suppress" @click="suppress(c.aId, c.bId)">Ignorar par</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer class="modal-footer">
        <button class="primary" @click="confirmChanges">Confirmar cambios</button>
        <button @click="close">Cerrar</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/composables/useCanvasStore'
import { useConflicts } from '@/composables/useConflicts'

const emit = defineEmits(['confirm'])
const store = useCanvasStore()
const conflictsApi = useConflicts()

const isOpen = conflictsApi.isOpen
const conflicts = conflictsApi.conflicts

const getName = (id) => {
  const el = store.elementoPorId(id)
  return el?.nombre || el?.tipo || id
}

const close = () => conflictsApi.closeModal()

const suppress = (aId, bId) => {
  conflictsApi.suppressPair(aId, bId)
}

const quick = (action, elId, amount = 0) => {
  conflictsApi.applyQuickAdjust(elId, action, amount)
}

const confirmChanges = () => {
  // Guardar en historial como una acción confirmada desde el modal
  store.saveToHistory('Resolución de conflictos confirmada')
  emit('confirm')
  close()
}
</script>

<style scoped>
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal{width:820px;max-height:80vh;overflow:auto;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb}
.modal-body{padding:12px 16px}
.modal-footer{display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb}
.close{background:transparent;border:none;font-size:20px;cursor:pointer}
.primary{background:#3b82f6;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer}
.conflicts-list{display:flex;flex-direction:column;gap:12px}
.conflict-item{display:grid;grid-template-columns:120px 1fr 300px;gap:12px;padding:10px;border:1px solid #e5e7eb;border-radius:8px}
.preview .mini{position:relative;width:100px;height:70px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px}
.preview .mini .a{position:absolute;left:10px;top:15px;width:40px;height:30px;background:#60a5fa;opacity:.8}
.preview .mini .b{position:absolute;right:10px;bottom:12px;width:40px;height:30px;background:#f59e0b;opacity:.8}
.info .line{font-size:12px;color:#334155;margin:2px 0}
.actions .group{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.actions button{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer}
.actions button.suppress{color:#ef4444;border-color:#fecaca}
.actions .alt{margin-top:4px}
</style>
