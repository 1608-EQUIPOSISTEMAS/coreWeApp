<template>
  <div class="admin-dash">
    <!-- Líderes y colaboradores: su panel de equipo / su día a día -->
    <TeamDashboard v-if="!isAdmin" />

    <template v-else>
      <!-- Header -->
      <div class="dc-head">
        <div>
          <div class="eyebrow">PANEL DE CONTROL · SISTEMA INTERNO</div>
          <h1>Dashboard de uso</h1>
          <div class="sub">Actualizado {{ fechaHoy }} · datos de {{ mesActualNombre }}</div>
        </div>
        <div class="grow"></div>
        <button class="btn ghost" type="button" :disabled="loading" @click="load">
          <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
          {{ loading ? 'Cargando…' : 'Actualizar' }}
        </button>
        <button class="btn solid" type="button" @click="exportar">Exportar</button>
      </div>

      <template v-if="data">
        <!-- Health strip -->
        <div class="health">
          <div class="hl">
            <span class="dot" :style="{ background: salud.color, boxShadow: '0 0 0 4px ' + salud.halo }"></span>
            {{ salud.titulo }}
          </div>
          <div class="vr"></div>
          <div class="ht" v-html="salud.texto"></div>
        </div>

        <!-- KPI cards -->
        <div class="kpis">
          <div class="kcard">
            <div class="krow">
              <div class="klbl">ACTIVIDAD · {{ mesActualNombre.toUpperCase() }}</div>
              <span class="pill" :class="deltaAct >= 0 ? 'ok' : 'bad'">{{ arrow(deltaAct) }} {{ Math.abs(deltaAct) }}%</span>
            </div>
            <div class="kmain">
              <div class="knum">{{ num(actual.acciones) }}</div>
              <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark">
                <path :d="sparkPath(serieAct.map(m => m.acciones))" fill="none" stroke="#2f6bdb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="kfoot">
              <div class="kmeta"><span>Meta {{ num(metaAct) }}</span><span class="strong">{{ pctMetaAct }}%</span></div>
              <div class="ktrack"><i :style="{ width: Math.min(100, pctMetaAct) + '%', background: barColor(pctMetaAct) }"></i></div>
            </div>
          </div>

          <div class="kcard">
            <div class="krow">
              <div class="klbl">INGRESOS · {{ mesActualNombre.toUpperCase() }}</div>
              <span class="pill" :class="deltaIng >= 0 ? 'ok' : 'bad'">{{ arrow(deltaIng) }} {{ Math.abs(deltaIng) }}%</span>
            </div>
            <div class="kmain">
              <div class="knum">{{ solesK(ingActual.monto) }}</div>
              <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark">
                <path :d="sparkPath(serieIng.map(m => m.monto))" fill="none" stroke="#12a150" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="kfoot">
              <div class="kmeta"><span>Meta {{ solesK(metaIng) }}</span><span class="strong">{{ pctMetaIng }}%</span></div>
              <div class="ktrack"><i :style="{ width: Math.min(100, pctMetaIng) + '%', background: barColor(pctMetaIng) }"></i></div>
            </div>
          </div>

          <div class="kcard">
            <div class="krow">
              <div class="klbl">USUARIOS ACTIVOS</div>
              <span class="pill" :class="deltaUsr >= 0 ? 'ok' : 'bad'">{{ arrow(deltaUsr) }} {{ Math.abs(deltaUsr) }}</span>
            </div>
            <div class="kmain">
              <div class="knum">{{ actual.usuarios }}</div>
              <svg viewBox="0 0 120 34" preserveAspectRatio="none" class="spark">
                <path :d="sparkPath(serieAct.map(m => m.usuarios))" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="kfoot">
              <div class="kmeta"><span>Adopción · {{ data.usuariosHabilitados }} habilitados</span><span class="strong">{{ adopcion }}%</span></div>
              <div class="ktrack"><i :style="{ width: Math.min(100, adopcion) + '%', background: 'var(--c-green)' }"></i></div>
            </div>
          </div>

          <div class="kcard">
            <div class="krow">
              <div class="klbl">RECURRENCIA</div>
            </div>
            <div class="kmain">
              <div class="knum">{{ data.recurrencia }}%</div>
            </div>
            <div class="kfoot note">usuarios diarios / mensuales · <b>{{ data.recurrencia >= 50 ? 'base fiel' : 'uso esporádico' }}</b></div>
            <div class="kfoot note">hoy: {{ num(data.hoy?.inscripciones ?? 0) }} inscripciones ({{ soles(data.hoy?.monto ?? 0) }})</div>
          </div>
        </div>

        <!-- Trend + hourly -->
        <div class="grid-21">
          <div class="card trend-card">
            <div class="tc-head">
              <div class="c-title">Tendencia de actividad</div>
              <div class="legend">
                <span><i class="ln solid"></i>Acciones</span>
                <span><i class="ln dash"></i>Meta</span>
              </div>
            </div>
            <div class="tc-body">
              <svg viewBox="0 0 1000 380" class="trend-svg">
                <g stroke="#eef1f6" stroke-width="1" stroke-dasharray="4 5">
                  <line v-for="g in 4" :key="g" x1="60" :y1="gy(g - 1)" x2="960" :y2="gy(g - 1)" />
                </g>
                <g fill="#b6bccb" font-size="14" text-anchor="end" font-weight="500">
                  <text v-for="g in 4" :key="g" x="46" :y="gy(g - 1) + 5">{{ gridLabel(g - 1) }}</text>
                </g>
                <line x1="60" :y1="metaY" x2="960" :y2="metaY" stroke="#f0932b" stroke-width="2" stroke-dasharray="6 5" opacity="0.8" />
                <text x="66" :y="metaY - 8" fill="#c97a1a" font-size="13" font-weight="700">Meta {{ num(metaAct) }}</text>
                <defs>
                  <linearGradient id="dcArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2f6bdb" stop-opacity="0.14" />
                    <stop offset="100%" stop-color="#2f6bdb" stop-opacity="0.02" />
                  </linearGradient>
                </defs>
                <path :d="areaPath" fill="url(#dcArea)" />
                <path :d="linePath" fill="none" stroke="#1b2a5b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
                <g>
                  <circle v-for="(p, i) in trendPts" :key="i" :cx="p.x" :cy="p.y"
                          :r="i === trendPts.length - 1 ? 7 : 6"
                          :fill="i === trendPts.length - 1 ? (bajoMeta ? '#d64545' : '#12a150') : '#ffffff'"
                          :stroke="i === trendPts.length - 1 ? '#ffffff' : '#1b2a5b'" stroke-width="3" />
                </g>
                <g font-size="16" font-weight="700" text-anchor="middle">
                  <text v-for="(p, i) in trendPts" :key="i" :x="p.x" :y="p.y - 14"
                        :fill="i === trendPts.length - 1 ? (bajoMeta ? '#d64545' : '#12703a') : '#1b2a5b'">{{ kFmt(p.v) }}</text>
                </g>
                <g fill="#94a3b8" font-size="15" font-weight="600" text-anchor="middle">
                  <text v-for="(p, i) in trendPts" :key="i" :x="p.x" y="352">{{ p.mes }}</text>
                </g>
              </svg>
            </div>
            <div v-if="alertaTexto" class="tc-alert">⚠ {{ alertaTexto }}</div>
          </div>

          <div class="col-stack">
            <div class="card hours-card">
              <div class="c-title">Actividad por hora</div>
              <div class="c-sub">Mediana de acciones · día hábil, últimos 30 días</div>
              <div class="hours">
                <div v-for="h in horas" :key="h.hora" class="hcol">
                  <div class="hbar" :style="{ height: h.pct + '%', background: h.pct >= 75 ? 'var(--hbar-hi)' : 'var(--hbar-lo)' }"
                       :data-tip="h.hora + ':00 — ' + num(h.acciones) + ' acciones'"></div>
                </div>
              </div>
              <div class="haxis"><span v-for="t in ejesHora" :key="t">{{ t }}</span></div>
              <div class="hnote">
                Picos en <b>{{ franjasPico }}</b>. Fuera de esas franjas: ventana ideal de mantenimiento.
              </div>
            </div>

            <div class="card">
              <div class="c-title">Últimos ingresos</div>
              <div class="c-sub">{{ data.fuenteAccesos === 'logins' ? 'Últimos 5 usuarios en iniciar sesión' : 'Última actividad por usuario (los inicios de sesión se registran desde hoy)' }}</div>
              <div class="accesos">
                <div v-for="a in data.ultimosAccesos" :key="a.alias || a.name" class="acc-row">
                  <div class="uav">{{ String(a.name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() }}</div>
                  <div class="acc-info">
                    <div class="unm">{{ a.name }}</div>
                    <div class="urole">{{ a.alias || '—' }}</div>
                  </div>
                  <div class="acc-time">{{ fmtIngreso(a.ingreso) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Areas + top users -->
        <div class="grid-12">
          <div class="card">
            <div class="c-title">Uso por área</div>
            <div class="c-sub">% del tráfico · variación vs {{ mesPrevNombre }}</div>
            <div class="areas">
              <div v-for="(a, i) in data.modulos" :key="a.modulo" class="arow">
                <div class="atop">
                  <div class="aname"><span class="rank">{{ i + 1 }}</span>{{ a.modulo }}</div>
                  <div class="aval">
                    <span class="adelta" :style="{ color: deltaColor(a.deltaPts) }">{{ deltaPtsTxt(a.deltaPts) }}</span>
                    <span class="apct">{{ a.pct }}%</span>
                  </div>
                </div>
                <div class="atrack">
                  <i :style="{ width: a.pct + '%', background: AREA_COLORS[i % AREA_COLORS.length] }"
                     :data-tip="a.modulo + ' — ' + num(a.acciones) + ' acciones (' + a.pct + '%)'"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="card users-card">
            <div class="uc-head">
              <div class="c-title">Usuarios que más entran</div>
              <div class="c-sub m0">Top 5 · {{ mesActualNombre }}</div>
            </div>
            <table class="utable">
              <thead>
                <tr><th class="l">USUARIO</th><th>ÁREA</th><th>ACCIONES</th><th class="r">TEND.</th></tr>
              </thead>
              <tbody>
                <tr v-for="u in usuariosTop" :key="u.alias || u.name">
                  <td class="l">
                    <div class="ucell">
                      <div class="uav">{{ u.initials }}</div>
                      <div>
                        <div class="unm">{{ u.name }}</div>
                        <div class="urole">{{ u.alias || '—' }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="chip">{{ u.area }}</span></td>
                  <td>
                    <div class="usess">{{ num(u.acciones) }}</div>
                    <div class="utrack"><i :style="{ width: u.barPct + '%' }"></i></div>
                  </td>
                  <td class="r trend" :style="{ color: u.trendColor }">{{ u.trend }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Decisiones -->
        <div class="card">
          <div class="c-title">Decisiones recomendadas</div>
          <div class="c-sub">Priorizadas por impacto sobre el uso del sistema</div>
          <div class="decs">
            <div v-for="d in decisiones" :key="d.titulo" class="dcard">
              <div class="dtop">
                <span class="dtag" :style="{ background: d.tagBg, color: d.tagFg }">{{ d.tag }}</span>
                <span class="dimp">{{ d.impacto }}</span>
              </div>
              <div class="dtitle">{{ d.titulo }}</div>
              <div class="dtext">{{ d.texto }}</div>
              <div class="dfoot">Responsable · <b>{{ d.resp }}</b></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Skeleton de carga (silueta general: KPIs + charts) -->
      <template v-else-if="loading">
        <div class="kpis">
          <div v-for="n in 4" :key="'skk' + n" class="kcard">
            <span class="skel" style="width: 120px; height: 11px"></span>
            <span class="skel" style="width: 96px; height: 34px; margin-top: 14px"></span>
            <span class="skel" style="height: 6px; margin-top: 20px"></span>
          </div>
        </div>
        <div class="grid-21">
          <div class="card"><span class="skel skel-chart"></span></div>
          <div class="card"><span class="skel skel-chart"></span></div>
        </div>
        <div class="card"><span class="skel skel-chart"></span></div>
      </template>

      <div v-else-if="error" class="card error-card">
        <h2>No se pudo cargar el dashboard</h2>
        <p>{{ error }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { ServiceKeys } from '@/services'
import TeamDashboard from './TeamDashboard.vue'

const dashboardService = inject(ServiceKeys.Dashboard)

const user = JSON.parse(localStorage.getItem('user') || '{}')
const roles = user.roles || []
// Solo ADMIN ve el dashboard de uso; el resto ve el dashboard anterior.
const isAdmin = roles.includes('ADMIN')

const data = ref(null)
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardService.adminSummary()
  } catch (e) {
    console.error('adminSummary:', e)
    error.value = e?.response?.data?.message || 'Error de conexión con el servidor.'
  } finally {
    loading.value = false
  }
}
onMounted(() => { if (isAdmin) load() })
const exportar = () => window.print()

/* ── Formato ── */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const num = (n) => Math.round(n ?? 0).toLocaleString('es-PE')
const soles = (n) => 'S/ ' + Math.round(n ?? 0).toLocaleString('es-PE')
const solesK = (n) => 'S/ ' + ((n ?? 0) / 1000).toLocaleString('es-PE', { maximumFractionDigits: 0 }) + 'K'
const kFmt = (n) => (n >= 10000 ? (n / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + 'k' : num(n))
const arrow = (v) => (v >= 0 ? '↑' : '↓')
const mesCorto = (ym) => MES_CORTO[Number(ym?.split('-')[1]) - 1] ?? ym
const mesLargo = (ym) => MESES[Number(ym?.split('-')[1]) - 1] ?? ym
const fechaHoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })

/* ── Series ── */
const serieAct = computed(() => data.value?.actividadMensual ?? [])
const serieIng = computed(() => data.value?.ingresosMensuales ?? [])
const actual = computed(() => serieAct.value[serieAct.value.length - 1] ?? { acciones: 0, usuarios: 0, mes: '' })
const previo = computed(() => serieAct.value[serieAct.value.length - 2] ?? { acciones: 0, usuarios: 0 })
const ingActual = computed(() => serieIng.value[serieIng.value.length - 1] ?? { monto: 0 })
const ingPrevio = computed(() => serieIng.value[serieIng.value.length - 2] ?? { monto: 0 })
const mesActualNombre = computed(() => mesLargo(actual.value.mes))
const mesPrevNombre = computed(() => mesCorto(previo.value.mes ?? ''))

/* Proyección de fin de mes: ritmo diario actual × días del mes */
const hoyD = new Date()
const diasMes = new Date(hoyD.getFullYear(), hoyD.getMonth() + 1, 0).getDate()
const factorProy = diasMes / Math.max(1, hoyD.getDate())
const proyAct = computed(() => Math.round(actual.value.acciones * factorProy))
const proyIng = computed(() => Math.round(ingActual.value.monto * factorProy))

const deltaPct = (a, p) => (p ? Math.round(((a - p) / p) * 100) : 0)
const deltaAct = computed(() => deltaPct(proyAct.value, previo.value.acciones))
const deltaIng = computed(() => deltaPct(proyIng.value, ingPrevio.value.monto))
const deltaUsr = computed(() => (actual.value.usuarios ?? 0) - (previo.value.usuarios ?? 0))
const adopcion = computed(() => Math.round(((actual.value.usuarios ?? 0) / Math.max(1, data.value?.usuariosHabilitados ?? 1)) * 100))

/* ── Metas: tendencia de los meses completos + 20% de exigencia ──
   base = max(proyección lineal del siguiente mes, mediana de los últimos
   3 meses completos) — la mediana amortigua meses atípicos (importaciones). */
function computeMeta(vals) {
  const v = vals.filter((x) => x > 0)
  if (!v.length) return 0
  const n = v.length
  const xm = (n - 1) / 2
  const ym = v.reduce((a, b) => a + b, 0) / n
  let nu = 0, de = 0
  v.forEach((y, i) => { nu += (i - xm) * (y - ym); de += (i - xm) ** 2 })
  const proj = ym + (de ? nu / de : 0) * (n - xm)
  const last3 = v.slice(-3).slice().sort((a, b) => a - b)
  const mediana = last3[Math.floor(last3.length / 2)]
  const base = Math.max(proj, mediana)
  const step = base > 20000 ? 500 : base > 2000 ? 100 : 10
  return Math.ceil((base * 1.2) / step) * step
}
const completos = (serie, campo) => serie.slice(0, -1).map((m) => m[campo])
const metaAct = computed(() => computeMeta(completos(serieAct.value, 'acciones')))
const metaIng = computed(() => computeMeta(completos(serieIng.value, 'monto')))
const pctMetaAct = computed(() => (metaAct.value ? Math.round((proyAct.value / metaAct.value) * 100) : 0))
const pctMetaIng = computed(() => (metaIng.value ? Math.round((proyIng.value / metaIng.value) * 100) : 0))
const barColor = (p) => (p >= 95 ? 'var(--c-green)' : p >= 70 ? 'var(--c-amber)' : 'var(--c-red)')
const bajoMeta = computed(() => proyAct.value < metaAct.value)

/* ── Sparkline ── */
function sparkPath(vals) {
  if (!vals?.length) return ''
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals)
  const range = Math.max(1, max - min)
  return vals
    .map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * 120
      const y = 30 - ((v - min) / range) * 26
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
    })
    .join(' ')
}

