<template>
  <div class="cob-page">
    <!-- Masthead -->
    <header class="cob-masthead">
      <div class="cob-masthead-left">
        <span class="cob-breadcrumb">FICO</span>
        <h1 class="cob-title">Cobranzas</h1>
        <span class="cob-subtitle">Cuotas pendientes del mes</span>
      </div>
      <div class="cob-masthead-actions">
        <div class="cob-month-pick">
          <button class="cob-month-nav" @click="shiftMonth(-1)" title="Mes anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <input type="month" v-model="monthValue" class="cob-month-input" />
          <button class="cob-month-nav" @click="shiftMonth(1)" title="Mes siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="cob-day-pick">
          <i class="fa-solid fa-calendar-day cob-day-icon"></i>
          <select v-model="daySelected" class="cob-day-select" @change="loadCollections">
            <option :value="null">Todos los dias</option>
            <option v-for="d in daysInMonth" :key="d" :value="d">Dia {{ d }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- KPIs -->
    <section class="cob-section">
      <div class="cob-kpis">
        <article class="cob-kpi cob-kpi-indigo">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Total a cobrar</span><i class="fa-solid fa-coins cob-kpi-icon"></i></div>
          <div class="cob-kpi-value"><span v-if="loading" class="skel-kpi"></span><template v-else>S/. {{ fmtMoney(kpis.total_amount) }}</template></div>
          <span class="cob-kpi-foot"><span v-if="loading" class="skel-kpi" style="width:48px"></span><template v-else>{{ kpis.total_count }} cuota{{ kpis.total_count === 1 ? '' : 's' }}</template></span>
        </article>
        <article class="cob-kpi cob-kpi-red">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Vencidas</span><i class="fa-solid fa-triangle-exclamation cob-kpi-icon"></i></div>
          <div class="cob-kpi-value"><span v-if="loading" class="skel-kpi"></span><template v-else>S/. {{ fmtMoney(kpis.overdue_amount) }}</template></div>
          <span class="cob-kpi-foot"><span v-if="loading" class="skel-kpi" style="width:48px"></span><template v-else>{{ kpis.overdue_count }} cuota{{ kpis.overdue_count === 1 ? '' : 's' }}</template></span>
        </article>
        <article class="cob-kpi cob-kpi-amber">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Hoy</span><i class="fa-solid fa-clock cob-kpi-icon"></i></div>
          <div class="cob-kpi-value"><span v-if="loading" class="skel-kpi"></span><template v-else>S/. {{ fmtMoney(kpis.today_amount) }}</template></div>
          <span class="cob-kpi-foot"><span v-if="loading" class="skel-kpi" style="width:48px"></span><template v-else>{{ kpis.today_count }} cuota{{ kpis.today_count === 1 ? '' : 's' }}</template></span>
        </article>
        <article class="cob-kpi cob-kpi-green">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Por vencer</span><i class="fa-solid fa-calendar-check cob-kpi-icon"></i></div>
          <div class="cob-kpi-value"><span v-if="loading" class="skel-kpi"></span><template v-else>S/. {{ fmtMoney(kpis.upcoming_amount) }}</template></div>
          <span class="cob-kpi-foot"><span v-if="loading" class="skel-kpi" style="width:48px"></span><template v-else>{{ kpis.upcoming_count }} cuota{{ kpis.upcoming_count === 1 ? '' : 's' }}</template></span>
        </article>
      </div>
    </section>

    <!-- Toolbar -->
    <section class="cob-section cob-toolbar">
      <div class="cob-search-wrap">
        <i class="fa-solid fa-magnifying-glass cob-search-icon"></i>
        <input
          v-model="searchInput"
          @input="onSearchInput"
          type="text"
          class="cob-search"
          placeholder="Buscar por nombre, DNI o correo..."
        />
      </div>

      <div class="cob-tabs">
        <button :class="['cob-tab', { 'is-active': stateFilter === 'all' }]" @click="setState('all')">
          Todas <span class="cob-tab-count">{{ kpis.total_count }}</span>
        </button>
        <button :class="['cob-tab cob-tab-red', { 'is-active': stateFilter === 'overdue' }]" @click="setState('overdue')">
          Vencidas <span class="cob-tab-count">{{ kpis.overdue_count }}</span>
        </button>
        <button :class="['cob-tab cob-tab-amber', { 'is-active': stateFilter === 'today' }]" @click="setState('today')">
          Hoy <span class="cob-tab-count">{{ kpis.today_count }}</span>
        </button>
        <button :class="['cob-tab cob-tab-green', { 'is-active': stateFilter === 'upcoming' }]" @click="setState('upcoming')">
          Por vencer <span class="cob-tab-count">{{ kpis.upcoming_count }}</span>
        </button>
      </div>

      <div class="cob-filter-asesor">
        <MultiSelect
          v-model="advisorIds"
          :items="advisorOptions"
          label-key="description"
          value-key="id"
          placeholder="Todos los asesores"
          @update:modelValue="loadCollections"
        />
      </div>
    </section>

    <!-- Tabla -->
    <section class="cob-section">
      <div class="cob-table-wrap">
        <table class="cob-table">
          <thead>
            <tr>
              <th style="width:42px">#</th>
              <th>Alumno / Documento</th>
              <th>Programa / Edición</th>
              <th class="tc" style="width:75px">Cuota</th>
              <th class="tr" style="width:110px">Monto</th>
              <th class="tc" style="width:115px">Vencimiento</th>
              <th class="tc" style="width:120px">Estado</th>
              <th class="tc" style="width:130px">Canal · Asesor</th>
              <th class="tc" style="width:120px">Accion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="cob-empty">
                <i class="fa-solid fa-spinner fa-spin"></i> Cargando cobranzas...
              </td>
            </tr>
            <tr v-else-if="!items.length">
              <td colspan="9" class="cob-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                No hay cuotas pendientes que coincidan con los filtros.
              </td>
            </tr>
            <tr v-for="(it, idx) in items" :key="it.installment_id" v-else class="cob-row" :class="`cob-row-${it.state_label}`">
              <td class="tc">{{ idx + 1 }}</td>
              <td>
                <div class="cob-cell-main">{{ it.student_full_name }}</div>
                <div class="cob-cell-sub">{{ it.document_number || '— sin DNI' }} · {{ it.email || '— sin correo' }}</div>
              </td>
              <td>
                <div class="cob-cell-main">{{ it.program_name || '---' }}</div>
                <div class="cob-cell-sub">{{ it.edition_code || '—' }}</div>
              </td>
              <td class="tc">
                <span class="cob-pill cob-pill-slate">C{{ it.installment_number }}</span>
              </td>
              <td class="tr mono cob-amount">S/. {{ fmtMoney(it.amount) }}</td>
              <td class="tc cob-date">{{ fmtDate(it.due_date) }}</td>
              <td class="tc">
                <span class="cob-pill" :class="stateBadgeClass(it.state_label)">
                  {{ stateLabel(it) }}
                </span>
              </td>
              <td class="tc">
                <span v-if="it.seller_agent_name" class="cob-asesor">{{ it.seller_agent_name }}</span>
                <span v-else class="cob-muted">—</span>
              </td>
              <td class="tc">
                <button class="cob-btn-action" @click="goToEnrollment(it.enrollment_id)" title="Ver inscripcion">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import MultiSelect from '@/components/MultiSelect.vue'

const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const authService = inject(ServiceKeys.Auth)

const today = new Date()
const monthValue = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const daySelected = ref(null)
const searchInput = ref('')
const searchQuery = ref('')
const stateFilter = ref('all')
const advisorIds = ref([])
const advisorOptions = ref([])

const items = ref([])
const kpis = reactive({
  total_count: 0, total_amount: 0,
  overdue_count: 0, overdue_amount: 0,
  today_count: 0, today_amount: 0,
  upcoming_count: 0, upcoming_amount: 0
})
const loading = ref(false)

const yearMonth = computed(() => {
  const [y, m] = monthValue.value.split('-').map(Number)
  return { year: y, month: m }
})

// Cantidad de dias en el mes seleccionado. new Date(y, m, 0) devuelve el ultimo
// dia del mes anterior; pasandole m (1-indexed pasado a Date como 0-indexed)
// se obtiene el ultimo dia del mes seleccionado.
const daysInMonth = computed(() => {
  const { year, month } = yearMonth.value
  const last = new Date(year, month, 0).getDate()
  return Array.from({ length: last }, (_, i) => i + 1)
})

// Si cambia el mes, el dia seleccionado pierde sentido (31 marzo no existe en
// abril). Lo reseteamos a "Todos los dias".
watch(monthValue, () => { daySelected.value = null })

function shiftMonth (delta) {
  const [y, m] = monthValue.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  monthValue.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function setState (s) {
  stateFilter.value = s
  loadCollections()
}

let searchTimer = null
function onSearchInput () {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchQuery.value = searchInput.value.trim()
    loadCollections()
  }, 320)
}

