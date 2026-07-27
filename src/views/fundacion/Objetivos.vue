<script setup>
import { ref, computed } from 'vue'

// =====================================================================
// PRE-DISENO — DATOS MOCK
// =====================================================================
// Todo lo que hay debajo de este bloque es UI pura: lee de `data` y no
// sabe de donde salio. Cuando exista el SP, esto se reemplaza por una
// llamada al servicio y el resto del archivo no se toca.
//
// Forma esperada del payload (respetar nombres):
//   congresos:   [{ id, name }]
//   leadsReales: number                      -- badge del header
//   objetivoBase: number                     -- MANUAL, lo reparte % obj
//   areas:       [{ code, name, pctObj, avance, vip, premium, general,
//                   virtual, consultas, children? }]
//   pagos / asistentes: { avance, vip, premium, general, virtual, consultas }
//
// ponytail: mock inline en vez de fixture aparte; es un archivo, se borra
// en una linea cuando llegue el endpoint.
const MOCK = {
  leadsReales: 1000,
  objetivoBase: 243,
  congresos: [
    { id: null, name: 'Todos los congresos' },
    { id: 1, name: 'Congreso Internacional de Enfermería 2026' },
    { id: 2, name: 'Congreso de Salud Pública 2026' },
  ],
  areas: [
    { code: '1.1', name: 'Comercial',    pctObj: 34, avance: 16, vip: 8,  premium: 5,  general: 3,  virtual: 0, consultas: 80 },
    { code: '1.2', name: 'Marketing',    pctObj: 41, avance: 48, vip: 31, premium: 6,  general: 6,  virtual: 5, consultas: 1036 },
    { code: '1.3', name: 'Web',          pctObj: 5,  avance: 3,  vip: 1,  premium: 1,  general: 1,  virtual: 0, consultas: 0 },
    { code: '1.4', name: 'B2B',          pctObj: 5,  avance: 12, vip: 8,  premium: 2,  general: 1,  virtual: 1, consultas: 0 },
    {
      code: '1.5', name: 'Fundación WE', pctObj: 15, avance: 51, vip: 17, premium: 16, general: 16, virtual: 2, consultas: 0,
      children: [
        { code: '1.5.2', name: 'Ponentes',           avance: 22, vip: 14, premium: 0, general: 0, virtual: 8, consultas: 0 },
        { code: '1.5.3', name: 'Auspiciadores',      avance: 13, vip: 13, premium: 0, general: 0, virtual: 0, consultas: 0 },
        { code: '1.5.4', name: 'Invitado de Honor',  avance: 4,  vip: 4,  premium: 0, general: 0, virtual: 0, consultas: 0 },
        { code: '1.5.5', name: 'Invitado Especial',  avance: 15, vip: 8,  premium: 7, general: 0, virtual: 0, consultas: 0 },
        { code: '1.5.6', name: 'Prensa',             avance: 0,  vip: 0,  premium: 0, general: 0, virtual: 0, consultas: 0 },
      ],
    },
    {
      code: '1.7', name: 'Members', pctObj: 0, avance: 16, vip: 2, premium: 11, general: 0, virtual: 3, consultas: 0,
      children: [
        { code: '1.7.1', name: 'Member Plus',  avance: 0,  vip: 0, premium: 0,  general: 0, virtual: 0, consultas: 0 },
        { code: '1.7.2', name: 'Member Black', avance: 16, vip: 2, premium: 11, general: 0, virtual: 3, consultas: 0 },
        { code: '1.7.3', name: 'Member Gold',  avance: 0,  vip: 0, premium: 0,  general: 0, virtual: 0, consultas: 0 },
      ],
    },
  ],
  // Filas REAL del pie de tabla: vienen de pagos/leads, no del reparto manual.
  pagos:      { avance: 113, vip: 0, premium: 0, general: 9, virtual: 21, consultas: 0 },
  asistentes: { avance: 106, vip: 0, premium: 0, general: 9, virtual: 21, consultas: 0 },
}

const MODALIDADES = [
  { key: 'vip',     label: 'VIP',     color: '#f5a524' },
  { key: 'premium', label: 'Premium', color: '#ef6c4d' },
  { key: 'general', label: 'General', color: '#21a179' },
  { key: 'virtual', label: 'Virtual', color: '#9b6ef3' },
]

