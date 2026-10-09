<template>
  <div class="ds-page ed-page">

    <!-- ══════════════ ENCABEZADO ══════════════ -->
    <header class="ds-head">
      <div class="ds-head-titles">
        <!-- El título recarga el mes: atajo histórico de Producto, se conserva. -->
        <h1 class="ds-title ed-title-reload" title="Recargar" @click="reloadSchedule()">Cronograma</h1>
        <p class="ds-sub">
          <template v-if="isTableLoading">Cargando ediciones…</template>
          <template v-else-if="hasActiveFilters">
            Resultados históricos — <b>{{ historyList.length }}</b> {{ historyList.length === 1 ? 'edición' : 'ediciones' }}
          </template>
          <template v-else>
            {{ months[selectedMonth - 1] }} {{ selectedYear }} — <b>{{ allScheduleItems.length }}</b> ediciones en {{ schedules.filter(w => w.items?.length).length }} semanas
            <template v-if="hasColumnFilters"> · {{ filteredSchedules.flatMap(w => w.items || []).length }} con los filtros de columna</template>
          </template>
        </p>
      </div>

      <!-- ACADEMICA solo ve Historial; el resto de acciones es de Producto. -->
      <div class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-ghost" @click="openGlobalHistory">
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Historial
        </button>
        <button v-if="!isAcademica" type="button" class="btn-exec btn-exec-outline ed-toggle" :class="{ 'is-on': hasActiveFilters }" @click="showFilterModal = true">
          <i class="fa-solid fa-filter" aria-hidden="true"></i> Filtros
          <span v-if="hasActiveFilters" class="ed-dot" aria-hidden="true"></span>
        </button>
        <button v-if="!isAcademica" type="button" class="btn-exec btn-exec-outline ed-toggle" :class="{ 'is-on': hasColumnFilters }" @click="showMetaModal = true">
          <i class="fa-solid fa-table-columns" aria-hidden="true"></i> Resumen
          <span v-if="hasColumnFilters" class="ed-dot" aria-hidden="true"></span>
        </button>
        <button v-if="!isAcademica" type="button" class="btn-exec btn-exec-outline" @click="isCompact = !isCompact">
          <i v-if="isCompact" class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
          <i v-else class="fa-solid fa-down-left-and-up-right-to-center" aria-hidden="true"></i>
          {{ isCompact ? 'Normal' : 'Compacto' }}
        </button>
        <button v-if="!hasActiveFilters && $hasRole(['ADMIN', 'PRODUCTO'])" type="button" class="btn-exec btn-exec-primary" @click="openEditModal(null)">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva edición
        </button>
      </div>
    </header>

    <!-- ══════════════ FILTROS ══════════════ -->
    <!-- ACADEMICA: período, vista y línea en una sola barra. -->
    <section v-if="isAcademica && !hasActiveFilters" class="ed-toolbar" aria-label="Filtros del cronograma">
      <div class="ds-field">
        <label class="ds-label" for="ed-month-acad">Período</label>
        <div class="ed-period">
          <button type="button" class="btn-icon btn-icon-sm" title="Mes anterior" aria-label="Mes anterior" @click="changeMonth(-1)">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <select id="ed-month-acad" v-model.number="selectedMonth" @change="fetchSchedule" class="ds-input ed-select ed-select--month">
            <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
          </select>
          <select v-model.number="selectedYear" @change="fetchSchedule" class="ds-input ed-select ed-select--year" aria-label="Año">
            <option :value="2024">2024</option>
            <option :value="2025">2025</option>
            <option :value="2026">2026</option>
          </select>
          <button type="button" class="btn-icon btn-icon-sm" title="Mes siguiente" aria-label="Mes siguiente" @click="changeMonth(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="ds-field">
        <span class="ds-label">Vista</span>
        <div class="ed-period">
          <button
            type="button" class="btn-exec btn-exec-outline btn-sm ed-toggle"
            :class="{ 'is-on': onlyCursos !== 'all' }"
            @click="cycleVista()"
          >
            <i class="fa-solid fa-book-open" aria-hidden="true"></i>
            {{ onlyCursos === 'all' ? 'Todos' : onlyCursos === 'courses' ? 'Solo cursos' : 'Solo programas' }}
            <span v-if="onlyCursos !== 'all'" class="ed-dot" aria-hidden="true"></span>
          </button>
          <button
            type="button" class="btn-exec btn-exec-outline btn-sm ed-toggle"
            :class="{ 'is-on': onlyActivos }"
            @click="onlyActivos = !onlyActivos"
          >
            <i class="fa-regular fa-clock" aria-hidden="true"></i>
            Activo
            <span v-if="onlyActivos" class="ed-dot" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="ds-field ed-field-line">
        <span class="ds-label">Línea de negocio</span>
        <MultiSelect
          v-model="columnFilters.business_line"
          :items="catalogs.businessLineList"
          label-key="description"
          value-key="id"
          placeholder="Línea…"
        />
      </div>
    </section>

    <!-- Producto: período y línea; en modo histórico, los chips de filtros. -->
    <section v-if="!isAcademica" class="ed-toolbar" aria-label="Filtros del cronograma">
      <template v-if="!hasActiveFilters">
        <div class="ds-field">
          <label class="ds-label" for="ed-month">Período</label>
          <div class="ed-period">
            <button type="button" class="btn-icon btn-icon-sm" title="Mes anterior" aria-label="Mes anterior" @click="changeMonth(-1)">
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <select id="ed-month" v-model.number="selectedMonth" @change="fetchSchedule" class="ds-input ed-select ed-select--month">
              <option v-for="(month, index) in months" :key="index" :value="index + 1">{{ month }}</option>
            </select>
            <select v-model.number="selectedYear" @change="fetchSchedule" class="ds-input ed-select ed-select--year" aria-label="Año">
              <option :value="2024">2024</option>
              <option :value="2025">2025</option>
              <option :value="2026">2026</option>
            </select>
            <button type="button" class="btn-icon btn-icon-sm" title="Mes siguiente" aria-label="Mes siguiente" @click="changeMonth(1)">
              <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="ds-field ed-field-line">
          <span class="ds-label">Línea de negocio</span>
          <MultiSelect
            v-model="columnFilters.business_line"
            :items="catalogs.businessLineList"
            label-key="description"
            value-key="id"
            placeholder="Todas…"
          />
        </div>
      </template>
      <template v-else>
        <div class="ed-chips">
          <BaseFilterChips :items="formattedActiveFilters" @remove="removeFilter($event)" @clear-all="clearAllFilters" />
        </div>
      </template>
    </section>

    <!-- ══════════════ TABLA DE SEMANAS ══════════════ -->
    <section class="ds-panel ed-table-panel">
      <div class="ds-table-scroll ed-scroll">
        <table class="ds-table ds-table--densa ed-grid" :class="{ 'is-compact': isCompact }">
          <thead>
            <!-- FILA 1: Grupos principales -->
            <tr class="thead-group">
              <th class="th-act" rowspan="2"><span class="visually-hidden">Acciones</span></th>
              <th v-if="canSeeClassroomLinks" :colspan="CLASSROOM_LINKS.length" class="th-group th-group-e">Académica</th>
              <th :colspan="isCompact ? 5 : 2" class="th-group th-group-a">Identificación</th>
              <th :colspan="isCompact ? 6 : 4" class="th-group th-group-b">Cronograma</th>
              <th colspan="3" class="th-group th-group-c">Seguimiento</th>
              <th colspan="2" class="th-group th-group-d">Referencia</th>
            </tr>

            <!-- FILA 2: Columnas individuales -->
            <tr class="thead-sub">
              <!-- Académica -->
              <template v-if="canSeeClassroomLinks">
                <th v-for="link in CLASSROOM_LINKS" :key="link.field" class="ts ts-e text-center ed-w-link">
                  <i :class="link.icon" :style="{ color: link.headerColor }" aria-hidden="true"></i> {{ link.header }}
                </th>
              </template>
              <!-- Identificación -->
              <th class="ts ts-a">Programa</th>
              <th class="ts ts-a" v-if="!isCompact">Detalle</th>
              <th class="ts ts-a" v-if="isCompact">Línea</th>
              <th class="ts ts-a" v-if="isCompact">Tipado</th>
              <th class="ts ts-a text-center" v-if="isCompact">Seg.</th>
              <th class="ts ts-a text-center" v-if="isCompact">D.A.</th>

              <!-- Cronograma -->
              <th class="ts ts-b text-center">F. inicio</th>
              <th class="ts ts-b text-center" v-if="isCompact">D.P.</th>
              <th class="ts ts-b text-center">F. fin</th>
              <th class="ts ts-b" v-if="isCompact">Días clase</th>
              <th class="ts ts-b">Horario</th>
              <th class="ts ts-b">Docente</th>

              <!-- Seguimiento -->
              <th class="ts ts-c text-center ed-w-ficha">Ficha / mejora</th>
              <th class="ts ts-c text-center ed-w-confirm">Confirm.</th>
              <th class="ts ts-c text-center ed-w-met" title="Nueva Metodología">N. met.</th>

              <!-- Referencia -->
              <th class="ts ts-d">Observación</th>
              <th class="ts ts-d">Edición</th>
            </tr>

            <!-- FILA 3: Filtros — toda columna filtra desde aca, ningun
                 control vive en el encabezado. Solo aplica a la vista
                 mensual: en modo historico manda el modal de filtros. -->
            <tr v-if="!hasActiveFilters" class="thead-filter">
              <td class="tf"></td><!-- acciones: el th de arriba solo abarca 2 filas -->

              <template v-if="canSeeClassroomLinks">
                <td v-for="link in CLASSROOM_LINKS" :key="'f-' + link.field" class="tf"></td>
              </template>

              <td class="tf">
                <ColumnFilterDropdown column-label="Programa" :all-items="allScheduleItems" :value-extractor="(item) => item.program_abreviature" v-model="columnFilters.program" />
              </td>
              <td class="tf" v-if="!isCompact">
                <ColumnFilterDropdown column-label="Detalle" :all-items="allScheduleItems" :value-extractor="(item) => `${item.version_code} ${item.cat_segment}`" v-model="columnFilters.detail" />
              </td>
              <td class="tf" v-if="isCompact">
                <ColumnFilterDropdown column-label="Línea" :all-items="allScheduleItems" :value-extractor="(item) => item.business_line_label || item.program_line_business" v-model="columnFilters.line" />
              </td>
              <td class="tf" v-if="isCompact">
                <ColumnFilterDropdown column-label="Tipado" :all-items="allScheduleItems" :value-extractor="(item) => item.cat_course_category_label" v-model="columnFilters.type" />
              </td>
              <td class="tf" v-if="isCompact">
                <ColumnFilterDropdown column-label="Seg" :all-items="allScheduleItems" :value-extractor="(item) => item.cat_segment" v-model="columnFilters.segment" />
              </td>
              <td class="tf" v-if="isCompact"></td><!-- D.A. -->

              <td class="tf">
                <BaseDatePicker v-model="columnFilters.start_date" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="F. Inicio..." />
              </td>
              <td class="tf" v-if="isCompact"></td><!-- D.P. -->
              <td class="tf">
                <BaseDatePicker v-model="columnFilters.end_date" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="F. Fin..." />
              </td>
              <td class="tf" v-if="isCompact"></td><!-- DÍAS CLASE -->
              <td class="tf"></td><!-- HORARIO -->
              <td class="tf">
                <ColumnFilterDropdown column-label="Docente" :all-items="allScheduleItems" :value-extractor="(item) => item.instructor" v-model="columnFilters.instructor" />
              </td>

              <td class="tf"></td><!-- FICHA / MEJORA -->
              <td class="tf"></td><!-- CONFIRM. -->
              <td class="tf"></td><!-- N. MET. -->

              <td class="tf">
                <ColumnFilterDropdown column-label="Observación" :all-items="allScheduleItems" :value-extractor="(item) => item.notes" v-model="columnFilters.notes" />
              </td>
              <td class="tf">
                <ColumnFilterDropdown column-label="Código Edición" :all-items="allScheduleItems" :value-extractor="(item) => `${item.global_code} ${item.specific_code}`" v-model="columnFilters.edition_code" />
              </td>
            </tr>
          </thead>

          <!-- ── TBODY: Vista Mensual ── -->
          <tbody v-if="!hasActiveFilters">
            <template v-if="isTableLoading">
              <tr v-for="n in 8" :key="'sk-'+n" class="skeleton-row">
                <td :colspan="tableColCount">
                  <span class="ds-skel" :style="{ width: (40 + (n * 17) % 45) + '%' }"></span>
                </td>
              </tr>
            </template>
            <template v-else>
            <template v-for="week in filteredSchedules" :key="week.schedule">
              <tr v-if="week.items.length > 0" class="week-header-row" :class="{ 'is-collapsed': !week.isOpen }" @click="week.isOpen = !week.isOpen">
                <td :colspan="tableColCount" class="week-header-cell">
                  <div class="week-header-inner">
                    <svg class="week-chevron" :class="{ 'week-chevron-open': week.isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    <span class="week-label">Semana {{ numeroDeSemana(week.schedule) }}</span>
                    <span class="ds-chip week-badge">{{ week.items.length }} ediciones</span>
                  </div>
                </td>
              </tr>

              <tr
                v-for="e in week.items"
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
                  <button v-if="!isAcademica" class="action-btn action-btn-audit" @click.stop="openAuditHistory(e.edition_num_id)" title="Historial de cambios" aria-label="Historial de cambios">
                    <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
                  </button>
                  <button :class="['action-btn', (e.tree_detail.length == 0 && e.program_type != 'Curso') ? 'action-btn-neutral' : 'action-btn-tree']" @click.stop="openTreeModal(e)" title="Árbol" aria-label="Árbol">
                   <i class="fa-solid fa-book-bookmark" aria-hidden="true"></i>
                  </button>
                  <button v-if="$hasRole(['ADMIN', 'PRODUCTO'])" class="action-btn" :class="e.program_type === 'Curso' ? 'action-btn-edit' : 'action-btn-hier'" @click.stop="openEditModal(e)" title="Editar" aria-label="Editar">
                    <i v-if="e.program_type === 'Curso'"  class="fa-solid fa-file-pen" aria-hidden="true"></i>
                    <i v-else class="fa-solid fa-sitemap" aria-hidden="true"></i>
                  </button>
                </div>
              </td>

                <!-- ACADÉMICA -->
                <template v-if="canSeeClassroomLinks">
                  <td
                    v-for="link in CLASSROOM_LINKS"
                    :key="link.field"
                    class="td-e td-e-lac"
                    :class="{ 'td-e-editing': isEditingLink(e, link.field) }"
                  >
                    <template v-if="e.program_type === 'Curso'">
                      <div v-if="isEditingLink(e, link.field)" class="lac-inline-edit">
                        <input
                          ref="linkInputEl"
                          class="lac-inline-input"
                          v-model="editingLink.value"
                          :placeholder="link.placeholder"
                          type="url"
                          @keyup.enter="saveEditLink(e)"
                          @keyup.escape="cancelEditLink()"
                        />
                        <button class="lac-inline-btn lac-inline-btn--save" @click.stop="saveEditLink(e)" :disabled="savingLinkId === e.edition_num_id" title="Guardar (Enter)" aria-label="Guardar link">
                          <i :class="savingLinkId === e.edition_num_id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'" aria-hidden="true"></i>
                        </button>
                        <button class="lac-inline-btn lac-inline-btn--cancel" @click.stop="cancelEditLink()" title="Cancelar (Esc)" aria-label="Cancelar edición">
                          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                      </div>
                      <div v-else class="lac-chip" :class="[link.chipClass, { 'lac-chip--no-link': !e[link.field] }]">
                        <i :class="[link.icon, 'lac-chip-icon']" aria-hidden="true"></i>
                        <div class="lac-chip-actions">
                          <button class="lac-chip-btn lac-chip-btn--edit" @click.stop="startEditLink(e, link.field)" :title="`Editar link de ${link.label}`" :aria-label="`Editar link de ${link.label}`">
                            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                          </button>
                          <a v-if="e[link.field]" :href="e[link.field]" target="_blank" class="lac-chip-btn lac-chip-btn--go" :title="`Abrir ${link.label}`" :aria-label="`Abrir ${link.label}`">
                            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                          </a>
                          <span v-else class="lac-chip-btn lac-chip-btn--go lac-chip-btn--empty" title="Sin link configurado">
                            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                          </span>
                        </div>
                      </div>
                    </template>
                    <span v-else class="ed-muted">—</span>
                  </td>
                </template>

                <!-- IDENTIFICACIÓN -->
                <td class="td-a td-prog">
                  <div class="prog-name">
                    <span class="prog-link" @click="filterDirectly({ program_version_id: e.program_version_id, program_version_label: e.program_abreviature })">
                      <span v-if="!isCompact">{{ e.program_abreviature || '—' }}</span>
                      <div v-if="isCompact" class="text-truncate ed-trunc-prog" :title="e.program_abreviature">{{ e.program_abreviature || '—' }}</div>
                    </span>
                  </div>
                  <div class="prog-sub ed-sub" v-if="!isCompact">
                    <span class="ed-mono">{{ e.version_code }}</span>&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                    <span class="float-end">Seg: {{ e.cat_segment }} {{ e.cat_course_category_alias ? ('| ' + e.cat_course_category_label) : '' }}</span>
                  </div>
                </td>

                <td class="td-a ed-w-detail" v-if="!isCompact">
                  <div class="ed-sub">{{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}</div>
                  <div class="ed-sub">{{ (e.business_line_label || e.program_line_business) ? 'Línea: ' + (e.business_line_label || e.program_line_business) : '—' }}</div>
                </td>

                <td class="td-a ed-w-line" v-if="isCompact">
                  {{ e.business_line_label || e.program_line_business }}&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                </td>
                <td class="td-a text-center" v-if="isCompact">
                  <span class="tipo-tag">{{ e.cat_course_category_label }}</span>
                </td>
                <td class="td-a text-center" v-if="isCompact">
                  <span class="seg-pill" :class="'seg-' + (e.cat_segment || '').toLowerCase()">{{ e.cat_segment }}</span>
                </td>
                <td class="td-a text-center ed-mono ed-sub" v-if="isCompact">{{ e.calc_da }}</td>

                <!-- CRONOGRAMA -->
                <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeGapPreviewId === ('week_' + e.edition_num_id) ? 1060 : 'inherit' }">
                  <div class="date-link" title="Click derecho: proyección"
                    @click.stop="filterDirectly({ date_from: e.start_date, date_to: e.start_date, date_range: 'true' })"
                    @contextmenu.prevent.stop="toggleGapPreview($event, 'week_' + e.edition_num_id, e.program_version_id, e, true)"
                  >{{ formatDate(e.start_date) }}</div>
                  <div class="ed-sub" v-if="!isCompact">
                    {{ 'CA: ' + e.calc_da || 0 }}
                    <span class="float-end">{{ 'CP: ' + e.calc_dp || 0 }}</span>
                  </div>
                  <!-- GAP POPOVER -->
                  <div v-if="activeGapPreviewId === ('week_' + e.edition_num_id)" class="schedule-preview-popover pop--w360" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                    <div class="popover-header-exec">
                      <span>Proyección: {{ e.program_abreviature }}</span>
                      <button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activeGapPreviewId = null">&times;</button>
                    </div>
                    <div class="popover-content">
                      <GapTimeline :items="gapPreviewData" :loading="isLoadingGap" :format-date="formatDate" />
                    </div>
                  </div>
                  <div v-if="activeGapPreviewId === ('week_' + e.edition_num_id)" class="click-overlay" @click="activeGapPreviewId = null"></div>
                </td>

                <td class="td-b text-center ed-mono ed-sub" v-if="isCompact">{{ e.calc_dp }}</td>

                <td class="td-b text-center">
                  <div class="ed-mono ed-cell-sm">{{ formatDate(e.end_date) }}</div>
                </td>

                <td class="td-b ed-cell-sm" v-if="isCompact">{{ !e.schedules ? '' : e.schedules[0].day_combination_label }}</td>

                <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }">
                  <div v-if="!e.schedules || e.schedules.length === 0" class="ed-sub">—</div>
                  <div v-else-if="e.schedules.length === 1">
                    <div class="ed-strong-sm" v-if="!isCompact">{{ e.schedules[0]?.day_combination_label || '—' }}</div>
                    <div class="ed-sub">{{ e.schedules[0]?.hour_combination_label }}</div>
                  </div>
                  <div v-else-if="!isCompact" class="schedule-dropdown-wrapper">
                    <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                      <div>
                        <div class="ed-strong-sm">{{ e.schedules[0].day_combination_label }}</div>
                        <div class="ed-sub text-truncate ed-trunc-90">{{ e.schedules[0].hour_combination_label }}</div>
                      </div>
                      <span class="ds-pill info">+{{ e.schedules.length - 1 }}</span>
                    </div>
                    <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover">
                      <div class="popover-header-sm">Horarios ({{ e.schedules.length }})<button type="button" class="btn-close-xs" aria-label="Cerrar" @click.stop="activeScheduleDropdown = null">&times;</button></div>
                      <div class="popover-body-sm">
                        <div v-for="(sch, sIdx) in e.schedules" :key="sIdx" class="schedule-item">
                          <div class="ed-schedule-day">{{ sch.day_combination_label }}</div>
                          <div class="ed-sub">{{ sch.hour_combination_label }}</div>
                        </div>
                      </div>
                    </div>
                    <div v-if="activeScheduleDropdown === e.edition_num_id" class="click-overlay" @click.stop="activeScheduleDropdown = null"></div>
                  </div>
                </td>

                <td class="td-b ed-w-instr">
                  <div class="ed-cell-sm text-truncate ed-trunc-160" :title="e.instructor">{{ e.instructor || '—' }}</div>
                </td>

                <!-- SEGUIMIENTO -->
                <td class="td-c text-center">
                  <template v-if="!isAcademica">
                    <label class="exec-switch scale-75" title="Ficha / Expediente">
                      <input type="checkbox" v-model="e.expedient" @change="updateQuickStatus(e, 'expedient')" :disabled="!$hasRole(['ADMIN', 'PRODUCTO'])" /><span></span>
                    </label>
                    <label class="exec-switch scale-75" title="Mejora / Upgrade">
                      <input type="checkbox" v-model="e.upgrade" @change="updateQuickStatus(e, 'upgrade')" /><span></span>
                    </label>
                  </template>
                  <template v-else>
                    <span class="status-dot-ro" :class="e.expedient ? 'dot-ro-on' : 'dot-ro-off'" title="Ficha / Expediente"></span>
                    <span class="status-dot-ro" :class="e.upgrade ? 'dot-ro-on' : 'dot-ro-off'" title="Mejora / Upgrade"></span>
                  </template>
                </td>
                <td class="td-c text-center">
                  <template v-if="!isAcademica">
                    <label class="exec-switch scale-75" title="Pre-Confirmación">
                      <input type="checkbox" v-model="e.preconfirmation" @change="updateQuickStatus(e, 'preconfirmation')" /><span></span>
                    </label>
                    <label class="exec-switch scale-75" title="Confirmación">
                      <input type="checkbox" v-model="e.confirmation" @change="updateQuickStatus(e, 'confirmation')" /><span></span>
                    </label>
                  </template>
                  <template v-else>
                    <span class="status-dot-ro" :class="e.preconfirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Pre-Confirmación"></span>
                    <span class="status-dot-ro" :class="e.confirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Confirmación"></span>
                  </template>
                </td>
                <td class="td-c text-center">
                  <template v-if="!isAcademica">
                    <label class="exec-switch scale-75" title="Nueva Metodología">
                      <input type="checkbox" v-model="e.new_methodology" @change="updateQuickStatus(e, 'new_methodology')" /><span></span>
                    </label>
                  </template>
                  <template v-else>
                    <span class="status-dot-ro" :class="e.new_methodology ? 'dot-ro-on' : 'dot-ro-off'" title="Nueva Metodología"></span>
                  </template>
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
                  <div class="ed-cell-sm text-truncate ed-trunc-160" v-if="isCompact" :title="e.notes">{{ e.notes  }}</div>
                </td>
                <td class="td-d">
                  <div class="ed-mono ed-strong-sm" v-if="!isCompact"><b v-if="e.global_code">{{ e.global_code }}</b></div>
                  <div class="ed-sub" v-if="!isCompact || (isCompact && e.program_type == 'Curso')">
                    <span v-if="!isCompact && e.specific_code">A: </span><b v-if="e.specific_code">{{ e.specific_code }}</b>
                  </div>
                  <div v-if="e.program_type_alias != 'we_program_type_course'" class="ed-sub ed-xs">
                    <b v-if="e.clasification">{{ e.clasification }}</b>
                  </div>
                </td>
              </tr>
            </template>
            </template>
          </tbody>

          <!-- ── TBODY: Vista Histórica ── -->
          <tbody v-if="hasActiveFilters">
            <template v-if="isTableLoading">
              <tr v-for="n in 8" :key="'skh-'+n" class="skeleton-row">
                <td :colspan="tableColCount">
                  <span class="ds-skel" :style="{ width: (40 + (n * 17) % 45) + '%' }"></span>
                </td>
              </tr>
            </template>
            <template v-else>
            <tr
              v-for="e in historyList"
              :key="e.edition_num_id"
              class="tbody-row"
              :class="[e.cat_segment ? 'row-segment-' + e.cat_segment.toLowerCase() : '', { 'row-pressing': longPressTimer && currentPressId === e.edition_num_id }]"
              @contextmenu.prevent="handleFamilyFilter(e)"
            >
              <td class="td-act">
                <div class="action-btns">
                  <button v-if="!isAcademica" class="action-btn action-btn-audit" @click.stop="openAuditHistory(e.edition_num_id)" title="Historial de cambios" aria-label="Historial de cambios">
                    <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
                  </button>
                  <button :class="['action-btn', (e.tree_detail.length == 0 && e.program_type != 'Curso') ? 'action-btn-neutral' : 'action-btn-tree']" @click.stop="openTreeModal(e)" title="Árbol" aria-label="Árbol">
                   <i class="fa-solid fa-book-bookmark" aria-hidden="true"></i>
                  </button>
                  <button v-if="$hasRole(['ADMIN', 'PRODUCTO'])" class="action-btn" :class="e.program_type === 'Curso' ? 'action-btn-edit' : 'action-btn-hier'" @click.stop="openEditModal(e)" title="Editar" aria-label="Editar">
                    <i v-if="e.program_type === 'Curso'"  class="fa-solid fa-file-pen" aria-hidden="true"></i>
                    <i v-else class="fa-solid fa-sitemap" aria-hidden="true"></i>
                  </button>
                </div>

              </td>

              <!-- Mismos links que la vista mensual, pero sin edicion en linea:
                   el listado historico (sp_edition_list) no los devuelve, asi
                   que aca el lapiz manda al modal de la edicion. -->
              <template v-if="canSeeClassroomLinks">
                <td v-for="link in CLASSROOM_LINKS" :key="link.field" class="td-e td-e-lac">
                  <template v-if="e.program_type === 'Curso'">
                    <div class="lac-chip" :class="[link.chipClass, { 'lac-chip--no-link': !e[link.field] }]">
                      <i :class="[link.icon, 'lac-chip-icon']" aria-hidden="true"></i>
                      <div class="lac-chip-actions">
                        <button class="lac-chip-btn lac-chip-btn--edit" @click.stop="openEditModal(e)" :title="`Editar link de ${link.label}`" :aria-label="`Editar link de ${link.label}`">
                          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                        </button>
                        <a v-if="e[link.field]" :href="e[link.field]" target="_blank" class="lac-chip-btn lac-chip-btn--go" :title="`Abrir ${link.label}`" :aria-label="`Abrir ${link.label}`">
                          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                        </a>
                        <span v-else class="lac-chip-btn lac-chip-btn--go lac-chip-btn--empty" title="Sin link configurado">
                          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                        </span>
                      </div>
                    </div>
                  </template>
                  <span v-else class="ed-muted">—</span>
                </td>
              </template>

              <td class="td-a td-prog">
                <div class="prog-name">
                  <span v-if="!isCompact">{{ e.program_abreviature || '—' }}</span>
                  <div v-if="isCompact" class="text-truncate ed-trunc-prog" :title="e.program_abreviature">{{ e.program_abreviature || '—' }}</div>
                </div>
                <div class="prog-sub ed-sub" v-if="!isCompact">
                  <span class="ed-mono">{{ e.version_code }}</span>&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b>
                  <span class="float-end">Seg: {{ e.cat_segment }} {{ e.cat_course_category_alias ? ('| ' + e.cat_course_category_label) : '' }}</span>
                </div>
              </td>

              <td class="td-a ed-w-detail" v-if="!isCompact">
                <div class="ed-sub">{{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}</div>
                <div class="ed-sub">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
              </td>
              <td class="td-a ed-w-line-hist" v-if="isCompact">{{ e.program_line_business }}&nbsp;<b>{{ '(' + e.program_sessions + ')' }}</b></td>
              <td class="td-a text-center" v-if="isCompact"><span class="tipo-tag">{{ e.cat_course_category_label }}</span></td>
              <td class="td-a text-center" v-if="isCompact"><span class="seg-pill" :class="'seg-' + (e.cat_segment || '').toLowerCase()">{{ e.cat_segment }}</span></td>
              <td class="td-a text-center ed-mono ed-sub" v-if="isCompact">{{ e.calc_da }}</td>

              <td class="td-b">
                <div class="date-link">{{ formatDate(e.start_date) }}</div>
                <div class="ed-sub" v-if="!isCompact">{{ 'CA: ' + e.calc_da || 0 }}<span class="float-end">{{ 'CP: ' + e.calc_dp || 0 }}</span></div>
              </td>
              <td class="td-b text-center ed-mono ed-sub" v-if="isCompact">{{ e.calc_dp }}</td>
              <td class="td-b text-center"><div class="ed-mono ed-cell-sm">{{ formatDate(e.end_date) }}</div></td>
              <td class="td-b ed-cell-sm" v-if="isCompact">{{ !e.schedules ? '' : e.schedules[0].day_combination_label }}</td>

              <td class="td-b position-relative overflow-visible" :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }">
                <div v-if="!e.schedules || e.schedules.length === 0" class="ed-sub">—</div>
                <div v-else-if="e.schedules.length === 1">
                  <div class="ed-strong-sm" v-if="!isCompact">{{ e.schedules[0].day_combination_label || '—' }}</div>
                  <div class="ed-sub">{{ e.schedules[0].hour_combination_label }}</div>
                </div>
                <div v-else-if="!isCompact" class="schedule-dropdown-wrapper">
                  <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                    <div>
                      <div class="ed-strong-sm">{{ e.schedules[0].day_combination_label }}</div>
                      <div class="ed-sub text-truncate ed-trunc-90">{{ e.schedules[0].hour_combination_label }}</div>
                    </div>
                    <span class="ds-pill info">+{{ e.schedules.length - 1 }}</span>
                  </div>
                  <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover">
                    <div class="popover-header-sm">Horarios ({{ e.schedules.length }})<button type="button" class="btn-close-xs" aria-label="Cerrar" @click.stop="activeScheduleDropdown = null">&times;</button></div>
                    <div class="popover-body-sm">
                      <div v-for="(sch, sIdx) in e.schedules" :key="sIdx" class="schedule-item">
                        <div class="ed-schedule-day">{{ sch.day_combination_label }}</div>
                        <div class="ed-sub">{{ sch.hour_combination_label }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-if="activeScheduleDropdown === e.edition_num_id" class="click-overlay" @click.stop="activeScheduleDropdown = null"></div>
                </div>
              </td>

              <td class="td-b ed-w-instr">
                <div class="ed-cell-sm text-truncate ed-trunc-160" :title="e.instructor">{{ e.instructor || '—' }}</div>
              </td>

              <td class="td-c text-center">
                <template v-if="!isAcademica">
                  <label class="exec-switch scale-75" title="Ficha / Expediente"><input type="checkbox" v-model="e.expedient" @change="updateQuickStatus(e, 'expedient')" :disabled="!$hasRole(['ADMIN', 'PRODUCTO'])" /><span></span></label>
                  <label class="exec-switch scale-75" title="Mejora / Upgrade"><input type="checkbox" v-model="e.upgrade" @change="updateQuickStatus(e, 'upgrade')" /><span></span></label>
                </template>
                <template v-else>
                  <span class="status-dot-ro" :class="e.expedient ? 'dot-ro-on' : 'dot-ro-off'" title="Ficha / Expediente"></span>
                  <span class="status-dot-ro" :class="e.upgrade ? 'dot-ro-on' : 'dot-ro-off'" title="Mejora / Upgrade"></span>
                </template>
              </td>
              <td class="td-c text-center">
                <template v-if="!isAcademica">
                  <label class="exec-switch scale-75" title="Pre-Confirmación"><input type="checkbox" v-model="e.preconfirmation" @change="updateQuickStatus(e, 'preconfirmation')" /><span></span></label>
                  <label class="exec-switch scale-75" title="Confirmación"><input type="checkbox" v-model="e.confirmation" @change="updateQuickStatus(e, 'confirmation')" /><span></span></label>
                </template>
                <template v-else>
                  <span class="status-dot-ro" :class="e.preconfirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Pre-Confirmación"></span>
                  <span class="status-dot-ro" :class="e.confirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Confirmación"></span>
                </template>
              </td>
              <td class="td-c text-center">
                <template v-if="!isAcademica">
                  <label class="exec-switch scale-75" title="Nueva Metodología"><input type="checkbox" v-model="e.new_methodology" @change="updateQuickStatus(e, 'new_methodology')" /><span></span></label>
                </template>
                <template v-else>
                  <span class="status-dot-ro" :class="e.new_methodology ? 'dot-ro-on' : 'dot-ro-off'" title="Nueva Metodología"></span>
                </template>
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
                <div class="ed-cell-sm text-truncate ed-trunc-160" v-if="isCompact" :title="e.notes">{{ e.notes }}</div>
              </td>
              <td class="td-d">
                <div class="ed-mono ed-strong-sm" v-if="!isCompact"><b v-if="e.global_code">{{ e.global_code }}</b></div>
                <div class="ed-sub" v-if="!isCompact || (isCompact && e.program_type == 'Curso')">
                  <b v-if="e.specific_code">{{ e.specific_code }}</b>
                </div>
                <div v-if="e.program_type_alias != 'we_program_type_course'" class="ed-sub ed-xs">
                  <b v-if="e.clasification">{{ e.clasification }}</b>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ══════════════ MODALES ══════════════ -->

    <!-- Modal: Resumen / Meta -->
    <BaseModal v-model="showMetaModal" title="Resumen de programación" size="xl">
      <div class="ds-stack">
        <div class="ds-row ds-row--hero">
          <article class="ds-panel">
            <header class="ds-panel-head"><h3 class="ds-panel-title">¿En qué líneas de negocio hay ediciones?</h3></header>
            <div class="ds-panel-body">
              <div class="lines-grid">
                <div v-for="(line, idx) in metaSummary.lines" :key="idx" class="line-item" :class="{ 'is-zero': line.count === 0 }">
                  <div class="line-item__name">{{ line.name }}</div>
                  <div class="line-item__count">{{ line.count }}</div>
                </div>
              </div>
            </div>
          </article>
          <article class="ds-panel">
            <header class="ds-panel-head"><h3 class="ds-panel-title">¿Qué categorías se programaron?</h3></header>
            <div class="ds-panel-body">
              <div class="ed-cats">
                <div v-for="(cat, idx) in metaSummary.categories.filter(c => c.name !== 'Total' && c.name != 'Minicurso')" :key="idx" class="ed-cat">
                  <div class="ed-cat-row"><span>{{ cat.name }}</span><span class="ed-num">{{ cat.count }}</span></div>
                  <div class="ds-track"><i :style="{ width: (cat.count / (metaSummary.categories.find(c => c.name === 'Total')?.count || 1) * 100) + '%' }"></i></div>
                </div>
              </div>
            </div>
            <footer class="ds-panel-foot">
              <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
              <span>Total programado: <strong class="ed-num">{{ metaSummary.categories.find(c => c.name === 'Total')?.count || 0 }}</strong></span>
            </footer>
          </article>
        </div>
        <div class="ds-row ds-row--mitad">
          <article class="ds-panel">
            <header class="ds-panel-head"><h3 class="ds-panel-title">¿Cómo se clasifican por tipo?</h3></header>
            <div class="ds-panel-body">
              <div class="ds-table-scroll">
                <table class="ds-table ds-table--densa">
                  <thead><tr><th>Código</th><th>Descripción</th><th class="num">Cant.</th></tr></thead>
                  <tbody>
                    <tr v-for="(type, idx) in metaSummary.types" :key="idx">
                      <td><span class="ds-pill">{{ type.code }}</span></td>
                      <td>{{ type.description }}</td>
                      <td class="num ed-num">{{ type.count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>
          <article class="ds-panel">
            <header class="ds-panel-head"><h3 class="ds-panel-title">¿Qué acción pide cada segmento?</h3></header>
            <div class="ds-panel-body">
              <div class="ds-table-scroll">
                <table class="ds-table ds-table--densa ed-seg-table">
                  <thead><tr><th>Seg.</th><th>Acción requerida</th><th class="num">Cant.</th></tr></thead>
                  <tbody>
                    <tr :class="'row-segment-' + seg.code.toLowerCase()" v-for="(seg, idx) in metaSummary.segments" :key="idx">
                      <td><div class="segment-circle">{{ seg.code }}</div></td>
                      <td>{{ seg.description.replace('*', '') }}</td>
                      <td class="num ed-num">{{ seg.count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>
      </div>
    </BaseModal>

    <!-- Modal: Filtros -->
    <BaseModal v-model="showFilterModal" title="Filtrar cronograma" size="lg">
      <div class="ds-form-grid ed-filter-grid">
        <div class="ds-field ed-span-all">
          <label class="ds-label">Rango de fecha de inicio</label>
          <BaseDatePicker v-model="filterForm.range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango (Desde a Hasta)" @on-change="handleRangeFilterChange" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Buscar programa</label>
          <SearchSelect v-model="filterForm.program_version_id" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" label-field="program_type_for_iu" value-field="program_version_id" sublabel-field="version_code" placeholder="Buscar programa…" :cache="false" :view-open="6" :model-label="filterForm.program_version_label" @change="(opt) => filterForm.program_version_label = opt ? opt.program_type_for_iu : ''" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Docente</label>
          <MultiSelect v-model="filterForm.instructores_seleccionados" mode="remote" :fetcher="(q) => instructorService.instructorCaller({ q })" :debounce-ms="400" labelKey="full_name" valueKey="instructor_id" placeholder="Buscar docentes…" modalTitle="Seleccionar Docentes" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Línea de negocio</label>
          <MultiSelect v-model="filterForm.category_ids" :items="catalogs.catLines" label-key="description" value-key="id" placeholder="LINEAS…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Categoría</label>
          <MultiSelect v-model="filterForm.type_program_ids" :items="catalogs.catCategories" label-key="description" value-key="id" placeholder="CATEGORIAS…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Seguimiento de edición</label>
          <MultiSelect v-model="filterForm.course_category_ids" :items="catalogs.catTypes" label-key="description" value-key="id" placeholder="S. EDICIONES…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Segmento</label>
          <MultiSelect v-model="filterForm.segment_ids" :items="catalogs.catSegments" label-key="description" value-key="id" placeholder="SEGMENTOS…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Días</label>
          <MultiSelect v-model="filterForm.combination_days_ids" :items="catalogs.dayCombinationList" label-key="description" value-key="id" placeholder="DIAS…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Horas</label>
          <MultiSelect v-model="filterForm.hour_combination_ids" :items="catalogs.hourCombinationList" label-key="description" value-key="id" placeholder="HORARIOS…" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Modalidad</label>
          <MultiSelect v-model="filterForm.model_modality_ids" :items="catalogs.modalityList" label-key="description" value-key="id" placeholder="MODALIDADES…" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="ed-filter-clasif">Clasificación</label>
          <input id="ed-filter-clasif" type="text" class="ds-input" v-model="filterForm.clasification" placeholder="UNQ" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" @click="showFilterModal = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-primary" @click="applyFilters">Aplicar filtros</button>
      </template>
    </BaseModal>

    <!-- Modal: Formulario Edición -->
    <BaseModal v-model="showFormModal" :title="currentEdition ? 'Administrar edición' : 'Nueva edición'" size="xl">
      <div ref="editionForm" class="modern-modal-layout">
        <div class="main-column">
          <div class="ed-form-head" v-if="currentEdition">
            <div class="ed-form-head-row">
              <span class="ds-pill" :class="isCourse ? 'warn' : 'info'">{{ isCourse ? 'Curso' : 'Programa' }}</span>
              <h5 class="ed-form-name">{{ currentEdition.program_abreviature }}</h5>
              <span class="ds-pill">{{ 'Sesiones: ' + modalForm.sessions }}</span>
            </div>
            <div class="ed-sub">{{ currentEdition.global_code }} &bull; {{ currentEdition.specific_code || 'Sin Código Anual' }} &bull; {{ currentEdition.clasification || '' }}</div>
          </div>

          <section class="form-section">
            <h4 class="section-label">Definición general</h4>
            <div class="ed-fgrid">
              <div class="ds-field ed-span-4">
                <label class="ds-label">Versión de programa<span class="ds-req">*</span></label>
                <SearchSelect v-model="modalForm.program_version_id" mode="remote" :disabled="!!(currentEdition && currentEdition.edition_num_id)" :fetcher="q => programService.programVersionCaller({ q, active:'Y', not_modality: catalogs.modalityList.find(e => e.alias == 'we_modality_online').id })" label-field="program_type_for_iu" value-field="program_version_id" placeholder="Buscar programa…" :minChars="0" :cache="false" required :view-open="6" :model-label="modalForm.abbreviation" @change="onProgramVersionChange" />
              </div>
              <div class="ds-field ed-span-2" v-if="isCourse">
                <label class="ds-label">Docente asignado</label>
                <SearchSelect v-model="modalForm.instructor_id" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" showSubValue label-field="full_name" sublabel-field="document_number" value-field="instructor_id" placeholder="Buscar docente…" :model-label="modalForm.instructor_label" :minChars="0" :cache="false" />
              </div>
              <div class="ds-field">
                <label class="ds-label">Segmentación</label>
                <SearchSelect v-model="modalForm.cat_segment_id" :items="catalogs.catSegments" label-field="description" value-field="id" placeholder="OPCIONAL" />
              </div>
              <div class="ds-field" v-if="modalForm.program_version_id">
                <label class="ds-label" for="ed-vacant">Vacantes</label>
                <input id="ed-vacant" type="number" class="ds-input" v-model.number="modalForm.vacant" placeholder="VACANTES" />
              </div>
            </div>
          </section>

          <section class="form-section" v-if="modalForm.program_version_id && (modalForm.cat_type_program_alias === 'we_program_type_course' || modalForm.cat_type_program_alias === 'we_program_type_event')">
            <h4 class="section-label">Logística y horarios</h4>
            <div class="ed-fgrid">
              <div class="ds-field ed-span-2 position-relative">
                <label class="ds-label">Fecha de inicio<span v-if="isCourse" class="ds-req">*</span></label>
                <div class="ed-input-group">
                  <BaseDatePicker v-model="modalForm.start_date" :config="getChildDateConfig()" :disabled="!modalForm.cat_day_combination_id" :required="isCourse" placeholder="dd/mm/aaaa" @on-change="validateAndCalculate(modalForm, 'start_date')" />
                  <button class="btn-icon ed-input-btn" type="button" title="Análisis de tiempos" aria-label="Análisis de tiempos" @click.stop="toggleGapPreview($event, 'main_gap', modalForm.program_version_id, modalForm)" :disabled="!modalForm.start_date || !modalForm.program_version_id">
                    <i class="fa-solid fa-timeline" aria-hidden="true"></i>
                  </button>
                </div>
                <div v-if="activeGapPreviewId === 'main_gap'" class="schedule-preview-popover pop--w350" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                  <div class="popover-header-exec"><span>Análisis de tiempos</span><button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activeGapPreviewId = null">&times;</button></div>
                  <div class="popover-content">
                    <GapTimeline :items="gapPreviewData" :loading="isLoadingGap" :format-date="formatDate" />
                  </div>
                </div>
                <div v-if="activeGapPreviewId === 'gap_popover'" class="click-overlay" @click="activeGapPreviewId = null"></div>
              </div>
              <div class="ds-field ed-span-2 position-relative">
                <label class="ds-label">Fecha de fin<span v-if="isCourse" class="ds-req">*</span></label>
                <div class="ed-input-group">
                  <BaseDatePicker v-model="modalForm.end_date" :disabled="!modalForm.cat_day_combination_id" :config="getChildDateConfig(null, modalForm)" :required="isCourse" placeholder="Calculado autom." />
                  <button class="btn-icon ed-input-btn" type="button" title="Proyección de sesiones" aria-label="Proyección de sesiones" @click.stop="toggleSchedulePreview('main_parent', modalForm, $event)">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                  </button>
                </div>
                <div v-if="activePreviewId === 'main_parent'" class="schedule-preview-popover" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                  <div class="popover-header-exec"><span>Proyección de sesiones</span><button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activePreviewId = null">&times;</button></div>
                  <div class="popover-content">
                    <div v-if="previewItems.length === 0" class="ds-empty">Faltan datos para calcular.</div>
                    <table v-else class="ds-table ds-table--densa ed-preview-table">
                      <thead><tr><th>#</th><th>Fecha</th><th>Estado</th></tr></thead>
                      <tbody>
                        <tr v-for="(item, idx) in previewItems" :key="idx" :class="{ 'is-holiday': item.status === 'holiday' }">
                          <td class="text-center">{{ item.sessionNum }}</td>
                          <td><div class="d-flex flex-column lh-1"><span>{{ formatDate(item.date) }}</span><small class="ed-sub ed-xs">{{ getDayName(item.date) }}</small></div></td>
                          <td><span v-if="item.status === 'valid'" class="ds-pill ok">OK</span><div v-else class="ed-bad ed-xs"><i class="fa-solid fa-ban me-1" aria-hidden="true"></i>{{ item.desc }}</div></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-if="activePreviewId === 'main_parent'" class="click-overlay" @click="activePreviewId = null"></div>
              </div>
              <div class="ds-field ed-span-2">
                <label class="ds-label">Días<span v-if="isCourse" class="ds-req">*</span></label>
                <SearchSelect v-model="modalForm.cat_day_combination_id" :items="catalogs.dayCombinationList" label-field="description" value-field="id" placeholder="Seleccione días" :required="isCourse" @change="calculateEndDate(modalForm)" />
              </div>
              <div class="ds-field ed-span-2">
                <label class="ds-label">Horas<span v-if="isCourse" class="ds-req">*</span></label>
                <SearchSelect v-model="modalForm.cat_hour_combination_id" :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Seleccione horario" :required="isCourse" />
              </div>
            </div>
          </section>

          <section class="form-section" v-if="modalForm.program_version_id && modalForm.cat_type_program_alias !== 'we_program_type_course' && modalForm.cat_type_program_alias !== 'we_program_type_event'">
            <div class="ed-section-head position-relative">
              <h4 class="section-label">Estructura del programa</h4>
              <!-- El padre no tiene fecha propia en el formulario: la hereda de sus
                   hijos. Su analisis va aca para decidir, sin cerrar el modal, si
                   conviene abrir una edicion nueva o colgarse de una existente. -->
              <button class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="!parentGapContext" @click.stop="toggleGapPreview($event, 'parent_gap', modalForm.program_version_id, parentGapContext)">
                <i class="fa-solid fa-timeline" aria-hidden="true"></i>
                Frecuencias del padre
              </button>
              <div v-if="activeGapPreviewId === 'parent_gap'" class="schedule-preview-popover pop--w350 pop--right" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                <div class="popover-header-exec"><span>Análisis: {{ modalForm.abbreviation || 'Padre' }}</span><button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activeGapPreviewId = null">&times;</button></div>
                <div class="popover-content">
                  <GapTimeline :items="gapPreviewData" :loading="isLoadingGap" :format-date="formatDate" />
                </div>
              </div>
              <div v-if="activeGapPreviewId === 'parent_gap'" class="click-overlay" @click="activeGapPreviewId = null"></div>
            </div>
            <div class="hierarchy-container">
              <table class="ds-table ds-table--densa ed-children">
                <thead>
                  <tr><th class="ed-w20">Sub-programa</th><th class="ed-w20">Edición</th><th class="ed-w25">Fechas</th><th class="ed-w20">Horario / docente</th><th class="ed-w15">Config.</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(child, index) in modalForm.program_version_children" :key="child.child_program_version_id" :class="{ 'opacity-50': isBlockedByPrevious(index) }">
                    <td>
                      <i class="fa-solid fa-filter ed-filter-ico" aria-hidden="true"></i>&nbsp;
                      <span class="ed-link" @click="filterDirectly({ program_version_id: child.child_program_version_id, program_version_label: child.abbreviation })">{{ child.abbreviation }}</span>
                      <div class="ed-sub ed-xs" v-if="!child.edition_id">{{ 'Sesiones: ' + child.sessions }}</div>
                    </td>
                    <td>
                      <div v-if="!child.edition_id" class="d-flex align-items-center gap-2 mb-2">
                        <span class="ed-sub">¿Nueva?</span>
                        <label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" type="checkbox" v-model="child.new" /><span></span></label>
                      </div>
                      <SearchSelect v-if="!child.new && !child.edition_id" v-model="child.edition_id" mode="remote" :fetcher="(q) => searchEditionsFiltered(q, child, index)" label-field="label_for_iu" sublabel-field="specific_code" value-field="edition_num_id" placeholder="Vincular edición…" :minChars="0" :cache="false" required @change="onChildEditionChange($event, child, index)" :disabled="child.new" />
                      <button :disabled="isBlockedByPrevious(index)" v-if="!child.new && child.edition_id" type="button" class="btn-exec btn-exec-outline btn-sm ed-btn-bad w-100" @click="unlinkChildEdition(child)"><i class="fa-solid fa-times" aria-hidden="true"></i> Desvincular</button>
                      <div v-if="child.edition_id" class="ed-linked-box">
                        <div class="ed-strong-sm">{{ child.global_code }}</div>
                        <div class="ed-sub ed-xs">{{ child.specific_code }}</div>
                        <div class="ed-sub ed-xs">{{ 'Sesiones: ' + child.sessions }}</div>
                      </div>
                    </td>
                    <td class="overflow-visible position-relative ed-col-dates" :style="{ zIndex: activeGapPreviewId === ('child_gap_' + index) ? 1060 : 'inherit' }">
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <div class="ed-input-group">
                          <BaseDatePicker v-model="child.start_date" :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id" :required="true" placeholder="Inicio" :config="getChildDateConfig(index)" @on-change="validateAndCalculate(child, 'start_date', index)" />
                          <button class="btn-icon ed-input-btn" type="button" title="Análisis de tiempos" aria-label="Análisis de tiempos" :disabled="!child.start_date || isBlockedByPrevious(index)" @click.stop="toggleGapPreview($event, 'child_gap_' + index, child.child_program_version_id, child)"><i class="fa-solid fa-timeline" aria-hidden="true"></i></button>
                        </div>
                        <div v-if="activeGapPreviewId === ('child_gap_' + index)" class="schedule-preview-popover pop--w350" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                          <div class="popover-header-exec"><span>Análisis: {{ child.abbreviation }}</span><button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activeGapPreviewId = null">&times;</button></div>
                          <div class="popover-content">
                            <GapTimeline :items="gapPreviewData" :loading="isLoadingGap" :format-date="formatDate" />
                          </div>
                        </div>
                        <div class="position-relative">
                          <div class="ed-input-group">
                            <BaseDatePicker v-model="child.end_date" :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id" :required="true" :config="getChildDateConfig(null, child)" placeholder="Fin (Calc)" />
                            <button class="btn-icon ed-input-btn" type="button" title="Cronograma estimado" aria-label="Cronograma estimado" :disabled="isBlockedByPrevious(index)" @click.stop="toggleSchedulePreview('child_' + child.child_program_version_id, child, $event)"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></button>
                          </div>
                          <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="schedule-preview-popover pop--right pop--min250 pop--z1070" :class="{ 'popover-opens-top': popoverPosition === 'top' }">
                            <div class="popover-header-exec"><span>Cronograma estimado</span><button type="button" class="btn-close-xs" aria-label="Cerrar" @click="activePreviewId = null">&times;</button></div>
                            <div class="popover-content">
                              <div v-if="previewItems.length === 0" class="ds-empty">Datos insuficientes.</div>
                              <table v-else class="ds-table ds-table--densa ed-preview-table">
                                <thead><tr><th>#</th><th>Fecha</th><th>Obs.</th></tr></thead>
                                <tbody>
                                  <tr v-for="(item, idx) in previewItems" :key="idx" :class="{ 'is-holiday': item.status === 'holiday' }">
                                    <td class="text-center">{{ item.sessionNum }}</td>
                                    <td>{{ formatDate(item.date) }} <span class="ed-sub ed-xs">({{ getDayName(item.date) }})</span></td>
                                    <td><i v-if="item.status === 'valid'" class="fa-solid fa-check ed-ok" aria-hidden="true"></i><span v-else class="ed-bad ed-xs">{{ item.desc }}</span></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="click-overlay" @click="activePreviewId = null"></div>
                        </div>
                      </div>
                      <div v-else class="ed-muted text-center">-</div>
                      <div v-if="activeGapPreviewId === ('child_gap_' + index)" class="click-overlay" @click="activeGapPreviewId = null"></div>
                    </td>
                    <td>
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <SearchSelect v-model="child.cat_day_combination_id" :items="catalogs.dayCombinationList" label-field="description" value-field="id" placeholder="Días" required :disabled="isBlockedByPrevious(index)" class="mb-1" @change="calculateEndDate(child); setChildren(modalForm.program_version_children, 'cat_day_combination_id', child.cat_day_combination_id)" />
                        <SearchSelect v-model="child.cat_hour_combination_id" required :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Horas" class="mb-1" :disabled="isBlockedByPrevious(index)" @change="setChildren(modalForm.program_version_children, 'cat_hour_combination_id', child.cat_hour_combination_id)" />
                        <SearchSelect :disabled="isBlockedByPrevious(index)" v-if="child.new || child.edition_id" v-model="child.instructor_id" :cache="false" sublabel-field="document_number" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" label-field="full_name" value-field="instructor_id" placeholder="Docente" :model-label="child.instructor_label" />
                      </div>
                      <div v-else class="ed-muted text-center">-</div>
                    </td>
                    <td>
                      <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input type="checkbox" v-model="child.active" /><span></span></label><span class="ed-sub">Activo</span></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.preconfirmation && child.expedient){child.confirmation=true}else{child.confirmation=false} }" type="checkbox" v-model="child.preconfirmation" /><span></span></label><span class="ed-sub">PRE-cfm</span></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.preconfirmation && child.expedient){child.confirmation=true}else{child.confirmation=false} }" type="checkbox" v-model="child.expedient" /><span></span></label><span class="ed-sub">Ficha</span></div>
                        <div class="d-flex align-items-center gap-2"><label class="exec-switch scale-75"><input :disabled="isBlockedByPrevious(index)" @change="() => { if(child.confirmation){child.preconfirmation=true;child.expedient=true} }" type="checkbox" v-model="child.confirmation" /><span></span></label><span class="ed-sub">Cfm</span></div>
                      </div>
                      <div v-else class="ed-muted text-center">-</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="sidebar-column">
          <div class="status-card">
            <div class="status-card__header"><i class="fa-solid fa-sliders" aria-hidden="true"></i>Configuración</div>
            <div class="status-card__body">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="ed-strong">Ficha</span><small class="d-block ed-sub">Generar expediente</small></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.expedient" /><span></span></label>
              </div>
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="ed-strong">Pre-confirmación</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.preconfirmation" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="ed-hr">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="ed-strong ed-accent">Confirmación</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.confirmation" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="ed-hr">
              <div class="switch-row" v-if="isCourse">
                <div class="switch-label"><span class="ed-strong">Mejora</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.upgrade" /><span></span></label>
              </div>
              <div class="switch-row">
                <div class="switch-label"><span class="ed-strong">Estado (activo)</span></div>
                <label class="exec-switch"><input type="checkbox" v-model="modalForm.active" /><span></span></label>
              </div>
              <hr v-if="isCourse" class="ed-hr">
              <div class="ds-field ed-side-field">
                <label class="ds-label" for="ed-global-code">Histórico</label>
                <input id="ed-global-code" type="text" class="ds-input" v-model.number="modalForm.global_code" />
              </div>
              <div class="ds-field">
                <label class="ds-label" for="ed-specific-code">Ed. año</label>
                <input id="ed-specific-code" type="text" class="ds-input" v-model.number="modalForm.specific_code" />
              </div>
            </div>
          </div>
          <div class="status-card">
            <div class="status-card__header"><i class="fa-regular fa-comment-dots" aria-hidden="true"></i>Observaciones</div>
            <div class="status-card__body">
              <textarea class="ds-input ed-notes" rows="6" v-model="modalForm.notes" placeholder="Notas internas…" aria-label="Observaciones"></textarea>
            </div>
          </div>
          <div class="status-card" v-if="currentEdition && isCourse">
            <div class="status-card__header"><i class="fa-solid fa-link" aria-hidden="true"></i>Links académicos</div>
            <!-- Solo lectura fuera de ADMIN/PRODUCTO porque el modal guarda con
                 sp_edition_update, que exige esos roles. Academica edita estos
                 mismos links con el lapiz de la tabla, que va por su endpoint. -->
            <div class="status-card__body">
              <div v-for="link in CLASSROOM_LINKS" :key="link.field" class="ds-field ed-side-field">
                <label class="ds-label">
                  <i :class="[link.icon, 'me-1']" :style="{ color: link.headerColor }" aria-hidden="true"></i>{{ link.modalLabel }}
                </label>
                <input
                  type="url"
                  class="ds-input"
                  v-model="modalForm[link.field]"
                  :placeholder="link.placeholder"
                  :readonly="!$hasRole(['ADMIN', 'PRODUCTO'])"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="ed-footer-id"><span v-if="currentEdition">Editando ID: {{ currentEdition.edition_num_id }}</span></span>
        <button type="button" class="btn-exec btn-exec-outline" @click="cleanFormModal(); showFormModal = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-primary" :disabled="!isModalValid" @click="applyModalForm"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Guardar cambios</button>
      </template>
    </BaseModal>

    <!-- Modal: Árbol Académico -->
    <BaseModal v-model="showTreeModal" :title="treeModalTitle" size="lg">
      <div class="accordion-container">
        <div v-if="!treeGroups.length" class="ds-empty ds-empty--lista">
          <i class="fa-solid fa-sitemap ed-empty-ico" aria-hidden="true"></i>
          <p class="ed-strong">Sin estructura jerárquica</p>
          <p>Esta edición no tiene programas padres ni cursos hijos asociados.</p>
        </div>
        <div v-else class="ds-stack">
          <div v-for="(group, idx) in treeGroups" :key="idx" class="accordion-card">
            <div class="accordion-header" :class="{ 'is-open': group.isOpen }" @click="toggleGroup(idx)">
              <div class="d-flex align-items-center gap-3" :class="{ 'opacity-75': group.active === 'N' }">
                <div class="icon-box" :class="{ 'is-inactive': group.active === 'N' }">
                  <i class="fa-solid" :class="group.active === 'N' ? 'fa-ban' : 'fa-layer-group'" aria-hidden="true"></i>
                </div>
                <div>
                  <span class="ds-pill ed-tree-pill" :class="group.active === 'N' ? 'bad' : 'info'">{{ group.active === 'N' ? 'Programa inactivo' : 'Programa padre' }}</span>
                  <h6 class="ed-tree-name" :class="{ 'is-inactive': group.active === 'N' }">{{ group.abbreviation }}</h6>
                  <div class="ed-sub">{{ group.global_code }} &bull; <span v-if="group.clasification" class="ed-link" @click="filterDirectly({ clasification: group.clasification })">{{ group.clasification }}<i class="fa-solid fa-filter ed-filter-ico ms-1" aria-hidden="true"></i></span></div>
                </div>
              </div>
              <button type="button" class="btn-icon btn-icon-sm" :aria-label="group.isOpen ? 'Ocultar módulos' : 'Mostrar módulos'"><i class="fa-solid fa-chevron-down transition-transform" :class="{ 'rotate-180': group.isOpen }" aria-hidden="true"></i></button>
            </div>
            <div v-show="group.isOpen" class="accordion-body">
              <div class="ds-table-scroll">
                <table class="ds-table ds-table--densa ed-tree-table">
                  <thead>
                    <tr><th>Curso / módulo</th><th>Fechas</th><th>Horario</th><th class="text-center">Estado</th><th class="text-center ed-w-pdf">PDF</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="child in group.children" :key="child.edition_num_id || child.global_code" :class="{ 'is-current': child.is_current }">
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <i class="fa-solid fa-book-open ed-muted" aria-hidden="true"></i>
                          <div>
                            <div class="ed-strong">
                              <span class="ed-link" @click.stop="filterDirectly({ program_version_id: child.program_version_id, program_version_label: child.abbreviation })">{{ child.program_abreviature || child.abbreviation }}</span>
                              <i class="fa-solid fa-filter ed-filter-ico ms-1" aria-hidden="true"></i>
                              <span v-if="child.is_current" class="ds-pill warn ms-1">Actual</span>
                            </div>
                            <div class="ed-sub ed-xs">{{ child.global_code }} &bull; {{ child.specific_code }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div v-if="child.start_date">
                          <span class="ed-link" @click.stop="filterDirectly({ date_from: child.start_date, date_to: child.start_date, date_range: 'true' })">{{ formatDate(child.start_date) }}</span>
                          <i class="fa-solid fa-filter ed-filter-ico ms-1" aria-hidden="true"></i>
                          <br><span class="ed-sub ed-xs">al {{ formatDate(child.end_date) }}</span>
                        </div>
                        <span v-else class="ed-muted">-</span>
                      </td>
                      <td>
                        <div v-if="child.schedules && child.schedules.length"><div class="ed-strong-sm">{{ child.schedules[0].day_combination_label }}</div><div class="ed-sub ed-xs">{{ child.schedules[0].hour_combination_label }}</div><span v-if="child.schedules.length > 1" class="ds-pill ed-more">+{{ child.schedules.length - 1 }} más</span></div>
                        <div v-else-if="child.day_combination_label"><div class="ed-strong-sm">{{ child.day_combination_label }}</div><div class="ed-sub ed-xs">{{ child.hour_combination_label }}</div></div>
                        <span v-else class="ed-muted">-</span>
                      </td>
                      <td class="text-center"><span class="ds-pill" :class="child.active === 'Y' ? 'ok' : ''">{{ child.active === 'Y' ? 'Activo' : 'Inactivo' }}</span></td>
                      <td class="text-center">
                        <button
                          v-if="child.start_date && child.end_date"
                          class="btn-pdf-dl"
                          :disabled="downloadingPdfId === child.edition_num_id"
                          :title="'Descargar programación: ' + (child.program_abreviature || child.abbreviation)"
                          :aria-label="'Descargar programación: ' + (child.program_abreviature || child.abbreviation)"
                          @click.stop="downloadChildPdf(group, child)"
                        >
                          <i v-if="downloadingPdfId === child.edition_num_id" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                          <i v-else class="fa-solid fa-file-pdf" aria-hidden="true"></i>
                        </button>
                        <span v-else class="ed-muted ed-xs">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-model="showAuditModal"
      :title="currentEditionId ? 'Historial de Cambios — Edición' : 'Historial Global de Cambios'"
      size="xl">
      <div v-if="loadingAudit && !auditLogs.length" class="ds-empty ds-empty--lista">
        <i class="fa-solid fa-spinner fa-spin ed-empty-ico" aria-hidden="true"></i>
        <p>Cargando historial…</p>
      </div>

      <div v-else-if="!auditLogs.length" class="ds-empty ds-empty--lista">
        No hay historial de cambios registrado.
      </div>

      <div v-else class="ds-stack">
        <div v-for="log in auditLogs" :key="log.transaction_id" class="audit-entry">
          <!-- Cabecera de transacción -->
          <div class="audit-entry__header">
            <div class="d-flex align-items-center gap-2">
              <div class="ed-avatar" aria-hidden="true">{{ log.user_name?.charAt(0) || '?' }}</div>
              <div>
                <div class="ed-strong">{{ log.user_name }}</div>
                <small class="ed-sub">{{ formatDateTime(log.created_at) }}</small>
              </div>
            </div>
          </div>

          <!-- Cambios agrupados por tabla/registro -->
          <div v-for="(change, i) in log.changes" :key="i" class="audit-change">
            <div class="audit-change__meta">
              <!-- actionClass devuelve el nombre legacy (pill-teal/amber/red/slate);
                   aquí solo se traduce a tono, sin tocar la función. -->
              <span class="ds-pill" :class="'ed-act--' + actionClass(change.action)">
                {{ actionLabel(change.action) }}
              </span>
              <span class="ed-strong">
                {{ change.program_abbreviation || '' }}
                <span class="ed-sub" v-if="change.global_code">· {{ change.global_code }}</span>
              </span>
              <span v-if="change.is_child" class="ds-pill">
                <i class="fa-solid fa-sitemap" aria-hidden="true"></i> Módulo
              </span>
              <span v-if="change.table_name === 'edition_structure'" class="ds-pill">
                <i class="fa-solid fa-link" aria-hidden="true"></i> Vínculo
              </span>
            </div>

            <!-- Campos modificados -->
            <div v-if="change.changed_fields && Object.keys(change.changed_fields).length"
                 class="audit-fields">
              <div v-for="(val, key) in change.changed_fields" :key="key" class="audit-field-row">
                <span class="field-name">{{ resolveFieldLabel(key) }}</span>
                <span class="field-old">{{ formatFieldValue(key, val).old }}</span>
                <i class="fa-solid fa-arrow-right ed-muted ed-xs" aria-hidden="true"></i>
                <span class="field-new">{{ formatFieldValue(key, val).new }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cargar más -->
        <div class="text-center" v-if="auditHasMore">
          <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="loadAuditLogs(currentEditionId)" :disabled="loadingAudit">
            <i class="fa-solid fa-spinner fa-spin" v-if="loadingAudit" aria-hidden="true"></i>
            Cargar más
          </button>
        </div>
      </div>
    </BaseModal>

    <A5MigrationModal
      v-model:visible="showA5MigrationModal"
      :origin="a5MigrationOrigin"
      :a5-segment-id="getA5SegmentId()"
      @completed="handleA5Completed"
    />
  </div>
</template>

<!-- Paleta canónica de segmentos (--cro-a1..a7). Solo la importa Gerencia ›
     Objetivos; sin esta línea el cronograma dependería de haber visitado esa
     vista antes para tener los colores. -->
<style src="@/styles/cronograma-fila.css"></style>

<style scoped>
/* ═══════════════════════════════════════════════
   ENCABEZADO Y FILTROS
   Todo color sale de --ds-* (design-system.css): claro y oscuro sin bloque
   propio. Los botones y switches son los globales; aquí solo lo del cronograma.
═══════════════════════════════════════════════ */
.ed-title-reload { cursor: pointer; }
.ed-title-reload:hover { color: var(--ds-accent); }

/* Barra de filtros: no es .ds-panel porque ese recorta (overflow hidden) y los
   desplegables de MultiSelect quedarían cortados. */
.ed-toolbar {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 20px;
  padding: 12px 16px;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
}
.ed-period { display: flex; align-items: center; gap: 6px; }
.ed-select { height: 32px; padding: 4px 8px; }
.ed-select--month { width: 130px; }
.ed-select--year { width: 84px; }
.ed-field-line { min-width: 180px; }
.ed-chips { flex: 1; min-width: 0; }

/* Interruptor visual de un botón de filtro: encendido = tinte de info. */
.ed-toggle.is-on { background: var(--ds-soft-info); border-color: var(--ds-accent); color: var(--ds-info-ink); }
.ed-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--ds-warn); }

/* ═══════════════════════════════════════════════
   TABLA DE SEMANAS
   Scroll propio con alto acotado: el encabezado de 3 filas necesita un
   contenedor donde quedarse fijo; a 400px la tabla scrollea en horizontal.
═══════════════════════════════════════════════ */
.ed-scroll { max-height: calc(100vh - 250px); min-height: 320px; overflow: auto; }
.ed-grid { min-width: 1200px; }
.ed-grid td { padding: 3px 8px; vertical-align: middle; }
.ed-grid.is-compact td { padding: 5px 8px; }

.ed-grid thead { position: sticky; top: 0; z-index: 10; }
/* Fondos opacos en el encabezado fijo: los --ds-soft-* son translúcidos en
   oscuro y dejarían ver las filas que pasan por debajo. */
.ed-grid thead th { background: linear-gradient(var(--grp, transparent), var(--grp, transparent)), var(--ds-surface); vertical-align: middle; }
.ed-grid .thead-group th { padding: 7px 10px; font-size: 11px; font-weight: 700; }
.ed-grid .th-group { text-align: center; border-left: 2px solid var(--ds-surface); }
.ed-grid .th-act { width: 86px; box-shadow: inset -1px 0 0 var(--ds-border); }
.ed-grid .thead-sub .ts { padding: 6px 10px; font-size: 11px; font-weight: 600; border-left: 1px solid var(--ds-surface); box-shadow: inset 0 -1px 0 var(--ds-border); }

/* Grupos de columna: color solo en la cabecera (DESIGN_SYSTEM §5.5.1). */
.th-group-a, .ts-a { --grp: var(--ds-soft-info); color: var(--ds-info-ink); }
.th-group-b, .ts-b { --grp: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.th-group-c, .ts-c { --grp: var(--ds-soft-orange); color: var(--ds-orange-ink); }
.th-group-d, .ts-d { --grp: var(--ds-soft-neutral); color: var(--ds-ink-2); }
.th-group-e, .ts-e { --grp: var(--ds-soft-violet); color: var(--ds-violet-ink); }

.ed-w-link { min-width: 80px; }
.ed-w-ficha { min-width: 120px; max-width: 200px; }
.ed-w-confirm { min-width: 100px; max-width: 180px; }
.ed-w-met { min-width: 64px; }
.ed-w-detail { min-width: 80px; max-width: 120px; }
.ed-w-line { min-width: 120px; max-width: 300px; }
.ed-w-line-hist { min-width: 10px; max-width: 300px; }
.ed-w-instr { min-width: 100px; max-width: 130px; }
.ed-trunc-prog { min-width: 40px; max-width: 160px; }
.ed-trunc-160 { max-width: 160px; }
.ed-trunc-90 { max-width: 90px; }

/* Fila 3: filtros de columna */
.ed-grid .thead-filter .tf { padding: 5px 6px; background: var(--ds-surface-2); border-top: 0; box-shadow: inset 0 -1px 0 var(--ds-border); }
/* flatpickr renderiza su propio input (altInput), fuera del alcance de los
   estilos del trigger: hay que igualarlo a mano o la fila queda despareja. */
.thead-filter :deep(.exec-flatpickr-input) {
  width: 100%; height: 30px; padding: 0 8px; box-sizing: border-box; outline: none;
  border: 1px solid var(--ds-border-strong); border-radius: var(--ds-radius-control);
  font-size: 11px; font-family: inherit; color: var(--ds-ink); background: var(--ds-surface);
}
.thead-filter :deep(.exec-flatpickr-input:focus) { border-color: var(--ds-accent); }

/* ── Barra de semana ── */
.week-header-row { cursor: pointer; }
.ed-grid .week-header-cell { padding: 0; background: var(--ds-surface-2); border-top: 1px solid var(--ds-border); }
.week-header-row:hover .week-header-cell { background: var(--ds-surface-3); }
.week-header-inner { display: flex; align-items: center; gap: 10px; padding: 7px 14px; }
.week-chevron { flex-shrink: 0; color: var(--ds-muted); transition: transform 0.2s ease; }
.week-chevron-open { transform: rotate(180deg); }
.week-label { font-size: 13px; font-weight: 800; color: var(--ds-heading); }
.week-badge { margin-left: auto; }

.skeleton-row td { padding: 10px 12px; }

/* ── Filas de datos ── */
.ed-grid .td-a, .ed-grid .td-b, .ed-grid .td-c, .ed-grid .td-d, .ed-grid .td-e { border-left: 1px solid var(--ds-border); }
.ed-grid .tbody-row:hover > td { background: var(--ds-surface-2); }
.ed-grid td.td-act { padding: 0 8px; box-shadow: inset -1px 0 0 var(--ds-border); }

/* Segmentos A1..A7: identidad categórica, no estado. Paleta canónica
   --cro-aN (cronograma-fila.css), la misma de Cronograma Vista y Objetivos.
   A5 = cancelado (rojo), A7 = cerrado (navy). El tinte se mezcla con la
   superficie para quedar opaco y legible en los dos temas. */
.seg-a1, .row-segment-a1 { --seg: var(--cro-a1); }
.seg-a2, .row-segment-a2 { --seg: var(--cro-a2); }
.seg-a3, .row-segment-a3 { --seg: var(--cro-a3); }
.seg-a4, .row-segment-a4 { --seg: var(--cro-a4); }
.seg-a5, .row-segment-a5 { --seg: var(--cro-a5); }
.seg-a6, .row-segment-a6 { --seg: var(--cro-a6); }
.seg-a7, .row-segment-a7 { --seg: var(--cro-a7); }

.ed-grid tr[class*="row-segment-"] > .td-a,
.ed-grid tr[class*="row-segment-"] > .td-b,
.ed-grid tr[class*="row-segment-"] > .td-c,
.ed-grid tr[class*="row-segment-"] > .td-d { background: color-mix(in oklab, var(--seg) var(--seg-mix, 12%), var(--ds-surface)); }
.ed-grid tr[class*="row-segment-"] > .td-prog { box-shadow: inset 3px 0 0 var(--seg); }
.ed-grid tr[class*="row-segment-"]:hover { --seg-mix: 20%; }

/* Long press (filtro de familia): pinta la fila mientras se mantiene. */
.ed-grid tr.tbody-row.row-pressing > :is(.td-a, .td-b, .td-c, .td-d) {
  background: color-mix(in oklab, var(--ds-accent) 20%, var(--ds-surface));
  cursor: progress;
  transition: background-color 0.3s;
}

/* Pastilla de segmento: el texto se acerca a la tinta del tema para que el
   navy de A7 no desaparezca en oscuro. */
.seg-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 10px; font-weight: 800;
  background: color-mix(in oklab, var(--seg, var(--ds-muted)) 22%, var(--ds-surface));
  color: color-mix(in oklab, var(--seg, var(--ds-ink-2)) 70%, var(--ds-ink));
}

.tipo-tag {
  display: inline-block; padding: 2px 7px;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  font-size: 10.5px; font-weight: 500; color: var(--ds-ink-2); background: var(--ds-surface);
}

/* Utilidades de texto propias (las de Bootstrap tienen color fijo y en
   oscuro el texto desaparece, DESIGN_SYSTEM §6). */
.ed-sub { font-size: 11.5px; color: var(--ds-muted); }
.ed-muted { color: var(--ds-muted); }
.ed-cell-sm { font-size: 11.5px; color: var(--ds-ink-2); }
.ed-strong { font-weight: 700; color: var(--ds-ink); }
.ed-strong-sm { font-size: 11.5px; font-weight: 600; color: var(--ds-ink); }
.ed-accent { color: var(--ds-accent); }
.ed-mono { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.ed-num { font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.ed-xs { font-size: 10.5px; }
.ed-ok { color: var(--ds-ok-ink); }
.ed-bad { font-weight: 700; color: var(--ds-bad-ink); }
.cursor-pointer { cursor: pointer; }

.td-prog { max-width: 200px; }
.prog-name { font-weight: 600; color: var(--ds-heading); }
.prog-link { color: var(--ds-accent); cursor: pointer; }
.prog-link:hover { text-decoration: underline; }
.prog-sub { line-height: 1.3; }
.date-link { font-family: var(--ds-font-mono); font-size: 12px; font-weight: 600; color: var(--ds-accent); cursor: pointer; }
.date-link:hover { text-decoration: underline; }

/* Observación editable en la celda: parece texto hasta que se enfoca. */
.exec-textarea {
  width: 100%; resize: none; padding: 3px 5px;
  font-size: 11.5px; font-family: inherit; line-height: 1.4; color: var(--ds-ink);
  background: transparent; border: 1px solid transparent; border-radius: var(--ds-radius-control);
  transition: border-color 0.2s, background 0.2s;
}
.exec-textarea:hover { background: var(--ds-surface-2); border-color: var(--ds-border); }
.exec-textarea:focus { background: var(--ds-surface); border-color: var(--ds-accent); outline: none; }
.exec-textarea::placeholder { color: var(--ds-muted); }

/* ── Botones de acción de la fila: el tono distingue la acción ── */
.action-btns { display: flex; justify-content: center; gap: 4px; }
.action-btn {
  flex-shrink: 0; width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.action-btn:hover { border-color: var(--ds-border-strong); background: var(--ds-surface); }
.action-btn:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.action-btn-audit { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.action-btn-tree { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.action-btn-neutral { background: var(--ds-soft-neutral); color: var(--ds-ink-2); }
.action-btn-edit { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.action-btn-hier { background: var(--ds-soft-violet); color: var(--ds-violet-ink); }

/* ── Seguimiento en solo lectura (ACADEMICA) ── */
.status-dot-ro { display: inline-block; width: 8px; height: 8px; margin: 0 3px; border-radius: 50%; vertical-align: middle; }
.dot-ro-on { background: var(--ds-ok); box-shadow: 0 0 0 2px var(--ds-soft-ok); }
.dot-ro-off { background: var(--ds-border-strong); }

/* ── ACADÉMICA: chip de link que se abre al pasar el mouse ── */
.td-e-lac { vertical-align: middle; }
.ed-grid td.td-e-lac { padding: 0 6px; }
.lac-chip {
  display: inline-flex; align-items: center; gap: 0;
  padding: 4px 7px; border: 1px solid transparent; border-radius: 20px;
  white-space: nowrap; cursor: default;
  transition: gap .2s ease, background .15s, border-color .15s;
}
.lac-chip:hover { gap: 5px; background: var(--lac-soft, var(--ds-surface-2)); border-color: var(--ds-border); }
/* Cada link con su tono de negocio; el mismo tono lo usa el ícono del
   encabezado (CLASSROOM_LINKS.headerColor). */
.lac-chip--wa { --lac-soft: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.lac-chip--teams { --lac-soft: var(--ds-soft-violet); color: var(--ds-violet-ink); }
.lac-chip--ficha { --lac-soft: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.lac-chip--notas { --lac-soft: var(--ds-soft-info); color: var(--ds-info-ink); }
.lac-chip.lac-chip--no-link { --lac-soft: var(--ds-surface-2); color: var(--ds-border-strong); }

.lac-chip-icon { flex-shrink: 0; font-size: 1.05rem; transition: transform .2s ease; }
.lac-chip:hover .lac-chip-icon { transform: scale(0.88); }
.lac-chip-actions {
  display: flex; align-items: center; gap: 2px;
  max-width: 0; overflow: hidden; opacity: 0;
  transition: max-width .25s ease, opacity .2s ease .05s;
}
.lac-chip:hover .lac-chip-actions { max-width: 64px; opacity: 1; }
.lac-chip-btn {
  flex-shrink: 0; width: 24px; height: 24px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 5px; background: transparent;
  font-size: .68rem; text-decoration: none; color: var(--ds-ink-2); cursor: pointer;
  transition: background .15s, color .15s, transform .1s;
}
.lac-chip-btn:hover { transform: scale(1.15); background: var(--ds-surface); }
.lac-chip-btn--edit:hover { color: var(--ds-accent); }
.lac-chip-btn--go:hover { color: inherit; }
.lac-chip-btn--empty { opacity: .3; cursor: not-allowed; }
.lac-chip-btn--empty:hover { transform: none; background: transparent; }

/* ── Edición en línea del link ── */
.ed-grid td.td-e-editing { min-width: 220px; padding: 4px 6px; }
.lac-inline-edit { display: flex; align-items: center; gap: 4px; animation: lac-expand .15s ease; }
@keyframes lac-expand {
  from { opacity: 0; transform: scaleX(.85); }
  to   { opacity: 1; transform: scaleX(1); }
}
.lac-inline-input {
  flex: 1; min-width: 0; height: 28px; padding: 0 8px;
  font-size: .72rem; color: var(--ds-ink); background: var(--ds-surface);
  border: 1.5px solid var(--ds-accent); border-radius: var(--ds-radius-control); outline: none;
}
.lac-inline-btn {
  flex-shrink: 0; width: 26px; height: 26px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 5px; font-size: .7rem; cursor: pointer;
  transition: background .12s, color .12s;
}
.lac-inline-btn:disabled { opacity: .5; cursor: not-allowed; }
.lac-inline-btn--save { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.lac-inline-btn--save:hover:not(:disabled) { background: var(--ds-ok); color: var(--ds-on-brand); }
.lac-inline-btn--cancel { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.lac-inline-btn--cancel:hover:not(:disabled) { background: var(--ds-bad); color: var(--ds-on-brand); }

/* ═══════════════════════════════════════════════
   POPOVERS (proyección, análisis de tiempos, horarios)
   Fondo opaco --ds-surface: flotan sobre filas teñidas.
═══════════════════════════════════════════════ */
.schedule-preview-popover {
  position: absolute; top: 100%; left: 0; z-index: 10000 !important;
  width: 320px; max-width: 90vw; margin-top: 6px; overflow: hidden;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
  text-align: left;
  animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.popover-opens-top { top: auto !important; bottom: 100% !important; margin-top: 0 !important; margin-bottom: 6px; }
/* Variantes de ancho y anclaje (antes eran style="" sueltos). */
.pop--w360 { width: 360px; }
.pop--w350 { width: 350px; }
.pop--right { right: 0; left: auto; }
.pop--min250 { min-width: 250px; }
.schedule-preview-popover.pop--z1070 { z-index: 1070 !important; }

.popover-header-exec {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 12px; font-size: 12px; font-weight: 700; color: var(--ds-heading);
  background: var(--ds-surface-2); border-bottom: 1px solid var(--ds-border);
}
.popover-content { max-height: 300px; overflow-y: auto; }
.ed-preview-table { font-size: 11.5px; }
.ed-preview-table th:first-child, .ed-preview-table td:first-child { padding-left: 12px; }
.ed-preview-table tr.is-holiday td { background: var(--ds-soft-bad); }

.schedule-dropdown-wrapper { position: relative; }
.schedule-popover {
  position: absolute; top: 100%; left: 0; z-index: 1050;
  min-width: 220px; margin-top: 5px; overflow: hidden;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
}
.popover-header-sm {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; font-size: 12px; font-weight: 700; color: var(--ds-ink-2);
  background: var(--ds-surface-2); border-bottom: 1px solid var(--ds-border);
}
.popover-body-sm { max-height: 200px; overflow-y: auto; padding: 10px 12px; }
.schedule-item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--ds-border); }
.schedule-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: 0; }
.ed-schedule-day { font-size: 11.5px; font-weight: 700; color: var(--ds-accent); }

.btn-close-xs { padding: 0; border: none; background: transparent; font-size: 1.1rem; line-height: 1; color: var(--ds-muted); cursor: pointer; }
.btn-close-xs:hover { color: var(--ds-bad); }
.click-overlay { position: fixed; top: 0; left: 0; z-index: 9999; width: 100vw; height: 100vh; cursor: default; }

/* ═══════════════════════════════════════════════
   MODAL: RESUMEN
═══════════════════════════════════════════════ */
.lines-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; max-height: 350px; overflow-y: auto; padding-right: 4px;
}
.line-item { padding: 12px; text-align: center; background: var(--ds-surface-2); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.line-item.is-zero { opacity: 0.6; background: var(--ds-surface); border-style: dashed; }
.line-item__name { margin-bottom: 4px; font-size: 11.5px; font-weight: 600; color: var(--ds-ink-2); }
.line-item__count { font-size: 20px; font-weight: 800; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.line-item.is-zero .line-item__count { color: var(--ds-muted); }

.ed-cats { display: flex; flex-direction: column; gap: 12px; }
.ed-cat-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }

.ed-seg-table tr[class*="row-segment-"] > td { background: color-mix(in oklab, var(--seg) 12%, var(--ds-surface)); }
.segment-circle {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-size: 11px; font-weight: 700;
  background: color-mix(in oklab, var(--seg, var(--ds-muted)) 24%, var(--ds-surface));
  color: color-mix(in oklab, var(--seg, var(--ds-ink-2)) 70%, var(--ds-ink));
}

/* ═══════════════════════════════════════════════
   MODAL: FILTROS Y FORMULARIO DE EDICIÓN
═══════════════════════════════════════════════ */
.ed-filter-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.ed-span-all { grid-column: 1 / -1; }

.modern-modal-layout { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 20px; min-height: 400px; }
@media (max-width: 992px) { .modern-modal-layout { grid-template-columns: minmax(0, 1fr); } }
.main-column { display: flex; flex-direction: column; gap: var(--ds-gap); min-width: 0; }
.sidebar-column { display: flex; flex-direction: column; gap: var(--ds-gap); }

.ed-form-head-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.ed-form-name { margin: 0; font-size: 16px; font-weight: 800; color: var(--ds-heading); }
.ed-form-head .ed-sub { margin-top: 4px; }

/* Bloque del formulario: tarjeta con borde, título arriba (§5.5 bloques). */
.form-section { padding: 14px 16px; background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.section-label { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }
.ed-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.ed-section-head .section-label { margin: 0; }

.ed-fgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 14px; }
.ed-span-2 { grid-column: span 2; }
.ed-span-4 { grid-column: 1 / -1; }
@media (max-width: 600px) {
  .ed-fgrid { grid-template-columns: minmax(0, 1fr); }
  .ed-span-2 { grid-column: auto; }
}

/* Fecha + botón de análisis pegados, como un input-group. */
.ed-input-group { display: flex; align-items: stretch; }
.ed-input-group > :first-child { flex: 1; min-width: 0; }
.ed-input-btn { flex: none; width: 34px; padding: 0; margin-left: -1px; color: var(--ds-accent); border-top-left-radius: 0; border-bottom-left-radius: 0; }

.hierarchy-container { min-width: 500px; overflow: visible; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.ed-children th:first-child, .ed-children td:first-child { padding-left: 10px; }
.ed-children td { vertical-align: top; }
.ed-w20 { width: 20%; }
.ed-w25 { width: 25%; }
.ed-w15 { width: 15%; }
.ed-col-dates { min-width: 180px; }
.ed-link { color: var(--ds-accent); cursor: pointer; }
.ed-link:hover { text-decoration: underline; }
.ed-filter-ico { font-size: 0.65rem; color: var(--ds-muted); }
.ed-linked-box { padding: 4px; text-align: center; background: var(--ds-surface-2); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); }
.ed-btn-bad { color: var(--ds-bad-ink); }

.status-card { overflow: hidden; background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.status-card__header {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  font-size: 12.5px; font-weight: 700; color: var(--ds-heading);
  background: var(--ds-surface-2); border-bottom: 1px solid var(--ds-border);
}
.status-card__body { padding: 12px 14px; }
.switch-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.switch-row:last-child { margin-bottom: 0; }
.switch-label { font-size: 12.5px; line-height: 1.2; color: var(--ds-ink); }
.ed-hr { margin: 8px 0; border: 0; border-top: 1px solid var(--ds-border); opacity: 1; }
.ed-side-field { margin-bottom: 10px; }
.ed-notes { min-height: 150px; }
.ed-footer-id { margin-right: auto; font-size: 12px; font-style: italic; color: var(--ds-muted); }

/* ═══════════════════════════════════════════════
   MODAL: ÁRBOL ACADÉMICO
═══════════════════════════════════════════════ */
.accordion-container { min-height: 200px; }
.ed-empty-ico { display: block; margin-bottom: 10px; font-size: 28px; opacity: 0.4; }
.accordion-card { overflow: hidden; background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.accordion-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background-color 0.2s; }
.accordion-header:hover { background: var(--ds-surface-2); }
.accordion-header.is-open { background: var(--ds-soft-info); }
.accordion-body { border-top: 1px solid var(--ds-border); }
.icon-box {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  font-size: 1rem; color: var(--ds-accent); background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
}
.icon-box.is-inactive { color: var(--ds-bad-ink); background: var(--ds-soft-bad); }
.ed-tree-pill { margin-bottom: 4px; }
.ed-tree-name { margin: 0; font-size: 14px; font-weight: 700; color: var(--ds-ink); }
.ed-tree-name.is-inactive { color: var(--ds-bad-ink); text-decoration: line-through; }
.ed-tree-table th:first-child, .ed-tree-table td:first-child { padding-left: 16px; }
.ed-tree-table tr.is-current td { background: var(--ds-soft-warn); }
.ed-w-pdf { width: 48px; }
.ed-more { margin-top: 4px; }
.transition-transform { transition: transform 0.3s ease; }
.rotate-180 { transform: rotate(180deg); }

.btn-pdf-dl {
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: var(--ds-radius-sm); cursor: pointer;
  background: var(--ds-soft-bad); color: var(--ds-bad-ink);
  transition: background 0.15s, color 0.15s;
}
.btn-pdf-dl:hover:not(:disabled) { background: var(--ds-bad); color: var(--ds-on-brand); }
.btn-pdf-dl:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═══════════════════════════════════════════════
   MODAL: HISTORIAL DE CAMBIOS
═══════════════════════════════════════════════ */
.audit-entry { overflow: hidden; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.audit-entry__header { padding: 10px 14px; background: var(--ds-surface-2); border-bottom: 1px solid var(--ds-border); }
.ed-avatar {
  width: 28px; height: 28px; flex: none; display: grid; place-items: center;
  border-radius: 50%; font-size: 12px; font-weight: 700;
  background: var(--ds-brand); color: var(--ds-on-brand);
}
.audit-change { padding: 10px 14px; border-bottom: 1px solid var(--ds-border); }
.audit-change:last-child { border-bottom: none; }
.audit-change__meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12.5px; }
/* Tono por acción: alta = ok, cambio = warn, baja = bad. */
.ed-act--pill-teal { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.ed-act--pill-amber { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.ed-act--pill-red { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.audit-fields { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.audit-field-row {
  display: grid; grid-template-columns: 160px 1fr 16px 1fr; align-items: center; gap: 8px;
  padding: 3px 6px; font-size: 12px; background: var(--ds-surface-2); border-radius: var(--ds-radius-control);
}
@media (max-width: 600px) { .audit-field-row { grid-template-columns: 1fr; } }
.field-name { font-weight: 600; color: var(--ds-ink-2); }
.field-old { color: var(--ds-bad-ink); text-decoration: line-through; }
.field-new { font-weight: 600; color: var(--ds-ok-ink); }

@keyframes popIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .schedule-preview-popover, .lac-inline-edit { animation: none; }
}
</style>

<script setup>

import { ref, reactive, computed, onMounted, onUnmounted, inject, watch, nextTick, getCurrentInstance } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import MultiSelect from '@/components/MultiSelect.vue';
import BaseDatePicker from '@/components/BaseDatePicker.vue';
import { inDateRange } from '@/utils/dateRange';
import CurrencyInput from '@/components/CurrencyInput.vue' // Ajusta la ruta si es necesario
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
const currentEditionId = ref(null)

// Estado para los filtros de columna (reemplaza localFilters).
// Los de fecha guardan el rango de flatpickr ("2026-08-01 a 2026-08-14"), los
// demas una lista de valores elegidos. `.length` sirve para ambos: por eso
// `hayFiltroDeColumna` puede preguntar lo mismo a un string y a un array.
const columnFilters = reactive({
  program: [],
  detail: [],
  line: [],
  type: [],
  segment: [],
  start_date: '',
  end_date: '',
  instructor: [],
  notes: [],
  edition_code: [],
  business_line: []
})

const hayFiltroDeColumna = () => Object.values(columnFilters).some(v => v.length > 0)

// Un item pasa si pasa TODOS los filtros. Vive una sola vez porque lo consumen
// filteredSchedules (la vista mensual) y effectiveItems (KPIs y resumen): eran
// dos copias identicas del mismo if-chain, listas para divergir.
function matchesColumnFilters (item) {
  const getValue = val => (val === null || val === undefined ? '(Vacío)' : String(val).trim())

  if (columnFilters.program.length && !columnFilters.program.includes(getValue(item.program_abreviature))) return false

  if (columnFilters.detail.length) {
    const detalle = `${item.version_code} ${item.cat_segment}`
    if (!columnFilters.detail.some(filtro => detalle.includes(filtro))) return false
  }

  if (columnFilters.line.length && !columnFilters.line.includes(getValue(item.program_line_business))) return false
  if (columnFilters.business_line.length && !columnFilters.business_line.includes(item.business_line_id)) return false
  if (columnFilters.type.length && !columnFilters.type.includes(getValue(item.cat_course_category_label))) return false
  if (columnFilters.segment.length && !columnFilters.segment.includes(getValue(item.cat_segment))) return false
  if (columnFilters.start_date && !inDateRange(item.start_date, columnFilters.start_date)) return false
  if (columnFilters.end_date && !inDateRange(item.end_date, columnFilters.end_date)) return false
  if (columnFilters.instructor.length && !columnFilters.instructor.includes(getValue(item.instructor))) return false
  if (columnFilters.notes.length && !columnFilters.notes.includes(getValue(item.notes))) return false

  if (columnFilters.edition_code.length) {
    const codigo = `${item.global_code} ${item.specific_code}`.trim()
    if (!columnFilters.edition_code.some(filtro => codigo.includes(filtro))) return false
  }

  return true
}

import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import A5MigrationModal from './A5MigrationModal.vue'
import GapTimeline from './GapTimeline.vue'
import { parentScheduleFromChildren } from '@/utils/parentSchedule'
import { allowedDaysOf, sessionCalendar, sessionEndDate, weekdayOf } from '@/features/edition-schedule/sessionCalendar'
import { editionGapTimeline } from '@/features/edition-schedule/gapTimeline'
import { numeradorDeSemanas } from '@/shared/lib/cronograma'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'


const showAuditModal = ref(false)
const auditLogs = ref([])
const loadingAudit = ref(false)
const auditPage = ref(0)
const auditHasMore = ref(true)
const AUDIT_PAGE_SIZE = 20

// Migracion A5: intercepta el guardado cuando el operador cambia el segmento
// a A5 sobre una edicion existente. Mueve inscripciones vigentes a otra
// edicion del mismo programa, dejando RP en origen + pendiente a revisar en destino.
const showA5MigrationModal = ref(false)
const a5MigrationOrigin = ref(null)
const previousSegmentId = ref(null)

// --- INYECCIONES ---
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')
const toast = useToast()
const { proxy } = getCurrentInstance()
const isAcademica = computed(() => proxy.$hasRole(['ACADEMICA']))
// Quien ve las columnas de links del aula. Va aparte de isAcademica: ese decide
// permisos de edicion (switches, auditoria, filtros), no que columnas se pintan.
// Misma lista que el gate de /edition/classroomlinkssave en el backend.
const canSeeClassroomLinks = computed(() =>
  proxy.$hasRole(['ADMIN', 'PRODUCTO', 'LIDER_PRODUCTO', 'ACADEMICA', 'LIDER_ACADEMICA'])
)

// ── Filtros rápidos (ACADEMICA) ──────────────────────────────
// 'all' | 'courses' | 'programs'
const onlyCursos  = ref('all')
function cycleVista() {
  if      (onlyCursos.value === 'all')     onlyCursos.value = 'courses'
  else if (onlyCursos.value === 'courses') onlyCursos.value = 'programs'
  else                                      onlyCursos.value = 'all'
}
const onlyActivos = ref(false)
// ── Inline link edit (ACADEMICA) ─────────────────────────────
// Los links del aula que viven en program_editions. El orden manda las columnas
// del grupo ACADEMICA y `field` es la columna real: el SP de update solo escribe
// las claves que viajan en el JSON, asi que agregar un link aqui + en la BD +
// en editionUpdateSchema alcanza. Un quinto link NO deberia tocar el markup.
const CLASSROOM_LINKS = [
  { field: 'whatsapp_link', header: '',      label: 'WhatsApp',          modalLabel: 'WhatsApp Link',   icon: 'fa-brands fa-whatsapp',  chipClass: 'lac-chip--wa',    headerColor: 'var(--ds-ok-ink)', placeholder: 'https://chat.whatsapp.com/...' },
  { field: 'teams_link',    header: 'Teams', label: 'Teams',             modalLabel: 'Teams Link',      icon: 'fa-solid fa-video',      chipClass: 'lac-chip--teams', headerColor: 'var(--ds-violet-ink)', placeholder: 'https://teams.microsoft.com/...' },
  { field: 'ficha_link',    header: 'Ficha', label: 'la ficha',          modalLabel: 'Ficha',           icon: 'fa-solid fa-file-lines', chipClass: 'lac-chip--ficha', headerColor: 'var(--ds-warn-ink)', placeholder: 'https://...' },
  { field: 'grades_link',   header: 'Notas', label: 'la lista de notas', modalLabel: 'Lista de Notas',  icon: 'fa-solid fa-list-ol',    chipClass: 'lac-chip--notas', headerColor: 'var(--ds-info-ink)', placeholder: 'https://...' }
]

// Los mismos campos, vacios, para inicializar y limpiar el formulario del modal.
const linksVacios = () => Object.fromEntries(CLASSROOM_LINKS.map(({ field }) => [field, '']))

const linkInputEl   = ref(null)
const savingLinkId  = ref(null)
const editingLink   = reactive({ id: null, field: null, value: '' })

const isEditingLink = (edition, field) =>
  editingLink.id === edition.edition_num_id && editingLink.field === field

function startEditLink(edition, field) {
  editingLink.id    = edition.edition_num_id
  editingLink.field = field
  editingLink.value = edition[field] || ''
  // El input vive dentro de v-for, asi que Vue entrega un array de refs. Solo
  // hay una celda en edicion a la vez: la primera es la buena.
  nextTick(() => {
    const input = Array.isArray(linkInputEl.value) ? linkInputEl.value[0] : linkInputEl.value
    input?.focus()
  })
}

function cancelEditLink() {
  editingLink.id    = null
  editingLink.field = null
  editingLink.value = ''
}

async function saveEditLink(edition) {
  const id    = editingLink.id
  const field = editingLink.field
  const value = editingLink.value.trim() || null
  if (!id || !field) return

  savingLinkId.value = id
  try {
    // Solo viaja el link editado. El endpoint no toca ninguna otra columna, asi
    // que no hay que releer la edicion ni reenviar el resto del formulario.
    const { updated } = await editionService.classroomLinksSave({ edition_num_id: id, [field]: value })
    if (updated) {
      edition[field] = value
      toast.success('Link actualizado', { timeout: 1500 })
      cancelEditLink()
    } else {
      toast.error('No se encontró la edición')
    }
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.message || 'Error al guardar el link')
  } finally {
    savingLinkId.value = null
  }
}
// ─────────────────────────────────────────────────────────────

const date = ref();
const isCompact = ref(true)
const tableColCount = computed(() => (isCompact.value ? 17 : 12) + (canSeeClassroomLinks.value ? CLASSROOM_LINKS.length : 0))
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
  if (!hasActiveFilters.value && hayFiltroDeColumna()) {
    items = items.filter(matchesColumnFilters)
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
}

// --- LOGICA DE ÁRBOL (TREE MODAL) ---
const showTreeModal = ref(false)
const treeGroups = ref([]) // Usamos Grupos para el Acordeón
const treeModalTitle = ref('Estructura Académica')
const downloadingPdfId = ref(null) // id del hijo que está generando PDF

async function downloadChildPdf(group, child) {
  if (downloadingPdfId.value) return
  downloadingPdfId.value = child.edition_num_id
  try {
    const blob = await editionService.downloadSchedulePdf(group.id, child.edition_num_id)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const name = (child.program_abreviature || child.abbreviation || 'modulo').replace(/\s+/g, '_')
    a.href     = url
    a.download = `Programacion_${name}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.error('No se pudo generar el PDF')
  } finally {
    downloadingPdfId.value = null
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

// --- FORMATTERS ---

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
let scheduleRequestSeq = 0
async function fetchSchedule() {
  const seq = ++scheduleRequestSeq
  isTableLoading.value = true
  try {
    if(!hasActiveFilters.value){
      const payload = {
        selectedMonth: selectedMonth.value,
        selectedYear: selectedYear.value,
        page: 1,
        size: 100
      }
      
      const { items } = await editionService.editionByWeekList(payload)
      if (seq !== scheduleRequestSeq) return

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
      if (seq !== scheduleRequestSeq) return

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
  } finally {
    if (seq === scheduleRequestSeq) isTableLoading.value = false
  }
}
onMounted(() => {
  loadState()
  applyFiltersFromQueryParams()
  // Eliminar scroll exterior — la tabla tiene su propio scroll interno
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = ''
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
  ...linksVacios(),
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
  Object.assign(modalForm, linksVacios())
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
  previousSegmentId.value = null

  // NUEVA
  if (!edition) {
    showFormModal.value = true
    //cleanForm y set starst date
    cleanFormModal()
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
    previousSegmentId.value = data.cat_segment_id
    modalForm.global_code = data.global_code
    modalForm.specific_code = data.specific_code

    modalForm.active = !!data.active
    modalForm.preconfirmation = !!data.preconfirmation
    modalForm.confirmation = !!data.confirmation
    modalForm.notes = data.notes || ''
    for (const { field } of CLASSROOM_LINKS) modalForm[field] = data[field] || ''
    modalForm.sessions = data.sessions || null

    // Alias UI
    modalForm.abbreviation = data.abbreviation
    modalForm.instructor_label = data.instructor_label

    modalForm.cat_type_program = data.cat_type_program
    modalForm.cat_type_program_alias = data.cat_type_program_alias || edition.cat_type_program_alias

    modalForm.cat_day_combination_id = data.cat_day_combination_id
    modalForm.cat_hour_combination_id = data.cat_hour_combination_id
    // Hijos
    modalForm.program_version_children = (data.children || []).map(child => ({
      ...child,
      start_date: child.start_date ? child.start_date.slice(0, 10) : null,
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

function getA5SegmentId() {
  const list = catalogs.value?.catSegments || []
  return list.find(s => (s.description || '').trim().toUpperCase() === 'A5')?.id || null
}

function isCancellingToA5() {
  if (!currentEdition.value?.edition_num_id) return false
  const a5Id = getA5SegmentId()
  if (!a5Id) return false
  if (modalForm.cat_segment_id !== a5Id) return false
  return previousSegmentId.value !== a5Id
}

function openA5Migration() {
  a5MigrationOrigin.value = {
    edition_num_id: currentEdition.value.edition_num_id,
    program_version_id: modalForm.program_version_id,
    global_code: modalForm.global_code || currentEdition.value.global_code,
    program_name: modalForm.abbreviation || currentEdition.value.abbreviation,
    start_date: modalForm.start_date || currentEdition.value.start_date
  }
  showA5MigrationModal.value = true
}

async function handleA5Completed({ migrated, applyA5 }) {
  // El backend ya dejo la edicion en A5 (haya migrado o no), pero igual se guarda
  // el formulario: el usuario pudo cambiar docente, horario o vacantes en la misma
  // pasada y antes esos cambios se perdian en silencio cuando habia migracion.
  // Ya no choca con la guarda del backend: post-migracion no quedan alumnos vivos.
  if (!applyA5) toast.success(`Migracion completada: ${migrated} inscripcion(es) movidas`)
  // Si el guardado falla el modal queda abierto con los cambios: la edicion ya
  // esta en A5, pero el resto del formulario no se pierde.
  if (!(await persistEditionUpdate())) {
    toast.warning('La edición quedó en A5, pero los demás cambios no se guardaron. Revísalos y guarda de nuevo.')
    fetchSchedule()
  }
}

const editionForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(editionForm)

async function applyModalForm() {
  if (!requiredFieldsFilled()) return
  if (!isModalValid.value) {
    toast.warning('Complete los campos requeridos')
    return
  }

  if (isCancellingToA5()) {
    openA5Migration()
    return
  }

  await persistEditionUpdate()
}

async function persistEditionUpdate() {
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
        ...Object.fromEntries(CLASSROOM_LINKS.map(({ field }) => [field, modalForm[field] || null])),
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
    toast.error(err?.response?.data?.message || 'Ocurrió un error inesperado al procesar la solicitud')
  }
  return response?.result === 1
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
    start_date: null,
    end_date: null,
    instructor_id: null,
    instructor_label: null,
    cat_day_combination_id: null,
    cat_hour_combination_id: null,
    day_combination_label: null,
    hour_combination_label: null
  }))
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
// Guarda los switches y la nota de una fila. Va directo al update: el SP solo
// toca los campos que recibe (COALESCE), así que no hace falta leer la edición
// antes ni recargar el mes entero después. Si falla, se recarga para que la
// fila vuelva a lo que hay en la BD.
async function saveQuickChange(edition) {
  try {
    const response = await editionService.editionUpdate({
      id: edition.edition_num_id,
      edition: {
        expedient: edition.expedient ? 'Y' : 'N',
        upgrade: edition.upgrade ? 'Y' : 'N',
        preconfirmation: edition.preconfirmation ? 'Y' : 'N',
        confirmation: edition.confirmation ? 'Y' : 'N',
        new_methodology: edition.new_methodology ? 'Y' : 'N',
        notes: edition.notes
      }
    })
    if (response?.result === 1) {
      toast.success(response.message || 'Edición actualizada', { timeout: 1500 })
      return
    }
    toast.error(response?.message || 'Error al actualizar')
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Error de conexión al guardar cambios')
  }
  fetchSchedule()
}

function getChildDateConfig(index = null, bodyField = null) {
  const config = {};

  // LOGICA MIN/MAX
  // Una edición NUEVA del mes navegado arranca dentro de ese mes; una existente
  // se puede mover de mes (validateAndCalculate tampoco la ata). Los módulos
  // siguientes nunca empiezan antes que el anterior.
  if (bodyField) {
    config.minDate = bodyField.start_date;
  } else if ((index === 0 || index == null) && !currentEdition.value && !hasActiveFilters.value) {
    const y = selectedYear.value;
    const m = selectedMonth.value;
    const lastDay = new Date(y, m, 0).getDate();
    config.minDate = `${y}-${String(m).padStart(2, '0')}-01`;
    config.maxDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  } else if (index > 0) {
    const prevChild = modalForm.program_version_children[index - 1];
    if (prevChild && prevChild.start_date) {
      config.minDate = prevChild.start_date;
    }
  }

  const targetObj = (index !== null && modalForm.program_version_children[index])
    ? modalForm.program_version_children[index]
    : bodyField ? bodyField : modalForm;

  if (targetObj?.cat_day_combination_id) {
    const comboOption = catalogs.value.dayCombinationList.find(
      c => c.id === targetObj.cat_day_combination_id
    );

    // Flatpickr: solo los días de la semana del horario. En el INICIO además
    // se apagan los feriados (pedido de Producto, 06/10/26: antes solo avisaba).
    // El fin no se filtra: lo calcula el sistema saltando feriados.
    const allowedDays = allowedDaysOf(comboOption);
    const esInicio = !bodyField;
    if (allowedDays.length) {
      config.enable = [
        (date) => {
          if (!allowedDays.includes(date.getDay())) return false;
          if (!esInicio) return true;
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          return !holidayMap.value.has(dateStr);
        }
      ];
    }
  }

  return config;
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

   // Una edición no arranca en feriado (el picker ya los apaga; esto cubre la
   // fecha escrita a mano). El backend lo vuelve a validar al guardar.
   if (fieldKey === 'start_date' && holidayDates.value.includes(dateVal)) {
       const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
       const hName = hObj ? hObj.description : 'Feriado';
       toast.error(`No se puede iniciar en feriado (${hName}). Elige otro día.`);
       nextTick(() => { targetObj[fieldKey] = null; targetObj.end_date = null; });
       return;
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
const holidayMap = computed(() => new Map((catalogs.value.catHolidays || []).map(h => [h.variable_3, h.description])))

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


// Vista previa del calendario: misma regla que el fin calculado y el backend
// (features/edition-schedule/sessionCalendar.js).
function generatePreviewData(targetObj) {
  return sessionCalendar({
    startDate: targetObj.start_date,
    sessions: targetObj.sessions || targetObj.program_version_sessions,
    allowedDays: allowedDaysOf(catalogs.value.dayCombinationList.find(c => c.id === targetObj.cat_day_combination_id)),
    holidays: holidayMap.value
  })
}

// Helper simple para nombre de día
function getDayName(dateStr) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const d = new Date(dateStr + 'T00:00:00')
  return days[d.getDay()]
}

// --- NUEVOS HELPERS ---
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

  const allowedDays = allowedDaysOf(comboOption);

  if (allowedDays.length === 0) {
    toast.error("Error en configuración de días del catálogo.");
    return;
  }

  // 3. Validación de coherencia Día vs Combo
  const startDayIdx = weekdayOf(targetObj.start_date);

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

  // 4. Fin = última sesión contando días del horario y saltando feriados.
  const calculatedEndDate = sessionEndDate({
    startDate: targetObj.start_date, sessions: totalSessions, allowedDays, holidays: holidayMap.value
  });

  if (calculatedEndDate) {
    nextTick(() => {
      targetObj.end_date = calculatedEndDate;
    });
  } else {
    toast.error("No se pudo calcular fecha fin. Verifique días/feriados.");
  }
}
// Computed para aplanar todos los items (necesario para el componente)
const allScheduleItems = computed(() => {
  if (hasActiveFilters.value) {
    return historyList.value || []
  }
  return schedules.value.flatMap(week => week.items || [])
})

const numeroDeSemana = computed(() => numeradorDeSemanas(schedules.value))

const filteredSchedules = computed(() => {
  if (!schedules.value || schedules.value.length === 0) return []

  const hasFilter = hayFiltroDeColumna()

  const isActive = (item) => (item.active === true || item.active === 'Y') && item.cat_segment !== 'A5'

  const baseSchedules = (hasFilter || onlyCursos.value !== 'all' || onlyActivos.value)
    ? schedules.value.map(week => {
        const filteredItems = (week.items || []).filter(item => {
          if (onlyCursos.value === 'courses'  && item.program_type !== 'Curso') return false
          if (onlyCursos.value === 'programs' && item.program_type === 'Curso') return false
          if (onlyActivos.value && !isActive(item))                             return false
          return true
        })
        return { ...week, items: filteredItems }
      }).filter(week => week.items.length > 0)
    : schedules.value

  if (!hasFilter) return baseSchedules

  return baseSchedules.map(week => ({
    ...week,
    items: (week.items || []).filter(matchesColumnFilters)
  }))
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
const isTableLoading = ref(false)

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


// --- LÓGICA DE GAP ANALYSIS (Timeline Genérico) ---
const activeGapPreviewId = ref(null)
const gapPreviewData = ref([])
const isLoadingGap = ref(false)

// Fila "SELECCION" del analisis del padre. El padre no tiene fecha ni frecuencia
// propias en el formulario (solo los cursos y eventos las piden), asi que las
// toma de los hijos que ya se programaron en la tabla de estructura.
const parentGapContext = computed(() => {
  const children = (modalForm.program_version_children || []).map(child => ({
    start_date: child.start_date,
    day_label: describeCatalog(catalogs.value.dayCombinationList, child.cat_day_combination_id),
    hour_label: describeCatalog(catalogs.value.hourCombinationList, child.cat_hour_combination_id)
  }))

  const schedule = parentScheduleFromChildren(children)
  if (!schedule) return null

  return {
    ...schedule,
    edition_id: currentEdition.value?.edition_num_id,
    global_code: currentEdition.value?.global_code || 'NUEVA'
  }
})

function describeCatalog (list, id) {
  return (list || []).find(item => item.id === id)?.description
}

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
  const labelOf = (list, id) => list.find(x => x.id === id)?.description
  const history = historicalList.map(e => ({
    ...e,
    daysLabel: e.cat_day_combination || '—',
    hoursLabel: e.cat_hour_combination || '—'
  }))
  const current = {
    global_code: currentObj.global_code || 'NUEVA',
    start_date: currentObj.start_date,
    start_date_eff: currentObj.start_date,
    active: 'Y',
    daysLabel: currentObj.day_combination_label || labelOf(catalogs.value.dayCombinationList, currentObj.cat_day_combination_id) || '—',
    hoursLabel: currentObj.hour_combination_label || labelOf(catalogs.value.hourCombinationList, currentObj.cat_hour_combination_id) || '—'
  }
  return editionGapTimeline(history, current, currentObj.edition_id || currentEdition.value?.edition_num_id)
}
</script>

