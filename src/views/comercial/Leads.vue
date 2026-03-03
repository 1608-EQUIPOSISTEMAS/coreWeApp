<template>
  <div class="exec-shell list-shell">
<header class="exec-masthead" :class="{ 'masthead--compact': toolbarCollapsed }">
  <div class="masthead-inner">
    <div class="masthead-brand">
      <div class="brand-rule" :class="{ 'brand-rule--sm': toolbarCollapsed }"></div>
      <div class="brand-text">
        <span class="brand-eyebrow" v-show="!toolbarCollapsed">Gestión Comercial</span>
        <h1 class="brand-title">
          <span v-if="!toolbarCollapsed">Listado de Leads</span>
          <span v-else class="brand-title--inline">
            <span class="brand-eyebrow--inline">CRM</span>
            Leads
          </span>
        </h1>
      </div>
    </div>

    <button
      class="focus-toggle-btn"
      :class="{ 'focus-toggle-btn--active': toolbarCollapsed }"
      @click="toolbarCollapsed = !toolbarCollapsed"
      :title="toolbarCollapsed ? 'Expandir barra' : 'Modo enfocado'"
    >
      <i class="fa-solid" :class="toolbarCollapsed ? 'fa-maximize' : 'fa-minimize'"></i>
      <span v-show="!toolbarCollapsed">Enfocar</span>
    </button>
  </div>
</header>
    <main class="exec-body">

<div class="toolbar-chips mb-2" v-show="!toolbarCollapsed">
        <BaseFilterChips
          :items="activeFilterChips"
          @remove="clearFilter"
          @clear-all="clearFilters"
        />
      </div>

<div class="exec-toolbar" v-show="!toolbarCollapsed">
        <div class="toolbar-pagination">
          <BasePagination
            v-model="pagin"
            @open-filters="openFilterModal"
            @change="handlePaginationChange"
          />
        </div>
        <div class="toolbar-actions">
          <button
            class="btn-exec"
            :class="hasActiveRestrictions ? 'btn-exec-danger pulse-alert' : 'btn-exec-ghost'"
            @click="openControlModal"
            :title="isComercial ? 'Mis Permisos de Visualización' : 'Control de Asesores'"
          >
            <i class="fa-solid" :class="isComercial ? 'fa-user-lock' : 'fa-shield-halved'"></i>
            <span>{{ isComercial ? 'Mis Permisos' : 'Control' }}</span>
          </button>

          <button
            class="btn-exec"
            :class="isCompact ? 'btn-exec-active' : 'btn-exec-ghost'"
            @click="isCompact = !isCompact"
            title="Alternar entre vista agrupada y vista detallada por columnas"
          >
            <i class="fa-solid" :class="isCompact ? 'fa-list' : 'fa-table-columns'"></i>
            <span>Compactado</span>
          </button>

          <button class="btn-exec btn-exec-primary" @click="goNew" v-if="!hasActiveRestrictions">
            <i class="fa-solid fa-plus"></i> Nuevo Lead
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table" :class="{ 'compact-table': isCompact }">
            <thead>
<tr v-if="!isCompact" class="thead-sub">
  <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
  <th class="ts ts-c">Status</th>
  <th class="ts ts-c">Contacto</th>
  <th class="ts ts-c" style="min-width: 160px!important;">T. Consulta</th>
  <th class="ts ts-c">Programa / Interés</th>
  <th class="ts ts-c">Ini. Edición</th>
  <th class="ts ts-c">F. Pago</th>
  <th class="ts ts-c">Nivel Interés</th>
  <th class="ts ts-c">Registro</th>
  <th class="ts ts-c text-center">Seguimiento</th>
</tr>
<tr v-if="!isCompact" class="thead-filter">
  <!-- Acciones: botón limpiar todo inline -->
<!-- Celda acciones en thead-filter — maneja 3 estados -->
<!-- Versión simplificada (recomendada) -->
<th class="tf tf-actions-cell">
  <div class="hf-actions-group">

    <button
      v-if="toolbarCollapsed && !hasActiveRestrictions"
      class="hf-new-btn"
      @click="goNew"
      title="Nuevo Lead"
    >
      <i class="fa-solid fa-plus"></i>
    </button>

    <button
      v-if="activeFilterChips.length"
      class="hf-clear-btn"
      @click="clearFilters"
      title="Limpiar filtros"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>

  </div>
</th>

  <!-- Status -->
  <th class="tf">
    <MultiSelect
      v-model="filters.status_lead_ids"
      :items="filtroPipeline"
      label-key="description"
      value-key="id"
      placeholder="Todos..."
      class="hf-multiselect"
      @update:model-value="triggerInlineFilter"
    />
  </th>

  <!-- Contacto (búsqueda general q) -->
  <th class="tf">
    <input
      v-model="filters.q"
      type="text"
      class="hf-input"
      placeholder="Nombre, teléfono..."
      @input="debouncedInlineFilter"
      @keyup.enter="triggerInlineFilter"
    />
  </th>

  <!-- T. Consulta -->
  <th class="tf">
    <MultiSelect
      v-model="filters.query_ids"
      :items="filtroQuery"
      label-key="description"
      value-key="id"
      placeholder="Todos..."
      class="hf-multiselect"
      @update:model-value="triggerInlineFilter"
    />
  </th>

  <!-- Programa -->
  <th class="tf">
    <input
      v-model="filters.program_text"
      type="text"
      class="hf-input"
      placeholder="Buscar programa..."
      @input="debouncedInlineFilter"
      @keyup.enter="triggerInlineFilter"
    />
  </th>

  <!-- Ini. Edición — rango de fechas -->
  <th class="tf">
    <BaseDatePicker
      v-model="filters.edition_range_string"
      :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
      class="hf-input"
      placeholder="Desde → Hasta"
      @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'edition_start'); triggerInlineFilter() }"
    />
  </th>

  <!-- F. Pago -->
  <th class="tf">
    <BaseDatePicker
      v-model="filters.pay_date_range_string"
      :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
      class="hf-input"
      placeholder="Desde → Hasta"
      @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'pay_date'); triggerInlineFilter() }"
    />
  </th>

  <!-- Nivel Interés -->
  <th class="tf">
    <MultiSelect
      v-model="filters.interest_level_ids"
      :items="filtroInterest"
      label-key="description"
      value-key="id"
      placeholder="Todos..."
      class="hf-multiselect"
      @update:model-value="triggerInlineFilter"
    />
  </th>

  <!-- Registro / Asesor -->
  <th class="tf">
    <MultiSelect
      v-if="!isComercial"
      v-model="filters.owner_user_ids"
      :items="filtroOwners"
      label-key="description"
      value-key="id"
      placeholder="Todos..."
      class="hf-multiselect"
      @update:model-value="triggerInlineFilter"
    />
    <span v-else class="text-muted" style="font-size:10px;">—</span>
  </th>

  <!-- Seguimiento -->
  <th class="tf">
    <MultiSelect
      v-model="filters.last_follow_ids"
      :items="filtroFollow"
      label-key="description"
      value-key="id"
      placeholder="Todos..."
      class="hf-multiselect"
      @update:model-value="triggerInlineFilter"
    />
  </th>
</tr>
              <tr v-else class="thead-sub">
                <th class="ts ts-c text-center">Acciones</th>
                <th class="ts ts-c">Fecha Reg.</th>
                <th class="ts ts-c">Status</th>
                <th class="ts ts-c">Teléfono</th>
                <th class="ts ts-c">E. Cliente</th>
                <th class="ts ts-c">Nombre</th>
                <th class="ts ts-c" style="min-width: 140px!important;">T. Consulta</th>
                <th class="ts ts-c">Programa</th>
                <th class="ts ts-c">Tipo</th>
                <th class="ts ts-c">Modalidad</th>
                <th class="ts ts-c">Edición</th>
                <th class="ts ts-c">F. Pago</th>
                <th class="ts ts-c">Canal origen</th>
                <th class="ts ts-c">Medio</th>
                <th class="ts ts-c">Palabra Clave</th>
                <th class="ts ts-c">Estrategia</th>
                <th class="ts ts-c">Interés</th>
                <th class="ts ts-c">Asesor/Usuario</th>
                <th class="ts ts-c">Seguimiento</th>
              </tr>
              <!-- ✅ FILTROS INLINE — VISTA COMPACT (columnas clave) -->
