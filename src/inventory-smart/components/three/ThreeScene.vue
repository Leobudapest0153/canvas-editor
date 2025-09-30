<template>
  <div ref="canvasWrapper" class="three-scene__wrapper">
    <div v-if="!hasContent" class="three-scene__empty">
      No hay datos para renderizar.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildSceneGraphFromState } from '@/inventory-smart/utils/three/mapElementToMesh.js'

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
})

const canvasWrapper = ref(null)
const hasContent = ref(false)

let renderer = null
let scene = null
let camera = null
let controls = null
let animationId = null
let currentGraph = null

const disposeGraph = () => {
  if (currentGraph?.dispose) {
    currentGraph.dispose()
  }
  if (currentGraph?.group && scene) {
    scene.remove(currentGraph.group)
  }
  currentGraph = null
  hasContent.value = false
}

const fitCameraToBounds = (bounds) => {
  if (!bounds || bounds.isEmpty() || !camera || !controls) return

  const size = new THREE.Vector3()
  bounds.getSize(size)
  const center = new THREE.Vector3()
  bounds.getCenter(center)

  const maxDim = Math.max(size.x, size.y, size.z)
  const fitHeightDistance = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  const distance = fitHeightDistance * 1.5 + maxDim * 0.5

  camera.position.set(center.x + distance, center.y + distance * 0.6, center.z + distance)
  camera.near = Math.max(distance / 100, 0.1)
  camera.far = Math.max(distance * 20, 500)
  camera.lookAt(center)
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.update()
}

const renderGraph = (data) => {
  if (!scene) return
  disposeGraph()
  if (!data) return

  const graph = buildSceneGraphFromState(data)
  currentGraph = graph
  if (graph?.group) {
    scene.add(graph.group)
    hasContent.value = true
    if (graph.bounds) {
      fitCameraToBounds(graph.bounds)
    }
  }
}

const handleResize = () => {
  if (!canvasWrapper.value || !renderer || !camera) return
  const { clientWidth, clientHeight } = canvasWrapper.value
  renderer.setSize(clientWidth, clientHeight)
  camera.aspect = clientWidth / Math.max(clientHeight, 1)
  camera.updateProjectionMatrix()
}

const initScene = () => {
  if (!canvasWrapper.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#020617')

  const { clientWidth, clientHeight } = canvasWrapper.value
  camera = new THREE.PerspectiveCamera(60, clientWidth / Math.max(clientHeight, 1), 0.1, 2000)
  camera.position.set(10, 10, 10)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.shadowMap.enabled = true
  renderer.setSize(clientWidth, clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  canvasWrapper.value.appendChild(renderer.domElement)
  handleResize()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const gridHelper = new THREE.GridHelper(50, 50, 0x1d4ed8, 0x1e293b)
  scene.add(gridHelper)

  const axesHelper = new THREE.AxesHelper(2)
  scene.add(axesHelper)

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }

  animate()

  window.addEventListener('resize', handleResize)
}

onMounted(() => {
  initScene()
  renderGraph(props.data)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeGraph()
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (controls) {
    controls.dispose()
    controls = null
  }
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    renderer = null
  }
  scene = null
  camera = null
})

watch(
  () => props.data,
  (newData) => {
    renderGraph(newData)
  },
  { deep: true }
)
</script>

<style scoped>
.three-scene__wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top, rgba(30, 41, 59, 0.9), #020617);
  border-radius: 12px;
  overflow: hidden;
}

.three-scene__wrapper canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.three-scene__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>

