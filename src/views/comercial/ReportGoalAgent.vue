<template>
  <div class="rg-page">

    <!-- ═══════════════ MASTHEAD ═══════════════ -->
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">COMERCIAL</span>
        <h1 class="ep-title">
          {{ effectivePersonalView ? 'Mi Tablero de Objetivos' : 'Tablero de Asesor y Objetivos' }}
        </h1>
        <span class="ep-subtitle">
          {{ effectivePersonalView
            ? 'Mi desempeño · ' + (myData?.asesor || loggedAdvisorName || 'Asesor')
            : 'Desempeño comercial · Equipo de ventas' }}
        </span>
      </div>
      <div class="ep-masthead-actions">
        <button v-if="isLiderComercial" class="ep-btn-export" :class="{ 'is-active': viewAsAdvisor }" @click="toggleAdvisorView">
          <i class="fa-solid fa-eye"></i>
          {{ viewAsAdvisor ? 'Salir · Vista Asesor' : 'Ver como Asesor' }}
        </button>
        <div v-if="!effectivePersonalView" class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': !isDashboard }]" @click="isDashboard = false">
            <i class="fa-solid fa-table"></i> Tabular
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': isDashboard }]" @click="isDashboard = true">
            <i class="fa-solid fa-chart-column"></i> Gráfica
          </button>
        </div>
        <button class="ep-btn-export" :disabled="loading" @click="fetchData">
          <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
          {{ loading ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>
    </header>

    <!-- ═══════════════ FILTROS ═══════════════ -->
    <section class="ep-section ep-filter-bar">
      <div class="ep-filter-bar-main">
        <div class="rg-filters">

          <transition name="rg-fade">
            <div v-if="isLiderComercial && viewAsAdvisor" class="rg-filter-chip is-impersonate">
              <span class="rg-filter-label"><i class="fa-solid fa-eye"></i> VIENDO COMO</span>
              <select class="rg-filter-select" v-model="selectedViewAdvisorId">
                <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
              </select>
            </div>
          </transition>

          <div class="rg-filter-chip rg-filter-toggle">
            <span class="rg-filter-label">TIPO OBJETIVO</span>
            <div class="rg-modality">
              <button class="rg-mod-btn" :class="{ 'is-active': filters.modality === 'NO_ONLINE' }"
                @click="filters.modality = 'NO_ONLINE'; loadWeeks()">
                <i class="fa-solid fa-display"></i> EN VIVO
              </button>
              <button class="rg-mod-btn" :class="{ 'is-active': filters.modality === 'ONLINE' }" disabled
                @click="filters.modality = 'ONLINE'; loadWeeks()">
                <i class="fa-solid fa-wifi"></i> ONLINE
              </button>
              <button class="rg-mod-btn" :class="{ 'is-active': filters.modality === 'CONGRESO' }" disabled
                @click="filters.modality = 'CONGRESO'; loadWeeks()">
                <i class="fa-solid fa-people-group"></i> CONGRESO
              </button>
            </div>
          </div>

          <div class="rg-filter-chip">
            <span class="rg-filter-label">Año</span>
            <select class="rg-filter-select" v-model="filters.year" @change="loadWeeks">
              <option :value="2026">2026</option>
              <option :value="2025">2025</option>
            </select>
          </div>

          <div class="rg-filter-chip">
            <span class="rg-filter-label">Semana</span>
            <select class="rg-filter-select" v-model="selectedWeek" style="min-width: 200px;">
              <option :value="null">Acumulado (MTD)</option>
              <option v-for="w in availableWeeks" :key="w.value + w.month" :value="w">{{ w.label }}</option>
            </select>
          </div>

        </div>

        <transition name="rg-fade">
          <div class="rg-inline-kpis">
            <div class="rg-mini-kpi" @click="drillDown({ type: 'sales' })" title="Ver ventas">
              <span class="rg-mini-kpi-l">Venta total</span>
              <span v-if="loading" class="skel-kpi"></span>
              <span v-else class="rg-mini-kpi-v c-accent">{{ formatCurrency(totals.ven_monto) }}</span>
            </div>
            <div class="rg-mini-kpi-divider"></div>
            <div class="rg-mini-kpi">
              <span class="rg-mini-kpi-l">Ticket prom.</span>
              <span v-if="loading" class="skel-kpi"></span>
              <span v-else class="rg-mini-kpi-v">{{ formatCurrency(totals.ticketProm) }}</span>
            </div>
            <div class="rg-mini-kpi-divider"></div>
            <div class="rg-mini-kpi">
              <span class="rg-mini-kpi-l">% Meta S/.</span>
              <span v-if="loading" class="skel-kpi" style="width:48px"></span>
              <span v-else class="rg-mini-kpi-v" :class="totals.pctMetaMonto >= 80 ? 'c-green' : totals.pctMetaMonto >= 50 ? 'c-amber' : 'c-red'">
                {{ totals.pctMetaMonto }}%
              </span>
            </div>
          </div>
        </transition>
      </div>
    </section>

    <!-- ═══════════════ LOADER ═══════════════ -->
    <div v-if="loading" class="rg-loader">
      <div class="rg-loader-ring"></div>
      <span>Cargando métricas{{ effectivePersonalView ? ' del asesor' : ' del equipo' }}…</span>
    </div>

    <!-- ═══════════════ VISTA PERSONAL ═══════════════ -->
    <div v-else-if="effectivePersonalView" class="rg-fadein">

      <div v-if="isLiderComercial && viewAsAdvisor" class="rg-impersonation-banner">
        <i class="fa-solid fa-eye"></i>
        <span>Estás viendo el tablero de <strong>{{ myData?.asesor || '—' }}</strong> tal como lo ve el asesor. Solo lectura.</span>
        <button class="rg-banner-exit" @click="toggleAdvisorView">
          <i class="fa-solid fa-xmark"></i> Salir
        </button>
      </div>

      <!-- Hero -->
      <section class="ep-section">
        <article class="rg-hero" :class="heroStatusClass">
          <div class="rg-hero-left">
            <div class="rg-hero-avatar">{{ avatarInitials }}</div>
            <div class="rg-hero-info">
              <div class="rg-hero-name">{{ myData?.asesor || '—' }}</div>
              <div class="rg-hero-period">
                {{ filters.year }}
                <span class="rg-hero-sep">·</span>
                <span>{{ selectedWeek ? selectedWeek.label : 'Acumulado mensual' }}</span>
                <span class="rg-hero-sep">·</span>
                <span>{{ filters.modality === 'NO_ONLINE' ? 'En vivo' : filters.modality === 'ONLINE' ? 'Online' : 'Congreso' }}</span>
              </div>
            </div>
          </div>

          <div class="rg-hero-center">
            <div class="rg-gauge">
              <svg class="rg-gauge-svg" viewBox="0 0 120 70">
                <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="10" stroke-linecap="round"/>
                <path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="10" stroke-linecap="round"
                  :stroke-dasharray="`${gaugeProgress * 1.57} 157`" stroke-dashoffset="0"/>
                <text x="60" y="60" text-anchor="middle" fill="white" font-size="18" font-weight="700" font-family="'Hanken Grotesk', sans-serif">{{ pctMetaUnidades }}%</text>
              </svg>
              <div class="rg-gauge-label" :class="{ 'is-weekly': filters.period !== 'ALL' }">
                {{ filters.period !== 'ALL' ? 'META SEMANAL' : 'META UNIDADES' }}
              </div>
            </div>
          </div>

          <div class="rg-hero-right">
            <div class="rg-hero-row">
              <span class="rg-hero-l">Ventas realizadas</span>
              <span class="rg-hero-v rg-hero-v-big">{{ myData?.ven || 0 }}</span>
            </div>
            <div class="rg-hero-divider"></div>
            <div class="rg-hero-row">
              <span class="rg-hero-l">Objetivo del período</span>
              <span class="rg-hero-v">{{ myData?.obj || 0 }}</span>
            </div>
            <div class="rg-hero-row">
              <span class="rg-hero-l">Por cerrar</span>
              <span class="rg-hero-v" :class="(myData?.falta || 0) > 0 ? 'rg-hero-gap' : 'rg-hero-ok'">
                {{ (myData?.falta || 0) > 0 ? '−' + myData.falta : '✓ Meta cumplida' }}
              </span>
            </div>
          </div>
        </article>
      </section>

      <!-- Action cards -->
      <div class="rg-action-cards" v-if="selectedWeek !== null">
        <article class="rg-action-card is-hot" @click="drillDown({ type: 'interestPriority', valueName: 'Caliente' })">
          <div class="rg-action-icon"><i class="fa-solid fa-fire"></i></div>
          <div class="rg-action-info">
            <span class="rg-action-title">Leads calientes (próximos a inicio)</span>
            <span class="rg-action-desc">Interés registrado sin cerrar (14 días)</span>
          </div>
          <div class="rg-action-value">{{ myData?.high_interest_count || 0 }}</div>
        </article>

        <article class="rg-action-card is-followup" @click="drillDown({ type: 'follow', valueName: 'we_calling_pending' })">
          <div class="rg-action-icon"><i class="fa-solid fa-phone-volume"></i></div>
          <div class="rg-action-info">
            <span class="rg-action-title">Seguimientos de contacto</span>
            <span class="rg-action-desc">Llamadas pendientes de gestionar</span>
          </div>
          <div class="rg-action-value">{{ myData?.follow_up_pending || 0 }}</div>
        </article>
      </div>

      <!-- KPI strip personal -->
      <section class="ep-section">
        <div class="ep-kpis ep-kpis-4">
          <article class="ep-kpi" :class="totals.pctMetaMonto >= 80 ? 'ep-kpi-green' : totals.pctMetaMonto >= 50 ? 'ep-kpi-amber' : 'ep-kpi-red'">
            <div class="ep-kpi-head"><span class="ep-kpi-label">% Meta S/.</span><i class="fa-solid fa-bullseye ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ totals.pctMetaMonto }}%</span></div>
            <div class="rg-kpi-progress">
              <div class="rg-kpi-progress-fill" :class="totals.pctMetaMonto >= 80 ? 'is-green' : totals.pctMetaMonto >= 50 ? 'is-amber' : 'is-red'"
                :style="`width:${Math.min(100, totals.pctMetaMonto)}%`"></div>
            </div>
            <span class="ep-kpi-foot"><strong>{{ formatCurrency(totals.ven_monto) }}</strong> de {{ formatCurrency(totals.obj_monto) }}</span>
          </article>

          <article class="ep-kpi ep-kpi-teal rg-clickable" @click="drillDown({ type: 'leads' })">
            <div class="ep-kpi-head"><span class="ep-kpi-label">Mis leads</span><i class="fa-solid fa-users ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ myData?.contactos || 0 }}</span></div>
            <div class="rg-kpi-progress">
              <div class="rg-kpi-progress-fill is-blue" :style="`width:${Math.min(100, myData?.pct_gestion || 0)}%`"></div>
            </div>
            <span class="ep-kpi-foot"><strong>{{ myData?.activos || 0 }}</strong> activos · {{ myData?.pct_gestion || 0 }}% gestionados</span>
          </article>

          <article class="ep-kpi" :class="(myData?.ratio || 0) === 0 ? 'ep-kpi-red is-alert' : (myData?.ratio || 0) >= 15 ? 'ep-kpi-green' : 'ep-kpi-amber'">
            <div class="ep-kpi-head"><span class="ep-kpi-label">Ratio leads → venta</span><i class="fa-solid fa-arrow-trend-up ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ myData?.ratio || 0 }}%</span></div>
            <div class="rg-kpi-progress">
              <div class="rg-kpi-progress-fill" :class="(myData?.ratio || 0) === 0 ? 'is-red' : (myData?.ratio || 0) >= 15 ? 'is-green' : 'is-amber'"
                :style="`width:${Math.min(100, (myData?.ratio || 0) * 3)}%`"></div>
            </div>
            <span class="ep-kpi-foot">{{ (myData?.ratio || 0) === 0 ? '¡Alerta! Sin conversiones' : 'Saludable: ≥ 15%' }}</span>
          </article>

          <article class="ep-kpi ep-kpi-indigo">
            <div class="ep-kpi-head"><span class="ep-kpi-label">Ticket promedio</span><i class="fa-solid fa-receipt ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ formatCurrency(myData?.ven > 0 ? myData.ven_monto / myData.ven : 0) }}</span></div>
            <div class="rg-kpi-progress"><div class="rg-kpi-progress-fill is-blue" style="width:60%"></div></div>
            <span class="ep-kpi-foot">Conv. cohorte: <strong>{{ myData?.conv || 0 }}%</strong></span>
          </article>
        </div>
      </section>

      <!-- Evolución + Embudo -->
      <div class="rg-two-col rg-two-col-3-2">
        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Evolución</span>
              <h2 class="rg-card-title">Mi evolución vs meta</h2>
              <p class="rg-card-sub">Ventas acumuladas vs ritmo ideal para alcanzar el objetivo.</p>
            </div>
          </header>
          <div class="rg-chart rg-chart-lg"><Line :data="trendChartData" :options="lineOptions" /></div>
        </section>

        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Pipeline</span>
              <h2 class="rg-card-title">Mi embudo</h2>
            </div>
          </header>
          <div class="rg-funnel">
            <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'leads' })">
              <div class="rg-funnel-row"><span class="rg-funnel-l">Leads totales</span><span class="rg-funnel-v">{{ myData?.contactos || 0 }}</span></div>
              <div class="rg-funnel-bar"><div class="rg-funnel-fill is-slate" style="width:100%"></div></div>
            </div>
            <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'active_leads' })">
              <div class="rg-funnel-row"><span class="rg-funnel-l c-amber">Activos</span><span class="rg-funnel-v c-amber">{{ myData?.activos || 0 }}</span></div>
              <div class="rg-funnel-bar"><div class="rg-funnel-fill is-amber" :style="`width:${myData?.pct_gestion || 0}%`"></div></div>
            </div>
            <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'sales' })">
              <div class="rg-funnel-row"><span class="rg-funnel-l c-green">Ventas del período</span><span class="rg-funnel-v c-green">{{ myData?.ven || 0 }}</span></div>
              <div class="rg-funnel-bar"><div class="rg-funnel-fill is-green" :style="`width:${myData?.ratio || 0}%`"></div></div>
            </div>
            <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'cohort_sales' })">
              <div class="rg-funnel-row"><span class="rg-funnel-l c-blue">Ventas cohorte</span><span class="rg-funnel-v c-blue">{{ myData?.acum_ventas_cohorte || 0 }}</span></div>
              <div class="rg-funnel-bar"><div class="rg-funnel-fill is-blue" :style="`width:${myData?.conv || 0}%`"></div></div>
            </div>
            <div class="rg-funnel-foot">
              <span>Conv. global</span>
              <span class="fw-700" :class="convClass(myData?.conv || 0)">{{ myData?.conv || 0 }}%</span>
            </div>
          </div>
          <div class="rg-finance-summary">
            <div class="rg-fs-row"><span>Meta S/.</span><span class="text-muted">{{ formatCurrency(myData?.obj_monto || 0) }}</span></div>
            <div class="rg-fs-row"><span>Venta S/.</span><span class="c-green fw-600">{{ formatCurrency(myData?.ven_monto || 0) }}</span></div>
            <div class="rg-fs-row"><span>% Logrado</span><span class="fw-700" :class="totals.pctMetaMonto >= 80 ? 'c-green' : totals.pctMetaMonto >= 50 ? 'c-amber' : 'c-red'">{{ totals.pctMetaMonto }}%</span></div>
          </div>
        </section>
      </div>

      <!-- Composición + Programa -->
      <div class="rg-two-col rg-two-col-2-1">
        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Distribución</span>
              <h2 class="rg-card-title">Composición de mis leads por estado</h2>
              <p class="rg-card-sub">Evolución de la gestión de mis contactos en el tiempo.</p>
            </div>
          </header>
          <div class="rg-chart rg-chart-lg"><Bar :data="myLeadsStackedChartData" :options="stackedBarOptions" /></div>
        </section>

        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Programas</span>
              <h2 class="rg-card-title">Ventas por programa</h2>
              <p class="rg-card-sub">Distribución de mis ventas en el período.</p>
            </div>
          </header>
          <div class="rg-chart rg-chart-donut"><Doughnut :data="programSalesChartData" :options="programSalesDoughnutOptions" /></div>
        </section>
      </div>

      <!-- Mi desglose por período -->
      <section class="ep-section rg-card">
        <header class="rg-card-head">
          <div class="rg-card-head-left">
            <span class="rg-eyebrow">Granular</span>
            <h2 class="rg-card-title"><i class="fa-solid fa-table-cells"></i> Mi desglose por período</h2>
            <p class="rg-card-sub">Click en los números para ver el detalle de registros.</p>
          </div>
        </header>
        <div class="rg-days-grid">
          <article v-for="(day, i) in currentDailyStats" :key="i" class="rg-day" :class="{ 'is-active': day.ven > 0 }">
            <div class="rg-day-head"><span class="rg-day-name">{{ day.name }}</span></div>
            <div class="rg-day-body">
              <div class="rg-day-metric">
                <span class="rg-day-l">Leads</span>
                <span class="rg-day-v rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'leads' })">{{ day.con }}</span>
              </div>
              <div class="rg-day-metric is-accent">
                <span class="rg-day-l">Ventas</span>
                <div class="rg-day-group">
                  <span class="rg-day-v c-accent rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'sales' })">{{ day.ven }}</span>
                  <span class="rg-day-sub">{{ day.ratio_dia }}%</span>
                </div>
              </div>
              <div class="rg-day-metric">
                <span class="rg-day-l">Conv.</span>
                <div class="rg-day-group">
                  <span class="rg-day-v c-green rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'cohort_sales' })">{{ day.ven_coh }}</span>
                  <span class="rg-day-sub">{{ day.conv_dia }}%</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

    </div>

    <!-- ═══════════════ VISTA TABULAR (EQUIPO) ═══════════════ -->
    <div v-else-if="!isDashboard" class="rg-fadein">
      <section class="ep-section rg-card">
        <header class="rg-card-head">
          <div class="rg-card-head-left">
            <span class="rg-eyebrow">Equipo</span>
            <h2 class="rg-card-title">Tablero de objetivos por asesor</h2>
            <p class="rg-card-sub">Click en los números para abrir la lista de leads filtrada.</p>
          </div>
        </header>

        <div class="rg-table-wrap">
          <table class="exec-table rg-table">
            <thead>
              <tr class="rg-thead-group">
                <th class="rg-th-cat" rowspan="2">Asesor</th>
                <th colspan="3" class="rg-th-group rg-grp-a">Objetivos (vacantes)</th>
                <th colspan="3" class="rg-th-group rg-grp-b">Financiero (S/.)</th>
                <th colspan="3" class="rg-th-group rg-grp-c">Resultados</th>
                <th colspan="4" class="rg-th-group rg-grp-d">Logros</th>
              </tr>
              <tr class="rg-thead-sub">
                <th class="ts ts-a text-center">Meta #</th>
                <th class="ts ts-a text-center">Real #</th>
                <th class="ts ts-a text-center">Gap</th>
                <th class="ts ts-b text-end">Meta S/.</th>
                <th class="ts ts-b text-end">Venta S/.</th>
                <th class="ts ts-b text-end">Ticket</th>
                <th class="ts ts-c text-center">Leads</th>
                <th class="ts ts-c text-center">Activos</th>
                <th class="ts ts-c text-center">% Gest.</th>
                <th class="ts ts-d text-center">Ratio</th>
                <th class="ts ts-d text-center">Conv. #</th>
                <th class="ts ts-d text-center">% Conv.</th>
                <th class="ts ts-d text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tableData.length === 0">
                <td colspan="14" class="rg-empty-row">No hay datos para este período.</td>
              </tr>
              <tr v-for="(row, index) in tableData" :key="index" class="rg-tbody-row" :class="{ 'is-alt': index % 2 === 0 }">
                <td class="td-a rg-td-asesor">
                  <div class="rg-td-asesor-inner">
                    <div class="rg-avatar-mini">{{ initialsFromName(row.asesor) }}</div>
                    <span>{{ row.asesor }}</span>
                    <button v-if="isLiderComercial" class="rg-btn-view-as" @click.stop="quickViewAsAdvisor(row.cod)" title="Ver tablero de este asesor">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </td>
                <td class="td-a text-center">{{ row.obj }}</td>
                <td class="td-a text-center fw-600 rg-clickable" @click.stop="drillDown({ advisor: row.cod, type: 'sales' })">{{ row.ven }}</td>
                <td class="td-a text-center">
                  <span :class="row.falta > 0 ? 'rg-gap-neg' : 'rg-gap-pos'">{{ row.falta > 0 ? '−' + row.falta : '✓' }}</span>
                </td>
                <td class="td-a text-end text-muted small">{{ formatCurrency(row.obj_monto) }}</td>
                <td class="td-a text-end fw-600 rg-clickable" @click.stop="drillDown({ advisor: row.cod, type: 'sales' })">{{ formatCurrency(row.ven_monto) }}</td>
                <td class="td-a text-end small text-muted">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>
                <td class="td-a text-center rg-clickable" @click.stop="drillDown({ advisor: row.cod, type: 'leads' })">{{ row.contactos }}</td>
                <td class="td-a text-center text-muted rg-clickable" @click.stop="drillDown({ advisor: row.cod, type: 'active_leads' })">{{ row.activos }}</td>
                <td class="td-a text-center small">{{ row.pct_gestion }}%</td>
                <td class="td-a text-center fw-700 c-accent">{{ row.ratio }}%</td>
                <td class="td-a text-center fw-600 rg-clickable" @click.stop="drillDown({ advisor: row.cod, type: 'cohort_sales' })">{{ row.acum_ventas_cohorte }}</td>
                <td class="td-a text-center"><span :class="convClass(row.conv)">{{ row.conv }}%</span></td>
                <td class="td-a text-center">
                  <span class="rg-status-pill" :class="row.ratio >= 15 ? 'is-ok' : 'is-low'">{{ row.ratio >= 15 ? 'OK' : 'BAJO' }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="rg-tfoot-row">
                <td class="rg-tfoot-label">Total equipo</td>
                <td class="text-center fw-600">{{ totals.obj }}</td>
                <td class="text-center fw-600 rg-clickable c-accent" @click="drillDown({ type: 'sales' })">{{ totals.ven }}</td>
                <td class="text-center c-red fw-600">−{{ totals.falta }}</td>
                <td class="text-end fw-600 text-muted">{{ formatCurrency(totals.obj_monto) }}</td>
                <td class="text-end fw-700 c-accent rg-clickable" @click="drillDown({ type: 'sales' })">{{ formatCurrency(totals.ven_monto) }}</td>
                <td class="text-end fw-600 text-muted">{{ formatCurrency(totals.ticketProm) }}</td>
                <td class="text-center fw-600 rg-clickable" @click="drillDown({ type: 'leads' })">{{ totals.contactos }}</td>
                <td class="text-center text-muted rg-clickable" @click="drillDown({ type: 'active_leads' })">{{ totals.activos }}</td>
                <td class="text-center text-muted">{{ totals.avgGestion }}%</td>
                <td class="text-center fw-700 c-accent">{{ totals.avgRatio }}%</td>
                <td class="text-center fw-600 rg-clickable" @click="drillDown({ type: 'cohort_sales' })">{{ totals.acum_ventas_cohorte_total }}</td>
                <td class="text-center fw-600">{{ totals.avgConv }}%</td>
                <td class="text-center">
                  <span class="rg-status-pill" :class="totals.pctMetaMonto >= 80 ? 'is-ok' : 'is-low'">{{ totals.pctMetaMonto }}% S/.</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- Micro-gestión -->
      <section class="ep-section rg-card">
        <header class="rg-card-head">
          <div class="rg-card-head-left">
            <span class="rg-eyebrow">Granular</span>
            <h2 class="rg-card-title"><i class="fa-solid fa-table-cells"></i> Micro-gestión: desglose por período</h2>
            <p class="rg-card-sub">Click en los números para ver el detalle de registros.</p>
          </div>
          <div class="rg-filter-chip">
            <span class="rg-filter-label">Asesor</span>
            <select v-model="selectedAdvisorCode" class="rg-filter-select">
              <option value="ALL">Total equipo (consolidado)</option>
              <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
            </select>
          </div>
        </header>
        <div class="rg-days-grid">
          <article v-for="(day, i) in currentDailyStats" :key="i" class="rg-day" :class="{ 'is-active': day.ven > 0 }">
            <div class="rg-day-head"><span class="rg-day-name">{{ day.name }}</span></div>
            <div class="rg-day-body">
              <div class="rg-day-metric">
                <span class="rg-day-l">Leads</span>
                <span class="rg-day-v rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'leads', advisor: selectedAdvisorCode })">{{ day.con }}</span>
              </div>
              <div class="rg-day-metric is-accent">
                <span class="rg-day-l">Ventas</span>
                <div class="rg-day-group">
                  <span class="rg-day-v c-accent rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'sales', advisor: selectedAdvisorCode })">{{ day.ven }}</span>
                  <span class="rg-day-sub">{{ day.ratio_dia }}%</span>
                </div>
              </div>
              <div class="rg-day-metric">
                <span class="rg-day-l">Conv.</span>
                <div class="rg-day-group">
                  <span class="rg-day-v c-green rg-clickable" @click="drillDown({ date: day.date || day.name, type: 'cohort_sales', advisor: selectedAdvisorCode })">{{ day.ven_coh }}</span>
                  <span class="rg-day-sub">{{ day.conv_dia }}%</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- ═══════════════ VISTA DASHBOARD (EQUIPO) ═══════════════ -->
    <div v-else class="rg-fadein">

      <!-- KPI strip -->
      <section class="ep-section">
        <div class="ep-kpis ep-kpis-4">
          <article class="ep-kpi" :class="totals.obj > 0 && (totals.ven/totals.obj) >= 0.8 ? 'ep-kpi-green' : 'ep-kpi-red'">
            <div class="ep-kpi-head"><span class="ep-kpi-label">% Meta unidades</span><i class="fa-solid fa-bullseye ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ totals.obj > 0 ? Math.round((totals.ven / totals.obj) * 100) : 0 }}%</span></div>
            <div class="rg-kpi-progress">
              <div class="rg-kpi-progress-fill" :class="totals.obj > 0 && (totals.ven/totals.obj) >= 0.8 ? 'is-green' : 'is-red'"
                :style="`width:${Math.min(100, totals.obj > 0 ? Math.round((totals.ven/totals.obj)*100) : 0)}%`"></div>
            </div>
            <span class="ep-kpi-foot"><strong>{{ totals.ven }}</strong> de {{ totals.obj }} ventas realizadas</span>
          </article>

          <article class="ep-kpi" :class="totals.pctMetaMonto >= 80 ? 'ep-kpi-green' : totals.pctMetaMonto >= 50 ? 'ep-kpi-amber' : 'ep-kpi-red'">
            <div class="ep-kpi-head"><span class="ep-kpi-label">% Meta S/.</span><i class="fa-solid fa-coins ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ totals.pctMetaMonto }}%</span></div>
            <div class="rg-kpi-progress">
              <div class="rg-kpi-progress-fill" :class="totals.pctMetaMonto >= 80 ? 'is-green' : 'is-amber'" :style="`width:${Math.min(100, totals.pctMetaMonto)}%`"></div>
            </div>
            <span class="ep-kpi-foot"><strong>{{ formatCurrency(totals.ven_monto) }}</strong> de {{ formatCurrency(totals.obj_monto) }}</span>
          </article>

          <article class="ep-kpi ep-kpi-teal">
            <div class="ep-kpi-head"><span class="ep-kpi-label">Ratio leads → venta</span><i class="fa-solid fa-arrow-trend-up ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ totals.avgRatio }}%</span></div>
            <div class="rg-kpi-progress"><div class="rg-kpi-progress-fill is-blue" :style="`width:${Math.min(100, totals.avgRatio * 3)}%`"></div></div>
            <span class="ep-kpi-foot">Eficiencia de contacto del período</span>
          </article>

          <article class="ep-kpi ep-kpi-amber">
            <div class="ep-kpi-head"><span class="ep-kpi-label">Leads activos</span><i class="fa-solid fa-fire ep-kpi-icon"></i></div>
            <div class="ep-kpi-main"><span v-if="loading" class="skel-kpi"></span><span v-else class="ep-kpi-value">{{ totals.activos }}</span></div>
            <div class="rg-kpi-progress"><div class="rg-kpi-progress-fill is-amber" :style="`width:${Math.min(100, totals.avgGestion)}%`"></div></div>
            <span class="ep-kpi-foot"><strong>{{ totals.avgGestion }}%</strong> gestionados del total</span>
          </article>
        </div>
      </section>

      <!-- Evolución + Proyección -->
      <section class="ep-section rg-card">
        <header class="rg-card-head">
          <div class="rg-card-head-left">
            <span class="rg-eyebrow">Tendencia</span>
            <h2 class="rg-card-title">Evolución de ventas vs proyección de meta</h2>
            <p class="rg-card-sub">Acumulado real vs ritmo ideal para cumplir la meta.</p>
          </div>
          <div class="rg-chart-legend">
            <span class="rg-legend"><span class="rg-legend-line" style="background:#14140F;"></span> Acumulado real</span>
            <span class="rg-legend"><span class="rg-legend-dashed"></span> Meta proyectada</span>
            <span class="rg-legend"><span class="rg-legend-dot" style="background:rgba(59,130,246,0.75)"></span> Ventas</span>
            <span class="rg-legend"><span class="rg-legend-dot" style="background:#cbd5e1"></span> Leads</span>
          </div>
        </header>
        <div class="rg-chart rg-chart-lg"><Line :data="trendChartData" :options="lineOptions" /></div>
      </section>

      <!-- Ranking + Conversión -->
      <div class="rg-two-col">
        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Ranking</span>
              <h2 class="rg-card-title">% Cumplimiento de meta</h2>
              <p class="rg-card-sub">Ventas reales vs objetivo por asesor.</p>
            </div>
          </header>
          <div class="rg-chart"><Bar :data="rankingChartData" :options="rankingBarOptions" /></div>
        </section>

        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Eficiencia</span>
              <h2 class="rg-card-title">Ratio vs conversión por asesor</h2>
              <p class="rg-card-sub">Ratio = ventas/leads · Conversión = ventas cohorte/leads.</p>
            </div>
          </header>
          <div class="rg-chart"><Bar :data="conversionChartData" :options="convBarOptions" /></div>
        </section>
      </div>

      <!-- Pipeline + Revenue + Embudo/Share -->
      <div class="rg-three-col">
        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Pipeline</span>
              <h2 class="rg-card-title">Pipeline de leads</h2>
              <p class="rg-card-sub">Leads totales, activos y convertidos.</p>
            </div>
          </header>
          <div class="rg-chart"><Bar :data="pipelineChartData" :options="pipelineBarOptions" /></div>
        </section>

        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Financiero</span>
              <h2 class="rg-card-title">Cumplimiento de meta (S/.)</h2>
              <p class="rg-card-sub">Meta vs real financiero por asesor.</p>
            </div>
          </header>
          <div class="rg-chart"><Bar :data="revenueChartData" :options="groupedBarOptions" /></div>
        </section>

        <div class="rg-col-stack">
          <section class="ep-section rg-card">
            <header class="rg-card-head">
              <div class="rg-card-head-left">
                <span class="rg-eyebrow">Pipeline</span>
                <h2 class="rg-card-title">Embudo del equipo</h2>
              </div>
            </header>
            <div class="rg-funnel rg-funnel-compact">
              <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'leads' })">
                <div class="rg-funnel-row"><span class="rg-funnel-l">Leads</span><span class="rg-funnel-v">{{ totals.contactos }}</span></div>
                <div class="rg-funnel-bar"><div class="rg-funnel-fill is-slate" style="width:100%"></div></div>
              </div>
              <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'active_leads' })">
                <div class="rg-funnel-row"><span class="rg-funnel-l c-amber">Activos</span><span class="rg-funnel-v c-amber">{{ totals.activos }}</span></div>
                <div class="rg-funnel-bar"><div class="rg-funnel-fill is-amber" :style="`width:${totals.avgGestion}%`"></div></div>
              </div>
              <div class="rg-funnel-step rg-clickable" @click="drillDown({ type: 'sales' })">
                <div class="rg-funnel-row"><span class="rg-funnel-l c-green">Ventas</span><span class="rg-funnel-v c-green">{{ totals.ven }}</span></div>
                <div class="rg-funnel-bar"><div class="rg-funnel-fill is-green" :style="`width:${totals.avgConv}%`"></div></div>
              </div>
              <div class="rg-funnel-foot">
                <span>Conv. global</span>
                <span class="fw-700" :class="convClass(totals.avgConv)">{{ totals.avgConv }}%</span>
              </div>
            </div>
          </section>

          <section class="ep-section rg-card">
            <header class="rg-card-head">
              <div class="rg-card-head-left">
                <span class="rg-eyebrow">Distribución</span>
                <h2 class="rg-card-title">Participación (share)</h2>
              </div>
            </header>
            <div class="rg-chart rg-chart-donut"><Doughnut :data="shareChartData" :options="doughnutOptions" /></div>
          </section>
        </div>
      </div>

      <!-- Composición leads + Ventas por programa -->
      <div class="rg-two-col rg-two-col-2-1">
        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Distribución</span>
              <h2 class="rg-card-title">Composición de leads por estado</h2>
              <p class="rg-card-sub">Distribución de estados de gestión por cada asesor.</p>
            </div>
          </header>
          <div class="rg-chart rg-chart-lg"><Bar :data="leadsStackedChartData" :options="stackedBarOptions" /></div>
        </section>

        <section class="ep-section rg-card">
          <header class="rg-card-head">
            <div class="rg-card-head-left">
              <span class="rg-eyebrow">Programas</span>
              <h2 class="rg-card-title">Ventas por programa</h2>
              <p class="rg-card-sub">Distribución de ventas del equipo en el período.</p>
            </div>
          </header>
          <div class="rg-chart rg-chart-donut"><Doughnut :data="programSalesChartData" :options="programSalesDoughnutOptions" /></div>
        </section>
      </div>

      <!-- Ticket -->
      <section class="ep-section rg-card">
        <header class="rg-card-head">
          <div class="rg-card-head-left">
            <span class="rg-eyebrow">Volumen vs valor</span>
            <h2 class="rg-card-title">Ticket promedio y volumen de ventas</h2>
            <p class="rg-card-sub">Monto promedio por venta (eje izq.) vs número de ventas (eje der.).</p>
          </div>
        </header>
        <div class="rg-chart"><Bar :data="ticketChartData" :options="ticketBarOptions" /></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { isDark } from '@/utils/chartTheme'
