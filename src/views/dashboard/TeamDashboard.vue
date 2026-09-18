<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">{{ scope.area }}</h1>
        <p v-if="data?.resultados" class="ds-sub">Actualizado a las {{ actualizado }}</p>
        <p v-else class="ds-sub">Tu actividad de {{ mesActualNombre }}, actualizada el {{ fechaHoy }}</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="loading" @click="load">
          <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate'" aria-hidden="true"></i>
          {{ loading ? 'Cargando…' : 'Actualizar' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>
    <p v-else-if="loading && !data" class="ds-alert neutro">Cargando tu panel…</p>

    <!-- Líder (o ADMIN mirando un área): solo impacto. El uso del ERP lo ve el
         ADMIN en "Uso del sistema"; aquí confundía al líder. -->
    <template v-if="data?.resultados">
      <TeamResults :resultados="data.resultados" />
    </template>

    <!-- Colaborador: su propio uso del ERP. -->
    <template v-else-if="data">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-bolt"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ num(totalAcciones) }}</span>
              <span class="ds-trend" :class="deltaAcciones >= 0 ? 'ok' : 'bad'">
                {{ deltaAcciones >= 0 ? '↑' : '↓' }} {{ Math.abs(deltaAcciones) }}%
              </span>
            </div>
            <span class="ds-kpi-label">Acciones en {{ mesActualNombre }}</span>
            <span class="ds-kpi-note">vs. {{ num(totalAccionesPrev) }} el mes anterior</span>
          </div>
        </div>

        <div class="ds-kpi">
          <span class="ds-kpi-icon" :class="tonoActivos" aria-hidden="true"><i class="fa-solid fa-calendar-check"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ scope.isLeader ? activosHoy : (yo?.dias_activos ?? 0) }}</span>
              <span class="ds-trend" :class="tonoActivos">{{ pctActivos }}%</span>
            </div>
            <span class="ds-kpi-label">{{ scope.isLeader ? 'Activos hoy' : 'Días activos' }}</span>
            <span class="ds-kpi-note">{{ scope.isLeader ? `de ${equipo.length} personas` : 'de los días hábiles del mes' }}</span>
          </div>
        </div>

        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-clock"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ horaEquipo ?? '—' }}</span>
            <span class="ds-kpi-label">Hora típica de arranque</span>
            <span class="ds-kpi-note">Mediana de la primera huella, 30 días hábiles</span>
          </div>
        </div>

        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-list-check"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ num(accionesHoy) }}</span>
            <span class="ds-kpi-label">Movimientos de hoy</span>
            <span class="ds-kpi-note">{{ picoTexto }}</span>
          </div>
        </div>
      </div>

      <div class="ds-row ds-row--hero">
        <section class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">Jornada del {{ scope.isLeader ? 'equipo' : 'día' }}</h3>
              <p class="ds-panel-sub">Acciones típicas por hora, mediana de los últimos 30 días hábiles</p>
            </div>
          </header>
          <div class="ds-panel-body">
            <p v-if="!horas.some(h => h.acciones)" class="ds-empty">Sin actividad registrada en el período.</p>
            <div v-else class="horas">
              <div v-for="h in horas" :key="h.hora" class="hcol" :title="`${h.hora}:00 · ${h.acciones} acciones`">
                <div class="hbar" :class="{ pico: h.hora === horaPico }" :style="{ height: alturaHora(h.acciones) }"></div>
                <div class="hlbl" :class="{ pico: h.hora === horaPico }">{{ h.hora }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">En qué se trabaja</h3>
              <p class="ds-panel-sub">Registros tocados este mes</p>
            </div>
          </header>
          <div class="ds-panel-body">
            <p v-if="!data.porTabla.length" class="ds-empty">Sin movimientos este mes.</p>
            <div v-for="t in data.porTabla" :key="t.table_name" class="trow">
              <div class="tlbl">{{ t.label }}</div>
              <div class="ds-track"><i :style="{ width: pctDe(t.acciones, maxTabla) + '%' }"></i></div>
              <div class="tval">
                {{ num(t.acciones) }}
                <span class="tdelta" :class="t.acciones >= t.acciones_prev ? 'ok' : 'bad'">
                  {{ t.acciones >= t.acciones_prev ? '↑' : '↓' }}{{ Math.abs(t.acciones - t.acciones_prev) }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">{{ scope.isLeader ? 'Últimos movimientos del equipo' : 'Mis últimos movimientos' }}</h3>
          <RouterLink v-if="scope.isLeader" class="ds-panel-link" to="/configuracion/auditoria">
            Ver la bitácora completa <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </header>
        <div class="ds-panel-body">
          <p v-if="!data.movimientos.length" class="ds-empty">Todavía no hay movimientos registrados.</p>
          <div v-for="m in data.movimientos" :key="m.id" class="mov">
            <span class="mhora">{{ m.created_at }}</span>
            <span v-if="scope.isLeader" class="mquien">{{ m.name }}</span>
            <span class="maccion" :class="'a-' + m.action.toLowerCase()">{{ ACCIONES[m.action] ?? m.action }}</span>
            <span class="mque">{{ m.label }}</span>
            <span v-if="m.record_id" class="mid">#{{ m.record_id }}</span>
          </div>
        </div>
      </section>

      <!-- Colaborador: soporte, pero solo lo que el mismo reporto (no el area). -->
      <TeamResults v-if="data.misTickets" :resultados="data.misTickets" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { ServiceKeys } from '@/services'
import TeamResults from './TeamResults.vue'

// viewAs solo lo pasa Dashboard.vue cuando un ADMIN elige el panel de un líder.
const props = defineProps({ viewAs: { type: String, default: null } })

const dashboardService = inject(ServiceKeys.Dashboard)

const data = ref(null)
const loading = ref(false)
const error = ref('')
const actualizado = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardService.teamSummary(props.viewAs)
    actualizado.value = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    console.error('teamSummary:', e)
    error.value = e?.response?.data?.message || 'No se pudo cargar el panel.'
  } finally {
    loading.value = false
  }
}
// El ritmo del día ("enviadas hoy vs lo típico a esta hora") envejece solo: el
// panel se refresca cada 5 minutos para que el líder no tenga que recargar.
const REFRESCO_MS = 5 * 60 * 1000
let refresco = null
onMounted(() => {
  load()
  refresco = setInterval(load, REFRESCO_MS)
})
onUnmounted(() => clearInterval(refresco))

