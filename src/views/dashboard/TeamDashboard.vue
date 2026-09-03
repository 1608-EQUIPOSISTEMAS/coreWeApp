<template>
  <div class="team-dash">
    <div class="td-head">
      <div>
        <div class="eyebrow">{{ scope.isLeader ? 'PANEL DE EQUIPO' : 'MI DÍA A DÍA' }} · SISTEMA INTERNO</div>
        <h1>{{ scope.area }}</h1>
        <div class="sub">Actualizado {{ fechaHoy }} · actividad de {{ mesActualNombre }}</div>
      </div>
      <div class="grow"></div>
      <button class="btn ghost" type="button" :disabled="loading" @click="load">
        <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
        {{ loading ? 'Cargando…' : 'Actualizar' }}
      </button>
    </div>

    <div v-if="error" class="alerta">{{ error }}</div>
    <div v-else-if="loading && !data" class="alerta neutro">Cargando tu panel…</div>

    <template v-if="data">
      <!-- KPIs -->
      <div class="kpis">
        <div class="kcard">
          <div class="klbl">ACCIONES · {{ mesActualNombre.toUpperCase() }}</div>
          <div class="kmain">
            <div class="knum">{{ num(totalAcciones) }}</div>
            <span class="pill" :class="deltaAcciones >= 0 ? 'ok' : 'bad'">
              {{ deltaAcciones >= 0 ? '↑' : '↓' }} {{ Math.abs(deltaAcciones) }}%
            </span>
          </div>
          <div class="knote">vs. {{ num(totalAccionesPrev) }} el mes anterior</div>
        </div>

        <div class="kcard">
          <div class="klbl">{{ scope.isLeader ? 'ACTIVOS HOY' : 'DÍAS ACTIVOS' }}</div>
          <div class="kmain">
            <div class="knum">{{ scope.isLeader ? activosHoy : (yo?.dias_activos ?? 0) }}</div>
            <span class="chip">{{ scope.isLeader ? `de ${equipo.length}` : 'este mes' }}</span>
          </div>
          <div class="ktrack"><i :style="{ width: pctActivos + '%', background: barColor(pctActivos) }"></i></div>
        </div>

        <div class="kcard">
          <div class="klbl">HORA TÍPICA DE ARRANQUE</div>
          <div class="kmain">
            <div class="knum">{{ horaEquipo ?? '—' }}</div>
          </div>
          <div class="knote">mediana de la primera huella del día · 30 días hábiles</div>
        </div>

        <div class="kcard">
          <div class="klbl">MOVIMIENTOS DE HOY</div>
          <div class="kmain">
            <div class="knum">{{ num(accionesHoy) }}</div>
          </div>
          <div class="knote">{{ picoTexto }}</div>
        </div>
      </div>

      <div class="grid-21">
        <!-- Jornada -->
        <div class="card">
          <div class="c-title">Jornada del {{ scope.isLeader ? 'equipo' : 'día' }}</div>
          <div class="c-sub">Acciones típicas por hora (mediana de los últimos 30 días hábiles)</div>
          <div class="horas">
            <div v-for="h in horas" :key="h.hora" class="hcol" :title="`${h.hora}:00 · ${h.acciones} acciones`">
              <div class="hbar" :style="{ height: alturaHora(h.acciones), background: h.hora === horaPico ? 'var(--td-navy)' : 'var(--td-bar)' }"></div>
              <div class="hlbl" :class="{ pico: h.hora === horaPico }">{{ h.hora }}</div>
            </div>
          </div>
          <div v-if="!horas.some(h => h.acciones)" class="vacio">Sin actividad registrada en el período.</div>
        </div>

        <!-- En qué trabaja -->
        <div class="card">
          <div class="c-title">En qué se trabaja</div>
          <div class="c-sub">Registros tocados este mes</div>
          <div v-if="!data.porTabla.length" class="vacio">Sin movimientos este mes.</div>
          <div v-for="t in data.porTabla" :key="t.table_name" class="trow">
            <div class="tlbl">{{ t.label }}</div>
            <div class="ttrack"><i :style="{ width: pctDe(t.acciones, maxTabla) + '%' }"></i></div>
            <div class="tval">
              {{ num(t.acciones) }}
              <span class="tdelta" :class="t.acciones >= t.acciones_prev ? 'ok' : 'bad'">
                {{ t.acciones >= t.acciones_prev ? '↑' : '↓' }}{{ Math.abs(t.acciones - t.acciones_prev) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Objetivos: solo las áreas que los tienen cargados en la BD -->
      <div v-if="data.metas.length" class="card">
        <div class="c-title">Objetivos del mes</div>
        <div class="c-sub">Meta de matrículas por asesor · fuente: metas comerciales</div>
        <div v-for="m in data.metas" :key="m.user_id" class="mrow">
          <div class="mname">{{ m.name }} <span class="malias">{{ m.alias }}</span></div>
          <div class="mtrack"><i :style="{ width: Math.min(100, pctDe(m.logrado, m.objetivo)) + '%', background: barColor(pctDe(m.logrado, m.objetivo)) }"></i></div>
          <div class="mval">{{ m.logrado }} <span class="mmeta">/ {{ m.objetivo }}</span></div>
          <div class="mpct" :class="claseMeta(pctDe(m.logrado, m.objetivo))">{{ pctDe(m.logrado, m.objetivo) }}%</div>
        </div>
      </div>

      <!-- Equipo -->
      <div v-if="scope.isLeader" class="card">
        <div class="c-title">Colaboradores</div>
        <div class="c-sub">Horario de trabajo y carga del mes · ordenado por actividad</div>
        <div class="tabla-scroll">
          <table class="tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Arranque típico</th>
                <th>Hoy</th>
                <th>Días activos</th>
                <th>Acciones del mes</th>
                <th>Trabaja en</th>
                <th>Última señal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in equipo" :key="p.user_id" :class="{ inactivo: !p.acciones && !p.acciones_prev }">
                <td>
                  <div class="pname">{{ p.name }}</div>
                  <div class="palias">{{ p.alias }}</div>
                </td>
                <td>
                  <span v-if="p.hora_tipica" class="hora" :class="tonoArranque(p.hora_tipica)">{{ p.hora_tipica }}</span>
                  <span v-else class="nd">sin registro</span>
                </td>
                <td>
                  <span v-if="p.inicio_hoy" class="hoy">{{ p.inicio_hoy }} – {{ p.ultimo_hoy }}</span>
                  <span v-else class="nd">no ha entrado</span>
                </td>
                <td class="cnum">{{ p.dias_activos }}</td>
                <td>
                  <div class="acc">
                    <span class="cnum">{{ num(p.acciones) }}</span>
                    <div class="atrack"><i :style="{ width: pctDe(p.acciones, maxAcciones) + '%' }"></i></div>
                  </div>
                </td>
                <td><span v-if="p.tabla_top" class="chip">{{ etiqueta(p.tabla_top) }}</span><span v-else class="nd">—</span></td>
                <td class="nd">{{ p.ultima_actividad ?? 'nunca' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Movimientos -->
      <div class="card">
        <div class="c-title">{{ scope.isLeader ? 'Últimos movimientos del equipo' : 'Mis últimos movimientos' }}</div>
        <div v-if="!data.movimientos.length" class="vacio">Todavía no hay movimientos registrados.</div>
        <div v-for="m in data.movimientos" :key="m.id" class="mov">
          <span class="mhora">{{ m.created_at }}</span>
          <span v-if="scope.isLeader" class="mquien">{{ m.name }}</span>
          <span class="maccion" :class="'a-' + m.action.toLowerCase()">{{ ACCIONES[m.action] ?? m.action }}</span>
          <span class="mque">{{ m.label }}</span>
          <span v-if="m.record_id" class="mid">#{{ m.record_id }}</span>
        </div>
        <RouterLink v-if="scope.isLeader" class="verlink" to="/configuracion/auditoria">
          Ver la bitácora completa <i class="fa-solid fa-arrow-right"></i>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { ServiceKeys } from '@/services'

const dashboardService = inject(ServiceKeys.Dashboard)

const data = ref(null)
const loading = ref(false)
const error = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardService.teamSummary()
  } catch (e) {
    console.error('teamSummary:', e)
    error.value = e?.response?.data?.message || 'No se pudo cargar el panel.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const ACCIONES = { INSERT: 'creó', UPDATE: 'editó', DELETE: 'eliminó', LOGIN: 'ingresó a' }

/* ── Formato ── */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const num = (n) => Math.round(n ?? 0).toLocaleString('es-PE')
const pctDe = (v, total) => (total ? Math.round((v / total) * 100) : 0)
const fechaHoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const mesActualNombre = MESES[new Date().getMonth()]
const barColor = (p) => (p >= 90 ? 'var(--td-green)' : p >= 60 ? 'var(--td-amber)' : 'var(--td-red)')
const claseMeta = (p) => (p >= 90 ? 'ok' : p >= 60 ? 'warn' : 'bad')

/* ── Derivados ── */
const scope = computed(() => data.value?.scope ?? { area: '', isLeader: false })
const equipo = computed(() => data.value?.equipo ?? [])
const horas = computed(() => data.value?.actividadPorHora ?? [])
const yo = computed(() => equipo.value[0] ?? null)

const totalAcciones = computed(() => equipo.value.reduce((a, p) => a + p.acciones, 0))
const totalAccionesPrev = computed(() => equipo.value.reduce((a, p) => a + p.acciones_prev, 0))
const accionesHoy = computed(() => equipo.value.reduce((a, p) => a + p.acciones_hoy, 0))
const deltaAcciones = computed(() => pctDe(totalAcciones.value - totalAccionesPrev.value, totalAccionesPrev.value || 1))

const activosHoy = computed(() => equipo.value.filter(p => p.inicio_hoy).length)
const pctActivos = computed(() => (scope.value.isLeader
  ? pctDe(activosHoy.value, equipo.value.length)
  : pctDe(yo.value?.dias_activos ?? 0, diasHabilesTranscurridos())))

const maxAcciones = computed(() => Math.max(1, ...equipo.value.map(p => p.acciones)))
const maxTabla = computed(() => Math.max(1, ...(data.value?.porTabla ?? []).map(t => t.acciones)))
const maxHora = computed(() => Math.max(1, ...horas.value.map(h => h.acciones)))
const alturaHora = (n) => Math.max(3, Math.round((n / maxHora.value) * 100)) + '%'

const horaPico = computed(() => horas.value.reduce((mejor, h) => (h.acciones > (mejor?.acciones ?? -1) ? h : mejor), null)?.hora ?? null)
const picoTexto = computed(() => (horaPico.value === null || !maxHora.value
  ? 'sin actividad registrada'
  : `hora más cargada: ${horaPico.value}:00`))

// Hora de arranque del conjunto: la mediana de las medianas individuales. Se
// calcula en el cliente porque ya tenemos la fila de cada persona; una consulta
// más solo para esto sería un viaje a la BD por un dato derivado.
const horaEquipo = computed(() => {
  const minutos = equipo.value
    .map(p => p.hora_tipica)
    .filter(Boolean)
    .map(h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3)))
    .sort((a, b) => a - b)
  if (!minutos.length) return null
  const medio = minutos[Math.floor(minutos.length / 2)]
  return `${String(Math.floor(medio / 60)).padStart(2, '0')}:${String(medio % 60).padStart(2, '0')}`
})

// El semáforo del arranque es RELATIVO al propio equipo, no contra un horario
// de oficina: el ERP no sabe el turno de nadie, y marcar "tarde" contra una hora
// inventada sería acusar a alguien con un dato que no tenemos. Quien arranca más
// de una hora después de la mediana de su equipo se destaca, nada más.
function tonoArranque (horaTipica) {
  if (!horaEquipo.value) return ''
  const aMinutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3))
  return aMinutos(horaTipica) - aMinutos(horaEquipo.value) > 60 ? 'tarde' : ''
}

