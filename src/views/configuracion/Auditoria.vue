<template>
  <div class="audit-page">

    <header class="ap-masthead">
      <div class="ap-masthead-left">
        <span class="ap-breadcrumb">Configuración</span>
        <h1 class="ap-title">Auditoría</h1>
        <span class="ap-subtitle">Bitácora de movimientos del sistema</span>
      </div>
      <div class="ap-masthead-actions">
        <div class="ap-scope">
          <span class="ap-scope-label">Alcance:</span>
          <span class="ap-scope-value">{{ scopeLabel }}</span>
        </div>
      </div>
    </header>

    <div v-if="denied" class="ap-banner">
      <i class="fa-solid fa-lock"></i> {{ denied }}
    </div>

    <template v-else>
      <section class="ap-filter-bar" :class="{ 'is-filtered': activeChips.length > 0 }">
        <div class="ap-filter-bar-main">
          <nav class="ap-tabs" aria-label="Vistas rápidas">
            <button
              v-for="view in QUICK_VIEWS"
              :key="view.key"
              :class="['ap-tab', { 'is-active': activeViewKey === view.key }]"
              @click="applyQuickView(view)"
            >
              <i class="fa-solid" :class="view.icon"></i> {{ view.label }}
            </button>
          </nav>

          <div class="ap-toolbar">
            <label class="ap-size">
              <span class="ap-size-label">Mostrar</span>
              <select v-model.number="pageSize" class="ap-select">
                <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
              </select>
              <span class="ap-size-label">filas</span>
            </label>
            <div class="ap-pager">
              <button class="ap-page-btn" :disabled="page === 1 || isLoading" title="Página anterior" @click="go(page - 1)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <span class="ap-page-current">{{ page }}</span>
              <button class="ap-page-btn" :disabled="!hasMore || isLoading" title="Página siguiente" @click="go(page + 1)">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeChips.length" class="ap-filter-strip">
          <span class="ap-filter-strip-badge">
            <i class="fa-solid fa-circle-half-stroke"></i>
            Filtros activos
            <span class="ap-filter-strip-count">{{ activeChips.length }}</span>
          </span>
          <BaseFilterChips :items="activeChips" @remove="removeChip" @clear-all="resetFilters" />
        </div>
      </section>

      <div class="ect-wrap">
        <table class="ect">
          <thead>
            <tr class="ect-head">
              <th class="tc" style="width:42px"></th>
              <th style="width:132px">Fecha y hora</th>
              <th style="width:150px">Usuario</th>
              <th style="width:130px">Acción</th>
              <th style="width:200px">Entidad</th>
              <th class="tr" style="width:100px">Registro</th>
              <th>Cambios</th>
            </tr>

            <!-- Toda columna filtra desde esta fila: ningun control vive fuera
                 de la tabla. Es la misma convencion de FICO/Inscripciones. -->
            <tr class="ect-filters">
              <td class="tc">
                <button class="filter-clear" title="Limpiar filtros" @click="resetFilters">
                  <i class="fa-solid fa-eraser"></i>
                </button>
              </td>
              <td>
                <BaseDatePicker
                  v-model="filters.date_range"
                  :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                  placeholder="Fecha..."
                />
              </td>
              <td>
                <select v-model="filters.user_id_filter" class="filter-input">
                  <option :value="null">Todos</option>
                  <option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.alias }}</option>
                </select>
              </td>
              <td>
                <select v-model="filters.action" class="filter-input">
                  <option :value="null">Todas</option>
                  <option v-for="a in ACTIONS" :key="a.code" :value="a.code">{{ a.label }}</option>
                </select>
              </td>
              <td>
                <select v-model="filters.table_name" class="filter-input">
                  <option :value="null">Todas</option>
                  <option v-for="(label, code) in tables" :key="code" :value="code">{{ label }}</option>
                </select>
              </td>
              <td>
                <input v-model.number="filters.record_id" type="number" min="0" class="filter-input tr" placeholder="N°" />
              </td>
              <td></td>
            </tr>
          </thead>

          <tbody v-if="isLoading">
            <tr v-for="n in 10" :key="'sk' + n" class="skeleton-row">
              <td class="tc"><div class="sk-cell" style="width:22px;margin:0 auto"></div></td>
              <td><div class="sk-cell" style="width:100px"></div></td>
              <td><div class="sk-cell" style="width:90px"></div></td>
              <td><div class="sk-cell" style="width:74px"></div></td>
              <td><div class="sk-cell" style="width:120px"></div></td>
              <td class="tr"><div class="sk-cell" style="width:50px;margin-left:auto"></div></td>
              <td><div class="sk-cell" :style="{ width: (35 + (n % 5) * 12) + '%' }"></div></td>
            </tr>
          </tbody>

          <tbody v-else-if="!rows.length">
            <tr>
              <td colspan="7" class="empty-row">
                <div class="empty-state">
                  <span class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></span>
                  <p class="empty-title">Sin movimientos</p>
                  <p class="empty-text">No hay actividad registrada con estos filtros. Prueba ampliando el rango de fechas.</p>
                </div>
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr v-for="row in rows" :key="row.id" class="ect-row">
              <td class="tc">
                <span class="act-dot" :class="actionClass(row.action)" :title="actionLabel(row.action)">
                  <i class="fa-solid" :class="actionIcon(row.action)"></i>
                </span>
              </td>
              <td class="cell-date">{{ row.created_at || '—' }}</td>
              <td class="cell-main cell-clip" :title="row.user_alias">{{ row.user_alias }}</td>
              <td><span class="pill" :class="actionClass(row.action)">{{ actionLabel(row.action) }}</span></td>
              <td class="cell-clip" :title="row.table_label">{{ row.table_label }}</td>
              <td class="tr mono">{{ row.record_id ?? '—' }}</td>
              <td>
                <ul v-if="row.changes.length" class="diff">
                  <li v-for="c in row.changes" :key="c.field">
                    <span class="diff-field">{{ c.label }}</span>
                    <span class="diff-old">{{ formatValue(c.old) }}</span>
                    <i class="fa-solid fa-arrow-right diff-arrow"></i>
                    <span class="diff-new">{{ formatValue(c.new) }}</span>
                  </li>
                </ul>
                <span v-else class="cell-sub">{{ noDiffLabel(row.action) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
// los UPDATE. La celda dice qué pasó en vez de quedarse en blanco.
function noDiffLabel (action) {
  return { INSERT: 'Registro creado', DELETE: 'Registro eliminado', LOGIN: 'Inicio de sesión' }[action] || 'Sin detalle'
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
/* Paleta y tipografia clonadas de FICO/Inscripciones (EnrollmentPage.vue +
   EnrollmentCompactTable.vue). Estan en <style scoped>, asi que el hash de Vue
   impide reusarlas desde aca y hay que repetirlas.
   ponytail: a la tercera vista que necesite este look, extraer .ect-* a
   styles/style.scss en vez de copiarlo de nuevo. */
.audit-page {
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
}

/* === Masthead === */
.ap-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ap-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ap-breadcrumb {
  font-size: 11px; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
}
.ap-title {
  font-size: 26px; font-weight: 600; color: var(--e-text);
  margin: 0; letter-spacing: -0.02em; line-height: 1.1;
}
.ap-subtitle {
  font-size: 13.5px; color: var(--e-text-secondary);
  font-weight: 400; margin-top: 2px;
}
.ap-masthead-actions { display: flex; align-items: center; gap: 10px; }
.ap-scope {
  display: flex; align-items: center; gap: 6px;
  height: 38px; box-sizing: border-box; padding: 0 14px;
  background: #fff; border: 1px solid var(--e-border); border-radius: 8px;
  white-space: nowrap;
}
.ap-scope-label {
  font-size: 11px; font-weight: 600; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ap-scope-value { font-size: 12.5px; font-weight: 600; color: var(--e-accent); }

.ap-banner {
  display: flex; align-items: center; gap: 8px;
  background: #FFFBEB; border: 1px solid #FDE68A; color: #B45309;
  border-radius: 10px; padding: 12px 16px; font-size: 12.5px; line-height: 1.5;
}

/* === Barra de filtros (tarjeta) === */
.ap-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  display: flex; flex-direction: column; overflow: hidden;
  margin-bottom: 14px;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ap-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ap-filter-bar-main {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}

.ap-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 0 1 auto; }
.ap-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary); background: var(--e-bg-subtle);
  border: 1px solid transparent; border-radius: 8px;
  cursor: pointer; transition: all .15s ease; font-family: inherit;
}
.ap-tab i { font-size: 11px; opacity: 0.7; }
.ap-tab:hover { color: var(--e-text); background: #F5F5F5; }
.ap-tab.is-active {
  color: var(--e-accent); background: var(--e-accent-soft);
  border-color: rgba(13, 148, 136, 0.25); font-weight: 600;
}
.ap-tab.is-active i { opacity: 1; }

.ap-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 16px; flex-wrap: wrap; flex: 1 1 auto;
}
.ap-size { display: inline-flex; align-items: center; gap: 8px; margin: 0; }
.ap-size-label {
  font-size: 10.5px; font-weight: 600; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ap-select {
  height: 30px; padding: 0 8px;
  border: 1px solid var(--e-border); border-radius: 6px;
  background: #fff; color: var(--e-text);
  font-size: 12px; font-family: inherit; cursor: pointer;
}
.ap-pager { display: inline-flex; align-items: center; gap: 4px; }
.ap-page-btn {
  width: 30px; height: 30px;
  border: 1px solid var(--e-border); background: #fff;
  border-radius: 6px; cursor: pointer;
  color: var(--e-text-secondary); font-size: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .15s ease;
}
.ap-page-btn:hover:not(:disabled) {
  background: var(--e-accent-soft); border-color: var(--e-accent); color: var(--e-accent);
}
.ap-page-btn:disabled { opacity: 0.4; cursor: default; }
.ap-page-current {
  min-width: 30px; height: 30px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--we-navy, #002060); color: #fff;
  border-radius: 6px; font-size: 12px; font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ap-filter-strip {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ap-filter-strip-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 600; color: #047857;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.ap-filter-strip-badge i { font-size: 11px; }
.ap-filter-strip-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--e-accent); color: #fff; border-radius: 9px;
  font-size: 10.5px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.ap-filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.ap-filter-strip :deep(.active-filters .label) { display: none; }

/* === Tabla === */
.ect-wrap {
  background: #fff; border-radius: 10px;
  overflow-x: auto; border: 1px solid #F0F0F0;
}
.ect { width: 100%; border-collapse: collapse; font-size: 11.5px; color: #1A1A1A; }
.tc { text-align: center; }
.tr { text-align: right; }

.ect-head th {
  background: #FAFAFA; padding: 8px 10px; text-align: left;
  font-weight: 500; color: #8C8C8C; border-bottom: 1px solid #F0F0F0;
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
  white-space: nowrap;
}
.ect-filters { background: #FAFAFA; }
.ect-filters td { padding: 6px 8px; border-bottom: 1px solid #F0F0F0; }

.filter-input {
  width: 100%; height: 30px; padding: 0 10px;
  border: 1px solid #E8E8E8; border-radius: 6px;
  font-size: 12px; color: #1A1A1A; background: #fff;
  transition: all .2s ease; font-family: inherit;
}
.filter-input:focus {
  outline: none; border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}
.filter-input::placeholder { color: #C4C4C4; }
.filter-input.tr { text-align: right; }
/* Las flechitas del input number no caben en 30px de alto y tapan el numero. */
.filter-input[type="number"] { -moz-appearance: textfield; }
.filter-input[type="number"]::-webkit-outer-spin-button,
.filter-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* flatpickr renderiza su propio input (altInput) fuera del alcance de
   .filter-input, asi que hay que igualarlo a mano. */
.ect-filters :deep(.exec-flatpickr-input) {
  width: 100%; height: 30px; padding: 0 10px;
  border: 1px solid #E8E8E8; border-radius: 6px;
  font-size: 12px; font-family: inherit; color: #1A1A1A;
  background: #fff; box-sizing: border-box; outline: none;
  transition: all .2s ease;
}
.ect-filters :deep(.exec-flatpickr-input::placeholder) { color: #C4C4C4; }
.ect-filters :deep(.exec-flatpickr-input:focus) {
  border-color: #0D9488; box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}

.filter-clear {
  width: 28px; height: 28px;
  border: 1px solid #E8E8E8; background: #fff; border-radius: 6px;
  cursor: pointer; color: #A3A3A3; font-size: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .2s ease;
}
.filter-clear:hover { background: #FEF2F2; border-color: #FCA5A5; color: #EF4444; }

.ect-row td {
  padding: 7px 10px; border-bottom: 1px solid #F5F5F5;
  vertical-align: middle; transition: background .15s ease;
}
.ect-row:hover td { background: #FAFAFA; }
.ect-row:last-child td { border-bottom: none; }

/* Icono de accion: hace explorable la columna angosta y de paso le da sentido
   a la celda que en FICO ocupa el boton de detalle. */
.act-dot {
  width: 24px; height: 24px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px;
}

.cell-main { font-weight: 600; color: #1A1A1A; font-size: 11.5px; line-height: 1.35; }
.cell-clip {
  display: block; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; max-width: 100%;
}
.cell-sub { color: #A3A3A3; font-size: 10.5px; }
.cell-date { font-size: 11px; color: #737373; white-space: nowrap; }
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11px; letter-spacing: -0.01em; white-space: nowrap;
}

.pill {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 4px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
}
.pill-slate { background: #F5F5F5; color: #737373; }
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-red   { background: #FEF2F2; color: #991B1B; }

.diff { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.diff li { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.diff-field {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 10.5px; font-weight: 700; color: #6F6F66;
}
.diff-old { color: #B91C1C; text-decoration: line-through; }
.diff-new { color: #047857; font-weight: 600; }
.diff-arrow { font-size: 8px; color: #C4C4C4; }

.empty-row { padding: 0; }
.empty-state {
  padding: 56px 24px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px;
}
.empty-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: #FAFAFA; color: #A3A3A3;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 20px; margin-bottom: 8px; border: 1px solid #EFEFEF;
}
.empty-title { font-size: 14px; font-weight: 700; color: #1A1A1A; margin: 0; letter-spacing: -0.01em; }
.empty-text { font-size: 12.5px; color: #737373; margin: 0; max-width: 320px; line-height: 1.5; }

.skeleton-row td {
  padding: 12px 10px; border-bottom: 1px solid #F5F5F5;
  vertical-align: middle; height: 44px; box-sizing: border-box;
}
.sk-cell {
  height: 12px; border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: ap-sk-shimmer 1.4s ease-in-out infinite;
}
@keyframes ap-sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 992px) {
  .ap-masthead { flex-direction: column; align-items: flex-start; gap: 12px; }
  .ap-toolbar { justify-content: flex-start; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .audit-page {
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16,185,129,0.16);
}
[data-coreui-theme="dark"] .ap-scope,
[data-coreui-theme="dark"] .ap-filter-bar,
[data-coreui-theme="dark"] .ap-select,
[data-coreui-theme="dark"] .ap-page-btn { background: #1A1A14; color: #F4F4F0; }
[data-coreui-theme="dark"] .ap-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .ap-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .ap-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .ap-page-current { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ap-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .ap-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .ap-banner {
  background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #FBBF24;
}
[data-coreui-theme="dark"] .ect-wrap { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ect { color: #F4F4F0; }
[data-coreui-theme="dark"] .ect-head th {
  background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ect-filters,
[data-coreui-theme="dark"] .ect-filters td { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-input,
[data-coreui-theme="dark"] .ect-filters :deep(.exec-flatpickr-input) {
  background: #14140F; border-color: #2A2A22; color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-input::placeholder,
[data-coreui-theme="dark"] .ect-filters :deep(.exec-flatpickr-input::placeholder) { color: #6F6F66; }
[data-coreui-theme="dark"] .filter-input:focus,
[data-coreui-theme="dark"] .ect-filters :deep(.exec-flatpickr-input:focus) {
  border-color: #34D399; box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
}
[data-coreui-theme="dark"] .filter-clear { background: #14140F; border-color: #2A2A22; color: #6F6F66; }
[data-coreui-theme="dark"] .filter-clear:hover {
  background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.4); color: #F87171;
}
[data-coreui-theme="dark"] .ect-row td { border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .ect-row:hover td { background: #1F1F1A; }
[data-coreui-theme="dark"] .cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .cell-sub,
[data-coreui-theme="dark"] .cell-date { color: #A0A099; }
[data-coreui-theme="dark"] .mono { color: #F4F4F0; }
[data-coreui-theme="dark"] .diff-field { color: #A0A099; }
[data-coreui-theme="dark"] .diff-old { color: #F87171; }
[data-coreui-theme="dark"] .diff-new { color: #4ADE80; }
[data-coreui-theme="dark"] .pill-slate { background: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .pill-green { background: rgba(34,197,94,.16); color: #4ADE80; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red   { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .empty-icon { background: #1F1F1A; border-color: #2A2A22; color: #6F6F66; }
[data-coreui-theme="dark"] .empty-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .empty-text { color: #A0A099; }
[data-coreui-theme="dark"] .sk-cell {
  background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%);
  background-size: 200% 100%;
}
</style>
