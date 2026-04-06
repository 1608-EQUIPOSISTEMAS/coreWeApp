<template>
  <div class="exec-shell">

    <!-- ══════════════ MASTHEAD ══════════════ -->
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Académica &amp; Operaciones</span>
            <h1 class="brand-title" @click="reloadSchedule()" style="cursor:pointer;" title="Recargar">
              {{ hasActiveFilters ? 'Resultados Históricos' : 'Cronograma Mensual' }}
            </h1>
          </div>
        </div>
        <div class="masthead-actions">
<button v-if="!hasActiveFilters && $hasRole(['ADMIN', 'PRODUCTO'])" type="button" class="btn-exec btn-exec-ghost" @click="openMonthlyGoalsModal">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Objetivos
          </button>
          <button type="button" class="btn-exec btn-exec-ghost" @click="openGlobalHistory">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.96"/></svg>
            Historial
          </button>
          <button type="button" class="btn-exec" :class="hasActiveFilters ? 'btn-exec-teal' : 'btn-exec-ghost'" @click="showFilterModal = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filtros
            <span v-if="hasActiveFilters" class="btn-exec-dot"></span>
          </button>
          <button type="button" class="btn-exec" :class="hasColumnFilters ? 'btn-exec-teal' : 'btn-exec-ghost'" @click="showMetaModal = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            Resumen
            <span v-if="hasColumnFilters" class="btn-exec-dot"></span>
          </button>
          <button type="button" class="btn-exec btn-exec-primary" :class="{ 'btn-exec-ghost': !isCompact }" @click="isCompact = !isCompact">
            <svg v-if="isCompact" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>
            {{ isCompact ? 'Normal' : 'Compacto' }}
          </button>
        </div>
      </div>

      <!-- Filtros / Periodo / KPIs en línea -->
      <div class="masthead-filters">
        <template v-if="!hasActiveFilters">
          <div class="filter-group">
            <label class="filter-label">PERÍODO</label>
            <div class="filter-period-nav">
              <button type="button" class="filter-nav-btn" @click="changeMonth(-1)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <select v-model.number="selectedMonth" @change="fetchSchedule" class="exec-select" style="min-width:110px;">
                <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
              </select>
              <select v-model.number="selectedYear" @change="fetchSchedule" class="exec-select" style="min-width:68px;">
                <option :value="2024">2024</option>
                <option :value="2025">2025</option>
                <option :value="2026">2026</option>
              </select>
              <button type="button" class="filter-nav-btn" @click="changeMonth(1)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div class="filter-sep"></div>
          <div class="filter-group">
            <label class="filter-label">LÍNEA</label>
            <MultiSelect
              v-model="columnFilters.business_line"
              :items="catalogs.businessLineList"
              label-key="description"
              value-key="id"
              placeholder="Todas…"
            />
          </div>
          <div class="filter-spacer"></div>
          <!-- KPIs inline -->
          <div class="masthead-kpis">
            <div class="inline-kpi">
              <span class="inline-kpi-label">SEMANAS</span>
              <span class="inline-kpi-value">{{ schedules.length }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">EDICIONES</span>
              <span class="inline-kpi-value accent">{{ allScheduleItems.length }}</span>
            </div>
            <div class="inline-kpi" v-if="hasColumnFilters" style="margin-right:20px;">
              <span class="inline-kpi-label">FILTRADAS</span>
              <span class="inline-kpi-value" style="color:var(--gold-400)">{{ filteredSchedules.flatMap(w => w.items || []).length }}</span>
            </div>
          </div>
        </template>

        <!-- Modo histórico: chips de filtros activos -->
        <template v-else>
          <div class="filter-chips-bar">
            <BaseFilterChips :items="formattedActiveFilters" @remove="removeFilter($event)" @clear-all="clearAllFilters" />
          </div>
          <div class="filter-spacer"></div>
          <div class="masthead-kpis" style="margin-right:20px;">
            <div class="inline-kpi">
              <span class="inline-kpi-label">RESULTADOS</span>
              <span class="inline-kpi-value accent">{{ historyList.length }}</span>
            </div>
          </div>
        </template>
      </div>
    </header>

    <!-- ══════════════ CUERPO ══════════════ -->
    <main class="exec-body">
      <div class="view-table">
        <div class="table-shell">
          <div class="table-responsive-custom">
            <table class="exec-table" :class="{ 'exec-table-dense': isCompact }">
              <thead>
                <!-- FILA 1: Grupos principales -->
                <tr class="thead-group">
                  <th class="th-act" rowspan="2">
                    <div class="d-flex justify-content-center" v-if="!hasActiveFilters">
<button v-if="$hasRole(['ADMIN', 'PRODUCTO'])" type="button" class="btn-exec btn-exec-primary btn-exec-xs" @click="openEditModal(null)">
                        + Nueva
                      </button>
                    </div>
                  </th>
                  <th :colspan="isCompact ? 5 : 2" class="th-group th-group-a">IDENTIFICACIÓN</th>
                  <th :colspan="isCompact ? 6 : 4" class="th-group th-group-b">CRONOGRAMA</th>
                  <th colspan="2" class="th-group th-group-c">SEGUIMIENTO</th>
                  <th colspan="2" class="th-group th-group-d">REFERENCIA</th>
                </tr>

                <!-- FILA 2: Columnas individuales -->
                <tr class="thead-sub">
                  <!-- Identificación -->
                  <th class="ts ts-a">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>PROGRAMA</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Programa" :all-items="allScheduleItems" :value-extractor="(item) => item.program_abreviature" v-model="columnFilters.program" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-a" v-if="!isCompact">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>DETALLE</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Detalle" :all-items="allScheduleItems" :value-extractor="(item) => `${item.version_code} ${item.cat_segment}`" v-model="columnFilters.detail" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-a" v-if="isCompact">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>LÍNEA</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Línea" :all-items="allScheduleItems" :value-extractor="(item) => item.business_line_label || item.program_line_business" v-model="columnFilters.line" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-a" v-if="isCompact">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>TIPADO</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Tipado" :all-items="allScheduleItems" :value-extractor="(item) => item.cat_course_category_label" v-model="columnFilters.type" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-a text-center" v-if="isCompact">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>SEG.</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Seg" :all-items="allScheduleItems" :value-extractor="(item) => item.cat_segment" v-model="columnFilters.segment" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-a text-center" v-if="isCompact">D.A.</th>

                  <!-- Cronograma -->
                  <th class="ts ts-b text-center">F. INICIO</th>
                  <th class="ts ts-b text-center" v-if="isCompact">D.P.</th>
                  <th class="ts ts-b text-center">F. FIN</th>
                  <th class="ts ts-b" v-if="isCompact">DÍAS CLASE</th>
                  <th class="ts ts-b">HORARIO</th>
                  <th class="ts ts-b">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>DOCENTE</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Docente" :all-items="allScheduleItems" :value-extractor="(item) => item.instructor" v-model="columnFilters.instructor" @apply="applyColumnFilters" />
                    </div>
                  </th>

                  <!-- Seguimiento -->
                  <th class="ts ts-c text-center" style="min-width:120px;max-width:200px">FICHA / MEJORA</th>
                  <th class="ts ts-c text-center" style="min-width:100px;max-width:180px">CONFIRM.</th>

                  <!-- Referencia -->
                  <th class="ts ts-d">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>OBSERVACIÓN</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Observación" :all-items="allScheduleItems" :value-extractor="(item) => item.notes" v-model="columnFilters.notes" @apply="applyColumnFilters" />
                    </div>
                  </th>
                  <th class="ts ts-d">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>EDICIÓN</span>
                      <ColumnFilterDropdown v-if="!hasActiveFilters" column-label="Código Edición" :all-items="allScheduleItems" :value-extractor="(item) => `${item.global_code} ${item.specific_code}`" v-model="columnFilters.edition_code" @apply="applyColumnFilters" />
                    </div>
                  </th>
                </tr>
              </thead>

              <!-- ── TBODY: Vista Mensual ── -->
              <tbody v-if="!hasActiveFilters">
                <template v-for="(week, wIndex) in filteredSchedules" :key="week.schedule">
                  <tr v-if="week.items.length > 0" class="week-header-row" :class="{ 'is-collapsed': !week.isOpen }" @click="week.isOpen = !week.isOpen">
                    <td :colspan="isCompact ? 16 : 11" class="week-header-cell">
                      <div class="week-header-inner">
                        <svg class="week-chevron" :class="{ 'week-chevron-open': week.isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        <span class="week-label">Semana {{ week.schedule }}</span>
                        <span class="week-badge">{{ week.items.length }} Ediciones</span>
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-for="(e, eIndex) in week.items"
                    :key="e.edition_num_id"
                    v-show="week.isOpen"
                    class="tbody-row"
                    :class="[
                      e.cat_segment ? 'row-segment-' + e.cat_segment.toLowerCase() : '',
                      { 'row-pressing': longPressTimer && currentPressId === e.edition_num_id }
                    ]"
                    @contextmenu.prevent="handleFamilyFilter(e)"
                  >

                  <td class="td-act">
                    <div class="action-btns">
                      <button class="action-btn action-btn-view" @click.stop="openObjectivesModal(e)" title="Objetivos">
                        <i class="fa-solid fa-hamsa"></i>
                      </button>
                      <button class="action-btn action-btn-audit" @click.stop="openAuditHistory(e.edition_num_id)" title="Historial de cambios">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                      </button>
                      <button :class="['action-btn', (e.tree_detail.length == 0 && e.program_type != 'Curso') ? 'action-btn-neutral' : 'action-btn-tree']" @click.stop="openTreeModal(e)" title="Árbol">
                       <i class="fa-solid fa-book-bookmark"></i>
                      </button>
<button v-if="$hasRole(['ADMIN', 'PRODUCTO'])" class="action-btn" :class="e.program_type === 'Curso' ? 'action-btn-edit' : 'action-btn-hier'" @click.stop="openEditModal(e)" title="Editar">
                        <i v-if="e.program_type === 'Curso'"  class="fa-solid fa-file-pen"></i>
                        <i v-else class="fa-solid fa-sitemap"></i>
                      </button>
                    </div>
                  </td>

                    <!-- IDENTIFICACIÓN -->
                    <td class="td-a td-prog">
                      <div class="prog-name">
                        <span class="prog-link" style="cursor:pointer;" @click="filterDirectly({ program_version_id: e.program_version_id, program_version_label: e.program_abreviature })">
                          <span v-if="!isCompact">{{ e.program_abreviature || '—' }}</span>
                          <div v-if="isCompact" class="text-truncate" style="min-width:40px;max-width:160px;" :title="e.program_abreviature">{{ e.program_abreviature || '—' }}</div>
                        </span>
                      </div>
                      <div class="prog-sub text-muted small" v-if="!isCompact">
                        <span class="text-mono">{{ e.version_code }}</span>&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                        <span class="float-end">Seg: {{ e.cat_segment }} {{ e.cat_course_category_alias ? ('| ' + e.cat_course_category_label) : '' }}</span>
                      </div>
                    </td>

                    <td class="td-a" v-if="!isCompact" style="min-width:80px;max-width:120px;">
                      <div class="small text-muted">{{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}</div>
                      <div class="small text-muted">{{ (e.business_line_label || e.program_line_business) ? 'Línea: ' + (e.business_line_label || e.program_line_business) : '—' }}</div>
                    </td>

                    <td class="td-a" v-if="isCompact" style="min-width:120px;max-width:300px;">
                      {{ e.business_line_label || e.program_line_business }}&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                    </td>
                    <td class="td-a text-center" v-if="isCompact">
                      <span class="tipo-tag">{{ e.cat_course_category_label }}</span>
                    </td>
                    <td class="td-a text-center" v-if="isCompact">
                      <span class="seg-pill" :class="'seg-' + (e.cat_segment || '').toLowerCase()">{{ e.cat_segment }}</span>
                    </td>
                    <td class="td-a text-center text-mono small text-muted" v-if="isCompact">{{ e.calc_da }}</td>

                    <!-- CRONOGRAMA -->
                    <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeGapPreviewId === ('week_' + e.edition_num_id) ? 1060 : 'inherit' }">
                      <div class="date-link" title="Click derecho: proyección"
                        @click.stop="filterDirectly({ date_from: e.start_date, date_to: e.start_date, date_range: 'true' })"
                        @contextmenu.prevent.stop="toggleGapPreview($event, 'week_' + e.edition_num_id, e.program_version_id, e, true)"
                      >{{ formatDate(e.start_date) }}</div>
                      <div class="small text-muted" v-if="!isCompact">
                        {{ 'CA: ' + e.calc_da || 0 }}
                        <span class="float-end">{{ 'CP: ' + e.calc_dp || 0 }}</span>
                      </div>
                      <!-- GAP POPOVER -->
                      <div v-if="activeGapPreviewId === ('week_' + e.edition_num_id)" class="schedule-preview-popover shadow-lg" :class="{ 'popover-opens-top': popoverPosition === 'top' }" style="width:360px;left:0;">
                        <div class="popover-header-exec">
                          <span>Proyección: {{ e.program_abreviature }}</span>
                          <button type="button" class="btn-close-xs" @click="activeGapPreviewId = null">&times;</button>
                        </div>
                        <div class="popover-content">
                          <div v-if="isLoadingGap" class="text-center p-4 text-muted"><i class="fa-solid fa-spinner fa-spin"></i></div>
                          <div v-else-if="!gapPreviewData || gapPreviewData.length === 0" class="text-center text-muted p-3 small">Sin datos.</div>
                          <div v-else class="table-responsive" style="max-height:280px;overflow-y:auto;">
                            <table class="table table-borderless mb-0 align-middle w-100 clean-table">
                              <thead class="sticky-top"><tr><th class="text-center" style="width:40px;">#</th><th>FECHA</th><th class="text-end pe-3">ESTADO</th></tr></thead>
                              <tbody>
                                <tr v-for="(item, idx) in gapPreviewData" :key="idx" :class="item.type === 'current' ? 'row-highlight' : 'row-normal'">
                                  <td class="text-center fw-bold text-muted small">
                                    <div v-if="item.type === 'current'" class="text-primary"><i class="fa-solid fa-caret-right"></i></div>
                                    <div v-else>{{ idx + 1 }}</div>
                                  </td>
                                  <td>
                                    <div class="d-flex flex-column lh-sm py-1">
                                      <span class="fw-bold text-dark" style="font-size:0.85rem;">{{ formatDate(item.start_date_eff) + ' [' + item.global_code + ']' }}</span>
                                      <div class="d-flex justify-content-between">
                                        <span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.hoursLabel }}</span>
                                        <span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.daysLabel }}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td class="text-end pe-3">
                                    <div v-if="item.type === 'current'"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 rounded-pill">SELECCIÓN</span></div>
                                    <div v-else-if="item.gapInfo"><span class="badge rounded-pill px-3" :class="item.gapInfo.color.includes('danger') ? 'bg-danger-subtle text-danger border border-danger-subtle' : (item.gapInfo.color.includes('warning') ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle')">{{ item.gapInfo.label }}</span></div>
                                    <div v-else><span class="badge bg-success-subtle text-success border border-success-subtle px-3 rounded-pill">OK</span></div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div v-if="activeGapPreviewId === ('week_' + e.edition_num_id)" class="click-overlay" @click="activeGapPreviewId = null"></div>
                    </td>

                    <td class="td-b text-center text-mono small text-muted" v-if="isCompact">{{ e.calc_dp }}</td>

                    <td class="td-b text-center">
                      <div class="small text-mono">{{ formatDate(e.end_date) }}</div>
                    </td>

                    <td class="td-b small" v-if="isCompact">{{ !e.schedules ? '' : e.schedules[0].day_combination_label }}</td>

                    <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }">
                      <div v-if="!e.schedules || e.schedules.length === 0" class="text-muted small">—</div>
                      <div v-else-if="e.schedules.length === 1">
                        <div class="small fw-600 text-dark" v-if="!isCompact">{{ e.schedules[0]?.day_combination_label || '—' }}</div>
                        <div class="small text-muted">{{ e.schedules[0]?.hour_combination_label }}</div>
                      </div>
                      <div v-else class="schedule-dropdown-wrapper" v-if="!isCompact">
                        <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                          <div>
                            <div class="small fw-600 text-dark">{{ e.schedules[0].day_combination_label }}</div>
                            <div class="small text-muted text-truncate" style="max-width:90px;">{{ e.schedules[0].hour_combination_label }}</div>
                          </div>
                          <span class="pill pill-blue">+{{ e.schedules.length - 1 }}</span>
                        </div>
                        <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover shadow-sm">
                          <div class="popover-header-sm">Horarios ({{ e.schedules.length }})<button type="button" class="btn-close-xs" @click.stop="activeScheduleDropdown = null">&times;</button></div>
                          <div class="popover-body-sm">
                            <div v-for="(sch, sIdx) in e.schedules" :key="sIdx" class="schedule-item mb-2 pb-2 border-bottom border-light">
                              <div class="fw-bold text-primary small">{{ sch.day_combination_label }}</div>
                              <div class="text-muted small">{{ sch.hour_combination_label }}</div>
                            </div>
                          </div>
                        </div>
                        <div v-if="activeScheduleDropdown === e.edition_num_id" class="click-overlay" @click.stop="activeScheduleDropdown = null"></div>
                      </div>
                    </td>

                    <td class="td-b" style="min-width:100px;max-width:130px;">
                      <div class="small text-truncate" style="max-width:160px;" :title="e.instructor">{{ e.instructor || '—' }}</div>
                    </td>

                    <!-- SEGUIMIENTO -->
                    <td class="td-c text-center">
                      <label class="exec-switch scale-75" title="Ficha / Expediente">
                        <input type="checkbox" v-model="e.expedient" @change="updateQuickStatus(e, 'expedient')" :disabled="!$hasRole(['ADMIN', 'PRODUCTO'])" /><span></span>
                      </label>
                      <label class="exec-switch scale-75" title="Mejora / Upgrade">
                        <input type="checkbox" v-model="e.upgrade" @change="updateQuickStatus(e, 'upgrade')" /><span></span>
                      </label>
                    </td>
                    <td class="td-c text-center">
                      <label class="exec-switch scale-75" title="Pre-Confirmación">
                        <input type="checkbox" v-model="e.preconfirmation" @change="updateQuickStatus(e, 'preconfirmation')" /><span></span>
                      </label>
                      <label class="exec-switch scale-75" title="Confirmación">
                        <input type="checkbox" v-model="e.confirmation" @change="updateQuickStatus(e, 'confirmation')" /><span></span>
                      </label>
                    </td>

                    <!-- REFERENCIA -->
                    <td class="td-d">
<textarea
  v-if="!isCompact"
  class="exec-textarea"
  rows="2"
  v-model="e.notes"
  @focus="captureOriginalNote(e)"
  @blur="$hasRole(['ADMIN', 'PRODUCTO']) ? updateQuickNotes(e) : null"
  :readonly="!$hasRole(['ADMIN', 'PRODUCTO'])"
  placeholder="…"
></textarea>
                      <div class="small text-truncate" v-if="isCompact" style="max-width:160px;" :title="e.notes">{{ e.notes  }}</div>
                    </td>
                    <td class="td-d">
                      <div class="text-mono fw-600 small" v-if="!isCompact"><b v-if="e.global_code">{{ e.global_code }}</b></div>
                      <div class="text-muted small" v-if="!isCompact || (isCompact && e.program_type == 'Curso')">
                        <span v-if="!isCompact && e.specific_code">A: </span><b v-if="e.specific_code">{{ e.specific_code }}</b>
                      </div>
                      <div v-if="e.program_type_alias != 'we_program_type_course'" class="text-muted" style="font-size:0.7rem;">
                        <b v-if="e.clasification">{{ e.clasification }}</b>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>

              <!-- ── TBODY: Vista Histórica ── -->
              <tbody v-if="hasActiveFilters">
                <tr
                  v-for="(e, eIndex) in historyList"
                  :key="e.edition_num_id"
                  class="tbody-row"
                  :class="[e.cat_segment ? 'row-segment-' + e.cat_segment.toLowerCase() : '', { 'row-pressing': longPressTimer && currentPressId === e.edition_num_id }]"
                  @contextmenu.prevent="handleFamilyFilter(e)"
                >
                  <td class="td-act">
                    <div class="action-btns">
                      <button class="action-btn action-btn-view" @click.stop="openObjectivesModal(e)" title="Objetivos">
                        <i class="fa-solid fa-hamsa"></i>
                      </button>
                      <button class="action-btn action-btn-audit" @click.stop="openAuditHistory(e.edition_num_id)" title="Historial de cambios">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                      </button>
                      <button :class="['action-btn', (e.tree_detail.length == 0 && program_type != 'Curso') ? 'action-btn-neutral' : 'action-btn-tree']" @click.stop="openTreeModal(e)" title="Árbol">
                       <i class="fa-solid fa-book-bookmark"></i>
                      </button>
