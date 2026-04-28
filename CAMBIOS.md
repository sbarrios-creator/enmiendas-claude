# Registro de Cambios

## Tarjetas de cambio pendiente — nombres reales de documentos — Paso 3

---

### `src/app/components/DefineChanges.tsx` — Sección "Cambios pendientes" (Card 4)

#### Rediseño del encabezado de cada tarjeta de cambio
- Se reemplazó el nombre del campo solo (ej: "Institución") por un formato de dos niveles: etiqueta gris "Campo modificado" + nombre del campo en negrita debajo.

#### Alcance con nombres reales de documentos
- Se eliminó el badge genérico `N doc(s)`. Ahora se resuelven los IDs a nombres reales usando `mockDocuments`:
  - **1 documento**: muestra el nombre completo del instrumento (ej: "Cuestionario de calidad de vida").
  - **2 documentos**: muestra ambos nombres separados por ` · ` con badge contador.
  - **3+ documentos**: muestra los 2 primeros y un botón `+N más` para expandir la lista completa; al expandir aparece `ver menos` para colapsar.
  - **Global**: muestra "Todos los documentos" en azul con badge del total.
- Se agregó el estado `expandedChanges: Set<string>` y el helper `toggleExpandChange` para controlar la expansión de forma independiente por tarjeta.

---

## Pulido final del modal "Nuevo cambio" — Paso 3

---

### `src/app/components/DefineChanges.tsx` — Modal Nuevo cambio

#### Validación en tiempo real al intentar enviar
- Se agregó el estado `submitAttempted` al componente. Los mensajes de error se activan únicamente al hacer clic en "Agregar cambio", no mientras el usuario escribe.
- Cada campo obligatorio vacío muestra un mensaje "Campo requerido" en rojo (texto + ícono) debajo del input y pinta el borde del campo en rojo.
- El borde vuelve a su estado normal en cuanto el campo se completa.
- El botón "Agregar cambio" ya no se deshabilita; la validación corre al hacer clic y muestra todos los errores a la vez.

#### Dropdown "Campo a modificar" con ícono de flecha personalizado
- Se aplicó `appearance-none` al `<select>` para ocultar la flecha nativa del sistema operativo.
- Se superpone un ícono chevron SVG con `pointer-events-none` alineado a la derecha, consistente en todos los navegadores.
- El placeholder muestra "Seleccione un campo..." con color gris diferenciado del texto seleccionado.

#### Alcance del cambio con recuadro agrupador
- Los dos radio buttons ("Todos los docs." / "Específicos") están envueltos en un contenedor `bg-gray-50 border border-gray-200 rounded-sm p-3` que los agrupa visualmente con más padding interior.

#### Selector de documentos específicos
- Contador `X / Y` en la misma línea que el título "Seleccione los documentos" como badge; cambia a rojo cuando hay error de validación.
- Botón "Seleccionar todos / Deseleccionar todos" alterna automáticamente según el estado actual de selección.
- Mensaje de error "Seleccione al menos uno" visible en el encabezado si se intenta enviar sin seleccionar documentos.

#### Botón "Vista previa del cambio"
- Agregado en el footer, encima de los botones Cancelar / Agregar.
- Al activarlo muestra un panel azul con el resumen: `Se cambiará "[Valor anterior]" → "[Nuevo valor]" en N documento(s)`.
- Incluye campo modificado y justificación cuando están completados.
- Se oculta al cerrar el modal (estado `showChangePreview` se resetea en `closeModal`).

---

## Card 4 — Instrumentos del proyecto y modal Nuevo cambio — Paso 3

---

### `src/app/components/DefineChanges.tsx` — Paso 3 (Card 4 — Otros Cambios en Documentos)

#### Rediseño de la sección Instrumentos del proyecto
- El toggle **Archivo / Reemplazar** es ahora independiente por instrumento (estado `Record<docId, modo>`), eliminando el toggle global de la cabecera de sección.
- Cada tarjeta de instrumento tiene dos filas: nombre + badge de cambios arriba; toggles + botón de acción abajo.
- **Reemplazar activo** → `bg-blue-600` (azul, acción principal). **Archivo activo** → `bg-gray-700` (secundario).
- Modo **Reemplazar**: botón "+ Agregar" (rojo) para abrir el modal de creación con el instrumento preseleccionado.
- Modo **Archivo**: botones outline "Ver" (azul) y "Descargar" (verde).
- Badge de cambios `N cambios` junto al nombre del instrumento, visible solo si hay cambios registrados.
- Buscador de instrumentos por nombre sin toggle global de modo.

