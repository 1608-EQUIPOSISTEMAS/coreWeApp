<script setup>
import { ref, computed, reactive, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

// =====================================================================
// Avance de ventas de un congreso contra el objetivo que fija Fundacion.
//
// Dos naturalezas de dato conviven en la pantalla y por eso van marcadas:
//   REAL   sale de enrollments/leads. El "area" (Comercial, Marketing...) no
//          es una columna: se deduce de como llego la inscripcion. La regla
//          esta escrita en Backend/src/modules/edition/edition.repository.js.
//   MANUAL la matriz area x modalidad que se tipea aqui y se guarda en
//          program_edition_goals.channel_goals.
// =====================================================================

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

const MODALIDAD_COLOR = {
  vip: '#f5a524',
  premium: '#ef6c4d',
  general: '#21a179',
  virtual: '#9b6ef3',
}

// =====================================================================
// ESTADO
// =====================================================================
const editions = ref([])
const editionId = ref(null)
const report = ref(null)
// Copia editable del objetivo. Separada de report.goals para saber si hay
// cambios sin guardar y poder descartarlos recargando.
const goals = reactive({})
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref(null)
const chartMetric = ref('modalidad')   // 'modalidad' | 'avance'
const modalidadFocus = ref(null)       // null = todas
const expanded = ref({ '1.5': true, '1.7': true })
const selectedRow = ref(null)

const areas = computed(() => report.value?.areas || [])
// Solo las categorias de entrada que este congreso vende. El cuadro de
// Fundacion tiene tres columnas y no cuatro porque PREMIUM esta apagado en
// event_category_prices, no porque la modalidad no exista.
const MODALIDADES = computed(() =>
  (report.value?.modalidades || []).map(m => ({ ...m, color: MODALIDAD_COLOR[m.key] || '#94a3b8' })),
)
const selectedEdition = computed(() => editions.value.find(e => e.edition_num_id === editionId.value) || null)
const hayHuerfanas = computed(() => areas.value.some(a => Number(a.sin_categoria) > 0))

// =====================================================================
// CARGA
// =====================================================================
function fechaCorta(iso) {
  return iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : 's/f'
}

// Por defecto se abre el congreso mas cercano: el proximo que aun no ocurre.
// Si ya pasaron todos, el ultimo — una pantalla vacia no le sirve a nadie.
function pickDefaultEdition(list) {
  if (!list.length) return null
  const hoy = new Date().toISOString().slice(0, 10)
  const futuras = list
    .filter(e => e.start_date && String(e.start_date).slice(0, 10) >= hoy)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
  if (futuras.length) return futuras[0].edition_num_id
  const pasadas = [...list].sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))
  return pasadas[0].edition_num_id
}

async function loadEditions() {
  editions.value = await editionService.eventEditionsList()
  editionId.value = pickDefaultEdition(editions.value)
}

async function loadReport() {
  if (!editionId.value) { report.value = null; return }
  isLoading.value = true
  loadError.value = null
  try {
    report.value = await editionService.eventGoalsReport(editionId.value)
    resetGoalsFromReport()
  } catch (e) {
    console.error('[objetivos]', e)
    report.value = null
    loadError.value = e?.response?.data?.message || e?.message || 'Error desconocido'
  } finally {
    isLoading.value = false
  }
}

async function refresh() {
  await loadReport()
}

async function onEditionChange() {
  modalidadFocus.value = null
  selectedRow.value = null
  await loadReport()
}

onMounted(async () => {
  isLoading.value = true
  try {
    await loadEditions()
    await loadReport()
  } catch (e) {
    console.error('[objetivos:init]', e)
    loadError.value = e?.response?.data?.message || e?.message || 'Error desconocido'
    isLoading.value = false
  }
})

// =====================================================================
// OBJETIVO (MANUAL)
// =====================================================================
function goalCell(code, key) {
  return Number(goals[code]?.[key]) || 0
}

function setGoalCell(code, key, value) {
  const n = Math.max(0, Math.trunc(Number(String(value).replace(',', '.')) || 0))
  if (!goals[code]) goals[code] = {}
  goals[code][key] = n
}

// Objetivo de un area = suma de sus celdas. La fila del area no se tipea
// aparte: si el total fuera un campo mas, al primer descuadre nadie sabria
// cual de los dos manda.
function objVentas(area) {
  return MODALIDADES.value.reduce((acc, m) => acc + goalCell(area.code, m.key), 0)
}

const objetivoTotal = computed(() => areas.value.reduce((acc, a) => acc + objVentas(a), 0))

function objPorModalidad(key) {
  return areas.value.reduce((acc, a) => acc + goalCell(a.code, key), 0)
}

const goalsDirty = computed(() => JSON.stringify(goals) !== JSON.stringify(report.value?.goals || {}))

