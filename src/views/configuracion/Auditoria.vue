<template>
  <div class="ds-page">

    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Auditoría</h1>
        <p class="ds-sub">Bitácora de movimientos del sistema</p>
      </div>
      <div class="ds-head-actions">
        <span class="ap-scope">
          <span class="ds-label ap-scope-label">Alcance</span>
          <span class="ap-scope-value">{{ scopeLabel }}</span>
        </span>
      </div>
    </header>

    <p v-if="denied" class="ds-callout warn">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      <span>{{ denied }}</span>
    </p>

    <template v-else>
      <section class="ds-panel" aria-label="Vistas rápidas y paginación">
        <div class="ds-panel-body ap-bar">
          <nav class="ds-tabs" aria-label="Vistas rápidas">
            <button
              v-for="view in QUICK_VIEWS"
              :key="view.key"
              type="button"
              :aria-pressed="String(activeViewKey === view.key)"
              @click="applyQuickView(view)"
            >
              <i class="fa-solid" :class="view.icon" aria-hidden="true"></i> {{ view.label }}
            </button>
          </nav>

          <div class="ap-toolbar">
            <label class="ap-size">
              <span class="ds-label ap-inline-label">Mostrar</span>
              <select v-model.number="pageSize" class="ds-input ap-size-select">
                <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
              </select>
              <span class="ds-label ap-inline-label">filas</span>
            </label>
            <div class="ap-pager">
              <button
                class="btn-icon btn-icon-sm"
                type="button"
                :disabled="page === 1 || isLoading"
                title="Página anterior"
                aria-label="Página anterior"
                @click="go(page - 1)"
              >
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
              </button>
              <span class="ap-page-current" aria-live="polite">{{ page }}</span>
              <button
                class="btn-icon btn-icon-sm"
                type="button"
                :disabled="!hasMore || isLoading"
                title="Página siguiente"
                aria-label="Página siguiente"
                @click="go(page + 1)"
              >
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeChips.length" class="ap-filter-strip">
          <span class="ds-pill info">
            <i class="fa-solid fa-filter" aria-hidden="true"></i>
            {{ activeChips.length }} {{ activeChips.length === 1 ? 'filtro activo' : 'filtros activos' }}
          </span>
          <BaseFilterChips :items="activeChips" @remove="removeChip" @clear-all="resetFilters" />
        </div>
      </section>

      <section class="ds-panel">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista ect">
            <thead>
              <tr>
                <th class="tc" style="width:42px"></th>
                <th style="width:132px">Fecha y hora</th>
                <th style="width:150px">Usuario</th>
                <th style="width:130px">Acción</th>
                <th style="width:200px">Entidad</th>
                <th class="num" style="width:100px">Registro</th>
                <th>Cambios</th>
              </tr>

              <!-- Toda columna filtra desde esta fila: ningun control vive fuera
                   de la tabla. Es la misma convencion de FICO/Inscripciones. -->
              <tr class="ect-filters">
                <th class="tc">
                  <button
                    class="btn-icon btn-icon-sm"
                    type="button"
                    title="Limpiar filtros"
                    aria-label="Limpiar filtros"
                    @click="resetFilters"
                  >
                    <i class="fa-solid fa-eraser" aria-hidden="true"></i>
                  </button>
                </th>
                <th>
                  <BaseDatePicker
                    v-model="filters.date_range"
                    :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                    placeholder="Fecha..."
                  />
                </th>
                <th>
                  <select v-model="filters.user_id_filter" class="ds-input ect-flt" aria-label="Filtrar por usuario">
                    <option :value="null">Todos</option>
                    <option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.alias }}</option>
                  </select>
                </th>
                <th>
                  <select v-model="filters.action" class="ds-input ect-flt" aria-label="Filtrar por acción">
                    <option :value="null">Todas</option>
                    <option v-for="a in ACTIONS" :key="a.code" :value="a.code">{{ a.label }}</option>
                  </select>
                </th>
                <th>
                  <select v-model="filters.table_name" class="ds-input ect-flt" aria-label="Filtrar por entidad">
                    <option :value="null">Todas</option>
                    <option v-for="(label, code) in tables" :key="code" :value="code">{{ label }}</option>
                  </select>
                </th>
                <th>
                  <input
                    v-model.number="filters.record_id"
                    type="number"
                    min="0"
                    class="ds-input ect-flt num-input"
                    placeholder="N°"
                    aria-label="Filtrar por número de registro"
                  />
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 10" :key="'sk' + n">
                  <td colspan="7"><span class="ds-skel"></span></td>
                </tr>
              </template>

              <tr v-else-if="!rows.length">
                <td colspan="7" class="ds-empty ds-empty--lista">
                  No hay movimientos con estos filtros. Amplía el rango de fechas o quita un filtro.
                </td>
              </tr>

              <template v-else>
                <!-- El script guarda el tono como pill-green/amber/red/slate; la
                     vista lo traduce al tono ds (ok/warn/bad/neutro). -->
                <tr v-for="row in rows" :key="row.id">
                  <td class="tc">
                    <span
                      class="act-dot"
                      :class="{ 'pill-green': 'ok', 'pill-amber': 'warn', 'pill-red': 'bad' }[actionClass(row.action)]"
                      :title="actionLabel(row.action)"
                    >
                      <i class="fa-solid" :class="actionIcon(row.action)" aria-hidden="true"></i>
                    </span>
                  </td>
                  <td class="cell-date">{{ row.created_at || '—' }}</td>
                  <td class="cell-main cell-clip" :title="row.user_alias">{{ row.user_alias }}</td>
                  <td>
                    <span
                      class="ds-pill"
                      :class="{ 'pill-green': 'ok', 'pill-amber': 'warn', 'pill-red': 'bad' }[actionClass(row.action)]"
                    >{{ actionLabel(row.action) }}</span>
                  </td>
                  <td class="cell-clip" :title="row.table_label">{{ row.table_label }}</td>
                  <td class="num mono">{{ row.record_id ?? '—' }}</td>
                  <td>
                    <ul v-if="row.changes.length" class="diff">
                      <li v-for="c in row.changes" :key="c.field">
                        <span class="diff-field">{{ c.label }}</span>
                        <span class="diff-old">{{ formatValue(c.old) }}</span>
                        <i class="fa-solid fa-arrow-right diff-arrow" aria-hidden="true"></i>
                        <span class="diff-new">{{ formatValue(c.new) }}</span>
                      </li>
                    </ul>
                    <span v-else class="cell-sub">{{ noDiffLabel(row.action) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'

const toast = useToast()
const configService = inject(ServiceKeys.Config)

const ACTIONS = [
  { code: 'INSERT', label: 'Creación', icon: 'fa-plus', tone: 'pill-green' },
  { code: 'UPDATE', label: 'Edición', icon: 'fa-pen', tone: 'pill-amber' },
  { code: 'DELETE', label: 'Borrado', icon: 'fa-trash', tone: 'pill-red' },
  { code: 'LOGIN', label: 'Acceso', icon: 'fa-right-to-bracket', tone: 'pill-slate' },
  // Acciones del menú de usuario. No tocan ninguna fila, las reporta AppHeader
  // contra /audit/action; los códigos son la lista blanca SYSTEM_ACTIONS.
  { code: 'LOGOUT', label: 'Cierre de sesión', icon: 'fa-right-from-bracket', tone: 'pill-slate' },
  { code: 'UPDATE_BASE', label: 'Base de asesor', icon: 'fa-cloud-arrow-down', tone: 'pill-slate' },
  { code: 'SYNC_PROSPECTOS', label: 'Sync Prospectos', icon: 'fa-file-export', tone: 'pill-slate' },
  { code: 'SYNC_PLANEAMIENTO', label: 'Sync Planeamiento', icon: 'fa-calendar-days', tone: 'pill-slate' },
  { code: 'CATALOG_REFRESH', label: 'Actualizar sistema', icon: 'fa-rotate', tone: 'pill-slate' },
  { code: 'SYNC_FICO', label: 'Sync Ventas FICO', icon: 'fa-cloud-arrow-up', tone: 'pill-slate' },
]

const PAGE_SIZES = [25, 50, 100, 200]

const rows = ref([])
const users = ref([])
const tables = ref({})
const scope = ref(null)
const hasMore = ref(false)
const page = ref(1)
const pageSize = ref(50)
const isLoading = ref(false)
const denied = ref('')

const emptyFilters = () => ({
  date_range: '', user_id_filter: null,
  table_name: null, action: null, record_id: null,
})
const filters = reactive(emptyFilters())

const scopeLabel = computed(() => (scope.value ? scope.value.join(' · ') : 'Todo el sistema'))

/* ── Vistas rápidas ─────────────────────────────────────────────── */

const isoDay = daysBack => {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

const QUICK_VIEWS = [
  { key: 'all', label: 'Todo', icon: 'fa-list', preset: () => ({}) },
  { key: 'today', label: 'Hoy', icon: 'fa-calendar-day', preset: () => ({ date_range: isoDay(0) }) },
  { key: 'week', label: 'Últimos 7 días', icon: 'fa-calendar-week', preset: () => ({ date_range: `${isoDay(6)} a ${isoDay(0)}` }) },
  { key: 'updates', label: 'Ediciones', icon: 'fa-pen', preset: () => ({ action: 'UPDATE' }) },
  { key: 'deletes', label: 'Borrados', icon: 'fa-trash', preset: () => ({ action: 'DELETE' }) },
  { key: 'logins', label: 'Accesos', icon: 'fa-right-to-bracket', preset: () => ({ action: 'LOGIN' }) },
]

function applyQuickView (view) {
  Object.assign(filters, emptyFilters(), view.preset())
}

// La pestaña activa se DEDUCE del estado de los filtros en vez de guardarse
// aparte: tocar un filtro a mano apaga la pestaña sola, sin banderas que se
// desincronicen.
function filterSignature (f) {
  return JSON.stringify([f.date_range || '', f.user_id_filter, f.table_name, f.action, f.record_id])
}

const activeViewKey = computed(() => {
  const current = filterSignature(filters)
  return QUICK_VIEWS.find(v => filterSignature({ ...emptyFilters(), ...v.preset() }) === current)?.key ?? null
})

/* ── Chips de filtros activos ───────────────────────────────────── */

const activeChips = computed(() => {
  const chips = []
  if (filters.date_range) chips.push({ key: 'date_range', label: `Fecha: ${filters.date_range}` })
  if (filters.user_id_filter) {
    const alias = users.value.find(u => u.user_id === filters.user_id_filter)?.alias
    chips.push({ key: 'user_id_filter', label: `Usuario: ${alias || filters.user_id_filter}` })
  }
  if (filters.action) chips.push({ key: 'action', label: `Acción: ${actionLabel(filters.action)}` })
  if (filters.table_name) chips.push({ key: 'table_name', label: `Entidad: ${tables.value[filters.table_name] || filters.table_name}` })
  if (filters.record_id) chips.push({ key: 'record_id', label: `Registro: ${filters.record_id}` })
  return chips
})

function removeChip (key) {
  filters[key] = emptyFilters()[key]
}

/* ── Presentación de una fila ───────────────────────────────────── */

function actionOf (code) {
  return ACTIONS.find(a => a.code === code)
}

function actionLabel (code) {
  return actionOf(code)?.label || code
}

function actionClass (code) {
  return actionOf(code)?.tone || 'pill-slate'
}

function actionIcon (code) {
  return actionOf(code)?.icon || 'fa-circle'
}

// INSERT y DELETE no traen diff: fn_audit_changes solo llena changed_fields en
// los UPDATE. Las acciones de menú tampoco, porque no cambian ninguna fila.
// La celda dice qué pasó en vez de quedarse en blanco.
const NO_DIFF_LABELS = {
  INSERT: 'Registro creado',
  DELETE: 'Registro eliminado',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cerró sesión',
  UPDATE_BASE: 'Actualizó su base de asesor',
  SYNC_PROSPECTOS: 'Envió Prospectos a Google Sheets',
  SYNC_PLANEAMIENTO: 'Envió Planeamiento a Google Sheets',
  CATALOG_REFRESH: 'Refrescó el catálogo del sistema',
  SYNC_FICO: 'Sincronizó las ventas FICO a Google Sheets',
}

function noDiffLabel (action) {
  return NO_DIFF_LABELS[action] || 'Sin detalle'
}

// El backend ya manda el valor en español (nombre del catálogo, alias del
// usuario, código de la edición, monto o fecha con formato) o null si el campo
// estaba vacío. Aquí solo se recorta lo muy largo.
// ponytail: 60 caracteres; una observación entera se lee en el registro de
// origen, no en la bitácora.
function formatValue (value) {
  if (value === null || value === undefined || value === '') return 'vacío'
  const text = String(value)
  return text.length > 60 ? text.slice(0, 60) + '…' : text
}

/* ── Carga ──────────────────────────────────────────────────────── */

// Vacía los campos sin valor: el schema del backend rechaza '' donde espera
// una fecha o un entero. El rango de flatpickr llega como "2026-09-01 a
// 2026-09-03" (o un solo día mientras se elige el segundo extremo).
function payload () {
  const { date_range, ...rest } = filters
  const body = { page: page.value, page_size: pageSize.value }

  const [from, to = from] = String(date_range || '').split(' a ').map(part => part.trim()).filter(Boolean)
  if (from) Object.assign(body, { date_from: from, date_to: to })

  for (const [key, value] of Object.entries(rest)) {
    if (value !== null && value !== '' && !Number.isNaN(value)) body[key] = value
  }
  return body
}

// created_at llega ya formateado como 'DD/MM/YYYY HH:MM' en hora de Lima: la
// columna es `timestamp WITHOUT time zone` y armarla aca la haria pasar por dos
// zonas horarias adivinadas (la del proceso Node y la del navegador).
async function load () {
  isLoading.value = true
  try {
    const data = await configService.auditLog(payload())
    rows.value = data.rows
    users.value = data.users
    tables.value = data.tables
    scope.value = data.scope
    hasMore.value = data.has_more
    denied.value = ''
  } catch (err) {
    if (err?.response?.status === 403) {
      denied.value = err.response.data?.message || 'Tu rol no tiene acceso a la auditoría.'
      rows.value = []
    } else {
      console.error('Error cargando la auditoría:', err)
      toast.error('No se pudo cargar la bitácora de auditoría.')
    }
  } finally {
    isLoading.value = false
  }
}

function go (n) {
  page.value = n
  load()
}

function reload () {
  page.value = 1
  load()
}

function resetFilters () {
  Object.assign(filters, emptyFilters())
}

// Cambiar un filtro o el tamaño de página siempre vuelve a la página 1:
// quedarse en la 7 de un resultado nuevo muestra una tabla vacía que parece
// un error.
watch(filters, reload)
watch(pageSize, reload)

onMounted(load)
</script>

<style scoped>
/* Alcance del rol (todo el sistema o sus areas): dato fijo, no un filtro. */
.ap-scope {
  display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 14px;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm); white-space: nowrap;
}
.ap-scope-label { margin: 0; }
.ap-scope-value { font-size: 12.5px; font-weight: 600; color: var(--ds-accent); }

/* Barra de vistas rapidas + paginacion */
.ap-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}
.ap-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 16px; flex-wrap: wrap; flex: 1 1 auto;
}
.ap-size { display: inline-flex; align-items: center; gap: 8px; margin: 0; }
.ap-inline-label { margin: 0; }
.ap-size-select { width: auto; height: 30px; padding: 0 8px; font-size: 12px; }
.ap-pager { display: inline-flex; align-items: center; gap: 4px; }
.ap-page-current {
  min-width: 30px; height: 30px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ds-brand); color: var(--ds-on-brand);
  border-radius: var(--ds-radius-control); font-size: 12px; font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ap-filter-strip {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; border-top: 1px solid var(--ds-border);
  background: var(--ds-surface-2);
}
.ap-filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.ap-filter-strip :deep(.active-filters .label) { display: none; }

