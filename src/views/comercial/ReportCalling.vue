<template>
  <div class="lider-shell">

    <!-- ══ HEADER ══════════════════════════════════════════════ -->
    <header class="lider-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-accent"></div>
          <div>
            <span class="brand-eyebrow">Panel de Supervisión Comercial</span>
            <h1 class="brand-title">Dashboard Líder Comercial</h1>
          </div>
        </div>
        <button class="btn-refresh" @click="loadData" :disabled="isLoading">
          <svg :class="{ spin: isLoading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {{ isLoading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      <div class="masthead-filters">
        <div class="filter-chip">
          <span class="chip-label">AÑO</span>
          <select class="chip-select" v-model="filters.year" @change="loadData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-chip">
          <span class="chip-label">MES</span>
          <select class="chip-select" v-model="filters.month" @change="loadData">
            <option :value="0">Todo el año</option>
            <option v-for="m in meses" :key="m.v" :value="m.v">{{ m.l }}</option>
          </select>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-chip">
          <span class="chip-label">ASESOR</span>
          <select class="chip-select" v-model="filters.advisor" @change="loadData">
            <option value="all">Todos</option>
            <option v-for="u in filtroOwners" :key="u.id" :value="u.id">{{ u.description }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- ══ BODY ════════════════════════════════════════════════ -->
    <main class="lider-body">

      <!-- Loader -->
      <div v-if="isLoading" class="lider-loader">
        <div class="loader-pulse"></div>
        <span>Consultando registros...</span>
      </div>

      <div v-else class="fade-in">

        <!-- ── KPI STRIP ──────────────────────────────────────── -->
        <section class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">INTENTOS TOTALES</span>
              <div class="kpi-dot dot-slate"></div>
            </div>
            <div class="kpi-value">{{ fmt(g.intentos) }}</div>
            <div class="kpi-sub">{{ g.leads }} leads gestionados</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">ATENDIDAS</span>
              <div class="kpi-dot dot-green"></div>
            </div>
            <div class="kpi-value kv-green">{{ fmt(g.atendidas) }}</div>
            <div class="kpi-sub">
              <span :class="g.pctAtendidas >= 60 ? 'pill-green' : g.pctAtendidas >= 40 ? 'pill-amber' : 'pill-red'" class="pct-pill">
                {{ g.pctAtendidas }}%
              </span>
              del total
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">SIN ATENCIÓN</span>
              <div class="kpi-dot dot-red"></div>
            </div>
            <div class="kpi-value kv-red">{{ fmt(g.sinAtencion) }}</div>
            <div class="kpi-sub">
              <span class="pct-pill pill-red">{{ g.pctSinAtencion }}%</span>
              incumplimiento
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-label">PENDIENTES</span>
              <div class="kpi-dot dot-amber"></div>
            </div>
            <div class="kpi-value kv-amber">{{ fmt(g.pendientes) }}</div>
            <div class="kpi-sub">Aún por gestionar</div>
          </div>
          <div class="kpi-card kpi-reschedule">
            <div class="kpi-top">
              <span class="kpi-label" style="color:#a5b4fc;">REPROGRAMADAS</span>
              <div class="kpi-dot dot-indigo"></div>
            </div>
            <div class="kpi-value" style="color:#fff;">{{ fmt(g.reprogramadas) }}</div>
            <div class="kpi-sub" style="color:#818cf8;">
              {{ g.pctRescheduleExito }}% se atendieron después
            </div>
          </div>
        </section>

        <!-- ── TABLA ASESORES ─────────────────────────────────── -->
        <section class="panel mb-5" v-if="advisorRows.length">
          <div class="panel-header">
            <div>
              <div class="panel-title">Matriz de Asesores</div>
              <div class="panel-sub">Rendimiento individual del periodo. Haz clic en una fila para filtrar todos los paneles.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="lider-table">
              <thead>
                <tr>
                  <th class="th-asesor sticky-th">Asesor</th>
                  <th>Leads</th>
                  <th>Intentos</th>
                  <th class="th-green">Atendidas</th>
                  <th class="th-green">% Atendidas</th>
                  <th class="th-red">Sin Atención</th>
                  <th class="th-red">% S/A</th>
                  <th class="th-amber">Pendientes</th>
                  <th class="th-indigo">Reprogramadas</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in advisorRows"
                  :key="row.cod"
                  class="tr-advisor"
                  :class="{ 'tr-selected': filters.advisor == row.cod }"
                  @click="selectAdvisor(row.cod)"
                >
                  <td class="td-asesor sticky-td">
                    <div class="advisor-cell">
                      <div class="advisor-avatar">{{ initials(row.name) }}</div>
                      <span>{{ row.name }}</span>
                    </div>
                  </td>
                  <td>{{ fmt(row.leads) }}</td>
                  <td class="fw6">{{ fmt(row.intentos) }}</td>
                  <td class="c-green fw7">{{ fmt(row.atendidas) }}</td>
                  <td>
                    <div class="inline-bar-wrap">
                      <span class="inline-bar-val" :class="scoreColor(row.pctAtendidas)">{{ row.pctAtendidas }}%</span>
                      <div class="inline-bar-track">
                        <div class="inline-bar-fill fill-green" :style="`width:${row.pctAtendidas}%`"></div>
                      </div>
                    </div>
                  </td>
                  <td class="c-red fw7">{{ fmt(row.sinAtencion) }}</td>
                  <td>
                    <div class="inline-bar-wrap">
                      <span class="inline-bar-val c-red">{{ row.pctSinAtencion }}%</span>
                      <div class="inline-bar-track">
                        <div class="inline-bar-fill fill-red" :style="`width:${row.pctSinAtencion}%`"></div>
                      </div>
                    </div>
                  </td>
                  <td class="c-amber">{{ fmt(row.pendientes) }}</td>
                  <td class="c-indigo">{{ fmt(row.reprogramadas) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── EFECTIVIDAD POR ORIGEN ─────────────────────────── -->
        <section class="panel mb-5">
          <div class="panel-header">
            <div>
              <div class="panel-title">Efectividad por Origen de Creación</div>
              <div class="panel-sub">
                ¿En qué tipo de lead o regla el asesor atiende más? Compara la tasa de atención real por cada origen.
              </div>
            </div>
          </div>

          <div v-if="originRows.length === 0" class="empty-state">Sin datos en el periodo.</div>

          <div v-else class="origin-grid">
            <div v-for="o in originRows" :key="o.alias" class="origin-card">
              <div class="origin-card-top">
                <div class="origin-icon">
                  <svg v-if="o.alias === 'we_origin_manual'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <svg v-else-if="o.alias === 'we_origin_rule_unattended'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="origin-name">{{ o.desc }}</div>
                <div class="origin-total-badge">{{ fmt(o.total) }}</div>
              </div>

              <!-- Barra apilada -->
              <div class="stacked-bar">
                <div class="sb-fill sb-green"  :style="`width:${o.pctAtendida}%`"   :title="`Atendidas: ${o.atendidas} (${o.pctAtendida}%)`"></div>
                <div class="sb-fill sb-amber"  :style="`width:${o.pctPendiente}%`"  :title="`Pendientes: ${o.pendientes} (${o.pctPendiente}%)`"></div>
                <div class="sb-fill sb-red"    :style="`width:${o.pctSinAtencion}%`" :title="`Sin atención: ${o.sinAtencion} (${o.pctSinAtencion}%)`"></div>
              </div>

              <div class="origin-stats-row">
                <div class="ostat ostat-green">
                  <div class="ostat-val">{{ o.pctAtendida }}%</div>
                  <div class="ostat-lbl">Atendidas</div>
                </div>
                <div class="ostat ostat-amber">
                  <div class="ostat-val">{{ o.pctPendiente }}%</div>
                  <div class="ostat-lbl">Pendientes</div>
                </div>
                <div class="ostat ostat-red">
                  <div class="ostat-val">{{ o.pctSinAtencion }}%</div>
                  <div class="ostat-lbl">Sin atención</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── REPROGRAMACIONES ───────────────────────────────── -->
        <section class="panel mb-5" v-if="rescheduleRows.length">
          <div class="panel-header">
            <div>
              <div class="panel-title">Efectividad de Reprogramaciones</div>
              <div class="panel-sub">¿Las llamadas reprogramadas terminaron atendiéndose? Diferenciado por quién reprogramó.</div>
            </div>
          </div>
          <div class="reschedule-grid">
            <div v-for="r in rescheduleRows" :key="r.quien" class="reschedule-card">
              <div class="rc-header">
                <div class="rc-who-badge" :class="r.quien === 'lider' ? 'badge-indigo' : 'badge-slate'">
                  {{ r.quien === 'lider' ? '👤 Líder Comercial' : '🤖 Sistema (Regla 5)' }}
                </div>
                <span class="rc-total">{{ fmt(r.total) }} reprogramaciones</span>
              </div>

              <div class="rc-metrics">
                <div class="rc-metric">
                  <div class="rc-metric-val c-green">{{ fmt(r.atendidas) }}</div>
                  <div class="rc-metric-lbl">Atendidas después</div>
                  <div class="rc-metric-pct pct-pill pill-green">{{ r.pctExito }}%</div>
                </div>
                <div class="rc-divider"></div>
                <div class="rc-metric">
                  <div class="rc-metric-val c-red">{{ fmt(r.volvioFallar) }}</div>
                  <div class="rc-metric-lbl">Volvió a fallar</div>
                  <div class="rc-metric-pct pct-pill pill-red">{{ r.pctFallo }}%</div>
                </div>
                <div class="rc-divider"></div>
                <div class="rc-metric">
                  <div class="rc-metric-val c-amber">{{ fmt(r.pendiente) }}</div>
                  <div class="rc-metric-lbl">Aún pendiente</div>
                  <div class="rc-metric-pct pct-pill pill-amber">{{ r.pctPendiente }}%</div>
                </div>
              </div>

              <!-- Barra de resultado -->
              <div class="stacked-bar mt-2">
                <div class="sb-fill sb-green" :style="`width:${r.pctExito}%`"></div>
                <div class="sb-fill sb-amber" :style="`width:${r.pctPendiente}%`"></div>
                <div class="sb-fill sb-red"   :style="`width:${r.pctFallo}%`"></div>
              </div>

              <div v-if="r.pctExito < 40" class="rc-alert">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Tasa de recuperación baja. Considera revisar la estrategia de seguimiento.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ── PENDIENTES GLOBALES ────────────────────────────── -->
        <section v-if="Object.keys(pendingByOrigin).length > 0" class="mb-5">
          <div class="panel-header pending-header">
            <div>
              <div class="panel-title">Agenda Operativa Global: Llamadas Pendientes</div>
              <div class="panel-sub">Todas las llamadas programadas aún en estado pendiente, agrupadas por origen.</div>
            </div>
          </div>
          <div class="pending-grid">
            <div v-for="(group, alias) in pendingByOrigin" :key="alias" class="pending-card">
              <div class="pending-card-hdr">
                <span class="pending-origin-name">{{ group.desc }}</span>
                <span class="pending-badge">{{ group.leads.length }}</span>
              </div>
              <div class="pending-scroll">
                <div v-for="lead in group.leads" :key="lead.lead_id" class="pending-item">
                  <div class="pending-info">
                    <div class="pending-name">{{ lead.lead_name !== '-' ? lead.lead_name : 'Prospecto sin nombre' }}</div>
                    <div class="pending-meta">
                      Intento #{{ lead.attempt_number }} &bull;
                      <span :class="new Date(lead.contact_datetime) < new Date() ? 'c-red' : 'c-teal'">
                        {{ new Date(lead.contact_datetime).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) }}
                      </span>
                    </div>
                  </div>
                  <button class="btn-atender" @click="goToLead(lead.lead_id)">
                    Ver <i class="fa-solid fa-angle-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>

    <footer class="lider-footer">
      <span>Periodo: <strong>{{ filters.month === 0 ? 'Año completo' : meses[filters.month - 1]?.l }}</strong> {{ filters.year }}</span>
      <span class="footer-sep">·</span>
      <span>Asesor: <strong>{{ filters.advisor === 'all' ? 'Todos' : filtroOwners.find(u => u.id == filters.advisor)?.description ?? filters.advisor }}</strong></span>
      <span class="footer-sep">·</span>
      <span class="footer-dot" :class="isLoading ? 'dot-load' : 'dot-ok'"></span>
      <span>{{ isLoading ? 'Actualizando...' : 'Sincronizado' }}</span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'

const dashboardService = inject(ServiceKeys.Dashboard)
const authService      = inject(ServiceKeys.Auth)
const router           = useRouter()

const filters      = ref({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, advisor: 'all' })
const isLoading    = ref(false)
const rawData      = ref([])
const filtroOwners = ref([])

const meses = [
  { v:1, l:'Enero' }, { v:2, l:'Febrero' }, { v:3, l:'Marzo' },
  { v:4, l:'Abril' }, { v:5, l:'Mayo' },    { v:6, l:'Junio' },
  { v:7, l:'Julio' }, { v:8, l:'Agosto' },  { v:9, l:'Septiembre' },
  { v:10, l:'Octubre' }, { v:11, l:'Noviembre' }, { v:12, l:'Diciembre' }
]

onMounted(async () => {
  await loadOwners()
  await loadData()
})

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => ({
      id: u.user_id,
      description: (u.first_name || '') + ' ' + (u.last_name?.charAt(0) || '') + '.'
    }))
  } catch (e) { console.error('[LiderDash] Error cargando usuarios:', e) }
}