// =====================================================================
// ESTADO
// =====================================================================
const data = ref(structuredClone(MOCK))
const isLoading = ref(false)
const congresoId = ref(null)
const chartMetric = ref('modalidad')   // 'modalidad' | 'avance'
const modalidadFocus = ref(null)       // null = todas
const expanded = ref({ '1.5': true, '1.7': true })
const selectedRow = ref(null)

function refresh() {
  // ponytail: sin backend todavia; el spinner deja el hueco donde entra
  // la llamada al servicio y prueba que el skeleton no rompe el layout.
  isLoading.value = true
  setTimeout(() => { isLoading.value = false }, 450)
}

// =====================================================================
// DERIVADOS
// =====================================================================
// El objetivo por area es MANUAL: se reparte `objetivoBase` segun % Obj.
// Editar el % recalcula la fila y, con ella, el objetivo total.
function objVentas(area) {
  return Math.round((Number(area.pctObj) || 0) / 100 * data.value.objetivoBase)
}

const objetivoTotal = computed(() =>
  data.value.areas.reduce((acc, a) => acc + objVentas(a), 0),
)

const totalPagos      = computed(() => data.value.pagos.avance)
const totalAsistentes = computed(() => data.value.asistentes.avance)
const faltanPorSumar  = computed(() => Math.max(0, objetivoTotal.value - totalPagos.value))

const pctAsistentes = computed(() =>
  objetivoTotal.value ? Math.round(totalAsistentes.value / objetivoTotal.value * 100) : 0,
)
const pctPagos = computed(() =>
  objetivoTotal.value ? Math.round(totalPagos.value / objetivoTotal.value * 100) : 0,
)

// Conteo por modalidad = fila REAL de pagos, no la suma de areas.
const ventasPorModalidad = computed(() =>
  MODALIDADES.map(m => ({ ...m, value: Number(data.value.pagos[m.key]) || 0 })),
)
const ventasTotales = computed(() =>
  ventasPorModalidad.value.reduce((acc, m) => acc + m.value, 0),
)