<button v-if="$hasRole(['ADMIN', 'PRODUCTO'])" class="action-btn" :class="e.program_type === 'Curso' ? 'action-btn-edit' : 'action-btn-hier'" @click.stop="openEditModal(e)" title="Editar">
                        <i v-if="e.program_type === 'Curso'"  class="fa-solid fa-file-pen"></i>
                        <i v-else class="fa-solid fa-sitemap"></i>
                      </button>
                    </div>

                  </td>

                  <td class="td-a td-prog">
                    <div class="prog-name">
                      <span v-if="!isCompact">{{ e.program_abreviature || '—' }}</span>
                      <div v-if="isCompact" class="text-truncate" style="min-width:40px;max-width:160px;" :title="e.program_abreviature">{{ e.program_abreviature || '—' }}</div>
                    </div>
                    <div class="prog-sub text-muted small" v-if="!isCompact">
                      <span class="text-mono">{{ e.version_code }}</span>&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                      <span class="float-end">Seg: {{ e.cat_segment }} {{ e.cat_course_category_alias ? ('| ' + e.cat_course_category_label) : '' }}</span>
                    </div>
                  </td>

                  <td class="td-a" v-if="!isCompact" style="min-width:80px;max-width:120px;">
                    <div class="small text-muted">{{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}</div>
                    <div class="small text-muted">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
                  </td>
                  <td class="td-a" v-if="isCompact" style="min-width:10px;max-width:300px;">{{ e.program_line_business }}&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b></td>
                  <td class="td-a text-center" v-if="isCompact"><span class="tipo-tag">{{ e.cat_course_category_label }}</span></td>
                  <td class="td-a text-center" v-if="isCompact"><span class="seg-pill" :class="'seg-' + (e.cat_segment || '').toLowerCase()">{{ e.cat_segment }}</span></td>
                  <td class="td-a text-center text-mono small text-muted" v-if="isCompact">{{ e.calc_da }}</td>

                  <td class="td-b">
                    <div class="date-link small">{{ formatDate(e.start_date) }}</div>
                    <div class="small text-muted" v-if="!isCompact">{{ 'CA: ' + e.calc_da || 0 }}<span class="float-end">{{ 'CP: ' + e.calc_dp || 0 }}</span></div>
                  </td>
                  <td class="td-b text-center text-mono small text-muted" v-if="isCompact">{{ e.calc_dp }}</td>
                  <td class="td-b text-center"><div class="small text-mono">{{ formatDate(e.end_date) }}</div></td>
                  <td class="td-b small" v-if="isCompact">{{ !e.schedules ? '' : e.schedules[0].day_combination_label }}</td>

                  <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }">
                    <div v-if="!e.schedules || e.schedules.length === 0" class="text-muted small">—</div>
                    <div v-else-if="e.schedules.length === 1">
                      <div class="small fw-600 text-dark" v-if="!isCompact">{{ e.schedules[0].day_combination_label || '—' }}</div>
                      <div class="small text-muted">{{ e.schedules[0].hour_combination_label }}</div>
                    </div>
                    <div v-else class="schedule-dropdown-wrapper" v-if="!isCompact">
                      <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                        <div>
                          <div class="small fw-600 text-dark">{{ e.schedules[0].day_combination_label }}</div>
                          <div class="small text-muted text-truncate" style="max-width:90px;">{{ e.schedules[0].hour_combination_label }}</div>
                        </div>
                        <span class="pill pill-blue">+{{ e.schedules.length - 1 }}</span>
                      </div>
                      <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover shadow-sm">
                        <div class="popover-header-sm">Horarios ({{ e.schedules.length }})<button type="button" class="btn-close-xs" @click.stop="activeScheduleDropdown = null">&times;</button></div>
                        <div class="popover-body-sm">
                          <div v-for="(sch, sIdx) in e.schedules" :key="sIdx" class="schedule-item mb-2 pb-2 border-bottom border-light">
                            <div class="fw-bold text-primary small">{{ sch.day_combination_label }}</div>
                            <div class="text-muted small">{{ sch.hour_combination_label }}</div>
                          </div>
                        </div>
                      </div>
                      <div v-if="activeScheduleDropdown === e.edition_num_id" class="click-overlay" @click.stop="activeScheduleDropdown = null"></div>
                    </div>
                  </td>

                  <td class="td-b" style="min-width:100px;max-width:130px;">
                    <div class="small text-truncate" style="max-width:160px;" :title="e.instructor">{{ e.instructor || '—' }}</div>
                  </td>

                  <td class="td-c text-center">
                    <label class="exec-switch scale-75" title="Ficha / Expediente"><input type="checkbox" v-model="e.expedient" @change="updateQuickStatus(e, 'expedient')" :disabled="!$hasRole(['ADMIN', 'PRODUCTO'])" /><span></span></label>
                    <label class="exec-switch scale-75" title="Mejora / Upgrade"><input type="checkbox" v-model="e.upgrade" @change="updateQuickStatus(e, 'upgrade')" /><span></span></label>
                  </td>
                  <td class="td-c text-center">
                    <label class="exec-switch scale-75" title="Pre-Confirmación"><input type="checkbox" v-model="e.preconfirmation" @change="updateQuickStatus(e, 'preconfirmation')" /><span></span></label>
                    <label class="exec-switch scale-75" title="Confirmación"><input type="checkbox" v-model="e.confirmation" @change="updateQuickStatus(e, 'confirmation')" /><span></span></label>
                  </td>

                  <td class="td-d">
<textarea
  v-if="!isCompact"
  class="exec-textarea"
  rows="2"
  v-model="e.notes"
  @focus="captureOriginalNote(e)"
  @blur="$hasRole(['ADMIN', 'PRODUCTO']) ? updateQuickNotes(e) : null"
  :readonly="!$hasRole(['ADMIN', 'PRODUCTO'])"
  placeholder="…"
