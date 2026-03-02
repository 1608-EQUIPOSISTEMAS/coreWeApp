<template>
  <div class="ps-shell" :class="isLider ? 'ps-mode-lider' : 'ps-mode-asesor'">

    <!-- ══════════════════════════════════════════════════ HEADER -->
    <header class="ps-head">
      <div class="ps-head-inner">
        <div class="ps-brand">
          <div class="ps-brand-stripe"></div>
          <div>
            <span class="ps-eyebrow">
              {{ isLider ? 'Panel de Supervisión Comercial' : 'Mi Centro Operativo · Outbound' }}
            </span>
            <h1 class="ps-title">
              {{ isLider ? 'Dashboard Líder Comercial' : 'Panel de Llamadas — ' + myName }}
            </h1>
          </div>
        </div>
        <button class="ps-btn-refresh" :disabled="isLoading" @click="loadAll">
          <svg :class="{ spin: isLoading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {{ isLoading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      <div class="ps-head-filters">
        <div class="pf-chip">
          <span class="pf-label">AÑO</span>
          <select class="pf-select" v-model="filters.year" @change="loadAll">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </div>
        <div class="pf-div"></div>
        <div class="pf-chip">
          <span class="pf-label">MES</span>
          <select class="pf-select" v-model="filters.month" @change="loadAll">
            <option :value="0">Todo el año</option>
            <option v-for="m in meses" :key="m.v" :value="m.v">{{ m.l }}</option>
          </select>
        </div>
        <template v-if="isLider">
          <div class="pf-div"></div>
          <div class="pf-chip">
            <span class="pf-label">ASESOR</span>
            <select class="pf-select" v-model="filters.advisor" @change="loadAll">
              <option value="all">Todos</option>
              <option v-for="u in filtroOwners" :key="u.id" :value="u.id">{{ u.description }}</option>
            </select>
          </div>
        </template>
        <!-- Asesor: indicador de pendientes en header -->
        <div v-if="!isLider && totalPendingCount > 0" class="pf-pending-badge">
          <span class="pb-overdue" v-if="overdueCount > 0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ overdueCount }} vencidas
          </span>
          <span class="pb-upcoming">{{ upcomingCount }} próximas</span>
        </div>
      </div>
    </header>

    <!-- ══════════════════════════════════════════════════ BODY -->
    <main class="ps-body">

      <div v-if="isLoading" class="ps-loader">
        <div class="loader-ring"></div>
        <span>{{ isLider ? 'Consultando registros...' : 'Cargando tu panel...' }}</span>
      </div>

      <div v-else class="fade-in">

        <!-- ══════════════════════════ MODO ASESOR ══════════════════════════ -->
        <template v-if="!isLider">

          <!-- KPI personal -->
          <section class="kpi-strip kpi-4 mb">
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">MIS INTENTOS</span><div class="kd dot-slate"></div></div>
              <div class="kpi-value">{{ fmt(callKPIs.intentos) }}</div>
              <div class="kpi-sub">{{ fmt(callKPIs.leads) }} leads · prom. {{ callKPIs.promIntentos }}/lead</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-label">CONTACTABILIDAD</span>
                <div class="kd" :class="callKPIs.tasaContacto >= 40 ? 'dot-green' : callKPIs.tasaContacto >= 25 ? 'dot-amber' : 'dot-red'"></div>
              </div>
              <div class="kpi-value" :class="callKPIs.tasaContacto >= 40 ? 'kv-green' : callKPIs.tasaContacto >= 25 ? 'kv-amber' : 'kv-red'">
                {{ callKPIs.tasaContacto }}%
              </div>
              <div class="kpi-sub"><strong>{{ fmt(callKPIs.contactados) }}</strong> contactados efectivos</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">MIS VENTAS</span><div class="kd dot-green"></div></div>
              <div class="kpi-value kv-green">{{ fmt(callKPIs.ventas) }}</div>
              <div class="kpi-sub">{{ callKPIs.conversion }}% tasa de cierre</div>
            </div>
            <div class="kpi-card kpi-card-urgent">
              <div class="kpi-top"><span class="kpi-label" style="color:#fca5a5">PENDIENTES</span><div class="kd dot-red"></div></div>
              <div class="kpi-value" style="color:#fff;">{{ totalPendingCount }}</div>
              <div class="kpi-sub" style="color:#fca5a5;">
                <strong style="color:#f87171;">{{ overdueCount }}</strong> vencidas · {{ upcomingCount }} próximas
              </div>
            </div>
          </section>

          <!-- ═══════ AGENDA HERO ═══════ -->
          <section class="agenda-section mb">
            <div class="agenda-topbar">
              <div class="agenda-topbar-left">
                <div class="agenda-eyebrow">Gestión activa</div>
                <h2 class="agenda-title-text">Mi Agenda de Llamadas</h2>
              </div>
              <div class="agenda-counters" v-if="totalPendingCount > 0">
                <div class="ac-item ac-red"><span class="ac-n">{{ overdueCount }}</span><span class="ac-l">Vencidas</span></div>
                <div class="ac-divider"></div>
                <div class="ac-item ac-amber"><span class="ac-n">{{ upcomingCount }}</span><span class="ac-l">Próximas</span></div>
                <div class="ac-divider"></div>
                <div class="ac-item ac-teal"><span class="ac-n">{{ Object.keys(pendingByOrigin).length }}</span><span class="ac-l">Orígenes</span></div>
              </div>
            </div>

            <!-- Estado vacío -->
            <div v-if="totalPendingCount === 0" class="agenda-allclear">
              <div class="allclear-icon">✅</div>
              <div class="allclear-title">¡Todo al día!</div>
              <div class="allclear-sub">No tienes llamadas pendientes en este periodo. Buen trabajo.</div>
            </div>

            <template v-else>
              <!-- VENCIDAS -->
              <div v-if="overdueLeads.length" class="ags-block">
                <div class="ags-hdr ags-hdr--red">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Vencidas — atiende primero
                  <span class="ags-cnt ags-cnt--red">{{ overdueLeads.length }}</span>
                </div>
                <div class="call-grid">
                  <div v-for="item in overdueLeads" :key="item.lead_id" class="call-card call-card--overdue">
                    <div class="cc-urgency-bar"></div>
                    <div class="cc-body">
                      <div class="cc-name">{{ item.lead_name !== '-' ? item.lead_name : 'Prospecto sin nombre' }}</div>
                      <div class="cc-meta">
                        <span class="cc-tag cc-tag--attempt">#{{ item.attempt_number }}</span>
                        <span class="cc-tag cc-tag--origin">{{ item.origin_desc }}</span>
                        <span class="cc-time cc-time--overdue">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {{ fmtDate(item.contact_datetime) }}
                        </span>
                        <span class="cc-overdue-pill">VENCIDA</span>
                      </div>
                    </div>
                    <button class="btn-call btn-call--urgent" @click="goToLead(item.lead_id)">
                      Atender
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- PRÓXIMAS -->
              <div v-if="upcomingLeads.length" class="ags-block">
                <div class="ags-hdr ags-hdr--teal">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Próximas llamadas
                  <span class="ags-cnt ags-cnt--teal">{{ upcomingLeads.length }}</span>
                </div>
                <div class="call-grid">
                  <div v-for="item in upcomingLeads" :key="item.lead_id" class="call-card">
                    <div class="cc-body">
                      <div class="cc-name">{{ item.lead_name !== '-' ? item.lead_name : 'Prospecto sin nombre' }}</div>
                      <div class="cc-meta">
                        <span class="cc-tag cc-tag--attempt">#{{ item.attempt_number }}</span>
                        <span class="cc-tag cc-tag--origin">{{ item.origin_desc }}</span>
                        <span class="cc-time cc-time--ok">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {{ fmtDate(item.contact_datetime) }}
                        </span>
                      </div>
                    </div>
                    <button class="btn-call" @click="goToLead(item.lead_id)">
                      Ver
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </section>

          <!-- Efectividad origen + Resultados -->
          <div class="two-col mb">
            <section class="panel">
              <div class="panel-head">
                <div class="panel-title">Efectividad por Origen</div>
                <div class="panel-sub">Qué tipo de lead te contacta y genera cierre.</div>
              </div>
              <div v-if="originRows.length === 0" class="empty-state">Sin datos para el periodo.</div>
              <div v-else class="origin-grid-list">
                <div v-for="o in originRows" :key="o.alias" class="og-item">
                  <div class="og-top">
                    <span class="og-name">{{ o.desc }}</span>
                    <span class="og-total">{{ fmt(o.total) }}</span>
                  </div>
                  <div class="stacked-bar">
                    <div class="sb sb-green" :style="`width:${o.pctAtendida}%`" :title="`Atendidas: ${o.pctAtendida}%`"></div>
                    <div class="sb sb-amber" :style="`width:${o.pctPendiente}%`" :title="`Pendientes: ${o.pctPendiente}%`"></div>
                    <div class="sb sb-red"   :style="`width:${o.pctSinAtencion}%`" :title="`Sin atención: ${o.pctSinAtencion}%`"></div>
                  </div>
                  <div class="og-stats">
                    <span class="ogs c-green">{{ o.pctAtendida }}% atend.</span>
                    <span class="ogs c-amber">{{ o.pctPendiente }}% pend.</span>
                    <span class="ogs c-red">{{ o.pctSinAtencion }}% s/a</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="panel">
              <div class="panel-head">
                <div class="panel-title">Resultados de Llamada</div>
                <div class="panel-sub">Razones registradas por efectividad.</div>
                <div class="toggle-group mt-2">
                  <button class="tgl-btn" :class="{ 'tgl-teal': isEffFilter === 1 }" @click="isEffFilter = 1">Efectivos</button>
                  <button class="tgl-btn" :class="{ 'tgl-red': isEffFilter === 0 }"  @click="isEffFilter = 0">No Efectivos</button>
                </div>
              </div>
              <div class="table-scroll-sm">
                <table class="ps-table">
                  <thead><tr>
                    <th>Razón</th>
                    <th class="ta-r">Frec.</th>
                    <th class="ta-r">%</th>
                    <th style="width:28%">Dist.</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="o in objectionsData" :key="o.reason">
                      <td class="fw6">{{ o.reason }}</td>
                      <td class="ta-r">{{ fmt(o.count) }}</td>
                      <td class="ta-r fw7">{{ o.pct }}%</td>
                      <td><div class="prog-track"><div class="prog-fill" :class="isEffFilter === 1 ? 'pf-teal' : 'pf-red'" :style="`width:${o.pct}%`"></div></div></td>
                    </tr>
                    <tr v-if="objectionsData.length === 0">
                      <td colspan="4" class="empty-cell">Sin registros en esta categoría.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <!-- Persistencia + Tendencia -->
          <div class="two-col mb">
            <div class="pc-panel">
              <div class="pc-head">
                <div class="pc-head-left">
                  <span class="pc-eyebrow">Análisis de seguimiento</span>
                  <h3 class="pc-title">Curva de Persistencia</h3>
                  <p class="pc-sub">¿En qué intento contactas y cierras más?</p>
                </div>
                <div class="pc-pills">
                  <div class="pc-pill"><span class="pcpl">Intentos</span><span class="pcpv">{{ fmt(persistenceData.totalIntentos) }}</span></div>
                  <div class="pc-pill pc-pill--green"><span class="pcpl">Ventas</span><span class="pcpv" style="color:#4ade80">{{ fmt(persistenceData.totalVentas) }}</span></div>
                </div>
              </div>
              <div v-if="!persistenceData.steps.length" class="empty-state">Sin datos.</div>
              <div v-else class="pc-steps">
                <div
                  v-for="(step, i) in persistenceData.steps" :key="i"
                  class="pc-step" :class="{ 'pc-step--peak': i === persistenceData.peakIndex }"
                >
                  <div class="step-lbl">
                    <span class="step-num">{{ step.label }}</span>
                    <span class="step-tag step-tag--peak" v-if="i === persistenceData.peakIndex">+ activo</span>
                    <span class="step-tag step-tag--drop" v-else-if="i > 0 && getDropPct(i) >= 50">-{{ getDropPct(i) }}%</span>
                  </div>
                  <div class="step-bar-track"><div class="step-bar-fill" :style="{ height: getBarHeight(step.intentos) + '%' }"><div class="bar-shine"></div></div></div>
                  <div class="step-data">
                    <div class="sd-row sd-row--slate"><span class="sd-n">{{ fmt(step.intentos) }}</span><span class="sd-l">Intentos</span></div>
                    <div class="sd-rate" :class="step.tasaContacto >= 50 ? 'rate-green' : step.tasaContacto >= 25 ? 'rate-amber' : 'rate-red'">↓ {{ step.tasaContacto }}% contacto</div>
                    <div class="sd-row sd-row--blue"><span class="sd-n sd-n--blue">{{ fmt(step.contactados) }}</span><span class="sd-l">Contactados</span></div>
                    <template v-if="step.ventas > 0">
                      <div class="sd-rate rate-green">↓ {{ step.tasaCierre }}% cerró</div>
                      <div class="sd-row sd-row--green"><span class="sd-n sd-n--green">{{ fmt(step.ventas) }}</span><span class="sd-l">Ventas</span></div>
                    </template>
                    <div v-else class="sd-empty">Sin cierres</div>
                  </div>
                  <div class="step-connector" v-if="i < persistenceData.steps.length - 1">→</div>
                </div>
              </div>
              <div v-if="persistenceInsight" class="pc-insight">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
              </div>
            </div>

            <section class="panel">
              <div class="panel-head">
                <div class="panel-title">Tendencia Horaria</div>
                <div class="panel-sub">Correlación entre intentos, contacto y cierre por hora.</div>
              </div>
              <div class="chart-legend-row">
                <span class="cl-dot" style="background:#f87171"></span><span>% No Contactados</span>
                <span class="cl-dot" style="background:#2563eb"></span><span>% Contactados</span>
                <span class="cl-dot" style="background:#0f766e"></span><span>% Cierre s/ Intentos</span>
              </div>
              <div class="chart-area">
                <Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" />
              </div>
            </section>
          </div>

        </template>

        <!-- ══════════════════════════ MODO LÍDER ══════════════════════════ -->
        <template v-else>

          <!-- 5 KPIs -->
          <section class="kpi-strip kpi-5 mb">
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">INTENTOS TOTALES</span><div class="kd dot-slate"></div></div>
              <div class="kpi-value">{{ fmt(liderKPIs.intentos) }}</div>
              <div class="kpi-sub">{{ fmt(liderKPIs.leads) }} leads gestionados</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">ATENDIDAS</span><div class="kd dot-green"></div></div>
              <div class="kpi-value kv-green">{{ fmt(liderKPIs.atendidas) }}</div>
              <div class="kpi-sub"><span class="pct-pill" :class="liderKPIs.pctAtendidas >= 60 ? 'pill-green' : liderKPIs.pctAtendidas >= 40 ? 'pill-amber' : 'pill-red'">{{ liderKPIs.pctAtendidas }}%</span> del total</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">SIN ATENCIÓN</span><div class="kd dot-red"></div></div>
              <div class="kpi-value kv-red">{{ fmt(liderKPIs.sinAtencion) }}</div>
              <div class="kpi-sub"><span class="pct-pill pill-red">{{ liderKPIs.pctSinAtencion }}%</span> incumplimiento</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-top"><span class="kpi-label">CONTACTABILIDAD</span><div class="kd" :class="callKPIs.tasaContacto >= 40 ? 'dot-green' : 'dot-amber'"></div></div>
              <div class="kpi-value" :class="callKPIs.tasaContacto >= 40 ? 'kv-green' : 'kv-amber'">{{ callKPIs.tasaContacto }}%</div>
              <div class="kpi-sub"><strong>{{ fmt(callKPIs.contactados) }}</strong> contactados</div>
            </div>
            <div class="kpi-card kpi-card-dark">
              <div class="kpi-top"><span class="kpi-label" style="color:#a5b4fc">REPROGRAMADAS</span><div class="kd dot-indigo"></div></div>
              <div class="kpi-value" style="color:#fff">{{ fmt(liderKPIs.reprogramadas) }}</div>
              <div class="kpi-sub" style="color:#818cf8">{{ liderKPIs.pctRescheduleExito }}% se atendieron después</div>
            </div>
          </section>

          <!-- Tendencia horaria (full) -->
          <section class="panel mb">
            <div class="panel-head">
              <div>
                <div class="panel-title">Tendencia Horaria: Del Intento al Pago</div>
                <div class="panel-sub">Correlación entre esfuerzo, contacto y cierre por franja horaria.</div>
              </div>
              <div class="chart-legend-row">
                <span class="cl-dot" style="background:#f87171"></span><span>% No Contactados</span>
                <span class="cl-dot" style="background:#2563eb"></span><span>% Contactados Efectivos</span>
                <span class="cl-dot" style="background:#0f766e"></span><span>% Cierre s/ Intentos</span>
              </div>
            </div>
            <div class="chart-area" style="height:300px">
              <Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" />
            </div>
          </section>

          <!-- Matriz Asesores -->
          <section class="panel mb" v-if="advisorRows.length">
            <div class="panel-head">
              <div>
                <div class="panel-title">Matriz de Asesores</div>
                <div class="panel-sub">Rendimiento individual. Clic en fila para filtrar.</div>
              </div>
            </div>
            <div class="table-scroll-lider">
              <table class="ps-table ps-table--lider">
                <thead><tr>
                  <th class="th-sticky ta-l">Asesor</th>
                  <th class="ta-r">Leads</th>
                  <th class="ta-r">Intentos</th>
                  <th class="ta-r th-green">Atendidas</th>
                  <th class="ta-r th-green">% Atend.</th>
                  <th class="ta-r th-red">Sin Atenc.</th>
                  <th class="ta-r th-red">% S/A</th>
                  <th class="ta-r">Contactados</th>
                  <th class="ta-r">% Contact.</th>
                  <th class="ta-r th-green">Ventas</th>
                  <th class="ta-r th-amber">Pendientes</th>
                  <th class="ta-r th-indigo">Reprog.</th>
                </tr></thead>
                <tbody>
                  <tr v-for="row in advisorRows" :key="row.cod" class="tr-lider"
                    :class="{ 'tr-selected': filters.advisor == row.cod }"
                    @click="selectAdvisor(row.cod)">
                    <td class="th-sticky td-sticky">
                      <div class="advisor-cell">
                        <div class="advisor-av">{{ initials(row.name) }}</div>
                        {{ row.name }}
                      </div>
                    </td>
                    <td class="ta-r">{{ fmt(row.leads) }}</td>
                    <td class="ta-r fw6">{{ fmt(row.intentos) }}</td>
                    <td class="ta-r c-green fw7">{{ fmt(row.atendidas) }}</td>
                    <td class="ta-r">
                      <div class="ibar-wrap">
                        <span class="ibar-val" :class="scoreColor(row.pctAtendidas)">{{ row.pctAtendidas }}%</span>
                        <div class="ibar-track"><div class="ibar-fill ibar-green" :style="`width:${row.pctAtendidas}%`"></div></div>
                      </div>
                    </td>
                    <td class="ta-r c-red fw7">{{ fmt(row.sinAtencion) }}</td>
                    <td class="ta-r">
                      <div class="ibar-wrap">
                        <span class="ibar-val c-red">{{ row.pctSinAtencion }}%</span>
                        <div class="ibar-track"><div class="ibar-fill ibar-red" :style="`width:${row.pctSinAtencion}%`"></div></div>
                      </div>
                    </td>
                    <td class="ta-r">{{ fmt(row.contactados) }}</td>
                    <td class="ta-r">
                      <span :class="scoreColor(row.pctContacto)">{{ row.pctContacto }}%</span>
                    </td>
                    <td class="ta-r c-green fw7">{{ fmt(row.ventas) }}</td>
                    <td class="ta-r c-amber">{{ fmt(row.pendientes) }}</td>
                    <td class="ta-r c-indigo">{{ fmt(row.reprogramadas) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Persistencia + Resultados -->
          <div class="two-col mb">
            <div class="pc-panel">
              <div class="pc-head">
                <div class="pc-head-left">
                  <span class="pc-eyebrow">Análisis de seguimiento</span>
                  <h3 class="pc-title">Curva de Persistencia</h3>
                  <p class="pc-sub">¿En qué intento se contacta y se cierra?</p>
                </div>
                <div class="pc-pills">
                  <div class="pc-pill"><span class="pcpl">Intentos</span><span class="pcpv">{{ fmt(persistenceData.totalIntentos) }}</span></div>
                  <div class="pc-pill pc-pill--green"><span class="pcpl">Ventas</span><span class="pcpv" style="color:#4ade80">{{ fmt(persistenceData.totalVentas) }}</span></div>
                </div>
              </div>
              <div v-if="!persistenceData.steps.length" class="empty-state">Sin datos.</div>
              <div v-else class="pc-steps">
                <div
                  v-for="(step, i) in persistenceData.steps" :key="i"
                  class="pc-step" :class="{ 'pc-step--peak': i === persistenceData.peakIndex }"
                >
                  <div class="step-lbl">
                    <span class="step-num">{{ step.label }}</span>
                    <span class="step-tag step-tag--peak" v-if="i === persistenceData.peakIndex">+ activo</span>
                    <span class="step-tag step-tag--drop" v-else-if="i > 0 && getDropPct(i) >= 50">-{{ getDropPct(i) }}%</span>
                  </div>
                  <div class="step-bar-track"><div class="step-bar-fill" :style="{ height: getBarHeight(step.intentos) + '%' }"><div class="bar-shine"></div></div></div>
                  <div class="step-data">
                    <div class="sd-row sd-row--slate"><span class="sd-n">{{ fmt(step.intentos) }}</span><span class="sd-l">Intentos</span></div>
                    <div class="sd-rate" :class="step.tasaContacto >= 50 ? 'rate-green' : step.tasaContacto >= 25 ? 'rate-amber' : 'rate-red'">↓ {{ step.tasaContacto }}% contacto</div>
                    <div class="sd-row sd-row--blue"><span class="sd-n sd-n--blue">{{ fmt(step.contactados) }}</span><span class="sd-l">Contactados</span></div>
                    <template v-if="step.ventas > 0">
                      <div class="sd-rate rate-green">↓ {{ step.tasaCierre }}% cerró</div>
                      <div class="sd-row sd-row--green"><span class="sd-n sd-n--green">{{ fmt(step.ventas) }}</span><span class="sd-l">Ventas</span></div>
                    </template>
                    <div v-else class="sd-empty">Sin cierres</div>
                  </div>
                  <div class="step-connector" v-if="i < persistenceData.steps.length - 1">→</div>
                </div>
              </div>
              <div v-if="persistenceInsight" class="pc-insight">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
              </div>
            </div>

            <section class="panel">
              <div class="panel-head">
                <div class="panel-title">Resultados de Llamada</div>
                <div class="panel-sub">Desglose de razones por efectividad.</div>
                <div class="toggle-group mt-2">
                  <button class="tgl-btn" :class="{ 'tgl-teal': isEffFilter === 1 }" @click="isEffFilter = 1">Efectivos</button>
                  <button class="tgl-btn" :class="{ 'tgl-red': isEffFilter === 0 }"  @click="isEffFilter = 0">No Efectivos</button>
                </div>
              </div>
              <div class="table-scroll-sm">
                <table class="ps-table">
                  <thead><tr>
                    <th>Razón</th>
                    <th class="ta-r">Frec.</th>
                    <th class="ta-r">%</th>
                    <th style="width:28%">Dist.</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="o in objectionsData" :key="o.reason">
                      <td class="fw6">{{ o.reason }}</td>
                      <td class="ta-r">{{ fmt(o.count) }}</td>
                      <td class="ta-r fw7">{{ o.pct }}%</td>
                      <td><div class="prog-track"><div class="prog-fill" :class="isEffFilter === 1 ? 'pf-teal' : 'pf-red'" :style="`width:${o.pct}%`"></div></div></td>
                    </tr>
                    <tr v-if="objectionsData.length === 0">
                      <td colspan="4" class="empty-cell">Sin registros en esta categoría.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <!-- Efectividad Origen + Reprogramaciones -->
          <div class="two-col mb">
            <section class="panel">
              <div class="panel-head">
                <div class="panel-title">Efectividad por Origen de Creación</div>
                <div class="panel-sub">Tasa de atención real por tipo de lead.</div>
              </div>
              <div v-if="originRows.length === 0" class="empty-state">Sin datos.</div>
              <div v-else class="origin-grid-list">
                <div v-for="o in originRows" :key="o.alias" class="og-item">
                  <div class="og-top"><span class="og-name">{{ o.desc }}</span><span class="og-total">{{ fmt(o.total) }}</span></div>
                  <div class="stacked-bar">
                    <div class="sb sb-green" :style="`width:${o.pctAtendida}%`"></div>
                    <div class="sb sb-amber" :style="`width:${o.pctPendiente}%`"></div>
                    <div class="sb sb-red"   :style="`width:${o.pctSinAtencion}%`"></div>
                  </div>
                  <div class="og-stats">
                    <span class="ogs c-green">{{ o.pctAtendida }}% atend.</span>
                    <span class="ogs c-amber">{{ o.pctPendiente }}% pend.</span>
                    <span class="ogs c-red">{{ o.pctSinAtencion }}% s/a</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="panel" v-if="rescheduleRows.length">
              <div class="panel-head">
                <div class="panel-title">Efectividad de Reprogramaciones</div>
                <div class="panel-sub">¿Las reprogramadas terminaron atendiéndose?</div>
              </div>
              <div class="reschedule-list">
                <div v-for="r in rescheduleRows" :key="r.quien" class="rc-card">
                  <div class="rc-top">
                    <span class="rc-who" :class="r.quien === 'lider' ? 'rc-who--lider' : 'rc-who--sistema'">
                      {{ r.quien === 'lider' ? '👤 Líder Comercial' : '🤖 Sistema (Regla 5)' }}
                    </span>
                    <span class="rc-total-lbl">{{ fmt(r.total) }} reprog.</span>
                  </div>
                  <div class="rc-metrics">
                    <div class="rcm"><div class="rcm-val c-green">{{ fmt(r.atendidas) }}</div><div class="rcm-lbl">Atendidas</div><span class="pct-pill pill-green">{{ r.pctExito }}%</span></div>
                    <div class="rcm"><div class="rcm-val c-red">{{ fmt(r.volvioFallar) }}</div><div class="rcm-lbl">Volvió fallar</div><span class="pct-pill pill-red">{{ r.pctFallo }}%</span></div>
                    <div class="rcm"><div class="rcm-val c-amber">{{ fmt(r.pendiente) }}</div><div class="rcm-lbl">Pendiente</div><span class="pct-pill pill-amber">{{ r.pctPendiente }}%</span></div>
                  </div>
                  <div class="stacked-bar mt-2">
                    <div class="sb sb-green" :style="`width:${r.pctExito}%`"></div>
                    <div class="sb sb-amber" :style="`width:${r.pctPendiente}%`"></div>
                    <div class="sb sb-red"   :style="`width:${r.pctFallo}%`"></div>
                  </div>
                  <div v-if="r.pctExito < 40" class="rc-alert">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Tasa de recuperación baja. Considera revisar la estrategia de seguimiento.
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Agenda Global Pendientes (Líder) -->
          <div v-if="Object.keys(pendingByOrigin).length > 0" class="mb">
            <div class="panel-head panel-head-standalone">
              <div class="panel-title">Agenda Operativa Global: Llamadas Pendientes</div>
              <div class="panel-sub">Todas las llamadas programadas aún en estado pendiente, agrupadas por origen.</div>
            </div>
            <div class="pending-grid-lider">
              <div v-for="(group, alias) in pendingByOrigin" :key="alias" class="pend-card">
                <div class="pend-card-hdr">
                  <span class="pend-origin">{{ group.desc }}</span>
                  <span class="pend-badge">{{ group.leads.length }}</span>
                </div>
                <div class="pend-scroll">
                  <div v-for="lead in group.leads" :key="lead.lead_id" class="pend-item">
                    <div class="pend-info">
                      <div class="pend-name">{{ lead.lead_name !== '-' ? lead.lead_name : 'Prospecto sin nombre' }}</div>
                      <div class="pend-meta">
                        Intento #{{ lead.attempt_number }} ·
                        <span :class="new Date(lead.contact_datetime) < new Date() ? 'c-red' : 'c-teal'">
                          {{ fmtDate(lead.contact_datetime) }}
                        </span>
                      </div>
                    </div>
                    <button class="btn-manage" @click="goToLead(lead.lead_id)">Ver <i class="fa-solid fa-angle-right ms-1"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </template>
      </div>
    </main>

    <!-- ══════════════════════════════════════════════════ FOOTER -->
    <footer class="ps-foot">
      <span>{{ filters.month === 0 ? 'Año ' + filters.year : meses[filters.month - 1]?.l + ' ' + filters.year }}</span>
      <span class="foot-sep">·</span>
      <span>{{ isLider ? (filters.advisor === 'all' ? 'Todos los asesores' : filtroOwners.find(u => u.id == filters.advisor)?.description ?? filters.advisor) : 'Mi cuenta' }}</span>
      <span class="foot-sep">·</span>
      <span class="foot-status">
        <span class="status-dot" :class="isLoading ? 'dot-load' : 'dot-ok'"></span>
        {{ isLoading ? 'Actualizando...' : 'Sincronizado' }}
      </span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// ── Servicios ──────────────────────────────────────────────
const dashboardService = inject(ServiceKeys.Dashboard)
const authService      = inject(ServiceKeys.Auth)
const router           = useRouter()

// ── Role detection ─────────────────────────────────────────
const { proxy }  = getCurrentInstance()
const isLider    = proxy.$hasRole(['LIDER_COMERCIAL'])

// ── State ──────────────────────────────────────────────────
const filters        = ref({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, advisor: 'all' })
const isLoading      = ref(false)
const rawCallData    = ref([])   // contactabilityList
const rawLiderData   = ref([])   // liderList
const filtroOwners   = ref([])
const storedUser     = ref(null)
const myName         = ref('')
const isEffFilter    = ref(0)

const meses = [
  { v:1, l:'Enero'}, { v:2, l:'Febrero'}, { v:3, l:'Marzo'},
  { v:4, l:'Abril'}, { v:5, l:'Mayo'},    { v:6, l:'Junio'},
  { v:7, l:'Julio'}, { v:8, l:'Agosto'},  { v:9, l:'Septiembre'},
  { v:10, l:'Octubre'}, { v:11, l:'Noviembre'}, { v:12, l:'Diciembre'}
]

// ── Lifecycle ──────────────────────────────────────────────
onMounted(async () => {
  initUser()
  await loadOwners()
  await loadAll()
})

function initUser() {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const u = JSON.parse(userStr)
      storedUser.value = u
      if (!isLider) {
        filters.value.advisor = u.user_id
        myName.value = ((u.first_name || '') + ' ' + (u.last_name?.charAt(0) || '') + '.').trim()
      }
    }
  } catch (e) { console.error('[PanelLlamadas] initUser:', e) }
}

