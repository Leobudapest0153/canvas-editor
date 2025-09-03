<!--
  ElementosTab.vue
  Tab que contiene el catálogo completo de elementos.
  Este componente encapsula todo el contenido del ElementosCatalogo original.
-->

<template>
  <div class="h-full flex flex-col">
    <!-- Contenido del catálogo -->
    <div class="flex-1 overflow-hidden">
      <ElementosCatalogo />
    </div>
  </div>
</template>

<script setup>
import ElementosCatalogo from '@/inventory-smart/components/ElementosCatalogo.vue'
</script>

<style scoped>
</style>