watch(monthValue, loadCollections)

async function loadCollections () {
  loading.value = true
  try {
    const { year, month } = yearMonth.value
    const r = await ficoService.getCollections({
      year, month,
      day: daySelected.value || null,
      q: searchQuery.value || null,
      state: stateFilter.value,
      advisor_ids: advisorIds.value.map(Number).filter(Number.isFinite)
    })
    items.value = r?.items || []
    Object.assign(kpis, r?.kpis || {})
  } catch (err) {
    console.error('[loadCollections]', err)
    toast.error(err?.response?.data?.error || 'No se pudieron cargar las cobranzas.')
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadAdvisors () {
  try {
    const arr = await authService.userList({})
    advisorOptions.value = (arr || [])
      .filter(u => u.alias && u.active)
      .map(u => ({
        id: u.user_id,
        description: u.full_name ? `${u.alias} — ${u.full_name}` : u.alias
      }))
      .sort((a, b) => a.description.localeCompare(b.description))
  } catch (err) {
    console.error('[loadAdvisors]', err)
  }
}

function goToEnrollment (id) {
  router.push({ name: 'enrollmentDetail', params: { id: String(id) } })
}

function fmtMoney (n) {
  const v = Number(n) || 0
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// due_date llega como cadena calendario YYYY-MM-DD (es una etiqueta, no un instante).
// new Date('YYYY-MM-DD') la parsea como UTC midnight y luego toLocaleDateString('es-PE')
// la corre 5h hacia atras → muestra el dia anterior. Aqui formateamos por componentes
// para preservar la fecha tal cual la define el negocio.
function fmtDate (d) {
  if (!d) return '—'
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
  }
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
}

function stateBadgeClass (s) {
  if (s === 'overdue') return 'cob-pill-red'
  if (s === 'today') return 'cob-pill-amber'
  if (s === 'upcoming') return 'cob-pill-green'
  return 'cob-pill-slate'
}

function stateLabel (it) {
  if (it.state_label === 'overdue') {
    const days = Math.abs(Number(it.days_to_due) || 0)
    return days > 0 ? `Vencida hace ${days}d` : 'Vencida'
  }
  if (it.state_label === 'today') return 'Vence hoy'
  const days = Number(it.days_to_due) || 0
  return days <= 7 ? `En ${days}d` : 'Por vencer'
}

onMounted(() => {
  loadAdvisors()
  loadCollections()
})
</script>

<style scoped>
.cob-page {
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #14140F;
  max-width: 1600px;
  margin: 0 auto;
}

/* Masthead */
.cob-masthead { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; }
.cob-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.cob-breadcrumb { font-size: 11px; font-weight: 500; color: #A3A3A3; text-transform: uppercase; letter-spacing: .08em; }
.cob-title { font-size: 28px; font-weight: 700; letter-spacing: -.02em; margin: 0; color: #14140F; }
.cob-subtitle { font-size: 13px; color: #6F6F66; }
.cob-masthead-actions { display: flex; align-items: center; gap: 10px; }
.cob-month-pick { display: inline-flex; align-items: center; gap: 4px; background: #fff; border: 1px solid #E8E8E3; border-radius: 10px; padding: 4px; }
.cob-month-nav {
  width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 7px; color: #6F6F66; cursor: pointer; font-size: 11px;
  transition: all .15s ease;
}
.cob-month-nav:hover { background: #FAFAF8; color: #14140F; }
.cob-month-input {
  border: none; outline: none; padding: 6px 10px; font-size: 13px; font-weight: 500; color: #14140F;
  font-family: inherit; background: transparent; min-width: 140px;
}

.cob-day-pick {
  display: inline-flex; align-items: center; gap: 8px; background: #fff;
  border: 1px solid #E8E8E3; border-radius: 10px; padding: 4px 10px 4px 12px;
}
.cob-day-icon { font-size: 12px; color: #6F6F66; }
.cob-day-select {
  border: none; outline: none; padding: 6px 4px; font-size: 13px; font-weight: 500;
  color: #14140F; font-family: inherit; background: transparent; cursor: pointer; min-width: 130px;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%236F6F66' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat; background-position: right 0 center; padding-right: 16px;
}

/* Section */
.cob-section { margin-bottom: 22px; }

/* KPIs */
.cob-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.cob-kpi {
  position: relative; background: #fff; border: 1px solid #E8E8E3; border-radius: 14px;
  padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; overflow: hidden;
  transition: all .2s ease;
}
.cob-kpi:hover { border-color: #D4D4CC; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.cob-kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: currentColor; opacity: .85; }
.cob-kpi-head { display: flex; align-items: center; justify-content: space-between; }
.cob-kpi-label { font-size: 11.5px; font-weight: 600; color: #6F6F66; text-transform: uppercase; letter-spacing: .04em; }
.cob-kpi-icon { font-size: 14px; }
.cob-kpi-value { font-size: 22px; font-weight: 700; color: #14140F; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.cob-kpi-foot { font-size: 11.5px; color: #A0A099; }
.cob-kpi-indigo { color: #6366F1; }
.cob-kpi-red    { color: #DC2626; }
.cob-kpi-amber  { color: #D97706; }
.cob-kpi-green  { color: #10B981; }

/* Toolbar */
.cob-toolbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  background: #fff; border: 1px solid #E8E8E3; border-radius: 12px; padding: 12px 14px;
}
.cob-search-wrap { position: relative; flex: 1; min-width: 240px; }
.cob-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #A0A099; }
.cob-search {
  width: 100%; padding: 9px 12px 9px 34px; font-size: 13px; font-family: inherit;
  border: 1px solid #E8E8E3; border-radius: 8px; outline: none; transition: border-color .15s ease;
  color: #14140F; background: #FAFAF8;
}
.cob-search:focus { border-color: #14140F; background: #fff; }

.cob-tabs { display: inline-flex; gap: 4px; background: #FAFAF8; border-radius: 8px; padding: 4px; }
.cob-tab {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-size: 12.5px; font-weight: 500;
  color: #6F6F66; background: transparent; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;
  transition: all .15s ease;
}
.cob-tab:hover { color: #14140F; }
.cob-tab.is-active { background: #fff; color: #14140F; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.cob-tab-count { font-size: 11px; padding: 1px 7px; background: #E8E8E3; border-radius: 10px; font-weight: 600; }
.cob-tab.is-active .cob-tab-count { background: #14140F; color: #fff; }
.cob-tab-red.is-active { color: #B91C1C; }
.cob-tab-red.is-active .cob-tab-count { background: #DC2626; }
.cob-tab-amber.is-active { color: #92400E; }
.cob-tab-amber.is-active .cob-tab-count { background: #D97706; }
.cob-tab-green.is-active { color: #065F46; }
.cob-tab-green.is-active .cob-tab-count { background: #10B981; }

.cob-filter-asesor { min-width: 220px; }

/* Tabla */
.cob-table-wrap { background: #fff; border: 1px solid #E8E8E3; border-radius: 12px; overflow: hidden; }
.cob-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cob-table thead th {
  text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 600;
  color: #A0A099; text-transform: uppercase; letter-spacing: .05em;
  background: #FAFAF8; border-bottom: 1px solid #E8E8E3;
}
.cob-table thead th.tc { text-align: center; }
.cob-table thead th.tr { text-align: right; }
.cob-table tbody td {
  padding: 12px 14px; border-bottom: 1px solid #F4F4F0; vertical-align: middle; color: #14140F;
}
.cob-table tbody td.tc { text-align: center; }
.cob-table tbody td.tr { text-align: right; }
.cob-row:hover { background: #FAFAF8; }
.cob-row-overdue { background: rgba(220, 38, 38, 0.025); }
.cob-row-overdue:hover { background: rgba(220, 38, 38, 0.06); }

.cob-cell-main { font-size: 13px; font-weight: 500; color: #14140F; line-height: 1.3; }
.cob-cell-sub { font-size: 11.5px; color: #A0A099; margin-top: 2px; }
.cob-amount { font-weight: 600; }
.cob-date { font-size: 12.5px; color: #14140F; font-variant-numeric: tabular-nums; }
.mono { font-variant-numeric: tabular-nums; }

.cob-pill {
  display: inline-flex; align-items: center; padding: 3px 9px; font-size: 11px; font-weight: 600;
  border-radius: 12px; letter-spacing: .01em;
}
.cob-pill-slate { background: #F4F4F0; color: #6F6F66; }
.cob-pill-red    { background: #FEF2F2; color: #991B1B; }
.cob-pill-amber  { background: #FFFBEB; color: #92400E; }
.cob-pill-green  { background: #ECFDF5; color: #065F46; }

.cob-asesor { font-size: 12px; font-weight: 600; color: #14140F; }
.cob-muted { color: #A0A099; }

.cob-btn-action {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; font-size: 12px; font-weight: 500;
  background: #fff; border: 1px solid #E8E8E3; border-radius: 6px; color: #14140F; cursor: pointer;
  font-family: inherit; transition: all .15s ease;
}
.cob-btn-action:hover { border-color: #14140F; background: #FAFAF8; }
.cob-btn-action i { font-size: 10.5px; color: #6F6F66; }
.cob-btn-action:hover i { color: #14140F; }

.cob-empty {
  text-align: center; padding: 50px 20px; color: #A0A099; font-size: 13px;
}
.cob-empty i { display: block; font-size: 24px; margin-bottom: 10px; color: #C4C4C4; }
.cob-empty .fa-spin { display: inline-block; }

/* Responsive */
@media (max-width: 1100px) {
  .cob-kpis { grid-template-columns: repeat(2, 1fr); }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .cob-page { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-breadcrumb { color: #8A8A80; }
[data-coreui-theme="dark"] .cob-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-subtitle { color: #A0A099; }
[data-coreui-theme="dark"] .cob-month-pick { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-month-nav { color: #A0A099; }
[data-coreui-theme="dark"] .cob-month-nav:hover { background: #1F1F1A; color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-month-input { color: #F4F4F0; color-scheme: dark; }
[data-coreui-theme="dark"] .cob-day-pick { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-day-icon { color: #A0A099; }
[data-coreui-theme="dark"] .cob-day-select {
  color: #F4F4F0; color-scheme: dark;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23A0A099' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
}
[data-coreui-theme="dark"] .cob-kpi { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-kpi:hover { border-color: #3A3A33; box-shadow: 0 2px 8px rgba(0,0,0,.4); }
[data-coreui-theme="dark"] .cob-kpi-label { color: #A0A099; }
[data-coreui-theme="dark"] .cob-kpi-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-kpi-foot { color: #8A8A80; }
[data-coreui-theme="dark"] .cob-kpi-indigo { color: #818CF8; }
[data-coreui-theme="dark"] .cob-kpi-red    { color: #F87171; }
[data-coreui-theme="dark"] .cob-kpi-amber  { color: #FBBF24; }
[data-coreui-theme="dark"] .cob-kpi-green  { color: #34D399; }
[data-coreui-theme="dark"] .cob-toolbar { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-search { background: #14140F; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-search:focus { border-color: #F4F4F0; background: #14140F; }
[data-coreui-theme="dark"] .cob-tabs { background: #1F1F1A; }
[data-coreui-theme="dark"] .cob-tab { color: #A0A099; }
[data-coreui-theme="dark"] .cob-tab:hover { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-tab.is-active { background: #2A2A22; color: #F4F4F0; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
[data-coreui-theme="dark"] .cob-tab-count { background: #2A2A22; }
[data-coreui-theme="dark"] .cob-tab.is-active .cob-tab-count { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .cob-tab-red.is-active { color: #F87171; }
[data-coreui-theme="dark"] .cob-tab-amber.is-active { color: #FBBF24; }
[data-coreui-theme="dark"] .cob-tab-green.is-active { color: #34D399; }
[data-coreui-theme="dark"] .cob-table-wrap { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-table thead th { background: #1F1F1A; color: #8A8A80; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .cob-table tbody td { border-bottom-color: #1F1F1A; color: #D4D4CC; }
[data-coreui-theme="dark"] .cob-row:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .cob-row-overdue { background: rgba(239, 68, 68, 0.07); }
[data-coreui-theme="dark"] .cob-row-overdue:hover { background: rgba(239, 68, 68, 0.12); }
[data-coreui-theme="dark"] .cob-cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-cell-sub { color: #8A8A80; }
[data-coreui-theme="dark"] .cob-date { color: #D4D4CC; }
[data-coreui-theme="dark"] .cob-pill-slate { background: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .cob-pill-red    { background: rgba(239,68,68,.14); color: #F87171; }
[data-coreui-theme="dark"] .cob-pill-amber  { background: rgba(245,158,11,.14); color: #FBBF24; }
[data-coreui-theme="dark"] .cob-pill-green  { background: rgba(16,185,129,.14); color: #34D399; }
[data-coreui-theme="dark"] .cob-asesor { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-muted { color: #8A8A80; }
[data-coreui-theme="dark"] .cob-btn-action { background: #1A1A14; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-btn-action:hover { border-color: #F4F4F0; background: #1F1F1A; }
[data-coreui-theme="dark"] .cob-btn-action i { color: #A0A099; }
[data-coreui-theme="dark"] .cob-btn-action:hover i { color: #F4F4F0; }
[data-coreui-theme="dark"] .cob-empty { color: #8A8A80; }
[data-coreui-theme="dark"] .cob-empty i { color: #6F6F66; }
</style>