></textarea>
                    <div class="small text-truncate" v-if="isCompact" style="max-width:160px;" :title="e.notes">{{ e.notes }}</div>
                  </td>
                  <td class="td-d">
                    <div class="text-mono fw-600 small" v-if="!isCompact"><b v-if="e.global_code">{{ e.global_code }}</b></div>
                    <div class="text-muted small" v-if="!isCompact || (isCompact && e.program_type == 'Curso')">
                      <b v-if="e.specific_code">{{ e.specific_code }}</b>
                    </div>
                    <div v-if="e.program_type_alias != 'we_program_type_course'" class="text-muted" style="font-size:0.7rem;">
                      <b v-if="e.clasification">{{ e.clasification }}</b>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
        </div>
      </div>
    </main>

    <!-- ══════════════ FOOTER ══════════════ -->
    <footer class="exec-footer">
      <span>Período: <strong>{{ months[selectedMonth - 1] }} {{ selectedYear }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Vista: <strong>{{ isCompact ? 'Compacta' : 'Normal' }}</strong></span>
      <span v-if="hasActiveFilters">
        <span class="footer-sep">·</span>
        <span style="color:var(--gold-400); font-weight:600;">Modo Histórico activo</span>
      </span>
      <span class="footer-spacer"></span>
      <span class="footer-status">
        <span class="status-dot dot-ok"></span>
        Datos sincronizados
      </span>
    </footer>

    <!-- ══════════════ MODALES ══════════════ -->

    <!-- Modal: Historial Global -->
    <BaseModal v-model="showHistoryModal" title="Historial Global de Cambios" size="xl">
      <div class="p-3 bg-light" style="min-height:400px;max-height:80vh;overflow-y:auto;">
        <div v-if="isLoadingHistory" class="text-center p-5 text-muted">
          <i class="fa-solid fa-spinner fa-spin fa-2x mb-2"></i>
          <p>Cargando historial…</p>
        </div>
        <div v-else-if="!globalHistoryList || globalHistoryList.length === 0" class="text-center p-5 text-muted">
          <i class="fa-solid fa-clock-rotate-left fa-2x mb-2 opacity-25"></i>
          <p>No se encontraron registros recientes.</p>
        </div>
        <div v-else class="d-flex flex-column gap-3">
          <div v-for="tx in globalHistoryList" :key="tx.transaction_id" class="card border shadow-sm">
            <div class="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <span class="fw-bold text-primary"><i class="fa-solid fa-user-circle me-1"></i>{{ tx.user_name || 'Sistema' }}</span>
                <span class="text-muted small ms-2">{{ formatDate(tx.created_at) }} <span class="text-xs">({{ new Date(tx.created_at).toLocaleTimeString() }})</span></span>
              </div>
              <span class="badge bg-light text-dark border">ID: {{ tx.transaction_id }}</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0 small">
                  <thead class="table-light text-muted">
                    <tr><th style="width:50px;" class="text-center">Tipo</th><th style="width:80px;">Acción</th><th style="width:250px;">Edición</th><th>Detalle de Cambios</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(change, idx) in tx.changes" :key="idx">
                      <td class="text-center align-middle"><span class="badge" :class="change.is_child ? 'bg-info-subtle text-info-emphasis' : 'bg-primary-subtle text-primary-emphasis'">{{ change.is_child ? 'Hijo' : 'Padre' }}</span></td>
                      <td class="align-middle"><span class="fw-bold" :class="change.action === 'UPDATE' ? 'text-warning' : 'text-success'">{{ change.action }}</span></td>
                      <td class="align-middle text-muted">{{ change.abbreviation + ' (' + change.global_code + ')' }}</td>
                      <td class="align-middle">
                        <div v-if="change.action === 'INSERT'" class="text-muted fst-italic">Registro creado</div>
                        <div v-else class="d-flex flex-column gap-1">
                          <div v-for="(diff, field) in change.changed_fields" :key="field" class="d-flex align-items-center gap-2 border-bottom border-light pb-1">
                            <span class="fw-bold text-dark" style="min-width:100px;">{{ field }}:</span>
                            <span class="text-danger text-decoration-line-through bg-danger-subtle px-1 rounded">{{ diff.old === null ? 'null' : diff.old }}</span>
                            <i class="fa-solid fa-arrow-right text-muted" style="font-size:0.7rem;"></i>
                            <span class="text-success bg-success-subtle px-1 rounded fw-bold">{{ diff.new === null ? 'null' : diff.new }}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary btn-sm" @click="showHistoryModal = false">Cerrar</button>
      </template>
    </BaseModal>

    <!-- Modal: Resumen / Meta -->
    <BaseModal v-model="showMetaModal" title="Resumen de Programación" size="xl">
      <div class="meta-dashboard p-3">
        <div class="card border-0 shadow-sm mb-4 overflow-hidden" v-if="!hasActiveFilters">
          <div class="card-body p-0">
            <div class="row g-0">
              <div class="col-md-4 bg-primary text-white p-4 d-flex flex-column justify-content-center align-items-center text-center position-relative">
                <i class="fa-solid fa-chart-line position-absolute start-0 bottom-0 opacity-25" style="font-size:8rem;transform:translate(-20%,20%);"></i>
                <h6 class="text-uppercase opacity-75 mb-2 letter-spacing-1">Avance Global</h6>
                <div class="display-3 fw-bold mb-0">{{ metaSummary.general.percentage }}<small class="fs-4">%</small></div>
                <div class="progress w-100 bg-white bg-opacity-25 mt-3" style="height:8px;"><div class="progress-bar bg-white" role="progressbar" :style="{ width: metaSummary.general.percentage + '%' }"></div></div>
              </div>
              <div class="col-md-8 p-4 d-flex align-items-center bg-white">
                <div class="row w-100 text-center g-3">
                  <div class="col-4 border-end">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Ventas (B2C)</div>
                    <div class="fs-2 fw-bold text-dark">{{ metaSummary.general.sales }}</div>
                    <div class="small text-success"><i class="fa-solid fa-user-check me-1"></i>Inscritos</div>
                  </div>
                  <div class="col-4 border-end">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Corporativo (B2B)</div>
                    <div class="fs-2 fw-bold text-dark">{{ metaSummary.general.b2b }}</div>
                    <div class="small text-info"><i class="fa-solid fa-building me-1"></i>Empresas</div>
                  </div>
                  <div class="col-4">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Objetivo Total</div>
                    <div class="fs-2 fw-bold text-secondary">{{ metaSummary.general.target }}</div>
                    <div class="small text-muted"><i class="fa-solid fa-bullseye me-1"></i>Vacantes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-4 mb-4">
          <div class="col-lg-8">
            <div class="meta-card h-100">
              <div class="meta-card__header"><i class="fa-solid fa-layer-group text-primary me-2"></i>Líneas de Negocio</div>
              <div class="meta-card__body">
                <div class="lines-grid">
                  <div v-for="(line, idx) in metaSummary.lines" :key="idx" class="line-item" :class="{ 'is-zero': line.count === 0 }">
                    <div class="line-item__name">{{ line.name }}</div>
                    <div class="line-item__count">{{ line.count }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="meta-card h-100">
              <div class="meta-card__header"><i class="fa-solid fa-chart-pie text-success me-2"></i>Categorías</div>
              <div class="meta-card__body">
                <div class="d-flex flex-column gap-3">
                  <div v-for="(cat, idx) in metaSummary.categories.filter(c => c.name !== 'Total' && c.name != 'Minicurso')" :key="idx">
                    <div class="d-flex justify-content-between mb-1 small fw-bold"><span>{{ cat.name }}</span><span>{{ cat.count }}</span></div>
                    <div class="progress" style="height:6px;"><div class="progress-bar bg-info" role="progressbar" :style="{ width: (cat.count / (metaSummary.categories.find(c => c.name === 'Total')?.count || 1) * 100) + '%' }"></div></div>
                  </div>
                  <div class="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span class="text-muted small text-uppercase fw-bold">Total Programado</span>
                    <span class="badge bg-dark fs-6">{{ metaSummary.categories.find(c => c.name === 'Total')?.count || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-4">
          <div class="col-md-6">
            <div class="meta-card h-100">
              <div class="meta-card__header"><i class="fa-solid fa-tags text-warning me-2"></i>Clasificación por Tipo</div>
              <div class="meta-card__body p-0">
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 align-middle">
                    <thead class="table-light"><tr><th class="px-3">Código</th><th>Descripción</th><th class="text-center px-3">Cant.</th></tr></thead>
                    <tbody>
                      <tr v-for="(type, idx) in metaSummary.types" :key="idx">
                        <td class="px-3"><span class="badge rounded-pill bg-light text-dark border border-secondary fw-bold">{{ type.code }}</span></td>
                        <td><small class="text-muted lh-1 d-block">{{ type.description }}</small></td>
                        <td class="text-center fw-bold text-primary px-3">{{ type.count }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="meta-card h-100">
              <div class="meta-card__header"><i class="fa-solid fa-list-ol text-danger me-2"></i>Segmentación Operativa</div>
              <div class="meta-card__body p-0">
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 align-middle">
                    <thead class="table-light"><tr><th class="px-3">Seg.</th><th>Acción Requerida</th><th class="text-center px-3">Cant.</th></tr></thead>
                    <tbody>
                      <tr :class="'row-segment-' + seg.code.toLowerCase()" v-for="(seg, idx) in metaSummary.segments" :key="idx">
                        <td class="px-3"><div class="segment-circle">{{ seg.code }}</div></td>
                        <td><small class="text-muted lh-1 d-block">{{ seg.description.replace('*', '') }}</small></td>
                        <td class="text-center fw-bold text-dark px-3">{{ seg.count }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: Filtros -->
    <BaseModal v-model="showFilterModal" title="Filtrar Cronograma" size="lg">
      <div class="p-3 row">
        <div class="row g-2 mb-3">
          <label class="form-label small fw-bold">Rango Fecha inicio</label>
          <BaseDatePicker v-model="filterForm.range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango (Desde a Hasta)" @on-change="handleRangeFilterChange" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Buscar Programa</label>
          <SearchSelect v-model="filterForm.program_version_id" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" label-field="program_type_for_iu" value-field="program_version_id" sublabel-field="version_code" placeholder="Buscar programa…" :cache="false" :view-open="6" :model-label="filterForm.program_version_label" @change="(opt) => filterForm.program_version_label = opt ? opt.program_type_for_iu : ''" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Docente</label>
          <MultiSelect v-model="filterForm.instructores_seleccionados" mode="remote" :fetcher="(q) => instructorService.instructorCaller({ q })" :debounce-ms="400" labelKey="full_name" valueKey="instructor_id" placeholder="Buscar docentes…" modalTitle="Seleccionar Docentes" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Línea de Negocio</label>
          <MultiSelect v-model="filterForm.category_ids" :items="catalogs.catLines" label-key="description" value-key="id" placeholder="LINEAS…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Línea de Negocio (Segmento)</label>
          <MultiSelect v-model="filterForm.business_line_ids" :items="catalogs.businessLineList" label-key="description" value-key="id" placeholder="EN VIVO, ONLINE, B2B…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Categoría</label>
          <MultiSelect v-model="filterForm.type_program_ids" :items="catalogs.catCategories" label-key="description" value-key="id" placeholder="CATEGORIAS…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Seguimiento Edición</label>
          <MultiSelect v-model="filterForm.course_category_ids" :items="catalogs.catTypes" label-key="description" value-key="id" placeholder="S. EDICIONES…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Segmento</label>
          <MultiSelect v-model="filterForm.segment_ids" :items="catalogs.catSegments" label-key="description" value-key="id" placeholder="SEGMENTOS…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Días</label>
          <MultiSelect v-model="filterForm.combination_days_ids" :items="catalogs.dayCombinationList" label-key="description" value-key="id" placeholder="DIAS…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Horas</label>
          <MultiSelect v-model="filterForm.hour_combination_ids" :items="catalogs.hourCombinationList" label-key="description" value-key="id" placeholder="HORARIOS…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Modalidad</label>
          <MultiSelect v-model="filterForm.model_modality_ids" :items="catalogs.modalityList" label-key="description" value-key="id" placeholder="MODALIDADES…" />
        </div>
        <div class="mb-3 col-6">
          <label class="form-label small fw-bold">Clasificación</label>
          <input type="text" class="form-control form-control-sm" v-model="filterForm.clasification" placeholder="UNQ" />
        </div>
      </div>
      <template #footer>
        <div class="d-flex justify-content-end w-100 gap-2">
          <button class="btn btn-outline-secondary btn-sm" @click="showFilterModal = false">Cancelar</button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">Aplicar Filtros</button>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Formulario Edición -->
    <BaseModal v-model="showFormModal" :title="currentEdition ? 'Administrar Edición' : 'Nueva Edición'" size="xl">
      <div class="modern-modal-layout">
        <div class="main-column">
          <div class="internal-header mb-3" v-if="currentEdition">
            <div class="d-flex align-items-center gap-2">
              <div class="badge-type" :class="isCourse ? 'bg-warning-subtle text-warning-emphasis' : 'bg-info-subtle text-info-emphasis'">{{ isCourse ? 'CURSO' : 'PROGRAMA' }}</div>
              <h5 class="m-0 fw-bold text-dark">{{ currentEdition.program_abreviature }}</h5>
              <div class="badge-type bg-primary-subtle text-primary-emphasis">{{ 'Sesiones: ' + modalForm.sessions }}</div>
            </div>
            <div class="text-muted small mt-1 ms-1">{{ currentEdition.global_code }} &bull; {{ currentEdition.specific_code || 'Sin Código Anual' }} &bull; {{ currentEdition.clasification || '' }}</div>
          </div>

          <section class="form-section">
            <div class="section-label">Definición General</div>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-sm">Versión de Programa</label>
                <SearchSelect v-model="modalForm.program_version_id" mode="remote" :disabled="!!(currentEdition && currentEdition.edition_num_id)" :fetcher="q => programService.programVersionCaller({ q, active:'Y', not_modality: catalogs.modalityList.find(e => e.alias == 'we_modality_online').id })" label-field="program_type_for_iu" value-field="program_version_id" placeholder="Buscar programa…" :minChars="0" :cache="false" required :view-open="6" :model-label="modalForm.abbreviation" @change="onProgramVersionChange" />
              </div>
              <div class="col-6" v-if="isCourse">
                <label class="form-label-sm">Docente Asignado</label>
                <SearchSelect v-model="modalForm.instructor_id" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" showSubValue label-field="full_name" sublabel-field="document_number" value-field="instructor_id" placeholder="Buscar docente…" :model-label="modalForm.instructor_label" :minChars="0" :cache="false" />
              </div>
              <div class="col-3">
                <label class="form-label-sm">Segmentación</label>
                <SearchSelect v-model="modalForm.cat_segment_id" :items="catalogs.catSegments" label-field="description" value-field="id" placeholder="OPCIONAL" />
              </div>
              <div class="col-3" v-if="modalForm.program_version_id">
                <label class="form-label-sm">Vacantes</label>
                <input type="number" class="form-control form-control-sm" v-model.number="modalForm.vacant" placeholder="VACANTES" />
              </div>
            </div>
          </section>

          <section class="form-section mt-3" v-if="modalForm.program_version_id && (modalForm.cat_type_program_alias === 'we_program_type_course' || modalForm.cat_type_program_alias === 'we_program_type_event')">
            <div class="section-label">Logística y Horarios</div>
            <div class="row g-3">
              <div class="col-md-6 position-relative">
                <label class="form-label-sm">Fecha Inicio</label>
                <div class="input-group input-group-sm">
                  <BaseDatePicker v-model="modalForm.start_date" :config="getChildDateConfig()" :disabled="!modalForm.cat_day_combination_id" :required="isCourse" placeholder="dd/mm/aaaa" @on-change="validateAndCalculate(modalForm, 'start_date')" />
                  <button class="btn btn-outline-secondary" type="button" @click.stop="toggleGapPreview($event, 'main_gap', modalForm.program_version_id, modalForm)" :disabled="!modalForm.start_date || !modalForm.program_version_id">
                    <i class="fa-solid fa-timeline text-primary"></i>
                  </button>
                </div>
                <div v-if="activeGapPreviewId === 'main_gap'" class="schedule-preview-popover shadow-lg" :class="{ 'popover-opens-top': popoverPosition === 'top' }" style="width:350px;">
                  <div class="popover-header-exec"><span>Análisis de Tiempos</span><button type="button" class="btn-close-xs" @click="activeGapPreviewId = null">&times;</button></div>
                  <div class="popover-content">
                    <div v-if="isLoadingGap" class="text-center p-4 text-muted"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    <div v-else-if="!gapPreviewData || gapPreviewData.length === 0" class="text-center text-muted p-3 small">Sin datos.</div>
                    <div v-else class="table-responsive" style="max-height:280px;overflow-y:auto;">
                      <table class="table table-borderless mb-0 align-middle w-100 clean-table">
                        <thead class="sticky-top"><tr><th class="text-center" style="width:40px;">#</th><th>FECHA</th><th class="text-end pe-3">ESTADO</th></tr></thead>
                        <tbody>
                          <tr v-for="(item, idx) in gapPreviewData" :key="idx" :class="item.type === 'current' ? 'row-highlight' : 'row-normal'">
                            <td class="text-center fw-bold text-muted small"><div v-if="item.type === 'current'" class="text-primary"><i class="fa-solid fa-caret-right"></i></div><div v-else>{{ idx + 1 }}</div></td>
                            <td><div class="d-flex flex-column lh-sm py-1"><span class="fw-bold text-dark" style="font-size:0.85rem;">{{ formatDate(item.start_date_eff) + ' [' + item.global_code + ']' }}</span><div class="d-flex justify-content-between"><span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.hoursLabel }}</span><span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.daysLabel }}</span></div></div></td>
                            <td class="text-end pe-3">
                              <div v-if="item.type === 'current'"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 rounded-pill">SELECCIÓN</span></div>
                              <div v-else-if="item.gapInfo"><span class="badge rounded-pill px-3" :class="item.gapInfo.color.includes('danger') ? 'bg-danger-subtle text-danger border border-danger-subtle' : (item.gapInfo.color.includes('warning') ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle')">{{ item.gapInfo.label }}</span></div>
                              <div v-else><span class="badge bg-success-subtle text-success border border-success-subtle px-3 rounded-pill">OK</span></div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div v-if="activeGapPreviewId === 'gap_popover'" class="click-overlay" @click="activeGapPreviewId = null"></div>
              </div>
              <div class="col-md-6 position-relative">
                <label class="form-label-sm">Fecha Fin</label>
                <div class="input-group input-group-sm">
                  <BaseDatePicker v-model="modalForm.end_date" :disabled="!modalForm.cat_day_combination_id" :config="getChildDateConfig(null, modalForm)" :required="isCourse" placeholder="Calculado autom." />
                  <button class="btn btn-outline-secondary" type="button" @click.stop="toggleSchedulePreview('main_parent', modalForm, $event)">
                    <i class="fa-solid fa-circle-info text-info"></i>
                  </button>
                </div>
                <div v-if="activePreviewId === 'main_parent'" class="schedule-preview-popover shadow-lg" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                  <div class="popover-header-exec"><span>Proyección de Sesiones</span><button type="button" class="btn-close-xs" @click="activePreviewId = null">&times;</button></div>
                  <div class="popover-content">
                    <div v-if="previewItems.length === 0" class="text-muted text-center p-2 small">Faltan datos para calcular.</div>
                    <table v-else class="table table-sm table-striped mb-0 small-table">
                      <thead><tr><th>#</th><th>Fecha</th><th>Estado</th></tr></thead>
                      <tbody>
                        <tr v-for="(item, idx) in previewItems" :key="idx" :class="{'table-danger': item.status === 'holiday'}">
                          <td class="fw-bold text-center">{{ item.sessionNum }}</td>
                          <td><div class="d-flex flex-column lh-1"><span>{{ formatDate(item.date) }}</span><small class="text-muted" style="font-size:0.65rem">{{ getDayName(item.date) }}</small></div></td>
                          <td><span v-if="item.status === 'valid'" class="badge bg-success-subtle text-success border border-success-subtle">OK</span><div v-else class="text-danger fw-bold" style="font-size:0.7rem;"><i class="fa-solid fa-ban me-1"></i>{{ item.desc }}</div></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-if="activePreviewId === 'main_parent'" class="click-overlay" @click="activePreviewId = null"></div>
              </div>
              <div class="col-md-6">
                <label class="form-label-sm">Días</label>
                <SearchSelect v-model="modalForm.cat_day_combination_id" :items="catalogs.dayCombinationList" label-field="description" value-field="id" placeholder="Seleccione días" :required="isCourse" @change="calculateEndDate(modalForm)" />
              </div>
              <div class="col-md-6">
                <label class="form-label-sm">Horas</label>
                <SearchSelect v-model="modalForm.cat_hour_combination_id" :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Seleccione horario" :required="isCourse" />
              </div>
            </div>
          </section>

          <section class="form-section mt-3" v-if="modalForm.program_version_id && modalForm.cat_type_program_alias !== 'we_program_type_course' && modalForm.cat_type_program_alias !== 'we_program_type_event'">
            <div class="section-label">Estructura del Programa</div>
            <div class="hierarchy-container">
              <table class="table table-sm table-hover align-middle mb-0" style="font-size:0.8rem;">
                <thead class="table-light">
                  <tr><th style="width:20%">Sub-Programa</th><th style="width:20%">Edición</th><th style="width:25%">Fechas</th><th style="width:20%">Horario / Docente</th><th style="width:15%">Config.</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(child, index) in modalForm.program_version_children" :key="child.child_program_version_id" :class="{ 'opacity-50': isBlockedByPrevious(index) }">
                    <td class="fw-bold text-dark">
                      <i class="fa-solid fa-filter text-muted ms-1" style="font-size:0.65rem;"></i>&nbsp;
                      <span class="text-primary text-decoration-hover" style="cursor:pointer" @click="filterDirectly({ program_version_id: child.child_program_version_id, program_version_label: child.abbreviation })">{{ child.abbreviation }}</span>
                      <div class="text-xs text-muted" v-if="!child.edition_id">{{ 'Sesiones: ' + child.sessions }}</div>
                    </td>
                    <td>
                      <div v-if="!child.edition_id" class="d-flex align-items-center gap-2 mb-2">
                        <small class="text-muted">¿Nueva?</small>
                        <label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" type="checkbox" v-model="child.new" /><span></span></label>
                      </div>
                      <SearchSelect v-if="!child.new && !child.edition_id" v-model="child.edition_id" mode="remote" :fetcher="(q) => searchEditionsFiltered(q, child, index)" label-field="label_for_iu" sublabel-field="specific_code" value-field="edition_num_id" placeholder="Vincular edición…" :minChars="0" :cache="false" required @change="onChildEditionChange($event, child, index)" :disabled="child.new" />
                      <button :disabled="isBlockedByPrevious(index)" v-if="!child.new && child.edition_id" type="button" class="btn btn-sm btn-danger w-100 mb-0" @click="unlinkChildEdition(child)"><i class="fa-solid fa-times"></i> Desvincular</button>
                      <div v-if="child.edition_id" class="p-1 bg-light border rounded text-center mb-0">
                        <div class="fw-bold">{{ child.global_code }}</div>
                        <div class="text-xs text-muted">{{ child.specific_code }}</div>
                        <div class="text-xs text-muted">{{ 'Sesiones: ' + child.sessions }}</div>
                      </div>
                    </td>
                    <td class="overflow-visible position-relative" style="min-width:180px!important" :style="{ zIndex: activeGapPreviewId === ('child_gap_' + index) ? 1060 : 'inherit' }">
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <div class="input-group input-group-xs mb-1">
                          <BaseDatePicker v-model="child.start_date" :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id" :required="true" placeholder="Inicio" :config="getChildDateConfig(index)" @on-change="validateAndCalculate(child, 'start_date', index)" />
                          <button class="btn btn-outline-secondary px-1" type="button" :disabled="!child.start_date || isBlockedByPrevious(index)" @click.stop="toggleGapPreview($event, 'child_gap_' + index, child.child_program_version_id, child)"><i class="fa-solid fa-timeline text-primary" style="font-size:0.8rem;"></i></button>
                        </div>
                        <div v-if="activeGapPreviewId === ('child_gap_' + index)" class="schedule-preview-popover shadow-lg" :class="{ 'popover-opens-top': popoverPosition === 'top' }" style="width:350px;left:0;z-index:1060;">
                          <div class="popover-header-exec"><span>Análisis: {{ child.abbreviation }}</span><button type="button" class="btn-close-xs" @click="activeGapPreviewId = null">&times;</button></div>
                          <div class="popover-content">
                            <div v-if="isLoadingGap" class="text-center p-4 text-muted"><i class="fa-solid fa-spinner fa-spin"></i></div>
                            <div v-else-if="!gapPreviewData || gapPreviewData.length === 0" class="text-center text-muted p-3 small">Sin datos.</div>
                            <div v-else class="table-responsive" style="max-height:280px;overflow-y:auto;">
                              <table class="table table-borderless mb-0 align-middle w-100 clean-table">
                                <thead class="sticky-top"><tr><th class="text-center" style="width:40px;">#</th><th>FECHA</th><th class="text-end pe-3">ESTADO</th></tr></thead>
                                <tbody>
                                  <tr v-for="(item, idx) in gapPreviewData" :key="idx" :class="item.type === 'current' ? 'row-highlight' : 'row-normal'">
                                    <td class="text-center fw-bold text-muted small"><div v-if="item.type === 'current'" class="text-primary"><i class="fa-solid fa-caret-right"></i></div><div v-else>{{ idx + 1 }}</div></td>
                                    <td><div class="d-flex flex-column lh-sm py-1"><span class="fw-bold text-dark" style="font-size:0.85rem;">{{ formatDate(item.start_date_eff) + ' [' + item.global_code + ']' }}</span><div class="d-flex justify-content-between"><span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.hoursLabel }}</span><span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.daysLabel }}</span></div></div></td>
                                    <td class="text-end pe-3">
                                      <div v-if="item.type === 'current'"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 rounded-pill">SELECCIÓN</span></div>
                                      <div v-else-if="item.gapInfo"><span class="badge rounded-pill px-3" :class="item.gapInfo.color.includes('danger') ? 'bg-danger-subtle text-danger border border-danger-subtle' : (item.gapInfo.color.includes('warning') ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle')">{{ item.gapInfo.label }}</span></div>
                                      <div v-else><span class="badge bg-success-subtle text-success border border-success-subtle px-3 rounded-pill">OK</span></div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                        <div class="position-relative">
                          <div class="input-group input-group-xs">
                            <BaseDatePicker v-model="child.end_date" :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id" :required="true" :config="getChildDateConfig(null, child)" placeholder="Fin (Calc)" />
                            <button class="btn btn-outline-secondary px-1" type="button" :disabled="isBlockedByPrevious(index)" @click.stop="toggleSchedulePreview('child_' + child.child_program_version_id, child, $event)"><i class="fa-solid fa-circle-info text-info" style="font-size:0.8rem;"></i></button>
                          </div>
                          <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="schedule-preview-popover shadow-lg" style="right:0;left:auto;min-width:250px;z-index:1070!important;" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                            <div class="popover-header-exec"><span>Cronograma Estimado</span><button type="button" class="btn-close-xs" @click="activePreviewId = null">&times;</button></div>
                            <div class="popover-content">
                              <div v-if="previewItems.length === 0" class="text-muted text-center p-2 small">Datos insuficientes.</div>
                              <table v-else class="table table-sm table-striped mb-0 small-table">
                                <thead><tr><th>#</th><th>Fecha</th><th>Obs.</th></tr></thead>
                                <tbody>
                                  <tr v-for="(item, idx) in previewItems" :key="idx" :class="{'table-danger': item.status === 'holiday'}">
                                    <td class="fw-bold text-center small">{{ item.sessionNum }}</td>
                                    <td>{{ formatDate(item.date) }} <span class="text-muted text-xs">({{ getDayName(item.date) }})</span></td>
                                    <td><i v-if="item.status === 'valid'" class="fa-solid fa-check text-success"></i><span v-else class="text-danger fw-bold text-xs">{{ item.desc }}</span></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="click-overlay" @click="activePreviewId = null"></div>
                        </div>
                      </div>
                      <div v-else class="text-muted text-center">-</div>
                      <div v-if="activeGapPreviewId === ('child_gap_' + index)" class="click-overlay" @click="activeGapPreviewId = null"></div>
                    </td>
                    <td>
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <SearchSelect v-model="child.cat_day_combination_id" :items="catalogs.dayCombinationList" label-field="description" value-field="id" placeholder="Días" required :disabled="isBlockedByPrevious(index)" class="mb-1" @change="calculateEndDate(child); setChildren(modalForm.program_version_children, 'cat_day_combination_id', child.cat_day_combination_id)" />
                        <SearchSelect v-model="child.cat_hour_combination_id" required :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Horas" class="mb-1" :disabled="isBlockedByPrevious(index)" @change="setChildren(modalForm.program_version_children, 'cat_hour_combination_id', child.cat_hour_combination_id)" />
                        <SearchSelect :disabled="isBlockedByPrevious(index)" v-if="child.new || child.edition_id" v-model="child.instructor_id" :cache="false" sublabel-field="document_number" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" label-field="full_name" value-field="instructor_id" placeholder="Docente" :model-label="child.instructor_label" />
                      </div>
                      <div v-else class="text-muted text-center">-</div>
                    </td>
                    <td>
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input type="checkbox" v-model="child.active" /><span></span></label><small class="text-muted">Activo</small></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.preconfirmation && child.expedient){child.confirmation=true}else{child.confirmation=false} }" type="checkbox" v-model="child.preconfirmation" /><span></span></label><small class="text-muted">PRE-cfm</small></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.preconfirmation && child.expedient){child.confirmation=true}else{child.confirmation=false} }" type="checkbox" v-model="child.expedient" /><span></span></label><small class="text-muted">Ficha</small></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.confirmation){child.preconfirmation=true;child.expedient=true}else{child.preconfirmation=false;child.expedient=false} }" type="checkbox" v-model="child.confirmation" /><span></span></label><small class="text-muted">Cfm</small></div>
                      </div>
                      <div v-else class="text-muted text-center">-</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="sidebar-column">
          <div class="status-card mb-3">
            <div class="status-card__header"><i class="fa-solid fa-sliders me-2"></i>Configuración</div>
            <div class="status-card__body">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="fw-bold">Ficha</span><small class="d-block text-muted">Generar expediente</small></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.expedient" /><span></span></label>
              </div>
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="fw-bold">Pre-Confirmación</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.preconfirmation" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="my-2 border-secondary-subtle">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="fw-bold text-primary">Confirmación</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.confirmation" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="my-2 border-secondary-subtle">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="fw-bold">Mejora</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.upgrade" /><span></span></label>
              </div>
              <div class="switch-row">
                <div class="switch-label"><span class="fw-bold">Estado (Activo)</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.active" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="my-2 border-secondary-subtle">
              <div class="col-12 mb-2">
                <label class="form-label-sm">Histórico</label>
                <input type="text" class="form-control form-control-sm" v-model.number="modalForm.global_code" />
              </div>
              <div class="col-12">
                <label class="form-label-sm">Ed. Año</label>
                <input type="text" class="form-control form-control-sm" v-model.number="modalForm.specific_code" />
              </div>
            </div>
          </div>
          <div class="status-card">
            <div class="status-card__header"><i class="fa-regular fa-comment-dots me-2"></i>Observaciones</div>
            <div class="status-card__body p-0">
              <textarea class="form-control border-0 bg-transparent" rows="6" v-model="modalForm.notes" placeholder="Notas internas…" style="resize:vertical;min-height:150px;max-height:none;font-size:0.85rem;"></textarea>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="d-flex justify-content-between w-100 align-items-center">
          <div class="text-muted small fst-italic"><span v-if="currentEdition">Editando ID: {{ currentEdition.edition_num_id }}</span></div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm px-3" @click="cleanFormModal(); showFormModal = false">Cancelar</button>
            <button class="btn btn-primary btn-sm px-4 fw-bold" :disabled="!isModalValid" @click="applyModalForm"><i class="fa-solid fa-save me-1"></i>Guardar Cambios</button>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Árbol Académico -->
    <BaseModal v-model="showTreeModal" :title="treeModalTitle" size="lg">
      <div class="accordion-container p-3 bg-light rounded-3">
        <div v-if="!treeGroups.length" class="empty-state p-5 text-center">
          <div class="mb-3"><i class="fa-solid fa-sitemap fs-1 text-muted opacity-25"></i></div>
          <h6 class="text-secondary">Sin estructura jerárquica</h6>
          <p class="text-muted small">Esta edición no tiene programas padres ni cursos hijos asociados.</p>
        </div>
        <div v-else class="d-flex flex-column gap-3">
          <div v-for="(group, idx) in treeGroups" :key="idx" class="accordion-card bg-white border rounded shadow-sm overflow-hidden">
            <div class="accordion-header p-3 d-flex align-items-center justify-content-between cursor-pointer" :class="{ 'bg-primary-subtle': group.isOpen }" @click="toggleGroup(idx)">
              <div class="d-flex align-items-center gap-3" :class="{ 'opacity-75': group.active === 'N' }">
                <div class="icon-box border rounded p-2 position-relative" :class="group.active === 'N' ? 'bg-danger-subtle text-danger border-danger-subtle' : 'bg-white text-primary border-primary-subtle'">
                  <i class="fa-solid" :class="group.active === 'N' ? 'fa-ban' : 'fa-layer-group'"></i>
                </div>
                <div>
                  <div class="badge mb-1" :class="group.active === 'N' ? 'bg-danger text-white' : 'bg-primary text-white'" style="font-size:0.65rem;">{{ group.active === 'N' ? 'PROGRAMA INACTIVO' : 'PROGRAMA PADRE' }}</div>
                  <h6 class="m-0 fw-bold" :class="group.active === 'N' ? 'text-danger text-decoration-line-through' : 'text-dark'">{{ group.abbreviation }}</h6>
                  <div class="small text-muted">{{ group.global_code }} &bull; <span v-if="group.clasification" class="badge-btn" style="cursor:pointer;" @click="filterDirectly({ clasification: group.clasification })">{{ group.clasification }}<i class="fa-solid fa-filter text-muted ms-1" style="font-size:0.65rem;"></i></span></div>
                </div>
              </div>
              <button class="btn btn-sm btn-icon text-muted"><i class="fa-solid fa-chevron-down transition-transform" :class="{ 'rotate-180': group.isOpen }"></i></button>
            </div>
            <div v-show="group.isOpen" class="accordion-body border-top p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0" style="font-size:0.85rem;">
                  <thead class="table-light text-muted text-uppercase" style="font-size:0.7rem;">
                    <tr><th class="ps-4 py-2">Curso / Módulo</th><th class="py-2">Fechas</th><th class="py-2">Horario</th><th class="py-2 text-end pe-4">Estado</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="child in group.children" :key="child.edition_num_id || child.global_code" :class="{ 'table-active': child.is_current }">
                      <td class="ps-4">
                        <div class="d-flex align-items-center gap-2">
                          <i class="fa-solid fa-book-open text-muted small"></i>
                          <div>
                            <div class="fw-bold text-dark">
                              <span class="text-decoration-hover text-primary cursor-pointer" @click.stop="filterDirectly({ program_version_id: child.program_version_id, program_version_label: child.abbreviation })">{{ child.program_abreviature || child.abbreviation }}</span>
                              <i class="fa-solid fa-filter text-muted ms-1" style="font-size:0.65rem;"></i>
                              <span v-if="child.is_current" class="badge bg-warning text-dark ms-1" style="font-size:0.6rem">ACTUAL</span>
                            </div>
                            <div class="text-muted small" style="font-size:0.7rem;">{{ child.global_code }} &bull; {{ child.specific_code }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div v-if="child.start_date">
                          <span class="text-decoration-hover text-primary cursor-pointer" @click.stop="filterDirectly({ date_from: child.start_date, date_to: child.start_date, date_range: 'true' })">{{ formatDate(child.start_date) }}</span>
                          <i class="fa-solid fa-filter text-muted ms-1" style="font-size:0.65rem;"></i>
                          <br><span class="text-muted text-xs">al {{ formatDate(child.end_date) }}</span>
                        </div>
                        <span v-else class="text-muted">-</span>
                      </td>
                      <td>
                        <div v-if="child.schedules && child.schedules.length"><div class="fw-medium">{{ child.schedules[0].day_combination_label }}</div><div class="text-muted text-xs">{{ child.schedules[0].hour_combination_label }}</div><div v-if="child.schedules.length > 1" class="badge bg-light text-secondary border mt-1">+{{ child.schedules.length - 1 }} más</div></div>
                        <div v-else-if="child.day_combination_label"><div class="fw-medium">{{ child.day_combination_label }}</div><div class="text-muted text-xs">{{ child.hour_combination_label }}</div></div>
                        <span v-else class="text-muted">-</span>
                      </td>
                      <td class="text-end pe-4"><span class="badge border" :class="child.active === 'Y' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-secondary-subtle text-secondary border-secondary-subtle'">{{ child.active === 'Y' ? 'Activo' : 'Inactivo' }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: Tablero de Objetivos -->
    <BaseModal v-model="showGoalsModal" title="Tablero de Control" size="xl">
      <div class="dashboard-layout p-3">
        <div class="d-flex justify-content-between align-items-end mb-4 border-bottom pb-2">
          <div>
            <h5 class="text-primary fw-bold mb-1">{{ currentEdition?.program_abreviature }}</h5>
            <p class="text-muted small m-0">{{ currentEdition?.global_code }} | Periodo: <span class="fw-bold text-dark">{{ goalsSummary.label_periodo }}</span></p>
          </div>
          <div class="text-end">
            <div class="display-6 fw-bold text-dark mb-0 lh-1">{{ goalsSummary.insc.total_aula }}</div>
            <small class="text-uppercase text-muted fw-bold" style="font-size:0.7rem;letter-spacing:1px;">Total Inscritos</small>
          </div>
        </div>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="kpi-card h-100">
              <div class="kpi-header"><i class="fa-solid fa-users-viewfinder text-info"></i>Origen Inscritos</div>
              <ul class="list-group list-group-flush mt-3">
                <li class="list-group-item d-flex justify-content-between align-items-center px-0"><span><i class="fa-solid fa-bullhorn text-muted me-2"></i>Venta Directa</span><span class="badge bg-primary rounded-pill">{{ goalsSummary.insc.ventas_prg }}</span></li>
                <li class="list-group-item d-flex justify-content-between align-items-center px-0"><span><i class="fa-solid fa-headset text-muted me-2"></i>Seguimiento</span><span class="badge bg-info rounded-pill">{{ goalsSummary.insc.seguimiento }}</span></li>
                <li class="list-group-item d-flex justify-content-between align-items-center px-0"><span><i class="fa-solid fa-briefcase text-muted me-2"></i>Corporativo (B2B)</span><span class="badge bg-secondary rounded-pill">{{ goalsSummary.insc.b2b }}</span></li>
                <li class="list-group-item d-flex justify-content-between align-items-center px-0"><span><i class="fa-solid fa-handshake text-muted me-2"></i>Membresía</span><span class="badge bg-warning rounded-pill">{{ goalsSummary.insc.b2b }}</span></li>
              </ul>
            </div>
          </div>
          <div class="col-md-4">
            <div class="kpi-card h-100">
              <div class="kpi-header"><i class="fa-solid fa-crosshairs text-danger"></i>Cumplimiento</div>
              <div class="text-center py-3">
                <div class="progress" style="height:25px;"><div class="progress-bar bg-success progress-bar-striped progress-bar-animated" role="progressbar" :style="{ width: Math.min(goalsSummary.vacantes.porcentaje, 100) + '%' }">{{ goalsSummary.vacantes.porcentaje }}%</div></div>
                <div class="d-flex justify-content-between mt-2 small text-muted fw-bold"><span>0%</span><span>Meta: {{ goalsSummary.vacantes.objetivo }} vacantes</span><span>100%</span></div>
              </div>
              <div class="alert alert-light border mt-2 mb-0 text-center">
                <div v-if="goalsSummary.vacantes.faltantes < 0" class="text-success fw-bold"><i class="fa-solid fa-check-circle"></i> ¡Meta superada por {{ Math.abs(goalsSummary.vacantes.faltantes) }}!</div>
                <div v-else class="text-warning fw-bold"><i class="fa-solid fa-triangle-exclamation"></i> Faltan {{ goalsSummary.vacantes.faltantes }} para meta</div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="kpi-card h-100">
              <div class="kpi-header"><i class="fa-solid fa-filter-circle-dollar text-success"></i>Embudo</div>
              <div class="d-flex align-items-center justify-content-around mt-4">
                <div class="text-center"><h3 class="fw-bold text-muted mb-0">{{ goalsSummary.consultas.total }}</h3><small class="text-muted">Leads Totales</small></div>
                <div class="text-muted"><i class="fa-solid fa-arrow-right"></i></div>
                <div class="text-center"><h3 class="fw-bold text-success mb-0">{{ goalsSummary.insc.total_aula }}</h3><small class="text-success">Ventas</small></div>
              </div>
              <div class="text-center mt-4">
                <span class="display-6 fw-bold text-dark">{{ goalsSummary.consultas.conversion }}%</span>
                <small class="d-block text-muted text-uppercase fw-bold ls-1">Tasa de Conversión</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: Objetivos Mensuales -->
    <BaseModal v-model="showMonthlyGoalsModal" title="Definición de Objetivos Mensuales" size="xl">
      <div class="p-3 bg-light rounded" style="min-height:400px;max-height:70vh;overflow-y:auto;">
        <div class="table-responsive bg-white border rounded shadow-sm">
          <table class="table table-sm table-hover align-middle mb-0 text-center" style="font-size:0.8rem;">
            <thead class="table-light sticky-top">
              <tr>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Línea</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Categ</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Segmento</th>
                <th rowspan="2" class="align-middle border-bottom-0 text-start pb-2">Programa abr</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Tipo</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Día</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2">Hora</th>
                <th rowspan="2" class="align-middle border-bottom-0 pb-2 border-end">Fecha</th>
                <th colspan="2" class="bg-primary-subtle text-primary border-bottom border-primary-subtle py-2"><i class="fa-solid fa-crosshairs me-1"></i>OBJETIVO DE VACANTES</th>
              </tr>
              <tr class="bg-light">
                <th class="border-end text-muted" style="width:120px;">OBJETIVO (#)</th>
                <th class="text-muted" style="width:150px;">OBJETIVO (S/)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="activeGoalsList.length === 0">
                <td colspan="10" class="text-center text-muted py-5"><i class="fa-solid fa-inbox fa-2x mb-2 opacity-50"></i><br>No hay ediciones activas para este periodo.</td>
              </tr>
              <tr v-for="item in activeGoalsList" :key="item.edition_num_id">
                <td class="text-muted">{{ item.program_line_business || '—' }}</td>
                <td><span class="badge bg-light text-dark border">{{ item.cat_course_category_label || '—' }}</span></td>
                <td><div class="segment-circle mx-auto" style="width:20px;height:20px;font-size:0.6rem;">{{ item.cat_segment || '—' }}</div></td>
                <td class="text-start fw-bold text-primary">{{ item.program_abreviature }}</td>
                <td class="text-muted">{{ item.program_type || '—' }}</td>
                <td class="text-muted">{{ item.schedules?.[0]?.day_combination_label || item.day_combination_label || '—' }}</td>
                <td class="text-muted">{{ item.schedules?.[0]?.hour_combination_label || item.hour_combination_label || '—' }}</td>
                <td class="fw-bold border-end">{{ formatDate(item.start_date) }}</td>
                <td class="bg-primary-subtle bg-opacity-10 border-end p-2"><input type="number" class="form-control form-control-sm text-center fw-bold text-dark border-primary-subtle" v-model.number="item.target_vacants" placeholder="0" /></td>
                <td class="bg-primary-subtle bg-opacity-10 p-2"><CurrencyInput v-model="item.target_revenue" currency="PEN" :storeAsMinor="false" class="form-control form-control-sm fw-bold text-end text-success border-primary-subtle" placeholder="0.00" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="d-flex justify-content-between w-100 align-items-center">
          <span class="text-muted small">Mostrando {{ activeGoalsList.length }} programas activos</span>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="showMonthlyGoalsModal = false">Cancelar</button>
            <button class="btn btn-primary btn-sm fw-bold px-3" @click="saveMonthlyGoals"><i class="fa-solid fa-save me-1"></i>Guardar Objetivos</button>
          </div>
        </div>
      </template>
    </BaseModal>

<BaseModal v-model="showAuditModal"
  :title="currentEditionId ? 'Historial de Cambios — Edición' : 'Historial Global de Cambios'"
  size="xl">  <div v-if="loadingAudit && !auditLogs.length" class="text-center py-5">
    <i class="fas fa-spinner fa-spin fa-2x text-slate-400 mb-3"></i>
    <p class="text-muted fw-600">Cargando historial...</p>
  </div>

  <div v-else-if="!auditLogs.length" class="empty-state">
    No hay historial de cambios registrado.
  </div>

  <div v-else>
    <div v-for="log in auditLogs" :key="log.transaction_id" class="audit-entry mb-3">
      <!-- Cabecera de transacción -->
      <div class="audit-entry__header">
        <div class="d-flex align-items-center gap-2">
          <div class="user-avatar">{{ log.user_name?.charAt(0) || '?' }}</div>
          <div>
            <div class="fw-bold" style="font-size:.85rem">{{ log.user_name }}</div>
            <small class="text-muted">{{ formatDateTime(log.created_at) }}</small>
          </div>
        </div>
      </div>

      <!-- Cambios agrupados por tabla/registro -->
      <div v-for="(change, i) in log.changes" :key="i" class="audit-change">
        <div class="audit-change__meta">
          <span class="pill border" :class="actionClass(change.action)">
            {{ actionLabel(change.action) }}
          </span>
          <span class="fw-semibold" style="font-size:.82rem">
            {{ change.program_abbreviation || '' }}
            <span class="text-muted" v-if="change.global_code">· {{ change.global_code }}</span>
          </span>
          <span v-if="change.is_child" class="pill pill-slate border" style="font-size:.68rem">
            <i class="fa-solid fa-sitemap me-1"></i> Módulo
          </span>
          <span v-if="change.table_name === 'edition_structure'" class="pill pill-slate border" style="font-size:.68rem">
            <i class="fa-solid fa-link me-1"></i> Vínculo
          </span>
        </div>

        <!-- Campos modificados -->
        <div v-if="change.changed_fields && Object.keys(change.changed_fields).length"
             class="audit-fields mt-2">
          <div v-for="(val, key) in change.changed_fields" :key="key" class="audit-field-row">
            <span class="field-name">{{ resolveFieldLabel(key) }}</span>
            <span class="field-old">{{ formatFieldValue(key, val).old }}</span>
            <i class="fa-solid fa-arrow-right text-muted" style="font-size:.7rem"></i>
            <span class="field-new">{{ formatFieldValue(key, val).new }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cargar más -->
    <div class="text-center mt-3" v-if="auditHasMore">
      <button class="btn-exec btn-exec-outline btn-exec-sm" @click="loadAuditLogs(currentEditionId)" :disabled="loadingAudit">
        <i class="fa-solid fa-spinner fa-spin me-1" v-if="loadingAudit"></i>
        Cargar más
      </button>
    </div>
  </div>
</BaseModal>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS DE DISEÑO
═══════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #0f172a;

  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-100: #f1f5f9;
  --teal-600:  #12274e;
  --teal-500:  #12274e;
  --blue-600:  #2563eb;
  --gold-400:  #fbbf24;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;

  /* Color de grupos de columna */
  --col-a-bg:     #eff6ff;
  --col-a-head:   #1e40af;
  --col-a-border: #bfdbfe;
  --col-a-td:     #f8fbff;
  --col-a-tdbdr:  #e0eeff;

  --col-b-bg:     #f0fdf4;
  --col-b-head:   #166534;
  --col-b-border: #bbf7d0;
  --col-b-td:     #f7fdf9;
  --col-b-tdbdr:  #d5f5e0;

  --col-c-bg:     #fff7ed;
  --col-c-head:   #92400e;
  --col-c-border: #fed7aa;
  --col-c-td:     #fffbf5;
  --col-c-tdbdr:  #fde8c8;

  --col-d-bg:     #fafafa;
  --col-d-head:   #374151;
  --col-d-border: #e5e7eb;
  --col-d-td:     #fdfdfd;
  --col-d-tdbdr:  #ebebeb;
}

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
  flex-shrink: 0;
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px; height: 42px;
  background: var(--teal-500);
  border-radius: 2px; flex-shrink: 0;
}

.brand-eyebrow {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px;
}

.brand-title {
  font-size: 18px; font-weight: 700; margin: 0;
  letter-spacing: -0.01em; color: var(--white);
  transition: opacity 0.15s;
}
.brand-title:hover { opacity: 0.85; }

.masthead-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Filtros */
.masthead-filters {
  display: flex; align-items: center; gap: 0;
  padding: 0 28px; min-height: 50px;
}

.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 8px 20px 8px 0; }

.filter-label {
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 600; cursor: default;
}

.filter-period-nav { display: flex; align-items: center; gap: 4px; }

.filter-nav-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
  color: var(--slate-300); width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px; cursor: pointer; transition: all 0.15s;
}
.filter-nav-btn:hover { background: rgba(255,255,255,0.16); color: var(--white); }

