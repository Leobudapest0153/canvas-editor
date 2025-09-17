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
      <header class="modal-header">
        <h3 id="templateModalTitle" class="title">Guardar como plantilla</h3>
        <button type="button" class="close" @click="handleClose" aria-label="Cerrar">×</button>
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
        <div class="template-modal__row">
          <div class="template-modal__summary" id="templateSummary" v-if="templateSummary">
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
      <footer class="modal-footer">
        <button type="button" class="btn" @click="handleClose">Cancelar</button>
        <button type="submit" class="btn btn-primary" :disabled="!templateName.trim() || isSaving">
          Guardar
        </button>
      </footer>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useCanvasWithHistory } from '@/inventory-smart/composables/useCanvasWithHistory'
import { useCanvasBuffer } from '@/inventory-smart/composables/useCanvasBuffer'
import { useCatalogStore } from '@/inventory-smart/stores/catalog'
import { useToast } from '@/inventory-smart/composables/useToast'

const props = defineProps({
  open: { type: Boolean, default: false },
  elementId: { type: String, default: null }
})
const emit = defineEmits(['close', 'saved'])

const { store: canvasStore } = useCanvasWithHistory()
const buffer = useCanvasBuffer()
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
  const serialized = buffer.serializeElementForTemplate(id)
  if (!serialized) return
  const elementsArr = Array.from(serialized.allElements.values())
  templatePayload.value = {
    rootId: serialized.rootElement.id,
    elements: elementsArr,
  }
  templateSummary.value = {
    elementType: serialized.rootElement.tipo || '',
    width: serialized.rootElement.dimensiones?.ancho || 0,
    depth: serialized.rootElement.dimensiones?.largo || 0,
    height: serialized.rootElement.dimensiones?.alto || 0,
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
  if (catalogStore.getTemplateByName(name)) { templateError.value = 'Ya existe una plantilla con ese nombre'; return }
  isSaving.value = true
  const now = new Date().toISOString()
  const root = templatePayload.value?.elements?.find(e => e.id === templatePayload.value?.rootId) || {}
  const template = {
    id: `tpl_${Date.now().toString(36)}`,
    name,
    createdAt: now,
    updatedAt: now,
    meta: {
      elementType: templateSummary.value.elementType,
      width: templateSummary.value.width,
      height: templateSummary.value.height,
      depth: templateSummary.value.depth,
      childrenCount: templateSummary.value.childrenCount,
      weight: root.pesoMaximo,
      location: root.ubicacion,
    },
    payload: templatePayload.value,
    notes: templateNotes.value.trim() || undefined,
    tags: [],
  }
  catalogStore.addTemplate(template)
  showToast('Plantilla guardada', 'success')
  emit('saved', template)
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
