<template>
  <div class="rc-page" :class="isLider ? 'rc-mode-lider' : 'rc-mode-asesor'">

    <!-- ═══════════════ MASTHEAD ═══════════════ -->
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">COMERCIAL</span>
        <h1 class="ep-title">{{ isLider ? 'Dashboard Líder Comercial' : 'Panel de Llamadas' }}</h1>
        <span class="ep-subtitle">
          {{ isLider ? 'Supervisión de gestión y contactabilidad' : 'Mi centro operativo · ' + (myName || 'Asesor') }}
        </span>
      </div>
      <div class="ep-masthead-actions">
        <div v-if="!isLider && totalPendingCount > 0" class="rc-pending-badges">
          <span v-if="overdueCount > 0" class="rc-badge rc-badge-red">
            <i class="fa-solid fa-circle-exclamation"></i> {{ overdueCount }} vencidas
          </span>
          <span class="rc-badge rc-badge-amber">{{ upcomingCount }} próximas</span>
        </div>
        <button class="ep-btn-export" :disabled="isLoading" @click="loadAll">
          <i class="fa-solid" :class="isLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
          {{ isLoading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>
    </header>

    <!-- ═══════════════ FILTROS ═══════════════ -->
    <section class="ep-section ep-filter-bar">
      <div class="ep-filter-bar-main">
        <div class="rc-filters">
          <div class="rc-filter-chip">
            <span class="rc-filter-label">Año</span>
            <select class="rc-filter-select" v-model="filters.year" @change="loadAll">
              <option :value="2026">2026</option>
              <option :value="2025">2025</option>
              <option :value="2024">2024</option>
            </select>
          </div>
          <div class="rc-filter-chip">
            <span class="rc-filter-label">Mes</span>
            <select class="rc-filter-select" v-model="filters.month" @change="loadAll">
              <option :value="0">Todo el año</option>
              <option v-for="m in meses" :key="m.v" :value="m.v">{{ m.l }}</option>
            </select>
          </div>
          <div v-if="isLider" class="rc-filter-chip">
            <span class="rc-filter-label">Asesor</span>
            <select class="rc-filter-select" v-model="filters.advisor" @change="loadAll">
              <option value="all">Todos</option>
              <option v-for="u in filtroOwners" :key="u.id" :value="u.id">{{ u.description }}</option>
            </select>
          </div>
        </div>
        <div class="rc-status">
          <span class="rc-status-dot" :class="isLoading ? 'is-load' : 'is-ok'"></span>
          {{ isLoading ? 'Actualizando...' : 'Sincronizado' }}
          <span class="rc-status-sep">·</span>
          {{ filters.month === 0 ? 'Año ' + filters.year : (meses[filters.month - 1]?.l || '') + ' ' + filters.year }}
          <span v-if="isLider" class="rc-status-sep">·</span>
          <span v-if="isLider">
            {{ filters.advisor === 'all' ? 'Todos los asesores' : (filtroOwners.find(u => u.id == filters.advisor)?.description ?? filters.advisor) }}
          </span>
        </div>
      </div>
    </section>

    <!-- ═══════════════ LOADER ═══════════════ -->
    <div v-if="isLoading" class="rc-loader">
      <div class="rc-loader-ring"></div>
      <span>{{ isLider ? 'Consultando registros…' : 'Cargando tu panel…' }}</span>
    </div>

    <!-- ═══════════════ CONTENT ═══════════════ -->
    <div v-else class="rc-fadein">

      <!-- ════════ MODO ASESOR ════════ -->
      <template v-if="!isLider">

        <!-- KPIs personales -->
        <section class="ep-section">
          <div class="ep-kpis ep-kpis-4">
            <article class="ep-kpi ep-kpi-teal">
              <div class="ep-kpi-head">
                <span class="ep-kpi-label">Mis intentos</span>
                <i class="fa-solid fa-phone-volume ep-kpi-icon"></i>
              </div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(callKPIs.intentos) }}</span></div>
              <span class="ep-kpi-foot">{{ fmt(callKPIs.leads) }} leads · prom. <strong>{{ callKPIs.promIntentos }}</strong>/lead</span>
            </article>
            <article class="ep-kpi" :class="callKPIs.tasaContacto >= 40 ? 'ep-kpi-green' : callKPIs.tasaContacto >= 25 ? 'ep-kpi-amber' : 'ep-kpi-red'">
              <div class="ep-kpi-head">
                <span class="ep-kpi-label">Contactabilidad</span>
                <i class="fa-solid fa-bullseye ep-kpi-icon"></i>
              </div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ callKPIs.tasaContacto }}%</span></div>
              <span class="ep-kpi-foot"><strong>{{ fmt(callKPIs.contactados) }}</strong> contactados efectivos</span>
            </article>
            <article class="ep-kpi ep-kpi-green">
              <div class="ep-kpi-head">
                <span class="ep-kpi-label">Mis ventas</span>
                <i class="fa-solid fa-circle-check ep-kpi-icon"></i>
              </div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(callKPIs.ventas) }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ callKPIs.conversion }}%</strong> tasa de cierre</span>
            </article>
            <article class="ep-kpi ep-kpi-red" :class="{ 'is-urgent': overdueCount > 0 }">
              <div class="ep-kpi-head">
                <span class="ep-kpi-label">Pendientes</span>
                <i class="fa-solid fa-clock ep-kpi-icon"></i>
              </div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ totalPendingCount }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ overdueCount }}</strong> vencidas · {{ upcomingCount }} próximas</span>
            </article>
          </div>
        </section>

        <!-- Agenda -->
        <section class="ep-section rc-card">
          <header class="rc-card-head">
            <div class="rc-card-head-left">
              <span class="rc-eyebrow">Gestión activa</span>
              <h2 class="rc-card-title">Mi agenda de llamadas</h2>
              <p class="rc-card-sub">Lo que tienes que atender hoy, ordenado por urgencia.</p>
            </div>
            <div v-if="totalPendingCount > 0" class="rc-counters">
              <div class="rc-counter rc-counter-red"><span class="rc-counter-n">{{ overdueCount }}</span><span class="rc-counter-l">Vencidas</span></div>
              <div class="rc-counter-divider"></div>
              <div class="rc-counter rc-counter-amber"><span class="rc-counter-n">{{ upcomingCount }}</span><span class="rc-counter-l">Próximas</span></div>
              <div class="rc-counter-divider"></div>
              <div class="rc-counter rc-counter-teal"><span class="rc-counter-n">{{ Object.keys(pendingByOrigin).length }}</span><span class="rc-counter-l">Orígenes</span></div>
            </div>
          </header>

          <div v-if="totalPendingCount === 0" class="rc-empty rc-empty-clean">
            <i class="fa-solid fa-circle-check rc-empty-icon"></i>
            <div class="rc-empty-title">¡Todo al día!</div>
            <div class="rc-empty-sub">No tienes llamadas pendientes en este periodo. Buen trabajo.</div>
          </div>

          <template v-else>
            <div v-if="overdueLeads.length" class="rc-block">
              <div class="rc-block-hdr rc-block-hdr-red">
                <i class="fa-solid fa-circle-exclamation"></i>
                Vencidas — atiende primero
                <span class="rc-block-cnt rc-block-cnt-red">{{ overdueLeads.length }}</span>
              </div>
              <div class="rc-call-grid">
                <article v-for="item in overdueLeads" :key="item.lead_id" class="rc-call rc-call-overdue">
                  <div class="rc-call-body">
                    <div class="rc-call-name">{{ item.lead_name !== '-' ? item.lead_name : 'Prospecto sin nombre' }}</div>
                    <div class="rc-call-meta">
                      <span class="rc-tag rc-tag-attempt">#{{ item.attempt_number }}</span>
                      <span class="rc-tag rc-tag-origin">{{ item.origin_desc }}</span>
                      <span class="rc-call-time rc-call-time-overdue">
                        <i class="fa-solid fa-clock"></i> {{ fmtDate(item.contact_datetime) }}
                      </span>
                      <span class="rc-call-pill">VENCIDA</span>
                    </div>
                  </div>
                  <button class="rc-btn rc-btn-urgent" @click="goToLead(item.lead_id)">
                    Atender <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </article>
              </div>
            </div>

            <div v-if="upcomingLeads.length" class="rc-block">
              <div class="rc-block-hdr rc-block-hdr-teal">
                <i class="fa-solid fa-clock"></i>
                Próximas llamadas
                <span class="rc-block-cnt rc-block-cnt-teal">{{ upcomingLeads.length }}</span>
              </div>
              <div class="rc-call-grid">
                <article v-for="item in upcomingLeads" :key="item.lead_id" class="rc-call">
                  <div class="rc-call-body">
                    <div class="rc-call-name">{{ item.lead_name !== '-' ? item.lead_name : 'Prospecto sin nombre' }}</div>
                    <div class="rc-call-meta">
                      <span class="rc-tag rc-tag-attempt">#{{ item.attempt_number }}</span>
                      <span class="rc-tag rc-tag-origin">{{ item.origin_desc }}</span>
                      <span class="rc-call-time">
                        <i class="fa-solid fa-clock"></i> {{ fmtDate(item.contact_datetime) }}
                      </span>
                    </div>
                  </div>
                  <button class="rc-btn" @click="goToLead(item.lead_id)">
                    Ver <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </article>
              </div>
            </div>
          </template>
        </section>

        <!-- Origen + Resultados -->
        <div class="rc-two-col">
          <section class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Distribución</span>
                <h2 class="rc-card-title">Efectividad por origen</h2>
                <p class="rc-card-sub">Qué tipo de lead te contacta y genera cierre.</p>
              </div>
            </header>
            <div v-if="originRows.length === 0" class="rc-empty">Sin datos para el periodo.</div>
            <div v-else class="rc-origin-list">
              <div v-for="o in originRows" :key="o.alias" class="rc-origin-row">
                <div class="rc-origin-top">
                  <span class="rc-origin-name">{{ o.desc }}</span>
                  <span class="rc-origin-total">{{ fmt(o.total) }}</span>
                </div>
                <div class="rc-stacked-bar">
                  <div class="rc-sb rc-sb-green" :style="`width:${o.pctAtendida}%`" :title="`Atendidas: ${o.pctAtendida}%`"></div>
                  <div class="rc-sb rc-sb-amber" :style="`width:${o.pctPendiente}%`" :title="`Pendientes: ${o.pctPendiente}%`"></div>
                  <div class="rc-sb rc-sb-red" :style="`width:${o.pctSinAtencion}%`" :title="`Sin atención: ${o.pctSinAtencion}%`"></div>
                </div>
                <div class="rc-origin-stats">
                  <span class="c-green">{{ o.pctAtendida }}% atend.</span>
                  <span class="c-amber">{{ o.pctPendiente }}% pend.</span>
                  <span class="c-red">{{ o.pctSinAtencion }}% s/a</span>
                </div>
              </div>
            </div>
          </section>

          <section class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Razones</span>
                <h2 class="rc-card-title">Resultados de llamada</h2>
                <p class="rc-card-sub">Razones registradas por efectividad.</p>
              </div>
              <div class="rc-toggle">
                <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': isEffFilter === 1 }" @click="isEffFilter = 1">Efectivos</button>
                <button class="rc-toggle-btn" :class="{ 'is-active is-active-red': isEffFilter === 0 }" @click="isEffFilter = 0">No efectivos</button>
              </div>
            </header>
            <div class="rc-table-wrap rc-table-wrap-sm">
              <table class="exec-table rc-table">
                <thead>
                  <tr>
                    <th class="ts ts-c">Razón</th>
                    <th class="ts ts-c text-end">Frec.</th>
                    <th class="ts ts-c text-end">%</th>
                    <th class="ts ts-c" style="width:30%">Distribución</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in objectionsData" :key="o.reason">
                    <td class="td-a fw-600">{{ o.reason }}</td>
                    <td class="td-a text-end">{{ fmt(o.count) }}</td>
                    <td class="td-a text-end fw-700">{{ o.pct }}%</td>
                    <td class="td-a"><div class="rc-progress"><div class="rc-progress-fill" :class="isEffFilter === 1 ? 'is-teal' : 'is-red'" :style="`width:${o.pct}%`"></div></div></td>
                  </tr>
                  <tr v-if="objectionsData.length === 0">
                    <td colspan="4" class="empty-state">Sin registros en esta categoría.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- Persistencia + Tendencia -->
        <div class="rc-two-col">
          <section class="ep-section rc-card rc-card-persistence">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Análisis de seguimiento</span>
                <h2 class="rc-card-title">Curva de persistencia</h2>
                <p class="rc-card-sub">¿En qué intento contactas y cierras más?</p>
              </div>
              <div class="rc-card-head-actions">
                <div class="rc-pills">
                  <div class="rc-pill-stat"><span class="rc-pill-l">Intentos</span><span class="rc-pill-v">{{ fmt(persistenceData.totalIntentos) }}</span></div>
                  <div class="rc-pill-stat is-green"><span class="rc-pill-l">Ventas</span><span class="rc-pill-v">{{ fmt(persistenceData.totalVentas) }}</span></div>
                </div>
                <div class="rc-toggle">
                  <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': persistenceMode === 'monthly' }" @click="persistenceMode = 'monthly'">Este mes</button>
                  <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': persistenceMode === 'global' }" @click="persistenceMode = 'global'">Histórico</button>
                </div>
              </div>
            </header>
            <div v-if="!persistenceData.steps.length" class="rc-empty">Sin datos.</div>
            <div v-else class="rc-steps">
              <div v-for="(step, i) in persistenceData.steps" :key="i" class="rc-step" :class="{ 'is-peak': i === persistenceData.peakIndex }">
                <div class="rc-step-lbl">
                  <span class="rc-step-num">{{ step.label }}</span>
                  <span v-if="i === persistenceData.peakIndex" class="rc-step-tag is-peak">+ activo</span>
                  <span v-else-if="i > 0 && getDropPct(i) >= 50" class="rc-step-tag is-drop">-{{ getDropPct(i) }}%</span>
                </div>
                <div class="rc-step-track"><div class="rc-step-fill" :style="{ height: getBarHeight(step.intentos) + '%' }"></div></div>
                <div class="rc-step-data">
                  <div class="rc-sd is-slate"><span class="rc-sd-n">{{ fmt(step.intentos) }}</span><span class="rc-sd-l">Intentos</span></div>
                  <div class="rc-sd-rate" :class="step.tasaContacto >= 50 ? 'is-green' : step.tasaContacto >= 25 ? 'is-amber' : 'is-red'">↓ {{ step.tasaContacto }}% contacto</div>
                  <div class="rc-sd is-blue"><span class="rc-sd-n is-blue">{{ fmt(step.contactados) }}</span><span class="rc-sd-l">Contactados</span></div>
                  <template v-if="step.ventas > 0">
                    <div class="rc-sd-rate is-green">↓ {{ step.tasaCierre }}% cerró</div>
                    <div class="rc-sd is-green"><span class="rc-sd-n is-green">{{ fmt(step.ventas) }}</span><span class="rc-sd-l">Ventas</span></div>
                  </template>
                  <div v-else class="rc-sd-empty">Sin cierres</div>
                </div>
              </div>
            </div>
            <div v-if="persistenceInsight" class="rc-insight">
              <i class="fa-solid fa-lightbulb"></i>
              <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
            </div>
          </section>

          <section class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Por hora</span>
                <h2 class="rc-card-title">Tendencia horaria</h2>
                <p class="rc-card-sub">Correlación entre intentos, contacto y cierre.</p>
              </div>
            </header>
            <div class="rc-chart-legend">
              <span class="rc-legend"><span class="rc-legend-dot" style="background:rgba(148,163,184,0.7)"></span> Intentos</span>
              <span class="rc-legend"><span class="rc-legend-dot" style="background:#2563eb"></span> % Contactados</span>
              <span class="rc-legend"><span class="rc-legend-dot" style="background:#0f766e"></span> % Cierre</span>
            </div>
            <div class="rc-chart"><Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" /></div>
          </section>
        </div>
      </template>

      <!-- ════════ MODO LÍDER ════════ -->
      <template v-else>

        <section class="ep-section">
          <div class="ep-kpis ep-kpis-5">
            <article class="ep-kpi ep-kpi-teal">
              <div class="ep-kpi-head"><span class="ep-kpi-label">Intentos totales</span><i class="fa-solid fa-phone-volume ep-kpi-icon"></i></div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(liderKPIs.intentos) }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ fmt(liderKPIs.leads) }}</strong> leads gestionados</span>
            </article>
            <article class="ep-kpi ep-kpi-green">
              <div class="ep-kpi-head"><span class="ep-kpi-label">Atendidas</span><i class="fa-solid fa-circle-check ep-kpi-icon"></i></div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(liderKPIs.atendidas) }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ liderKPIs.pctAtendidas }}%</strong> del total</span>
            </article>
            <article class="ep-kpi ep-kpi-red">
              <div class="ep-kpi-head"><span class="ep-kpi-label">Sin atención</span><i class="fa-solid fa-circle-xmark ep-kpi-icon"></i></div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(liderKPIs.sinAtencion) }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ liderKPIs.pctSinAtencion }}%</strong> incumplimiento</span>
            </article>
            <article class="ep-kpi" :class="callKPIs.tasaContacto >= 40 ? 'ep-kpi-green' : 'ep-kpi-amber'">
              <div class="ep-kpi-head"><span class="ep-kpi-label">Contactabilidad</span><i class="fa-solid fa-bullseye ep-kpi-icon"></i></div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ callKPIs.tasaContacto }}%</span></div>
              <span class="ep-kpi-foot"><strong>{{ fmt(callKPIs.contactados) }}</strong> contactados</span>
            </article>
            <article class="ep-kpi ep-kpi-indigo">
              <div class="ep-kpi-head"><span class="ep-kpi-label">Reprogramadas</span><i class="fa-solid fa-rotate ep-kpi-icon"></i></div>
              <div class="ep-kpi-main"><span class="ep-kpi-value">{{ fmt(liderKPIs.reprogramadas) }}</span></div>
              <span class="ep-kpi-foot"><strong>{{ liderKPIs.pctRescheduleExito }}%</strong> se atendieron después</span>
            </article>
          </div>
        </section>

        <!-- Tendencia horaria full -->
        <section class="ep-section rc-card">
          <header class="rc-card-head">
            <div class="rc-card-head-left">
              <span class="rc-eyebrow">Por hora</span>
              <h2 class="rc-card-title">Tendencia horaria: del intento al pago</h2>
              <p class="rc-card-sub">Correlación entre esfuerzo, contacto y cierre por franja.</p>
            </div>
            <div class="rc-chart-legend">
              <span class="rc-legend"><span class="rc-legend-dot" style="background:rgba(148,163,184,0.7)"></span> Intentos</span>
              <span class="rc-legend"><span class="rc-legend-dot" style="background:#2563eb"></span> % Contactados</span>
              <span class="rc-legend"><span class="rc-legend-dot" style="background:#0f766e"></span> % Cierre</span>
            </div>
          </header>
          <div class="rc-chart" style="height:300px"><Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" /></div>
        </section>

        <!-- Matriz Asesores -->
        <section v-if="advisorRows.length" class="ep-section rc-card">
          <header class="rc-card-head">
            <div class="rc-card-head-left">
              <span class="rc-eyebrow">Equipo</span>
              <h2 class="rc-card-title">Matriz de asesores</h2>
              <p class="rc-card-sub">Rendimiento individual. Click en fila para filtrar.</p>
            </div>
          </header>
          <div class="rc-table-wrap rc-table-wrap-lider">
            <table class="exec-table rc-table rc-table-lider">
              <thead>
                <tr>
                  <th class="ts ts-c rc-th-sticky text-start">Asesor</th>
                  <th class="ts ts-c text-end">Leads</th>
                  <th class="ts ts-c text-end">Intentos</th>
                  <th class="ts ts-c text-end rc-th-green">Atendidas</th>
                  <th class="ts ts-c text-end rc-th-green">% Atend.</th>
                  <th class="ts ts-c text-end rc-th-red">Sin Aten.</th>
                  <th class="ts ts-c text-end rc-th-red">% S/A</th>
                  <th class="ts ts-c text-end">Contactados</th>
                  <th class="ts ts-c text-end">% Contact.</th>
                  <th class="ts ts-c text-end rc-th-green">Ventas</th>
                  <th class="ts ts-c text-end rc-th-amber">Pendientes</th>
                  <th class="ts ts-c text-end rc-th-indigo">Reprog.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in advisorRows" :key="row.cod" class="rc-tr-clickable" :class="{ 'is-selected': filters.advisor == row.cod }" @click="selectAdvisor(row.cod)">
                  <td class="td-a rc-td-sticky">
                    <div class="rc-advisor"><div class="rc-avatar">{{ initials(row.name) }}</div>{{ row.name }}</div>
                  </td>
                  <td class="td-a text-end">{{ fmt(row.leads) }}</td>
                  <td class="td-a text-end fw-600">{{ fmt(row.intentos) }}</td>
                  <td class="td-a text-end c-green fw-700">{{ fmt(row.atendidas) }}</td>
                  <td class="td-a text-end">
                    <div class="rc-bar-cell">
                      <span class="rc-bar-val" :class="scoreColor(row.pctAtendidas)">{{ row.pctAtendidas }}%</span>
                      <div class="rc-bar-track"><div class="rc-bar-fill is-green" :style="`width:${row.pctAtendidas}%`"></div></div>
                    </div>
                  </td>
                  <td class="td-a text-end c-red fw-700">{{ fmt(row.sinAtencion) }}</td>
                  <td class="td-a text-end">
                    <div class="rc-bar-cell">
                      <span class="rc-bar-val c-red">{{ row.pctSinAtencion }}%</span>
                      <div class="rc-bar-track"><div class="rc-bar-fill is-red" :style="`width:${row.pctSinAtencion}%`"></div></div>
                    </div>
                  </td>
                  <td class="td-a text-end">{{ fmt(row.contactados) }}</td>
                  <td class="td-a text-end" :class="scoreColor(row.pctContacto)">{{ row.pctContacto }}%</td>
                  <td class="td-a text-end c-green fw-700">{{ fmt(row.ventas) }}</td>
                  <td class="td-a text-end c-amber">{{ fmt(row.pendientes) }}</td>
                  <td class="td-a text-end c-indigo">{{ fmt(row.reprogramadas) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Persistencia + Resultados -->
        <div class="rc-two-col">
          <section class="ep-section rc-card rc-card-persistence">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Análisis de seguimiento</span>
                <h2 class="rc-card-title">Curva de persistencia</h2>
                <p class="rc-card-sub">¿En qué intento se contacta y se cierra?</p>
              </div>
              <div class="rc-card-head-actions">
                <div class="rc-pills">
                  <div class="rc-pill-stat"><span class="rc-pill-l">Intentos</span><span class="rc-pill-v">{{ fmt(persistenceData.totalIntentos) }}</span></div>
                  <div class="rc-pill-stat is-green"><span class="rc-pill-l">Ventas</span><span class="rc-pill-v">{{ fmt(persistenceData.totalVentas) }}</span></div>
                </div>
                <div class="rc-toggle">
                  <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': persistenceMode === 'monthly' }" @click="persistenceMode = 'monthly'">Este mes</button>
                  <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': persistenceMode === 'global' }" @click="persistenceMode = 'global'">Histórico</button>
                </div>
              </div>
            </header>
            <div v-if="!persistenceData.steps.length" class="rc-empty">Sin datos.</div>
            <div v-else class="rc-steps">
              <div v-for="(step, i) in persistenceData.steps" :key="i" class="rc-step" :class="{ 'is-peak': i === persistenceData.peakIndex }">
                <div class="rc-step-lbl">
                  <span class="rc-step-num">{{ step.label }}</span>
                  <span v-if="i === persistenceData.peakIndex" class="rc-step-tag is-peak">+ activo</span>
                  <span v-else-if="i > 0 && getDropPct(i) >= 50" class="rc-step-tag is-drop">-{{ getDropPct(i) }}%</span>
                </div>
                <div class="rc-step-track"><div class="rc-step-fill" :style="{ height: getBarHeight(step.intentos) + '%' }"></div></div>
                <div class="rc-step-data">
                  <div class="rc-sd is-slate"><span class="rc-sd-n">{{ fmt(step.intentos) }}</span><span class="rc-sd-l">Intentos</span></div>
                  <div class="rc-sd-rate" :class="step.tasaContacto >= 50 ? 'is-green' : step.tasaContacto >= 25 ? 'is-amber' : 'is-red'">↓ {{ step.tasaContacto }}% contacto</div>
                  <div class="rc-sd is-blue"><span class="rc-sd-n is-blue">{{ fmt(step.contactados) }}</span><span class="rc-sd-l">Contactados</span></div>
                  <template v-if="step.ventas > 0">
                    <div class="rc-sd-rate is-green">↓ {{ step.tasaCierre }}% cerró</div>
                    <div class="rc-sd is-green"><span class="rc-sd-n is-green">{{ fmt(step.ventas) }}</span><span class="rc-sd-l">Ventas</span></div>
                  </template>
                  <div v-else class="rc-sd-empty">Sin cierres</div>
                </div>
              </div>
            </div>
            <div v-if="persistenceInsight" class="rc-insight">
              <i class="fa-solid fa-lightbulb"></i>
              <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
            </div>
          </section>

          <section class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Razones</span>
                <h2 class="rc-card-title">Resultados de llamada</h2>
                <p class="rc-card-sub">Desglose de razones por efectividad.</p>
              </div>
              <div class="rc-toggle">
                <button class="rc-toggle-btn" :class="{ 'is-active is-active-teal': isEffFilter === 1 }" @click="isEffFilter = 1">Efectivos</button>
                <button class="rc-toggle-btn" :class="{ 'is-active is-active-red': isEffFilter === 0 }" @click="isEffFilter = 0">No efectivos</button>
              </div>
            </header>
            <div class="rc-table-wrap rc-table-wrap-sm">
              <table class="exec-table rc-table">
                <thead>
                  <tr>
                    <th class="ts ts-c">Razón</th>
                    <th class="ts ts-c text-end">Frec.</th>
                    <th class="ts ts-c text-end">%</th>
                    <th class="ts ts-c" style="width:30%">Distribución</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in objectionsData" :key="o.reason">
                    <td class="td-a fw-600">{{ o.reason }}</td>
                    <td class="td-a text-end">{{ fmt(o.count) }}</td>
                    <td class="td-a text-end fw-700">{{ o.pct }}%</td>
                    <td class="td-a"><div class="rc-progress"><div class="rc-progress-fill" :class="isEffFilter === 1 ? 'is-teal' : 'is-red'" :style="`width:${o.pct}%`"></div></div></td>
                  </tr>
                  <tr v-if="objectionsData.length === 0"><td colspan="4" class="empty-state">Sin registros.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- Origen + Reprogramaciones -->
        <div class="rc-two-col">
          <section class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Distribución</span>
                <h2 class="rc-card-title">Efectividad por origen</h2>
                <p class="rc-card-sub">Tasa de atención real por tipo de lead.</p>
              </div>
            </header>
            <div v-if="originRows.length === 0" class="rc-empty">Sin datos.</div>
            <div v-else class="rc-origin-list">
              <div v-for="o in originRows" :key="o.alias" class="rc-origin-row">
                <div class="rc-origin-top"><span class="rc-origin-name">{{ o.desc }}</span><span class="rc-origin-total">{{ fmt(o.total) }}</span></div>
                <div class="rc-stacked-bar">
                  <div class="rc-sb rc-sb-green" :style="`width:${o.pctAtendida}%`"></div>
                  <div class="rc-sb rc-sb-amber" :style="`width:${o.pctPendiente}%`"></div>
                  <div class="rc-sb rc-sb-red" :style="`width:${o.pctSinAtencion}%`"></div>
                </div>
                <div class="rc-origin-stats">
                  <span class="c-green">{{ o.pctAtendida }}% atend.</span>
                  <span class="c-amber">{{ o.pctPendiente }}% pend.</span>
                  <span class="c-red">{{ o.pctSinAtencion }}% s/a</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="rescheduleRows.length" class="ep-section rc-card">
            <header class="rc-card-head">
              <div class="rc-card-head-left">
                <span class="rc-eyebrow">Operativo</span>
                <h2 class="rc-card-title">Efectividad de reprogramaciones</h2>
                <p class="rc-card-sub">¿Las reprogramadas terminaron atendiéndose?</p>
              </div>
            </header>
            <div class="rc-resched-list">
              <article v-for="r in rescheduleRows" :key="r.quien" class="rc-resched">
                <header class="rc-resched-head">
                  <span class="rc-resched-who" :class="r.quien === 'lider' ? 'is-lider' : 'is-sistema'">
                    <i class="fa-solid" :class="r.quien === 'lider' ? 'fa-user-tie' : 'fa-robot'"></i>
                    {{ r.quien === 'lider' ? 'Líder Comercial' : 'Sistema (Regla 5)' }}
                  </span>
                  <span class="rc-resched-total">{{ fmt(r.total) }} reprog.</span>
                </header>
                <div class="rc-resched-metrics">
                  <div class="rc-rm"><div class="rc-rm-val c-green">{{ fmt(r.atendidas) }}</div><div class="rc-rm-lbl">Atendidas</div><span class="rc-pill-mini is-green">{{ r.pctExito }}%</span></div>
                  <div class="rc-rm"><div class="rc-rm-val c-red">{{ fmt(r.volvioFallar) }}</div><div class="rc-rm-lbl">Volvió fallar</div><span class="rc-pill-mini is-red">{{ r.pctFallo }}%</span></div>
                  <div class="rc-rm"><div class="rc-rm-val c-amber">{{ fmt(r.pendiente) }}</div><div class="rc-rm-lbl">Pendiente</div><span class="rc-pill-mini is-amber">{{ r.pctPendiente }}%</span></div>
                </div>
                <div class="rc-stacked-bar">
                  <div class="rc-sb rc-sb-green" :style="`width:${r.pctExito}%`"></div>
                  <div class="rc-sb rc-sb-amber" :style="`width:${r.pctPendiente}%`"></div>
                  <div class="rc-sb rc-sb-red" :style="`width:${r.pctFallo}%`"></div>
                </div>
                <div v-if="r.pctExito < 40" class="rc-alert">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  Tasa de recuperación baja. Revisa la estrategia de seguimiento.
                </div>
              </article>
            </div>
          </section>
        </div>

        <!-- Pendientes globales -->
        <section v-if="Object.keys(pendingByOrigin).length > 0" class="ep-section rc-card">
          <header class="rc-card-head">
            <div class="rc-card-head-left">
              <span class="rc-eyebrow">Operativo</span>
              <h2 class="rc-card-title">Agenda global: llamadas pendientes</h2>
              <p class="rc-card-sub">Programadas aún en estado pendiente, agrupadas por origen.</p>
            </div>
          </header>
          <div class="rc-pending-grid">
            <article v-for="(group, alias) in pendingByOrigin" :key="alias" class="rc-pending">
              <header class="rc-pending-head">
                <span class="rc-pending-origin">{{ group.desc }}</span>
                <span class="rc-pending-badge">{{ group.leads.length }}</span>
              </header>
              <div class="rc-pending-scroll">
                <div v-for="lead in group.leads" :key="lead.lead_id" class="rc-pending-item">
                  <div class="rc-pending-info">
                    <div class="rc-pending-name">{{ lead.lead_name !== '-' ? lead.lead_name : 'Prospecto sin nombre' }}</div>
                    <div class="rc-pending-meta">
                      Intento #{{ lead.attempt_number }} ·
                      <span :class="new Date(lead.contact_datetime) < new Date() ? 'c-red' : 'c-teal'">
                        {{ fmtDate(lead.contact_datetime) }}
                      </span>
                    </div>
                  </div>
                  <button class="rc-btn-mini" @click="goToLead(lead.lead_id)">Ver <i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, BarController, LineController,  // ← agregados
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, BarController, LineController,  // ← agregados
  Title, Tooltip, Legend, Filler
)
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
const persistenceMode = ref('monthly')

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
      // Barras: volumen de intentos (eje derecho)
      {
        type: 'bar',
        label: 'Intentos totales',
        data: hours.map(h => dmap[h].intentos),
        backgroundColor: 'rgba(148,163,184,0.35)',
        borderColor: 'rgba(148,163,184,0.6)',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'yCount',
        order: 3
      },
      // Línea: % contactados efectivos (eje izquierdo)
      {
        type: 'line',
        label: '% Contactados efectivos',
        data: hours.map(h => {
          const d = dmap[h]
          return d.intentos > 0 ? +((d.contactados / d.intentos) * 100).toFixed(1) : 0
        }),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.07)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        yAxisID: 'yPct',
        order: 1
      },
      // Línea: % cierre sobre intentos (eje izquierdo)
      {
        type: 'line',
        label: '% Cierre s/ intentos',
        data: hours.map(h => {
          const d = dmap[h]
          return d.intentos > 0 ? +((d.ventas / d.intentos) * 100).toFixed(1) : 0
        }),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.10)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        yAxisID: 'yPct',
        order: 2
      }
    ]
  }
})
const hourlyFlowOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          if (ctx.dataset.yAxisID === 'yCount') {
            return `  ${ctx.dataset.label}: ${ctx.raw} llamadas`
          }
          return `  ${ctx.dataset.label}: ${ctx.parsed.y}%`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10.5 } }
    },
    yPct: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      max: 100,
      grid: { color: '#f1f5f9' },
      ticks: {
        font: { size: 10 },
        callback: v => v + '%'
      },
      title: {
        display: true,
        text: '% sobre intentos',
        font: { size: 10 },
        color: '#94a3b8'
      }
    },
    yCount: {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },   // no duplica las líneas de fondo
      ticks: {
        font: { size: 10 },
        callback: v => v + ' ll.'
      },
      title: {
        display: true,
        text: 'Nº intentos',
        font: { size: 10 },
        color: '#94a3b8'
      }
    }
  }
}

