<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Pagos Adicionales</h1>
        <p class="ds-sub">{{ periodoLabel(mes) }} · Pagos fuera de venta</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="!nFiltros" @click="clearFilters">
          <i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpiar filtros<template v-if="nFiltros"> ({{ nFiltros }})</template>
        </button>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="!sorted.length" @click="exportar">
          <i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar a Excel
        </button>
        <button v-if="puedeRegistrar" class="btn-exec btn-exec-primary" type="button" @click="abrirNuevo">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo pago adicional
        </button>
      </div>
    </header>

    <div class="pa-toolbar">
      <label class="pa-field">
        <span>Mes</span>
        <input class="ds-input" type="month" :min="PRIMER_MES" :max="mesHoy" :value="mes" @change="onMes($event.target.value)" />
      </label>
    </div>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.label" class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="ds-skel"></span>
            <span v-else class="ds-kpi-value">{{ k.valor }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <article class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">Registro de pagos adicionales</h3>
        <span class="ds-panel-hint">
          {{ sorted.length }} de {{ rows.length }} pagos · clic en un encabezado para filtrar u ordenar<template v-if="puedeRegistrar"> · clic en una fila para editarla</template>
        </span>
      </header>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa pa-table">
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
              <th v-if="puedeAnular"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`"><td :colspan="nCols"><span class="ds-skel"></span></td></tr>
            </template>
            <tr v-else-if="!pageRows.length">
              <td :colspan="nCols" class="ds-empty--lista">
                {{ rows.length ? 'Ningún pago cumple los filtros. Quita alguno o limpia todos.' : 'No hay pagos adicionales en este mes.' }}
              </td>
            </tr>
            <tr
              v-for="r in pageRows"
              v-else
              :key="r.id"
              :class="{ 'pa-row-edit': puedeRegistrar }"
              :tabindex="puedeRegistrar ? 0 : undefined"
              @click="abrirEditar(r)"
              @keydown.enter="abrirEditar(r)"
            >
              <td class="num pa-muted">{{ r.id }}</td>
              <td>{{ r.lineaNegocio }}</td>
              <td class="pa-wide">{{ r.programa }}</td>
              <td>{{ r.asunto }}</td>
              <td class="mono">{{ fecha(r.fechaPago) }}</td>
              <td class="pa-wide">{{ r.nombre }}</td>
              <td class="mono">{{ r.celular || '—' }}</td>
              <td>{{ r.correo || '—' }}</td>
              <td><span class="ds-pill" :class="r.estado === 'EFECTUADO' ? 'ok' : 'warn'">{{ r.estado }}</span></td>
              <td><span class="ds-pill" :class="{ ok: r.realizado }">{{ r.realizadoLabel }}</span></td>
              <td class="num">{{ money(r.moneda, r.monto) }}</td>
              <td>{{ r.moneda }}</td>
              <td>{{ r.medioPago || '—' }}</td>
              <td>{{ r.entidadEmpresa || '—' }}</td>
              <td>{{ r.entidadFinanciera || '—' }}</td>
              <td class="mono">{{ r.nOper || '—' }}</td>
              <td>{{ r.tipoPrograma }}</td>
              <td>{{ r.lineaProducto || '—' }}</td>
              <td>{{ r.tipoPago || '—' }}</td>
              <td v-if="puedeAnular" class="pa-actions">
                <button type="button" class="pa-icon-btn" :title="`Anular el pago N° ${r.id}`" @click.stop="pedirAnular(r)">
                  <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                  <span class="visually-hidden">Anular</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="ds-panel-foot pa-foot">
        <span>Total filtrado: <strong>{{ formatValue(totales.pen, 'monto') }}</strong><template v-if="totales.usd"> + <strong>{{ money('USD', totales.usd) }}</strong></template></span>
        <div v-if="pages > 1" class="pa-pager">
          <button type="button" class="btn-exec btn-exec-outline" :disabled="page === 0" @click="page--">Anterior</button>
          <span>Página {{ page + 1 }} de {{ pages }}</span>
          <button type="button" class="btn-exec btn-exec-outline" :disabled="page >= pages - 1" @click="page++">Siguiente</button>
        </div>
      </footer>
    </article>

    <BaseModal v-model="anularOpen" title="Anular pago adicional" size="sm">
      <p v-if="aAnular" class="pa-confirm">
        Se anulará el pago <strong>N° {{ aAnular.id }}</strong> de <strong>{{ aAnular.nombre }}</strong>
        ({{ money(aAnular.moneda, aAnular.monto) }}, {{ aAnular.asunto }}). Deja de verse en el registro; el N° no se reutiliza.
      </p>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" :disabled="anulando" @click="anularOpen = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-danger" :disabled="anulando" @click="confirmarAnular">Anular</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { downloadCsv } from '@/shared/lib/downloadCsv.js'
import { activeCount } from '@/shared/lib/columnFilters.js'
import ColumnFilter from '@/shared/ui/ColumnFilter.vue'
import BaseModal from '@/components/BaseModal.vue'
import {
  COLUMNS, PRIMER_MES, withLabels, applyFilters, valuesFor, sortRows, toExportRows
} from '@/features/pagos-adicionales/pagosAdicionales.js'
import { periodoLabel, mesActual, isMes } from '@/features/ingresos-operativos/ingresosOperativos.js'

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()
const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 100

// Registrar/editar: FICO. Anular: ADMIN y LIDER_FICO (el backend lo vuelve a validar).
const roles = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').roles || [] } catch { return [] }
})()
const puedeRegistrar = ['ADMIN', 'LIDER_FICO', 'FICO'].some(r => roles.includes(r))
const puedeAnular = ['ADMIN', 'LIDER_FICO'].some(r => roles.includes(r))
const nCols = COLUMNS.length + 1 + (puedeAnular ? 1 : 0)

// Consulta mensual. El mes vive en la URL: el enlace compartido abre el mismo.
const mesHoy = mesActual()
const clampMes = v => (isMes(v) && v >= PRIMER_MES ? (v > mesHoy ? mesHoy : v) : null)
const mes = computed(() => clampMes(route.query.mes) ?? mesHoy)
function onMes (v) {
  if (clampMes(v)) router.replace({ query: { ...route.query, mes: v } })
}

const data = ref(null)
const loading = ref(false)
const error = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await ficoService.pagosAdicionales({ desde: mes.value })
  } catch (err) {
    console.error('Error cargando pagos adicionales:', err)
    data.value = null
    error.value = err?.response?.data?.message || 'No se pudieron cargar los pagos adicionales. Intenta de nuevo en un momento.'
  } finally {
    loading.value = false
  }
}
watch(mes, load, { immediate: true })

// ── Filtros por encabezado ────────────────────────────────────────────────
const filters = ref({})
const sort = ref({ key: null })
const page = ref(0)

const rows = computed(() => withLabels(data.value?.filas ?? []))
const filtered = computed(() => applyFilters(rows.value, filters.value))
// Sin orden elegido: lo último registrado arriba.
const sorted = computed(() => (sort.value.key ? sortRows(filtered.value, sort.value) : [...filtered.value].sort((a, b) => b.id - a.id)))
const nFiltros = computed(() => activeCount(filters.value))
const valuesByColumn = computed(() =>
  Object.fromEntries(COLUMNS.map(c => [c.key, valuesFor(rows.value, filters.value, c.key)])))

const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const pageRows = computed(() => sorted.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
watch([filters, sort, data], () => { page.value = 0 })

function setFilter (key, f) {
  const next = { ...filters.value }
  if (f) next[key] = f
  else delete next[key]
  filters.value = next
}
const clearFilters = () => { filters.value = {} }
const setSort = s => { sort.value = s.key ? s : { key: null } }
const ariaSort = key => (sort.value.key === key ? (sort.value.dir === 'desc' ? 'descending' : 'ascending') : undefined)

const round2 = n => Math.round(n * 100) / 100
const totales = computed(() => filtered.value.reduce((t, r) => {
  if (r.moneda === 'USD') t.usd = round2(t.usd + r.monto)
  else t.pen = round2(t.pen + r.monto)
  return t
}, { pen: 0, usd: 0 }))

const kpis = computed(() => {
  const noRealizados = filtered.value.filter(r => !r.realizado).length
  return [
    { label: 'Total en soles', valor: formatValue(totales.value.pen, 'monto'), note: totales.value.usd ? `y ${money('USD', totales.value.usd)} en dólares` : 'pagos en PEN', icon: 'fa-sack-dollar' },
    { label: 'Pagos', valor: filtered.value.length, note: nFiltros.value ? 'con los filtros' : 'en el mes', icon: 'fa-receipt' },
    { label: 'Sin realizar', valor: noRealizados, note: '¿Realizado? = No', icon: 'fa-hourglass-half' },
    { label: 'Asuntos distintos', valor: new Set(filtered.value.map(r => r.asunto)).size, note: 'reprogramación, visita técnica…', icon: 'fa-tags' }
  ]
})

const money = (moneda, n) => (moneda === 'USD' ? `US$ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatValue(n, 'monto'))
const fecha = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')

