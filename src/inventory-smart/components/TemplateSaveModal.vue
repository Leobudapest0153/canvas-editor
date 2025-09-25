<template>
  <div
    v-if="open"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="templateModalTitle"
    @click.self="handleClose"
  >
    <form class="modal" @submit.prevent="saveTemplate">
      <header class="modal-header relative flex items-center justify-center px-4 py-3">
        <h3 id="templateModalTitle" class="title text-primary text-center w-full pointer-events-none select-none">Guardar como plantilla</h3>
        <button
          type="button"
          class="close absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-xl leading-none rounded-md hover:bg-slate-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @click="handleClose"
          aria-label="Cerrar"
        >
          ×
        </button>
      </header>
      <section class="modal-body">
        <div class="template-modal__row">
          <label for="templateName" class="template-modal__label">Nombre de la plantilla</label>
          <input
            id="templateName"
            ref="templateNameInput"
            v-model="templateName"
            class="template-modal__input"
            type="text"
            maxlength="80"
            required
          />
          <p v-if="templateError" class="template-modal__error">{{ templateError }}</p>
        </div>
        <div class="template-modal__row" v-if="templateSummary">
          <h4 class="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Propiedades</h4>
          <div class="template-modal__summary" id="templateSummary">
            <div>Tipo: {{ templateSummary.elementType }}</div>
            <div>Dimensiones: {{ templateSummary.width }}×{{ templateSummary.depth }}×{{ templateSummary.height }}</div>
            <div>Hijos: {{ templateSummary.childrenCount }}</div>
          </div>
        </div>
        <div class="template-modal__row">
          <label for="templateNotes" class="template-modal__label">Descripción</label>
          <textarea
            id="templateNotes"
            v-model="templateNotes"
            class="template-modal__textarea"
            rows="3"
          ></textarea>
        </div>
      </section>
      <footer class="flex justify-center gap-3 p-4 bg-top">
        <button type="button" class="px-4 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary" @click="handleClose">Cancelar</button>
        <button type="submit" class="px-4 py-2 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 bg-primary text-white hover:bg-primary-800 focus:ring-primary-900 cursor-pointer" :disabled="!templateName.trim() || isSaving">
          Guardar
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { useToast } from '@/inventory-smart/composables/useToast'
import { buildStructureFromCanvasElement } from '@/inventory-smart/composables/useStructureManager'
import { limpiarDatosUsoEstructura } from '@/inventory-smart/composables/useSimulateProducts'

const props = defineProps({
  open: { type: Boolean, default: false },
  elementId: { type: String, default: null }
})
const emit = defineEmits(['close', 'saved'])

const { store: canvasStore } = useCanvasWithHistory()
const catalogStore = useCatalogStore()
const { showToast } = useToast()

const templateName = ref('')
const templateNotes = ref('')
const templateError = ref('')
const templateSummary = ref(null)
const templatePayload = ref(null)
const templateNameInput = ref(null)
const isSaving = ref(false)

function resetState() {
  templateName.value = ''
  templateNotes.value = ''
  templateError.value = ''
  templateSummary.value = null
  templatePayload.value = null
  isSaving.value = false
}

function initFromElement(id) {
  const el = canvasStore.elementoPorId(id)
  if (!el) return
  // Unificar serialización vía StructureManager
  const struct = buildStructureFromCanvasElement(canvasStore, id)
  if (!struct) return

  // Limpiar datos de uso antes de guardar la plantilla
  const structLimpia = limpiarDatosUsoEstructura(struct.payload)

  const elementsArr = structLimpia.elements
  templatePayload.value = {
    rootId: structLimpia.rootId,
    elements: elementsArr,
  }
  templateSummary.value = {
    elementType: elementsArr.find(e => e.id === struct.payload.rootId)?.tipo || '',
    width: elementsArr.find(e => e.id === struct.payload.rootId)?.dimensiones?.ancho || 0,
    depth: elementsArr.find(e => e.id === struct.payload.rootId)?.dimensiones?.largo || 0,
    height: elementsArr.find(e => e.id === struct.payload.rootId)?.dimensiones?.alto || 0,
    childrenCount: elementsArr.length - 1,
  }
  templateName.value = el.nombre || ''
  templateNotes.value = ''
  templateError.value = ''
  nextTick(() => templateNameInput.value?.focus?.())
}

function handleClose() { emit('close') }

function saveTemplate() {
  if (isSaving.value) return
  const name = templateName.value.trim()
  if (!name) { templateError.value = 'El nombre es obligatorio'; return }
  // Evitar duplicados SOLO en plantillas
  const existsLegacy = typeof catalogStore.getTemplateByName === 'function' && catalogStore.getTemplateByName(name)
  if (existsLegacy) { templateError.value = 'Ya existe una plantilla con ese nombre'; return }
  isSaving.value = true
  const now = new Date().toISOString()
  const root = templatePayload.value?.elements?.find(e => e.id === templatePayload.value?.rootId) || {}

  // Guardar en store.templates únicamente (regla actual)
  try {
    const legacyTemplate = {
      id: `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
      name,
      createdAt: now,
      updatedAt: now,
      meta: {
        elementType: templateSummary.value.elementType,
        width: templateSummary.value.width,
        height: templateSummary.value.height,
        depth: templateSummary.value.depth,
        childrenCount: templateSummary.value.childrenCount,
        weight: root.capacidadCarga,
        location: root.ubicacion,
      },
      payload: templatePayload.value,
      notes: templateNotes.value.trim() || undefined,
      tags: [],
    }
    if (typeof catalogStore.addTemplate === 'function') catalogStore.addTemplate(legacyTemplate)
    showToast('Plantilla guardada', 'success')
    emit('saved', legacyTemplate)
  } catch (e) {
    console.warn('Fallo guardado legacy de plantilla', e)
  }
  emit('close')
  isSaving.value = false
}

function onKey(e){ if(e.key==='Escape') handleClose() }

watch(() => props.open, (val) => {
  if (val) {
    resetState()
    if (props.elementId) initFromElement(props.elementId)
    window.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('keydown', onKey)
  }
})

watch(() => props.elementId, (id) => { if (props.open && id) initFromElement(id) })
</script>
