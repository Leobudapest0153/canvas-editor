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
  ></svg>
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
 <g>
  <path stroke="currentColor" stroke-width="3" id="svg_1" d="m9.48483,11.82093l14.72726,-10.0785l14.72726,10.0785m-3.15584,-2.23967l0,16.7975l-23.14283,0l0,-16.7975m8.41558,7.83883l6.31168,0l0,8.95867l-6.31168,0l0,-8.95867z" stroke-linejoin="round" fill="none"/>
 </g>
 `,

  room: `
 <g>
  <path stroke="currentColor" id="svg_2" stroke-width="3" d="m6.23646,19.56534l17.31742,6.72953l17.48288,-6.79201l0,-11.0787l-17.48374,-6.79201l-17.31742,6.72953l0.00086,11.20365z" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
  <line stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" id="svg_5" y2="18.86766" x2="40.31385" y1="12.79763" x1="23.68318" fill="none"/>
  <path transform="rotate(67.7965 23.7163 7.51977)" stroke="currentColor" stroke-width="3" id="svg_13" d="m19.29523,5.86539l8.84215,3.30875" opacity="undefined" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line transform="rotate(-3.23338 15.1274 16.4155)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" id="svg_15" y2="19.22587" x2="6.46643" y1="13.60507" x1="23.78828" fill="none"/>
 </g>
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
