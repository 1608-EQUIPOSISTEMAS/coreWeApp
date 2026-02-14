<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión Comercial</span>
        <span class="sub">Listado de Leads</span>
      </div>

      <div class="actions-bar">
        <button 
          class="btn me-2" 
          :class="hasActiveRestrictions ? 'btn-outline-danger text-danger fw-bold pulse-alert bg-white' : 'btn-outline-warning text-dark bg-white'" 
          @click="openControlModal"
          :title="isComercial ? 'Mis Permisos de Visualización' : 'Control de Asesores'"
        >
          <i class="fa-solid" :class="isComercial ? 'fa-user-lock' : 'fa-shield-halved'"></i> 
          <span class="ms-1">{{ isComercial ? 'Mis Permisos' : 'Control' }}</span>
        </button>
        <button
          class="btn me-2"
          :class="isCompact ? 'bg-info text-light' : 'bg-outline-info text-dark'"
          @click="isCompact = !isCompact"
          title="Alternar entre vista agrupada y vista detallada por columnas"
        >
          <i class="fa-solid" :class="isCompact ? 'fa-list' : 'fa-table-columns'"></i>
          <span class="ms-1">Compactado</span>
        </button>
        
        <button class="btn btn-primary" @click="goNew">
          <i class="fa-solid fa-plus me-1"></i> Nuevo
        </button>
      </div>
    </div>

    <div class="card-body">

      <BaseFilterChips
        :items="activeFilterChips"
        @remove="clearFilter"
        @clear-all="clearFilters"
      />

      <div class="pagination-bar">
        <BasePagination
          v-model="pagin"
          @open-filters="openFilterModal"
          @change="handlePaginationChange"
        />
      </div>

      <div class="table-responsive">
        <table class="table table-hover" :class="{ dense, 'compact-table': isCompact }">
          
          <thead>
            <tr v-if="!isCompact">
              <th class="ta-center">Acciones</th>
              <th>Status</th>
              <th>Contacto</th>
              <th>T. Consulta</th>
              <th>Programa / Interés</th>
              <th>Ini. Edición</th>
              <th>F. Pago</th>
              <th>Nivel Interés</th>
              <th>Registro</th>
              <th>Seguimiento</th>
            </tr>
            <tr v-else>
              <th class="ta-center">Acciones</th>
              <th>Fecha Reg.</th>
              <th>Status</th>
              <th>Teléfono</th>
              <th>E. Cliente</th>
              <th>Nombre</th>
              <th>T. Consulta</th>
              <th>Programa</th>
              <th>Tipo</th>
              <th>Modalidad</th>
              <th>Edición</th>
              <th>F. Pago</th>
              <th>Canal origen</th>
              <th>Medio</th>
              <th>Palabra Clave</th>
              <th>Estrategia</th>
              <th>Interés</th>
              <th>Asesor/Usuario</th>
              <th>Seguimiento</th>
            </tr>
          </thead>

          <tbody v-if="!isCompact">
            <tr v-for="l in leadsRaw" :key="l.id" 
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)" 
                @mouseup="cancelPress" 
                @mouseleave="cancelPress">
                
              <td class="ta-center nowrap">
                <button 
  class="btn btn-outline btn-sm me-1" 
  @click="l.enrollment_id ? openEnrollmentModal(l.enrollment_id) : editLead(l)" 
  :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'"
>
  <i class="fa-solid" 
    :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'">
  </i>
</button>
                
                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>

              <td><span class="fw-600 small text-dark">{{ pipelineMap[l.cat_status_alias] || l.cat_status_lead_label || '—' }}</span></td>
              <td style="min-width:160px">
                <div class="d-flex flex-column">
                  <span class="name text-dark">{{ l.origin_phone }}</span>
                  <span class="small muted">{{ l.full_name_label || 'Sin nombre' }}</span>
                </div>
              </td>
              <td class="minW"><span class="badge badge-neutral">{{ queryMap[l.cat_promotion_alias] || '—' }}</span></td>
              <td style="min-width:280px">
                <div v-if="l.program_label">
                  <div class="name">{{ l.program_label }}</div>
                  <div class="small muted mt-1">
                    {{ l.cat_type_program_label }} <span v-if="l.cat_model_modality_label">• {{ l.cat_model_modality_label }}</span>
                  </div>
                </div>
                <div v-else class="muted small">—</div>
              </td>
              <td class="nowrap"><div class="font-mono small fw-600 text-primary">{{ l.edition_label || '—' }}</div></td>
              <td class="small nowrap text-success fw-bold">{{ l.pay_date || '—' }}</td>
              <td>
                <span v-if="l.cat_interest_alias" class="badge" :class="badgeForInterest(l.cat_interest_alias)">{{ interestMap[l.cat_interest_alias] }}</span>
                <span v-else class="muted small">—</span>
              </td>
              <td style="min-width:120px">
                <div v-if="l.user_registration_label">
                  <div class="small fw-600">{{ l.user_registration_label }}</div>
                  <div class="muted x-small">{{ l.registration_date }}</div>
                </div>
              </td>
              <td class="ta-center" style="min-width:140px">
                <div v-if="l.cat_last_follow_alias" class="badge d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                  <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                  <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75"></i>
                </div>
                <span v-else class="muted small">—</span>
              </td>
            </tr>
            <tr v-if="!leadsRaw.length"><td colspan="9" class="empty-state">No se encontraron leads con los filtros actuales.</td></tr>
          </tbody>

          <tbody v-else>
            <tr v-for="l in leadsRaw" :key="l.id" 
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)" 
                @mouseup="cancelPress" 
                @mouseleave="cancelPress">

              <td class="ta-center nowrap">
                <button 
                  class="btn btn-outline btn-sm me-1" 
                  @click="editLead(l)" 
                  :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'"
                >
                  <i class="fa-solid" 
                    :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'">
                  </i>
                </button>

                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>

              <td class="small nowrap">{{ l.registration_date }}</td>
              <td><span class="badge badge-neutral text-dark border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span></td>
              <td class="nowrap fw-bold text-dark">{{ l.origin_phone }}</td>
              <td class="nowrap fw-bold text-dark">{{ l.cat_client_moment_description }}</td>
              
              <td class="nowrap" style="min-width:120px">{{ l.full_name_label }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_promotion_description || '—' }}</td>
              <td class="small fw-600 text-primary">{{ l.program_label || '—' }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_type_program_label || '—' }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_model_modality_label || '—' }}</td>
              <td class="nowrap small font-mono">{{ l.edition_label || '—' }}</td>
              <td>
                <div class="small fw-600 text-success">{{ l.pay_date || '—' }}</div>
              </td>
              <td class="small text-muted fst-italic">{{ l.cat_channel_description || '—' }}</td>
              <td class="small text-muted fst-italic">{{ l.cat_medium_contact_description || '—' }}</td>
              <td class="small text-muted fst-italic">{{ l.cat_word_description || '—' }}</td>
              <td class="small text-info">{{ l.cat_strategy_description || '—' }}</td>
              <td>
                <span v-if="l.cat_interest_alias" class="badge" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
              </td>
              <td class="small">{{ l.user_registration_label }}</td>
              <td class="ta-center">
                <i v-if="l.cat_last_follow_alias" class="fa-solid fa-circle cursor-pointer" 
                   :class="l.cat_last_follow_alias === 'we_follow_lead_answered' ? 'text-success' : 'text-secondary'"
                   :title="l.cat_last_follow_alias"></i>
                <span v-else>—</span>
              </td>
            </tr>
            <tr v-if="!leadsRaw.length"><td colspan="17" class="empty-state">No se encontraron leads con los filtros actuales.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFollowModal" title="Gestión Rápida de Contactos" size="xl">
    <div v-if="selectedFollowLead" class="d-flex flex-column h-100">
      <div class="px-4 py-3 bg-light border-bottom d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <div class="avatar-placeholder me-3 bg-white border text-primary rounded-circle d-flex align-items-center justify-content-center" style="width:45px; height:45px; font-size:1.2rem;">
            <i class="fa-regular fa-user"></i>
          </div>
          <div>
             <h6 class="mb-0 fw-bold text-dark">{{ selectedFollowLead.full_name_label || 'Prospecto sin nombre' }}</h6>
             <div class="d-flex gap-3 text-secondary small">
               <span><i class="fa-solid fa-phone me-1"></i>{{ selectedFollowLead.origin_phone }}</span>
               <span><i class="fa-solid fa-bullseye me-1"></i>{{ filtroPipeline.find(e => e.alias == selectedFollowLead.cat_status_alias)?.description || 'Estado desc.' }}</span>
             </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="addLocalAttempt">
          <i class="fa-solid fa-plus me-1"></i> Nuevo Intento
        </button>
      </div>
      <div class="p-3 bg-white scroll-area">
        <div v-if="editableHistory.length > 0">
          <div class="table-responsive">