.exec-select {
  background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  color: var(--white); font-family: 'IBM Plex Sans', inherit;
  font-size: 12.5px; font-weight: 500; padding: 3px 0;
  outline: none; cursor: pointer; min-width: 110px; appearance: auto;
}
.exec-select option { color: var(--text-primary); background: var(--white); }

.filter-sep { width: 1px; height: 30px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }
.filter-spacer { flex: 1; }

/* KPIs inline */
.masthead-kpis { display: flex; gap: 28px; align-items: center; }
.inline-kpi { text-align: right; }
.inline-kpi-label {
  display: block; font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 600; margin-bottom: 2px;
}
.inline-kpi-value {
  font-size: 15px; font-weight: 700; color: var(--white);
  font-variant-numeric: tabular-nums; font-family: 'IBM Plex Mono', monospace;
}
.inline-kpi-value.accent { color: #6366f1; }

/* Filtros activos en masthead */
.filter-chips-bar { flex: 1; padding: 8px 0; }

/* ═══════════════════════════════════════════════
   BOTONES EJECUTIVOS
═══════════════════════════════════════════════ */
.btn-exec {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 4px;
  border: solid 1px white;
  font-size: 12px; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer; border: none; font-family: inherit;
  transition: background 0.15s, opacity 0.15s; position: relative;
}

.btn-exec-ghost {
  background: rgba(255,255,255,0.07); color: var(--slate-300);
  border: 1px solid rgba(206, 206, 206, 0.784);
}
.btn-exec-ghost:hover { background: rgba(255,255,255,0.13); color: var(--white); }

.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { opacity: 0.55; cursor: default; }

.btn-exec-teal { background: rgba(13,148,136,0.28); color: #5eead4; border: 1px solid rgba(13,148,136,0.4); }
.btn-exec-teal:hover { background: rgba(13,148,136,0.4); }

.btn-exec-xs { padding: 4px 10px; font-size: 11px; }

.btn-exec-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold-400); display: inline-block;
  margin-left: 2px;
}

/* ═══════════════════════════════════════════════
   CUERPO
═══════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 20px 24px; }

.view-table { width: 100%; }

.table-shell {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  /* overflow-x: auto;  <-- ELIMINAR */
  /* overflow-y: hidden; <-- ELIMINAR */
  box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
  /* -webkit-overflow-scrolling: touch; <-- ELIMINAR */
}

/* ═══════════════════════════════════════════════
   TABLA EJECUTIVA
═══════════════════════════════════════════════ */
.exec-table {
  width: 100%; border-collapse: collapse;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12.5px; min-width: 1200px;
}

.exec-table-dense td { padding: 5px 8px !important; }

/* ── Fila 1: Grupos principales ── */
.thead-group th {
  padding: 8px 10px; font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700; border-bottom: 1px solid var(--border);
}

.th-act {
  background:rgb(217, 217, 237);
  width: 86px; padding: 8px 10px;
  border-right: 2px solid var(--navy-700);
}

.th-group { text-align: center; }

.th-group-a { background: var(--col-a-bg); color: var(--col-a-head); border-left: 2px solid var(--col-a-border); }
.th-group-b { background: var(--col-b-bg); color: var(--col-b-head); border-left: 2px solid var(--col-b-border); }
.th-group-c { background: var(--col-c-bg); color: var(--col-c-head); border-left: 2px solid var(--col-c-border); }
.th-group-d { background: var(--col-d-bg); color: var(--col-d-head); border-left: 2px solid var(--col-d-border); }

/* ── Fila 2: Columnas individuales ── */
.thead-sub .ts {
  padding: 6px 10px; font-size: 10px;
  letter-spacing: 0.07em; text-transform: uppercase;
  font-weight: 600; border-bottom: 2px solid var(--border);
}

.ts-a { background: var(--col-a-bg); color: var(--col-a-head); border-left: 1px solid var(--col-a-border); }
.ts-b { background: var(--col-b-bg); color: var(--col-b-head); border-left: 1px solid var(--col-b-border); }
.ts-c { background: var(--col-c-bg); color: var(--col-c-head); border-left: 1px solid var(--col-c-border); }
.ts-d { background: var(--col-d-bg); color: var(--col-d-head); border-left: 1px solid var(--col-d-border); }

/* ── Encabezado de Semana ── */
.week-header-row { cursor: pointer; }
.week-header-row:hover .week-header-cell { filter: brightness(0.97); }

.week-header-cell {
  padding: 0 !important;
  background: var(--navy-800) !important;
  border-bottom: 1px solid var(--navy-700) !important;
}

.week-header-inner {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px;
}

.week-chevron {
  color: var(--slate-400); transition: transform 0.2s ease; flex-shrink: 0;
}
.week-chevron-open { transform: rotate(180deg); }

.week-label {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--slate-300);
}

.week-badge {
  margin-left: auto; background: var(--teal-600); color: var(--white);
  font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 10px;
  letter-spacing: 0.04em; border: solid 1px white;
}