// ── Alta, edición y anulación ────────────────────────────────────────────
// El formulario es una página propia, como el de inscripciones.
const abrirNuevo = () => router.push({ name: 'ficoPagoAdicionalNuevo' })
function abrirEditar (r) {
  if (puedeRegistrar) router.push({ name: 'ficoPagoAdicionalEditar', params: { id: r.id } })
}

const anularOpen = ref(false)
const aAnular = ref(null)
const anulando = ref(false)
function pedirAnular (r) {
  aAnular.value = r
  anularOpen.value = true
}
async function confirmarAnular () {
  anulando.value = true
  try {
    await ficoService.anularPagoAdicional(aAnular.value.id)
    toast.success(`Pago N° ${aAnular.value.id} anulado.`)
    anularOpen.value = false
    load()
  } catch (err) {
    console.error('Error anulando pago adicional:', err)
    toast.error(err?.response?.data?.message || 'No se pudo anular el pago.')
  } finally {
    anulando.value = false
  }
}

function exportar () {
  // Celular y N° de operación como texto, o Excel se come los ceros.
  const textColumns = ['celular', 'nOper'].map(k => COLUMNS.findIndex(c => c.key === k) + 1)
  downloadCsv(`pagos-adicionales-${mes.value}.csv`, toExportRows(sorted.value), { textColumns })
}
</script>

<style scoped>
.pa-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.pa-field { display: flex; flex-direction: column; gap: 3px; margin: 0; }
.pa-field > span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ds-ink-2); }
.pa-field .ds-input { width: 170px; }
.pa-table td { white-space: nowrap; }
.pa-table td.pa-wide { white-space: normal; min-width: 200px; }
.pa-row-edit { cursor: pointer; }
.pa-row-edit:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.pa-muted { color: var(--ds-muted); }
.pa-actions { text-align: right; }
.pa-icon-btn { padding: 4px 8px; border: 0; border-radius: var(--ds-radius-control); background: none; color: var(--ds-muted); cursor: pointer; }
.pa-icon-btn:hover, .pa-icon-btn:focus-visible { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.pa-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.pa-pager { display: flex; align-items: center; gap: 10px; }
.pa-confirm { margin: 0; line-height: 1.5; }
@media (max-width: 576px) {
  .pa-field, .pa-field .ds-input { width: 100%; }
}
</style>