const persistenceData = computed(() => {
  const keys   = [1,2,3,4,'5+']
  const labels = ['1er intento','2do intento','3er intento','4to intento','5to+']
  const pMap   = {}
  keys.forEach(k => { pMap[k] = { intentos:0, contactados:0, ventas:0 } })

  // ← única línea que cambia según el toggle
  const field = persistenceMode.value === 'monthly'
    ? 'chart_curva_persistencia_mensual'
    : 'chart_curva_persistencia'

  rawCallData.value.forEach(row => {
    ;(row[field] || []).forEach(item => {
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
      tasaContacto: d.intentos    > 0 ? +((d.contactados/d.intentos)   *100).toFixed(0) : 0,
      tasaCierre:   d.contactados > 0 ? +((d.ventas/d.contactados)     *100).toFixed(0) : 0
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
/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS — alineados con Leads.vue / EnrollmentPage
   ════════════════════════════════════════════════════════════ */
.rc-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
  padding: 0;
}

/* ── Masthead ─────────────────────────────────────────────── */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  gap: 14px;
  flex-wrap: wrap;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
}
.ep-title {
  font-size: 26px; font-weight: 600; color: var(--e-text);
  margin: 0; letter-spacing: -0.02em; line-height: 1.1;
}
.ep-subtitle { font-size: 13.5px; color: var(--e-text-secondary); font-weight: 400; margin-top: 2px; }
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ep-btn-export {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  color: var(--e-text); background: #fff;
  border: 1px solid var(--e-border); border-radius: 8px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-btn-export:hover:not(:disabled) { border-color: var(--e-accent); color: var(--e-accent); background: var(--e-accent-soft); }
.ep-btn-export:disabled { opacity: .55; cursor: not-allowed; }
.ep-btn-export i { font-size: 11px; }

.rc-pending-badges { display: flex; gap: 6px; }
.rc-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px; font-size: 11.5px; font-weight: 700;
  border-radius: 10px; border: 1px solid;
}
.rc-badge-red   { background: #FEF2F2; border-color: #FECACA; color: #B91C1C; }
.rc-badge-amber { background: #FFFBEB; border-color: #FDE68A; color: #B45309; }

/* ── Section wrapper ──────────────────────────────────────── */
.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ep-filter-bar-main {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}

/* Chips de filtro tipo "Año / Mes / Asesor" */
.rc-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rc-filter-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 8px;
  padding: 5px 12px;
  transition: border-color .15s ease;
}
.rc-filter-chip:focus-within { border-color: var(--e-accent); box-shadow: 0 0 0 3px var(--e-accent-soft); }
.rc-filter-label {
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  font-weight: 700; color: var(--e-text-muted);
}
.rc-filter-select {
  background: transparent; border: none; outline: none; cursor: pointer;
  font-family: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--e-text); padding: 2px 0; min-width: 110px;
}
.rc-status {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--e-text-muted); font-weight: 500;
  flex-wrap: wrap;
}
.rc-status-sep { color: var(--e-border-strong); }
.rc-status-dot { width: 7px; height: 7px; border-radius: 50%; }
.rc-status-dot.is-ok { background: var(--e-accent); }
.rc-status-dot.is-load { background: #F59E0B; animation: rc-pulse 1s ease-in-out infinite; }

/* ── Loader ───────────────────────────────────────────────── */
.rc-loader {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  min-height: 380px; color: var(--e-text-secondary); font-size: 13px;
  background: #fff; border: 1px solid var(--e-border); border-radius: 10px;
}
.rc-loader-ring {
  width: 32px; height: 32px;
  border: 3px solid var(--e-border);
  border-top-color: var(--e-accent);
  border-radius: 50%;
  animation: rc-spin .8s linear infinite;
}
.rc-fadein { animation: rc-fadein .3s ease; }

/* ── KPIs ─────────────────────────────────────────────────── */
.ep-kpis { display: grid; gap: 12px; }
.ep-kpis-4 { grid-template-columns: repeat(4, 1fr); }
.ep-kpis-5 { grid-template-columns: repeat(5, 1fr); }
.ep-kpi {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
  position: relative; overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-kpi:hover { border-color: var(--e-border-strong); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04); }
.ep-kpi::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: currentColor;
}
.ep-kpi-head { display: flex; justify-content: space-between; align-items: center; }
.ep-kpi-label {
  font-size: 11px; font-weight: 600; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ep-kpi-icon { font-size: 12px; color: currentColor; opacity: 0.65; }
.ep-kpi-main { display: flex; align-items: baseline; gap: 8px; }
.ep-kpi-value {
  font-size: 30px; font-weight: 600; color: var(--e-text);
  letter-spacing: -0.025em; font-variant-numeric: tabular-nums; line-height: 1.1;
}
.ep-kpi-foot {
  font-size: 11px; color: var(--e-text-muted);
  border-top: 1px solid var(--e-border);
  padding-top: 8px; margin-top: 2px;
}
.ep-kpi-foot strong { color: var(--e-text-secondary); font-weight: 600; font-variant-numeric: tabular-nums; }
.ep-kpi-teal   { color: #0D9488; }
.ep-kpi-green  { color: #10B981; }
.ep-kpi-amber  { color: #D97706; }
.ep-kpi-red    { color: #DC2626; }
.ep-kpi-indigo { color: #6366F1; }
.ep-kpi.is-urgent { background: linear-gradient(180deg, #fff 0%, #FEF2F2 100%); }

/* ── Card (sección con borde redondeado tipo ep-section.ep-filter-bar) ── */
.rc-card {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  overflow: hidden;
}
.rc-card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid var(--e-border);
  background: linear-gradient(180deg, #fff, var(--e-bg-subtle));
}
.rc-card-head-left { display: flex; flex-direction: column; gap: 2px; }
.rc-card-head-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rc-eyebrow {
  font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--e-text-muted); font-weight: 600;
}
.rc-card-title {
  font-size: 15px; font-weight: 600; color: var(--e-text);
  letter-spacing: -0.015em; margin: 0;
}
.rc-card-sub { font-size: 12px; color: var(--e-text-secondary); margin: 0; }

/* Contadores en encabezado de card */
.rc-counters {
  display: flex; align-items: stretch;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 10px;
  overflow: hidden;
}
.rc-counter { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 7px 16px; }
.rc-counter-n { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.rc-counter-l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; opacity: 0.85; }
.rc-counter-red   .rc-counter-n { color: #DC2626; } .rc-counter-red   .rc-counter-l { color: #DC2626; }
.rc-counter-amber .rc-counter-n { color: #D97706; } .rc-counter-amber .rc-counter-l { color: #D97706; }
.rc-counter-teal  .rc-counter-n { color: #0D9488; } .rc-counter-teal  .rc-counter-l { color: #0D9488; }
.rc-counter-divider { width: 1px; background: var(--e-border); }

/* ── Empty states ──────────────────────────────────────────── */
.rc-empty { padding: 28px 18px; text-align: center; color: var(--e-text-muted); font-size: 12.5px; }
.rc-empty-clean { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 44px 20px; }
.rc-empty-icon { font-size: 36px; color: var(--e-accent); }
.rc-empty-title { font-size: 16px; font-weight: 600; color: var(--e-text); }
.rc-empty-sub { font-size: 13px; color: var(--e-text-secondary); }

/* ── Bloques (vencidas/proximas) ───────────────────────────── */
.rc-block { padding: 16px 18px; }
.rc-block + .rc-block { border-top: 1px solid var(--e-border); }
.rc-block-hdr {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; margin-bottom: 12px;
}
.rc-block-hdr-red  { color: #B91C1C; }
.rc-block-hdr-teal { color: #0D9488; }
.rc-block-cnt {
  margin-left: auto; font-size: 10.5px; font-weight: 700;
  padding: 2px 10px; border-radius: 12px;
}
.rc-block-cnt-red  { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
.rc-block-cnt-teal { background: #F0FDF4; color: #047857; border: 1px solid #BBF7D0; }

/* ── Call cards ────────────────────────────────────────────── */
.rc-call-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 8px; }
.rc-call {
  display: flex; align-items: center; gap: 10px;
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 8px;
  padding: 11px 14px;
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.rc-call:hover { border-color: var(--e-border-strong); box-shadow: 0 2px 8px rgba(0,0,0,.05); transform: translateY(-1px); }
.rc-call-overdue { background: #FFF5F5; border-color: #FECACA; border-left: 3px solid #DC2626; }
.rc-call-body { flex: 1; min-width: 0; }
.rc-call-name {
  font-size: 13px; font-weight: 600; color: var(--e-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;
}
.rc-call-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.rc-tag { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; white-space: nowrap; }
.rc-tag-attempt { background: var(--e-bg-subtle); color: var(--e-text-secondary); border: 1px solid var(--e-border); }
.rc-tag-origin  { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
.rc-call-time { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--e-text-secondary); }
.rc-call-time i { font-size: 9px; }
.rc-call-time-overdue { color: #DC2626; }
.rc-call-pill { font-size: 9px; font-weight: 700; background: #DC2626; color: #fff; padding: 2px 7px; border-radius: 5px; letter-spacing: 0.05em; }

.rc-btn {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
  padding: 8px 14px; font-size: 12px; font-weight: 600;
  background: var(--e-text); color: #fff;
  border: none; border-radius: 7px; cursor: pointer; font-family: inherit;
  transition: background .15s; white-space: nowrap;
}
.rc-btn:hover { background: #333; }
.rc-btn i { font-size: 9px; }
.rc-btn-urgent { background: #DC2626; }
.rc-btn-urgent:hover { background: #B91C1C; }
.rc-btn-mini {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 11px; font-size: 11px; font-weight: 600;
  background: transparent; color: var(--e-text-secondary);
  border: 1px solid var(--e-border); border-radius: 6px; cursor: pointer;
  font-family: inherit; transition: all .15s; white-space: nowrap;
}
.rc-btn-mini:hover { border-color: var(--e-accent); color: var(--e-accent); background: var(--e-accent-soft); }
.rc-btn-mini i { font-size: 8.5px; }

/* ── Two-col layout ─────────────────────────────────────────── */
.rc-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }

/* ── Origen list ────────────────────────────────────────────── */
.rc-origin-list { padding: 14px 18px; display: flex; flex-direction: column; gap: 11px; }
.rc-origin-row { display: flex; flex-direction: column; gap: 5px; }
.rc-origin-top { display: flex; justify-content: space-between; align-items: center; }
.rc-origin-name { font-size: 12.5px; font-weight: 600; color: var(--e-text); }
.rc-origin-total {
  font-size: 10.5px; font-weight: 700;
  background: var(--e-text); color: #fff;
  padding: 2px 8px; border-radius: 9px;
  font-variant-numeric: tabular-nums;
}
.rc-stacked-bar {
  width: 100%; height: 8px;
  background: var(--e-bg-subtle); border-radius: 4px;
  display: flex; overflow: hidden;
}
.rc-sb { height: 100%; transition: width .4s ease; }
.rc-sb-green { background: #10B981; }
.rc-sb-amber { background: #F59E0B; }
.rc-sb-red   { background: #DC2626; }
.rc-origin-stats { display: flex; gap: 14px; margin-top: 2px; font-size: 11px; font-weight: 600; }

/* ── Tabla (estilo exec-table) ────────────────────────────── */
.rc-table-wrap-sm { overflow-y: auto; max-height: 290px; padding: 0 6px; }
.rc-table-wrap-lider { overflow: auto; max-height: 60vh; }
.exec-table.rc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.rc-table thead tr {
  background: var(--e-bg-subtle); position: sticky; top: 0; z-index: 2;
}
.rc-table th.ts {
  padding: 9px 12px; font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 700; color: var(--e-text-muted);
  border-bottom: 1px solid var(--e-border); white-space: nowrap; text-align: left;
}
.rc-table th.text-end, .rc-table td.text-end { text-align: right; }
.rc-table th.text-start { text-align: left; }
.rc-table td.td-a { padding: 9px 12px; border-bottom: 1px solid var(--e-border); color: var(--e-text); }
.rc-table tbody tr:hover td { background: var(--e-bg-subtle); }
.rc-table .empty-state { text-align: center; color: var(--e-text-muted); padding: 22px; font-size: 12px; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }

/* Lider matrix sticky col */
.rc-table-lider { min-width: 1100px; }
.rc-th-sticky, .rc-td-sticky { position: sticky; left: 0; z-index: 3; }
.rc-th-sticky { background: var(--e-bg-subtle) !important; }
.rc-td-sticky { background: #fff !important; border-right: 1px solid var(--e-border); }
.rc-tr-clickable { cursor: pointer; }
.rc-tr-clickable.is-selected td { background: var(--e-accent-soft) !important; }
.rc-tr-clickable.is-selected .rc-td-sticky { background: var(--e-accent-soft) !important; }
.rc-th-green  { color: #047857 !important; }
.rc-th-red    { color: #B91C1C !important; }
.rc-th-amber  { color: #B45309 !important; }
.rc-th-indigo { color: #4338CA !important; }

.rc-advisor { display: flex; align-items: center; gap: 9px; font-weight: 600; white-space: nowrap; }
.rc-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--e-accent); color: #fff;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rc-bar-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.rc-bar-val { font-size: 11.5px; font-weight: 700; }
.rc-bar-track { width: 60px; height: 4px; background: var(--e-bg-subtle); border-radius: 3px; overflow: hidden; }
.rc-bar-fill { height: 100%; border-radius: 3px; }
.rc-bar-fill.is-green { background: #10B981; }
.rc-bar-fill.is-red   { background: #DC2626; }

/* ── Toggle (segmented control) ────────────────────────────── */
.rc-toggle {
  display: inline-flex; background: var(--e-bg-subtle);
  border: 1px solid var(--e-border); border-radius: 7px; padding: 2px;
}
.rc-toggle-btn {
  background: transparent; border: none;
  padding: 5px 13px; font-size: 11.5px; font-weight: 600;
  color: var(--e-text-secondary); border-radius: 5px;
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.rc-toggle-btn:hover:not(.is-active) { color: var(--e-text); }
.rc-toggle-btn.is-active { background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.rc-toggle-btn.is-active-teal { color: #0D9488; }
.rc-toggle-btn.is-active-red  { color: #B91C1C; }

/* ── Progress bar (objeciones) ─────────────────────────────── */
.rc-progress { width: 100%; height: 6px; background: var(--e-bg-subtle); border-radius: 3px; overflow: hidden; }
.rc-progress-fill { height: 100%; border-radius: 3px; transition: width .4s; }
.rc-progress-fill.is-teal { background: #0D9488; }
.rc-progress-fill.is-red  { background: #B91C1C; }

/* ── Curva de persistencia ─────────────────────────────────── */
.rc-card-persistence .rc-card-head { background: linear-gradient(180deg, var(--e-bg-subtle), #fff); }
.rc-pills { display: flex; gap: 6px; }
.rc-pill-stat {
  display: inline-flex; flex-direction: column; gap: 1px; align-items: flex-start;
  background: #fff; border: 1px solid var(--e-border); border-radius: 8px;
  padding: 4px 11px;
}
.rc-pill-stat.is-green { border-color: #BBF7D0; background: var(--e-accent-soft); }
.rc-pill-l { font-size: 9.5px; color: var(--e-text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.rc-pill-v { font-size: 13px; font-weight: 700; color: var(--e-text); font-variant-numeric: tabular-nums; }
.rc-pill-stat.is-green .rc-pill-v { color: #047857; }

.rc-steps {
  display: flex; padding: 18px 14px 12px;
  overflow-x: auto; gap: 8px; align-items: stretch;
}
.rc-step {
  flex: 1; min-width: 120px;
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 6px 10px; border-radius: 8px;
  position: relative;
}
.rc-step.is-peak { background: linear-gradient(180deg, var(--e-accent-soft) 0%, transparent 80%); }
.rc-step-lbl { display: flex; flex-direction: column; align-items: center; gap: 3px; margin-bottom: 8px; }
.rc-step-num { font-size: 10.5px; font-weight: 700; color: var(--e-text); text-align: center; }
.rc-step-tag {
  font-size: 9px; font-weight: 700; padding: 1px 6px;
  border-radius: 8px; text-transform: uppercase; letter-spacing: 0.04em;
}
.rc-step-tag.is-peak { background: var(--e-accent-soft); color: #047857; }
.rc-step-tag.is-drop { background: #FEF3C7; color: #B45309; }
.rc-step-track {
  width: 26px; height: 60px;
  background: var(--e-bg-subtle); border-radius: 5px;
  display: flex; align-items: flex-end; overflow: hidden;
  margin-bottom: 10px; flex-shrink: 0;
}
.rc-step-fill {
  width: 100%;
  background: linear-gradient(180deg, #94A3B8, #64748B);
  border-radius: 5px;
  transition: height .5s cubic-bezier(.34, 1.56, .64, 1);
}
.rc-step.is-peak .rc-step-fill { background: linear-gradient(180deg, #34D399, var(--e-accent)); }
.rc-step-data { display: flex; flex-direction: column; align-items: stretch; width: 100%; gap: 3px; }
.rc-sd {
  display: flex; align-items: center; gap: 5px;
  border-radius: 6px; padding: 5px 8px;
  border: 1px solid var(--e-border);
  background: var(--e-bg-subtle);
}
.rc-sd.is-blue  { background: #EFF6FF; border-color: #BFDBFE; }
.rc-sd.is-green { background: var(--e-accent-soft); border-color: #BBF7D0; }
.rc-sd-n {
  font-size: 16px; font-weight: 700; color: var(--e-text);
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
}
.rc-sd-n.is-blue  { color: #1D4ED8; }
.rc-sd-n.is-green { color: #047857; }
.rc-sd-l { font-size: 9px; color: var(--e-text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
.rc-sd-rate {
  font-size: 9.5px; font-weight: 700; padding: 2px 7px;
  text-align: center; border-radius: 4px;
}
.rc-sd-rate.is-green { color: #047857; background: var(--e-accent-soft); }
.rc-sd-rate.is-amber { color: #B45309; background: #FEF3C7; }
.rc-sd-rate.is-red   { color: #B91C1C; background: #FEF2F2; }
.rc-sd-empty {
  font-size: 9.5px; color: var(--e-text-muted); font-style: italic;
  text-align: center; border: 1px dashed var(--e-border);
  border-radius: 5px; padding: 4px;
}
.rc-insight {
  display: flex; gap: 9px; align-items: flex-start;
  padding: 11px 18px;
  border-top: 1px solid var(--e-border);
  background: #FFFBEB;
}
.rc-insight i { color: #F59E0B; font-size: 13px; margin-top: 2px; }
.rc-insight span { font-size: 11.5px; color: #78350F; line-height: 1.55; }
.rc-insight strong { color: #92400E; }

/* ── Chart ──────────────────────────────────────────────────── */
.rc-chart-legend {
  display: flex; flex-wrap: wrap; gap: 14px;
  font-size: 11px; color: var(--e-text-secondary); font-weight: 500;
}
.rc-legend { display: inline-flex; align-items: center; gap: 5px; }
.rc-legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.rc-chart { padding: 14px 18px; height: 250px; }

/* ── Reprogramaciones ─────────────────────────────────────── */
.rc-resched-list { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
.rc-resched {
  border: 1px solid var(--e-border);
  border-radius: 10px; padding: 13px;
  background: #fff;
  transition: border-color .15s ease;
}
.rc-resched:hover { border-color: var(--e-border-strong); }
.rc-resched-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.rc-resched-who {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 700;
  padding: 4px 11px; border-radius: 12px;
}
.rc-resched-who.is-lider   { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
.rc-resched-who.is-sistema { background: var(--e-bg-subtle); color: var(--e-text-secondary); border: 1px solid var(--e-border); }
.rc-resched-who i { font-size: 10px; opacity: 0.85; }
.rc-resched-total { font-size: 11.5px; color: var(--e-text-muted); font-weight: 500; }
.rc-resched-metrics { display: flex; gap: 0; margin-bottom: 10px; }
.rc-rm { flex: 1; text-align: center; padding: 6px 4px; }
.rc-rm-val { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.rc-rm-lbl { font-size: 9.5px; color: var(--e-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 2px 0; font-weight: 600; }
.rc-pill-mini {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 1px 7px; border-radius: 9px;
}
.rc-pill-mini.is-green { background: var(--e-accent-soft); color: #047857; }
.rc-pill-mini.is-red   { background: #FEF2F2; color: #B91C1C; }
.rc-pill-mini.is-amber { background: #FEF3C7; color: #B45309; }
.rc-alert {
  display: flex; align-items: flex-start; gap: 7px; margin-top: 10px;
  background: #FFFBEB; border: 1px solid #FDE68A;
  border-radius: 7px; padding: 8px 11px;
  font-size: 11px; color: #92400E;
}
.rc-alert i { font-size: 11px; color: #F59E0B; margin-top: 1px; }

/* ── Pendientes (líder) ───────────────────────────────────── */
.rc-pending-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px; padding: 14px 18px;
}
.rc-pending {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color .15s ease;
}
.rc-pending:hover { border-color: var(--e-border-strong); }
.rc-pending-head {
  background: var(--e-bg-subtle);
  border-bottom: 1px solid var(--e-border);
  padding: 10px 14px;
  display: flex; justify-content: space-between; align-items: center;
}
.rc-pending-origin { font-size: 12px; font-weight: 600; color: var(--e-text); }
.rc-pending-badge {
  background: var(--e-accent); color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 9px;
}
.rc-pending-scroll { max-height: 220px; overflow-y: auto; }
.rc-pending-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 13px; border-bottom: 1px solid var(--e-border);
  gap: 10px;
}
.rc-pending-item:last-child { border-bottom: none; }
.rc-pending-item:hover { background: var(--e-bg-subtle); }
.rc-pending-info { flex: 1; min-width: 0; }
.rc-pending-name {
  font-size: 12.5px; font-weight: 600; color: var(--e-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rc-pending-meta { font-size: 10.5px; color: var(--e-text-muted); margin-top: 1px; }

/* ── Color utils ───────────────────────────────────────────── */
.c-green  { color: #047857; }
.c-amber  { color: #B45309; }
.c-red    { color: #B91C1C; }
.c-indigo { color: #4338CA; }
.c-teal   { color: #0D9488; font-weight: 600; }

/* ── Animations ────────────────────────────────────────────── */
@keyframes rc-spin   { to { transform: rotate(360deg); } }
@keyframes rc-pulse  { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
@keyframes rc-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.fa-spin { animation: rc-spin .8s linear infinite; }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .ep-kpis-5 { grid-template-columns: repeat(3, 1fr); }
  .rc-two-col { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .ep-kpis-4 { grid-template-columns: 1fr 1fr; }
  .ep-kpis-5 { grid-template-columns: 1fr 1fr; }
  .ep-masthead { align-items: flex-start; }
}
@media (max-width: 640px) {
  .rc-page { padding: 0; }
  .ep-title { font-size: 22px; }
  .rc-call-grid { grid-template-columns: 1fr; }
  .rc-counters { flex-wrap: wrap; }
}

/* ── Dark mode (consistente con Leads.vue) ────────────────── */
[data-coreui-theme="dark"] .rc-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16, 185, 129, 0.16);
}
[data-coreui-theme="dark"] .rc-card,
[data-coreui-theme="dark"] .ep-kpi,
[data-coreui-theme="dark"] .ep-section.ep-filter-bar,
[data-coreui-theme="dark"] .rc-loader,
[data-coreui-theme="dark"] .rc-call,
[data-coreui-theme="dark"] .rc-resched,
[data-coreui-theme="dark"] .rc-pending { background: #1A1A14; }
[data-coreui-theme="dark"] .rc-call-overdue { background: rgba(220, 38, 38, 0.08); }
[data-coreui-theme="dark"] .rc-card-head { background: linear-gradient(180deg, #1A1A14, #1F1F1A); }
[data-coreui-theme="dark"] .rc-table-wrap-lider .rc-td-sticky { background: #1A1A14 !important; }
[data-coreui-theme="dark"] .rc-tr-clickable.is-selected td { background: rgba(16, 185, 129, 0.16) !important; }
</style>
