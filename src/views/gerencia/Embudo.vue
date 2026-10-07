<template>
  <div class="ds-page eb">

    <header class="ds-head">
      <div class="ds-head-titles">
        <span class="eb-breadcrumb">Gerencia</span>
        <h1 class="ds-title">Embudo de Consultas y Ventas</h1>
        <p class="ds-sub">Consultas, ventas y conversión por canal — {{ periodo }}, {{ matriz.length }} filas de canal</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="isLoading" aria-label="Actualizar datos del embudo" @click="loadData">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': isLoading }" aria-hidden="true"></i>
          {{ isLoading ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>
    </header>

    <!-- ── Filtros ──────────────────────────────────────────────── -->
    <section class="ds-panel eb-filtros" aria-label="Filtros del embudo">
      <div class="ds-field">
        <label class="ds-label" for="eb-anio">Año</label>
        <select id="eb-anio" v-model.number="filters.year" class="ds-input eb-select" @change="loadData">
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="ds-field">
        <label class="ds-label" for="eb-mes">Mes</label>
        <select id="eb-mes" v-model.number="filters.month" class="ds-input eb-select" @change="loadData">
          <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
        </select>
      </div>
      <div class="ds-field">
        <label class="ds-label" for="eb-linea">Línea</label>
        <select id="eb-linea" v-model="filters.linea" class="ds-input eb-select">
          <option value="">Todas</option>
          <option v-for="l in lineas" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
      <span class="eb-grow"></span>
      <div v-if="pacing !== null" class="eb-pacing">
        <span>Avance del mes</span>
        <span class="ds-track eb-pacing-bar" role="img" :aria-label="`Avance del mes: ${pacing}%`"><i :style="{ width: pacing + '%' }"></i></span>
        <span class="eb-pacing-value">{{ formatValue(pacing, 'pct') }}</span>
      </div>
    </section>

    <!-- ── Carga: la forma del contenido final ──────────────────── -->
    <template v-if="isLoading">
      <div class="ds-kpis">
        <div v-for="n in 4" :key="n" class="ds-kpi">
          <div class="ds-kpi-body eb-kpi-body">
            <span class="ds-skel eb-skel-cifra"></span>
            <span class="ds-skel"></span>
          </div>
        </div>
      </div>
      <section class="ds-panel">
        <div class="ds-panel-body eb-skel-filas">
          <span v-for="n in 8" :key="n" class="ds-skel"></span>
        </div>
      </section>
    </template>

    <template v-else>
      <!-- ── Lectura rápida: lo que hay que decidir ─────────────── -->
      <section v-if="alerts.length" class="ds-band" :aria-label="`Lo que hay que decidir en ${periodo}`">
        <div v-for="a in alerts" :key="a.title" class="ds-band-item" :class="STATE_TONE[a.state]">
          <span class="ds-band-label">{{ a.title }}</span>
          <span class="ds-band-value">{{ formatValue(a.count, 'num') }} <small class="eb-band-unit">ediciones</small></span>
          <span class="ds-band-text">{{ a.text }}</span>
        </div>
      </section>

      <!-- ── Nivel 1: el embudo del mes ───────────────────────────── -->
      <div class="ds-kpis">
        <div v-for="k in kpis" :key="k.label" class="ds-kpi">
          <span class="ds-kpi-icon" :class="STATE_TONE[k.state]" aria-hidden="true"><i class="fa-solid" :class="KPI_ICON[k.label]"></i></span>
          <div class="ds-kpi-body eb-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ k.value }}</span>
              <span v-if="k.badge" class="ds-trend" :class="STATE_TONE[k.state]">
                <span class="eb-icono-estado" aria-hidden="true">{{ STATUS_ICON[k.state] }}</span> {{ k.badge }}
              </span>
              <span v-else-if="k.note" class="ds-trend">{{ k.note }}</span>
            </div>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <div v-if="k.pct !== null" class="ds-track eb-track" role="img" :aria-label="`${k.label}: ${k.pct}% de la meta`">
              <i :class="STATE_TONE[k.state]" :style="{ width: Math.min(k.pct, 100) + '%' }"></i>
              <span v-if="pacing !== null && k.paced" class="eb-pace" :style="{ left: pacing + '%' }" :title="`Esperado a hoy: ${pacing}%`"></span>
            </div>
            <span class="ds-kpi-note">{{ k.sub }}</span>
          </div>
        </div>
      </div>

      <!-- ── Nivel 2: matriz de canales ───────────────────────────── -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">¿Qué canal llega a su meta y cuál convierte?</h2>
            <p class="ds-panel-sub">Las 60 columnas de canal de la hoja, en {{ matriz.length }} filas.</p>
          </div>
          <span class="ds-panel-hint">{{ matriz.length }} resultados</span>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--densa eb-table">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Momento</th>
                  <th colspan="3" class="eb-group">Consultas</th>
                  <th colspan="3" class="eb-group">Ventas</th>
                  <th class="eb-group">Conversión</th>
                </tr>
                <tr class="eb-subhead">
                  <th colspan="2"></th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">cons → vta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!matriz.length">
                  <td colspan="9" class="ds-empty ds-empty--lista">No hay consultas ni ventas por canal en {{ periodo }}. Cambia el mes arriba.</td>
                </tr>
                <tr v-for="c in matriz" :key="c.key" :class="{ 'eb-grupo-inicio': c.first }">
                  <td>
                    <span class="eb-dot" :class="'eb-dot-' + c.grupo.toLowerCase()" aria-hidden="true"></span>{{ c.grupo }}
                  </td>
                  <td>{{ c.momento }}</td>
                  <td class="num eb-muted eb-div">{{ c.meta_consultas ? formatValue(c.meta_consultas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(c.consultas, 'num') }}</td>
                  <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(c.consultas, c.meta_consultas)]">{{ pctText(c.consultas, c.meta_consultas) }}</span></td>
                  <td class="num eb-muted eb-div">{{ c.meta_ventas ? formatValue(c.meta_ventas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(c.ventas, 'num') }}</td>
                  <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(c.ventas, c.meta_ventas)]">{{ pctText(c.ventas, c.meta_ventas) }}</span></td>
                  <td class="num eb-div">
                    <div class="eb-conv">
                      <span class="ds-track eb-conv-bar"><i :style="{ width: convWidth(c.conversion_pct) }"></i></span>
                      <span class="eb-conv-val">{{ formatValue(c.conversion_pct, 'pct') }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="eb-total-label">Total</td>
                  <td class="num eb-div">{{ data.totales.meta_consultas ? formatValue(data.totales.meta_consultas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(data.totales.consultas, 'num') }}</td>
                  <td class="num">{{ pctText(data.totales.consultas, data.totales.meta_consultas) }}</td>
                  <td class="num eb-div">{{ data.totales.meta_ventas ? formatValue(data.totales.meta_ventas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(data.totales.ventas, 'num') }}</td>
                  <td class="num">{{ pctText(data.totales.ventas, data.totales.meta_ventas) }}</td>
                  <td class="num eb-strong eb-div">{{ formatValue(data.totales.conversion_pct, 'pct') }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <!-- ── Nivel 3: aporte por área ─────────────────────────────── -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">¿Cuánto de la venta del mes pone cada línea?</h2>
            <p class="ds-panel-sub">Clic o Enter en una fila para filtrar el resto del reporte.</p>
          </div>
          <span class="ds-panel-hint">{{ aportePorLinea.length }} líneas</span>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--densa eb-table">
              <thead>
                <tr>
                  <th>Línea</th>
                  <th class="num">Prog.</th>
                  <th colspan="3" class="eb-group">Consultas</th>
                  <th colspan="3" class="eb-group">Ventas</th>
                  <th class="eb-group">Conversión</th>
                  <th class="eb-group">Aporte</th>
                </tr>
                <tr class="eb-subhead">
                  <th colspan="2"></th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">cons → vta</th>
                  <th class="num eb-div">% de la venta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!aportePorLinea.length">
                  <td colspan="10" class="ds-empty ds-empty--lista">No hay líneas con movimiento en {{ periodo }}. Cambia el mes arriba.</td>
                </tr>
                <tr v-for="a in aportePorLinea" :key="a.linea" class="link" :class="{ 'is-selected': filters.linea === a.linea }"
                    tabindex="0" :aria-pressed="String(filters.linea === a.linea)"
                    @click="toggleLinea(a.linea)" @keydown.enter="toggleLinea(a.linea)">
                  <td>
                    <span class="eb-dot" :style="{ background: lineColor(a.linea) }" aria-hidden="true"></span>{{ a.linea }}
                  </td>
                  <td class="num eb-muted">{{ formatValue(a.ediciones, 'num') }}</td>
                  <td class="num eb-muted eb-div">{{ a.meta_consultas ? formatValue(a.meta_consultas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(a.consultas, 'num') }}</td>
                  <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(a.consultas, a.meta_consultas)]">{{ pctText(a.consultas, a.meta_consultas) }}</span></td>
                  <td class="num eb-muted eb-div">{{ a.meta_ventas ? formatValue(a.meta_ventas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(a.ventas, 'num') }}</td>
                  <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(a.ventas, a.meta_ventas)]">{{ pctText(a.ventas, a.meta_ventas) }}</span></td>
                  <td class="num eb-div">
                    <div class="eb-conv">
                      <span class="ds-track eb-conv-bar"><i :style="{ width: convWidth(a.conversion_pct) }"></i></span>
                      <span class="eb-conv-val">{{ formatValue(a.conversion_pct, 'pct') }}</span>
                    </div>
                  </td>
                  <td class="num eb-div">
                    <div class="eb-conv">
                      <span class="ds-track eb-conv-bar"><i class="eb-aporte" :style="{ width: a.aporte_pct + '%' }"></i></span>
                      <span class="eb-conv-val">{{ formatValue(a.aporte_pct, 'pct') }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="eb-total-label">Total</td>
                  <td class="num">{{ formatValue(data.totales.ediciones, 'num') }}</td>
                  <td class="num eb-div">{{ data.totales.meta_consultas ? formatValue(data.totales.meta_consultas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(data.totales.consultas, 'num') }}</td>
                  <td class="num">{{ pctText(data.totales.consultas, data.totales.meta_consultas) }}</td>
                  <td class="num eb-div">{{ data.totales.meta_ventas ? formatValue(data.totales.meta_ventas, 'num') : '—' }}</td>
                  <td class="num eb-strong">{{ formatValue(data.totales.ventas, 'num') }}</td>
                  <td class="num">{{ pctText(data.totales.ventas, data.totales.meta_ventas) }}</td>
                  <td class="num eb-strong eb-div">{{ formatValue(data.totales.conversion_pct, 'pct') }}</td>
                  <td class="num eb-strong eb-div">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <!-- ── Nivel 4: ediciones ───────────────────────────────────── -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">¿Cómo va cada programa del período?</h2>
            <p class="ds-panel-sub">{{ ediciones.length }} ediciones · clic o Enter en una fila para ver su desglose por canal.</p>
          </div>
          <span class="ds-panel-hint">{{ ediciones.length }} programas</span>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--densa eb-table">
              <thead>
                <tr>
                  <th>Línea</th>
                  <th>Programa</th>
                  <th>ED</th>
                  <th>Inicio</th>
                  <th colspan="3" class="eb-group">Consultas</th>
                  <th colspan="3" class="eb-group">Ventas</th>
                  <th class="eb-group">Conversión</th>
                  <th v-for="a in AREAS" :key="a" colspan="2" class="eb-group">{{ a }}</th>
                </tr>
                <tr class="eb-subhead">
                  <th colspan="4"></th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num eb-div">cons → vta</th>
                  <template v-for="a in AREAS" :key="a">
                    <th class="num eb-div">Cons</th><th class="num">Vta</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!ediciones.length">
                  <td :colspan="11 + AREAS.length * 2" class="ds-empty ds-empty--lista">
                    No hay programas en {{ periodo }}{{ filters.linea ? ` para la línea ${filters.linea}` : '' }}. Cambia el mes o quita el filtro de línea.
                  </td>
                </tr>
                <template v-for="e in ediciones" :key="e.edition_id">
                  <tr class="link" tabindex="0" :aria-expanded="String(expanded.has(e.edition_id))"
                      @click="toggle(e.edition_id)" @keydown.enter="toggle(e.edition_id)">
                    <td class="eb-linea">
                      <span class="eb-dot" :style="{ background: lineColor(e.linea) }" aria-hidden="true"></span>{{ e.linea || '—' }}
                    </td>
                    <td class="eb-prog" :title="e.programa">
                      <i class="fa-solid fa-chevron-right eb-caret" :class="{ 'is-open': expanded.has(e.edition_id) }" aria-hidden="true"></i>{{ e.programa }}
                    </td>
                    <td><span class="ds-pill eb-codigo">{{ e.codigo || '—' }}</span></td>
                    <td>{{ fmtDate(e.inicio) }}</td>
                    <td class="num eb-muted eb-div">{{ e.meta_consultas ? formatValue(e.meta_consultas, 'num') : '—' }}</td>
                    <td class="num eb-strong">{{ formatValue(e.consultas, 'num') }}</td>
                    <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(e.consultas, e.meta_consultas)]">{{ pctText(e.consultas, e.meta_consultas) }}</span></td>
                    <td class="num eb-muted eb-div">{{ e.meta_ventas ? formatValue(e.meta_ventas, 'num') : '—' }}</td>
                    <td class="num eb-strong">{{ formatValue(e.ventas, 'num') }}</td>
                    <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(e.ventas, e.meta_ventas)]">{{ pctText(e.ventas, e.meta_ventas) }}</span></td>
                    <td class="num eb-div">
                      <div class="eb-conv">
                        <span class="ds-track eb-conv-bar"><i :style="{ width: convWidth(e.conversion_pct) }"></i></span>
                        <span class="eb-conv-val">{{ formatValue(e.conversion_pct, 'pct') }}</span>
                      </div>
                    </td>
                    <template v-for="a in desglosarPorArea(e.canales)" :key="a.area">
                      <td class="num eb-div" :class="a.consultas ? 'eb-strong' : 'eb-muted'">{{ a.consultas ? formatValue(a.consultas, 'num') : '—' }}</td>
                      <td class="num" :class="a.ventas ? 'eb-strong' : 'eb-muted'">{{ a.ventas ? formatValue(a.ventas, 'num') : '—' }}</td>
                    </template>
                  </tr>
                  <tr v-if="expanded.has(e.edition_id)" class="eb-detalle">
                    <td :colspan="11 + AREAS.length * 2">
                      <p class="eb-detalle-titulo">{{ e.programa }} · objetivo y avance por área</p>
                      <table v-if="e.canales.length" class="ds-table ds-table--densa eb-detalle-tabla">
                        <thead>
                          <tr>
                            <th>Área · momento</th>
                            <th class="num">Obj. cons.</th><th class="num"># Cons.</th><th class="num">% Av.</th>
                            <th class="num eb-div">Obj. vent.</th><th class="num"># Vent.</th><th class="num">% Av.</th>
                            <th class="num eb-div">Cons → vta</th>
                          </tr>
                        </thead>
                        <tbody>
                          <template v-for="a in desglosarPorArea(e.canales)" :key="a.area">
                            <tr v-if="a.momentos.length" class="eb-detalle-area">
                              <td><span class="eb-dot" :class="'eb-dot-' + a.area.toLowerCase()" aria-hidden="true"></span>{{ a.area }}</td>
                              <td class="num eb-muted">{{ a.meta_consultas ? formatValue(a.meta_consultas, 'num') : '—' }}</td>
                              <td class="num eb-strong">{{ formatValue(a.consultas, 'num') }}</td>
                              <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(a.consultas, a.meta_consultas)]">{{ pctText(a.consultas, a.meta_consultas) }}</span></td>
                              <td class="num eb-muted eb-div">{{ a.meta_ventas ? formatValue(a.meta_ventas, 'num') : '—' }}</td>
                              <td class="num eb-strong">{{ formatValue(a.ventas, 'num') }}</td>
                              <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(a.ventas, a.meta_ventas)]">{{ pctText(a.ventas, a.meta_ventas) }}</span></td>
                              <td class="num eb-strong eb-div">{{ conversion(a) }}</td>
                            </tr>
                            <tr v-for="m in a.momentos" :key="m.key" class="eb-detalle-momento">
                              <td class="eb-momento-label">{{ m.momento }}</td>
                              <td class="num eb-muted">{{ m.meta_consultas ? formatValue(m.meta_consultas, 'num') : '—' }}</td>
                              <td class="num">{{ formatValue(m.consultas, 'num') }}</td>
                              <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(m.consultas, m.meta_consultas)]">{{ pctText(m.consultas, m.meta_consultas) }}</span></td>
                              <td class="num eb-muted eb-div">{{ m.meta_ventas ? formatValue(m.meta_ventas, 'num') : '—' }}</td>
                              <td class="num">{{ formatValue(m.ventas, 'num') }}</td>
                              <td class="num"><span class="ds-pill" :class="STATE_TONE[pctState(m.ventas, m.meta_ventas)]">{{ pctText(m.ventas, m.meta_ventas) }}</span></td>
                              <td class="num eb-div">{{ conversion(m) }}</td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                      <p v-else class="ds-empty">Sin consultas registradas para esta edición.</p>
                      <p class="eb-detalle-pie">
                        Las ventas sin lead detrás no caen en ninguna área:
                        {{ formatValue(e.ventas, 'num') }} vendidas, {{ formatValue(e.ventas_trazadas, 'num') }} con canal conocido.
                      </p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Mostrando {{ ediciones.length }} programas del período</span>
        </footer>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { agruparPorLinea, desglosarPorArea, AREAS } from '@/utils/funnelAreas'

const dashboardService = inject(ServiceKeys.Dashboard)

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const YEARS = [2026, 2025, 2024]
// Estado nunca va por color solo: cada chip lleva su icono.
const STATUS_ICON = { good: '●', warning: '▲', critical: '■', neutral: '·' }
// Estado del reporte → tono del sistema de diseño (clase de .ds-pill, .ds-trend, .ds-band-item).
const STATE_TONE = { good: 'ok', warning: 'warn', critical: 'bad', neutral: '' }
const KPI_ICON = { Consultas: 'fa-comments', Ventas: 'fa-cart-shopping', Conversión: 'fa-filter', 'Venta sin canal': 'fa-circle-question' }
// Identidad por línea, no ranking: color estable por orden alfabético. Sin
// ok/warn/bad: una línea pintada de rojo se leería como "va mal".
const LINE_COLORS = [
  'var(--ds-accent)', 'var(--ds-heading)', 'var(--ds-violet-ink)', 'var(--ds-orange-ink)',
  'var(--ds-rose)', 'var(--ds-cyan-ink)', 'var(--ds-accent-2)', 'var(--ds-info-ink)'
]

const EMPTY = { items: [], canales: [], totales: { consultas: 0, ventas: 0, meta_consultas: 0, meta_ventas: 0, meta_monto: 0, venta_monto: 0, ventas_trazadas: 0, conversion_pct: null, ediciones: 0 } }

const isLoading = ref(false)
const data = ref(EMPTY)
const expanded = ref(new Set())
const now = new Date()
const filters = reactive({ year: now.getFullYear(), month: now.getMonth() + 1, linea: '' })

onMounted(loadData)

async function loadData () {
  isLoading.value = true
  expanded.value = new Set()
  try {
    data.value = (await dashboardService.gerenciaFunnel({ year: filters.year, month_num: filters.month })) || EMPTY
  } catch (e) {
    console.error(e)
    data.value = EMPTY
  } finally {
    isLoading.value = false
  }
}

const toggle = (id) => {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

const periodo = computed(() => `${MONTHS[filters.month - 1]} ${filters.year}`)

const lineas = computed(() => [...new Set(data.value.items.map(i => i.linea).filter(Boolean))].sort())
const lineColor = (linea) => {
  const i = lineas.value.indexOf(linea)
  return i < 0 ? 'var(--ds-muted)' : LINE_COLORS[i % LINE_COLORS.length]
}

const ediciones = computed(() =>
  filters.linea ? data.value.items.filter(i => i.linea === filters.linea) : data.value.items
)
const toggleLinea = (linea) => { filters.linea = filters.linea === linea ? '' : linea }

// Aporte de cada linea a la venta del mes. La hoja tiene LÍNEA en cada fila y
// nunca la suma: solo cierra un TOTAL plano de 88 columnas al pie.
// Se alimenta de items (sin filtrar) a proposito: ver agruparPorLinea.
const aportePorLinea = computed(() => agruparPorLinea(data.value.items, data.value.totales.ventas))

// % de cierre de una celda del desglose por area.
const conversion = (celda) =>
  (celda.consultas > 0 ? Math.round((celda.ventas / celda.consultas) * 1000) / 10 + '%' : '—')

// Marca la primera fila de cada grupo para separarlas visualmente.
const matriz = computed(() => {
  let prev = null
  return data.value.canales.map(c => {
    const first = c.grupo !== prev
    prev = c.grupo
    return { ...c, first }
  })
})

// % del mes ya transcurrido. Solo tiene sentido en el mes en curso: comparar
// contra la meta completa a mitad de mes es el error que arrastra la hoja.
const pacing = computed(() => {
  const esActual = filters.year === now.getFullYear() && filters.month === now.getMonth() + 1
  if (!esActual) return null
  const dias = new Date(filters.year, filters.month, 0).getDate()
  return Math.round((now.getDate() / dias) * 100)
})

const pct = (real, meta) => (meta > 0 ? Math.round((real / meta) * 100) : null)
const pctText = (real, meta) => {
  const p = pct(real, meta)
  return p === null ? '—' : p + '%'
}
// Sin meta cargada no hay logro que juzgar: 'neutral', nunca rojo.
// La hoja pinta 0% en rojo cuando la meta es 0, y nadie lo mira.
function pctState (real, meta) {
  const p = pct(real, meta)
  if (p === null) return 'neutral'
  const ref = pacing.value ?? 100
  if (p >= ref) return 'good'
  if (p >= ref * 0.6) return 'warning'
  return 'critical'
}

const convWidth = (v) => (v === null ? '0%' : Math.min(v, 60) / 60 * 100 + '%')
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—')
const fmtInt = (n) => new Intl.NumberFormat('es-PE').format(n || 0)

// `badge` es el chip de logro; sin meta que juzgar se cae a `note`, texto plano.
const kpis = computed(() => {
  const t = data.value.totales
  const sinCanal = t.ventas - t.ventas_trazadas
  return [
    {
      label: 'Consultas',
      value: fmtInt(t.consultas),
      pct: pct(t.consultas, t.meta_consultas),
      state: pctState(t.consultas, t.meta_consultas),
      badge: t.meta_consultas ? pctText(t.consultas, t.meta_consultas) : '',
      note: 'sin meta',
      sub: t.meta_consultas ? `Meta ${fmtInt(t.meta_consultas)}` : 'Sin meta cargada este mes',
      paced: true
    },
    {
      label: 'Ventas',
      value: fmtInt(t.ventas),
      pct: pct(t.ventas, t.meta_ventas),
      state: pctState(t.ventas, t.meta_ventas),
      badge: t.meta_ventas ? pctText(t.ventas, t.meta_ventas) : '',
      note: 'sin meta',
      sub: t.meta_ventas ? `Meta ${fmtInt(t.meta_ventas)} · faltan ${fmtInt(Math.max(0, t.meta_ventas - t.ventas))}` : 'Sin meta cargada este mes',
      paced: true
    },
    {
      label: 'Conversión',
      value: t.conversion_pct === null ? '—' : t.conversion_pct + '%',
      pct: null,
      state: 'neutral',
      badge: '',
      note: 'cons → vta',
      sub: `${fmtInt(t.consultas)} consultas → ${fmtInt(t.ventas)} ventas`,
      paced: false
    },
    {
      label: 'Venta sin canal',
      value: fmtInt(sinCanal),
      pct: null,
      state: sinCanal > t.ventas * 0.2 ? 'warning' : 'neutral',
      badge: t.ventas ? Math.round((sinCanal / t.ventas) * 100) + '%' : '',
      note: '',
      sub: 'Ventas sin una consulta asociada',
      paced: false
    }
  ]
})

// Las tres preguntas que el reporte existe para responder.
const alerts = computed(() => {
  const eds = ediciones.value
  const out = []

  const cierre = eds.filter(e => e.meta_consultas > 0 && e.meta_ventas > 0 &&
    e.consultas >= e.meta_consultas && e.ventas < e.meta_ventas)
  if (cierre.length) out.push({ state: 'critical', count: cierre.length, title: 'Problema de cierre', text: 'Llegaron las consultas esperadas pero no las ventas: revisar gestión comercial o precio.' })

  const trafico = eds.filter(e => e.meta_consultas > 0 && e.consultas < e.meta_consultas * 0.6 &&
    e.conversion_pct !== null && e.conversion_pct >= (data.value.totales.conversion_pct ?? 0))
  if (trafico.length) out.push({ state: 'warning', count: trafico.length, title: 'Falta tráfico', text: 'Convierten bien pero no reciben consultas: hay techo de demanda, no de cierre.' })

  const sinMeta = eds.filter(e => !e.meta_consultas && !e.meta_ventas && (e.consultas || e.ventas))
  if (sinMeta.length) out.push({ state: 'neutral', count: sinMeta.length, title: 'Sin meta cargada', text: 'Tienen movimiento pero ninguna meta: no entran en ningún % de logro.' })

  return out
})
</script>

<style scoped>
/* Mismo rótulo de módulo que Gerencia > Objetivos: el módulo se lee como uno. */
.eb-breadcrumb { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); }

/* ── Filtros ────────────────────────────────────────────── */
/* .ds-panel es flex EN COLUMNA: la barra de filtros pide la fila. */
.eb-filtros { flex-direction: row; align-items: flex-end; flex-wrap: wrap; gap: 14px; padding: 12px 18px; overflow: visible; }
.eb-select { width: auto; min-width: 120px; }
.eb-grow { flex: 1; }
.eb-pacing { display: flex; align-items: center; gap: 8px; padding-bottom: 9px; font-size: 12.5px; color: var(--ds-ink-2); }
.eb-pacing-bar { width: 96px; }
.eb-pacing-bar > i { background: var(--ds-reference); }
.eb-pacing-value { font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }

/* ── Carga ──────────────────────────────────────────────── */
.eb-skel-cifra { width: 60%; height: 24px; margin-bottom: 8px; }
.eb-skel-filas { display: flex; flex-direction: column; gap: 14px; }

/* ── Banda y KPIs ───────────────────────────────────────── */
.eb-band-unit { font-size: 13px; font-weight: 600; opacity: .8; letter-spacing: 0; }
.eb-kpi-body { flex: 1; }
.eb-icono-estado { font-size: 8px; }
/* La marca de ritmo sobresale de la pista: sin overflow visible se recorta. */
.eb-track { position: relative; overflow: visible; margin: 8px 0 4px; }
.eb-track > i.ok { background: var(--ds-ok); }
.eb-track > i.warn { background: var(--ds-warn); }
.eb-track > i.bad { background: var(--ds-bad); }
/* Marca de ritmo: dónde debería estar el avance a hoy. */
.eb-pace { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--ds-ink); opacity: .55; }

/* ── Tablas ─────────────────────────────────────────────── */
/* Grupo de columnas: tinte de marca solo en la cabecera, como en Objetivos. */
.eb-group { text-align: center; background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 700; letter-spacing: .04em; text-transform: uppercase; border-left: 1px solid var(--ds-border); }
.eb-subhead th { color: var(--ds-muted); font-weight: 500; }
.eb-div { border-left: 1px solid var(--ds-border); }
.eb-table td { white-space: nowrap; vertical-align: middle; }
.eb-muted { color: var(--ds-muted); }
.eb-strong { font-weight: 700; color: var(--ds-heading); }
.eb-grupo-inicio td { border-top-color: var(--ds-border-strong); }

.eb-dot { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 2px; vertical-align: middle; }
/* Un solo hue por grupo, en pasos distintos: identidad, no ranking. */
.eb-dot-marketing { background: var(--ds-heading); }
.eb-dot-web { background: var(--ds-accent-2); }
.eb-dot-comercial { background: var(--ds-bar); }
.eb-dot-otros { background: var(--ds-muted); }

.eb-linea { font-size: 12px; }
.eb-prog { max-width: 320px; overflow: hidden; text-overflow: ellipsis; color: var(--ds-ink); font-weight: 500; }
.eb-caret { width: 14px; font-size: 9px; color: var(--ds-muted); transition: transform .15s; }
.eb-caret.is-open { transform: rotate(90deg); }
.eb-codigo { font-family: var(--ds-font-mono); }

.eb-conv { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.eb-conv-bar { width: 72px; height: 5px; }
.eb-conv-val { min-width: 48px; text-align: right; font-weight: 700; color: var(--ds-heading); }
/* Aporte es participación, no rendimiento: serie secundaria. */
.eb-aporte { background: var(--ds-accent-2); }

.eb-table tfoot td { font-weight: 700; color: var(--ds-heading); border-top: 2px solid var(--ds-border-strong); background: var(--ds-surface-2); }
.eb-total-label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }

.eb-table tr.is-selected td { background: var(--ds-soft-info); }
.eb-table tr.is-selected td:first-child { box-shadow: inset 3px 0 0 var(--ds-accent); }

/* ── Desglose de una edición ────────────────────────────── */
.eb-detalle > td { padding: 14px 18px; white-space: normal; background: var(--ds-surface-2); }
.eb-detalle-titulo { margin: 0 0 10px; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.eb-detalle-tabla { width: auto; background: var(--ds-surface); border: 1px solid var(--ds-border); }
/* El area es el subtotal; sus momentos cuelgan indentados y en gris. */
.eb-detalle-area td { font-weight: 700; border-top-color: var(--ds-border-strong); }
.eb-momento-label { padding-left: 25px !important; font-size: 11.5px; font-weight: 500 !important; color: var(--ds-ink-2) !important; }
.eb-detalle-pie { margin: 10px 0 0; font-size: 11.5px; color: var(--ds-muted); }
</style>
