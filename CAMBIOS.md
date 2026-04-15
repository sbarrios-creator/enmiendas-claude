# Registro de Cambios

## Versión 2 — Refactorización UI: estilos, tabla de cambios y picker de documentos (rama `version2`)

---

### `STYLES.md` (nuevo archivo)

- Se creó la guía de estilos del proyecto con tokens de color, variantes de botón, estilos de card/sección, tipografía, inputs, tablas, badges, iconos de estado, toggles SI/NO y modales.
- Sirve como referencia para mantener consistencia visual entre pasos y ramas.
- Incluye una nota explícita indicando que el Paso 4 (`Summary.tsx`) aún pendiente de adoptar estos estilos estandarizados.

---

### `src/app/components/DefineChanges.tsx` — Refactorización de la sección "Otros Cambios" y modal

#### Sección "Otros Cambios en Documentos"
- Se reemplazó la vista anterior agrupada por documento (globales separados de específicos, un botón "Agregar" por fila de documento) por una **tabla unificada** que lista todos los cambios independientemente de su alcance.
- La tabla tiene scroll vertical interno (`max-h-64`) y encabezado sticky; columnas: **Cambio**, **Valor Anterior**, **Valor Nuevo**, **Justificación**, **Documentos**, **Acciones**.
- Se añadió un **buscador** sobre la tabla que filtra en tiempo real por campo, valor anterior, valor nuevo y justificación.
- El indicador de progreso (barra + contador "X de N documentos justificados") se simplificó a un contador de cambios totales registrados.
- El botón "Agregar" individual por documento se eliminó; ahora existe un único botón **"Agregar cambio"** en la parte superior de la sección que abre el modal en modo global.

#### Modal "Agregar / Editar cambio"
- Se añadió el nuevo campo **"Cambio a Realizar"** (texto libre) que llena `field` / `customField`. Antes el campo era un `<select>` con opciones predefinidas.
- Los labels "Antes" y "Después" se renombraron a **"Valor Anterior"** y **"Valor Nuevo"** para mayor claridad.
- El selector de alcance (dos botones "Todos / Documentos específicos" + checkboxes) se reemplazó por un **picker de dos columnas**: lista de disponibles con buscador propio y botón "Agregar todos" a la izquierda; lista de seleccionados con botón "Quitar todos" a la derecha.
- La validación del botón de confirmar se actualizó: ahora exige que `field` (o `customField` en modo personalizado) esté completo, además de `newValue` y `justification`.
- El ancho del modal se aumentó de `max-w-xl` a `max-w-2xl` para acomodar el picker de dos columnas.
- Se añadieron los estados `searchQuery` (buscador de tabla) y `docPickerSearch` (buscador del picker), ambos reseteados al cerrar el modal.

---

### `src/app/components/SelectDocuments.tsx` — Ajuste de tamaño de botones de acción

- En la sección "Documentos Nuevos", los botones **Eliminar** y **Descargar** se redujeron de `w-8 h-8` a `w-6 h-6` con iconos de `w-4 h-4` a `w-3 h-3`.
- El botón "Eliminar" cambió de fondo rojo sólido (`bg-[#C41E3A] text-white`) a fondo rojo claro (`bg-red-100 text-red-600 hover:bg-red-200`), alineándose con el patrón de acciones destructivas de la guía de estilos.

---

### `src/app/components/Summary.tsx` — Estandarización visual del Paso 4

#### Headers de sección
- Las secciones **"Cambios declarados"**, **"Cambios a aplicar en otros Documentos"**, **"Documentos modificados"** y **"Documentos Nuevos"** adoptaron el patrón de card con header rojo (`bg-[#C41E3A] px-4 py-3`) y cuerpo `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`.

#### Badges de acción
- Los badges de estado (`getActionBadge`) se simplificaron: se eliminó el borde explícito y se adoptó el patrón `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`.
- El contador de cambios en el header se convirtió en un badge `bg-white/20 text-white` alineado al extremo derecho del header.

#### Caja de advertencia
- La advertencia "Revisión manual requerida" adoptó el estilo de caja amber con borde izquierdo (`border-l-4 border-amber-400 bg-amber-50 p-4 rounded`).

#### Botones de acción en documentos
- Todos los botones de acción en "Documentos modificados" y "Documentos Nuevos" se redujeron de `w-8 h-8` a `w-6 h-6` con iconos de `w-4 h-4` a `w-3 h-3`.

#### Botón "Agregar documento" en Documentos Nuevos
- Se añadió el botón **"Agregar documento"** directamente en el header rojo de la sección "Documentos Nuevos", con estilo `bg-white/20 text-white hover:bg-white/30`.

---

## Versión 2 — Mejoras en Paso 1 y Paso 4 (rama `version2`)

---

### `src/app/App.tsx` — v2

