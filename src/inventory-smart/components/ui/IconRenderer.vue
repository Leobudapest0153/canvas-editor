<!--
  IconRenderer.vue

  Componente para renderizar SVG dinámicamente basado en el nombre del icono.
  Reemplaza los emojis por SVG puros.
-->

<template>
  <svg
    v-if="svgContent"
    :class="iconClass"
    :style="iconStyle"
    viewBox="0 0 48 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    v-html="svgContent"
  />
  <span v-else class="fallback-icon">{{ fallbackIcon }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: '1.5rem'
  },
  class: {
    type: String,
    default: ''
  }
})

// Definir el contenido SVG para cada icono
const svgContents = {
  // Tipos principales
  'warehouse': `
    <!-- Estructura del almacén -->
    <!-- Paredes exteriores -->
    <rect x="1" y="2" width="46" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Estanterías verticales (racks) -->
    <!-- Rack izquierdo -->
    <rect x="4" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>
    <rect x="7" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>
    <rect x="10" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>

    <!-- Rack derecho -->
    <rect x="35" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>
    <rect x="38" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>
    <rect x="41" y="4" width="3" height="20" fill="currentColor" opacity="0.6"/>

    <!-- Estantes horizontales -->
    <!-- Estantes rack izquierdo -->
    <line x1="4" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="4" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="4" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="4" y1="20" x2="13" y2="20" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>

    <!-- Estantes rack derecho -->
    <line x1="35" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="35" y1="12" x2="44" y2="12" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="35" y1="16" x2="44" y2="16" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    <line x1="35" y1="20" x2="44" y2="20" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>

    <!-- Pasillo central -->
    <rect x="18" y="4" width="12" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>

    <!-- Puerta de entrada -->
    <path d="M1 14 L7 14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>

    <!-- Puerta de salida -->
    <path d="M41 14 L47 14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  `,

  'room': `
    <!-- Habitación simple centrada -->
    <!-- Paredes exteriores -->
    <rect x="8" y="4" width="32" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Puerta -->
    <path d="M8 18 L14 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <!-- Ventana -->
    <rect x="20" y="6" width="8" height="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
  `,

  'mezzanine': `
    <!-- Estructura del mezzanine -->
    <!-- Piso inferior (base) -->
    <rect x="2" y="20" width="44" height="6" fill="currentColor" opacity="0.3"/>

    <!-- Piso del mezzanine (elevado) -->
    <rect x="4" y="6" width="40" height="6" fill="currentColor" opacity="0.6"/>

    <!-- Columnas de soporte -->
    <rect x="6" y="6" width="3" height="14" fill="currentColor" opacity="0.4"/>
    <rect x="16" y="6" width="3" height="14" fill="currentColor" opacity="0.4"/>
    <rect x="26" y="6" width="3" height="14" fill="currentColor" opacity="0.4"/>
    <rect x="36" y="6" width="3" height="14" fill="currentColor" opacity="0.4"/>

    <!-- Barandilla del mezzanine -->
    <rect x="4" y="4" width="40" height="2" fill="currentColor" opacity="0.8"/>
    <line x1="4" y1="4" x2="4" y2="6" stroke="currentColor" stroke-width="1"/>
    <line x1="44" y1="4" x2="44" y2="6" stroke="currentColor" stroke-width="1"/>
  `,

  'space': `
    <!-- Archivero/mueble con cajones -->
    <path d="M35 14H13M35 14C35.8 14 36.6 14.2 37.2 14.8C37.8 15.4 38 16.2 38 17V21C38 21.8 37.8 22.6 37.2 23.2C36.6 23.8 35.8 24 35 24H13C12.2 24 11.4 23.8 10.8 23.2C10.2 22.6 10 21.8 10 21V17C10 16.2 10.2 15.4 10.8 14.8C11.4 14.2 12.2 14 13 14M35 14V12C35 11.2 34.8 10.4 34.2 9.8C33.6 9.2 32.8 9 32 9M13 14V12C13 11.2 13.2 10.4 13.8 9.8C14.4 9.2 15.2 9 16 9M32 9V7C32 6.2 31.8 5.4 31.2 4.8C30.6 4.2 29.8 4 29 4H19C18.2 4 17.4 4.2 16.8 4.8C16.2 5.4 16 6.2 16 7V9M32 9H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `,

  'space-on-wall': `
    <!-- Estante montado en pared centrado -->
    <rect x="12" y="6" width="24" height="3" rx="1.5" fill="currentColor"/>
    <rect x="16" y="10" width="16" height="2" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="12" y="14" width="24" height="3" rx="1.5" fill="currentColor"/>
    <rect x="16" y="18" width="16" height="2" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="12" y="22" width="24" height="3" rx="1.5" fill="currentColor"/>
    <rect x="16" y="26" width="16" height="2" rx="1" fill="currentColor" opacity="0.7"/>
  `,
}

// Computed para obtener el contenido SVG
const svgContent = computed(() => {
  const icon = props.icon
  const content = svgContents[icon]

  // Si es un emoji, buscar su equivalente SVG
  if (!content && svgContents[icon]) {
    const mappedIcon = svgContents[icon]
    return svgContents[mappedIcon] || null
  }

  return content || null
})

// Computed para el icono de fallback (emoji original)
const fallbackIcon = computed(() => {
  return props.icon
})

// Computed para las clases del icono
const iconClass = computed(() => {
  return `icon-svg ${props.class}`.trim()
})

// Computed para los estilos del icono
const iconStyle = computed(() => ({
  width: props.size,
  height: props.size
}))
</script>

<style scoped>
.icon-svg {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.fallback-icon {
  display: inline-block;
  vertical-align: middle;
  font-size: inherit;
  line-height: 1;
}
</style>
