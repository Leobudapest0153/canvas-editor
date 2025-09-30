import * as THREE from 'three'

const CM_TO_M = 0.01

const TYPE_COLOR_MAP = {
  plantas: '#1f2937',
  pisos: '#0ea5e9',
  cuartos: '#10b981',
  contenedores: '#f59e0b',
  elementos: '#6366f1',
}

const DEFAULT_ELEMENT_COLOR = '#94a3b8'
const FLOOR_THICKNESS = 0.1

const disposeObject = (object) => {
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose?.()
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material?.dispose?.())
      } else {
        child.material?.dispose?.()
      }
    }
  })
}

const createFloorMesh = (planta) => {
  const ancho = Math.max(1, planta?.dimensiones?.ancho || 1000) * CM_TO_M
  const largo = Math.max(1, planta?.dimensiones?.largo || 1000) * CM_TO_M
  const geometry = new THREE.BoxGeometry(ancho, FLOOR_THICKNESS, largo)
  const material = new THREE.MeshStandardMaterial({ color: TYPE_COLOR_MAP.plantas, transparent: true, opacity: 0.6 })
  const floor = new THREE.Mesh(geometry, material)
  floor.receiveShadow = true
  floor.position.y = FLOOR_THICKNESS / 2
  floor.name = `planta:${planta?.id || 'sin-id'}`
  return floor
}

const resolveColor = (elemento) => {
  const tipo = (elemento?.tipo || '').toLowerCase()
  const categoria = (elemento?.categoria || '').toLowerCase()
  return TYPE_COLOR_MAP[tipo] || TYPE_COLOR_MAP[categoria] || elemento?.color || DEFAULT_ELEMENT_COLOR
}

export const mapElementToMesh = (elemento) => {
  const ancho = Math.max(1, elemento?.dimensiones?.ancho || 10) * CM_TO_M
  const alto = Math.max(1, elemento?.dimensiones?.alto || 10) * CM_TO_M
  const largo = Math.max(1, elemento?.dimensiones?.largo || 10) * CM_TO_M

  const geometry = new THREE.BoxGeometry(ancho, alto, largo)
  const material = new THREE.MeshStandardMaterial({
    color: resolveColor(elemento),
    transparent: true,
    opacity: elemento?.visible === false ? 0.35 : 0.9,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const group = new THREE.Group()
  group.name = elemento?.nombre || elemento?.id || 'elemento'
  group.userData = { id: elemento?.id, tipo: elemento?.tipo }
  group.add(mesh)

  const posicion = elemento?.posicion || {}
  const rotationDeg = Number.isFinite(elemento?.orientacion)
    ? elemento.orientacion
    : Number.isFinite(posicion.rotation)
      ? posicion.rotation
      : 0

  const altura = Number.isFinite(elemento?.alturaRespectoAlSuelo) ? elemento.alturaRespectoAlSuelo : 0
  const offsetZ = Number.isFinite(posicion.z) ? posicion.z : 0

  group.position.set(
    (Number.isFinite(posicion.x) ? posicion.x : 0) * CM_TO_M,
    (altura + offsetZ) * CM_TO_M + alto / 2,
    (Number.isFinite(posicion.y) ? posicion.y : 0) * CM_TO_M,
  )

  group.rotation.y = THREE.MathUtils.degToRad(rotationDeg)

  return {
    group,
    dispose: () => disposeObject(group),
  }
}

export const buildSceneGraphFromState = (state) => {
  const root = new THREE.Group()
  root.name = 'inventory-scene-root'

  const elementos = Array.isArray(state?.elementos) ? state.elementos : []
  const plantas = Array.isArray(state?.plantas) ? state.plantas : []

  const elementosPorId = new Map()
  elementos.forEach((el) => {
    if (el?.id) elementosPorId.set(el.id, el)
  })

  const attachChildren = (elementoId, parentGroup) => {
    const elemento = elementosPorId.get(elementoId)
    if (!elemento) return

    const { group } = mapElementToMesh(elemento)
    parentGroup.add(group)

    const hijos = Array.isArray(elemento?.hijos) ? elemento.hijos : []
    hijos.forEach((childId) => attachChildren(childId, group))
  }

  plantas.forEach((planta) => {
    const plantaGroup = new THREE.Group()
    plantaGroup.name = planta?.nombre || planta?.id || 'planta'
    plantaGroup.userData = { id: planta?.id, tipo: 'planta' }

    const floor = createFloorMesh(planta)
    plantaGroup.add(floor)

    const rootElements = elementos.filter((elemento) => {
      const mismoNivel = elemento?.plantaId === planta?.id
      const sinPadre = !elemento?.padre
      return mismoNivel && sinPadre
    })

    rootElements.forEach((elemento) => {
      if (!elemento?.id) return
      attachChildren(elemento.id, plantaGroup)
    })

    root.add(plantaGroup)
  })

  const bounds = new THREE.Box3().setFromObject(root)

  return {
    group: root,
    bounds,
    dispose: () => disposeObject(root),
  }
}

