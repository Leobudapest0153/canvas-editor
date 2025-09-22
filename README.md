# Inventory Smart (Vue 3)

Editor visual jerárquico para planificar la distribución de elementos (anaqueles, estantes, contenedores, etc.) en plantas y cuartos, con soporte de colisiones, snapping, historial y vistas sobre un lienzo 2D basado en Konva.

El núcleo del editor vive en `src/inventory-smart` como un módulo de componentes, composables y utilidades reutilizables.

## Requisitos

- Node.js 20.19+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción y previsualización

```bash
npm run build
npm run preview
```

## Uso rápido en tu app

El componente principal es `InventorySmart.vue`. Puedes montarlo en una página e interactuar con la configuración serializada a través de la prop `configCanvas` y el evento `configUpdated`.

1) Registra plugins en `main.js` (Pinia, Router, vue-konva y el plugin de toasts ya incluido):

```js
// src/main.js
import './styles/index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import VueKonva from 'vue-konva'
import ToastPlugin from '@/inventory-smart/plugins/toast'

createApp(App)
	.use(createPinia())
	.use(router)
	.use(VueKonva)
	.use(ToastPlugin, { maxToasts: 5 })
	.mount('#app')
```

2) Usa el editor en una vista:

```vue
<template>
	<InventorySmart :configCanvas="initialConfig" @configUpdated="onConfigUpdated" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import InventorySmart from '@/inventory-smart/InventorySmart.vue'
import { SERIALIZE_CONFIG } from '@/inventory-smart/utils/constants'

const initialConfig = ref(null)
const currentConfig = ref(null)

const onConfigUpdated = (json) => {
	currentConfig.value = json
	// Persistencia ejemplo: localStorage
	localStorage.setItem(SERIALIZE_CONFIG.STORAGE_KEY, json)
}

onMounted(() => {
	const saved = localStorage.getItem(SERIALIZE_CONFIG.STORAGE_KEY)
	if (saved) initialConfig.value = saved
})
</script>
```

Alias de importación: el alias `@` apunta a `src/` (configurado en `vite.config.js`).

## API del componente

- Props
	- `configCanvas: string | null` (opcional)
		- Configuración serializada del canvas (JSON en string). Si no se proporciona, el editor iniciará vacío y mostrará mensajes informativos.

- Eventos
	- `configUpdated(payload: string)`
		- Emite la configuración actual serializada (string JSON) cuando hay cambios relevantes.

## Plugins y estilos

- Toasts: el plugin `src/inventory-smart/plugins/toast.js` expone una API global reactiva; úsalo desde composables vía `useToast()`.
- Tailwind CSS v4: el editor importa Tailwind desde `InventorySmart.vue` (`@import 'tailwindcss';`).
- vue-konva: usado para el lienzo 2D.

## Serialización y persistencia

Constantes útiles en `src/inventory-smart/utils/constants.js`:

- `SERIALIZE_CONFIG.STORAGE_KEY` — Clave por defecto para guardar la configuración.
- `AUTOSAVE_CONFIG` — Intervalo, máximo de backups y clave de almacenamiento del autosave.

El componente gestiona conflictos entre backups locales y configuraciones provenientes del servidor mostrando un aviso cuando la versión del servidor es más reciente.

## Atajos de teclado

- Ctrl/Cmd + Z — Deshacer
- Ctrl/Cmd + Y o Shift + Ctrl/Cmd + Z — Rehacer
- Ctrl/Cmd + C — Copiar al portapapeles
- Ctrl/Cmd + V — Pegar desde el portapapeles
- Supr / Backspace — Eliminar selección (en el canvas) (con confirmación)

## Estructura del proyecto

Consulta `ESTRUCTURA.md` para una descripción detallada de carpetas, componentes, composables, stores, utilidades y pruebas.

## Scripts

```bash
npm run dev         # Desarrollo
npm run build       # Construir para producción
npm run preview     # Previsualizar build
npm run test:unit   # Pruebas unitarias (Vitest)
npm run lint        # Lint (ESLint)
npm run format      # Formateo (Prettier)
```

## Pruebas

Las pruebas unitarias (Vitest + jsdom + @vue/test-utils) viven en `src/inventory-smart/__tests__/` e incluyen casos de colisiones, snapping, orden de capas, guards de resize y serialización de plantillas.

## IDE recomendado

- VS Code + extensión Volar.

## Licencia

Este proyecto no declara licencia explícita. Verifica los términos antes de uso en producción.