<div class="table-responsive">
  <table class="table table-sm align-middle mb-0" style="font-size: 0.85rem;">
    <thead class="table-light">
      <tr>
        <th style="width: 50px;" class="text-center">#</th>
        <th style="min-width: 140px;">Estado</th>
        <th style="min-width: 140px;">Resultado</th>
        <th style="min-width: 210px;">Fecha/Hora</th>
        <th style="min-width: 130px;" class="text-center">Duración</th> 
        <th style="min-width: 200px;">Observación</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(attempt, idx) in editableHistory" :key="idx" :class="{'bg-blue-50': !attempt.id}">
        <td class="text-center fw-bold text-muted align-top pt-2">{{ idx + 1 }}</td>
        
        <td class="align-top">
          <SearchSelect v-model="attempt.status_alias" :items="filtroFollow" label-field="description" value-field="alias" placeholder="Estado..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="form-control-sm p-0 border-0" />
        </td>

        <td class="align-top">
          <SearchSelect v-model="attempt.calling_alias" :items="filtroCalling" label-field="description" value-field="alias" placeholder="Resultado..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="form-control-sm p-0 border-0" />
        </td>

        <td class="align-top">
          <DateTime12 v-model="attempt.contact_datetime" :onlyHours="true" :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="w-100" />
        </td>

        <td class="align-top text-center">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <button 
                class="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
                style="width: 32px; height: 32px;"
                :class="attempt.timerActive ? 'btn-danger' : 'btn-outline-success'"
                @click="toggleTimer(attempt)"
                :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"
                :title="attempt.timerActive ? 'Detener cronómetro' : 'Iniciar cronómetro'"
            >
                <i class="fa-solid" :class="attempt.timerActive ? 'fa-stop' : 'fa-play'"></i>
            </button>
            
            <div class="font-mono fw-bold" :class="attempt.timerActive ? 'text-danger' : 'text-dark'">
                {{ formatDuration(attempt.contact_duration) }}
            </div>
          </div>
        </td>

        <td class="align-top">
          <textarea v-model="attempt.response" class="form-control form-control-sm text-area-resize" rows="2" placeholder="Escribe una observación..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"></textarea>
        </td>
      </tr>
    </tbody>
  </table>