import { ServiceKeys } from '@/services'

const availableWeeks  = ref([])
const selectedWeek    = ref(null)


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')
const router = useRouter()

const PERIODS_CONFIG = {
  ENE: [{value:'S1',label:'S1 (01-04 Ene)'},{value:'S2',label:'S2 (05-11 Ene)'},{value:'S3',label:'S3 (12-18 Ene)'},{value:'S4',label:'S4 (19-25 Ene)'},{value:'S5',label:'S5 (26-31 Ene)'}],
  FEB: [{value:'S5',label:'S5 (01 Feb)'},{value:'S6',label:'S6 (02-08 Feb)'},{value:'S7',label:'S7 (09-15 Feb)'},{value:'S8',label:'S8 (16-22 Feb)'},{value:'S9',label:'S9 (23-28 Feb)'}],
  MAR: [{value:'S9',label:'S9 (01 Mar)'},{value:'S10',label:'S10 (02-08 Mar)'},{value:'S11',label:'S11 (09-15 Mar)'},{value:'S12',label:'S12 (16-22 Mar)'},{value:'S13',label:'S13 (23-29 Mar)'},{value:'S14',label:'S14 (30-31 Mar)'}]
}

// ── ESTADO ──
const isDashboard         = ref(false)
const loading             = ref(false)
const selectedAdvisorCode = ref('ALL')
const tableData           = ref([])
const filters             = reactive({ year: 2026, month: 'ENE', period: 'ALL', modality: 'NO_ONLINE' })
const usersMap            = ref([])