async function loadOwners() {
  if (!isLider) return
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => ({
      id: u.user_id,
      description: ((u.first_name || '') + ' ' + (u.last_name?.charAt(0) || '') + '.').trim()
    }))
  } catch (e) { console.error('[PanelLlamadas] loadOwners:', e) }
}

async function loadAll() {
  isLoading.value = true
  try {
    const advisor = isLider ? filters.value.advisor : storedUser.value?.user_id
    const params  = { year: filters.value.year, month: filters.value.month, advisor }

    const [callRes, liderRes] = await Promise.all([
      dashboardService.contactabilityList(params).catch(() => ({ items: [] })),
      dashboardService.liderList(params).catch(() => ({ items: [] }))
    ])

    rawCallData.value  = callRes.items  || []
    rawLiderData.value = liderRes.items || []
  } catch (e) {
    console.error('[PanelLlamadas] loadAll:', e)
  } finally {
    isLoading.value = false
  }
}

function selectAdvisor(cod) {
  filters.value.advisor = filters.value.advisor == cod ? 'all' : cod
}

// ── KPIs de llamadas (callData) ────────────────────────────
const callKPIs = computed(() => {
  let intentos = 0, contactados = 0, ventas = 0, ingresos = 0, leads = 0
  rawCallData.value.forEach(r => {
    intentos    += r.total_intentos          || 0
    contactados += r.total_contactados       || 0
    ventas      += r.total_ventas            || 0
    ingresos    += r.ingresos_recuperados    || 0
    leads       += r.total_leads_gestionados || 0
  })
  return {
    intentos, contactados, ventas, ingresos, leads,
    tasaContacto: intentos    > 0 ? +((contactados / intentos)  * 100).toFixed(1) : 0,
    conversion:   contactados > 0 ? +((ventas / contactados)    * 100).toFixed(1) : 0,
    promIntentos: leads       > 0 ? (intentos / leads).toFixed(1)                 : 0
  }
})