async function loadData() {
  isLoading.value = true
  try {
    // Usa el mismo dashboardService pero apunta al SP del líder
    // Ajusta el método según cómo esté estructurado tu DashboardService
    const res = await dashboardService.liderList({
      year:    filters.value.year,
      month:   filters.value.month,
      advisor: filters.value.advisor
    })
    rawData.value = res.items || []
  } catch (e) {
    console.error('[LiderDash] Error cargando datos:', e)
  } finally {
    isLoading.value = false
  }
}

function selectAdvisor(cod) {
  filters.value.advisor = filters.value.advisor == cod ? 'all' : cod
  // No recarga desde servidor, solo filtra en local para respuesta inmediata
}

// ── KPIs globales ──────────────────────────────────────────
const g = computed(() => {
  let intentos = 0, atendidas = 0, sinAtencion = 0, pendientes = 0, leads = 0
  let totalRepro = 0, reproExito = 0

  rawData.value.forEach(r => {
    intentos    += r.total_intentos    || 0
    atendidas   += r.total_atendidas   || 0
    sinAtencion += r.total_sin_atencion || 0
    pendientes  += r.total_pendientes  || 0
    leads       += r.total_leads       || 0
    // sumar reprogramaciones del json
    ;(r.json_reschedule_stats || []).forEach(rs => {
      totalRepro += rs.total    || 0
      reproExito += rs.atendidas || 0
    })
  })

  return {
    intentos, atendidas, sinAtencion, pendientes, leads,
    reprogramadas:      totalRepro,
    pctAtendidas:       intentos    > 0 ? ((atendidas   / intentos)   * 100).toFixed(1) : 0,
    pctSinAtencion:     intentos    > 0 ? ((sinAtencion / intentos)   * 100).toFixed(1) : 0,
    pctRescheduleExito: totalRepro  > 0 ? ((reproExito  / totalRepro) * 100).toFixed(1) : 0
  }
})

