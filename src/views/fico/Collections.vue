<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Cobranzas</h1>
        <p class="ds-sub">Cuotas pendientes que vencen en {{ monthLabel }}{{ daySelected ? `, día ${daySelected}` : '' }}</p>
      </div>
      <div class="ds-head-actions">
        <div class="col-month" role="group" aria-label="Mes">
          <button class="btn-icon btn-icon-sm" type="button" title="Mes anterior" aria-label="Mes anterior" @click="shiftMonth(-1)">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <input v-model="monthValue" type="month" class="ds-input col-month-input" aria-label="Mes de vencimiento" />
          <button class="btn-icon btn-icon-sm" type="button" title="Mes siguiente" aria-label="Mes siguiente" @click="shiftMonth(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        <select v-model="daySelected" class="ds-input col-day" aria-label="Día de vencimiento" @change="loadCollections">
          <option :value="null">Todos los días</option>
          <option v-for="d in daysInMonth" :key="d" :value="d">Día {{ d }}</option>
        </select>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in cards" :key="k.clave" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tono" aria-hidden="true"><i class="fa-solid" :class="k.icono"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ k.valor }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.nota }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="col-toolbar">
        <input
          v-model="searchInput"
          type="search"
          class="ds-input col-search"
          placeholder="Buscar por nombre, DNI o correo…"
          aria-label="Buscar alumno"
          @input="onSearchInput"
        />
        <div class="ds-tabs" role="group" aria-label="Estado de la cuota">
          <button
            v-for="t in STATE_TABS"
            :key="t.key"
            type="button"
            :aria-pressed="stateFilter === t.key"
            @click="setState(t.key)"
          >
            {{ t.label }} <span class="col-count">{{ kpis[`${t.key}_count`] ?? 0 }}</span>
          </button>
        </div>
        <div class="col-advisor">
          <MultiSelect
            v-model="advisorIds"
            :items="advisorOptions"
            label-key="description"
            value-key="id"
            placeholder="Todos los asesores"
            @update:model-value="loadCollections"
          />
        </div>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa col-table">
          <thead>
            <tr>
              <th>Alumno / documento</th>
              <th>Programa / edición</th>
              <th class="tc" style="width:70px">Cuota</th>
              <th class="num" style="width:120px">Monto</th>
              <th style="width:110px">Vence</th>
              <th style="width:140px">Estado</th>
              <th style="width:110px">Asesor</th>
              <th class="tc" style="width:56px"><span class="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`">
                <td colspan="8"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr v-else-if="!items.length">
              <td colspan="8" class="ds-empty--lista col-empty">
                No hay cuotas pendientes con estos filtros. Prueba otro mes o quita la búsqueda.
              </td>
            </tr>
            <tr
              v-for="it in items"
              v-else
              :key="it.installment_id"
              class="link"
              tabindex="0"
              :class="{ 'is-overdue': it.state_label === 'overdue' }"
              @click="goToEnrollment(it.enrollment_id)"
              @keydown.enter.self="goToEnrollment(it.enrollment_id)"
            >
              <td>
                <div class="col-main">{{ it.student_full_name }}</div>
                <div class="col-sub">{{ it.document_number || 'sin DNI' }} · {{ it.email || 'sin correo' }}</div>
              </td>
              <td>
                <div class="col-main">{{ it.program_name || '—' }}</div>
                <div class="col-sub">{{ it.edition_code || '—' }}</div>
              </td>
              <td class="tc"><span class="ds-pill">C{{ it.installment_number }}</span></td>
              <td class="num mono col-amount">{{ it.currency === 'USD' ? '$' : 'S/.' }} {{ fmt.formatMoney(it.amount) }}</td>
              <td class="mono">{{ fmt.formatDate(it.due_date) }}</td>
              <td><span class="ds-pill" :class="DUE_TONE[it.state_label]">{{ dueLabel(it.state_label, it.days_to_due) }}</span></td>
              <td>{{ it.seller_agent_name || '—' }}</td>
              <td class="tc">
                <button
                  class="btn-icon btn-icon-sm"
                  type="button"
                  title="Abrir inscripción"
                  aria-label="Abrir inscripción"
                  @click.stop="goToEnrollment(it.enrollment_id)"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
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
import { ref, computed, watch, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import MultiSelect from '@/components/MultiSelect.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { buildCollectionCards, dueLabel, DUE_TONE } from '@/entities/collection/collectionView.js'

const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const authService = inject(ServiceKeys.Auth)
const fmt = useEnrollmentFormatters()

const STATE_TABS = [
  { key: 'total', label: 'Todas' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoy' },
  { key: 'upcoming', label: 'Por vencer' }
]

const today = new Date()
const monthValue = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const daySelected = ref(null)
const searchInput = ref('')
const searchQuery = ref('')
const stateFilter = ref('total')
const advisorIds = ref([])
const advisorOptions = ref([])

const items = ref([])
const kpis = ref({})
const loading = ref(false)
const cards = computed(() => buildCollectionCards(kpis.value))

const yearMonth = computed(() => {
  const [year, month] = monthValue.value.split('-').map(Number)
  return { year, month }
})
const monthLabel = computed(() => {
  const { year, month } = yearMonth.value
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
})

// new Date(y, m, 0) es el ultimo dia del mes m (1-indexed): da cuantos dias tiene.
const daysInMonth = computed(() => {
  const { year, month } = yearMonth.value
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1)
})

// Al cambiar de mes el dia elegido puede no existir (31 en abril): vuelve a "todos".
watch(monthValue, () => {
  daySelected.value = null
  loadCollections()
})

function shiftMonth (delta) {
  const { year, month } = yearMonth.value
  const d = new Date(year, month - 1 + delta, 1)
  monthValue.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function setState (key) {
  stateFilter.value = key
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

async function loadCollections () {
  loading.value = true
  try {
    const { year, month } = yearMonth.value
    const r = await ficoService.getCollections({
      year,
      month,
      day: daySelected.value || null,
      q: searchQuery.value || null,
      // El backend llama 'all' a la pestaña "Todas"
      state: stateFilter.value === 'total' ? 'all' : stateFilter.value,
      advisor_ids: advisorIds.value.map(Number).filter(Number.isFinite)
    })
    items.value = r?.items || []
    kpis.value = r?.kpis || {}
  } catch (err) {
    console.error('[loadCollections]', err)
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudieron cargar las cobranzas.')
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
      .map(u => ({ id: u.user_id, description: u.full_name ? `${u.alias} — ${u.full_name}` : u.alias }))
      .sort((a, b) => a.description.localeCompare(b.description))
  } catch (err) {
    console.error('[loadAdvisors]', err)
  }
}

function goToEnrollment (id) {
  router.push({ name: 'enrollmentDetail', params: { id: String(id) } })
}

onMounted(() => {
  loadAdvisors()
  loadCollections()
})
</script>

<style scoped>
.col-month { display: inline-flex; align-items: center; gap: 4px; }
.col-month-input { width: 160px; }
.col-day { width: 150px; }

.col-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.col-search { flex: 1; min-width: 220px; }
.col-advisor { min-width: 220px; }
.col-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .col-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.col-table td { vertical-align: middle; }
.col-table tr.is-overdue td { background: var(--ds-soft-bad); }
.col-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.col-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.col-amount { font-weight: 700; color: var(--ds-heading); white-space: nowrap; }
.col-empty { text-align: center; color: var(--ds-muted); }
.tc { text-align: center; }
.num { text-align: right; }
.mono { font-variant-numeric: tabular-nums; }
</style>
