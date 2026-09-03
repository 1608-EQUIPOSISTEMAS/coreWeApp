<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-text">
            <span class="brand-eyebrow">Configuración</span>
            <h1 class="brand-title">Auditoría</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <div class="inline-kpi">
            <span class="inline-kpi-label">Alcance</span>
            <span class="inline-kpi-value accent">{{ scopeLabel }}</span>
          </div>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <p class="intro">
        Cada creación, edición o borrado que el sistema registra sobre inscripciones, pagos,
        consultas, ediciones y accesos, con el usuario que lo hizo y el detalle de qué cambió.
      </p>

      <div v-if="denied" class="banner banner-warn">
        <i class="fa-solid fa-lock me-1"></i> {{ denied }}
      </div>

      <template v-else>
        <section class="filters">
          <label class="field">
            <span>Desde</span>
            <input v-model="filters.date_from" type="date" class="exec-input-light" />
          </label>
          <label class="field">
            <span>Hasta</span>
            <input v-model="filters.date_to" type="date" class="exec-input-light" />
          </label>
          <label class="field">
            <span>Usuario</span>
            <select v-model="filters.user_id_filter" class="exec-input-light">
              <option :value="null">Todos</option>
              <option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.alias }}</option>
            </select>
          </label>
          <label class="field">
            <span>Entidad</span>
            <select v-model="filters.table_name" class="exec-input-light">
              <option :value="null">Todas</option>
              <option v-for="(label, code) in tables" :key="code" :value="code">{{ label }}</option>
            </select>
          </label>
          <label class="field">
            <span>Acción</span>
            <select v-model="filters.action" class="exec-input-light">
              <option :value="null">Todas</option>
              <option v-for="a in ACTIONS" :key="a.code" :value="a.code">{{ a.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>N° de registro</span>
            <input v-model.number="filters.record_id" type="number" class="exec-input-light" placeholder="Ej. 16618" />
          </label>
          <button class="btn-link reset" @click="resetFilters">Limpiar</button>
        </section>

        <section class="detail-panel">
          <div class="table-wrap">
            <table class="exec-table">
              <thead>
                <tr>
                  <th class="col-when">Fecha y hora</th>
                  <th class="col-who">Usuario</th>
                  <th class="col-what">Acción</th>
                  <th class="col-where">Entidad</th>
                  <th class="col-rec">Registro</th>
                  <th>Cambios</th>
                </tr>
              </thead>

              <tbody v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td v-for="c in 6" :key="c"><span class="skel" :style="{ width: (40 + ((n + c) % 5) * 12) + '%' }"></span></td>
                </tr>
              </tbody>

              <tbody v-else-if="!rows.length">
                <tr><td colspan="6" class="empty-state">No hay movimientos con estos filtros.</td></tr>
              </tbody>

              <tbody v-else>
                <tr v-for="row in rows" :key="row.id">
                  <td class="col-when text-mono">{{ fmt.formatDateTime(row.created_at) }}</td>
                  <td class="col-who">{{ row.user_alias }}</td>
                  <td class="col-what"><span class="pill" :class="actionClass(row.action)">{{ actionLabel(row.action) }}</span></td>
                  <td class="col-where">{{ row.table_label }}</td>
                  <td class="col-rec text-mono">{{ row.record_id ?? '—' }}</td>
                  <td>
                    <ul v-if="row.changes.length" class="diff">
                      <li v-for="c in row.changes" :key="c.field">
                        <span class="diff-field text-mono">{{ c.field }}</span>
                        <span class="diff-old">{{ formatValue(c.old) }}</span>
                        <i class="fa-solid fa-arrow-right diff-arrow"></i>
                        <span class="diff-new">{{ formatValue(c.new) }}</span>
                      </li>
                    </ul>
                    <span v-else class="text-muted">{{ noDiffLabel(row.action) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager">
            <button class="btn-exec btn-exec-ghost" :disabled="page === 1 || isLoading" @click="go(page - 1)">
              <i class="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <span class="pager-label">Página {{ page }}</span>
            <button class="btn-exec btn-exec-ghost" :disabled="!hasMore || isLoading" @click="go(page + 1)">
              Siguiente <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </section>
      </template>

    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

// Mismo formateador que FICO/Inscripciones: la fecha llega ya armada como
// 'DD/MM/YYYY HH:MM' desde el backend y formatDateTime la respeta tal cual.
const fmt = useEnrollmentFormatters()
const toast = useToast()
const configService = inject(ServiceKeys.Config)

const ACTIONS = [
  { code: 'INSERT', label: 'Creación' },
  { code: 'UPDATE', label: 'Edición' },
  { code: 'DELETE', label: 'Borrado' },
  { code: 'LOGIN', label: 'Acceso' },
]

const rows = ref([])
const users = ref([])
const tables = ref({})
const scope = ref(null)
const hasMore = ref(false)
const page = ref(1)
const isLoading = ref(false)
const denied = ref('')

const emptyFilters = () => ({
  date_from: null, date_to: null, user_id_filter: null,
  table_name: null, action: null, record_id: null,
})
const filters = reactive(emptyFilters())

const scopeLabel = computed(() => (scope.value ? scope.value.join(' · ') : 'Todo el sistema'))

function actionLabel (code) {
  return ACTIONS.find(a => a.code === code)?.label || code
}

function actionClass (code) {
  return { INSERT: 'pill-green', UPDATE: 'pill-amber', DELETE: 'pill-red', LOGIN: 'pill-slate' }[code] || 'pill-slate'
}

// INSERT y DELETE no traen diff: fn_audit_changes solo llena changed_fields en
// los UPDATE. La celda dice qué pasó en vez de quedarse en blanco.
function noDiffLabel (action) {
  return { INSERT: 'Registro creado', DELETE: 'Registro eliminado', LOGIN: 'Inicio de sesión' }[action] || 'Sin detalle'
}

// Los valores del diff son jsonb crudo: number, string, null u objeto.
// ponytail: se recortan a 60 caracteres; un valor largo se lee entero en el
// registro de origen, no en la bitácora.
function formatValue (value) {
  if (value === null || value === undefined || value === '') return '—'
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.length > 60 ? text.slice(0, 60) + '…' : text
}

// Vacía los campos sin valor: el schema del backend rechaza '' donde espera
// una fecha o un entero.
function payload () {
  const body = { page: page.value, page_size: 50 }
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== '' && !Number.isNaN(value)) body[key] = value
  }
  return body
}

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

// Cambiar un filtro siempre vuelve a la página 1: quedarse en la 7 de un
// resultado nuevo muestra una tabla vacía que parece un error.
watch(filters, reload)

onMounted(load)
</script>

<style scoped>
.exec-shell { min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }

/* El masthead NO se pinta aca: style.scss lo fuerza a claro con !important
   desde la unificacion de marca 07/2026. Solo layout. */
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-eyebrow { display: block; margin-bottom: 3px; }
.brand-title { margin: 0; }
.masthead-actions { display: flex; gap: 16px; align-items: center; }
.inline-kpi { text-align: right; }
.inline-kpi-label { display: block; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
.inline-kpi-value { font-size: 13px; font-weight: 700; }

.exec-body { flex: 1; padding: 20px 28px; }
.intro { font-size: 12.5px; color: var(--text-secondary, #475569); max-width: 820px; margin: 0 0 14px; line-height: 1.55; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all .15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-ghost { background: #fff; color: var(--text-primary, #0f172a); border-color: var(--border, #e2e8f0); }
.btn-exec-ghost:hover:not(:disabled) { border-color: var(--slate-400, #94a3b8); }
.btn-link { background: none; border: none; color: var(--teal-600, #0d9488); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
.btn-link:hover { text-decoration: underline; }

.banner { border-radius: 6px; padding: 10px 14px; font-size: 12.5px; margin-bottom: 12px; line-height: 1.5; }
.banner-warn { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }

.filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field > span { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--text-muted, #94a3b8); }
.field .exec-input-light { min-width: 150px; }
.reset { margin-bottom: 10px; }

.detail-panel { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); padding: 4px 0 12px; min-height: 320px; }
.table-wrap { overflow-x: auto; }

.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.exec-table th { text-align: left; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--text-muted, #94a3b8); padding: 12px 14px; border-bottom: 1px solid var(--border, #e2e8f0); white-space: nowrap; }
.exec-table td { padding: 10px 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); vertical-align: top; }
.exec-table tbody tr:hover td { background: var(--slate-50, #f8fafc); }
.col-when { white-space: nowrap; width: 1%; }
.col-who { font-weight: 600; white-space: nowrap; width: 1%; }
.col-what, .col-where, .col-rec { white-space: nowrap; width: 1%; }

.diff { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.diff li { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.diff-field { font-size: 11px; font-weight: 700; color: var(--text-secondary, #475569); }
.diff-old { color: #b91c1c; text-decoration: line-through; }
.diff-new { color: #047857; font-weight: 600; }
.diff-arrow { font-size: 8px; color: var(--text-muted, #94a3b8); }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-green { background: #dcfce7; color: #15803d; }
.pill-amber { background: #fef3c7; color: #b45309; }
.pill-red { background: #fee2e2; color: #b91c1c; }
.pill-slate { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); }

.pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 14px 14px 2px; }
.pager-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #475569); }

.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.text-muted { color: var(--text-muted, #94a3b8); }
.me-1 { margin-right: 4px; }
.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

.skel { display: block; height: 12px; border-radius: 4px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 992px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-body { padding: 16px 12px; }
  .field .exec-input-light { min-width: 130px; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  --slate-50: #1F1F1A;
  --slate-100: #24241E;
  --slate-300: #3A3A33;
  --slate-400: #8A8A80;
  --border: #2A2A22;
  --text-primary: #F4F4F0;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
}
[data-coreui-theme="dark"] .exec-shell .btn-exec-ghost { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .btn-link { color: #2DD4BF; }
[data-coreui-theme="dark"] .exec-shell .detail-panel { background: #1A1A14; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
[data-coreui-theme="dark"] .exec-shell .banner-warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #FBBF24; }
[data-coreui-theme="dark"] .exec-shell .exec-input-light { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-shell .pill-green { background: rgba(34,197,94,.16); color: #4ADE80; }
[data-coreui-theme="dark"] .exec-shell .pill-amber { background: rgba(245,158,11,.16); color: #FBBF24; }
[data-coreui-theme="dark"] .exec-shell .pill-red { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .exec-shell .diff-old { color: #F87171; }
[data-coreui-theme="dark"] .exec-shell .diff-new { color: #4ADE80; }
[data-coreui-theme="dark"] .exec-shell .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
[data-coreui-theme="dark"] .exec-shell .text-muted { color: #8A8A80; }
</style>