// Días hábiles del mes ya transcurridos: el denominador honesto de "días
// activos" (contra los 30 del mes daría siempre un porcentaje ridículo).
function diasHabilesTranscurridos () {
  const hoy = new Date()
  let habiles = 0
  for (let d = 1; d <= hoy.getDate(); d++) {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), d).getDay()
    if (dia !== 0 && dia !== 6) habiles++
  }
  return Math.max(1, habiles)
}

// El backend ya manda la etiqueta en porTabla y movimientos; la columna
// "Trabaja en" del equipo trae el nombre crudo de la tabla, así que se traduce
// con lo que ya vino en vez de pedir un diccionario aparte.
function etiqueta (tableName) {
  return data.value?.porTabla.find(t => t.table_name === tableName)?.label ?? tableName
}
</script>

<style scoped>
/* ponytail: estilos propios en vez de un sistema de diseño compartido con
   Dashboard.vue. Si aparece un tercer panel con este mismo lenguaje, ahí sí
   toca extraer las clases comunes a una hoja aparte. */
.team-dash {
  --td-navy: #1b2a5b;
  --td-green: #12a150;
  --td-amber: #f0932b;
  --td-red: #d64545;
  --td-border: #e6e9f0;
  --td-muted: #94a3b8;
  --td-ink2: #64748b;
  --td-bar: #c9d6ec;
  --td-card: #fff;
  color: #0f172a;
  padding: 2px 2px 1rem;
}
.grow { flex: 1; }