- Se agregó el estado `newDocuments` (tipo `Document[]`) para persistir los documentos nuevos agregados en el Paso 1 a nivel de la aplicación.
- Se pasa `newDocuments` y `onNewDocumentsChange` al componente `SelectDocuments`.
- Se pasa `newDocuments` al componente `Summary` para reflejarlos en el Paso 4.
- Se resetea `newDocuments` al estado inicial cuando el usuario finaliza o reinicia el wizard.

---

### `src/app/components/SelectDocuments.tsx` — v2

- Se convirtió el estado local `documents` en prop controlada desde `App.tsx` (`newDocuments` / `onNewDocumentsChange`), permitiendo que los documentos nuevos persistan al navegar entre pasos.
- Se reemplazó el input de texto "Nombre del documento" en el modal por un **desplegable** con opciones predefinidas: Consentimiento informado, Asentimiento informado, Protocolo de investigación, Brochure del investigador, Manual de procedimientos, Formulario de recolección de datos, Carta de aprobación institucional, Declaración de confidencialidad, Acuerdo de transferencia de material, Plan de manejo de datos, Otro.
- Se eliminó el campo "Tipo de documento" del modal (los nuevos documentos siempre son de tipo `Nuevo`).
- Se eliminó la columna **"REEMPLAZAR"** (checkbox) en la sección "Documentos Nuevos", manteniéndola solo para las demás secciones.
- Se agregó un **botón "Agregar Documentos"** en la esquina superior derecha del header de la sección "Documentos Nuevos", que abre un modal con zona de carga de archivo y confirmación visual al seleccionar.

---

### `src/app/components/Summary.tsx` — v2

#### Sección "Cambios a aplicar en otros Documentos"
- Se reemplazó la agrupación por campo (Información General, Equipo, Otros) por **acordeones agrupados por documento**.
- Cada acordeón muestra el nombre del documento y el conteo de cambios en el header (siempre visible).
- El cuerpo del acordeón tiene **scroll interno** (`max-h-64`) con header de tabla sticky para evitar listas largas sin estructura.
- La tabla se simplificó a 3 columnas: **Versión anterior** (texto tachado en rojo), **Versión nueva** (texto en verde), **Justificación**.
- Los cambios globales aparecen en todos los documentos que los apliquen.

#### Sección "Documentos modificados" (nueva)
- Se agregó una nueva sección con **acordeones por documento**, siguiendo la misma lógica de scroll interno y header visible.
- Cada acordeón expone la **jerarquía de versiones** del documento:
  - ● gris — **Documento vigente (Referencia)**: botones Ver y Descargar.
  - ● ámbar — **Documento con cambios (Principal)**: botones Ver, Descargar y Cambiar nombre.
  - ● verde — **Versión final**: botones Ver, Descargar y Cambiar nombre.

#### Sección "Documentos Nuevos"
- Se conectó la sección al estado global: los documentos agregados en el **Paso 1** se reflejan automáticamente aquí.
- Se eliminó el badge "Paso 1" y el contador de origen para simplificar la vista.
- Se agregó **scroll vertical** (`max-h-56`) con header sticky para manejar listas largas.
- Las acciones de cada fila se reemplazaron por dos botones: **Ver** (ícono de ojo) y **Descargar** (ícono de descarga).

---

## Versión 2 — Rediseño del Paso 3 (rama `version2`)

---

### `src/app/components/DefineChanges.tsx` — Correcciones v2

- **Fix 1**: Se eliminaron las declaraciones de estado `searchChange` y `searchDocument` que estaban declaradas pero nunca utilizadas.
- **Fix 2**: Se eliminó la llamada residual a `setSearchDocument('')` dentro de `handleCloseModal`, que hacía referencia a un estado ya removido.
- **Fix 3**: Se agregó `setActiveDocId(null)` en `handleEditChange` para limpiar el documento activo al abrir el modal en modo edición.
- **Fix 4**: Se muestra el alcance del cambio en el encabezado del modal cuando se está editando (ej. "Todos los documentos" o "2 documento(s)").
- **Fix 5**: Se reforzó la validación en `handleAddChange`: ahora exige que `newValue` y `justification` estén completos, y que `appliesTo` tenga al menos un documento si el cambio no es global.
- **Fix 6a**: Se corrigió la indentación y estructura JSX del encabezado de la **Card 2 (Unidades Operativas)** — el `<div className="flex items-center justify-between">` interno ya cuenta con su propio `</div>` de cierre correctamente anidado dentro del `<div className="bg-gray-50 ...">` padre.
- **Fix 6b**: Se aplicó la misma corrección en el encabezado de la **Card 3 (Equipo de Investigación)**.
- **Fix extra**: `handleSaveEdit` ahora llama a `handleCloseModal()` en lugar de hacer el reset manual de estados, eliminando la llamada huérfana a `setSearchDocument('')` que causaba error de compilación.