const ACCIONES = { INSERT: 'creó', UPDATE: 'editó', DELETE: 'eliminó', LOGIN: 'ingresó a' }

/* ── Formato ── */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const num = (n) => Math.round(n ?? 0).toLocaleString('es-PE')
const pctDe = (v, total) => (total ? Math.round((v / total) * 100) : 0)
const fechaHoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
const mesActualNombre = MESES[new Date().getMonth()]

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
const tonoActivos = computed(() => (pctActivos.value >= 90 ? 'ok' : pctActivos.value >= 60 ? 'warn' : 'bad'))

const maxTabla = computed(() => Math.max(1, ...(data.value?.porTabla ?? []).map(t => t.acciones)))
const maxHora = computed(() => Math.max(1, ...horas.value.map(h => h.acciones)))
const alturaHora = (n) => Math.max(3, Math.round((n / maxHora.value) * 100)) + '%'

const horaPico = computed(() => horas.value.reduce((mejor, h) => (h.acciones > (mejor?.acciones ?? -1) ? h : mejor), null)?.hora ?? null)
const picoTexto = computed(() => (horaPico.value === null || !maxHora.value
  ? 'Sin actividad registrada'
  : `Hora más cargada: ${horaPico.value}:00`))

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
</script>

<style scoped>
/* Página, tarjetas, paneles y colores: sistema de diseño (styles/design-system.css).
   Aquí solo lo propio de "Mi día a día". */
.horas { display: flex; align-items: flex-end; gap: 6px; height: 170px; }
.hcol { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
.hbar { border-radius: 4px 4px 0 0; background: var(--ds-bar); transition: 0.2s; }
.hbar.pico { background: var(--ds-accent); }
.hlbl { margin-top: 6px; font-size: 10.5px; text-align: center; color: var(--ds-muted); }
.hlbl.pico { font-weight: 700; color: var(--ds-heading); }

.trow { display: grid; grid-template-columns: 1fr 70px auto; align-items: center; gap: 10px; }
.trow + .trow { margin-top: 12px; }
.tlbl { font-size: 13px; color: var(--ds-ink-2); }
.tval { font-size: 13px; font-weight: 700; color: var(--ds-heading); white-space: nowrap; }
.tdelta { margin-left: 4px; font-size: 11px; font-weight: 700; }
.tdelta.ok { color: var(--ds-ok-ink); }
.tdelta.bad { color: var(--ds-bad-ink); }

.mov { display: flex; align-items: baseline; flex-wrap: wrap; gap: 9px; padding: 8px 0; border-top: 1px solid var(--ds-border); font-size: 13px; }
.mov:first-child { border-top: 0; padding-top: 0; }
.mhora { min-width: 82px; font-size: 12px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.mquien { font-weight: 700; color: var(--ds-heading); }
.maccion { font-weight: 600; }
.a-insert { color: var(--ds-ok-ink); }
.a-update { color: var(--ds-warn-ink); }
.a-delete { color: var(--ds-bad-ink); }
.a-login, .mque { color: var(--ds-ink-2); }
.mid { font-size: 12px; color: var(--ds-muted); }
</style>