// ── RESTRICCIÓN DE ROL ──
const isStrictlyComercial   = ref(false)
const isLiderComercial      = ref(false)   // ← NUEVO: líder que puede ver como asesor
const viewAsAdvisor         = ref(false)   // ← NUEVO: toggle modo impersonación
const selectedViewAdvisorId = ref(null)    // ← NUEVO: id del asesor que el líder está "siendo"
const loggedAdvisorId       = ref(null)
const loggedAdvisorName     = ref('')

function applyRoleRestrictions() {
  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return
    const userData = JSON.parse(userStr)
    const roles    = userData.roles || []
    const isComercial = roles.includes('COMERCIAL')
    const isLider     = roles.includes('LIDER_COMERCIAL')

    if (isComercial && !isLider) {
      isStrictlyComercial.value = true
      loggedAdvisorId.value     = userData.user_id
      loggedAdvisorName.value   = userData.full_name || `Usuario ${userData.user_id}`
      selectedAdvisorCode.value = userData.user_id
    }

    // ← NUEVO: Detectar LIDER_COMERCIAL
    if (isLider) {
      isLiderComercial.value = true
    }
  } catch (e) {
    console.error('Error procesando el usuario desde localStorage:', e)
  }
}

// ── NUEVO: computed unificados para vista personal ──
// effectivePersonalView = true cuando es asesor simple O cuando el líder activó modo vista-asesor
const effectivePersonalView = computed(() =>
  isStrictlyComercial.value || (isLiderComercial.value && viewAsAdvisor.value)
)