// ── KPIs supervisión (liderData) ───────────────────────────
const liderKPIs = computed(() => {
  let intentos = 0, atendidas = 0, sinAtencion = 0, pendientes = 0, leads = 0
  let totalRepro = 0, reproExito = 0
  rawLiderData.value.forEach(r => {
    intentos    += r.total_intentos     || 0
    atendidas   += r.total_atendidas    || 0
    sinAtencion += r.total_sin_atencion || 0
    pendientes  += r.total_pendientes   || 0
    leads       += r.total_leads        || 0
    ;(r.json_reschedule_stats || []).forEach(rs => {
      totalRepro += rs.total    || 0
      reproExito += rs.atendidas || 0
    })
  })
  return {
    intentos, atendidas, sinAtencion, pendientes, leads,
    reprogramadas:      totalRepro,
    pctAtendidas:       intentos   > 0 ? +((atendidas   / intentos)   * 100).toFixed(1) : 0,
    pctSinAtencion:     intentos   > 0 ? +((sinAtencion / intentos)   * 100).toFixed(1) : 0,
    pctRescheduleExito: totalRepro > 0 ? +((reproExito  / totalRepro) * 100).toFixed(1) : 0
  }
})

// ── Matriz Asesores (líder) ────────────────────────────────
const advisorRows = computed(() => {
  const map = {}
  rawLiderData.value.forEach(r => {
    if (!map[r.cod_asesor]) {
      map[r.cod_asesor] = { cod: r.cod_asesor, name: r.asesor_nombre || r.asesor_alias,
        leads:0, intentos:0, atendidas:0, sinAtencion:0, pendientes:0, reprogramadas:0 }
    }
    const a = map[r.cod_asesor]
    a.leads       += r.total_leads        || 0
    a.intentos    += r.total_intentos     || 0
    a.atendidas   += r.total_atendidas    || 0
    a.sinAtencion += r.total_sin_atencion || 0
    a.pendientes  += r.total_pendientes   || 0
    ;(r.json_reschedule_stats || []).forEach(rs => { a.reprogramadas += rs.total || 0 })
  })
  // Enriquecer con datos de contactabilidad
  const callMap = {}
  rawCallData.value.forEach(r => {
    if (!callMap[r.cod_asesor]) callMap[r.cod_asesor] = { contactados: 0, ventas: 0 }
    callMap[r.cod_asesor].contactados += r.total_contactados || 0
    callMap[r.cod_asesor].ventas      += r.total_ventas      || 0
  })
  return Object.values(map).map(a => {
    const c = callMap[a.cod] || {}
    return {
      ...a,
      contactados:    c.contactados || 0,
      ventas:         c.ventas      || 0,
      pctAtendidas:   a.intentos    > 0 ? +((a.atendidas   / a.intentos) * 100).toFixed(1) : 0,
      pctSinAtencion: a.intentos    > 0 ? +((a.sinAtencion / a.intentos) * 100).toFixed(1) : 0,
      pctContacto:    a.intentos    > 0 ? +((c.contactados / a.intentos) * 100).toFixed(1) : 0
    }
  }).sort((a, b) => b.sinAtencion - a.sinAtencion)
})

