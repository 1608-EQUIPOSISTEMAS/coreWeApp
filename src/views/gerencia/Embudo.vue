<template>
  <div class="ger-shell">

    <header class="ger-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gerencia</span>
            <h1 class="brand-title">Embudo de Consultas y Ventas</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-ger btn-ger-primary" @click="loadData" :disabled="isLoading">
            <svg :class="{ spin: isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {{ isLoading ? 'Actualizando…' : 'Actualizar' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO</label>
          <select v-model.number="filters.year" class="ger-select" @change="loadData">
            <option v-for="y in [2026, 2025, 2024]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">MES</label>
          <select v-model.number="filters.month" class="ger-select" @change="loadData">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">LÍNEA</label>
          <select v-model="filters.linea" class="ger-select">
            <option value="">Todas</option>
            <option v-for="l in lineas" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="filter-spacer"></div>
        <div class="pacing" v-if="pacing !== null">
          <span class="pacing-label">AVANCE DEL MES</span>
          <div class="pacing-bar"><div class="pacing-fill" :style="{ width: pacing + '%' }"></div></div>
          <span class="pacing-value">{{ pacing }}%</span>
        </div>
      </div>
    </header>

    <main class="ger-body">
      <div v-if="isLoading" class="ger-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Cargando embudo del período…</p>
      </div>

      <template v-else>
        <!-- ── Nivel 1: el embudo del mes ───────────────────────────── -->
        <section class="kpi-row">
          <article class="kpi" v-for="k in kpis" :key="k.label">
            <div class="kpi-head">
              <span class="kpi-label">{{ k.label }}</span>
              <span class="status-chip" :class="'chip-' + k.state" v-if="k.state">
                <span class="chip-icon" aria-hidden="true">{{ STATUS_ICON[k.state] }}</span>{{ k.badge }}
              </span>
            </div>
            <div class="kpi-value">{{ k.value }}</div>
            <div class="kpi-track" v-if="k.pct !== null">
              <div class="kpi-fill" :class="'fill-' + k.state" :style="{ width: Math.min(k.pct, 100) + '%' }"></div>
              <div class="kpi-pace" v-if="pacing !== null && k.paced" :style="{ left: pacing + '%' }" :title="`Esperado a hoy: ${pacing}%`"></div>
            </div>
            <div class="kpi-sub">{{ k.sub }}</div>
          </article>
        </section>

        <!-- ── Alertas: lo que hay que decidir ──────────────────────── -->
        <section class="alerts" v-if="alerts.length">
          <article class="alert" v-for="a in alerts" :key="a.title" :class="'alert-' + a.state">
            <span class="alert-icon" aria-hidden="true">{{ STATUS_ICON[a.state] }}</span>
            <div>
              <p class="alert-title">{{ a.title }}</p>
              <p class="alert-text">{{ a.text }}</p>
            </div>
            <span class="alert-count">{{ a.count }}</span>
          </article>
        </section>

        <!-- ── Nivel 2: matriz de canales ───────────────────────────── -->
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Canales — objetivo, real y conversión</h2>
              <p class="panel-sub">Las 60 columnas de canal de la hoja, en {{ matriz.length }} filas.</p>
            </div>
          </div>
          <div class="table-scroll">
            <table class="ger-table">
              <thead>
                <tr>
                  <th class="th-l">Canal</th>
                  <th class="th-l">Momento</th>
                  <th colspan="3" class="th-grp">Consultas</th>
                  <th colspan="3" class="th-grp th-grp-alt">Ventas</th>
                  <th class="th-grp th-grp-conv">Conversión</th>
                </tr>
                <tr class="thead-sub">
                  <th colspan="2"></th>
                  <th class="num">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num">cons → vta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in matriz" :key="c.key" :class="{ 'row-group-start': c.first }">
                  <td class="td-canal">
                    <span class="canal-dot" :class="'dot-' + c.grupo.toLowerCase()"></span>{{ c.grupo }}
                  </td>
                  <td class="td-momento">{{ c.momento }}</td>
                  <td class="num muted">{{ c.meta_consultas || '—' }}</td>
                  <td class="num strong">{{ c.consultas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(c.consultas, c.meta_consultas)">{{ pctText(c.consultas, c.meta_consultas) }}</span></td>
                  <td class="num muted">{{ c.meta_ventas || '—' }}</td>
                  <td class="num strong">{{ c.ventas }}</td>
                  <td class="num"><span class="pct" :class="'pct-' + pctState(c.ventas, c.meta_ventas)">{{ pctText(c.ventas, c.meta_ventas) }}</span></td>
                  <td class="num">
                    <div class="conv-cell">
                      <div class="conv-bar"><div class="conv-fill" :style="{ width: convWidth(c.conversion_pct) }"></div></div>
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

        <!-- ── Nivel 3: ediciones ───────────────────────────────────── -->
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Ediciones del período</h2>
              <p class="panel-sub">{{ ediciones.length }} ediciones · clic en una fila para ver su desglose por canal.</p>
            </div>
          </div>
          <div class="table-scroll">
            <table class="ger-table">
              <thead>
                <tr>
                  <th class="th-l">Línea</th>
                  <th class="th-l">Programa</th>
                  <th class="th-l">ED</th>
                  <th class="th-l">Inicio</th>
                  <th colspan="3" class="th-grp">Consultas</th>
                  <th colspan="3" class="th-grp th-grp-alt">Ventas</th>
                  <th class="th-grp th-grp-conv">Conv.</th>
                </tr>
                <tr class="thead-sub">
                  <th colspan="4"></th>
                  <th class="num">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th class="num">Meta</th><th class="num">Real</th><th class="num">%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="e in ediciones" :key="e.edition_id">
                  <tr class="row-ed" @click="toggle(e.edition_id)">
                    <td class="td-linea">{{ e.linea || '—' }}</td>
                    <td class="td-prog" :title="e.programa">
                      <span class="caret" :class="{ open: expanded.has(e.edition_id) }">›</span>{{ e.programa }}
                    </td>
                    <td class="td-ed">{{ e.codigo || '—' }}</td>
                    <td class="td-fecha">{{ fmtDate(e.inicio) }}</td>
                    <td class="num muted">{{ e.meta_consultas || '—' }}</td>
                    <td class="num strong">{{ e.consultas }}</td>
                    <td class="num"><span class="pct" :class="'pct-' + pctState(e.consultas, e.meta_consultas)">{{ pctText(e.consultas, e.meta_consultas) }}</span></td>
                    <td class="num muted">{{ e.meta_ventas || '—' }}</td>
                    <td class="num strong">{{ e.ventas }}</td>
                    <td class="num"><span class="pct" :class="'pct-' + pctState(e.ventas, e.meta_ventas)">{{ pctText(e.ventas, e.meta_ventas) }}</span></td>
                    <td class="num">{{ e.conversion_pct === null ? '—' : e.conversion_pct + '%' }}</td>
                  </tr>
                  <tr v-if="expanded.has(e.edition_id)" class="row-detail">
                    <td colspan="11">
                      <div class="detail-grid">
                        <div class="detail-cell" v-for="c in e.canales" :key="c.key">
                          <span class="detail-key"><span class="canal-dot" :class="'dot-' + c.grupo.toLowerCase()"></span>{{ c.grupo }} · {{ c.momento }}</span>
                          <span class="detail-val">{{ c.consultas }} cons → {{ c.ventas }} vta</span>
                        </div>
                        <p v-if="!e.canales.length" class="detail-empty">Sin consultas registradas para esta edición.</p>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'

const dashboardService = inject(ServiceKeys.Dashboard)

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// Estado nunca va por color solo: cada chip lleva su icono.
const STATUS_ICON = { good: '●', warning: '▲', critical: '■', neutral: '·' }

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

const lineas = computed(() => [...new Set(data.value.items.map(i => i.linea).filter(Boolean))].sort())

const ediciones = computed(() =>
  filters.linea ? data.value.items.filter(i => i.linea === filters.linea) : data.value.items
)

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

const kpis = computed(() => {
  const t = data.value.totales
  const sinCanal = t.ventas - t.ventas_trazadas
  return [
    {
      label: 'CONSULTAS',
      value: fmtInt(t.consultas),
      pct: pct(t.consultas, t.meta_consultas),
      state: pctState(t.consultas, t.meta_consultas),
      badge: pctText(t.consultas, t.meta_consultas),
      sub: t.meta_consultas ? `Meta ${fmtInt(t.meta_consultas)}` : 'Sin meta cargada',
      paced: true
    },
    {
      label: 'VENTAS',
      value: fmtInt(t.ventas),
      pct: pct(t.ventas, t.meta_ventas),
      state: pctState(t.ventas, t.meta_ventas),
      badge: pctText(t.ventas, t.meta_ventas),
      sub: t.meta_ventas ? `Meta ${fmtInt(t.meta_ventas)}` : 'Sin meta cargada',
      paced: true
    },
    {
      label: 'CONVERSIÓN',
      value: t.conversion_pct === null ? '—' : t.conversion_pct + '%',
      pct: null,
      state: 'neutral',
      badge: '',
      sub: `${fmtInt(t.consultas)} consultas → ${fmtInt(t.ventas)} ventas`,
      paced: false
    },
    {
      label: 'VENTA SIN CANAL',
      value: fmtInt(sinCanal),
      pct: null,
      state: sinCanal > t.ventas * 0.2 ? 'warning' : 'neutral',
      badge: t.ventas ? Math.round((sinCanal / t.ventas) * 100) + '%' : '',
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
.ger-shell { display: flex; flex-direction: column; min-height: 100%; }

/* ── Masthead ───────────────────────────────────────────── */
.ger-masthead { background: var(--navy-900, #0f172a); color: #fff; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 18px 28px 14px; }
.masthead-brand { display: flex; align-items: center; gap: 14px; }
.brand-rule { width: 3px; height: 38px; background: var(--we-navy-accent, #8FAADC); border-radius: 2px; }
.brand-eyebrow { display: block; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 700; }
.brand-title { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; margin: 2px 0 0; }

.btn-ger { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
.btn-ger-primary { background: var(--we-navy-accent, #8FAADC); color: var(--navy-900, #0f172a); }
.btn-ger-primary:disabled { opacity: 0.6; cursor: default; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.masthead-filters { display: flex; align-items: center; gap: 14px; padding: 0 28px 16px; }
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-label { font-size: 9.5px; letter-spacing: 0.14em; color: var(--slate-400, #94a3b8); font-weight: 700; }
.ger-select { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 4px; padding: 5px 9px; font-size: 12.5px; }
.ger-select option { color: #0f172a; }
.filter-sep { width: 1px; height: 26px; background: rgba(255,255,255,0.14); }
.filter-spacer { flex: 1; }

.pacing { display: flex; align-items: center; gap: 9px; }
.pacing-label { font-size: 9.5px; letter-spacing: 0.14em; color: var(--slate-400, #94a3b8); font-weight: 700; }
.pacing-bar { width: 90px; height: 4px; background: rgba(255,255,255,0.16); border-radius: 2px; overflow: hidden; }
.pacing-fill { height: 100%; background: var(--we-navy-accent, #8FAADC); }
.pacing-value { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* ── Body ───────────────────────────────────────────────── */
.ger-body { flex: 1; padding: 22px 28px 32px; display: flex; flex-direction: column; gap: 18px; }
.ger-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 340px; gap: 14px; }
.loader-ring { width: 36px; height: 36px; border: 3px solid var(--border, #e2e8f0); border-top-color: var(--we-navy, #002060); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loader-text { font-size: 13px; color: var(--text-secondary, #475569); }

/* ── KPIs ───────────────────────────────────────────────── */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
.kpi { background: var(--white, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 15px 17px; }
.kpi-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.kpi-label { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: var(--text-muted, #94a3b8); }
.kpi-value { font-size: 25px; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary, #0f172a); font-variant-numeric: tabular-nums; margin: 6px 0 9px; }
.kpi-track { position: relative; height: 4px; background: var(--slate-100, #f1f5f9); border-radius: 2px; margin-bottom: 8px; }
.kpi-fill { height: 100%; border-radius: 2px; }
/* Marca de ritmo: dónde debería estar el avance a hoy. */
.kpi-pace { position: absolute; top: -3px; width: 2px; height: 10px; background: var(--text-primary, #0f172a); opacity: 0.55; }
.kpi-sub { font-size: 11px; color: var(--text-muted, #94a3b8); }

/* Estado: color + icono, nunca color solo. */
.status-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 3px; font-size: 10.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.chip-icon { font-size: 8px; }
.chip-good     { background: #dcfce7; color: #15803d; }
.chip-warning  { background: #fef3c7; color: #b45309; }
.chip-critical { background: #fee2e2; color: #b91c1c; }
.chip-neutral  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); }
.fill-good { background: #22c55e; } .fill-warning { background: #f59e0b; }
.fill-critical { background: #ef4444; } .fill-neutral { background: var(--slate-400, #94a3b8); }

/* ── Alertas ────────────────────────────────────────────── */
.alerts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.alert { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 6px; border: 1px solid var(--border, #e2e8f0); background: var(--white, #fff); border-left-width: 3px; }
.alert-critical { border-left-color: #ef4444; } .alert-warning { border-left-color: #f59e0b; } .alert-neutral { border-left-color: var(--slate-400, #94a3b8); }
.alert-icon { font-size: 10px; line-height: 1.6; }
.alert-critical .alert-icon { color: #b91c1c; } .alert-warning .alert-icon { color: #b45309; } .alert-neutral .alert-icon { color: var(--text-muted, #94a3b8); }
.alert-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; }
.alert-text { font-size: 11.5px; color: var(--text-secondary, #475569); margin: 2px 0 0; line-height: 1.4; }
.alert-count { margin-left: auto; font-size: 18px; font-weight: 700; color: var(--text-primary, #0f172a); font-variant-numeric: tabular-nums; }

/* ── Paneles y tablas ───────────────────────────────────── */
.panel { background: var(--white, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; overflow: hidden; }
.panel-head { padding: 14px 18px; border-bottom: 1px solid var(--slate-100, #f1f5f9); }
.panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; }
.panel-sub { font-size: 11px; color: var(--text-muted, #94a3b8); margin: 2px 0 0; }

/* El scroll horizontal vive en el contenedor, nunca en el body de la página. */
.table-scroll { overflow-x: auto; }
.ger-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ger-table th, .ger-table td { padding: 8px 10px; border-bottom: 1px solid var(--slate-100, #f1f5f9); white-space: nowrap; }
.ger-table thead th { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--text-secondary, #475569); background: var(--slate-50, #f8fafc); }
.th-l { text-align: left; }
.th-grp { text-align: center; border-left: 2px solid var(--border, #e2e8f0); }
.th-grp-alt { background: #fffbeb; color: #92400e; }
.th-grp-conv { background: #f0fdf4; color: #0f766e; }
.thead-sub th { font-size: 9px; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.muted { color: var(--text-muted, #94a3b8); }
.strong { font-weight: 700; color: var(--text-primary, #0f172a); }

.pct { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 700; }
.pct-good { background: #dcfce7; color: #15803d; }
.pct-warning { background: #fef3c7; color: #b45309; }
.pct-critical { background: #fee2e2; color: #b91c1c; }
.pct-neutral { background: transparent; color: var(--text-muted, #94a3b8); }

.row-group-start td { border-top: 2px solid var(--border, #e2e8f0); }
.td-canal { font-weight: 600; color: var(--text-primary, #0f172a); }
.td-momento { color: var(--text-secondary, #475569); }
.canal-dot { display: inline-block; width: 7px; height: 7px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
/* Un solo hue por grupo, en pasos distintos: identidad, no ranking. */
.dot-marketing { background: #002060; }
.dot-web       { background: #3b6bb5; }
.dot-comercial { background: #7f9fd4; }
.dot-otros     { background: var(--slate-400, #94a3b8); }

.conv-cell { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
.conv-bar { width: 54px; height: 4px; background: var(--slate-100, #f1f5f9); border-radius: 2px; overflow: hidden; }
.conv-fill { height: 100%; background: #0f766e; border-radius: 2px; }
.conv-val { min-width: 40px; text-align: right; font-weight: 600; }

tfoot td { background: var(--navy-900, #0f172a); color: #fff; font-weight: 700; border-bottom: none; }
tfoot .tfoot-label { font-size: 10px; letter-spacing: 0.1em; color: var(--slate-400, #94a3b8); text-align: left; }
tfoot .strong { color: #fff; }

.row-ed { cursor: pointer; }
.row-ed:hover td { background: var(--slate-50, #f8fafc); }
.td-prog { max-width: 300px; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: var(--text-primary, #0f172a); }
.td-linea, .td-ed, .td-fecha { color: var(--text-secondary, #475569); }
.caret { display: inline-block; width: 12px; transition: transform 0.15s; color: var(--text-muted, #94a3b8); }
.caret.open { transform: rotate(90deg); }

.row-detail td { background: var(--slate-50, #f8fafc); padding: 12px 16px; white-space: normal; }
.detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px 18px; }
.detail-cell { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; }
.detail-key { color: var(--text-secondary, #475569); }
.detail-val { font-weight: 600; color: var(--text-primary, #0f172a); font-variant-numeric: tabular-nums; }
.detail-empty { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin: 0; }

/* ── Dark ───────────────────────────────────────────────── */
:global(.dark-theme) .kpi,
:global(.dark-theme) .panel,
:global(.dark-theme) .alert { background: var(--card-bg, #24241c); }
:global(.dark-theme) .ger-table thead th,
:global(.dark-theme) .row-detail td,
:global(.dark-theme) .row-ed:hover td { background: rgba(255,255,255,0.04); }
:global(.dark-theme) .th-grp-alt { background: rgba(245,158,11,0.12); color: #fbbf24; }
:global(.dark-theme) .th-grp-conv { background: rgba(15,118,110,0.16); color: #5eead4; }
:global(.dark-theme) .dot-marketing { background: #8FAADC; }
:global(.dark-theme) .dot-web { background: #5f83c0; }
:global(.dark-theme) .dot-comercial { background: #3f5f9c; }
</style>
