// Script para debuggear problemas de serialización
// Ejecutar en la consola del navegador

console.log('=== DEBUG SERIALIZACIÓN ===');

// 1. Verificar elementos antes de guardar
const elementos = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]?.config?.globalProperties?.$pinia?.state?.value?.canvas?.elementos;
if (elementos) {
  console.log('Elementos antes de guardar:', elementos.length);
  elementos.forEach((el, idx) => {
    console.log(`Elemento ${idx + 1}:`, {
      id: el.id,
      tipo: el.tipo,
      dimensiones: el.dimensiones,
      width: el.width,
      height: el.height,
      x: el.x,
      y: el.y
    });
  });
} else {
  console.log('No se pudieron encontrar elementos en el store');
}

// 2. Verificar datos serializados
const serializedData = localStorage.getItem('inventory-smart-canvas-state');
if (serializedData) {
  try {
    const parsed = JSON.parse(serializedData);
    console.log('Datos serializados encontrados');
    console.log('Elementos en JSON:', parsed.elementos?.length || 0);

    if (parsed.elementos) {
      parsed.elementos.forEach((el, idx) => {
        console.log(`Elemento serializado ${idx + 1}:`, {
          id: el.id,
          tipo: el.tipo,
          dimensiones: el.dimensiones,
          canvas: el.canvas,
          posicion: el.posicion
        });
      });
    }
  } catch (e) {
    console.error('Error parseando datos serializados:', e);
  }
} else {
  console.log('No hay datos serializados en localStorage');
}

console.log('=== FIN DEBUG ===');