</div>
          </div>
        </div>
        <div v-else class="text-center py-5 text-muted"><p>No hay historial previo. Agrega el primer intento.</p></div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline-secondary btn-sm" @click="showFollowModal = false">Cancelar</button>
        <button class="btn btn-success btn-sm px-4" @click="saveFastFollow" :disabled="isSavingFollow">
           <i class="fa-solid fa-save me-1"></i> {{ isSavingFollow ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </template>
  </BaseModal>

  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="xl">
      <div class="px-3 py-2">
      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <label class="form-label"><i class="fa-solid fa-magnifying-glass me-1 text-primary"></i> Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="form-control" placeholder="Nombre, teléfono..." @keyup.enter="applyFilters" />
        </div>
        <div class="col-md-3" v-if="!isComercial">
          <label class="form-label"><i class="fa-solid fa-user-tie me-1 text-primary"></i> Asesor Asignado</label>
          <MultiSelect v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="USUARIO..." />
        </div>
        <div class="col-md-3">
          <label class="form-label"><i class="fa-solid fa-user-tag me-1 text-primary"></i> E. Cliente</label>
           <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="E. CLIENTE..." />
        </div>
      </div>
      <hr class="border-secondary opacity-10 my-3">
<div class="mb-4">
  <h6 class="section-title">Estado, Origen y Ubicación</h6>
  <div class="row g-3">
    <div class="col-md-3 col-6">
      <label class="form-label">Estatus (Pipeline)</label>
      <MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="ESTATUS..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Seguimiento</label>
      <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="SEGUIMIENTO..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Nivel de Interés</label>
      <MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="INTERES..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">País</label> <MultiSelect v-model="filters.code_country_ids" :items="filtroPaises" label-key="description" value-key="id" placeholder="PAÍS..." />
    </div>

    <div class="col-md-3 col-6">
      <label class="form-label">Canal (Red Social)</label>
      <MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="CANAL..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Medio de Contacto</label> <MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="MEDIO..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Estrategia</label>
      <MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="ESTRATEGIA..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Palabra Clave</label>
      <MultiSelect v-model="filters.word_ids" :items="mktWordsCatalog" label-key="description" value-key="id" placeholder="PALABRA..." />
    </div>

    <div class="col-md-3 col-6">
      <label class="form-label">Origen Web</label>
      <select class="form-select form-select-sm" v-model="filters.web"><option :value="null">Todos</option><option value="Y">Sí (Web)</option><option value="N">No</option></select>
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Es B2B</label>
      <select class="form-select form-select-sm" v-model="filters.b2b"><option :value="null">Todos</option><option value="Y">Sí (Empresas)</option><option value="N">No</option></select>
    </div>
  </div>
</div>
      <div class="program-filter-box mb-4">
        <h6 class="section-title text-primary mb-3"><i class="fa-solid fa-graduation-cap me-1"></i> Interés Académico</h6>
        <div class="row g-3 mb-3">
          <div class="col-md-6"><label class="form-label">Nombre del Programa</label><input v-model="filters.program_text" type="text" class="form-control" placeholder="Ej. Gestión de Proyectos..."></div>
          <div class="col-md-6"><label class="form-label">Promoción</label><MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="PROMO..." /></div>
        </div>
        <div class="row g-3 align-items-end">
          <div class="col-md-3 col-6"><label class="form-label">Tipo</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="TIPO..." /></div>
          <div class="col-md-3 col-6"><label class="form-label">Modalidad</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="MODALIDAD..." /></div>
          <div class="col-md-6"><label class="form-label">Rango Inicio Edición</label><BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'edition_start')" /></div>
        </div>
      </div>
      <div>
        <h6 class="section-title">Auditoría del Registro</h6>
        <div class="row g-3">
          <div class="col-md-4">
              <label class="form-label">Rango Fecha de Pago</label>
              <BaseDatePicker
                v-model="filters.pay_date_range_string"
                :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                placeholder="Seleccione rango"
                
                @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'pay_date')"
              />
            </div>
          <div class="col-md-4"><label class="form-label">Fecha de Creación</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" /></div>
          <div class="col-md-4"><label class="form-label">Última Modificación</label><BaseDatePicker v-model="filters.updated_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'updated')" /></div>
              
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn btn-outline btn-sm" @click="clearFilters"><i class="fa-solid fa-eraser me-1"></i> Limpiar todo</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm px-4" @click="applyFilters"><i class="fa-solid fa-filter me-1"></i> Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>

  <BaseModal v-model="showControlModal" :title="isComercial ? 'Mis Permisos de Visualización' : 'Panel de Control: Restricciones de Asesores'" size="xl">
    
    <div v-if="!isComercial" class="px-3 py-2">
      <div class="alert alert-info py-2 small mb-3">
        <i class="fa-solid fa-circle-info me-1"></i> Configura los filtros obligatorios para cada asesor. Si un campo queda vacío, el asesor no tendrá restricciones en esa categoría.
      </div>
      
      <div class="table-responsive control-table-wrapper">
        <table class="table table-bordered table-hover align-middle control-table">
          <thead class="table-light text-center">
            <tr>
              <th rowspan="2" class="align-middle bg-light sticky-col">Asesor Comercial</th>
              <th colspan="3" class="bg-primary-subtle text-primary">PROGRAMAS</th>
              <th colspan="6" class="bg-success-subtle text-success">GLOBAL</th>
            </tr>
            <tr class="small text-muted">
              <th class="bg-primary-subtle minW-200">Tipos</th>
              <th class="bg-primary-subtle minW-200">Modalidades</th>
              <th class="bg-primary-subtle minW-200">Específicos</th>
              <th class="bg-success-subtle minW-200">Estatus (Pipeline)</th>
              <th class="bg-success-subtle minW-200">Seguimiento</th>
              <th class="bg-success-subtle minW-200">Niv. Interés</th>
              <th class="bg-success-subtle minW-200">Canal</th>
              <th class="bg-success-subtle minW-200">Estrategia</th>
              <th class="bg-success-subtle minW-200">E. Cliente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asesor in asesoresControl" :key="asesor.user_id">
              <td class="fw-bold small sticky-col bg-white">
                <i class="fa-solid fa-user-tie text-secondary me-2"></i>{{ asesor.name }}
              </td>
              
              <td><MultiSelect v-model="asesor.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td><MultiSelect v-model="asesor.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td><MultiSelect v-model="asesor.program_ids" :items="filtroProgramasEspec" label-key="description" value-key="id" placeholder="Todos..." /></td>
              
              <td><MultiSelect v-model="asesor.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td><MultiSelect v-model="asesor.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td><MultiSelect v-model="asesor.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td><MultiSelect v-model="asesor.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td><MultiSelect v-model="asesor.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td><MultiSelect v-model="asesor.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todos..." /></td>
            </tr>
            <tr v-if="asesoresControl.length === 0">
              <td colspan="10" class="text-center py-4 text-muted">Cargando asesores...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="px-4 py-3">
      <div class="alert d-flex align-items-center mb-4 border-0" :class="hasActiveRestrictions ? 'alert-danger bg-danger-subtle text-danger' : 'alert-success bg-success-subtle text-success'">
        <i class="fa-solid fa-3x me-3" :class="hasActiveRestrictions ? 'fa-user-lock' : 'fa-check-circle'"></i>
        <div>
          <h5 class="alert-heading fw-bold mb-1">
            {{ hasActiveRestrictions ? 'Filtros de Seguridad Activos' : 'Acceso Total Permitido' }}
          </h5>
          <p class="mb-0 small text-dark">
            <span v-if="hasActiveRestrictions">Actualmente tu perfil tiene restricciones operativas asignadas por administración. Solo puedes acceder a los leads que coincidan <b>estrictamente</b> con los parámetros mostrados a continuación. Los campos vacíos indican que tienes acceso a todas las opciones de esa categoría.</span>
            <span v-else>Tu perfil no cuenta con restricciones en este momento. Tienes visibilidad completa sobre todos los leads del sistema.</span>
          </p>
        </div>
      </div>

      <div class="row g-4" v-if="asesoresControl.length > 0">
        <div class="col-12">
          <h6 class="section-title text-primary"><i class="fa-solid fa-graduation-cap me-1"></i> Restricciones Académicas</h6>
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Tipos de Programa</label>
          <MultiSelect disabled v-model="asesoresControl[0].type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Modalidades</label>
          <MultiSelect disabled v-model="asesoresControl[0].model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Programas Específicos</label>
          <MultiSelect disabled v-model="asesoresControl[0].program_ids" :items="filtroProgramasEspec" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>

        <div class="col-12 mt-4">
          <h6 class="section-title text-success"><i class="fa-solid fa-earth-americas me-1"></i> Restricciones Globales y Operativas</h6>
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Estatus (Pipeline)</label>
          <MultiSelect disabled v-model="asesoresControl[0].status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">E. Cliente</label>
          <MultiSelect disabled v-model="asesoresControl[0].moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Seguimiento</label>
          <MultiSelect disabled v-model="asesoresControl[0].last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Canal de Origen</label>
          <MultiSelect disabled v-model="asesoresControl[0].channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Estrategia MKT</label>
          <MultiSelect disabled v-model="asesoresControl[0].strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
        <div class="col-md-4">
          <label class="form-label text-muted small fw-bold">Nivel de Interés</label>
          <MultiSelect disabled v-model="asesoresControl[0].interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Accesibilidad total" />
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="d-flex justify-content-end w-100 gap-2">
        <button class="btn btn-outline-secondary btn-sm px-4" @click="showControlModal = false">
          {{ isComercial ? 'Entendido, cerrar' : 'Cancelar' }}
        </button>
        
        <button v-if="!isComercial" class="btn btn-warning btn-sm px-4 fw-bold" @click="saveControlRestrictions" :disabled="isSavingRestrictions">
          <i class="fa-solid fa-save me-1"></i> {{ isSavingRestrictions ? 'Guardando...' : 'Guardar Restricciones' }}
        </button>
      </div>
    </template>
  </BaseModal>
