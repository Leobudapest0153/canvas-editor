import { CM_TO_PX } from '@/inventory-smart/utils/constants';
import { buildChildFromDraft } from '@/inventory-smart/composables/useStructureManager';
import { checkChildrenFit } from '@/inventory-smart/composables/useChildFitting';

// Altura mínima por nivel en cm
const MIN_LEVEL_CM = 1;
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// Util: suma segura
function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

// Util: ¿es círculo?
function isCircle(el) {
  const f = (el?.forma || '').toLowerCase();
  return f === 'circulo' || f === 'círculo' || f === 'circle';
}

// Validar ancho/largo del nivel contra el cuarto (bounding box)
// - Para rectángulos: ancho ≤ cuarto.ancho; largo ≤ cuarto.largo
// - Para círculos: ancho y largo se tratan como diámetro; validar contra ambos límites
function validateFootprintWithinRoom(newDims, currentLevel, room) {
  const roomAncho = Number(room?.dimensiones?.ancho);
  const roomLargo = Number(room?.dimensiones?.largo);

  // Si el cuarto no tiene ancho o largo definidos, permitir
  if (!Number.isFinite(roomAncho) || !Number.isFinite(roomLargo)) {
    return { ok: true };
  }

  const circle = isCircle(currentLevel);

  const nextAncho = newDims?.ancho != null ? Number(newDims.ancho) : Number(currentLevel?.dimensiones?.ancho);
  const nextLargo = newDims?.largo != null ? Number(newDims.largo) : Number(currentLevel?.dimensiones?.largo);

  // Si no hay cambios de ancho/largo, no bloquear
  if (!Number.isFinite(nextAncho) && !Number.isFinite(nextLargo)) return { ok: true };

  if (circle) {
    if (Number.isFinite(nextAncho) && nextAncho > roomAncho) {
      return { ok: false, message: 'El diámetro (ancho) excede el ancho del cuarto.' };
    }
    if (Number.isFinite(nextLargo) && nextLargo > roomLargo) {
      return { ok: false, message: 'El diámetro (largo) excede el largo del cuarto.' };
    }
    return { ok: true };
  }

  if (Number.isFinite(nextAncho) && nextAncho > roomAncho) {
    return { ok: false, message: 'El ancho excede el ancho del cuarto.' };
  }
  if (Number.isFinite(nextLargo) && nextLargo > roomLargo) {
    return { ok: false, message: 'El largo excede el largo del cuarto.' };
  }
  return { ok: true };
}

// Compactación: calcula la base Z (alturaRespectoAlSuelo) acumulada por orden
function computeStackBaseZ(orderIds, heightsById) {
  const bases = {};
  let acc = 0;
  for (const id of orderIds) {
    const h = Number(heightsById[id]) || 0;
    bases[id] = acc;
    acc += h;
  }
  return bases;
}

// Redistribución proporcional con mínimo
function redistributeProportionally(others, deficit, minCm = MIN_LEVEL_CM) {
  // others: [{ id, h }]
  let remaining = Number(deficit) || 0;
  const out = new Map(others.map(o => [o.id, Number(o.h) || 0]));

  // Safety-guard para evitar loops infinitos
  for (let guard = 0; guard < 20 && remaining > 1e-6; guard++) {
    const active = others.filter(o => (out.get(o.id) ?? 0) > minCm + 1e-6);
    const S = sum(active.map(o => out.get(o.id) || 0));
    if (S <= 1e-6 || active.length === 0) break;

    let consumed = 0;
    for (const o of active) {
      const h = out.get(o.id);
      const share = remaining * (h / S);
      const newH = Math.max(minCm, h - share);
      consumed += (h - newH);
      out.set(o.id, newH);
    }
    if (consumed <= 1e-6) break;
    remaining = Math.max(0, remaining - consumed);
  }
  const cleanedResults = {};
  for (const [id, value] of out.entries()) {
    // Redondea a 4 decimales para eliminar errores de punto flotante
    cleanedResults[id] = parseFloat(value.toFixed(4));
  }

  return {
    newHeightsById: cleanedResults,
    leftover: remaining,
  };
}

