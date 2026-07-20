<template>
  <div class="reporte-page">
    <div class="rep-head">
      <div class="rep-title">
        <div class="eyebrow">MARKETING · REPORTE · INGRESOS DIARIOS</div>
        <h1>Resumen por líneas de negocio</h1>
      </div>
      <div class="grow"></div>
      <div class="period-nav">
        <button class="arrow" type="button" @click="shiftMonth(-1)" v-html="ic.chevL"></button>
        <span class="lbl">{{ R.period.label }}</span>
        <button class="arrow" type="button" @click="shiftMonth(1)" v-html="ic.chevR"></button>
      </div>
    </div>

    <!-- Banner de totales -->
    <div class="total-banner">
      <div class="tb-cell hero">
        <div class="lbl"><span class="lic" v-html="ic.chart14"></span> INGRESO TOTAL · {{ R.period.label.toUpperCase() }}</div>
        <div class="big">{{ soles(R.totals.ingresos) }}</div>
        <div class="sub">
          <span :class="['delta', R.totals.varMoM >= 0 ? 'up' : 'down']">{{ deltaTxt(R.totals.varMoM) }}</span>
          vs. {{ R.period.prevLabel }}
        </div>
      </div>
      <div class="tb-cell">
        <div class="lbl"><span class="lic" v-html="ic.people"></span> N° DE VENTAS (#)</div>
        <div class="big sm">{{ num(R.totals.ventas) }}</div>
        <div class="sub">Transacciones del periodo</div>
      </div>
      <div class="tb-cell">
        <div class="lbl">TICKET PROMEDIO</div>
        <div class="big sm">{{ soles(R.totals.ticket) }}</div>
        <div class="sub">Ingreso ÷ ventas</div>
      </div>
      <div class="tb-cell">
        <div class="lbl">CUMPLIMIENTO OBJETIVO</div>
        <div class="big sm">{{ R.totals.cumplimiento }}%</div>
        <div class="sub">Meta {{ soles(R.totals.objetivo) }}</div>
        <div class="mini-track"><i :style="{ width: Math.min(100, R.totals.cumplimiento) + '%' }"></i></div>
      </div>
    </div>

    <!-- Tarjetas por línea -->
    <div class="line-cards">
      <!-- Skeleton mientras carga el reporte -->
      <template v-if="loading">
        <div v-for="n in 4" :key="'sk' + n" class="lc" style="--lc: #e2e8f0">
          <div class="lc-head">
            <span class="skel" style="width: 40px; height: 40px; border-radius: 11px"></span>
            <div style="flex: 1">
              <span class="skel" style="width: 70%; height: 16px"></span>
              <span class="skel" style="width: 50%; height: 11px; margin-top: 6px"></span>
            </div>
          </div>
          <div class="lc-body">
            <div class="lc-metric">
              <div class="k">INGRESOS · S/.</div>
              <span class="skel" style="width: 80px; height: 23px; margin-top: 6px"></span>
            </div>
            <div class="lc-divider"></div>
            <div class="lc-metric">
              <div class="k">VENTAS · #</div>
              <span class="skel" style="width: 56px; height: 23px; margin-top: 6px"></span>
            </div>
          </div>
          <div class="lc-foot">
            <span class="skel" style="width: 60%"></span>
          </div>
        </div>
      </template>
      <template v-else>
      <div v-for="l in R.lines" :key="l.key" class="lc" :style="{ '--lc': l.color }">
        <div class="lc-head">
          <span class="lc-ic" v-html="ic[l.key]"></span>
          <div>
            <div class="lc-name">{{ l.name }}</div>
            <div class="lc-desc">{{ l.desc }}</div>
          </div>
          <span class="lc-share">{{ pct(l.ingresos, R.totals.ingresos) }}%</span>
        </div>
        <div class="lc-body">
          <div class="lc-metric">
            <div class="k">INGRESOS · S/.</div>
            <div class="v">{{ solesK(l.ingresos) }}</div>
          </div>
          <div class="lc-divider"></div>
          <div class="lc-metric">
            <div class="k">VENTAS · #</div>
            <div class="v">{{ num(l.ventas) }}</div>
          </div>
        </div>
        <div class="lc-tickets">
          <div class="tk"><span class="tk-n">{{ soles(l.ticket) }}</span><span class="tk-l">ticket prom.</span></div>
          <div class="tk"><span class="tk-n">{{ l.cumplimiento }}%</span><span class="tk-l">de la meta</span></div>
        </div>
        <div class="lc-foot">
          <span :class="['delta', l.varMoM >= 0 ? 'up' : 'down']">{{ deltaTxt(l.varMoM) }}</span>
          <span class="obj">vs. {{ R.period.prevLabel }}</span>
        </div>
      </div>
      </template>
    </div>

    <div class="rep-cols">
      <!-- Composición -->
      <div class="panel">
        <div class="p-eyebrow">PARTICIPACIÓN POR LÍNEA</div>
        <div class="p-title">Composición de ingresos</div>
        <div class="stacked">
          <i v-for="l in R.lines" :key="l.key"
             :style="{ width: pct(l.ingresos, R.totals.ingresos) + '%', background: l.color }"
             :data-tip="l.name.replace('Línea ', '') + ' — ' + soles(l.ingresos) + ' (' + pct(l.ingresos, R.totals.ingresos) + '%)'"></i>
        </div>
        <div class="stack-legend">
          <div v-for="l in R.lines" :key="l.key" class="sl-row">
            <span class="sw" :style="{ background: l.color }"></span>
            <span class="nm">{{ l.name }}</span>
            <span class="amt">{{ soles(l.ingresos) }}</span>
            <span class="pc">{{ pct(l.ingresos, R.totals.ingresos) }}%</span>
          </div>
        </div>
      </div>

      <!-- Tendencia semanal -->
      <div class="panel">
        <div class="p-eyebrow">TENDENCIA SEMANAL · {{ R.period.label.toUpperCase() }}</div>
        <div class="p-title">Ingresos por semana y línea</div>
        <div class="trend">
          <div v-for="(wk, wi) in weeks" :key="wk" class="trend-col">
            <div class="trend-bars">
              <div v-for="l in R.lines" :key="l.key" class="tbar"
                   :style="{ height: ((l.weekly[wi]?.ingresos || 0) / weeklyMax * 100) + '%', background: l.color }"
                   :data-tip="l.name.replace('Línea ', '') + ' · ' + wk + ' — ' + soles(l.weekly[wi]?.ingresos || 0)"></div>
            </div>
            <div class="trend-x">{{ wk }}</div>
          </div>
        </div>
        <div class="trend-legend">
          <span v-for="l in R.lines" :key="l.key">
            <span class="sw" :style="{ background: l.color }"></span>{{ l.name.replace('Línea ', '') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Detalle -->
    <div class="detail-panel">
      <div class="dp-head">
        <span class="lic" v-html="ic.chart18"></span>
        <h3>Detalle de ingresos por línea, categoría y rubro</h3>
        <span class="grow"></span>
        <span class="meta-line">{{ R.period.label }} · S/. = ingreso · # = ventas</span>
      </div>
      <div style="overflow-x: auto">
        <table class="rep">
          <thead>
            <tr>
              <th class="l">Línea / Categoría / Rubro</th>
              <th>S/. Ingreso</th>
              <th># Ventas</th>
              <th>Ticket prom.</th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton de filas mientras carga -->
            <template v-if="loading">
              <tr v-for="n in 8" :key="'skr' + n">
                <td class="l"><span class="skel" style="width: 60%"></span></td>
                <td><span class="skel" style="width: 70px; margin-left: auto"></span></td>
                <td><span class="skel" style="width: 48px; margin-left: auto"></span></td>
                <td><span class="skel" style="width: 70px; margin-left: auto"></span></td>
              </tr>
            </template>
            <template v-else>
            <template v-for="l in R.lines" :key="l.key">
              <tr :class="['line-head', collapsed[l.key] ? 'collapsed' : '']" :style="{ '--lc': l.color }">
                <td class="l">
                  <div class="lh">
                    <button class="caret" type="button" @click="toggle(l.key)" v-html="ic.caret"></button>
                    <span class="swz"></span>
                    <span class="nm">{{ l.name }}</span>
                  </div>
                </td>
                <td class="val">{{ soles(l.ingresos) }}</td>
                <td class="val">{{ num(l.ventas) }}</td>
                <td class="val gan">{{ soles(l.ticket) }}</td>
              </tr>
              <template v-if="!collapsed[l.key]">
                <template v-for="(g, gi) in l.grupos" :key="l.key + '-' + gi">
                  <tr class="grp-head">
                    <td>{{ g.name }}</td>
                    <td class="gv">{{ soles(g.ingresos) }}</td>
                    <td class="gv">{{ num(g.ventas) }}</td>
                    <td class="gv">{{ soles(g.ticket) }}</td>
                  </tr>
                  <tr v-for="(it, ii) in g.items" :key="l.key + '-' + gi + '-' + ii" class="item">
                    <td class="l">{{ it.name }}</td>
                    <td>{{ soles(it.ingresos) }}</td>
                    <td>{{ num(it.ventas) }}</td>
                    <td>{{ soles(it.ticket) }}</td>
                  </tr>
                </template>
              </template>
            </template>
            <tr class="total-row">
              <td class="l">TOTAL GENERAL</td>
              <td>{{ soles(R.totals.ingresos) }}</td>
              <td>{{ num(R.totals.ventas) }}</td>
              <td>{{ soles(R.totals.ticket) }}</td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rep-foot">
      S/. = ingreso del rubro · # = número de ventas · Ticket promedio = ingreso ÷ ventas ·
      Línea B2C: data real (pagos del sistema) · B2B / Fundación / Adicionales: datos de ejemplo, pendientes de fuente.
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, inject, onMounted, watch } from 'vue'
import { ServiceKeys } from '@/services'

const marketing = inject(ServiceKeys.Marketing)

/* Paleta anclada al navy WE #002060, validada (contraste + daltonismo) */
const LINES = {
  b2c:  { key: 'b2c',  name: 'Línea B2C',         desc: 'En Vivo · Online · Membresías', color: '#2a52a0' },
  b2b:  { key: 'b2b',  name: 'Línea B2B',         desc: 'Categorías propias · Convenios', color: '#0e9cd6' },
  fund: { key: 'fund', name: 'Línea Fundación',   desc: 'Fundación WE',                   color: '#15a361' },
  adic: { key: 'adic', name: 'Línea Adicionales', desc: 'Otros ingresos',                 color: '#d97706' },
}

/* ===== Periodo (mes navegable) ===== */
const now = new Date()
const month = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const label = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const shiftMonth = (n) => { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + n, 1) }

/* ===== Líneas sin fuente todavía: datos de ejemplo (B2B / Fundación / Adicionales) ===== */
// ponytail: cuando existan fuentes reales para estas líneas, reemplazar los mocks
// por endpoints como el de B2C.
const mk = (name, ingresos, ventas) => ({ name, ingresos, ventas, ticket: Math.round(ingresos / ventas) })
const mockLines = [
  {
    ...LINES.b2b,
    objetivo: 175000, prev: 158900,
    grupos: [
      { name: 'Categorías Propias', items: [
        mk('In House (talleres, cursos, diplo)', 68400, 24), mk('Corporativo (financiado empresas)', 52600, 11),
        mk('Consultoría', 21800, 6), mk('Ingresos Extras', 3200, 5),
      ]},
      { name: 'Relacionadas a otras unidades', items: [
        mk('Convenio · Online', 12400, 38), mk('Convenio · En Vivo', 9800, 22),
        mk('Convenio · Membresía', 5600, 14), mk('Convenio · Eventos Fundación', 4200, 8),
        mk('Auspicio · Fundación', 5100, 4), mk('Ingresos Extras', 2100, 6),
      ]},
    ],
  },
  {
    ...LINES.fund,
    objetivo: 45000, prev: 38700,
    grupos: [
      { name: 'Fundación WE', items: [
        mk('Tickets Eventos', 22600, 452), mk('Auspicio', 11800, 9),
        mk('Donación', 6400, 63), mk('Ingresos Extras', 2100, 12),
      ]},
    ],
  },
  {
    ...LINES.adic,
    objetivo: 20000, prev: 19400,
    grupos: [
      { name: 'Otros Ingresos', items: [
        mk('Pronto pago', 9800, 140), mk('Alquiler de espacios', 8600, 17),
        mk('Certificaciones', 3200, 64), mk('Ingresos varios', 2100, 28),
      ]},
    ],
  },
]

/* ===== Agregación ===== */
const B2C_OBJETIVO = 445000 // meta referencial; no hay fuente de objetivos aún

const round0 = (n) => Math.round(Number(n) || 0)
const safeDiv = (a, b) => (b > 0 ? a / b : 0)

function aggregateLine (l) {
  let ing = 0, vts = 0
  l.grupos.forEach((g) => {
    g.ingresos = round0(g.items.reduce((a, i) => a + Number(i.ingresos), 0))
    g.ventas = g.items.reduce((a, i) => a + i.ventas, 0)
    g.ticket = round0(safeDiv(g.ingresos, g.ventas))
    ing += g.ingresos; vts += g.ventas
  })
  l.ingresos = ing; l.ventas = vts
  l.ticket = round0(safeDiv(ing, vts))
  l.cumplimiento = round0(safeDiv(ing, l.objetivo) * 100)
  l.varMoM = round0(safeDiv(ing - l.prev, l.prev) * 100)
  return l
}

/* true mientras se resuelve la carga del mes (skeleton visible) */
const loading = ref(true)

const R = reactive({
  period: { label: label(month.value), prevLabel: '—' },
  lines: [],
  totals: { ingresos: 0, ventas: 0, ticket: 0, objetivo: 0, cumplimiento: 0, varMoM: 0 },
})

const weeks = ref(['S1', 'S2', 'S3', 'S4'])
const weeklyMax = computed(() =>
  Math.max(1, ...R.lines.flatMap((l) => (l.weekly || []).map((w) => w.ingresos)))
)

async function load () {
  loading.value = true
  const prevDate = new Date(month.value.getFullYear(), month.value.getMonth() - 1, 1)
  R.period = { label: label(month.value), prevLabel: label(prevDate) }

  let b2cData = { totals: { ingresos: 0, ventas: 0 }, prev: { ingresos: 0 }, weekly: [], grupos: [] }
  try {
    b2cData = await marketing.ingresosB2C({ month: ym(month.value) })
  } catch (e) {
    console.error('[IngresosDiarios] ingresosB2C:', e?.message || e)
  }

  // B2C real
  const b2c = aggregateLine({
    ...LINES.b2c,
    objetivo: B2C_OBJETIVO,
    prev: round0(b2cData.prev.ingresos) || 1,
    grupos: (b2cData.grupos || []).map((g) => ({
      name: g.name,
      items: g.items.map((i) => ({ name: i.name, ingresos: round0(i.ingresos), ventas: i.ventas, ticket: round0(safeDiv(i.ingresos, i.ventas)) })),
    })),
  })

  const lines = [b2c, ...mockLines.map((m) => aggregateLine(m))]

  // Semanas: las que reporta B2C (4 o 5); los mocks se reparten uniforme
  const W = Math.max(4, (b2cData.weekly || []).length)
  weeks.value = Array.from({ length: W }, (_, i) => 'S' + (i + 1))
  b2c.weekly = Array.from({ length: W }, (_, i) => ({ week: 'S' + (i + 1), ingresos: round0(b2cData.weekly[i]?.ingresos || 0) }))
  mockLines.forEach((l) => { l.weekly = weeks.value.map((w) => ({ week: w, ingresos: round0(l.ingresos / W) })) })

  const totals = {
    ingresos: lines.reduce((a, l) => a + l.ingresos, 0),
    ventas: lines.reduce((a, l) => a + l.ventas, 0),
    objetivo: lines.reduce((a, l) => a + l.objetivo, 0),
    prev: lines.reduce((a, l) => a + l.prev, 0),
  }
  totals.ticket = round0(safeDiv(totals.ingresos, totals.ventas))
  totals.cumplimiento = round0(safeDiv(totals.ingresos, totals.objetivo) * 100)
  totals.varMoM = round0(safeDiv(totals.ingresos - totals.prev, totals.prev) * 100)

  R.lines = lines
  R.totals = totals
  loading.value = false
}

onMounted(load)
watch(month, load)

/* ===== Helpers de formato ===== */
const soles = (n) => 'S/ ' + round0(n).toLocaleString('es-PE')
const solesK = (n) => 'S/ ' + (round0(n) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + 'K'
const num = (n) => (Number(n) || 0).toLocaleString('es-PE')
const deltaTxt = (v) => (v >= 0 ? '▲ ' : '▼ ') + Math.abs(v) + '%'
const pct = (a, b) => round0(safeDiv(a, b) * 100)

/* ===== Colapso de líneas en la tabla ===== */
const collapsed = reactive({})
const toggle = (k) => { collapsed[k] = !collapsed[k] }

/* ===== Íconos inline (SVG con currentColor) ===== */
const svg = (inner, size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
const CHART = '<path d="M18 20V10M12 20V4M6 20v-6"/>'
const ic = {
  chart14: svg(CHART, 14),
  chart18: svg(CHART, 18),
  people: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 13),
  chevL: svg('<polyline points="15 18 9 12 15 6"/>', 18),
  chevR: svg('<polyline points="9 18 15 12 9 6"/>', 18),
  caret: svg('<polyline points="6 9 12 15 18 9"/>', 15),
  b2c: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', 20),
  b2b: svg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', 20),
  fund: svg('<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>', 20),
  adic: svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', 20),
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap');

/* Tokens del diseño (tema claro) — mismos del cronograma-vista */
.reporte-page {
  --font-sans: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --accent: #002060; /* navy corporativo WE */
  --surface: #ffffff;
  --surface-2: #faf9f8;
  --surface-3: #f1efed;
  --border: #e8e6e3;
  --border-strong: #d8d4d0;
  --ink: #1b1917;
  --ink-2: #57534e;
  --ink-3: #8d877f;
  --shadow: 0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 1px rgba(28, 25, 23, 0.03);
  --track: #ece9e6;
  --s1-bg: #fde8e6; --s1-fg: #c0362c;
  --s4-bg: #d9f3df; --s4-fg: #1d7a40;
  --r-lg: 16px;
  --font-mono: 'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  /* sin fondo propio: hereda el del layout del ERP para no duplicar fondos */
  padding: 2px 2px 1rem;
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
.reporte-page button { cursor: pointer; font-family: inherit; }
.grow { flex: 1; }
.lic { display: inline-flex; align-items: center; }

/* ===== Cabecera ===== */
.rep-head { display: flex; align-items: center; gap: 18px; margin: 4px 2px 22px; flex-wrap: wrap; }
.rep-title .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.13em; color: var(--ink-3); }
.rep-title h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.015em; margin: 3px 0 0; color: var(--ink); }
.period-nav { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 13px; box-shadow: var(--shadow); padding: 5px; }
.period-nav .arrow { width: 34px; height: 34px; border-radius: 9px; border: none; background: transparent; color: var(--ink-2); display: grid; place-items: center; transition: 0.15s; }
.period-nav .arrow:hover { background: var(--surface-3); color: var(--ink); }
.period-nav .lbl { padding: 0 16px; font-size: 15px; font-weight: 800; }

/* ===== Banner de totales ===== */
.total-banner { display: grid; grid-template-columns: 1.1fr 1fr 1fr 1fr; gap: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); overflow: hidden; margin-bottom: 18px; }
@media (max-width: 1100px) { .total-banner { grid-template-columns: 1fr 1fr; } }
.tb-cell { padding: 22px 26px; border-right: 1px solid var(--border); }
.tb-cell:last-child { border-right: none; }
.tb-cell.hero { background: linear-gradient(135deg, color-mix(in oklab, var(--accent) 12%, var(--surface)), var(--surface)); }
.tb-cell .lbl { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--ink-3); display: flex; align-items: center; gap: 7px; }
.tb-cell .big { font-size: 34px; font-weight: 800; letter-spacing: -0.025em; margin-top: 8px; }
.tb-cell .big.sm { font-size: 27px; }
.tb-cell .sub { font-size: 12.5px; color: var(--ink-2); margin-top: 6px; display: flex; align-items: center; gap: 8px; }
.delta { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 800; font-family: var(--font-mono); border-radius: 20px; padding: 2px 8px; }
.delta.up { background: var(--s4-bg); color: var(--s4-fg); }
.delta.down { background: var(--s1-bg); color: var(--s1-fg); }
.mini-track { height: 6px; border-radius: 20px; background: var(--track); overflow: hidden; margin-top: 10px; }
.mini-track > i { display: block; height: 100%; border-radius: 20px; background: var(--accent); }