<BaseModal v-model="showEnrollmentModal" title="Detalle de Matrícula" size="lg">
  <div v-if="isLoadingEnrollment" class="text-center py-5">
    <div class="spinner-border text-primary" role="status"></div>
    <p class="mt-2 text-muted">Cargando información financiera...</p>
  </div>

  <div v-else-if="enrollmentData" class="px-3 py-2">
    <div class="alert alert-light border d-flex justify-content-between align-items-center mb-4">
      <div>
        <h6 class="fw-bold mb-1 text-primary text-uppercase">{{ enrollmentData.program_name }}</h6>
        
        <div v-if="enrollmentData.version_name || enrollmentData.edition_label" class="small text-muted mt-1">
          <span v-if="enrollmentData.version_name">
             <i class="fa-solid fa-layer-group me-1"></i> {{ enrollmentData.version_name }}
          </span>
          <span v-if="enrollmentData.version_name && enrollmentData.edition_label" class="mx-2">|</span> 
          <span v-if="enrollmentData.edition_label">
             <i class="fa-regular fa-calendar me-1"></i> {{ enrollmentData.edition_label }}
          </span>
        </div>
      </div>
      
      <span v-if="enrollmentData.modality_label" class="badge bg-white text-dark border">
        {{ enrollmentData.modality_label }}
      </span>
    </div>

    <div class="row g-4">
      <div class="col-md-6 border-end">
        <h6 class="text-muted small fw-bold text-uppercase mb-3">Información del Alumno</h6>
        
        <div class="mb-3">
          <label class="d-block small text-muted">Nombre Completo</label>
          <span class="fw-bold text-dark fs-6">{{ enrollmentData.student_name }}</span>
        </div>
        
        <div class="d-flex justify-content-between mb-3">
          <div>
            <label class="d-block small text-muted">Documento</label>
            <span class="font-mono small fw-bold">{{ enrollmentData.document_number }}</span>
          </div>
          <div>
            <label class="d-block small text-muted">Fecha Inscripción</label>
            <span class="small">{{ enrollmentData.registration_date }}</span>
          </div>
        </div>

        <div class="mb-3">
            <label class="d-block small text-muted mb-1">Estado de Matrícula</label>
            <span class="badge" 
              :class="enrollmentData.active === 'Y' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'">
              {{ enrollmentData.status_label || 'Desconocido' }}
            </span>
        </div>
      </div>

      <div class="col-md-6">
        <h6 class="text-muted small fw-bold text-uppercase mb-3">Estado Financiero</h6>

        <div class="card bg-light border-0 mb-3">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between mb-2">
              <span class="small text-secondary">Costo Total:</span>
              <span class="fw-bold text-dark">
                {{ formatMoney(enrollmentData.status_alias, enrollmentData.total_amount) }}
              </span>
            </div>
            
            <div class="d-flex justify-content-between mb-2 text-success">
              <span class="small">Pagado:</span>
              <span class="fw-bold">
                - {{ formatMoney(enrollmentData.status_alias, enrollmentData.total_paid) }}
              </span>
            </div>
            
            <hr class="my-2 border-secondary opacity-25">
            
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold text-dark">Pendiente:</span>
              <span class="fs-4 fw-bold" :class="enrollmentData.pending_amount > 0 ? 'text-danger' : 'text-success'">
                 {{ formatMoney(enrollmentData.status_alias, enrollmentData.pending_amount) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="enrollmentData.pending_amount > 0" class="alert alert-warning py-2 px-3 small mb-3 border-warning">
          <div class="d-flex align-items-start">
             <i class="fa-solid fa-clock mt-1 me-2 text-warning-emphasis"></i>
             <div>
                <strong class="d-block text-warning-emphasis">Próximo vencimiento:</strong>
                <span v-if="enrollmentData.next_due_date">
                   {{ enrollmentData.next_due_date }} por <b>{{ formatMoney(enrollmentData.status_alias, enrollmentData.next_due_amount) }}</b>
                </span>
                <span v-else class="text-muted fst-italic">
                   No hay fecha de cuota programada.
                </span>
             </div>
          </div>
        </div>
        
        <div v-else class="alert alert-success py-2 px-3 small mb-3 border-success">
          <i class="fa-solid fa-check-circle me-1"></i> ¡Pagos al día!
        </div>

        <div class="text-end">
           <span class="badge border" :class="{
             'bg-danger text-white': enrollmentData.financial_status_alias === 'we_enrollment_status_debt',
             'bg-success text-white': enrollmentData.financial_status_alias === 'we_enrollment_status_paid',
             'bg-warning text-dark': enrollmentData.financial_status_alias === 'we_enrollment_status_pending'
           }">{{ enrollmentData.financial_status_label || 'Estado Pendiente' }}</span>
        </div>
      </div>
    </div>
  </div>

  <template #footer>
    <div v-if="enrollmentData" class="d-flex justify-content-between w-100">
      <div class="d-flex gap-2">
        <a v-if="enrollmentData.student_attachment_url" 
           :href="enrollmentData.student_attachment_url" 
           target="_blank" 
           class="btn btn-outline-secondary btn-sm"
           title="Descargar Ficha">
           <i class="fa-regular fa-file-pdf me-1"></i> Ficha
        </a>
        <a v-if="enrollmentData.payment_attachment_url" 
           :href="enrollmentData.payment_attachment_url" 
           target="_blank" 
           class="btn btn-outline-secondary btn-sm"
           title="Descargar Voucher">
           <i class="fa-regular fa-image me-1"></i> Voucher
        </a>
      </div>
      <button class="btn btn-primary btn-sm px-4" @click="showEnrollmentModal = false">Cerrar</button>
    </div>
  </template>
</BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject, computed,onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'
import DateTime12 from '@/components/DateTime12.vue'
import { useToast } from 'vue-toastification'
const hasActiveRestrictions = ref(false)

const showControlModal = ref(false)
const isSavingRestrictions = ref(false)
const asesoresControl = ref([])
const toast = useToast()
const router = useRouter()
const route = useRoute()
const comercialService = inject(ServiceKeys.Comercial)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')

const filtroProgramasEspec = ref(catalog.options('we_programs') || [])

// === ESTADO ===
const showFilterModal = ref(false)
const showFollowModal = ref(false)
const isCompact = ref(false)
const dense = ref(false)
const activeFilterChips = ref([])
const leadsRaw = ref([])
const filtroOwners = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === LONG PRESS ===
const pressingRowId = ref(null)
let pressTimer = null

// === PERMISOS ===
const storedUserStr = localStorage.getItem('user')
const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null
const isComercial = storedUser?.roles?.includes('COMERCIAL') &&
                    !storedUser?.roles?.includes('LIDER_COMERCIAL') &&
                    !storedUser?.roles?.includes('ADMIN') &&
                    !storedUser?.roles?.includes('GERENCIA');
const currentUserId = storedUser?.user_id;

// === FILTROS ===
const filters = reactive({
  q: '',
  program_text: '',
  estado: null,
  web: null,
  b2b: null,

  // Ahora todos los MultiSelect guardan [{value, label}]
  owner_user_ids: [],
  status_lead_ids: [],
  last_follow_ids: [],
  interest_level_ids: [],
  channel_ids: [],
  query_ids: [],
  type_program_ids: [],
  model_modality_ids: [],
  strategy_ids: [],
  word_ids: [],
  medium_contact_ids: [],
  code_country_ids: [],
  moment_ids: [],

  // Fechas siguen siendo strings
  rangoFechas: { start: '', end: '' },
  rangoModificacion: { start: '', end: '' },
  created_range_string: null,
  updated_range_string: null,
  edition_range_string: null,
  edition_start_from: '',
  edition_start_to: '',
  pay_date_from: '',
  pay_date_to: '',
  pay_date_range_string: null
})

// === CATÁLOGOS ===
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroModalidad = ref(catalog.options('we_modality') || [])
const filtroPipeline = ref(catalog.options('we_lead_status') || [])
const filtroCanales = ref(catalog.options('we_social_media') || [])
const filtroFollow = ref(catalog.options('we_follow_lead') || [])
const filtroMoment = ref(catalog.options('we_moment') || [])
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])
const strategyCatalog = ref(catalog.options('we_type_strategy') || [])
const mktWordsCatalog = ref(catalog.options('we_key_word') || [])
const filtroCalling = ref(catalog.options('we_calling') || [])
const filtroMedios = ref(catalog.options('we_social_media') || []) // Ojo: we_medium_contact
const filtroPaises = ref(catalog.options('we_country') || [])   // Ojo: we_code_country
// === MAPAS COMPUTADOS (OPTIMIZACIÓN) ===
const createMap = (arr) => {
  if (!Array.isArray(arr)) return {}
  return arr.reduce((acc, item) => { acc[item.alias] = item.description; return acc }, {})
}
const pipelineMap = computed(() => createMap(filtroPipeline.value))
const queryMap    = computed(() => createMap(filtroQuery.value))
const interestMap = computed(() => createMap(filtroInterest.value))
const followMap   = computed(() => createMap(filtroFollow.value))
const extractIds = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => (typeof item === 'object' && item !== null) ? (item.id || item.value) : item);
};
// === PERSISTENCIA ===
const { saveState } = useTablePersistence('crm_leads_filter_state_v1', filters, pagin)