// Redondeo a enteros (cm) preservando la suma objetivo
function roundHeightsPreserveSum(heightsById, targetSum) {
  const ids = Object.keys(heightsById);
  const originals = ids.map(id => Number(heightsById[id]) || 0);
  const rounded = originals.map(v => Math.round(v));
  let diff = Math.round(Number(targetSum) || 0) - sum(rounded);

  // Ajustar empezando por los más grandes (o los que más decimal tenían)
  const order = originals
    .map((v, i) => ({ i, frac: v - Math.floor(v), v }))
    .sort((a, b) => Math.abs(b.frac) - Math.abs(a.frac));

  let k = 0;
  // Corregir la diferencia ajustando +/-1 donde se pueda
  while (diff !== 0 && k < order.length) {
    const idx = order[k].i;
    const canInc = diff > 0;
    const canDec = diff < 0 && rounded[idx] > MIN_LEVEL_CM; // no bajar de 1 cm
    if (canInc) {
      rounded[idx] += 1;
      diff -= 1;
    } else if (canDec) {
      rounded[idx] -= 1;
      diff += 1;
    }
    k++;
    if (k >= order.length && diff !== 0) k = 0; // reciclar si aún hay diff
  }

  const res = {};
  ids.forEach((id, i) => { res[id] = rounded[i]; });
  return res;
}

// Localiza cuarto padre y niveles ordenados (orden de creación) a partir del nivel objetivo
function getRoomAndLevels(elements, parentId) {
  const byId = (id) => elements.find(e => e?.id === id);
  //const level = byId(levelId);
  //if (!level) return { error: 'Nivel no encontrado' };

  const room = byId(parentId);
  if (!room || !['cuartos', 'elementos'].includes(room.tipo)) return { error: 'Cuarto padre no encontrado' };

  const orderIds = (room.hijos || [])
    .map(id => byId(id))
    .filter(e => e && ['contenedores', 'pisos'].includes(e.tipo))
    .map(e => e.id);

  return { room, orderIds, byId };
}

// Localiza cuarto y niveles cuando aún NO existe el nivel (por roomId)
function getRoomAndLevelsByRoomId(elements, roomId) {
  const byId = (id) => elements.find(e => e?.id === id);
  const room = byId(roomId);
  if (!room || !['cuartos', 'elementos'].includes(room.tipo)) {
    return { error: 'Cuarto no encontrado' };
  }
  const orderIds = (room.hijos || [])
    .map(id => byId(id))
    .filter(e => e && ['contenedores', 'pisos'].includes(e.tipo))
    .map(e => e.id);

  return { room, orderIds, byId };
}


