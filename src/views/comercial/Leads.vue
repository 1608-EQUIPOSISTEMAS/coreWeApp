<template>
  <div class="leads-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">COMERCIAL</span>
        <h1 class="ep-title">Listado de Leads</h1>
        <span class="ep-subtitle">Gestión de leads y oportunidades</span>
      </div>
      <div class="ep-masthead-actions">
        <div class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': !isCompact }]" @click="isCompact = false">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': isCompact }]" @click="isCompact = true">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
        </div>
        <button
          class="ep-btn-control"
          :class="hasActiveRestrictions ? 'ep-btn-danger' : ''"
          @click="openControlModal"
          :title="isComercial ? 'Mis Permisos de Visualización' : 'Control de Asesores'"
        >
          <i class="fa-solid" :class="isComercial ? 'fa-user-lock' : 'fa-shield-halved'"></i>
          <span>{{ isComercial ? 'Mis Permisos' : 'Control' }}</span>
        </button>
        <button class="ep-btn-new" @click="goNew" v-if="!hasActiveRestrictions">
          <i class="fa-solid fa-plus"></i> Nuevo Lead
        </button>
      </div>
    </header>
    <main class="ep-body">

      <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': activeFilterChips.length > 0 }">
        <div class="ep-filter-bar-main">
          <div class="ep-toolbar">
            <BasePagination
              v-model="pagin"
              @open-filters="openFilterModal"
              @change="handlePaginationChange"
            />
          </div>
        </div>
        <div v-if="activeFilterChips.length > 0" class="ep-filter-strip">
          <span class="ep-filter-strip-badge">
            <i class="fa-solid fa-circle-half-stroke"></i>
            Filtros activos
            <span class="ep-filter-strip-count">{{ activeFilterChips.length }}</span>
          </span>
          <BaseFilterChips
            :items="activeFilterChips"
            @remove="clearFilter"
            @clear-all="clearFilters"
          />
        </div>
      </section>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table" :class="{ 'compact-table': isCompact }">
            <thead>
<tr v-if="!isCompact" class="thead-sub">
  <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
  <th class="ts ts-c">Status</th>
  <th class="ts ts-c">Contacto</th>
  <th class="ts ts-c">Situación</th>
  <th class="ts ts-c" style="min-width: 160px!important;">T. Consulta</th>
  <th class="ts ts-c">Programa / Interés</th>
  <th class="ts ts-c">Ini. Edición</th>
  <th class="ts ts-c">F. Pago</th>
  <th class="ts ts-c">Nivel Interés</th>
  <th class="ts ts-c">Registro</th>
  <th class="ts ts-c">Canal Pago</th>
  <th class="ts ts-c text-center">Seguimiento</th>
</tr>
<tr v-if="!isCompact" class="thead-filter">
  <th class="tf tf-actions-cell">
    <div class="hf-actions-group">
      <button v-if="activeFilterChips.length" class="hf-clear-btn" @click="clearFilters" title="Limpiar filtros">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <input v-model="filters.q" type="text" class="hf-input" placeholder="Nombre, teléfono..." @input="debouncedInlineFilter" @keyup.enter="triggerInlineFilter" />
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.prospect_situation_ids" :items="withNull(filtroProspectSituation)" label-key="variable_1" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Programa..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="Desde → Hasta" @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'edition_start'); triggerInlineFilter() }" />
  </th>
  <th class="tf">
    <BaseDatePicker v-model="filters.pay_date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="Desde → Hasta" @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'pay_date'); triggerInlineFilter() }" />
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <MultiSelect v-if="!isComercial" v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
    <span v-else class="text-muted" style="font-size:10px;">—</span>
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Canal pago..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th class="tf">
    <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
</tr>

<!-- ══ COMPACT: FILA DE GRUPOS COLAPSABLES ═══════════════════════════ -->
<tr v-if="isCompact" class="thead-colgroup">
  <!-- Acciones: fija, sin grupo -->
  <th class="tg-fixed"></th>

  <!-- D. PROGRAMA -->
  <th
    :colspan="colGroups.programa ? 6 : 1"
    class="tg-header tg-programa"
    :class="{ 'tg-collapsed': !colGroups.programa }"
    @click="colGroups.programa = !colGroups.programa"
    :title="colGroups.programa ? 'Colapsar D. PROGRAMA' : 'Expandir D. PROGRAMA'"
  >
    <div class="tg-label">
      <i class="fa-solid fa-film tg-icon"></i>
      <span class="tg-text">D. PROGRAMA</span>
      <i class="fa-solid tg-chevron" :class="colGroups.programa ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
    </div>
  </th>

  <!-- D. CLIENTE -->
  <th
    :colspan="colGroups.cliente ? 5 : 1"
    class="tg-header tg-cliente"
    :class="{ 'tg-collapsed': !colGroups.cliente }"
    @click="colGroups.cliente = !colGroups.cliente"
    :title="colGroups.cliente ? 'Colapsar D. CLIENTE' : 'Expandir D. CLIENTE'"
  >
    <div class="tg-label">
      <i class="fa-solid fa-user tg-icon"></i>
      <span class="tg-text">D. CLIENTE</span>
      <i class="fa-solid tg-chevron" :class="colGroups.cliente ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
    </div>
  </th>

  <!-- D. LEAD -->
  <th
    :colspan="colGroups.lead ? 7 : 1"
    class="tg-header tg-lead"
    :class="{ 'tg-collapsed': !colGroups.lead }"
    @click="colGroups.lead = !colGroups.lead"
    :title="colGroups.lead ? 'Colapsar D. LEAD' : 'Expandir D. LEAD'"
  >
    <div class="tg-label">
      <i class="fa-solid fa-chart-line tg-icon"></i>
      <span class="tg-text">D. LEAD</span>
      <i class="fa-solid tg-chevron" :class="colGroups.lead ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
    </div>
  </th>

<th
  :colspan="colGroups.asesor ? 4 : 1"
  class="tg-header tg-asesor"
  :class="{ 'tg-collapsed': !colGroups.asesor }"
  @click="colGroups.asesor = !colGroups.asesor"
  :title="colGroups.asesor ? 'Colapsar D. ASESOR' : 'Expandir D. ASESOR'"
>
  <div class="tg-label">
    <i class="fa-solid fa-user-tie tg-icon"></i>
    <span class="tg-text">D. ASESOR</span>
    <i class="fa-solid tg-chevron" :class="colGroups.asesor ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
  </div>
</th>
</tr>

<!-- ══ COMPACT: FILA DE CABECERAS CON v-show ════════════════════════ -->
<tr v-if="isCompact" class="thead-sub">
  <th class="ts ts-c text-center">Acciones</th>

  <!-- D. PROGRAMA -->
  <th v-show="colGroups.programa" class="ts ts-c">F. Contacto</th>
  <th v-show="colGroups.programa" class="ts ts-c">Categoría</th>
  <th v-show="colGroups.programa" class="ts ts-c">Modalidad</th>
  <th v-show="colGroups.programa" class="ts ts-c">Programa</th>
  <th v-show="colGroups.programa" class="ts ts-c">Edición</th>
  <th v-show="colGroups.programa" class="ts ts-c" style="min-width: 140px!important;">T. Consulta</th>
  <th v-if="!colGroups.programa" class="ts ts-c tg-placeholder-cell"></th>

  <!-- D. CLIENTE -->
  <th v-show="colGroups.cliente" class="ts ts-c">Nombre</th>
  <th v-show="colGroups.cliente" class="ts ts-c">Teléfono</th>
  <th v-show="colGroups.cliente" class="ts ts-c">Situación</th>
  <th v-show="colGroups.cliente" class="ts ts-c">E. Cliente</th>
  <th v-show="colGroups.cliente" class="ts ts-c">Member</th>
  <th v-if="!colGroups.cliente" class="ts ts-c tg-placeholder-cell"></th>
  <!-- D. LEAD (7 cols) -->
  <th v-show="colGroups.lead" class="ts ts-c">Status</th>
  <th v-show="colGroups.lead" class="ts ts-c">F. Pago</th>
  <th v-show="colGroups.lead" class="ts ts-c">Interés</th>
  <th v-show="colGroups.lead" class="ts ts-c">Canal origen</th>
  <th v-show="colGroups.lead" class="ts ts-c">Medio</th>
  <th v-show="colGroups.lead" class="ts ts-c">Palabra MKT</th>
  <th v-show="colGroups.lead" class="ts ts-c">Estrategia</th>
  <th v-if="!colGroups.lead" class="ts ts-c tg-placeholder-cell"></th>

  <!-- D. ASESOR (4 cols) -->
  <th v-show="colGroups.asesor" class="ts ts-c">Asesor/Usuario</th>
  <th v-show="colGroups.asesor" class="ts ts-c">F. Registro</th>
  <th v-show="colGroups.asesor" class="ts ts-c">Canal Pago</th>
  <th v-show="colGroups.asesor" class="ts ts-c text-center">Seguimiento</th>
  <th v-if="!colGroups.asesor" class="ts ts-c tg-placeholder-cell"></th>
</tr>

<!-- ══ COMPACT: FILA DE FILTROS ══════════════════════════════════════ -->
<tr v-if="isCompact" class="thead-filter">
  <th class="tf tf-actions-cell">
    <div class="hf-actions-group">
      <button v-if="activeFilterChips.length" class="hf-clear-btn" @click="clearFilters" title="Limpiar filtros">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </th>

  <!-- D. PROGRAMA filtros -->
  <th v-show="colGroups.programa" class="tf">
    <BaseDatePicker v-model="filters.first_contact_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="F. Contacto..." @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'first_contact'); triggerInlineFilter() }" />
  </th>
  <th v-show="colGroups.programa" class="tf">
    <MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Tipo..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.programa" class="tf">
    <MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Mod..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.programa" class="tf">
    <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Programa..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.programa" class="tf">
    <BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="Edición..." @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'edition_start'); triggerInlineFilter() }" />
  </th>
  <th v-show="colGroups.programa" class="tf">
    <MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-if="!colGroups.programa" class="tf tg-placeholder-cell"></th>

  <!-- D. CLIENTE filtros -->
  <th v-show="colGroups.cliente" class="tf"></th><!-- Nombre -->
  <th v-show="colGroups.cliente" class="tf">
    <input v-model="filters.q" type="text" class="hf-input" placeholder="Tel / Nombre..." @input="debouncedInlineFilter" />
  </th>
  <th v-show="colGroups.cliente" class="tf">
    <MultiSelect v-model="filters.prospect_situation_ids" :items="withNull(filtroProspectSituation)" label-key="variable_1" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.cliente" class="tf">
    <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Etapa..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.cliente" class="tf">
    <MultiSelect v-model="filters.membership_moment_ids" :items="membershipList" label-key="tier_name" value-key="membership_tier_id" placeholder="Etapa..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-if="!colGroups.cliente" class="tf tg-placeholder-cell"></th>

   <!-- D. LEAD filtros (7 cols) -->
  <th v-show="colGroups.lead" class="tf">
    <MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Status..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.lead" class="tf">
    <BaseDatePicker v-model="filters.pay_date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="Pago..." @on-change="(d,s) => { handleDateFilterChange(s,'pay_date'); triggerInlineFilter() }" />
  </th>
  <th v-show="colGroups.lead" class="tf">
    <MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Interés..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.lead" class="tf">
    <MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Canal..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.lead" class="tf">
    <MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="Medio..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.lead" class="tf"></th><!-- Palabra MKT -->
  <th v-show="colGroups.lead" class="tf">
    <MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Estrategia..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-if="!colGroups.lead" class="tf tg-placeholder-cell"></th>

  <!-- D. ASESOR filtros (4 cols) -->
  <th v-show="colGroups.asesor" class="tf">
    <MultiSelect v-if="!isComercial" v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Asesor..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.asesor" class="tf">
    <BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input" placeholder="F. Registro..." @on-change="(dates, dateStr) => { handleDateFilterChange(dateStr, 'created'); triggerInlineFilter() }" />
  </th>
  <th v-show="colGroups.asesor" class="tf">
    <MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Canal pago..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-show="colGroups.asesor" class="tf">
    <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Seguim..." class="hf-multiselect" @update:model-value="triggerInlineFilter" />
  </th>
  <th v-if="!colGroups.asesor" class="tf tg-placeholder-cell"></th>
