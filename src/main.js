import './styles/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import VueKonva from 'vue-konva'
import ToastPlugin from '@/inventory-smart/plugins/toast'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueKonva)
app.use(ToastPlugin, { maxToasts: 5 })

app.mount('#app')
