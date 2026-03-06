<template>
  <div class="exec-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Tablero de conversión y rendimiento</span>
            <h1 class="brand-title">Control Comercial</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-primary" @click="fetchStats" :disabled="isLoading">
            <i class="fa-solid fa-rotate me-1" :class="{ 'fa-spin': isLoading }"></i>
            {{ isLoading ? 'Actualizando...' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters filter-scrollable">
        <!-- Filtro de fechas: aplica sobre first_contact_date -->
        <div class="filter-group">
          <label class="filter-label">PRIMER CONTACTO</label>
          <BaseDatePicker
             v-model="dateRangeString"
             :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
             class="exec-input-dark"
             placeholder="Seleccionar..."
             @on-change="(d) => handleDateFilterChange(d)"
          />
        </div>
        <div class="filter-sep" v-if="!isStrictlyComercial"></div>

        <div class="filter-group" v-if="!isStrictlyComercial">
          <label class="filter-label">ASESOR</label>
          <MultiSelect
             v-model="filters.owner_user_ids"
             :items="filtroOwners"
             label-key="description"
             value-key="id"
             placeholder="Todos..."
             class="exec-input-dark-component"
          />
        </div>
        <div class="filter-sep"></div>

        <!-- MODALIDAD como MultiSelect -->
        <div class="filter-group">
          <label class="filter-label">MODALIDAD</label>
          <MultiSelect
             v-model="filters.model_modality_ids"
             :items="modalidadCatalog"
             label-key="description"
             value-key="id"
             placeholder="Todas..."
             class="exec-input-dark-component w-md"
          />
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">PROGRAMA</label>
          <MultiSelect
            v-model="filters.program_version_ids"
            mode="remote"
            :fetcher="q => programService.programVersionCaller({ q })"
            :debounce-ms="350"
            label-key="abbreviation"
            value-key="program_version_id"
            placeholder="Buscar programa..."
            class="exec-input-dark-component"
          />
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div v-if="isLoading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Calculando conversiones y rendimiento...</p>
      </div>

      <div v-else-if="stats" class="view-dashboard slide-fade-enter-active">

        <!-- ── KPI STRIP (6 tarjetas) ─────────────────────────────────── -->
        <div class="kpi-strip">

          <div class="kpi-card kpi-interactive" @click="drillDown('all')">
            <div class="kpi-card-header">
              <span class="kpi-card-label">TOTAL CONSULTAS</span>
              <div class="kpi-indicator" style="background: var(--blue-600)"></div>
            </div>
            <div class="kpi-card-value accent-text">{{ stats.general.total }}</div>
            <div class="kpi-card-actions">
               <span class="pill pill-blue interactive-pill" @click.stop="drillDown('web')">Web: {{ stats.general.countWeb }}</span>
               <span class="pill pill-slate interactive-pill border" @click.stop="drillDown('b2b')">B2B: {{ stats.general.countB2B }}</span>
            </div>
          </div>

          <div class="kpi-card kpi-interactive" @click="drillDown('follow', 'we_calling_pending')">
            <div class="kpi-card-header">
              <span class="kpi-card-label">SEG. PENDIENTES</span>
              <div class="kpi-indicator" style="background: var(--amber-500)"></div>
            </div>
            <div class="kpi-card-value" style="color: var(--amber-500)">{{ stats.general.followUpPending }}</div>
            <div class="kpi-card-sub">De <strong class="text-dark">{{ stats.general.attemptUpCount }}</strong> gestionados</div>
          </div>

          <div class="kpi-card kpi-interactive" @click="drillDown('interestPriority', 'Bajo')">
            <div class="kpi-card-header">
              <span class="kpi-card-label">ALTA PRIORIDAD</span>
              <div class="kpi-indicator" style="background: var(--red-600)"></div>
            </div>
            <div class="kpi-card-value" style="color: var(--red-600)">{{ stats.general.highInterestCount }}</div>
            <div class="kpi-card-sub">Ediciones por comenzar</div>
          </div>


          <!-- CONVERSIÓN: 1er contacto en período -->
          <div class="kpi-card kpi-card-metric kpi-interactive"
               :class="{ 'kpi-dimmed': !filters.rangoFechas.start }"
               @click="drillDownConversion(null, null)">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color:#0891b2">CONVERSIÓN</span>
              <div class="kpi-indicator" style="background:#0891b2"></div>
            </div>
            <div class="kpi-card-value" style="color:#0891b2">{{ stats.general.conversion ?? '—' }}</div>
            <div class="kpi-card-sub" style="color:#0891b2; font-weight:600;">
              <template v-if="filters.rangoFechas.start">
                {{ stats.general.conversionRate }}% · 1er contacto en período
              </template>
              <template v-else><span class="text-muted fst-italic" style="font-size:10px;">Sin filtro de fecha</span></template>
            </div>
          </div>

          <!-- RATIO: cobros (pay_date) en período — universo independiente -->
          <div class="kpi-card kpi-card-metric kpi-interactive"
               :class="{ 'kpi-dimmed': !filters.rangoFechas.start }"
               @click="drillDownRatio(null, null)">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color:#7c3aed">RATIO (F. PAGO)</span>
              <div class="kpi-indicator" style="background:#7c3aed"></div>
            </div>
            <div class="kpi-card-value" style="color:#7c3aed">{{ stats.general.ratio ?? '—' }}</div>
            <div class="kpi-card-sub" style="color:#7c3aed; font-weight:600;">
              <template v-if="filters.rangoFechas.start">
                {{ stats.general.ratioRate }}% · cobros en período
              </template>
              <template v-else><span class="text-muted fst-italic" style="font-size:10px;">Sin filtro de fecha</span></template>
            </div>
          </div>

        </div>
<!-- ── LEYENDA de métricas ─────────────────────────────────────── -->
<div class="metrics-legend">
  <div class="ml-item ml-conv">
    <span class="ml-dot"></span>
    <strong>Conv.</strong> Número de leads del grupo mostrado que terminaron pagando su inscripción.
  </div>
  <div class="ml-item ml-ratio">
    <span class="ml-dot"></span>
    <strong>Ratio</strong> Número de pagos registrados en el período seleccionado, sin importar cuándo se generó el lead.
  </div>
</div>

        <!-- ── GRÁFICOS ─────────────────────────────────────────────────── -->
        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Pipeline (Estados)</div>
                <div class="chart-panel-sub">Distribución y métricas por estado comercial</div>
              </div>
              <PanelHeaderStats :arr="stats.byStatus" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byStatus"
                @click-row="(i) => drillDown('status', i.name)"
                @click-conversion="(i) => drillDownConversion('status', i?.name)"
                @click-ratio="(i) => drillDownRatio('status', i?.name)"
              />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Rendimiento por Asesor</div>
                <div class="chart-panel-sub">Leads asignados y tasas</div>
              </div>
              <PanelHeaderStats :arr="stats.byOwner" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byOwner"
                @click-row="(i) => drillDown('owner', i.name)"
                @click-conversion="(i) => drillDownConversion('owner', i?.name)"
                @click-ratio="(i) => drillDownRatio('owner', i?.name)"
              />
            </div>
          </div>
        </div>

        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Momento del Cliente (Lifecycle)</div></div>
              <PanelHeaderStats :arr="stats.byMoment" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byMoment"
                @click-row="(i) => drillDown('moment', i.name)"
                @click-conversion="(i) => drillDownConversion('moment', i?.name)"
                @click-ratio="(i) => drillDownRatio('moment', i?.name)"
              />
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Resultado Último Contacto</div></div>
              <PanelHeaderStats :arr="stats.byFollowStatus" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byFollowStatus"
                @click-row="(i) => drillDown('follow', i.name)"
                @click-conversion="(i) => drillDownConversion('follow', i?.name)"
                @click-ratio="(i) => drillDownRatio('follow', i?.name)"
              />
            </div>
          </div>
        </div>

        <div class="chart-grid-3">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Estrategia</div></div>
              <PanelHeaderStats :arr="stats.byStrategy" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byStrategy"
                @click-row="(i) => drillDown('strategy', i.name)"
                @click-conversion="(i) => drillDownConversion('strategy', i?.name)"
                @click-ratio="(i) => drillDownRatio('strategy', i?.name)"
              />
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Canales</div></div>
              <PanelHeaderStats :arr="stats.byChannel" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byChannel"
                @click-row="(i) => drillDown('channel', i.name)"
                @click-conversion="(i) => drillDownConversion('channel', i?.name)"
                @click-ratio="(i) => drillDownRatio('channel', i?.name)"
              />
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Medios</div></div>
              <PanelHeaderStats :arr="stats.byMedium" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable :data="stats.byMedium"
                @click-conversion="(i) => drillDownConversion('medium', i?.name)"
                @click-ratio="(i) => drillDownRatio('medium', i?.name)"
              />
            </div>
          </div>
        </div>

        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Promoción (T. Consulta)</div></div>
              <PanelHeaderStats :arr="stats.byPromotion" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byPromotion"
                @click-row="(i) => drillDown('promotion', i.name)"
                @click-conversion="(i) => drillDownConversion('promotion', i?.name)"
                @click-ratio="(i) => drillDownRatio('promotion', i?.name)"
              />
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Palabras Clave</div></div>
              <PanelHeaderStats :arr="stats.byWord" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byWord"
                @click-row="(i) => drillDown('word', i.name)"
                @click-conversion="(i) => drillDownConversion('word', i?.name)"
                @click-ratio="(i) => drillDownRatio('word', i?.name)"
              />
            </div>
          </div>
        </div>

        <div class="chart-grid-3">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Tipo Programa</div></div>
              <PanelHeaderStats :arr="stats.byProgramType" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byProgramType"
                @click-row="(i) => drillDown('program_type', i.name)"
                @click-conversion="(i) => drillDownConversion('program_type', i?.name)"
                @click-ratio="(i) => drillDownRatio('program_type', i?.name)"
              />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Nivel Interés</div></div>
              <PanelHeaderStats :arr="stats.byInterest" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <table class="interest-table">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th class="text-right">Leads</th>
                    <th class="text-right col-conv" title="Conversión: 1er contacto en período">Conv.</th>
                    <th class="text-right col-conv">%</th>
                    <th class="text-right col-ratio" title="Ratio: pago en período">Ratio</th>
                    <th class="text-right col-ratio">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(seg, idx) in stats.byInterest" :key="idx"
                      class="interest-row"
                      @click="drillDown('interest', seg.name)">
                    <td><span class="pill" :class="getBadgeClassInterestExec(seg.code)">{{ seg.name }}</span></td>
                    <td class="text-right fw-600">{{ seg.count }}</td>
                    <td class="text-right fw-700 col-conv-val"
                        @click.stop="drillDownConversion('interest', seg.name)">{{ seg.conversion }}</td>
                    <td class="text-right text-muted small">{{ seg.conversion_rate }}%</td>
                    <td class="text-right fw-700 col-ratio-val"
                        @click.stop="drillDownRatio('interest', seg.name)">{{ seg.ratio }}</td>
                    <td class="text-right text-muted small">{{ seg.ratio_rate }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div><div class="chart-panel-title">Geografía</div></div>
              <PanelHeaderStats :arr="stats.byCountry" />
            </div>
            <div class="chart-area panel-scroll-area p-0">
              <StatsTable
                :data="stats.byCountry"
                @click-row="(i) => drillDown('country', i.name)"
                @click-conversion="(i) => drillDownConversion('country', i?.name)"
                @click-ratio="(i) => drillDownRatio('country', i?.name)"
              />
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped>
/* ═══ ESTRUCTURA ═══════════════════════════════════════════════════════ */
.exec-shell { min-height: 100vh; display: flex; flex-direction: column; }
.exec-masthead { background: var(--navy-900, #0f172a); border-bottom: 1px solid var(--navy-700, #334155); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px 16px; border-bottom: 1px solid rgba(255,255,255,.07); }
.masthead-brand { display: flex; align-items: center; gap: 14px; }
.brand-rule { width: 3px; height: 42px; background: var(--teal-600, #12274e); border-radius: 2px; flex-shrink: 0; }
.brand-eyebrow { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 600; display: block; margin-bottom: 2px; }
.brand-title { font-size: 22px; font-weight: 700; margin: 0; color: #fff; letter-spacing: -.02em; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

/* ═══ FILTROS ══════════════════════════════════════════════════════════ */
.masthead-filters { display: flex; align-items: center; padding: 0 28px; min-height: 52px; overflow-x: auto; scrollbar-width: none; }
.masthead-filters::-webkit-scrollbar { display: none; }
.filter-group { display: flex; flex-direction: column; gap: 4px; padding: 10px 20px 10px 0; min-width: max-content; }
.filter-label { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 600; }
.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,.1); margin: 0 20px 0 0; }
.exec-input-dark { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,.18); color: #fff; font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 3px 0; outline: none; min-width: 130px; transition: border-color .2s; }
.exec-input-dark::placeholder { color: rgba(255,255,255,.3); }
.exec-input-dark:focus { border-bottom-color: #0891b2; }
.exec-input-dark-component { min-width: 180px; }
.w-md { min-width: 150px; }
:deep(.exec-input-dark-component .multiselect__tags),
:deep(.exec-input-dark-component .searchselect-control) { background: transparent !important; border: none !important; border-bottom: 1px solid rgba(255,255,255,.18) !important; color: #fff !important; padding-left: 0 !important; border-radius: 0 !important; box-shadow: none !important; min-height: 28px !important; }

/* ═══ BODY / LOADER ════════════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 24px 28px; }
.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; }
.loader-ring { width: 40px; height: 40px; border: 3px solid var(--border, #e2e8f0); border-top-color: var(--teal-600, #12274e); border-radius: 50%; animation: spin .8s linear infinite; }
.loader-text { font-size: 13px; color: var(--text-secondary, #475569); font-weight: 500; }

/* ═══ DASHBOARD ════════════════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 20px; }

/* ═══ KPI STRIP 6 columnas ═════════════════════════════════════════════ */
.kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }

.kpi-card, .chart-panel { background: #fff; border: 1px solid rgba(15,23,42,.08); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.08),0 2px 4px -2px rgba(0,0,0,.04); overflow: hidden; display: flex; flex-direction: column; transition: transform .2s, box-shadow .2s, border-color .2s; }
.kpi-interactive:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.05); cursor: pointer; border-color: var(--slate-300, #cbd5e1); }
.kpi-card-highlight { background: var(--navy-900, #0f172a); border-color: var(--navy-700, #334155); }
.kpi-card-metric { border-top: 3px solid; }
.kpi-card-metric:nth-of-type(5) { border-top-color: #0891b2; }
.kpi-card-metric:nth-of-type(6) { border-top-color: #7c3aed; }
.kpi-dimmed { opacity: .55; }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 6px; }
.kpi-card-label { font-size: 9.5px; letter-spacing: .13em; text-transform: uppercase; font-weight: 700; color: var(--text-muted, #94a3b8); }
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.kpi-card-value { font-size: 22px; font-weight: 700; color: var(--text-primary, #0f172a); margin-bottom: 4px; font-variant-numeric: tabular-nums; padding: 0 18px; }
.kpi-card-sub { font-size: 10.5px; color: var(--text-muted, #94a3b8); font-weight: 500; padding: 0 18px 16px; }
.kpi-card-actions { display: flex; gap: 6px; padding: 0 18px 16px; }
.interactive-pill { transition: filter .15s; cursor: pointer; }
.interactive-pill:hover { filter: brightness(.9); }
.accent-text { color: var(--teal-600, #12274e); }

/* ═══ LEYENDA DE MÉTRICAS ══════════════════════════════════════════════ */
.metrics-legend { display: flex; gap: 24px; align-items: center; padding: 8px 14px; background: #f8fafc; border: 1px solid var(--slate-100, #f1f5f9); border-radius: 6px; font-size: 11px; color: var(--text-secondary, #475569); }
.ml-item { display: flex; align-items: center; gap: 7px; }
.ml-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ml-conv .ml-dot { background: #0891b2; }
.ml-ratio .ml-dot { background: #7c3aed; }

/* ═══ GRIDS ════════════════════════════════════════════════════════════ */
.chart-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.chart-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

/* ═══ PANEL HEADER ═════════════════════════════════════════════════════ */
.chart-panel-header { padding: 12px 18px; border-bottom: 1px solid var(--slate-100, #f1f5f9); background: #fafbfc; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.chart-panel-title { font-size: 11.5px; font-weight: 700; color: var(--text-primary, #0f172a); text-transform: uppercase; letter-spacing: .03em; }
.chart-panel-sub { font-size: 10.5px; color: var(--text-muted, #94a3b8); margin-top: 2px; }
.chart-area { flex: 1; position: relative; }
.panel-scroll-area { max-height: 280px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--slate-300, #cbd5e1) transparent; }
.p-0 { padding: 0 !important; }

/* ═══ STATS TABLE (via :deep para el componente render) ════════════════ */
:deep(.st-table) { width: 100%; border-collapse: collapse; font-size: 11.5px; font-family: inherit; }
:deep(.st-thead tr) { background: var(--slate-100, #f1f5f9); position: sticky; top: 0; z-index: 2; }
:deep(.st-thead th) { padding: 8px 12px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: var(--text-secondary, #475569); border: none; white-space: nowrap; }
:deep(.st-thead .th-conv) { color: #0891b2; }
:deep(.st-thead .th-ratio) { color: #7c3aed; }
:deep(.st-summary td) { padding: 5px 12px; background: #f1f5f9; border-top: 2px solid #e2e8f0; font-size: 10.5px; font-weight: 700; }
:deep(.st-row td) { padding: 8px 12px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; }
:deep(.st-row:last-child td) { border-bottom: none; }
:deep(.st-row:hover td) { background: #f8fafc; }
:deep(.st-name) { text-align: left; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
:deep(.st-name:hover) { color: var(--teal-600, #12274e); text-decoration: underline; }
:deep(.st-num) { text-align: right; min-width: 44px; }
:deep(.st-pct) { text-align: right; min-width: 42px; color: var(--text-muted, #94a3b8); font-size: 10.5px; }
:deep(.st-conv-val) { color: #0891b2; font-weight: 700; cursor: pointer; }
:deep(.st-conv-val:hover) { background: #e0f7fa !important; border-radius: 3px; }
:deep(.st-ratio-val) { color: #7c3aed; font-weight: 700; cursor: pointer; }
:deep(.st-ratio-val:hover) { background: #ede9fe !important; border-radius: 3px; }

/* ═══ INTEREST TABLE (nativa) ══════════════════════════════════════════ */
.interest-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.interest-table thead tr { background: var(--slate-100, #f1f5f9); position: sticky; top: 0; z-index: 2; }
.interest-table th { padding: 8px 12px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: var(--text-secondary, #475569); border: none; }
.interest-table .col-conv { color: #0891b2; }
.interest-table .col-ratio { color: #7c3aed; }
.interest-table td { padding: 9px 12px; border-bottom: 1px solid var(--slate-50, #f8fafc); }
.interest-row { cursor: pointer; transition: background .1s; }
.interest-row:hover td { background: #f8fafc; }
.col-conv-val { color: #0891b2; font-weight: 700; cursor: pointer; }
.col-conv-val:hover { background: #e0f7fa !important; }
.col-ratio-val { color: #7c3aed; font-weight: 700; cursor: pointer; }
.col-ratio-val:hover { background: #ede9fe !important; }
.text-right { text-align: right; }

/* ═══ PANEL HEADER STATS (componente subcomponente) ════════════════════ */
:deep(.phs-wrap) { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
:deep(.phs-row) { display: flex; gap: 8px; align-items: center; }
:deep(.phs-badge) { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
:deep(.phs-conv) { background: #e0f2fe; color: #0369a1; }
:deep(.phs-ratio) { background: #ede9fe; color: #6d28d9; }
:deep(.phs-pct) { font-size: 9.5px; font-weight: 400; opacity: .75; }

@keyframes spin { to { transform: rotate(360deg); } }
.slide-fade-enter-active { transition: all .3s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(10px); }
</style>

<script setup>
import { ref, reactive, onMounted, inject, h, defineComponent, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ServiceKeys } from '@/services'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import MultiSelect from '@/components/MultiSelect.vue'

const programService = inject(ServiceKeys.Program)
// ── COMPONENTE: STATS TABLE ──────────────────────────────────────────────
// 6 columnas: Nombre | Leads | Conv. | Conv.% | Ratio | Ratio%
// Emite click-row, click-conversion, click-ratio para drill-down diferenciado
const StatsTable = defineComponent({
  name: 'StatsTable',
  props: { data: { type: Array, default: () => [] } },
  emits: ['click-row', 'click-conversion', 'click-ratio'],
  render() {
    const data = this.data || []
    const totalCount = data.reduce((s, x) => s + (x.count || 0), 0)
    const totalConv  = data.reduce((s, x) => s + (x.conversion || 0), 0)
    const totalRatio = data.reduce((s, x) => s + (x.ratio || 0), 0)
    const convPct  = totalCount ? ((totalConv  / totalCount) * 100).toFixed(1) + '%' : '—'
    const ratioPct = totalCount ? ((totalRatio / totalCount) * 100).toFixed(1) + '%' : '—'

    const th = (label, cls = '') => h('th', { class: cls }, label)

    return h('table', { class: 'st-table' }, [
      // THEAD
      h('thead', { class: 'st-thead' }, [
        h('tr', [
          th('Nombre'),
          th('Leads', 'st-num'),
          th('Conv.', 'st-num th-conv'),
          th('%', 'st-pct th-conv'),
          th('Ratio', 'st-num th-ratio'),
          th('%', 'st-pct th-ratio'),
        ]),
        // Fila de totales de sección
        h('tr', { class: 'st-summary' }, [
          h('td', { class: 'st-name', style: 'color:#94a3b8;font-size:9.5px;letter-spacing:.06em' }, 'TOTAL SECCIÓN'),
          h('td', { class: 'st-num' }, totalCount),
          h('td', {
            class: 'st-num st-conv-val',
            title: 'Ver todas las conversiones de esta sección',
            onClick: () => this.$emit('click-conversion', null)
          }, totalConv),
          h('td', { class: 'st-pct' }, convPct),
          h('td', {
            class: 'st-num st-ratio-val',
            title: 'Ver todos los ratios de esta sección',
            onClick: () => this.$emit('click-ratio', null)
          }, totalRatio),
          h('td', { class: 'st-pct' }, ratioPct),
        ])
      ]),
      // TBODY
      h('tbody', data.map((item, i) =>
        h('tr', { key: i, class: 'st-row' }, [
          h('td', {
            class: 'st-name',
            title: item.name,
            onClick: () => this.$emit('click-row', item)
          }, item.name || '—'),
          h('td', {
            class: 'st-num fw-600',
            style: 'cursor:pointer',
            onClick: () => this.$emit('click-row', item)
          }, item.count),
          h('td', {
            class: 'st-num st-conv-val',
            title: `Conversiones de "${item.name}" — click para ver leads`,
            onClick: () => this.$emit('click-conversion', item)
          }, item.conversion ?? 0),
          h('td', { class: 'st-pct' }, (item.conversion_rate ?? 0) + '%'),
          h('td', {
            class: 'st-num st-ratio-val',
            title: `Ratio (f.pago) de "${item.name}" — click para ver leads`,
            onClick: () => this.$emit('click-ratio', item)
          }, item.ratio ?? 0),
          h('td', { class: 'st-pct' }, (item.ratio_rate ?? 0) + '%'),
        ])
      ))
    ])
  }
})

// ── COMPONENTE: PANEL HEADER STATS ──────────────────────────────────────
// Badges de totales de conversión y ratio para la cabecera de cada panel
const PanelHeaderStats = defineComponent({
  name: 'PanelHeaderStats',
  props: { arr: { type: Array, default: () => [] } },
  render() {
    const arr = this.arr || []
    if (!arr.length) return h('div')
    const totalCount = arr.reduce((s, x) => s + (x.count || 0), 0)
    const totalConv  = arr.reduce((s, x) => s + (x.conversion || 0), 0)
    const totalRatio = arr.reduce((s, x) => s + (x.ratio || 0), 0)
    const convPct  = totalCount ? ((totalConv  / totalCount) * 100).toFixed(1) : '0'
    const ratioPct = totalCount ? ((totalRatio / totalCount) * 100).toFixed(1) : '0'

    return h('div', { class: 'phs-wrap' }, [
      h('span', { class: 'phs-badge phs-conv', title: 'Conversión total: 1er contacto en período' }, [
        `Conv. ${totalConv} `,
        h('span', { class: 'phs-pct' }, `(${convPct}%)`)
      ]),
      h('span', { class: 'phs-badge phs-ratio', title: 'Ratio total: cobros (pay_date) en período' }, [
        `Ratio ${totalRatio} `,
        h('span', { class: 'phs-pct' }, `(${ratioPct}%)`)
      ]),
    ])
  }
})

// ── INYECCIONES ──────────────────────────────────────────────────────────
const router           = useRouter()
const route            = useRoute()
const comercialService = inject(ServiceKeys.Comercial)
const authService      = inject(ServiceKeys.Auth)
const catalog          = inject('catalog')

// ── CATÁLOGOS ────────────────────────────────────────────────────────────
const modalidadCatalog = ref(catalog.options('we_modality') || [])

// ── ESTADO ───────────────────────────────────────────────────────────────
const isStrictlyComercial = ref(false)
const selectedAdvisorId   = ref(null)
const isLoading           = ref(false)
const stats               = ref(null)
const filtroOwners        = ref([])
const dateRangeString     = ref(null)

// ── FILTROS ──────────────────────────────────────────────────────────────
const filters = reactive({
  rangoFechas:       { start: '', end: '' },
  owner_user_ids:    [],
  program_version_ids: [],
  model_modality_ids: [],   // ← ahora array MultiSelect
  program_text:      '',
})

// ── HELPERS URL ──────────────────────────────────────────────────────────
const decodeFilter = (s) => { if (!s) return []; try { return JSON.parse(s) } catch { return [] } }
const encodeFilter = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return undefined
  return JSON.stringify(arr.map(i => ({ value: i.value ?? i.id, label: i.label ?? i.description })))
}
const getIds = (arr) => Array.isArray(arr) ? arr.map(i => i.value ?? i.id).filter(x => x != null) : []

// ── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  applyRoleRestrictions()
  await loadOwners()
  await parseQueryAndApply()
  if (isStrictlyComercial.value) applyRoleRestrictions()
  fetchStats()
})

// ── CATÁLOGOS / OWNERS ───────────────────────────────────────────────────
async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => {
      const fName = (u.first_name || '').trim()
      const lName = (u.last_name  || '').trim()
      let full = fName
      if (lName) full += ` ${lName.charAt(0)}.`
      return { id: u.user_id, description: full.trim() || `Usuario ${u.user_id}` }
    })
  } catch (e) { console.error(e) }
}

function getBadgeClassInterestExec(alias) {
  if (alias === 'we_lead_interest_high')   return 'pill-red'
  if (alias === 'we_lead_interest_medium') return 'pill-amber'
  return 'pill-slate'
}

// ── LEER URL ─────────────────────────────────────────────────────────────
async function parseQueryAndApply() {
  const q = route.query
  if (!Object.keys(q).length) return

  if (q.from_date || q.to_date) {
    filters.rangoFechas = { start: q.from_date || '', end: q.to_date || '' }
    if (q.from_date) dateRangeString.value = `${q.from_date} a ${q.to_date || q.from_date}`
  }
  if (q.program_text) filters.program_text = q.program_text

  // model_modality_ids ahora es array
  if (q.model_modality_ids) {
    filters.model_modality_ids = decodeFilter(q.model_modality_ids)
  } else if (q.model_modality_id) {
    // backward compat: venía como valor único
    const id = Number(q.model_modality_id)
    const found = modalidadCatalog.value.find(x => x.id === id)
    if (found) filters.model_modality_ids = [{ value: found.id, label: found.description }]
  }

  if (q.owner_user_ids && !isStrictlyComercial.value) {
    const decoded = decodeFilter(q.owner_user_ids)
    if (decoded.length) {
      filters.owner_user_ids = decoded
    } else {
      const ids = q.owner_user_ids.split(',').map(Number).filter(Boolean)
      filters.owner_user_ids = filtroOwners.value
        .filter(u => ids.includes(u.id))
        .map(u => ({ value: u.id, label: u.description }))
    }
  }
}

// ── FECHAS ───────────────────────────────────────────────────────────────
function handleDateFilterChange(selectedDates) {
  const toSQL = (d) => {
    if (!d) return ''
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
  }
  let start = '', end = ''
  if (Array.isArray(selectedDates) && selectedDates.length) {
    start = toSQL(selectedDates[0])
    end   = selectedDates[1] ? toSQL(selectedDates[1]) : start
  }
  filters.rangoFechas = { start, end }
}

// ── FETCH STATS ──────────────────────────────────────────────────────────
async function fetchStats() {
  isLoading.value = true

  const queryParams = {}
  if (filters.rangoFechas.start) {
    queryParams.from_date = filters.rangoFechas.start
    queryParams.to_date   = filters.rangoFechas.end
  }
  if (filters.model_modality_ids.length) queryParams.model_modality_ids = encodeFilter(filters.model_modality_ids)
  if (filters.program_text)              queryParams.program_text        = filters.program_text
  if (filters.owner_user_ids.length)     queryParams.owner_user_ids      = encodeFilter(filters.owner_user_ids)
  if (filters.program_version_ids.length)
    queryParams.program_version_ids = encodeFilter(filters.program_version_ids)

  router.replace({ query: queryParams })

  try {
    const data = await comercialService.leadStats({
      from_date:          filters.rangoFechas.start || null,
      to_date:            filters.rangoFechas.end   || null,
      program_text:       filters.program_text      || null,
      program_version_ids: getIds(filters.program_version_ids),
      model_modality_ids: getIds(filters.model_modality_ids),
      owner_user_ids:     getIds(filters.owner_user_ids),
    })
    stats.value = data
  } catch (err) {
    console.error('Error cargando stats:', err)
  } finally {
    isLoading.value = false
  }
}

// ── ROLES ────────────────────────────────────────────────────────────────
function applyRoleRestrictions() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    const roles = u.roles || []
    if (roles.includes('COMERCIAL') && !roles.includes('LIDER_COMERCIAL')) {
      isStrictlyComercial.value = true
      selectedAdvisorId.value   = u.user_id
      filters.owner_user_ids    = [{ value: u.user_id, label: u.full_name || `Usuario ${u.user_id}` }]
    }
  } catch (e) { console.error(e) }
}

// ── HELPERS DE DRILL-DOWN ────────────────────────────────────────────────
// Statuses de "convertido" (Pagó / Inscrito / Matriculado)
function getSalesStatusFilter() {
  const opts = catalog.options('we_lead_status')
  return opts
    .filter(x => ['we_lead_status_bought', 'we_lead_status_insc', 'we_lead_status_matriculado'].includes(x.alias))
    .map(x => ({ value: x.id, label: x.description }))
}

// Base común de filtros heredados del header
function buildBaseQuery() {
  const q = {}
  if (filters.program_text)              q.program_text       = filters.program_text
  if (filters.owner_user_ids.length)     q.owner_user_ids     = encodeFilter(filters.owner_user_ids)
  if (filters.program_version_ids.length) q.program_version_ids = encodeFilter(filters.program_version_ids)
  if (filters.model_modality_ids.length) q.model_modality_ids = encodeFilter(filters.model_modality_ids)
  return q
}

// Aplica el filtro de dimensión (ej: byOwner → owner_user_ids)
function applyGroupFilter(q, type, valueName) {
  if (!valueName) return

  const find = (catalogKey, field) => {
    const found = catalog.options(catalogKey).find(x => x[field] === valueName)
    return found ? encodeFilter([{ value: found.id, label: found.description }]) : null
  }

  if (type === 'status') {
    const r = find('we_lead_status', 'description'); if (r) q.status_lead_ids = r
  } else if (type === 'owner') {
    const found = filtroOwners.value.find(u => u.description === valueName)
    if (found) q.owner_user_ids = encodeFilter([{ value: found.id, label: found.description }])
  } else if (type === 'moment') {
    const r = find('we_moment', 'description'); if (r) q.moment_ids = r
  } else if (type === 'follow') {
    const opts = catalog.options('we_calling')
    const f = opts.find(x => x.description === valueName) ?? opts.find(x => x.alias === valueName)
    if (f) q.last_follow_ids = encodeFilter([{ value: f.id, label: f.description }])
  } else if (type === 'strategy') {
    const r = find('we_type_strategy', 'description'); if (r) q.strategy_ids = r
  } else if (type === 'channel') {
    const r = find('we_social_media', 'description'); if (r) q.channel_ids = r
  } else if (type === 'medium') {
    const r = find('we_medium_contact', 'description'); if (r) q.medium_contact_ids = r
  } else if (type === 'promotion') {
    const r = find('we_category_query', 'description'); if (r) q.query_ids = r
  } else if (type === 'word') {
    const r = find('we_key_word', 'description'); if (r) q.word_ids = r
  } else if (type === 'program_type') {
    const r = find('we_program_type', 'description'); if (r) q.type_program_ids = r
  } else if (type === 'interest') {
    const r = find('we_lead_interest', 'description'); if (r) q.interest_level_ids = r
  } else if (type === 'country') {
    const r = find('we_country', 'description'); if (r) q.code_country_ids = r
  }
}

// ── DRILL-DOWN GENERAL (sin filtro de conversión) ────────────────────────
function drillDown(type, valueName) {
  const q = buildBaseQuery()

  // Hereda fechas como first_contact
  if (filters.rangoFechas.start) {
    q.from_date = filters.rangoFechas.start
    q.to_date   = filters.rangoFechas.end
  }

  if      (type === 'all')  { /* sin filtro extra */ }
  else if (type === 'web')  { q.web = 'Y' }
  else if (type === 'b2b')  { q.b2b = 'Y' }
  else if (type === 'sales') {
    const items = getSalesStatusFilter()
    if (items.length) q.status_lead_ids = encodeFilter(items)
  }
  else if (type === 'interestPriority') {
    const opts  = catalog.options('we_lead_interest')
    const found = opts.find(x => x.description === valueName)
    const today = new Date()
    const in14  = new Date(); in14.setDate(today.getDate() + 14)
    const fmt = d => d.toISOString().split('T')[0]
    q.edition_start_from = fmt(today)
    q.edition_start_to   = fmt(in14)
    if (found) q.interest_level_ids = encodeFilter([{ value: found.id, label: found.description }])
    const statItems = catalog.options('we_lead_status')
      .filter(x => ['we_lead_status_atendido','we_lead_status_proximo','we_lead_status_unique','we_lead_status_will_pay','we_lead_status_interesado'].includes(x.alias))
      .map(x => ({ value: x.id, label: x.description }))
    if (statItems.length) q.status_lead_ids = encodeFilter(statItems)
  }
  else {
    applyGroupFilter(q, type, valueName)
  }

  window.open(router.resolve({ name: 'ComercialListado', query: q }).href, '_blank')
}

// ── DRILL-DOWN CONVERSIÓN ────────────────────────────────────────────────
// Estado=Pagó/Inscrito/Matriculado + first_contact_date en rango del header
function drillDownConversion(type, valueName) {
  const q = buildBaseQuery()

  // Status = convertidos
  const salesItems = getSalesStatusFilter()
  if (salesItems.length) q.status_lead_ids = encodeFilter(salesItems)

  // Fecha → first_contact_date (el listado usa from_date/to_date para first_contact)
  if (filters.rangoFechas.start) {
    q.first_contact_from = filters.rangoFechas.start
    q.first_contact_to   = filters.rangoFechas.end
  }

  // Filtro de grupo
  if (type && valueName) applyGroupFilter(q, type, valueName)

  window.open(router.resolve({ name: 'ComercialListado', query: q }).href, '_blank')
}

// ── DRILL-DOWN RATIO ─────────────────────────────────────────────────────
// Estado=Pagó/Inscrito/Matriculado + pay_date en rango del header
function drillDownRatio(type, valueName) {
  const q = buildBaseQuery()

  // Status = convertidos
  const salesItems = getSalesStatusFilter()
  if (salesItems.length) q.status_lead_ids = encodeFilter(salesItems)

  // Fecha → pay_date_from / pay_date_to
  if (filters.rangoFechas.start) {
    q.pay_date_from = filters.rangoFechas.start
    q.pay_date_to   = filters.rangoFechas.end
  }

  // Filtro de grupo
  if (type && valueName) applyGroupFilter(q, type, valueName)

  window.open(router.resolve({ name: 'ComercialListado', query: q }).href, '_blank')
}
</script>