<tr v-if="isCompact" class="thead-filter">
  <th class="tf"></th><!-- Acciones -->
  <th class="tf"><!-- Fecha Reg. — rango creación -->
    <BaseDatePicker
      v-model="filters.created_range_string"
      :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
      class="hf-input"
      placeholder="Fecha..."
      @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'created'); triggerInlineFilter() }"
    />
  </th>
  <th class="tf"><!-- Status -->
    <MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Status..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Teléfono / búsqueda -->
    <input v-model="filters.q" type="text" class="hf-input" placeholder="Tel / Nombre..." @input="debouncedInlineFilter" />
  </th>
  <th class="tf"><!-- E. Cliente -->
    <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Etapa..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"></th><!-- Nombre -->
  <th class="tf"><!-- T. Consulta -->
    <MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Programa -->
    <input v-model="filters.program_text" type="text" class="hf-input" placeholder="Programa..." @input="debouncedInlineFilter" />
  </th>
  <th class="tf"><!-- Tipo -->
    <MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Tipo..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Modalidad -->
    <MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Mod..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"></th><!-- Edición -->
  <th class="tf"><!-- F. Pago -->
    <BaseDatePicker v-model="filters.pay_date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="Pago..." @on-change="(d,s) => { handleDateFilterChange(s,'pay_date'); triggerInlineFilter() }" />
  </th>
  <th class="tf"><!-- Canal -->
    <MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Canal..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Medio -->
    <MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="Medio..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"></th><!-- Palabra -->
  <th class="tf"><!-- Estrategia -->
    <MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Estrategia..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Interés -->
    <MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Interés..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"><!-- Asesor -->
    <MultiSelect v-if="!isComercial" v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Asesor..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf"></th><!-- Seguimiento -->
</tr>
            </thead>

            <tbody v-if="!isCompact">
              <tr
                v-for="l in leadsRaw"
                :key="l.id"
                class="tbody-row"
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)"
                @mouseup="cancelPress"
                @mouseleave="cancelPress"
              >
                <td class="td-a text-center nowrap">
                  <button
                    class="btn-icon"
                    @click.stop="l.enrollment_id ? openEnrollmentModal(l.enrollment_id) : editLead(l)"
                    :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'"
                  >
                    <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
                  </button>
                  <button class="btn-icon ms-1" @click.stop="viewLead(l)" title="Clonar/Ver">
                    <i class="fa-solid fa-clone text-primary"></i>
                  </button>
                </td>
                <td class="td-a fw-600 text-dark">{{ pipelineMap[l.cat_status_alias] || l.cat_status_lead_label || '—' }}</td>
                <td class="td-a" style="min-width:160px">
                  <div class="d-flex flex-column">
                    <span class="fw-700 text-dark">{{ l.origin_phone }}</span>
                    <span class="small text-muted">{{ l.full_name_label || 'Sin nombre' }}</span>
                  </div>
                </td>
                <td class="td-a minW">
                  <span class="pill pill-slate border">{{ queryMap[l.cat_promotion_alias] || '—' }}</span>
                </td>
                <td class="td-a" style="min-width:280px">
                  <div v-if="l.program_label">
                    <div class="fw-600 text-dark">{{ l.program_label }}</div>
                    <div class="small text-muted mt-1">
                      {{ l.cat_type_program_label }}
                      <span v-if="l.cat_model_modality_label"> • {{ l.cat_model_modality_label }}</span>
                    </div>
                  </div>
                  <div v-else class="text-muted small">—</div>
                </td>
                <td class="td-a nowrap">
                  <div class="text-mono small fw-600 accent-text">{{ l.edition_label || '—' }}</div>
                </td>
                <td class="td-a small nowrap fw-700 pay-date-cell">{{ l.pay_date || '—' }}</td>
                <td class="td-a">
                  <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">
                    {{ interestMap[l.cat_interest_alias] }}
                  </span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="td-a" style="min-width:120px">
                  <div v-if="l.user_registration_label">
                    <div class="small fw-600 text-dark">{{ l.user_registration_label }}</div>
                    <div class="text-muted x-small">{{ l.registration_date }}</div>
                  </div>
                </td>
                <td class="td-a text-center" style="min-width:140px">
                  <div
                    v-if="l.cat_last_follow_alias"
                    class="pill d-inline-flex align-items-center gap-1"
                    :class="badgeForFollow(l.cat_last_follow_alias)"
                  >
                    <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                    <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75 ms-1"></i>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
              </tr>
              <tr v-if="!leadsRaw.length">
                <td colspan="10" class="empty-state">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p>No se encontraron leads con los filtros actuales.</p>
                </td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr
                v-for="l in leadsRaw"
                :key="l.id"
                class="tbody-row"
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)"
                @mouseup="cancelPress"
                @mouseleave="cancelPress"
              >
                <td class="td-a text-center nowrap">
                  <button class="btn-icon" @click.stop="editLead(l)" :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'">
                    <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
                  </button>
                  <button class="btn-icon ms-1" @click.stop="viewLead(l)" title="Clonar/Ver">
                    <i class="fa-solid fa-clone text-primary"></i>
                  </button>
                </td>
                <td class="td-a small nowrap">{{ l.registration_date }}</td>
                <td class="td-a">
                  <span class="pill pill-slate border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
                </td>
                <td class="td-a nowrap fw-700 text-dark">{{ l.origin_phone }}</td>
                <td class="td-a nowrap fw-600 text-dark">{{ l.cat_client_moment_description }}</td>
                <td class="td-a nowrap" style="min-width:120px">{{ l.full_name_label }}</td>
                <td class="td-a small" style="min-width:120px">{{ l.cat_promotion_description || '—' }}</td>
                <td class="td-a small fw-600 accent-text">{{ l.program_label || '—' }}</td>
                <td class="td-a small" style="min-width:120px">{{ l.cat_type_program_label || '—' }}</td>
                <td class="td-a small" style="min-width:120px">{{ l.cat_model_modality_label || '—' }}</td>
                <td class="td-a nowrap small text-mono">{{ l.edition_label || '—' }}</td>
                <td class="td-a">
                  <div class="small fw-700 pay-date-cell">{{ l.pay_date || '—' }}</div>
                </td>
                <td class="td-a small text-muted">{{ l.cat_channel_description || '—' }}</td>
                <td class="td-a small text-muted">{{ l.cat_medium_contact_description || '—' }}</td>
                <td class="td-a small text-muted">{{ l.cat_word_description || '—' }}</td>
                <td class="td-a small text-info fw-500">{{ l.cat_strategy_description || '—' }}</td>
                <td class="td-a">
                  <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">
                    {{ l.cat_interest_description }}
                  </span>
                </td>
                <td class="td-a small">{{ l.user_registration_label }}</td>
                <td class="td-a text-center">
                  <i
                    v-if="l.cat_last_follow_alias"
                    class="fa-solid fa-circle cursor-pointer"
                    :class="l.cat_last_follow_alias === 'we_calling_answered' ? 'c-green' : 'text-slate-400'"
                    :title="l.cat_last_follow_alias"
                  ></i>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <tr v-if="!leadsRaw.length">
                <td colspan="19" class="empty-state">No se encontraron leads con los filtros actuales.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>


  <BaseModal v-model="showFollowModal" title="Gestión de Seguimiento" size="xl">
    <div v-if="selectedFollowLead" class="exec-modal-body">

      <div class="modal-lead-strip">
        <div class="d-flex align-items-center gap-3">
          <div class="lead-avatar">
            <i class="fa-regular fa-user"></i>
          </div>
          <div>
            <h6 class="mb-0 fw-700 text-dark">{{ selectedFollowLead.full_name_label || 'Prospecto sin nombre' }}</h6>
            <div class="d-flex gap-3 text-secondary small mt-1 fw-500">
              <span><i class="fa-solid fa-phone me-1"></i>{{ selectedFollowLead.origin_phone }}</span>
              <span><i class="fa-solid fa-bullseye me-1"></i>{{ filtroPipeline.find(e => e.alias == selectedFollowLead.cat_status_alias)?.description || 'Estado desc.' }}</span>
            </div>
          </div>
        </div>
        <button class="btn-exec btn-exec-primary" @click="addLocalAttempt">
          <i class="fa-solid fa-plus me-1"></i> Nuevo Intento
        </button>
      </div>
      <div v-if="isLoadingFollow" class="exec-loader py-4">
  <div class="loader-ring"></div>
  <p class="text-muted small mt-2 fw-600">Cargando historial...</p>
</div>
<div  v-else class="p-3 scroll-area">
  <div v-if="editableHistory.length > 0" class="table-shell" style="overflow-x: auto;">
    <table class="exec-table" style="min-width: 1100px;">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width: 46px;">#</th>
                <th class="ts ts-c" style="min-width: 175px;">Tipo / Origen</th>
                <th class="ts ts-c" style="min-width: 155px;">Resultado</th>
                <th class="ts ts-c" style="min-width: 280px;">Fecha / Hora</th>
                <th class="ts ts-c text-center" style="min-width: 130px;">Duración</th>
                <th class="ts ts-c" style="min-width: 190px;">Observación</th>
                <th class="ts ts-c" style="min-width: 150px;">Registrado por</th>