// Copia del objetivo guardado hacia el editable. Via JSON y no structuredClone:
// report es un ref profundo, asi que .goals llega envuelto en un Proxy reactivo
// y structuredClone revienta con "could not be cloned". El objetivo son enteros,
// JSON lo copia exacto.
function resetGoalsFromReport() {
  const saved = JSON.parse(JSON.stringify(report.value?.goals || {}))
  Object.keys(goals).forEach(k => delete goals[k])
  Object.assign(goals, saved)
}

async function saveGoals() {
  if (!editionId.value) return
  isSaving.value = true
  try {
    const res = await editionService.eventGoalsSave(editionId.value, goals)
    if (report.value) report.value.goals = res?.goals || {}
    resetGoalsFromReport()
    toast.success('Objetivo guardado')
  } catch (e) {
    console.error('[objetivos:save]', e)
    toast.error(e?.response?.data?.message || 'No se pudo guardar el objetivo')
  } finally {
    isSaving.value = false
  }
}

// =====================================================================
// DERIVADOS (REAL)
// =====================================================================
const avanceTotal = computed(() => areas.value.reduce((acc, a) => acc + Number(a.avance || 0), 0))
const consultasTotal = computed(() => report.value?.leads_total || 0)
const faltanPorSumar = computed(() => Math.max(0, objetivoTotal.value - avanceTotal.value))

const pctAvance = computed(() =>
  objetivoTotal.value ? Math.round(avanceTotal.value / objetivoTotal.value * 100) : 0,
)

// Fila TOTAL del pie: suma real por modalidad de todas las areas.
const totalPorModalidad = computed(() => {
  const out = { sin_categoria: 0 }
  for (const m of MODALIDADES.value) out[m.key] = 0
  for (const a of areas.value) {
    for (const m of MODALIDADES.value) out[m.key] += Number(a[m.key]) || 0
    out.sin_categoria += Number(a.sin_categoria) || 0
  }
  return out
})

const ventasPorModalidad = computed(() =>
  MODALIDADES.value.map(m => ({ ...m, value: totalPorModalidad.value[m.key] || 0 })),
)
const ventasTotales = computed(() =>
  ventasPorModalidad.value.reduce((acc, m) => acc + m.value, 0),
)

// Serie del grafico segun la metrica activa.
const chartSeries = computed(() => {
  if (chartMetric.value === 'modalidad') {
    return ventasPorModalidad.value.map(m => ({
      key: m.key, label: m.label, color: m.color, value: m.value, ref: objPorModalidad(m.key),
    }))
  }
  return areas.value.map(a => ({
    key: a.code,
    label: a.name,
    color: '#1b2a5b',
    value: Number(a.avance) || 0,
    ref: objVentas(a),
  }))
})

// Escala del eje Y: techo redondeado a multiplo de 5 para que las guias
// caigan en numeros limpios (0, 5, 10...) como en el diseno original.
const chartMax = computed(() => {
  const peak = Math.max(
    1,
    ...chartSeries.value.map(s => Math.max(s.value, s.ref ?? 0)),
  )
  return Math.ceil(peak / 5) * 5
})
const chartTicks = computed(() => {
  const step = chartMax.value / 5
  return Array.from({ length: 6 }, (_, i) => Math.round(chartMax.value - i * step))
})

// Donut: dos segmentos sobre pathLength=100, asi el dasharray ES el %.
// Se recorta al 100% para que un sobrecumplimiento no dibuje un arco que da
// la vuelta y se muerde la cola.
const donut = computed(() => {
  const hecho = Math.min(100, pctAvance.value)
  return {
    pct: pctAvance.value,
    segments: [
      { key: 'avance', color: '#1b2a5b', dash: `${hecho} ${100 - hecho}`, offset: 25 },
      { key: 'falta', color: '#e2cdad', dash: `${100 - hecho} ${hecho}`, offset: 25 - hecho },
    ],
    legend: [
      { key: 'avance', name: 'Vendido', color: '#1b2a5b', count: avanceTotal.value, pct: pctAvance.value },
      { key: 'falta', name: 'Falta', color: '#e2cdad', count: faltanPorSumar.value, pct: Math.max(0, 100 - hecho) },
    ],
  }
})

// Fila FALTA: lo que queda del objetivo, celda por celda. Nunca negativa: si
// una modalidad ya se paso de su meta, ahi no falta nada.
const filaFalta = computed(() => {
  const out = { avance: faltanPorSumar.value }
  for (const m of MODALIDADES.value) {
    out[m.key] = Math.max(0, objPorModalidad(m.key) - (totalPorModalidad.value[m.key] || 0))
  }
  return out
})

function conversion(row) {
  if (!row.consultas) return '–'
  return (row.avance / row.consultas * 100).toFixed(2).replace('.', ',') + '%'
}

function toggleRow(area) {
  if (area.children) expanded.value[area.code] = !expanded.value[area.code]
  selectedRow.value = selectedRow.value === area.code ? null : area.code
}

function cellClass(v) {
  return Number(v) ? 'ob-num' : 'ob-num ob-zero'
}
</script>

