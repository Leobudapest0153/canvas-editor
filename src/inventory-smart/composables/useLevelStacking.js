import { CM_TO_PX } from '@/inventory-smart/utils/constants';
import { buildChildFromDraft } from '@/inventory-smart/composables/useStructureManager';

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

  return {
    newHeightsById: Object.fromEntries(out),
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

// Aplicar creación: actualiza existentes y crea el nuevo
// makeIdFn: () => string
// insertFn: (newElement, roomId, saveHistory?, description?) => boolean
// updateFn: (id, patch, saveHistory?, description?) => boolean
export function applyCreateLevelInRoom(elements, draft, strategy, makeIdFn, insertFn, updateFn) {
  if (!draft?.isCreation || !['ok', 'clamp', 'redistribute'].includes(strategy)) {
    return { ok: false, message: 'Draft de creación inválido o estrategia no soportada.' };
  }

  let alturas, bases;
  if (strategy === 'ok') {
    alturas = draft.alturasOk; bases = draft.basesOk;
  } else if (strategy === 'clamp') {
    alturas = draft.clamp?.alturas; bases = draft.clamp?.bases;
  } else {
    alturas = draft.redistribute?.alturas; bases = draft.redistribute?.bases;
  }
  if (!alturas || !bases) return { ok: false, message: 'No hay alturas/bases para aplicar.' };

  const cm2px = (v) => Math.round((Number(v) || 0) * CM_TO_PX);
  const roomHeightPx = cm2px(draft.roomHeightCm);

  // 1) Actualizar existentes
  for (const id of draft.nivelesOrden) {
    if (id === NEW_LEVEL_ID) continue;
    const hCm = Math.max(MIN_LEVEL_CM, Math.round(Number(alturas[id]) || 0));
    const baseCm = Math.max(0, Math.round(Number(bases[id]) || 0));
    const heightPx = cm2px(hCm);
    const yPx = Math.max(0, roomHeightPx - (cm2px(baseCm) + heightPx));
    const ok = updateFn(id, {
      dimensiones: { alto: hCm },
      alturaRespectoAlSuelo: baseCm,
      y: yPx,
      height: heightPx,
    }, true, 'Ajuste de niveles (creación de otro nivel)');
    if (!ok) return { ok: false, message: 'Falló la actualización de un nivel existente.' };
  }

  // 2) Crear el nuevo
  const newId = typeof makeIdFn === 'function' ? makeIdFn() : ('lvl_' + Date.now());
  const hNew = Math.max(MIN_LEVEL_CM, Math.round(Number(alturas[NEW_LEVEL_ID]) || 0));
  const baseNew = Math.max(0, Math.round(Number(bases[NEW_LEVEL_ID]) || 0));
  const heightPx = cm2px(hNew);
  const yPx = Math.max(0, roomHeightPx - (cm2px(baseNew) + heightPx));

  // Mezclar patch original del modal
  const extra = JSON.parse(JSON.stringify(draft.targetPatch || {}));
  extra.id = newId;
  extra.padre = draft.roomId;
  extra.dimensiones = { ...(extra.dimensiones || {}), alto: hNew };
  extra.alturaRespectoAlSuelo = baseNew;

  // width en px con base en ancho (o largo si prefieres)
  const anchoCm = Number(extra?.dimensiones?.ancho);
  const largoCm = Number(extra?.dimensiones?.largo);
  const widthPx = Number.isFinite(anchoCm) ? cm2px(anchoCm)
                 : Number.isFinite(largoCm) ? cm2px(largoCm)
                 : undefined;

  const newElement = {
    tipo: 'pisos', // ajusta si tu tipo real difiere
    ...extra,
    x: Number.isFinite(extra.x) ? Math.round(extra.x) : 0,
    y: yPx,
    height: heightPx,
    ...(widthPx != null ? { width: widthPx } : {}),
  };

  const okInsert = insertFn(newElement, draft.roomId, true, 'Creación de nivel sin validación');
  if (!okInsert) return { ok: false, message: 'Falló la creación del nivel.' };

  return { ok: true, newId };
}

// Proponer cambio de altura (y opcionalmente ancho/largo) para un nivel dentro del cuarto
// elements: array del store
// levelId: id del nivel objetivo
// newDims: { ancho?, largo?, alto? } en cm (enteros o decimales redondeables)
export function proposeLevelChange(elements, levelId, levelPatch, parentId) {
  const { room, orderIds, byId, error } = getRoomAndLevels(elements, parentId);
  if (error) return { status: 'error', message: error };

  let level = null;
  if (levelId == 'Nuevo') {
    level = levelPatch;
    orderIds.push(levelId); // asegurar que el objetivo está en la lista
  }

  const newDims = levelPatch?.dimensiones || {};

  // 1) Validar footprint contra cuarto
  const footprintCheck = validateFootprintWithinRoom(newDims, level, room);
  if (!footprintCheck.ok) {
    return { status: 'error', message: footprintCheck.message || 'Dimensiones exceden límites del cuarto.' };
  }

  // 2) Alturas actuales
  const heightsCurrent = {};
  for (const id of orderIds) heightsCurrent[id] = Number(byId(id)?.dimensiones?.alto) || 0;

  const hTarget = newDims?.alto != null ? Number(newDims.alto) : heightsCurrent[levelId];

  // 3) Altura del cuarto (siempre finita según tu regla)
  const Hc = Number(room?.dimensiones?.alto);
  if (!Number.isFinite(Hc) || Hc <= 0) {
    return { status: 'error', message: 'El cuarto no tiene altura válida definida.' };
  }

  const others = orderIds.filter(id => id !== levelId).map(id => ({ id, h: heightsCurrent[id] }));
  const H_otros = sum(others.map(o => o.h));
  const H_total = (Number(hTarget) || 0) + H_otros;

  const draftBase = {
    roomId: room.id,
    roomHeightCm: Hc,
    targetId: levelId,
    targetPatch: levelPatch, // patch completo del modal
    nivelesOrden: orderIds,
    alturasActuales: { ...heightsCurrent },
    basesActuales: computeStackBaseZ(orderIds, heightsCurrent),
    nombresPorId: Object.fromEntries(orderIds.map(id => [id, byId(id)?.nombre || id])),
  };

  if (H_total <= Hc + 1e-6) {
    const alturasOkRaw = { ...heightsCurrent, [levelId]: hTarget };
    const alturasOk = roundHeightsPreserveSum(alturasOkRaw, sum(Object.values(alturasOkRaw)));
    const basesOk = computeStackBaseZ(orderIds, alturasOk);
    return { status: 'ok', draft: { ...draftBase, alturasOk, basesOk } };
  }

  const D = H_total - Hc;

  // Clamp
  const clampHRaw = { ...heightsCurrent, [levelId]: Math.max(MIN_LEVEL_CM, (Number(hTarget) || 0) - D) };
  const clampSum = sum(Object.values(clampHRaw));
  const alturasClamp = roundHeightsPreserveSum(clampHRaw, clampSum);
  const basesClamp = computeStackBaseZ(orderIds, alturasClamp);

  // Redistribución
  const { newHeightsById, leftover } = redistributeProportionally(others, D, MIN_LEVEL_CM);
  const redistRaw = { ...heightsCurrent, [levelId]: Number(hTarget) || 0 };
  for (const [oid, h] of Object.entries(newHeightsById)) redistRaw[oid] = h;
  const finalRedistribRaw = leftover <= 1e-6 ? redistRaw : clampHRaw;
  const redistSum = sum(Object.values(finalRedistribRaw));
  const alturasRedistrib = roundHeightsPreserveSum(finalRedistribRaw, redistSum);
  const basesRedistrib = computeStackBaseZ(orderIds, alturasRedistrib);

  return {
    status: 'needs_confirmation',
    draft: {
      ...draftBase,
      deficitCm: Math.round(D),
      clamp: { alturas: alturasClamp, bases: basesClamp },
      redistribute: { alturas: alturasRedistrib, bases: basesRedistrib },
    },
  };
}
// Aplicar cambios finales (según la estrategia) usando el updater del store
// updater: función (id, patch, saveHistory?, description?)
export function applyLevelChange(elements, draft, strategy, updaters) {
  // --- SECCIÓN 1: VALIDACIÓN Y PREPARACIÓN ---
  if (!updaters || typeof updaters.add !== 'function' || typeof updaters.update !== 'function') {
    return { ok: false, message: 'Se requieren las funciones de "add" y "update".' };
  }
  if (!draft || !['ok', 'clamp', 'redistribute'].includes(strategy)) {
    return { ok: false, message: 'Estrategia inválida o draft vacío.' };
  }

  // ... (Lógica de selección de alturas/bases y cálculo de roomHeightCm no cambia)
  let alturas, bases;
  if (strategy === 'ok') {
    alturas = draft.alturasOk; bases = draft.basesOk;
  } else if (strategy === 'clamp') {
    alturas = draft.clamp?.alturas; bases = draft.clamp?.bases;
  } else {
    alturas = draft.redistribute?.alturas; bases = draft.redistribute?.bases;
  }
  if (!alturas || !bases) return { ok: false, message: 'No hay datos de alturas/bases para aplicar.' };

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

  // --- SECCIÓN 2: BUCLE CON LLAMADAS DIFERENCIADAS ---
  for (const id of draft.nivelesOrden) {

    const hCm = Math.max(MIN_LEVEL_CM, Math.round(Number(alturas[id]) || 0));
    const baseCm = Math.max(0, Math.round(Number(bases[id]) || 0));
    const heightPx = cm2px(hCm);
    const yPx = Math.max(0, roomHeightPx - (cm2px(baseCm) + heightPx));

    let ok = false;
    const description = 'Ajuste de niveles en cuarto';

    // CASO A: CREACIÓN
    if (id === 'Nuevo' && id === targetId) {
      const parentContext = byId(draft.padre);
      if (!parentContext) return { ok: false, message: 'Contexto del padre no encontrado para crear.' };

      const index = draft.nivelesOrden.indexOf(id);
      const parentChilds = elements.filter(e => e?.padre === parentContext.id);
      const newElementData = buildChildFromDraft(draft.targetPatch, parentContext, index, parentChilds);

      // Asignar ID y geometría final
      newElementData.id = uid(newElementData.tipo); // ¡Generamos el ID final aquí!
      newElementData.dimensiones.alto = hCm;
      newElementData.alturaRespectoAlSuelo = baseCm;
      newElementData.y = yPx;
      newElementData.height = heightPx;

      const anchoCm = Number(newElementData.dimensiones?.ancho);
      if (Number.isFinite(anchoCm)) {
        newElementData.width = cm2px(anchoCm);
      }

      console.log('Calling ADD for new element', newElementData);
      ok = updaters.add(id, newElementData, true, description);

    // CASO B: ACTUALIZACIÓN (Tanto el objetivo como los de contexto)
    } else {
      let patch = {};
      // Si es el elemento que se está editando, el patch es más completo
      if (id === targetId) {
        patch = {
          ...(draft.targetPatch || {}),
          dimensiones: { ...((draft.targetPatch || {}).dimensiones || {}), alto: hCm },
          alturaRespectoAlSuelo: baseCm,
          y: yPx,
          height: heightPx,
        };
        const anchoCm = Number(patch.dimensiones?.ancho);
        if (Number.isFinite(anchoCm)) {
          patch.width = cm2px(anchoCm);
        }
      // Si solo es un elemento que se reajusta, el patch es mínimo
      } else {
        patch = {
          dimensiones: { alto: hCm },
          alturaRespectoAlSuelo: baseCm,
          y: yPx,
          height: heightPx,
        };
      }

      console.log(`Calling UPDATE for element ${id}`, patch);
      ok = updaters.update(id, patch, true, description);
    }

    if (!ok) return { ok: false, message: `Falló la operación para el nivel con id: ${id}.` };
  }

  return { ok: true };
}
