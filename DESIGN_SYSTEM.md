# Sistema de diseño — W|E ERP

Todo lo que se crea en el Frontend (vista, panel, modal, formulario) usa **esta
misma estructura y estos mismos tokens**. Si algo no está aquí, se agrega aquí
primero y después se usa; nunca se inventa en la vista.

| Qué | Dónde |
|---|---|
| Tokens (color, forma) y clases `ds-*` | `src/styles/design-system.css` |
| Base histórica "exec" (botones, pills, inputs legacy, flatpickr oscuro) | `src/styles/style.scss` |
| Formato de cifras (S/, %, h) | `src/shared/lib/formatValue.js` |
| Tema de Chart.js y `isDark` | `src/utils/chartTheme.js` |
| **Implementación de referencia** | `src/views/dashboard/` (`TeamDashboard`, `TeamResults`, `ResultWidget`, `TeamCorrections`) |

---

## 1. Reglas de oro

1. **Cero hex en una vista nueva.** Todo color es `var(--ds-*)`. ¿Falta un
   color? Se agrega el token en `design-system.css`, con su valor claro **y**
   oscuro.
2. **La estructura se arma con clases `ds-*`.** El `<style scoped>` queda para
   lo que es propio de ese componente (un SVG, una grilla especial), nunca para
   volver a definir tarjetas, tablas o botones.
3. **Claro y oscuro salen solos.** Con tokens no hace falta un bloque
   `[data-coreui-theme="dark"]` en la vista. Si lo necesitas, falta un token.
4. **El `.vue` solo renderiza.** El tono (`ok | warn | bad | neutro`), la frase
   del veredicto o qué fila va primero lo decide la entity/composable. La vista
   traduce tono → clase.
5. **No reusar en un scoped el nombre de una clase global** (`.ds-panel`,
   `.pill`, `.btn-exec`…). Vue le suma a tu copia las propiedades globales que
   no declaraste y el resultado es una mezcla que nadie diseñó.
6. **Componentes base antes que nativos o CoreUI** (ver §6).
7. **Textos en español, en minúscula normal y concretos.** Sin MAYÚSCULAS salvo
   la etiqueta de formulario (§3). Botones con verbo: "Guardar cambios", no
   "Enviar".

---

## 2. Tokens

Se definen en `:root` y cambian solos con `data-coreui-theme="dark"`.

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `--ds-surface` | `#ffffff` | `#1a1a14` | Fondo de panel, tarjeta, modal |
| `--ds-surface-2` | `#f8fafc` | `#1f1f1a` | Input, hover de fila |
| `--ds-surface-3` | `#f1f4f9` | `#24241e` | Pista de barra, deshabilitado |
| `--ds-border` | `#e6e9f0` | `#2a2a22` | Bordes y divisores |
| `--ds-border-strong` | `#cbd5e1` | `#3a3a33` | Hover de borde |
| `--ds-ink` | `#0f172a` | `#f4f4f0` | Texto base |
| `--ds-heading` | `#1b2a5b` | `#8faadc` | Títulos y cifras |
| `--ds-ink-2` | `#64748b` | `#a0a099` | Texto secundario, etiquetas |
| `--ds-muted` | `#94a3b8` | `#8a8a80` | Notas, encabezados de tabla, vacío |
| `--ds-brand` | `#002060` | `#002060` | Marca: botón primario, foco |
| `--ds-on-brand` | `#ffffff` | `#ffffff` | Texto sobre el navy de marca (el navy no cambia con el tema) |
| `--ds-accent` | `#3a63b8` | `#8faadc` | Serie principal de gráficos, enlaces, foco de fila |
| `--ds-accent-2` | `#93b4e8` | `#4f6a9a` | Serie secundaria |
| `--ds-reference` | `#cbd5e1` | `#4a4a42` | Referencia: típico, meta, período anterior |
| `--ds-bar` | `#c9d6ec` | `#3a4a66` | Barras que no son la destacada |
| `--ds-rose` / `-rose-ink` / `--ds-soft-rose` / `--ds-rose-strong` | `#e07aa3` / `#8e1f4f` / `#fadbe6` / `#f4b6cb` | `#f08bb4` / `#f4a3c4` / rgba 14–30 % | **No llegó al objetivo** (falta, no error). `.ds-pill.rose`, `.ds-band-item.rose` |
| `--ds-ok` / `-warn` / `-bad` | `#12a150` / `#e08a1e` / `#d64545` | `#34d399` / `#e9b872` / `#f87171` | Relleno de estado (barra, anillo, borde) |
| `--ds-ok-ink` / `-warn-ink` / `-bad-ink` / `-info-ink` | `#0f7a3d` / `#a8620f` / `#b83232` / `#1e40af` | igual al relleno | Texto de estado (contraste AA) |
| `--ds-soft-ok` / `-warn` / `-bad` / `-info` / `-neutral` | tintes claros | rgba al 12–14 % | Fondo de pill, variación, conclusión |
| `--ds-radius` / `-sm` / `-control` | `12px` / `6px` / `4px` | — | Panel / chip, variación / botón, input, pill |
| `--ds-gap` | `16px` | — | Separación entre bloques |
| `--ds-font-mono` | Spline Sans Mono | — | Códigos, IDs, montos alineados |

