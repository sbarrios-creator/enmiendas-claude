# Design System — Gestión de Enmiendas UPCH
> Aplica a los 4 pasos del wizard: Seleccionar Documentos, Subir Documentos, Redacción de Cambio, Resumen.

---

## 1. Colores

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#C41E3A` | Botón primario, active states, bordes de foco, badges |
| `primary-hover` | `#A01828` | Hover de botón primario |
| `primary-light` | `#C41E3A/10` | Fondo de badges, filas activas |
| `primary-ring` | `#C41E3A/40` | Focus ring en inputs |
| `danger` | `red-600` | Acciones destructivas, íconos de eliminar |
| `danger-bg` | `red-50` | Fondo hover de botón destructor |
| `success` | `green-500` | Pasos completados en wizard, estados subidos |
| `warning` | `amber-600` | Alertas / documentos pendientes |
| `warning-bg` | `amber-50` | Fondo de alertas |
| `surface` | `white` | Fondo de cards, modales, tablas |
| `surface-alt` | `gray-50` | Fondo de headers de tabla, filas alternas |
| `border` | `gray-200` | Bordes de cards, tablas, separadores |
| `border-input` | `gray-300` | Bordes de inputs en reposo |
| `text-primary` | `gray-900` | Títulos, labels principales |
| `text-secondary` | `gray-700` | Texto de contenido |
| `text-muted` | `gray-500` | Placeholders, metadata |
| `text-disabled` | `gray-400` | Texto deshabilitado |

---

## 2. Tipografía

| Rol | Clases Tailwind | Uso |
|-----|----------------|-----|
| **Título de sección** | `text-sm font-semibold text-gray-900` | Encabezado de cada paso |
| **Subtítulo / label** | `text-xs font-semibold text-gray-700 uppercase tracking-wide` | Encabezados de tabla, categorías |
| **Cuerpo** | `text-sm text-gray-700` | Contenido general |
| **Cuerpo pequeño** | `text-xs text-gray-600` | Metadata, fechas, IDs |
| **Label de campo** | `text-sm font-semibold text-gray-700` | Labels de formulario (siempre visible, no solo placeholder) |
| **Placeholder** | `placeholder-gray-400` | Hint en inputs vacíos |
| **Badge / chip** | `text-xs font-semibold` | Etiquetas de estado |
| **Botón** | `text-sm font-medium` | Todos los botones |
| **Categoría activa** | `text-xs font-semibold text-[#C41E3A] uppercase tracking-wide` | Categorías de documentos seleccionadas |

---

## 3. Botones

### Primario (acción principal de cada paso)
```
px-4 py-2 bg-[#C41E3A] text-white rounded hover:bg-[#A01828]
disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium
```
- **Regla**: Solo 1 botón primario por vista.
- **Íconos**: ninguno (texto plano con flecha `→`).

### Secundario (Volver)
```
px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50
transition-colors text-sm font-medium
```

### Destructivo (eliminar fila, descartar)
```
p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors
```
- Nunca usar `bg-red-*` como estado base — solo en hover.

### Toggle / Tab (filtros activo/inactivo)
```
/* Activo   */ px-4 py-1.5 rounded text-sm font-medium bg-[#C41E3A] text-white transition-colors
/* Inactivo */ px-4 py-1.5 rounded text-sm font-medium bg-white border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors
```
- Usado en: filtros de categoría (paso 1), filtros de estado (paso 2), botones Sí/No (paso 3).

### Icono solo (acción secundaria en tabla)
```
w-7 h-7 flex items-center justify-center rounded text-gray-400
hover:text-[#C41E3A] hover:bg-[#C41E3A]/10 transition-colors
```

---

## 4. Inputs y Formularios

### Input de texto / búsqueda
```
w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-700
placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A]
transition-colors
```

### Textarea (auto-creciente)
```
w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-700
placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A]
resize-none overflow-hidden transition-colors
```

### Select / Dropdown
```
w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-700
focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/40 focus:border-[#C41E3A]
```

### Checkbox
```
accent-[#C41E3A] cursor-pointer w-4 h-4
```

### Label de campo (obligatorio)
```html
<label class="block mb-1.5 text-sm font-semibold text-gray-700">
  Nombre del campo <span class="text-[#C41E3A]">*</span>
</label>
```

### Reglas de formulario
- Label siempre visible — nunca solo placeholder.
- Focus ring consistente: `focus:ring-2 focus:ring-[#C41E3A]/40` en todos los inputs.
- Campos requeridos marcados con `*` en rojo.
- Errores van **bajo** el campo en `text-xs text-red-600 mt-1`.

---

## 5. Cards y Contenedores

### Card estándar
```
border border-gray-200 rounded-sm bg-white shadow-sm
```

### Card colapsable (sección con toggle)
```
/* Wrapper  */ border border-gray-200 rounded-sm overflow-hidden
/* Header   */ px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer
               select-none hover:bg-gray-50 transition-colors
/* Contenido */ border-t border-gray-200 p-4
```

### Card seleccionable (paso 1)
```
border border-gray-200 rounded-sm p-3 cursor-pointer transition-colors
hover:border-[#C41E3A]/40 hover:bg-[#C41E3A]/5
/* Seleccionada */ border-[#C41E3A] bg-[#C41E3A]/5
```

