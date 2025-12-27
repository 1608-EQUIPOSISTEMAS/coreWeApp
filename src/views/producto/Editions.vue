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
                {{ activeFilters.start_date }} al {{ activeFilters.end_date }}
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
                     <button class="btn btn-icon-sm btn-light text-danger" @click.stop="openTreeModal(e)" title="Árbol">
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
                    {{ e.program_abreviature || '—' }} {{'('+e.program_sessions+')' }}
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
                    {{ e.program_type != null ? 'Tipo: ' + e.program_type : '' }}
                  </div>
                  <div class="muted small">
                    {{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}
                  </div>
                  
                </td>

                <td style="min-width: 120px;" >
                  <div class="name small fw-bold">{{ e.start_date }}</div>
                  <div class="muted small">
                    {{ 'CA: '+e.calc_da || 0 }}
                    <div class="muted small float-end">
                      {{ 'CP: '+e.calc_dp || 0 }}
                    </div>
                  </div>
                </td>
                <td class="minW">
                  <div class="small">{{ e.end_date }}</div>
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
                mode="remote"
                :fetcher="q => instructorService.instructorCaller({ q })"
                label-field="full_name"
                value-field="instructor_id"
                placeholder="Todos los docentes"
                :model-label="filterForm.instructor_label" 
                @change="(opt) => filterForm.instructor_label = opt ? opt.full_name : ''"
              />
        </div>

        <div class="row g-2 mb-3">
            <label class="form-label small fw-bold">Rango Fecha inicio</label>
          <DateRangePicker
            :modelValue="{ start: filterForm.start_date, end: filterForm.end_date }"
            @update:modelValue="(v) => { filterForm.start_date = v.start; filterForm.end_date = v.end }"
            label-from="DESDE"
            label-to="HASTA"
            :show-presets="false"
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
                    {{ currentEdition.global_code }} &bull; {{ currentEdition.specific_code || 'Sin Codigo Anual' }} &bull; {{ currentEdition.clasification || 'Sin Clasificación' }} 
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
                            :fetcher="q => programService.programVersionCaller({ q, not_modality: catalogs.modalityList.find(e=> e.alias == 'we_modality_online').id })"
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
                            required
                            sublabel-field="document_number"
                            value-field="instructor_id"
                            placeholder="Buscar docente..."
                            :model-label="modalForm.instructor_label" 
                            :minChars="0"
                            :cache="false"
                         />

                    </div>
                    
                    <div class="col-6" v-if="modalForm.program_version_id">
                         <label class="form-label-sm">Vacantes</label>
                         <input type="number" class="form-control form-control-sm" v-model.number="modalForm.vacant" required />
                    </div>
                </div>
            </section>

            <section class="form-section mt-3" v-if="modalForm.program_version_id && modalForm.cat_type_program_alias === 'we_program_type_course'">
                <div class="section-label">Logística y Horarios</div>
                <div class="row g-3">
                  <div class="col-md-6">
                        <label class="form-label-sm">Fecha Inicio</label>
                        <input 
                          type="date" 
                          class="form-control form-control-sm" 
                          v-model="modalForm.start_date" 
                          :required="isCourse" 
                          @change="validateAndCalculate(modalForm, 'start_date')"
                        />
                      </div>
                  <div class="col-md-6 position-relative">
                    <label class="form-label-sm">Fecha Fin</label>
                    <div class="input-group input-group-sm">
                      <input 
                        type="date" 
                        class="form-control" 
                        v-model="modalForm.end_date" 
                        :required="isCourse" 
                        @change="validateDateInput(modalForm, 'end_date')"
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
                                <th style="width: 25%">Sub-Programa</th>
                                <th style="width: 25%">Edición / Config</th>
                                <th style="width: 25%">Fechas</th>
                                <th style="width: 25%">Horario / Docente</th>
                            </tr>
                        </thead>
                        <tbody>
                             <tr v-for="child in modalForm.program_version_children" :key="child.child_program_version_id">
                                 <td class="fw-bold text-dark">
                                  {{ child.abbreviation }}
                                  <div class="text-xs text-muted" v-if="!child.edition_id">{{ 'Sesiones: '+ child.sessions }}</div>
                                 </td>
                                 
                                 <td>
                                     <div v-if="!currentEdition && !child.edition_id" class="d-flex align-items-center gap-2 mb-2">
                                         <small class="text-muted">¿Nueva?</small>
                                         <label class="form-switch scale-75">
                                            <input type="checkbox" v-model="child.new" />
                                            <span></span>
                                         </label>
                                     </div>
                                     
                                     <SearchSelect
                                        v-if="!child.new && !currentEdition"
                                        v-model="child.edition_id"
                                        mode="remote"
                                        :fetcher="q => editionService.editionCaller({ q, program_version_id: child.child_program_version_id })"
                                        label-field="label_for_iu"
                                        sublabel-field="specific_code"
                                        value-field="edition_num_id"
                                        placeholder="Vincular edición..."
                                        :minChars="0"
                                        :cache="false"
                                        @change="onChildEditionChange($event, child)"
                                        :disabled="child.new"
                                     />
                                     <div v-if="child.edition_id" class="p-1 bg-light border rounded text-center mt-2">
                                         <div class="fw-bold">{{ child.global_code }}</div>
                                         <div class="text-xs text-muted">{{ child.specific_code }}</div>
                                         <div class="text-xs text-muted">{{ 'Sesiones: '+ child.sessions }}</div>
                                     </div>
                                 </td>

                                 <td class="overflow-visible position-relative">
                                  <div v-if="child.new || child.edition_id" class="d-flex flex-column gap-1">
                                    <input 
                                      type="date" 
                                      class="form-control form-control-xs mb-1" 
                                      v-model="child.start_date" 
                                      :disabled="currentEdition"
                                      required 
                                      @change="validateAndCalculate(child, 'start_date')"
                                    />

                                    <div class="position-relative">
                                        <div class="input-group input-group-xs">
                                          <input 
                                            type="date" 
                                            class="form-control form-control-xs" 
                                            v-model="child.end_date" 
                                            required 
                                            :disabled="currentEdition"
                                            @change="validateDateInput(child, 'end_date')"
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
                                            :disabled="currentEdition"
                                          class="mb-1"
                                          @change="calculateEndDate(child)"
                                      />                                         
                                      <SearchSelect 
                                            :disabled="currentEdition" v-model="child.cat_hour_combination_id" :items="catalogs.hourCombinationList" label-field="description" value-field="id" placeholder="Horas" class="mb-1" />
                                         <SearchSelect 
                                              v-if="child.new || child.edition_id" v-model="child.instructor_id" mode="remote" :fetcher="q => instructorService.instructorCaller({ q })" label-field="full_name" value-field="instructor_id" placeholder="Docente" :model-label="child.instructor_label" />
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
            <button class="btn btn-outline btn-sm px-3" @click="showFormModal = false">
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
                 {{ group.global_code }} <span v-if="group.clasification">&bull; {{ group.clasification }}</span>
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
                                   {{ child.program_abreviature || child.abbreviation }}
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
                             {{ formatDate(child.start_date) }} <br>
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
import { ref, reactive, computed, onMounted, inject, watch} from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import DateRangePicker from '@/components/DateRangePicker.vue'
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
    if (filterForm.start_date && filterForm.end_date) {
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
        delete activeFilters.start_date;
        delete activeFilters.end_date;
        delete activeFilters.date_range;
        filterForm.start_date = '';
        filterForm.end_date = '';
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

function clearAllFilters() {
    Object.keys(activeFilters).forEach(key => delete activeFilters[key]);
    // Reset form
    filterForm.q = '';
    filterForm.instructor_id = null;
    filterForm.instructor_label = '';
    filterForm.start_date = '';
    filterForm.end_date = '';
    filterForm.clasification = null;
    filterForm.program_version_id = null;
    filterForm.cat_type_program = null;
    filterForm.cat_category = null;
    filterForm.cat_model_modality = null;
    filterForm.cat_segment = null;
    filterForm.cat_course_category = null;
    filterForm.program_version_label = null;
    filterForm.active = null;
    filterForm.cat_day_combination = null;
    filterForm.cat_hour_combination = null;
    saveState()
    fetchSchedule();
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
  fetchSchedule()
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
})


const modalForm = reactive({
  program_version_id: null,
  instructor_id: null,
  start_date: '',
  end_date: '',
  cat_type_program: null,
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
  // CORRECCIÓN: Quitamos el ".value" aquí porque modalForm es reactive
  () => [modalForm.expedient, modalForm.preconfirmation], 
  
  ([newExpedient, newPreconf]) => {
    // CORRECCIÓN: Quitamos el ".value" aquí también
    modalForm.confirmation = !!(newExpedient && newPreconf);
  }
);

//si modalForm.confirmation cambia establecer en modalForm.expedient, modalForm.preconfirmation dichos cambios
watch(
  () => modalForm.confirmation,
  (newConfirmation) => {
      modalForm.expedient = newConfirmation;
      modalForm.preconfirmation = newConfirmation;
  }
);

// Helpers Computados
const isCourse = computed(() => modalForm.cat_type_program_alias === 'we_program_type_course')

const isCourseValid = computed(() => {
  if (!isCourse.value) return true
  if (!modalForm.program_version_id) return false
  if (!modalForm.instructor_id) return false
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
  modalForm.start_date = ''
  modalForm.end_date = ''
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

async function openEditModal(edition) {
  currentEdition.value = edition || null
  resetModalForm()

  // NUEVA
  if (!edition) {
    showFormModal.value = true
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
      start_date: (child.start_date || '').slice(0, 10),
      end_date: (child.end_date || '').slice(0, 10),
      expedient: !!child.expedient,
      upgrade: !!child.upgrade,
      sessions: child.sessions,
      preconfirmation: !!child.preconfirmation,
      confirmation: !!child.confirmation,
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
        start_date: modalForm.start_date,
        vacant: modalForm.vacant,
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
        expedient: modalForm.expedient ? 'Y' : 'N',
        upgrade: modalForm.upgrade ? 'Y' : 'N',
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
          confirmation: child.confirmation ? 'Y' : 'N'
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
      showFormModal.value = false
    }
  } catch (err) {
    console.error(err)
    toast.error('Ocurrió un error inesperado al procesar la solicitud')
  }
}

function onProgramVersionChange(opcion) {
  debugger
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
    edition_id: null,
    expedient: false,
    upgrade: false,
    preconfirmation: false,
    confirmation: false,
    start_date: '',
    end_date: '',
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
      // fetchSchedule(); 
    }

  } catch (err) {
    console.error(err)
    toast.error('Error de conexión al guardar cambios')
  }
}

function validateDateInput(targetObj, fieldKey) {
  debugger
  const dateVal = targetObj[fieldKey];
  if (!dateVal) return;

  // Usamos split para evitar problemas de zona horaria al instanciar Date
  const [y, m, d] = dateVal.split('-').map(Number);

  // 1. Validar Mes y Año (Dashboard context)
  if (y !== selectedYear.value || m !== selectedMonth.value) {
    toast.info(`La fecha debe pertenecer a ${months.value[selectedMonth.value - 1]} del ${selectedYear.value}`);
    targetObj[fieldKey] = ''; // Limpiar el input
    return;
  }

  // 2. Validar Feriados (CORREGIDO: Usamos holidayDates.value)
  if (holidayDates.value.includes(dateVal)) {
    // Buscamos el nombre para que el mensaje sea más útil
    console.log("calcular feriado")
    console.log(dateVal)
    console.log(catalogs.value.catHolidays)
    const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
    const hName = hObj ? hObj.description : 'Feriado';
    
    toast.info(`La fecha seleccionada es feriado (${hName}) y no está permitida.`);
    targetObj[fieldKey] = ''; // Limpiar el input
    return;
  }
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


function validateAndCalculate(targetObj, fieldKey) {
   const dateVal = targetObj[fieldKey];
   if (!dateVal) return;
   const [y, m, d] = dateVal.split('-').map(Number);

   // Validación Mes/Año
   if (y !== selectedYear.value || m !== selectedMonth.value) {
       toast.info(`La fecha debe pertenecer al periodo seleccionado.`);
       targetObj[fieldKey] = '';
       return;
   }
   debugger
   
   // Validación Feriado (CORREGIDO: Usamos holidayDates.value)
   if (holidayDates.value.includes(dateVal)) {
       const hObj = catalogs.value.catHolidays.find(h => h.variable_3 === dateVal);
       const hName = hObj ? hObj.description : 'Feriado';

       toast.info(`La fecha de inicio no puede ser un feriado (${hName}).`);
       targetObj[fieldKey] = '';
       return;
   }

   // 2. Si es Fecha de Inicio, calcular Fecha Fin automáticamente
   if (fieldKey === 'start_date') {
       calculateEndDate(targetObj);
   }
}

// REEMPLAZO DEL ARRAY ANTIGUO
const holidayDates = computed(() => {
  // Asegúrate de que 'catalogs.value.catHolidays' exista (array vacío por defecto)
  return (catalogs.value.catHolidays || []).map(h => h.variable_3) // Aquí vienen las fechas 'YYYY-MM-DD'
})

  function onChildEditionChange(edition, child) {
    debugger
    // Primero verificamos si 'edition' existe (no es null ni undefined)
    if (edition && edition.edition_num_id) {
      // Caso: Se seleccionó algo válido
      child.start_date = (edition.start_date || '').slice(0, 10);
      child.end_date = (edition.end_date || '').slice(0, 10);
      child.cat_day_combination_id = edition.cat_day_combination_id;
      child.cat_hour_combination_id = edition.cat_hour_combination_id;
      child.instructor_id = edition.instructor_id;
      child.instructor_label = edition.instructor_label; // Asumo que esto existe en el objeto
      child.global_code = edition.global_code;
      child.specific_code = edition.specific_code;
      child.sessions = edition.sessions;
      child.instructor_label = edition.instructor_label
      
    } else {
      // Caso: Se limpió el input (edition es null) o no tiene ID
      child.start_date = '';
      child.end_date = '';
      child.cat_day_combination_id = null;
      child.cat_hour_combination_id = null;
      child.instructor_id = null;
      child.instructor_label = '';
      child.global_code = '';
      child.specific_code = '';
      // Restaurar sesiones por defecto si es necesario
      child.sessions = child.program_version_sessions; 
    }
  }

// --- LÓGICA DE PREVISUALIZACIÓN DE CALENDARIO ---
const activePreviewId = ref(null) // Para saber qué popover abrir
const previewItems = ref([])      // La lista de fechas calculadas

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
  const allowedDays = parseDaysFromLabel(comboOption.description)
  if (allowedDays.length === 0) return []

  // Inicio de simulación
  let iterDate = new Date(targetObj.start_date + 'T00:00:00')
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

/**
 * Modificamos la función existente calculateEndDate
 * Ahora incluye la validación de coherencia Día vs Combo
 */
function calculateEndDate(targetObj) {
  // 1. Validar existencia de datos
  if (!targetObj.start_date || !targetObj.cat_day_combination_id) return;

  // 2. Obtener configuración de días del catálogo
  const comboOption = catalogs.value.dayCombinationList.find(c => c.id === targetObj.cat_day_combination_id);
  if (!comboOption) return;

  // 3. Obtener días permitidos (Ej: [5, 6] para Viernes y Sábado)
  const allowedDays = parseDaysFromLabel(comboOption.description);
  if (allowedDays.length === 0) return;

  // --- NUEVA LÓGICA DE VALIDACIÓN (Día Coherente) ---
  const startDayIdx = getDayIndexFromStr(targetObj.start_date);
  
  if (!allowedDays.includes(startDayIdx)) {
    const dayName = dayNames[startDayIdx];
    
    toast.warning(
      `La fecha seleccionada cae en ${dayName} y no corresponde a la combinación de días: ${comboOption.description}.`
    );
    
    // Limpiamos las fechas como solicitaste
    targetObj.start_date = '';
    targetObj.end_date = '';
    
    // Detenemos el proceso
    return;
  }
  // --------------------------------------------------

  // 4. Validar Sesiones
  const totalSessions = targetObj.sessions || targetObj.program_version_sessions || 0;
  if (totalSessions <= 0) return;

  // 5. Simulación de Calendario (Proyección)
  // Al haber validado arriba, la iteración comenzará correctamente desde la fecha de inicio
  // considerándola como la posible "Sesión 1" si no es feriado.
  
  let iterDate = new Date(targetObj.start_date + 'T00:00:00');
  let sessionsCounted = 0;
  let safetyLoop = 0;

  while (sessionsCounted < totalSessions && safetyLoop < 1000) {
    safetyLoop++;
    
    const y = iterDate.getFullYear();
    const m = String(iterDate.getMonth() + 1).padStart(2, '0');
    const d = String(iterDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    const dayOfWeek = iterDate.getDay();

    // Verificamos día de clase
    const isClassDay = allowedDays.includes(dayOfWeek);
    
    // Verificamos feriado (usando tu nuevo computed holidayDates)
    const isHoliday = holidayDates.value.includes(dateString);

    // LÓGICA DE CONTEO:
    // Si es día de clase Y NO es feriado, cuenta como sesión.
    // Como iterDate empieza en start_date (que ya validamos que es ClassDay),
    // si no es feriado, start_date será la sesión #1.
    if (isClassDay && !isHoliday) {
      sessionsCounted++;
    }

    if (sessionsCounted === totalSessions) {
      targetObj.end_date = dateString;
      break; 
    }

    // Avanzar al día siguiente
    iterDate.setDate(iterDate.getDate() + 1);
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
    position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s;
  }
  .form-switch span::after {
    content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%;
    position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
  }
  .form-switch input:checked + span { background: #3b82f6; }
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
</style>