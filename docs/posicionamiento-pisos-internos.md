# Posicionamiento Automático de Pisos/Niveles Internos

## Resumen

Se ha implementado la generación automática de posiciones internas para pisos/niveles dentro de cuartos/espacios, calculando las coordenadas (x,y) para vista frontal (XZ) basándose en las dimensiones del contenedor.

## Funcionamiento

### 1. Sistema de Coordenadas

- **Vista XY (aérea)**: X=ancho, Y=largo
- **Vista XZ (frontal)**: X=ancho, Y=altura desde el suelo
- **Conversión**: `CM_TO_PX = 10` (1 cm = 10 pixels)

### 2. Lógica de Apilamiento Vertical

Los pisos/niveles se apilan verticalmente desde abajo hacia arriba:

```javascript
// Ejemplo: Cuarto de 3m ancho × 2m largo × 4m alto con 3 pisos de 1.3m cada uno
let acumuladoAlto = 0 // Comienza desde el suelo

pisos.forEach((piso, idx) => {
  const altoPiso = 1.3 // metros -> 130 cm
  
  // Posición X: centrar horizontalmente
  const posX = (300 - 300) / 2 = 0 cm
  
  // Posición Y: desde el sistema de coordenadas del canvas (Y=0 arriba)
  const alturaDesdeAbajo = acumuladoAlto + altoPiso
  const posY = 400 - alturaDesdeAbajo // 400cm es el alto total
  
  // Piso 1: Y = 400 - 130 = 270 cm (desde arriba)
  // Piso 2: Y = 400 - 260 = 140 cm
  // Piso 3: Y = 400 - 390 = 10 cm
  
  acumuladoAlto += altoPiso // 130, 260, 390
})
```

### 3. Estructura de Datos Generada

Cada piso interno se crea como un elemento independiente:

```javascript
{
  id: "cuarto_1234_piso_1",
  nombre: "Piso 1",
  tipo: "pisos",
  padre: "cuarto_1234", // referencia al cuarto/espacio padre
  plantaId: "planta_1",
  x: 0, // centrado horizontalmente (en pixels)
  y: 2700, // posición vertical (en pixels)
  alturaRespectoAlSuelo: 0, // altura Z en cm desde el suelo
  dimensiones: { ancho: 300, largo: 200, alto: 130 }, // en cm
  width: 3000, // ancho en pixels para canvas
  height: 1300, // alto en pixels para vista XZ
  capacidadCarga: 1000, // kg
  tiposProductos: ["electrodomesticos", "muebles"],
  tipoZona: "almacenaje",
  permiteFragiles: false,
  meta: {
    esPisoInterno: true,
    indicePiso: 1,
    contenedorPadre: "cuarto_1234"
  }
}
```

### 4. Relaciones Padre-Hijo

- El elemento contenedor (cuarto/espacio) tiene propiedad `hijos: ["piso_1", "piso_2", ...]`
- Cada piso tiene propiedad `padre: "cuarto_id"`
- Se establece navegación jerárquica: Cuarto → Pisos → Elementos

## Funciones Principales

### `crearDesdeFormulario(payload)`

Función principal que:
1. Procesa datos del formulario `AgregarCuartoModal`
2. Convierte dimensiones de metros a centímetros
3. Genera posiciones internas automáticamente
4. Crea relaciones padre-hijo
5. Inserta elementos en el store

### `regenerarPosicionesPisos(elementoPadreId, nuevasDimensiones)`

Función helper para recalcular posiciones cuando cambian las dimensiones del contenedor:

```javascript
// Ejemplo de uso:
const nuevasDims = { ancho: 400, largo: 300, alto: 500 } // en cm
regenerarPosicionesPisos("cuarto_1234", nuevasDims)
```

## Vista Frontal (XZ) - Consideraciones

1. **Sistema de Coordenadas Invertido**: En el canvas, Y=0 está arriba, pero los pisos se miden desde abajo
2. **Centrado Horizontal**: Los pisos se centran automáticamente en el ancho del contenedor
3. **Apilamiento Secuencial**: Los pisos se apilan uno encima del otro sin espacios
4. **Conversión a Pixels**: Todas las coordenadas se convierten usando `CM_TO_PX`

## Casos de Uso

### Crear Cuarto con Pisos

```javascript
const payload = {
  tipo: "cuarto",
  datosGenerales: {
    nombre: "Almacén Principal",
    color: "#3B82F6",
    tipoSeleccionado: "almacen",
    orientacion: "norte"
  },
  dimensiones: {
    forma: "rectangular", 
    largo: 5, // metros
    ancho: 3, // metros  
    alto: 4, // metros
    capacidadCarga: 5000 // kg
  },
  pisosNiveles: [
    {
      nombre: "Piso Inferior",
      alto: 1.5, // metros (auto-completa largo/ancho del contenedor)
      tipoZona: "almacenaje",
      tiposProductos: ["electrodomesticos"],
      permiteFragiles: false
    },
    {
      nombre: "Piso Superior", 
      alto: 2.5, // metros
      tipoZona: "picking",
      tiposProductos: ["muebles", "decoracion"],
      permiteFragiles: true
    }
  ]
}

const resultado = crearDesdeFormulario(payload)
// resultado.pisosGenerados contiene los 2 pisos con posiciones calculadas
```

### Navegación Jerárquica

Una vez creado el cuarto:
1. **Vista de Planta**: Muestra el cuarto como un rectángulo
2. **Doble click en Cuarto**: Navega a vista interna mostrando los pisos
3. **Vista XZ**: Los pisos aparecen apilados verticalmente
4. **Doble click en Piso**: Navega dentro del piso para colocar elementos

## Beneficios

1. **Automatización**: Elimina cálculo manual de posiciones
2. **Consistencia**: Asegura alineación y apilamiento correcto
3. **Escalabilidad**: Maneja cualquier cantidad de pisos/niveles
4. **Integración**: Compatible con sistema de navegación jerárquica
5. **Flexibilidad**: Permite personalización posterior de posiciones

## Notas Técnicas

- Los pisos generados tienen `props.catalogVisible: false` (no aparecen en catálogo)
- Se marca con `props.generadoAutomaticamente: true` para identificación
- Compatible con sistema de validación de colisiones existente
- Respeta las dimensiones auto-completadas del formulario
- Conserva todas las propiedades de configuración (zona, productos, etc.)