// ── Tabla asesores ─────────────────────────────────────────
const advisorRows = computed(() => {
  const map = {}
  rawData.value.forEach(r => {
    if (!map[r.cod_asesor]) {
      map[r.cod_asesor] = {
        cod: r.cod_asesor, name: r.asesor_nombre || r.asesor_alias,
        leads: 0, intentos: 0, atendidas: 0, sinAtencion: 0, pendientes: 0, reprogramadas: 0
      }
    }
    const a = map[r.cod_asesor]
    a.leads       += r.total_leads        || 0
    a.intentos    += r.total_intentos     || 0
    a.atendidas   += r.total_atendidas    || 0
    a.sinAtencion += r.total_sin_atencion || 0
    a.pendientes  += r.total_pendientes   || 0
    ;(r.json_reschedule_stats || []).forEach(rs => { a.reprogramadas += rs.total || 0 })
  })

  return Object.values(map).map(a => ({
    ...a,
    pctAtendidas:   a.intentos > 0 ? ((a.atendidas   / a.intentos) * 100).toFixed(1) : 0,
    pctSinAtencion: a.intentos > 0 ? ((a.sinAtencion / a.intentos) * 100).toFixed(1) : 0
  })).sort((a, b) => b.sinAtencion - a.sinAtencion) // ordenar por más problemáticos arriba
})

