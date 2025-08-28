<!--
  SnapGuides.vue
  Componente para renderizar líneas guía de object snapping
  Optimizado para Konva y rendimiento
-->

<template>
  <v-group :config="{ listening: false }">
    <!-- Líneas guía verticales - Capa base (sombra) -->
    <v-line
      v-for="guide in verticalGuides"
      :key="`v-base-${guide.x}-${guide.y1}-${guide.y2}`"
      :config="{
        points: [guide.x, guide.y1, guide.x, guide.y2],
        stroke: '#000000',
        strokeWidth: guideStrokeWidth / zoom,
        opacity: 0.6,
        listening: false,
      }"
    />
    
    <!-- Líneas guía verticales - Capa principal -->
    <v-line
      v-for="guide in verticalGuides"
      :key="`v-main-${guide.x}-${guide.y1}-${guide.y2}`"
      :config="{
        points: [guide.x, guide.y1, guide.x, guide.y2],
        stroke: guideColor,
        strokeWidth: guideStrokeWidth / zoom,
        opacity: guideOpacity,
        listening: false,
        dash: guideDashPattern,
      }"
    />
    
    <!-- Líneas guía horizontales - Capa base (sombra) -->
    <v-line
      v-for="guide in horizontalGuides"
      :key="`h-base-${guide.y}-${guide.x1}-${guide.x2}`"
      :config="{
        points: [guide.x1, guide.y, guide.x2, guide.y],
        stroke: '#000000',
        strokeWidth: guideStrokeWidth / zoom,
        opacity: 0.6,
        listening: false,
      }"
    />
    
    <!-- Líneas guía horizontales - Capa principal -->
    <v-line
      v-for="guide in horizontalGuides"
      :key="`h-main-${guide.y}-${guide.x1}-${guide.x2}`"
      :config="{
        points: [guide.x1, guide.y, guide.x2, guide.y],
        stroke: guideColor,
        strokeWidth: guideStrokeWidth / zoom,
        opacity: guideOpacity,
        listening: false,
        dash: guideDashPattern,
      }"
    />
    
    <!-- Puntos de intersección (opcional) -->
    <template v-if="showIntersections">
      <v-circle
        v-for="intersection in intersections"
        :key="`intersection-${intersection.x}-${intersection.y}`"
        :config="{
          x: intersection.x,
          y: intersection.y,
          radius: intersectionRadius / zoom,
          fill: intersectionColor,
          stroke: intersectionStrokeColor,
          strokeWidth: intersectionStrokeWidth / zoom,
          opacity: intersectionOpacity,
          listening: false,
        }"
      />
    </template>
  </v-group>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  guides: {
    type: Array,
    default: () => []
  },
  
  // Configuración visual de las guías
  guideColor: {
    type: String,
    default: '#00ff88' // Verde neón más visible
  },
  guideStrokeWidth: {
    type: Number,
    default: 3 // Líneas más gruesas para mejor visibilidad
  },
  guideOpacity: {
    type: Number,
    default: 1.0 // Opacidad completa
  },
  guideDashPattern: {
    type: Array,
    default: () => [] // Sin patrón dash - líneas sólidas
  },
  
  // Sombra de las guías
  guideShadowColor: {
    type: String,
    default: 'rgba(0, 0, 0, 0.8)' // Sombra más oscura
  },
  guideShadowBlur: {
    type: Number,
    default: 4 // Mayor blur para más contraste
  },
  guideShadowOpacity: {
    type: Number,
    default: 0.8 // Mayor opacidad de sombra
  },
  
  // Puntos de intersección
  showIntersections: {
    type: Boolean,
    default: true
  },
  intersectionRadius: {
    type: Number,
    default: 5 // Círculos más grandes
  },
  intersectionColor: {
    type: String,
    default: '#00ff88' // Mismo color que las guías
  },
  intersectionStrokeColor: {
    type: String,
    default: '#000000' // Borde negro para contraste
  },
  intersectionStrokeWidth: {
    type: Number,
    default: 2 // Borde más grueso
  },
  intersectionOpacity: {
    type: Number,
    default: 1.0 // Opacidad completa
  },
  zoom: {
    type: Number,
    default: 1.0 // Zoom por defecto
  }
})

// Separar guías por tipo
const verticalGuides = computed(() => {
  return props.guides.filter(guide => guide.type === 'vertical')
})

const horizontalGuides = computed(() => {
  return props.guides.filter(guide => guide.type === 'horizontal')
})

// Calcular intersecciones entre guías
const intersections = computed(() => {
  const intersections = []
  
  for (const vGuide of verticalGuides.value) {
    for (const hGuide of horizontalGuides.value) {
      // Verificar si las líneas se intersectan
      const vInRange = hGuide.y >= vGuide.y1 && hGuide.y <= vGuide.y2
      const hInRange = vGuide.x >= hGuide.x1 && vGuide.x <= hGuide.x2
      
      if (vInRange && hInRange) {
        intersections.push({
          x: vGuide.x,
          y: hGuide.y,
          vGuide,
          hGuide
        })
      }
    }
  }
  
  return intersections
})
</script>

<style scoped>
/* Este componente no necesita estilos CSS ya que usa Konva */
</style>
