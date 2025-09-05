import { EXPORT_FORMAT_VERSION } from '@/inventory-smart/utils/constants'
import type { TemplateDTO, TemplateNodeDTO } from './templates.serializer'

const SEMVER_RE = /^\d+\.\d+\.\d+$/

export function assertValidTemplatesDTO(dtos: TemplateDTO[] | undefined): void {
  if (dtos === undefined) return
  if (!Array.isArray(dtos)) throw new Error('plantillasCatalogo debe ser un array')
  dtos.forEach((tpl, index) => {
    if (!tpl || typeof tpl !== 'object') throw new Error(`Plantilla ${index} inválida`)
    if (!tpl.id || typeof tpl.id !== 'string') throw new Error(`Plantilla ${index} sin id`)
    if (!tpl.nombre || typeof tpl.nombre !== 'string') throw new Error(`Plantilla ${tpl.id} sin nombre`)
    if (!tpl.payload || typeof tpl.payload !== 'object') throw new Error(`Plantilla ${tpl.id} sin payload`)
    if (!tpl.payload.root || typeof tpl.payload.root !== 'string') throw new Error(`Plantilla ${tpl.id} payload.root inválido`)
    if (!Array.isArray(tpl.payload.nodos)) throw new Error(`Plantilla ${tpl.id} nodos debe ser array`)
    const ids = new Set(tpl.payload.nodos.map((n) => n.id))
    if (!ids.has(tpl.payload.root)) throw new Error(`Plantilla ${tpl.id} root no está en nodos`)
    const mode = tpl.payload.layout?.mode || 'relative'
    tpl.payload.nodos.forEach((n: TemplateNodeDTO, idx: number) => {
      if (!['elementos', 'contenedores'].includes(n.tipo)) {
        throw new Error(`Nodo ${idx} de plantilla ${tpl.id} tiene tipo inválido`)
      }
      if (!n.dimensiones || typeof n.dimensiones.ancho !== 'number' || n.dimensiones.ancho <= 0) {
        throw new Error(`Nodo ${n.id} dimensiones.ancho inválido`)
      }
      if (typeof n.dimensiones.largo !== 'number' || n.dimensiones.largo <= 0) {
        throw new Error(`Nodo ${n.id} dimensiones.largo inválido`)
      }
      if (typeof n.dimensiones.alto !== 'number' || n.dimensiones.alto <= 0) {
        throw new Error(`Nodo ${n.id} dimensiones.alto inválido`)
      }
      if (mode === 'relative') {
        if (typeof n.offsets?.dx !== 'number' || typeof n.offsets?.dy !== 'number') {
          throw new Error(`Nodo ${n.id} offsets inválidos`)
        }
      }
      if (mode === 'absoluteSnapshot') {
        if (typeof n.x !== 'number' || typeof n.y !== 'number') {
          throw new Error(`Nodo ${n.id} coordenadas absolutas inválidas`)
        }
      }
    })
  })
}

export function validateMetaVersion(version: string | undefined, warnings: string[]): void {
  if (!version) return
  if (!SEMVER_RE.test(version)) {
    warnings.push('meta.version no es semver válido')
    return
  }
  const cmp = compareSemver(version, EXPORT_FORMAT_VERSION)
  if (cmp > 0) {
    warnings.push(`meta.version ${version} es mayor que soportada ${EXPORT_FORMAT_VERSION}`)
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