/* ===== Tarjetas por línea ===== */
.line-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
@media (max-width: 1200px) { .line-cards { grid-template-columns: repeat(2, 1fr); } }
.lc { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); padding: 20px 22px; position: relative; overflow: hidden; }
.lc::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--lc); }
.lc .lc-head { display: flex; align-items: flex-start; gap: 12px; }
.lc .lc-ic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: none; background: color-mix(in oklab, var(--lc) 15%, transparent); color: var(--lc); }
.lc .lc-name { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
.lc .lc-desc { font-size: 11.5px; color: var(--ink-3); font-weight: 500; margin-top: 2px; }
.lc .lc-share { margin-left: auto; font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: var(--lc); background: color-mix(in oklab, var(--lc) 12%, transparent); border-radius: 7px; padding: 3px 9px; }
.lc-body { display: flex; gap: 20px; margin-top: 18px; }
.lc-metric { flex: 1; }
.lc-metric .k { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: var(--ink-3); }
.lc-metric .v { font-size: 23px; font-weight: 800; letter-spacing: -0.02em; margin-top: 4px; }
.lc-divider { width: 1px; background: var(--border); }
.lc-tickets { display: flex; gap: 10px; margin-top: 14px; }
.lc-tickets .tk { flex: 1; display: flex; flex-direction: column; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; }
.lc-tickets .tk-n { font-family: var(--font-mono); font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
.lc-tickets .tk-l { font-size: 10.5px; font-weight: 600; color: var(--ink-3); letter-spacing: 0.03em; }
.lc-foot { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
.lc-foot .obj { font-size: 12px; color: var(--ink-3); font-weight: 600; margin-left: auto; }

/* ===== Composición + Tendencia ===== */
.rep-cols { display: grid; grid-template-columns: 1fr 1.15fr; gap: 16px; margin-bottom: 20px; align-items: start; }
@media (max-width: 1100px) { .rep-cols { grid-template-columns: 1fr; } }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); padding: 22px 24px; }
.panel .p-title { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
.panel .p-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--ink-3); }
.stacked { display: flex; gap: 2px; height: 26px; margin: 18px 0 14px; }
.stacked > i { height: 100%; transition: width 0.5s; }
.stacked > i:first-child { border-radius: 8px 0 0 8px; }
.stacked > i:last-child { border-radius: 0 8px 8px 0; }
.stack-legend { display: flex; flex-direction: column; gap: 11px; }
.sl-row { display: flex; align-items: center; gap: 12px; }
.sl-row .sw { width: 12px; height: 12px; border-radius: 4px; flex: none; }
.sl-row .nm { font-size: 13.5px; font-weight: 700; flex: 1; }
.sl-row .amt { font-family: var(--font-mono); font-size: 13.5px; font-weight: 700; white-space: nowrap; text-align: right; min-width: 96px; }
.sl-row .pc { font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); font-weight: 600; width: 44px; text-align: right; }
.trend { display: flex; align-items: flex-end; gap: 20px; height: 190px; padding: 24px 4px 0; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.trend-bars { display: flex; gap: 4px; align-items: flex-end; height: 100%; width: 100%; justify-content: center; }
.tbar { flex: 1; max-width: 16px; border-radius: 5px 5px 0 0; transition: height 0.5s; }

/* Tooltip popup al pasar el mouse (barras de tendencia y composición) */
.tbar, .stacked > i { position: relative; }
.tbar:hover, .stacked > i:hover { filter: brightness(1.12); z-index: 3; }
.tbar::after, .stacked > i::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 9px); left: 50%;
  transform: translateX(-50%) translateY(3px); background: var(--ink); color: #fff;
  font-size: 11.5px; font-weight: 700; font-family: var(--font-sans); white-space: nowrap;
  padding: 6px 11px; border-radius: 8px; box-shadow: 0 8px 24px -8px rgba(28, 25, 23, 0.4);
  opacity: 0; pointer-events: none; transition: opacity 0.13s, transform 0.13s;
}
.tbar::before, .stacked > i::before {
  content: ''; position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%) translateY(3px);
  border: 5px solid transparent; border-top-color: var(--ink); border-bottom: none;
  opacity: 0; pointer-events: none; transition: opacity 0.13s, transform 0.13s;
}
.tbar:hover::after, .stacked > i:hover::after,
.tbar:hover::before, .stacked > i:hover::before { opacity: 1; transform: translateX(-50%) translateY(0); }
.trend-x { font-size: 12px; font-weight: 700; color: var(--ink-2); }
.trend-legend { display: flex; gap: 16px; justify-content: center; margin-top: 14px; font-size: 12px; color: var(--ink-2); font-weight: 600; }
.trend-legend .sw { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 6px; }