<template>
  <div class="ob">
    <!-- ═══════════ HEADER + FILTROS ═══════════ -->
    <div class="ob-card ob-head-card">
      <div class="ob-head">
        <div>
          <div class="ob-eyebrow">DASHBOARD DE VENTAS · FUNDACIÓN</div>
          <h1 class="ob-title">{{ selectedEdition?.abbreviation || 'Selecciona un congreso' }}</h1>
          <div v-if="selectedEdition" class="ob-subtitle">
            inicia {{ fechaCorta(selectedEdition.start_date) }}
            <template v-if="selectedEdition.global_code"> · {{ selectedEdition.global_code }}</template>
          </div>
        </div>
        <div class="ob-head-right">
          <span class="ob-live"><i class="fa-solid fa-circle"></i> {{ consultasTotal.toLocaleString('es-PE') }} leads reales</span>
          <button class="ob-icon-btn" :disabled="isLoading" title="Actualizar" @click="refresh">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': isLoading }"></i>
          </button>
        </div>
      </div>

      <div class="ob-filters">
        <div class="ob-filter">
          <span class="ob-flabel"><i class="fa-solid fa-filter"></i> CONGRESO</span>
          <select v-model="editionId" class="ob-select" :disabled="isLoading" @change="onEditionChange">
            <option v-for="e in editions" :key="e.edition_num_id" :value="e.edition_num_id">
              {{ e.abbreviation || 'Sin nombre' }} · {{ fechaCorta(e.start_date) }}{{ e.active === 'N' ? ' · (inactiva)' : '' }}
            </option>
          </select>
        </div>

        <div class="ob-legend">
          <span class="ob-flabel">LEYENDA</span>
          <span v-for="m in MODALIDADES" :key="m.key" class="ob-leg">
            <i class="fa-solid fa-circle" :style="{ color: m.color }"></i> {{ m.label }}
          </span>
          <span class="ob-tag ob-tag-real">REAL</span>
          <span class="ob-tag-hint">inscripciones y leads</span>
          <span class="ob-tag ob-tag-manual">MANUAL</span>
          <span class="ob-tag-hint">objetivo por área</span>
        </div>
      </div>

      <!-- Un fallo de red no es "no hay ventas": decirlo asi manda a Fundacion
           a buscar un problema de data que no existe. -->
      <div v-if="loadError" class="ob-alert">
        <i class="fa-solid fa-triangle-exclamation"></i>
        No se pudo cargar el reporte. <strong>{{ loadError }}</strong>
        <button class="ob-retry" @click="refresh"><i class="fa-solid fa-rotate-right"></i> Reintentar</button>
      </div>
    </div>

    <!-- ═══════════ KPIs ═══════════ -->
    <div class="ob-kpis">
      <div class="ob-kpi">
        <div class="ob-k-label">OBJETIVO TOTAL</div>
        <div class="ob-k-value">{{ objetivoTotal }}</div>
        <div class="ob-k-foot">suma de objetivos por área (manual)</div>
      </div>

      <div class="ob-kpi">
        <div class="ob-k-label">TOTAL INSCRITOS <span class="ob-tag ob-tag-real">REAL</span></div>
        <div class="ob-k-value">{{ avanceTotal }} <span class="ob-k-of">de {{ objetivoTotal }}</span></div>
        <div class="ob-k-bar"><div class="ob-k-fill" :style="{ width: Math.min(100, pctAvance) + '%' }"></div></div>
        <div class="ob-k-foot">{{ pctAvance }}%</div>
      </div>

      <div class="ob-kpi">
        <div class="ob-k-label">CONSULTAS <span class="ob-tag ob-tag-real">REAL</span></div>
        <div class="ob-k-value">{{ consultasTotal }}</div>
        <div class="ob-k-foot">
          {{ consultasTotal ? (avanceTotal / consultasTotal * 100).toFixed(2).replace('.', ',') : '0' }}% de conversión
        </div>
      </div>

      <div class="ob-kpi">
        <div class="ob-k-label">FALTAN POR SUMAR</div>
        <div class="ob-k-value ob-k-warn">{{ faltanPorSumar }}</div>
        <div class="ob-k-foot">objetivo – inscritos</div>
      </div>
    </div>

    <!-- ═══════════ OBJETIVO DE VENTAS (MANUAL) ═══════════ -->
    <!-- Es la lamina que arma Fundacion, tipeable. Se guarda aparte del resto
         porque es el unico dato de la pantalla que no sale de la operacion. -->
    <div class="ob-card ob-goals-card">
      <div class="ob-card-head">
        <div>
          <h3 class="ob-card-title">Objetivo de ventas <span class="ob-tag ob-tag-manual">MANUAL</span></h3>
          <p class="ob-card-sub">cuántas entradas debe colocar cada área, por modalidad</p>
        </div>
        <button class="ob-save" :disabled="!goalsDirty || isSaving || !editionId" @click="saveGoals">
          <i class="fa-solid" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ isSaving ? 'Guardando...' : (goalsDirty ? 'Guardar cambios' : 'Guardado') }}
        </button>
      </div>

      <div class="ob-table-scroll">
        <table class="ob-goals">
          <thead>
            <tr>
              <th class="ob-g-corner"></th>
              <th v-for="a in areas" :key="a.code" class="ob-g-area">{{ a.name }}</th>
              <th class="ob-g-total">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in MODALIDADES" :key="m.key">
              <td class="ob-g-mod"><i class="fa-solid fa-circle" :style="{ color: m.color }"></i> {{ m.label }}</td>
              <td v-for="a in areas" :key="a.code">
                <input
                  class="ob-g-input"
                  type="number" min="0" inputmode="numeric"
                  :value="goalCell(a.code, m.key)"
                  @input="setGoalCell(a.code, m.key, $event.target.value)"
                />
              </td>
              <td class="ob-g-total">{{ objPorModalidad(m.key) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="ob-g-mod">TOTALES</td>
              <td v-for="a in areas" :key="a.code" class="ob-num">{{ objVentas(a) }}</td>
              <td class="ob-g-total ob-g-grand">{{ objetivoTotal }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ═══════════ TOOLBAR GRÁFICO ═══════════ -->
    <div class="ob-card ob-toolbar">
      <span class="ob-flabel">MÉTRICA GRÁFICO</span>
      <div class="ob-tabs">
        <button class="ob-tab" :class="{ active: chartMetric === 'modalidad' }" @click="chartMetric = 'modalidad'">Ventas por modalidad</button>
        <button class="ob-tab" :class="{ active: chartMetric === 'avance' }" @click="chartMetric = 'avance'">Avance vs Objetivo</button>
      </div>

      <span class="ob-sep"></span>

      <span class="ob-flabel">MODALIDAD</span>
      <div class="ob-chips">
        <button class="ob-chip" :class="{ active: modalidadFocus === null }" @click="modalidadFocus = null">
          <i class="fa-solid fa-circle" style="color: var(--ob-mut)"></i> Todas <b>{{ ventasTotales }}</b>
        </button>
        <button
          v-for="m in ventasPorModalidad"
          :key="m.key"
          class="ob-chip"
          :class="{ active: modalidadFocus === m.key }"
          @click="modalidadFocus = modalidadFocus === m.key ? null : m.key"
        >
          <i class="fa-solid fa-circle" :style="{ color: m.color }"></i> {{ m.label }} <b>{{ m.value }}</b>
        </button>
      </div>
    </div>

    <!-- ═══════════ GRÁFICO + DONUT ═══════════ -->
    <div class="ob-charts">
      <div class="ob-card ob-chart-card">
        <div class="ob-card-head">
          <div>
            <h3 class="ob-card-title">{{ chartMetric === 'modalidad' ? 'Ventas por modalidad' : 'Avance vs Objetivo por área' }}</h3>
            <p class="ob-card-sub">barra sólida = inscritos reales · marca = objetivo manual</p>
          </div>
          <div class="ob-card-metric">
            <div class="ob-cm-value">{{ chartMetric === 'modalidad' ? ventasTotales : objetivoTotal }}</div>
            <div class="ob-cm-label">{{ chartMetric === 'modalidad' ? 'ventas totales' : 'objetivo total' }}</div>
          </div>
        </div>

        <div class="ob-plot">
          <div class="ob-y-axis">
            <span v-for="t in chartTicks" :key="t">{{ t }}</span>
          </div>
          <div class="ob-bars">
            <div class="ob-grid">
              <span v-for="t in chartTicks" :key="t"></span>
            </div>
            <div
              v-for="s in chartSeries"
              :key="s.key"
              class="ob-bar-slot"
              :class="{ dim: modalidadFocus && chartMetric === 'modalidad' && modalidadFocus !== s.key }"
            >
              <span class="ob-bar-value">{{ s.value }}</span>
              <div class="ob-bar" :style="{ height: (s.value / chartMax * 100) + '%', background: s.color }"></div>
              <div v-if="s.ref != null" class="ob-bar-ref" :style="{ bottom: (s.ref / chartMax * 100) + '%' }" :title="`Objetivo ${s.ref}`"></div>
              <span class="ob-bar-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ob-card ob-donut-card">
        <div class="ob-card-head">
          <h3 class="ob-card-title">Estado del objetivo</h3>
          <p class="ob-card-sub ob-right">inscritos reales vs. faltantes, sobre {{ objetivoTotal }}</p>
        </div>

        <div class="ob-donut">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="78" fill="none" stroke="#eef1f6" stroke-width="30"></circle>
            <circle
              v-for="seg in donut.segments"
              :key="seg.key"
              cx="100" cy="100" r="78" fill="none"
              :style="{ stroke: seg.color }"
              stroke-width="30" pathLength="100"
              :stroke-dasharray="seg.dash"
              :stroke-dashoffset="seg.offset"
            ></circle>
          </svg>
          <div class="ob-donut-center">
            <div class="ob-dc-value">{{ donut.pct }}%</div>
            <div class="ob-dc-label">PAGADO</div>
          </div>
        </div>

        <div class="ob-donut-legend">
          <div v-for="l in donut.legend" :key="l.key" class="ob-dl-row">
            <span class="ob-dl-dot" :style="{ background: l.color }"></span>
            <span class="ob-dl-name">{{ l.name }}</span>
            <span class="ob-dl-count">{{ l.count }}</span>
            <span class="ob-dl-pct">{{ l.pct }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ TABLA POR ÁREA ═══════════ -->
    <div class="ob-card ob-table-card">
      <div class="ob-card-head">
        <h3 class="ob-card-title">Avance total por área</h3>
        <span class="ob-hint">clic en una fila para ver su detalle</span>
      </div>

      <div class="ob-table-scroll">
        <table class="ob-table">
          <thead>
            <tr>
              <th rowspan="2" class="ob-th-main">1. AVANCE TOTAL</th>
              <th rowspan="2">Obj Ventas</th>
              <th rowspan="2">Avance Ventas</th>
              <th :colspan="MODALIDADES.length" class="ob-th-group">CANALES DE VENTA (MODALIDAD)</th>
              <th v-if="hayHuerfanas" rowspan="2" title="Inscripciones sin categoría de entrada registrada">Sin categoría</th>
              <th rowspan="2">Consultas Totales</th>
              <th rowspan="2">% Conversión</th>
            </tr>
            <tr>
              <th v-for="m in MODALIDADES" :key="m.key" class="ob-th-mod">
                <i class="fa-solid fa-circle" :style="{ color: m.color }"></i> {{ m.label }}
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="area in areas" :key="area.code">
              <tr
                class="ob-row ob-row-parent"
                :class="{ selected: selectedRow === area.code }"
                @click="toggleRow(area)"
              >
                <td class="ob-td-name">
                  <i v-if="area.children" class="fa-solid ob-caret" :class="expanded[area.code] ? 'fa-caret-down' : 'fa-caret-right'"></i>
                  <span :class="{ 'ob-strong': !!area.children }">{{ area.code }} {{ area.name }}</span>
                </td>
                <td class="ob-num ob-muted">{{ objVentas(area) }}</td>
                <td class="ob-num ob-strong">{{ area.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(area[m.key])">{{ area[m.key] }}</td>
                <td v-if="hayHuerfanas" :class="cellClass(area.sin_categoria)">{{ area.sin_categoria }}</td>
                <td class="ob-num">{{ area.consultas }}</td>
                <td class="ob-num">{{ conversion(area) }}</td>
              </tr>

              <tr
                v-for="child in (expanded[area.code] ? area.children || [] : [])"
                :key="child.code"
                class="ob-row ob-row-child"
              >
                <td class="ob-td-name ob-td-indent">{{ child.name }}</td>
                <td class="ob-num ob-muted">–</td>
                <td class="ob-num">{{ child.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(child[m.key])">{{ child[m.key] }}</td>
                <td v-if="hayHuerfanas" :class="cellClass(child.sin_categoria)">{{ child.sin_categoria }}</td>
                <td class="ob-num ob-muted">–</td>
                <td class="ob-num ob-muted">–</td>
              </tr>
            </template>

            <tr v-if="!isLoading && !areas.length">
              <td :colspan="5 + MODALIDADES.length" class="ob-empty">
                <i class="fa-solid fa-circle-info"></i> Sin inscripciones ni consultas para este congreso todavía.
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="ob-foot ob-foot-navy">
              <td class="ob-td-name">TOTAL <span class="ob-tag ob-tag-real">REAL</span></td>
              <td class="ob-num">{{ objetivoTotal }}</td>
              <td class="ob-num">{{ avanceTotal }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ totalPorModalidad[m.key] }}</td>
              <td v-if="hayHuerfanas" class="ob-num">{{ totalPorModalidad.sin_categoria }}</td>
              <td class="ob-num">{{ consultasTotal }}</td>
              <td class="ob-num">{{ conversion({ avance: avanceTotal, consultas: consultasTotal }) }}</td>
            </tr>
            <tr class="ob-foot ob-foot-falta">
              <td class="ob-td-name">FALTA</td>
              <td class="ob-num">–</td>
              <td class="ob-num">{{ filaFalta.avance }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ filaFalta[m.key] }}</td>
              <td v-if="hayHuerfanas" class="ob-num">–</td>
              <td class="ob-num">–</td>
              <td class="ob-num">–</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tokens heredados de views/academica/ReporteAcademico.vue para que el
   modulo se lea como el resto del ERP y el dark mode salga gratis. */
.ob {
  --ob-navy: #1b2a5b;
  --ob-navy-2: #16244f;
  --ob-bg: #f4f6fa;
  --ob-surface: #fff;
  --ob-line: #e6e9f0;
  --ob-line-soft: #f0f2f6;
  --ob-ink: #0f172a;
  --ob-slate: #475569;
  --ob-slate-2: #64748b;
  --ob-mut: #94a3b8;
  --ob-eyebrow: #8a93a5;
  --ob-green: #12a150;
  --ob-green-soft: #e7f6ee;
  --ob-amber: #e8833a;
  --ob-amber-soft: #fdf6ec;
  --ob-sand: #e2cdad;

  font-family: Inter, 'Hanken Grotesk', -apple-system, system-ui, sans-serif;
  color: var(--ob-ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 4px 0 32px;
}

.ob-card {
  background: var(--ob-surface);
  border: 1px solid var(--ob-line);
  border-radius: 14px;
  padding: 20px 22px;
  margin-bottom: 16px;
}

/* ── HEADER ── */
.ob-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.ob-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .14em;
  color: var(--ob-eyebrow); margin-bottom: 6px;
}
.ob-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: var(--ob-navy); }
.ob-head-right { display: flex; align-items: center; gap: 10px; }
.ob-live {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; color: var(--ob-slate-2);
}
.ob-live i { font-size: 7px; color: var(--ob-green); }
.ob-icon-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid var(--ob-line); background: var(--ob-surface);
  color: var(--ob-slate); cursor: pointer; font-size: 12px;
}
.ob-icon-btn:hover { background: var(--ob-bg); }
.ob-icon-btn:disabled { opacity: .55; cursor: not-allowed; }

.ob-filters {
  display: flex; align-items: center; justify-content: space-between;
  gap: 18px; flex-wrap: wrap; margin-top: 18px;
}
.ob-filter { display: flex; align-items: center; gap: 10px; }
.ob-flabel {
  font-size: 11px; font-weight: 700; letter-spacing: .1em;
  color: var(--ob-eyebrow); white-space: nowrap;
}
.ob-select {
  min-width: 210px; padding: 8px 12px; font-size: 13px; font-weight: 600;
  color: var(--ob-ink); background: var(--ob-surface);
  border: 1px solid var(--ob-line); border-radius: 8px; cursor: pointer;
}
.ob-legend { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ob-leg { font-size: 12px; font-weight: 600; color: var(--ob-slate); }
.ob-leg i { font-size: 7px; margin-right: 4px; vertical-align: 2px; }
.ob-tag {
  display: inline-flex; align-items: center; padding: 2px 7px;
  border-radius: 5px; font-size: 9px; font-weight: 800; letter-spacing: .08em;
}
.ob-tag-real { background: var(--ob-green-soft); color: #12703a; }
.ob-tag-manual { background: var(--ob-navy); color: #fff; }
.ob-tag-hint { font-size: 11px; color: var(--ob-mut); margin-left: -6px; }

/* ── KPIs ── */
.ob-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
.ob-kpi {
  background: var(--ob-surface); border: 1px solid var(--ob-line);
  border-radius: 14px; padding: 18px 20px;
}
.ob-k-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 700; letter-spacing: .1em; color: var(--ob-eyebrow);
}
.ob-k-value {
  margin-top: 8px; font-size: 34px; font-weight: 800;
  letter-spacing: -.03em; color: var(--ob-navy); line-height: 1.05;
}
.ob-k-of { font-size: 22px; font-weight: 700; }
.ob-k-warn { color: var(--ob-amber); }
.ob-k-foot { margin-top: 8px; font-size: 11px; color: var(--ob-mut); }
.ob-k-bar { margin-top: 12px; height: 5px; border-radius: 3px; background: var(--ob-line-soft); overflow: hidden; }
.ob-k-fill { height: 100%; background: var(--ob-navy); border-radius: 3px; transition: width .3s; }

/* ── TOOLBAR ── */
.ob-toolbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 22px; }
.ob-sep { width: 1px; height: 22px; background: var(--ob-line); }
.ob-tabs { display: flex; gap: 4px; }
.ob-tab {
  padding: 7px 14px; border: none; border-radius: 8px; background: transparent;
  font-size: 13px; font-weight: 600; color: var(--ob-slate); cursor: pointer;
}
.ob-tab:hover { background: var(--ob-bg); }
.ob-tab.active { background: var(--ob-navy); color: #fff; }
.ob-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ob-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 11px; border: 1px solid transparent; border-radius: 20px;
  background: transparent; font-size: 12px; font-weight: 600;
  color: var(--ob-slate); cursor: pointer;
}
.ob-chip i { font-size: 7px; }
.ob-chip b { color: var(--ob-ink); }
.ob-chip:hover { background: var(--ob-bg); }
.ob-chip.active { background: var(--ob-bg); border-color: var(--ob-line); }

/* ── GRÁFICOS ── */
.ob-charts { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; margin-bottom: 16px; }
.ob-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.ob-card-title { margin: 0; font-size: 17px; font-weight: 800; color: var(--ob-navy); letter-spacing: -.01em; }
.ob-card-sub { margin: 4px 0 0; font-size: 12px; color: var(--ob-mut); }
.ob-card-sub.ob-right { text-align: right; font-style: italic; }
.ob-card-metric { text-align: right; }
.ob-cm-value { font-size: 24px; font-weight: 800; color: var(--ob-navy); line-height: 1; }
.ob-cm-label { font-size: 10px; color: var(--ob-mut); font-style: italic; }
.ob-hint { font-size: 11px; color: var(--ob-mut); font-style: italic; }

.ob-plot { display: flex; gap: 10px; height: 230px; }
.ob-y-axis {
  display: flex; flex-direction: column; justify-content: space-between;
  font-size: 10px; color: var(--ob-mut); text-align: right; width: 22px;
  padding-bottom: 22px;
}
.ob-bars {
  position: relative; flex: 1; display: flex; align-items: flex-end;
  justify-content: space-around; gap: 12px; padding-bottom: 22px;
}
.ob-grid {
  position: absolute; inset: 0 0 22px 0;
  display: flex; flex-direction: column; justify-content: space-between;
}
.ob-grid span { height: 1px; background: var(--ob-line-soft); }
.ob-bar-slot {
  position: relative; flex: 1; max-width: 74px; height: 100%;
  display: flex; flex-direction: column; justify-content: flex-end;
  align-items: center; transition: opacity .15s;
}
.ob-bar-slot.dim { opacity: .28; }
.ob-bar { width: 100%; min-height: 4px; border-radius: 6px 6px 0 0; transition: height .3s; }
.ob-bar-value { font-size: 13px; font-weight: 800; color: var(--ob-ink); margin-bottom: 5px; }
.ob-bar-ref {
  position: absolute; left: 0; right: 0; height: 2px;
  background: var(--ob-amber); border-radius: 2px;
}
.ob-bar-label {
  position: absolute; bottom: -20px; font-size: 11px; font-weight: 600;
  color: var(--ob-slate-2); white-space: nowrap;
}

/* ── DONUT ── */
.ob-donut { position: relative; width: 190px; margin: 0 auto; }
.ob-donut svg { width: 100%; height: auto; transform: rotate(-90deg); }
.ob-donut-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
}
.ob-dc-value { font-size: 28px; font-weight: 800; color: var(--ob-navy); line-height: 1; }
.ob-dc-label { font-size: 9px; font-weight: 700; letter-spacing: .12em; color: var(--ob-mut); margin-top: 3px; }
.ob-donut-legend { margin-top: 20px; }
.ob-dl-row { display: flex; align-items: center; gap: 9px; padding: 6px 0; font-size: 13px; }
.ob-dl-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.ob-dl-name { flex: 1; font-weight: 600; color: var(--ob-slate); }
.ob-dl-count { font-weight: 800; color: var(--ob-ink); }
.ob-dl-pct { width: 40px; text-align: right; color: var(--ob-mut); font-size: 12px; }

/* ── TABLA ── */
.ob-table-card { padding-bottom: 0; }
.ob-table-scroll { overflow-x: auto; margin: 0 -22px; }
.ob-table { width: 100%; border-collapse: collapse; min-width: 1020px; font-size: 13px; }
.ob-table thead th {
  background: var(--ob-navy); color: #fff; font-size: 11px; font-weight: 700;
  padding: 10px 12px; text-align: center; white-space: nowrap;
  border-bottom: 1px solid var(--ob-navy-2);
}
.ob-th-main { text-align: left !important; padding-left: 22px !important; letter-spacing: .04em; }
.ob-th-group { border-bottom: 1px solid rgba(255, 255, 255, .18) !important; letter-spacing: .04em; }
.ob-th-mod { font-weight: 600 !important; font-size: 10px !important; }
.ob-th-mod i { font-size: 6px; margin-right: 3px; vertical-align: 2px; }

.ob-row td { padding: 11px 12px; text-align: center; border-bottom: 1px solid var(--ob-line-soft); }
.ob-row-parent { cursor: pointer; }
.ob-row-parent:hover { background: var(--ob-bg); }
.ob-row-parent.selected { background: #eef2fb; }
.ob-row-child td { padding: 8px 12px; color: var(--ob-slate-2); }
.ob-row-child { background: #fbfcfe; }
.ob-td-name { text-align: left !important; padding-left: 22px !important; font-weight: 600; }
.ob-td-indent { padding-left: 46px !important; font-weight: 500; }
.ob-caret { width: 12px; color: var(--ob-mut); margin-right: 4px; }
.ob-strong { font-weight: 800; color: var(--ob-ink); }
.ob-muted { color: var(--ob-mut); }
.ob-num { font-variant-numeric: tabular-nums; }
.ob-zero { color: var(--ob-mut); }

.ob-empty { padding: 28px 22px !important; text-align: center !important; color: var(--ob-mut); font-style: italic; }

/* ── OBJETIVO (matriz manual) ── */
.ob-subtitle { margin-top: 6px; font-size: 12px; color: var(--ob-mut); }
.ob-alert {
  margin-top: 14px; padding: 10px 14px; border-radius: 9px;
  background: var(--ob-amber-soft); color: var(--ob-amber);
  font-size: 13px; font-weight: 600;
}
.ob-retry {
  margin-left: 10px; padding: 3px 10px; border-radius: 6px;
  border: 1px solid currentColor; background: transparent;
  color: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
}
.ob-save {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; border: none; border-radius: 8px;
  background: var(--ob-navy); color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
}
.ob-save:disabled { opacity: .45; cursor: default; }

.ob-goals { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 720px; }
.ob-goals th {
  background: var(--ob-navy); color: #fff; padding: 9px 12px;
  font-size: 11px; font-weight: 700; letter-spacing: .04em; text-align: center;
  white-space: nowrap;
}
.ob-goals td { padding: 6px 10px; text-align: center; border-bottom: 1px solid var(--ob-line-soft); }
.ob-g-corner { background: transparent !important; }
.ob-g-mod { text-align: left !important; font-weight: 700; color: var(--ob-slate); white-space: nowrap; }
.ob-g-mod i { font-size: 7px; margin-right: 5px; vertical-align: 2px; }
.ob-g-total { font-weight: 800; color: var(--ob-navy); font-variant-numeric: tabular-nums; }
.ob-goals tfoot td { background: var(--ob-bg); font-weight: 800; font-variant-numeric: tabular-nums; }
.ob-g-grand { background: var(--ob-navy) !important; color: #fff !important; }
/* El input ocupa toda la celda: el objetivo es para tipear, no para buscar
   donde hacer clic. */
.ob-g-input {
  width: 100%; max-width: 90px; padding: 5px 8px; text-align: center;
  font-size: 14px; font-weight: 700; color: var(--ob-ink);
  background: var(--ob-surface); border: 1px solid var(--ob-line);
  border-radius: 7px; font-variant-numeric: tabular-nums;
}
.ob-g-input:focus { outline: none; border-color: var(--ob-navy); box-shadow: 0 0 0 2px rgba(27, 42, 91, .12); }
/* el spinner nativo roba ancho y no aporta nada en una celda de tabla */
.ob-g-input::-webkit-outer-spin-button,
.ob-g-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ob-g-input { -moz-appearance: textfield; }

.ob-foot td { padding: 12px; text-align: center; font-weight: 800; }
.ob-foot-navy td { background: var(--ob-navy); color: #fff; }
.ob-foot-navy .ob-tag-real { background: rgba(255, 255, 255, .16); color: #b8f0d0; }
.ob-foot-falta td { background: var(--ob-amber-soft); color: var(--ob-amber); }

@media (max-width: 1200px) {
  .ob-kpis { grid-template-columns: repeat(2, 1fr); }
  .ob-charts { grid-template-columns: 1fr; }
}

/* ══════════ DARK MODE ══════════ */
/* --ob-navy no se voltea: sigue siendo fondo de tabla/tabs con texto blanco.
   Sus usos como TEXTO se corrigen abajo, igual que en ReporteAcademico. */
[data-coreui-theme="dark"] .ob {
  --ob-bg: #1F1F1A;
  --ob-surface: #1A1A14;
  --ob-line: #2A2A22;
  --ob-line-soft: #24241E;
  --ob-ink: #F4F4F0;
  --ob-slate: #C9C9C1;
  --ob-slate-2: #A0A099;
  --ob-mut: #8A8A80;
  --ob-eyebrow: #8A8A80;
  --ob-green: #34D399;
  --ob-green-soft: rgba(16, 185, 129, .14);
  --ob-amber: #FBBF24;
  --ob-amber-soft: rgba(245, 158, 11, .12);
}
[data-coreui-theme="dark"] .ob .ob-title,
[data-coreui-theme="dark"] .ob .ob-card-title,
[data-coreui-theme="dark"] .ob .ob-k-value,
[data-coreui-theme="dark"] .ob .ob-cm-value,
[data-coreui-theme="dark"] .ob .ob-dc-value,
[data-coreui-theme="dark"] .ob .ob-g-total { color: #8FAADC; }
[data-coreui-theme="dark"] .ob .ob-tag-real { color: #34D399; }
[data-coreui-theme="dark"] .ob .ob-select,
[data-coreui-theme="dark"] .ob .ob-g-input,
[data-coreui-theme="dark"] .ob .ob-icon-btn { background: #1F1F1A; color: var(--ob-ink); }
[data-coreui-theme="dark"] .ob .ob-goals tfoot td { background: #24241E; }
[data-coreui-theme="dark"] .ob .ob-k-bar { background: #24241E; }
[data-coreui-theme="dark"] .ob .ob-k-fill { background: #8FAADC; }
[data-coreui-theme="dark"] .ob .ob-row-child { background: #1F1F1A; }
[data-coreui-theme="dark"] .ob .ob-row-parent.selected { background: #24241E; }
[data-coreui-theme="dark"] .ob .ob-donut svg circle[stroke="#eef1f6"] { stroke: #24241E; }
</style>
