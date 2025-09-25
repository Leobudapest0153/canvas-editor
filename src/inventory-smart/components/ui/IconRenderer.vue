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
    required: true,
  },
  size: {
    type: String,
    default: '1.5rem',
  },
  class: {
    type: String,
    default: '',
  },
})

// Definir el contenido SVG para cada icono
const svgContents = {
  // Tipos principales
  warehouse: `
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

  room: `
    <!-- Habitación simple centrada -->
    <!-- Paredes exteriores -->
    <rect x="3" y="1.5" width="40" height="25" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Puerta -->
    <path d="M3 18 L12 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  `,

  mezzanine: `
    <!-- Estructura del mezzanine -->
    <!-- Piso inferior (base) -->
    <rect x="2" y="23" width="44" height="3" fill="currentColor" opacity="0.8" />

    <!-- Piso del mezzanine (elevado) -->
    <rect x="4" y="2" width="40" height="6" fill="currentColor" opacity="0.9" />

    <!-- Columnas de soporte -->
    <rect x="8" y="8" width="3" height="18" fill="currentColor" opacity="0.9" />
    <rect x="17" y="8" width="3" height="18" fill="currentColor" opacity="0.9" />
    <rect x="40" y="8" width="3" height="18" fill="currentColor" opacity="0.9" />

    <!-- Simular escaleras-->
    <rect x="10" y="11" width="7" height="3" fill="currentColor" opacity="0.9" />
    <rect x="10" y="17" width="7" height="3" fill="currentColor" opacity="0.9" />

    <!-- Barandilla del mezzanine -->
    <rect x="4" y="4" width="40" height="2" fill="currentColor" opacity="0.9" />

  `,

  space: `
    <!-- Archivero/mueble con cajones -->
    <g>
      <path stroke="currentColor" id="svg_1" stroke-linejoin="round" stroke-linecap="round" stroke-width="4" d="m35,14.07813l-22,0m22,0c0.8,0 1.6,0.24844 2.2,0.99375c0.6,0.74531 0.8,1.73906 0.8,2.73281l0,4.96875c0,0.99375 -0.2,1.9875 -0.8,2.73281c-0.6,0.74531 -1.4,0.99375 -2.2,0.99375l-22,0c-0.8,0 -1.6,-0.24844 -2.2,-0.99375c-0.6,-0.74531 -0.8,-1.73906 -0.8,-2.73281l0,-4.96875c0,-0.99375 0.2,-1.9875 0.8,-2.73281c0.6,-0.74531 1.4,-0.99375 2.2,-0.99375m22,0l0,-2.48437c0,-0.99375 -0.2,-1.9875 -0.8,-2.73281c-0.6,-0.74531 -1.4,-0.99375 -2.2,-0.99375m-19,6.21094l0,-2.48437c0,-0.99375 0.2,-1.9875 0.8,-2.73281c0.6,-0.74531 1.4,-0.99375 2.2,-0.99375m16,0l0,-2.48437c0,-0.99375 -0.2,-1.9875 -0.8,-2.73281c-0.6,-0.74531 -1.4,-0.99375 -2.2,-0.99375l-10,0c-0.8,0 -1.6,0.24844 -2.2,0.99375c-0.6,0.74531 -0.8,1.73906 -0.8,2.73281l0,2.48437m16,0l-16,0"/>
    </g>
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
  height: props.size,
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
