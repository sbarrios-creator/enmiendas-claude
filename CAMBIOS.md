# Registro de Cambios

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
