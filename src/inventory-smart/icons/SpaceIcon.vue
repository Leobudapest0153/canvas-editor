<template>
  <svg width="55" height="39" viewBox="0 0 55 39" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_dd_space)">
      <mask id="path-1-inside-1_space" fill="white">
        <path d="M3.1001 6.8125C3.1001 4.60336 4.89096 2.8125 7.1001 2.8125H47.1001C49.3092 2.8125 51.1001 4.60336 51.1001 6.8125V30.8125C51.1001 33.0216 49.3092 34.8125 47.1001 34.8125H7.1001C4.89096 34.8125 3.1001 33.0216 3.1001 30.8125V6.8125Z"/>
      </mask>
      <path d="M3.1001 6.8125C3.1001 4.60336 4.89096 2.8125 7.1001 2.8125H47.1001C49.3092 2.8125 51.1001 4.60336 51.1001 6.8125V30.8125C51.1001 33.0216 49.3092 34.8125 47.1001 34.8125H7.1001C4.89096 34.8125 3.1001 33.0216 3.1001 30.8125V6.8125Z" :fill="backgroundColor"/>
      <path d="M7.1001 2.8125V3.8125H47.1001V2.8125V1.8125H7.1001V2.8125ZM51.1001 6.8125H50.1001V30.8125H51.1001H52.1001V6.8125H51.1001ZM47.1001 34.8125V33.8125H7.1001V34.8125V35.8125H47.1001V34.8125ZM3.1001 30.8125H4.1001V6.8125H3.1001H2.1001V30.8125H3.1001ZM7.1001 34.8125V33.8125C5.44324 33.8125 4.1001 32.4694 4.1001 30.8125H3.1001H2.1001C2.1001 33.5739 4.33867 35.8125 7.1001 35.8125V34.8125ZM51.1001 30.8125H50.1001C50.1001 32.4694 48.757 33.8125 47.1001 33.8125V34.8125V35.8125C49.8615 35.8125 52.1001 33.5739 52.1001 30.8125H51.1001ZM47.1001 2.8125V3.8125C48.757 3.8125 50.1001 5.15565 50.1001 6.8125H51.1001H52.1001C52.1001 4.05108 49.8615 1.8125 47.1001 1.8125V2.8125ZM7.1001 2.8125V1.8125C4.33867 1.8125 2.1001 4.05108 2.1001 6.8125H3.1001H4.1001C4.1001 5.15565 5.44324 3.8125 7.1001 3.8125V2.8125Z" :fill="contrastColor" fill-opacity="0.2" mask="url(#path-1-inside-1_space)"/>
      <!-- Archivero/mueble con cajones -->
      <path d="M32.3501 18.0625H21.8501M32.3501 18.0625C32.7479 18.0625 33.1295 18.2205 33.4108 18.5018C33.6921 18.7831 33.8501 19.1647 33.8501 19.5625V24.0625C33.8501 24.4603 33.6921 24.8419 33.4108 25.1232C33.1295 25.4045 32.7479 25.5625 32.3501 25.5625H21.8501C21.4523 25.5625 21.0707 25.4045 20.7894 25.1232C20.5081 24.8419 20.3501 24.4603 20.3501 24.0625V19.5625C20.3501 19.1647 20.5081 18.7831 20.7894 18.5018C21.0707 18.2205 21.4523 18.0625 21.8501 18.0625M32.3501 18.0625V16.5625C32.3501 16.1647 32.1921 15.7831 31.9108 15.5018C31.6295 15.2205 31.2479 15.0625 30.8501 15.0625M21.8501 18.0625V16.5625C21.8501 16.1647 22.0081 15.7831 22.2894 15.5018C22.5707 15.2205 22.9523 15.0625 23.3501 15.0625M30.8501 15.0625V13.5625C30.8501 13.1647 30.6921 12.7831 30.4108 12.5018C30.1295 12.2205 29.7479 12.0625 29.3501 12.0625H24.8501C24.4523 12.0625 24.0707 12.2205 23.7894 12.5018C23.5081 12.7831 23.3501 13.1647 23.3501 13.5625V15.0625M30.8501 15.0625H23.3501" :stroke="contrastColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'SpaceIcon',
  props: {
    backgroundColor: {
      type: String,
      default: '#1C1E4D'
    }
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
      contrastColor
    }
  }
}
</script>