**Navy de marca:** `#002060` va solo en botones y marca. En gráficos, enlaces y
texto sobre oscuro va `--ds-accent`: el navy puro se pierde en `#1A1A14` y satura
sobre blanco.

---

## 3. Tipografía

Fuente única **Hanken Grotesk** (global, `index.html` + `style.scss`). Las
cifras llevan `font-variant-numeric: tabular-nums` para que las columnas no bailen.

| Rol | Tamaño / peso | Clase |
|---|---|---|
| Título de página | 26 / 800, `-0.02em` | `.ds-title` |
| Subtítulo de página | 14 / 400 | `.ds-sub` |
| Cifra grande (comparativo) | 34 / 800 | — (widget) |
| Cifra de KPI | 25 / 800 | `.ds-kpi-value` |
| Título de panel | 13.5 / 700 | `.ds-panel-title` |
| Texto base | 13 / 400–500 | — |
| Etiqueta de KPI | 12.5 / 600 | `.ds-kpi-label` |
| Tabla | 12.5 (listado 13) | `.ds-table` |
| Encabezado de tabla, nota | 11.5 / 600 | `th`, `.ds-kpi-note` |
| **Etiqueta de formulario** | 10.5 / 600 MAYÚSCULA `.05em` | `.ds-label` |

La etiqueta de formulario es la **única** mayúscula: es el estándar histórico de
los formularios del ERP (650 usos) y cambiarla rompería la consistencia.

---

## 4. Espacio, forma y grilla

- Separación entre bloques: `var(--ds-gap)` (16px). Nada de `margin-bottom`
  sueltos: el contenedor `.ds-page` / `.ds-stack` pone el `gap`.
- Relleno de panel: `16px 18px`. Cabecera de panel: `13px 18px`.
- Radios: panel/tarjeta **12**, chip/variación **6**, controles (botón, input,
  pill) **4**.
- Sin sombras en paneles: el borde `--ds-border` los separa. Sombra solo en lo
  que flota (modal, dropdown).
- **Filas** (el ancho se usa entero, sin columnas vacías):

| Clase | Columnas | Úsala para |
|---|---|---|
| `.ds-row--hero` | 60 / 40 | Gráfico principal + cifra comparativa |
| `.ds-row--mitad` | 50 / 50 | Dos vistas de lo mismo (quién / cómo) |
| `.ds-row--tercios` | 3 × 33 | Ranking + medidor + métricas |
| `.ds-row--completa` | 100 | Tabla "dónde actuar" |

Corte responsive: tercios pasa a 2 columnas bajo **1200px**; todo pasa a 1
columna bajo **900px**.

---

## 5. Plantillas por tipo de pantalla

### 5.1 Encabezado (toda página)

```vue
<div class="ds-page">
  <header class="ds-head">
    <div class="ds-head-titles">
      <h1 class="ds-title">Aulas</h1>
      <p class="ds-sub">32 aulas en curso esta semana</p>
    </div>
    <div class="ds-head-actions">
      <button class="btn-exec btn-exec-outline" type="button" @click="exportar">
        <i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar
      </button>
      <button class="btn-exec btn-exec-primary" type="button" @click="crear">
        <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva aula
      </button>
    </div>
  </header>
  <!-- bloques: el gap de .ds-page los separa -->
</div>
```

- Sin eyebrow en mayúsculas encima del título. El subtítulo dice algo útil (un
  conteo o la hora de actualización), no repite el título.
- Una sola acción primaria por pantalla.

### 5.2 Panel de indicadores (dashboard, reporte)