---

## Rediseño del flujo de enmiendas (rama `main`)

---

### `src/app/types.ts`

- Se agregó el campo `justification: string` al interface `Change`, permitiendo registrar la justificación de cada cambio en documentos.
- Se agregó el interface `ResearcherChange` para tipificar los cambios en el equipo de investigación (nombre, correo, rol actual, rol propuesto, tipo de cambio y justificación).
- Se agregó el interface `Step3Data` que encapsula todas las respuestas del Paso 3 (modificación de título/resumen, unidades operativas e investigadores), permitiendo que este estado sea compartido entre pasos.

---

### `src/app/App.tsx`

- Se agregó el estado `step3Data` (tipo `Step3Data`) para persistir las respuestas del Paso 3 a nivel de la aplicación.
- Se pasa `step3Data` y `onStep3DataChange` al componente `DefineChanges` para que escriba en él.
- Se pasa `step3Data` al componente `Summary` para que lo muestre en el Paso 4.
- Se resetea `step3Data` al estado inicial cuando el usuario finaliza o reinicia el wizard.

---

### `src/app/components/DefineChanges.tsx` — Paso 3

- Se elevó el estado local de las tres tarjetas de preguntas (Título/Resumen, Unidades Operativas, Equipo de Investigación) al componente raíz via `onStep3DataChange`, eliminando la pérdida de datos al navegar entre pasos.
- Se reemplazó el tipo inline del array de investigadores por el nuevo type `ResearcherChange`.
- Se agregó el campo **Justificación** en el formulario de la sección "Otros Cambios en Documentos", con su respectiva validación (campo obligatorio para habilitar el botón "Agregar cambio").
- La justificación se incluye al crear y editar cada cambio, y se muestra en la tarjeta de resumen dentro del paso.

---

### `src/app/components/Summary.tsx` — Paso 4

#### Datos del Paso 3 reflejados en el resumen
- Se agregó la sección **"Cambios declarados"** que muestra las respuestas del usuario en el Paso 3:
  - **Título y Resumen**: badge SI/NO y los nuevos valores si aplica.
  - **Unidades Operativas**: badge SI/NO y el detalle si aplica.
  - **Equipo de Investigación**: badge SI/NO y tabla completa con nombre, correo, roles, tipo de cambio y justificación de cada investigador.

#### Sección "Cambios a aplicar en otros Documentos"
- Se renombró la sección de "Cambios a aplicar" a **"Cambios a aplicar en otros Documentos"**.
- Se agregó un contador de cambios totales en el encabezado.
- Se implementaron **acordeones por grupo** para organizar los cambios según su naturaleza:
  - *Información General*: Nombre del estudio, Número de protocolo, Vigencia, Institución.
  - *Equipo*: Investigador principal, Contacto de emergencia.
  - *Otros*: campos personalizados.
- Dentro de cada acordeón los cambios se muestran en una **tabla** con columnas: Campo, Antes, Después, Justificación, Documentos afectados y Alcance.
- La columna **Antes** muestra el valor tachado en gris tenue; **Después** en verde y negrita.
- Los documentos afectados se muestran como chips con el nombre real del documento (resolviendo los IDs).
- El badge **Global / Específico** se muestra en la columna Alcance.

#### Elementos eliminados
- Se eliminaron las **tarjetas de impacto** (Automáticos, Revisión, Nueva versión, Bloqueados).
- Se eliminó la **tabla "Impacto por documento"**.
- Se eliminó el bloque de **advertencia de documentos bloqueados**.

#### Nuevas secciones
- Se agregó la tabla **"Documentos Nuevos"** con columnas: Tipo de archivo, Nombre y Acciones (eliminar). Permite agregar documentos nuevos inline con un formulario en la propia tabla.
- Se agregó la sección **"Comentarios adicionales"** con un textarea opcional y contador de caracteres en tiempo real.

#### Botón Finalizar
- Se agregó el botón **"Finalizar"** en la esquina inferior derecha del paso, reemplazando los múltiples botones de acción anteriores (Aplicar cambios automáticos, Generar nuevas versiones, Enviar a revisión).

---

## Versión 2 — Mejoras de flujo, agrupación por categorías y confirmaciones (rama `version2`)

---

### `src/app/types.ts`

- Se agregaron los campos `registrationDate?: string` y `declarationFileName?: string` al interface `InternalOperativeUnit`, para registrar la fecha de incorporación y el archivo de carta de declaración del jefe de unidad.

---

### `src/app/components/ConfirmDialog.tsx` (nuevo componente)

- Se creó el componente reutilizable `ConfirmDialog` para mostrar ventanas de confirmación antes de ejecutar acciones críticas.
- Acepta `title`, `message`, `confirmLabel`, `cancelLabel` y `variant` (`danger`, `warning`, `primary`).
- Se usa en los 4 pasos del wizard para acciones de eliminar y guardar/continuar.