// ── Pendientes ─────────────────────────────────────────────
const pendingByOrigin = computed(() => {
  const map = {}
  const source = rawLiderData.value.length ? rawLiderData.value : rawCallData.value
  source.forEach(row => {
    ;(row.json_pending_tasks || []).forEach(group => {
      if (!map[group.origin_alias]) map[group.origin_alias] = { desc: group.origin_desc, leads: [] }
      map[group.origin_alias].leads.push(...group.leads)
    })
  })
  Object.values(map).forEach(g => g.leads.sort((a, b) => new Date(a.contact_datetime) - new Date(b.contact_datetime)))
  return map
})

// Asesor: lista plana con origin_desc
const allFlatPending = computed(() => {
  const result = []
  Object.entries(pendingByOrigin.value).forEach(([alias, group]) => {
    group.leads.forEach(lead => result.push({ ...lead, origin_alias: alias, origin_desc: group.desc }))
  })
  return result.sort((a, b) => new Date(a.contact_datetime) - new Date(b.contact_datetime))
})

const now               = new Date()
const overdueLeads      = computed(() => allFlatPending.value.filter(l => new Date(l.contact_datetime) < now))
const upcomingLeads     = computed(() => allFlatPending.value.filter(l => new Date(l.contact_datetime) >= now))
const totalPendingCount = computed(() => allFlatPending.value.length)
const overdueCount      = computed(() => overdueLeads.value.length)
const upcomingCount     = computed(() => upcomingLeads.value.length)