.td-head { display: flex; align-items: flex-start; gap: 10px; margin: 4px 2px 18px; flex-wrap: wrap; }
.td-head .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; color: var(--td-muted); margin-bottom: 7px; }
.td-head h1 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: var(--td-navy); }
.td-head .sub { margin-top: 7px; font-size: 14px; color: var(--td-muted); }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: 0.15s; }
.btn.ghost { background: #fff; border: 1px solid var(--td-border); color: var(--td-ink2); }
.btn.ghost:hover:not(:disabled) { color: var(--td-navy); }

.alerta { padding: 14px 18px; border-radius: 12px; background: #fdecec; color: var(--td-red); font-size: 14px; font-weight: 600; }
.alerta.neutro { background: #eef2fb; color: var(--td-ink2); }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 22px; }
.kcard { background: var(--td-card); border: 1px solid var(--td-border); border-radius: 12px; padding: 18px 20px; }
.klbl { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--td-muted); }
.kmain { display: flex; align-items: baseline; gap: 10px; margin: 10px 0 6px; }
.knum { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: var(--td-navy); }
.knote { font-size: 12px; color: var(--td-muted); }
.ktrack, .atrack, .ttrack, .mtrack { height: 6px; border-radius: 999px; background: #eef1f6; overflow: hidden; }
.ktrack i, .atrack i, .ttrack i, .mtrack i { display: block; height: 100%; border-radius: 999px; background: var(--td-navy); }
.pill { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.pill.ok { background: #e7f6ee; color: #12703a; }
.pill.bad { background: #fdecec; color: var(--td-red); }
.chip { font-size: 12px; font-weight: 600; color: var(--td-ink2); background: #eef2fb; padding: 2px 9px; border-radius: 999px; }

.grid-21 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 22px; }
.card { background: var(--td-card); border: 1px solid var(--td-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 22px; }
.c-title { font-size: 16px; font-weight: 700; color: var(--td-navy); }
.c-sub { font-size: 12.5px; color: var(--td-muted); margin: 4px 0 16px; }
.vacio { font-size: 13px; color: var(--td-muted); padding: 14px 0; }

.horas { display: flex; align-items: flex-end; gap: 6px; height: 170px; }
.hcol { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.hbar { border-radius: 4px 4px 0 0; transition: 0.2s; }
.hlbl { font-size: 10.5px; text-align: center; color: var(--td-muted); margin-top: 6px; }
.hlbl.pico { color: var(--td-navy); font-weight: 700; }

.trow { display: grid; grid-template-columns: 1fr 70px auto; align-items: center; gap: 10px; margin-bottom: 12px; }
.tlbl { font-size: 13px; color: var(--td-ink2); }
.tval { font-size: 13px; font-weight: 700; color: var(--td-navy); white-space: nowrap; }
.tdelta { font-size: 11px; font-weight: 700; margin-left: 4px; }
.tdelta.ok { color: #12703a; }
.tdelta.bad { color: var(--td-red); }

.mrow { display: grid; grid-template-columns: 1fr 140px 90px 52px; align-items: center; gap: 12px; margin-bottom: 11px; }
.mname { font-size: 13.5px; font-weight: 600; color: var(--td-navy); }
.malias { font-size: 11.5px; font-weight: 500; color: var(--td-muted); margin-left: 6px; }
.mval { font-size: 13px; font-weight: 700; color: var(--td-navy); text-align: right; }
.mmeta { font-weight: 500; color: var(--td-muted); }
.mpct { font-size: 12.5px; font-weight: 700; text-align: right; }
.mpct.ok { color: #12703a; } .mpct.warn { color: #c97a1a; } .mpct.bad { color: var(--td-red); }

.tabla-scroll { overflow-x: auto; }
.tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
.tabla th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--td-muted); padding: 0 12px 10px 0; white-space: nowrap; }
.tabla td { padding: 11px 12px 11px 0; border-top: 1px solid var(--td-border); vertical-align: middle; }
.tabla tr.inactivo { opacity: 0.5; }
.pname { font-weight: 600; color: var(--td-navy); }
.palias { font-size: 11.5px; color: var(--td-muted); }
.cnum { font-weight: 700; color: var(--td-navy); }
.nd { color: var(--td-muted); font-size: 12.5px; }
.hora { font-weight: 700; color: var(--td-navy); }
.hora.tarde { color: var(--td-amber); }
.hoy { font-weight: 600; color: #12703a; }
.acc { display: flex; align-items: center; gap: 10px; min-width: 130px; }
.acc .atrack { flex: 1; }

.mov { display: flex; align-items: baseline; gap: 9px; padding: 8px 0; border-top: 1px solid var(--td-border); font-size: 13px; flex-wrap: wrap; }
.mhora { color: var(--td-muted); font-size: 12px; font-variant-numeric: tabular-nums; min-width: 82px; }
.mquien { font-weight: 700; color: var(--td-navy); }
.maccion { font-weight: 600; }
.a-insert { color: #12703a; } .a-update { color: #c97a1a; } .a-delete { color: var(--td-red); } .a-login { color: var(--td-ink2); }
.mque { color: var(--td-ink2); }
.mid { color: var(--td-muted); font-size: 12px; }
.verlink { display: inline-flex; align-items: center; gap: 7px; margin-top: 14px; font-size: 13px; font-weight: 600; color: var(--td-navy); text-decoration: none; }
.verlink:hover { text-decoration: underline; }

@media (max-width: 1100px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .grid-21 { grid-template-columns: 1fr; }
}

[data-coreui-theme="dark"] .team-dash {
  --td-navy: #8FAADC;
  --td-border: #2A2A22;
  --td-muted: #8A8A80;
  --td-ink2: #A0A099;
  --td-bar: #3A4A66;
  --td-card: #1A1A14;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .team-dash .btn.ghost { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .team-dash .ktrack,
[data-coreui-theme="dark"] .team-dash .atrack,
[data-coreui-theme="dark"] .team-dash .ttrack,
[data-coreui-theme="dark"] .team-dash .mtrack { background: #24241E; }
[data-coreui-theme="dark"] .team-dash .chip,
[data-coreui-theme="dark"] .team-dash .alerta.neutro { background: rgba(143, 170, 220, 0.12); color: #C9C9C1; }
[data-coreui-theme="dark"] .team-dash .pill.ok { background: rgba(16, 185, 129, 0.14); color: #34D399; }
[data-coreui-theme="dark"] .team-dash .pill.bad,
[data-coreui-theme="dark"] .team-dash .alerta { background: rgba(239, 68, 68, 0.14); color: #F87171; }
[data-coreui-theme="dark"] .team-dash .hoy,
[data-coreui-theme="dark"] .team-dash .a-insert,
[data-coreui-theme="dark"] .team-dash .tdelta.ok,
[data-coreui-theme="dark"] .team-dash .mpct.ok { color: #34D399; }
[data-coreui-theme="dark"] .team-dash .mpct.warn,
[data-coreui-theme="dark"] .team-dash .a-update { color: #E9B872; }
</style>