// effectiveAdvisorId: el id del "asesor que se está viendo"
const effectiveAdvisorId = computed(() => {
  if (isStrictlyComercial.value) return loggedAdvisorId.value
  if (isLiderComercial.value && viewAsAdvisor.value) return selectedViewAdvisorId.value
  return null
})

// ── NUEVO: activar/desactivar modo vista-asesor (líder) ──
function toggleAdvisorView() {
  viewAsAdvisor.value = !viewAsAdvisor.value
  if (viewAsAdvisor.value) {
    // Al activar, pre-seleccionamos el primer asesor disponible
    if (tableData.value.length > 0) {
      selectedViewAdvisorId.value = tableData.value[0].cod
    }
  } else {
    selectedViewAdvisorId.value = null
  }
}

// ── NUEVO: acceso rápido desde la fila de la tabla ──
function quickViewAsAdvisor(cod) {
  selectedViewAdvisorId.value = cod
  viewAsAdvisor.value = true
}

// ── COMPUTED PERSONALES ──
const myData = computed(() => {
  if (!effectivePersonalView.value) return null
  return tableData.value.find(e => e.cod == effectiveAdvisorId.value) || null
})

const pctMetaUnidades = computed(() => {
  const d = myData.value
  if (!d || !d.obj) return 0
  return Math.min(100, Math.round((d.ven / d.obj) * 100))
})

const gaugeProgress = computed(() => pctMetaUnidades.value)

const heroStatusClass = computed(() => {
  const pct = pctMetaUnidades.value
  if (pct >= 100) return 'hero-excellent'
  if (pct >= 80)  return 'hero-good'
  if (pct >= 50)  return 'hero-warning'
  return 'hero-danger'
})

const avatarInitials = computed(() => {
  const name = myData.value?.asesor || loggedAdvisorName.value || ''
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
})

const currentPeriodOptions = computed(() => PERIODS_CONFIG[filters.month] || [])

onMounted(async () => {
  applyRoleRestrictions()
  try {
    const users = await authService.userList({})
    usersMap.value = users
  } catch(e) { console.error('Error users', e) }

  await loadWeeks()   // primero carga semanas (setea selectedWeek)
  await fetchData()   // luego fetch con la semana ya seteada
})


async function loadWeeks() {
  const weeks = await dashboardService.getAvailableWeeks({
    year: filters.year,
    modality: filters.modality
  })
  availableWeeks.value = weeks
  const today = new Date().toISOString().split('T')[0]
  const current = weeks.find(w => w.date_start <= today && w.date_end >= today)
  selectedWeek.value = current || weeks[weeks.length - 1] || null
  // fetchData se llama desde el watch de selectedWeek
}

// Evita el doble fetch en el arranque
watch(selectedWeek, (newVal, oldVal) => {
  if (oldVal !== undefined) fetchData()  // solo si ya no es la primera asignación
})

const activePeriodRange = reactive({ start: null, end: null })
const encodeFilter = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  return JSON.stringify(arr.map(i => ({ value: i.value ?? i.id, label: i.label ?? i.description })))
}

async function fetchData() {
  loading.value = true
  activePeriodRange.start = null
  activePeriodRange.end = null
  try {
    const payload = {
      year:       filters.year,
      modality:   filters.modality,
      date_start: selectedWeek.value?.date_start || null,
      date_end:   selectedWeek.value?.date_end   || null,
    }
    const rawResponse = await dashboardService.dashboardList(payload)
    const items = rawResponse.items || []
    if (items.length > 0 && selectedWeek.value !== null) {
      const rawStart = items[0].fecha_inicio
      const rawEnd   = items[0].fecha_fin
      if (rawStart) activePeriodRange.start = String(rawStart).split('T')[0]
      if (rawEnd)   activePeriodRange.end   = String(rawEnd).split('T')[0]
    }

    const grouped = {}
    items.forEach(item => {
      if (!grouped[item.cod_asesor]) {
        grouped[item.cod_asesor] = {
          asesor: item.asesor, cod: item.cod_asesor, high_interest_count: 0, follow_up_pending: 0,
          obj: 0, ven: 0, falta: 0, obj_monto: 0, ven_monto: 0, contactos: 0,
          activos: 0, acum_ventas_cohorte: 0, daily: []
        }
      }
      const g = grouped[item.cod_asesor]
      g.obj += Number(item.objetivo)
      g.high_interest_count += Number(item.high_interest_count || 0)
      g.follow_up_pending += Number(item.follow_up_pending || 0)
      g.ven += Number(item.logrado)
      g.obj_monto += Number(item.meta_monto)
      g.ven_monto += Number(item.logrado_monto)
      g.contactos += Number(item.consultas)
      g.activos   += Number(item.leads_activos || 0)
      g.acum_ventas_cohorte += Number(item.venta_cohorte || 0)

if (selectedWeek.value !== null && item.desglose_diario && Array.isArray(item.desglose_diario)) {
        item.desglose_diario.forEach(dia => {
          g.daily.push({
            name: `${dia.dia_nombre} ${dia.dia_num}`, date: dia.fecha,
            con: Number(dia.leads), ven: Number(dia.ventas_op), ven_coh: Number(dia.ventas_coh),
            ratio_dia: dia.leads > 0 ? Math.round((dia.ventas_op / dia.leads) * 100) : 0,
            conv_dia:  dia.leads > 0 ? Math.round((dia.ventas_coh / dia.leads) * 100) : 0,
            leads_by_status: dia.leads_by_status || {}
          })
        })
      } else {
        const ventasCohorte = Math.round((Number(item.consultas) * Number(item.conversion)) / 100)
        const consolidatedStatuses = {}
        if (item.desglose_diario && Array.isArray(item.desglose_diario)) {
          item.desglose_diario.forEach(dia => {
            if (dia.leads_by_status) {
              Object.entries(dia.leads_by_status).forEach(([st, count]) => {
                consolidatedStatuses[st] = (consolidatedStatuses[st] || 0) + Number(count)
              })
            }
          })
        }
        g.daily.push({
          name: item.week || 'Mes Completo', date: '', con: Number(item.consultas), ven: Number(item.logrado),
          ven_coh: ventasCohorte,
          ratio_dia: Number(item.consultas) > 0 ? Math.round((Number(item.logrado) / Number(item.consultas)) * 100) : 0,
          conv_dia:  item.conversion,
          leads_by_status: consolidatedStatuses
        })
      }
    })

    tableData.value = Object.values(grouped).map(adv => {
      adv.falta       = Math.max(0, adv.obj - adv.ven)
      adv.ratio       = adv.contactos > 0 ? Math.round((adv.ven / adv.contactos) * 100) : 0
      adv.conv        = adv.contactos > 0 ? Math.round((adv.acum_ventas_cohorte / adv.contactos) * 100) : 0
      adv.pct_gestion = adv.contactos > 0 ? Math.round((adv.activos / adv.contactos) * 100) : 0
      adv.daily.sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date)
        return a.name.localeCompare(b.name)
      })
      return adv
    })

    // Si el líder activó modo asesor pero no hay asesor seleccionado aún, auto-seleccionar el primero
    if (isLiderComercial.value && viewAsAdvisor.value && !selectedViewAdvisorId.value && tableData.value.length > 0) {
      selectedViewAdvisorId.value = tableData.value[0].cod
    }
  } catch (error) {
    console.error('Error:', error); tableData.value = []
  } finally { loading.value = false }
}

