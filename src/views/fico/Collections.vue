<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Cobranzas</h1>
        <p class="ds-sub">
          {{ debtorView === 'companies' ? 'Cuotas de ventas B2B con OS/OP que paga la empresa' : 'Cuotas pendientes' }}
          que vencen en {{ monthLabel }}
        </p>
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
        <button
          class="btn-exec btn-exec-outline"
          type="button"
          :disabled="loading || !items.length"
          title="Descarga en Excel los alumnos de la tabla, con los filtros aplicados"
          @click="exportDebtors"
        >
          <i class="fa-solid fa-file-excel" aria-hidden="true"></i> Exportar Excel ({{ items.length }})
        </button>
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
        <!-- Quien debe: el alumno o la empresa (OS/OP). Cada vista tiene sus
             propios KPIs, filtros y Excel. -->
        <div class="ds-tabs" role="group" aria-label="Deudor">
          <button
            v-for="v in DEBTOR_VIEWS"
            :key="v.key"
            type="button"
            :aria-pressed="debtorView === v.key"
            @click="debtorView = v.key"
          >
            {{ v.label }} <span class="col-count">{{ debtorCounts[v.key] }}</span>
          </button>
        </div>
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
        <!-- Fechas sueltas, no un rango: FICO cobra el 1 y el 15 sin los dias de
             en medio. Solo lista fechas con cuotas pendientes en el mes. -->
        <div class="col-dates">
          <ColumnFilterDropdown
            v-model="colFilters.vence"
            column-label="Fechas de vencimiento"
            :all-items="viewRows"
            :value-extractor="COLUMN_VALUE.vence"
          />
        </div>
      </div>
      <div v-if="chips.length" class="col-chips">
        <BaseFilterChips :items="chips" @remove="removeChip" @clear-all="clearFilters" />
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa col-table">
          <thead>
            <tr>
              <th>{{ debtorView === 'companies' ? 'Alumno inscrito / documento B2B' : 'Alumno / documento' }}</th>
              <th>Programa / edición</th>
              <th class="tc" style="width:110px">Cuota</th>
              <th class="num" style="width:140px" :aria-sort="AMOUNT_SORT[amountSort].aria">
                <button type="button" class="ds-th-filter" :class="{ 'is-active': amountSort }" :title="AMOUNT_SORT[amountSort].title" @click="cycleAmountSort">
                  Monto <i class="fa-solid" :class="AMOUNT_SORT[amountSort].icon" aria-hidden="true"></i>
                </button>
              </th>
              <th style="width:140px">Vence</th>
              <th style="width:140px">Estado</th>
              <th style="width:130px">Asesor</th>
              <th class="tc" style="width:56px"><span class="sr-only">Abrir</span></th>
            </tr>
            <!-- Fila de filtros siempre visible: es la pantalla de trabajo de
                 cobranza y los filtros se combinan entre columnas. -->
            <tr class="col-filters">
              <th><input v-model="colFilters.alumno" class="ds-input col-filter-input" placeholder="Nombre, DNI, correo o celular…" aria-label="Filtrar alumno" /></th>
              <th>
                <ColumnFilterDropdown v-model="colFilters.programa" column-label="Programa" :all-items="viewRows" :value-extractor="COLUMN_VALUE.programa" />
              </th>
              <th>
                <ColumnFilterDropdown v-model="colFilters.cuota" column-label="Cuota" :all-items="viewRows" :value-extractor="COLUMN_VALUE.cuota" />
              </th>
              <th>
                <ColumnFilterDropdown v-model="colFilters.monto" column-label="Monto" :all-items="viewRows" :value-extractor="COLUMN_VALUE.monto" />
              </th>
              <th>
                <ColumnFilterDropdown v-model="colFilters.vence" column-label="Vence" :all-items="viewRows" :value-extractor="COLUMN_VALUE.vence" />
              </th>
              <th></th>
              <th>
                <ColumnFilterDropdown v-model="colFilters.asesor" column-label="Asesor" :all-items="viewRows" :value-extractor="COLUMN_VALUE.asesor" />
              </th>
              <th class="tc">
                <button class="btn-icon btn-icon-sm" type="button" title="Limpiar filtros" aria-label="Limpiar filtros" @click="clearFilters">
                  <i class="fa-solid fa-eraser" aria-hidden="true"></i>
                </button>
              </th>
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
                No hay cuotas pendientes con estos filtros. Prueba otro mes o limpia los filtros.
              </td>
            </tr>
            <tr
              v-for="it in items"
              v-else
              :key="it.installment_id"
              class="link"
              tabindex="0"
              :class="{ 'is-overdue': it.state_label === 'overdue' }"
              @click="previewRow = it"
              @keydown.enter.self="previewRow = it"
            >
              <td>
                <div class="col-main">
                  <span
                    v-if="b2bDoctypeShort(it.b2b_doctype_alias)"
                    class="ds-pill info col-doc"
                    :title="it.b2b_doctype_alias === 'we_enrollment_b2b_doctype_purchase_order' ? 'Orden de Compra' : 'Orden de Servicio'"
                  >{{ b2bDoctypeShort(it.b2b_doctype_alias) }}</span>
                  {{ it.student_full_name }}
                </div>
                <div class="col-sub">{{ it.document_number || 'sin DNI' }} · {{ it.email || 'sin correo' }}{{ it.phone ? ` · ${it.phone}` : '' }}</div>
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

    <CollectionPreviewModal :row="previewRow" @close="previewRow = null" @open-enrollment="goToEnrollment" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import CollectionPreviewModal from '@/views/fico/collections/CollectionPreviewModal.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import {
  buildCollectionCards, dueLabel, DUE_TONE, COLUMN_VALUE,
  summarizeCollections, filterCollections, sortByAmount, buildCollectionsExport,
  DEBTOR_VIEWS, rowsForDebtor, b2bDoctypeShort
} from '@/entities/collection/collectionView.js'
import { downloadCsv } from '@/shared/lib/downloadCsv.js'

