# Guía de Pruebas: Transformer con Último Estado Válido

## 🧪 Plan de Pruebas Manuales

### Prerequisito
- Tener el proyecto corriendo: `npm run dev`
- Abrir el navegador en la aplicación
- Crear una planta con polígono definido o usar una existente

---

## ✅ Test 1: Estirar Hasta Límite de Planta (Polígono)

### Objetivo
Verificar que al estirar un elemento hasta el borde del polígono de la planta, se queda en el último tamaño válido sin revertir al original.

### Pasos
1. Abrir una planta con polígono definido
2. Agregar un elemento rectangular (estantería, producto, etc.)
3. Posicionarlo cerca del centro de la planta
4. Presionar `E` para activar modo edición (transformer visible)
5. Arrastrar un anchor/handle del transformer hacia el borde del polígono
6. **Continuar arrastrando más allá del borde** (intentar que el elemento salga)
7. Soltar el mouse

### Resultado Esperado ✓
- ✅ El elemento **queda estirado hasta el último punto válido** (topado en el borde)
- ✅ **NO** salta de regreso al tamaño original
- ✅ **NO** aparece toast de error "El elemento debe permanecer..."
- ✅ El elemento permanece completamente dentro del polígono

### Resultado NO Deseado ✗
- ❌ El elemento revierte completamente al tamaño original
- ❌ Aparece toast de advertencia innecesario
- ❌ El elemento se "encoge" visualmente al soltar

---

## ✅ Test 2: Estirar Hasta Colisión con Otro Elemento

### Objetivo
Verificar que al estirar un elemento hasta colisionar con otro, se queda topado sin revertir.

### Pasos
1. En una planta, agregar dos elementos adyacentes (ej: dos estanterías)
2. Dejar un espacio de ~50px entre ellos
3. Seleccionar el primer elemento y presionar `E` (modo edición)
4. Arrastrar el handle derecho hacia el segundo elemento
5. **Continuar arrastrando hasta que colisionen** (intentar solapar)
6. Soltar el mouse

### Resultado Esperado ✓
- ✅ El elemento **queda estirado hasta tocar** el segundo elemento
- ✅ **NO** revierte al tamaño original
- ✅ **NO** aparece toast de error sobre colisiones
- ✅ Los elementos quedan topados sin solaparse

### Resultado NO Deseado ✗
- ❌ El elemento revierte completamente
- ❌ Toast de error sobre colisión
- ❌ Hay espacio visible entre los elementos (no quedó topado)

---

## ✅ Test 3: Dimensiones Inválidas del Producto (Debe Revertir)

### Objetivo
Verificar que las validaciones de dimensiones del producto **sí muestran error y sí revierten**, ya que son restricciones reales del negocio.

### Pasos
1. Agregar un producto que tenga **dimensiones máximas definidas** (ej: max ancho 200cm)
2. Revisar sus dimensiones en el panel de propiedades
3. Presionar `E` para modo edición
4. Intentar estirar el producto **más allá** de su dimensión máxima permitida
5. Soltar el mouse

### Resultado Esperado ✓
- ✅ El elemento **SÍ revierte** al tamaño original (comportamiento correcto)
- ✅ **SÍ aparece toast** explicando el error de dimensiones
- ✅ El mensaje indica claramente el problema (ej: "El ancho no puede superar 200cm")

### Resultado NO Deseado ✗
- ❌ El elemento se queda estirado más allá del límite permitido
- ❌ No aparece ningún mensaje de error
- ❌ El sistema permite dimensiones inválidas

---

## ✅ Test 4: Múltiples Intentos de Estirar (Comportamiento Continuo)

### Objetivo
Verificar que se puede estirar progresivamente hasta el límite sin problemas.

### Pasos
1. Agregar un elemento pequeño en el centro de la planta
2. Presionar `E` para modo edición
3. Estirar el elemento hacia el borde del polígono en varias etapas:
   - Primera vez: estirar 50px
   - Segunda vez: estirar otros 50px
   - Tercera vez: estirar hasta el borde
   - Cuarta vez: **intentar estirar más allá** del borde
4. Observar el comportamiento en cada etapa

### Resultado Esperado ✓
- ✅ Cada estiramiento **se mantiene** (no revierte)
- ✅ El último estado válido **se actualiza progresivamente**
- ✅ Cuando se alcanza el límite, se queda topado
- ✅ **NO** aparecen toasts en ninguna etapa (a menos que sea error de dimensiones)

---

## ✅ Test 5: Estirar en Esquina (Múltiples Límites)

### Objetivo
Verificar el comportamiento cuando se estira en una esquina donde hay límites en X y Y.

### Pasos
1. Posicionar un elemento cerca de una esquina del polígono
2. Presionar `E` para modo edición
3. Arrastrar el handle de la esquina diagonal hacia afuera
4. Intentar que salga tanto en X como en Y
5. Soltar

### Resultado Esperado ✓
- ✅ El elemento queda **topado en la esquina**
- ✅ Ambas dimensiones (ancho y alto) están en su **máximo válido**
- ✅ NO revierte
- ✅ NO hay toasts

---

## 📊 Checklist de Validación

Después de ejecutar todos los tests:

- [ ] Test 1: Límite de planta - **PASS**
- [ ] Test 2: Colisión con otro elemento - **PASS**
- [ ] Test 3: Dimensiones inválidas - **PASS** (revierte correctamente)
- [ ] Test 4: Múltiples intentos - **PASS**
- [ ] Test 5: Esquina - **PASS**

---

## 🐛 Problemas Conocidos a Verificar

### 1. Rendimiento durante transformación
- ¿Hay lag visible al estirar elementos grandes?
- ¿Las validaciones en `handleTransformMove` impactan la fluidez?

### 2. Console logs
- Revisar la consola del navegador
- Buscar logs con `[transform-debug]`, `[transform-move-validation]`
- No debería haber errores ni warnings (solo debug info)

### 3. Estado del transformer
- Después de alcanzar un límite, ¿el transformer se mantiene correctamente configurado?
- ¿Los handles siguen funcionando para estirar en otras direcciones?

---

## 🔍 Debugging

Si encuentras un problema, revisar:

1. **Console del navegador**: buscar errors o warnings relacionados con transform
2. **Datos del elemento**: verificar en panel de propiedades que las dimensiones se guardaron correctamente
3. **Undo/Redo**: verificar que funciona correctamente después de una transformación que alcanzó el límite

### Logs clave a buscar:
```
[transform-debug] applied last valid state
[transform-move-validation] (warnings si hay errores en validación)
[transform-apply-valid] (cuando se aplica el último estado válido)
```

---

## 📝 Notas Adicionales

- Los cambios **NO** afectan el comportamiento de drag (arrastre)
- Solo afectan el comportamiento de **transform** (redimensionar con handles)
- La validación de dimensiones **se mantiene estricta** (como debe ser)
- Las validaciones de límites físicos **se vuelven silenciosas y adaptativas**

---

**Fecha de Creación**: 6 de octubre de 2025  
**Última Actualización**: 6 de octubre de 2025  
**Versión**: 1.0