/* ── Filas de datos ── */
.tbody-row td {
  padding: 1px 4px; border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background-color: #f0f9ff !important; transition: background 0.1s; }

.td-act {
  background: var(--navy-900) !important;
  border-right: 2px solid var(--navy-800) !important;
  padding: 0px 8px !important;
}
.tbody-row:hover .td-act { background: #152c711d !important; }

.td-a { background: var(--col-a-td); border-left: 1px solid var(--col-a-tdbdr); }
.td-b { background: var(--col-b-td); border-left: 1px solid var(--col-b-tdbdr); }
.td-c { background: var(--col-c-td); border-left: 1px solid var(--col-c-tdbdr); }
.td-d { background: var(--col-d-td); border-left: 1px solid var(--col-d-tdbdr); }

.td-prog { max-width: 200px; }

/* ── Botones de Acción en tabla ── */
.action-btns { display: flex; justify-content: center; gap: 4px; }

.action-btn {
  width: 26px; height: 26px; border-radius: 4px; border: none;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0; border: solid 1px #0a0a1e32;
}

.action-btn-view   { background: rgba(14,165,233,0.12); color: #0284c7; }
.action-btn-view:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-tree   { background: rgba(239,68,68,0.1); color: #dc2626; }
.action-btn-tree:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-neutral { background: rgba(148,163,184,0.12); color: #64748b; }
.action-btn-neutral:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-edit  { background: rgba(245,158,11,0.12); color: #d97706; }
.action-btn-edit:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-hier  { background: rgba(99,102,241,0.12); color: #6366f1; }
.action-btn-hier:hover {  background: rgba(244, 243, 243, 0.767); }

/* ── Programa ── */
.prog-name { font-weight: 600; }
.prog-link { color: #1d4ed8; }
.prog-link:hover { text-decoration: underline; }
.prog-sub { font-size: 11px; line-height: 1.3; }

/* ── Fecha / Date link ── */
.date-link {
  color: #0369a1; font-weight: 600; font-family: 'IBM Plex Mono', monospace;
  font-size: 12px; cursor: pointer;
}
.date-link:hover { text-decoration: underline; }

/* ── Badges y Pills ── */
.pill {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
}
.pill-blue   { background: #dbeafe; color: #1d4ed8; }
.pill-violet { background: #ede9fe; color: #6d28d9; }
.pill-amber  { background: #fef3c7; color: #92400e; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }
.pill-slate  { background: #f1f5f9; color: #475569; }

/* Segmento pill */
.seg-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 10px; font-weight: 800; letter-spacing: 0;
}
.seg-a1 { background: #dbeafe; color: #1e40af; }
.seg-a2 { background: #fed7aa; color: #92400e; }
.seg-a3 { background: #fef9c3; color: #854d0e; }
.seg-a4 { background: #fde8c8; color: #9a3412; }
.seg-a5 { background: #fecdd3; color: #9f1239; }
.seg-a6 { background: #e9d5ff; color: #6b21a8; }

/* Tipo tag */
.tipo-tag {
  display: inline-block; padding: 2px 7px;
  border: 1px solid var(--border); border-radius: 3px;
  font-size: 10px; font-weight: 500; color: var(--text-secondary);
  background: var(--white);
}

/* ── Textarea ── */
.exec-textarea {
  width: 100%; resize: none; background-color: transparent;
  border: 1px solid transparent; border-radius: 3px;
  font-size: 11.5px; font-family: inherit;
  line-height: 1.4; transition: all 0.2s;
  padding: 3px 5px; color: var(--text-primary);
}
.exec-textarea:hover { background-color: #f8fafc; border-color: var(--border); }
.exec-textarea:focus { background-color: var(--white); border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
.exec-textarea::placeholder { color: var(--text-muted); }

/* ── Segmento colores de fila ── */
tr.row-segment-a1 { --seg-bg: #eff6ff; --seg-border: #93c5fd; }
tr.row-segment-a2 { --seg-bg: #fbebd8; --seg-border: #fbb56a; }
tr.row-segment-a3 { --seg-bg: #f9f6d8; --seg-border: #fde047; }
tr.row-segment-a4 { --seg-bg: #f8f4c9; --seg-border: #edce33; }
tr.row-segment-a5 { --seg-bg: #f9d5d8; --seg-border: #fb7185; }
tr.row-segment-a6 { --seg-bg: #ebddfa; --seg-border: #d1a9fb; }

tr[class*="row-segment-"] .td-a,
tr[class*="row-segment-"] .td-b,
tr[class*="row-segment-"] .td-c,
tr[class*="row-segment-"] .td-d {
  background-color: var(--seg-bg) !important;
}
tr[class*="row-segment-"] .td-a {
  border-left: 3px solid var(--seg-border) !important;
}
tr[class*="row-segment-"]:hover .td-a,
tr[class*="row-segment-"]:hover .td-b,
tr[class*="row-segment-"]:hover .td-c,
tr[class*="row-segment-"]:hover .td-d {
  filter: brightness(0.97);
}

/* ── Long press ── */
.row-pressing .td-a,
.row-pressing .td-b,
.row-pressing .td-c,
.row-pressing .td-d {
  background-color: #dbeafe !important;
  cursor: progress !important;
  transition: background-color 0.3s;
}

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
.exec-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 28px; background: var(--white);
  border-top: 1px solid var(--border);
  font-size: 11.5px; color: var(--text-muted); font-weight: 500;
  flex-shrink: 0;
}
.exec-footer strong { color: var(--text-secondary); }
.footer-sep { color: var(--border); }
.footer-spacer { flex: 1; }
.footer-status { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

/* ═══════════════════════════════════════════════
   POPOVERS / DROPDOWNS DE HORARIO
═══════════════════════════════════════════════ */
.overflow-visible { overflow: visible !important; }
.cursor-pointer   { cursor: pointer; }

.schedule-preview-popover {
  position: absolute; top: 100%; left: 0;
  z-index: 10000 !important;
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0; border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important;
  width: 320px; max-width: 90vw; margin-top: 6px; overflow: hidden;
  animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.popover-opens-top {
  top: auto !important; bottom: 100% !important;
  margin-top: 0 !important; margin-bottom: 6px;
}

.popover-header-exec {
  background: var(--navy-800);
  padding: 10px 14px; border-bottom: 1px solid var(--navy-700);
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 700; font-size: 11px; color: var(--slate-300);
  text-transform: uppercase; letter-spacing: 0.07em;
}

.popover-content { max-height: 300px; overflow-y: auto; }

.schedule-dropdown-wrapper { position: relative; }

.schedule-popover {
  position: absolute; top: 100%; left: 0; z-index: 1050;
  min-width: 220px; background: white; border: 1px solid #e5e7eb;
  border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  margin-top: 5px; overflow: hidden;
}

.popover-header-sm {
  background: #f9fafb; padding: 0.5rem 0.75rem; font-size: 0.75rem;
  font-weight: 700; text-transform: uppercase; color: #6b7280;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #e5e7eb;
}
.popover-body-sm { padding: 0.75rem; max-height: 200px; overflow-y: auto; }

.btn-close-xs {
  border: none; background: transparent; font-size: 1.1rem; line-height: 1;
  padding: 0; color: var(--slate-400); cursor: pointer;
}
.btn-close-xs:hover { color: #ef4444; }

.click-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 9999; cursor: default;
}

/* ── Clean table (inside popover) ── */
.clean-table thead th {
  background-color: #f8fafc; color: #64748b; font-weight: 700;
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 10px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 2;
}
.clean-table tbody td { padding: 10px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
.clean-table tbody tr:last-child td { border-bottom: none; }

.row-highlight { background-color: #eff6ff !important; }
.row-highlight td:first-child { border-left: 3px solid #3b82f6; }

/* ═══════════════════════════════════════════════
   ESTILOS DE MODALES (internos)
═══════════════════════════════════════════════ */
.modern-modal-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 1.5rem;
  min-height: 400px;
}
@media (max-width: 992px) { .modern-modal-layout { grid-template-columns: 1fr; } }

.main-column { display: flex; flex-direction: column; }
.sidebar-column { display: flex; flex-direction: column; gap: 1rem; }

.badge-type {
  padding: 0.25rem 0.5rem; border-radius: 6px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;
}

.form-section {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem;
  padding: 1.25rem; position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.section-label {
  position: absolute; top: -10px; left: 12px;
  background: #fff; padding: 0 0.5rem;
  font-size: 0.75rem; font-weight: 700; color: #2563eb;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.form-label-sm {
  font-size: 0.78rem; font-weight: 600; color: #4b5563;
  margin-bottom: 0.25rem; display: block;
}

.hierarchy-container {
  border: 1px solid #e5e7eb; border-radius: 0.375rem;
  overflow: visible; min-width: 500px !important;
}

.status-card {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden;
}
.status-card__header {
  background: var(--navy-800); color: var(--slate-300);
  padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600;
  border-bottom: 1px solid var(--navy-700);
  display: flex; align-items: center;
}
.status-card__body { padding: 1rem; }

.switch-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;
}
.switch-row:last-child { margin-bottom: 0; }
.switch-label { font-size: 0.85rem; color: #334155; line-height: 1.2; }

/* Acordeón árbol */
.accordion-container { min-height: 200px; }
.accordion-card { transition: all 0.2s ease-in-out; }
.accordion-header { transition: background-color 0.2s; }
.accordion-header:hover { background-color: #f8fafc; }
.transition-transform { transition: transform 0.3s ease; }
.rotate-180 { transform: rotate(180deg); }
.icon-box { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }

/* Resumen meta */
.meta-dashboard { background-color: #f8fafc; border-radius: 8px; }
.meta-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column;
}
.meta-card__header {
  background: #fff; padding: 1rem 1.25rem; font-size: 0.9rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em; color: #475569;
  border-bottom: 1px solid #f1f5f9;
}
.meta-card__body { padding: 1.25rem; flex: 1; }

.lines-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem; max-height: 350px; overflow-y: auto; padding-right: 5px;
}
.line-item {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem;
  padding: 0.75rem; text-align: center; transition: all 0.2s;
}
.line-item:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.line-item.is-zero { opacity: 0.6; background: #fff; border-style: dashed; }
.line-item__name { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
.line-item__count { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.line-item.is-zero .line-item__count { color: #cbd5e1; }

.segment-circle {
  width: 24px; height: 24px; background: #e0e7ff; color: #4338ca;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
}

/* Colores segmento en tablas de modal */
.row-segment-a1 td { background-color: #eff6ff !important; }
.row-segment-a2 td { background-color: #fbebd8 !important; }
.row-segment-a3 td { background-color: #f9f6d8 !important; }
.row-segment-a4 td { background-color: #f8f4c9 !important; }
.row-segment-a5 td { background-color: #f9d5d8 !important; }
.row-segment-a6 td { background-color: #ebddfa !important; }

/* Modal goals */
.kpi-card {
  background: #fff; border: 1px solid #f3f4f6; border-radius: 0.75rem;
  padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.kpi-header {
  font-size: 0.9rem; font-weight: 700; color: #374151; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 1rem; border-bottom: 2px solid #f3f4f6; padding-bottom: 0.5rem;
}

/* Small table */
.small-table { font-size: 0.8rem; }
.text-xs { font-size: 0.7rem; }
.ls-1 { letter-spacing: 1px; }
.letter-spacing-1 { letter-spacing: 1px; }

/* ═══════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════ */
.text-center { text-align: center; }
.text-right  { text-align: right; }
.text-mono   { font-family: 'IBM Plex Mono', monospace; }
.text-muted  { color: var(--text-muted); }
.small       { font-size: 11.5px; }
.fw-600      { font-weight: 600; }
.fw-700      { font-weight: 700; }

/* ═══════════════════════════════════════════════
   ANIMACIONES
═══════════════════════════════════════════════ */
@keyframes popIn  { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes pulse  { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.audit-entry {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
}
.audit-entry__header {
  background: var(--slate-50, #f8fafc);
  padding: .6rem 1rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.audit-change {
  padding: .6rem 1rem;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
}
.audit-change:last-child { border-bottom: none; }
.audit-change__meta {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}
.audit-fields { display: flex; flex-direction: column; gap: .25rem; }
.audit-field-row {
  display: grid;
  grid-template-columns: 160px 1fr 16px 1fr;
  align-items: center;
  gap: .5rem;
  font-size: .8rem;
  padding: .2rem .4rem;
  border-radius: 4px;
  background: var(--slate-50, #f8fafc);
}
.field-name { font-weight: 600; color: var(--slate-500, #64748b); }
.field-old  { color: var(--red-600, #dc2626); text-decoration: line-through; }
.field-new  { color: #15803d; font-weight: 600; }
.action-btn-audit { background: rgba(99,102,241,0.1); color: #6366f1; }
.action-btn-audit:hover { background: rgba(244,243,243,0.767); }
</style>
<script setup>

import { ref, reactive, computed, onMounted, inject, watch, nextTick } from 'vue' // <--- Agrega nextTick
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import MultiSelect from '@/components/MultiSelect.vue';
import BaseDatePicker from '@/components/BaseDatePicker.vue';
import CurrencyInput from '@/components/CurrencyInput.vue' // Ajusta la ruta si es necesario
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
const showMonthlyGoalsModal = ref(false)
const activeGoalsList = ref([])
const currentEditionId = ref(null)

// Estado para los filtros de columna (reemplaza localFilters)
const columnFilters = reactive({
  program: [],
  detail: [],
  line: [],
  type: [],
  segment: [],
  da: [],
  start_date: [],
  dp: [],
  end_date: [],
  schedule: [],
  instructor: [],
  notes: [],
  edition_code: [],
  business_line: []
})

import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'


const showAuditModal = ref(false)
const auditLogs = ref([])
const loadingAudit = ref(false)
const auditPage = ref(0)
const auditHasMore = ref(true)
const AUDIT_PAGE_SIZE = 20

// --- INYECCIONES ---
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')
const toast = useToast()
const date = ref();
const isCompact = ref(true)
// --- ESTADOS GENERALES ---
const dense = ref(false)
const schedules = ref([])

// --- FECHAS Y SELECTORES ---
const months = ref([
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
])
const today = new Date()
const selectedMonth = ref(today.getMonth() + 1)
const selectedYear = ref(today.getFullYear())

// --- LOGICA DE DROPWDOWN HORARIO (LISTADO) ---
const activeScheduleDropdown = ref(null)

function toggleScheduleDropdown(id) {
  if (activeScheduleDropdown.value === id) {
    activeScheduleDropdown.value = null
  } else {
    activeScheduleDropdown.value = id
  }
}

// --- LOGICA DE RESUMEN (META SUMMARY) ---
const showMetaModal = ref(false)

// Inicializamos vacío para evitar errores en template, se llena en fetchSchedule
const metaSummary = ref({
  lines: [],      // Líneas de Negocio
  categories: [], // Categorías
  types: [],      // Clasificación por Tipo
  segments: []    // Segmentación Operativa
})

function resolveFieldLabel(key) {
  const labels = {
    instructor_id:           'Docente',
    program_version_id:      'Programa',
    cat_type_approved:       'Tipo Aprobación',
    cat_status_edition:      'Estado Edición',
    cat_day_combination_id:  'Días',
    cat_hour_combination_id: 'Horario',
    cat_segment:             'Segmento',
    start_date:              'Fecha Inicio',
    end_date:                'Fecha Fin',
    vacant:                  'Vacantes',
    active:                  'Activo',
    notes:                   'Notas',
    expedient:               'Expediente',
    confirmation:            'Confirmación',
    sort_order:              'Orden'
  }
  return labels[key] || key
}

function formatFieldValue(key, entry) {
  // Si tiene label resuelto (FK), mostrar el label
  if (entry.new_label !== undefined) {
    return {
      old: entry.old_label || entry.old || '—',
      new: entry.new_label || entry.new || '—'
    }
  }
  // Campos booleanos char
  if (['active', 'expedient', 'confirmation', 'preconfirmation'].includes(key)) {
    return {
      old: entry.old === 'Y' ? 'Sí' : entry.old === 'N' ? 'No' : '—',
      new: entry.new === 'Y' ? 'Sí' : entry.new === 'N' ? 'No' : '—'
    }
  }
  return {
    old: entry.old ?? '—',
    new: entry.new ?? '—'
  }
}

function actionLabel(action) {
  return { INSERT: 'Creación', UPDATE: 'Modificación', DELETE: 'Eliminación' }[action] || action
}

function actionClass(action) {
  return { INSERT: 'pill-teal', UPDATE: 'pill-amber', DELETE: 'pill-red' }[action] || 'pill-slate'
}
async function openAuditHistory(editionId) {

  currentEditionId.value = editionId  // ← guardar aquí
  auditLogs.value = []
  auditPage.value = 0
  auditHasMore.value = true
  showAuditModal.value = true
  await loadAuditLogs(editionId)
}
function formatDateTime(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  return date.toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ' ' + date.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit'
  })
}
async function loadAuditLogs(editionId) {
  if (loadingAudit.value || !auditHasMore.value) return
  loadingAudit.value = true
  try {
    const response = await editionService.auditLogsGet({
      edition_id: editionId,
      limit: AUDIT_PAGE_SIZE,
      offset: auditPage.value * AUDIT_PAGE_SIZE
    })

    // Normalizar respuesta: puede ser array directo o { items: [] }
    const data = Array.isArray(response)
      ? response
      : (response?.items ?? response?.data ?? [])

    if (data.length < AUDIT_PAGE_SIZE) auditHasMore.value = false
    auditLogs.value = [...auditLogs.value, ...data]
    auditPage.value++
  } catch (e) {
    console.error('Error auditLogs:', e)
    toast.error('Error al cargar el historial')
  } finally {
    loadingAudit.value = false  // ← siempre se ejecuta
  }
}
/**
 * Helper para obtener descripción desde el Catálogo
 * @param {String} catalogName - Nombre del catálogo (ej: 'we_program_type')
 * @param {String|Number} value - El alias o ID a buscar
 * @param {String} defaultText - Texto si no se encuentra
 */
function getCatalogLabel(catalogName, value, defaultText = 'Sin Asignar') {
  if (!value) return defaultText
  const options = catalog?.options(catalogName) || []
  const found = options.find(o => o.alias === value || o.code === value || o.id === value)
  return found ? found.description : defaultText
}

// Computed que devuelve items después de aplicar TODOS los filtros
// (tanto los de búsqueda global como los de columna)
const effectiveItems = computed(() => {
  let items = []

  // 1. Obtener datos base según el contexto (filtros globales o vista mensual)
  if (hasActiveFilters.value) {
    // Modo histórico: datos planos del backend
    items = historyList.value || []
  } else {
    // Vista mensual: aplanar las semanas y aplicar filtros de columna
    const scheduleData = filteredSchedules.value // Ya tiene filtros de columna aplicados
    items = scheduleData.flatMap(week => week.items || [])
  }

  // 2. Aplicar filtros de columna si NO estamos en modo histórico
  // (en modo histórico no aplican los filtros de columna, solo los del modal)
  if (!hasActiveFilters.value) {
    const hasColumnFilter = Object.values(columnFilters).some(arr => arr.length > 0)

    if (hasColumnFilter) {
      items = items.filter(item => {
        // Reutilizar la misma lógica de filteredSchedules
        const getValue = (val) => (val === null || val === undefined ? '(Vacío)' : String(val).trim())

        // Programa
        if (columnFilters.program.length > 0) {
          if (!columnFilters.program.includes(getValue(item.program_abreviature))) return false
        }

        // Detalle
        if (columnFilters.detail.length > 0) {
          const detailValue = `${item.version_code} ${item.cat_segment}`
          if (!columnFilters.detail.some(filter => detailValue.includes(filter))) return false
        }

        // Línea
        if (columnFilters.line.length > 0) {
          if (!columnFilters.line.includes(getValue(item.program_line_business))) return false
        }

        // Línea de Negocio
        if (columnFilters.business_line.length > 0) {
          if (!columnFilters.business_line.includes(item.business_line_id)) return false
        }

        // Tipado
        if (columnFilters.type.length > 0) {
          if (!columnFilters.type.includes(getValue(item.cat_course_category_label))) return false
        }

        // Segmento
        if (columnFilters.segment.length > 0) {
          if (!columnFilters.segment.includes(getValue(item.cat_segment))) return false
        }

        // Docente
        if (columnFilters.instructor.length > 0) {
          if (!columnFilters.instructor.includes(getValue(item.instructor))) return false
        }

        // Notas
        if (columnFilters.notes.length > 0) {
          if (!columnFilters.notes.includes(getValue(item.notes))) return false
        }

        // Código de Edición
        if (columnFilters.edition_code.length > 0) {
          const codeValue = `${item.global_code} ${item.specific_code}`.trim()
          if (!columnFilters.edition_code.some(filter => codeValue.includes(filter))) return false
        }

        return true
      })
    }
  }

  return items
})
// Watch para recalcular resumen cuando cambien filtros de columna
watch(
  () => Object.values(columnFilters).flat().length, // Cuenta total de filtros activos
  () => {
    calculateMetaSummary()
  }
)
function handleFamilyFilter(item) {
  if (!item.family_filter_value) {
    toast.info('Sin clasificaciones de familia relacionadas.')
    return
  }
  if (navigator.vibrate) navigator.vibrate(50)
  toast.success(`Filtrando familia: ${item.family_filter_value}`, { timeout: 2500 })
  filterForm.clasification = item.family_filter_value
  applyFilters()
}

function calculateMetaSummary() {
  // 1. USAR EL COMPUTED QUE YA TIENE TODOS LOS FILTROS APLICADOS
  const allItems = effectiveItems.value
  const totalItems = allItems.length

  // --- A. LÍNEAS DE NEGOCIO ---
  const linesMap = {}
  catalogs.value.catLines.forEach(opt => {
    linesMap[opt.alias] = {
      name: opt.description,
      count: 0,
      alias: opt.alias
    }
  })

  // --- B. CATEGORÍAS ---
  const catsMap = {}
  catalogs.value.catCategories.forEach(opt => {
    catsMap[opt.alias] = {
      name: opt.description,
      count: 0,
      alias: opt.alias
    }
  })

  // --- C. TIPOS (Clasificación) ---
  const typesMap = {}
  catalogs.value.catTypes.forEach(opt => {
    const shortCode = opt.description
    typesMap[opt.alias] = {
      description: opt.variable_3,
      code: shortCode,
      count: 0,
      alias: opt.alias
    }
  })

  // --- D. SEGMENTOS ---
  const segsMap = {}
  catalogs.value.catSegments.forEach(opt => {
    const shortCode = opt.description
    segsMap[shortCode] = {
      description: opt.variable_3,
      code: shortCode,
      count: 0,
      alias: opt.alias
    }
  })

  // 4. Iteramos los items reales y sumamos
  allItems.forEach(item => {
    // LÍNEAS
    const lineKey = item.program_line_business_alias
    if (lineKey && linesMap[lineKey]) linesMap[lineKey].count++

    // CATEGORÍAS
    const catKey = item.program_type_alias
    if (catKey && catsMap[catKey]) catsMap[catKey].count++

    // TIPOS
    const typeKey = item.cat_course_category_alias
    if (typeKey && typesMap[typeKey]) typesMap[typeKey].count++

    // SEGMENTOS
    const segKey = item.cat_segment
    if (segKey && segsMap[segKey]) segsMap[segKey].count++
  })

  // 5. Asignación a la vista (Arrays ordenados)
  metaSummary.value.lines = Object.values(linesMap).sort((a, b) => b.count - a.count)

  const categoriesArray = Object.values(catsMap)
  categoriesArray.push({ name: 'Total', count: totalItems })
  metaSummary.value.categories = categoriesArray

  metaSummary.value.types = Object.values(typesMap).sort((a, b) => b.count - a.count)
  metaSummary.value.segments = Object.values(segsMap).sort((a, b) => b.count - a.count)

  // 6. DATOS HARDCODEADOS PARA AVANCE GLOBAL (Solo si NO hay filtros)
  if (!hasActiveFilters.value) {
    const fakeSales = 84
    const fakeB2B = 3
    const fakeTarget = 808
    const fakeTotal = fakeSales + fakeB2B
    const fakePercentage = fakeTarget > 0 ? ((fakeTotal / fakeTarget) * 100).toFixed(2) : '0.00'

    metaSummary.value.general = {
      sales: fakeSales,
      b2b: fakeB2B,
      target: fakeTarget,
      percentage: fakePercentage
    }
  } else {
    metaSummary.value.general = { sales: 0, b2b: 0, target: 0, percentage: 0 }
  }
}

// --- LOGICA DE ÁRBOL (TREE MODAL) ---
const showTreeModal = ref(false)
const treeGroups = ref([]) // Usamos Grupos para el Acordeón
const treeModalTitle = ref('Estructura Académica')
async function openMonthlyGoalsModal() {
  // 1. Forzamos actualizar el listado primero para traer datos frescos
  await fetchSchedule()

  // 2. Extraemos todos los items del mes actual y filtramos SOLO los activos
  // (Dependiendo de tu BD, el campo active puede ser 'Y' o true)
  const currentMonthItems = schedules.value.flatMap(week => week.items || [])
  activeGoalsList.value = currentMonthItems.filter(item => item.active === 'Y' || item.active === true || item.active === 1)

  // 3. Inicializamos las propiedades de objetivos si no existen para que Vue las haga reactivas
  activeGoalsList.value.forEach(item => {
    // Si la BD no trae target_vacants, usamos las vacantes regulares como sugerencia inicial
    if (item.target_vacants === undefined) item.target_vacants = item.vacant || 0
    // Campo de meta de dinero (revenue)
    if (item.target_revenue === undefined) item.target_revenue = 0
  })

  // 4. Abrimos el modal
  showMonthlyGoalsModal.value = true
}

async function saveMonthlyGoals() {
  try {
    // Aquí mapeas los datos que necesitas enviar a tu backend
    const payload = activeGoalsList.value.map(item => ({
      edition_num_id: item.edition_num_id,
      target_vacants: item.target_vacants,
      target_revenue: item.target_revenue
    }))

    // TODO: Reemplazar con tu servicio real, por ejemplo:
    // const response = await editionService.saveGoals(payload)
    // handleServiceResponse(response)

    console.log("Objetivos a guardar:", payload)
    toast.success("Objetivos actualizados correctamente")
    showMonthlyGoalsModal.value = false

    // Opcional: recargar calendario
    // fetchSchedule()
  } catch (error) {
    console.error("Error guardando objetivos:", error)
    toast.error("Ocurrió un error al guardar los objetivos")
  }
}
function openTreeModal(edition) {
  currentEdition.value = edition || null
  treeModalTitle.value = `Jerarquía: ${edition.program_abreviature || edition.global_code}`

  const rawTree = edition.tree_detail || []
  const groups = []

  // Validación inicial opcional: Si es curso y no tiene árbol, avisar
  /*
  if (edition.program_type === 'Curso' && (!rawTree || rawTree.length === 0)) {
    toast.info('Este curso no tiene una estructura jerárquica asociada.');
    // showTreeModal.value = false; return; // Descomentar si quieres bloquear la apertura
  }
  */

  console.log(edition)

  // Detectamos si es una estructura "Hijo con contexto" (tiene padre/hermanos)
  // La clave es si el primer elemento tiene 'children' o 'parent_edition_id'
  const isChildContext = rawTree.length > 0 && (rawTree[0].children || rawTree[0].parent_edition_id)

  if (isChildContext) {
    // Iteramos por cada nodo de contexto (puede tener múltiples padres)
    rawTree.forEach((contextNode, index) => {
      groups.push({
        // Info del Padre
        id: contextNode.parent_edition_id || `p-${index}`,
        active: contextNode.active || 'Y',
        global_code: contextNode.parent_global_code || 'S/C',
        abbreviation: contextNode.parent_abbreviation || 'Programa Padre',
        clasification: contextNode.parent_clasification,

        isOpen: index === 0, // Abrir el primero

        // Info de los Hijos (hermanos + el mismo)
        children: (contextNode.children || []).map(child => ({
          ...child,
          // Marcamos si es la edición actual para resaltarla
          is_current: child.edition_num_id === edition.edition_num_id
        }))
      })
    })
  } else {
    // Es un Padre (PEE) o un curso suelto sin contexto complejo
    // Creamos un grupo donde el padre es la edición seleccionada
    //si es un curso salga mensaje info
    if(edition.program_type === 'Curso') {
      toast.info('Este curso no tiene una estructura jerárquica asociada.');
      showTreeModal.value = false;
      return;
    }

    groups.push({
      id: edition.edition_num_id,
      global_code: edition.global_code,
      abbreviation: edition.program_abreviature,
      clasification: edition.clasification || edition.skem_clasification,

      isOpen: true,

        active: edition.active?'Y':'N',
      children: rawTree.map(child => ({
        ...child,
        is_current: false
      }))
    })
  }

  treeGroups.value = groups
  showTreeModal.value = true
}

function toggleGroup(index) {
  treeGroups.value[index].isOpen = !treeGroups.value[index].isOpen
}
// Computed para detectar si hay filtros de columna activos
const hasColumnFilters = computed(() => {
  return Object.values(columnFilters).some(arr => arr.length > 0)
})
// --- HELPER RESPUESTAS ---
function handleServiceResponse(response) {
  if (!response) {
    toast.error('Error de conexión con el servidor')
    return false
  }
  const { result, message } = response
  const msgText = message || 'Operación completada'

  if (result === 0) {
    toast.error(msgText)
    return false
  } else if (result === 1) {
    toast.success(msgText)
    return true
  } else {
    // Cualquier otro número se considera warning/info pero permite continuar
    toast.warning(msgText)
    return true
  }
}

// --- FORMATTERS ---
const hasAnyEdition = computed(() =>
  schedules.value.some(w => Array.isArray(w.items) && w.items.length > 0)
)

function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    // Formato visual simple DD/MM/YYYY
    // Usamos split para evitar problemas de zona horaria si viene como YYYY-MM-DD
    if (typeof value === 'string' && value.includes('-')) {
        const [y, m, d] = value.split('T')[0].split('-')
        return `${d}/${m}/${y}`
    }
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}/${mm}/${yy}`
  } catch {
    return '—'
  }
}

// --- LOGICA DE FILTROS ---
const showFilterModal = ref(false)
// Formulario temporal dentro del modal


const filterForm = reactive({
    q: '',
    instructor_id: null,
    instructor_label: '',
    start_date: '',
    range_string: null,
    date_from: null,
    date_to: null,
    end_date: '',
    clasification: null,
    program_version_id: null,
    program_version_label: null,
    active: null,
    category_ids: [],
    type_program_ids: [],
    course_category_ids: [],
    segment_ids: [],
    combination_days_ids: [],
    hour_combination_ids: [],
    model_modality_ids: [],
    instructores_seleccionados: [],
    business_line_ids: [],
})

// Filtros activos (aplicados)
const activeFilters = reactive({})


const formattedActiveFilters = computed(() => {
  const chips = []

  // 1. Programa (Valor único / Objeto simple)
  if (activeFilters.program_version_label) {
    chips.push({
      key: 'program_version_id',
      text: `Prog: ${activeFilters.program_version_label}`
    })
  }

  // 2. Docente (Array de objetos desde el MultiSelect)
  if (activeFilters.instructores_seleccionados && activeFilters.instructores_seleccionados.length > 0) {
    chips.push({
      key: 'instructores_seleccionados',
      // Muestra la cantidad en el chip
      text: `Docentes: ${activeFilters.instructores_seleccionados.length}`,
      // Pasa el array completo a 'details' para que tu componente BaseFilterChips pueda mostrar un tooltip o lista
      details: activeFilters.instructores_seleccionados
    })
  }

  // 3. Rango de Fechas
  if (activeFilters.date_range) {
    chips.push({
      key: 'date_range',
      text: `${activeFilters.date_from} al ${activeFilters.date_to}`,
      icon: 'fa-regular fa-calendar'
    })
  }

  // 4. Catálogos Múltiples (Arrays de IDs desde MultiSelect)
  // Definimos qué campos son arrays y cómo se llaman en el catálogo
  const arrayFilters = [
    { key: 'category_ids', labelPrefix: 'Línea', catalogName: 'catLines' },
    { key: 'business_line_ids', labelPrefix: 'L. Negocio', catalogName: 'businessLineList' },
    { key: 'type_program_ids', labelPrefix: 'Cat', catalogName: 'catCategories' },
    { key: 'segment_ids', labelPrefix: 'Seg', catalogName: 'catSegments' },
    { key: 'combination_days_ids', labelPrefix: 'Días', catalogName: 'dayCombinationList' },
    { key: 'hour_combination_ids', labelPrefix: 'Horas', catalogName: 'hourCombinationList' },
    { key: 'model_modality_ids', labelPrefix: 'Mod', catalogName: 'modalityList' },
    { key: 'course_category_ids', labelPrefix: 'S. Edición', catalogName: 'catTypes' },
  ]

  arrayFilters.forEach(map => {
    const selectedValues = activeFilters[map.key] // Esto debería ser el array de objetos {value, label} del MultiSelect

    if (selectedValues && selectedValues.length > 0) {
      chips.push({
        key: map.key,
        // Aquí aplicas tu lógica: Mostrar el conteo
        text: `${map.labelPrefix}: ${selectedValues.length}`,
        // Y aquí pasas el detalle (activeFilters ya tiene los objetos gracias al MultiSelect)
        details: selectedValues
      })
    }
  })

  // 5. Clasificación (Texto simple)
  if (activeFilters.clasification) {
    chips.push({
      key: 'clasification',
      text: `Clasif: ${activeFilters.clasification}`
    })
  }

  return chips
})


// Computed para saber si estamos en "Modo Histórico"
const hasActiveFilters = computed(() => {
    return Object.entries(activeFilters).some(([key, value]) => {
        // Ignorar si es null, undefined o string vacío
        if (value === null || value === undefined || value === '') return false;

        // Si es array, solo contar como "activo" si tiene elementos
        if (Array.isArray(value)) {
            return value.length > 0;
        }

        // Para cualquier otro tipo, si existe es activo
        return true;
    });
});

// 4. MEJORAR applyFilters para no copiar arrays vacíos
function applyFilters() {
    // 1. Limpiar activeFilters
    for (const key in activeFilters) {
        delete activeFilters[key];
    }

    // 2. Copiar valores del formulario SOLO si tienen contenido real
    for (const key in filterForm) {
        const value = filterForm[key];

        // Ignorar valores nulos, undefined o strings vacíos
        if (value === null || value === '' || value === undefined) continue;

        // Para arrays, solo copiar si tiene elementos
        if (Array.isArray(value)) {
            if (value.length > 0) {
                activeFilters[key] = value;
            }
            continue;
        }

        // Para otros tipos, copiar directamente
        activeFilters[key] = value;
    }

    // 3. Lógica especial para fechas
    if (filterForm.date_from && filterForm.date_to) {
        activeFilters.date_range = true;
    }

    // 4. Si NO quedó ningún filtro, limpiar historial
    if (Object.keys(activeFilters).length === 0) {
        historyList.value = [];
    }

    saveState();
    fetchSchedule();
    showFilterModal.value = false;
}

// 2. MEJORAR removeFilter para limpiar arrays vacíos
function removeFilter(key) {
    // 1. Caso Especial: Rango de Fechas
    if (key === 'date_range') {
        delete activeFilters.date_from;
        delete activeFilters.date_to;
        delete activeFilters.date_range;

        filterForm.date_from = null;
        filterForm.date_to = null;
        filterForm.range_string = null;
    }
    // 2. Caso Especial: Programa (Single Select con Label auxiliar)
    else if (key === 'program_version_id') {
        delete activeFilters.program_version_id;
        delete activeFilters.program_version_label;

        filterForm.program_version_id = null;
        filterForm.program_version_label = '';
    }
    // 3. Arrays (Para Instructores, Categorías, etc.)
    else if (Array.isArray(filterForm[key])) {
        delete activeFilters[key];
        filterForm[key] = [];
    }
    // 4. Caso Genérico
    else {
        delete activeFilters[key];
        filterForm[key] = null;
    }

    // NUEVO: Limpieza adicional de arrays vacíos en activeFilters
    Object.keys(activeFilters).forEach(k => {
        if (Array.isArray(activeFilters[k]) && activeFilters[k].length === 0) {
            delete activeFilters[k];
        }
    });

    saveState();
    fetchSchedule();
}

// 3. MEJORAR clearAllFilters
function clearAllFilters(reload = true) {
    // Limpiar activeFilters completamente
    Object.keys(activeFilters).forEach(key => delete activeFilters[key]);

    // Reset form (diferenciando arrays de otros tipos)
    for (const key in filterForm) {
        if (Array.isArray(filterForm[key])) {
            filterForm[key] = [];
        } else {
            filterForm[key] = null;
        }
    }

    saveState();

    if (reload) fetchSchedule();
}


// --- LISTADO ---
async function fetchSchedule() {
  try {
    if(!hasActiveFilters.value){
      const payload = {
        selectedMonth: selectedMonth.value,
        selectedYear: selectedYear.value,
        page: 1,
        size: 100
      }
      
      const { items } = await editionService.editionByWeekList(payload)

      schedules.value = Array.isArray(items)
        ? items.map(w => ({ ...w, isOpen: true }))
        : []

      // Cálculo para vista mensual
      calculateMetaSummary()

    } else {
      const payload = {
        page: 1,
        size: 100,
        ...activeFilters
      }
      const { items } = await editionService.editionList(payload)

      historyList.value = items

      // AGREGADO: Cálculo para vista histórica
      calculateMetaSummary()
    }

    toast.success(hasActiveFilters.value ? 'Historico Actualizado' : 'Cronograma actualizado')

  } catch (err) {
    console.error('Error cargando cronograma:', err)
    toast.error('Error al cargar el listado')
    schedules.value = []
    historyList.value = []
  }
}
onMounted(() => {
  loadState()
  applyFiltersFromQueryParams()
  // fetchSchedule()
})

const historyList = ref([])

// --- GESTIÓN DE EDICIÓN (MODAL FORM) ---
const showFormModal = ref(false)
const currentEdition = ref(null)

  // 2. Obtenemos los catálogos COMPLETOS
const catalogs = ref({
  dayCombinationList: (catalog && catalog.options('we_day_combination')) || [],
  modalityList: (catalog && catalog.options('we_modality')) || [],
  hourCombinationList: (catalog && catalog.options('we_hour_combination')) || [],
  catLines: (catalog && catalog.options('we_program_category')) || [],
  catCategories: (catalog && catalog.options('we_program_type')) || [],
  catTypes: (catalog && catalog.options('we_course_category')) || [],
  catSegments: (catalog && catalog.options('we_segment')) || [],
  catHolidays: (catalog && catalog.options('we_holiday')) || [],
  businessLineList: (catalog && catalog.options('we_business_line')) || []
}
)
// 2. Función para procesar el cambio del DatePicker
function handleRangeFilterChange(selectedDates, dateStr) {

    // dateStr llega como "2025-01-01 to 2025-01-31"
    if (dateStr.includes(' a ')) {
        const parts = dateStr.split(' a ');
        filterForm.date_from = parts[0];
        filterForm.date_to = parts[1];
    } else {
        // Si el usuario borra o solo selecciona un día
        filterForm.date_from = dateStr;
        filterForm.date_to = dateStr;
    }
    // Sincronizamos el string visual
    filterForm.range_string = dateStr;
}

const modalForm = reactive({
  program_version_id: null,
  instructor_id: null,
  start_date: '',
  end_date: '',
  cat_type_program: null,
  cat_segment_id: null,
  attachments: [],
  cat_type_program_alias: null,
  cat_day_combination_id: null,
  cat_hour_combination_id: null,
  expedient: false,
  upgrade: false,
  preconfirmation: false,
  vacant: 0,
  confirmation: false,
  active: false,
  notes: '',
  program_version_children: []
})

watch(
  () => [modalForm.expedient, modalForm.preconfirmation],
  ([newExpedient, newPreconf]) => {
    const newConfirmation = !!(newExpedient && newPreconf);
    if (modalForm.confirmation !== newConfirmation) {
      modalForm.confirmation = newConfirmation;
    }
  }
);

watch(
  () => modalForm.confirmation,
  (newConfirmation, oldConfirmation) => {
    // Solo actuamos si cambió y se está activando
    if (newConfirmation !== oldConfirmation && newConfirmation) {
      modalForm.expedient = true;
      modalForm.preconfirmation = true;
    }
  }
);

// Helpers Computados
const isCourse = computed(() =>
  modalForm.cat_type_program_alias === 'we_program_type_course' ||
  modalForm.cat_type_program_alias === 'we_program_type_event'
)

const isCourseValid = computed(() => {
  if (!isCourse.value) return true
  if (!modalForm.program_version_id) return false
  if (!modalForm.start_date || !modalForm.end_date) return false
  if (!modalForm.cat_day_combination_id || !modalForm.cat_hour_combination_id) return false
  return true
})

const isHierarchyValid = computed(() => {
  if (!modalForm.program_version_id) return false
  if (!modalForm.program_version_children.length) return false
  return modalForm.program_version_children.every(child => {
    if (child.new) {
      return (!!child.start_date && !!child.end_date && !!child.cat_day_combination_id && !!child.cat_hour_combination_id)
    } else {
      return !!child.edition_id
    }
  })
})

const isModalValid = computed(() => {
  if (!modalForm.program_version_id) return false
  if (isCourse.value) return isCourseValid.value
  return isHierarchyValid.value
})

function resetModalForm() {
  modalForm.program_version_id = null
  modalForm.instructor_id = null
  modalForm.start_date = null
  modalForm.end_date = null
  modalForm.expedient = false
  modalForm.sessions = null
  modalForm.upgrade = false
  modalForm.preconfirmation = false
  modalForm.confirmation = false
  modalForm.active = true
  modalForm.notes = ''
  modalForm.cat_type_program = null
  modalForm.cat_type_program_alias = null
  modalForm.cat_day_combination_id = null
  modalForm.cat_hour_combination_id = null
  modalForm.program_version_children = []
}

/**
 * Aplica filtros y abre una nueva ventana con query params
 * @param {Object} filters - Objeto con los filtros a aplicar (ej: { clasification: 'UNQ-001', cat_segment: 'A1' })
 */
function filterDirectly(filters = {}) {
  // 1. Construir query params desde el objeto de filtros
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== '' && value !== undefined) {
      params.append(key, value)
    }
  })

  // 2. Construir la URL completa
  const baseUrl = window.location.origin + window.location.pathname
  const queryString = params.toString()
  const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl

  // 3. Abrir en nueva ventana/pestaña
  window.open(fullUrl, '_blank')
}

/**
 * Lee los query params de la URL y aplica los filtros automáticamente
 */
function applyFiltersFromQueryParams() {
  const urlParams = new URLSearchParams(window.location.search)

  // Si no hay params, no hacer nada
  if (urlParams.toString() === ''){
    applyFilters()
    return
  }

  let hasFilters = false

  // Limpiar filtros previos
  clearAllFilters(false)

  // Mapear cada param al filterForm
  urlParams.forEach((value, key) => {
    if (filterForm.hasOwnProperty(key)) {
      // Conversión de tipos según el campo
      if (key.includes('_id') || key === 'vacant') {
        // IDs y números
        filterForm[key] = value ? parseInt(value) : null
      } else {
        // Strings y otros
        filterForm[key] = value
      }
      hasFilters = true
    }
  })

  // Si se encontraron filtros, aplicarlos automáticamente
  if (hasFilters) {
    applyFilters()
    toast.info('Filtros aplicados desde URL', { timeout: 2000 })
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// Genera un string "YYYY-MM-01" basado en el dashboard
const defaultStartDate = computed(() => {
  const y = selectedYear.value;
  const m = String(selectedMonth.value).padStart(2, '0');
  return `${y}-${m}-01`; // Siempre el día 1 para que el picker se posicione ahí
});

function cleanFormModal(){
  modalForm.program_version_id = null
  modalForm.instructor_id = null
  modalForm.start_date = null
  modalForm.end_date = null
  modalForm.expedient = false
  modalForm.sessions = null
  modalForm.upgrade = false
  modalForm.preconfirmation = false
  modalForm.confirmation = false
  modalForm.active = true
  modalForm.notes = ''
  modalForm.cat_type_program = null
  modalForm.cat_type_program_alias = null
  modalForm.cat_day_combination_id = null
  modalForm.cat_hour_combination_id = null
  modalForm.start_date = null // Antes era ''
  modalForm.end_date = null   // Antes era ''
  modalForm.program_version_children = []
  modalForm.vacant = 0
  modalForm.cat_segment_id = null
  modalForm.global_code = ''
  modalForm.specific_code = ''
  currentEdition.value=null
}

async function openEditModal(edition) {
  currentEdition.value = edition || null
  resetModalForm()

  // NUEVA
  if (!edition) {
    showFormModal.value = true
    //cleanForm y set starst date
    cleanFormModal()
    // modalForm.start_date = defaultStartDate.value
    modalForm.active = true
    return
  }

  // EDICION
  showFormModal.value = true
  try {
    const data = await editionService.editionGet({ id: edition.edition_num_id })
    if (!data) {
      toast.warning('No se encontró información')
      showFormModal.value = false
      return
    }

    modalForm.program_version_id = data.program_version_id
    modalForm.instructor_id = data.instructor_id
    modalForm.start_date = (data.start_date || '').slice(0, 10)
    modalForm.end_date = (data.end_date || '').slice(0, 10)
    modalForm.expedient = !!data.expedient
    modalForm.upgrade = !!data.upgrade
    modalForm.vacant = data.vacant

    modalForm.cat_segment_id = data.cat_segment_id
    modalForm.global_code = data.global_code
    modalForm.specific_code = data.specific_code

    modalForm.active = !!data.active
    modalForm.preconfirmation = !!data.preconfirmation
    modalForm.confirmation = !!data.confirmation
    modalForm.notes = data.notes || ''
    modalForm.sessions = data.sessions || null

    // Alias UI
    modalForm.abbreviation = data.abbreviation
    modalForm.instructor_label = data.instructor_label

    modalForm.cat_type_program = data.cat_type_program
    modalForm.cat_type_program_alias = data.cat_type_program_alias || edition.cat_type_program_alias

    modalForm.cat_day_combination_id = data.cat_day_combination_id
    modalForm.cat_hour_combination_id = data.cat_hour_combination_id
    // Hijos
    console.log(data.children)
    modalForm.program_version_children = (data.children || []).map(child => ({
      ...child,
      start_date: child.start_date ? child.start_date.slice(0, 10) : defaultStartDate.value,
      end_date: (child.end_date || '').slice(0, 10),
      expedient: !!child.expedient,
      upgrade: !!child.upgrade,
      sessions: child.sessions,
      preconfirmation: !!child.preconfirmation,
      confirmation: !!child.confirmation,
      active: !!child.active,
      new: !!child.new
    }))

  } catch (err) {
    console.error(err)
    toast.error('Error al obtener edición')
  }
}

async function applyModalForm() {
  if (!isModalValid.value) {
    toast.warning('Complete los campos requeridos')
    return
  }

  let response = null

  try {
    if (isCourse.value) {
      // CURSO SIMPLE
      const editionPayload = {
        program_version_id: modalForm.program_version_id,
        instructor_id: modalForm.instructor_id,
        year: selectedYear.value,
        start_date: modalForm.start_date,
        vacant: modalForm.vacant,
        cat_segment_id: modalForm.cat_segment_id,
        global_code: modalForm.global_code,
        specific_code: modalForm.specific_code,
        end_date: modalForm.end_date,
        cat_day_combination_id: modalForm.cat_day_combination_id,
        cat_hour_combination_id: modalForm.cat_hour_combination_id,
        expedient: modalForm.expedient ? 'Y' : 'N',
        upgrade: modalForm.upgrade ? 'Y' : 'N',
        preconfirmation: modalForm.preconfirmation ? 'Y' : 'N',
        confirmation: modalForm.confirmation ? 'Y' : 'N',
        notes: modalForm.notes,
        active: modalForm.active ? 'Y' : 'N',
      }

      if (currentEdition.value && currentEdition.value.edition_num_id) {
        response = await editionService.editionUpdate({
          id: currentEdition.value.edition_num_id,
          edition: editionPayload
        })
      } else {
        response = await editionService.editionRegister({
          edition: editionPayload
        })
      }
    } else {
      // JERÁRQUICO
      const payload = {
        edition_id: currentEdition.value ? currentEdition.value.edition_num_id : null,
        program_version_id: modalForm.program_version_id,
        vacant: modalForm.vacant,
        active: modalForm.active ? 'Y' : 'N',
        notes: modalForm.notes || null,
        year: selectedYear.value,
        global_code: modalForm.global_code,
        specific_code: modalForm.specific_code,
        expedient: modalForm.expedient ? 'Y' : 'N',
        upgrade: modalForm.upgrade ? 'Y' : 'N',
        cat_segment_id: modalForm.cat_segment_id,
        preconfirmation: modalForm.preconfirmation ? 'Y' : 'N',
        confirmation: modalForm.confirmation ? 'Y' : 'N',
        children: modalForm.program_version_children.map((child, idx) => ({
          sort_order: idx + 1,
          child_program_version_id: child.child_program_version_id,
          instructor_id: child.instructor_id || null,
          new: !!child.new,
          edition_id: child.edition_id || null,
          start_date: child.start_date || null,
          end_date: child.end_date || null,
          cat_day_combination_id: child.cat_day_combination_id || null,
          cat_hour_combination_id: child.cat_hour_combination_id || null,
          expedient: child.expedient ? 'Y' : 'N',
          upgrade: child.upgrade ? 'Y' : 'N',
          preconfirmation: child.preconfirmation ? 'Y' : 'N',
          confirmation: child.confirmation ? 'Y' : 'N',
          active: child.active ? 'Y' : 'N',
        }))
      }

      if (currentEdition.value && currentEdition.value.edition_num_id) {
        response = await editionService.editionTreeUpdate({
          edition: payload
        })
      } else {
        response = await editionService.editionTreeRegister({
          edition: payload
        })
      }


    }

    const { result, message } = response

    if (result=== 1) {
      toast.success(message)
      showFormModal.value = false
      fetchSchedule()
    }else if(result===0){
      toast.error(message)
    }
     else {
      toast.warning(message)
    }

  } catch (err) {
    console.error(err)
    toast.error('Ocurrió un error inesperado al procesar la solicitud')
  }
}

function setChildren(children, field, value) {
  children.forEach(child => {
    if(child[field])return;
    child[field] = value;
  });
}



function onProgramVersionChange(opcion) {

  if (currentEdition.value && modalForm.cat_type_program_alias !== 'we_program_type_course') return

  if (!opcion) {
    modalForm.cat_type_program = null
    modalForm.cat_type_program_alias = null
    modalForm.program_version_children = []
    return
  }
  modalForm.cat_type_program = opcion.cat_type_program
  modalForm.sessions = opcion.sessions
  modalForm.cat_type_program_alias = opcion.cat_type_program_alias
  modalForm.start_date = null
  modalForm.end_date = null
  modalForm.cat_day_combination_id = null
  modalForm.cat_hour_combination_id = null

  modalForm.program_version_children = (opcion.children || []).map(child => ({
    child_program_version_id: child.child_program_version_id,
    abbreviation: child.abbreviation,
    program_version_description: child.description,
    sessions: child.sessions,
    program_version_abbreviation: child.abbreviation,
    program_version_sessions: child.sessions,
    program_version_skem_clasification: child.skem_clasification,
    cat_model_modality_label: child.cat_model_modality_label,
    modality: child.modality || null,
    new: true,
    active: true,
    edition_id: null,
    expedient: true,
    upgrade: false,
    preconfirmation: false,
    confirmation: false,
    start_date: null,//defaultStartDate.value,
    end_date: null,
    instructor_id: null,
    instructor_label: null,
    cat_day_combination_id: null,
    cat_hour_combination_id: null,
    day_combination_label: null,
    hour_combination_label: null
  }))
}

// --- OBJETIVOS (DUMMY POR AHORA) ---
const showGoalsModal = ref(false)
const goalsSummary = ref({
  label_periodo: 'Noviembre 2025',
  insc: { ventas_prg: 6, seguimiento: 6, b2b: 0, membresia: 0, total_aula: 12 },
  vacantes: { faltantes: -3, objetivo: 3, porcentaje: 120 },
  consultas: { total: 34, conversion: 35 }
})

function openObjectivesModal(edition) {
  currentEdition.value = edition
  showGoalsModal.value = true
}

// Lógica de cambio de mes
function changeMonth(delta) {
  let m = selectedMonth.value + delta
  let y = selectedYear.value
  if (m <= 0) { m = 12; y-- }
  else if (m > 12) { m = 1; y++ }
  selectedMonth.value = m
  selectedYear.value = y
  saveState()
  fetchSchedule()
}

  //relaodSchedule

  function reloadSchedule() {
    fetchSchedule()
    saveState() // Guardar
  }



/**
 * Maneja el cambio de los switches (booleans)
 * Valida que sea 'Curso' y aplica lógica de negocio
 */
async function updateQuickStatus(edition, fieldChanged) {
  // 1. Validación: Solo Cursos pueden modificar switches aquí
  // Ajusta 'Curso' según como venga exactamente en tu backend (ej. program_type o alias)
  if (edition.program_type !== 'Curso' && edition.cat_type_program_alias !== 'we_program_type_course') {
    // Revertir el cambio visual porque no está permitido
    edition[fieldChanged] = !edition[fieldChanged]
    toast.info('La gestión de estados desde el listado solo está habilitada para Cursos.')
    return
  }

  // 2. Lógica de negocio (Sincronización)
  // Si activamos Confirmación, activamos Ficha y Pre-conf automáticamente
  if (fieldChanged === 'confirmation' && edition.confirmation) {
    edition.expedient = true
    edition.preconfirmation = true
  }
  // Si desactivamos Ficha o Pre-conf, desactivamos Confirmación
  if ((fieldChanged === 'expedient' || fieldChanged === 'preconfirmation') && !edition[fieldChanged]) {
    edition.confirmation = false
  }

  // 3. Guardar cambios
  await saveQuickChange(edition)
}
async function updateQuickNotes(edition) {
  const currentNotes = edition.notes || '';

  // 1. Comparamos el valor actual con el que capturamos en el focus
  if (currentNotes === originalNoteValue.value) {
    // Si son exactamente iguales, detenemos la ejecución. ¡No hacemos la llamada a la API!
    return;
  }

  // 2. Si hay cambios, procedemos a guardar
  await saveQuickChange(edition);

  // 3. Actualizamos nuestra variable de control por si el usuario vuelve a hacer focus sin recargar
  originalNoteValue.value = currentNotes;
}
/**
 * Función CORE que realiza la actualización
 * 1. Obtiene la data completa de la BD (para no perder datos ocultos)
 * 2. Mezcla con los cambios de la UI
 * 3. Envía el update
 */
async function saveQuickChange(edition) {
  try {
    // A. Obtenemos la data "real" actual de la BD
    const currentData = await editionService.editionGet({ id: edition.edition_num_id })

    if (!currentData) {
      toast.error('Error al sincronizar con el servidor')
      return
    }

    // B. Preparamos el Payload mezclando la BD con lo que modificó el usuario en la lista
    // Usamos los valores de 'edition' (lista) para los campos que permitimos editar
    // Usamos 'currentData' para el resto (ids, fechas, etc) para no romper nada

    const payload = {
      // Campos editables desde la lista (Booleans convertidos a Y/N)
      // Usamos la variable 'edition' que es la reactiva del v-model
      expedient: edition.expedient ? 'Y' : 'N',
      upgrade: edition.upgrade ? 'Y' : 'N',
      preconfirmation: edition.preconfirmation ? 'Y' : 'N',

      confirmation: edition.confirmation ? 'Y' : 'N',
      notes: edition.notes // Texto directo
    }

    // C. Ejecutamos el Update
    const response = await editionService.editionUpdate({
      id: edition.edition_num_id,
      edition: payload
    })

    //if (response && response.result === 1) {
    if (response && response.result === 1) {
      // Usamos el mensaje del backend si viene, o uno por defecto
      toast.success(response.message || 'Edición actualizada correctamente', { timeout: 1500 })
    } else {
      // Si result es 0 u otro, es un error
      toast.error(response?.message || 'Error al actualizar')
      // Opcional: Recargar el listado si falló para revertir visualmente
    }

    fetchSchedule();
  } catch (err) {
    console.error(err)
    toast.error('Error de conexión al guardar cambios')
  }
}

function validateDateInput(targetObj, fieldKey) {
  const dateVal = targetObj[fieldKey];
  if (!dateVal) return;

  const [y, m, d] = dateVal.split('-').map(Number);

  // 1. Validar Mes y Año
  if (y !== selectedYear.value || m !== selectedMonth.value) {
    toast.info(`La fecha debe pertenecer a ${months.value[selectedMonth.value - 1]} del ${selectedYear.value}`);
    targetObj[fieldKey] = null;
    return;
  }

  // 2. Validar Feriados (MODIFICADO: Solo aviso)
  if (holidayDates.value.includes(dateVal)) {
    const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
    const hName = hObj ? hObj.description : 'Feriado';

    // CAMBIO: Toast warning y NO limpiamos el input
    toast.warning(`Atención: La fecha seleccionada es feriado (${hName}).`);
  }
}

function getChildDateConfig(index = null, bodyField = null) {
  const config = {};

  // LOGICA MIN/MAX
  if (bodyField) {
    config.minDate = bodyField.start_date;
  } else {
    if (!hasActiveFilters.value || !currentEdition.value) {
      if (index === 0 || index == null) {
        // Lógica del primer elemento (mes/año seleccionado)
        const y = selectedYear.value;
        const m = selectedMonth.value;
        const lastDay = new Date(y, m, 0).getDate();
        config.minDate = `${y}-${String(m).padStart(2, '0')}-01`;
        config.maxDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
      } else {
        const prevChild = modalForm.program_version_children[index - 1];
        if (prevChild && prevChild.start_date) {
          config.minDate = prevChild.start_date;
        }
      }
    }
  }

  // --- LÓGICA: HABILITAR SOLO DÍAS ESPECÍFICOS (PERO PERMITIR FERIADOS) ---
  const targetObj = (index !== null && modalForm.program_version_children[index])
    ? modalForm.program_version_children[index]
    : bodyField ? bodyField : modalForm;

  if (targetObj?.cat_day_combination_id) {
    const comboOption = catalogs.value.dayCombinationList.find(
      c => c.id === targetObj.cat_day_combination_id
    );

    if (comboOption && comboOption.variable_2) {
      try {
        const allowedDays = JSON.parse(comboOption.variable_2);

        // Flatpickr: Solo habilitar los días de la semana permitidos (Lun, Mie, etc.)
        // YA NO bloqueamos si es feriado.
        config.enable = [
          (date) => {
            const dayOfWeek = date.getDay();
            // const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            // CAMBIO AQUÍ: Solo validamos que sea el día de la semana correcto.
            return allowedDays.includes(dayOfWeek);
          }
        ];
      } catch (e) {
        console.error('Error parseando días:', e);
      }
    }
  }

  return config;
}

/**
 * Parsea la descripción del combo (ej: "Lun-Mie-Vier") y devuelve un array de días JS (0-6)
 * JS: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
 */
function parseDaysFromLabel(label) {
  if (!label) return [];

  const labelLower = label.toLowerCase();
  const days = [];

  // Mapeo de términos comunes en español
  if (labelLower.includes('lun')) days.push(1);
  if (labelLower.includes('mar')) days.push(2);
  if (labelLower.includes('mie') || labelLower.includes('mié')) days.push(3);
  if (labelLower.includes('jue')) days.push(4);
  if (labelLower.includes('vie') || labelLower.includes('vier')) days.push(5);
  if (labelLower.includes('sab') || labelLower.includes('sáb')) days.push(6);
  if (labelLower.includes('dom')) days.push(0);

  return days; // Ej: [1, 3, 5]
}

/**
 * Obtiene días permitidos con fallback robusto
 * Prioriza JSON en variable_2, usa texto como backup
 */
function getAllowedDaysFromCombo(comboOption) {
  if (!comboOption) return [];

  // Intento 1: JSON en variable_2 (más confiable)
  if (comboOption.variable_2) {
    try {
      const parsed = JSON.parse(comboOption.variable_2);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('Error parsing variable_2, usando fallback:', e);
    }
  }

  // Intento 2: Fallback a texto
  return parseDaysFromLabel(comboOption.description);
}


function validateAndCalculate(targetObj, fieldKey, index=null) {
   const dateVal = targetObj[fieldKey];

   // Identificadores para el popover de Análisis de Tiempos
   const gapId = index !== null ? ('child_gap_' + index) : 'main_gap';
   const versionId = index !== null ? targetObj.child_program_version_id : modalForm.program_version_id;

   // 1. CASO: EL USUARIO BORRÓ LA FECHA
   if (!dateVal) {
       // Si se borró la fecha de inicio, calculamos el fin (esto lo dejará en null también)
       if (fieldKey === 'start_date') {
           calculateEndDate(targetObj);
       }
       // SI EL POPOVER ESTÁ ABIERTO, LO CERRAMOS (no hay fecha base para analizar)
       if (activeGapPreviewId.value === gapId) {
           activeGapPreviewId.value = null;
       }
       return; // Detenemos la ejecución aquí
   }

   // 2. CASO: EL USUARIO INGRESÓ UNA NUEVA FECHA
   const [y, m, d] = dateVal.split('-').map(Number);

   // Validar Mes/Año (Solo si no hay filtros y es nueva edición)
   const shouldValidateMonthYear = !hasActiveFilters.value &&
                                   !currentEdition.value &&
                                   (index === null || index === 0);

   if (shouldValidateMonthYear && (y !== selectedYear.value || m !== selectedMonth.value)) {
     toast.info(`La fecha debe pertenecer al periodo seleccionado (${months.value[selectedMonth.value - 1]} ${selectedYear.value}).`);
       nextTick(() => {
           targetObj[fieldKey] = null;
           if (fieldKey === 'start_date') {
               calculateEndDate(targetObj);
               // Al limpiar por error, también cerramos el popover si estaba abierto
               if (activeGapPreviewId.value === gapId) activeGapPreviewId.value = null;
           }
       });
       return;
   }

   // Validaciones de cronología con hijos anteriores
   if (index !== null && index > 0) {
      const firstChild = modalForm.program_version_children[0];
      if (firstChild.start_date && dateVal < firstChild.start_date) {
        toast.warning(`No puede iniciar antes que el primer módulo.`);
        nextTick(() => { targetObj[fieldKey] = null; targetObj.end_date = null; });
        return;
      }
      const previousChild = modalForm.program_version_children[index - 1];
      if (previousChild.start_date && dateVal < previousChild.start_date) {
        toast.warning(`Orden cronológico inválido.`);
        nextTick(() => { targetObj[fieldKey] = null; targetObj.end_date = null; });
        return;
      }
   }

   // Advertencia de Feriados
   if (holidayDates.value.includes(dateVal)) {
       const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
       const hName = hObj ? hObj.description : 'Feriado';
       toast.warning(`Nota: La fecha seleccionada coincide con un feriado (${hName}).`);
   }

   // 3. SI LA FECHA ES VÁLIDA, RECALCULAR Y ACTUALIZAR
   if (fieldKey === 'start_date') {
       calculateEndDate(targetObj);

       // >>> ACTUALIZAR POPOVER EN TIEMPO REAL SI ESTÁ ABIERTO <<<
       if (activeGapPreviewId.value === gapId) {
           nextTick(() => {
               // Pasamos event en null y forceUpdate en true para forzar el refresh
               toggleGapPreview(null, gapId, versionId, targetObj, false, true);
           });
       }

       // Validación en cascada (aviso si rompe al siguiente)
       if (index !== null && modalForm.program_version_children.length > index + 1) {
         const currentChild = modalForm.program_version_children[index];
         const nextChild = modalForm.program_version_children[index + 1];

         if (currentChild.end_date && nextChild.start_date &&
             currentChild.end_date > nextChild.start_date) {
           toast.warning(
             `Atención: El cambio en "${currentChild.abbreviation}" afecta al módulo siguiente.`,
             { timeout: 4000 }
           );
         }
       }
   }

   // Limpiar siguiente si rompe cronología (Forward check)
   if (fieldKey === 'start_date' && index !== null) {
      const nextIndex = index + 1;
      if (nextIndex < modalForm.program_version_children.length) {
          const nextChild = modalForm.program_version_children[nextIndex];
          if (nextChild.start_date && targetObj.start_date > nextChild.start_date) {
              nextChild.start_date = null;
              nextChild.end_date = null;
              toast.warning(`Se limpió el módulo siguiente porque iniciaba antes que este.`);
          }
      }
  }
}

// REEMPLAZO DEL ARRAY ANTIGUO
const holidayDates = computed(() => {
  // Asegúrate de que 'catalogs.value.catHolidays' exista (array vacío por defecto)
  return (catalogs.value.catHolidays || []).map(h => h.variable_3) // Aquí vienen las fechas 'YYYY-MM-DD'
})
const originalNoteValue = ref('');
function captureOriginalNote(edition) {
  originalNoteValue.value = edition.notes || '';
}


// --- LÓGICA DE PREVISUALIZACIÓN DE CALENDARIO ---
const activePreviewId = ref(null) // Para saber qué popover abrir
const previewItems = ref([])      // La lista de fechas calculadas

function unlinkChildEdition(child){
  child.new = true
  child.edition_id = null
  child.start_date = null  // ← No forzar fecha, dejar que usuario seleccione
  child.end_date = null    // ← También null en vez de ''
  child.cat_day_combination_id = null
  child.cat_hour_combination_id = null
  child.instructor_id = null
  child.instructor_label = ''
  child.global_code = ''
  child.specific_code = ''
}

function isChildComplete(child) {
  return (
    !!child.cat_day_combination_id &&
    !!child.start_date &&
    !!child.end_date &&
    !!child.cat_hour_combination_id
  )
}

/**
 * Helper para limpiar los datos de un hijo/módulo específico
 * Evita repetir este bloque de código varias veces.
 */
function resetChildData(child) {
  child.edition_id = null;
  child.instructor_id = null;
  child.instructor_label = '';
  child.start_date = null;
  child.end_date = null;

  // Flags booleanos
  child.active = false;
  child.expedient = false;
  child.preconfirmation = false;
  child.confirmation = false;
  child.upgrade = false;

  // Restaurar sesiones por defecto si existe la propiedad
  if (child.program_version_sessions) {
    child.sessions = child.program_version_sessions;
  }
}

function onChildEditionChange(edition, child, index) {

  // 1. CASO: Se limpió el select (edition es null o vacío)
  if (!edition || !edition.edition_num_id) {
    resetChildData(child);
    return; // Terminamos aquí
  }

  // 2. VALIDACIÓN HACIA ATRÁS (Hermanos previos)
  // Verificamos que la fecha elegida no sea menor a la de algún módulo anterior
  const previousSiblings = modalForm.program_version_children.slice(0, index);

  const hasBackwardConflict = previousSiblings.some(sibling => {
    // Solo comparamos si ambos tienen fecha
    return sibling.start_date && edition.start_date && sibling.start_date > edition.start_date;
  });

  if (hasBackwardConflict) {
    toast.warning('Cronología inválida: La edición seleccionada inicia antes que un módulo previo.');
    // Como la selección es inválida, limpiamos el campo actual para obligar al usuario a elegir bien
    resetChildData(child);
    return;
  }
  console.log(edition)
  nextTick(() => {
    child.edition_id = edition.edition_num_id;
    child.start_date = edition.start_date ? edition.start_date.slice(0, 10) : null;
    child.end_date = edition.end_date ? edition.end_date.slice(0, 10) : null;

    child.cat_day_combination_id = edition.cat_day_combination_id;
    child.cat_hour_combination_id = edition.cat_hour_combination_id;
    child.instructor_id = edition.instructor_id;
    child.instructor_label = edition.instructor_label || '';
    child.global_code = edition.global_code;
    child.specific_code = edition.specific_code;

    child.active = edition.active === 'Y';
    child.confirmation = edition.confirmation === 'Y';
    child.preconfirmation = edition.preconfirmation === 'Y';
    child.expedient = edition.expedient === 'Y';
    child.sessions = edition.sessions;
  });


  // 4. VALIDACIÓN HACIA ADELANTE (Hermanos posteriores) - NUEVO REQUERIMIENTO
  // Validamos si lo que acabamos de insertar rompe la cronología de los que siguen

  const nextSiblings = modalForm.program_version_children.slice(index + 1);

  nextSiblings.forEach((sibling, i) => {
    // Si el hermano no tiene fecha, no hay conflicto que evaluar
    if (!sibling.start_date || !child.start_date) return;

    // Conflicto: El hermano siguiente empieza ANTES que el actual (que acabamos de poner)
    if (sibling.start_date < child.start_date) {

      if (sibling.edition_id) {
        // A) Es una edición ya vinculada (existente): Solo advertimos
        // Calculamos el índice real visual para el mensaje (index + 1 (actual) + 1 (siguiente) + i)
        const siblingPosition = index + 2 + i;
        toast.warning(`Conflicto de fechas: El módulo en la posición ${siblingPosition} inicia antes que este. Por favor revíselo.`);
      } else {
        // B) Es una edición nueva/draft (sin ID vinculado): La limpiamos automáticamente
        // para mantener la consistencia sin molestar tanto al usuario
        resetChildData(sibling);
        // Opcional: Avisar discretamente que se limpió
        // toast.info(`Se ha reseteado el módulo posterior ${index + 2 + i} por conflicto de fechas.`);
      }
    }
  });
}
function isBlockedByPrevious(index) {
  // 1. La primera fila nunca se bloquea
  if (index === 0) return false

  // 2. Obtenemos todos los hermanos anteriores al índice actual
  const previousSiblings = modalForm.program_version_children.slice(0, index)

  // 3. Verificamos si ALGUNO de los anteriores está incompleto.
  // Usamos .some(): si encuentra al menos uno que !isChildComplete, devuelve true (Bloqueado)
  return previousSiblings.some(sibling => !isChildComplete(sibling))
}

// Helper para cerrar al hacer click fuera (puedes usar el overlay existente o un click-outside)
function closePreview() {
  activePreviewId.value = null
}

// Función CORE que simula el calendario y genera la lista
// Función CORE que simula el calendario y genera la lista
function generatePreviewData(targetObj) {
  const list = []

  // Validaciones iniciales...
  if (!targetObj.start_date || !targetObj.cat_day_combination_id) return []
  const totalSessions = targetObj.sessions || targetObj.program_version_sessions || 0
  if (totalSessions <= 0) return []
  const comboOption = catalogs.value.dayCombinationList.find(c => c.id === targetObj.cat_day_combination_id)
  if (!comboOption) return []
  const allowedDays = getAllowedDaysFromCombo(comboOption)
  if (allowedDays.length === 0) return []

  // Inicio de simulación
  let iterDate = new Date(targetObj.start_date + 'T12:00:00')
  let sessionsCounted = 0
  let safetyLoop = 0

  // El bucle sigue corriendo HASTA completar las sesiones VÁLIDAS requeridas
  while (sessionsCounted < totalSessions && safetyLoop < 1000) {
    safetyLoop++

    const y = iterDate.getFullYear()
    const m = String(iterDate.getMonth() + 1).padStart(2, '0')
    const d = String(iterDate.getDate()).padStart(2, '0')
    const dateString = `${y}-${m}-${d}` // Fecha actual del bucle
    const dayOfWeek = iterDate.getDay() // 0=Dom, 1=Lun...

    const isClassDay = allowedDays.includes(dayOfWeek)

    // Solo nos importa si hoy toca clase (según Lunes-Miércoles, etc)
    if (isClassDay) {
      // AQUÍ ESTÁ LA LÓGICA QUE PIDES:
      // Buscamos si esta fecha exacta es un feriado activo en el catálogo
      const holidayItem = catalogs.value.catHolidays.find(h => h.variable_3 === dateString )

      if (holidayItem) {
        // CASO 1: ES FERIADO
        // Lo agregamos a la lista para que el usuario lo vea visualmente
        list.push({
          date: dateString,
          status: 'holiday',          // Esto activará el color rojo en el template
          desc: holidayItem.description, // Ej: "Viernes Santo"
          sessionNum: '-'             // No lleva número de sesión
        })
        // IMPORTANTE: NO hacemos sessionsCounted++, por lo que el sistema
        // buscará un día más al final para compensar este feriado.
      } else {
        // CASO 2: ES DÍA HÁBIL
        sessionsCounted++ // Aquí sí contamos la sesión
        list.push({
          date: dateString,
          status: 'valid',            // Esto activará el color verde/normal
          desc: 'Sesión Regular',
          sessionNum: sessionsCounted
        })
      }
    }

    // Avanzamos al siguiente día calendario
    iterDate.setDate(iterDate.getDate() + 1)
  }

  return list
}

// Helper simple para nombre de día
function getDayName(dateStr) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const d = new Date(dateStr + 'T00:00:00')
  return days[d.getDay()]
}

// --- NUEVOS HELPERS ---
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Obtiene el índice (0-6) de una fecha string YYYY-MM-DD respetando la zona local
function getDayIndexFromStr(dateStr) {
  if (!dateStr) return -1;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Creamos fecha local (Mes es índice 0 en JS)
  const dateObj = new Date(y, m - 1, d);
  return dateObj.getDay();
}

function calculateEndDate(targetObj) {
  // 1. Validaciones básicas
  if (!targetObj.start_date || !targetObj.cat_day_combination_id) return;

  const totalSessions = targetObj.sessions || targetObj.program_version_sessions || 0;
  if (totalSessions <= 0) {
    toast.warning("No hay sesiones configuradas para calcular.");
    return;
  }

  const comboOption = catalogs.value.dayCombinationList.find(
    c => c.id === targetObj.cat_day_combination_id
  );
  if (!comboOption) {
    toast.warning("Combinación de días no encontrada.");
    return;
  }

  // 2. Parsing Robusto usando la nueva función unificada
  const allowedDays = getAllowedDaysFromCombo(comboOption);

  if (allowedDays.length === 0) {
    toast.error("Error en configuración de días del catálogo.");
    return;
  }

  // 3. Validación de coherencia Día vs Combo
  const startDayIdx = getDayIndexFromStr(targetObj.start_date);

  if (!allowedDays.includes(startDayIdx)) {
    const dayName = dayNames[startDayIdx];
    toast.warning(
      `La fecha seleccionada cae en ${dayName} y no corresponde a la combinación: ${comboOption.description}.`
    );
    nextTick(() => {
      targetObj.start_date = null;
      targetObj.end_date = null;
    });
    return;
  }

  // 4. Simulación de calendario con T12:00:00 (evitar problemas de zona horaria)
  let iterDate = new Date(targetObj.start_date + 'T12:00:00');
  let sessionsCounted = 0;
  let safetyLoop = 0;
  let calculatedEndDate = null;

  while (sessionsCounted < totalSessions && safetyLoop < 1500) {
    safetyLoop++;

    const y = iterDate.getFullYear();
    const m = String(iterDate.getMonth() + 1).padStart(2, '0');
    const d = String(iterDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    const dayOfWeek = iterDate.getDay();

    const isClassDay = allowedDays.includes(dayOfWeek);
    const isHoliday = holidayDates.value.includes(dateString);

    if (isClassDay && !isHoliday) {
      sessionsCounted++;
      if (sessionsCounted === totalSessions) {
        calculatedEndDate = dateString;
        break;
      }
    }

    iterDate.setDate(iterDate.getDate() + 1);
  }

  // 5. Validación de resultado
  if (safetyLoop >= 1500) {
    toast.error("No se pudo calcular la fecha fin: demasiadas iteraciones. Revise configuración.");
    targetObj.end_date = null;
    return;
  }

  if (calculatedEndDate) {
    nextTick(() => {
      targetObj.end_date = calculatedEndDate;
    });
  } else {
    toast.error("No se pudo calcular fecha fin. Verifique días/feriados.");
  }
}
function addAttachmentProgram(){
  modalForm.attachments.push({
    program_version_attachment_id: null,
  })
}
// Computed para aplanar todos los items (necesario para el componente)
const allScheduleItems = computed(() => {
  if (hasActiveFilters.value) {
    return historyList.value || []
  }
  return schedules.value.flatMap(week => week.items || [])
})

// Función para aplicar filtros de columna
function applyColumnFilters() {
  // Los filtros ya están aplicados reactivamente gracias al v-model
  // Esta función se puede usar para acciones adicionales si es necesario
  console.log('Filtros aplicados:', columnFilters)
}

// Modificar el computed filteredSchedules para usar los nuevos filtros
const filteredSchedules = computed(() => {
  if (!schedules.value || schedules.value.length === 0) return []

  // Verificar si hay algún filtro activo
  const hasFilter = Object.values(columnFilters).some(arr => arr.length > 0)
  if (!hasFilter) return schedules.value

  return schedules.value.map(week => {
    const filteredItems = (week.items || []).filter(item => {
      // Helper para obtener valor comparable
      const getValue = (val) => (val === null || val === undefined ? '(Vacío)' : String(val).trim())

      // 1. Programa
      if (columnFilters.program.length > 0) {
        if (!columnFilters.program.includes(getValue(item.program_abreviature))) return false
      }

      // 2. Detalle (combina varios campos)
      if (columnFilters.detail.length > 0) {
        const detailValue = `${item.version_code} ${item.cat_segment}`
        if (!columnFilters.detail.some(filter => detailValue.includes(filter))) return false
      }

      // 3. Línea
      if (columnFilters.line.length > 0) {
        if (!columnFilters.line.includes(getValue(item.program_line_business))) return false
      }

      // 3b. Línea de Negocio
      if (columnFilters.business_line.length > 0) {
        if (!columnFilters.business_line.includes(item.business_line_id)) return false
      }

      // 4. Tipado
      if (columnFilters.type.length > 0) {
        if (!columnFilters.type.includes(getValue(item.cat_course_category_label))) return false
      }

      // 5. Segmento
      if (columnFilters.segment.length > 0) {
        if (!columnFilters.segment.includes(getValue(item.cat_segment))) return false
      }

      // 6. Docente
      if (columnFilters.instructor.length > 0) {
        if (!columnFilters.instructor.includes(getValue(item.instructor))) return false
      }

      // 7. Notas
      if (columnFilters.notes.length > 0) {
        if (!columnFilters.notes.includes(getValue(item.notes))) return false
      }

      // 8. Código de Edición
      if (columnFilters.edition_code.length > 0) {
        const codeValue = `${item.global_code} ${item.specific_code}`.trim()
        if (!columnFilters.edition_code.some(filter => codeValue.includes(filter))) return false
      }

      return true
    })

    return { ...week, items: filteredItems }
  })
})


// =========================================
// LOGICA LOCALSTORAGE (PERSISTENCIA)
// =========================================
const STORAGE_KEY = 'crm_schedule_state_v1'

function saveState() {
  try {
    const state = {
      // 1. Guardamos el estado del calendario
      calendar: {
        month: selectedMonth.value,
        year: selectedYear.value
      },
      // 2. Guardamos el estado de los filtros (si hay)
      history: {
        activeFilters: activeFilters, // Lo que se envía al backend
        filterForm: filterForm        // Para que el modal recuerde los inputs visuales
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Error guardando state', e)
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)

      // A. Restaurar Calendario
      if (parsed.calendar) {
        selectedMonth.value = parsed.calendar.month || (new Date().getMonth() + 1)
        selectedYear.value = parsed.calendar.year || new Date().getFullYear()
      }

      // B. Restaurar Filtros (Modo Histórico)
      if (parsed.history) {
        // Restauramos activeFilters (esto activa hasActiveFilters automáticamente)
        if (parsed.history.activeFilters) {
          Object.assign(activeFilters, parsed.history.activeFilters)
        }
        // Restauramos el formulario del modal para que coincida
        if (parsed.history.filterForm) {
          Object.assign(filterForm, parsed.history.filterForm)
        }
      }
    }
  } catch (e) {
    console.error('Error cargando state', e)
  }
}
const searchEditionsFiltered = async (q, child, index) => {
  const response = await editionService.editionCaller({
    q,
    program_version_id: child.child_program_version_id,
    ...((!hasActiveFilters.value && child.new) ? {
      month: selectedMonth.value,
      year: selectedYear.value
    } : {})
  });

  if (!Array.isArray(response)) return [];

  let minDateLimit = null;
  let maxDateLimit = null;

if (index > 0) {
  const prevDates = modalForm.program_version_children
    .slice(0, index)
    .map(item => item.start_date)
    .filter(Boolean)
    .map(d => d.slice(0, 10)); // ✅ Normalizar también aquí

  if (prevDates.length > 0) {
    prevDates.sort();
    minDateLimit = prevDates[prevDates.length - 1];
  }
}

if (index !== 0) {
  const nextDates = modalForm.program_version_children
    .slice(index + 1)
    .filter(item => item.edition_id && item.start_date) // ✅ Solo los ya vinculados
    .map(item => item.start_date.slice(0, 10))          // ✅ Normalizar formato
    .filter(Boolean);

  if (nextDates.length > 0) {
    nextDates.sort();
    maxDateLimit = nextDates[0];
  }
}

  const filteredResponse = response.filter(edition => {
    if (!edition.start_date) return false;

    // ✅ NORMALIZAR a YYYY-MM-DD antes de comparar
    const editionDate = edition.start_date.slice(0, 10);
    debugger
    if (minDateLimit && editionDate < minDateLimit) return false;
    if (maxDateLimit && editionDate > maxDateLimit) return false;

    if (
      !currentEdition.value &&
      !hasActiveFilters.value &&
      index === 0 &&
      child.new
    ) {
      const editionMonth = parseInt(editionDate.slice(5, 7));
      const editionYear  = parseInt(editionDate.slice(0, 4));
      if (editionMonth !== selectedMonth.value || editionYear !== selectedYear.value) {
        return false;
      }
    }

    return true;
  });

  return filteredResponse;
}

// --- HISTORIAL GLOBAL ---
const showHistoryModal = ref(false)
const globalHistoryList = ref([])
const isLoadingHistory = ref(false)

async function openGlobalHistory() {
  await openAuditHistory(null)
}
// Variable reactiva para controlar la dirección ('bottom' = normal, 'top' = hacia arriba)
const popoverPosition = ref('bottom');

// Actualizar la firma de la función para aceptar 'event'
function toggleSchedulePreview(uniqueId, targetObj, event) {
  // Si ya está abierto y es el mismo, lo cerramos
  if (activePreviewId.value === uniqueId) {
    activePreviewId.value = null;
    return;
  }

  // CALCULO DE POSICIÓN
  // Verificamos espacio disponible abajo
  if (event && event.currentTarget) {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const estimatedHeight = 300; // Altura estimada máxima del popover (puedes ajustar esto)

    // Si hay menos de 300px abajo, lo mandamos para arriba
    if (spaceBelow < estimatedHeight) {
      popoverPosition.value = 'top';
    } else {
      popoverPosition.value = 'bottom';
    }
  }

  // Generar la data y abrir
  previewItems.value = generatePreviewData(targetObj);
  activePreviewId.value = uniqueId;
}

const isLoadingExtraInfo = ref(false)

// --- LÓGICA DE GAP ANALYSIS (Timeline Genérico) ---
const activeGapPreviewId = ref(null)
const gapPreviewData = ref([])
const isLoadingGap = ref(false)

/**
 * Abre el popover de GAPS.
 * Funciona para: Formulario (Padre/Hijo) y Listado (Click Derecho).
 */
async function toggleGapPreview(event, uniqueId, programVersionId, contextObj, isReadOnly = false, forceUpdate = false) {
  // Prevenir menú nativo si es click derecho
  if (event && event.type === 'contextmenu') {
    event.preventDefault();
  }

  // Si ya está abierto y NO es una actualización forzada, lo cerramos
  if (activeGapPreviewId.value === uniqueId && !forceUpdate) {
    activeGapPreviewId.value = null
    return
  }

  // 1. Posicionamiento inteligente (solo re-calculamos si viene de un click directo)
  if (event && event.currentTarget) {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    // Si hay poco espacio abajo (<300px), abrir hacia arriba
    popoverPosition.value = spaceBelow < 300 ? 'top' : 'bottom';
  }

  activeGapPreviewId.value = uniqueId
  gapPreviewData.value = []
  isLoadingGap.value = true

  try {
    // 2. Llamada al SP (que ahora trae horarios)
    const responseItems = await editionService.editionExtraInfoCaller({
      program_version_id: programVersionId
    })

    // 3. Preparar el objeto "Actual" según de dónde venga el click
    let currentItem = contextObj;

    if (isReadOnly) {
        // SI VIENE DE LA TABLA (Click Derecho):
        // Mapeamos los datos de la fila 'e' a lo que espera el calculador
        currentItem = {
            ...contextObj,
            edition_id: contextObj.edition_num_id, // Para excluirse a sí mismo
            start_date: contextObj.start_date,
            global_code: contextObj.global_code,
            // Intentamos sacar los labels de horarios de la fila
            day_combination_label: contextObj.day_combination_label ||
                                   (contextObj.schedules?.[0]?.day_combination_label) || '—',
            hour_combination_label: contextObj.hour_combination_label ||
                                    (contextObj.schedules?.[0]?.hour_combination_label) || '—'
        }
    }

    // 4. Calcular
    gapPreviewData.value = calculateGapData(responseItems || [], currentItem)

  } catch (e) {
    console.error("Error timeline:", e)
    toast.error("No se pudo cargar la proyección")
  } finally {
    isLoadingGap.value = false
  }
}

/**
 * CORE: Cálculo de Lista Completa
 */
function calculateGapData(historicalList, currentObj) {
  if (!currentObj.start_date) return []

  const msPerDay = 1000 * 60 * 60 * 24
  const targetDate = new Date(currentObj.start_date + 'T12:00:00')

  // ID para excluir (si estamos editando)
  const currentId = currentObj.edition_id || (currentEdition.value?.edition_num_id)

  // A. Preparar Historial (Data del SP)
  let timeline = historicalList
    .filter(e => e.active === 'Y' && e.edition_num_id !== currentId)
    .map(e => ({
      ...e,
      dateObj: new Date(e.start_date_eff),
      type: 'history',
      // Mapeamos los campos nuevos de tu SP
      daysLabel: e.cat_day_combination || '—',
      hoursLabel: e.cat_hour_combination || '—'
    }))

  // B. Preparar Item Actual (Selección / Fila)
  // Si no viene pre-seteado (caso formulario), buscamos en catálogos
  let myDays = currentObj.day_combination_label;
  let myHours = currentObj.hour_combination_label;

  if (!myDays && currentObj.cat_day_combination_id) {
      const d = catalogs.value.dayCombinationList.find(x => x.id === currentObj.cat_day_combination_id)
      if (d) myDays = d.description
  }
  if (!myHours && currentObj.cat_hour_combination_id) {
      const h = catalogs.value.hourCombinationList.find(x => x.id === currentObj.cat_hour_combination_id)
      if (h) myHours = h.description
  }

  const newItem = {
    global_code: currentObj.global_code || 'NUEVA',
    start_date_eff: currentObj.start_date,
    dateObj: targetDate,
    type: 'current',
    active: 'Y',
    daysLabel: myDays || '—',
    hoursLabel: myHours || '—'
  }

  timeline.push(newItem)

  // C. Ordenar y Calcular Gaps
  timeline.sort((a, b) => a.dateObj - b.dateObj)
  const currentIndex = timeline.findIndex(t => t.type === 'current')

  return timeline.map((item, index) => {
    let gapInfo = null

    if (index === currentIndex - 1) {
       const diff = Math.floor((newItem.dateObj - item.dateObj) / msPerDay)
       gapInfo = { label: `${diff} días después`, color: diff < 30 ? 'text-warning' : 'text-success' }
    }
    if (index === currentIndex + 1) {
       const diff = Math.floor((item.dateObj - newItem.dateObj) / msPerDay)
       gapInfo = { label: `${diff} días antes`, color: diff < 30 ? 'text-danger' : 'text-info' }
    }

    return { ...item, gapInfo }
  })
}
</script>

