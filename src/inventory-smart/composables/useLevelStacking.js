import { CM_TO_PX } from '@/inventory-smart/utils/constants';

// Altura mínima por nivel en cm
const MIN_LEVEL_CM = 1;

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
function getRoomAndLevels(elements, levelId) {
  const byId = (id) => elements.find(e => e?.id === id);
  const level = byId(levelId);
  if (!level) return { error: 'Nivel no encontrado' };

  const room = byId(level.padre);
  if (!room || room.tipo !== 'cuartos') return { error: 'Cuarto padre no encontrado' };

  const orderIds = (room.hijos || [])
    .map(id => byId(id))
    .filter(e => e && e.tipo === 'pisos')
    .map(e => e.id);

  return { room, level, orderIds, byId };
}

// Proponer cambio de altura (y opcionalmente ancho/largo) para un nivel dentro del cuarto
// elements: array del store
// levelId: id del nivel objetivo
// newDims: { ancho?, largo?, alto? } en cm (enteros o decimales redondeables)
export function proposeLevelChange(elements, levelId, levelPatch) {
  const { room, level, orderIds, byId, error } = getRoomAndLevels(elements, levelId);
  if (error) return { status: 'error', message: error };

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
export function applyLevelChange(elements, draft, strategy, updater) {
  if (!draft || !['ok', 'clamp', 'redistribute'].includes(strategy)) {
    return { ok: false, message: 'Estrategia inválida o draft vacío.' };
  }

  let alturas, bases;
  if (strategy === 'ok') {
    alturas = draft.alturasOk; bases = draft.basesOk;
  } else if (strategy === 'clamp') {
    alturas = draft.clamp?.alturas; bases = draft.clamp?.bases;
  } else {
    alturas = draft.redistribute?.alturas; bases = draft.redistribute?.bases;
  }
  if (!alturas || !bases) return { ok: false, message: 'No hay datos de alturas/bases para aplicar.' };

  // 1) cm→px helpers
  const cm2px = (v) => Math.round((Number(v) || 0) * CM_TO_PX);

  // 2) Necesitamos el alto del cuarto para calcular Y desde el piso (sin huecos abajo)
  let roomHeightCm = Number(draft.roomHeightCm);
  if (!Number.isFinite(roomHeightCm) || roomHeightCm <= 0) {
    // fallback por si no llegó en el draft: localizar cuarto
    const byId = (id) => elements.find(e => e?.id === id);
    const level = byId(draft.targetId);
    const room = level ? byId(level.padre) : null;
    roomHeightCm = Number(room?.dimensiones?.alto) || 0;
  }
  const roomHeightPx = cm2px(roomHeightCm);

  const targetId = draft.targetId;
  const targetPatch = draft.targetPatch || {};

  // 3) Aplicar a cada nivel: alto (cm), baseZ (cm), y (px desde arriba), height (px)
  for (const id of draft.nivelesOrden) {
    const hCm = Math.max(MIN_LEVEL_CM, Math.round(Number(alturas[id]) || 0));
    const baseCm = Math.max(0, Math.round(Number(bases[id]) || 0));

    const heightPx = cm2px(hCm);
    // y desde el TOP del cuarto, apilado desde el piso: y = roomHeightPx - (base + height)
    const yPx = Math.max(0, roomHeightPx - (cm2px(baseCm) + heightPx));

    // Patch base para todos los niveles
    let patch = {
      dimensiones: { alto: hCm },
      alturaRespectoAlSuelo: baseCm,
      // Propiedades visuales en px para la vista de cuarto
      y: yPx,
      height: heightPx,
    };

    // Si es el objetivo, fusionar patch del modal (nombre, capacidad, ancho/largo, etc.)
    if (id === targetId) {
      const extra = JSON.parse(JSON.stringify(targetPatch || {}));
      extra.dimensiones = { ...(extra.dimensiones || {}), alto: hCm };
      extra.alturaRespectoAlSuelo = baseCm;

      // Si hay cambios de ancho/largo en el patch del modal, actualizar width en px
      const anchoCm = Number(extra.dimensiones?.ancho);
      const largoCm = Number(extra.dimensiones?.largo);
      // Por defecto usaremos ancho → width; si tu vista de cuarto usa largo como horizontal, cambia aquí.
      if (Number.isFinite(anchoCm)) {
        patch.width = cm2px(anchoCm);
      } else if (Number.isFinite(largoCm)) {
        patch.width = cm2px(largoCm);
      }

      // Asegurar Y/height finales calculados prevalecen
      patch = {
        ...extra,
        dimensiones: { ...(extra.dimensiones || {}), alto: hCm },
        alturaRespectoAlSuelo: baseCm,
        y: yPx,
        height: heightPx,
        ...(patch.width != null ? { width: patch.width } : {}),
      };
    }

    const ok = updater(id, patch, true, 'Ajuste de niveles en cuarto');
    if (!ok) return { ok: false, message: 'Falló la actualización de un nivel.' };
  }

  return { ok: true };
}