const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const fmt = useEnrollmentFormatters()

const STATE_TABS = [
  { key: 'total', label: 'Todas' },
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoy' },
  { key: 'upcoming', label: 'Por vencer' }
]

const COLUMN_LABEL = { programa: 'Programa', cuota: 'Cuota', monto: 'Monto', asesor: 'Asesor' }

// Clic en "Monto": sin orden (por vencimiento) -> mayor a menor -> menor a mayor.
const AMOUNT_SORT = {
  null: { next: 'desc', icon: 'fa-sort', title: 'Ordenar de mayor a menor', aria: 'none' },
  desc: { next: 'asc', icon: 'fa-sort-down', title: 'Ordenar de menor a mayor', aria: 'descending' },
  asc: { next: null, icon: 'fa-sort-up', title: 'Quitar orden por monto', aria: 'ascending' }
}

const today = new Date()
const monthValue = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const debtorView = ref('students')
const stateFilter = ref('total')
const amountSort = ref(null)
const emptyFilters = () => ({ alumno: '', programa: [], cuota: [], monto: [], vence: [], asesor: [] })
const colFilters = reactive(emptyFilters())

const allRows = ref([])
const loading = ref(false)
const previewRow = ref(null)

// Primero se separa por deudor (alumno / empresa OS-OP): cada vista es su
// propio universo de KPIs, desplegables de filtro y Excel.
const viewRows = computed(() => rowsForDebtor(allRows.value, debtorView.value))
const debtorCounts = computed(() => Object.fromEntries(
  DEBTOR_VIEWS.map(v => [v.key, rowsForDebtor(allRows.value, v.key).length])
))

// Los KPIs se calculan ANTES de la pestaña de estado: cada pestaña muestra su
// conteo aunque la tabla este filtrada por una sola.
const filteredRows = computed(() => filterCollections(viewRows.value, colFilters))
const kpis = computed(() => summarizeCollections(filteredRows.value))
const cards = computed(() => buildCollectionCards(kpis.value))
const items = computed(() => sortByAmount(
  stateFilter.value === 'total' ? filteredRows.value : filteredRows.value.filter(r => r.state_label === stateFilter.value),
  amountSort.value
))

