# Registro de Cambios

## Gestión de Unidades Operativas — Paso 3

---

### `src/app/types.ts`
- Se agregó la interface `OperativeUnit` con campos `id` y `name`.
- Se actualizó `Step3Data.operativeUnitsData` de `{ units: string }` a `{ internalUnits: OperativeUnit[]; externalUnits: OperativeUnit[] }`.

### `src/app/App.tsx`
- Se actualizó el estado inicial de `operativeUnitsData` a `{ internalUnits: [], externalUnits: [] }`.

### `src/app/components/DefineChanges.tsx` — Paso 3 (Card 2)
- Se reemplazó el textarea libre por dos listados independientes: **Unidades Internas** y **Unidades Externas**.
- Cada listado incluye: botón "Agregar" (se oculta mientras el formulario está activo), formulario inline con input de texto + botones Guardar/Cancelar (Enter para guardar, Escape para cancelar), tabla con columna "Acciones" (botón Eliminar), y estado vacío con el mensaje "No se encontraron resultados".
- La sección completa solo se muestra cuando el usuario selecciona **SÍ** en la pregunta correspondiente.
- Se agregaron handlers: `handleAddInternalUnit`, `handleRemoveInternalUnit`, `handleAddExternalUnit`, `handleRemoveExternalUnit`.

### `src/app/components/Summary.tsx` — Paso 4
- La sección "Unidades Operativas" ahora muestra las dos listas (Internas / Externas) cuando `modifiesOperativeUnits === 'SI'`, con estado vacío "No se encontraron resultados" si alguna lista está vacía.

---

## Correcciones recientes (main)

---

### `src/app/components/Summary.tsx` — Paso 4

#### Columnas de tabla "Cambios a aplicar en otros Documentos"
- Se renombraron las columnas **"Antes"** → **"Versión anterior"** y **"Después"** → **"Versión nueva"**.
- Se eliminó la columna **"Alcance"** (Global / Específico). La tabla ahora tiene 5 columnas: Campo, Versión anterior, Versión nueva, Justificación y Documentos afectados.

---

### `src/app/components/UploadDocuments.tsx` — Paso 2

#### Habilitación del botón "Continuar"
- Se corrigió la condición `canContinue`: antes usaba `Object.keys(uploadStatuses).length === selectedDocuments.length`, lo que podía fallar si `uploadStatuses` tenía entradas de documentos no seleccionados. Ahora itera directamente sobre `selectedDocuments` con `.every()`, habilitando el botón en cuanto **todos** los documentos seleccionados tengan sus 2 versiones subidas (control de cambios + versión final).

---

### `src/app/components/DefineChanges.tsx` — Paso 3

#### Campo "Campo a modificar" en sección "Otros Cambios en Documentos"
- Se descomentó el selector **"Campo a modificar"** y el campo condicional **"Especifique el campo"** (visible cuando se selecciona "Otro (personalizado)").
- Se actualizó la validación de `handleAddChange`, `handleSaveEdit` y el botón "Agregar cambio" para requerir que el campo esté seleccionado/completado antes de permitir guardar.
- Al cambiar la opción del selector se limpia automáticamente `customField`.

---

## Rediseño del flujo de enmiendas

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

### `src/app/components/SelectDocuments.tsx` — Paso 1

- Se agregó el botón **"Agregar Documentos"** en la esquina superior derecha del encabezado de la sección "Documentos Nuevos".
- El botón abre un **modal** con:
  - Lista desplegable para seleccionar el tipo de documento (Presupuesto, Instrumento, Protocolo, Consentimiento informado, Registro de eventos adversos, Otro).
  - Zona de carga de archivo con estilo drag-and-drop (acepta PDF, DOC, DOCX — máx. 200 MB).
  - Botón **Guardar** (deshabilitado hasta completar ambos campos) y botón **Cerrar**.
  - El backdrop también cierra el modal al hacer clic fuera.

---

### `src/app/components/DefineChanges.tsx` — Paso 3 (actualización)

- Se comentó el selector **"Campo a modificar"** y su campo condicional **"Especifique el campo"** en el formulario de la sección "Otros Cambios en Documentos".
- Se corrigió la validación del botón **"Agregar cambio"**: ahora se habilita cuando el valor nuevo, la justificación están llenos y al menos 1 documento está seleccionado, eliminando la dependencia del campo comentado.