// ── Origen stats ───────────────────────────────────────────
const originRows = computed(() => {
  const map = {}
  rawLiderData.value.forEach(row => {
    ;(row.json_origin_stats || []).forEach(o => {
      if (!map[o.origin_alias]) map[o.origin_alias] = { alias: o.origin_alias, desc: o.origin_desc, total:0, atendidas:0, sinAtencion:0, pendientes:0 }
      const m = map[o.origin_alias]
      m.total       += o.total        || 0
      m.atendidas   += o.atendidas    || 0
      m.sinAtencion += o.sin_atencion || 0
      m.pendientes  += o.pendientes   || 0
    })
  })
  return Object.values(map).map(o => ({
    ...o,
    pctAtendida:    o.total > 0 ? +((o.atendidas   / o.total) * 100).toFixed(1) : 0,
    pctSinAtencion: o.total > 0 ? +((o.sinAtencion / o.total) * 100).toFixed(1) : 0,
    pctPendiente:   o.total > 0 ? +((o.pendientes  / o.total) * 100).toFixed(1) : 0
  })).sort((a, b) => b.total - a.total)
})

// ── Reprogramaciones ───────────────────────────────────────
const rescheduleRows = computed(() => {
  const map = {}
  rawLiderData.value.forEach(row => {
    ;(row.json_reschedule_stats || []).forEach(rs => {
      const k = rs.quien || 'desconocido'
      if (!map[k]) map[k] = { quien: k, total:0, atendidas:0, volvioFallar:0, pendiente:0 }
      map[k].total        += rs.total         || 0
      map[k].atendidas    += rs.atendidas     || 0
      map[k].volvioFallar += rs.volvio_fallar || 0
      map[k].pendiente    += rs.pendiente     || 0
    })
  })
  return Object.values(map).map(r => ({
    ...r,
    pctExito:     r.total > 0 ? +((r.atendidas    / r.total) * 100).toFixed(1) : 0,
    pctFallo:     r.total > 0 ? +((r.volvioFallar / r.total) * 100).toFixed(1) : 0,
    pctPendiente: r.total > 0 ? +((r.pendiente    / r.total) * 100).toFixed(1) : 0
  }))
})

// ── Objeciones ─────────────────────────────────────────────
const objectionsData = computed(() => {
  const objMap = {}; let totalObj = 0
  rawCallData.value.forEach(row => {
    ;(row.chart_objeciones || []).forEach(item => {
      if (item.es_efectivo === isEffFilter.value) {
        const nom = item.nombre || 'Desconocido'
        if (!objMap[nom]) objMap[nom] = 0
        objMap[nom] += item.frecuencia; totalObj += item.frecuencia
      }
    })
  })
  return Object.entries(objMap)
    .map(([reason, count]) => ({ reason, count, pct: totalObj > 0 ? Math.round((count / totalObj) * 100) : 0 }))
    .sort((a, b) => b.count - a.count).slice(0, 8)
})

// ── Tendencia horaria ──────────────────────────────────────
const baseFont = { family: 'inherit', size: 10.5 }

const hourlyFlowChartData = computed(() => {
  const hours = [8,9,10,11,12,13,14,15,16,17,18,19,20]
  const dmap  = {}
  hours.forEach(h => { dmap[h] = { intentos:0, contactados:0, ventas:0 } })
  rawCallData.value.forEach(row => {
    ;(row.chart_tendencia_horaria || []).forEach(item => {
      if (dmap[item.hora]) {
        dmap[item.hora].intentos    += item.intentos    || 0
        dmap[item.hora].contactados += item.contactados || 0
        dmap[item.hora].ventas      += item.ventas      || 0
      }
    })
  })
  return {
    labels: hours.map(h => String(h).padStart(2,'0') + ':00'),
    datasets: [
      {
        label: 'No Contactados', type: 'line',
        data: hours.map(h => { const d=dmap[h]; return d.intentos>0 ? +((Math.max(0,d.intentos-d.contactados)/d.intentos)*100).toFixed(1):0 }),
        borderColor:'#f87171', backgroundColor:'rgba(248,113,113,0.08)', fill:true, tension:0.4,
        borderWidth:1.5, borderDash:[5,4], pointRadius:3, pointBackgroundColor:'#f87171', yAxisID:'yPct'
      },
      {
        label: 'Contactados Efectivos', type: 'line',
        data: hours.map(h => { const d=dmap[h]; return d.intentos>0 ? +((d.contactados/d.intentos)*100).toFixed(1):0 }),
        borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.06)', fill:true, tension:0.4,
        borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#2563eb', yAxisID:'yPct'
      },
      {
        label: 'Cierre s/ Intentos', type: 'line',
        data: hours.map(h => { const d=dmap[h]; return d.intentos>0 ? +((d.ventas/d.intentos)*100).toFixed(1):0 }),
        borderColor:'#0f766e', backgroundColor:'rgba(15,118,110,0.12)', fill:true, tension:0.4,
        borderWidth:3, pointRadius:5, pointBackgroundColor:'#0f766e', yAxisID:'yPct'
      }
    ]
  }
})