// === VARIABLES MODAL FOLLOW ===
const editableHistory = ref([])
const isSavingFollow = ref(false)
const selectedFollowLead = ref(null)
const decodeFilter = (jsonStr) => {
  if (!jsonStr) return []
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    return []
  }
}

// Codificar URL (Array de Objetos -> String)
const encodeFilter = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return undefined // undefined borra el param de la URL
  return JSON.stringify(arr.map(i => ({ value: i.value, label: i.label }))) // Guardamos solo lo vital
}

const getCurrencySymbol = (alias) => {
  if (!alias) return '';
  if (alias.includes('soles') || alias === 'PEN') return 'S/';
  if (alias.includes('dollar') || alias.includes('usd') || alias === 'USD') return '$';
  return alias; // Si no reconoce, devuelve el texto original
}

// Formatea el monto: S/ 338.00
const formatMoney = (alias, amount) => {
  const symbol = getCurrencySymbol(alias);
  const val = Number(amount) || 0;
  return `${symbol} ${val.toFixed(2)}`;
}


async function parseQueryAndApply() {
  const q = route.query
  console.log(q)
  const hasQueryParams = Object.keys(q).length > 0
  if (!hasQueryParams) return false

  clearFilters(false)

  // A. Filtros de texto y booleanos simples
  if (q.q)              filters.q            = q.q
  if (q.program_text)   filters.program_text  = q.program_text
  if (q.web)            filters.web           = q.web
  if (q.b2b)            filters.b2b           = q.b2b

  // B. Fechas
  if (q.from_date || q.to_date) {
    filters.rangoFechas = { start: q.from_date || '', end: q.to_date || '' }
    if (q.from_date) filters.created_range_string = `${q.from_date} a ${q.to_date || q.from_date}`
  }
  if (q.pay_date_from || q.pay_date_to) {
    filters.pay_date_from = q.pay_date_from || ''
    filters.pay_date_to   = q.pay_date_to   || ''
    if (q.pay_date_from) filters.pay_date_range_string = `${q.pay_date_from} a ${q.pay_date_to || q.pay_date_from}`
  }
  if (q.edition_start_from) {
    filters.edition_start_from = q.edition_start_from
    filters.edition_start_to   = q.edition_start_to || q.edition_start_from
    filters.edition_range_string = `${q.edition_start_from} a ${filters.edition_start_to}`
  }

  // C. MultiSelects: JSON directo, sin hydrate ni catálogos
  filters.owner_user_ids     = decodeFilter(q.owner_user_ids)
  filters.status_lead_ids    = decodeFilter(q.status_lead_ids)
  filters.last_follow_ids    = decodeFilter(q.last_follow_ids)
  filters.interest_level_ids = decodeFilter(q.interest_level_ids)
  filters.channel_ids        = decodeFilter(q.channel_ids)
  filters.query_ids          = decodeFilter(q.query_ids)
  filters.type_program_ids   = decodeFilter(q.type_program_ids)
  filters.model_modality_ids = decodeFilter(q.model_modality_ids)
  filters.strategy_ids       = decodeFilter(q.strategy_ids)
  filters.word_ids           = decodeFilter(q.word_ids)
  filters.medium_contact_ids = decodeFilter(q.medium_contact_ids)
  filters.code_country_ids   = decodeFilter(q.code_country_ids)
  filters.moment_ids         = decodeFilter(q.moment_ids)

  await router.replace({ query: {} })
  return true
}
// === LOGICA MODAL SEGUIMIENTO (Restaurada) ===
const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 2. Lógica de Iniciar/Detener
const toggleTimer = (attempt) => {
  if (attempt.timerActive) {
    // Detener
    clearInterval(attempt.timerId)
    attempt.timerActive = false
    attempt.timerId = null
  } else {
    // Iniciar
    attempt.timerActive = true
    attempt.timerId = setInterval(() => {
      // Si es null o undefined, iniciar en 0, luego sumar 1
      attempt.contact_duration = (attempt.contact_duration || 0) + 1
    }, 1000)
  }
}

// 3. Limpieza de intervalos al salir (para que no se queden corriendo en memoria)
onBeforeUnmount(() => {
  if (editableHistory.value) {
    editableHistory.value.forEach(item => {
      if (item.timerId) clearInterval(item.timerId)
    })
  }
})
function openFollowModal(lead) {
  selectedFollowLead.value = lead
  
  try {
    let rawDetails = lead.follow_details;
    if (typeof rawDetails === 'string') {
        try { rawDetails = JSON.parse(rawDetails); } catch (e) { rawDetails = []; }
    }

    if (Array.isArray(rawDetails)) {
      editableHistory.value = rawDetails
        .map(d => {
          if (!d) return null;
          return {
            id: d?.id || d?.lead_contact_attempt_id,
            status_alias: d?.cat_status_alias || d?.cat_status_label,
            calling_alias: d?.cat_result_alias || d?.cat_result_label,
            contact_datetime: d?.contact_datetime ? String(d.contact_datetime).replace('T', ' ').slice(0, 16) : '',
            response: d?.response || '',
            
            // --> AGREGAR ESTOS CAMPOS:
            contact_duration: d?.contact_duration || 0, 
            timerActive: false,
            timerId: null
          };
        })
        .filter(item => item !== null);
    } else {
      editableHistory.value = [];
    }
  } catch (error) {
    console.error(error)
    editableHistory.value = [];
  }
  showFollowModal.value = true;
}

// --- 3. MODIFICAR NUEVO INTENTO (addLocalAttempt) ---