// Cada fecha marcada es su propio chip (se ven todas y se quitan una a una);
// el resto de columnas, un chip por columna con sus valores en el detalle.
const chips = computed(() => [
  ...colFilters.vence.map(d => ({ key: `vence:${d}`, label: `Vence ${d}` })),
  ...Object.entries(COLUMN_LABEL)
    .filter(([key]) => colFilters[key].length)
    .map(([key, label]) => ({ key, label: `${label}: ${colFilters[key].length}`, details: colFilters[key] })),
  ...(colFilters.alumno.trim() ? [{ key: 'alumno', label: `Alumno: ${colFilters.alumno.trim()}` }] : [])
])

function removeChip (key) {
  if (key.startsWith('vence:')) colFilters.vence = colFilters.vence.filter(d => `vence:${d}` !== key)
  else colFilters[key] = emptyFilters()[key]
}

function clearFilters () {
  Object.assign(colFilters, emptyFilters())
}

function cycleAmountSort () {
  amountSort.value = AMOUNT_SORT[amountSort.value].next
}

const yearMonth = computed(() => {
  const [year, month] = monthValue.value.split('-').map(Number)
  return { year, month }
})
const monthLabel = computed(() => {
  const { year, month } = yearMonth.value
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
})

// Las fechas marcadas son del mes anterior: al cambiar de mes ya no existen.
watch(monthValue, () => {
  colFilters.vence = []
  loadCollections()
})

// Los valores marcados en los filtros son de la otra vista (otros programas,
// montos, fechas): se limpian para no dejar la tabla vacia sin motivo.
watch(debtorView, clearFilters)

function shiftMonth (delta) {
  const { year, month } = yearMonth.value
  const d = new Date(year, month - 1 + delta, 1)
  monthValue.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function setState (key) {
  stateFilter.value = key
}

async function loadCollections () {
  loading.value = true
  try {
    const r = await ficoService.getCollections(yearMonth.value)
    allRows.value = r?.items || []
  } catch (err) {
    console.error('[loadCollections]', err)
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudieron cargar las cobranzas.')
    allRows.value = []
  } finally {
    loading.value = false
  }
}

// Columnas DNI (1) y Celular (3) como texto en Excel.
function exportDebtors () {
  const tab = STATE_TABS.find(t => t.key === stateFilter.value)?.label || 'Todas'
  const view = debtorView.value === 'companies' ? 'empresas' : 'alumnos'
  downloadCsv(`cobranzas_${view}_${monthValue.value}_${tab.toLowerCase().replace(/\s+/g, '-')}.csv`,
    buildCollectionsExport(items.value), { textColumns: [1, 3] })
  toast.success(`${items.value.length} cuotas exportadas.`)
}

function goToEnrollment (id) {
  router.push({ name: 'enrollmentDetail', params: { id: String(id) } })
}

onMounted(loadCollections)
</script>

<style scoped>
.col-month { display: inline-flex; align-items: center; gap: 4px; }
.col-month-input { width: 160px; }

.col-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }

.col-dates { min-width: 220px; }
.col-chips { padding: 8px 18px 0; }
.col-filters th { padding-top: 6px; padding-bottom: 8px; font-weight: 400; text-transform: none; letter-spacing: 0; }
.col-filter-input { width: 100%; height: 30px; font-size: 12px; }
.col-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .col-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.col-table td { vertical-align: middle; }
.col-table tr.is-overdue td { background: var(--ds-soft-bad); }
.col-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.col-doc { margin-right: 6px; font-size: 10.5px; vertical-align: 1px; }
.col-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.col-amount { font-weight: 700; color: var(--ds-heading); white-space: nowrap; }
.col-empty { text-align: center; color: var(--ds-muted); }
.tc { text-align: center; }
.num { text-align: right; }
.mono { font-variant-numeric: tabular-nums; }
</style>
