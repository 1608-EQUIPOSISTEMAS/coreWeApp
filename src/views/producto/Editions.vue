<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <div class="title-icon" style="cursor: pointer;" @click="reloadSchedule()">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        
        <div class="title-main">
          {{ hasActiveFilters ? 'Resultados Históricos' : 'Cronograma Mensual' }}
        </div>
      </div>

      <div class="actions-bar">
        <div class="period-picker" v-if="!hasActiveFilters">
          <button type="button" class="btn btn-icon" @click="changeMonth(-1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <select
            v-model.number="selectedMonth"
            @change="fetchSchedule"
            class="form-select form-select-sm period-select"
          >
            <option
              v-for="(month, index) in months"
              :key="index"
              :value="index + 1"
            >
              {{ month }}
            </option>
          </select>

          <select
            v-model.number="selectedYear"
            @change="fetchSchedule"
            class="form-select form-select-sm year-select ms-1"
            style="width: 80px;"
          >
            <option :value="2024">2024</option>
            <option :value="2025">2025</option>
            <option :value="2026">2026</option>
          </select>
          
          <button type="button" class="btn btn-icon" @click="changeMonth(1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="header-actions">
           <button
            type="button"
            class="btn btn-outline me-2 btn-sm"
            :class="hasActiveFilters ? 'btn-primary' : 'btn-outline-secondary'"
            @click="showFilterModal = true"
          >
            <i class="fa-solid fa-filter me-1"></i>
            Filtros
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm" v-if="!hasActiveFilters"
            @click="showMetaModal = true"
          >
            <i class="fa-solid fa-layer-group me-1"></i>
            Resumen
          </button>
        </div>
      </div>
    </div>


    <div class="card-body border-bottom bg-light p-2" v-if="hasActiveFilters">
        <div class="d-flex align-items-center gap-2 flex-wrap">
            <small class="text-muted fw-bold me-2">Filtrado por:</small>
            
            <span v-if="activeFilters.program_version_label" class="badge bg-white text-dark border shadow-sm pe-1">
                Prog: {{ activeFilters.program_version_label }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('program_version_id'); removeFilter('program_version_label')"></i>
            </span>

            <span v-if="activeFilters.instructor_label" class="badge bg-white text-dark border shadow-sm pe-1">
                Docente: {{ activeFilters.instructor_label }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('instructor_id')"></i>
            </span>

            <span v-if="activeFilters.date_range" class="badge bg-white text-dark border shadow-sm pe-1">
                <i class="fa-regular fa-calendar me-1 text-muted"></i>
                {{ activeFilters.date_from }} al {{ activeFilters.date_to }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('date_range')"></i>
            </span>

            <span v-if="activeFilters.cat_category" class="badge bg-white text-dark border shadow-sm pe-1">
                Línea: {{ getCatalogLabel('we_program_category', activeFilters.cat_category) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_category')"></i>
            </span>

            <span v-if="activeFilters.cat_type_program" class="badge bg-white text-dark border shadow-sm pe-1">
                Cat: {{ getCatalogLabel('we_program_type', activeFilters.cat_type_program) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_type_program')"></i>
            </span>

             <span v-if="activeFilters.cat_course_category" class="badge bg-white text-dark border shadow-sm pe-1">
                Clasif: {{ getCatalogLabel('we_course_category', activeFilters.cat_course_category) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_course_category')"></i>
            </span>

            <span v-if="activeFilters.cat_segment" class="badge bg-white text-dark border shadow-sm pe-1">
                Seg: {{ getCatalogLabel('we_segment', activeFilters.cat_segment) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_segment')"></i>
            </span>

             <span v-if="activeFilters.cat_day_combination" class="badge bg-white text-dark border shadow-sm pe-1">
                Días: {{ getCatalogLabel('we_day_combination', activeFilters.cat_day_combination) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_day_combination')"></i>
            </span>

            <span v-if="activeFilters.cat_hour_combination" class="badge bg-white text-dark border shadow-sm pe-1">
                Horas: {{ getCatalogLabel('we_hour_combination', activeFilters.cat_hour_combination) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_hour_combination')"></i>
            </span>

            <span v-if="activeFilters.cat_model_modality" class="badge bg-white text-dark border shadow-sm pe-1">
                Mod: {{ getCatalogLabel('we_modality', activeFilters.cat_model_modality) }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('cat_model_modality')"></i>
            </span>

            <span v-if="activeFilters.clasification" class="badge bg-white text-dark border shadow-sm pe-1">
                Clasif: {{ activeFilters.clasification }}
                <i class="fa-solid fa-xmark ms-2 cursor-pointer text-muted hover-danger" @click="removeFilter('clasification')"></i>
            </span>

            <button class="btn btn-link btn-xs text-danger text-decoration-none" @click="clearAllFilters">
                Limpiar todo
            </button>
        </div>
    </div>

    <div class="card-body">
      <div class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="bg-warning text-dark text-center" style="width: 100px;">
                  
                <div class="d-flex justify-content-center">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    v-if="!hasActiveFilters"
                    @click="openEditModal(null)"
                  >
                   Nueva
                  </button>
                </div>
              </th>
              <th class="bg-warning text-dark">Programa</th>
              <th class="bg-warning text-dark">Detalle</th>
              <th class="bg-warning text-dark">F. INICIO</th>
              <th class="bg-warning text-dark">F. FIN</th>
              <th class="bg-warning text-dark">Horario</th>
              <th class="bg-warning text-dark">Docente</th>
              <th class="bg-warning text-dark text-center">Ficha/Mejora</th>
              <th class="bg-warning text-dark text-center">Confirm.</th>
              <th class="bg-warning text-dark">Observación</th>
              <th class="bg-warning text-dark">Edición</th>
            </tr>
          </thead>

          <tbody v-if="!hasActiveFilters">
            <template v-for="(week, wIndex) in schedules" :key="week.schedule">
              <tr
                class="week-header text-white"
                :class="{ 'is-collapsed': !week.isOpen }"
                @click="week.isOpen = !week.isOpen"
              >
                <td class="py-2 px-3 fw-bold bg-dark" colspan="11">
                  <i
                    class="fa-solid me-2 text-light"
                    :class="week.isOpen ? 'fa-chevron-down' : 'fa-chevron-right'"
                  ></i>
                  <span class="text-light">Semana {{ week.schedule }}</span>
                  <span class="ms-auto badge bg-primary d-flex float-end">
                    {{ week.items.length }} Ediciones
                  </span>
                </td>
              </tr>

              <tr
                  v-for="(e, eIndex) in week.items"
                  :key="e.edition_num_id"
                  v-show="week.isOpen"
                  :class="e.cat_segment ? 'row-segment-' + e.cat_segment.toLowerCase() : ''"
                >
                <td class="ta-right nowrap">
                  <div class="d-flex justify-content-center gap-1">
                     <button class="btn btn-icon-sm btn-light text-primary" @click.stop="openObjectivesModal(e)" title="Objetivos">
                       <i class="fa-solid fa-eye"></i>
                     </button>
                     <button :class="[
                            'btn btn-icon-sm btn-light',
                            (e.tree_detail.length == 0  && program_type != 'Curso')? 'text-secondary' : 'text-danger'
                          ]" @click.stop="openTreeModal(e)" title="Árbol">
                       <i class="fa-solid fa-book-bookmark"></i>
                     </button>
                     <button class="btn btn-icon-sm btn-light" @click.stop="openEditModal(e)" title="Editar">
                       <i v-if="e.program_type === 'Curso'" class="fa-solid fa-pen-to-square text-warning"></i>
                       <i v-else class="fa-solid fa-sitemap text-info"></i>
                     </button>
                  </div>
                </td>

                <td style="min-width: 100px;" class="minW">
                  <div class="name fw-bold">
                    <span style="cursor:pointer" class="text-primary text-decoration-hover" @click="filterDirectly({ program_version_id: e.program_version_id, program_version_label: e.program_abreviature })">
                      {{ e.program_abreviature || '—' }} 
                      <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>
                    </span>
                  </div>
                  <div class="muted small">
                    {{ e.version_code }}&nbsp <b> {{'('+e.program_sessions+')' }}</b>
                    <div class="muted small float-end">
                      {{ 'Seg: ' + e.cat_segment }}  {{ e.cat_course_category_alias?('| S: ' + e.cat_course_category_label):'' }}
                    </div>
                  </div>
                </td>
                
                <td style="min-width: 150px;" class="minW">
                  <div class="muted small">
                    {{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}
                  </div>
                  <div class="muted small">
                    {{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}
                  </div>
                  
                </td>

                <td style="min-width: 120px;" >
                  <div 
                    class="name small fw-bold text-primary cursor-pointer text-decoration-hover"
                    title="Filtrar solo por este día"
                    @click.stop="filterDirectly({ date_from: e.start_date, date_to: e.start_date, date_range: 'true' })"
                  >
                    {{ formatDate(e.start_date) }} <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>
                  </div>
                  <div class="muted small">
                    {{ 'CA: '+e.calc_da || 0 }}
                    <div class="muted small float-end">
                      {{ 'CP: '+e.calc_dp || 0 }}
                    </div>
                  </div>
                </td>
                <td class="minW">
                  <div class="small">{{ formatDate(e.end_date) }}</div>
                </td>
                <td 
                  style="min-width: 140px;" 
                  class="position-relative overflow-visible"
                  :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }"
                >
                  <div v-if="!e.schedules || e.schedules.length === 0" class="text-muted small">—</div>

                  <div v-else-if="e.schedules.length === 1">
                    <div class="name small fw-bold text-dark">
                      {{ e.schedules[0].day_combination_label || '—' }}
                    </div>
                    <div class="small text-muted">
                      {{ e.schedules[0].hour_combination_label }}
                    </div>
                  </div>

                  <div v-else class="schedule-dropdown-wrapper">
                    <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                      <div>
                        <div class="name small fw-bold text-dark">
                          {{ e.schedules[0].day_combination_label }}
                        </div>
                        <div class="small text-muted text-truncate" style="max-width: 90px;">
                          {{ e.schedules[0].hour_combination_label }}
                        </div>
                      </div>
                      <span class="badge bg-light text-primary border border-primary-subtle rounded-pill">
                        +{{ e.schedules.length - 1 }}
                      </span>
                    </div>

                    <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover shadow-sm">
                      <div class="popover-header-sm">
                          Horarios ({{ e.schedules.length }})
                          <button type="button" class="btn-close-xs" @click.stop="activeScheduleDropdown = null">&times;</button>
                      </div>
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

                <td style="min-width: 160px;" class="minW">
                  <div class="small text-truncate" style="max-width: 160px;" :title="e.instructor">
                    {{ e.instructor || '—' }}
                  </div>
                </td>

                <td class="text-center" style="min-width: 110px;">
                  <label class="form-switch scale-75" title="Ficha / Expediente">
                    <input 
                      type="checkbox" 
                      v-model="e.expedient" 
                      @change="updateQuickStatus(e, 'expedient')"
                    />
                    <span></span>
                  </label>
                  
                  <label class="form-switch scale-75" title="Mejora / Upgrade">
                    <input 
                      type="checkbox" 
                      v-model="e.upgrade" 
                      @change="updateQuickStatus(e, 'upgrade')"
                    />
                    <span></span>
                  </label>
                </td>

                <td class="text-center" style="min-width: 110px;">
                  <label class="form-switch scale-75" title="Pre-Confirmación">
                    <input 
                      type="checkbox" 
                      v-model="e.preconfirmation" 
                      @change="updateQuickStatus(e, 'preconfirmation')"
                    />
                    <span></span>
                  </label>
                  
                  <label class="form-switch scale-75" title="Confirmación">
                    <input 
                      type="checkbox" 
                      v-model="e.confirmation" 
                      @change="updateQuickStatus(e, 'confirmation')"
                    />
                    <span></span>
                  </label>
                </td>

                <td style="min-width: 150px;" class="minW">
                  <textarea 
                    class="form-control form-control-xs table-textarea" 
                    rows="2"
                    v-model="e.notes"
                    @blur="updateQuickNotes(e)"
                    placeholder="..."
                  ></textarea>
                </td>

                <td style="min-width: 100px;">
                  <div class="name fw-bold small">{{ e.global_code }}</div>
                  <div class="muted small">{{ 'A: ' +e.specific_code }}</div>
                  <div v-if="e.program_type_alias!='we_program_type_course'" class="muted small" style="font-size: 0.7rem;">{{ e.clasification? 'UNQ: ' + e.clasification:'' }}</div>
                  
                </td>
              </tr>
            </template>

          </tbody>

          <tbody v-if="hasActiveFilters">
            <tr
              v-for="(e, eIndex) in historyList"
              :key="e.edition_num_id"
              :class="e.cat_segment ? 'row-segment-' + e.cat_segment.toLowerCase() : ''"
            >
                <td class="ta-right nowrap">
                  <div class="d-flex justify-content-center gap-1">
                     <button class="btn btn-icon-sm btn-light text-primary" @click.stop="openObjectivesModal(e)" title="Objetivos">
                       <i class="fa-solid fa-eye"></i>
                     </button>
                     <button class="btn btn-icon-sm btn-light text-danger" @click.stop="openTreeModal(e)" title="Árbol">
                       <i class="fa-solid fa-book-bookmark"></i>
                     </button>
                     <button class="btn btn-icon-sm btn-light" @click.stop="openEditModal(e)" title="Editar">
                       <i v-if="e.program_type === 'Curso'" class="fa-solid fa-pen-to-square text-warning"></i>
                       <i v-else class="fa-solid fa-sitemap text-info"></i>
                     </button>
                  </div>
                </td>

                <td style="min-width: 200px;" class="minW">
                  <div class="name fw-bold">
                    {{ e.program_abreviature || '—' }}
                  </div>
                  <div class="muted small">
                    {{ e.version_code }}
                    <div class="muted small float-end">
                      {{ 'Seg: ' + e.cat_segment }}  {{ e.cat_course_category_alias?('| S: ' + e.cat_course_category_label):'' }}
                    </div>
                  </div>
                </td>
                
                <td style="min-width: 150px;" class="minW">
                  <div class="muted small">
                    {{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}
                  </div>
                  <div class="muted small">
                    {{ e.program_sessions != null ? 'Sesiones: ' + e.program_sessions : '' }}
                  </div>
                </td>

                <td class="minW">
                  <div class="name small fw-bold">{{ formatDate(e.start_date) }}</div>
                </td>
                <td class="minW">
                  <div class="small">{{ formatDate(e.end_date) }}</div>
                </td>

                <td 
                    style="min-width: 140px;" 
                    class="position-relative overflow-visible"
                    :style="{ zIndex: activeScheduleDropdown === e.edition_num_id ? 100 : 'auto' }"
                  >
                  <div v-if="!e.schedules || e.schedules.length === 0" class="text-muted small">—</div>

                  <div v-else-if="e.schedules.length === 1">
                    <div class="name small fw-bold text-dark">
                      {{ e.schedules[0].day_combination_label || '—' }}
                    </div>
                    <div class="small text-muted">
                      {{ e.schedules[0].hour_combination_label }}
                    </div>
                  </div>

                  <div v-else class="schedule-dropdown-wrapper">
                    <div class="d-flex align-items-center justify-content-between gap-1 cursor-pointer" @click.stop="toggleScheduleDropdown(e.edition_num_id)">
                      <div>
                        <div class="name small fw-bold text-dark">
                          {{ e.schedules[0].day_combination_label }}
                        </div>
                        <div class="small text-muted text-truncate" style="max-width: 90px;">
                          {{ e.schedules[0].hour_combination_label }}
                        </div>
                      </div>
                      <span class="badge bg-light text-primary border border-primary-subtle rounded-pill">
                        +{{ e.schedules.length - 1 }}
                      </span>
                    </div>

                    <div v-if="activeScheduleDropdown === e.edition_num_id" class="schedule-popover shadow-sm">
                      <div class="popover-header-sm">
                          Horarios ({{ e.schedules.length }})
                          <button type="button" class="btn-close-xs" @click.stop="activeScheduleDropdown = null">&times;</button>
                      </div>
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

                <td style="min-width: 160px;" class="minW">
                  <div class="small text-truncate" style="max-width: 160px;" :title="e.instructor">
                    {{ e.instructor || '—' }}
                  </div>
                </td>

                <td class="text-center" style="min-width: 110px;">
                  <label class="form-switch scale-75" title="Ficha / Expediente">
                    <input 
                      type="checkbox" 
                      v-model="e.expedient" 
                      @change="updateQuickStatus(e, 'expedient')"
                    />
                    <span></span>
                  </label>
                  
                  <label class="form-switch scale-75" title="Mejora / Upgrade">
                    <input 
                      type="checkbox" 
                      v-model="e.upgrade" 
                      @change="updateQuickStatus(e, 'upgrade')"
                    />
                    <span></span>
                  </label>
                </td>

                <td class="text-center" style="min-width: 110px;">
                  <label class="form-switch scale-75" title="Pre-Confirmación">
                    <input 
                      type="checkbox" 
                      v-model="e.preconfirmation" 
                      @change="updateQuickStatus(e, 'preconfirmation')"
                    />
                    <span></span>
                  </label>
                  
                  <label class="form-switch scale-75" title="Confirmación">
                    <input 
                      type="checkbox" 
                      v-model="e.confirmation" 
                      @change="updateQuickStatus(e, 'confirmation')"
                    />
                    <span></span>
                  </label>
                </td>

                <td style="min-width: 150px;" class="minW">
                  <textarea 
                    class="form-control form-control-xs table-textarea" 
                    rows="2"
                    v-model="e.notes"
                    @blur="updateQuickNotes(e)"
                    placeholder="..."
                  ></textarea>
                </td>

                <td style="min-width: 150px;">
                  <div class="name small">{{ e.global_code }}</div>
                  <div v-if="e.program_type_alias!='we_program_type_course'" class="muted small" style="font-size: 0.7rem;">{{ e.clasification? 'UNQ: ' + e.clasification:'' }}</div>
                </td>
              </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
<BaseModal v-model="showMetaModal" title="Resumen de Programación" size="xl">
  <div class="meta-dashboard p-3">
    <div class="card border-0 shadow-sm mb-4 overflow-hidden">
      <div class="card-body p-0">
        <div class="row g-0">
          
          <div class="col-md-4 bg-primary text-white p-4 d-flex flex-column justify-content-center align-items-center text-center position-relative">
            <i class="fa-solid fa-chart-line position-absolute start-0 bottom-0 opacity-25" style="font-size: 8rem; transform: translate(-20%, 20%);"></i>
            
            <h6 class="text-uppercase opacity-75 mb-2 letter-spacing-1">Avance Global</h6>
            <div class="display-3 fw-bold mb-0">
              {{ metaSummary.general.percentage }}<small class="fs-4">%</small>
            </div>
            <div class="progress w-100 bg-white bg-opacity-25 mt-3" style="height: 8px;">
              <div 
                class="progress-bar bg-white" 
                role="progressbar" 
                :style="{ width: metaSummary.general.percentage + '%' }"
              ></div>
            </div>
          </div>

          <div class="col-md-8 p-4 d-flex align-items-center bg-white">
            <div class="row w-100 text-center g-3">
              
              <div class="col-4 border-end">
                <div class="text-muted small text-uppercase fw-bold mb-1">Ventas (B2C)</div>
                <div class="fs-2 fw-bold text-dark">{{ metaSummary.general.sales }}</div>
                <div class="small text-success">
                  <i class="fa-solid fa-user-check me-1"></i> Inscritos
                </div>
              </div>

              <div class="col-4 border-end">
                <div class="text-muted small text-uppercase fw-bold mb-1">Corporativo (B2B)</div>
                <div class="fs-2 fw-bold text-dark">{{ metaSummary.general.b2b }}</div>
                <div class="small text-info">
                  <i class="fa-solid fa-building me-1"></i> Empresas
                </div>
              </div>

              <div class="col-4">
                <div class="text-muted small text-uppercase fw-bold mb-1">Objetivo Total</div>
                <div class="fs-2 fw-bold text-secondary">{{ metaSummary.general.target }}</div>
                <div class="small text-muted">
                  <i class="fa-solid fa-bullseye me-1"></i> Vacantes
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
    <div class="row g-4 mb-4">
      
      <div class="col-lg-8">
        <div class="meta-card h-100">
          <div class="meta-card__header">
            <i class="fa-solid fa-layer-group text-primary me-2"></i> Líneas de Negocio
          </div>
          <div class="meta-card__body">
            <div class="lines-grid">
              <div 
                v-for="(line, idx) in metaSummary.lines" 
                :key="idx" 
                class="line-item"
                :class="{ 'is-zero': line.count === 0 }"
              >
                <div class="line-item__name">{{ line.name }}</div>
                <div class="line-item__count">{{ line.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="meta-card h-100">
          <div class="meta-card__header">
            <i class="fa-solid fa-chart-pie text-success me-2"></i> Categorías
          </div>
          <div class="meta-card__body">
            <div class="d-flex flex-column gap-3">
              <div v-for="(cat, idx) in metaSummary.categories.filter(c => c.name !== 'Total' && c.name !='Minicurso')" :key="idx">
                <div class="d-flex justify-content-between mb-1 small fw-bold">
                  <span>{{ cat.name }}</span>
                  <span>{{ cat.count }}</span>
                </div>
                <div class="progress" style="height: 6px;">
                  <div 
                    class="progress-bar bg-info" 
                    role="progressbar" 
                    :style="{ width: (cat.count / (metaSummary.categories.find(c=>c.name==='Total')?.count || 1) * 100) + '%' }"
                  ></div>
                </div>
              </div>
              
              <div class="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                 <span class="text-muted small text-uppercase fw-bold">Total Programado</span>
                 <span class="badge bg-dark fs-6">{{ metaSummary.categories.find(c=>c.name==='Total')?.count || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      
      <div class="col-md-6">
        <div class="meta-card h-100">
          <div class="meta-card__header">
            <i class="fa-solid fa-tags text-warning me-2"></i> Clasificación por Tipo
          </div>
          <div class="meta-card__body p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0 align-middle">
                <thead class="table-light">
                  <tr>
                    <th class="px-3">Código</th>
                    <th>Descripción</th>
                    <th class="text-center px-3">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(type, idx) in metaSummary.types" :key="idx">
                    <td class="px-3">
                      <span class="badge rounded-pill bg-light text-dark border border-secondary fw-bold">
                        {{ type.code }}
                      </span>
                    </td>
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
          <div class="meta-card__header">
            <i class="fa-solid fa-list-ol text-danger me-2"></i> Segmentación Operativa
          </div>
          <div class="meta-card__body p-0">
             <div class="table-responsive">
              <table class="table table-sm table-hover mb-0 align-middle">
                <thead class="table-light">
                  <tr>
                    <th class="px-3">Seg.</th>
                    <th>Acción Requerida</th>
                    <th class="text-center px-3">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr :class="'row-segment-' + seg.code.toLowerCase()"   v-for="(seg, idx) in metaSummary.segments" :key="idx">
                    <td class="px-3">
                      <div class="segment-circle">{{ seg.code }}</div>
                    </td>
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
<BaseModal v-model="showFilterModal" title="Filtrar Cronograma" size="lg">
    <div class="p-3 row">
        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Buscar Programa</label>
            <SearchSelect
                v-model="filterForm.program_version_id"
                mode="remote"
                :fetcher="q => programService.programVersionCaller({ q })"
                label-field="program_type_for_iu"
                value-field="program_version_id"
                sublabel-field="version_code"
                placeholder="Buscar programa..."
                :cache="false"
                view-open="6"
                :model-label="filterForm.program_version_label" 
                @change="(opt) => filterForm.program_version_label = opt ? opt.program_type_for_iu : ''"
            />
          </div>
        
        <div class="mb-3 col-6">
             <label class="form-label small fw-bold">Docente</label>
             <SearchSelect
                v-model="filterForm.instructor_id"
                
                :cache="false"
                mode="remote"
                :fetcher="q => instructorService.instructorCaller({ q})"
                label-field="full_name"
                value-field="instructor_id"
                placeholder="Todos los docentes"
                :model-label="filterForm.instructor_label" 
                @change="(opt) => filterForm.instructor_label = opt ? opt.full_name : ''"
              />
        </div>

        <div class="row g-2 mb-3">
            <label class="form-label small fw-bold">Rango Fecha inicio</label>
              <BaseDatePicker
                v-model="filterForm.range_string"
                :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                placeholder="Seleccione rango (Desde a Hasta)"
                @on-change="handleRangeFilterChange"
            />
        </div>
<!-- 
        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Texto a buscar</label>
            <input type="text" class="form-control form-control-sm" v-model="filterForm.q" placeholder="Buscar por código, programa, docente..." />
        </div> -->
        
        <!--cat_segment cat_course_category cat_day_combination cat_hour_combination cat_model_modality-->
        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Línea de Negocio</label>
            <SearchSelect
                v-model="filterForm.cat_category"
                :items="catalogs.catLines"
                label-field="description"
                value-field="id"
                placeholder="Todas las líneas"
            />
        </div>

    
        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Categoría</label>
            <SearchSelect
                v-model="filterForm.cat_type_program"
                :items="catalogs.catCategories"
                label-field="description"
                value-field="id"
                placeholder="Todas las categorías"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Seguimiento Ediciòn</label>
            <SearchSelect
                v-model="filterForm.cat_course_category"
                :items="catalogs.catTypes"
                label-field="description"
                value-field="id"
                placeholder="S. Ediciòn"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Segmento</label>
            <SearchSelect
                v-model="filterForm.cat_segment"
                :items="catalogs.catSegments"
                label-field="description"
                value-field="id"
                placeholder="Todos los segmentos"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Días</label>
            <SearchSelect
                v-model="filterForm.cat_day_combination"
                :items="catalogs.dayCombinationList"
                label-field="description"
                value-field="id"
                placeholder="Todos los días"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Horas</label>
            <SearchSelect
                v-model="filterForm.cat_hour_combination"
                :items="catalogs.hourCombinationList"
                label-field="description"
                value-field="id"
                placeholder="Todas las horas"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Modalidad</label>
            <SearchSelect
                v-model="filterForm.cat_model_modality"
                :items="catalogs.modalityList"
                label-field="description"
                value-field="id"
                placeholder="Todas las modalidades"
            />
        </div>

        <div class="mb-3 col-6">
            <label class="form-label small fw-bold">Clasificaciòn</label>
            
            <!--input text -->
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
  <BaseModal
    v-model="showFormModal"
    :title="currentEdition ? 'Administrar Edición' : 'Nueva Edición'"
    size="xl"
  >
    <div class="modern-modal-layout">
        
        <div class="main-column">
            
            <div class="internal-header mb-3" v-if="currentEdition">
                 <div class="d-flex align-items-center gap-2">
                    <div class="badge-type" :class="isCourse ? 'bg-warning-subtle text-warning-emphasis' : 'bg-info-subtle text-info-emphasis'">
                        {{ isCourse ? 'CURSO' : 'PROGRAMA' }}
                    </div>
                    <h5 class="m-0 fw-bold text-dark">{{ currentEdition.program_abreviature }}</h5>
                    <div class="badge-type bg-primary-subtle text-primary-emphasis">
                        {{ 'Sesiones: '+modalForm.sessions }}
                    </div>
                 </div>
                 <div class="text-muted small mt-1 ms-1">
                    {{ currentEdition.global_code }} &bull; {{ currentEdition.specific_code || 'Sin Codigo Anual' }} &bull; {{ currentEdition.clasification || '' }} 
                 </div>
            </div>

            <section class="form-section">
                <div class="section-label">Definición General</div>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label-sm">Versión de Programa</label>
                        <SearchSelect
                            v-model="modalForm.program_version_id"
                            mode="remote"
                            :disabled="currentEdition && currentEdition.edition_num_id"
                            :fetcher="q => programService.programVersionCaller({ q, active:'Y', not_modality: catalogs.modalityList.find(e=> e.alias == 'we_modality_online').id })"
                            label-field="program_type_for_iu"
                            value-field="program_version_id"
                            placeholder="Buscar programa..."
                            :minChars="0"
                            :cache="false"
                            required
                            view-open="6"
                            :model-label="modalForm.abbreviation" 
                            @change="onProgramVersionChange"
                        />
                    </div>
                    <div class="col-6" v-if="modalForm.cat_type_program_alias === 'we_program_type_course'">
                         <label class="form-label-sm">Docente Asignado</label>
                         <SearchSelect
                            v-model="modalForm.instructor_id"
                            mode="remote"
                            :fetcher="q => instructorService.instructorCaller({ q })"
                            showSubValue
                            label-field="full_name"
                            sublabel-field="document_number"
                            
                            value-field="instructor_id"
                            placeholder="Buscar docente..."
                            :model-label="modalForm.instructor_label" 
                            :minChars="0"
                            :cache="false"
                         />

                    </div>
                  
                      <div class="col-3">
                          <label class="form-label-sm">Segmentación</label>
                          <SearchSelect
                              v-model="modalForm.cat_segment_id"
                              :items="catalogs.catSegments"
                              label-field="description"
                              value-field="id"
                              placeholder="OPCIONAL"
                          />

                      </div>

                      <div class="col-3 " v-if="modalForm.program_version_id">
                          <label class="form-label-sm">Vacantes</label>
                          <input type="number" class="form-control form-control-sm" v-model.number="modalForm.vacant" required  placeholder="VACANTES"/>
                      </div>
                </div>
            </section>

            <section class="form-section mt-3" v-if="modalForm.program_version_id && modalForm.cat_type_program_alias === 'we_program_type_course'">
                <div class="section-label">Logística y Horarios</div>
                <div class="row g-3">
                  <div class="col-md-6">
                        <label class="form-label-sm">Fecha Inicio</label>
                        <BaseDatePicker
                          v-model="modalForm.start_date"
                          :config="getChildDateConfig()"
                          :disabled="!modalForm.cat_day_combination_id"
                          :required="isCourse"
                          placeholder="dd/mm/aaaa"
                          @on-change="validateAndCalculate(modalForm, 'start_date')"
                        />
                  </div>
                  <div class="col-md-6 position-relative">
                    <label class="form-label-sm">Fecha Fin</label>
                    <div class="input-group input-group-sm">
                      <BaseDatePicker
                        v-model="modalForm.end_date"
                        :disabled="!modalForm.cat_day_combination_id"
                        :config="getChildDateConfig(null,modalForm)"
                        :required="isCourse"
                        placeholder="Calculado autom."
                      />
                      
                      <button 
                        class="btn btn-outline-secondary" 
                        type="button"
                        @click.stop="toggleSchedulePreview('main_parent', modalForm)"
                        title="Ver desglose de sesiones"
                      >
                        <i class="fa-solid fa-circle-info text-info"></i>
                      </button>
                    </div>

                    <div v-if="activePreviewId === 'main_parent'" class="schedule-preview-popover shadow-lg">
                      <div class="popover-header">
                        <span>Proyección de Sesiones</span>
                        <button type="button" class="btn-close-xs" @click="activePreviewId = null">&times;</button>
                      </div>
                      <div class="popover-content">
                        <div v-if="previewItems.length === 0" class="text-muted text-center p-2 small">
                          Faltan datos para calcular (Inicio, Días o Sesiones).
                        </div>
                        <table v-else class="table table-sm table-striped mb-0 small-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(item, idx) in previewItems" :key="idx" :class="{'table-danger': item.status === 'holiday'}">
                                <td class="fw-bold text-center">{{ item.sessionNum }}</td> <td>
                                  <div class="d-flex flex-column lh-1">
                                    <span>{{ formatDate(item.date) }}</span>
                                    <small class="text-muted" style="font-size: 0.65rem">{{ getDayName(item.date) }}</small>
                                  </div>
                                </td>
                                <td>
                                  <span v-if="item.status === 'valid'" class="badge bg-success-subtle text-success border border-success-subtle">OK</span>
                                  
                                  <div v-else class="text-danger fw-bold" style="font-size: 0.7rem;">
                                    <i class="fa-solid fa-ban me-1"></i> {{ item.desc }} </div>
                                </td>
                              </tr>
                            </tbody>
                        </table>
                      </div>
                    </div>
                    <div v-if="activePreviewId === 'main_parent'" class="click-overlay" @click="activePreviewId = null"></div>
                  </div>
                      <div class="col-md-6">
                          <label class="form-label-sm">Días</label>
                          <SearchSelect
                              v-model="modalForm.cat_day_combination_id"
                              :items="catalogs.dayCombinationList"
                              label-field="description"
                              value-field="id"
                              placeholder="Seleccione días"
                              :required="isCourse"
                              @change="calculateEndDate(modalForm)" 
                          />
                      </div>
                     <div class="col-md-6">
                        <label class="form-label-sm">Horas</label>
                        <SearchSelect
                            v-model="modalForm.cat_hour_combination_id"
                            :items="catalogs.hourCombinationList"
                            label-field="description"
                            value-field="id"
                            placeholder="Seleccione horario"
                            :required="isCourse"
                        />
                     </div>
                </div>
            </section>

            <section class="form-section mt-3" v-if="modalForm.program_version_id && modalForm.cat_type_program_alias !== 'we_program_type_course'">
                <div class="section-label">Estructura del Programa</div>
                <div class="hierarchy-container">
                    <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.8rem;">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 20%">Sub-Programa</th>
                                <th style="width: 20%">Edición</th>
                                <th style="width: 25%">Fechas</th>
                                <th style="width: 20%">Horario / Docente</th>
                                <th style="width: 15%">Config.</th>
                            </tr>
                        </thead>
                        <tbody>
                             <tr v-for="(child, index) in modalForm.program_version_children" :key="child.child_program_version_id" :class="{ 'opacity-50': isBlockedByPrevious(index) }">
                                 <td class="fw-bold text-dark">
                                   <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>&nbsp;
                                   <span class="text-primary text-decoration-hover" style="cursor:pointer"  @click="filterDirectly({ program_version_id: child.child_program_version_id, program_version_label: child.abbreviation })" >{{ child.abbreviation }}</span>
                                  <div class="text-xs text-muted" v-if="!child.edition_id">{{ 'Sesiones: '+ child.sessions }}</div>
                                 </td>
                                 
                                 <td>
                                     <div v-if="!child.edition_id" class="d-flex align-items-center gap-2 mb-2">
                                         <small class="text-muted">¿Nueva?</small>
                                         <label class="form-switch scale-75">
                                            <input 
                                        :disabled="isBlockedByPrevious(index) " type="checkbox" v-model="child.new" />
                                            <span></span>
                                         </label>
                                     </div>
                                     
                                     <SearchSelect
                                        v-if="!child.new && !child.edition_id"
                                        v-model="child.edition_id"
                                        mode="remote"
                                        :fetcher="(q) => searchEditionsFiltered(q, child,index)"
                                        label-field="label_for_iu"
                                        sublabel-field="specific_code"
                                        value-field="edition_num_id"
                                        placeholder="Vincular edición..."
                                        :minChars="0"
                                        :cache="false"
                                        @change="onChildEditionChange($event, child, index)"
                                        :disabled="child.new"
                                     />

                                     <!--botòn x borrar-->
                                     <button v-if="!child.new && child.edition_id" type="button" class="btn btn-sm btn-danger w-100 mb-0" @click="unlinkChildEdition(child)">
                                         <i class="fa-solid fa-times"></i> Desvincular
                                     </button>
                                     <div v-if="child.edition_id" class="p-1 bg-light border rounded text-center mb-0">
                                         <div class="fw-bold">{{ child.global_code }}</div>
                                         <div class="text-xs text-muted">{{ child.specific_code }}</div>
                                         <div class="text-xs text-muted">{{ 'Sesiones: '+ child.sessions }}</div>
                                     </div>
                                 </td>

                                 <td class="overflow-visible position-relative">
                                  <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                                    <BaseDatePicker
                                        v-model="child.start_date"
                                        :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id"
                                        class="mb-1"
                                        required
                                        placeholder="Inicio"
                                        :config="getChildDateConfig(index)"
                                        @on-change="validateAndCalculate(child, 'start_date', index)"
                                      />

                                    <div class="position-relative">
                                        <div class="input-group input-group-xs">
                                          <BaseDatePicker
                                            v-model="child.end_date"
                                            :disabled="isBlockedByPrevious(index) || !child.cat_day_combination_id"
                                            required
                                            :config="getChildDateConfig(null,child)"
                                            placeholder="Fin"
                                          />
                                          <button 
                                            class="btn btn-outline-secondary px-1" 
                                            type="button"
                                            @click.stop="toggleSchedulePreview('child_' + child.child_program_version_id, child)"
                                          >
                                            <i class="fa-solid fa-circle-info text-info" style="font-size: 0.8rem;"></i>
                                          </button>
                                        </div>

                                        <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="schedule-preview-popover shadow-lg" style="right: 0; left: auto; min-width: 250px;">
                                            <div class="popover-header">
                                              <span>Cronograma Estimado</span>
                                              <button type="button" class="btn-close-xs" @click="activePreviewId = null">&times;</button>
                                            </div>
                                            <div class="popover-content">
                                              <div v-if="previewItems.length === 0" class="text-muted text-center p-2 small">
                                                Datos insuficientes.
                                              </div>
                                              <table v-else class="table table-sm table-striped mb-0 small-table">
                                                  <thead>
                                                    <tr>
                                                      <th style="width: 30px;">#</th>
                                                      <th>Fecha</th>
                                                      <th>Obs.</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    <tr v-for="(item, idx) in previewItems" :key="idx" :class="{'table-danger': item.status === 'holiday'}">
                                                      <td class="fw-bold text-center small">{{ item.sessionNum }}</td>
                                                      <td>
                                                          {{ formatDate(item.date) }} <span class="text-muted text-xs">({{ getDayName(item.date) }})</span>
                                                      </td>
                                                      <td>
                                                        <i v-if="item.status === 'valid'" class="fa-solid fa-check text-success"></i>
                                                        <span v-else class="text-danger fw-bold text-xs">{{ item.desc }}</span>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                              </table>
                                            </div>
                                        </div>
                                        <div v-if="activePreviewId === ('child_' + child.child_program_version_id)" class="click-overlay" @click="activePreviewId = null"></div>
                                    </div>
                                    
                                  </div>
                                  <div v-else class="text-muted text-center">-</div>
                                </td>

                                 <td>
                                     <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                                      <SearchSelect 
                                          v-model="child.cat_day_combination_id" 
                                          :items="catalogs.dayCombinationList" 
                                          label-field="description" 
                                          value-field="id" 
                                          placeholder="Días" 
                                          :disabled="isBlockedByPrevious(index)"
                                          class="mb-1"
                                          @change="calculateEndDate(child); setChildren(modalForm.program_version_children, 'cat_day_combination_id',child.cat_day_combination_id)"
                                      />                                         
                                      <SearchSelect 
                                        v-model="child.cat_hour_combination_id" :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Horas" class="mb-1" 
                                        :disabled="isBlockedByPrevious(index)" @change="setChildren(modalForm.program_version_children, 'cat_hour_combination_id',child.cat_hour_combination_id)"
                                      />
                                      <SearchSelect 
                                        v-if="child.new || child.edition_id" v-model="child.instructor_id"
                            :cache="false" sublabel-field="document_number" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" label-field="full_name" value-field="instructor_id" placeholder="Docente" :model-label="child.instructor_label" 
                                      />
                                     </div>
                                      <div v-else class="text-muted text-center">-</div>
                                 </td>

                                 <td>
                                     <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                                         <div class="d-flex align-items-center gap-2">
                                            <label class="form-switch scale-75">
                                                <input type="checkbox" v-model="child.active"  />
                                                <span></span>
                                            </label>
                                            <small class="text-muted">Activo</small>
                                         </div>
                                         <div class="d-flex align-items-center gap-2">
                                            <label class="form-switch scale-75">
                                                <input @change="()=>{
                                                  if(child.preconfirmation && child.expedient){
                                                    child.confirmation=true
                                                  }else{
                                                    child.confirmation=false
                                                  }
                                                }" type="checkbox" v-model="child.preconfirmation"  />
                                                <span></span>
                                            </label>
                                            <small class="text-muted">PRE-cfm</small>
                                         </div>
                                         <div class="d-flex align-items-center gap-2">
                                            <label class="form-switch scale-75">
                                                <input @change="()=>{
                                                  if(child.preconfirmation && child.expedient){
                                                    child.confirmation=true
                                                  }else{
                                                    child.confirmation=false
                                                  }
                                                }" type="checkbox" v-model="child.expedient"  />
                                                <span></span>
                                            </label>
                                            <small class="text-muted">Ficha</small>
                                         </div>

                                         <div class="d-flex align-items-center gap-2">
                                            <label class="form-switch scale-75">
                                                <input @change="()=>{
                                                  if(child.confirmation){
                                                    child.preconfirmation=true
                                                    child.expedient=true
                                                  }else{
                                                    child.preconfirmation=false
                                                    child.expedient=false
                                                  }
                                                }" type="checkbox" v-model="child.confirmation"  />
                                                <span></span>
                                            </label>
                                            <small class="text-muted">Cfm</small>
                                         </div>
                                         
                                         
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
                <div class="status-card__header">
                    <i class="fa-solid fa-sliders me-2"></i> Configuración
                </div>
                  
                <div class="status-card__body">
                    <div class="switch-row" v-if="modalForm.cat_type_program_alias == 'we_program_type_course'">
                        <div class="switch-label">
                            <span class="fw-bold">Ficha</span>
                            <small class="d-block text-muted">Generar expediente</small>
                        </div>
                        <label class="form-switch">
                            <input type="checkbox" v-model="modalForm.expedient" />
                            <span></span>
                        </label>
                    </div>
                    <div class="switch-row" v-if="modalForm.cat_type_program_alias == 'we_program_type_course'">
                        <div class="switch-label">
                            <span class="fw-bold">Pre-Confirmación</span>
                        </div>
                        <label class="form-switch">
                            <input type="checkbox" v-model="modalForm.preconfirmation" />
                            <span></span>
                        </label>
                    </div>
                    <hr v-if="modalForm.cat_type_program_alias == 'we_program_type_course'" class="my-2 border-secondary-subtle">
                    <div class="switch-row" v-if="modalForm.cat_type_program_alias == 'we_program_type_course'">
                        <div class="switch-label">
                            <span class="fw-bold text-primary">Confirmación</span>
                        </div>
                        <label class="form-switch">
                            <input type="checkbox" v-model="modalForm.confirmation" />
                            <span></span>
                        </label>
                    </div>
                    <hr v-if="modalForm.cat_type_program_alias == 'we_program_type_course'" class="my-2 border-secondary-subtle">
                    <div class="switch-row" v-if="modalForm.cat_type_program_alias == 'we_program_type_course'">
                        <div class="switch-label">
                            <span class="fw-bold">Mejora</span>
                        </div>
                        <label class="form-switch">
                            <input type="checkbox" v-model="modalForm.upgrade" />
                            <span></span>
                        </label>
                    </div>
                    <div class="switch-row">
                        <div class="switch-label">
                            <span class="fw-bold">Estado(Activo)</span>
                        </div>
                        <label class="form-switch">
                            <input type="checkbox" v-model="modalForm.active" />
                            <span></span>
                        </label>
                    </div>
                    <hr v-if="modalForm.cat_type_program_alias == 'we_program_type_course'" class="my-2 border-secondary-subtle">
                    
                    <div class="col-12">
                         <label class="form-label-sm">Historico</label>
                         <input type="text"  class="form-control form-control-sm" v-model.number="modalForm.global_code" required />
                    </div>

                    <div class="col-12">
                         <label class="form-label-sm">Ed. Año</label>
                         <input type="text" class="form-control form-control-sm" v-model.number="modalForm.specific_code" required />
                    </div>

                </div>
            </div>
            <div class="status-card">
                 <div class="status-card__header">
                    <i class="fa-regular fa-comment-dots me-2"></i> Observaciones
                </div>
                <div class="status-card__body p-0">
                    <textarea
                        class="form-control border-0 bg-transparent"
                        rows="6"
                        v-model="modalForm.notes"
                        placeholder="Escriba aquí notas internas, acuerdos con docentes o detalles logísticos..."
                        style="resize: none; font-size: 0.85rem;"
                    ></textarea>
                </div>
            </div>

            <!-- <div class="status-card">
                 <div class="status-card__header">
                    <i class="fa-regular fa-solid fa-code-branch me-2"></i> Estructura Adjunta
                    <button type="button" class="btn btn-sm btn-outline-primary ms-2" style="cursor: pointer" @click="addAttachmentProgram">
                        <i class="fa-solid fa-plus text-sm"></i>
                    </button>
                </div>
                <div class="status-card__body p-0">

                    <div v-for="(child, index) in modalForm.attachments" :key="index" class="d-flex align-items-center gap-2 p-2 border-bottom">
                        <SearchSelect
                            v-model="child.program_version_attachment_id"
                            mode="remote"
                            :fetcher="q => programService.programVersionCaller({ q })"
                            label-field="abbreviation"
                            value-field="program_version_id"
                            placeholder="Buscar programa..."
                            :minChars="0"
                            :cache="false"
                            view-open="6"
                        />
                    </div>
                </div>
            </div> -->
        </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <div class="text-muted small fst-italic">
            <span v-if="currentEdition">Editando ID: {{ currentEdition.edition_num_id }}</span>
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-outline btn-sm px-3" @click="cleanFormModal();showFormModal = false">
            Cancelar
            </button>
            <button
            class="btn btn-primary btn-sm px-4 fw-bold"
            :disabled="!isModalValid"
            @click="applyModalForm"
            >
            <i class="fa-solid fa-save me-1"></i> Guardar Cambios
            </button>
        </div>
      </div>
    </template>
  </BaseModal>

<BaseModal v-model="showTreeModal" :title="treeModalTitle" size="lg">
  <div class="accordion-container p-3 bg-light rounded-3">
    
    <div v-if="!treeGroups.length" class="empty-state p-5 text-center">
      <div class="mb-3">
        <i class="fa-solid fa-sitemap fs-1 text-muted opacity-25"></i>
      </div>
      <h6 class="text-secondary">Sin estructura jerárquica</h6>
      <p class="text-muted small">Esta edición no tiene programas padres ni cursos hijos asociados.</p>
    </div>

    <div v-else class="d-flex flex-column gap-3">
      
      <div 
        v-for="(group, idx) in treeGroups" 
        :key="idx" 
        class="accordion-card bg-white border rounded shadow-sm overflow-hidden"
      >
        <div 
          class="accordion-header p-3 d-flex align-items-center justify-content-between cursor-pointer"
          :class="{ 'bg-primary-subtle': group.isOpen }"
          @click="toggleGroup(idx)"
        >
          <div class="d-flex align-items-center gap-3">
            <div class="icon-box bg-white text-primary border border-primary-subtle rounded p-2">
               <i class="fa-solid fa-layer-group"></i>
            </div>
            <div>
               <div class="badge bg-primary text-white mb-1" style="font-size: 0.65rem;">PROGRAMA PADRE</div>
               <h6 class="m-0 fw-bold text-dark">{{ group.abbreviation }}</h6>
               <div class="small text-muted">
                 {{ group.global_code }} &bull;<span class="badge-btn" style="cursor: pointer;" @click="filterDirectly({ clasification: group.clasification })" v-if="group.clasification"> {{ group.clasification }} 
                                   <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>&nbsp; </span>
               </div>
            </div>
          </div>

          <button class="btn btn-sm btn-icon text-muted">
             <i class="fa-solid fa-chevron-down transition-transform" :class="{ 'rotate-180': group.isOpen }"></i>
          </button>
        </div>

        <div v-show="group.isOpen" class="accordion-body border-top p-0">
           <div class="table-responsive">
              <table class="table table-hover mb-0" style="font-size: 0.85rem;">
                 <thead class="table-light text-muted text-uppercase" style="font-size: 0.7rem;">
                    <tr>
                       <th class="ps-4 py-2">Curso / Módulo</th>
                       <th class="py-2">Fechas</th>
                       <th class="py-2">Horario</th>
                       <th class="py-2 text-end pe-4">Estado</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr 
                      v-for="child in group.children" 
                      :key="child.edition_num_id || child.global_code"
                      :class="{ 'table-active': child.is_current }"
                    >
                       <td class="ps-4">
                          <div class="d-flex align-items-center gap-2">
                             <i class="fa-solid fa-book-open text-muted small"></i>
                             <div>
                                <div class="fw-bold text-dark">
                                  <span class="text-decoration-hover text-primary cursor-pointer"  @click.stop="filterDirectly({ program_version_id: child.program_version_id, program_version_label: child.abbreviation })">
                                   {{ child.program_abreviature || child.abbreviation }}
                                  </span>
                                   <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>&nbsp;
                                   <span v-if="child.is_current" class="badge bg-warning text-dark ms-1" style="font-size: 0.6rem">ACTUAL</span>
                                </div>
                                <div class="text-muted small" style="font-size: 0.7rem;">
                                   {{ child.global_code }} &bull; {{ child.specific_code }}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td>
                          <div v-if="child.start_date">
                              <span class="text-decoration-hover text-primary cursor-pointer"
                              @click.stop="filterDirectly({ date_from: child.start_date, date_to: child.start_date, date_range: 'true' })"
                              >
                                {{ formatDate(child.start_date) }} 
                              </span>
                              <i class="fa-solid fa-filter text-muted ms-1" style="font-size: 0.65rem;"></i>&nbsp;
                             <br>
                             <span class="text-muted text-xs">al {{ formatDate(child.end_date) }}</span>
                          </div>
                          <span v-else class="text-muted">-</span>
                       </td>
                       <td>
                          <div v-if="child.schedules && child.schedules.length">
                             <div class="fw-medium">{{ child.schedules[0].day_combination_label }}</div>
                             <div class="text-muted text-xs">{{ child.schedules[0].hour_combination_label }}</div>
                             <div v-if="child.schedules.length > 1" class="badge bg-light text-secondary border mt-1">
                                +{{ child.schedules.length - 1 }} más
                             </div>
                          </div>
                          <div v-else-if="child.day_combination_label">
                             <div class="fw-medium">{{ child.day_combination_label }}</div>
                             <div class="text-muted text-xs">{{ child.hour_combination_label }}</div>
                          </div>
                          <span v-else class="text-muted">-</span>
                       </td>
                       <td class="text-end pe-4">
                          <span 
                            class="badge border"
                            :class="child.active === 'Y' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-secondary-subtle text-secondary border-secondary-subtle'"
                          >
                             {{ child.active === 'Y' ? 'Activo' : 'Inactivo' }}
                          </span>
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

  <BaseModal v-model="showGoalsModal" title="Tablero de Control" size="xl">
      <div class="dashboard-layout p-3">
        
        <div class="d-flex justify-content-between align-items-end mb-4 border-bottom pb-2">
            <div>
              <h5 class="text-primary fw-bold mb-1">
                  {{ currentEdition?.program_abreviature }}
              </h5>
              <p class="text-muted small m-0">
                {{ currentEdition?.global_code }} | Periodo: <span class="fw-bold text-dark">{{ goalsSummary.label_periodo }}</span>
              </p>
            </div>
            <div class="text-end">
              <div class="display-6 fw-bold text-dark mb-0 lh-1">{{ goalsSummary.insc.total_aula }}</div>
              <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem; letter-spacing: 1px;">Total Inscritos</small>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-4">
              <div class="kpi-card h-100">
                  <div class="kpi-header">
                    <i class="fa-solid fa-users-viewfinder text-info"></i> Origen Inscritos
                  </div>
                  <ul class="list-group list-group-flush mt-3">
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span><i class="fa-solid fa-bullhorn text-muted me-2"></i>Venta Directa</span>
                        <span class="badge bg-primary rounded-pill">{{ goalsSummary.insc.ventas_prg }}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span><i class="fa-solid fa-headset text-muted me-2"></i>Seguimiento</span>
                        <span class="badge bg-info rounded-pill">{{ goalsSummary.insc.seguimiento }}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span><i class="fa-solid fa-briefcase text-muted me-2"></i>Corporativo (B2B)</span>
                        <span class="badge bg-secondary rounded-pill">{{ goalsSummary.insc.b2b }}</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <span><i class="fa-solid fa-handshake text-muted me-2"></i>Membresía</span>
                        <span class="badge bg-warning rounded-pill">{{ goalsSummary.insc.b2b }}</span>
                    </li>
                  </ul>
              </div>
            </div>

            <div class="col-md-4">
              <div class="kpi-card h-100">
                  <div class="kpi-header">
                    <i class="fa-solid fa-crosshairs text-danger"></i> Cumplimiento
                  </div>
                  
                  <div class="text-center py-3">
                    <div class="progress" style="height: 25px;">
                        <div 
                          class="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                          role="progressbar" 
                          :style="{ width: Math.min(goalsSummary.vacantes.porcentaje, 100) + '%' }"
                        >
                          {{ goalsSummary.vacantes.porcentaje }}%
                        </div>
                    </div>
                    <div class="d-flex justify-content-between mt-2 small text-muted fw-bold">
                        <span>0%</span>
                        <span>Meta: {{ goalsSummary.vacantes.objetivo }} vacantes</span>
                        <span>100%</span>
                    </div>
                  </div>

                  <div class="alert alert-light border mt-2 mb-0 text-center">
                    <div v-if="goalsSummary.vacantes.faltantes < 0" class="text-success fw-bold">
                        <i class="fa-solid fa-check-circle"></i> ¡Meta superada por {{ Math.abs(goalsSummary.vacantes.faltantes) }}!
                    </div>
                    <div v-else class="text-warning fw-bold">
                        <i class="fa-solid fa-triangle-exclamation"></i> Faltan {{ goalsSummary.vacantes.faltantes }} para meta
                    </div>
                  </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="kpi-card h-100">
                  <div class="kpi-header">
                    <i class="fa-solid fa-filter-circle-dollar text-success"></i> Embudo
                  </div>
                  
                  <div class="d-flex align-items-center justify-content-around mt-4">
                    <div class="text-center">
                        <h3 class="fw-bold text-muted mb-0">{{ goalsSummary.consultas.total }}</h3>
                        <small class="text-muted">Leads Totales</small>
                    </div>
                    <div class="text-muted"><i class="fa-solid fa-arrow-right"></i></div>
                    <div class="text-center">
                        <h3 class="fw-bold text-success mb-0">{{ goalsSummary.insc.total_aula }}</h3>
                        <small class="text-success">Ventas</small>
                    </div>
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

</template>
<script setup>
  
import { ref, reactive, computed, onMounted, inject, watch, nextTick } from 'vue' // <--- Agrega nextTick
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import DateRangePicker from '@/components/DateRangePicker.vue'

import BaseDatePicker from '@/components/BaseDatePicker.vue';

// Configuración opcional para que se vea bonito y en español
// Asegúrate de tener los componentes importados si los usas dentro de <script setup> 
// aunque en Vue 3 <script setup> suelen ser auto-detectados si están en components.d.ts, 
// pero es buena práctica dejarlos si ya estaban.
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'

// --- INYECCIONES ---
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')
const toast = useToast()
const date = ref();
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

/**
 * Calcula los totales comparando contra el Catálogo completo.
 * Incluye datos HARDCODEADOS para la sección de 'Avance Global' por ahora.
 */
function calculateMetaSummary() {
  // 1. Obtenemos todos los items del cronograma actual (aplanando las semanas)
  const allItems = schedules.value.flatMap(week => week.items || [])
  const totalItems = allItems.length


  // 3. Inicializamos los mapas con conteo en 0 (para que aparezcan todos)
  
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
  // Agregamos TOTAL real para las barras de progreso de categorías
  categoriesArray.push({ name: 'Total', count: totalItems }) 
  metaSummary.value.categories = categoriesArray

  metaSummary.value.types = Object.values(typesMap).sort((a, b) => b.count - a.count)
  metaSummary.value.segments = Object.values(segsMap).sort((a, b) => b.count - a.count)

  // -----------------------------------------------------------------------
  // 6. DATOS HARDCODEADOS PARA AVANCE GLOBAL (SOLO DEMO)
  // -----------------------------------------------------------------------
  // Aquí simulas los datos que pediste: 84 ventas, 3 B2B, 808 Objetivo
  const fakeSales = 84
  const fakeB2B = 3
  const fakeTarget = 808
  const fakeTotal = fakeSales + fakeB2B
  
  // Cálculo real del porcentaje basado en los datos fake
  const fakePercentage = fakeTarget > 0 
    ? ((fakeTotal / fakeTarget) * 100).toFixed(2) 
    : '0.00'

  metaSummary.value.general = {
    sales: fakeSales,
    b2b: fakeB2B,
    target: fakeTarget,
    percentage: fakePercentage // Debería dar aprox 10.77% con estos datos
  }
}

// --- LOGICA DE ÁRBOL (TREE MODAL) ---
const showTreeModal = ref(false)
const treeGroups = ref([]) // Usamos Grupos para el Acordeón
const treeModalTitle = ref('Estructura Académica')

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
    cat_type_program: null,
    cat_category: null,
    cat_model_modality: null,
    cat_segment: null,

    cat_course_category: null,
    program_version_label: null,
    active: null,
    cat_day_combination:null,
    cat_hour_combination: null
})

// Filtros activos (aplicados)
const activeFilters = reactive({})

// Computed para saber si estamos en "Modo Histórico"
const hasActiveFilters = computed(() => {
    return Object.keys(activeFilters).length > 0
})

function applyFilters() {
    // 1. Limpiar activeFilters
    for (const key in activeFilters) {
        delete activeFilters[key]
    }

    // 2. Copiar valores del formulario a los filtros activos
    for (const key in filterForm) {
        // Solo copiamos si tiene valor (no null, no string vacía, no undefined)
        if (filterForm[key] !== null && filterForm[key] !== '' && filterForm[key] !== undefined) {
            activeFilters[key] = filterForm[key]
        }
    }

    // 3. LOGICA ESPECIAL PARA FECHAS
    // El template espera 'date_range' para mostrar el chip, pero el form tiene start/end
    if (filterForm.date_from && filterForm.date_to) {
        activeFilters.date_range = true; 
    }

    // 4. Si no hay filtros, limpiar lista histórica
    if (Object.keys(activeFilters).length === 0) {
        historyList.value = []
    }
    saveState()
    // 5. Ejecutar búsqueda y cerrar modal
    fetchSchedule()
    showFilterModal.value = false
}

function removeFilter(key) {
    if(key === 'date_range') {
        delete activeFilters.date_from;
        delete activeFilters.date_to;
        delete activeFilters.date_range;
        filterForm.date_from = null;
        filterForm.date_to = null;
    } else if (key === 'instructor_id') {
         delete activeFilters.instructor_id;
         delete activeFilters.instructor_label;
         filterForm.instructor_id = null;
         filterForm.instructor_label = '';
    // AGREGADO: Limpieza específica para Programa
    } else if (key === 'program_version_id') {
         delete activeFilters.program_version_id;
         delete activeFilters.program_version_label;
         filterForm.program_version_id = null;
         filterForm.program_version_label = '';
    } else {
        delete activeFilters[key];
        filterForm[key] = null; // O '' dependiendo de tu tipo de dato
    }
    saveState()
    fetchSchedule();
}

function clearAllFilters(reload=true) {
    Object.keys(activeFilters).forEach(key => delete activeFilters[key]);
    // Reset form
    filterForm.q = '';
    filterForm.instructor_id = null;
    filterForm.instructor_label = '';
    filterForm.date_from = null;
    filterForm.date_to = null;
    filterForm.clasification = null;
    filterForm.program_version_id = null;
    filterForm.cat_type_program = null;
    filterForm.cat_category = null;
    filterForm.cat_model_modality = null;
    filterForm.cat_segment = null;
    filterForm.cat_course_category = null;
    filterForm.program_version_label = null;
    filterForm.active = null;
    filterForm.range_string = null;
    filterForm.cat_day_combination = null;
    filterForm.cat_hour_combination = null;
    saveState()

    if(reload)fetchSchedule();
    
}


// --- LISTADO ---
async function fetchSchedule() {
  try {

    if(!hasActiveFilters.value){
      const payload = {
        selectedMonth: selectedMonth.value,
        selectedYear: selectedYear.value,
        page: 1,
        size: 100 // Traemos suficientes para el resumen
      }
      const { items } = await editionService.editionByWeekList(payload)
      
      schedules.value = Array.isArray(items)
        ? items.map(w => ({ ...w, isOpen: true }))
        : []

      // Calculamos el resumen después de obtener los datos
      calculateMetaSummary()
    }else{
      const payload = {
        page: 1,
        size: 100,
        ...activeFilters
      }
      const { items } = await editionService.editionList(payload)
      
      historyList.value = items 
    }
      
    toast.success(hasActiveFilters.value?'Historico Actualizado':'Cronograma actualizado')
    
  } catch (err) {
    console.error('Error cargando cronograma:', err)
    toast.error('Error al cargar el listado')
    schedules.value = []
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
  catHolidays: (catalog && catalog.options('we_holiday')) || []
}
)
// 2. Función para procesar el cambio del DatePicker
function handleRangeFilterChange(selectedDates, dateStr) {
  debugger
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
const isCourse = computed(() => modalForm.cat_type_program_alias === 'we_program_type_course')

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


    if (handleServiceResponse(response)) {
      await fetchSchedule()
      cleanFormModal()
      showFormModal.value = false
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

/**
 * Maneja el blur del textarea de notas
 * Permitido para CUALQUIER tipo de edición
 */
async function updateQuickNotes(edition) {
  // Solo guardamos si realmente hay algo distinto (opcional, pero ahorra llamadas)
  // Como no tenemos el valor "original" fácil a mano, guardamos siempre al blur.
  await saveQuickChange(edition)
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
    if (response.ok) {
      toast.success('Edición actualizada correctamente', { timeout: 1500 })
    } else {
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

  // Usamos split para evitar problemas de zona horaria al instanciar Date
  const [y, m, d] = dateVal.split('-').map(Number);

  // 1. Validar Mes y Año (Dashboard context)
  if (y !== selectedYear.value || m !== selectedMonth.value) {
    toast.info(`La fecha debe pertenecer a ${months.value[selectedMonth.value - 1]} del ${selectedYear.value}`);
    targetObj[fieldKey] = null; // Limpiar el input
    return;
  }

  // 2. Validar Feriados (CORREGIDO: Usamos holidayDates.value)
  if (holidayDates.value.includes(dateVal)) {
    // Buscamos el nombre para que el mensaje sea más útil
    const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
    const hName = hObj ? hObj.description : 'Feriado';
    
    toast.info(`La fecha seleccionada es feriado (${hName}) y no está permitida.`);
    targetObj[fieldKey] = null; // Limpiar el input
    return;
  }
}

function getChildDateConfig(index = null, bodyField = null) {
  const config = {};
  
  // --- LÓGICA DE FECHAS MIN/MAX (YA EXISTENTE) ---
  if (bodyField) {
    config.minDate = bodyField.start_date;
  }else{
    if(!hasActiveFilters.value || !currentEdition.value){
      if ((index === 0 || index == null)) {
        const y = selectedYear.value;
        const m = selectedMonth.value;
        const lastDay = new Date(y, m, 0).getDate();
        config.minDate = `${y}-${String(m).padStart(2, '0')}-01`;
        config.maxDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
      } else {
        const firstChild = modalForm.program_version_children[index-1];
        if (firstChild && firstChild.start_date) {
          config.minDate = firstChild.start_date;
        }
      }
    }
  }
  // --- NUEVA LÓGICA: HABILITAR SOLO DÍAS ESPECÍFICOS ---
  // Determinar el objeto a evaluar (modalForm para curso, o el hijo específico)
  const targetObj = (index !== null && modalForm.program_version_children[index]) 
    ? modalForm.program_version_children[index] 
    : bodyField?bodyField:modalForm;

  // Si hay una combinación de días seleccionada, aplicar filtro
  if (targetObj?.cat_day_combination_id) {
    const comboOption = catalogs.value.dayCombinationList.find(
      c => c.id === targetObj.cat_day_combination_id
    );

    if (comboOption && comboOption.variable_2) {
      try {
        // Parsear el array de días desde variable_2 (ej: "[1,3,5]")
        const allowedDays = JSON.parse(comboOption.variable_2);
        
        // Flatpickr: Solo habilitar esos días específicos
        config.enable = [
          (date) => {
            const dayOfWeek = date.getDay();
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            

            // Debe estar en los días permitidos Y no ser feriado
            return allowedDays.includes(dayOfWeek) && !holidayDates.value.includes(dateStr);
          }
        ];
      } catch (e) {
        console.error('Error parseando días:', e);
      }
    }
  }

  // --- DESHABILITAR FERIADOS (ADICIONAL) ---
  // Si también quieres que los feriados NO se puedan seleccionar, agrega:
  // if (!config.disable) config.disable = [];
  // config.disable.push(...holidayDates.value);

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
   if (!dateVal) return;
   const [y, m, d] = dateVal.split('-').map(Number);

   // Definir claramente cuándo validar mes/año
   const shouldValidateMonthYear = !hasActiveFilters.value && 
                                    !currentEdition.value && 
                                    (index === null || index === 0);

   if (shouldValidateMonthYear && (y !== selectedYear.value || m !== selectedMonth.value)) {
      toast.info(`La fecha debe pertenecer al periodo seleccionado (${months.value[selectedMonth.value - 1]} ${selectedYear.value}).`);
       
       // SOLUCIÓN AQUÍ: Usamos nextTick para forzar la limpieza
       nextTick(() => {
           targetObj[fieldKey] = null;
           // Si es la fecha de inicio, limpiamos también la de fin para evitar inconsistencias
           if (fieldKey === 'start_date') {
               targetObj.end_date = null;
           }
       });
      
       targetObj[fieldKey] = null;
       targetObj.start_date =null;
       targetObj.end_date = null;
       return;
   }
   
   if (index !== null && index > 0) {
      const firstChild = modalForm.program_version_children[0]; 
      
      // Validar que no sea anterior al primero
      if (firstChild.start_date && dateVal < firstChild.start_date) {
        toast.warning(`No puede iniciar antes que el primer módulo.`);
        
        nextTick(() => {
            targetObj[fieldKey] = null;
            targetObj.end_date = null; 
        });
        return;
      }

      // Validar contra el hermano anterior (Opcional, según tu lógica actual)
      const previousChild = modalForm.program_version_children[index - 1];
      if (previousChild.start_date && dateVal < previousChild.start_date) {
        toast.warning(`Orden cronológico inválido.`);
        
        nextTick(() => {
            targetObj[fieldKey] = null;
            targetObj.end_date = null; 
        });
        return;
      }
    }

    
   if (holidayDates.value.includes(dateVal)) {
       const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
       const hName = hObj ? hObj.description : 'Feriado';
       
       toast.info(`La fecha de inicio no puede ser un feriado (${hName}).`);
       // SOLUCIÓN AQUÍ: Usamos nextTick para forzar la limpieza
       nextTick(() => {
           targetObj[fieldKey] = null;
           // Si es la fecha de inicio, limpiamos también la de fin para evitar inconsistencias
           if (fieldKey === 'start_date') {
               targetObj.end_date = null;
           }
       });
       return;
   }

   // 2. Si es Fecha de Inicio, calcular Fecha Fin automáticamente
   if (fieldKey === 'start_date') {
       calculateEndDate(targetObj);
       
       // VALIDACIÓN EN CASCADA para hijos
       if (index !== null && modalForm.program_version_children.length > index + 1) {
         const currentChild = modalForm.program_version_children[index];
         const nextChild = modalForm.program_version_children[index + 1];
         
         // Avisar si hay conflicto cronológico con el siguiente
         if (currentChild.end_date && nextChild.start_date && 
             currentChild.end_date > nextChild.start_date) {
           toast.warning(
             `Atención: El cambio en "${currentChild.abbreviation}" afecta al módulo siguiente.`,
             { timeout: 4000 }
           );
         }
       }
   }
}

// REEMPLAZO DEL ARRAY ANTIGUO
const holidayDates = computed(() => {
  // Asegúrate de que 'catalogs.value.catHolidays' exista (array vacío por defecto)
  return (catalogs.value.catHolidays || []).map(h => h.variable_3) // Aquí vienen las fechas 'YYYY-MM-DD'
})


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

// Helper para alternar la visibilidad
function toggleSchedulePreview(uniqueId, targetObj) {
  if (activePreviewId.value === uniqueId) {
    activePreviewId.value = null
    return
  }
  // Generar la data
  previewItems.value = generatePreviewData(targetObj)
  activePreviewId.value = uniqueId
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
  // 3. ASIGNACIÓN DE DATOS (Si pasó la validación anterior)
  child.edition_id = edition.edition_num_id; // Asegurar que se setea el ID
  child.start_date = edition.start_date?.slice(0, 10) || null;
  child.end_date = edition.end_date?.slice(0, 10) || null;
  
  child.cat_day_combination_id = edition.cat_day_combination_id;
  child.cat_hour_combination_id = edition.cat_hour_combination_id;
  
  child.instructor_id = edition.instructor_id;
  child.instructor_label = edition.instructor_label || '';
  
  child.global_code = edition.global_code;
  child.specific_code = edition.specific_code;
  
  // Mapeo de valores 'Y'/'N' a Booleanos
  child.active = edition.active === 'Y';
  child.confirmation = edition.confirmation === 'Y';
  child.preconfirmation = edition.preconfirmation === 'Y';
  child.expedient = edition.expedient === 'Y';
  
  child.sessions = edition.sessions;


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
  // La primera fila nunca se bloquea
  if (index === 0) return false

  // QUITA 'this.'
  const prev = modalForm.program_version_children[index - 1] 
  
  // QUITA 'this.'
  return !isChildComplete(prev) 
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
  // 1. Llamar al servicio original
  const response = await editionService.editionCaller({ 
    q, 
    program_version_id: child.child_program_version_id,
    //si es el primer hijo y es new que se rija bajo el mesy año seleccionado
    ...(!hasActiveFilters.value ? {
      month: selectedMonth.value,
      year: selectedYear.value
    } : {})
  });

  if (!Array.isArray(response)) return [];

  // --- LÓGICA DE LÍMITE INFERIOR (Hermanos Anteriores) ---
  let minDateLimit = null; // Fecha mínima permitida (piso)

  if (index > 0) {
    const arrItemsBefore = modalForm.program_version_children.slice(0, index);
    const prevDates = arrItemsBefore
      .map(item => item.start_date)
      .filter(date => date);

    if (prevDates.length > 0) {
      prevDates.sort(); 
      // Queremos la ÚLTIMA fecha de los anteriores (la más grande)
      minDateLimit = prevDates[prevDates.length - 1]; 
    }
  }

  // --- LÓGICA DE LÍMITE SUPERIOR (Hermanos Siguientes) ---
  let maxDateLimit = null; // Fecha máxima permitida (techo)

  // slice(index + 1) toma desde el siguiente hasta el final
  const arrItemsAfter = modalForm.program_version_children.slice(index + 1);
  const nextDates = arrItemsAfter
    .map(item => item.start_date)
    .filter(date => date);

  if (nextDates.length > 0) {
    nextDates.sort(); 
    // Queremos la PRIMERA fecha de los siguientes (la más pequeña / más pronta)
    // porque no podemos empezar después de que el siguiente empiece.
    maxDateLimit = nextDates[0]; 
  }

  // --- FILTRADO FINAL ---
  const filteredResponse = response.filter(edition => {
    // Seguridad: Si la edición no tiene fecha, la descartamos (o la dejas, según tu regla de negocio)
    if (!edition.start_date) return false;

    const editionDate = edition.start_date;

    // 1. Validar contra el pasado (PISO)
    // Si existe límite inferior y la edición es menor a ese límite -> False
    if (minDateLimit && editionDate < minDateLimit) {
      return false;
    }

    // 2. Validar contra el futuro (TECHO)
    // Si existe límite superior y la edición es mayor a ese límite -> False
    if (maxDateLimit && editionDate > maxDateLimit) {
      return false;
    }
    
    // si es una edición nueva la modal y tambien hasActiveFilters es false y es una edicion nueva hija y es la es la primera hija, tiene que ser del mismo mes y año del selectedMonth y year
    if (
      !currentEdition.value &&
      !hasActiveFilters.value &&
      index === 0 &&
      !child.new
    ) {
      const date = new Date(editionDate);

      const editionMonth = date.getUTCMonth() + 1; // 1–12
      const editionYear  = date.getUTCFullYear();

      if (
        editionMonth !== selectedMonth.value ||
        editionYear !== selectedYear.value
      ) {
        return false;
      }
    }

    // Si pasa ambas, es válida
    return true;
  });

  return filteredResponse;
}
</script>

<style scoped>
/* ESTILOS GENERALES (Mantenidos y pulidos) */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
  margin-bottom: 1.5rem;
}
.card-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 0; } /* Padding 0 para que la tabla toque los bordes */

.title { display: flex; align-items: center; gap: .75rem; color: #111827; font-weight: 600; }
.title-icon { width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; }

.actions-bar { display: flex; gap: 0.5rem; align-items: center; }
.period-picker { display: flex; align-items: center; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 0.15rem; }
.btn-icon { border: none; background: transparent; color: #6b7280; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.btn-icon:hover { background: #e5e7eb; color: #111827; }

.form-select-sm { font-size: 0.85rem; border: none; background-color: transparent; box-shadow: none; font-weight: 500; cursor: pointer; }
.form-select-sm:focus { box-shadow: none; }

/* TABLA PRINCIPAL */
.table th { font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem; vertical-align: middle; }
.table td { font-size: 0.85rem; padding: 0.6rem 0.75rem; vertical-align: middle; border-bottom: 1px solid #f3f4f6; }
.week-header { cursor: pointer; transition: all 0.2s; }
.week-header:hover td { filter: brightness(0.98); }
.minW { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* BOTONES PEQUEÑOS EN TABLA */
.btn-icon-sm { width: 26px; height: 26px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid transparent; transition: all 0.2s; }
.btn-icon-sm:hover { border-color: #d1d5db; background: #fff; transform: translateY(-1px); }

/* ---- NUEVO DISEÑO DE MODAL (MODERN LAYOUT) ---- */

.modern-modal-layout {
    display: grid;
    grid-template-columns: 1fr 200px; /* Columna principal flexible, Sidebar fija */
    gap: 1.5rem;
    min-height: 400px;
}

@media (max-width: 992px) {
    .modern-modal-layout { grid-template-columns: 1fr; } /* Stack en tablet/movil */
}

/* Columna Principal */
.main-column {
    display: flex;
    flex-direction: column;
}

/* Badge de tipo de programa */
.badge-type {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
}

/* Secciones del formulario */
.form-section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
    position: relative;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.section-label {
    position: absolute;
    top: -10px;
    left: 12px;
    background: #fff;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.form-label-sm {
    font-size: 0.78rem;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 0.25rem;
    display: block;
}

.form-control-sm, .form-select-sm {
    font-size: 0.85rem;
    border-radius: 0.375rem;
}
.form-control-xs {
    font-size: 0.75rem;
    padding: 0.2rem 0.4rem;
}

/* Tabla Jerarquía dentro del modal */
.hierarchy-container {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    overflow: visible; /* <--- PERMITE QUE EL POPUP SALGA */
}
.text-xs { font-size: 0.7rem; }

/* SIDEBAR Y TARJETAS DE ESTADO */
.sidebar-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.status-card {
    background: #f8fafc; /* Fondo gris azulado muy suave */
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
}

.status-card__header {
    background: #f1f5f9;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
}

.status-card__body {
    padding: 1rem;
}

/* Filas de Switches */
.switch-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}
.switch-row:last-child { margin-bottom: 0; }

.switch-label {
    font-size: 0.85rem;
    color: #334155;
    line-height: 1.2;
}

/* Form Switch */
  .form-switch { position: relative; width: 25px; height: 24px; display: inline-block; }
  .form-switch input { display: none; }
  .form-switch span {
    position: absolute; inset: 0; background: #d4def3; border-radius: 9999px; transition: .2s;
  }
  .form-switch span::after {
    content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%;
    position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
  }
  .form-switch input:checked + span { background: #255095; }
  .form-switch input:checked + span::after { left: 21px; }

.scale-75 { transform: scale(0.75); transform-origin: center; }

/* Empty state styling */
.empty-state {
    text-align: center;
    color: #9ca3af;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
/* --- ESTILOS DROPDOWN HORARIO --- */
.schedule-dropdown-wrapper {
  position: relative;
}
.cursor-pointer { cursor: pointer; }

/* El popover flotante */
.schedule-popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1050; /* Debe ser mayor que la tabla */
  min-width: 220px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-top: 5px;
  overflow: hidden;
}

.popover-header-sm {
  background: #f9fafb;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.popover-body-sm {
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.btn-close-xs {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  color: #9ca3af;
  cursor: pointer;
}
.btn-close-xs:hover { color: #ef4444; }

/* Overlay invisible para cerrar clicando fuera */
.click-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 1040;
  cursor: default;
}

/* --- ESTILOS TREE MODAL --- */
.tree-card {
  transition: transform 0.2s;
}
.tree-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important;
}
.node-icon {
  width: 40px; height: 40px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
}

/* --- ESTILOS DASHBOARD/GOALS MODAL --- */
.kpi-card {
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.kpi-header {
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 0.5rem;
}
.ls-1 { letter-spacing: 1px; }

/* --- ESTILOS META DASHBOARD (RESUMEN) --- */

.meta-dashboard {
  background-color: #f8fafc;
  border-radius: 8px;
}

.meta-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden; /* Para las tablas */
  display: flex;
  flex-direction: column;
}

.meta-card__header {
  background: #fff;
  padding: 1rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  border-bottom: 1px solid #f1f5f9;
}

.meta-card__body {
  padding: 1.25rem;
  flex: 1;
}

/* Grid de Líneas */
.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.line-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  text-align: center;
  transition: all 0.2s;
}

.line-item:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.line-item.is-zero {
  opacity: 0.6;
  background: #fff;
  border-style: dashed;
}

.line-item__name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.line-item__count {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
}

.line-item.is-zero .line-item__count {
  color: #cbd5e1;
}

/* Círculo de Segmento */
.segment-circle {
  width: 24px; height: 24px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
}

/* --- ESTILOS ACORDEÓN ÁRBOL --- */
.accordion-container {
  min-height: 200px;
}

.accordion-card {
  transition: all 0.2s ease-in-out;
}

.accordion-header {
  transition: background-color 0.2s;
}
.accordion-header:hover {
  background-color: #f8fafc; /* Gris muy claro al hover */
}

/* Rotación de la flecha */
.transition-transform {
  transition: transform 0.3s ease;
}
.rotate-180 {
  transform: rotate(180deg);
}

.icon-box {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}

/* Estilos de tabla interna */
.text-xs {
  font-size: 0.7rem;
}

/* Highlight para la fila actual (si estoy viendo SQL y sale en la lista) */
.table-active {
  background-color: #fffbeb !important; /* Amarillo muy suave */
}
.table-active td:first-child {
  border-left: 3px solid #f59e0b; /* Borde naranja a la izquierda */
}

.lines-grid {
  /* ... tus estilos actuales de grid (display: grid, etc.) ... */
  
  /* LÍMITE DE ALTURA Y SCROLL */
  max-height: 350px; /* Ajusta este valor según el espacio que desees */
  overflow-y: auto;  /* Activa el scroll vertical solo si se pasa la altura */
  
  /* Opcional: un poco de padding para que el texto no choque con la barra */
  padding-right: 5px; 
}

/* Opcional: Estilizar la barra de scroll para que se vea moderna y delgada */
.lines-grid::-webkit-scrollbar {
  width: 6px;
}
.lines-grid::-webkit-scrollbar-track {
  background: #f1f1f1; 
  border-radius: 4px;
}
.lines-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1; 
  border-radius: 4px;
}
.lines-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8; 
}
.letter-spacing-1 {
  letter-spacing: 1px;
}
/* Asegura que el borde redondeado no se corte mal con la columna de color */
.card {
  border-radius: 12px; 
}
.display-3 {
  font-size: 3.5rem;
}
/* Estilo para el textarea dentro de la tabla */
.table-textarea {
  resize: none; /* Evita que el usuario cambie el tamaño y rompa la tabla */
  background-color: transparent;
  border: 1px solid transparent; /* Invisible por defecto */
  transition: all 0.2s;
  font-size: 0.8rem;
  line-height: 1.2;
  box-shadow: none;
}

.table-textarea:hover {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.table-textarea:focus {
  background-color: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
/* --- COLORES POR SEGMENTO (A1 - A6) --- */

/* Definición de variables de color por clase */
.row-segment-a1 { --seg-bg: #eff6ff; --seg-border: #93c5fd; } /* Rojo suave */
.row-segment-a2 { --seg-bg: #fbebd8; --seg-border: #fbb56a; } /* Naranja suave */
.row-segment-a3 { --seg-bg: #f9f6d8; --seg-border: #fde047; } /* Amarillo suave */
.row-segment-a4 { --seg-bg: #f8f4c9; --seg-border: #edce33; } /* Verde suave */
.row-segment-a5 { --seg-bg: #f9d5d8; --seg-border: #fb7185; } /* Azul suave */
.row-segment-a6 { --seg-bg: #ebddfa; --seg-border: #d1a9fb; } /* Violeta suave */

/* Aplicación a las celdas de la fila */
tr[class*="row-segment-"] td {
  background-color: var(--seg-bg) !important;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

/* Indicador visual fuerte a la izquierda de la primera celda */
tr[class*="row-segment-"] td:first-child {
  border-left: 4px solid var(--seg-border) !important;
}

/* Efecto Hover para filas coloreadas (oscurece un poco) */
tr[class*="row-segment-"]:hover td {
  filter: brightness(0.97);
}

/* Clase de utilidad para permitir que el popover salga de la celda */
.overflow-visible {
  overflow: visible !important;
}

/* Ajuste para asegurar que el popover siempre esté encima */
.schedule-popover {
  /* ... tus estilos actuales ... */
  z-index: 1000; 
  background: white; /* Importante para que no sea transparente */
}

/* El wrapper debe mantenerse relativo */
.schedule-dropdown-wrapper {
  position: relative;
  z-index: inherit; /* Hereda el z-index alto del TD cuando está activo */
}

/* Popover de Previsualización */
.schedule-preview-popover {
  position: absolute;
  top: 100%; /* Justo debajo del input */
  z-index: 100000; /* Mayor que el modal y otros popovers */
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 300px; /* Ancho fijo para buena lectura */
  max-width: 90vw;
  margin-top: 4px;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
}
.opacity-50 {
  opacity: 0.5;
}
/* Animación suave */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.popover-header {
  background: #f8fafc;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: #334155;
}

.popover-content {
  max-height: 250px; /* Scroll si son muchas sesiones */
  overflow-y: auto;
  background: #fff;
}

.small-table {
  font-size: 0.75rem;
}
.small-table th {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  box-shadow: 0 1px 0 #e2e8f0;
}
.small-table td {
  vertical-align: middle;
}

/* Ajustes para input group pequeño */
.input-group-xs > .form-control,
.input-group-xs > .btn {
  padding: 0.15rem 0.4rem;
  font-size: 0.75rem;
}
.badge-btn {
  display: inline-block;
  padding: 2px 8px;
  margin-left: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background-color: #3b82f6; /* azul */
  border-radius: 12px;
  cursor: default;
}
.cursor-pointer {
    cursor: pointer;
}
.text-decoration-hover:hover {
    text-decoration: underline;
}
</style>