### Modal
```
/* Overlay  */ fixed inset-0 bg-black/50 flex items-center justify-center z-50
/* Caja     */ bg-white rounded-sm shadow-xl w-full max-w-lg mx-4
/* Header   */ px-6 py-4 border-b border-gray-200 flex items-center justify-between
/* Body     */ px-6 py-4
/* Footer   */ px-6 py-4 border-t border-gray-200 flex justify-end gap-3
```

### Alerta / aviso
```
/* Warning */ flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-800
/* Info    */ flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-sm text-sm text-blue-800
```

---

## 6. Tablas

### Estructura base
```
/* Wrapper scrollable */ overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200
/* Tabla              */ w-full border-collapse table-fixed text-sm
/* thead              */ bg-gray-50 sticky top-0 z-10
/* th                 */ px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200
/* tbody tr           */ border-b border-gray-100 hover:bg-[#C41E3A]/5 transition-colors
/* td                 */ px-3 py-2 text-sm text-gray-700
```

### Fila de entrada persistente (nuevo registro)
```
/* tr   */ bg-gray-50/60 border-t border-dashed border-gray-200
/* td   */ px-2 py-1.5 align-top border-r border-gray-100
/* input/textarea */ w-full px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white
                     focus:outline-none focus:ring-1 focus:ring-[#C41E3A] placeholder-gray-300
                     resize-none overflow-hidden
```

### Fila en edición inline
```
/* tr activa */ bg-[#C41E3A]/5 ring-1 ring-inset ring-[#C41E3A]/30
/* textarea  */ w-full px-2 py-1.5 text-sm border border-[#C41E3A]/40 rounded bg-white
                focus:outline-none focus:ring-1 focus:ring-[#C41E3A] resize-none overflow-hidden
```

---

## 7. Badges y Estado

| Estado | Clases |
|--------|--------|
| Activo / Sí | `px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] text-xs font-semibold rounded` |
| Completado | `px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded` |
| Pendiente | `px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded` |
| Nuevo documento | `px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded` |
| Error | `px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded` |

---

## 8. Espaciado

| Nivel | Valor | Uso |
|-------|-------|-----|
| XS | `gap-1` / `p-1` | Íconos dentro de botón, gaps internos |
| S | `gap-2` / `p-2` | Entre elementos inline, padding de badge |
| M | `gap-3` / `p-3` | Entre campos de formulario |
| L | `gap-4` / `p-4` | Padding interno de cards y modales |
| XL | `gap-6` / `p-6` | Separación entre secciones |
| 2XL | `gap-8` / `p-8` | Padding del contenedor principal |

**Regla**: usar siempre múltiplos de 4px. No usar `p-2.5`, `py-1.5` fuera de botones y chips.

---

## 9. Íconos

- **Biblioteca**: SVG inline con `fill="none" stroke="currentColor" viewBox="0 0 24 24"`.
- **Stroke width**: `strokeWidth={2}` para íconos normales, `strokeWidth={1.5}` para íconos grandes.
- **Tamaños**: `w-4 h-4` (inline/tabla), `w-5 h-5` (botones), `w-6 h-6` (destacados).
- **Nunca** usar emojis como íconos.
- Íconos de chevron en colapsables: `transition-transform` con `rotate-90` al expandir.

---

## 10. Navegación entre pasos (botones de acción)

Posición: `flex justify-between mt-4` (todos los pasos con Volver) o `flex justify-end mt-4` (paso 1).

| Paso | Izquierda | Derecha |
|------|-----------|---------|
| 1 – Seleccionar | — | `Siguiente →` (primario) |
| 2 – Subir | `← Volver` (secundario) | `Siguiente →` (primario) |
| 3 – Redacción | `← Volver` (secundario) | `Siguiente →` (primario) |
| 4 – Resumen | `← Volver` (secundario) | `Finalizar →` (primario) |

---

## 11. Anti-patrones a evitar

| ❌ No hacer | ✅ Hacer en su lugar |
|------------|-------------------|
| Mezclar `rounded` y `rounded-sm` en el mismo nivel | Usar `rounded-sm` para cards/inputs, `rounded` solo para badges/chips |
| `focus:ring-[#C41E3A]/30` en unos y `focus:ring-[#C41E3A]/40` en otros | Estandarizar a `focus:ring-2 focus:ring-[#C41E3A]/40` |
| Botones con SVG chevron en unos pasos y texto `→` en otros | Texto plano con flecha unicode `→` / `←` |
| Padding `p-2.5` (no múltiplo de 4px) | `p-2` o `p-3` |
| Labels solo como placeholder (desaparecen al tipear) | Label visible encima del input siempre |
| Shadows inconsistentes (`shadow-xl` en cards, `shadow-sm` en modales) | `shadow-sm` cards normales, `shadow-xl` solo modales |
| `text-gray-600` mezclado con `text-gray-700` para cuerpo de texto | Estandarizar cuerpo en `text-gray-700` |
| Hover estados sin `transition-colors` | Agregar `transition-colors` a todo elemento interactivo |