<th class="ts ts-c" style="min-width: 150px;">Modificado por</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(attempt, idx) in editableHistory"
                :key="idx"
                class="tbody-row"
                :class="{ 'row-highlight': !attempt.id }"
              ><td class="td-a text-center fw-700 text-muted align-top pt-3">
                  {{ attempt.attempt_number ?? '—' }}
                </td>
                <td class="td-a align-top pt-2">
                  <SearchSelect
                    :items="lAttempts"
                    v-model="attempt.cat_type_attempt"
                    label-field="description"
                    value-field="alias"
                    placeholder="Seleccionar..."
                    :disabled="attempt.id"
                    class="exec-select-light w-100"
                    required
                  />

                  <div v-if="attempt.id" class="mt-2 text-truncate" style="font-size: 10px;">
                    <span
                      class="pill border w-100 justify-content-center"
                      :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'pill-slate' : 'pill-amber'"
                      :title="attempt.cat_creation_origin_label || 'Gestión Manual'"
                    >
                      <i class="fa-solid me-1" :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'fa-user-pen' : 'fa-robot'"></i>
                      {{ attempt.cat_creation_origin_label || 'Gestión Manual' }}
                    </span>
                  </div>
                  <div v-else class="mt-2 text-truncate text-center" style="font-size: 10px;">
                    <span class="text-muted"><i class="fa-solid fa-asterisk me-1"></i>Nuevo (Manual)</span>
                  </div>
                </td>

                <td class="td-a align-top pt-2">
                  <SearchSelect
                    v-model="attempt.calling_alias"
                    :items="filtroCalling"
                    label-field="description"
                    value-field="alias"
                    placeholder="Seleccionar..."
                    :disabled="attempt.calling_alias !== 'we_calling_pending' && attempt.calling_alias"
                    class="exec-select-light w-100"
                  />
                </td>

                <td class="td-a align-top pt-2">
                  <DateTime12
                    v-model="attempt.contact_datetime"
                    :onlyHours="true"
                    :disabled="!!attempt.id && (attempt.calling_alias !== 'we_calling_pending' || !$hasRole(['LIDER_COMERCIAL']))"
                    :config="!attempt.id && minDateForNewAttempt ? { minDate: minDateForNewAttempt } : {}"
                  />
                </td>

                <td class="td-a align-top text-center pt-2">
                  <div
                    class="d-flex align-items-center justify-content-center gap-2"
                    v-if="attempt.cat_type_attempt == 'we_attempt_call'"
                  >
                    <button
                      class="timer-btn"
                      :class="attempt.timerActive ? 'timer-btn--stop' : 'timer-btn--start'"
                      @click="toggleTimer(attempt)"
                      :disabled="!!attempt.id && attempt.calling_alias !== 'we_calling_pending'"
                      :title="attempt.timerActive ? 'Detener cronómetro' : 'Iniciar cronómetro'"
                    >
                      <i class="fa-solid" :class="attempt.timerActive ? 'fa-stop' : 'fa-play'"></i>
                    </button>
                    <div
                      class="text-mono fw-700 timer-display"
                      :class="attempt.timerActive ? 'timer-display--active' : ''"
                    >
                      {{ formatDuration(attempt.contact_duration) }}
                    </div>
                  </div>
                </td>

                <td class="td-a align-top pt-2">
                  <textarea
                    v-model="attempt.response"
                    class="exec-textarea w-100"
                    rows="2"
                    placeholder="Escribe una observación..."
                    :disabled="!!attempt.id && attempt.calling_alias !== 'we_calling_pending'"
                  ></textarea>
                </td>
                <td class="td-a align-top pt-2">
  <div v-if="attempt.user_registration_label" class="small fw-600 text-dark">
    {{ attempt.user_registration_label }}
  </div>
  <div class="text-muted x-small">{{ attempt.registration_date_fmt || '—' }}</div>
</td>

<td class="td-a align-top pt-2">
  <div v-if="attempt.user_modification_label" class="small fw-600 text-dark">
    {{ attempt.user_modification_label }}
  </div>
  <div class="text-muted x-small">{{ attempt.modification_date_fmt || '—' }}</div>