// ── Efectividad por origen ─────────────────────────────────
const originRows = computed(() => {
  const map = {}
  rawData.value.forEach(row => {
    ;(row.json_origin_stats || []).forEach(o => {
      if (!map[o.origin_alias]) {
        map[o.origin_alias] = { alias: o.origin_alias, desc: o.origin_desc, total: 0, atendidas: 0, sinAtencion: 0, pendientes: 0 }
      }
      const m = map[o.origin_alias]
      m.total       += o.total       || 0
      m.atendidas   += o.atendidas   || 0
      m.sinAtencion += o.sin_atencion || 0
      m.pendientes  += o.pendientes  || 0
    })
  })
  return Object.values(map).map(o => ({
    ...o,
    pctAtendida:   o.total > 0 ? ((o.atendidas   / o.total) * 100).toFixed(1) : 0,
    pctSinAtencion: o.total > 0 ? ((o.sinAtencion / o.total) * 100).toFixed(1) : 0,
    pctPendiente:  o.total > 0 ? ((o.pendientes  / o.total) * 100).toFixed(1) : 0
  })).sort((a, b) => b.total - a.total)
})

// ── Reprogramaciones ───────────────────────────────────────
const rescheduleRows = computed(() => {
  const map = {}
  rawData.value.forEach(row => {
    ;(row.json_reschedule_stats || []).forEach(rs => {
      const k = rs.quien || 'desconocido'
      if (!map[k]) map[k] = { quien: k, total: 0, atendidas: 0, volvioFallar: 0, pendiente: 0 }
      const m = map[k]
      m.total        += rs.total          || 0
      m.atendidas    += rs.atendidas      || 0
      m.volvioFallar += rs.volvio_fallar  || 0
      m.pendiente    += rs.pendiente      || 0
    })
  })
  return Object.values(map).map(r => ({
    ...r,
    pctExito:    r.total > 0 ? ((r.atendidas    / r.total) * 100).toFixed(1) : 0,
    pctFallo:    r.total > 0 ? ((r.volvioFallar / r.total) * 100).toFixed(1) : 0,
    pctPendiente: r.total > 0 ? ((r.pendiente    / r.total) * 100).toFixed(1) : 0
  }))
})