const DEAD_STATUS_ALIASES = [
  'we_lead_status_desestimado', 'we_lead_status_indiferente',
  'we_lead_status_closed', 'we_lead_status_anullment',
]

const getRatioColorClass = (ratio) => {
  if (ratio === 0) return 'text-ratio-zero'
  if (ratio <= 14) return 'text-ratio-low'
  if (ratio >= 40) return 'text-ratio-super'
  return 'text-ratio-good'
}

const getRatioBgClass = (ratio) => {
  if (ratio === 0) return 'bg-ratio-zero'
  if (ratio <= 14) return 'bg-ratio-low'
  if (ratio >= 40) return 'bg-ratio-super'
  return 'bg-ratio-good'
}

function drillDown(params = {}) {
  const { date, type, advisor } = params
  const query = {}
  let dStart = null, dEnd = null
  const toSql = (d) => d.toISOString().split('T')[0]

  if (date && String(date).includes('-')) {
    // Clic en un día específico del desglose diario
    dStart = String(date).split('T')[0]
    dEnd   = String(date).split('T')[0]
  } else {
    // Usa el rango de la semana seleccionada, o el mes completo si es MTD
    if (selectedWeek.value) {
      dStart = selectedWeek.value.date_start
      dEnd   = selectedWeek.value.date_end
    } else {
      // Acumulado MTD → rango del año completo o lo que tengas disponible
      // Usamos el rango de la primera y última semana disponible
      if (availableWeeks.value.length > 0) {
        dStart = availableWeeks.value[0].date_start
        dEnd   = availableWeeks.value[availableWeeks.value.length - 1].date_end
      } else {
        // Fallback: año completo
        dStart = `${filters.year}-01-01`
        dEnd   = `${filters.year}-12-31`
      }
    }
  }

  // Aplicar rango según tipo
  if (type === 'sales') {
    query.pay_date_from = dStart
    query.pay_date_to   = dEnd
  } else if (['leads', 'active_leads', 'cohort_sales'].includes(type)) {
    query.first_contact_from = dStart
    query.first_contact_to   = dEnd
}

  // Filtro de asesor
  if (effectivePersonalView.value) {
    const advRow = myData.value
    if (advRow) {
      query.owner_user_ids = encodeFilter([{ value: advRow.cod, label: advRow.asesor }])
    }
  } else {
    const targetAdvisor = (advisor && advisor !== 'ALL')
      ? advisor
      : (selectedAdvisorCode.value !== 'ALL' ? selectedAdvisorCode.value : null)

    if (targetAdvisor) {
      const advisorRow = tableData.value.find(r => r.cod == targetAdvisor)
      if (advisorRow) {
        query.owner_user_ids = encodeFilter([{ value: advisorRow.cod, label: advisorRow.asesor }])
      } else {
        const found = usersMap.value.find(u => u.user_id == targetAdvisor)
        if (found) query.owner_user_ids = encodeFilter([{ value: found.user_id, label: found.first_name }])
      }
    } else {
      // Sin asesor específico → encodear TODOS los del tablero actual
      const allAdvisors = tableData.value.map(r => ({ value: r.cod, label: r.asesor }))
      if (allAdvisors.length) query.owner_user_ids = encodeFilter(allAdvisors)
    }
  }

  // Filtro por tipo de venta/lead
  const salesAliases = ['we_lead_status_bought', 'we_lead_status_insc', 'we_lead_status_matriculado']
  if (type === 'sales' || type === 'cohort_sales') {
    const salesItems = salesAliases
      .map(alias => catalog.options('we_lead_status').find(s => s.alias === alias))
      .filter(Boolean)
      .map(s => ({ value: s.id, label: s.description }))
    if (salesItems.length) query.status_lead_ids = encodeFilter(salesItems)

  } else if (type === 'leads' || type === 'active_leads') {
    const activeItems = catalog.options('we_lead_status')
      .filter(s => !DEAD_STATUS_ALIASES.includes(s.alias))
      .map(s => ({ value: s.id, label: s.description }))
    if (activeItems.length) query.status_lead_ids = encodeFilter(activeItems)

    if (type === 'active_leads') {
      const pendingFollow = catalog.options('we_follow_lead').find(s => s.alias === 'we_follow_lead_pending')
      if (pendingFollow) query.last_follow_ids = encodeFilter([{ value: pendingFollow.id, label: pendingFollow.description }])
    }

  } else if (type === 'interestPriority') {
    const opts = catalog.options('we_lead_interest')
    const foundLow = opts.find(x => x.alias === 'we_lead_interest_low')
    const foundMed = opts.find(x => x.alias === 'we_lead_interest_medium')
    const today = new Date()
    const twoWeeksLater = new Date()
    twoWeeksLater.setDate(today.getDate() + 14)
    const formatDate = d => d.toISOString().split('T')[0]
    query.edition_start_from = formatDate(today)
    query.edition_start_to   = formatDate(twoWeeksLater)
    const interestFilters = []
    if (foundLow) interestFilters.push({ value: foundLow.id, label: foundLow.description })
    if (foundMed) interestFilters.push({ value: foundMed.id, label: foundMed.description })
    if (interestFilters.length) query.interest_level_ids = encodeFilter(interestFilters)
    const salesItems = catalog.options('we_lead_status')
      .filter(x => ['we_lead_status_atendido','we_lead_status_proximo','we_lead_status_unique','we_lead_status_will_pay','we_lead_status_interesado'].includes(x.alias))
      .map(x => ({ value: x.id, label: x.description }))
    if (salesItems.length) query.status_lead_ids = encodeFilter(salesItems)

  } else if (type === 'follow') {
    const opts = catalog.options('we_calling')
    const found = opts.find(x => x.description === params.valueName) ?? opts.find(x => x.alias === params.valueName)
    if (found) query.last_follow_ids = encodeFilter([{ value: found.id, label: found.description }])
  }
// ── Excluir tipo Congreso/Evento ──────────────────────────────
const EVENT_ALIAS = 'we_program_type_event'
if (filters.modality === 'CONGRESO') {
  // Solo incluir tipo Congreso/Evento
  const eventType = catalog.options('we_program_type')
    .filter(t => t.alias === EVENT_ALIAS)
    .map(t => ({ value: t.id, label: t.description }))
  if (eventType.length) query.type_program_ids = encodeFilter(eventType)
} else {
  // Excluir tipo Congreso/Evento (comportamiento original)
  const validProgramTypes = catalog.options('we_program_type')
    .filter(t => t.alias !== EVENT_ALIAS)
    .map(t => ({ value: t.id, label: t.description }))
  if (validProgramTypes.length) query.type_program_ids = encodeFilter(validProgramTypes)
}
const validProgramTypes = catalog.options('we_program_type')
  .filter(t => t.alias !== EVENT_ALIAS)
  .map(t => ({ value: t.id, label: t.description }))
if (validProgramTypes.length) query.type_program_ids = encodeFilter(validProgramTypes)

  // Filtro de modalidad
  const ONLINE_ALIAS = 'we_modality_online'
  if (filters.modality === 'NO_ONLINE') {
    const noOnlineItems = catalog.options('we_modality')
      .filter(m => m.alias !== ONLINE_ALIAS)
      .map(m => ({ value: m.id, label: m.description }))
    if (noOnlineItems.length) query.model_modality_ids = encodeFilter(noOnlineItems)
  } else if (filters.modality === 'ONLINE') {
    const onlineItem = catalog.options('we_modality').find(m => m.alias === ONLINE_ALIAS)
    if (onlineItem) query.model_modality_ids = encodeFilter([{ value: onlineItem.id, label: onlineItem.description }])
  }

  const routeData = router.resolve({ path: '/comercial/leads', query })
  window.open(routeData.href, '_blank')
}
const convClass = (val) =>
  val > 20 ? 'c-green fw-700' : val >= 10 ? 'c-accent fw-700' : 'text-muted'

const initialsFromName = (name) => {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const totals = computed(() => {
  // En modo vista-asesor del líder, los totales deben reflejar SOLO el asesor seleccionado
  const source = effectivePersonalView.value && myData.value
    ? [myData.value]
    : tableData.value

  const t = source.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.contactos += row.contactos
    acc.obj_monto += row.obj_monto; acc.ven_monto += row.ven_monto
    acc.activos += row.activos; acc.acum_ventas_cohorte_total += row.acum_ventas_cohorte
    return acc
  }, { obj: 0, ven: 0, contactos: 0, obj_monto: 0, ven_monto: 0, activos: 0, acum_ventas_cohorte_total: 0 })

  t.falta         = Math.max(0, t.obj - t.ven)
  t.ticketProm    = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto  = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  t.avgRatio      = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.avgConv       = t.contactos > 0 ? Math.round((t.acum_ventas_cohorte_total / t.contactos) * 100) : 0
  t.avgGestion    = t.contactos > 0 ? Math.round((t.activos / t.contactos) * 100) : 0
  return t
})

const currentDailyStats = computed(() => {
  if (tableData.value.length === 0) return []

  // ← ACTUALIZADO: usa effectivePersonalView en lugar de isStrictlyComercial
  if (effectivePersonalView.value) {
    const d = myData.value
    return d?.daily?.map(day => ({ ...day, ratio: day.ratio_dia || 0, conv: day.conv_dia || 0 })) || []
  }
  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.value.find(a => a.cod === selectedAdvisorCode.value)
    if (advisor?.daily) return advisor.daily.map(d => ({ ...d, ratio: d.ratio_dia || 0, conv: d.conv_dia || 0 }))
    return []
  }
  const periodsMap = {}
  tableData.value.forEach(adv => {
    adv.daily.forEach(d => {
      const key = d.date || d.name
      if (!periodsMap[key]) periodsMap[key] = { name: d.name, date: d.date, con: 0, ven: 0, ven_coh: 0, leads_by_status: {} }
      periodsMap[key].con += d.con; periodsMap[key].ven += d.ven; periodsMap[key].ven_coh += (d.ven_coh || 0)
      if (d.leads_by_status) {
        for (const [st, count] of Object.entries(d.leads_by_status)) {
          periodsMap[key].leads_by_status[st] = (periodsMap[key].leads_by_status[st] || 0) + Number(count)
        }
      }
    })
  })
  return Object.values(periodsMap)
    .sort((a, b) => { if (a.date && b.date) return a.date.localeCompare(b.date); return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) })
    .map(p => ({
      ...p,
      ratio_dia: p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
      conv_dia:  p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0,
      ratio:     p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
      conv:      p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0
    }))
})

const toggleView = () => isDashboard.value = !isDashboard.value
const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val)

// ════════ CHART DATA ════════

