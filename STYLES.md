# Guía de Estilos — Flujo de Enmiendas

> Referencia para mantener consistencia visual entre pasos y ramas. Basado en Pasos 1, 2 y 3.

---

## Color Principal

| Token | Valor | Uso |
|-------|-------|-----|
| Primary | `#C41E3A` | Botones primarios, headers de sección, focus ring |
| Primary hover | `#A01828` | Hover de botones primarios |

---

## Botones

### Primario
```
px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium
```

### Primario con ícono
```
inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-sm font-medium
```

### Secundario / Outline
```
px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium
```

### Primario pequeño (acciones dentro de tabla/lista)
```
inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] transition-colors text-xs font-medium
```

### Disabled (agregar a cualquier botón primario)
```
disabled:bg-gray-300 disabled:cursor-not-allowed
```

### Navegación (pie de cada paso)
- **Volver:** `px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium`
- **Continuar:** `px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium`

---

## Cards / Secciones

### Contenedor principal de card
```
bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
```

### Header rojo de sección (categoría de documentos)
```
bg-[#C41E3A] px-4 py-3
```
Texto interno: `text-white text-base font-normal m-0`

### Header gris de card (sub-sección con toggle SI/NO)
```
bg-gray-50 px-4 py-3 border-b border-gray-200
```

### Cuerpo de card
```
p-4 space-y-4
```

---

## Tipografía

| Elemento | Clases |
|----------|--------|
| Título de paso | `text-base font-semibold text-gray-900` |
| Descripción de paso | `text-sm text-gray-600` |
| Título de card/sección | `text-sm font-semibold text-gray-900 m-0` |
| Subtítulo de card | `text-sm text-gray-600 m-0 mt-1` |
| Label de campo | `block mb-1.5 text-sm font-semibold text-gray-700` |
| Helper / hint | `text-xs text-gray-400` |
| Texto de tabla header | `text-xs font-semibold text-gray-600` (o `uppercase tracking-wider` en tablas de investigadores) |

---

## Inputs y Formularios

### Input de texto
```
w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent
```

### Textarea
```
w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent
```

### Select
```
w-full px-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent bg-white
```

### Input con ícono (buscador)
```
/* Wrapper */ relative flex-1
/* Ícono */  absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
/* Input */  w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent
```

---

## Cajas de información

### Advertencia (amber)
```
border-l-4 border-amber-400 bg-amber-50 p-4 rounded
```
Texto: `text-sm text-gray-700 m-0`

### Información / Nota (blue)
```
bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r
```
Texto: `text-sm text-blue-900 m-0`

---

## Tablas

### Contenedor
```
overflow-x-auto rounded-lg border border-gray-200 overflow-hidden
```

### Con scroll vertical (muchas filas)
```
overflow-x-auto overflow-y-auto max-h-64
```

### Header sticky
```
thead: bg-gray-100 sticky top-0 z-10
th:    px-3 py-2 text-left font-semibold text-gray-600
```

### Filas alternadas
```
/* Par */   bg-white
/* Impar */ bg-gray-50
tbody: divide-y divide-gray-100
```

### Celda con texto truncado
```
td: px-3 py-2 max-w-[Npx]
p:  truncate m-0
```

---

## Badges / Pills

### Genérico
```
inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
```

| Variante | Clases adicionales |
|----------|--------------------|
| Verde (éxito) | `bg-green-100 text-green-800` |
| Rojo (eliminar/retirar) | `bg-red-100 text-red-800` |
| Azul (info/global) | `bg-blue-100 text-blue-700` |
| Gris (neutral) | `bg-gray-100 text-gray-600` |
| Amber (advertencia) | `bg-amber-100 text-amber-700` |

---

## Iconos de estado

| Estado | Color | Path SVG |
|--------|-------|----------|
| Éxito ✓ | `text-green-500` | `M5 13l4 4L19 7` |
| Advertencia ⚠ | `text-amber-400` | `M12 9v2m0 4h.01m-6.938 4h13.856...` |
| Editar ✏ | `text-blue-600` / `bg-blue-600 text-white` | `M11 5H6a2 2 0...` |
| Eliminar ✕ | `bg-red-100 text-red-600` | `M6 18L18 6M6 6l12 12` |

Tamaño estándar icono en botón de acción dentro de tabla: `w-6 h-6` (botón) + `w-3 h-3` (SVG)

---

## Toggle SI / NO

```jsx
/* Botón activo */
px-6 py-2 rounded-md text-sm font-medium bg-[#C41E3A] text-white shadow-sm

/* Botón inactivo */
px-6 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
```

---

## Modales

### Overlay
```
fixed inset-0 z-50 flex items-center justify-center
/* Fondo */ absolute inset-0 bg-black/50
```

### Contenedor
```
relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col
```

### Header del modal
```
flex items-center justify-between px-6 py-4 border-b border-gray-200
```

### Body del modal (scrolleable)
```
overflow-y-auto flex-1 px-6 py-5 space-y-4
```

### Footer del modal
```
flex gap-3 px-6 py-4 border-t border-gray-200
```

---

## Notas para el Paso 4 (Summary)

El Paso 4 (`Summary.tsx`) aún **no aplica estos estilos estandarizados**. Al pivotear a su implementación, usar esta guía como referencia para:
- Headers de sección → `bg-[#C41E3A] px-4 py-3`
- Cards → `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`
- Botones → estándar primario/secundario definido arriba
- Tipografía → `text-base font-semibold text-gray-900` para títulos, `text-sm text-gray-600` para descripciones