// ── Pendientes ─────────────────────────────────────────────
const pendingByOrigin = computed(() => {
  const map = {}
  rawData.value.forEach(row => {
    ;(row.json_pending_tasks || []).forEach(group => {
      if (!map[group.origin_alias]) map[group.origin_alias] = { desc: group.origin_desc, leads: [] }
      map[group.origin_alias].leads.push(...group.leads)
    })
  })
  Object.values(map).forEach(g => g.leads.sort((a, b) => new Date(a.contact_datetime) - new Date(b.contact_datetime)))
  return map
})

// ── Helpers ────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat('es-PE').format(v || 0)

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function scoreColor(pct) {
  const n = Number(pct)
  return n >= 60 ? 'c-green' : n >= 40 ? 'c-amber' : 'c-red'
}

function goToLead(leadId) {
  if (!leadId) return
  window.open(router.resolve({ name: 'ComercialLeadDetalle', params: { id: leadId } }).href, '_blank')
}
</script>

<style scoped>
/* ─── SHELL ───────────────────────────────────────────────── */
.lider-shell { background: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; font-family: 'Inter', system-ui, sans-serif; }

/* ─── MASTHEAD ─────────────────────────────────────────────── */
.lider-masthead { background: #0f172a; color: #fff; border-bottom: 1px solid #1e293b; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 18px 28px 14px; border-bottom: 1px solid rgba(255,255,255,.05); }
.masthead-brand { display: flex; align-items: center; gap: 14px; }
.brand-accent { width: 3px; height: 44px; background: linear-gradient(180deg, #4f46e5, #818cf8); border-radius: 2px; flex-shrink: 0; }
.brand-eyebrow { display: block; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
.brand-title { font-size: 17px; font-weight: 700; margin: 0; color: #f1f5f9; letter-spacing: -.01em; }
.btn-refresh { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #4f46e5; color: #fff; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
.btn-refresh:hover:not(:disabled) { background: #6366f1; }
.btn-refresh:disabled { opacity: .6; cursor: not-allowed; }

.masthead-filters { display: flex; align-items: center; padding: 0 28px; min-height: 50px; gap: 0; }
.filter-chip { display: flex; flex-direction: column; gap: 2px; padding: 8px 20px 8px 0; }
.chip-label { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; font-weight: 700; }
.chip-select { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,.15); color: #e2e8f0; font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 3px 0; outline: none; cursor: pointer; min-width: 130px; appearance: auto; }
.chip-select option { color: #0f172a; background: #fff; }
.filter-divider { width: 1px; height: 28px; background: rgba(255,255,255,.08); margin: 0 20px 0 0; }

/* ─── BODY ─────────────────────────────────────────────────── */
.lider-body { flex: 1; padding: 24px 28px; }

/* Loader */
.lider-loader { display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 400px; color: #64748b; font-size: 13px; }
.loader-pulse { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin .8s linear infinite; }

/* ─── KPI STRIP ────────────────────────────────────────────── */
.kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 22px; }
.kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.kpi-reschedule { background: #1e1b4b; border-color: #3730a3; }
.kpi-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-label { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; color: #94a3b8; }
.kpi-dot { width: 7px; height: 7px; border-radius: 50%; }
.dot-slate { background: #94a3b8; } .dot-green { background: #22c55e; } .dot-red { background: #ef4444; }
.dot-amber { background: #f59e0b; } .dot-indigo { background: #818cf8; }
.kpi-value { font-size: 24px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; letter-spacing: -.02em; margin-bottom: 6px; }
.kpi-sub { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 5px; }
.kv-green { color: #15803d; } .kv-red { color: #b91c1c; } .kv-amber { color: #b45309; }

/* pills */
.pct-pill { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
.pill-green { background: #dcfce7; color: #15803d; }
.pill-amber { background: #fef3c7; color: #b45309; }
.pill-red   { background: #fee2e2; color: #b91c1c; }

/* ─── PANEL ────────────────────────────────────────────────── */
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.pending-header { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px 8px 0 0; border-bottom: none; }
.panel-title { font-size: 13.5px; font-weight: 700; color: #0f172a; letter-spacing: -.01em; }
.panel-sub   { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.mb-5 { margin-bottom: 20px; }
.mt-2 { margin-top: 8px; }
.empty-state { text-align: center; padding: 32px; color: #94a3b8; font-size: 13px; }

/* ─── TABLA ASESORES ──────────────────────────────────────── */
.table-wrap { overflow-x: auto; max-height: 55vh; overflow-y: auto; }
.lider-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.lider-table thead tr { background: #f8fafc; }
.lider-table th { padding: 8px 12px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; white-space: nowrap; text-align: right; position: sticky; top: 0; z-index: 2; background: #f8fafc; }
.lider-table th.th-asesor { text-align: left; }
.th-green { color: #15803d; background: #f0fdf4 !important; }
.th-red   { color: #b91c1c; background: #fff1f2 !important; }
.th-amber { color: #b45309; background: #fffbeb !important; }
.th-indigo{ color: #4f46e5; background: #eef2ff !important; }
.sticky-th { left: 0; z-index: 3; box-shadow: 2px 0 4px -1px rgba(0,0,0,.08); }

.tr-advisor { cursor: pointer; transition: background .1s; }
.tr-advisor:hover td { background: #f0f4ff !important; }
.tr-selected td { background: #eef2ff !important; }
.tr-advisor td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; }
.sticky-td { text-align: left !important; position: sticky; left: 0; background: #fff; z-index: 1; border-right: 2px solid #e2e8f0; box-shadow: 2px 0 4px -1px rgba(0,0,0,.07); }
.tr-selected .sticky-td { background: #eef2ff !important; }

.advisor-cell { display: flex; align-items: center; gap: 8px; }
.advisor-avatar { width: 26px; height: 26px; border-radius: 50%; background: #4f46e5; color: #fff; font-size: 9.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.inline-bar-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.inline-bar-val { font-size: 12px; font-weight: 700; }
.inline-bar-track { width: 60px; height: 4px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.inline-bar-fill { height: 100%; border-radius: 3px; }
.fill-green { background: #22c55e; } .fill-red { background: #ef4444; }

/* ─── ORIGEN EFECTIVIDAD ──────────────────────────────────── */
.origin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0; padding: 16px; gap: 12px; }
.origin-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
.origin-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.origin-icon { width: 26px; height: 26px; background: #e0e7ff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #4f46e5; flex-shrink: 0; }
.origin-name { font-size: 12px; font-weight: 600; color: #334155; flex: 1; }
.origin-total-badge { background: #1e293b; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }

.stacked-bar { width: 100%; height: 8px; border-radius: 4px; background: #e2e8f0; overflow: hidden; display: flex; }
.sb-fill { height: 100%; transition: width .4s ease; }
.sb-green { background: #22c55e; } .sb-amber { background: #f59e0b; } .sb-red { background: #ef4444; }

.origin-stats-row { display: flex; gap: 0; margin-top: 10px; }
.ostat { flex: 1; text-align: center; }
.ostat + .ostat { border-left: 1px solid #e2e8f0; }
.ostat-val { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ostat-lbl { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
.ostat-green .ostat-val { color: #15803d; }
.ostat-amber .ostat-val { color: #b45309; }
.ostat-red   .ostat-val { color: #b91c1c; }

/* ─── REPROGRAMACIONES ─────────────────────────────────────── */
.reschedule-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; padding: 16px; }
.reschedule-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.rc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
.rc-who-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.badge-indigo { background: #e0e7ff; color: #4f46e5; }
.badge-slate  { background: #f1f5f9; color: #475569; }
.rc-total { font-size: 11.5px; color: #64748b; font-weight: 500; }
.rc-metrics { display: flex; align-items: center; gap: 0; }
.rc-metric { flex: 1; text-align: center; padding: 8px 4px; }
.rc-metric-val { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.rc-metric-lbl { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
.rc-metric-pct { margin-top: 4px; display: inline-block; }
.rc-divider { width: 1px; height: 52px; background: #e2e8f0; flex-shrink: 0; }
.rc-alert { display: flex; align-items: flex-start; gap: 6px; margin-top: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; }
.rc-alert span { font-size: 11px; color: #92400e; line-height: 1.4; }

/* ─── PENDIENTES ───────────────────────────────────────────── */
.pending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; background: #f1f5f9; padding: 14px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
.pending-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
.pending-card-hdr { background: #1e293b; color: #fff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
.pending-origin-name { font-size: 11.5px; font-weight: 600; color: #e2e8f0; }
.pending-badge { background: #4f46e5; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.pending-scroll { max-height: 220px; overflow-y: auto; }
.pending-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-bottom: 1px solid #f8fafc; }
.pending-item:last-child { border-bottom: none; }
.pending-item:hover { background: #f8fafc; }
.pending-name { font-size: 12.5px; font-weight: 600; color: #0f172a; }
.pending-meta { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.btn-atender { background: transparent; border: 1px solid #cbd5e1; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap; transition: all .15s; }
.btn-atender:hover { background: #eef2ff; color: #4f46e5; border-color: #a5b4fc; }

/* ─── FOOTER ───────────────────────────────────────────────── */
.lider-footer { display: flex; align-items: center; gap: 8px; padding: 10px 28px; background: #fff; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #94a3b8; }
.lider-footer strong { color: #475569; }
.footer-sep { color: #e2e8f0; }
.footer-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok   { background: #22c55e; }
.dot-load { background: #f59e0b; animation: pulse 1s infinite; }

/* ─── UTILS ────────────────────────────────────────────────── */
.c-green  { color: #15803d; } .c-red    { color: #b91c1c; }
.c-amber  { color: #b45309; } .c-indigo { color: #4f46e5; }
.c-teal   { color: #0f766e; font-weight: 600; }
.fw6 { font-weight: 600; } .fw7 { font-weight: 700; }
.fade-in { animation: fadeIn .3s ease; }
.spin    { animation: spin .8s linear infinite; }
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

/* ─── RESPONSIVE ───────────────────────────────────────────── */
@media (max-width: 1200px) { .kpi-strip { grid-template-columns: repeat(3,1fr); } }
@media (max-width: 768px)  {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .lider-body { padding: 14px; }
  .masthead-inner, .masthead-filters { padding-left: 14px; padding-right: 14px; }
}
</style>