/* ===== Tabla de detalle ===== */
.detail-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); overflow: hidden; }
.detail-panel .dp-head { display: flex; align-items: center; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.detail-panel .dp-head h3 { font-size: 17px; font-weight: 800; margin: 0; }
.meta-line { font-size: 12.5px; color: var(--ink-3); }
table.rep { border-collapse: separate; border-spacing: 0; width: 100%; }
table.rep th { text-align: right; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: var(--ink-3); padding: 11px 22px; background: var(--surface-3); border-bottom: 1px solid var(--border); white-space: nowrap; }
table.rep th.l { text-align: left; }
table.rep td { padding: 12px 22px; border-bottom: 1px solid var(--border); text-align: right; font-family: var(--font-mono); font-size: 13.5px; font-weight: 600; }
table.rep td.l { text-align: left; font-family: inherit; }
tr.line-head td { background: color-mix(in oklab, var(--lc) 7%, var(--surface)); border-bottom: 1px solid var(--border); padding: 13px 22px; }
tr.line-head .lh { display: flex; align-items: center; gap: 11px; }
tr.line-head .caret { width: 22px; height: 22px; border: none; background: transparent; color: var(--ink-3); display: grid; place-items: center; border-radius: 6px; }
tr.line-head .caret:hover { background: var(--surface-3); color: var(--ink); }
tr.line-head .caret :deep(svg) { transition: transform 0.18s; }
tr.line-head.collapsed .caret :deep(svg) { transform: rotate(-90deg); }
tr.line-head .swz { width: 10px; height: 20px; border-radius: 4px; background: var(--lc); }
tr.line-head .nm { font-size: 15px; font-weight: 800; }
tr.line-head td.val { font-family: var(--font-mono); font-weight: 800; font-size: 14px; color: var(--ink); }
tr.line-head td.gan { color: var(--lc); }
tr.grp-head td { background: var(--surface-2); font-size: 11px; letter-spacing: 0.06em; font-weight: 700; color: var(--ink-3); text-transform: uppercase; padding: 8px 22px 8px 44px; text-align: left; }
tr.grp-head td.gv { text-align: right; font-family: var(--font-mono); color: var(--ink-2); }
tr.item td.l { padding-left: 44px; color: var(--ink-2); font-weight: 500; }
tr.item:hover td { background: var(--surface-2); }
tr.total-row td { background: var(--surface-3); font-weight: 800; font-size: 14px; padding: 15px 22px; border-top: 2px solid var(--border-strong); }
tr.total-row td.l { font-family: inherit; }

.rep-foot { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12.5px; color: var(--ink-3); }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