/* ── Gráfica de tendencia (SVG 1000×380) ── */
const T = 40, B = 320, L = 60, R = 960
const yMax = computed(() => Math.max(1, ...serieAct.value.map((m) => m.acciones), metaAct.value) * 1.06)
const yOf = (v) => B - ((B - T) * v) / yMax.value
const trendPts = computed(() => {
  const s = serieAct.value
  return s.map((m, i) => ({
    x: L + ((R - L) * i) / Math.max(1, s.length - 1),
    y: yOf(m.acciones),
    v: m.acciones,
    mes: mesCorto(m.mes)
  }))
})
const linePath = computed(() => trendPts.value.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '))
const areaPath = computed(() => (trendPts.value.length ? linePath.value + ` L${R},${B} L${L},${B} Z` : ''))
const metaY = computed(() => yOf(metaAct.value))
const gy = (i) => T + ((B - T) * i) / 3
const gridLabel = (i) => kFmt(Math.round((yMax.value * (3 - i)) / 3))
const alertaTexto = computed(() => {
  if (!serieAct.value.length) return ''
  const prom = Math.round(serieAct.value.slice(0, -1).reduce((a, m) => a + m.acciones, 0) / Math.max(1, serieAct.value.length - 1))
  if (!bajoMeta.value) return ''
  const gap = Math.round((1 - proyAct.value / metaAct.value) * 100)
  const sobreProm = proyAct.value >= prom ? ` Aún así, proyecta por encima del promedio del semestre (${kFmt(prom)}).` : ''
  return `${mesActualNombre.value} proyecta ${gap}% bajo la meta.${sobreProm}`
})

/* ── Actividad por hora (8h–21h) ── */
/* Horario laboral: 8:30–19:30 → se grafica 8h a 20h */
const horas = computed(() => {
  const byHour = Object.fromEntries((data.value?.actividadPorHora ?? []).map((h) => [h.hora, h.acciones]))
  const rango = Array.from({ length: 13 }, (_, i) => i + 8)
  const max = Math.max(1, ...rango.map((h) => byHour[h] ?? 0))
  return rango.map((h) => ({ hora: h, acciones: byHour[h] ?? 0, pct: Math.max(3, Math.round(((byHour[h] ?? 0) / max) * 100)) }))
})
const ejesHora = ['8h', '11h', '14h', '17h', '20h']

const fmtIngreso = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoy.toDateString()) return 'hoy · ' + hora
  if (d.toDateString() === ayer.toDateString()) return 'ayer · ' + hora
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) + ' · ' + hora
}
const franjasPico = computed(() => {
  const top = horas.value.filter((h) => h.pct >= 75).map((h) => h.hora)
  if (!top.length) return '—'
  const rangos = []
  let ini = top[0], fin = top[0]
  for (const h of top.slice(1)) {
    if (h === fin + 1) fin = h
    else { rangos.push([ini, fin]); ini = fin = h }
  }
  rangos.push([ini, fin])
  return rangos.map(([a, b]) => (a === b ? `${a}h` : `${a}–${b + 1}h`)).join(' y ')
})