#### Rediseño del modal "Nuevo cambio" (formulario único)
- Reemplaza el wizard de 3 pasos por un formulario único scrollable con todos los campos visibles a la vez.
- **Columnas lado a lado**: "Valor anterior (opcional)" | "Nuevo valor *".
  - "Valor anterior": borde punteado `border-dashed` para indicar que es referencia, no dato del sistema; badge pill `opcional` separado de la etiqueta; placeholder descriptivo.
  - "Nuevo valor": borde verde cuando tiene contenido.
- **Vista previa ANTES → DESPUÉS** automática: aparece al escribir en cualquiera de los dos campos; fondo rojo suave / verde suave con íconos.
- **Justificación**: eliminado el texto "Requerido" flotante; solo muestra contador de caracteres cuando hay texto escrito.
- **Alcance**: botones radio Todos los documentos / Documentos específicos.
- **Selector de documentos específicos**:
  - Contador `X / Y` como badge azul junto al título "Seleccione los documentos".
  - Botón "Seleccionar todos / Deseleccionar todos" junto al buscador.
  - Checkboxes estilo toggle azul por documento.

### `src/app/components/UploadDocuments.tsx` — Paso 2 (ajustes visuales)
- Headers de columna ("Tipo archivo", "Archivo control de cambios", "Archivo versión final") movidos dentro de cada sección de categoría con fondo oscuro (`bg-gray-900`, texto blanco).
- Colores del indicador de archivo subido migrados de hex a clases Tailwind estándar (`green-100 / green-500 / green-600 / green-800`).

---

## Unidades externas e internas — Paso 3 y Paso 4

---

### `src/app/types.ts`
- Se agregó el campo `registeredAt: string` a la interface `OperativeUnit` para almacenar la fecha de registro formateada.

### `src/app/components/DefineChanges.tsx` — Paso 3 (Card 2 — Unidades Operativas)

#### Listado de unidades externas (tipo tarjeta)
- Las unidades externas registradas se muestran como **filas tipo tarjeta** en lugar de filas de tabla simples.
- Cada fila incluye: ícono de edificio, nombre de la unidad en negrita, badge verde *"Será agregada al proyecto"*, fecha de registro (formato dd/mm/aaaa) y botones de acción **Ver**, **Descargar** y **Deshacer**.
- Ver: abre la carta en nueva pestaña (`URL.createObjectURL`). Descargar: descarga el archivo con `URL.revokeObjectURL` tras la descarga. Deshacer: elimina el registro del listado.

#### Modal diferenciado por tipo de unidad
- El modal de **unidades internas** conserva el dropdown con buscador (lista predefinida `mockOperativeUnits`).
- El modal de **unidades externas** fue rediseñado con:
  - Input de texto libre para el nombre de la unidad.
  - Selector **Sí / No** (por defecto Sí) para indicar si se cuenta con carta de aprobación/declaración.
  - Zona drag & drop visible solo cuando el selector es "Sí"; si es "No" muestra un aviso explicativo.
  - Botón **Agregar** habilitado únicamente cuando: nombre completado + selector = Sí + archivo adjunto.

### `src/app/components/Summary.tsx` — Paso 4

#### Unidades internas con acciones
- Las unidades internas ahora se muestran como filas con nombre y botones jerárquicos **Ver** y **Descargar** para acceder a la carta de declaración adjunta.

#### Unidades externas con acciones
- Las unidades externas también muestran botones jerárquicos **Ver** y **Descargar** en el paso 4, con el mismo estilo que las internas.

---

## Modal para asignar unidad operativa — Paso 3

---

### `src/app/types.ts`
- Se agregaron campos `fileName: string` y `file: File` a la interface `OperativeUnit` para almacenar la carta de declaración del jefe de unidad.

### `src/app/components/DefineChanges.tsx` — Paso 3 (Card 2)
- Se reemplazó el formulario inline por un **modal** compartido entre unidades internas y externas, activado según el botón "Agregar" que se presione.
- El modal incluye:
  - **Dropdown con buscador** para seleccionar la unidad operativa desde una lista predefinida (`mockOperativeUnits`).
  - **Área drag & drop** (también clickeable) para cargar la "Carta de declaración del jefe de unidad operativa" (PDF, DOC, DOCX, máx. 200 MB). Muestra el archivo seleccionado con opción de quitar.
  - El botón **"Agregar"** se habilita solo cuando ambos campos están completos.
  - El botón **"Cancelar"** y el backdrop cierran el modal sin guardar.
- La tabla de cada listado ahora incluye una columna **"Carta de declaración"** que muestra el nombre del archivo adjunto.
- Se agregó lista `mockOperativeUnits` con 20 opciones predefinidas.

---

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