</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <p>No hay historial previo. Agrega el primer intento.</p>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn-exec btn-exec-outline" @click="showFollowModal = false">Cancelar</button>
        <button class="btn-exec btn-exec-success" @click="saveFastFollow" :disabled="isSavingFollow">
          <i class="fa-solid fa-save me-1"></i>
          {{ isSavingFollow ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </template>
  </BaseModal>


  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="xl">
    <div class="px-4 py-3">

      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <label class="exec-label">Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="exec-input-light w-100" placeholder="Nombre, teléfono..." @keyup.enter="applyFilters" />
        </div>
        <div class="col-md-3">
          <label class="exec-label text-primary">Ordenar resultados por</label>
          <SearchSelect v-model="filters.order_by" :items="filtroOrden" label-field="description" value-field="value" placeholder="Seleccionar orden..." class="exec-select-light w-100" />
        </div>
        <div class="col-md-3" v-if="!isComercial">
          <label class="exec-label">Asesor Asignado</label>
          <MultiSelect v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." />
        </div>
        <div class="col-md-3">
          <label class="exec-label">Etapa del Cliente</label>
          <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todas..." />
        </div>
      </div>

      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title">Estado, Origen y Ubicación</h6>
        <div class="row g-3">
          <div class="col-md-3 col-6"><label class="exec-label">Estatus (Pipeline)</label><MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Seguimiento</label><MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Origen de Intento</label><MultiSelect v-model="filters.attempt_origin_ids" :items="filtroAttemptOrigin" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Nivel de Interés</label><MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">País</label><MultiSelect v-model="filters.code_country_ids" :items="filtroPaises" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Canal (Red Social)</label><MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Medio de Contacto</label><MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Estrategia</label><MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Palabra Clave</label><MultiSelect v-model="filters.word_ids" :items="mktWordsCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
<div class="col-md-3 col-6">
            <label class="exec-label mb-2">Origen Web</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch">
                <input type="checkbox" v-model="filters.web" true-value="Y" :false-value="null" />
                <span></span>
              </label>
              <span class="x-small text-muted fw-600">{{ filters.web === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <label class="exec-label mb-2">Es B2B</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch">
                <input type="checkbox" v-model="filters.b2b" true-value="Y" :false-value="null" />
                <span></span>
              </label>
              <span class="x-small text-muted fw-600">{{ filters.b2b === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title" style="color: var(--teal-600);">Interés Académico</h6>
        <div class="row g-3">
          <div class="col-md-6"><label class="exec-label">Nombre del Programa</label><input v-model="filters.program_text" type="text" class="exec-input-light w-100" placeholder="Ej. Gestión de Proyectos..."></div>
          <div class="col-md-6"><label class="exec-label">Promoción</label><MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Tipo</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Modalidad</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-6">
            <label class="exec-label">Rango Inicio Edición</label>
            <BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'edition_start')" />
          </div>
        </div>
      </div>

      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title">Auditoría del Registro</h6>
        <div class="row g-3">
          <div class="col-md-4"><label class="exec-label">Fecha de Pago</label><BaseDatePicker v-model="filters.pay_date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'pay_date')" /></div>
          <div class="col-md-4"><label class="exec-label">Fecha de Creación</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" /></div>
          <div class="col-md-4"><label class="exec-label">Última Modificación</label><BaseDatePicker v-model="filters.updated_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'updated')" /></div>
        </div>
      </div>

      <div class="exec-fieldset">
        <h6 class="fieldset-title" style="color: var(--blue-600);">Filtros Financieros y Matrícula</h6>
        <div class="row g-3">

          <div class="col-md-3 col-6"><label class="exec-label">Estado FICO (Deuda)</label><MultiSelect v-model="filters.fico_status_ids" :items="filtroFicoStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Perfil de Precio</label><MultiSelect v-model="filters.profile_ids" :items="filtroProfile" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Moneda</label><MultiSelect v-model="filters.currency_ids" :items="filtroCurrency" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Mod. Inscripción</label><MultiSelect v-model="filters.inscription_modality_ids" :items="filtroInscriptionModality" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Estado Cuotas</label><MultiSelect v-model="filters.installment_status_ids" :items="filtroPaymentStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Método de Pago</label><MultiSelect v-model="filters.payment_method_ids" :items="filtroPaymentMethod" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Conciliación Bancaria</label><MultiSelect v-model="filters.settlement_status_ids" :items="filtroSettlementStatus" label-key="description" value-key="id" placeholder="Todas..." /></div>
        </div>
      </div>

    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn-exec btn-exec-outline" @click="clearFilters"><i class="fa-solid fa-eraser me-1"></i> Limpiar todo</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" @click="applyFilters"><i class="fa-solid fa-filter me-1"></i> Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>


  <BaseModal v-model="showControlModal" :title="isComercial ? 'Mis Permisos de Visualización' : 'Panel de Control: Restricciones de Asesores'" size="xl">

    <div v-if="!isComercial" class="px-4 py-3">
      <div class="exec-alert alert-info mb-4">
        <i class="fa-solid fa-circle-info me-2"></i>
        Configura los filtros obligatorios para cada asesor. Si un campo queda vacío, el asesor no tendrá restricciones en esa categoría.
      </div>

      <div class="table-shell control-table-wrapper">
        <table class="exec-table">
          <thead>
            <tr class="thead-group">
              <th rowspan="2" class="th-cat sticky-col" style="min-width: 200px;">Asesor Comercial</th>
              <th colspan="3" class="th-group th-group-a text-center">PROGRAMAS</th>
              <th colspan="6" class="th-group th-group-b text-center">GLOBAL</th>
            </tr>
            <tr class="thead-sub">
              <th class="ts ts-a minW-200">Tipos</th>
              <th class="ts ts-a minW-200">Modalidades</th>
              <th class="ts ts-a minW-300">Específicos</th>
              <th class="ts ts-b minW-200">Estatus (Pipeline)</th>
              <th class="ts ts-b minW-200">Seguimiento</th>
              <th class="ts ts-b minW-200">Niv. Interés</th>
              <th class="ts ts-b minW-200">Canal</th>
              <th class="ts ts-b minW-200">Estrategia</th>
              <th class="ts ts-b minW-200">E. Cliente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asesor in asesoresControl" :key="asesor.user_id" class="tbody-row">
              <td class="td-cat sticky-col fw-700">
                <i class="fa-solid fa-user-tie text-slate-400 me-2"></i>{{ asesor.name }}
              </td>
              <td class="td-a"><MultiSelect v-model="asesor.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-a"><MultiSelect v-model="asesor.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-a">
                <MultiSelect v-model="asesor.program_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" labelKey="abbreviation" valueKey="program_version_id" placeholder="Todos..." />
              </td>
              <td class="td-b"><MultiSelect v-model="asesor.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todos..." /></td>
            </tr>
            <tr v-if="asesoresControl.length === 0">
              <td colspan="10" class="empty-state">Cargando asesores...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="px-4 py-4">
      <div class="exec-alert-banner mb-4" :class="hasActiveRestrictions ? 'banner-danger' : 'banner-success'">
        <i class="fa-solid fa-3x" :class="hasActiveRestrictions ? 'fa-user-lock' : 'fa-check-circle'"></i>
        <div class="banner-content">
          <h5 class="banner-title">{{ hasActiveRestrictions ? 'Filtros de Seguridad Activos' : 'Acceso Total Permitido' }}</h5>
          <p class="banner-text">
            <span v-if="hasActiveRestrictions">Actualmente tu perfil tiene restricciones operativas asignadas. Solo puedes acceder a los leads que coincidan <b>estrictamente</b> con los parámetros mostrados a continuación. Los campos vacíos indican acceso total en esa categoría.</span>
            <span v-else>Tu perfil no cuenta con restricciones en este momento. Tienes visibilidad completa sobre todos los leads del sistema.</span>
          </p>
        </div>
      </div>

      <div class="row g-4" v-if="asesoresControl.length > 0">
        <div class="col-12">
          <h6 class="fieldset-title text-primary"><i class="fa-solid fa-graduation-cap me-1"></i> Restricciones Académicas</h6>
        </div>
        <div class="col-md-4"><label class="exec-label">Tipos de Programa</label><MultiSelect disabled v-model="asesoresControl[0].type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Modalidades</label><MultiSelect disabled v-model="asesoresControl[0].model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Programas Específicos</label><MultiSelect disabled v-model="asesoresControl[0].program_ids" :items="filtroProgramasEspec" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>

        <div class="col-12 mt-4">
          <h6 class="fieldset-title" style="color: var(--teal-600);"><i class="fa-solid fa-earth-americas me-1"></i> Restricciones Globales y Operativas</h6>
        </div>
        <div class="col-md-4"><label class="exec-label">Estatus (Pipeline)</label><MultiSelect disabled v-model="asesoresControl[0].status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">E. Cliente</label><MultiSelect disabled v-model="asesoresControl[0].moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Seguimiento</label><MultiSelect disabled v-model="asesoresControl[0].last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Canal de Origen</label><MultiSelect disabled v-model="asesoresControl[0].channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Estrategia MKT</label><MultiSelect disabled v-model="asesoresControl[0].strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Nivel de Interés</label><MultiSelect disabled v-model="asesoresControl[0].interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-end w-100 gap-2">
        <button class="btn-exec btn-exec-outline px-4" @click="showControlModal = false">
          {{ isComercial ? 'Entendido, cerrar' : 'Cancelar' }}
        </button>
        <button v-if="!isComercial" class="btn-exec btn-exec-warning px-4" @click="saveControlRestrictions" :disabled="isSavingRestrictions">
          <i class="fa-solid fa-save me-1"></i>
          {{ isSavingRestrictions ? 'Guardando...' : 'Guardar Restricciones' }}
        </button>
      </div>
    </template>
  </BaseModal>


  <BaseModal v-model="showEnrollmentModal" title="Detalle de Matrícula" size="xl">
    <div v-if="isLoadingEnrollment" class="exec-loader py-5">
      <div class="loader-ring"></div>
      <p class="text-muted small mt-2 fw-600">Cargando información financiera...</p>
    </div>

    <div v-else-if="enrollmentData" class="px-4 py-3">

      <div class="enrollment-header mb-4">
        <div>
          <h6 class="enrollment-title">{{ enrollmentData.abbreviation }}</h6>
          <div v-if="enrollmentData.version_name || enrollmentData.edition_label" class="enrollment-sub">
            <span v-if="enrollmentData.version_name"><i class="fa-solid fa-layer-group me-1"></i> {{ enrollmentData.version_name }}</span>
            <span v-if="enrollmentData.version_name && enrollmentData.edition_label" class="mx-2 text-slate-300">|</span>
            <span v-if="enrollmentData.edition_label"><i class="fa-regular fa-calendar me-1"></i> {{ enrollmentData.edition_label }}</span>
          </div>
        </div>
        <span v-if="enrollmentData.modality_label" class="pill pill-slate border">{{ enrollmentData.modality_label }}</span>
      </div>

      <div class="row g-4">
        <div class="col-md-6 border-end pe-4">
          <h6 class="fieldset-title">Información del Alumno</h6>
          <div class="info-block mb-3">
            <label class="exec-label">Nombre Completo</label>
            <span class="info-value">{{ enrollmentData.student_name }}</span>
          </div>
          <div class="d-flex justify-content-between mb-3">
            <div class="info-block">
              <label class="exec-label">Documento</label>
              <span class="info-value text-mono">{{ enrollmentData.document_number }}</span>
            </div>
            <div class="info-block">
              <label class="exec-label">Fecha Inscripción</label>
              <span class="info-value text-muted" style="font-weight:500;">{{ enrollmentData.registration_date }}</span>
            </div>
            <!-- Después del bloque de Fecha Inscripción -->
            <div class="info-block mb-3">
              <label class="exec-label">Canal de Pago</label>
              <span class="pill pill-slate border">
                <i class="fa-solid fa-credit-card me-1"></i>
                {{ enrollmentData.payment_channel_label || '—' }}
              </span>
            </div>

            <!-- Método o proveedor (condicional por canal) -->
            <div class="info-block mb-3" v-if="enrollmentData.payment_method_label || enrollmentData.token_provider_label">
              <label class="exec-label">
                {{ enrollmentData.payment_channel_alias === 'we_channel_token' ? 'Proveedor Link/Token' : 'Método de Pago' }}
              </label>
              <span class="info-value">
                {{ enrollmentData.payment_method_label || enrollmentData.token_provider_label || '—' }}
              </span>
            </div>
          </div>
          <div class="info-block mb-3">
            <label class="exec-label mb-1">Estado de Matrícula</label>
            <span class="pill" :class="enrollmentData.active === 'Y' ? 'pill-teal' : 'pill-red'">
              {{ enrollmentData.status_label || 'Desconocido' }}
            </span>
          </div>
          <div class="info-block mb-3">
            <label class="exec-label">Asesor que Registró</label>
            <span class="info-value">
              <i class="fa-solid fa-user-tie me-1 text-slate-400"></i>
              {{ enrollmentData.seller_name || '—' }}
            </span>
          </div>
        </div>

        <div class="col-md-6 ps-3">
          <h6 class="fieldset-title">Desglose Financiero</h6>
          <div class="d-flex align-items-center gap-2 mb-3">
            <i class="fa-solid fa-credit-card text-slate-400"></i>
            <span class="fw-700 text-dark" style="font-size:13px;">{{ enrollmentData.payment_plan_label || '—' }}</span>
            <span class="pill pill-slate" style="font-size:9px;">Plan de Pago</span>
          </div>

          <div class="finance-card">
            <div class="d-flex justify-content-between mb-2 pb-2">
              <span class="text-secondary fw-600" style="font-size:12px;">
                Precio de Lista:
<span class="pill pill-slate ms-1">{{ enrollmentData.profile_label || 'General' }}</span>
              </span>
              <span class="fw-700 text-dark" style="font-size:14px;">
                {{ formatMoney(enrollmentData.currency_symbol, enrollmentData.list_price) }}
              </span>
            </div>

            <div v-if="enrollmentData.discounts_list && enrollmentData.discounts_list.length > 0" class="mb-2">
              <div
                v-for="(desc, i) in enrollmentData.discounts_list"
                :key="i"
                class="d-flex justify-content-between align-items-center c-red py-1"
              >
                <span class="text-muted" style="font-size:11.5px;">
                  <i class="fa-solid fa-tag me-1"></i>
                  <span class="fw-600">{{ desc.label || desc.name }}</span>
                  <span v-if="desc.value" class="text-slate-400 ms-1 fst-italic">
                    ({{ desc.value }}{{ desc.alias && desc.alias.includes('percent') ? '%' : '' }})
                  </span>
                </span>
                <span class="fw-700 c-red" style="font-size:12.5px;">
                  - {{ formatMoney(enrollmentData.currency_symbol, desc.calculated_amount) }}
                </span>
              </div>
              <hr class="my-2" style="border-color:var(--slate-100);">
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Total a Pagar:</span>
              <span class="fw-700 accent-text" style="font-size:16px;">
                {{ formatMoney(enrollmentData.currency_symbol, enrollmentData.total_amount) }}
              </span>
            </div>

            <div class="d-flex justify-content-between mb-2 c-green">
              <span class="fw-600" style="font-size:12px;">Pagado:</span>
              <span class="fw-700" style="font-size:13px;">
                {{ formatMoney(enrollmentData.currency_symbol, enrollmentData.total_paid) }}
              </span>
            </div>

            <hr class="my-2" style="border-color:#dcfce7;">

            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Saldo Pendiente:</span>
              <span class="fw-700" style="font-size:18px;" :class="enrollmentData.pending_amount > 0 ? 'c-red' : 'c-green'">
                {{ formatMoney(enrollmentData.currency_symbol, enrollmentData.pending_amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="enrollmentData.pending_amount > 0" class="exec-alert alert-warning mt-4">
        <i class="fa-solid fa-clock mt-1 me-2" style="color:var(--amber-500)"></i>
        <div>
          <strong class="d-block text-dark">Próximo vencimiento:</strong>
          <span v-if="enrollmentData.next_due_date" style="color:#92400e;">
            {{ enrollmentData.next_due_date }} por <b>{{ formatMoney(enrollmentData.currency_symbol, enrollmentData.next_due_amount) }}</b>
          </span>
          <span v-else class="text-muted fst-italic">No hay fecha de cuota programada.</span>
        </div>
      </div>
      <div v-else class="exec-alert alert-success mt-4">
        <i class="fa-solid fa-check-circle me-1"></i> ¡Pagos al día!
      </div>

      <div class="mt-4 pt-2">
        <h6 class="fieldset-title"><i class="fa-solid fa-paperclip me-1"></i> Documentos y Adjuntos</h6>
        <div v-if="enrollmentData.files_list && enrollmentData.files_list.length > 0" class="file-list">
          <div v-for="(file, idx) in enrollmentData.files_list" :key="idx" class="file-item">
            <div class="d-flex align-items-center gap-3 overflow-hidden">
              <div class="file-icon">
                <i class="fa-solid fa-lg" :class="getFileIcon(file.type)"></i>
              </div>
              <div class="d-flex flex-column text-truncate">
                <span class="fw-600 text-dark text-truncate" style="font-size:12.5px;" :title="file.name">
                  {{ file.name || 'Documento Adjunto' }}
                </span>
                <span class="text-muted" style="font-size:10.5px;">
                  {{ file.date || 'Archivo histórico' }}
                  <span v-if="file.source === 'enrollment'" class="pill pill-slate ms-1" style="font-size:8px;">LEGACY</span>
                  <!-- En el v-for de files_list, junto al badge LEGACY: -->
                  <span v-if="file.source === 'payment_receipt'"
                        class="pill pill-slate ms-1" style="font-size:8px; background:#eff6ff; color:#1d4ed8;">
                    VOUCHER
                  </span>
                  <span v-if="file.source === 'enrollment'"
                        class="pill pill-slate ms-1" style="font-size:8px;">
                    LEGACY
                  </span>
                </span>
              </div>
            </div>
            <a :href="file.url" target="_blank" class="btn-icon" title="Ver Documento">
              <i class="fas fa-external-link-alt accent-text"></i>
            </a>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:1.5rem;">
          <p>No hay archivos adjuntos en esta matrícula.</p>
        </div>
      </div>
<!-- Observaciones del Asesor (del Lead) -->
<div class="mt-4 pt-2" v-if="enrollmentData.lead_observations">
  <h6 class="fieldset-title">
    <i class="fa-solid fa-comment-dots me-1 text-secondary"></i>
    Observaciones del Asesor
  </h6>
  <div class="exec-alert alert-info" style="border-left-color: #94a3b8;">
    <i class="fa-solid fa-quote-left opacity-40 mt-1"></i>
    <p class="mb-0" style="font-size:.85rem; white-space: pre-line; color: var(--text-primary);">
      {{ enrollmentData.lead_observations }}
    </p>
  </div>
</div>

<!-- Notas de Matrícula -->
<div class="mt-3" v-if="enrollmentData.notes">
  <h6 class="fieldset-title">
    <i class="fa-solid fa-note-sticky me-1 text-warning"></i>
    Notas de Matrícula
  </h6>
  <div class="exec-alert alert-warning">
    <i class="fa-solid fa-triangle-exclamation opacity-60 mt-1"></i>
    <p class="mb-0" style="font-size:.85rem; white-space: pre-line;">
      {{ enrollmentData.notes }}
    </p>
  </div>
</div>
    </div>
    <template #footer>
      <div v-if="enrollmentData" class="d-flex justify-content-end w-100">
        <button class="btn-exec btn-exec-primary px-4" @click="showEnrollmentModal = false">Cerrar</button>
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

const programService = inject(ServiceKeys.Program)
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
order_by: 0,
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
  moment_ids: [],attempt_origin_ids: [],
fico_status_ids: [],
  profile_ids: [],
  currency_ids: [],
  inscription_modality_ids: [],
  installment_status_ids: [],
  payment_method_ids: [],
  // payment_type_ids: [], // Ignorado como solicitaste
  settlement_status_ids: [],
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
const filtroFollow = ref(catalog.options('we_calling') || [])

const filtroAttemptOrigin = ref(catalog.options('we_attempt_origin') || [])
const attemptOriginCatalog = ref(catalog.options('we_attempt_origin') || [])

const filtroMoment = ref(catalog.options('we_moment') || [])
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])
const lAttempts = ref(catalog.options('we_attempt') || [])
const strategyCatalog = ref(catalog.options('we_type_strategy') || [])
const mktWordsCatalog = ref(catalog.options('we_key_word') || [])
const filtroCalling = ref(catalog.options('we_calling') || [])
const filtroMedios = ref(catalog.options('we_social_media') || []) // Ojo: we_medium_contact
const filtroPaises = ref(catalog.options('we_country') || [])   // Ojo: we_code_country
const filtroFicoStatus = ref(catalog.options('we_enrollment_status'))
const filtroProfile = ref(catalog.options('we_profile') || [])

const filtroOrden = [
  { value: 0, description: 'Fecha de Registro (Más recientes)' },
  { value: 1, description: 'Fecha Inicio Edición (Próximos)' },
  { value: 2, description: 'Fecha de Pago (Próximos)' }
]

const filtroCurrency = ref(
  catalog.options('we_currency', {
    mapItem: x => ({
      id: x.id,
      description: `${x.code || x.abbreviation} (${x.symbol || x.prefix})`,
      alias: x.alias,
      raw: {
        code: x.code ?? x.abbreviation,
        symbol: x.symbol ?? x.prefix,
        minorUnit: x.minorUnit ?? Number(x.precision ?? 2),
        locale: x.locale ?? (x.abbreviation === 'USD' ? 'en-US' : 'es-PE'),
        decimal: x.decimal ?? '.',
        thousands: x.thousands ?? ',',
        position: x.position ?? (x.suffix ? 'suffix' : 'prefix'),
        allowNegative: x.allowNegative ?? false,
        allowZero: x.allowZero ?? true,
      }
    })
  })
)
const filtroInscriptionModality = ref(catalog.options('we_insc_modality') || [])
const filtroPaymentStatus = ref(catalog.options('we_payment_status') || [])
const filtroPaymentMethod = ref(catalog.options('we_payment_method') || [])
// Reutilizamos we_payment_status para settlement si comparten estados (pagado, pendiente, anulado)
const filtroSettlementStatus = ref(catalog.options('we_settlement_status') || catalog.options('we_payment_status') || [])
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
  if (alias.includes('we_currency_soles') || alias === 'PEN') return 'S/';
  if (alias.includes('we_currency_dollars') || alias.includes('usd') || alias === 'USD') return '$';
  return alias; // Si no reconoce, devuelve el texto original
}

// Formatea el monto: S/ 338.00
const formatMoney = (symbolOrAlias, amount) => {
  // Si ya viene como "S/" o "$", úsalo directo. Si es alias, tradúcelo.
  let symbol = symbolOrAlias;
  if (symbolOrAlias === 'we_currency_soles' || symbolOrAlias === 'PEN') symbol = 'S/';
  if (symbolOrAlias === 'we_currency_dollars' || symbolOrAlias === 'USD') symbol = '$';

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
  filters.attempt_origin_ids = decodeFilter(q.attempt_origin_ids)
  filters.fico_status_ids          = decodeFilter(q.fico_status_ids)
  filters.profile_ids              = decodeFilter(q.profile_ids)
  filters.currency_ids             = decodeFilter(q.currency_ids)
  filters.inscription_modality_ids = decodeFilter(q.inscription_modality_ids)
  filters.installment_status_ids   = decodeFilter(q.installment_status_ids)
  filters.payment_method_ids       = decodeFilter(q.payment_method_ids)
  filters.settlement_status_ids    = decodeFilter(q.settlement_status_ids)

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

const isLoadingFollow = ref(false)

async function openFollowModal(lead) {
  selectedFollowLead.value = lead
  editableHistory.value = []
  showFollowModal.value = true
  isLoadingFollow.value = true

  try {
    const fresh = await comercialService.leadGet({ id: lead.id })
    const rawDetails = fresh?.contact_attempts || []
    console.log(rawDetails)
    editableHistory.value = [...rawDetails]
      .sort((a, b) => b.attempt_number - a.attempt_number)
      .map(d => {
        if (!d) return null

        const originAlias = d.cat_creation_origin || 'we_origin_manual'
        const originObj = attemptOriginCatalog.value.find(o => o.alias === originAlias)
        
        return {
          id: d.lead_contact_attempt_id,
          attempt_number: d.attempt_number ?? null,
          calling_alias: d.cat_result_alias,
          contact_datetime: d.contact_datetime
            ? String(d.contact_datetime).replace('T', ' ').slice(0, 16)
            : '',
          response: d.response || '',
          cat_type_attempt: d.cat_type_attempt_alias, // alias
          cat_type_attempt_label: d.cat_type_attempt_label,
          contact_duration: d.contact_duration || 0,
          timerActive: false,
          timerId: null,
          user_registration_label: d.user_registration_label || '—',
          registration_date_fmt: d.registration_date
            ? String(d.registration_date).replace('T', ' ').slice(0, 16)
            : '—',
          user_modification_label: d.user_modification_label || null,
          modification_date_fmt: d.modification_date
            ? String(d.modification_date).replace('T', ' ').slice(0, 16)
            : null,
          cat_creation_origin_alias: originAlias,
          cat_creation_origin_label: originObj ? originObj.description : 'Gestión Manual'
        }
      })
      .filter(item => item !== null)

  } catch (error) {
    console.error(error)
    editableHistory.value = []
    toast.error('Error al cargar el historial de seguimiento')
  } finally {
    isLoadingFollow.value = false
  }
}

// --- 3. MODIFICAR NUEVO INTENTO (addLocalAttempt) ---
const getFileIcon = (type) => {
  if (!type) return 'fa-file text-secondary'
  const t = type.toLowerCase()

  // ❌ ANTES: source no existe aquí, lanza ReferenceError
  // if (t.includes('payment_receipt') || source === 'payment_receipt')

  // ✅ CORRECTO: solo chequear el type
  if (t.includes('payment_receipt')) return 'fa-file-invoice-dollar text-primary'
  if (t.includes('pdf'))             return 'fa-file-pdf text-danger'
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg'))
                                     return 'fa-file-image text-success'
  if (t.includes('legacy'))          return 'fa-file-contract text-warning'
  if (t.includes('xml'))             return 'fa-file-code text-info'
  if (t.includes('zip') || t.includes('rar')) return 'fa-file-zipper text-dark'

  return 'fa-file-lines text-primary'
}
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
    // 1. Asegurar carga de asesores (esto sí se mantiene para la lista de usuarios)
    if (filtroOwners.value.length === 0) {
      await loadOwners();
    }

    // 2. Traer restricciones desde BD (Ahora ya vienen con LABEL)
    const savedRestrictions = await comercialService.restrictionsList({
      user_id: currentUserId,
      is_comercial: isComercial
    });

    // 3. Función local SIMPLIFICADA (sin hidratación)
    const buildAsesorRecord = (userId, userName, bdRest = {}) => {
      // Como el BD ya devuelve [{value:1, label:'Web'}], lo pasamos directo.
      // Si viene null o undefined, pasamos array vacío.
      return {
        user_id: userId,
        name: userName,
        type_program_ids: bdRest.type_program_ids || [],
        model_modality_ids: bdRest.model_modality_ids || [],
        program_ids: bdRest.program_ids || [],
        status_lead_ids: bdRest.status_lead_ids || [],
        last_follow_ids: bdRest.last_follow_ids || [],
        interest_level_ids: bdRest.interest_level_ids || [],
        channel_ids: bdRest.channel_ids || [],
        strategy_ids: bdRest.strategy_ids || [],
        moment_ids: bdRest.moment_ids || []
      };
    };

    // 4. Asignación según rol (Lógica idéntica, pero más datos limpios)
    if (isComercial) {
      const bdRest = savedRestrictions[0] || {};
      const myName = storedUser?.first_name
        ? `${storedUser.first_name} ${storedUser.last_name || ''}`
        : `Mi Usuario (${currentUserId})`;

      asesoresControl.value = [buildAsesorRecord(currentUserId, myName, bdRest)];

    } else {
      asesoresControl.value = filtroOwners.value.map(owner => {
        const bdRest = savedRestrictions.find(r => r.user_id === owner.id) || {};
        return buildAsesorRecord(owner.id, owner.description, bdRest);
      });
    }

    // ¡ADIÓS AL SETTIMEOUT Y REHIDRATACIÓN! :)

  } catch (error) {
    console.error("Error cargando permisos:", error);
    toast.error("Hubo un error al cargar el panel de permisos.");
  }
}

// === 2. GUARDAR DATA ===
async function saveControlRestrictions() {
  isSavingRestrictions.value = true;

  try {
    const payloadMasivo = asesoresControl.value.map(asesor => ({
      user_id: asesor.user_id,
      is_active: true,
      // La función extractIds ya manejaba {value, label} -> value, así que esto funciona perfecto
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

  editableHistory.value.forEach(item => {
    if (item.timerActive) toggleTimer(item)
  })

  isSavingFollow.value = true

  try {
    const attemptsPayload = editableHistory.value.map(item => ({
      id: item.id,
      cat_result: getIdFromAlias(item.calling_alias, filtroCalling.value),
      cat_type_attempt: getIdFromAlias(item.cat_type_attempt, lAttempts.value),
      contact_datetime: item.contact_datetime,
      response: item.response,
      contact_duration: item.contact_duration,
  cat_reschedule_origin: item.cat_reschedule_origin || null
    }))

    const resp = await comercialService.leadUpdate({
      id: selectedFollowLead.value.id,
      lead: {},
      contact_attempts: attemptsPayload
    })

    // ← REEMPLAZAR el toast.success simple por esto:
    if (resp.result === 1) {
      toast.success(resp.message || 'Seguimiento actualizado correctamente')
      showFollowModal.value = false
      fetchLeads()
    } else if (resp.result === 0) {
      toast.error(resp.message || 'Error inesperado al guardar')
    } else {
      // result 2 u otros → advertencia amarilla
      toast.warning(resp.message || 'No se pudo guardar el seguimiento')
    }

  } catch (error) {
    console.error(error)
    toast.error('Error al guardar el seguimiento')
  } finally {
    isSavingFollow.value = false
  }
}

const minDateForNewAttempt = computed(() => {
  const existing = editableHistory.value.filter(a => a.id) // solo los ya guardados
  if (!existing.length) return null
  // Tomar la fecha más reciente entre los existentes
  const dates = existing.map(a => new Date(a.contact_datetime)).filter(d => !isNaN(d))
  if (!dates.length) return null
  return new Date(Math.max(...dates))
})

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
if (filters.order_by === 1) chips.push({ key: 'order_by', text: 'Orden: Inicio Edición' })
  if (filters.order_by === 2) chips.push({ key: 'order_by', text: 'Orden: Fecha Pago' })
  if (filters.rangoFechas?.start)
    chips.push({ key: 'rangoFechas', label: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}` })
  if (filters.pay_date_from)
    chips.push({ key: 'pay_date', label: `Pago: ${filters.pay_date_from} → ${filters.pay_date_to}` })
  if (filters.edition_start_from)
    chips.push({ key: 'edition_start', label: `Edición: ${filters.edition_start_from} → ${filters.edition_start_to}` })

  // MultiSelects (instantáneo, sin buscar en catálogos)
  makeChip('status_lead_ids',    'Estatus',    filters.status_lead_ids)
  makeChip('last_follow_ids',    'Seguim.',    filters.last_follow_ids)
  makeChip('attempt_origin_ids', 'O. Intento', filters.attempt_origin_ids)
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
  makeChip('fico_status_ids',          'FICO',           filters.fico_status_ids)
  makeChip('profile_ids',              'Perfil',         filters.profile_ids)
  makeChip('currency_ids',             'Moneda',         filters.currency_ids)
  makeChip('inscription_modality_ids', 'Mod. Insc.',     filters.inscription_modality_ids)
  makeChip('installment_status_ids',   'Est. Cuota',     filters.installment_status_ids)
  makeChip('payment_method_ids',       'Método Pago',    filters.payment_method_ids)
  makeChip('settlement_status_ids',    'Conciliación',   filters.settlement_status_ids)
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
  order_by: filters.order_by ?? 0,

      from_date:           filters.rangoFechas?.start        || null,
      to_date:             filters.rangoFechas?.end          || null,
      updated_from:        filters.rangoModificacion?.start  || null,
      updated_to:          filters.rangoModificacion?.end    || null,
      pay_date_from:       filters.pay_date_from             || null,
      pay_date_to:         filters.pay_date_to               || null,
      edition_start_from:  filters.edition_start_from        || null,
      edition_start_to:    filters.edition_start_to          || null,
fico_status_ids:            getIds(filters.fico_status_ids),
      profile_ids:                getIds(filters.profile_ids),
      currency_ids:               getIds(filters.currency_ids),
      inscription_modality_ids:   getIds(filters.inscription_modality_ids),
      installment_status_ids:     getIds(filters.installment_status_ids),
      payment_method_ids:         getIds(filters.payment_method_ids),
      settlement_status_ids:      getIds(filters.settlement_status_ids),
      owner_user_ids:      getIds(filters.owner_user_ids),
      status_lead_ids:     getIds(filters.status_lead_ids),
      last_follow_ids:     getIds(filters.last_follow_ids),
      interest_level_ids:  getIds(filters.interest_level_ids),
      channel_ids:         getIds(filters.channel_ids),
      query_ids:           getIds(filters.query_ids),
      type_program_ids:    getIds(filters.type_program_ids),
      attempt_origin_ids: getIds(filters.attempt_origin_ids),
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

async function openEnrollmentModal(enrollmentId) {
  if (!enrollmentId) return;

  isLoadingEnrollment.value = true;
  enrollmentData.value = null;
  showEnrollmentModal.value = true;

  try {
    const response = await comercialService.enrollmentGet({ enrollment_id: enrollmentId });
    console.log("daaa")
    console.log(response)
    // ✅ El service ya devuelve el objeto plano directamente
    const data = response;

    if (!data || !data.enrollment_id) {
      toast.error("No se encontraron datos para esta matrícula");
      showEnrollmentModal.value = false;
      return;
    }

    data.files_list = (data.files_list || []).filter(f => f !== null);
    enrollmentData.value = data;

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
    owner_user_ids: [], status_lead_ids: [], last_follow_ids: [],order_by: 0,
    interest_level_ids: [], channel_ids: [], query_ids: [],
    type_program_ids: [], model_modality_ids: [], strategy_ids: [],
    word_ids: [], medium_contact_ids: [], code_country_ids: [], moment_ids: [],
    rangoFechas: { start: '', end: '' }, rangoModificacion: { start: '', end: '' },
    created_range_string: null, updated_range_string: null,ttempt_origin_ids: [],
    edition_range_string: null, edition_start_from: '', edition_start_to: '',
    pay_date_from: '', pay_date_to: '', pay_date_range_string: null,fico_status_ids: [], profile_ids: [], currency_ids: [],
    inscription_modality_ids: [], installment_status_ids: [],
    payment_method_ids: [], settlement_status_ids: []
  })

  if (isComercial && currentUserId) filters.owner_user_ids = [currentUserId]

if (reload === true || typeof reload !== 'boolean') {
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
  } else if (key === 'order_by') {     // <--- AQUÍ ES DONDE VA ESTE IF
    filters.order_by = 0
  }else if (key === 'edition_start') {
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
// Helpers visuales actualizados
function rowClassForStatus(s) {
  const map = {
    'we_lead_status_interesado': 'row-blue',
    'we_lead_status_bought': 'row-inscrito',
    'we_lead_status_will_pay': 'row-emerald',
    'we_lead_status_proximo': 'row-yellow',
    'we_lead_status_indiferente': 'row-gray',
    'we_lead_status_closed': 'row-red',
    'we_lead_status_desestimado': 'row-red'
  };
  return map[s] || ''
}

function badgeForInterest(s) {
  const map = {
    'we_lead_interest_high': 'pill-red',
    'we_lead_interest_medium': 'pill-amber',
    'we_lead_interest_low': 'pill-slate'
  };
  return map[s] || 'pill-slate'
}

function badgeForFollow(s) {
  const map = {
    'we_calling_pending': 'pill-slate',
    'we_calling_answered': 'pill-teal',
    'we_calling_no_answer': 'pill-red'
  };
  return map[s] || 'pill-slate'
}
function addLocalAttempt() {
  const now = new Date();
  const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

  editableHistory.value.unshift({
    id: null,
    attempt_number: null,          // ← sin número hasta guardar
    status_alias: 'we_calling_pending',
    calling_alias: 'we_calling_pending',  // ← Pendiente por defecto
    contact_datetime: isoString,
    cat_type_attempt: 'we_attempt_call',
    response: '',
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

// ══ FILTROS INLINE EN CABECERA ═══════════════════════════════
let inlineFilterTimer = null

function triggerInlineFilter() {
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchLeads()
}

function debouncedInlineFilter() {
  clearTimeout(inlineFilterTimer)
  inlineFilterTimer = setTimeout(() => triggerInlineFilter(), 400)
}
// ═════════════════════════════════════════════════════════════

const toolbarCollapsed = ref(false)
</script>

<style scoped>
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--text-primary, #0f172a);
}

.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
  position: sticky;
  top: 0;
  z-index: 100;
}
.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 28px;
}
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--slate-400, #94a3b8);
  font-weight: 500;
  display: block;
  margin-bottom: 3px;
}
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }

.exec-body { flex: 1; padding: 20px 28px; }

.exec-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-exec {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.15s;
  white-space: nowrap;
  text-decoration: none;
}
.btn-exec:disabled { opacity: .5; cursor: default; }

.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }

.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }

.btn-exec-active { background: #fff; color: var(--navy-900, #0f172a); border-color: #fff; }

.btn-exec-danger { background: rgba(220,38,38,.15); color: #fca5a5; border-color: rgba(220,38,38,.3); }

.btn-exec-warning { background: #f59e0b; color: var(--navy-900, #0f172a); border-color: #f59e0b; }
.btn-exec-warning:hover:not(:disabled) { background: #d97706; }

.btn-exec-success { background: #15803d; color: #fff; border-color: #15803d; }
.btn-exec-success:hover:not(:disabled) { background: #166534; }

.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }

.table-shell {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.table-responsive-custom { width: 100%; overflow-x: auto; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts {
  padding: 10px 14px;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  border-bottom: 2px solid var(--border, #e2e8f0);
  text-align: left;
  background: #fafbfc;
  color: var(--text-secondary, #475569);
  white-space: nowrap;
}
.thead-sub .ts.text-center { text-align: center; }

.thead-group .th-cat {
  background: var(--navy-900, #0f172a);
  color: var(--slate-300, #cbd5e1);
  padding: 10px 14px;
  border-right: 2px solid #334155;
  font-size: 11px;
  letter-spacing: .05em;
  text-transform: uppercase;
  font-weight: 700;
}
.th-group {
  padding: 8px 10px;
  font-size: 10.5px;
  letter-spacing: .1em;
  text-transform: uppercase;
  font-weight: 700;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 2px solid #bbf7d0; }
.ts-a { background: #f8fbff; color: #3b82f6; border-left: 1px solid #dbeafe; padding: 8px 12px; }
.ts-b { background: #f7fdf9; color: #16a34a; border-left: 1px solid #d1fae5; padding: 8px 12px; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--slate-50, #f8fafc);
  vertical-align: middle;
  color: var(--text-primary, #0f172a);
}
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.row-inscrito  { border-left: 3px solid #10b981; } .row-inscrito > td  { background: #f0fdf4; }
.row-blue      { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald   { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow    { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }
.row-gray      { border-left: 3px solid #94a3b8; } .row-gray > td      { background: var(--slate-50, #f8fafc); color: var(--text-secondary, #475569); }
.row-red       { border-left: 3px solid #ef4444; } .row-red > td       { background: #fef2f2; }
.row-highlight > td { background: #eff6ff !important; }

.tbody-row::after {
  content: "";
  position: absolute;
  left: 0; bottom: 0; top: 0;
  height: 100%; width: 0%;
  background: rgba(20,184,166,.13);
  transition: width .3s ease-out;
  pointer-events: none;
  z-index: 5;
}
.row-pressing::after { width: 100%; transition: width 1s linear; }

.td-a { border-left: 1px solid transparent; }
.td-b { border-left: 1px solid transparent; }
.td-cat {
  padding-left: 14px;
  border-right: 2px solid #1e293b;
  background: var(--navy-900, #0f172a) !important;
  color: #fff !important;
}

.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.c-green { color: #15803d; } .c-red { color: #dc2626; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }
.pay-date-cell { color: #15803d; }

.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .03em;
}
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }
.pill-red    { background: #fee2e2; color: #b91c1c; border-color: #fecaca !important; }

.btn-icon {
  background: transparent;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--text-secondary, #475569);
  transition: all .15s;
  font-size: 12px;
  vertical-align: middle;
}
.btn-icon:hover:not(:disabled) { background: var(--slate-100, #f1f5f9); color: var(--text-primary, #0f172a); border-color: var(--slate-300, #cbd5e1); }
.btn-icon:disabled { opacity: .4; cursor: default; }

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--slate-400, #94a3b8);
  font-size: 13px;
  font-weight: 500;
}
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }
.empty-state p { margin: 0; }

.compact-table { font-size: 11px; }
.compact-table .ts { padding: 6px 10px; font-size: 10px; }
.compact-table td { padding: 6px 10px; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.compact-table .pill { padding: 2px 6px; font-size: 9.5px; }

.exec-fieldset {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 16px 20px;
}
.fieldset-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-secondary, #475569);
  font-weight: 700;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
  padding-bottom: 6px;
}
.exec-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  text-transform: uppercase;
  letter-spacing: .05em;
  display: block;
  margin-bottom: 4px;
}

.exec-input-light,
.exec-select-light {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  transition: border-color .15s;
  height: 36px;
  display: block;
}
.exec-input-light:focus,
.exec-select-light:focus {
  outline: none;
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.1);
}
.exec-textarea {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 7px 10px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  transition: border-color .15s;
  resize: vertical;
  min-height: 64px;
  display: block;
}
.exec-textarea:focus {
  outline: none;
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.1);
}
.exec-textarea:disabled,
.exec-input-light:disabled,
.exec-select-light:disabled {
  background: var(--slate-50, #f8fafc);
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

.exec-modal-body { display: flex; flex-direction: column; }

.modal-lead-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.lead-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #f0f9ff; color: #2563eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  border: 1px solid #e0f2fe;
  flex-shrink: 0;
}

.timer-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: .65rem; transition: all .15s;
}
.timer-btn--start { background: #d1fae5; color: #059669; }
.timer-btn--start:hover { background: #a7f3d0; }
.timer-btn--stop  { background: #fee2e2; color: #dc2626; }
.timer-btn--stop:hover  { background: #fecaca; }
.timer-btn:disabled { opacity: .45; cursor: default; }
.timer-display {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary, #475569);
}
.timer-display--active { color: #dc2626; }

.exec-alert {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 12.5px;
  border-left: 4px solid;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.5;
}
.alert-info    { background: #f0f9ff; color: #0369a1; border-color: #3b82f6; }
.alert-warning { background: #fffbeb; color: #92400e; border-color: #f59e0b; }
.alert-success { background: #f0fdf4; color: #166534; border-color: #22c55e; }

.exec-alert-banner {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  gap: 20px;
  border: 1px solid;
}
.banner-danger  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.banner-success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.banner-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.banner-text  { font-size: 12.5px; color: var(--text-primary, #0f172a); margin: 0; line-height: 1.5; }

.control-table-wrapper {
  max-height: 62vh;
  overflow: auto;
}
.control-table-wrapper .sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  box-shadow: 2px 0 5px -2px rgba(0,0,0,.12);
}
.control-table-wrapper tbody .sticky-col {
  background: #fff;
}
.control-table-wrapper thead .sticky-col {
  z-index: 3;
  background: var(--navy-900, #0f172a);
}
.minW-200 { min-width: 220px; }
.minW-300 { min-width: 320px; }

.enrollment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
}
.enrollment-title {
  font-size: 14px;
  font-weight: 700;
  color: #0d9488;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.enrollment-sub { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; font-weight: 500; }

.info-block { display: flex; flex-direction: column; gap: 2px; }
.info-value { font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); }

.finance-card {
  background: var(--slate-50, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 14px;
}

.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  transition: border-color .15s;
}
.file-item:hover { border-color: #0d9488; }
.file-icon {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: var(--slate-50, #f8fafc);
  border-radius: 4px;
  flex-shrink: 0;
}

.exec-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
}
.loader-ring {
  width: 32px; height: 32px;
  border: 3px solid var(--border, #e2e8f0);
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.scroll-area {
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--slate-300, #cbd5e1) transparent;
}
.scroll-area::-webkit-scrollbar { width: 5px; }
.scroll-area::-webkit-scrollbar-thumb { background: var(--slate-200, #e2e8f0); border-radius: 4px; }

.pulse-alert { animation: pulseRed 2s infinite; }
@keyframes pulseRed {
  0%   { box-shadow: 0 0 0 0 rgba(220,38,38,.4); }
  70%  { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
  100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
}

.text-slate-400 { color: var(--slate-400, #94a3b8); }

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
  .exec-body { padding: 16px 12px; }
}

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf {
  padding: 5px 6px;
  background: #f0f4f8;
  border-bottom: 2px solid var(--teal-500, #14b8a6);
  vertical-align: middle;
  position: relative;
}

/* Input de texto compacto */
.hf-input {
  width: 100%;
  height: 28px;
  padding: 3px 8px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  background: #fff;
  color: var(--text-primary, #0f172a);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.hf-input:focus {
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 2px rgba(20, 184, 166, .15);
}
.hf-input::placeholder {
  color: var(--slate-400, #94a3b8);
  font-size: 10.5px;
}

/* MultiSelect compacto — override al componente */
.hf-multiselect {
  --ms-font-size: 11px;
  --ms-line-height: 1.3;
  --ms-min-height: 28px;
  --ms-py: 2px;
  --ms-px: 6px;
  --ms-tag-py: 1px;
  --ms-tag-px: 4px;
  --ms-tag-font-size: 9.5px;
  --ms-border-color: var(--border, #e2e8f0);
  --ms-border-color-active: var(--teal-500, #14b8a6);
  --ms-ring-color: rgba(20, 184, 166, .15);
  font-size: 11px;
}

/* Botón limpiar en columna acciones */
.hf-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: 1px solid #fecaca;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  font-size: 11px;
  transition: all .15s;
}
.hf-clear-btn:hover {
  background: #fee2e2;
  border-color: #f87171;
}

/* Flatpickr dentro de cabecera (BaseDatePicker) */
.thead-filter .flatpickr-input {
  height: 28px !important;
  font-size: 10.5px !important;
  padding: 3px 7px !important;
}

/* Separación visual entre thead-sub y thead-filter */
.thead-sub .ts {
  border-bottom: 1px solid var(--border, #e2e8f0);
}
/* ═════════════════════════════════════════════════════════════ */

/* ══ FOCUS MODE TOGGLE ════════════════════════════════════════ */

/* Botón en el masthead */
.focus-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.07);
  color: var(--slate-300, #cbd5e1);
  transition: all 0.15s;
  white-space: nowrap;
}
.focus-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}

/* Cuando el toolbar está colapsado, el masthead da feedback visual */
.exec-masthead:has(+ .exec-body .exec-toolbar[style*="display: none"]) .focus-toggle-btn,
.exec-masthead .focus-toggle-btn.is-active {
  background: var(--teal-500, #14b8a6);
  color: #fff;
  border-color: var(--teal-500, #14b8a6);
}

/* Animación suave al ocultar/mostrar el toolbar */
.exec-toolbar,
.toolbar-chips {
  transition: opacity 0.2s ease;
}

/* ══ CELDA ACCIONES EN FILTROS INLINE ════════════════════════ */
.tf-actions-cell {
  text-align: center;
}

.hf-actions-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Botón Nuevo Lead compacto (verde) */
.hf-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
  background: #f0fdf4;
  color: #15803d;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.15s;
}
.hf-new-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

/* Botón limpiar (ya definido antes, se mantiene igual) */
.hf-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: 1px solid #fecaca;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s;
}
.hf-clear-btn:hover {
  background: #fee2e2;
  border-color: #f87171;
}
/* ═════════════════════════════════════════════════════════════ */
/* ══ MASTHEAD COMPACT ═════════════════════════════════════════ */

/* Reducir altura del header en focus mode */
.masthead--compact .masthead-inner {
  padding: 6px 28px;        /* era 12px — se achica verticalmente */
}

/* La regla de color se hace más delgada */
.brand-rule--sm {
  height: 24px !important;  /* era 42px */
  width: 3px  !important;   /* era 4px */
}

/* Eyebrow desaparece (ya con v-show),
   el título se hace más pequeño */
.masthead--compact .brand-title {
  font-size: 14px;           /* era 19px */
  letter-spacing: .01em;
}

/* "CRM" inline antes del título en modo compacto */
.brand-eyebrow--inline {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--teal-500, #14b8a6);
  margin-right: 6px;
  vertical-align: middle;
}

/* El botón también se achica cuando está activo */
.focus-toggle-btn--active {
  background: var(--teal-500, #14b8a6) !important;
  color: #fff !important;
  border-color: var(--teal-500, #14b8a6) !important;
  padding: 5px 10px;
  font-size: 11px;
}

/* Transición suave en todo el masthead */
.exec-masthead {
  transition: padding .2s ease;
}
.exec-masthead .masthead-inner {
  transition: padding .2s ease;
}
.brand-rule {
  transition: height .2s ease, width .2s ease;
}
.brand-title {
  transition: font-size .2s ease;
}
/* ═════════════════════════════════════════════════════════════ */
</style>