// Proponer cambio de altura (y opcionalmente ancho/largo) para un nivel dentro del cuarto
// elements: array del store
// levelId: id del nivel objetivo
// newDims: { ancho?, largo?, alto? } en cm (enteros o decimales redondeables)
export function proposeLevelChange(elements, levelId, levelPatch, parentId) {
  const { room, orderIds, byId, error } = getRoomAndLevels(elements, parentId);
  if (error) return { status: 'error', message: error };

  let level = null;
  const isCreation = (levelId === 'Nuevo');
  if (isCreation) {
    level = levelPatch;
    orderIds.push(levelId); // asegurar que el objetivo está en la lista
  }

  const newDims = levelPatch?.dimensiones || {};

  // 0) Restricciones por hijos del piso (ancho/largo/alto/capacidad)
  // Solo aplica cuando se edita un nivel existente y dicho nivel tiene hijos (piso con elementos)
  let childFit = null;
  if (!isCreation) {
    const targetLevel = byId(levelId);
    if (targetLevel && Array.isArray(targetLevel.hijos) && targetLevel.hijos.length > 0) {
      const proposedForFit = {
        anchoCm: Number(newDims?.ancho),
        largoCm: Number(newDims?.largo),
        altoCm: Number(newDims?.alto),
        capacidadCarga: Number(levelPatch?.capacidadCarga),
      };
      const fit = checkChildrenFit(targetLevel, proposedForFit, elements);
      childFit = {
        ok: !!fit.ok,
        minAnchoCm: fit.minAnchoCm,
        minLargoCm: fit.minLargoCm,
        minAltoCm: fit.minAltoCm,
        minCapacidad: fit.minCapacidad,
        widthBoundById: fit.widthBoundById,
        lengthBoundById: fit.lengthBoundById,
        heightBoundById: fit.heightBoundById,
        capacityCount: fit.capacityCount,
        proposed: proposedForFit,
      };
    }
  }

  // 1) Validar footprint (ancho/largo)
  const footprintCheck = validateFootprintWithinRoom(newDims, level, room);
  if (!footprintCheck.ok) {
    return { status: 'error', message: footprintCheck.message || 'Dimensiones exceden límites del cuarto.' };
  }

  // 2) Peso
  const MIN_WEIGHT_KG = 0.1;
  const getWeight = (node) => Number(node?.capacidadCarga) || 0;

  const weightsCurrent = {};
  for (const id of orderIds) weightsCurrent[id] = getWeight(byId(id));

  // peso objetivo del patch (si el usuario lo modificó)
  const wPatch = levelPatch?.capacidadCarga;
  const wTarget = wPatch != null ? Number(wPatch) : weightsCurrent[levelId];

  const WcRaw = room?.capacidadCarga;
  const Wc = Number(WcRaw);
  const hasWeightLimit = Number.isFinite(Wc) && Wc > 0;

  const W_otros = sum(orderIds.filter(id => id !== levelId).map(id => weightsCurrent[id]));
  const W_total = (Number(wTarget) || 0) + W_otros;

  const weightExceeded = hasWeightLimit && (W_total > Wc + 1e-6);
  const D_w = weightExceeded ? (W_total - Wc) : 0; // déficit de peso a recortar
  const weightExcessKg = weightExceeded ? Math.ceil(D_w) : 0;

  // 3) Alturas
  const heightsCurrent = {};
  for (const id of orderIds) heightsCurrent[id] = Number(byId(id)?.dimensiones?.alto) || 0;

  const hTarget = newDims?.alto != null ? Number(newDims.alto) : heightsCurrent[levelId];

  // 4) Altura del cuarto
  const Hc = Number(room?.dimensiones?.alto);
  if (!Number.isFinite(Hc) || Hc <= 0) {
    return { status: 'error', message: 'El cuarto no tiene altura válida definida.' };
  }

  const others = orderIds.filter(id => id !== levelId).map(id => ({ id, h: heightsCurrent[id] }));
  const H_otros = sum(others.map(o => o.h));
  const H_total = (Number(hTarget) || 0) + H_otros;
  const heightExceeded = H_total > Hc + 1e-6;
  const D = heightExceeded ? (H_total - Hc) : 0;

  // Propuestas de PESO (solo si excede)
  let weightClamp = null;
  let weightRedistribute = null;
  if (weightExceeded) {
    // Clamp de peso: reduce el del target lo mínimo para caber
    const wClampRaw = { ...weightsCurrent, [levelId]: Math.max(MIN_WEIGHT_KG, (Number(wTarget) || 0) - D_w) };

    // Redistribución de peso: mantener target y reducir los otros proporcionalmente con mínimo 0
    const othersW = orderIds.filter(id => id !== levelId).map(id => ({ id, h: weightsCurrent[id] }));
    const { newHeightsById: newWeightsById, leftover } = redistributeProportionally(othersW, D_w, MIN_WEIGHT_KG);

    const wRedistRaw = { ...weightsCurrent, [levelId]: Number(wTarget) || 0 };
    for (const [oid, val] of Object.entries(newWeightsById)) wRedistRaw[oid] = val;

    const finalWRedist = leftover <= 1e-6 ? wRedistRaw : wClampRaw; // si no alcanza, cae a clamp

    weightClamp = wClampRaw;
    weightRedistribute = finalWRedist;
  }

  // Pesos propuestos por id para comparativa (por defecto: iguales a actuales salvo el target si patch)
  const pesosPropuestos = { ...weightsCurrent };
  if (wTarget != null) pesosPropuestos[levelId] = Number(wTarget) || 0;

  const draftBase = {
    isCreation,
    roomId: room.id,
    roomHeightCm: Hc,
    targetId: levelId,
    targetPatch: levelPatch,
    nivelesOrden: orderIds,
    alturasActuales: { ...heightsCurrent },
    basesActuales: computeStackBaseZ(orderIds, heightsCurrent),
    nombresPorId: Object.fromEntries(orderIds.map(id => [id, byId(id)?.nombre || id])),

    // Info de peso para UI
    roomWeightMax: hasWeightLimit ? Wc : null,
    pesosActuales: { ...weightsCurrent },
    pesosPropuestos,
    pesoTotal: W_total,

    // Límites por elementos del piso (si aplica)
    childFit,

    // Propuestas de peso
    weightClamp,
    weightRedistribute,
  };

  // Caso feliz: ni altura ni peso exceden
  if (!heightExceeded && !weightExceeded) {
    const alturasOkRaw = { ...heightsCurrent, [levelId]: hTarget };
    const alturasOk = roundHeightsPreserveSum(alturasOkRaw, sum(Object.values(alturasOkRaw)));
    const basesOk = computeStackBaseZ(orderIds, alturasOk);
    return { status: 'ok', draft: { ...draftBase, alturasOk, basesOk } };
  }

  // Propuestas de ALTURA (solo si excede altura)
  let clamp = null;
  let redistribute = null;
  if (heightExceeded) {
    const clampHRaw = { ...heightsCurrent, [levelId]: Math.max(MIN_LEVEL_CM, (Number(hTarget) || 0) - D) };
    const clampSum = sum(Object.values(clampHRaw));
    const alturasClamp = roundHeightsPreserveSum(clampHRaw, clampSum);
    const basesClamp = computeStackBaseZ(orderIds, alturasClamp);
    clamp = { alturas: alturasClamp, bases: basesClamp };

    const { newHeightsById, leftover } = redistributeProportionally(others, D, MIN_LEVEL_CM);
    const redistRaw = { ...heightsCurrent, [levelId]: Number(hTarget) || 0 };
    for (const [oid, h] of Object.entries(newHeightsById)) redistRaw[oid] = h;
    const finalRedistribRaw = leftover <= 1e-6 ? redistRaw : clampHRaw;
    const redistSum = sum(Object.values(finalRedistribRaw));
    const alturasRedistrib = roundHeightsPreserveSum(finalRedistribRaw, redistSum);
    const basesRedistrib = computeStackBaseZ(orderIds, alturasRedistrib);
    redistribute = { alturas: alturasRedistrib, bases: basesRedistrib };
  }
  return {
    status: 'needs_confirmation',
    draft: {
      ...draftBase,
      heightExceeded,
      weightExceeded,
      deficitCm: heightExceeded ? Math.round(D) : 0,
      weightExcess: weightExcessKg,
      clamp,               // altura
      redistribute,        // altura
      // peso: weightClamp / weightRedistribute ya vienen arriba en base
    },
  };
}
export function applyLevelChange(elements, draft, strategy, updaters) {
  // --- SECCIÓN 1: VALIDACIÓN Y PREPARACIÓN ---
  if (!updaters || typeof updaters.add !== 'function' || typeof updaters.update !== 'function') {
    return { ok: false, message: 'Se requieren las funciones de "add" y "update".' };
  }
  if (!draft || !['ok', 'clamp', 'redistribute'].includes(strategy)) {
    return { ok: false, message: 'Estrategia inválida o draft vacío.' };
  }

  // Si hay exceso de peso y el usuario eligió 'ok', bloquear
  if (draft?.weightExceeded && strategy === 'ok') {
    const total = Math.round(Number(draft?.pesoTotal || 0));
    const max = Math.round(Number(draft?.roomWeightMax || 0));
    return { ok: false, message: `No se puede aplicar: el peso total (${total} kg) excede el máximo permitido (${max} kg).` };
  }

  // Selección de alturas/bases
  let alturas, bases;
  if (strategy === 'ok') {
    alturas = draft.alturasOk; bases = draft.basesOk;
  } else if (strategy === 'clamp') {
    alturas = draft.clamp?.alturas; bases = draft.clamp?.bases;
  } else {
    alturas = draft.redistribute?.alturas; bases = draft.redistribute?.bases;
  }
  if (!alturas || !bases) return { ok: false, message: 'No hay datos de alturas/bases para aplicar.' };

  // Selección de pesos según estrategia (si existen propuestas)
  let pesos = null;
  if (strategy === 'clamp') {
    pesos = draft.weightClamp || null;
  } else if (strategy === 'redistribute') {
    pesos = draft.weightRedistribute || null;
  } else {
    pesos = null; // 'ok' no toca pesos
  }

  // Si todavía hay exceso de peso pero no tenemos propuestas de peso, bloquear
  if (draft?.weightExceeded && !pesos) {
    return { ok: false, message: 'No hay propuesta de peso para resolver el exceso. Elige "Limitar" o "Forzar".' };
  }

  const cm2px = (v) => Math.round((Number(v) || 0) * CM_TO_PX);
  const byId = (id) => elements.find(e => e?.id === id);

  let roomHeightCm = Number(draft.roomHeightCm);
  if (!Number.isFinite(roomHeightCm) || roomHeightCm <= 0) {
    const parentId = draft.parentId || byId(draft.targetId)?.padre;
    const room = byId(parentId);
    roomHeightCm = Number(room?.dimensiones?.alto) || 0;
  }
  if (roomHeightCm <= 0) {
    return { ok: false, message: 'No se pudo determinar la altura del cuarto.' };
  }
  const roomHeightPx = cm2px(roomHeightCm);
  const targetId = draft.targetId;

  for (const id of draft.nivelesOrden) {
    const hCm = Math.max(1, Math.round(Number(alturas[id]) || 0));
    const baseCm = Math.max(0, Math.round(Number(bases[id]) || 0));
    const heightPx = cm2px(hCm);
    const yPx = Math.max(0, roomHeightPx - (cm2px(baseCm) + heightPx));

    const wNew = (pesos && pesos[id] != null) ? Math.max(0, Math.round(Number(pesos[id]) || 0)) : null;

    let ok = false;
    const description = 'Ajuste de niveles en cuarto';

    if (id === 'Nuevo' && id === targetId) {
      const parentContext = byId(draft.padre);
      if (!parentContext) return { ok: false, message: 'Contexto del padre no encontrado para crear.' };

      const index = draft.nivelesOrden.indexOf(id);
      const parentChilds = elements.filter(e => e?.padre === parentContext.id);
      const newElementData = buildChildFromDraft(draft.targetPatch, parentContext, index, parentChilds);

      newElementData.id = uid(newElementData.tipo);
      newElementData.dimensiones.alto = hCm;
      newElementData.alturaRespectoAlSuelo = baseCm;
      newElementData.y = yPx;
      newElementData.height = heightPx;
      if (wNew != null) newElementData.capacidadCarga = wNew;

      const anchoCm = Number(newElementData.dimensiones?.ancho);
      if (Number.isFinite(anchoCm)) newElementData.width = cm2px(anchoCm);

      ok = updaters.add(id, newElementData, true, description);

    } else {
      let patch = {};
      if (id === targetId) {
        patch = {
          ...(draft.targetPatch || {}),
          dimensiones: { ...((draft.targetPatch || {}).dimensiones || {}), alto: hCm },
          alturaRespectoAlSuelo: baseCm,
          y: yPx,
          height: heightPx,
        };
        if (wNew != null) patch.capacidadCarga = wNew;

        const anchoCm = Number(patch.dimensiones?.ancho);
        if (Number.isFinite(anchoCm)) patch.width = cm2px(anchoCm);

      } else {
        patch = {
          dimensiones: { alto: hCm },
          alturaRespectoAlSuelo: baseCm,
          y: yPx,
          height: heightPx,
        };
        if (wNew != null) patch.capacidadCarga = wNew;
      }

      ok = updaters.update(id, patch, true, description);
    }

    if (!ok) return { ok: false, message: `Falló la operación para el nivel con id: ${id}.` };
  }

  return { ok: true };
}