/* ── Áreas y usuarios ── */
const AREA_COLORS = ['var(--c-navy-acc)', '#2f6bdb', 'var(--c-green)', 'var(--c-amber)', '#94a3b8', '#7c5cb8']
const deltaColor = (d) => (d > 0 ? 'var(--c-green)' : d < 0 ? 'var(--c-red)' : '#94a3b8')
const deltaPtsTxt = (d) => (d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${Math.abs(d)}` : '— 0')

const usuariosTop = computed(() => {
  const list = data.value?.topUsuarios ?? []
  const max = Math.max(1, ...list.map((u) => u.acciones))
  return list.map((u) => {
    // Ritmo diario actual vs mes anterior completo
    const rateNow = u.acciones / Math.max(1, hoyD.getDate())
    const ratePrev = (u.acciones_prev ?? 0) / diasMes
    const trend = !ratePrev ? '↑' : rateNow > ratePrev * 1.1 ? '↑' : rateNow < ratePrev * 0.9 ? '↓' : '→'
    return {
      ...u,
      initials: String(u.name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(),
      barPct: Math.round((u.acciones / max) * 100),
      trend,
      trendColor: trend === '↑' ? 'var(--c-green)' : trend === '↓' ? 'var(--c-red)' : '#94a3b8'
    }
  })
})

/* ── Salud y decisiones (reglas sobre los datos) ── */
const salud = computed(() => {
  const p = pctMetaAct.value
  const mods = data.value?.modulos ?? []
  const driver = mods.slice().sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts))[0]
  const driverTxt = driver
    ? ` El mayor movimiento viene de <b style="color:var(--c-navy-acc)">${driver.modulo}</b> (${driver.deltaPts > 0 ? '+' : ''}${driver.deltaPts} pts de participación).`
    : ''
  if (p >= 95) return { color: 'var(--c-green)', halo: 'var(--ok-soft)', titulo: 'En camino a la meta', texto: `La actividad proyectada alcanza el <b style="color:var(--c-green-deep)">${p}%</b> de la meta del mes.` + driverTxt }
  if (p >= 70) return { color: 'var(--c-amber)', halo: 'var(--warn-soft)', titulo: 'Uso estable — 1 alerta', texto: `La actividad proyectada llega al <b style="color:var(--c-amber-deep)">${p}%</b> de la meta del mes.` + driverTxt }
  return { color: 'var(--c-red)', halo: 'var(--bad-soft)', titulo: 'Bajo la meta', texto: `La actividad proyectada solo alcanza el <b style="color:var(--c-red)">${p}%</b> de la meta del mes.` + driverTxt }
})

const decisiones = computed(() => {
  const mods = data.value?.modulos ?? []
  const cards = []
  const caida = mods.filter((m) => m.deltaPts <= -3).sort((a, b) => a.deltaPts - b.deltaPts)[0]
  if (caida) {
    cards.push({
      tag: 'PRIORIDAD ALTA', tagBg: 'var(--bad-soft)', tagFg: 'var(--c-red)', impacto: 'Impacto ★★★',
      titulo: `Investigar la caída de ${caida.modulo}`,
      texto: `${caida.modulo} cae ${caida.deltaPts} pts de participación vs ${mesPrevNombre.value} y concentra la baja del mes. Revisar si es estacional o un bloqueo operativo.`,
      resp: `Líder ${caida.modulo}`
    })
  } else if (bajoMeta.value) {
    cards.push({
      tag: 'PRIORIDAD ALTA', tagBg: 'var(--bad-soft)', tagFg: 'var(--c-red)', impacto: 'Impacto ★★★',
      titulo: 'Cerrar la brecha contra la meta',
      texto: `La proyección del mes (${kFmt(proyAct.value)}) queda bajo la meta (${kFmt(metaAct.value)}). Revisar qué áreas pueden acelerar registro y seguimiento.`,
      resp: 'Gerencia'
    })
  }
  const crece = mods.filter((m) => m.deltaPts > 0).sort((a, b) => b.deltaPts - a.deltaPts)[0]
  if (crece) {
    cards.push({
      tag: 'OPORTUNIDAD', tagBg: 'var(--ok-soft)', tagFg: 'var(--c-green-deep)', impacto: 'Impacto ★★',
      titulo: `Escalar el modelo de ${crece.modulo}`,
      texto: `${crece.modulo} gana +${crece.deltaPts} pts y concentra ${crece.pct}% del uso. Documentar su flujo y replicarlo como estándar en las demás áreas.`,
      resp: 'Producto'
    })
  }
  cards.push({
    tag: 'EFICIENCIA', tagBg: 'var(--info-soft)', tagFg: 'var(--c-blue)', impacto: 'Esfuerzo bajo',
    titulo: 'Mover el mantenimiento',
    texto: `El uso se concentra en ${franjasPico.value}. Programar despliegues y cortes fuera de esas franjas para no golpear la operación.`,
    resp: 'TI / Infra'
  })
  return cards.slice(0, 3)
})
</script>

<style scoped>
.admin-dash {
  --navy: #1b2a5b;
  --blue: #2f6bdb;
  --green: #12a150;
  --amber: #f0932b;
  --red: #d64545;
  --border: #e6e9f0;
  --muted: #94a3b8;
  --muted-2: #8a93a5;
  --ink2: #64748b;
  /* tokens inyectados desde JS (mismos valores light de siempre) */
  --c-navy-acc: #1b2a5b;
  --c-blue: #2f6bdb;
  --c-green: #12a150;
  --c-green-deep: #12703a;
  --c-amber: #f0932b;
  --c-amber-deep: #c97a1a;
  --c-red: #d64545;
  --ok-soft: #e7f6ee;
  --warn-soft: #fdf0e2;
  --bad-soft: #fdecec;
  --info-soft: #eef2fb;
  --hbar-hi: #1b2a5b;
  --hbar-lo: #c9d6ec;
  color: #0f172a;
  padding: 2px 2px 1rem;
}
.grow { flex: 1; }
b { color: var(--navy); }

/* Header */
.dc-head { display: flex; align-items: flex-start; gap: 10px; margin: 4px 2px 18px; flex-wrap: wrap; }
.dc-head .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted-2); margin-bottom: 7px; }
.dc-head h1 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: var(--navy); }
.dc-head .sub { margin-top: 7px; font-size: 14px; color: var(--muted); }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: 0.15s; }
.btn.ghost { background: #fff; border: 1px solid var(--border); color: var(--ink2); }
.btn.ghost:hover:not(:disabled) { color: var(--navy); }
.btn.solid { background: var(--we-navy, #002060); border: none; color: #fff; }
.btn.solid:hover { background: var(--we-navy-dark, #001540); }

/* Health strip */
.health { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 14px 20px; background: #fff; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 22px; }
.health .hl { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; color: var(--navy); }
.health .dot { width: 9px; height: 9px; border-radius: 50%; }
.health .vr { width: 1px; height: 20px; background: var(--border); }
.health .ht { font-size: 14px; color: var(--ink2); }

/* KPI cards */
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 22px; }
@media (max-width: 1200px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
.kcard { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 20px 22px 18px; }
.krow { display: flex; align-items: center; justify-content: space-between; }
.klbl { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted-2); }
.pill { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 7px; font-size: 12px; font-weight: 700; }
.pill.ok { background: #e7f6ee; color: #12703a; }
.pill.bad { background: #fdecec; color: var(--red); }
.kmain { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 12px; gap: 8px; }
.knum { font-size: 34px; font-weight: 800; color: var(--navy); font-variant-numeric: tabular-nums; line-height: 1; }
.spark { width: 96px; height: 34px; flex: none; }
.kfoot { margin-top: 14px; }
.kfoot.note { margin-top: 10px; font-size: 12px; color: var(--muted); }
.kfoot.note b { color: #475569; }
.kmeta { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 5px; }
.kmeta .strong { color: #475569; font-weight: 600; }
.ktrack { height: 6px; background: #eef1f6; border-radius: 4px; overflow: hidden; }
.ktrack > i { display: block; height: 100%; border-radius: 4px; transition: width 0.4s; }

/* Layout grids */
.grid-21 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 22px; }
.grid-12 { display: grid; grid-template-columns: 1fr 1.25fr; gap: 20px; margin-bottom: 22px; }
@media (max-width: 1100px) { .grid-21, .grid-12 { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; }
.c-title { font-size: 16px; font-weight: 700; color: var(--navy); }
.c-sub { font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 4px; margin-bottom: 18px; }
.c-sub.m0 { margin-bottom: 0; }

/* Trend */
.trend-card { padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.tc-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px 0; }
.legend { display: flex; align-items: center; gap: 16px; font-size: 12px; font-weight: 600; color: var(--muted); }
.legend span { display: flex; align-items: center; gap: 6px; }
.legend .ln { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
.legend .ln.solid { background: var(--navy); }
.legend .ln.dash { height: 0; border-top: 2px dashed var(--amber); }
.tc-body { padding: 8px 18px 16px; }
.trend-svg { width: 100%; height: auto; display: block; }
.tc-alert { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 14px 26px; background: #fdf0f0; border-top: 1px solid #f7dede; font-size: 14px; color: #c23b3b; font-weight: 500; }

/* Hours */
.col-stack { display: flex; flex-direction: column; gap: 20px; }
.col-stack .card { flex: none; }
.hours-card { display: flex; flex-direction: column; }

/* Últimos ingresos */
.accesos { display: flex; flex-direction: column; }
.acc-row { display: flex; align-items: center; gap: 11px; padding: 10px 0; border-top: 1px solid #f0f2f6; }
.acc-row:first-child { border-top: none; }
.acc-info { flex: 1; min-width: 0; }
.acc-time { font-size: 12.5px; font-weight: 700; color: #475569; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hours { display: flex; align-items: flex-end; gap: 5px; height: 170px; margin-top: 8px; }
.hcol { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.hbar { width: 100%; border-radius: 4px 4px 2px 2px; min-height: 4px; position: relative; transition: height 0.4s; }
.haxis { display: flex; justify-content: space-between; font-size: 11px; color: #b6bccb; font-weight: 600; margin-top: 9px; }
.hnote { margin-top: 18px; padding: 13px 15px; background: #f7f9fc; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; color: #475569; line-height: 1.5; }

/* Areas */
.areas { margin-top: 2px; }
.arow { margin-bottom: 17px; }
.arow:last-child { margin-bottom: 0; }
.atop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.aname { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #334155; }
.aname .rank { font-size: 12px; font-weight: 800; color: #b6bccb; width: 16px; }
.aval { display: flex; align-items: center; gap: 10px; }
.adelta { font-size: 12px; font-weight: 700; }
.apct { font-size: 14px; font-weight: 800; color: var(--navy); font-variant-numeric: tabular-nums; width: 40px; text-align: right; }
.atrack { height: 10px; background: #eef1f6; border-radius: 6px; }
.atrack > i { display: block; height: 100%; border-radius: 6px; min-width: 4px; position: relative; transition: width 0.4s; }

/* Users table */
.users-card { padding: 22px 8px 12px; }
.uc-head { display: flex; align-items: center; justify-content: space-between; padding: 0 18px 8px; }
.utable { width: 100%; border-collapse: collapse; font-size: 14px; }
.utable th { padding: 10px 8px 8px; color: var(--muted-2); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-align: left; }
.utable th.l { padding-left: 18px; }
.utable th.r, .utable td.r { text-align: right; padding-right: 18px; }
.utable td { padding: 13px 8px; border-top: 1px solid #f0f2f6; }
.utable td.l { padding-left: 18px; }
.ucell { display: flex; align-items: center; gap: 11px; }
.uav { width: 32px; height: 32px; border-radius: 9px; background: #eef2fb; color: var(--navy); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex: none; }
.unm { font-weight: 600; color: var(--navy); }
.urole { font-size: 12px; color: var(--muted); }
.chip { display: inline-block; padding: 3px 10px; background: #f1f5f9; border-radius: 7px; font-size: 12px; font-weight: 600; color: #475569; }
.usess { font-weight: 700; color: var(--navy); font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.utrack { height: 5px; width: 88px; background: #eef1f6; border-radius: 3px; overflow: hidden; }
.utrack > i { display: block; height: 100%; background: var(--blue); border-radius: 3px; }
.trend { font-size: 16px; font-weight: 800; }

/* Decisions */
.decs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 2px; }
@media (max-width: 1100px) { .decs { grid-template-columns: 1fr; } }
.dcard { border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: #fbfcfe; display: flex; flex-direction: column; }
.dtop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.dtag { display: inline-flex; padding: 4px 10px; border-radius: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
.dimp { font-size: 11px; font-weight: 700; color: var(--muted); }
.dtitle { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
.dtext { font-size: 14px; color: var(--ink2); line-height: 1.55; flex: 1; }
.dfoot { margin-top: 16px; padding-top: 14px; border-top: 1px solid #eef1f6; font-size: 12px; color: var(--muted); }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-chart { height: 260px; border-radius: 10px; }

.error-card { text-align: center; padding: 50px 20px; }
.error-card h2 { font-weight: 800; color: var(--navy); }
.error-card p { color: var(--ink2); }

/* Tooltips (barras horarias y de área) */
.hbar::after, .atrack > i::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%) translateY(3px); background: #0f172a; color: #fff;
  font-size: 11.5px; font-weight: 700; white-space: nowrap;
  padding: 6px 11px; border-radius: 8px; box-shadow: 0 8px 24px -8px rgba(15, 23, 42, 0.4);
  opacity: 0; pointer-events: none; transition: opacity 0.13s, transform 0.13s; z-index: 5;
}
.hbar:hover::after, .atrack > i:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }
.hbar:hover, .atrack > i:hover { filter: brightness(1.1); }

/* ══════════ DARK MODE ══════════ */
[data-coreui-theme="dark"] .admin-dash {
  --navy: #8FAADC;
  --border: #2A2A22;
  --muted: #8A8A80;
  --muted-2: #8A8A80;
  --ink2: #A0A099;
  --c-navy-acc: #8FAADC;
  --c-blue: #60A5FA;
  --c-green: #34D399;
  --c-green-deep: #34D399;
  --c-amber: #FBBF24;
  --c-amber-deep: #FBBF24;
  --c-red: #F87171;
  --ok-soft: rgba(16, 185, 129, 0.14);
  --warn-soft: rgba(245, 158, 11, 0.14);
  --bad-soft: rgba(239, 68, 68, 0.14);
  --info-soft: rgba(59, 130, 246, 0.14);
  --hbar-hi: #8FAADC;
  --hbar-lo: rgba(143, 170, 220, 0.28);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .admin-dash .btn.ghost { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .admin-dash .btn.ghost:hover:not(:disabled) { color: #F4F4F0; }
[data-coreui-theme="dark"] .admin-dash .health,
[data-coreui-theme="dark"] .admin-dash .kcard,
[data-coreui-theme="dark"] .admin-dash .card { background: #1A1A14; }
[data-coreui-theme="dark"] .admin-dash .pill.ok { background: rgba(16, 185, 129, 0.14); color: #34D399; }
[data-coreui-theme="dark"] .admin-dash .pill.bad { background: rgba(239, 68, 68, 0.14); color: #F87171; }
[data-coreui-theme="dark"] .admin-dash .kfoot.note b,
[data-coreui-theme="dark"] .admin-dash .kmeta .strong,
[data-coreui-theme="dark"] .admin-dash .acc-time,
[data-coreui-theme="dark"] .admin-dash .hnote,
[data-coreui-theme="dark"] .admin-dash .chip { color: #C9C9C1; }
[data-coreui-theme="dark"] .admin-dash .ktrack,
[data-coreui-theme="dark"] .admin-dash .atrack,
[data-coreui-theme="dark"] .admin-dash .utrack { background: #24241E; }
[data-coreui-theme="dark"] .admin-dash .tc-alert { background: rgba(239, 68, 68, 0.12); border-top-color: rgba(239, 68, 68, 0.25); color: #F87171; }
[data-coreui-theme="dark"] .admin-dash .acc-row,
[data-coreui-theme="dark"] .admin-dash .utable td { border-top-color: #24241E; }
[data-coreui-theme="dark"] .admin-dash .haxis,
[data-coreui-theme="dark"] .admin-dash .aname .rank { color: #8A8A80; }
[data-coreui-theme="dark"] .admin-dash .hnote { background: #1F1F1A; }
[data-coreui-theme="dark"] .admin-dash .aname { color: #DDDDD6; }
[data-coreui-theme="dark"] .admin-dash .uav { background: rgba(143, 170, 220, 0.16); }
[data-coreui-theme="dark"] .admin-dash .chip { background: #24241E; }
[data-coreui-theme="dark"] .admin-dash .dcard { background: #1F1F1A; }
[data-coreui-theme="dark"] .admin-dash .dfoot { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .admin-dash .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
[data-coreui-theme="dark"] .admin-dash .hbar::after,
[data-coreui-theme="dark"] .admin-dash .atrack > i::after { background: #F4F4F0; color: #14140F; box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.5); }
/* SVG de tendencia: los colores van como atributos → se corrigen por selector de atributo */
[data-coreui-theme="dark"] .admin-dash .trend-svg g[stroke="#eef1f6"] { stroke: #2A2A22; }
[data-coreui-theme="dark"] .admin-dash .trend-svg g[fill="#b6bccb"] { fill: #8A8A80; }
[data-coreui-theme="dark"] .admin-dash .trend-svg path[stroke="#1b2a5b"] { stroke: #8FAADC; }
[data-coreui-theme="dark"] .admin-dash .trend-svg circle[stroke="#1b2a5b"] { stroke: #8FAADC; }
[data-coreui-theme="dark"] .admin-dash .trend-svg circle[fill="#ffffff"] { fill: #1A1A14; }
[data-coreui-theme="dark"] .admin-dash .trend-svg circle[stroke="#ffffff"] { stroke: #1A1A14; }
[data-coreui-theme="dark"] .admin-dash .trend-svg text[fill="#1b2a5b"] { fill: #8FAADC; }
[data-coreui-theme="dark"] .admin-dash .trend-svg text[fill="#c97a1a"] { fill: #FBBF24; }
[data-coreui-theme="dark"] .admin-dash .trend-svg text[fill="#12703a"] { fill: #34D399; }
[data-coreui-theme="dark"] .admin-dash .trend-svg text[fill="#d64545"] { fill: #F87171; }
[data-coreui-theme="dark"] .admin-dash .trend-svg circle[fill="#d64545"] { fill: #F87171; }
[data-coreui-theme="dark"] .admin-dash .trend-svg circle[fill="#12a150"] { fill: #34D399; }
</style>
