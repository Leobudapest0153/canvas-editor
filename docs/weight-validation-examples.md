# Ejemplos de Validaciones de Peso

## Nuevas Funciones de Validación de Capacidad vs Peso Actual

### 1. Validación General de Capacidad vs Peso Actual

```javascript
import { useWeightValidation } from '@/inventory-smart/composables/useWeightValidation.js'

const { validarCapacidadMaximaVsPesoActual } = useWeightValidation()

// Validar que una nueva capacidad no sea menor al peso actual en uso
const resultado = validarCapacidadMaximaVsPesoActual('elemento-123', 'elementos', 50)

// Resultado de ejemplo:
{
  valido: false,
  pesoActual: 75.5,
  capacidadPropuesta: 50,
  deficit: 25.5,
  mensaje: "La capacidad propuesta (50.00 kg) es menor al peso actual en uso (75.50 kg). Falta: 25.50 kg."
}
```

### 2. Validación Específica para Elementos

```javascript
const { validarPesoMaximoElemento } = useWeightValidation()

// Validar pesoMaximo de un elemento específico
const resultado = validarPesoMaximoElemento('estanteria-001', 100)

// Resultado válido:
{
  valido: true,
  pesoActual: 45.2,
  capacidadPropuesta: 100,
  deficit: 0,
  mensaje: "Capacidad válida. Peso actual en uso: 45.20 kg."
}
```

### 3. Validación Específica para Plantas

```javascript
const { validarPesoMaximoSoportadoPlanta } = useWeightValidation()

// Validar pesoMaximoSoportado de una planta específica
const resultado = validarPesoMaximoSoportadoPlanta('planta-almacen', 500)

// Resultado con capacidad ilimitada:
{
  valido: true,
  pesoActual: 0,
  capacidadPropuesta: 0,
  deficit: 0,
  mensaje: "Capacidad ilimitada establecida correctamente."
}
```

## Casos de Uso Prácticos

### Validación en Formularios de Propiedades

```javascript
// En PropiedadesPanel.vue o similar
const validarCambioPesoMaximo = (nuevoPesoMaximo) => {
  const elementoId = elementoSeleccionado.value.id
  const resultado = validarPesoMaximoElemento(elementoId, nuevoPesoMaximo)
  
  if (!resultado.valido) {
    // Mostrar error al usuario
    mostrarError(resultado.mensaje)
    return false
  }
  
  // Continuar con la actualización
  return true
}
```

### Validación en Tiempo Real

```javascript
// Watch para validar automáticamente cuando cambian los valores
watch(
  () => edited.value.pesoMaximo,
  (nuevoPesoMaximo) => {
    if (elementoSeleccionado.value) {
      const resultado = validarPesoMaximoElemento(
        elementoSeleccionado.value.id, 
        nuevoPesoMaximo
      )
      
      // Actualizar UI con el resultado
      pesoMaximoError.value = resultado.valido ? null : resultado.mensaje
    }
  }
)
```

### Validación Antes de Guardar Cambios

```javascript
const guardarCambios = async () => {
  // Validar peso máximo antes de guardar
  const resultadoPeso = validarPesoMaximoElemento(
    elementoSeleccionado.value.id,
    edited.value.pesoMaximo
  )
  
  if (!resultadoPeso.valido) {
    toast.error(`Error de capacidad: ${resultadoPeso.mensaje}`)
    return
  }
  
  // Continuar con el guardado...
  await actualizarElemento(edited.value)
  toast.success('Elemento actualizado correctamente')
}
```

## Mensajes de Respuesta

### Tipos de Mensajes

1. **Capacidad válida sin elementos**:
   - `"Capacidad válida. No hay elementos en uso actualmente."`

2. **Capacidad válida con elementos**:
   - `"Capacidad válida. Peso actual en uso: 45.20 kg."`

3. **Capacidad insuficiente**:
   - `"La capacidad propuesta (50.00 kg) es menor al peso actual en uso (75.50 kg). Falta: 25.50 kg."`

4. **Capacidad ilimitada**:
   - `"Capacidad ilimitada establecida correctamente."`

5. **Error de entrada**:
   - `"La capacidad máxima debe ser un número válido mayor o igual a 0."`

## Integración con el Sistema Existente

Las nuevas funciones se integran perfectamente con el sistema existente:

- Mantienen la misma estructura de respuesta que otras validaciones
- Utilizan las mismas funciones base (`calcularPesoTotal`)
- Son compatibles con el sistema de tipos ('plantas', 'elementos', 'contenedores')
- Proporcionan mensajes descriptivos para la UI