---

### `src/app/components/DefineChanges.tsx` — Paso 3

#### Modal de Unidades Operativas Internas
- Se reemplazó el formulario inline de unidades internas por un **modal** consistente con el de unidades externas.
- El modal incluye:
  - Campo de búsqueda desplegable con placeholder `"Buscar unidad operativa por su nombre ▼"` que filtra las opciones en tiempo real. Permite usar texto libre si no hay coincidencia.
  - Campo adicional para nombre personalizado cuando se selecciona la opción "Otros".
  - Área **drag-and-drop** para adjuntar la carta de declaración del jefe de unidad (PDF/DOCX, máx. 200 MB).
  - Botones **"Agregar"** (habilitado solo cuando se seleccionó unidad y se adjuntó archivo) y **"Cancelar"**.
- La tabla de unidades internas incorporó la columna **"Fecha de registro"**.
- Se eliminó el botón **"Agregar al proyecto"** de la tabla de Unidades Externas.

#### Confirmaciones de acciones
- Se agregó `ConfirmDialog` para todas las acciones destructivas y de navegación:
  - Deshacer unidad interna → confirmación `danger`.
  - Deshacer unidad externa → confirmación `danger`.
  - Eliminar investigador → confirmación `danger` (con nombre del investigador).
  - Eliminar cambio → confirmación `danger` (con nombre del campo).
  - Continuar al resumen → confirmación `primary`.

#### Selector de alcance al agregar cambio — agrupación por categorías
- La lista "Disponibles" agrupa los documentos bajo las 5 etiquetas predefinidas: **Presupuesto del estudio**, **Proyecto de investigación**, **Consentimiento informado**, **Asentimientos** e **Instrumentos del proyecto**.
- Cada cabecera de categoría incluye un botón **"Agregar todos"** que añade todos los documentos del grupo de un clic.
- La lista "Seleccionados" también se agrupa por categoría con botón **"Quitar todos"** por grupo para deselección masiva.
- Los documentos nuevos agregados en el Paso 1 se clasifican automáticamente bajo **"Instrumentos del proyecto"**.
- El botón global **"Agregar todos"** del footer de "Disponibles" desaparece cuando no quedan documentos sin seleccionar, y reaparece al quitar cualquier seleccionado.

---

### `src/app/components/SelectDocuments.tsx` — Paso 1

- Se separó la sección **"Consentimiento informado y Asentimientos"** en dos secciones independientes:
  - **"Consentimiento informado"** → solo el documento de consentimiento (id `2`).
  - **"Asentimientos"** → documentos de asentimiento 12-17 años (id `3`) y menores de 12 (id `4`).
- Se agregó `ConfirmDialog` para:
  - Eliminar documento nuevo → confirmación `danger`.
  - Limpiar selección → confirmación `warning`.
  - Continuar al Paso 2 → confirmación `primary` con conteo de documentos seleccionados.

---

### `src/app/components/UploadDocuments.tsx` — Paso 2

- Los documentos seleccionados se agrupan por las **5 categorías predefinidas**. Cada categoría muestra un encabezado rojo con su nombre; dentro, cada documento tiene su propio subencabezado gris con indicador "Completo".
- Los documentos nuevos agregados en el Paso 1 se ubican bajo **"Instrumentos del proyecto"**.
- Se agregó `ConfirmDialog` para:
  - Eliminar archivo de control de cambios → confirmación `danger` (con nombre del archivo).
  - Eliminar archivo de versión final → confirmación `danger`.
  - Continuar al Paso 3 → confirmación `primary`.

---

### `src/app/components/Summary.tsx` — Paso 4

- La sección **"Cambios a aplicar en otros Documentos"** agrupa los documentos bajo las 5 categorías predefinidas. Cada categoría aparece como cabecera gris con borde izquierdo, y dentro se listan los acordeones por documento.
- Los documentos nuevos se clasifican bajo **"Instrumentos del proyecto"**.
- Se corrigió la visualización de unidades operativas en el resumen: reemplaza la referencia inválida por la lista real de nombres de unidades internas y externas separados por coma.
- Se agregó `ConfirmDialog` para:
  - Eliminar documento nuevo → confirmación `danger` + botón eliminar incorporado (antes no existía).
  - Guardar nuevo documento → confirmación `primary` (con nombre del documento).
  - Finalizar → confirmación `primary` con advertencia de acción irreversible.

---

### `src/app/data/documents.ts`

- Se actualizaron las categorías de los documentos de consentimiento y asentimiento para reflejar la separación de secciones:
  - id `2` (`Consentimiento informado`): categoría `'Consentimiento informado'`.
  - id `3` (`Asentimiento(12-17)`) e id `4` (`Asentimiento(<12)`): categoría `'Asentimientos'`.
