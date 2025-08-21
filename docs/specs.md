# **VISIÓN GENERAL**

Diseñar un módulo / librería que permita 'dibujar' mediante arrastre (desde un listado de elementos) la distribución de las plantas de un edificio: anaqueles, refrigeradores, estantes, mesas, etc., Dicho de otra forma: un editor visual jerárquico con relaciones padre-hijo, navegación entre niveles, propiedades dinámicas y pintado de elementos con medidas proporcionales.

# **ESPECIFICACIONES**

**Canvas proporcional, responsive y con soporte de controles**

Necesitas escalado, zoom y drag de la vista manteniendo proporciones. Un canva o área de trabajo por cada planta o nivel del edificio. Cada planta tendrá sus propiedades editables, como alto, ancho, largo, peso máximo que soporta, etc.

**Elementos con propiedades estáticas \+ personalizadas**

Sistema de metadatos que vincule cada “figura” dibujada con un objeto JS que contenga sus propiedades.

**Jerarquía padre-hijo (plantas → anaqueles → estantes → cajas, etc.)**

Navegación entre niveles al dar doble click a un elemento (como un “drill down” para ver cada vez con más detalles más a fondo en el elemento).

**Panel de niveles o plantas del edificio**

Cada elemento podrá posicionarse en la planta que se esté visualizando. Debe existir un panel en la parte superior que permita visualizar el listado de plantas, seleccionar, agregar, editar o eliminar una de estas (validando si existen elementos dentro).

**Drag & Drop desde lista externa de elementos al lienzo**

Debe ser posible arrastrar desde una lista lateral y soltar en el área de trabajo (planta) distintos elementos predefinidos.

**Mover elementos entre capas**

Requiere “reparenting” dinámico (cambiar el padre de un elemento y que se redibuje en su nueva capa). Podría definirse una “caja” en un lateral de la pantalla (una sección del menú lateral) donde guardar elementos que quieran moverse, como una especie de buffer o intermediario: saco el elemento de la caja 1, lo guardo en buffer, me voy a la caja 3, saco el elemento del buffer y lo agrego.

**Entrada y salida en un solo objeto de configuración**

El lienzo (de todo el edificio con sus plantas) y su estado deben poder serializar/deserializar fácilmente.

**Historial de cambio**

Se debe poder deshacer / rehacer los cambios que se realicen sobre el lienzo.

**Soporte de distintos ejes de visualización**

Permitir la visualización y ordenación de los elementos en el eje XY (vista desde arriba) y en el eje ZX o ZY (vistas laterales, por cada pared). Asimismo reaccionar / señalar cuando se produzcan colisiones entre los elementos, mediante bordes rojos, por ejemplo.

En las vistas laterales sólo se mostrarán los elementos topados a la pared (o muy cercanos), ya que solo interesa esa vista para ordenar elementos colgados en las paredes (y su ubicación respecto a los del suelo: que no choquen)

**Restricciones de movimiento**

No permitir que los elementos toquen elementos delimitadores, esto si se toma la idea de: definir elementos que simulen la ubicación de escaleras, esquinas, etc., y que no permitan ubicar otros elementos sobre estos.

**Manejar un catálogo de elementos predefinidos**

Definir un catálogo de elementos predefinidos como:

1. Anaquel de 3 pisos
2. Estantes 2 pisos
3. Barril
4. Pila de barriles (3).

Estos deben poseer nombre, forma (circular, rectangulo), color base, ancho, largo, alto, y peso máximo soportado. Además debe permitir crear nuevos elementos predefinidos y guardarlos.

Definir propiedad de ubicación: suelo o pared para ver qué elementos pueden moverse en su eje Z

Aquí podría ser útil también manejar un elemento “contenedor” que solo representa un “espacio” donde guardar N cosas. Este elemento poseerá una grid para estructurar el elemento, por ejemplo los estantes con sus N filas y N columnas.

**Personalización de elementos**

Permitir modificar el nombre y color del elemento. El identificador, en cambio, debe formarse a partir del nombre del elemento predefinido \+ guión \+ número random (ejemplo: anaquel-2321aqe)

# **TECNOLOGÍAS**

Framework: Vue 3 (JS) \+ Tailwind CSS

Librería de gráficos/interacciones: Konva