// Serie del grafico segun la metrica activa.
const chartSeries = computed(() => {
  if (chartMetric.value === 'modalidad') {
    return ventasPorModalidad.value.map(m => ({
      key: m.key, label: m.label, color: m.color, value: m.value,
    }))
  }
  return data.value.areas.map(a => ({
    key: a.code,
    label: a.name,
    color: '#1b2a5b',
    value: a.avance,
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
const donut = computed(() => {
  const pagado = pctPagos.value
  return {
    pct: pagado,
    segments: [
      { key: 'pagos', color: '#1b2a5b', dash: `${pagado} ${100 - pagado}`, offset: 25 },
      { key: 'falta', color: '#e2cdad', dash: `${100 - pagado} ${pagado}`, offset: 25 - pagado },
    ],
    legend: [
      { key: 'pagos', name: 'Pagos', color: '#1b2a5b', count: totalPagos.value, pct: pagado },
      { key: 'falta', name: 'Falta', color: '#e2cdad', count: faltanPorSumar.value, pct: 100 - pagado },
    ],
  }
})

// Fila FALTA: objetivo menos lo real. El total sale del calculo; el desglose
// por modalidad viene fijo del mock.
// ponytail: los faltantes por modalidad son manuales porque el objetivo no
// esta repartido por modalidad todavia. Cuando el SP lo reparta:
// falta[k] = max(0, objetivoPorModalidad[k] - data.pagos[k]).
const filaFalta = computed(() => ({
  avance: faltanPorSumar.value,
  vip: 65, premium: 30, general: 18, virtual: 0, consultas: 0,
}))

function conversion(row) {
  if (!row.consultas) return '–'
  return (row.avance / row.consultas * 100).toFixed(2).replace('.', ',') + '%'
}

function toggleRow(area) {
  if (area.children) expanded.value[area.code] = !expanded.value[area.code]
  selectedRow.value = selectedRow.value === area.code ? null : area.code
}

function onPctInput(area, e) {
  const v = Number(String(e.target.value).replace(',', '.'))
  area.pctObj = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0
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
          <h1 class="ob-title">{{ data.congresos.find(c => c.id === congresoId)?.name || 'Todos los congresos' }}</h1>
        </div>
        <div class="ob-head-right">
          <span class="ob-live"><i class="fa-solid fa-circle"></i> {{ data.leadsReales.toLocaleString('es-PE') }} leads reales</span>
          <button class="ob-icon-btn" :disabled="isLoading" title="Actualizar" @click="refresh">
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': isLoading }"></i>
          </button>
        </div>
      </div>

      <div class="ob-filters">
        <div class="ob-filter">
          <span class="ob-flabel"><i class="fa-solid fa-filter"></i> CONGRESO</span>
          <select v-model="congresoId" class="ob-select">
            <option v-for="c in data.congresos" :key="c.id ?? 'all'" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="ob-legend">
          <span class="ob-flabel">LEYENDA</span>
          <span v-for="m in MODALIDADES" :key="m.key" class="ob-leg">
            <i class="fa-solid fa-circle" :style="{ color: m.color }"></i> {{ m.label }}
          </span>
          <span class="ob-tag ob-tag-real">REAL</span>
          <span class="ob-tag-hint">datos de leads</span>
          <span class="ob-tag ob-tag-manual">MANUAL</span>
          <span class="ob-tag-hint">objetivo por área</span>
        </div>
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
        <div class="ob-k-label">TOTAL ASISTENTES <span class="ob-tag ob-tag-real">REAL</span></div>
        <div class="ob-k-value">{{ totalAsistentes }} <span class="ob-k-of">de {{ objetivoTotal }}</span></div>
        <div class="ob-k-bar"><div class="ob-k-fill" :style="{ width: Math.min(100, pctAsistentes) + '%' }"></div></div>
        <div class="ob-k-foot">{{ pctAsistentes }}%</div>
      </div>

      <div class="ob-kpi">
        <div class="ob-k-label">TOTAL PAGOS <span class="ob-tag ob-tag-real">REAL</span></div>
        <div class="ob-k-value">{{ totalPagos }}</div>
        <div class="ob-k-foot">{{ pctPagos }}% del objetivo confirmado</div>
      </div>

      <div class="ob-kpi">
        <div class="ob-k-label">FALTAN POR SUMAR</div>
        <div class="ob-k-value ob-k-warn">{{ faltanPorSumar }}</div>
        <div class="ob-k-foot">objetivo – pagos confirmados</div>
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
            <h3 class="ob-card-title">{{ chartMetric === 'modalidad' ? 'Ventas confirmadas por modalidad' : 'Avance vs Objetivo por área' }}</h3>
            <p class="ob-card-sub">{{ chartMetric === 'modalidad' ? 'conteo real de pagos según modalidad del programa' : 'barra sólida = avance real · marca = objetivo manual' }}</p>
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
          <p class="ob-card-sub ob-right">pagos reales vs. faltantes, sobre {{ objetivoTotal }}</p>
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
              <th rowspan="2">% Obj <i class="fa-solid fa-pencil ob-pencil"></i></th>
              <th rowspan="2">Obj Ventas</th>
              <th rowspan="2">Avance Ventas</th>
              <th colspan="4" class="ob-th-group">CANALES DE VENTA (MODALIDAD)</th>
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
            <template v-for="area in data.areas" :key="area.code">
              <tr
                class="ob-row ob-row-parent"
                :class="{ selected: selectedRow === area.code }"
                @click="toggleRow(area)"
              >
                <td class="ob-td-name">
                  <i v-if="area.children" class="fa-solid ob-caret" :class="expanded[area.code] ? 'fa-caret-down' : 'fa-caret-right'"></i>
                  <span :class="{ 'ob-strong': !!area.children }">{{ area.code }} {{ area.name }}</span>
                </td>
                <td class="ob-num">
                  <input
                    class="ob-pct-input"
                    type="number" min="0" max="100"
                    :value="area.pctObj"
                    @click.stop
                    @input="onPctInput(area, $event)"
                  />
                  <span class="ob-pct-sign">%</span>
                </td>
                <td class="ob-num ob-muted">{{ objVentas(area) }}</td>
                <td class="ob-num ob-strong">{{ area.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(area[m.key])">{{ area[m.key] }}</td>
                <td class="ob-num">{{ area.consultas }}</td>
                <td class="ob-num">{{ conversion(area) }}</td>
              </tr>

              <tr
                v-for="child in (expanded[area.code] ? area.children || [] : [])"
                :key="child.code"
                class="ob-row ob-row-child"
              >
                <td class="ob-td-name ob-td-indent">{{ child.code }} {{ child.name }}</td>
                <td class="ob-num ob-muted">–</td>
                <td class="ob-num ob-muted">0</td>
                <td class="ob-num">{{ child.avance }}</td>
                <td v-for="m in MODALIDADES" :key="m.key" :class="cellClass(child[m.key])">{{ child[m.key] }}</td>
                <td class="ob-num">{{ child.consultas }}</td>
                <td class="ob-num ob-muted">{{ child.consultas ? conversion(child) : '0%' }}</td>
              </tr>
            </template>
          </tbody>

          <tfoot>
            <tr class="ob-foot ob-foot-navy">
              <td class="ob-td-name">TOTAL PAGOS <span class="ob-tag ob-tag-real">REAL</span></td>
              <td class="ob-num">{{ pctPagos }}%</td>
              <td class="ob-num">{{ objetivoTotal }}</td>
              <td class="ob-num">{{ totalPagos }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ data.pagos[m.key] }}</td>
              <td class="ob-num">{{ data.pagos.consultas }}</td>
              <td class="ob-num">0</td>
            </tr>
            <tr class="ob-foot ob-foot-navy">
              <td class="ob-td-name">TOTAL ASISTENTES <span class="ob-tag ob-tag-real">REAL</span></td>
              <td class="ob-num">100%</td>
              <td class="ob-num">{{ objetivoTotal }}</td>
              <td class="ob-num">{{ totalAsistentes }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ data.asistentes[m.key] }}</td>
              <td class="ob-num">{{ data.asistentes.consultas }}</td>
              <td class="ob-num">0</td>
            </tr>
            <tr class="ob-foot ob-foot-falta">
              <td class="ob-td-name">FALTA</td>
              <td class="ob-num">–</td>
              <td class="ob-num">0</td>
              <td class="ob-num">{{ filaFalta.avance }}</td>
              <td v-for="m in MODALIDADES" :key="m.key" class="ob-num">{{ filaFalta[m.key] }}</td>
              <td class="ob-num">0</td>
              <td class="ob-num">0</td>
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

.ob-pct-input {
  width: 42px; padding: 2px 4px; text-align: right; font-size: 13px;
  font-weight: 700; color: var(--ob-navy); background: transparent;
  border: 1px solid transparent; border-radius: 5px;
  font-variant-numeric: tabular-nums;
}
.ob-pct-input:hover { border-color: var(--ob-line); }
.ob-pct-input:focus { outline: none; border-color: var(--ob-navy); background: var(--ob-surface); }
/* el spinner nativo roba ancho y no aporta nada en una celda de tabla */
.ob-pct-input::-webkit-outer-spin-button,
.ob-pct-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ob-pct-input { -moz-appearance: textfield; }
.ob-pct-sign { font-size: 10px; color: var(--ob-mut); margin-left: 2px; }

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
[data-coreui-theme="dark"] .ob .ob-pct-input { color: #8FAADC; }
[data-coreui-theme="dark"] .ob .ob-tag-real { color: #34D399; }
[data-coreui-theme="dark"] .ob .ob-select,
[data-coreui-theme="dark"] .ob .ob-icon-btn { background: #1F1F1A; color: var(--ob-ink); }
[data-coreui-theme="dark"] .ob .ob-k-bar { background: #24241E; }
[data-coreui-theme="dark"] .ob .ob-k-fill { background: #8FAADC; }
[data-coreui-theme="dark"] .ob .ob-row-child { background: #1F1F1A; }
[data-coreui-theme="dark"] .ob .ob-row-parent.selected { background: #24241E; }
[data-coreui-theme="dark"] .ob .ob-donut svg circle[stroke="#eef1f6"] { stroke: #24241E; }
</style>
