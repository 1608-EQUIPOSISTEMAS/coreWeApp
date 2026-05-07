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
      </div>
    </header>

    <!-- KPIs -->
    <section class="cob-section">
      <div class="cob-kpis">
        <article class="cob-kpi cob-kpi-indigo">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Total a cobrar</span><i class="fa-solid fa-coins cob-kpi-icon"></i></div>
          <div class="cob-kpi-value">S/. {{ fmtMoney(kpis.total_amount) }}</div>
          <span class="cob-kpi-foot">{{ kpis.total_count }} cuota{{ kpis.total_count === 1 ? '' : 's' }}</span>
        </article>
        <article class="cob-kpi cob-kpi-red">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Vencidas</span><i class="fa-solid fa-triangle-exclamation cob-kpi-icon"></i></div>
          <div class="cob-kpi-value">S/. {{ fmtMoney(kpis.overdue_amount) }}</div>
          <span class="cob-kpi-foot">{{ kpis.overdue_count }} cuota{{ kpis.overdue_count === 1 ? '' : 's' }}</span>
        </article>
        <article class="cob-kpi cob-kpi-amber">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Hoy</span><i class="fa-solid fa-clock cob-kpi-icon"></i></div>
          <div class="cob-kpi-value">S/. {{ fmtMoney(kpis.today_amount) }}</div>
          <span class="cob-kpi-foot">{{ kpis.today_count }} cuota{{ kpis.today_count === 1 ? '' : 's' }}</span>
        </article>
        <article class="cob-kpi cob-kpi-green">
          <div class="cob-kpi-head"><span class="cob-kpi-label">Por vencer</span><i class="fa-solid fa-calendar-check cob-kpi-icon"></i></div>
          <div class="cob-kpi-value">S/. {{ fmtMoney(kpis.upcoming_amount) }}</div>
          <span class="cob-kpi-foot">{{ kpis.upcoming_count }} cuota{{ kpis.upcoming_count === 1 ? '' : 's' }}</span>
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

function fmtDate (d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
</style>
