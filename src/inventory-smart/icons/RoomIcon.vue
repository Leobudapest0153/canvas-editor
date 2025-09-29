<template>
  <svg width="55" height="39" viewBox="0 0 55 39" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_dd_room)">
      <mask id="path-1-inside-1_room" fill="white">
        <path
          d="M3.1001 6.8125C3.1001 4.60336 4.89096 2.8125 7.1001 2.8125H47.1001C49.3092 2.8125 51.1001 4.60336 51.1001 6.8125V30.8125C51.1001 33.0216 49.3092 34.8125 47.1001 34.8125H7.1001C4.89096 34.8125 3.1001 33.0216 3.1001 30.8125V6.8125Z"
        />
      </mask>
      <path
        d="M3.1001 6.8125C3.1001 4.60336 4.89096 2.8125 7.1001 2.8125H47.1001C49.3092 2.8125 51.1001 4.60336 51.1001 6.8125V30.8125C51.1001 33.0216 49.3092 34.8125 47.1001 34.8125H7.1001C4.89096 34.8125 3.1001 33.0216 3.1001 30.8125V6.8125Z"
        :fill="backgroundColor"
      />
      <path
        d="M7.1001 2.8125V3.8125H47.1001V2.8125V1.8125H7.1001V2.8125ZM51.1001 6.8125H50.1001V30.8125H51.1001H52.1001V6.8125H51.1001ZM47.1001 34.8125V33.8125H7.1001V34.8125V35.8125H47.1001V34.8125ZM3.1001 30.8125H4.1001V6.8125H3.1001H2.1001V30.8125H3.1001ZM7.1001 34.8125V33.8125C5.44324 33.8125 4.1001 32.4694 4.1001 30.8125H3.1001H2.1001C2.1001 33.5739 4.33867 35.8125 7.1001 35.8125V34.8125ZM51.1001 30.8125H50.1001C50.1001 32.4694 48.757 33.8125 47.1001 33.8125V34.8125V35.8125C49.8615 35.8125 52.1001 33.5739 52.1001 30.8125H51.1001ZM47.1001 2.8125V3.8125C48.757 3.8125 50.1001 5.15565 50.1001 6.8125H51.1001H52.1001C52.1001 4.05108 49.8615 1.8125 47.1001 1.8125V2.8125ZM7.1001 2.8125V1.8125C4.33867 1.8125 2.1001 4.05108 2.1001 6.8125H3.1001H4.1001C4.1001 5.15565 5.44324 3.8125 7.1001 3.8125V2.8125Z"
        :fill="contrastColor"
        fill-opacity="0.2"
        mask="url(#path-1-inside-1_room)"
      />
      <path
        :stroke="contrastColor"
        id="svg_2"
        stroke-width="1.5"
        d="m20.05561,24.56513l6.74873,3.30178l6.81321,-3.33244l0,-5.43566l-6.81354,-3.33244l-6.74873,3.30178l0.00033,5.49697z"
        stroke-linejoin="round"
        stroke-linecap="round"
        fill="none"
      />
      <line
        :stroke="contrastColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        id="svg_5"
        y2="24.04149"
        x2="32.82361"
        y1="21.76324"
        x1="27.61997"
        fill="none"
      />
      <path
        transform="rotate(67.7965 26.8241 18.8276)"
        :stroke="contrastColor"
        stroke-width="1.5"
        id="svg_13"
        d="m24.54934,17.95068l4.54961,1.75387"
        opacity="undefined"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <line
        transform="rotate(-3.23338 23.7306 22.8717)"
        :stroke="contrastColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        id="svg_15"
        y2="23.91596"
        x2="20.70961"
        y1="21.82742"
        x1="26.75163"
        fill="none"
      />
    </g>
  </svg>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'RoomIcon',
  props: {
    backgroundColor: {
      type: String,
      default: '#1C1E4D',
    },
  },
  setup(props) {
    // Función para calcular la luminancia de un color
    const getLuminance = (color) => {
      // Convertir color hex a RGB
      const hex = color.replace('#', '')
      let r, g, b

      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
      } else {
        // Fallback para colores no válidos
        return 0
      }

      // Convertir a valores 0-1 y aplicar fórmula de luminancia
      const rs = r / 255
      const gs = g / 255
      const bs = b / 255

      return 0.299 * rs + 0.587 * gs + 0.114 * bs
    }

    // Computed para determinar el color de contraste
    const contrastColor = computed(() => {
      const luminance = getLuminance(props.backgroundColor)
      // Si la luminancia es mayor a 0.6, usar color oscuro, sino blanco
      return luminance > 0.6 ? '#374151' : 'white'
    })

    return {
      contrastColor,
    }
  },
}
</script>