// === COMPROBACIÓN INICIAL PARA EL BOTÓN ===
async function checkMyRestrictions() {
  if (!isComercial) return; // Si es líder/admin, no necesita alerta
  try {
    const myRest = await comercialService.restrictionsList({ 
      user_id: currentUserId, 
      is_comercial: true 
    });
    
    if (myRest && myRest.length > 0) {
      const r = myRest[0];
      // Verificamos si al menos UNO de los arrays tiene datos (length > 0)
      const isRestricted = [
        r.type_program_ids, r.model_modality_ids, r.program_ids, 
        r.status_lead_ids, r.last_follow_ids, r.interest_level_ids, 
        r.channel_ids, r.strategy_ids, r.moment_ids
      ].some(arr => Array.isArray(arr) && arr.length > 0);
      
      hasActiveRestrictions.value = isRestricted;
    }
  } catch (e) {
    console.error("Error comprobando mis restricciones:", e);
  }
}
const hydrateCatalog = (ids, catalogArray) => {
  if (!Array.isArray(ids) || !catalogArray) return [];
  return catalogArray.filter(item => ids.includes(item.id));
};

// === 1. ABRIR Y CARGAR DATA (VERSIÓN CORREGIDA Y ROBUSTA) ===
async function openControlModal() {
  showControlModal.value = true;
  asesoresControl.value = []; 
  
  try {
    // 1. Asegurar carga de asesores
    if (filtroOwners.value.length === 0) {
      await loadOwners();
    }

    // 2. Traer restricciones desde BD
    const savedRestrictions = await comercialService.restrictionsList({
      user_id: currentUserId,
      is_comercial: isComercial
    });

    // 3. Función local para mapear e hidratar un asesor a la vez
    const buildAsesorRecord = (userId, userName, bdRest = {}) => {
      return {
        user_id: userId,
        name: userName,
        type_program_ids: hydrateCatalog(bdRest.type_program_ids, filtroTiposPrograma.value),
        model_modality_ids: hydrateCatalog(bdRest.model_modality_ids, filtroModalidad.value),
        program_ids: hydrateCatalog(bdRest.program_ids, filtroProgramasEspec.value),
        status_lead_ids: hydrateCatalog(bdRest.status_lead_ids, filtroPipeline.value),
        last_follow_ids: hydrateCatalog(bdRest.last_follow_ids, filtroFollow.value),
        interest_level_ids: hydrateCatalog(bdRest.interest_level_ids, filtroInterest.value),
        channel_ids: hydrateCatalog(bdRest.channel_ids, filtroCanales.value),
        strategy_ids: hydrateCatalog(bdRest.strategy_ids, strategyCatalog.value),
        moment_ids: hydrateCatalog(bdRest.moment_ids, filtroMoment.value)
      };
    };

    // 4. Asignación según rol
    if (isComercial) {
      // VISTA ASESOR: Solo mi usuario
      const bdRest = savedRestrictions[0] || {};
      const myName = storedUser?.first_name 
        ? `${storedUser.first_name} ${storedUser.last_name || ''}` 
        : `Mi Usuario (${currentUserId})`;
        
      asesoresControl.value = [buildAsesorRecord(currentUserId, myName, bdRest)];
      
    } else {
      // VISTA ADMIN/LÍDER: Todos los usuarios
      asesoresControl.value = filtroOwners.value.map(owner => {
        const bdRest = savedRestrictions.find(r => r.user_id === owner.id) || {};
        return buildAsesorRecord(owner.id, owner.description, bdRest);
      });
    }

    // 5. TRUCO DE REHIDRATACIÓN (Fallback por si Vue tardó en cargar los catálogos inyectados)
    // Si la modalidad está vacía en los catálogos al principio, le damos 500ms y re-evaluamos
    if (filtroModalidad.value.length === 0 || filtroTiposPrograma.value.length === 0) {
      setTimeout(() => {
         console.log("Re-hidratando catálogos retrasados...");
         // Forzamos la reactividad recargando los valores con los catálogos llenos
         asesoresControl.value = asesoresControl.value.map(asesor => {
            const originalBdRest = isComercial 
              ? savedRestrictions[0] || {}
              : savedRestrictions.find(r => r.user_id === asesor.user_id) || {};
            return buildAsesorRecord(asesor.user_id, asesor.name, originalBdRest);
         });
      }, 500);
    }

  } catch (error) {
    console.error("Error cargando permisos:", error);
    toast.error("Hubo un error al cargar el panel de permisos.");
  }
}