</tr>
            </thead>

            <tbody v-if="!isCompact">
              <template v-if="isTableLoading">
                <tr v-for="n in 10" :key="'sk-'+n" class="skeleton-row">
                  <td><div class="sk-cell" style="width:52px"></div></td>
                  <td><div class="sk-cell" style="width:70px"></div></td>
                  <td><div class="sk-cell" style="width:120px"></div><div class="sk-cell mt-1" style="width:80px;height:8px"></div></td>
                  <td><div class="sk-cell" style="width:80px"></div></td>
                  <td><div class="sk-cell" style="width:60px"></div></td>
                  <td><div class="sk-cell" style="width:180px"></div><div class="sk-cell mt-1" style="width:100px;height:8px"></div></td>
                  <td><div class="sk-cell" style="width:70px"></div></td>
                  <td><div class="sk-cell" style="width:60px"></div></td>
                  <td><div class="sk-cell" style="width:55px"></div></td>
                  <td><div class="sk-cell" style="width:90px"></div></td>
                  <td><div class="sk-cell" style="width:70px"></div></td>
                  <td><div class="sk-cell" style="width:80px;margin:0 auto"></div></td>
                </tr>
              </template>
              <template v-else>
              <tr
                v-for="l in leadsRaw"
                :key="l.id"
                class="tbody-row"
                :class="rowClassForStatus(l.cat_status_alias)"
                @click="openFollowModal(l)"
              >
                <td class="td-a text-center nowrap"> 
                    <button class="btn-icon" @click.stop="l.enrollment_id ? openEnrollmentModal(l.enrollment_id) : editLead(l, $event)" :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'">

                    <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
                  </button> 
                    <button class="btn-icon ms-1" @click.stop="viewLead(l, $event)" title="Clonar/Ver">

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
                <td class="td-a small">{{ l.cat_prospect_situation || '—' }}</td>
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
                  <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ interestMap[l.cat_interest_alias] }}</span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="td-a" style="min-width:120px">
                  <div v-if="l.user_registration_label">
                    <div class="small fw-600 text-dark">{{ l.user_registration_label }}</div>
                    <div class="text-muted x-small">{{ l.system_registration_date }}</div>
                  </div>
                </td>
                <td class="td-a small text-muted">{{ l.description || '—' }}</td>
                <td class="td-a text-center" style="min-width:140px">
                  <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                    <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                    <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75 ms-1"></i>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
              </tr>
              <tr v-if="!leadsRaw.length">
                <td colspan="12" class="empty-state">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p>No se encontraron leads con los filtros actuales.</p>
                </td>
              </tr>
              </template>
            </tbody>

<!-- ══ COMPACT TBODY ══════════════════════════════════════════════════ -->
<tbody v-else>
  <template v-if="isTableLoading">
    <tr v-for="n in 10" :key="'skc-'+n" class="skeleton-row">
      <td><div class="sk-cell" style="width:52px"></div></td>
      <td v-show="colGroups.programa" v-for="c in 6" :key="'p'+c"><div class="sk-cell"></div></td>
      <td v-if="!colGroups.programa"></td>
      <td v-show="colGroups.cliente" v-for="c in 5" :key="'cl'+c"><div class="sk-cell"></div></td>
      <td v-if="!colGroups.cliente"></td>
      <td v-show="colGroups.lead" v-for="c in 7" :key="'l'+c"><div class="sk-cell"></div></td>
      <td v-if="!colGroups.lead"></td>
      <td v-show="colGroups.asesor" v-for="c in 4" :key="'a'+c"><div class="sk-cell"></div></td>
      <td v-if="!colGroups.asesor"></td>
    </tr>
  </template>
  <template v-else>
  <tr
    v-for="l in leadsRaw"
    :key="l.id"
    class="tbody-row"
    :class="rowClassForStatus(l.cat_status_alias)"
    @click="openFollowModal(l)"
  >
    <!-- Acciones (siempre visible) -->
    <td class="td-a text-center nowrap"> 
        <button class="btn-icon" @click.stop="l.enrollment_id ? openEnrollmentModal(l.enrollment_id) : editLead(l, $event)" :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'">

        <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
      </button> 
        <button class="btn-icon ms-1" @click.stop="viewLead(l, $event)" title="Clonar/Ver">

        <i class="fa-solid fa-clone text-primary"></i>
      </button>
    </td>

    <!-- ── D. PROGRAMA ──────────────────────────────────────── -->
    <td v-show="colGroups.programa" class="td-a small nowrap">{{ l.first_contact_date || '—' }}</td>
    <td v-show="colGroups.programa" class="td-a small" style="min-width:120px">{{ l.cat_type_program_label || '—' }}</td>
    <td v-show="colGroups.programa" class="td-a small" style="min-width:120px">{{ l.cat_model_modality_label || '—' }}</td>
    <td v-show="colGroups.programa" class="td-a small fw-600 accent-text">{{ l.program_label || '—' }}</td>
    <td v-show="colGroups.programa" class="td-a nowrap small text-mono">{{ l.edition_label || '—' }}</td>
    <td v-show="colGroups.programa" class="td-a small" style="min-width:140px">{{ l.cat_promotion_description || '—' }}</td>
    <td v-if="!colGroups.programa" class="td-a tg-placeholder-cell">
  <div class="tg-collapsed-hint tg-hint-programa">
    <span class="tg-hint-line tg-hint-muted">{{ l.first_contact_date || '—' }}</span>
    <span class="tg-hint-line tg-hint-main" :title="l.program_label">{{ l.program_label || '—' }}</span>
  </div>
</td>

    <!-- ── D. CLIENTE ───────────────────────────────────────── -->
    <td v-show="colGroups.cliente" class="td-a nowrap" style="min-width:120px">{{ l.full_name_label }}</td>
    <td v-show="colGroups.cliente" class="td-a nowrap fw-700 text-dark">{{ l.origin_phone }}</td>
    <td v-show="colGroups.cliente" class="td-a small">{{ l.cat_prospect_situation || '—' }}</td>
    <td v-show="colGroups.cliente" class="td-a nowrap fw-600 text-dark">{{ l.cat_client_moment_description }}</td>
    <td v-show="colGroups.cliente" class="td-a nowrap fw-600 text-dark">{{ l.membership_moment }}</td>
    <td v-if="!colGroups.cliente" class="td-a tg-placeholder-cell">
  <div class="tg-collapsed-hint tg-hint-cliente">
    <span class="tg-hint-line tg-hint-strong">{{ l.origin_phone }}</span>
    <span class="tg-hint-line tg-hint-muted">{{ l.cat_client_moment_description || '—' }}</span>
    <span class="tg-hint-line tg-hint-muted">{{ l.membership_moment || '—' }}</span>
  </div>
</td>

    <!-- ── D. LEAD ───────────────────────────────────────────── -->
    <!-- ── D. LEAD ── -->
    <td v-show="colGroups.lead" class="td-a">
      <span class="pill pill-slate border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
    </td>
    <td v-show="colGroups.lead" class="td-a">
      <div class="small fw-700 pay-date-cell">{{ l.pay_date || '—' }}</div>
    </td>
    <td v-show="colGroups.lead" class="td-a">
      <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
      <span v-else class="text-muted small">—</span>
    </td>
    <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_channel_description || '—' }}</td>
    <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_medium_contact_description || '—' }}</td>
    <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_word_description || '—' }}</td>
    <td v-show="colGroups.lead" class="td-a small text-info fw-500">{{ l.cat_strategy_description || '—' }}</td>
    <td v-if="!colGroups.lead" class="td-a tg-placeholder-cell">
      <div class="tg-collapsed-hint tg-hint-lead">
        <span class="tg-hint-line tg-hint-main">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
        <span class="tg-hint-line tg-hint-strong pay-date-cell">{{ l.pay_date || '—' }}</span>
      </div>
    </td>

    <!-- ── D. ASESOR ── -->
    <td v-show="colGroups.asesor" class="td-a small">{{ l.user_registration_label }}</td>
    <td v-show="colGroups.asesor" class="td-a small nowrap text-muted">{{ l.system_registration_date || '—' }}</td>
    <td v-show="colGroups.asesor" class="td-a small text-muted">{{ l.description || '—' }}</td>
    <td v-show="colGroups.asesor" class="td-a text-center" style="min-width:140px">
      <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
        <span>{{ followMap[l.cat_last_follow_alias] }}</span>
        <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75 ms-1"></i>
      </div>
      <span v-else class="text-muted small">—</span>
    </td>
    <td v-if="!colGroups.asesor" class="td-a tg-placeholder-cell">
      <div class="tg-collapsed-hint tg-hint-asesor">
        <span class="tg-hint-line tg-hint-main">{{ l.user_registration_label || '—' }}</span>
        <span class="tg-hint-line tg-hint-muted">{{ l.system_registration_date || '—' }}</span>
      </div>
    </td>
  </tr>

  <tr v-if="!leadsRaw.length">
    <td colspan="20" class="empty-state">No se encontraron leads con los filtros actuales.</td>
  </tr>
  </template>