const hourlyFlowOptions = {
  responsive:true, maintainAspectRatio:false,
  interaction:{ mode:'index', intersect:false },
  plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => ' '+ctx.dataset.label+': '+ctx.parsed.y+'%' } } },
  scales:{
    x: { grid:{ display:false }, ticks:{ font:baseFont } },
    yPct: { type:'linear', position:'left', beginAtZero:true, max:100, grid:{ color:'#f1f5f9' },
      ticks:{ font:baseFont, callback: v => v+'%' },
      title:{ display:true, text:'% sobre intentos', font:{ size:10 }, color:'#94a3b8' } }
  }
}

// ── Curva Persistencia ─────────────────────────────────────
const persistenceData = computed(() => {
  const keys = [1,2,3,4,'5+']; const labels = ['1er intento','2do intento','3er intento','4to intento','5to+']
  const pMap = {}
  keys.forEach(k => { pMap[k] = { intentos:0, contactados:0, ventas:0 } })
  rawCallData.value.forEach(row => {
    ;(row.chart_curva_persistencia || []).forEach(item => {
      const key = item.intento_num >= 5 ? '5+' : item.intento_num
      if (pMap[key] !== undefined) {
        pMap[key].intentos    += item.intentos    || 0
        pMap[key].contactados += item.contactados || 0
        pMap[key].ventas      += item.ventas      || 0
      }
    })
  })
  const steps = keys.map((k,i) => {
    const d = pMap[k]
    return {
      label: labels[i], intentos:d.intentos, contactados:d.contactados, ventas:d.ventas,
      tasaContacto: d.intentos    > 0 ? +((d.contactados/d.intentos)    *100).toFixed(0) : 0,
      tasaCierre:   d.contactados > 0 ? +((d.ventas/d.contactados)      *100).toFixed(0) : 0
    }
  })
  const totalIntentos = steps.reduce((s,r) => s+r.intentos, 0)
  const totalVentas   = steps.reduce((s,r) => s+r.ventas,   0)
  const peakIndex     = steps.reduce((best,s,i) => s.intentos>steps[best].intentos ? i : best, 0)
  return { steps, totalIntentos, totalVentas, peakIndex }
})

const maxIntentosPers = computed(() => Math.max(...persistenceData.value.steps.map(s => s.intentos), 1))
const getBarHeight = intentos => Math.max(6, Math.round((intentos / maxIntentosPers.value) * 100))
const getDropPct   = i => {
  const steps = persistenceData.value.steps
  const prev  = steps[i-1]?.intentos || 1
  const curr  = steps[i]?.intentos   || 0
  return Math.round(((prev-curr)/prev)*100)
}

const persistenceInsight = computed(() => {
  const { steps, totalIntentos, totalVentas } = persistenceData.value
  if (!steps.length || steps[0].intentos === 0) return null
  const p1 = totalIntentos > 0 ? Math.round((steps[0].intentos / totalIntentos) * 100) : 0
  const v1 = totalVentas   > 0 ? Math.round((steps[0].ventas   / totalVentas)   * 100) : 0
  const best = [...steps].filter(x => x.contactados > 0).sort((a,b) => b.tasaCierre - a.tasaCierre)[0]
  const extra = best && best.label !== '1er intento' && best.tasaCierre > 0
    ? ' Mejor ratio de cierre en el ' + best.label + ' (' + best.tasaCierre + '% de contactos cierran).'
    : ''
  return 'El ' + p1 + '% del esfuerzo está en el 1er intento, generando el ' + v1 + '% de ventas.' + extra
})

// ── Helpers ────────────────────────────────────────────────
const fmt      = v => new Intl.NumberFormat('es-PE').format(v || 0)
const fmtDate  = d => new Date(d).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
const initials = name => name ? name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() : '?'
const scoreColor = pct => { const n=Number(pct); return n>=60?'c-green':n>=40?'c-amber':'c-red' }
const goToLead = id => { if (!id) return; window.open(router.resolve({ name:'ComercialLeadDetalle', params:{ id } }).href,'_blank') }
</script>