Orden fijo: **veredicto → KPIs → filas de paneles**. Referencia:
`TeamResults.vue` + `ResultWidget.vue`.

```vue
<p class="ds-verdict" :class="tono">
  <strong>Atención</strong>
  <span>Van 38 ventas, 12% bajo lo típico a esta hora.</span>
</p>

<div class="ds-kpis">
  <div class="ds-kpi">
    <span class="ds-kpi-icon" :class="tono" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></span>
    <div class="ds-kpi-body">
      <div class="ds-kpi-row">
        <span class="ds-kpi-value">{{ formatValue(38, 'num') }}</span>
        <span class="ds-trend" :class="tono">↓ 12%</span>
      </div>
      <span class="ds-kpi-label">Ventas enviadas hoy</span>
      <span class="ds-kpi-note">Típico a esta hora: 43</span>
    </div>
  </div>
</div>

<div class="ds-row ds-row--hero">
  <article class="ds-panel">
    <header class="ds-panel-head">
      <h3 class="ds-panel-title">¿Vamos bien hoy?</h3>
      <span class="ds-panel-hint">8 a 20 h</span>
    </header>
    <div class="ds-panel-body"><!-- gráfico --></div>
    <footer class="ds-panel-foot warn">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>Desde las 15 h el ritmo cae por debajo de lo típico.</span>
    </footer>
  </article>
  <!-- segundo panel -->
</div>
```