</tbody>
          </table>
        </div>
      </div>
    </main>
  </div>


  <Teleport to="body">
    <Transition name="downbar">
      <div v-if="showFollowModal" class="downbar-overlay" @click.self="showFollowModal = false">
        <div class="downbar-panel" role="dialog" aria-modal="true">
          <header class="downbar-header">
            <div class="downbar-grabber" aria-hidden="true"></div>
            <h5 class="downbar-title">Gestión de Seguimiento</h5>
            <button class="downbar-close" @click="showFollowModal = false" title="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div class="downbar-body" v-if="selectedFollowLead">
            <div class="modal-lead-strip">
              <div class="d-flex align-items-center gap-3">
                <div class="lead-avatar"><i class="fa-regular fa-user"></i></div>
                <div>
                  <h6 class="mb-0 fw-700 text-dark">{{ selectedFollowLead.full_name_label || 'Prospecto sin nombre' }}</h6>
                  <div class="d-flex gap-3 text-secondary small mt-1 fw-500 align-items-center">
                    <span><i class="fa-solid fa-phone me-1"></i>{{ selectedFollowLead.origin_phone }}</span>

                    <div class="d-flex align-items-center">
                      <i class="fa-solid fa-bullseye me-2"></i>
                      <SearchSelect
                        v-model="selectedFollowLead.cat_status_alias"
                        :items="filtroPipeline"
                        label-field="description"
                        value-field="alias"
                        placeholder="Cambiar estado..."
                        class="exec-select-light"
                        style="min-width: 160px; height: 32px;"
                      />
                    </div>
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
            <div v-else class="p-3 scroll-area">
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
                    <tr v-for="(attempt, idx) in editableHistory" :key="idx" class="tbody-row" :class="{ 'row-highlight': !attempt.id }">
                      <td class="td-a text-center fw-700 text-muted align-top pt-3">{{ attempt.attempt_number ?? '—' }}</td>
                      <td class="td-a align-top pt-2" style="min-width: 230px;">
                        <SearchSelect :items="lAttempts" v-model="attempt.cat_type_attempt" label-field="description" value-field="alias" placeholder="Seleccionar..." :disabled="attempt.id" class="exec-select-light w-100" required @update:model-value="(val) => handleTypeChange(attempt, val)" />
                        <div v-if="attempt.id" class="mt-2 text-truncate" style="font-size: 10px;">
                          <span class="pill border w-100 justify-content-center" :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'pill-slate' : 'pill-amber'" :title="attempt.cat_creation_origin_label || 'Gestión Manual'">
                            <i class="fa-solid me-1" :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'fa-user-pen' : 'fa-robot'"></i>
                            {{ attempt.cat_creation_origin_label || 'Gestión Manual' }}
                          </span>
                        </div>
                        <div v-else class="mt-2 text-truncate text-center" style="font-size: 10px;">
                          <span class="text-muted"><i class="fa-solid fa-asterisk me-1"></i>Nuevo (Manual)</span>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2" style="min-width: 230px;">
                        <SearchSelect v-if="attempt.cat_type_attempt === 'we_attempt_call'" v-model="attempt.calling_alias" :items="filteredCallingByType(attempt.cat_type_attempt)" label-field="description" value-field="alias" placeholder="Seleccionar..." :disabled="attempt.calling_alias !== 'we_calling_pending' && attempt.calling_alias" class="exec-select-light w-100" />
                        <div v-else class="d-flex align-items-center h-100 text-muted small pt-2 px-1">
                          <i class="fa-regular fa-paper-plane me-2"></i>
                          <span>Mensaje / Gestión</span>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <DateTime12 v-model="attempt.contact_datetime" :onlyHours="true" :disabled="!!attempt.id && (attempt.calling_alias !== 'we_calling_pending' || !$hasRole(['LIDER_COMERCIAL']))" :config="!attempt.id && minDateForNewAttempt ? { minDate: minDateForNewAttempt } : {}" />
                      </td>
                      <td class="td-a align-top text-center pt-2">
                        <div class="d-flex align-items-center justify-content-center gap-2" v-if="attempt.cat_type_attempt == 'we_attempt_call'">
                          <button class="timer-btn" :class="attempt.timerActive ? 'timer-btn--stop' : 'timer-btn--start'" @click="toggleTimer(attempt)" :disabled="!!attempt.id && attempt.calling_alias !== 'we_calling_pending'" :title="attempt.timerActive ? 'Detener cronómetro' : 'Iniciar cronómetro'">
                            <i class="fa-solid" :class="attempt.timerActive ? 'fa-stop' : 'fa-play'"></i>
                          </button>
                          <div class="text-mono fw-700 timer-display" :class="attempt.timerActive ? 'timer-display--active' : ''">{{ formatDuration(attempt.contact_duration) }}</div>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <textarea v-model="attempt.response" class="exec-textarea w-100" rows="2" placeholder="Escribe una observación..." :disabled="!!attempt.id && attempt.cat_type_attempt === 'we_attempt_call' && attempt.calling_alias !== 'we_calling_pending'"></textarea>
                      </td>
                      <td class="td-a align-top pt-2">
                        <div v-if="attempt.user_registration_label" class="small fw-600 text-dark">{{ attempt.user_registration_label }}</div>
                        <div class="text-muted x-small">{{ attempt.registration_date_fmt || '—' }}</div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <div v-if="attempt.user_modification_label" class="small fw-600 text-dark">{{ attempt.user_modification_label }}</div>
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

          <footer class="downbar-footer">
            <button class="btn-exec btn-exec-outline" @click="showFollowModal = false">Cancelar</button>
            <button class="btn-exec btn-exec-success" @click="saveFastFollow" :disabled="isSavingFollow">
              <i class="fa-solid fa-save me-1"></i>
              {{ isSavingFollow ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>


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
          <div class="col-md-3 col-6">
            <label class="exec-label">Situación del Prospecto</label>
            <MultiSelect v-model="filters.prospect_situation_ids" :items="withNull(filtroProspectSituation)" label-key="description" value-key="id" placeholder="Todas..." />
          </div>
          <div class="col-md-3 col-6"><label class="exec-label">Estrategia</label><MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Palabra Clave</label><MultiSelect v-model="filters.word_ids" :items="mktWordsCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6">
            <label class="exec-label mb-2">Origen Web</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch"><input type="checkbox" v-model="filters.web" true-value="Y" :false-value="null" /><span></span></label>
              <span class="x-small text-muted fw-600">{{ filters.web === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <label class="exec-label mb-2">Es B2B</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch"><input type="checkbox" v-model="filters.b2b" true-value="Y" :false-value="null" /><span></span></label>
              <span class="x-small text-muted fw-600">{{ filters.b2b === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title" style="color: var(--teal-600);">Interés Académico</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="exec-label">Programa</label>
            <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Buscar programa..." />
          </div>
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
          <div class="col-md-4">
            <label class="exec-label">F. Primer Contacto</label>
            <BaseDatePicker v-model="filters.first_contact_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'first_contact')" />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Fecha de Registro (Sistema)</label>
            <BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" />
          </div>
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
          <div class="col-md-3 col-6">
            <label class="exec-label">Canal de Pago</label>
            <MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
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
              <th colspan="8" class="th-group th-group-b text-center">GLOBAL</th>
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

<th class="ts ts-b minW-200">F. Contacto (rango)</th>
<th class="ts ts-b minW-200">Ini. Edición (rango)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asesor in asesoresControl" :key="asesor.user_id" class="tbody-row">
              <td class="td-cat sticky-col fw-700"><i class="fa-solid fa-user-tie text-slate-400 me-2"></i>{{ asesor.name }}</td>
              <td class="td-a"><MultiSelect v-model="asesor.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-a"><MultiSelect v-model="asesor.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-a"><MultiSelect v-model="asesor.program_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" labelKey="abbreviation" valueKey="program_version_id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b">
  <BaseDatePicker
    v-model="asesor.first_contact_range_string"
    :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
    class="exec-input-light w-100"
    placeholder="Desde → Hasta"
    @on-change="(dates, dateStr) => handleAsesorDateChange(asesor, dateStr, 'first_contact')"
  />
</td>
<td class="td-b">
  <BaseDatePicker
    v-model="asesor.edition_start_range_string"
    :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
    class="exec-input-light w-100"
    placeholder="Desde → Hasta"
    @on-change="(dates, dateStr) => handleAsesorDateChange(asesor, dateStr, 'edition_start')"
  />
</td>
            </tr>
            <tr v-if="asesoresControl.length === 0"><td colspan="12" class="empty-state">Cargando asesores...</td></tr>
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
            <span v-if="hasActiveRestrictions">Actualmente tu perfil tiene restricciones operativas asignadas. Solo puedes acceder a los leads que coincidan <b>estrictamente</b> con los parámetros mostrados a continuación.</span>
            <span v-else>Tu perfil no cuenta con restricciones en este momento. Tienes visibilidad completa sobre todos los leads del sistema.</span>
          </p>
        </div>
      </div>
      <div class="row g-4" v-if="asesoresControl.length > 0">
        <div class="col-12"><h6 class="fieldset-title text-primary"><i class="fa-solid fa-graduation-cap me-1"></i> Restricciones Académicas</h6></div>
        <div class="col-md-4"><label class="exec-label">Tipos de Programa</label><MultiSelect disabled v-model="asesoresControl[0].type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Modalidades</label><MultiSelect disabled v-model="asesoresControl[0].model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Programas Específicos</label><MultiSelect disabled v-model="asesoresControl[0].program_ids" :items="filtroProgramasEspec" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-12 mt-4"><h6 class="fieldset-title" style="color: var(--teal-600);"><i class="fa-solid fa-earth-americas me-1"></i> Restricciones Globales y Operativas</h6></div>
        <div class="col-md-4"><label class="exec-label">Estatus (Pipeline)</label><MultiSelect disabled v-model="asesoresControl[0].status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">E. Cliente</label><MultiSelect disabled v-model="asesoresControl[0].moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Seguimiento</label><MultiSelect disabled v-model="asesoresControl[0].last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Canal de Origen</label><MultiSelect disabled v-model="asesoresControl[0].channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Estrategia MKT</label><MultiSelect disabled v-model="asesoresControl[0].strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Nivel de Interés</label><MultiSelect disabled v-model="asesoresControl[0].interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-12 mt-4">
    <h6 class="fieldset-title" style="color: var(--amber-600);">
      <i class="fa-solid fa-calendar-range me-1"></i> Restricciones de Fecha
    </h6>
  </div>
  <div class="col-md-6">
    <label class="exec-label">F. Primer Contacto (rango permitido)</label>
    <div class="exec-input-light w-100 d-flex align-items-center gap-2" style="height:auto; padding: 6px 10px; background:#f8fafc; color:#94a3b8; font-size:12px;">
      <i class="fa-regular fa-calendar me-1"></i>
      <span v-if="asesoresControl[0].first_contact_date_from">
        {{ asesoresControl[0].first_contact_date_from }} → {{ asesoresControl[0].first_contact_date_to }}
      </span>
      <span v-else class="fst-italic">Sin restricción</span>
    </div>
  </div>
  <div class="col-md-6">
    <label class="exec-label">Inicio de Edición (rango permitido)</label>
    <div class="exec-input-light w-100 d-flex align-items-center gap-2" style="height:auto; padding: 6px 10px; background:#f8fafc; color:#94a3b8; font-size:12px;">
      <i class="fa-regular fa-calendar me-1"></i>
      <span v-if="asesoresControl[0].edition_start_date_from">
        {{ asesoresControl[0].edition_start_date_from }} → {{ asesoresControl[0].edition_start_date_to }}
      </span>
      <span v-else class="fst-italic">Sin restricción</span>
    </div>
  </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-end w-100 gap-2">
        <button class="btn-exec btn-exec-outline px-4" @click="showControlModal = false">{{ isComercial ? 'Entendido, cerrar' : 'Cancelar' }}</button>
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
      <!-- Banner de observacion FICO -->
      <div v-if="enrollmentObserved" class="obs-enroll-banner mb-4">
        <div class="obs-enroll-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="obs-enroll-body">
          <strong>Inscripcion Observada por FICO</strong>
          <p>{{ enrollmentObserved.reason }}</p>
        </div>
        <button class="obs-enroll-btn" :disabled="resubmittingEnrollment" @click="handleResubmitFromModal">
          <i class="fa-solid" :class="resubmittingEnrollment ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
          {{ resubmittingEnrollment ? 'Reenviando...' : 'Reenviar a FICO' }}
        </button>
      </div>
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
          <div class="info-block mb-3"><label class="exec-label">Nombre Completo</label><span class="info-value">{{ enrollmentData.student_name }}</span></div>
          <div class="d-flex justify-content-between mb-3">
            <div class="info-block"><label class="exec-label">Documento</label><span class="info-value text-mono">{{ enrollmentData.document_number }}</span></div>
            <div class="info-block"><label class="exec-label">Fecha Inscripción</label><span class="info-value text-muted" style="font-weight:500;">{{ enrollmentData.registration_date }}</span></div>
            <div class="info-block mb-3">
              <label class="exec-label">Canal de Pago</label>
              <span class="pill pill-slate border"><i class="fa-solid fa-credit-card me-1"></i>{{ enrollmentData.payment_channel_label || '—' }}</span>
            </div>
            <div class="info-block mb-3" v-if="enrollmentData.payment_method_label || enrollmentData.token_provider_label">
              <label class="exec-label">{{ enrollmentData.payment_channel_alias === 'we_channel_token' ? 'Proveedor Link/Token' : 'Método de Pago' }}</label>
              <span class="info-value">{{ enrollmentData.payment_method_label || enrollmentData.token_provider_label || '—' }}</span>
            </div>
          </div>
          <div class="info-block mb-3">
            <label class="exec-label mb-1">Estado de Matrícula</label>
            <span class="pill" :class="enrollmentData.active === 'Y' ? 'pill-teal' : 'pill-red'">{{ enrollmentData.status_label || 'Desconocido' }}</span>
          </div>
          <div class="info-block mb-3"><label class="exec-label">Asesor que Registró</label><span class="info-value"><i class="fa-solid fa-user-tie me-1 text-slate-400"></i>{{ enrollmentData.seller_name || '—' }}</span></div>
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
              <span class="text-secondary fw-600" style="font-size:12px;">Precio de Lista: <span class="pill pill-slate ms-1">{{ enrollmentData.profile_label || 'General' }}</span></span>
              <span class="fw-700 text-dark" style="font-size:14px;">{{ formatMoney(enrollmentData.currency_symbol, enrollmentData.list_price) }}</span>
            </div>
            <div v-if="enrollmentData.discounts_list && enrollmentData.discounts_list.length > 0" class="mb-2">
              <div v-for="(desc, i) in enrollmentData.discounts_list" :key="i" class="d-flex justify-content-between align-items-center c-red py-1">
                <span class="text-muted" style="font-size:11.5px;"><i class="fa-solid fa-tag me-1"></i><span class="fw-600">{{ desc.label || desc.name }}</span><span v-if="desc.value" class="text-slate-400 ms-1 fst-italic">({{ desc.value }}{{ desc.alias && desc.alias.includes('percent') ? '%' : '' }})</span></span>
                <span class="fw-700 c-red" style="font-size:12.5px;">- {{ formatMoney(enrollmentData.currency_symbol, desc.calculated_amount) }}</span>
              </div>
              <hr class="my-2" style="border-color:var(--slate-100);">
            </div>
            <!-- Después del bloque de descuentos, antes de "Total a Pagar" -->
            <div v-if="enrollmentData.reserva_amount > 0" 
                class="d-flex justify-content-between align-items-center mb-2 pb-1">
              <span class="fw-600 text-muted" style="font-size:12px;">
                <i class="fa-solid fa-hand-holding-dollar me-1 text-blue-400"></i>
                Adelanto / Reserva:
              </span>
              <span class="fw-700" style="font-size:12.5px; color:#1d4ed8;">
                {{ formatMoney(enrollmentData.currency_symbol, enrollmentData.reserva_amount) }}
              </span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Total a Pagar:</span>
              <span class="fw-700 accent-text" style="font-size:16px;">{{ formatMoney(enrollmentData.currency_symbol, enrollmentData.total_amount) }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2 c-green">
              <span class="fw-600" style="font-size:12px;">Pagado:</span>
              <span class="fw-700" style="font-size:13px;">{{ formatMoney(enrollmentData.currency_symbol, totalPaidDisplay) }}</span>
            </div>
            <hr class="my-2" style="border-color:#dcfce7;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Saldo Pendiente:</span>
              <span class="fw-700" style="font-size:18px;" :class="saldoPendienteDisplay > 0 ? 'c-red' : 'c-green'">{{ formatMoney(enrollmentData.currency_symbol, saldoPendienteDisplay) }}</span>
            </div>
          </div>
        </div>
      </div> 
      <div class="mt-4 pt-2">
        <h6 class="fieldset-title"><i class="fa-solid fa-paperclip me-1"></i> Documentos y Adjuntos</h6>
        <div v-if="enrollmentData.files_list && enrollmentData.files_list.length > 0" class="file-list">
          <div v-for="(file, idx) in enrollmentData.files_list" :key="idx" class="file-item">
            <div class="d-flex align-items-center gap-3 overflow-hidden">
              <div class="file-icon"><i class="fa-solid fa-lg" :class="getFileIcon(file.type)"></i></div>
              <div class="d-flex flex-column text-truncate">
                <span class="fw-600 text-dark text-truncate" style="font-size:12.5px;" :title="file.name">{{ file.name || 'Documento Adjunto' }}</span>
                <span class="text-muted" style="font-size:10.5px;">
                  {{ file.date || 'Archivo histórico' }}
                  <span v-if="file.source === 'payment_receipt'" class="pill pill-slate ms-1" style="font-size:8px; background:#eff6ff; color:#1d4ed8;">VOUCHER</span>
                  <span v-if="file.source === 'enrollment'" class="pill pill-slate ms-1" style="font-size:8px;">LEGACY</span>
                </span>
              </div>
            </div>
            <a :href="file.url" target="_blank" class="btn-icon" title="Ver Documento"><i class="fas fa-external-link-alt accent-text"></i></a>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:1.5rem;"><p>No hay archivos adjuntos en esta matrícula.</p></div>
      </div>
            <div class="mt-4 pt-2" v-if="enrollmentData.installment_plan && enrollmentData.installment_plan.length > 0">
        <h6 class="fieldset-title">
          <i class="fa-solid fa-table-list me-1"></i> Plan de Cuotas
        </h6>
        <div class="table-shell">
          <table class="exec-table" style="font-size:12px;">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:40px;">#</th>
                <th class="ts ts-c">Vencimiento</th>
                <th class="ts ts-c text-end">Monto</th>
                <th class="ts ts-c text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cuota in enrollmentData.installment_plan"
                :key="cuota.installment_id"
                class="tbody-row"
                :class="{
                  'row-blue':    cuota.is_reserva,
                  'row-inscrito': cuota.status_alias === 'we_payment_status_paid',
                  'row-red':     isOverdue(cuota) && cuota.status_alias !== 'we_payment_status_paid'
                }"
              >
                <!-- # -->
                <td class="td-a text-center fw-700 text-muted">
                  <span v-if="cuota.is_reserva"
                        class="pill pill-slate"
                        title="Adelanto / Pago Inicial"
                        style="background:#dbeafe;color:#1e40af;font-size:9px;">INI</span>
                  <span v-else>{{ cuota.installment_number }}</span>
                </td>

                <!-- Vencimiento -->
                <td class="td-a">
                  <span :class="{ 'c-red fw-700': isOverdue(cuota) && cuota.status_alias !== 'we_payment_status_paid' }">
                    {{ cuota.due_date }}
                  </span>
                  <span v-if="isNextDue(cuota)" 
                        class="pill pill-amber ms-2" 
                        style="font-size:9px;">Próxima</span>
                </td>

                <!-- Monto -->
                <td class="td-a text-end fw-700">
                  {{ formatMoney(enrollmentData.currency_symbol, cuota.amount) }}
                </td>

                <!-- Estado -->
                <td class="td-a text-center">
                  <span class="pill" :class="badgeForInstallment(cuota.status_alias)">
                    {{ cuota.status_label }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; border-top: 2px solid #e2e8f0;">
                <td colspan="2" class="td-a fw-700 text-end" style="font-size:11.5px; color:#475569;">
                  TOTAL PLAN:
                </td>
                <td class="td-a text-end fw-700 accent-text" style="font-size:13px;">
                  {{ formatMoney(enrollmentData.currency_symbol, totalPlanSum) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="mt-4 pt-2" v-if="enrollmentData.lead_observations">
        <h6 class="fieldset-title"><i class="fa-solid fa-comment-dots me-1 text-secondary"></i> Observaciones del Asesor</h6>
        <div class="exec-alert alert-info" style="border-left-color: #94a3b8;"><i class="fa-solid fa-quote-left opacity-40 mt-1"></i><p class="mb-0" style="font-size:.85rem; white-space: pre-line; color: var(--text-primary);">{{ enrollmentData.lead_observations }}</p></div>
      </div>
      <div class="mt-3" v-if="enrollmentData.notes">
        <h6 class="fieldset-title"><i class="fa-solid fa-note-sticky me-1 text-warning"></i> Notas de Matrícula</h6>
        <div class="exec-alert alert-warning"><i class="fa-solid fa-triangle-exclamation opacity-60 mt-1"></i><p class="mb-0" style="font-size:.85rem; white-space: pre-line;">{{ enrollmentData.notes }}</p></div>
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
import { ref, reactive, onMounted, inject, computed, onBeforeUnmount, watch } from 'vue'
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
const ficoService = inject(ServiceKeys.Fico)
const catalog = inject('catalog')
const programService = inject(ServiceKeys.Program)
const filtroProgramasEspec = ref(catalog.options('we_programs') || [])
const filtroProspectSituation = ref(catalog.options('we_prospect_situation') || [])

// === ESTADO ===
const showFilterModal = ref(false)
const showFollowModal = ref(false)
const isCompact = ref(true)
const dense = ref(false)
const activeFilterChips = ref([])
const leadsRaw = ref([])
const isTableLoading = ref(false)
const filtroOwners = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === LONG PRESS ===
// === PERMISOS ===
const storedUserStr = localStorage.getItem('user')
const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null
const isComercial = storedUser?.roles?.includes('COMERCIAL') &&
                    !storedUser?.roles?.includes('LIDER_COMERCIAL') &&
                    !storedUser?.roles?.includes('ADMIN') &&
                    !storedUser?.roles?.includes('GERENCIA');
const currentUserId = storedUser?.user_id;

// ═══════════════════════════════════════════════════════════════
// GRUPOS DE COLUMNAS COLAPSABLES (solo vista compacta)
// ═══════════════════════════════════════════════════════════════

const COL_GROUPS_KEY = 'crm_leads_col_groups_v2'
const colGroups = reactive({
  programa: true,
  cliente: true,
  lead: true,
  asesor: true
})

// Cargar estado guardado desde localStorage
try {
  const saved = localStorage.getItem(COL_GROUPS_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    if (typeof parsed.programa === 'boolean') colGroups.programa = parsed.programa
    if (typeof parsed.cliente === 'boolean') colGroups.cliente = parsed.cliente
    if (typeof parsed.lead === 'boolean') colGroups.lead = parsed.lead
    if (typeof parsed.asesor === 'boolean') colGroups.asesor = parsed.asesor
  }
} catch (e) { /* ignorar errores de parse */ }

// Persistir cambios automáticamente
watch(colGroups, (val) => {
  localStorage.setItem(COL_GROUPS_KEY, JSON.stringify({ ...val }))
}, { deep: true })
// ═══════════════════════════════════════════════════════════════

// === FILTROS ===
const filters = reactive({
  q: '',
  program_text: '',
  estado: null,
  web: null,
  b2b: null,
  order_by: 0,
  payment_channel_ids: [],
  owner_user_ids: [],
  status_lead_ids: [],
  last_follow_ids: [],
  interest_level_ids: [],
  channel_ids: [],
  query_ids: [],
  program_version_ids: [],
  type_program_ids: [],
  model_modality_ids: [],
  strategy_ids: [],
  word_ids: [],
  medium_contact_ids: [],
  code_country_ids: [],
  moment_ids: [],
  attempt_origin_ids: [],
  fico_status_ids: [],
  profile_ids: [],
  currency_ids: [],
  inscription_modality_ids: [],
  prospect_situation_ids: [],
  installment_status_ids: [],
  payment_method_ids: [],
  settlement_status_ids: [],
  rangoFechas: { start: '', end: '' },
  rangoModificacion: { start: '', end: '' },
  created_range_string: null,
  updated_range_string: null,
  edition_range_string: null,
  edition_start_from: '',
  edition_start_to: '',
  first_contact_range_string: null,
  first_contact_from: '',
  first_contact_to: '',
  pay_date_from: '',
  pay_date_to: '',
  pay_date_range_string: null
})

// === CATÁLOGOS ===
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroPaymentChannel = ref(catalog.options('we_payment_channel') || [])
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
const filtroMedios = ref(catalog.options('we_social_media') || [])
const filtroPaises = ref(catalog.options('we_country') || [])
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
const filtroSettlementStatus = ref(catalog.options('we_settlement_status') || catalog.options('we_payment_status') || [])

// === MAPAS COMPUTADOS ===
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
  try { return JSON.parse(jsonStr) } catch (e) { return [] }
}

const formatMoney = (symbolOrAlias, amount) => {
  let symbol = symbolOrAlias;
  if (symbolOrAlias === 'we_currency_soles' || symbolOrAlias === 'PEN') symbol = 'S/';
  if (symbolOrAlias === 'we_currency_dollars' || symbolOrAlias === 'USD') symbol = '$';
  const val = Number(amount) || 0;
  return `${symbol} ${val.toFixed(2)}`;
}

async function parseQueryAndApply() {
  const q = route.query
  const hasQueryParams = Object.keys(q).length > 0
  if (!hasQueryParams) return false
  clearFilters(false)
  if (q.q)              filters.q            = q.q
  if (q.program_text)   filters.program_text  = q.program_text
  if (q.web)            filters.web           = q.web
  if (q.b2b)            filters.b2b           = q.b2b
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
  if (q.created_from) {
    const createdTo = q.created_to || q.created_from
    filters.rangoFechas = { start: q.created_from, end: createdTo }
    filters.created_range_string = `${q.created_from} a ${createdTo}`
  }
  if (q.updated_from) {
    const updatedTo = q.updated_to || q.updated_from
    filters.rangoModificacion = { start: q.updated_from, end: updatedTo }
    filters.updated_range_string = `${q.updated_from} a ${updatedTo}`
  }
  if (q.first_contact_from) {
    filters.first_contact_from = q.first_contact_from
    filters.first_contact_to   = q.first_contact_to || q.first_contact_from
    filters.first_contact_range_string = `${q.first_contact_from} a ${filters.first_contact_to}`
  }

  filters.owner_user_ids     = decodeFilter(q.owner_user_ids)
  filters.status_lead_ids    = decodeFilter(q.status_lead_ids)
  filters.last_follow_ids    = decodeFilter(q.last_follow_ids)
  filters.interest_level_ids = decodeFilter(q.interest_level_ids)
  filters.channel_ids        = decodeFilter(q.channel_ids)
  filters.query_ids          = decodeFilter(q.query_ids)
  filters.payment_channel_ids = decodeFilter(q.payment_channel_ids)
  filters.prospect_situation_ids = decodeFilter(q.prospect_situation_ids)
  filters.type_program_ids   = decodeFilter(q.type_program_ids)
  filters.model_modality_ids = decodeFilter(q.model_modality_ids)
  filters.program_version_ids = decodeFilter(q.program_version_ids)
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

// === LOGICA MODAL SEGUIMIENTO ===
const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const toggleTimer = (attempt) => {
  if (attempt.timerActive) {
    clearInterval(attempt.timerId)
    attempt.timerActive = false
    attempt.timerId = null
  } else {
    attempt.timerActive = true
    attempt.timerId = setInterval(() => {
      attempt.contact_duration = (attempt.contact_duration || 0) + 1
    }, 1000)
  }
}

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
          contact_datetime: d.contact_datetime ? String(d.contact_datetime).replace('T', ' ').slice(0, 16) : '',
          response: d.response || '',
          cat_type_attempt: d.cat_type_attempt_alias,
          cat_type_attempt_label: d.cat_type_attempt_label,
          contact_duration: d.contact_duration || 0,
          timerActive: false,
          timerId: null,
          user_registration_label: d.user_registration_label || '—',
          registration_date_fmt: d.registration_date ? String(d.registration_date).replace('T', ' ').slice(0, 16) : '—',
          user_modification_label: d.user_modification_label || null,
          modification_date_fmt: d.modification_date ? String(d.modification_date).replace('T', ' ').slice(0, 16) : null,
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

const getFileIcon = (type) => {
  if (!type) return 'fa-file text-secondary'
  const t = type.toLowerCase()
  if (t.includes('payment_receipt')) return 'fa-file-invoice-dollar text-primary'
  if (t.includes('pdf'))             return 'fa-file-pdf text-danger'
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg')) return 'fa-file-image text-success'
  if (t.includes('legacy'))          return 'fa-file-contract text-warning'
  if (t.includes('xml'))             return 'fa-file-code text-info'
  if (t.includes('zip') || t.includes('rar')) return 'fa-file-zipper text-dark'
  return 'fa-file-lines text-primary'
}

async function checkMyRestrictions() {
  if (!isComercial) return;
  try {
    const myRest = await comercialService.restrictionsList({ user_id: currentUserId, is_comercial: true });
    if (myRest && myRest.length > 0) {
      const r = myRest[0];
      const isRestricted = [
        r.type_program_ids, r.model_modality_ids, r.program_ids,
        r.status_lead_ids, r.last_follow_ids, r.interest_level_ids,
        r.channel_ids, r.strategy_ids, r.moment_ids
      ].some(arr => Array.isArray(arr) && arr.length > 0)
      // ── NUEVO: también activar alerta si hay rangos de fecha ──────
      || !!r.first_contact_date_from
      || !!r.edition_start_date_from;

      hasActiveRestrictions.value = isRestricted;
    }
  } catch (e) { console.error("Error comprobando mis restricciones:", e); }
}

async function openControlModal() {
  showControlModal.value = true;
  asesoresControl.value = [];
  try {
    if (filtroOwners.value.length === 0) await loadOwners();
    const savedRestrictions = await comercialService.restrictionsList({ user_id: currentUserId, is_comercial: isComercial });
const buildAsesorRecord = (userId, userName, bdRest = {}) => {
  // ── helper: extrae solo YYYY-MM-DD de un ISO string ──────────
  const toDate = (val) => val ? String(val).slice(0, 10) : null

  const fcFrom = toDate(bdRest.first_contact_date_from)
  const fcTo   = toDate(bdRest.first_contact_date_to)
  const esFrom = toDate(bdRest.edition_start_date_from)
  const esTo   = toDate(bdRest.edition_start_date_to)

  return {
    user_id: userId, name: userName,
    type_program_ids:    bdRest.type_program_ids    || [],
    model_modality_ids:  bdRest.model_modality_ids  || [],
    program_ids:         bdRest.program_ids         || [],
    status_lead_ids:     bdRest.status_lead_ids     || [],
    last_follow_ids:     bdRest.last_follow_ids     || [],
    interest_level_ids:  bdRest.interest_level_ids  || [],
    channel_ids:         bdRest.channel_ids         || [],
    strategy_ids:        bdRest.strategy_ids        || [],
    moment_ids:          bdRest.moment_ids          || [],
    first_contact_date_from:  fcFrom,
    first_contact_date_to:    fcTo,
    edition_start_date_from:  esFrom,
    edition_start_date_to:    esTo,
    first_contact_range_string: fcFrom && fcTo ? `${fcFrom} a ${fcTo}` : null,
    edition_start_range_string: esFrom && esTo ? `${esFrom} a ${esTo}` : null,
  }
}
    if (isComercial) {
      const bdRest = savedRestrictions[0] || {};
      const myName = storedUser?.first_name ? `${storedUser.first_name} ${storedUser.last_name || ''}` : `Mi Usuario (${currentUserId})`;
      asesoresControl.value = [buildAsesorRecord(currentUserId, myName, bdRest)];
    } else {
      asesoresControl.value = filtroOwners.value.map(owner => {
        const bdRest = savedRestrictions.find(r => r.user_id === owner.id) || {};
        return buildAsesorRecord(owner.id, owner.description, bdRest);
      });
    }
  } catch (error) {
    console.error("Error cargando permisos:", error);
    toast.error("Hubo un error al cargar el panel de permisos.");
  }
}
function handleAsesorDateChange(asesor, dateStr, type) {
  let start = '', end = ''
  if (dateStr && dateStr.includes(' a ')) {
    [start, end] = dateStr.split(' a ')
  } else if (dateStr) {
    start = end = dateStr
  }
  if (type === 'first_contact') {
    asesor.first_contact_date_from = start || null
    asesor.first_contact_date_to   = end   || null
  } else if (type === 'edition_start') {
    asesor.edition_start_date_from = start || null
    asesor.edition_start_date_to   = end   || null
  }
}
async function saveControlRestrictions() {
  isSavingRestrictions.value = true;
  try {
    const payloadMasivo = asesoresControl.value.map(asesor => ({
      user_id:                 asesor.user_id,
      is_active:               true,
      type_program_ids:        extractIds(asesor.type_program_ids),
      model_modality_ids:      extractIds(asesor.model_modality_ids),
      program_ids:             extractIds(asesor.program_ids),
      status_lead_ids:         extractIds(asesor.status_lead_ids),
      last_follow_ids:         extractIds(asesor.last_follow_ids),
      interest_level_ids:      extractIds(asesor.interest_level_ids),
      channel_ids:             extractIds(asesor.channel_ids),
      strategy_ids:            extractIds(asesor.strategy_ids),
      moment_ids:              extractIds(asesor.moment_ids),
      first_contact_date_from: asesor.first_contact_date_from || null,
      first_contact_date_to:   asesor.first_contact_date_to   || null,
      edition_start_date_from: asesor.edition_start_date_from || null,
      edition_start_date_to:   asesor.edition_start_date_to   || null,
    }))

    await comercialService.restrictionsUpdate(payloadMasivo)

    // ── Notificar por SSE a todos los asesores afectados ──────────
    const affectedIds = asesoresControl.value.map(a => a.user_id)
    try {
      await comercialService.pushRestrictionsUpdate({ user_ids: affectedIds })
    } catch (e) {
      // No crítico: si falla el push, las restricciones igual se guardaron
      console.warn('[Restricciones] No se pudo notificar por SSE:', e.message)
    }
    // ─────────────────────────────────────────────────────────────

    toast.success('Filtros restrictivos aplicados correctamente')
    showControlModal.value = false
  } catch (error) {
    console.error('Error guardando restricciones:', error)
    toast.error('Error al guardar las restricciones')
  } finally {
    isSavingRestrictions.value = false
  }
}


async function saveFastFollow() {
  if (!selectedFollowLead.value) return
  editableHistory.value.forEach(item => { if (item.timerActive) toggleTimer(item) })
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

    // Obtenemos el ID del estado recién seleccionado en el select
    const cat_status_lead_id = getIdFromAlias(selectedFollowLead.value.cat_status_alias, filtroPipeline.value)

    const resp = await comercialService.leadUpdate({ 
      id: selectedFollowLead.value.id, 
      lead: { cat_status_lead: cat_status_lead_id }, // Enviamos el nuevo estado aquí
      contact_attempts: attemptsPayload 
    })
    
    if (resp.result === 1) {
      toast.success(resp.message || 'Seguimiento y estado actualizados correctamente')
      showFollowModal.value = false
      fetchLeads()
    } else if (resp.result === 0) {
      toast.error(resp.message || 'Error inesperado al guardar')
    } else {
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
  const existing = editableHistory.value.filter(a => a.id)
  if (!existing.length) return null
  const dates = existing.map(a => new Date(a.contact_datetime)).filter(d => !isNaN(d))
  if (!dates.length) return null
  return new Date(Math.max(...dates))
})

function rebuildChips() {
  const chips = []
  const makeChip = (key, labelPrefix, items) => {
    if (!items || items.length === 0) return
    const labels = items.map(i => i.label || i.value)
    chips.push({ key, label: labels.length === 1 ? `${labelPrefix}: ${labels[0]}` : `${labelPrefix}: ${labels.length} sel.`, text: `${labelPrefix}: ${labels.join(', ')}`, details: labels })
  }
  if (filters.q)            chips.push({ key: 'q',            label: `Buscar: "${filters.q}"` })
  if (filters.program_text) chips.push({ key: 'program_text', label: `Prog: "${filters.program_text}"` })
  if (filters.web)          chips.push({ key: 'web',          label: `Web: ${filters.web === 'Y' ? 'Sí' : 'No'}` })
  if (filters.b2b)          chips.push({ key: 'b2b',          label: `B2B: ${filters.b2b === 'Y' ? 'Sí' : 'No'}` })
  if (filters.order_by === 1) chips.push({ key: 'order_by', text: 'Orden: Inicio Edición' })
  if (filters.order_by === 2) chips.push({ key: 'order_by', text: 'Orden: Fecha Pago' })
  if (filters.rangoFechas?.start) chips.push({ key: 'rangoFechas', label: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}` })
  if (filters.pay_date_from) chips.push({ key: 'pay_date', label: `Pago: ${filters.pay_date_from} → ${filters.pay_date_to}` })
  if (filters.first_contact_from) chips.push({ key: 'first_contact', label: `F.Contacto: ${filters.first_contact_from} → ${filters.first_contact_to}` })
  if (filters.edition_start_from) chips.push({ key: 'edition_start', label: `Edición: ${filters.edition_start_from} → ${filters.edition_start_to}` })
  makeChip('status_lead_ids',    'Estatus',    filters.status_lead_ids)
  makeChip('last_follow_ids',    'Seguim.',    filters.last_follow_ids)
  makeChip('attempt_origin_ids', 'O. Intento', filters.attempt_origin_ids)
  makeChip('membership_moment_ids', 'Member', filters.membership_moment_ids)

  makeChip('interest_level_ids', 'Interés',    filters.interest_level_ids)
  makeChip('channel_ids',        'Canal',      filters.channel_ids)
  makeChip('prospect_situation_ids', 'Situación', filters.prospect_situation_ids)
  makeChip('query_ids',          'Promoción',  filters.query_ids)
  makeChip('program_version_ids', 'Programa', filters.program_version_ids)
  makeChip('type_program_ids',   'Tipo',       filters.type_program_ids)
  makeChip('model_modality_ids', 'Modalidad',  filters.model_modality_ids)
  makeChip('strategy_ids',       'Estrategia', filters.strategy_ids)
  makeChip('payment_channel_ids', 'Canal Pago', filters.payment_channel_ids)
  makeChip('word_ids',           'Palabra',    filters.word_ids)
  makeChip('medium_contact_ids', 'Medio',      filters.medium_contact_ids)
  makeChip('code_country_ids',   'País',       filters.code_country_ids)
  makeChip('moment_ids',         'Etapa',      filters.moment_ids)
  makeChip('fico_status_ids',          'FICO',        filters.fico_status_ids)
  makeChip('profile_ids',              'Perfil',      filters.profile_ids)
  makeChip('currency_ids',             'Moneda',      filters.currency_ids)
  makeChip('inscription_modality_ids', 'Mod. Insc.',  filters.inscription_modality_ids)
  makeChip('installment_status_ids',   'Est. Cuota',  filters.installment_status_ids)
  makeChip('payment_method_ids',       'Método Pago', filters.payment_method_ids)
  makeChip('settlement_status_ids',    'Conciliación',filters.settlement_status_ids)
  if (!isComercial) makeChip('owner_user_ids', 'Asesor', filters.owner_user_ids)
  activeFilterChips.value = chips
}

// === API ===
async function fetchLeads() {
  isTableLoading.value = true
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
      order_by:            filters.order_by ?? 0,
      payment_channel_ids: getIds(filters.payment_channel_ids),
      from_date:           filters.rangoFechas?.start        || null,
      membership_moment_ids: getIds(filters.membership_moment_ids),
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
      first_contact_from: filters.first_contact_from || null,
      first_contact_to:   filters.first_contact_to   || null,
      settlement_status_ids:      getIds(filters.settlement_status_ids),
      owner_user_ids:      getIds(filters.owner_user_ids),
      status_lead_ids:     getIds(filters.status_lead_ids),
      last_follow_ids:     getIds(filters.last_follow_ids),
      program_version_ids: getIds(filters.program_version_ids),
      prospect_situation_ids: getIds(filters.prospect_situation_ids),
      interest_level_ids:  getIds(filters.interest_level_ids),
      channel_ids:         getIds(filters.channel_ids),
      query_ids:           getIds(filters.query_ids),
      type_program_ids:    getIds(filters.type_program_ids),
      attempt_origin_ids:  getIds(filters.attempt_origin_ids),
      model_modality_ids:  getIds(filters.model_modality_ids),
      strategy_ids:        getIds(filters.strategy_ids),
      word_ids:            getIds(filters.word_ids),
      medium_contact_ids:  getIds(filters.medium_contact_ids),
      code_country_ids:    getIds(filters.code_country_ids),
      moment_ids:          getIds(filters.moment_ids),
    })
    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)
    if (filtroOwners.value.length === 0 && items?.length > 0) await loadOwners()
  } catch (e) {
    console.error('Error cargando leads:', e)
    leadsRaw.value = []
    pagin.value.total = 0
  } finally {
    isTableLoading.value = false
  }
}

const showEnrollmentModal = ref(false)
const enrollmentData = ref(null)
const isLoadingEnrollment = ref(false)
const enrollmentObserved = ref(null)
const resubmittingEnrollment = ref(false)

async function openEnrollmentModal(enrollmentId) {
  if (!enrollmentId) return;
  isLoadingEnrollment.value = true;
  enrollmentData.value = null;
  enrollmentObserved.value = null;
  showEnrollmentModal.value = true;
  try {
    const response = await comercialService.enrollmentGet({ enrollment_id: enrollmentId });
    const data = response;
    if (!data || !data.enrollment_id) { toast.error("No se encontraron datos para esta matrícula"); showEnrollmentModal.value = false; return; }
    data.files_list = (data.files_list || []).filter(f => f !== null);
    enrollmentData.value = data;

    const flags = await ficoService.getEnrollmentFlags(Number(enrollmentId))
    if (flags?.fico_status_alias === 'we_enrollment_status_observed') {
      const audit = await ficoService.getAuditLog(Number(enrollmentId))
      const obs = (audit || []).find(a => a.action === 'observed')
      enrollmentObserved.value = { reason: obs?.justificacion || obs?.details || 'Observacion sin detalle', enrollmentId: Number(enrollmentId) }
    }
  } catch (error) {
    console.error(error);
    toast.error("No se pudo cargar la información de la matrícula");
    showEnrollmentModal.value = false;
  } finally {
    isLoadingEnrollment.value = false;
  }
}

async function handleResubmitFromModal () {
  if (!enrollmentObserved.value) return
  resubmittingEnrollment.value = true
  try {
    await ficoService.resubmitEnrollment({ enrollment_id: enrollmentObserved.value.enrollmentId })
    toast.success('Inscripcion reenviada a FICO correctamente.')
    enrollmentObserved.value = null
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al reenviar inscripcion.')
  } finally {
    resubmittingEnrollment.value = false
  }
}


function clearFilters(reload = true) {
  Object.assign(filters, {
    q: '', program_text: '', estado: null, web: null, b2b: null,
    owner_user_ids: [], status_lead_ids: [], last_follow_ids: [], order_by: 0,
    interest_level_ids: [], channel_ids: [], query_ids: [],
    type_program_ids: [], model_modality_ids: [], strategy_ids: [],
    payment_channel_ids: [],
    word_ids: [], medium_contact_ids: [], code_country_ids: [], moment_ids: [],
    rangoFechas: { start: '', end: '' }, rangoModificacion: { start: '', end: '' },
    created_range_string: null, updated_range_string: null, attempt_origin_ids: [],
    edition_range_string: null, edition_start_from: '', edition_start_to: '',
    pay_date_from: '', pay_date_to: '', pay_date_range_string: null,
    fico_status_ids: [], profile_ids: [], currency_ids: [],membership_moment_ids: [],
    inscription_modality_ids: [], installment_status_ids: [], program_version_ids: [],
    first_contact_range_string: null, first_contact_from: '', first_contact_to: '',
    payment_method_ids: [], settlement_status_ids: [], prospect_situation_ids: []
  })
  if (isComercial && currentUserId) filters.owner_user_ids = [currentUserId]
  if (reload === true || typeof reload !== 'boolean') {
    pagin.value.page = 1
    localStorage.removeItem('crm_leads_filter_state_v1')
    rebuildChips()
    fetchLeads()
  }
}

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => {
      const fName = (u.first_name || '').trim()
      const lName = (u.last_name || '').trim()
      let fullName = fName
      if (lName) fullName += ` ${lName.charAt(0)}.`
      const desc = fullName.trim() || `Usuario ${u.user_id}`
      return { id: u.user_id, description: desc }
    })
  } catch (e) { console.error(e) }
}

function openFilterModal() { showFilterModal.value = true }
function applyFilters() { showFilterModal.value = false; pagin.value.page = 1; saveState(); rebuildChips(); fetchLeads() }
function clearFilter(key) {
  if (key === 'rangoFechas') { filters.rangoFechas = { start: '', end: '' }; filters.created_range_string = null }
  else if (key === 'pay_date') { filters.pay_date_from = ''; filters.pay_date_to = ''; filters.pay_date_range_string = null }
  else if (key === 'order_by') { filters.order_by = 0 }
  else if (key === 'edition_start') { filters.edition_start_from = ''; filters.edition_start_to = ''; filters.edition_range_string = null }
  else if (key === 'first_contact') { filters.first_contact_from = ''; filters.first_contact_to = ''; filters.first_contact_range_string = null }
  else if (Array.isArray(filters[key])) { filters[key] = [] }
  else { filters[key] = null }
  applyFilters()
}

function handleDateFilterChange(dateStr, type) {
  let start = '', end = ''
  if (dateStr && dateStr.includes(' a ')) { [start, end] = dateStr.split(' a ') } else if (dateStr) { start = end = dateStr }
  if (type === 'created') { filters.rangoFechas = {start, end}; filters.created_range_string = dateStr }
  else if (type === 'updated') { filters.rangoModificacion = {start, end}; filters.updated_range_string = dateStr }
  else if (type === 'pay_date') { filters.pay_date_from = start; filters.pay_date_to = end; filters.pay_date_range_string = dateStr }
  else if (type === 'first_contact') { filters.first_contact_from = start; filters.first_contact_to = end; filters.first_contact_range_string = dateStr }
  else if (type === 'edition_start') { filters.edition_start_from = start; filters.edition_start_to = end; filters.edition_range_string = dateStr }
}

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
  const map = { 'we_lead_interest_high': 'pill-red', 'we_lead_interest_medium': 'pill-amber', 'we_lead_interest_low': 'pill-slate' };
  return map[s] || 'pill-slate'
}

function badgeForFollow(s) {
  const map = { 'we_calling_pending': 'pill-slate', 'we_calling_answered': 'pill-teal', 'we_calling_no_answer': 'pill-red' };
  return map[s] || 'pill-slate'
}

function addLocalAttempt() {
  const now = new Date();
  const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  editableHistory.value.unshift({
    id: null, attempt_number: null, status_alias: 'we_calling_pending',
    calling_alias: 'we_calling_pending', contact_datetime: isoString,
    cat_type_attempt: 'we_attempt_call', response: '', contact_duration: 0,
    timerActive: false, timerId: null
  })
}

function getIdFromAlias(alias, catalogArray) {
  if (!alias || !catalogArray) return null;
  const item = catalogArray.find(i => i.alias === alias);
  return item ? item.id : null
} 
function goNew() { router.push({ name: 'ComercialLeadsNew' }) }

function editLead(lead, event) {
  const resolved = router.resolve({ name: 'ComercialLeadDetalle', params: { id: lead.id } })
  if (event?.ctrlKey) {
    window.open(resolved.href, '_blank')
  } else {
    router.push(resolved)
  }
}

function viewLead(lead, event) {
  const resolved = router.resolve({ name: 'ComercialLeadsNew', query: { clone_from: lead.id } })
  if (event?.ctrlKey) {
    window.open(resolved.href, '_blank')
  } else {
    router.push(resolved)
  }
}

function handlePaginationChange() { fetchLeads() }

onMounted(async () => {
  const data = await catalog.membershipList({ active: true });// 3. Asignamos el valor real a la variable reactiva
  membershipList.value = data;
  if (isComercial && currentUserId) {
    filters.owner_user_ids = [currentUserId]
    checkMyRestrictions()
  }
  loadOwners()
  await parseQueryAndApply()
  rebuildChips()
  fetchLeads()
})

let inlineFilterTimer = null
function triggerInlineFilter() { pagin.value.page = 1; saveState(); rebuildChips(); fetchLeads() }
function debouncedInlineFilter() { clearTimeout(inlineFilterTimer); inlineFilterTimer = setTimeout(() => triggerInlineFilter(), 400) }


const filteredCallingByType = (catTypeAttempt) => {
  if (catTypeAttempt === 'we_attempt_call') return filtroCalling.value.filter(c => c.alias !== 'we_calling_bad_asesor')
  return filtroCalling.value.filter(c => c.alias === 'we_calling_pending')
}

const withNull = (items) => [{ id: -1, description: '(Vacío)', alias: '__null__' }, ...(items || [])]

function handleTypeChange(attempt, newVal) {
  attempt.cat_type_attempt = newVal;
  if (newVal !== 'we_attempt_call') {
    attempt.calling_alias = 'we_calling_message';
    if (attempt.timerActive) toggleTimer(attempt);
    attempt.contact_duration = 0;
  } else {
    attempt.calling_alias = 'we_calling_pending';
  }
}
const membershipList = ref([]);

// Badge por estado de cuota
function badgeForInstallment(alias) {
  const map = {
    'we_payment_status_paid':      'pill-teal',
    'we_payment_status_pending':   'pill-amber',
    'we_payment_status_draft':     'pill-slate',
    'we_payment_status_cancelled': 'pill-red',
  }
  return map[alias] || 'pill-slate'
}

// ¿Está vencida? (fecha pasada y no pagada)
function isOverdue(cuota) {
  // La reserva nunca se marca como vencida
  if (cuota.is_reserva) return false
  if (!cuota.due_date || cuota.status_alias === 'we_payment_status_paid') return false
  const [d, m, y] = cuota.due_date.split('/')
  return new Date(`${y}-${m}-${d}`) < new Date()
}

// ¿Es la próxima a vencer? (coincide con next_due_date del SP)
function isNextDue(cuota) {
  return cuota.due_date === enrollmentData.value?.next_due_date &&
         cuota.status_alias !== 'we_payment_status_paid'
}

// Suma total del plan
const totalPlanSum = computed(() => {
  if (!enrollmentData.value?.installment_plan) return 0
  return enrollmentData.value.installment_plan
    .reduce((acc, c) => acc + Number(c.amount || 0), 0)
    .toFixed(2)
})

// Pagado real: el SP no siempre suma el inicial/reserva cuando ya se confirmo
// Este computed consolida: si existe cuota reserva en estado paid, se incluye en el total
const totalPaidDisplay = computed(() => {
  const data = enrollmentData.value
  if (!data) return 0
  const spPaid = Number(data.total_paid) || 0
  const reservaRow = (data.installment_plan || []).find(c => c.is_reserva)
  const reservaPaid = reservaRow && reservaRow.status_alias === 'we_payment_status_paid'
    ? Number(reservaRow.amount) || 0
    : 0
  return Math.max(spPaid, reservaPaid)
})

const saldoPendienteDisplay = computed(() => {
  const data = enrollmentData.value
  if (!data) return 0
  return Math.max(0, Number(data.total_amount || 0) - Number(totalPaidDisplay.value || 0))
})

</script>


<style scoped>
/* ═══════════════════════════════════════════════════
   LAYOUT — diseño basado en EnrollmentPage
   ═══════════════════════════════════════════════════ */
.leads-page {
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
  padding: 24px 28px;
  font-size: 13px;
}

/* === Masthead === */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 13.5px;
  color: var(--e-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; }

/* View toggle */
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

/* Control button */
.ep-btn-control {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  color: var(--e-text); background: #fff;
  border: 1px solid var(--e-border); border-radius: 8px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-btn-control:hover { border-color: var(--e-border-strong); background: var(--e-bg-subtle); }
.ep-btn-control.ep-btn-danger {
  background: rgba(220, 38, 38, 0.06);
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.25);
  animation: pulseRed 2s infinite;
}
.ep-btn-control i { font-size: 11px; }

/* New button */
.ep-btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; font-size: 13px; font-weight: 600;
  color: #fff; background: var(--e-text);
  border: none; border-radius: 8px; cursor: pointer;
  transition: background .2s ease; font-family: inherit;
  letter-spacing: -0.01em;
}
.ep-btn-new:hover { background: #333; }
.ep-btn-new i { font-size: 11px; }

/* === Body === */
.ep-body { padding: 0; }

/* === Filter bar section === */
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
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 16px; flex-wrap: wrap;
  flex: 1 1 auto;
}
.ep-filter-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #047857;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: var(--e-accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ep-filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.ep-filter-strip :deep(.active-filters .label) { display: none; }

/* === Dark mode === */
[data-coreui-theme="dark"] .leads-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16, 185, 129, 0.16);
}
[data-coreui-theme="dark"] .leads-page .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .leads-page .ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .leads-page .ep-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .leads-page .ep-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .leads-page .ep-view-toggle { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .leads-page .ep-toggle-btn.is-active { background: #2A2A22; }
[data-coreui-theme="dark"] .leads-page .ep-btn-control { background: #1A1A14; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .leads-page .ep-btn-new { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .leads-page .ep-btn-new:hover { background: #E4E4DD; }

/* Dark mode — compact group headers */
[data-coreui-theme="dark"] .leads-page .thead-colgroup { background: #1F1F1A; }
[data-coreui-theme="dark"] .leads-page .tg-fixed { background: #1F1F1A; border-right-color: #2A2A22; }
[data-coreui-theme="dark"] .leads-page .tg-header { background: #1A1A14; border-right-color: #2A2A22; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .leads-page .tg-header:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .leads-page .tg-programa { color: #60a5fa; }
[data-coreui-theme="dark"] .leads-page .tg-cliente  { color: #34d399; }
[data-coreui-theme="dark"] .leads-page .tg-lead     { color: #fbbf24; }
[data-coreui-theme="dark"] .leads-page .tg-asesor   { color: #a78bfa; }
[data-coreui-theme="dark"] .leads-page .tg-collapsed.tg-programa,
[data-coreui-theme="dark"] .leads-page .tg-collapsed.tg-cliente,
[data-coreui-theme="dark"] .leads-page .tg-collapsed.tg-lead,
[data-coreui-theme="dark"] .leads-page .tg-collapsed.tg-asesor { background: #1A1A14; }
[data-coreui-theme="dark"] .leads-page .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .leads-page .thead-filter .tf { background: #1F1F1A; border-bottom-color: #34D399; }
[data-coreui-theme="dark"] .leads-page .table-shell { background: #1A1A14; border-color: #2A2A22; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; text-decoration: none; }
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

.table-shell { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
.table-responsive-custom { width: 100%; overflow-x: auto; overflow-y: visible; border-radius: 8px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 5px 10px; font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid #E5E7EB; text-align: left; background: #FAFAFA; color: #6B7280; white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

/* ═══════════════════════════════════════════════════════════════
   GRUPOS DE COLUMNAS COLAPSABLES — estilo EnrollmentExpandedTable
   ═══════════════════════════════════════════════════════════════ */
.thead-colgroup {
  background: #FAFAFA;
}

.tg-fixed {
  width: 80px;
  min-width: 80px;
  background: #FAFAFA;
  border-right: 1px solid #E5E7EB;
}

.tg-header {
  padding: 0;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #E5E7EB;
  border-bottom: 1px solid #E5E7EB;
  background: #fff;
  transition: background 0.15s;
  white-space: nowrap;
}

.tg-header:hover { background: #F9FAFB; }

.tg-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tg-icon { font-size: 9px; opacity: 0.7; }
.tg-text { }
.tg-chevron { font-size: 8px; transition: transform 0.2s; opacity: 0.55; }

/* Colores por grupo — borde izquierdo de acento */
.tg-programa { border-left: 2px solid #2563eb; color: #1e40af; }
.tg-cliente  { border-left: 2px solid #059669; color: #065f46; }
.tg-lead     { border-left: 2px solid #d97706; color: #92400e; }
.tg-asesor   { border-left: 2px solid #7c3aed; color: #5b21b6; }

/* Estado colapsado */
.tg-collapsed {
  width: 36px !important;
  min-width: 36px !important;
  max-width: 36px !important;
}
.tg-collapsed .tg-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 9px;
  max-height: 60px;
  overflow: hidden;
}
.tg-collapsed .tg-label {
  flex-direction: column;
  padding: 8px 4px;
  gap: 4px;
}
.tg-collapsed.tg-programa,
.tg-collapsed.tg-cliente,
.tg-collapsed.tg-lead,
.tg-collapsed.tg-asesor { background: #fff; }

/* Celda placeholder cuando grupo está colapsado */
.tg-placeholder-cell {
  width: 88px !important;
  min-width: 88px !important;
  max-width: 88px !important;
  padding: 4px 6px !important;
  vertical-align: middle;
}

/* Indicador visual en filas del tbody cuando colapsado */
.tg-collapsed-hint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 5px;
  border-radius: 4px;
  width: 100%;
}

.tg-hint-programa { color: #2563eb; background: #eff6ff; }
.tg-hint-cliente  { color: #059669; background: #f0fdf4; }
.tg-hint-lead     { color: #d97706; background: #fffbeb; }
/* ═══════════════════════════════════════════════════════════════ */

.thead-group .th-cat { background: var(--navy-900, #0f172a); color: var(--slate-300, #cbd5e1); padding: 10px 14px; border-right: 2px solid #334155; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; }
.th-group { padding: 8px 10px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border, #e2e8f0); }
.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 2px solid #bbf7d0; }
.ts-a { background: #f8fbff; color: #3b82f6; border-left: 1px solid #dbeafe; padding: 8px 12px; }
.ts-b { background: #f7fdf9; color: #16a34a; border-left: 1px solid #d1fae5; padding: 8px 12px; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.row-inscrito { border-left: 3px solid #10b981; } .row-inscrito > td  { background: #f0fdf4; }
.row-blue     { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald  { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow   { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }
.row-gray     { border-left: 3px solid #94a3b8; } .row-gray > td      { background: var(--slate-50, #f8fafc); color: var(--text-secondary, #475569); }
.row-red      { border-left: 3px solid #ef4444; } .row-red > td       { background: #fef2f2; }
.row-highlight > td { background: #eff6ff !important; }

.td-a { border-left: 1px solid transparent; }
.td-b { border-left: 1px solid transparent; }
.td-cat { padding-left: 14px; border-right: 2px solid #1e293b; background: var(--navy-900, #0f172a) !important; color: #fff !important; }

.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.c-green { color: #15803d; } .c-red { color: #dc2626; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }
.pay-date-cell { color: #15803d; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }
.pill-red    { background: #fee2e2; color: #b91c1c; border-color: #fecaca !important; }

.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover:not(:disabled) { background: var(--slate-100, #f1f5f9); color: var(--text-primary, #0f172a); border-color: var(--slate-300, #cbd5e1); }
.btn-icon:disabled { opacity: .4; cursor: default; }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }
.empty-state p { margin: 0; }

.compact-table { font-size: 11px; }
.compact-table .ts { padding: 6px 10px; font-size: 10px; }
.compact-table td { padding: 6px 10px; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.compact-table .pill { padding: 2px 6px; font-size: 9.5px; }

.exec-fieldset { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 16px 20px; }
.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }

.exec-input-light, .exec-select-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus, .exec-select-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; resize: vertical; min-height: 64px; display: block; }
.exec-textarea:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea:disabled, .exec-input-light:disabled, .exec-select-light:disabled { background: var(--slate-50, #f8fafc); color: var(--slate-400, #94a3b8); cursor: not-allowed; }

.exec-modal-body { display: flex; flex-direction: column; }
.modal-lead-strip { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #fff; border-bottom: 1px solid var(--border, #e2e8f0); }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid #e0f2fe; flex-shrink: 0; }

.timer-btn { width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: .65rem; transition: all .15s; }
.timer-btn--start { background: #d1fae5; color: #059669; }
.timer-btn--start:hover { background: #a7f3d0; }
.timer-btn--stop  { background: #fee2e2; color: #dc2626; }
.timer-btn--stop:hover  { background: #fecaca; }
.timer-btn:disabled { opacity: .45; cursor: default; }
.timer-display { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--text-secondary, #475569); }
.timer-display--active { color: #dc2626; }

.exec-alert { padding: 12px 16px; border-radius: 6px; font-size: 12.5px; border-left: 4px solid; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
.alert-info    { background: #f0f9ff; color: #0369a1; border-color: #3b82f6; }
.alert-warning { background: #fffbeb; color: #92400e; border-color: #f59e0b; }
.alert-success { background: #f0fdf4; color: #166534; border-color: #22c55e; }

.exec-alert-banner { display: flex; align-items: center; padding: 20px; border-radius: 8px; gap: 20px; border: 1px solid; }
.banner-danger  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.banner-success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.banner-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.banner-text  { font-size: 12.5px; color: var(--text-primary, #0f172a); margin: 0; line-height: 1.5; }

.control-table-wrapper { max-height: 62vh; overflow: auto; }
.control-table-wrapper .sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0,0,0,.12); }
.control-table-wrapper tbody .sticky-col { background: #fff; }
.control-table-wrapper thead .sticky-col { z-index: 3; background: var(--navy-900, #0f172a); }
.minW-200 { min-width: 220px; }
.minW-300 { min-width: 320px; }

.enrollment-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.enrollment-title { font-size: 14px; font-weight: 700; color: #0d9488; margin: 0; text-transform: uppercase; letter-spacing: .03em; }
.enrollment-sub { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; font-weight: 500; }
.info-block { display: flex; flex-direction: column; gap: 2px; }
.info-value { font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); }

.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 14px; }
.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; transition: border-color .15s; }
.file-item:hover { border-color: #0d9488; }
.file-icon { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: var(--slate-50, #f8fafc); border-radius: 4px; flex-shrink: 0; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 16px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--border, #e2e8f0); border-top-color: #0d9488; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.scroll-area { max-height: 500px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--slate-300, #cbd5e1) transparent; }
.scroll-area::-webkit-scrollbar { width: 5px; }
.scroll-area::-webkit-scrollbar-thumb { background: var(--slate-200, #e2e8f0); border-radius: 4px; }

.pulse-alert { animation: pulseRed 2s infinite; }
@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,.4); } 70% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }

.text-slate-400 { color: var(--slate-400, #94a3b8); }

/* ══ SKELETON LOADING ════════════════════════════════════════ */
.skeleton-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; }
.sk-cell {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease-in-out infinite;
  width: 100%;
}
.sk-cell.mt-1 { margin-top: 5px; }
@keyframes sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
/* ═══════════════════════════════════════════════════════════════ */

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #FAFAFA; border-bottom: 2px solid #0D9488; vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20, 184, 166, .15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-multiselect { font-size: 11px; }
.thead-filter .hf-multiselect :deep(.ms-trigger) {
  min-height: 28px;
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  border-color: var(--border, #e2e8f0);
  border-radius: 4px;
  gap: 4px;
}
.thead-filter .hf-multiselect :deep(.ms-trigger:hover:not(.is-disabled)) {
  border-color: var(--slate-400, #94a3b8);
  background: #fff;
}
.thead-filter .hf-multiselect :deep(.ms-trigger.is-open),
.thead-filter .hf-multiselect :deep(.ms-trigger.has-selection) {
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 2px rgba(20, 184, 166, .15);
}
.thead-filter .hf-multiselect :deep(.placeholder-text),
.thead-filter .hf-multiselect :deep(.value-text) {
  font-size: 10.5px;
  color: var(--slate-400, #94a3b8);
  font-family: inherit;
}
.thead-filter .hf-multiselect :deep(.value-text) {
  color: var(--text-primary, #0f172a);
}
.thead-filter .hf-multiselect :deep(.trigger-icon) {
  font-size: 10px;
}
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.thead-filter :deep(.exec-flatpickr-input) {
  height: 28px !important;
  min-height: 28px !important;
  font-size: 10.5px !important;
  padding: 0 8px !important;
  font-family: inherit !important;
  border: 1px solid var(--border, #e2e8f0) !important;
  border-radius: 4px !important;
  background: #fff !important;
  color: var(--text-primary, #0f172a) !important;
  box-sizing: border-box !important;
  transition: border-color .15s, box-shadow .15s !important;
  outline: none !important;
}
.thead-filter :deep(.exec-flatpickr-input::placeholder) {
  color: var(--slate-400, #94a3b8) !important;
  font-size: 10.5px !important;
}
.thead-filter :deep(.exec-flatpickr-input:focus) {
  border-color: var(--teal-500, #14b8a6) !important;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, .15) !important;
}
.thead-sub .ts { border-bottom: 1px solid #E5E7EB; }
/* ═══════════════════════════════════════════════════════════════ */

/* ══ HEADER FILTER ACTIONS ════════════════════════════════════ */
.tf-actions-cell { text-align: center; }
.hf-actions-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }
/* ═════════════════════════════════════════════════════════════ */

/* Últimas celdas del thead-filter — dropdown abre a la izquierda */
.thead-filter .tf:nth-last-child(-n+3) :deep(.multiselect-dropdown) { left: auto !important; right: 0 !important; }

@media (max-width: 768px) {
  .leads-page { padding: 16px 12px; }
  .ep-masthead { flex-direction: column; align-items: flex-start; gap: 14px; }
  .ep-masthead-actions { flex-wrap: wrap; }
}


.tg-hint-line {
  display: block;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 76px;
  line-height: 1.3;
}

.tg-hint-main  { font-weight: 600; color: var(--text-primary, #0f172a); }
.tg-hint-strong { font-weight: 700; }
.tg-hint-muted { color: var(--text-muted, #94a3b8); }

.tg-hint-programa { background: #eff6ff; }
.tg-hint-cliente  { background: #f0fdf4; }
.tg-hint-lead     { background: #fffbeb; }
.tg-hint-asesor   { background: #f5f3ff; }

.tg-hint-asesor { color: #7c3aed; background: #f5f3ff; }

.obs-enroll-banner {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 20px; background: #FFFBEB;
  border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 8px;
}
.obs-enroll-icon { font-size: 22px; color: #F59E0B; flex-shrink: 0; }
.obs-enroll-body { flex: 1; }
.obs-enroll-body strong { display: block; font-size: 13px; color: #92400E; margin-bottom: 3px; }
.obs-enroll-body p { margin: 0; font-size: 12px; color: #B45309; line-height: 1.5; }
.obs-enroll-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; font-size: 12.5px; font-weight: 600;
  background: #0D9488; color: #fff; border: none; border-radius: 6px;
  cursor: pointer; font-family: inherit; flex-shrink: 0; transition: opacity .15s;
}
.obs-enroll-btn:hover { opacity: .9; }
.obs-enroll-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ═══════════════════════════════════════════════════
   DOWNBAR — bottom sheet (slides up from bottom)
   ═══════════════════════════════════════════════════ */
.downbar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1055;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.downbar-panel {
  background: #fff;
  width: 100%;
  max-width: 1400px;
  max-height: 88vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.downbar-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 24px 14px;
  border-bottom: 1px solid #F0F0F0;
  flex-shrink: 0;
}

.downbar-grabber {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 4px;
  background: #E5E7EB;
  border-radius: 999px;
}

.downbar-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  letter-spacing: -0.01em;
}

.downbar-close {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #737373;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .15s ease;
}
.downbar-close:hover {
  background: #FAFAFA;
  border-color: #D4D4D4;
  color: #1A1A1A;
}

.downbar-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0;
}

.downbar-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
  flex-shrink: 0;
}

/* Slide-up animation */
.downbar-enter-active,
.downbar-leave-active {
  transition: opacity 0.25s ease;
}
.downbar-enter-active .downbar-panel,
.downbar-leave-active .downbar-panel {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.downbar-enter-from,
.downbar-leave-to {
  opacity: 0;
}
.downbar-enter-from .downbar-panel,
.downbar-leave-to .downbar-panel {
  transform: translateY(100%);
}

/* Dark mode */
[data-coreui-theme="dark"] .downbar-overlay { background: rgba(0, 0, 0, 0.6); }
[data-coreui-theme="dark"] .downbar-panel { background: #1A1A14; box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.5); }
[data-coreui-theme="dark"] .downbar-header { border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .downbar-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .downbar-grabber { background: #2A2A22; }
[data-coreui-theme="dark"] .downbar-close { background: #1A1A14; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .downbar-close:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .downbar-footer { background: #1F1F1A; border-top-color: #2A2A22; }

@media (max-width: 768px) {
  .downbar-panel { max-height: 92vh; border-radius: 14px 14px 0 0; }
  .downbar-header { padding: 16px 16px 12px; }
  .downbar-footer { padding: 12px 16px; }
}

</style>