<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Ingresos Operativos</h1>
        <p class="ds-sub">{{ periodoLabel(desde, hasta) }} · EN VIVO, ONLINE y Fundación, sin ventas B2B · pagos registrados en el ERP</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="!nFiltros" @click="clearFilters">
          <i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpiar filtros<template v-if="nFiltros"> ({{ nFiltros }})</template>
        </button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!sorted.length" @click="exportar">
          <i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar a Excel
        </button>
      </div>
    </header>

    <div class="io-toolbar">
      <div class="ds-tabs" role="group" aria-label="Periodo">
        <button type="button" :aria-pressed="String(!esRango)" @click="setModo(false)">Mes</button>
        <button type="button" :aria-pressed="String(esRango)" @click="setModo(true)">Varios meses</button>
      </div>
      <label class="io-field">
        <span>{{ esRango ? 'Desde' : 'Mes' }}</span>
        <input class="ds-input" type="month" :min="PRIMER_MES" :max="esRango ? hasta : mesHoy" :value="desde" @change="onDesde($event.target.value)" />
      </label>
      <label v-if="esRango" class="io-field">
        <span>Hasta</span>
        <input class="ds-input" type="month" :min="desde" :max="mesHoy" :value="hasta" @change="onHasta($event.target.value)" />
      </label>
      <label class="io-field io-tc" title="Tipo de cambio para pasar los pagos en dólares a soles">
        <span>Tipo de cambio</span>
        <input v-model.number="tipoCambio" class="ds-input" type="number" min="1" max="20" step="0.01" />
      </label>
    </div>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.label" class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="ds-skel"></span>
            <span v-else class="ds-kpi-value">{{ formatValue(k.valor, 'soles') }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <article class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">Resumen por línea</h3>
        <span class="ds-panel-hint">{{ nFiltros ? 'con los filtros del detalle' : 'todo el periodo' }} · US$ a S/ {{ tcLabel }}</span>
      </header>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--densa">
          <thead>
            <tr>
              <th>Línea</th>
              <th>Concepto</th>
              <th class="num">Soles</th>
              <th class="num">Dólares</th>
              <th class="num">Total en S/</th>
              <th class="num">Part.</th>
              <th class="num">Pagos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in resumen.filas" :key="f.id">
              <td>{{ f.linea }}</td>
              <td>
                <div>{{ f.label }}</div>
                <div class="io-note">{{ f.nota }}</div>
              </td>
              <td class="num">{{ formatValue(f.pen, 'monto') }}</td>
              <td class="num">{{ money('USD', f.usd) }}</td>
              <td class="num"><strong>{{ formatValue(f.soles, 'monto') }}</strong></td>
              <td class="num">{{ formatValue(f.pct, 'pct') }}</td>
              <td class="num">{{ f.pagos }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="io-total">
              <td colspan="2">Total</td>
              <td class="num">{{ formatValue(resumen.total.pen, 'monto') }}</td>
              <td class="num">{{ money('USD', resumen.total.usd) }}</td>
              <td class="num">{{ formatValue(resumen.total.soles, 'monto') }}</td>
              <td class="num">{{ resumen.total.soles ? '100%' : '—' }}</td>
              <td class="num">{{ resumen.total.pagos }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>

    <article class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">Detalle de pagos</h3>
        <span class="ds-panel-hint">
          {{ sorted.length }} de {{ rows.length }} pagos · clic en un encabezado para filtrar u ordenar; los filtros se combinan
        </span>
      </header>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa io-table">
          <thead>
            <tr>
              <th class="num">N°</th>
              <th v-for="c in COLUMNS" :key="c.key" :class="{ num: c.kind === 'monto' }" :aria-sort="ariaSort(c.key)">
                <ColumnFilter
                  :column="c"
                  :values="valuesByColumn[c.key]"
                  :filter="filters[c.key] ?? null"
                  :sort="sort"
                  @update:filter="setFilter(c.key, $event)"
                  @sort="setSort"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`"><td :colspan="COLUMNS.length + 1"><span class="ds-skel"></span></td></tr>
            </template>
            <tr v-else-if="!pageRows.length">
              <td :colspan="COLUMNS.length + 1" class="ds-empty--lista">
                {{ rows.length ? 'Ningún pago cumple los filtros. Quita alguno o limpia todos.' : 'No hay pagos registrados en este periodo.' }}
              </td>
            </tr>
            <tr v-for="(r, i) in pageRows" v-else :key="`${r.paymentId}-${r.parte || ''}`">
              <td class="num io-muted">{{ pageStart + i + 1 }}</td>
              <td class="mono">{{ fecha(r.fechaPago) }}</td>
              <td class="mono">{{ r.celular || '—' }}</td>
              <td class="io-wide">{{ r.alumno || '—' }}</td>
              <td>{{ r.lineaNegocio }}</td>
              <td>{{ r.tipoPrograma || '—' }}</td>
              <td>{{ r.lineaProducto || '—' }}</td>
              <td class="io-wide">{{ r.curso || '—' }}</td>
              <td class="mono">{{ r.edicion || '—' }}</td>
              <td><span class="ds-pill" :class="TONO_TIPO[r.tipoPago]">{{ r.tipoPago }}</span></td>
              <td>{{ r.moneda }}</td>
              <td class="num">{{ money(r.moneda, r.monto) }}</td>
              <td>{{ r.medioPago || '—' }}</td>
              <td>{{ r.entidadEmpresa || '—' }}</td>
              <td>{{ r.entidadFinanciera || '—' }}</td>
              <td class="mono">{{ r.nOper || '—' }}</td>
              <td><span class="ds-pill" :class="r.estadoLiquidacion === 'Pagado' ? 'ok' : 'warn'">{{ r.estadoLiquidacion || '—' }}</span></td>
              <td class="num"><strong>{{ formatValue(r.montoSoles, 'monto') }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="ds-panel-foot io-foot">
        <span>Total filtrado: <strong>{{ formatValue(resumen.total.soles, 'monto') }}</strong></span>
        <div v-if="pages > 1" class="io-pager">
          <button type="button" class="btn-exec btn-exec-outline" :disabled="page === 0" @click="page--">Anterior</button>
          <span>Página {{ page + 1 }} de {{ pages }}</span>
          <button type="button" class="btn-exec btn-exec-outline" :disabled="page >= pages - 1" @click="page++">Siguiente</button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { downloadCsv } from '@/shared/lib/downloadCsv.js'
import ColumnFilter from '@/shared/ui/ColumnFilter.vue'
import {
  COLUMNS, PRIMER_MES, TIPO_CAMBIO_DEFAULT, withSoles, applyFilters, valuesFor, activeCount,
  sortRows, buildResumen, periodoLabel, mesActual, isMes, toExportRows
} from '@/features/ingresos-operativos/ingresosOperativos.js'

const ficoService = inject(ServiceKeys.Fico)
const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 100
const TONO_TIPO = { PT: 'info', PP: 'violet', CUOTA: 'cyan', BECA: 'warn', AUS: 'warn', ADICIONAL: 'orange' }

// El periodo vive en la URL: el enlace compartido abre el mismo mes.
const mesHoy = mesActual()
const clampMes = v => (isMes(v) && v >= PRIMER_MES ? (v > mesHoy ? mesHoy : v) : null)
const desde = computed(() => clampMes(route.query.desde) ?? mesHoy)
const hasta = computed(() => {
  const h = clampMes(route.query.hasta)
  return h && h > desde.value ? h : desde.value
})
const esRango = computed(() => route.query.modo === 'rango')

const setQuery = patch => router.replace({ query: { ...route.query, ...patch } })
const setModo = rango => setQuery({ modo: rango ? 'rango' : undefined, hasta: rango ? hasta.value : undefined })
function onDesde (v) {
  if (!clampMes(v)) return
  setQuery({ desde: v, hasta: esRango.value && hasta.value >= v ? hasta.value : undefined })
}
function onHasta (v) {
  if (clampMes(v) && v >= desde.value) setQuery({ hasta: v })
}

// Decision pendiente #2 del plan: el sheet usa 3.60 manual y el ERP 3.75 fijo.
const tipoCambio = ref(TIPO_CAMBIO_DEFAULT)
const tc = computed(() => (Number(tipoCambio.value) > 0 ? Number(tipoCambio.value) : TIPO_CAMBIO_DEFAULT))
const tcLabel = computed(() => tc.value.toFixed(2))

const data = ref(null)
const loading = ref(false)
const error = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await ficoService.ingresosOperativos({ desde: desde.value, hasta: hasta.value })
  } catch (err) {
    console.error('Error cargando ingresos operativos:', err)
    data.value = null
    error.value = err?.response?.data?.message || 'No se pudieron cargar los ingresos. Intenta de nuevo en un momento.'
  } finally {
    loading.value = false
  }
}
watch([desde, hasta], load, { immediate: true })

// ── Filtros por encabezado ────────────────────────────────────────────────
const filters = ref({})
const sort = ref({})
const page = ref(0)

const rows = computed(() => withSoles(data.value?.detalle ?? [], tc.value))
const filtered = computed(() => applyFilters(rows.value, filters.value))
const sorted = computed(() => sortRows(filtered.value, sort.value))
const resumen = computed(() => buildResumen(filtered.value, tc.value))
const nFiltros = computed(() => activeCount(filters.value))
const valuesByColumn = computed(() =>
  Object.fromEntries(COLUMNS.map(c => [c.key, valuesFor(rows.value, filters.value, c.key)])))

const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const pageStart = computed(() => page.value * PAGE_SIZE)
const pageRows = computed(() => sorted.value.slice(pageStart.value, pageStart.value + PAGE_SIZE))
watch([filters, sort, data], () => { page.value = 0 })

function setFilter (key, f) {
  const next = { ...filters.value }
  if (f) next[key] = f
  else delete next[key]
  filters.value = next
}
const clearFilters = () => { filters.value = {} }
const setSort = s => { sort.value = s }
const ariaSort = key => (sort.value.key === key ? (sort.value.dir === 'desc' ? 'descending' : 'ascending') : undefined)

const kpis = computed(() => {
  const f = Object.fromEntries(resumen.value.filas.map(x => [x.id, x]))
  return [
    { label: 'Total ingresos', valor: resumen.value.total.soles, note: `${resumen.value.total.pagos} pagos`, icon: 'fa-sack-dollar' },
    { label: 'EN VIVO', valor: f.EN_VIVO_VENTAS.soles + f.EN_VIVO_CUOTAS.soles, note: 'ventas y cuotas Zoom', icon: 'fa-video' },
    { label: 'ONLINE', valor: f.ONLINE.soles, note: 'incluye membresías', icon: 'fa-laptop' },
    { label: 'Fundación WE', valor: f.FUNDACION.soles, note: 'congresos y eventos', icon: 'fa-hand-holding-heart' }
  ]
})

const money = (moneda, n) => (moneda === 'USD' ? `US$ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatValue(n, 'monto'))
const fecha = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')

function exportar () {
  // Celular y N° de operacion como texto, o Excel se come los ceros.
  const textColumns = ['celular', 'nOper'].map(k => COLUMNS.findIndex(c => c.key === k) + 1)
  const sufijo = hasta.value === desde.value ? desde.value : `${desde.value}_a_${hasta.value}`
  downloadCsv(`ingresos-operativos-${sufijo}.csv`, toExportRows(sorted.value), { textColumns })
}
</script>

<style scoped>
.io-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.io-field { display: flex; flex-direction: column; gap: 3px; margin: 0; }
.io-field > span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ds-ink-2); }
.io-field .ds-input { width: 170px; }
.io-tc .ds-input { width: 110px; }
.io-note { font-size: 11px; color: var(--ds-ink-2); }
.io-total td { font-weight: 700; border-top: 2px solid var(--ds-border-strong); }
.io-table td { white-space: nowrap; }
.io-table td.io-wide { white-space: normal; min-width: 220px; }
.io-muted { color: var(--ds-muted); }
.io-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.io-pager { display: flex; align-items: center; gap: 10px; }
@media (max-width: 576px) {
  .io-field, .io-field .ds-input { width: 100%; }
}
</style>
