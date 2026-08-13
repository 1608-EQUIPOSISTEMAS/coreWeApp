<template>
  <div class="eb">

    <header class="eb-head">
      <div class="eb-head-text">
        <span class="eb-eyebrow">Gerencia</span>
        <h1 class="eb-title">Embudo de Consultas y Ventas</h1>
        <p class="eb-subtitle">Consultas, ventas y conversión por canal — {{ periodo }}, {{ matriz.length }} filas de canal</p>
      </div>
      <button class="eb-btn-primary" @click="loadData" :disabled="isLoading">
        <svg :class="{ spin: isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {{ isLoading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <main class="eb-body">
      <div v-if="isLoading" class="eb-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Cargando embudo del período…</p>
      </div>

      <template v-else>
        <!-- ── Nivel 1: el embudo del mes ───────────────────────────── -->
        <section class="eb-kpis">
          <article class="eb-kpi" v-for="k in kpis" :key="k.label" :style="{ borderLeftColor: k.accent }">
            <div class="eb-kpi-top">
              <span class="eb-kpi-label">{{ k.label }}</span>
              <span v-if="k.badge" class="eb-chip" :class="'chip-' + k.state">
                <span class="chip-icon" aria-hidden="true">{{ STATUS_ICON[k.state] }}</span>{{ k.badge }}
              </span>
              <span v-else class="eb-kpi-note">{{ k.note }}</span>
            </div>
            <div class="eb-kpi-value">{{ k.value }}</div>
            <div class="eb-kpi-track" v-if="k.pct !== null">
              <div class="eb-kpi-fill" :class="'fill-' + k.state" :style="{ width: Math.min(k.pct, 100) + '%' }"></div>
              <div class="eb-kpi-pace" v-if="pacing !== null && k.paced" :style="{ left: pacing + '%' }" :title="`Esperado a hoy: ${pacing}%`"></div>
            </div>
            <div class="eb-kpi-sub">{{ k.sub }}</div>
          </article>
        </section>

        <!-- ── Filtros ──────────────────────────────────────────────── -->
        <section class="eb-filters">
          <label class="eb-field">
            <span class="eb-field-label">Año</span>
            <select v-model.number="filters.year" class="eb-select" @change="loadData">
              <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
            </select>
          </label>
          <label class="eb-field">
            <span class="eb-field-label">Mes</span>
            <select v-model.number="filters.month" class="eb-select" @change="loadData">
              <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
            </select>
          </label>
          <label class="eb-field">
            <span class="eb-field-label">Línea</span>
            <select v-model="filters.linea" class="eb-select">
              <option value="">Todas</option>
              <option v-for="l in lineas" :key="l" :value="l">{{ l }}</option>
            </select>
          </label>
          <div class="eb-filters-spacer"></div>
          <div class="eb-pacing" v-if="pacing !== null">
            <span>Avance del mes</span>
            <span class="eb-pacing-bar"><span class="eb-pacing-fill" :style="{ width: pacing + '%' }"></span></span>
            <span class="eb-pacing-value">{{ pacing }}%</span>
          </div>
        </section>

        <!-- ── Alertas: lo que hay que decidir ──────────────────────── -->
        <section class="eb-alerts" v-if="alerts.length">
          <article class="eb-alert" v-for="a in alerts" :key="a.title" :style="{ borderTopColor: ALERT_ACCENT[a.state] }">
            <div class="eb-alert-text">
              <p class="eb-alert-title">
                <span class="eb-alert-icon" :class="'icon-' + a.state" aria-hidden="true">{{ STATUS_ICON[a.state] }}</span>{{ a.title }}
              </p>
              <p class="eb-alert-sub">{{ a.text }}</p>
            </div>
            <span class="eb-alert-count" :style="{ color: ALERT_ACCENT[a.state] }">{{ a.count }}</span>
          </article>
        </section>

        <!-- ── Nivel 2: matriz de canales ───────────────────────────── -->
        <section class="eb-panel">
          <div class="eb-panel-head">
            <div>
              <h2 class="eb-panel-title">Canales — objetivo, real y conversión</h2>
              <p class="eb-panel-sub">Las 60 columnas de canal de la hoja, en {{ matriz.length }} filas.</p>
            </div>
            <span class="eb-panel-count">{{ matriz.length }} resultados</span>
          </div>
          <div class="eb-scroll">
            <table class="eb-table">
              <thead>
                <tr>
                  <th class="th-l">Canal</th>
                  <th class="th-l">Momento</th>
                  <th colspan="3" class="th-grp">Consultas</th>
                  <th colspan="3" class="th-grp">Ventas</th>
                  <th class="th-grp">Conversión</th>
                </tr>
                <tr class="thead-sub">
                  <th colspan="2"></th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">cons → vta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in matriz" :key="c.key" :class="{ 'row-group-start': c.first }">
                  <td class="td-canal">
                    <span class="dot" :class="'dot-' + c.grupo.toLowerCase()"></span>{{ c.grupo }}
                  </td>
                  <td class="td-momento">{{ c.momento }}</td>
                  <td class="num muted td-div">{{ c.meta_consultas || '—' }}</td>
                  <td class="num strong">{{ c.consultas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(c.consultas, c.meta_consultas)">{{ pctText(c.consultas, c.meta_consultas) }}</span></td>
                  <td class="num muted td-div">{{ c.meta_ventas || '—' }}</td>
                  <td class="num strong">{{ c.ventas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(c.ventas, c.meta_ventas)">{{ pctText(c.ventas, c.meta_ventas) }}</span></td>
                  <td class="num td-div">
                    <div class="conv-cell">
                      <span class="conv-bar"><span class="conv-fill" :style="{ width: convWidth(c.conversion_pct) }"></span></span>
                      <span class="conv-val">{{ c.conversion_pct === null ? '—' : c.conversion_pct + '%' }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="tfoot-label">TOTAL</td>
                  <td class="num">{{ data.totales.meta_consultas || '—' }}</td>
                  <td class="num strong">{{ data.totales.consultas }}</td>
                  <td class="num">{{ pctText(data.totales.consultas, data.totales.meta_consultas) }}</td>
                  <td class="num">{{ data.totales.meta_ventas || '—' }}</td>
                  <td class="num strong">{{ data.totales.ventas }}</td>
                  <td class="num">{{ pctText(data.totales.ventas, data.totales.meta_ventas) }}</td>
                  <td class="num strong">{{ data.totales.conversion_pct }}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <!-- ── Nivel 3: aporte por área ─────────────────────────────── -->
        <section class="eb-panel">
          <div class="eb-panel-head">
            <div>
              <h2 class="eb-panel-title">Aporte por línea</h2>
              <p class="eb-panel-sub">Cuánto de la venta del mes puso cada línea. Clic en una fila para filtrar el resto del reporte.</p>
            </div>
            <span class="eb-panel-count">{{ aportePorLinea.length }} líneas</span>
          </div>
          <div class="eb-scroll">
            <table class="eb-table">
              <thead>
                <tr>
                  <th class="th-l">Línea</th>
                  <th class="num">Prog.</th>
                  <th colspan="3" class="th-grp">Consultas</th>
                  <th colspan="3" class="th-grp">Ventas</th>
                  <th class="th-grp">Conversión</th>
                  <th class="th-grp">Aporte</th>
                </tr>
                <tr class="thead-sub">
                  <th colspan="2"></th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">cons → vta</th>
                  <th class="num th-div">% de la venta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in aportePorLinea" :key="a.linea" class="row-ed" :class="{ selected: filters.linea === a.linea }" @click="toggleLinea(a.linea)">
                  <td class="td-canal">
                    <span class="dot" :style="{ background: lineColor(a.linea) }"></span>{{ a.linea }}
                  </td>
                  <td class="num muted">{{ a.ediciones }}</td>
                  <td class="num muted td-div">{{ a.meta_consultas || '—' }}</td>
                  <td class="num strong">{{ a.consultas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(a.consultas, a.meta_consultas)">{{ pctText(a.consultas, a.meta_consultas) }}</span></td>
                  <td class="num muted td-div">{{ a.meta_ventas || '—' }}</td>
                  <td class="num strong">{{ a.ventas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(a.ventas, a.meta_ventas)">{{ pctText(a.ventas, a.meta_ventas) }}</span></td>
                  <td class="num td-div">
                    <div class="conv-cell">
                      <span class="conv-bar"><span class="conv-fill" :style="{ width: convWidth(a.conversion_pct) }"></span></span>
                      <span class="conv-val">{{ a.conversion_pct === null ? '—' : a.conversion_pct + '%' }}</span>
                    </div>
                  </td>
                  <td class="num td-div">
                    <div class="conv-cell">
                      <span class="conv-bar"><span class="conv-fill fill-aporte" :style="{ width: a.aporte_pct + '%' }"></span></span>
                      <span class="conv-val">{{ a.aporte_pct }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="tfoot-label">TOTAL</td>
                  <td class="num">{{ data.totales.ediciones }}</td>
                  <td class="num">{{ data.totales.meta_consultas || '—' }}</td>
                  <td class="num strong">{{ data.totales.consultas }}</td>
                  <td class="num">{{ pctText(data.totales.consultas, data.totales.meta_consultas) }}</td>
                  <td class="num">{{ data.totales.meta_ventas || '—' }}</td>
                  <td class="num strong">{{ data.totales.ventas }}</td>
                  <td class="num">{{ pctText(data.totales.ventas, data.totales.meta_ventas) }}</td>
                  <td class="num strong">{{ data.totales.conversion_pct }}%</td>
                  <td class="num strong">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <!-- ── Nivel 4: ediciones ───────────────────────────────────── -->
        <section class="eb-panel">
          <div class="eb-panel-head">
            <div>
              <h2 class="eb-panel-title">Programas del período</h2>
              <p class="eb-panel-sub">{{ ediciones.length }} ediciones · clic en una fila para ver su desglose por canal.</p>
            </div>
            <span class="eb-panel-count">{{ ediciones.length }} programas</span>
          </div>
          <div class="eb-scroll">
            <table class="eb-table">
              <thead>
                <tr>
                  <th class="th-l">Línea</th>
                  <th class="th-l">Programa</th>
                  <th class="th-l">ED</th>
                  <th class="th-l">Inicio</th>
                  <th colspan="3" class="th-grp">Consultas</th>
                  <th colspan="3" class="th-grp">Ventas</th>
                  <th class="th-grp">Conversión</th>
                  <th v-for="a in AREAS" :key="a" colspan="2" class="th-grp">{{ a }}</th>
                </tr>
                <tr class="thead-sub">
                  <th colspan="4"></th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num th-div">cons → vta</th>
                  <template v-for="a in AREAS" :key="a">
                    <th class="num th-div">Cons</th><th class="num">Vta</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template v-for="e in ediciones" :key="e.edition_id">
                  <tr class="row-ed" @click="toggle(e.edition_id)">
                    <td class="td-linea">
                      <span class="dot" :style="{ background: lineColor(e.linea) }"></span>{{ e.linea || '—' }}
                    </td>
                    <td class="td-prog" :title="e.programa">
                      <span class="caret" :class="{ open: expanded.has(e.edition_id) }">›</span>{{ e.programa }}
                    </td>
                    <td><span class="ed-badge">{{ e.codigo || '—' }}</span></td>
                    <td class="td-fecha">{{ fmtDate(e.inicio) }}</td>
                    <td class="num muted td-div">{{ e.meta_consultas || '—' }}</td>
                    <td class="num strong">{{ e.consultas }}</td>
                    <td class="num"><span class="pct" :class="'pct-' + pctState(e.consultas, e.meta_consultas)">{{ pctText(e.consultas, e.meta_consultas) }}</span></td>
                    <td class="num muted td-div">{{ e.meta_ventas || '—' }}</td>
                    <td class="num strong">{{ e.ventas }}</td>
                    <td class="num"><span class="pct" :class="'pct-' + pctState(e.ventas, e.meta_ventas)">{{ pctText(e.ventas, e.meta_ventas) }}</span></td>
                    <td class="num td-div">
                      <div class="conv-cell">
                        <span class="conv-bar"><span class="conv-fill" :style="{ width: convWidth(e.conversion_pct) }"></span></span>
                        <span class="conv-val">{{ e.conversion_pct === null ? '—' : e.conversion_pct + '%' }}</span>
                      </div>
                    </td>
                    <template v-for="a in desglosarPorArea(e.canales)" :key="a.area">
                      <td class="num td-div" :class="a.consultas ? 'strong' : 'muted'">{{ a.consultas || '—' }}</td>
                      <td class="num" :class="a.ventas ? 'strong' : 'muted'">{{ a.ventas || '—' }}</td>
                    </template>
                  </tr>
                  <tr v-if="expanded.has(e.edition_id)" class="row-detail">
                    <td :colspan="11 + AREAS.length * 2">
                      <p class="detail-title">{{ e.programa }} · objetivo y avance por área</p>
                      <table class="detail-table" v-if="e.canales.length">
                        <thead>
                          <tr>
                            <th class="th-l">Área · momento</th>
                            <th class="num">Obj. cons.</th><th class="num"># Cons.</th><th class="num">% Av.</th>
                            <th class="num th-div">Obj. vent.</th><th class="num"># Vent.</th><th class="num">% Av.</th>
                            <th class="num th-div">Cons → vta</th>
                          </tr>
                        </thead>
                        <tbody>
                          <template v-for="a in desglosarPorArea(e.canales)" :key="a.area">
                            <tr v-if="a.momentos.length" class="detail-area">
                              <td><span class="dot" :class="'dot-' + a.area.toLowerCase()"></span>{{ a.area }}</td>
                              <td class="num muted">{{ a.meta_consultas || '—' }}</td>
                              <td class="num strong">{{ a.consultas }}</td>
                              <td class="num"><span class="pct" :class="'pct-' + pctState(a.consultas, a.meta_consultas)">{{ pctText(a.consultas, a.meta_consultas) }}</span></td>
                              <td class="num muted td-div">{{ a.meta_ventas || '—' }}</td>
                              <td class="num strong">{{ a.ventas }}</td>
                              <td class="num"><span class="pct" :class="'pct-' + pctState(a.ventas, a.meta_ventas)">{{ pctText(a.ventas, a.meta_ventas) }}</span></td>
                              <td class="num strong td-div">{{ conversion(a) }}</td>
                            </tr>
                            <tr v-for="m in a.momentos" :key="m.key" class="detail-momento">
                              <td class="detail-momento-label">{{ m.momento }}</td>
                              <td class="num muted">{{ m.meta_consultas || '—' }}</td>
                              <td class="num">{{ m.consultas }}</td>
                              <td class="num"><span class="pct" :class="'pct-' + pctState(m.consultas, m.meta_consultas)">{{ pctText(m.consultas, m.meta_consultas) }}</span></td>
                              <td class="num muted td-div">{{ m.meta_ventas || '—' }}</td>
                              <td class="num">{{ m.ventas }}</td>
                              <td class="num"><span class="pct" :class="'pct-' + pctState(m.ventas, m.meta_ventas)">{{ pctText(m.ventas, m.meta_ventas) }}</span></td>
                              <td class="num td-div">{{ conversion(m) }}</td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                      <p v-else class="detail-empty">Sin consultas registradas para esta edición.</p>
                      <p class="detail-foot">
                        Las ventas sin lead detrás no caen en ninguna área:
                        {{ e.ventas }} vendidas, {{ e.ventas_trazadas }} con canal conocido.
                      </p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div class="eb-panel-foot">Mostrando {{ ediciones.length }} programas del período</div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { agruparPorLinea, desglosarPorArea, AREAS } from '@/utils/funnelAreas'

const dashboardService = inject(ServiceKeys.Dashboard)

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const YEARS = [2026, 2025, 2024]
// Estado nunca va por color solo: cada chip lleva su icono.
const STATUS_ICON = { good: '●', warning: '▲', critical: '■', neutral: '·' }
const ALERT_ACCENT = { critical: '#ef4444', warning: '#f59e0b', neutral: '#94a3b8' }
// Identidad por línea, no ranking: color estable por orden alfabético.
const LINE_COLORS = ['#0f766e', '#1e3a8a', '#7c3aed', '#f59e0b', '#ef4444', '#16a34a', '#0ea5e9', '#be185d']

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
  return i < 0 ? '#94a3b8' : LINE_COLORS[i % LINE_COLORS.length]
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
      label: 'CONSULTAS',
      accent: '#16a34a',
      value: fmtInt(t.consultas),
      pct: pct(t.consultas, t.meta_consultas),
      state: pctState(t.consultas, t.meta_consultas),
      badge: t.meta_consultas ? pctText(t.consultas, t.meta_consultas) : '',
      note: 'SIN META',
      sub: t.meta_consultas ? `Meta ${fmtInt(t.meta_consultas)}` : 'Sin meta cargada este mes',
      paced: true
    },
    {
      label: 'VENTAS',
      accent: '#2563eb',
      value: fmtInt(t.ventas),
      pct: pct(t.ventas, t.meta_ventas),
      state: pctState(t.ventas, t.meta_ventas),
      badge: t.meta_ventas ? pctText(t.ventas, t.meta_ventas) : '',
      note: 'SIN META',
      sub: t.meta_ventas ? `Meta ${fmtInt(t.meta_ventas)} · faltan ${fmtInt(Math.max(0, t.meta_ventas - t.ventas))}` : 'Sin meta cargada este mes',
      paced: true
    },
    {
      label: 'CONVERSIÓN',
      accent: '#f59e0b',
      value: t.conversion_pct === null ? '—' : t.conversion_pct + '%',
      pct: null,
      state: 'neutral',
      badge: '',
      note: 'CONS → VTA',
      sub: `${fmtInt(t.consultas)} consultas → ${fmtInt(t.ventas)} ventas`,
      paced: false
    },
    {
      label: 'VENTA SIN CANAL',
      accent: '#ef4444',
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
.eb {
  --eb-surface: #ffffff;
  --eb-line: #eceef1;
  --eb-line-soft: #f1f2f4;
  --eb-line-hair: #f7f8f9;
  --eb-head: #fafbfc;
  --eb-ink: #0f172a;
  --eb-slate: #475569;
  --eb-mut: #8b95a5;
  --eb-mut-2: #adb6c3;
  --eb-teal: #0f766e;
  --eb-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  /* El padding y el ancho maximo los pone .page-body del layout: aqui no van. */
  color: var(--eb-ink);
}

/* ── Cabecera ───────────────────────────────────────────── */
.eb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.eb-head-text { display: flex; flex-direction: column; gap: 6px; }
.eb-eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--eb-mut); font-weight: 600; }
.eb-title { margin: 0; font-size: 34px; line-height: 1.1; font-weight: 600; letter-spacing: -0.02em; }
.eb-subtitle { margin: 0; font-size: 14px; color: var(--eb-slate); }

.eb-btn-primary {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;
  height: 42px; padding: 0 18px; border-radius: 9px;
  border: 1px solid var(--eb-ink); background: var(--eb-ink); color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.eb-btn-primary:hover:not(:disabled) { background: #1e293b; }
.eb-btn-primary:disabled { opacity: 0.6; cursor: default; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.eb-body { display: flex; flex-direction: column; gap: 20px; }
.eb-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 340px; gap: 14px; }
.loader-ring { width: 36px; height: 36px; border: 3px solid var(--eb-line); border-top-color: var(--we-navy, #002060); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loader-text { font-size: 13px; color: var(--eb-slate); }

/* ── KPIs ───────────────────────────────────────────────── */
.eb-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px; }
.eb-kpi {
  background: var(--eb-surface); border: 1px solid var(--eb-line); border-left: 3px solid;
  border-radius: 11px; padding: 18px 20px 20px; box-shadow: var(--eb-shadow);
  display: flex; flex-direction: column; gap: 10px;
}
.eb-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.eb-kpi-label { font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--eb-mut); font-weight: 600; }
.eb-kpi-note { font-size: 11px; color: var(--eb-mut-2); font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
.eb-kpi-value { font-size: 40px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.eb-kpi-track { position: relative; height: 6px; border-radius: 999px; background: #eef1f4; }
.eb-kpi-fill { height: 100%; border-radius: 999px; }
/* Marca de ritmo: dónde debería estar el avance a hoy. */
.eb-kpi-pace { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--eb-ink); opacity: 0.55; }
.eb-kpi-sub { font-size: 13px; color: var(--eb-mut); }

/* Estado: color + icono, nunca color solo. */
.eb-chip { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.chip-icon { font-size: 8px; }
.chip-good     { background: #eaf7ee; color: #15803d; }
.chip-warning  { background: #fdf3e3; color: #b45309; }
.chip-critical { background: #fdecec; color: #b91c1c; }
.chip-neutral  { background: #f4f5f7; color: var(--eb-slate); }
.fill-good { background: #16a34a; } .fill-warning { background: #f59e0b; }
.fill-critical { background: #ef4444; } .fill-neutral { background: #94a3b8; }

/* ── Filtros ────────────────────────────────────────────── */
.eb-filters {
  background: var(--eb-surface); border: 1px solid var(--eb-line); border-radius: 11px;
  box-shadow: var(--eb-shadow); padding: 14px 16px;
  display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
}
.eb-field { display: flex; flex-direction: column; gap: 4px; }
.eb-field-label { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--eb-mut); font-weight: 600; }
.eb-select {
  height: 36px; padding: 0 12px; border: 1px solid #e6e8ec; border-radius: 9px;
  background: var(--eb-surface); color: var(--eb-slate); font-size: 13.5px; font-family: inherit;
}
.eb-filters-spacer { flex: 1; }
.eb-pacing { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--eb-mut); padding-bottom: 8px; }
.eb-pacing-bar { width: 96px; height: 5px; border-radius: 999px; background: #eef1f4; overflow: hidden; }
.eb-pacing-fill { display: block; height: 100%; border-radius: 999px; background: #94a3b8; }
.eb-pacing-value { font-weight: 600; color: var(--eb-slate); font-variant-numeric: tabular-nums; }

/* ── Alertas ────────────────────────────────────────────── */
.eb-alerts { display: flex; flex-direction: column; gap: 12px; }
.eb-alert {
  background: var(--eb-surface); border: 1px solid var(--eb-line); border-top: 3px solid;
  border-radius: 11px; box-shadow: var(--eb-shadow); padding: 16px 20px;
  display: flex; align-items: center; gap: 16px;
}
.eb-alert-text { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.eb-alert-title { margin: 0; font-size: 14.5px; font-weight: 600; }
.eb-alert-icon { font-size: 10px; margin-right: 7px; }
.icon-critical { color: #b91c1c; } .icon-warning { color: #b45309; } .icon-neutral { color: var(--eb-mut); }
.eb-alert-sub { margin: 0; font-size: 13.5px; color: var(--eb-slate); }
.eb-alert-count { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

/* ── Paneles y tablas ───────────────────────────────────── */
.eb-panel { background: var(--eb-surface); border: 1px solid var(--eb-line); border-radius: 11px; overflow: hidden; box-shadow: var(--eb-shadow); }
.eb-panel-head { padding: 18px 20px 16px; border-bottom: 1px solid var(--eb-line-soft); display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eb-panel-title { margin: 0; font-size: 15.5px; font-weight: 600; }
.eb-panel-sub { margin: 3px 0 0; font-size: 13px; color: var(--eb-mut); }
.eb-panel-count { font-size: 13px; color: var(--eb-mut); }
.eb-panel-foot { padding: 14px 20px; background: var(--eb-head); border-top: 1px solid var(--eb-line-soft); font-size: 13px; color: var(--eb-mut); }

/* El scroll horizontal vive en el contenedor, nunca en el body de la página. */
.eb-scroll { overflow-x: auto; }
.eb-table { width: 100%; border-collapse: collapse; }
.eb-table thead tr { background: var(--eb-head); }
.eb-table thead th { font-weight: 600; text-transform: uppercase; color: var(--eb-mut); }
.eb-table thead tr:first-child th { padding: 11px 12px 6px; font-size: 11px; letter-spacing: 0.09em; border-bottom: 1px solid var(--eb-line-soft); }
.eb-table thead tr:first-child th:first-child { padding-left: 20px; }
.thead-sub th { padding: 2px 12px 10px; font-size: 10.5px; letter-spacing: 0.08em; color: var(--eb-mut-2); border-bottom: 1px solid var(--eb-line); }
.thead-sub th:last-child { padding-right: 20px; }
.th-l { text-align: left; }
.th-grp { text-align: center; border-left: 1px solid var(--eb-line-soft); }
.th-div, .td-div { border-left: 1px solid var(--eb-line-hair); }
.eb-table tbody td { padding: 13px 12px; font-size: 13px; border-bottom: 1px solid #f4f5f7; white-space: nowrap; }
.eb-table tbody td:first-child { padding-left: 20px; }
.eb-table tbody td:last-child { padding-right: 20px; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.muted { color: var(--eb-mut-2); }
.strong { font-size: 14px; font-weight: 600; color: var(--eb-ink); }
.row-group-start td { border-top: 1px solid var(--eb-line); }

.dot { display: inline-block; width: 7px; height: 7px; border-radius: 2px; margin-right: 10px; vertical-align: middle; }
/* Un solo hue por grupo, en pasos distintos: identidad, no ranking. */
.dot-marketing { background: #002060; }
.dot-web       { background: #3b6bb5; }
.dot-comercial { background: #7f9fd4; }
.dot-otros     { background: #94a3b8; }

.td-canal { font-size: 13.5px; font-weight: 600; letter-spacing: 0.02em; }
.td-momento, .td-linea, .td-fecha { color: var(--eb-slate); }
.td-linea { font-size: 12.5px; font-weight: 600; }
.ed-badge { font-size: 12px; font-weight: 600; color: var(--eb-slate); background: #f4f5f7; border: 1px solid var(--eb-line); border-radius: 6px; padding: 3px 7px; }

.pct { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.pct-good { background: #eaf7ee; color: #15803d; }
.pct-warning { background: #fdf3e3; color: #b45309; }
.pct-critical { background: #fdecec; color: #b91c1c; }
.pct-neutral { background: transparent; color: var(--eb-mut-2); }

.conv-cell { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.conv-bar { width: 72px; height: 5px; border-radius: 999px; background: #eef1f4; overflow: hidden; }
.conv-fill { display: block; height: 100%; border-radius: 999px; background: var(--eb-teal); }
.conv-val { min-width: 48px; text-align: right; font-size: 14px; font-weight: 600; }
/* Aporte va en el navy de marca: es participacion, no rendimiento. */
.fill-aporte { background: var(--we-navy, #002060); }

tfoot td { background: var(--eb-ink); color: #fff; font-weight: 600; border-bottom: none !important; }
tfoot .tfoot-label { font-size: 10.5px; letter-spacing: 0.1em; color: #94a3b8; text-align: left; }
tfoot .strong { color: #fff; }

.row-ed { cursor: pointer; }
.row-ed:hover td { background: var(--eb-head); }
.row-ed.selected td { background: #f2faf5; box-shadow: inset 3px 0 0 var(--eb-teal); }
.td-prog { max-width: 320px; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; font-weight: 500; }
.caret { display: inline-block; width: 14px; transition: transform 0.15s; color: var(--eb-mut-2); }
.caret.open { transform: rotate(90deg); }

.row-detail td { background: var(--eb-head); padding: 14px 20px; white-space: normal; }
.detail-title { margin: 0 0 10px; font-size: 12.5px; font-weight: 600; color: var(--eb-slate); }
.detail-table { border-collapse: collapse; background: var(--eb-surface); border: 1px solid var(--eb-line); border-radius: 9px; overflow: hidden; }
.detail-table th { padding: 7px 14px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; color: var(--eb-mut); background: var(--eb-head); border-bottom: 1px solid var(--eb-line); white-space: nowrap; }
.detail-table td { padding: 7px 14px; font-size: 12.5px; border-bottom: 1px solid var(--eb-line-soft); white-space: nowrap; }
.detail-table tr:last-child td { border-bottom: none; }
/* El area es el subtotal; sus momentos cuelgan indentados y en gris. */
.detail-area td { font-weight: 600; border-top: 1px solid var(--eb-line); }
.detail-momento td { color: var(--eb-slate); }
.detail-momento-label { padding-left: 31px !important; font-size: 11.5px; letter-spacing: 0.04em; }
.detail-empty { margin: 0; font-size: 12.5px; color: var(--eb-mut); }
.detail-foot { margin: 10px 0 0; font-size: 11.5px; color: var(--eb-mut); }

@media (max-width: 900px) {
  .eb-title { font-size: 26px; }
}

/* ── Dark ───────────────────────────────────────────────── */
/* El tema lo pone CoreUI en el <html> como data-coreui-theme. */
[data-coreui-theme="dark"] .eb {
  --eb-surface: #1F1F1A;
  --eb-line: #2A2A22;
  --eb-line-soft: #24241E;
  --eb-line-hair: #24241E;
  --eb-head: #24241E;
  --eb-ink: #F4F4F0;
  --eb-slate: #C9C9C1;
  --eb-mut: #8A8A80;
  --eb-mut-2: #8A8A80;
  --eb-teal: #5EEAD4;
  --eb-shadow: none;
}
[data-coreui-theme="dark"] .eb .eb-title,
[data-coreui-theme="dark"] .eb .eb-kpi-value,
[data-coreui-theme="dark"] .eb .eb-alert-title { color: #8FAADC; }
[data-coreui-theme="dark"] .eb .eb-btn-primary { background: #8FAADC; border-color: #8FAADC; color: #1A1A14; }
[data-coreui-theme="dark"] .eb .eb-btn-primary:hover:not(:disabled) { background: #A8BEE5; }
[data-coreui-theme="dark"] .eb .eb-select { background: #1F1F1A; border-color: #2A2A22; color: var(--eb-ink); }
[data-coreui-theme="dark"] .eb .eb-kpi-track,
[data-coreui-theme="dark"] .eb .eb-pacing-bar,
[data-coreui-theme="dark"] .eb .conv-bar { background: #2A2A22; }
[data-coreui-theme="dark"] .eb .eb-kpi-pace { background: #F4F4F0; }
[data-coreui-theme="dark"] .eb .eb-table tbody td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .eb .ed-badge { background: #24241E; color: var(--eb-slate); }
[data-coreui-theme="dark"] .eb tfoot td { background: #24241E; color: #F4F4F0; }
[data-coreui-theme="dark"] .eb .row-ed.selected td { background: #24241E; }
[data-coreui-theme="dark"] .eb .fill-aporte { background: #8FAADC; }
[data-coreui-theme="dark"] .eb .chip-good, [data-coreui-theme="dark"] .eb .pct-good { background: rgba(16, 185, 129, .14); color: #34D399; }
[data-coreui-theme="dark"] .eb .chip-warning, [data-coreui-theme="dark"] .eb .pct-warning { background: rgba(245, 158, 11, .12); color: #FBBF24; }
[data-coreui-theme="dark"] .eb .chip-critical, [data-coreui-theme="dark"] .eb .pct-critical { background: rgba(239, 68, 68, .14); color: #F87171; }
[data-coreui-theme="dark"] .eb .chip-neutral { background: #24241E; color: var(--eb-slate); }
[data-coreui-theme="dark"] .eb .dot-marketing { background: #8FAADC; }
[data-coreui-theme="dark"] .eb .dot-web { background: #5f83c0; }
[data-coreui-theme="dark"] .eb .dot-comercial { background: #3f5f9c; }
</style>