Reglas del panel:
- **El título es la pregunta que responde** ("¿Quién le da seguimiento a sus
  consultas?"), no el nombre del dato ("Seguimiento por asesor").
- **Cada número se compara contra algo** (meta, típico, mes anterior). Una
  cifra sola no le dice nada al líder.
- La conclusión va en `.ds-panel-foot` con el tono, en una frase.
- **Ranking: máximo 5. Tabla: máximo 10.** Lo demás va con
  `.ds-panel-link` "Ver todos →" a la pantalla del módulo, y cada fila lleva a
  su registro (`tr.link` + `tabindex="0"` + `@keydown.enter`).
- Si un panel no tiene datos, se quita y la fila se reacomoda (backend:
  `row()` en `area-widgets.entity.js`). Nunca un recuadro vacío.

### 5.2.1 Reporte con pestañas y banda de lectura

Referencia: `views/comercial/PlanComercial.vue` (Objetivos / Por asesor / Ventas
diarias).

- **Pestañas y selector de periodo** con `.ds-tabs`: un control segmentado de
  `<button>`. Pestañas con `role="tab"` + `aria-selected`; el selector de mes con
  `aria-pressed`. El activo va en `--ds-brand`. Pestaña y periodo viven en la URL
  (`?tab=…&mes=…`) para que el enlace compartido abra lo mismo.
- **Banda de lectura rápida** con `.ds-band` > `.ds-band-item` (`.ds-band-label`,
  `.ds-band-value`, `.ds-band-bar > i`, `.ds-band-text`): 3–4 conclusiones sobre
  el navy de marca, arriba de todo. Es **el** elemento fuerte del reporte, uno
  por pantalla. El tono (`ok | warn | bad`) va en el `.ds-band-item` y solo
  pinta el punto y la barra; el texto queda siempre en `--ds-on-brand`. Las
  frases las arma la lógica (`features/plan-comercial/planComercial.js`), no
  el template.
- Dólares con `formatValue(v, 'usd')` → `US$ 1,200`.

```vue
<div class="ds-tabs" role="tablist" aria-label="Reportes">
  <button type="button" role="tab" :aria-selected="String(tab === 'a')" @click="tab = 'a'">Objetivos</button>
</div>

<section class="ds-band" aria-label="Lectura rápida de agosto">
  <div class="ds-band-item ok">
    <span class="ds-band-label">Vacantes</span>
    <span class="ds-band-value">104%</span>
    <div class="ds-band-bar"><i style="width: 100%"></i></div>
    <span class="ds-band-text">485 de 434 planificadas, 51 sobre el objetivo.</span>
  </div>
</section>
```

### 5.3 Listado de un módulo

```vue
<div class="ds-page">
  <header class="ds-head">…</header>

  <BaseFilterChips :items="chips" @remove="quitarFiltro" />

  <section class="ds-panel">
    <div class="ds-panel-body">
      <BasePagination v-model="pagination" @change="cargar" @open-filters="abrirFiltros" />
      <div class="table-responsive-custom">
        <table class="ds-table ds-table--lista">
          <thead><tr><th>Alumno</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="n"><td colspan="4"><span class="ds-skel"></span></td></tr>
            </template>
            <tr v-else-if="!filas.length">
              <td colspan="4" class="ds-empty ds-empty--lista">No hay inscripciones con estos filtros. Quita un filtro para ver más.</td>
            </tr>
            <template v-else>
              <tr v-for="f in filas" :key="f.id" class="link" tabindex="0" @click="abrir(f)" @keydown.enter="abrir(f)">
                <td>{{ f.alumno }}</td>
                <td class="num">{{ formatValue(f.monto, 'soles') }}</td>
                <td><span class="ds-pill" :class="f.tono">{{ f.estado }}</span></td>
                <td class="num">
                  <button class="btn-icon btn-icon-sm" type="button" title="Editar" aria-label="Editar" @click.stop="editar(f)">
                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</div>
```

- Filtros persistentes con `useTablePersistence(storageKey, filters, pagination)`.
- El estado del registro es una `.ds-pill` con tono; el mapa estado → tono vive
  en un composable/entity (ej. `useEnrollmentFormatters`), no en el template.

### 5.4 Detalle de un registro

`ds-head` (título = nombre del registro, subtítulo = código y fecha, pills de
estado en `.ds-head-actions` junto a las acciones) → `.ds-kpis` con las 3–4
cifras que importan → `.ds-row--hero` o `--mitad` con paneles (datos, pagos,
historial). Referencia de contenido: `views/fico/enrollment/EnrollmentPage.vue`.

### 5.5 Formulario

```vue
<form ref="formRef" class="ds-panel" @submit.prevent="guardar">
  <header class="ds-panel-head"><h3 class="ds-panel-title">Datos del alumno</h3></header>
  <div class="ds-panel-body ds-form-grid">
    <div class="ds-field">
      <label class="ds-label" for="dni">DNI<span class="ds-req">*</span></label>
      <input id="dni" v-model="form.dni" class="ds-input" required />
    </div>
    <div class="ds-field">
      <label class="ds-label">Programa<span class="ds-req">*</span></label>
      <SearchSelect v-model="form.programId" :items="programas" label-field="name" value-field="id" required />
      <span class="ds-help">Solo programas con edición abierta.</span>
    </div>
    <div class="ds-field">
      <label class="ds-label">Fecha de pago</label>
      <BaseDatePicker v-model="form.payDate" />
    </div>
    <div class="ds-field">
      <label class="ds-label">Monto</label>
      <CurrencyInput v-model="form.amount" />
    </div>
  </div>
  <footer class="ds-panel-actions">
    <button class="btn-exec btn-exec-outline" type="button" @click="cancelar">Cancelar</button>
    <button class="btn-exec btn-exec-primary" type="submit" :disabled="saving">Guardar alumno</button>
  </footer>
</form>
```

- **Asterisco `*` ⇒ `required` de verdad**. Además, el handler llama a
  `useRequiredFieldsGuard(formRef)` antes de guardar (pinta en rojo, avisa y hace
  scroll al primero que falta). Un `*` sin bloqueo es una mentira.
- Montos con `CurrencyInput`; fechas con `BaseDatePicker` / `DateTime12`; listas
  con `SearchSelect` (una opción) o `MultiSelect` (varias). Nunca `<select>`
  nativo para catálogos largos.
- Botones al pie: secundario a la izquierda, primario a la derecha; el primario
  dice lo que pasa ("Guardar alumno") y el toast repite el verbo ("Alumno guardado").

### 5.6 Modal

```vue
<BaseModal v-model="abierto" title="Cambiar modalidad" size="md">
  <!-- contenido: .ds-form-grid, .ds-table… -->
  <template #footer>
    <button class="btn-exec btn-exec-outline" type="button" @click="abierto = false">Cancelar</button>
    <button class="btn-exec btn-exec-primary" type="button" @click="aplicar">Aplicar cambio</button>
  </template>
</BaseModal>
```

Tamaños: `sm` 420 (confirmar) · `md` 560 (formulario corto) · `lg` 780 · `xl`
1080 (tabla) · `xxl` 1320. Para una confirmación simple no se arma un modal:
se usa `confirmAction()` (§7).

---

## 6. Componentes base

| Necesito | Uso | Notas |
|---|---|---|
| Ventana | `BaseModal` | `v-model`, `title`, `size`, slot `footer`. Ya trae modo oscuro |
| Elegir 1 de muchos | `SearchSelect` | `items`, `label-field`, `value-field`, `mode="remote"` + `fetcher` para buscar en API |
| Elegir varios | `MultiSelect` | `items`, `label-key`, `value-key` |
| Fecha | `BaseDatePicker` | flatpickr; `config`, `required`, `disabled` |
| Fecha y hora | `DateTime12` | Formato 12 h |
| Rango de fechas | `DateRangePicker` | |
| Monto | `CurrencyInput` | |
| Paginación + botón de filtros | `BasePagination` | `v-model="{ size, page, total }"`, emite `change`, `open-filters` |
| Filtros aplicados | `BaseFilterChips` | `items` |
| Filtro por columna | `ColumnFilterDropdown` | |
| Archivos | `FileUploader` / `MultiFileUploader` | |
| Aviso breve | `useToast()` de vue-toastification | `toast.success / error / warning`. Único sistema de toasts |
| Confirmar acción | `confirmAction({ title, text, confirmText, danger })` | `composables/useConfirm.js`; `danger: true` para borrar/anular |
| Gráfico | `views/dashboard/ResultChart.vue` o vue-chartjs | Ver §9 |
| Carga global con blur | `meta: { showLoader: true }` en la ruta | Opt-in; el resto usa skeleton |

**No usar en código nuevo:** `CCard`, `CButton`, `CTable`, `CModal` de CoreUI en
vistas (CoreUI queda para el shell: header y sidebar); clases Bootstrap `card`,
`btn btn-primary`, `table table-hover`; `ToastHost`, `GlobalToaster`,
`FilterModal`, `ActionStepper` (sin uso); ApexCharts.

---

## 7. Botones y acciones

| Clase | Cuándo |
|---|---|
| `.btn-exec .btn-exec-primary` | La acción principal. Una por pantalla / modal |
| `.btn-exec .btn-exec-outline` | Secundaria (Cancelar, Exportar, Actualizar) |
| `.btn-exec .btn-exec-ghost` | Terciaria dentro de una barra |
| `+ .btn-sm` | Dentro de un panel o una tabla |
| `.btn-icon .btn-icon-sm` | Acción de fila. **Siempre** con `title` y `aria-label` |

- Icono FontAwesome a la izquierda del texto, `aria-hidden="true"`.
- Mientras guarda: `:disabled="saving"` y el texto cambia ("Guardando…").
- Borrar, anular o revertir ⇒ `confirmAction({ danger: true })` antes. La
  pregunta dice qué se pierde ("Se anula la venta #13041 y su cuota pendiente").

---

## 8. Estados de pantalla

| Estado | Cómo |
|---|---|
| Cargando | `.ds-skel` (filas) o `.skel-kpi` (cifra), con la forma del contenido final. Nunca una pantalla en blanco |
| Vacío | `.ds-empty` (panel) / `.ds-empty--lista` (tabla) y **qué hacer**: "No hay aulas esta semana. Cambia la semana arriba." |
| Error al cargar | `.ds-alert` con lo que pasó + `console.error` con contexto. Sin `catch {}` mudo |
| Error al guardar | `toast.error(mensaje del backend)`; el formulario conserva lo escrito |
| Éxito | `toast.success('Alumno guardado')` |
| Sin permiso | La opción no se muestra (matriz de Roles y Permisos), no se deshabilita |

---

## 9. Datos y gráficos

- **Cifras:** siempre con `formatValue(valor, unidad)` (`S/ 1,200`, `12.5%`,
  `48 h`, `—` si no hay dato; nunca `0` inventado). En espacios chicos,
  `formatCompact` (`S/ 1.3 M`).
- **Colores de gráfico:** el canvas no lee variables CSS, así que el color va
  en JS dentro de un `computed` con `isDark` (`@/utils/chartTheme`), con los
  mismos valores de los tokens: principal `#3A63B8` / `#8FAADC`, referencia
  `#A9B6CC` / `#5A5A50` punteada.
- **Una serie en color, el resto en gris.** El ojo tiene que ir a la diferencia
  contra la referencia (típico, meta, mes anterior). Sin arcoíris.
- Leyenda solo si hay más de una serie; símbolo igual a lo que dibuja (línea
  para línea, cuadrito para barra).
- Barras horizontales para rankings de personas (el nombre se lee); línea para
  el tiempo; dona (SVG) solo para partes de un total con ≤ 5 segmentos; medidor
  para un % contra 100.
- `prefers-reduced-motion` ⇒ sin animación. Cada gráfico lleva `role="img"` y
  `aria-label` con su título.

---

## 10. Iconos

FontAwesome kit (`index.html`), estilo `fa-solid`. Decorativos con
`aria-hidden="true"`; si el icono es el único contenido del botón, el botón
lleva `aria-label`. No usar `CIcon` (solo el shell), ni `fas fa-` (sintaxis
vieja), ni SVG inline para iconos que existen en FontAwesome.

---

## 11. Modo oscuro

- Mecanismo: `data-coreui-theme="dark"` en `<html>`. Los tokens `--ds-*` ya
  cambian; **una vista hecha con tokens no necesita bloque oscuro**.
- Los tokens viven en `:root`, así que también llegan a lo teleportado
  (`BaseModal`, dropdowns de `SearchSelect`), algo que los tokens definidos en la
  clase raíz de una página no lograban.
- `input type="date"` nativo: `color-scheme: dark` (ya lo trae `.ds-input`).
- Gráficos: `isDark` (§9). Calendario flatpickr: bloque global en `style.scss`.
- Modo claro intacto: al tocar un token, el valor claro no cambia sin revisar
  las pantallas que lo usan.

---

## 12. Accesibilidad y responsive

- Foco visible en todo lo clicable (`:focus-visible`); una fila clicable es
  navegable con Tab y se abre con Enter.
- Contraste: texto de estado con `--ds-*-ink`, no con el relleno.
- Probar a **1440, 900 y 400 px**. Bajo 900 todo va en una columna; las tablas
  hacen scroll horizontal dentro de `.ds-table-scroll`, nunca la página.

---

## 13. Checklist antes de entregar una vista

- [ ] Encabezado `ds-head` y bloques dentro de `.ds-page`
- [ ] Cero hex nuevos en el `.vue` (`rg "#[0-9a-fA-F]{3,6}\b" archivo.vue`)
- [ ] Ninguna clase global redefinida en el scoped
- [ ] Se ve bien en claro **y** oscuro sin bloque dark propio
- [ ] Cifras con `formatValue`; cada número comparado contra algo
- [ ] Rankings ≤ 5, tablas ≤ 10 con "Ver todos" y filas que llevan al registro
- [ ] Carga con skeleton, vacío con instrucción, error explícito
- [ ] `*` ⇒ `required` + `useRequiredFieldsGuard`
- [ ] Una sola acción primaria; acciones de fila con `aria-label`
- [ ] Probado a 400 px
- [ ] Ruta nueva ⇒ alta en Roles y Permisos (`CLAUDE.md`)
- [ ] Regla de negocio nueva ⇒ test

---

## 14. Legacy → sistema de diseño

Hoy conviven 4 encabezados y ~11.900 hex en 122 `.vue`. Al tocar una vista
(Boy Scout), lo que se toca se migra; no se hacen refactors masivos sin pedirlo.

| Legacy | Reemplazo |
|---|---|
| `.exec-masthead` / `.ep-*` / `.td-head` / `.page-head` | `.ds-head` |
| `.card`, `.kcard`, `.rw`, `*-panel` propios | `.ds-panel` / `.ds-kpi` |
| `table.exec-table` y tablas propias | `.ds-table` (`--lista` en listados) |
| `.exec-label`, `.exec-input-light` copiados en cada scoped | `.ds-label`, `.ds-input` |
| `.pill-green/-amber/-blue` locales, `badge`, `status-pill` | `.ds-pill ok/warn/bad/info` |
| `.empty-state`, `.vacio` | `.ds-empty` / `.ds-empty--lista` |
| `.skel` copiado | `.ds-skel` |
| Variables locales `--td-*`, `--r-*`, `--e-*`, `--slate-*`, `--text-*` | `--ds-*` |
| IBM Plex Mono / JetBrains Mono | `var(--ds-font-mono)` |
| Bloques `[data-coreui-theme="dark"]` por vista | Tokens |

**Cómo migrar una vista:** 1) cambiar el encabezado y los contenedores a
`ds-*`; 2) reemplazar hex por tokens; 3) borrar del scoped las clases que ya
cubre el global y su bloque oscuro; 4) revisar claro, oscuro y 400 px.

**Estado:** `views/dashboard/` (panel de líder y "Mi día a día") migrado.
Siguen los módulos por uso: FICO inscripciones → Comercial leads → Académica
aulas → Producto cronograma → Configuración → B2B/Fundación.