<style scoped>
/* ══ SHELL ══════════════════════════════════════════════════ */
.ps-shell { background:#f1f5f9; min-height:100vh; display:flex; flex-direction:column; font-family:'Inter',system-ui,sans-serif; }
.ps-mode-asesor { --accent:#0f766e; --accent-light:#f0fdfa; --accent-mid:#5eead4; }
.ps-mode-lider  { --accent:#4f46e5; --accent-light:#eef2ff; --accent-mid:#818cf8; }

/* ══ HEADER ══════════════════════════════════════════════════ */
.ps-head { background:#0f172a; color:#fff; border-bottom:1px solid #1e293b; }
.ps-head-inner { display:flex; justify-content:space-between; align-items:center; padding:16px 28px 12px; border-bottom:1px solid rgba(255,255,255,.05); }
.ps-brand { display:flex; align-items:center; gap:13px; }
.ps-brand-stripe { width:3px; height:42px; background:linear-gradient(180deg,var(--accent),var(--accent-mid)); border-radius:2px; flex-shrink:0; }
.ps-eyebrow { display:block; font-size:9.5px; letter-spacing:.15em; text-transform:uppercase; color:#64748b; margin-bottom:3px; }
.ps-title { font-size:16px; font-weight:700; margin:0; color:#f1f5f9; letter-spacing:-.01em; }
.ps-btn-refresh { display:inline-flex; align-items:center; gap:7px; padding:7px 14px; background:var(--accent); color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:opacity .15s; }
.ps-btn-refresh:hover:not(:disabled) { opacity:.85; }
.ps-btn-refresh:disabled { opacity:.55; cursor:not-allowed; }
.ps-head-filters { display:flex; align-items:center; padding:0 28px; min-height:48px; gap:0; }
.pf-chip { display:flex; flex-direction:column; gap:2px; padding:8px 18px 8px 0; }
.pf-label { font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:#64748b; font-weight:700; }
.pf-select { background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,.15); color:#e2e8f0; font-family:inherit; font-size:12px; font-weight:500; padding:3px 0; outline:none; cursor:pointer; min-width:120px; }
.pf-select option { color:#0f172a; background:#fff; }
.pf-div { width:1px; height:26px; background:rgba(255,255,255,.08); margin:0 18px 0 0; }
.pf-pending-badge { margin-left:auto; display:flex; align-items:center; gap:8px; }
.pb-overdue { display:inline-flex; align-items:center; gap:5px; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.3); color:#f87171; font-size:11px; font-weight:700; padding:3px 10px; border-radius:10px; }
.pb-upcoming { display:inline-flex; align-items:center; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.3); color:#fbbf24; font-size:11px; font-weight:600; padding:3px 10px; border-radius:10px; }

/* ══ BODY ════════════════════════════════════════════════════ */
.ps-body { flex:1; padding:22px 28px; }
.ps-loader { display:flex; align-items:center; justify-content:center; gap:14px; min-height:380px; color:#64748b; font-size:13px; }
.loader-ring { width:34px; height:34px; border:3px solid #e2e8f0; border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite; }
.mb { margin-bottom:18px; }
.mt-2 { margin-top:8px; }
.fade-in { animation:fadeIn .3s ease; }

/* ══ KPI STRIP ═══════════════════════════════════════════════ */
.kpi-strip { display:grid; gap:13px; }
.kpi-4 { grid-template-columns:repeat(4,1fr); }
.kpi-5 { grid-template-columns:repeat(5,1fr); }
.kpi-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:15px 17px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.kpi-card-urgent { background:#1e293b; border-color:#334155; }
.kpi-card-dark   { background:#1e1b4b; border-color:#3730a3; }
.kpi-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
.kpi-label { font-size:9px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:#94a3b8; }
.kd { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.dot-slate { background:#94a3b8; } .dot-green { background:#22c55e; } .dot-red { background:#ef4444; }
.dot-amber { background:#f59e0b; } .dot-indigo { background:#818cf8; }
.kpi-value { font-size:22px; font-weight:800; color:#0f172a; font-variant-numeric:tabular-nums; letter-spacing:-.02em; margin-bottom:5px; }
.kpi-sub { font-size:11px; color:#94a3b8; }
.kv-green { color:#15803d; } .kv-amber { color:#b45309; } .kv-red { color:#b91c1c; }
.pct-pill { font-size:10px; font-weight:700; padding:1px 6px; border-radius:9px; margin-right:4px; }
.pill-green { background:#dcfce7; color:#15803d; } .pill-amber { background:#fef3c7; color:#b45309; } .pill-red { background:#fee2e2; color:#b91c1c; }

/* ══ AGENDA SECTION ══════════════════════════════════════════ */
.agenda-section { background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.04); }
.agenda-topbar { display:flex; justify-content:space-between; align-items:center; padding:16px 20px 14px; background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); border-bottom:1px solid rgba(255,255,255,.06); }
.agenda-topbar-left {}
.agenda-eyebrow { font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:#64748b; font-weight:600; margin-bottom:3px; }
.agenda-title-text { font-size:15px; font-weight:700; color:#f1f5f9; margin:0; letter-spacing:-.01em; }
.agenda-counters { display:flex; align-items:center; gap:0; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:10px; overflow:hidden; }
.ac-item { display:flex; flex-direction:column; align-items:center; padding:8px 16px; gap:2px; }
.ac-n { font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.ac-l { font-size:9px; text-transform:uppercase; letter-spacing:.08em; font-weight:600; opacity:.7; }
.ac-red  .ac-n { color:#f87171; } .ac-red  .ac-l { color:#f87171; }
.ac-amber .ac-n { color:#fbbf24; } .ac-amber .ac-l { color:#fbbf24; }
.ac-teal  .ac-n { color:#5eead4; } .ac-teal  .ac-l { color:#5eead4; }
.ac-divider { width:1px; height:32px; background:rgba(255,255,255,.1); }

.agenda-allclear { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:44px 24px; gap:10px; }
.allclear-icon  { font-size:40px; }
.allclear-title { font-size:16px; font-weight:700; color:#0f172a; }
.allclear-sub   { font-size:13px; color:#94a3b8; }

.ags-block { padding:16px 20px; }
.ags-block + .ags-block { border-top:1px solid #f1f5f9; }
.ags-hdr { display:flex; align-items:center; gap:8px; font-size:11.5px; font-weight:700; margin-bottom:12px; }
.ags-hdr--red  { color:#b91c1c; }
.ags-hdr--teal { color:#0f766e; }
.ags-cnt { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; margin-left:auto; }
.ags-cnt--red  { background:#fee2e2; color:#b91c1c; }
.ags-cnt--teal { background:#ccfbf1; color:#0f766e; }

/* ══ CALL GRID ═══════════════════════════════════════════════ */
.call-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:9px; }
.call-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:11px 14px; display:flex; align-items:center; gap:10px; transition:box-shadow .15s; }
.call-card:hover { box-shadow:0 3px 8px rgba(0,0,0,.08); }
.call-card--overdue { background:#fff5f5; border-color:#fecaca; border-left:3px solid #ef4444; }
.cc-urgency-bar { display:none; }
.cc-body { flex:1; min-width:0; }
.cc-name { font-size:13px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; }
.cc-meta { display:flex; flex-wrap:wrap; align-items:center; gap:5px; }
.cc-tag { font-size:9.5px; font-weight:700; padding:1px 6px; border-radius:4px; white-space:nowrap; }
.cc-tag--attempt { background:#f1f5f9; color:#475569; }
.cc-tag--origin  { background:#e0e7ff; color:#4338ca; }
.cc-time { display:inline-flex; align-items:center; gap:3px; font-size:10.5px; font-weight:600; }
.cc-time--overdue { color:#dc2626; }
.cc-time--ok      { color:#0f766e; }
.cc-overdue-pill { font-size:9px; font-weight:800; background:#ef4444; color:#fff; padding:1px 6px; border-radius:4px; letter-spacing:.05em; }
.btn-call { flex-shrink:0; display:inline-flex; align-items:center; gap:4px; padding:7px 14px; background:var(--accent); color:#fff; border:none; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; white-space:nowrap; }
.btn-call:hover { opacity:.85; }
.btn-call--urgent { background:#dc2626; }

/* ══ PANEL ════════════════════════════════════════════════════ */
.panel { background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.panel-head { padding:14px 18px; border-bottom:1px solid #f1f5f9; }
.panel-title { font-size:13px; font-weight:700; color:#0f172a; letter-spacing:-.01em; }
.panel-sub   { font-size:11px; color:#94a3b8; margin-top:2px; }
.panel-head-standalone { background:#fff; border:1px solid #e2e8f0; border-radius:8px 8px 0 0; border-bottom:none; padding:14px 18px; }
.empty-state { text-align:center; padding:28px; color:#94a3b8; font-size:12.5px; }

/* ══ TWO-COL LAYOUT ══════════════════════════════════════════ */
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

/* ══ ORIGIN LIST ═════════════════════════════════════════════ */
.origin-grid-list { padding:14px 18px; display:flex; flex-direction:column; gap:10px; }
.og-item { }
.og-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
.og-name { font-size:12px; font-weight:600; color:#334155; }
.og-total { font-size:10px; font-weight:700; background:#1e293b; color:#fff; padding:1px 7px; border-radius:8px; }
.stacked-bar { width:100%; height:7px; background:#f1f5f9; border-radius:4px; display:flex; overflow:hidden; }
.sb { height:100%; transition:width .4s ease; }
.sb-green { background:#22c55e; } .sb-amber { background:#f59e0b; } .sb-red { background:#ef4444; }
.og-stats { display:flex; gap:12px; margin-top:4px; }
.ogs { font-size:10.5px; font-weight:600; }

/* ══ TABLA ════════════════════════════════════════════════════ */
.table-scroll-sm { overflow-y:auto; max-height:260px; }
.table-scroll-lider { overflow-x:auto; max-height:55vh; overflow-y:auto; }
.ps-table { width:100%; border-collapse:collapse; font-size:12.5px; }
.ps-table thead tr { background:#f8fafc; position:sticky; top:0; z-index:2; }
.ps-table th { padding:7px 11px; font-size:9.5px; letter-spacing:.07em; text-transform:uppercase; font-weight:700; color:#64748b; border-bottom:2px solid #e2e8f0; white-space:nowrap; }
.ps-table td { padding:8px 11px; border-bottom:1px solid #f8fafc; }
.ps-table tbody tr:hover td { background:#f8fafc; }
.ta-r { text-align:right; }
.fw6 { font-weight:600; } .fw7 { font-weight:700; }
.th-sticky { position:sticky; left:0; z-index:3; background:#f8fafc; box-shadow:2px 0 4px -1px rgba(0,0,0,.07); }
.td-sticky { position:sticky; left:0; z-index:1; background:#fff; border-right:2px solid #e2e8f0; box-shadow:2px 0 4px -1px rgba(0,0,0,.07); }
.th-green { color:#15803d; background:#f0fdf4 !important; }
.th-red   { color:#b91c1c; background:#fff1f2 !important; }
.th-amber { color:#b45309; background:#fffbeb !important; }
.th-indigo{ color:#4f46e5; background:#eef2ff !important; }
.tr-lider { cursor:pointer; }
.tr-selected td { background:#eef2ff !important; }
.tr-lider:hover td:not(.td-sticky) { background:#f0f4ff !important; }
.tr-selected .td-sticky { background:#eef2ff !important; }
.advisor-cell { display:flex; align-items:center; gap:8px; font-weight:600; }
.advisor-av { width:24px; height:24px; border-radius:50%; background:var(--accent); color:#fff; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ibar-wrap { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
.ibar-val  { font-size:11.5px; font-weight:700; }
.ibar-track { width:54px; height:4px; background:#f1f5f9; border-radius:3px; overflow:hidden; }
.ibar-fill { height:100%; border-radius:3px; }
.ibar-green { background:#22c55e; } .ibar-red { background:#ef4444; }
.empty-cell { text-align:center; color:#94a3b8; padding:20px; }

/* ══ TOGGLE ═══════════════════════════════════════════════════ */
.toggle-group { display:inline-flex; background:#f1f5f9; border-radius:5px; padding:2px; }
.tgl-btn { background:transparent; border:none; padding:4px 12px; font-size:11px; font-weight:600; color:#475569; border-radius:4px; cursor:pointer; font-family:inherit; transition:all .12s; }
.tgl-teal { background:#fff; color:#0f766e; box-shadow:0 1px 2px rgba(0,0,0,.05); }
.tgl-red  { background:#fff; color:#b91c1c; box-shadow:0 1px 2px rgba(0,0,0,.05); }

/* ══ PROGRESS BAR ════════════════════════════════════════════ */
.prog-track { width:100%; height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden; }
.prog-fill  { height:100%; border-radius:3px; transition:width .4s; }
.pf-teal { background:#0f766e; } .pf-red { background:#b91c1c; }

/* ══ PERSISTENCIA ════════════════════════════════════════════ */
.pc-panel { background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.pc-head { display:flex; justify-content:space-between; align-items:flex-start; padding:14px 18px 12px; border-bottom:1px solid rgba(255,255,255,.06); background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); gap:12px; }
.pc-head-left { flex:1; }
.pc-eyebrow { display:block; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:#64748b; font-weight:600; margin-bottom:3px; }
.pc-title { font-size:13.5px; font-weight:700; color:#f1f5f9; margin:0 0 2px; }
.pc-sub   { font-size:11px; color:#475569; margin:0; }
.pc-pills { display:flex; flex-direction:column; gap:5px; align-items:flex-end; flex-shrink:0; }
.pc-pill  { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:4px 11px; }
.pc-pill--green { border-color:rgba(34,197,94,.3); background:rgba(34,197,94,.07); }
.pcpl { font-size:9px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.pcpv { font-size:13px; font-weight:800; color:#f1f5f9; font-variant-numeric:tabular-nums; }
.pc-steps { display:flex; padding:16px 12px 8px; overflow-x:auto; gap:0; align-items:stretch; }
.pc-step { flex:1; min-width:110px; display:flex; flex-direction:column; align-items:center; padding:0 6px 10px; border-radius:8px; position:relative; }
.pc-step--peak { background:linear-gradient(180deg,#f0f9ff 0%,rgba(240,249,255,0) 80%); }
.pc-step--peak .step-bar-fill { background:linear-gradient(180deg,#3b82f6,#1d4ed8); box-shadow:0 0 8px rgba(59,130,246,.35); }
.step-lbl { display:flex; flex-direction:column; align-items:center; gap:3px; margin-bottom:8px; }
.step-num { font-size:10px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.03em; text-align:center; }
.step-tag { font-size:8.5px; font-weight:700; padding:1px 5px; border-radius:8px; text-transform:uppercase; letter-spacing:.04em; }
.step-tag--peak { background:#dbeafe; color:#1d4ed8; }
.step-tag--drop { background:#fff7ed; color:#c2410c; }
.step-bar-track { width:24px; height:56px; background:#f1f5f9; border-radius:5px; display:flex; align-items:flex-end; overflow:hidden; margin-bottom:10px; flex-shrink:0; }
.step-bar-fill { width:100%; background:linear-gradient(180deg,#94a3b8,#64748b); border-radius:5px; position:relative; transition:height .5s cubic-bezier(.34,1.56,.64,1); }
.bar-shine { position:absolute; top:0; left:0; right:0; height:35%; background:rgba(255,255,255,.2); border-radius:5px 5px 0 0; }
.step-data { display:flex; flex-direction:column; align-items:stretch; width:100%; gap:2px; }
.sd-row { display:flex; align-items:center; gap:5px; border-radius:6px; padding:5px 8px; border:1px solid transparent; }
.sd-row--slate { background:#f8fafc; border-color:#e2e8f0; }
.sd-row--blue  { background:#eff6ff; border-color:#bfdbfe; }
.sd-row--green { background:#f0fdf4; border-color:#bbf7d0; }
.sd-n { font-size:16px; font-weight:800; color:#0f172a; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.sd-n--blue  { color:#1d4ed8; } .sd-n--green { color:#16a34a; }
.sd-l { font-size:8.5px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; font-weight:600; }
.sd-rate { font-size:9.5px; font-weight:700; padding:2px 6px; text-align:center; border-radius:4px; }
.rate-green { color:#15803d; background:rgba(21,128,61,.08); }
.rate-amber { color:#b45309; background:rgba(180,83,9,.08); }
.rate-red   { color:#b91c1c; background:rgba(185,28,28,.08); }
.sd-empty { font-size:9.5px; color:#cbd5e1; font-style:italic; text-align:center; border:1px dashed #e2e8f0; border-radius:5px; padding:4px; }
.step-connector { position:absolute; right:-10px; top:38%; color:#cbd5e1; font-size:14px; font-weight:700; z-index:2; }
.pc-insight { display:flex; gap:9px; align-items:flex-start; padding:10px 18px; border-top:1px solid #f1f5f9; background:#fffbeb; }
.pc-insight span { font-size:11px; color:#78350f; line-height:1.55; }
.pc-insight strong { color:#92400e; }

/* ══ TENDENCIA ═══════════════════════════════════════════════ */
.chart-legend-row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; font-size:11px; color:#475569; font-weight:500; padding:8px 18px; border-bottom:1px solid #f8fafc; }
.cl-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:3px; }
.chart-area { padding:14px 18px; height:240px; }

/* ══ REPROGRAMACIONES ════════════════════════════════════════ */
.reschedule-list { padding:14px 18px; display:flex; flex-direction:column; gap:12px; }
.rc-card { border:1px solid #e2e8f0; border-radius:7px; padding:13px; }
.rc-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.rc-who { font-size:11px; font-weight:700; padding:3px 9px; border-radius:10px; }
.rc-who--lider   { background:#e0e7ff; color:#4f46e5; }
.rc-who--sistema { background:#f1f5f9; color:#475569; }
.rc-total-lbl { font-size:11px; color:#64748b; }
.rc-metrics { display:flex; gap:0; }
.rcm { flex:1; text-align:center; padding:6px 4px; }
.rcm-val { font-size:20px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.rcm-lbl { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; margin:2px 0; }
.rc-alert { display:flex; align-items:flex-start; gap:6px; margin-top:9px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:7px 10px; font-size:10.5px; color:#92400e; }

/* ══ PENDING (LIDER) ══════════════════════════════════════════ */
.pending-grid-lider { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:13px; background:#f1f5f9; padding:13px; border:1px solid #e2e8f0; border-radius:0 0 8px 8px; }
.pend-card { background:#fff; border:1px solid #e2e8f0; border-radius:7px; overflow:hidden; }
.pend-card-hdr { background:#1e293b; color:#fff; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; }
.pend-origin { font-size:11.5px; font-weight:600; color:#e2e8f0; }
.pend-badge  { background:var(--accent); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:9px; }
.pend-scroll { max-height:210px; overflow-y:auto; }
.pend-item   { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-bottom:1px solid #f8fafc; }
.pend-item:last-child { border-bottom:none; }
.pend-item:hover { background:#f8fafc; }
.pend-name { font-size:12.5px; font-weight:600; color:#0f172a; }
.pend-meta { font-size:10.5px; color:#94a3b8; margin-top:1px; }
.btn-manage { background:transparent; border:1px solid #cbd5e1; color:#475569; font-size:11px; font-weight:600; padding:4px 10px; border-radius:4px; cursor:pointer; transition:all .15s; white-space:nowrap; }
.btn-manage:hover { background:var(--accent-light); color:var(--accent); border-color:var(--accent-mid); }

/* ══ FOOTER ══════════════════════════════════════════════════ */
.ps-foot { display:flex; align-items:center; gap:8px; padding:10px 28px; background:#fff; border-top:1px solid #e2e8f0; font-size:11.5px; color:#94a3b8; font-weight:500; }
.ps-foot strong { color:#475569; }
.foot-sep { color:#e2e8f0; }
.foot-status { display:flex; align-items:center; gap:6px; margin-left:auto; }
.status-dot { width:6px; height:6px; border-radius:50%; }
.dot-ok   { background:#22c55e; }
.dot-load { background:#f59e0b; animation:pulse 1s ease-in-out infinite; }

/* ══ UTILS ═══════════════════════════════════════════════════ */
.c-green  { color:#15803d; } .c-amber  { color:#b45309; }
.c-red    { color:#b91c1c; } .c-indigo { color:#4f46e5; }
.c-teal   { color:#0f766e; font-weight:600; }

/* ══ ANIMATIONS ══════════════════════════════════════════════ */
@keyframes spin    { to { transform:rotate(360deg); } }
@keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.spin { animation:spin .8s linear infinite; }

/* ══ RESPONSIVE ══════════════════════════════════════════════ */
@media (max-width:1200px) {
  .kpi-5 { grid-template-columns:repeat(3,1fr); }
  .two-col { grid-template-columns:1fr; }
}
@media (max-width:900px) {
  .kpi-4 { grid-template-columns:1fr 1fr; }
  .kpi-5 { grid-template-columns:1fr 1fr; }
}
@media (max-width:640px) {
  .ps-body { padding:14px; }
  .ps-head-inner, .ps-head-filters { padding-left:14px; padding-right:14px; }
  .kpi-4 { grid-template-columns:1fr 1fr; }
  .call-grid { grid-template-columns:1fr; }
}
</style>
