<!--
  ElementosTab.vue
  Tab que contiene el catálogo completo de elementos.
  Este componente encapsula todo el contenido del ElementosCatalogo original.
-->

<template>
  <div class="h-full flex flex-col">
    <div class="p-2 border-b border-slate-200">
      <select v-model="view" class="w-full border rounded-md px-2 py-1 text-sm">
        <option value="catalog">Catálogo de elementos</option>
        <option value="templates">Plantillas</option>
      </select>
    </div>
    <div class="flex-1 overflow-hidden">
      <ElementosCatalogo v-if="view === 'catalog'" />
      <TemplatesPanel v-else />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'
import TemplatesPanel from '@/inventory-smart/components/templates/TemplatesPanel.vue'

const view = ref('catalog')
</script>

<style scoped></style>