// === 2. GUARDAR DATA ===
async function saveControlRestrictions() {
  isSavingRestrictions.value = true;
  
  try {
    // Preparar el payload masivo limpiando los objetos a Arrays planos de Enteros [1, 2]
    const payloadMasivo = asesoresControl.value.map(asesor => ({
      user_id: asesor.user_id,
      is_active: true,
      type_program_ids: extractIds(asesor.type_program_ids),
      model_modality_ids: extractIds(asesor.model_modality_ids),
      program_ids: extractIds(asesor.program_ids),
      status_lead_ids: extractIds(asesor.status_lead_ids),
      last_follow_ids: extractIds(asesor.last_follow_ids),
      interest_level_ids: extractIds(asesor.interest_level_ids),
      channel_ids: extractIds(asesor.channel_ids),
      strategy_ids: extractIds(asesor.strategy_ids),
      moment_ids: extractIds(asesor.moment_ids),
    }));

    await comercialService.restrictionsUpdate(payloadMasivo);
    
    toast.success('Filtros restrictivos aplicados correctamente');
    showControlModal.value = false;
    
  } catch (error) {
    console.error("Error guardando restricciones:", error);
    toast.error('Error al guardar las restricciones');
  } finally {
    isSavingRestrictions.value = false;
  }
}
async function saveFastFollow() {
  if (!selectedFollowLead.value) return
  
  // --> AGREGAR: Detener timers activos antes de guardar
  editableHistory.value.forEach(item => {
      if(item.timerActive) toggleTimer(item);
  });

  isSavingFollow.value = true
  
  try {
    const attemptsPayload = editableHistory.value.map(item => ({
       id: item.id,
       cat_status: getIdFromAlias(item.status_alias, filtroFollow.value),
       cat_result: getIdFromAlias(item.calling_alias, filtroCalling.value),
       contact_datetime: item.contact_datetime,
       response: item.response,
       
       // --> AGREGAR: Enviar duración al backend
       contact_duration: item.contact_duration 
    }))

    await comercialService.leadUpdate({
        id: selectedFollowLead.value.id,
        lead: {}, 
        contact_attempts: attemptsPayload 
    })

    toast.success('Seguimiento actualizado correctamente')
    showFollowModal.value = false
    fetchLeads() 
  } catch (error) {
    console.error(error)
    toast.error('Error al guardar el seguimiento')
  } finally {
    isSavingFollow.value = false
  }
}
function rebuildChips() {
  const chips = []

  const makeChip = (key, labelPrefix, items) => {
    if (!items || items.length === 0) return
    const labels = items.map(i => i.label || i.value)
    chips.push({
      key,
      label:   labels.length === 1 ? `${labelPrefix}: ${labels[0]}` : `${labelPrefix}: ${labels.length} sel.`,
      text:    `${labelPrefix}: ${labels.join(', ')}`,
      details: labels
    })
  }

  // Simples
  if (filters.q)            chips.push({ key: 'q',            label: `Buscar: "${filters.q}"` })
  if (filters.program_text) chips.push({ key: 'program_text', label: `Prog: "${filters.program_text}"` })
  if (filters.web)          chips.push({ key: 'web',          label: `Web: ${filters.web === 'Y' ? 'Sí' : 'No'}` })
  if (filters.b2b)          chips.push({ key: 'b2b',          label: `B2B: ${filters.b2b === 'Y' ? 'Sí' : 'No'}` })

  if (filters.rangoFechas?.start)
    chips.push({ key: 'rangoFechas', label: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}` })
  if (filters.pay_date_from)
    chips.push({ key: 'pay_date', label: `Pago: ${filters.pay_date_from} → ${filters.pay_date_to}` })
  if (filters.edition_start_from)
    chips.push({ key: 'edition_start', label: `Edición: ${filters.edition_start_from} → ${filters.edition_start_to}` })

  // MultiSelects (instantáneo, sin buscar en catálogos)
  makeChip('status_lead_ids',    'Estatus',    filters.status_lead_ids)
  makeChip('last_follow_ids',    'Seguim.',    filters.last_follow_ids)
  makeChip('interest_level_ids', 'Interés',    filters.interest_level_ids)
  makeChip('channel_ids',        'Canal',      filters.channel_ids)
  makeChip('query_ids',          'Promoción',  filters.query_ids)
  makeChip('type_program_ids',   'Tipo',       filters.type_program_ids)
  makeChip('model_modality_ids', 'Modalidad',  filters.model_modality_ids)
  makeChip('strategy_ids',       'Estrategia', filters.strategy_ids)
  makeChip('word_ids',           'Palabra',    filters.word_ids)
  makeChip('medium_contact_ids', 'Medio',      filters.medium_contact_ids)
  makeChip('code_country_ids',   'País',       filters.code_country_ids)
  makeChip('moment_ids',         'Etapa',      filters.moment_ids)
  if (!isComercial) makeChip('owner_user_ids', 'Asesor', filters.owner_user_ids)

  activeFilterChips.value = chips
}
// === API ===
async function fetchLeads() {
  try {
    const getIds = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr.map(item => (typeof item === 'object' && item !== null) ? item.value : item)
    }

    const { items, total: t } = await comercialService.leadList({
      q:                   filters.q             || null,
      page:                pagin.value.page,
      size:                pagin.value.size,
      program_text:        filters.program_text  || null,
      web:                 filters.web           || null,
      b2b:                 filters.b2b           || null,

      from_date:           filters.rangoFechas?.start        || null,
      to_date:             filters.rangoFechas?.end          || null,
      updated_from:        filters.rangoModificacion?.start  || null,
      updated_to:          filters.rangoModificacion?.end    || null,
      pay_date_from:       filters.pay_date_from             || null,
      pay_date_to:         filters.pay_date_to               || null,
      edition_start_from:  filters.edition_start_from        || null,
      edition_start_to:    filters.edition_start_to          || null,

      owner_user_ids:      getIds(filters.owner_user_ids),
      status_lead_ids:     getIds(filters.status_lead_ids),
      last_follow_ids:     getIds(filters.last_follow_ids),
      interest_level_ids:  getIds(filters.interest_level_ids),
      channel_ids:         getIds(filters.channel_ids),
      query_ids:           getIds(filters.query_ids),
      type_program_ids:    getIds(filters.type_program_ids),
      model_modality_ids:  getIds(filters.model_modality_ids),
      strategy_ids:        getIds(filters.strategy_ids),
      word_ids:            getIds(filters.word_ids),
      medium_contact_ids:  getIds(filters.medium_contact_ids),
      code_country_ids:    getIds(filters.code_country_ids),
      moment_ids:          getIds(filters.moment_ids),
    })

    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)

    if (filtroOwners.value.length === 0 && items?.length > 0) {
      await loadOwners()
    }
  } catch (e) {
    console.error('Error cargando leads:', e)
    leadsRaw.value = []
    pagin.value.total = 0
  }
}
const showEnrollmentModal = ref(false)
const enrollmentData = ref(null)
const isLoadingEnrollment = ref(false)

// Función para abrir el modal (llámala desde el botón verde)
async function openEnrollmentModal(enrollmentId) {
  if (!enrollmentId) return;
  
  isLoadingEnrollment.value = true;
  enrollmentData.value = null; // Limpiar data vieja
  showEnrollmentModal.value = true;

  try {
    // Ajusta la ruta a tu servicio de API real
    const response = await comercialService.enrollmentGet({ enrollment_id: enrollmentId }); 
    // Asumiendo que tu servicio devuelve response.data o response
    enrollmentData.value = response.data || response; 
  } catch (error) {
    console.error(error);
    toast.error("No se pudo cargar la información de la matrícula");
    showEnrollmentModal.value = false;
  } finally {
    isLoadingEnrollment.value = false;
  }
}
// === EVENTOS UI ===
function startPress(lead) {
  pressingRowId.value = lead.id
  pressTimer = setTimeout(() => { openFollowModal(lead); cancelPress() }, 1000)
}
function cancelPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
  pressingRowId.value = null
}

function clearFilters(reload = true) {
  Object.assign(filters, {
    q: '', program_text: '', estado: null, web: null, b2b: null,
    owner_user_ids: [], status_lead_ids: [], last_follow_ids: [],
    interest_level_ids: [], channel_ids: [], query_ids: [],
    type_program_ids: [], model_modality_ids: [], strategy_ids: [],
    word_ids: [], medium_contact_ids: [], code_country_ids: [], moment_ids: [],
    rangoFechas: { start: '', end: '' }, rangoModificacion: { start: '', end: '' },
    created_range_string: null, updated_range_string: null,
    edition_range_string: null, edition_start_from: '', edition_start_to: '',
    pay_date_from: '', pay_date_to: '', pay_date_range_string: null
  })

  if (isComercial && currentUserId) filters.owner_user_ids = [currentUserId]

  if (reload) {
    pagin.value.page = 1
    localStorage.removeItem('crm_leads_filter_state_v1')
    rebuildChips()
    fetchLeads()
  }
}

// ... resto de funciones (addLocalAttempt, saveFastFollow, etc.) idénticas ...
// Asegurate de incluir loadOwners, openFollowModal, etc.
async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => {
      // Replicamos la lógica exacta del SQL: Nombre + Inicial del Apellido.
      const fName = (u.first_name || '').trim()
      const lName = (u.last_name || '').trim()
      
      let fullName = fName
      if (lName) fullName += ` ${lName.charAt(0)}.`
      
      // Si no tiene nombre ni apellido, usamos el ID como fallback igual que el backend
      const desc = fullName.trim() || `Usuario ${u.user_id}`

      return { 
        id: u.user_id, 
        description: desc 
      }
    })
  } catch (e) { 
    console.error(e) 
  }
}
function openFilterModal() { showFilterModal.value = true }
function applyFilters() { showFilterModal.value = false; pagin.value.page = 1; saveState(); rebuildChips(); fetchLeads() }
function clearFilter(key) {
  if (key === 'rangoFechas') {
    filters.rangoFechas = { start: '', end: '' }
    filters.created_range_string = null
  } else if (key === 'pay_date') {
    filters.pay_date_from = ''
    filters.pay_date_to = ''
    filters.pay_date_range_string = null
  } else if (key === 'edition_start') {
    filters.edition_start_from = ''
    filters.edition_start_to = ''
    filters.edition_range_string = null
  } else if (Array.isArray(filters[key])) {
    filters[key] = []
  } else {
    filters[key] = null
  }
  applyFilters()
}
function handleDateFilterChange(dateStr, type) {
  let start = '', end = ''
  if (dateStr && dateStr.includes(' a ')) { [start, end] = dateStr.split(' a ') } else if (dateStr) { start = end = dateStr }
  if (type === 'created') { filters.rangoFechas = {start, end}; filters.created_range_string = dateStr }
  else if (type === 'updated') { filters.rangoModificacion = {start, end}; filters.updated_range_string = dateStr }
  else if (type === 'pay_date') {
    filters.pay_date_from = start;
    filters.pay_date_to = end;
    filters.pay_date_range_string = dateStr;
  }
  else if (type === 'edition_start') { filters.edition_start_from = start; filters.edition_start_to = end; filters.edition_range_string = dateStr }
}
// Helpers visuales
function rowClassForStatus(s) { const map = { 'we_lead_status_insc': 'row-inscrito', 'we_lead_status_interesado': 'row-blue', 'we_lead_status_bought': 'row-emerald', 'we_lead_status_will_pay': 'row-emerald', 'we_lead_status_proximo': 'row-yellow', 'we_lead_status_indiferente': 'row-gray', 'we_lead_status_closed': 'row-red', 'we_lead_status_desestimado': 'row-red' }; return map[s] || '' }
function badgeForInterest(s) { const map = { 'we_lead_interest_high': 'badge-success', 'we_lead_interest_medium': 'badge-warning', 'we_lead_interest_low': 'badge-danger' }; return map[s] || 'badge-neutral' }
function badgeForFollow(s) { const map = { 'we_follow_lead_pending': 'badge-light', 'we_follow_lead_answered': 'badge-success', 'we_follow_lead_no_answer': 'badge-danger' }; return map[s] || 'badge-neutral' }
function addLocalAttempt() { 
    const now = new Date(); 
    const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); 
    
    editableHistory.value.unshift({ 
        id: null, 
        status_alias: 'we_follow_lead_pending', 
        calling_alias: null, 
        contact_datetime: isoString, 
        response: '',
        
        // --> AGREGAR ESTOS CAMPOS:
        contact_duration: 0,
        timerActive: false,
        timerId: null
    }) 
}

function getIdFromAlias(alias, catalogArray) { if (!alias || !catalogArray) return null; const item = catalogArray.find(i => i.alias === alias); return item ? item.id : null }
function goNew() { router.push({ name: 'ComercialLeadsNew' }) }
function viewLead(lead) { router.push({ name: 'ComercialLeadsNew', query: { clone_from: lead.id } }) }
function editLead(lead) { router.push({ name: 'ComercialLeadDetalle', params: { id: lead.id } }) }
function handlePaginationChange() {
  fetchLeads()
}

onMounted(async () => {
  if (isComercial && currentUserId) {
    filters.owner_user_ids = [currentUserId]
    checkMyRestrictions() 
  }
  loadOwners()
  await parseQueryAndApply()
  rebuildChips()
  fetchLeads()
})
</script>

<style scoped>
/* Los mismos estilos optimizados que te pasé antes */
.leads-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.6rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #6366f1; margin-bottom: 2rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #f3f4f6; }
.title { display: flex; flex-direction: column; gap: 4px; }
.title span { font-weight: 700; font-size: 1.1rem; color: #111827; }
.title .sub { font-weight: 600; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
.card-body { padding: 1.25rem; }
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #374151; }
.table thead th { background: #f9fafb; padding: 0.85rem 0.75rem; text-align: left; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
.table td { padding: 0.85rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.table-hover tbody tr:hover { background-color: #f8fafc; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.fw-600 { font-weight: 600; }
.name { font-weight: 600; color: #1e293b; line-height: 1.2; font-size: 0.9rem; }
.muted { color: #6b7280; }
.text-dark { color: #111827; }
.text-primary { color: #4f46e5; }
.text-warning { color: #d97706; }
.small { font-size: 0.75rem; }
.x-small { font-size: 0.68rem; }
.minW { min-width: 120px; }
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; border: 1px solid transparent; }
.badge-neutral { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-light { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
.badge-info { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.badge-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.badge-success { background: #ecfdf5; color: #065f46; border-color: #d1fae5; }
.badge-danger { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }
.btn { border: 1px solid #d1d5db; padding: 0.45rem 0.75rem; border-radius: 0.4rem; cursor: pointer; transition: all 0.2s; background: #fff; font-size: 0.8rem; font-weight: 600; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
.btn-primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }
.section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.program-filter-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
.row-inscrito, .row-inscrito > td { background-color: #d1fae5 !important; }
.row-inscrito { border-left: 4px solid #059669 !important; }
.row-inscrito:hover, .row-inscrito:hover > td { background-color: #a7f3d0 !important; }
.row-blue, .row-blue > td { background-color: #f0f9ff !important; }
.row-blue:hover, .row-blue:hover > td { background-color: #e0f2fe !important; }
.row-emerald, .row-emerald > td { background-color: #ecfdf5 !important; }
.row-emerald { border-left: 3px solid #10b981 !important; }
.row-emerald:hover, .row-emerald:hover > td { background-color: #d1fae5 !important; }
.row-yellow, .row-yellow > td { background-color: #fffbeb !important; }
.row-yellow:hover, .row-yellow:hover > td { background-color: #fef3c7 !important; }
.row-red, .row-red > td { background-color: #fef2f2 !important; opacity: 0.95; }
.row-red:hover, .row-red:hover > td { background-color: #fee2e2 !important; }
.row-gray, .row-gray > td { background-color: #f8fafc !important; color: #64748b; }
.row-gray:hover, .row-gray:hover > td { background-color: #f1f5f9 !important; }
tr, td { transition: background-color 0.2s ease; }
.cursor-pointer { cursor: pointer; }
.avatar-placeholder { width: 40px; height: 40px; background-color: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.scroll-area { max-height: 60vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.compact-table { font-size: 0.75rem !important; }
.compact-table th, .compact-table td { padding: 0.25rem 0.5rem !important; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.compact-table td:hover { white-space: normal; overflow: visible; position: relative; z-index: 10; background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
tr { position: relative; user-select: none; will-change: background-color; transition: background-color 0.1s ease-in-out; }
tr::after { content: ""; position: absolute; left: 0; bottom: 0; top: 0; height: 100%; width: 0%; background-color: rgba(99, 102, 241, 0.25); transition: width 0.3s ease-out; pointer-events: none; z-index: 5; }
tr.row-pressing::after { width: 100%; transition: width 1s linear; }
/* Estilos adicionales para el Panel de Control */
.control-table-wrapper {
  max-height: 60vh;
  overflow: auto;
}
.control-table th {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.minW-200 {
  min-width: 220px;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1);
}
.control-table thead .sticky-col {
  z-index: 3; /* Para que la cabecera del sticky quede por encima del scroll horizontal Y vertical */
}

.pulse-alert {
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}
</style>