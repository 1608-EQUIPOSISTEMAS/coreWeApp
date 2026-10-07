<template>
  <div class="ds-page ingd">
    <header class="ds-head">
      <div class="ds-head-titles">
        <span class="ingd-breadcrumb">Gerencia · Reporte completo</span>
        <h1 class="ds-title">Resumen por líneas de negocio</h1>
        <p class="ds-sub">Ingreso y ventas de {{ R.period.label }} por línea, comparado con {{ R.period.prevLabel }}</p>
      </div>
      <div class="ds-head-actions">
        <!-- Mismo paso de mes que Gerencia > Objetivos: el módulo se recorre igual. -->
        <div class="ingd-mes">
          <button type="button" class="ingd-mes-paso" aria-label="Mes anterior" title="Mes anterior" @click="shiftMonth(-1)">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <span class="ingd-mes-label" aria-live="polite">{{ R.period.label }}</span>
          <button type="button" class="ingd-mes-paso" aria-label="Mes siguiente" title="Mes siguiente" @click="shiftMonth(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Banda de lectura rápida: los totales del mes, el elemento fuerte del reporte -->
    <section class="ds-band" :aria-label="`Totales de ${R.period.label}`">
      <div class="ds-band-item">
        <span class="ds-band-label">Ingreso total</span>
        <span class="ds-band-value">{{ loading ? '—' : formatValue(R.totals.ingresos, 'soles') }}</span>
        <span class="ds-band-text">
          <span v-if="!loading" class="ingd-band-delta">{{ deltaTxt(R.totals.varMoM) }}</span>
          vs. {{ R.period.prevLabel }}
        </span>
      </div>
      <div class="ds-band-item">
        <span class="ds-band-label">N° de ventas</span>
        <span class="ds-band-value">{{ loading ? '—' : formatValue(R.totals.ventas, 'num') }}</span>
        <span class="ds-band-text">Transacciones del periodo</span>
      </div>
      <div class="ds-band-item">
        <span class="ds-band-label">Ticket promedio</span>
        <span class="ds-band-value">{{ loading ? '—' : formatValue(R.totals.ticket, 'soles') }}</span>
        <span class="ds-band-text">Ingreso ÷ ventas</span>
      </div>
      <div class="ds-band-item">
        <span class="ds-band-label">Cumplimiento del objetivo</span>
        <span class="ds-band-value">{{ loading ? '—' : R.totals.cumplimiento + '%' }}</span>
        <div class="ds-band-bar"><i :style="{ width: Math.min(100, R.totals.cumplimiento) + '%' }"></i></div>
        <span class="ds-band-text">Meta {{ formatValue(R.totals.objetivo, 'soles') }}</span>
      </div>
    </section>

    <!-- KPIs por línea de negocio -->
    <div class="ds-kpis">
      <template v-if="loading">
        <div v-for="n in 4" :key="'sk' + n" class="ds-kpi ingd-linea">
          <div class="ingd-linea-head">
            <span class="ds-kpi-icon" aria-hidden="true"></span>
            <div class="ds-kpi-body ingd-grow">
              <span class="ds-skel" style="width: 70%"></span>
              <span class="ds-skel" style="width: 50%; height: 11px; margin-top: 6px"></span>
            </div>
          </div>
          <span class="ds-skel" style="width: 60%; height: 24px"></span>
          <span class="ds-skel" style="width: 80%"></span>
        </div>
      </template>
      <template v-else>
        <div v-for="l in R.lines" :key="l.key" class="ds-kpi ingd-linea" :style="{ '--lc': l.color }">
          <div class="ingd-linea-head">
            <span class="ds-kpi-icon ingd-linea-icon" aria-hidden="true" v-html="ic[l.key]"></span>
            <div class="ds-kpi-body ingd-grow">
              <span class="ingd-linea-nombre">{{ l.name }}</span>
              <span class="ds-kpi-note">{{ l.desc }}</span>
            </div>
            <span class="ingd-share" title="Participación en el ingreso total">{{ pct(l.ingresos, R.totals.ingresos) }}%</span>
          </div>
          <div>
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ solesK(l.ingresos) }}</span>
              <span class="ds-trend" :class="l.varMoM >= 0 ? 'ok' : 'bad'">{{ deltaTxt(l.varMoM) }}</span>
            </div>
            <span class="ds-kpi-label">Ingresos · vs. {{ R.period.prevLabel }}</span>
          </div>
          <dl class="ingd-linea-stats">
            <div><dt>Ventas</dt><dd>{{ formatValue(l.ventas, 'num') }}</dd></div>
            <div><dt>Ticket prom.</dt><dd>{{ formatValue(l.ticket, 'soles') }}</dd></div>
            <div><dt>De la meta</dt><dd>{{ l.cumplimiento }}%</dd></div>
          </dl>
        </div>
      </template>
    </div>

    <div class="ds-row ds-row--mitad">
      <!-- Composición -->
      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿De qué línea viene el ingreso?</h3>
            <p class="ds-panel-sub">Participación de cada línea en el total del mes</p>
          </div>
        </header>
        <div class="ds-panel-body">
          <template v-if="loading">
            <span class="ds-skel" style="height: 26px"></span>
            <span v-for="n in 4" :key="'skc' + n" class="ds-skel" style="margin-top: 12px"></span>
          </template>
          <template v-else>
            <div class="ingd-stacked" role="img"
                 :aria-label="`Composición de ingresos de ${R.period.label}: ` + R.lines.map((l) => `${l.name} ${pct(l.ingresos, R.totals.ingresos)}%`).join(', ')">
              <i v-for="l in R.lines" :key="l.key"
                 :style="{ width: pct(l.ingresos, R.totals.ingresos) + '%', background: l.color }"
                 :data-tip="l.name.replace('Línea ', '') + ' — ' + formatValue(l.ingresos, 'soles') + ' (' + pct(l.ingresos, R.totals.ingresos) + '%)'"></i>
            </div>
            <div class="ingd-leyenda">
              <div v-for="l in R.lines" :key="l.key" class="ingd-leyenda-fila">
                <span class="ingd-sw" :style="{ background: l.color }" aria-hidden="true"></span>
                <span class="ingd-leyenda-nombre">{{ l.name }}</span>
                <span class="ingd-leyenda-monto">{{ formatValue(l.ingresos, 'soles') }}</span>
                <span class="ingd-leyenda-pct">{{ pct(l.ingresos, R.totals.ingresos) }}%</span>
              </div>
            </div>
          </template>
        </div>
      </article>

      <!-- Tendencia semanal -->
      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿Cómo se repartió el ingreso por semana?</h3>
            <p class="ds-panel-sub">Ingresos por semana y línea · {{ R.period.label }}</p>
          </div>
        </header>
        <div class="ds-panel-body">
          <span v-if="loading" class="ds-skel" style="height: 190px"></span>
          <template v-else>
            <div class="ingd-trend" role="img" :aria-label="`Ingresos por semana y línea de ${R.period.label}`">
              <div v-for="(wk, wi) in weeks" :key="wk" class="ingd-trend-col">
                <div class="ingd-trend-barras">
                  <div v-for="l in R.lines" :key="l.key" class="ingd-tbar"
                       :style="{ height: ((l.weekly[wi]?.ingresos || 0) / weeklyMax * 100) + '%', background: l.color }"
                       :data-tip="l.name.replace('Línea ', '') + ' · ' + wk + ' — ' + formatValue(l.weekly[wi]?.ingresos || 0, 'soles')"></div>
                </div>
                <div class="ingd-trend-x">{{ wk }}</div>
              </div>
            </div>
            <div class="ingd-trend-leyenda">
              <span v-for="l in R.lines" :key="l.key">
                <span class="ingd-sw" :style="{ background: l.color }" aria-hidden="true"></span>{{ l.name.replace('Línea ', '') }}
              </span>
            </div>
          </template>
        </div>
      </article>
    </div>

    <!-- Detalle -->
    <section class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h3 class="ds-panel-title">¿Qué categoría y rubro aporta en cada línea?</h3>
          <p class="ds-panel-sub">Detalle de ingresos por línea, categoría y rubro</p>
        </div>
        <span class="ds-panel-hint">{{ R.period.label }} · S/. = ingreso · # = ventas</span>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa ingd-tabla">
            <thead>
              <tr>
                <th>Línea / Categoría / Rubro</th>
                <th class="num">S/. Ingreso</th>
                <th class="num"># Ventas</th>
                <th class="num">Ticket prom.</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loading">
                <tr v-for="n in 8" :key="'skr' + n">
                  <td colspan="4"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <tr v-else-if="!R.lines.length">
                <td colspan="4" class="ds-empty ds-empty--lista">No hay ingresos registrados en {{ R.period.label }}. Cambia el mes arriba.</td>
              </tr>
              <template v-else>
                <template v-for="l in R.lines" :key="l.key">
                  <tr :class="['ingd-linea-fila', collapsed[l.key] ? 'is-plegada' : '']" :style="{ '--lc': l.color }">
                    <td>
                      <div class="ingd-lh">
                        <button class="ingd-caret" type="button"
                                :aria-label="(collapsed[l.key] ? 'Desplegar ' : 'Plegar ') + l.name"
                                :aria-expanded="String(!collapsed[l.key])" @click="toggle(l.key)">
                          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                        </button>
                        <span class="ingd-swz" aria-hidden="true"></span>
                        <span class="ingd-lh-nombre">{{ l.name }}</span>
                      </div>
                    </td>
                    <td class="num">{{ formatValue(l.ingresos, 'soles') }}</td>
                    <td class="num">{{ formatValue(l.ventas, 'num') }}</td>
                    <td class="num ingd-gan">{{ formatValue(l.ticket, 'soles') }}</td>
                  </tr>
                  <template v-if="!collapsed[l.key]">
                    <template v-for="(g, gi) in l.grupos" :key="l.key + '-' + gi">
                      <tr class="ingd-grupo">
                        <td>{{ g.name }}</td>
                        <td class="num">{{ formatValue(g.ingresos, 'soles') }}</td>
                        <td class="num">{{ formatValue(g.ventas, 'num') }}</td>
                        <td class="num">{{ formatValue(g.ticket, 'soles') }}</td>
                      </tr>
                      <tr v-for="(it, ii) in g.items" :key="l.key + '-' + gi + '-' + ii" class="ingd-item">
                        <td>{{ it.name }}</td>
                        <td class="num">{{ formatValue(it.ingresos, 'soles') }}</td>
                        <td class="num">{{ formatValue(it.ventas, 'num') }}</td>
                        <td class="num">{{ formatValue(it.ticket, 'soles') }}</td>
                      </tr>
                    </template>
                  </template>
                </template>
              </template>
            </tbody>
            <tfoot v-if="!loading && R.lines.length">
              <tr>
                <td>Total general</td>
                <td class="num">{{ formatValue(R.totals.ingresos, 'soles') }}</td>
                <td class="num">{{ formatValue(R.totals.ventas, 'num') }}</td>
                <td class="num">{{ formatValue(R.totals.ticket, 'soles') }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>

    <p class="ds-callout warn">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>
        S/. = ingreso del rubro · # = número de ventas · Ticket promedio = ingreso ÷ ventas ·
        Línea B2C: data real (pagos del sistema) · B2B / Fundación / Adicionales: datos de ejemplo, pendientes de fuente.
      </span>
    </p>
  </div>
</template>

<script setup>
import { reactive, ref, computed, inject, onMounted, watch } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'

const marketing = inject(ServiceKeys.Marketing)

/* Color de identidad de cada línea: tokens del sistema de diseño, que ya cambian
   solos en modo oscuro. Fundación va en violeta y no en verde: el verde del
   sistema significa "bien" y aquí es solo una línea más. */
const LINES = {
  b2c:  { key: 'b2c',  name: 'Línea B2C',         desc: 'En Vivo · Online · Membresías', color: 'var(--ds-accent)' },
  b2b:  { key: 'b2b',  name: 'Línea B2B',         desc: 'Categorías propias · Convenios', color: 'var(--ds-cyan-ink)' },
  fund: { key: 'fund', name: 'Línea Fundación',   desc: 'Fundación WE',                   color: 'var(--ds-violet-ink)' },
  adic: { key: 'adic', name: 'Línea Adicionales', desc: 'Otros ingresos',                 color: 'var(--ds-orange-ink)' },
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
const solesK = (n) => 'S/ ' + (round0(n) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + 'K'
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
/* Mismo encabezado que Gerencia > Objetivos: el módulo se lee como un sistema. */
.ingd-breadcrumb { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); }
.ingd-grow { flex: 1; }

/* Paso de mes: dos flechas y la etiqueta, como un control único. */
.ingd-mes { display: flex; align-items: center; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface); }
.ingd-mes-paso { width: 32px; height: 32px; border: 0; background: none; cursor: pointer; color: var(--ds-ink-2); }
.ingd-mes-paso:hover { color: var(--ds-ink); background: var(--ds-surface-3); }
.ingd-mes-paso:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.ingd-mes-label { min-width: 124px; text-align: center; font-size: 13px; font-weight: 600; color: var(--ds-ink); }

/* Variación sobre el navy: el texto de la banda queda siempre sobre-marca. */
.ingd-band-delta { font-weight: 800; font-variant-numeric: tabular-nums; }

/* ── KPIs por línea ─────────────────────────────────────────────────────── */
/* La tarjeta apila cabecera, cifra y métricas; la franja izquierda es el color de
   identidad de la línea, el mismo de la composición y de la tabla. */
.ingd-linea { position: relative; overflow: hidden; flex-direction: column; align-items: stretch; gap: 12px; }
.ingd-linea::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--lc, var(--ds-border)); }
.ingd-linea-head { display: flex; align-items: flex-start; gap: 12px; }
.ingd-linea-icon { background: color-mix(in oklab, var(--lc) 15%, transparent); color: var(--lc); }
.ingd-linea-nombre { display: block; font-size: 14px; font-weight: 800; color: var(--ds-heading); }
.ingd-share { margin-left: auto; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--lc); background: color-mix(in oklab, var(--lc) 12%, transparent); border-radius: var(--ds-radius-sm); padding: 3px 9px; }
.ingd-linea-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; padding-top: 12px; border-top: 1px solid var(--ds-border); }
.ingd-linea-stats dt { font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.ingd-linea-stats dd { margin: 2px 0 0; font-size: 14px; font-weight: 700; color: var(--ds-ink); font-variant-numeric: tabular-nums; }

/* ── Composición ────────────────────────────────────────────────────────── */
.ingd-stacked { display: flex; gap: 2px; height: 26px; margin-bottom: 16px; }
.ingd-stacked > i { height: 100%; transition: width 0.5s; }
.ingd-stacked > i:first-child { border-radius: var(--ds-radius-sm) 0 0 var(--ds-radius-sm); }
.ingd-stacked > i:last-child { border-radius: 0 var(--ds-radius-sm) var(--ds-radius-sm) 0; }
.ingd-leyenda { display: flex; flex-direction: column; gap: 11px; }
.ingd-leyenda-fila { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.ingd-sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; flex: none; }
.ingd-leyenda-nombre { flex: 1; font-weight: 600; color: var(--ds-ink); }
.ingd-leyenda-monto { min-width: 96px; text-align: right; font-weight: 700; white-space: nowrap; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.ingd-leyenda-pct { width: 44px; text-align: right; font-size: 12px; font-weight: 600; color: var(--ds-muted); font-variant-numeric: tabular-nums; }

/* ── Tendencia semanal ──────────────────────────────────────────────────── */
.ingd-trend { display: flex; align-items: flex-end; gap: 20px; height: 190px; padding: 24px 4px 0; }
.ingd-trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.ingd-trend-barras { display: flex; gap: 4px; align-items: flex-end; height: 100%; width: 100%; justify-content: center; }
.ingd-tbar { flex: 1; max-width: 16px; border-radius: 4px 4px 0 0; transition: height 0.5s; }
.ingd-trend-x { font-size: 12px; font-weight: 700; color: var(--ds-ink-2); }
.ingd-trend-leyenda { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin-top: 14px; font-size: 12px; font-weight: 600; color: var(--ds-ink-2); }
.ingd-trend-leyenda .ingd-sw { margin-right: 6px; }

/* Tooltip al pasar el mouse: --ds-ink / --ds-surface se invierten solos en oscuro. */
.ingd-tbar, .ingd-stacked > i { position: relative; }
.ingd-tbar:hover, .ingd-stacked > i:hover { filter: brightness(1.12); z-index: 3; }
.ingd-tbar::after, .ingd-stacked > i::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 9px); left: 50%;
  transform: translateX(-50%) translateY(3px); background: var(--ds-ink); color: var(--ds-surface);
  font-size: 11.5px; font-weight: 700; font-style: normal; white-space: nowrap;
  padding: 6px 11px; border-radius: var(--ds-radius-sm);
  opacity: 0; pointer-events: none; transition: opacity 0.13s, transform 0.13s;
}
.ingd-tbar::before, .ingd-stacked > i::before {
  content: ''; position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%) translateY(3px);
  border: 5px solid transparent; border-top-color: var(--ds-ink); border-bottom: none;
  opacity: 0; pointer-events: none; transition: opacity 0.13s, transform 0.13s;
}
.ingd-tbar:hover::after, .ingd-stacked > i:hover::after,
.ingd-tbar:hover::before, .ingd-stacked > i:hover::before { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ── Tabla de detalle ───────────────────────────────────────────────────── */
.ingd-tabla th { background: var(--ds-surface-2); padding-left: 12px; }
.ingd-tabla td { padding-left: 12px; }
.ingd-linea-fila td { background: color-mix(in oklab, var(--lc) 7%, var(--ds-surface)); font-weight: 800; color: var(--ds-heading); }
.ingd-lh { display: flex; align-items: center; gap: 10px; }
.ingd-caret { width: 22px; height: 22px; border: 0; background: transparent; color: var(--ds-ink-2); display: grid; place-items: center; border-radius: var(--ds-radius-sm); cursor: pointer; font-size: 11px; }
.ingd-caret:hover { background: var(--ds-surface-3); color: var(--ds-ink); }
.ingd-caret:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.ingd-caret i { transition: transform 0.18s; }
.is-plegada .ingd-caret i { transform: rotate(-90deg); }
.ingd-swz { width: 8px; height: 18px; border-radius: 3px; background: var(--lc); }
.ingd-lh-nombre { font-size: 13.5px; }
.ingd-linea-fila td.ingd-gan { color: var(--lc); }
.ingd-grupo td { background: var(--ds-surface-2); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); }
.ingd-grupo td:first-child { padding-left: 44px; color: var(--ds-ink-2); }
.ingd-item td:first-child { padding-left: 44px; font-weight: 500; color: var(--ds-ink-2); }
.ingd-item:hover td { background: var(--ds-surface-2); }
.ingd-tabla tfoot td { font-weight: 800; color: var(--ds-heading); background: var(--ds-surface-3); border-top: 2px solid var(--ds-border-strong); }

@media (prefers-reduced-motion: reduce) {
  .ingd-stacked > i, .ingd-tbar, .ingd-caret i,
  .ingd-tbar::after, .ingd-stacked > i::after,
  .ingd-tbar::before, .ingd-stacked > i::before { transition: none; }
}
</style>
