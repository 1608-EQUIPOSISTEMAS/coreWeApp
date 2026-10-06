<script setup>
import { ref, computed, reactive, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'

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

// Color de IDENTIDAD de cada modalidad (no un estado): tintas de marca de
// negocio del sistema de diseño, asi siguen el tema claro/oscuro sin hex aqui.
const MODALIDAD_COLOR = {
  vip: 'var(--ds-warn)',
  premium: 'var(--ds-orange-ink)',
  general: 'var(--ds-cyan-ink)',
  virtual: 'var(--ds-violet-ink)',
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
  (report.value?.modalidades || []).map(m => ({ ...m, color: MODALIDAD_COLOR[m.key] || 'var(--ds-muted)' })),
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
    color: 'var(--ds-accent)',
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
      { key: 'avance', color: 'var(--ds-accent)', dash: `${hecho} ${100 - hecho}`, offset: 25 },
      { key: 'falta', color: 'var(--ds-reference)', dash: `${100 - hecho} ${hecho}`, offset: 25 - hecho },
    ],
    legend: [
      { key: 'avance', name: 'Vendido', color: 'var(--ds-accent)', count: avanceTotal.value, pct: pctAvance.value },
      { key: 'falta', name: 'Falta', color: 'var(--ds-reference)', count: faltanPorSumar.value, pct: Math.max(0, 100 - hecho) },
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
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">{{ selectedEdition?.abbreviation || 'Selecciona un congreso' }}</h1>
        <p class="ds-sub">
          <template v-if="selectedEdition">
            Inicia {{ fechaCorta(selectedEdition.start_date) }}
            <template v-if="selectedEdition.global_code"> · {{ selectedEdition.global_code }}</template>
            ·
          </template>
          {{ formatValue(consultasTotal, 'num') }} leads reales
        </p>
      </div>
      <div class="ds-head-actions">
        <select v-model="editionId" class="ds-input ob-select" aria-label="Congreso" :disabled="isLoading" @change="onEditionChange">
          <option v-for="e in editions" :key="e.edition_num_id" :value="e.edition_num_id">
            {{ e.abbreviation || 'Sin nombre' }} · {{ fechaCorta(e.start_date) }}{{ e.active === 'N' ? ' · (inactiva)' : '' }}
          </option>
        </select>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="isLoading" @click="refresh">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': isLoading }" aria-hidden="true"></i> Actualizar
        </button>
      </div>
    </header>

    <!-- REAL sale de la operacion; MANUAL es lo que tipea Fundacion. La marca
         va en cada bloque para que nadie confunda una meta con un resultado. -->
    <div class="ob-legend">
      <span v-for="m in MODALIDADES" :key="m.key" class="ob-leg">
        <i class="ob-dot" :style="{ background: m.color }" aria-hidden="true"></i> {{ m.label }}
      </span>
      <span class="ob-leg"><span class="ds-pill ok">REAL</span> inscripciones y leads</span>
      <span class="ob-leg"><span class="ds-pill info">MANUAL</span> objetivo por área</span>
    </div>

    <!-- Un fallo de red no es "no hay ventas": decirlo asi manda a Fundacion
         a buscar un problema de data que no existe. -->
    <p v-if="loadError" class="ds-alert ob-alert">
      <span>
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        No se pudo cargar el reporte. {{ loadError }}
      </span>
      <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="refresh">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar
      </button>
    </p>

    <div class="ds-kpis">
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-bullseye"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ formatValue(objetivoTotal, 'num') }}</span>
          <span class="ds-kpi-label">Objetivo total <span class="ds-pill info">MANUAL</span></span>
          <span class="ds-kpi-note">Suma de objetivos por área</span>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon ok" aria-hidden="true"><i class="fa-solid fa-user-check"></i></span>
        <div class="ds-kpi-body ob-kpi-grow">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">{{ formatValue(avanceTotal, 'num') }}</span>
            <span class="ds-trend">{{ pctAvance }}%</span>
          </div>
          <span class="ds-kpi-label">Total inscritos <span class="ds-pill ok">REAL</span></span>
          <div class="ds-track ob-kpi-track"><i :style="{ width: Math.min(100, pctAvance) + '%' }"></i></div>
          <span class="ds-kpi-note">De {{ formatValue(objetivoTotal, 'num') }} del objetivo</span>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-comments"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ formatValue(consultasTotal, 'num') }}</span>
          <span class="ds-kpi-label">Consultas <span class="ds-pill ok">REAL</span></span>
          <span class="ds-kpi-note">
            {{ consultasTotal ? (avanceTotal / consultasTotal * 100).toFixed(2).replace('.', ',') : '0' }}% de conversión
          </span>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon warn" aria-hidden="true"><i class="fa-solid fa-hourglass-half"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ formatValue(faltanPorSumar, 'num') }}</span>
          <span class="ds-kpi-label">Faltan por sumar</span>
          <span class="ds-kpi-note">Objetivo menos inscritos</span>
        </div>
      </div>
    </div>

    <!-- Es la lamina que arma Fundacion, tipeable. Se guarda aparte del resto
         porque es el unico dato de la pantalla que no sale de la operacion. -->
    <section class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h3 class="ds-panel-title">¿Cuántas entradas debe colocar cada área? <span class="ds-pill info">MANUAL</span></h3>
          <p class="ds-panel-sub">Objetivo de ventas por área y modalidad</p>
        </div>
        <button class="btn-exec btn-exec-primary btn-sm" type="button" :disabled="!goalsDirty || isSaving || !editionId" @click="saveGoals">
          <i class="fa-solid" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ isSaving ? 'Guardando…' : (goalsDirty ? 'Guardar cambios' : 'Guardado') }}
        </button>
      </header>

      <div class="ds-table-scroll ob-flush">
        <table class="ds-table ds-table--densa ob-goals" :class="{ 'is-dirty': goalsDirty }">
          <thead>
            <tr>
              <th>Modalidad</th>
              <th v-for="a in areas" :key="a.code" class="ob-num">{{ a.name }}</th>
              <th class="ob-num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in MODALIDADES" :key="m.key">
              <td class="ob-g-mod"><i class="ob-dot" :style="{ background: m.color }" aria-hidden="true"></i> {{ m.label }}</td>
              <td v-for="a in areas" :key="a.code" class="ob-num">
                <input
                  class="ds-input ob-g-input"
                  type="number" min="0" inputmode="numeric"
                  :aria-label="`Objetivo ${a.name} ${m.label}`"
                  :value="goalCell(a.code, m.key)"
                  @input="setGoalCell(a.code, m.key, $event.target.value)"
                />
              </td>
              <td class="ob-num ob-strong">{{ objPorModalidad(m.key) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="ob-total">
              <td>Totales</td>
              <td v-for="a in areas" :key="a.code" class="ob-num">{{ objVentas(a) }}</td>
              <td class="ob-num ob-strong">{{ objetivoTotal }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <div class="ob-toolbar">
      <div class="ds-tabs" role="tablist" aria-label="Métrica del gráfico">
        <button type="button" role="tab" :aria-selected="String(chartMetric === 'modalidad')" @click="chartMetric = 'modalidad'">Ventas por modalidad</button>
        <button type="button" role="tab" :aria-selected="String(chartMetric === 'avance')" @click="chartMetric = 'avance'">Avance vs objetivo</button>
      </div>

      <div class="ds-tabs" aria-label="Modalidad resaltada">
        <button type="button" :aria-pressed="String(modalidadFocus === null)" @click="modalidadFocus = null">
          Todas <b>{{ ventasTotales }}</b>
        </button>
        <button
          v-for="m in ventasPorModalidad"
          :key="m.key"
          type="button"
          :aria-pressed="String(modalidadFocus === m.key)"
          @click="modalidadFocus = modalidadFocus === m.key ? null : m.key"
        >
          <i class="ob-dot" :style="{ background: m.color }" aria-hidden="true"></i> {{ m.label }} <b>{{ m.value }}</b>
        </button>
      </div>
    </div>

    <div class="ds-row ds-row--hero">
      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">{{ chartMetric === 'modalidad' ? '¿Cuánto vende cada modalidad?' : '¿Cómo avanza cada área contra su objetivo?' }}</h3>
            <p class="ds-panel-sub">Barra = inscritos reales · línea = objetivo manual</p>
          </div>
          <div class="ob-metric">
            <span class="ob-metric-value">{{ chartMetric === 'modalidad' ? ventasTotales : objetivoTotal }}</span>
            <span class="ds-panel-hint">{{ chartMetric === 'modalidad' ? 'ventas totales' : 'objetivo total' }}</span>
          </div>
        </header>

        <div class="ds-panel-body">
          <div class="ob-plot" role="img" :aria-label="chartMetric === 'modalidad' ? 'Ventas por modalidad' : 'Avance vs objetivo por área'">
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
                <span class="ob-bar-label" :title="s.label">{{ s.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Cuánto del objetivo ya está vendido?</h3>
          <span class="ds-panel-hint">Sobre {{ objetivoTotal }}</span>
        </header>

        <div class="ds-panel-body">
          <div class="ob-donut" role="img" :aria-label="`${donut.pct}% del objetivo vendido`">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle class="ob-donut-track" cx="100" cy="100" r="78" fill="none" stroke-width="30"></circle>
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
              <span class="ob-dc-value">{{ donut.pct }}%</span>
              <span class="ds-panel-hint">pagado</span>
            </div>
          </div>

          <div class="ob-donut-legend">
            <div v-for="l in donut.legend" :key="l.key" class="ob-dl-row">
              <i class="ob-dot" :style="{ background: l.color }" aria-hidden="true"></i>
              <span class="ob-dl-name">{{ l.name }}</span>
              <span class="ob-dl-count">{{ l.count }}</span>
              <span class="ob-dl-pct">{{ l.pct }}%</span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿Cuánto lleva cada área?</h3>
        <span class="ds-panel-hint">Clic en un área para ver su detalle</span>
      </header>

      <div class="ds-table-scroll ob-flush">
        <table class="ds-table ds-table--densa ob-table">
          <thead>
            <tr>
              <th rowspan="2">1. Avance total</th>
              <th rowspan="2" class="ob-num">Obj. ventas</th>
              <th rowspan="2" class="ob-num">Avance ventas</th>
              <th :colspan="MODALIDADES.length" class="ob-th-group">Canales de venta (modalidad)</th>
              <th v-if="hayHuerfanas" rowspan="2" class="ob-num" title="Inscripciones sin categoría de entrada registrada">Sin categoría</th>
              <th rowspan="2" class="ob-num">Consultas totales</th>
              <th rowspan="2" class="ob-num">% Conversión</th>
            </tr>
            <tr>
              <th v-for="m in MODALIDADES" :key="m.key" class="ob-num ob-th-group">
                <i class="ob-dot" :style="{ background: m.color }" aria-hidden="true"></i> {{ m.label }}
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-if="isLoading && !areas.length">
              <tr v-for="n in 5" :key="`skel-${n}`">
                <td :colspan="5 + MODALIDADES.length"><span class="ds-skel"></span></td>
              </tr>
            </template>

            <template v-for="area in areas" :key="area.code">
              <tr
                class="link ob-row-parent"
                :class="{ selected: selectedRow === area.code }"
                @click="toggleRow(area)"
              >
                <td>
                  <i v-if="area.children" class="fa-solid ob-caret" :class="expanded[area.code] ? 'fa-caret-down' : 'fa-caret-right'" aria-hidden="true"></i>
                  <span :class="{ 'ob-strong': !!area.children }">{{ area.code }} {{ area.name }}</span>
                </td>
                <td class="ob-num ob-zero">{{ objVentas(area) }}</td>
                <td class="ob-num ob-strong">{{ area.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(area[m.key])">{{ area[m.key] }}</td>
                <td v-if="hayHuerfanas" :class="cellClass(area.sin_categoria)">{{ area.sin_categoria }}</td>
                <td class="ob-num">{{ area.consultas }}</td>
                <td class="ob-num">{{ conversion(area) }}</td>
              </tr>

              <tr
                v-for="child in (expanded[area.code] ? area.children || [] : [])"
                :key="child.code"
                class="ob-row-child"
              >
                <td class="ob-td-indent">{{ child.name }}</td>
                <td class="ob-num ob-zero">–</td>
                <td class="ob-num">{{ child.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(child[m.key])">{{ child[m.key] }}</td>
                <td v-if="hayHuerfanas" :class="cellClass(child.sin_categoria)">{{ child.sin_categoria }}</td>
                <td class="ob-num ob-zero">–</td>
                <td class="ob-num ob-zero">–</td>
              </tr>
            </template>

            <tr v-if="!isLoading && !areas.length">
              <td :colspan="5 + MODALIDADES.length" class="ds-empty ds-empty--lista">
                Sin inscripciones ni consultas para este congreso todavía. Elige otro congreso arriba.
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="ob-total">
              <td>Total <span class="ds-pill ok">REAL</span></td>
              <td class="ob-num">{{ objetivoTotal }}</td>
              <td class="ob-num">{{ avanceTotal }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ totalPorModalidad[m.key] }}</td>
              <td v-if="hayHuerfanas" class="ob-num">{{ totalPorModalidad.sin_categoria }}</td>
              <td class="ob-num">{{ consultasTotal }}</td>
              <td class="ob-num">{{ conversion({ avance: avanceTotal, consultas: consultasTotal }) }}</td>
            </tr>
            <tr class="ob-falta">
              <td>Falta</td>
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
    </section>
  </div>
</template>

<style scoped>
/* Solo lo propio de esta pantalla (grafico de barras HTML, dona SVG, grilla de
   objetivo). Paneles, KPIs, tablas, pills y pestañas salen de ds-* globales. */
.ob-select { width: auto; min-width: 210px; max-width: 100%; font-weight: 600; cursor: pointer; }

.ob-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; margin: 0 2px; font-size: 12px; color: var(--ds-ink-2); }
.ob-leg { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.ob-dot { display: inline-block; flex: none; width: 8px; height: 8px; border-radius: 50%; }

.ob-alert { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; }

.ob-kpi-grow { flex: 1; }
.ob-kpi-track { margin-top: 8px; }

/* ── Grilla de objetivo (§5.5.1) ── */
.ob-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ob-zero { color: var(--ds-muted); }
.ob-strong { font-weight: 800; color: var(--ds-heading); }
.ob-g-mod { white-space: nowrap; }
.ob-g-mod .ob-dot, .ob-th-group .ob-dot { margin-right: 4px; }
/* Cambios sin guardar: la barra ámbar en la primera celda avisa que el objetivo
   en pantalla todavía no es el guardado. */
.ob-goals.is-dirty tbody td:first-child { box-shadow: inset 3px 0 0 var(--ds-warn); }
.ob-g-input { display: inline-block; width: 80px; height: 30px; text-align: center; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; -moz-appearance: textfield; }
/* el spinner nativo roba ancho y no aporta nada en una celda de tabla */
.ob-g-input::-webkit-outer-spin-button,
.ob-g-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.ob-total td { background: var(--ds-soft-neutral); font-weight: 800; color: var(--ds-heading); }
.ob-falta td { background: var(--ds-soft-warn); font-weight: 800; color: var(--ds-warn-ink); }

/* ── Barra de herramientas del grafico ── */
.ob-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 14px; }
.ob-toolbar .ob-dot { margin-right: 2px; }
.ob-toolbar b { margin-left: 2px; }

/* ── Grafico de barras ── */
.ob-metric { display: flex; flex-direction: column; align-items: flex-end; }
.ob-metric-value { font-size: 24px; font-weight: 800; line-height: 1; color: var(--ds-heading); font-variant-numeric: tabular-nums; }

.ob-plot { display: flex; gap: 10px; height: 230px; }
.ob-y-axis {
  display: flex; flex-direction: column; justify-content: space-between;
  width: 22px; padding-bottom: 22px; font-size: 10px; text-align: right; color: var(--ds-muted);
}
.ob-bars {
  position: relative; flex: 1; min-width: 0; display: flex; align-items: flex-end;
  justify-content: space-around; gap: 12px; padding-bottom: 22px;
}
.ob-grid { position: absolute; inset: 0 0 22px 0; display: flex; flex-direction: column; justify-content: space-between; }
.ob-grid span { height: 1px; background: var(--ds-border); }
.ob-bar-slot {
  position: relative; flex: 1; min-width: 0; max-width: 74px; height: 100%;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
  transition: opacity .15s;
}
.ob-bar-slot.dim { opacity: .28; }
.ob-bar { width: 100%; min-height: 4px; border-radius: var(--ds-radius-sm) var(--ds-radius-sm) 0 0; transition: height .3s; }
.ob-bar-value { margin-bottom: 5px; font-size: 13px; font-weight: 800; color: var(--ds-ink); font-variant-numeric: tabular-nums; }
/* Referencia (objetivo) en tinta oscura: sobre una barra de color se tiene que
   leer la diferencia, y --ds-reference se pierde encima del relleno. */
.ob-bar-ref { position: absolute; left: 0; right: 0; height: 2px; border-radius: 2px; background: var(--ds-heading); }
.ob-bar-label {
  position: absolute; bottom: -20px; left: 0; right: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
  font-size: 11px; font-weight: 600; color: var(--ds-ink-2);
}

/* ── Dona ── */
.ob-donut { position: relative; width: 190px; max-width: 100%; margin: 0 auto; }
.ob-donut svg { width: 100%; height: auto; transform: rotate(-90deg); }
.ob-donut-track { stroke: var(--ds-surface-3); }
.ob-donut-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
}
.ob-dc-value { font-size: 28px; font-weight: 800; line-height: 1; color: var(--ds-heading); }
.ob-donut-legend { margin-top: 20px; }
.ob-dl-row { display: flex; align-items: center; gap: 9px; padding: 6px 0; font-size: 13px; }
.ob-dl-name { flex: 1; font-weight: 600; color: var(--ds-ink-2); }
.ob-dl-count { font-weight: 800; color: var(--ds-ink); font-variant-numeric: tabular-nums; }
.ob-dl-pct { width: 44px; text-align: right; font-size: 12px; color: var(--ds-muted); }

/* ── Tabla por area ── */
.ob-table { min-width: 1020px; }
.ob-th-group { background: var(--ds-soft-info); }
.ob-row-parent.selected td { background: var(--ds-soft-info); }
.ob-row-child td { background: var(--ds-surface-2); }
.ob-flush .ob-row-child td.ob-td-indent { padding-left: 34px; font-weight: 500; }
.ob-caret { width: 12px; margin-right: 4px; color: var(--ds-muted); }

/* La primera y la ultima columna no pegan al borde del panel: la tabla va a
   ras dentro de .ds-table-scroll, sin .ds-panel-body. */
.ob-flush th:first-child, .ob-flush td:first-child { padding-left: 18px; }
.ob-flush th:last-child, .ob-flush td:last-child { padding-right: 18px; }

@media (prefers-reduced-motion: reduce) {
  .ob-bar, .ob-bar-slot { transition: none; }
}
</style>
