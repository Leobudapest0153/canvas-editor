# Servicio de Productos de Contenedor

## Descripción
InventorySmart puede recibir un servicio externo para obtener el listado de productos almacenados en los contenedores.

## Configuración del Servicio

El servicio debe tener la siguiente estructura:

```javascript
{
  name: 'containerProducts',
  type: 'container_products',
  description: 'Obtiene productos almacenados en un contenedor',
  handler: async ({ containerId, filter, pagination }) => {
    // Tu lógica aquí
    const response = await fetch(`/api/containers/${containerId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter, pagination })
    });
    
    const data = await response.json();
    
    return {
      products: data.products,
      totalCount: data.total,
      pagination: data.pagination
    };
  }
}
```

## Parámetros de Entrada

### containerId (string, requerido)
ID o código del contenedor del cual se quieren obtener los productos.

### filter (string, opcional)
Texto de filtro para búsqueda en código o descripción de productos.

### pagination (object, opcional)
```javascript
{
  page: 1,        // Página actual (empezando en 1)
  pageSize: 10    // Elementos por página
}
```

## Respuesta Esperada

```javascript
{
  products: [
    {
      codigo: "PROD001",               // Código del producto (requerido)
      descripcion: "Descripción...",   // Descripción del producto (requerido)
      cantidad: 50,                    // Cantidad almacenada (requerido)
      fechaVencimiento: "2024-12-31"   // Fecha de vencimiento (opcional, formato ISO)
    }
  ],
  totalCount: 25,     // Total de productos (para paginación)
  pagination: {       // Información de paginación (opcional)
    page: 1,
    pageSize: 10,
    totalPages: 3
  }
}
```

## Uso en InventorySmart

```vue
<template>
  <InventorySmart 
    :configCanvas="configCanvas"
    :externalServices="[containerProductsService]"
    @configUpdated="handleConfigUpdate"
  />
</template>

<script setup>
import InventorySmart from './inventory-smart/InventorySmart.vue'

const containerProductsService = {
  name: 'containerProducts',
  type: 'container_products',
  description: 'Obtiene productos almacenados en un contenedor',
  handler: async ({ containerId, filter, pagination }) => {
    // Tu implementación aquí
  }
}
</script>
```

## Visualización

Los productos se muestran automáticamente en el panel de propiedades cuando se selecciona un contenedor que tiene un código definido. La lista incluye:

- Código del producto
- Descripción 
- Cantidad almacenada
- Fecha de vencimiento (si está disponible, con código de colores)
- Filtro de búsqueda
- Paginación automática

## Notas

- Solo aparece la sección de productos para elementos de tipo "contenedores"
- El contenedor debe tener un código definido para mostrar los productos
- Las fechas de vencimiento se muestran con colores según proximidad:
  - Rojo: vencido
  - Naranja: vence en 7 días o menos
  - Amarillo: vence en 30 días o menos
  - Gris: normal