/* 7 columnas con filtro: bajo este ancho la tabla hace scroll dentro de
   .ds-table-scroll en vez de aplastar los filtros. */
.ect { min-width: 1000px; }
.tc { text-align: center; }
.ect th.tc { text-align: center; }

.ect-filters th { padding: 6px 8px; }
.ect-flt { height: 30px; min-width: 60px; padding: 0 8px; font-size: 12px; }
.num-input { text-align: right; }
/* Las flechitas del input number no caben en 30px de alto y tapan el numero. */
.ect-flt[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.ect-flt[type="number"]::-webkit-outer-spin-button,
.ect-flt[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* flatpickr renderiza su propio input (altInput) fuera del alcance de
   .ds-input, asi que hay que igualarlo a mano con los mismos tokens. */
.ect-filters :deep(.exec-flatpickr-input) {
  width: 100%; height: 30px; padding: 0 8px;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  font-size: 12px; font-family: inherit; color: var(--ds-ink);
  background: var(--ds-surface); box-sizing: border-box; outline: none;
}
.ect-filters :deep(.exec-flatpickr-input::placeholder) { color: var(--ds-muted); }
.ect-filters :deep(.exec-flatpickr-input:focus) { border-color: var(--ds-accent); }

/* Icono de accion: hace explorable la columna angosta y de paso le da sentido
   a la celda que en FICO ocupa el boton de detalle. */
.act-dot {
  width: 24px; height: 24px; border-radius: var(--ds-radius-sm);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px;
  background: var(--ds-soft-neutral); color: var(--ds-ink-2);
}
.act-dot.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.act-dot.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.act-dot.bad { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }

.cell-main { font-weight: 600; color: var(--ds-heading); line-height: 1.35; }
.cell-clip { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-sub { color: var(--ds-muted); font-size: 11.5px; }
.cell-date { font-size: 12px; color: var(--ds-ink-2); white-space: nowrap; }
.mono { font-family: var(--ds-font-mono); font-size: 12px; white-space: nowrap; }

.diff { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.diff li { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.diff-field { font-family: var(--ds-font-mono); font-size: 11px; font-weight: 700; color: var(--ds-ink-2); }
.diff-old { color: var(--ds-bad-ink); text-decoration: line-through; }
.diff-new { color: var(--ds-ok-ink); font-weight: 600; }
.diff-arrow { font-size: 8px; color: var(--ds-muted); }

@media (max-width: 992px) {
  .ap-toolbar { justify-content: flex-start; }
}
</style>