const trendChartData = computed(() => {
  if (!currentDailyStats.value || currentDailyStats.value.length === 0) return { labels: [], datasets: [] }
  const stats = currentDailyStats.value
  const n = stats.length
  const labels = stats.map(d => d.name)
  const ventasDiarias = stats.map(d => Number(d.ven) || 0)
  const consultasDiarias = stats.map(d => Number(d.con) || 0)
  const today = new Date().toISOString().split('T')[0]
  let running = 0
  const cumulative = stats.map(d => {
    if (d.date && d.date > today) return null
    running += Number(d.ven) || 0
    return running
  })
  const metaTotal = totals.value.obj
  const projection = Array.from({ length: n }, (_, i) => Math.round((metaTotal / n) * (i + 1)))
  return {
    labels,
    datasets: [
      { type: 'line', label: 'Ventas Acumuladas', data: cumulative, borderColor: isDark.value ? '#E5E7EB' : '#0f172a', backgroundColor: isDark.value ? 'rgba(229,231,235,0.08)' : 'rgba(15, 23, 42, 0.08)', borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: isDark.value ? '#E5E7EB' : '#0f172a', order: 1 },
      { type: 'line', label: 'Meta Proyectada', data: projection, borderColor: '#ef4444', backgroundColor: 'transparent', borderWidth: 2, borderDash: [8, 4], fill: false, tension: 0, pointRadius: 3, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 1.5, order: 2 },
      { type: 'bar', label: 'Ventas Periodo', data: ventasDiarias, backgroundColor: 'rgba(59, 130, 246, 0.75)', borderRadius: 5, order: 4 },
      { type: 'bar', label: 'Consultas (Leads)', data: consultasDiarias, backgroundColor: isDark.value ? 'rgba(58,58,51,0.8)' : 'rgba(226, 232, 240, 0.8)', borderRadius: 5, order: 5 }
    ]
  }
})

const rankingChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const sorted = [...tableData.value].filter(d => d.obj > 0 || d.ven > 0).sort((a, b) => (b.ven / (b.obj || 1)) - (a.ven / (a.obj || 1)))
  const pcts = sorted.map(d => d.obj > 0 ? Math.round((d.ven / d.obj) * 100) : 0)
  const colors = pcts.map(p => p >= 100 ? 'rgba(16, 185, 129, 0.85)' : p >= 70 ? 'rgba(59, 130, 246, 0.85)' : p >= 40 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)')
  return { labels: sorted.map(d => d.asesor), datasets: [{ label: '% Cumplimiento Meta (#)', data: pcts, backgroundColor: colors, borderRadius: 6, borderSkipped: false }, { label: 'Meta 100%', data: sorted.map(() => 100), backgroundColor: 'rgba(0,0,0,0)', borderColor: 'rgba(239, 68, 68, 0.5)', borderWidth: 1.5, borderDash: [5, 3], type: 'line', pointRadius: 0, fill: false }] }
})

const conversionChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const sorted = [...tableData.value].filter(d => d.contactos > 0).sort((a, b) => b.ratio - a.ratio)
  return { labels: sorted.map(d => d.asesor), datasets: [{ label: 'Ratio % (Ventas / Leads periodo)', data: sorted.map(d => d.ratio), backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 5 }, { label: '% Conversión Cohorte', data: sorted.map(d => d.conv), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 5 }] }
})

const pipelineChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const sorted = [...tableData.value].filter(d => d.contactos > 0).sort((a, b) => b.contactos - a.contactos)
  return { labels: sorted.map(d => d.asesor), datasets: [{ label: 'Ventas (Convertidos)', data: sorted.map(d => d.ven), backgroundColor: 'rgba(16, 185, 129, 0.9)', borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 5, bottomRight: 5 }, stack: 'pipeline' }, { label: 'Activos (Pendientes)', data: sorted.map(d => d.activos), backgroundColor: 'rgba(245, 158, 11, 0.8)', stack: 'pipeline' }, { label: 'Restantes', data: sorted.map(d => Math.max(0, d.contactos - d.activos - d.ven)), backgroundColor: 'rgba(203, 213, 225, 0.7)', borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 }, stack: 'pipeline' }] }
})

const ticketChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const sorted = [...tableData.value].filter(d => d.ven > 0).sort((a, b) => (b.ven_monto / b.ven) - (a.ven_monto / a.ven))
  const tickets = sorted.map(d => d.ven > 0 ? Math.round(d.ven_monto / d.ven) : 0)
  const ticketColors = tickets.map(t => { const max = Math.max(...tickets); const ratio = t / (max || 1); return isDark.value ? `rgba(229, 231, 235, ${0.3 + ratio * 0.7})` : `rgba(15, 23, 42, ${0.3 + ratio * 0.7})` })
  return { labels: sorted.map(d => d.asesor), datasets: [{ type: 'bar', label: 'Ticket Promedio (S/.)', data: tickets, backgroundColor: ticketColors, borderRadius: 6, yAxisID: 'yTicket', order: 2 }, { type: 'line', label: 'Nº Ventas', data: sorted.map(d => d.ven), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2, pointRadius: 5, pointBackgroundColor: '#3b82f6', fill: false, yAxisID: 'yVentas', order: 1 }] }
})

const revenueChartData = computed(() => {
  const active = tableData.value.filter(d => selectedAdvisorCode.value !== 'ALL' ? d.cod === selectedAdvisorCode.value : (d.obj_monto > 0 || d.ven_monto > 0 || d.obj > 0))
  return { labels: active.map(d => d.asesor), datasets: [{ label: 'Meta S/.', data: active.map(d => Number(d.obj_monto) || 0), backgroundColor: isDark.value ? '#3A3A33' : '#e2e8f0', borderRadius: 4 }, { label: 'Real S/.', data: active.map(d => Number(d.ven_monto) || 0), backgroundColor: '#10b981', borderRadius: 4 }] }
})

const leadsStackedChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const allStatuses = new Set()
  const advisorData = tableData.value.map(adv => {
    const statusCounts = {}
    adv.daily.forEach(d => {
      if (d.leads_by_status) {
        Object.entries(d.leads_by_status).forEach(([status, count]) => {
          allStatuses.add(status)
          statusCounts[status] = (statusCounts[status] || 0) + Number(count)
        })
      }
    })
    return { asesor: adv.asesor, statusCounts }
  })
  const statusArray = Array.from(allStatuses)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', isDark.value ? '#E5E7EB' : '#0f172a']
  const datasets = statusArray.map((statusAlias, index) => ({
    label: statusAlias,
    data: advisorData.map(adv => adv.statusCounts[statusAlias] || 0),
    backgroundColor: colors[index % colors.length],
    stack: 'StackLeads'
  }))
  return { labels: advisorData.map(adv => adv.asesor), datasets }
})

const stackedBarOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 10 } } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { stacked: true, beginAtZero: true, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } }
  }
}))

const PROGRAM_COLORS = computed(() => ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b', '#10b981', '#ec4899', isDark.value ? '#E5E7EB' : '#0f172a'])

const programSalesChartData = computed(() => {
  let rows = []

  if (effectivePersonalView.value) {
    rows = (myData.value?.ventas_por_programa || []).filter(p => Number(p.cantidad) > 0)
  } else {
    // Consolidar ventas_por_programa de todos los asesores
    const map = {}
    tableData.value.forEach(adv => {
      ;(adv.ventas_por_programa || []).forEach(p => {
        if (!map[p.nombre]) map[p.nombre] = 0
        map[p.nombre] += Number(p.cantidad) || 0
      })
    })
    rows = Object.entries(map)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .filter(p => p.cantidad > 0)
  }

  if (rows.length === 0) return { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: [isDark.value ? '#3A3A33' : '#e2e8f0'] }] }

  return {
    labels: rows.map(p => p.nombre),
    datasets: [{
      data: rows.map(p => Number(p.cantidad)),
      backgroundColor: rows.map((_, i) => PROGRAM_COLORS.value[i % PROGRAM_COLORS.value.length]),
      borderWidth: 2,
      borderColor: isDark.value ? '#1A1A14' : '#fff'
    }]
  }
})

const programSalesDoughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, padding: 10, font: { size: 9 } }
    },
    tooltip: {
      callbacks: {
        label: ctx => `  ${ctx.label}: ${ctx.raw} ventas`
      }
    }
  }
}

const shareChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const top = tableData.value.filter(d => Number(d.ven) > 0)
  const filteredTop = selectedAdvisorCode.value !== 'ALL' ? top.filter(d => d.cod === selectedAdvisorCode.value) : top
  return { labels: filteredTop.map(d => d.asesor), datasets: [{ data: filteredTop.map(d => Number(d.ven)), backgroundColor: isDark.value ? ['#E5E7EB','#CBD5E1','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9','#2563eb','#3b82f6','#60a5fa'] : ['#0f172a','#334155','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9','#2563eb','#3b82f6','#60a5fa'], borderWidth: 1, borderColor: isDark.value ? '#1A1A14' : '#ffffff' }] }
})

const lineOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', labels: { boxWidth: 14, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => { if (ctx.dataset.label === 'Meta Proyectada' || ctx.dataset.label === 'Ventas Acumuladas') return ` ${ctx.dataset.label}: ${ctx.raw} ventas`; return ` ${ctx.dataset.label}: ${ctx.raw}` } } } }, scales: { y: { beginAtZero: true, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } } } }))
const rankingBarOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ctx.dataset.label === '% Cumplimiento Meta (#)' ? ` ${ctx.raw}% de la meta` : ` Referencia: ${ctx.raw}%` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, max: Math.max(120, ...(rankingChartData.value?.datasets?.[0]?.data || [120])), ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' } } } }))
const convBarOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' } } } }))
const pipelineBarOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } }, y: { stacked: true, beginAtZero: true, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } } } }))
const ticketBarOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => { if (ctx.dataset.yAxisID === 'yTicket') return ` Ticket: S/. ${new Intl.NumberFormat('es-PE').format(ctx.raw)}`; return ` Ventas: ${ctx.raw}` } } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, yTicket: { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: v => 'S/' + new Intl.NumberFormat('es-PE').format(v), font: { size: 10 } }, grid: { color: isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' } }, yVentas: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } } } }))
const groupedBarOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'bottom' } } }
const doughnutOptions   = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right', labels: { boxWidth: 9, font: { size: 9 } } } } }

