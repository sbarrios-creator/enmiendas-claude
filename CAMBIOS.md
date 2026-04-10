# Registro de Cambios

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