const myLeadsStackedChartData = computed(() => {
  if (!currentDailyStats.value || currentDailyStats.value.length === 0) return { labels: [], datasets: [] }
  const allStatuses = new Set()
  currentDailyStats.value.forEach(day => {
    if (day.leads_by_status) Object.keys(day.leads_by_status).forEach(st => allStatuses.add(st))
  })
  const statusArray = Array.from(allStatuses)
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', isDark.value ? '#E5E7EB' : '#0f172a']
  const datasets = statusArray.map((statusAlias, index) => {
    let labelName = statusAlias
    try {
      if (catalog && catalog.options) {
        const catItem = catalog.options('we_lead_status').find(s => s.alias === statusAlias)
        if (catItem) labelName = catItem.description
      }
    } catch(e) {}
    if (labelName === statusAlias) labelName = statusAlias.replace('we_lead_status_', '').toUpperCase()
    return {
      label: labelName,
      data: currentDailyStats.value.map(day => day.leads_by_status?.[statusAlias] || 0),
      backgroundColor: colors[index % colors.length],
      stack: 'StackMisLeads'
    }
  })
  return { labels: currentDailyStats.value.map(day => day.name), datasets }
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS — alineados con Leads.vue / EnrollmentPage
   ════════════════════════════════════════════════════════════ */
.rg-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
  font-size: 13px;
  line-height: 1.45;
}

/* ── Masthead ─────────────────────────────────────────────── */
.ep-masthead {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 20px; gap: 14px; flex-wrap: wrap;
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
.ep-view-toggle { display: flex; background: #fff; border: 1px solid var(--e-border); border-radius: 8px; padding: 3px; }
.ep-toggle-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12px; font-weight: 500;
  color: var(--e-text-secondary); background: transparent;
  border: none; border-radius: 6px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-toggle-btn.is-active { background: var(--e-bg-subtle); color: var(--e-text); font-weight: 600; }
.ep-toggle-btn:not(.is-active):hover { color: var(--e-text); }
.ep-btn-export {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  color: var(--e-text); background: #fff;
  border: 1px solid var(--e-border); border-radius: 8px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-btn-export:hover:not(:disabled) { border-color: var(--e-accent); color: var(--e-accent); background: var(--e-accent-soft); }
.ep-btn-export:disabled { opacity: .55; cursor: not-allowed; }
.ep-btn-export.is-active { border-color: #F59E0B; color: #B45309; background: #FFFBEB; }
.ep-btn-export i { font-size: 11px; }

/* ── Filter bar ──────────────────────────────────────────── */
.ep-section { margin-bottom: 14px; }
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  padding: 0;
  display: flex; flex-direction: column; overflow: hidden;
}
.ep-filter-bar-main {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}

.rg-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rg-filter-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 8px;
  padding: 5px 12px;
  transition: border-color .15s ease;
}
.rg-filter-chip:focus-within { border-color: var(--e-accent); box-shadow: 0 0 0 3px var(--e-accent-soft); }
.rg-filter-chip.is-impersonate { background: #FFFBEB; border-color: #FDE68A; }
.rg-filter-chip.is-impersonate .rg-filter-label { color: #B45309; }
.rg-filter-toggle { padding: 3px 5px; }
.rg-filter-label {
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  font-weight: 700; color: var(--e-text-muted);
  display: inline-flex; align-items: center; gap: 4px;
}
.rg-filter-label i { font-size: 9px; }
.rg-filter-select {
  background: transparent; border: none; outline: none; cursor: pointer;
  font-family: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--e-text); padding: 2px 0; min-width: 110px;
}
.rg-modality { display: inline-flex; gap: 2px; padding: 2px; background: #fff; border-radius: 6px; border: 1px solid var(--e-border); }
.rg-mod-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; font-size: 10.5px; font-weight: 700;
  color: var(--e-text-secondary); background: transparent;
  border: none; border-radius: 4px; cursor: pointer; font-family: inherit;
  letter-spacing: 0.04em; transition: all .12s;
}
.rg-mod-btn i { font-size: 9px; opacity: 0.7; }
.rg-mod-btn:hover:not(.is-active):not(:disabled) { color: var(--e-text); }
.rg-mod-btn.is-active {
  background: var(--e-accent-soft); color: #047857;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.rg-mod-btn.is-active i { opacity: 1; }
.rg-mod-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Inline KPIs en filter bar */
.rg-inline-kpis {
  display: inline-flex; align-items: stretch;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 10px; overflow: hidden;
}
.rg-mini-kpi {
  display: flex; flex-direction: column; gap: 1px;
  padding: 5px 14px;
}
.rg-mini-kpi[onclick], .rg-mini-kpi[title] { cursor: pointer; }
.rg-mini-kpi:hover { background: rgba(16, 185, 129, 0.04); }
.rg-mini-kpi-l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--e-text-muted); }
.rg-mini-kpi-v { font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--e-text); }
.rg-mini-kpi-divider { width: 1px; background: var(--e-border); }

/* ── Loader ─────────────────────────────────────────────── */
.rg-loader {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  min-height: 380px; color: var(--e-text-secondary); font-size: 13px;
  background: #fff; border: 1px solid var(--e-border); border-radius: 10px;
}
.rg-loader-ring {
  width: 32px; height: 32px;
  border: 3px solid var(--e-border);
  border-top-color: var(--e-accent);
  border-radius: 50%;
  animation: rg-spin .8s linear infinite;
}
.rg-fadein { animation: rg-fade .3s ease; }

/* ── Banner impersonación ──────────────────────────────── */
.rg-impersonation-banner {
  display: flex; align-items: center; gap: 10px;
  background: #FFFBEB; border: 1px solid #FDE68A;
  border-radius: 10px;
  padding: 11px 14px;
  margin-bottom: 14px;
  font-size: 12.5px; color: #92400E;
}
.rg-impersonation-banner i { color: #F59E0B; }
.rg-impersonation-banner strong { color: #78350F; font-weight: 700; }
.rg-banner-exit {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; font-size: 11.5px; font-weight: 600;
  background: transparent; color: #92400E;
  border: 1px solid #FDE68A; border-radius: 6px; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.rg-banner-exit:hover { background: #FEF3C7; }

/* ── Hero personal ─────────────────────────────────────── */
.rg-hero {
  display: flex; align-items: stretch;
  gap: 22px;
  padding: 22px 26px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(135deg, #14140F 0%, #1F1F1A 100%);
  position: relative;
  overflow: hidden;
}
.rg-hero::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 5px;
}
.rg-hero.hero-excellent { background: linear-gradient(135deg, #047857 0%, #065F46 100%); }
.rg-hero.hero-excellent::before { background: #10B981; }
.rg-hero.hero-good      { background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%); }
.rg-hero.hero-good::before      { background: #3B82F6; }
.rg-hero.hero-warning   { background: linear-gradient(135deg, #B45309 0%, #92400E 100%); }
.rg-hero.hero-warning::before   { background: #F59E0B; }
.rg-hero.hero-danger    { background: linear-gradient(135deg, #B91C1C 0%, #991B1B 100%); }
.rg-hero.hero-danger::before    { background: #EF4444; }

.rg-hero-left { display: flex; align-items: center; gap: 14px; flex: 1 1 220px; min-width: 0; }
.rg-hero-avatar {
  width: 52px; height: 52px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.rg-hero-info { min-width: 0; }
.rg-hero-name { font-size: 19px; font-weight: 700; letter-spacing: -0.015em; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rg-hero-period { font-size: 11.5px; opacity: 0.85; }
.rg-hero-period span { white-space: nowrap; }
.rg-hero-sep { opacity: 0.4; margin: 0 4px; }

.rg-hero-center { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rg-gauge { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.rg-gauge-svg { width: 130px; height: 70px; }
.rg-gauge-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: rgba(255,255,255,0.85);
}
.rg-gauge-label.is-weekly {
  background: rgba(255,255,255,0.18);
  padding: 2px 8px; border-radius: 8px;
  color: #fff;
}

.rg-hero-right { display: flex; flex-direction: column; gap: 6px; min-width: 240px; flex: 1 1 240px; }
.rg-hero-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rg-hero-l { font-size: 11.5px; opacity: 0.85; }
.rg-hero-v { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rg-hero-v-big { font-size: 22px; }
.rg-hero-divider { height: 1px; background: rgba(255,255,255,0.15); margin: 2px 0; }
.rg-hero-gap { color: #FCA5A5; }
.rg-hero-ok  { color: #6EE7B7; }

/* ── Action cards ──────────────────────────────────────── */
.rg-action-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.rg-action-card {
  display: flex; align-items: center; gap: 14px;
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all .18s ease;
}
.rg-action-card:hover { border-color: var(--e-border-strong); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.05); }
.rg-action-icon {
  width: 38px; height: 38px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.rg-action-card.is-hot .rg-action-icon      { background: #FEF2F2; color: #DC2626; }
.rg-action-card.is-followup .rg-action-icon { background: #EFF6FF; color: #2563EB; }
.rg-action-info { flex: 1; min-width: 0; }
.rg-action-title { display: block; font-size: 13px; font-weight: 600; color: var(--e-text); }
.rg-action-desc { display: block; font-size: 11.5px; color: var(--e-text-muted); margin-top: 2px; }
.rg-action-value {
  font-size: 28px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--e-text);
  flex-shrink: 0;
  letter-spacing: -0.02em;
}
.rg-action-card.is-hot .rg-action-value      { color: #DC2626; }
.rg-action-card.is-followup .rg-action-value { color: #2563EB; }

/* ── KPI cards ─────────────────────────────────────────── */
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
.ep-kpi.rg-clickable { cursor: pointer; }
.ep-kpi-head { display: flex; justify-content: space-between; align-items: center; }
.ep-kpi-label {
  font-size: 11px; font-weight: 600; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.ep-kpi-icon { font-size: 12px; color: currentColor; opacity: 0.65; }
.ep-kpi-main { display: flex; align-items: baseline; gap: 8px; }
.ep-kpi-value {
  font-size: 28px; font-weight: 600; color: var(--e-text);
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
.ep-kpi.is-alert { background: linear-gradient(180deg, #fff 0%, #FEF2F2 100%); }

.rg-kpi-progress {
  width: 100%; height: 5px;
  background: var(--e-bg-subtle);
  border-radius: 3px; overflow: hidden;
}
.rg-kpi-progress-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
.rg-kpi-progress-fill.is-green { background: #10B981; }
.rg-kpi-progress-fill.is-amber { background: #F59E0B; }
.rg-kpi-progress-fill.is-red   { background: #DC2626; }
.rg-kpi-progress-fill.is-blue  { background: #3B82F6; }

/* ── Cards (sección con borde) ─────────────────────────── */
.rg-card {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  overflow: hidden;
}
.rg-card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid var(--e-border);
  background: linear-gradient(180deg, #fff, var(--e-bg-subtle));
}
.rg-card-head-left { display: flex; flex-direction: column; gap: 2px; }
.rg-eyebrow {
  font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--e-text-muted); font-weight: 600;
}
.rg-card-title {
  font-size: 15px; font-weight: 600; color: var(--e-text);
  letter-spacing: -0.015em; margin: 0;
  display: inline-flex; align-items: center; gap: 7px;
}
.rg-card-title i { font-size: 13px; opacity: 0.7; }
.rg-card-sub { font-size: 12px; color: var(--e-text-secondary); margin: 0; }

/* ── Layout ───────────────────────────────────────────── */
.rg-two-col {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 14px; margin-bottom: 14px;
}
.rg-two-col-3-2 { grid-template-columns: 3fr 2fr; }
.rg-two-col-2-1 { grid-template-columns: 2fr 1fr; }
.rg-three-col {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 14px; margin-bottom: 14px;
}
.rg-col-stack { display: flex; flex-direction: column; gap: 14px; }
.rg-col-stack > .ep-section { margin-bottom: 0; }

/* ── Funnel ───────────────────────────────────────────── */
.rg-funnel { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
.rg-funnel-compact { padding: 12px 16px; gap: 8px; }
.rg-funnel-step { display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
.rg-funnel-step:hover .rg-funnel-fill { filter: brightness(1.05); }
.rg-funnel-row { display: flex; justify-content: space-between; align-items: center; }
.rg-funnel-l { font-size: 12px; font-weight: 600; color: var(--e-text-secondary); }
.rg-funnel-v { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--e-text); }
.rg-funnel-bar {
  width: 100%; height: 8px;
  background: var(--e-bg-subtle); border-radius: 4px; overflow: hidden;
}
.rg-funnel-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }
.rg-funnel-fill.is-slate { background: #94A3B8; }
.rg-funnel-fill.is-amber { background: #F59E0B; }
.rg-funnel-fill.is-green { background: #10B981; }
.rg-funnel-fill.is-blue  { background: #3B82F6; }
.rg-funnel-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 4px; padding-top: 10px;
  border-top: 1px solid var(--e-border);
  font-size: 12px; color: var(--e-text-secondary);
}

.rg-finance-summary {
  border-top: 1px solid var(--e-border);
  padding: 12px 18px;
  background: var(--e-bg-subtle);
  display: flex; flex-direction: column; gap: 6px;
}
.rg-fs-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.rg-fs-row > span:first-child { color: var(--e-text-secondary); font-weight: 500; }

/* ── Charts ───────────────────────────────────────────── */
.rg-chart { padding: 14px 18px; height: 230px; position: relative; }
.rg-chart-lg { height: 280px; }
.rg-chart-donut { height: 240px; }
.rg-chart-legend {
  display: flex; flex-wrap: wrap; gap: 12px;
  font-size: 11px; color: var(--e-text-secondary); font-weight: 500;
  align-self: center;
}
.rg-legend { display: inline-flex; align-items: center; gap: 5px; }
.rg-legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.rg-legend-line { display: inline-block; width: 16px; height: 2px; }
.rg-legend-dashed {
  display: inline-block; width: 16px; border-top: 2px dashed #EF4444;
}

/* ── Tabla equipo ─────────────────────────────────────── */
.rg-table-wrap { overflow-x: auto; }
.exec-table.rg-table {
  width: 100%; border-collapse: collapse;
  font-size: 12.5px; min-width: 1100px;
}
.rg-thead-group th { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; padding: 8px 8px; }
.rg-th-cat {
  background: var(--e-bg-subtle); color: var(--e-text);
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 9px 14px;
  border-bottom: 1px solid var(--e-border);
  text-align: left; white-space: nowrap;
}
.rg-th-group { font-weight: 700; color: #fff; padding: 6px 10px; text-align: center; }
.rg-grp-a { background: #1F1F1A; }
.rg-grp-b { background: #047857; }
.rg-grp-c { background: #1E40AF; }
.rg-grp-d { background: #6366F1; }
.rg-thead-sub th.ts {
  font-size: 9.5px; letter-spacing: 0.06em;
  font-weight: 700; text-transform: uppercase;
  color: var(--e-text-muted);
  padding: 7px 10px;
  background: var(--e-bg-subtle);
  border-bottom: 1px solid var(--e-border);
  white-space: nowrap;
}
.rg-thead-sub th.text-end { text-align: right; }
.rg-thead-sub th.text-center { text-align: center; }
.rg-thead-sub th.ts-a { color: #14140F; }
.rg-thead-sub th.ts-b { color: #047857; }
.rg-thead-sub th.ts-c { color: #1E40AF; }
.rg-thead-sub th.ts-d { color: #6366F1; }
.rg-table td.td-a { padding: 9px 10px; border-bottom: 1px solid var(--e-border); color: var(--e-text); white-space: nowrap; }
.rg-table .text-end { text-align: right; }
.rg-table .text-center { text-align: center; }
.rg-table .small { font-size: 11.5px; }
.rg-tbody-row.is-alt td { background: rgba(232, 232, 227, 0.18); }
.rg-tbody-row:hover td { background: var(--e-accent-soft); }

.rg-td-asesor { padding: 8px 14px !important; }
.rg-td-asesor-inner { display: inline-flex; align-items: center; gap: 8px; }
.rg-avatar-mini {
  width: 24px; height: 24px;
  background: var(--e-bg-subtle);
  color: var(--e-text);
  border-radius: 50%;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--e-border);
}
.rg-btn-view-as {
  background: transparent; border: 1px solid var(--e-border);
  color: var(--e-text-secondary);
  width: 24px; height: 24px;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 10px;
  transition: all .15s ease;
}
.rg-btn-view-as:hover { border-color: #F59E0B; color: #B45309; background: #FFFBEB; }
.rg-empty-row { text-align: center; padding: 32px; color: var(--e-text-muted); }
.rg-gap-neg { color: #DC2626; font-weight: 700; }
.rg-gap-pos { color: #047857; font-weight: 700; }
.rg-status-pill {
  display: inline-block;
  padding: 2px 9px; font-size: 10.5px; font-weight: 700;
  border-radius: 9px;
  letter-spacing: 0.04em;
}
.rg-status-pill.is-ok  { background: var(--e-accent-soft); color: #047857; border: 1px solid #BBF7D0; }
.rg-status-pill.is-low { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
.rg-tfoot-row td {
  background: var(--e-bg-subtle) !important;
  font-weight: 700;
  border-top: 2px solid var(--e-border);
  border-bottom: none;
  padding: 11px 10px !important;
  font-size: 12.5px;
}
.rg-tfoot-label {
  text-transform: uppercase; letter-spacing: 0.08em;
  font-size: 11px; color: var(--e-text);
  text-align: left; padding-left: 14px !important;
}

/* ── Days grid ────────────────────────────────────────── */
.rg-days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px; padding: 14px 18px;
}
.rg-day {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  overflow: hidden;
  transition: all .15s ease;
}
.rg-day.is-active { border-color: rgba(16, 185, 129, 0.32); box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.06); }
.rg-day-head {
  background: var(--e-bg-subtle);
  padding: 6px 11px;
  border-bottom: 1px solid var(--e-border);
}
.rg-day.is-active .rg-day-head { background: var(--e-accent-soft); border-bottom-color: rgba(16, 185, 129, 0.25); }
.rg-day-name { font-size: 11px; font-weight: 700; color: var(--e-text); text-transform: capitalize; letter-spacing: 0.02em; }
.rg-day-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; }
.rg-day-metric { display: flex; align-items: center; justify-content: space-between; }
.rg-day-metric.is-accent {
  background: var(--e-accent-soft);
  border-radius: 6px;
  padding: 4px 8px; margin: 0 -2px;
}
.rg-day-l { font-size: 10.5px; color: var(--e-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.rg-day-v { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--e-text); }
.rg-day-group { display: inline-flex; align-items: baseline; gap: 5px; }
.rg-day-sub { font-size: 10.5px; color: var(--e-text-muted); font-weight: 600; }

/* ── Clickable & colors ───────────────────────────────── */
.rg-clickable { cursor: pointer; transition: opacity .15s; }
.rg-clickable:hover { opacity: 0.7; }
.c-green   { color: #047857; }
.c-amber   { color: #B45309; }
.c-red     { color: #B91C1C; }
.c-blue    { color: #2563EB; }
.c-indigo  { color: #4338CA; }
.c-accent  { color: #0D9488; }
.fw-600 { font-weight: 600; }
.fw-700 { font-weight: 700; }
.text-end { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: var(--e-text-muted); }
.small { font-size: 11.5px; }

/* ── Animations ───────────────────────────────────────── */
@keyframes rg-spin { to { transform: rotate(360deg); } }
@keyframes rg-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.rg-fade-enter-active, .rg-fade-leave-active { transition: all .25s ease; }
.rg-fade-enter-from, .rg-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 1280px) {
  .rg-three-col { grid-template-columns: 1fr 1fr; }
  .rg-three-col .rg-col-stack { grid-column: span 2; flex-direction: row; }
  .rg-three-col .rg-col-stack > .ep-section { flex: 1; }
}
@media (max-width: 1024px) {
  .rg-two-col, .rg-two-col-3-2, .rg-two-col-2-1, .rg-three-col { grid-template-columns: 1fr; }
  .rg-three-col .rg-col-stack { flex-direction: column; }
  .ep-kpis-4 { grid-template-columns: 1fr 1fr; }
  .rg-action-cards { grid-template-columns: 1fr; }
  .rg-hero { flex-direction: column; gap: 18px; padding: 18px; }
  .rg-hero-right { width: 100%; }
}
@media (max-width: 640px) {
  .ep-title { font-size: 22px; }
  .rg-hero-name { font-size: 17px; }
  .rg-action-value { font-size: 22px; }
  .rg-days-grid { grid-template-columns: 1fr 1fr; }
}

/* ── Dark mode ───────────────────────────────────────── */
[data-coreui-theme="dark"] .rg-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16, 185, 129, 0.16);
}
[data-coreui-theme="dark"] .rg-card,
[data-coreui-theme="dark"] .ep-kpi,
[data-coreui-theme="dark"] .ep-section.ep-filter-bar,
[data-coreui-theme="dark"] .rg-loader,
[data-coreui-theme="dark"] .rg-action-card,
[data-coreui-theme="dark"] .rg-day { background: #1A1A14; }
[data-coreui-theme="dark"] .rg-card-head { background: linear-gradient(180deg, #1A1A14, #1F1F1A); }
[data-coreui-theme="dark"] .ep-kpi.is-alert { background: linear-gradient(180deg, #1A1A14 0%, rgba(220, 38, 38, 0.10) 100%); }
[data-coreui-theme="dark"] .rg-tbody-row.is-alt td { background: rgba(255, 255, 255, 0.02); }
[data-coreui-theme="dark"] .rg-tfoot-row td { background: #1F1F1A !important; }
[data-coreui-theme="dark"] .rg-impersonation-banner { background: rgba(245, 158, 11, 0.10); border-color: rgba(245, 158, 11, 0.30); color: #FCD34D; }
[data-coreui-theme="dark"] .rg-impersonation-banner strong { color: #FDE68A; }
[data-coreui-theme="dark"] .ep-view-toggle,
[data-coreui-theme="dark"] .ep-btn-export,
[data-coreui-theme="dark"] .rg-modality { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-btn-export.is-active { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.40); color: #FBBF24; }
[data-coreui-theme="dark"] .rg-filter-chip.is-impersonate { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.35); }
[data-coreui-theme="dark"] .rg-filter-chip.is-impersonate .rg-filter-label { color: #FBBF24; }
[data-coreui-theme="dark"] .rg-banner-exit { color: #FCD34D; border-color: rgba(245, 158, 11, 0.35); }
[data-coreui-theme="dark"] .rg-banner-exit:hover { background: rgba(245, 158, 11, 0.16); }
[data-coreui-theme="dark"] .rg-mod-btn.is-active { color: #34D399; }
[data-coreui-theme="dark"] .rg-action-card.is-hot .rg-action-icon { background: rgba(220, 38, 38, 0.16); color: #F87171; }
[data-coreui-theme="dark"] .rg-action-card.is-followup .rg-action-icon { background: rgba(59, 130, 246, 0.16); color: #60A5FA; }
[data-coreui-theme="dark"] .rg-action-card.is-hot .rg-action-value { color: #F87171; }
[data-coreui-theme="dark"] .rg-action-card.is-followup .rg-action-value { color: #60A5FA; }
[data-coreui-theme="dark"] .rg-th-group.rg-grp-a { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .rg-thead-sub th.ts-a { color: #F4F4F0; }
[data-coreui-theme="dark"] .rg-thead-sub th.ts-b { color: #34D399; }
[data-coreui-theme="dark"] .rg-thead-sub th.ts-c { color: #60A5FA; }
[data-coreui-theme="dark"] .rg-thead-sub th.ts-d { color: #A5B4FC; }
[data-coreui-theme="dark"] .rg-btn-view-as:hover { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.40); color: #FBBF24; }
[data-coreui-theme="dark"] .rg-status-pill.is-ok { border-color: rgba(16, 185, 129, 0.35); color: #34D399; }
[data-coreui-theme="dark"] .rg-status-pill.is-low { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.35); color: #F87171; }
[data-coreui-theme="dark"] .rg-gap-neg { color: #F87171; }
[data-coreui-theme="dark"] .rg-gap-pos,
[data-coreui-theme="dark"] .c-green { color: #34D399; }
[data-coreui-theme="dark"] .c-amber { color: #FBBF24; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .c-blue { color: #60A5FA; }
[data-coreui-theme="dark"] .c-indigo { color: #A5B4FC; }
[data-coreui-theme="dark"] .rg-legend-line[style] { background: #F4F4F0 !important; }
</style>
