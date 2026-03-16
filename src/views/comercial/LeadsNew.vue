<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text d-flex align-items-center gap-3">
            <div>
              <span class="brand-eyebrow">CRM Comercial</span>
              <h1 class="brand-title">Formulario Comercial</h1>
            </div>
          </div>
        </div>
        <div class="masthead-actions">
          <button
  :title="
    form.program_modality_selected_alias !== 'we_modality_online' && !form.edition_id
      ? 'Debe seleccionar una edición para programas EN VIVO'
      : 'Inscribir alumno'
  "
  type="button"
  v-if="
    !form.enrollment_id &&
    form.status_alias == 'we_lead_status_bought' &&
    form.pay_date &&
    form.client_status == 'we_client_person' &&
    form.program_version_id
  "
  class="btn-exec btn-exec-warning"
  :disabled="
    !!form.enrollment_id ||
    (form.program_modality_selected_alias !== 'we_modality_online' && !form.edition_id)
  "
  @click="openInscription()"
>
  <i class="fa-solid fa-graduation-cap"></i> INSCRIBIR
</button>
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelar">
            <i class="fa-solid fa-arrow-left"></i> {{ form.enrollment_id ? 'Volver' : 'Cancelar' }}
          </button>
<button
  v-if="!form.enrollment_id"
  type="button"
  class="btn-exec btn-exec-primary px-4"
  @click="guardar"
  :disabled="saving || form.enrollment_id || (!isEdit && !!saveBlockReason)"
  :title="!isEdit && saveBlockReason ? saveBlockReason : 'Guardar lead'"
>
  <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
  {{ saving ? 'Guardando...' : 'Guardar lead' }}
</button>
        </div>
      </div>
    </header>
<main class="exec-body pb-5" v-if="loaded">
      <div class="exec-form-wrapper w-100" style="max-width: 1100px;">

        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-bullseye me-2 text-primary"></i> Información del Lead</h6>
          <div class="row g-3">

<div class="col-md-3">
              <label class="exec-label">Fecha contacto inicial <span class="c-red">*</span></label>
              <DateTime12
                :onlyHours="true"
                :disabled="isEdit"
                v-model="form.fechaContactoInicial"
                required
                clearable />
            </div>

            <div class="col-md-5"></div>

            <div class="col-6 col-md-4">
              <label class="exec-label">T. Consulta</label>
              <SearchSelect
                v-model="form.query_alias"
                :items="queryCatalog"
                label-field="description"
                value-field="alias"
                placeholder="PROMOCIÓN..."
                :model-label="form.query_label"
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-6 col-md-4 col-lg-3">
              <label class="exec-label">Categoría <span class="c-red">*</span></label>

              <SearchSelect
                v-model="form.category_alias"
                :items="programTypeCatalog"
                label-field="description"
                value-field="alias"

                placeholder="CATEGORÍA..."
                class="exec-select-light w-100"
                @change="onProgramaTypeChange"
              />
            </div>

            <div
              class="col-6 col-md-4 col-lg-2"
              v-if="['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.category_alias"
            >
              <label class="exec-label">Modalidad <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.program_modality_alias"
                :items="form.category_alias=='we_program_type_specialization'?programModalityCatalog.filter(e=>e.alias!='we_modality_in_person'):programModalityCatalog"
                label-field="description"
                :viewOpen="6"
                value-field="alias"
                placeholder="MODALIDAD..."
                class="exec-select-light w-100"
                @change="onProgramaTypeChange"
              />
            </div>
<div
              class="col-6 col-md-4"
              v-if="form.category_alias &&
                (!['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) ||
                (['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.program_modality_alias))"
            >
              <label class="exec-label">Producto / Programa <span class="c-red">*</span></label>

<div class="d-flex gap-2">

  <div style="flex: 1; min-width: 0;">   <!-- ← agrega este wrapper -->
    <SearchSelect
      v-model="form.program_version_id"
      mode="remote"
      :fetcher="q => programService.programVersionCaller({ q,
        cat_type_program: programTypeCatalog.find(e=>e.alias==form.category_alias).id,
        cat_model_modality: !form.program_modality_alias ? null : programModalityCatalog.find(e=>e.alias==form.program_modality_alias).id,
        active:'Y'
      })"
      label-field="abbreviation"
      sublabel-field="version_code"
      value-field="program_version_id"
      :viewOpen="6"
      :model-label="form.program_label"
      placeholder="Buscar programa…"
      :minChars="0"
      :cache="false"
      class="w-100"
      @change="onProgramaChange"
    />
  </div>   <!-- ← cierra wrapper -->

  <button
    v-if="form.program_version_id"
    type="button"
    class="btn-exec btn-exec-outline px-0"
    style="height: 38px; width: 38px; flex-shrink: 0;"
    @click="openProgramVersionDetail()"
    title="Ver detalles del programa"
  >
    <i class="fa-solid fa-circle-info" style="color: var(--teal-600, #12274e);"></i>
  </button>

</div>
            </div>

            <div
              class="col-12 col-lg-3"
              v-if="(isEdit && form.edition_id) || (form.program_modality_selected_alias && form.program_modality_selected_alias!='we_modality_online' && form.category_alias && form.program_version_id && !['we_program_type_membership'].includes(form.category_alias))"
            >
              <label class="exec-label">Edición / Fecha prevista <span class="c-red">*</span></label>
<SearchSelect
  v-model="form.edition_id"
  mode="remote"
  :fetcher="searchEditionsFiltered"
  label-field="start_date_label"
  value-field="edition_num_id"
  :viewOpen="6"
  placeholder="Buscar Edición…"
  :model-label="form.edition_label"
  :minChars="0"
  :cache="false"
  class="exec-select-light w-100"
  @change="onEditionChange"
/>
            </div>

          </div>
        </div>

        <div class="exec-fieldset mb-4" v-if="isEdit || validateLeadInfo()">
          <h6 class="fieldset-title"><i class="fa-solid fa-user me-2 text-success"></i> Datos del Contacto</h6>
          <div class="row g-3">

            <div class="col-6 col-md-3 col-lg-2">
              <label class="exec-label">T. Contacto <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.client_status"
                :items="clientCatalog"
                label-field="description"
                value-field="alias"
                placeholder="TIPO..."
                required
                disabled
                :model-label="form.client_status_label"
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-6 col-md-6 col-lg-3">
              <label class="exec-label">Nombre / Razón Social <span class="c-red">*</span></label>
              <input
                required
                autocomplete="nope"
                v-model="form.full_name"
                type="text"
                class="exec-input-light w-100"
                placeholder="NOMBRE COMPLETO"
                v-restrict="{ transform: 'upper', trim: true, max: 150}"
              />
            </div>
<div class="col-6 col-md-3 col-lg-3">
              <label class="exec-label">Teléfono <span class="c-red">*</span></label>
              <div class="d-flex gap-2">
                <input
                  autocomplete="nope"
                  v-model="form.telefono"
                  type="text"
v-restrict="{ only: 'numbers', max: maxPhoneLength, spaces: false, trim: true }"
                  required
                  class="exec-input-light w-100"
                  :class="{ 'input-valid': leadDataHistory && !searchingPhone }"
                  placeholder="TELÉFONO + ENTER"
                  @keyup.enter="searchLeadByPhone"
                  :disabled="searchingPhone || !form.country_alias"
                />
                <button
                  type="button"
                  class="btn-exec btn-exec-outline px-0"
                  style="height: 38px; width: 38px; flex-shrink: 0;"
                  @click="openPhoneDetail()"
                  title="Ver historial del cliente"
                >
                  <i class="fa-solid fa-clock-rotate-left" style="color: var(--teal-600, #12274e);"></i>
                </button>
              </div>
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="exec-label">E. Cliente</label>
              <SearchSelect
                v-model="form.cat_client_moment_alias"
                :items="momentCatalog"
                label-field="description"
                value-field="alias"
                placeholder="E. Cliente..."
                required
                :model-label="form.cat_client_moment_label"
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="exec-label">Membresía</label>
              <SearchSelect
                v-model="form.membership_moment_id"
                :items="membershipList"
                :viewOpen="6"
                label-field="tier_name"
                value-field="membership_tier_id"
                placeholder="MEMBRESÍA..."
                :model-label="form.membership_tier_label"
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="exec-label">Status <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.status_alias"
                :items="leadStatusCatalog"
  :class="['exec-select-light w-100', { 'select--danger': isDeleteStatus }]"
                :viewOpen="6"
                label-field="description"
                value-field="alias"
                placeholder="STATUS..."
                required
                :model-label="form.status_label" 
                @change="onStatusChange"
              />
            </div>

            <div class="col-6 col-md-3">
              <label class="exec-label">Ocupación / Situación </label>
              <SearchSelect
                v-model="form.ocupacion_alias"
                :items="prospectSituationCatalog"
                :viewOpen="6"
                label-field="description"
                value-field="alias"
                :model-label="form.ocupacion_label"
                placeholder="OCUPACIÓN..."
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-6 col-md-3">
              <label class="exec-label">País <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.country_alias"
                :items="countryCatalog"
                :viewOpen="6"
                label-field="description"
                value-field="alias"
                required
                placeholder="PAÍS..."
                class="exec-select-light w-100"
              />
            </div>

          </div>
        </div>

        <div class="exec-fieldset mb-4" v-if="isEdit || (validateLeadInfo() && validateContactInfo())">
          <h6 class="fieldset-title"><i class="fa-solid fa-chart-line me-2 text-info"></i> Estado Comercial y Marketing</h6>
          <div class="row g-3">

<div class="col-md-3">
              <label class="exec-label">F. Pago (prevista)</label>
              <BaseDatePicker v-model="form.pay_date" :config="{}" placeholder="dd/mm/aaaa" />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Nivel de interés <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.nivel_alias"
                :items="leadInterestCatalog"
                required
                label-field="description"
                value-field="alias"
                :model-label="form.nivel_label"
                placeholder="NIVEL..."
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-md-6">
              <label class="exec-label">Mensaje de chat <span class="c-red">*</span></label>
              <textarea
                v-model="form.mensajeChat"
                class="exec-textarea w-100"
                placeholder="MENSAJE CHAT"
                v-restrict="{ trim: true, max: 500 }"
                required
                rows="2"
                @input="handleMensajeChatInput"
              ></textarea>
            </div>

            <div class="col-md-3">
              <label class="exec-label">Canal prospección <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.canal_alias"
                :items="socialMediaCatalog.filter(e=> !['we_social_media_whatsapp','we_social_media_msg','we_social_media_comment'].includes(e.alias))"
                required
                label-field="description"
                value-field="alias"
                :viewOpen="6"
                :model-label="form.canal_label"
                class="exec-select-light w-100"
                @change="onChannelChange"
                placeholder="CANAL..."
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Medio de llegada <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.medium_alias"
                :items="filteredMediumCatalog"
                required
                label-field="description"
                :viewOpen="6"
                :model-label="form.medium_label"
                value-field="alias"
                placeholder="MEDIO..."
                class="exec-select-light w-100"
                :disabled="isMedioDisabled"
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Palabra MKT <span class="c-red">*</span></label>

              <SearchSelect
                v-model="form.key_word_alias"
                :items="mktWordsCatalog"
                :viewOpen="6"
                :model-label="form.key_word_label"
                label-field="description"
                value-field="alias"
                placeholder="MKT..."
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Estrategia</label>
              <SearchSelect
                :viewOpen="6"
                v-model="form.strategy_alias"
                :disabled="!form.canal_alias || form.canal_alias!='we_social_media_other'"
                :items="strategyCatalog"
                label-field="description"
                value-field="alias"
                class="exec-select-light w-100"
                @change="onStrategyChange"
                placeholder="ESTRATEGIA..."
              />
            </div>

            <div class="col-md-12">
              <label class="exec-label">Observaciones</label>
              <textarea
                v-model="form.observacion"
                class="exec-textarea w-100"
                rows="2"
                v-restrict="{ trim: true, max: 500 }"
              ></textarea>
            </div>

          </div>
        </div>

        <div class="exec-fieldset mb-4" v-if="isEdit || (validateLeadInfo(), validateContactInfo(), validateCommercialInfo())">
          <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
            <h6 class="fieldset-title mb-0 border-0 pb-0"><i class="fa-solid fa-phone-volume me-2 text-warning"></i> Seguimiento / Intentos de Contacto</h6>
            <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="addContacto">
              <i class="fa-solid fa-plus me-1"></i> Añadir intento
            </button>
          </div>

          <div class="attempt-head d-none d-lg-grid mb-2">
            <div class="text-center">#</div>
            <div>Tipo / Origen</div> <div>Fecha y Hora <span class="c-red">*</span></div>
            <div>T. Respuesta</div>
            <div>Observación</div>
            <div></div>
          </div>

          <div
            v-for="(c, idx) in form.contactos"
            :key="c.id || idx"
            class="attempt-row"
          >
            <div class="attempt-row__num">
              <span class="d-lg-none me-1 text-muted" style="font-size:.75rem">Intento</span>
              <strong>{{ idx + 1 }}</strong>
            </div>

<div class="attempt-row__type">
              <label class="exec-label d-lg-none">Tipo / Origen</label>

              <SearchSelect
  v-model="c.cat_type_attempt"
  :items="lAttempts"
  label-field="description"
  value-field="alias"
  placeholder="TIPO..."
  class="exec-select-light w-100"
  :disabled="!!c.id"
  @update:model-value="(val) => handleTypeChange(c, val)" 
/>

              <template v-if="c.id">

                <div class="mt-2 text-truncate" style="font-size: 10px;">
                  <span
                    class="pill border w-100 justify-content-center"
                    :class="c.cat_creation_origin_alias === 'we_origin_manual' ? 'pill-slate' : 'pill-amber'"
                    :title="c.cat_creation_origin_label || 'Gestión Manual'"
                  >
                    <i class="fa-solid me-1" :class="c.cat_creation_origin_alias === 'we_origin_manual' ? 'fa-user-pen' : 'fa-robot'"></i>
                    {{ c.cat_creation_origin_label || 'Gestión Manual' }}
                  </span>
                </div>

                <div
                  v-if="c.calling_alias === 'we_calling_pending' && isLiderComercial"
                  class="mt-2"
                >
                  <button
                    type="button"
                    class="btn-exec btn-exec-outline btn-exec-sm w-100"
                    :class="c.cat_reschedule_origin ? 'btn-exec-active' : ''"
                    @click="toggleReschedule(c)"
                    title="Reprogramar fecha de esta llamada"
                  >
                    <i class="fa-solid fa-calendar-pen me-1"></i>
                    {{ c.cat_reschedule_origin ? 'Reprogramación activa' : 'Reprogramar' }}
                  </button>
                </div>

                <div v-if="c.was_rescheduled && !c.cat_reschedule_origin" class="mt-1" style="font-size:10px;">
                  <span class="pill pill-amber border w-100 justify-content-center">
                    <i class="fa-solid fa-calendar-pen me-1"></i> Reprogramado
                  </span>
                </div>

              </template>

              <template v-else>
                <div class="mt-2 text-truncate text-center" style="font-size: 10px;">
                  <span class="text-muted"><i class="fa-solid fa-asterisk me-1"></i>Nuevo (Manual)</span>
                </div>
              </template>

              <div class="attempt-timer mt-2" v-if="c.cat_type_attempt === 'we_attempt_call'">
                <button
                  type="button"
                  class="timer-btn"
                  :class="c.timerActive ? 'timer-btn--stop' : 'timer-btn--start'"
                  @click="toggleTimer(c)"
                  :disabled="!!c.id && c.calling_alias !== 'we_calling_pending'"
                  :title="c.timerActive ? 'Detener' : 'Iniciar'"
                >
                  <i class="fa-solid" :class="c.timerActive ? 'fa-stop' : 'fa-play'"></i>
                </button>
                <span class="timer-display" :class="c.timerActive ? 'timer-display--active' : ''">
                  {{ formatDuration(c.contact_duration) }}
                </span>
              </div>
            </div>


<div class="attempt-row__date">
                  <DateTime12
                    v-model="c.fechaContactoProximo"
                    required
                    clearable
                    :onlyHours="true"
                    :disabled="c.calling_alias != 'we_calling_pending' && !c.cat_reschedule_origin"
                    :config="!c.id && minDateForNewAttempt
                      ? { minDate: minDateForNewAttempt }
                      : futureDateConfig" />
                </div>

            <div class="attempt-row__result">
              <label class="exec-label d-lg-none">T. Resultado</label>
              
              <SearchSelect
                v-if="c.cat_type_attempt === 'we_attempt_call'"
                v-model="c.calling_alias"
                :viewOpen="6"
                :items="callingCatalog"
                label-field="description"
                required
                value-field="alias"
                placeholder="T. RESPUESTA..."
                :model-label="c.calling_label"
                class="exec-select-light w-100"
                :disabled="c.calling_alias != 'we_calling_pending' && c.calling_alias!=null"
              />

              <div v-else class="d-flex align-items-center h-100 text-muted small pt-2 px-1">
                <i class="fa-regular fa-paper-plane me-2"></i>
                <span>Mensaje / Gestión</span>
              </div>
            </div>

            <div class="attempt-row__obs">
              <label class="exec-label d-lg-none">Observación</label>
              <textarea
                v-model="c.respuesta"
                class="exec-textarea w-100"
                rows="2"
                placeholder="Observación..."
                :disabled="!!c.id && c.cat_type_attempt === 'we_attempt_call' && c.calling_alias !== 'we_calling_pending'"
                v-restrict="{ trim: true, max: 250 }"
              ></textarea>
            </div>

            <div class="attempt-row__del">
              <button
                v-if="!c.id"
                type="button"
                class="btn-exec btn-exec-danger-ghost btn-exec-sm w-100"
                @click="removeContacto(idx)"
              >
                <i class="fa-solid fa-trash-can"></i>
                <span class="d-lg-none ms-2">Eliminar</span>
              </button>
            </div>
          </div>

          <div v-if="form.contactos.length === 0" class="empty-state">
            <i class="fa-solid fa-inbox fa-2x mb-2 text-slate-300"></i>
            <p class="mb-0">No hay intentos de contacto registrados. Añade al menos uno.</p>
          </div>
        </div>

        <!-- <div class="exec-fieldset" v-if="isEdit">
          <div class="d-flex align-items-center gap-3">
            <label class="exec-label mb-0">Estado del Registro <span class="c-red">*</span></label>
            <label class="exec-switch exec-switch-lg">
              <input type="checkbox" v-model="form.active" />
              <span></span>
            </label>
            <span class="x-small text-muted fw-600">{{ form.active ? 'ACTIVO EN SISTEMA' : 'INACTIVO' }}</span>
          </div>
        </div> -->

      </div>
      <!-- BANNER: Estado Eliminado -->
<Transition name="delete-warn">
  <div v-if="isDeleteStatus" class="delete-status-banner">
    <div class="delete-banner-icon">
      <i class="fa-solid fa-triangle-exclamation fa-lg"></i>
    </div>
    <div class="delete-banner-body">
      <strong>¡Atención! Este lead será marcado como ELIMINADO.</strong>
      <span>Al guardar, desaparecerá del listado comercial y no será visible para el equipo.</span>
    </div>
    <div class="delete-banner-label">
      <span class="pill pill-red border">ELIMINADO</span>
    </div>
  </div>
</Transition>
    </main>

    <main class="exec-body pb-5 d-flex justify-content-center align-items-center" v-else style="min-height:50vh;">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin fa-2x text-slate-400 mb-3"></i>
        <p class="text-muted fw-600">Cargando formulario...</p>
      </div>
    </main>

  </div>


  <BaseModal v-model="showClientHistory" title="Historial Completo del Cliente" size="xl">
    <div v-if="loadingHistory" class="d-flex justify-content-center align-items-center py-5">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin fa-2x text-slate-400 mb-3"></i>
        <p class="text-muted fw-600">Cargando historial...</p>
      </div>
    </div>
    <div v-else class="d-flex flex-column">
      <div class="modal-info-bar">
        <div><small class="text-muted d-block">Cliente (Formulario)</small><strong>{{ form.full_name || 'Nombre Desconocido' }}</strong></div>
        <div><small class="text-muted d-block">Teléfono</small><strong>{{ form.telefono || '---' }}</strong></div>
      </div>
      <ul class="exec-tabs">
        <li>
          <a class="exec-tabs__item" :class="{ 'exec-tabs__item--active': activeHistoryTab === 'historico' }" href="#" @click.prevent="activeHistoryTab = 'historico'">
            <i class="fa-solid fa-list me-1"></i> Histórico
            <span v-if="clientHistoryLegacy.length" class="pill pill-slate border ms-1" style="font-size:.67rem;">{{ clientHistoryLegacy.length }}</span>
          </a>
        </li>
        <li>
          <a class="exec-tabs__item" :class="{ 'exec-tabs__item--active': activeHistoryTab === 'asesoria' }" href="#" @click.prevent="activeHistoryTab = 'asesoria'">
            <i class="fa-solid fa-headset me-1"></i> Asesoría / CRM
          </a>
        </li>
        <li>
          <a class="exec-tabs__item" :class="{ 'exec-tabs__item--active': activeHistoryTab === 'inscripcion' }" href="#" @click.prevent="activeHistoryTab = 'inscripcion'">
            <i class="fa-solid fa-graduation-cap me-1"></i> Inscripciones
          </a>
        </li>
      </ul>
      <div class="exec-tabs__panel">

        <div v-if="activeHistoryTab === 'historico'" class="fade-in">
          <div v-if="clientHistoryLegacy.length === 0" class="empty-state">No se encontró historial legado para este número.</div>
          <div v-else class="table-responsive">
            <table class="exec-table">
              <thead>
                <tr>
                  <th width="20%">Fecha</th>
                  <th width="40%">Programa / Interés</th>
                  <th width="30%">Nombre registrado</th>
                  <th width="10%">E. Cliente</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in clientHistoryLegacy" :key="i">
                  <td><small>{{ item.date }}</small></td>
                  <td><div class="fw-bold text-primary">{{ item.program }}</div></td>
                  <td>{{ item.full_name }}</td>
                  <td>{{ item.cat_client_moment_label }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeHistoryTab === 'asesoria'" class="fade-in">
          <div v-if="clientHistoryLeads.length === 0" class="empty-state">No se encontraron gestiones de CRM recientes.</div>
          <div v-else class="table-responsive">
            <table class="exec-table">
              <thead>
                <tr>
                  <th width="20%">Fecha Gestión</th>
                  <th width="35%">Interés / Edición</th>
                  <th width="20%">Asesor</th>
                  <th width="15%">Estatus</th>
                  <th width="10%" class="text-center">Intentos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(lead, i) in clientHistoryLeads" :key="i">
                  <td>
                    <div class="fw-semibold">{{ formatDateTime(lead.date).split(' ')[0] }} {{ formatDateTime(lead.date).split(' ')[1] }} {{ formatDateTime(lead.date).split(' ')[2] }}</div>
                    <small class="text-muted">{{ formatDateTime(lead.date).split(' ').slice(3).join(' ') }}</small>
                  </td>
                  <td>
                    <div class="fw-bold text-primary" style="font-size:.9rem">{{ lead.program || 'Sin programa' }}</div>
                    <div v-if="lead.edition">
                      <span class="pill pill-slate border mt-1">
                        <i class="fa-regular fa-calendar me-1"></i> {{ lead.edition }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <div class="user-avatar">{{ lead.user_registration_full_name ? lead.user_registration_full_name.charAt(0) : '?' }}</div>
                      <small class="text-truncate" style="max-width:110px" :title="lead.user_registration_full_name">{{ lead.user_registration_full_name || 'Sistema' }}</small>
                    </div>
                  </td>
                  <td>
                    <span class="pill border" :class="{
                      'pill-teal':  ['Inscrito','Pagó','Matriculado'].includes(lead.cat_status_lead_label),
                      'pill-amber': ['Interesado','En Seguimiento','Prox. Inicio'].includes(lead.cat_status_lead_label),
                      'pill-slate': ['Atendido'].includes(lead.cat_status_lead_label),
                      'pill-red':   ['No Interesado','Rechazado'].includes(lead.cat_status_lead_label),
                    }">{{ lead.cat_status_lead_label || 'Pendiente' }}</span>
                  </td>
                  <td class="text-center">
                    <span class="pill pill-slate border">
                      {{ lead.count_calling }} <i class="fa-solid fa-phone ms-1 text-muted" style="font-size:.65rem"></i>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeHistoryTab === 'inscripcion'" class="fade-in">
          <div class="table-responsive">
            <table class="exec-table">
              <thead>
                <tr>
                  <th width="15%">Fecha</th>
                  <th width="45%">Programa</th>
                  <th width="20%">Estado</th>
                  <th width="20%" class="text-center">Nota</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in hcEnrollmentData" :key="i">
                  <td><small>{{ item.fecha }}</small></td>
                  <td>
                    <div class="fw-bold">{{ item.programa }}</div>
                    <small class="text-muted">Edición: {{ item.edicion }}</small>
                  </td>
                  <td>
                    <span class="pill border" :class="item.estado === 'Finalizado' ? 'pill-teal' : 'pill-amber'">{{ item.estado }}</span>
                  </td>
                  <td class="text-center">
                    <span class="fw-bold" :class="item.nota >= 14 ? 'text-primary' : 'text-danger'">{{ item.nota || '-' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </BaseModal>


  <BaseModal v-model="showProgramDetail" title="Detalle del Programa" size="lg">
    <div v-if="loadingDetail" class="d-flex justify-content-center align-items-center py-5">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin fa-2x text-slate-400 mb-3"></i>
        <p class="text-muted fw-600">Cargando detalle...</p>
      </div>
    </div>
    <div v-else-if="modelProgramVersion" class="d-flex flex-column">
      <ul class="exec-tabs mt-2" v-if="hasEditions">
        <li>
          <a class="exec-tabs__item" :class="{ 'exec-tabs__item--active': activeTab === 'info' }" href="#" @click.prevent="activeTab = 'info'">
            <i class="fa-solid fa-file-lines me-1"></i> General
          </a>
        </li>
        <li>
          <a class="exec-tabs__item" :class="{ 'exec-tabs__item--active': activeTab === 'editions' }" href="#" @click.prevent="activeTab = 'editions'">
            <i class="fa-solid fa-calendar-days me-1"></i> Ediciones ({{ modelProgramVersion.editions_json.length }})
          </a>
        </li>
      </ul>
      <div class="exec-tabs__panel" :class="{'rounded-top': !hasEditions}">

        <div v-if="activeTab === 'info'" class="fade-in">
          <div class="text-center mb-4 mt-2">
            <h4 class="fw-bold text-primary mb-0">{{ modelProgramVersion.program_name }}</h4>
            <small class="text-muted">Versión: {{ modelProgramVersion.version_code }}</small>
          </div>
          <div class="row g-3 mb-4 text-center">
            <div class="col-4">
              <small class="d-block text-secondary mb-1">Tipo</small>
              <span class="pill pill-slate border">{{ modelProgramVersion.cat_type_program_label }}</span>
            </div>
            <div class="col-4">
              <small class="d-block text-secondary mb-1">Modalidad</small>
              <span class="pill pill-teal border">{{ modelProgramVersion.cat_model_modality_label }}</span>
            </div>
            <div class="col-4">
              <small class="d-block text-secondary mb-1">Sesiones</small>
              <span class="fw-bold fs-5">{{ modelProgramVersion.sessions }}</span>
            </div>
          </div>
          <div class="price-panel mb-4">
            <div class="price-panel__title">Precios Referenciales</div>
            <div class="row">
              <div class="col-6 border-end text-center">
                <small class="text-muted d-block">Estudiante</small>
                <div class="fw-bold">S/ {{ modelProgramVersion.price_student_soles }}</div>
                <small class="text-secondary">$ {{ modelProgramVersion.price_student_dollars }}</small>
              </div>
              <div class="col-6 text-center">
                <small class="text-muted d-block">Profesional</small>
                <div class="fw-bold">S/ {{ modelProgramVersion.price_profesional_soles }}</div>
                <small class="text-secondary">$ {{ modelProgramVersion.price_profesional_dollars }}</small>
              </div>
            </div>
          </div>
          <div class="d-grid" v-if="modelProgramVersion.link">
            <a :href="modelProgramVersion.link" target="_blank" class="btn-exec btn-exec-outline text-center">
              <i class="fa-solid fa-external-link-alt me-2"></i> Ver landing page / Temario
            </a>
          </div>
          <div v-if="!hasEditions" class="empty-state mt-3">
            <i class="fa-solid fa-calendar-xmark me-1"></i> No hay ediciones programadas visibles.
          </div>
        </div>

        <div v-if="activeTab === 'editions'" class="fade-in">
          <div class="editions-scroll-container">
            <div v-for="edition in modelProgramVersion.editions_json" :key="edition.edition_num_id" class="edition-card mb-3">
              <div class="edition-card__header">
                <div class="d-flex align-items-center gap-2">
                  <span class="pill pill-slate border">{{ edition.global_code }}</span>
                  <span class="fw-bold" style="font-size:.9rem">Inicio: {{ formatDate(edition.start_date) }}</span>
                </div>
                <span class="pill border"
                  :class="(edition.vacant !== null && edition.vacant !== undefined) ? (edition.vacant > 0 ? 'pill-teal' : 'pill-red') : 'pill-slate'">
                  {{ (edition.vacant !== null && edition.vacant !== undefined) ? (edition.vacant > 0 ? `${edition.vacant} Vacantes` : 'Lleno') : 'Sin Vacantes' }}
                </span>
              </div>
              <div class="edition-card__body">
                <div class="row g-2" style="font-size:.85rem" v-if="!edition.edition_children || edition.edition_children.length == 0">
                  <div class="col-md-6">
                    <strong class="text-secondary"><i class="fa-solid fa-chalkboard-user me-1"></i> Docente:</strong>
                    <div class="ms-3">{{ edition.instructor || 'Por asignar' }}</div>
                  </div>
                  <div class="col-md-6">
                    <strong class="text-secondary"><i class="fa-regular fa-clock me-1"></i> Horario:</strong>
                    <div class="ms-3" v-for="(sch, i) in edition.schedules" :key="i">{{ sch.day_combination_label }} {{ sch.hour_combination_label }}</div>
                    <div class="ms-3 text-muted fst-italic" v-if="!edition.schedules?.length">Sin horario definido</div>
                  </div>
                </div>
                <div v-if="edition.edition_children && edition.edition_children.length > 0" class="mt-3">
                  <div class="p-2 rounded border" style="background:var(--slate-50)">
                    <div class="fieldset-title mb-2" style="border:none;padding:0;margin:0 0 8px 0;">Estructura Académica / Módulos</div>
                    <div class="table-responsive">
                      <table class="exec-table exec-table--sm">
                        <thead>
                          <tr><th>Módulo</th><th>Fecha</th><th>Horario</th><th>Docente</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="child in edition.edition_children" :key="child.edition_num_id">
                            <td class="fw-bold text-primary">{{ child.abbreviation }}</td>
                            <td>{{ formatDate(child.start_date) }}</td>
                            <td>
                              <div v-for="(csch,ci) in child.schedules" :key="ci" style="line-height:1.1">
                                <small>{{ csch.day_combination_label }}</small>
                              </div>
                            </td>
                            <td><small class="text-truncate d-block" style="max-width:120px">{{ child.instructor }}</small></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    <div v-else class="empty-state py-5">No se encontró información detallada para este programa.</div>
  </BaseModal>


  <BaseModal v-model="showViewModal" title="Inscripción del Lead" size="xl">
    <div class="insc-modal">
      <div class="insc-header mb-3">
        <div class="insc-info">
  <h5 class="program-title d-flex align-items-center gap-2">
    {{ form.program_label || currentProgram?.description || '— Programa no seleccionado —' }}

    <!-- Botón con link -->
    <a
      v-if="form.program_link"
      :href="form.program_link"
      target="_blank"
      rel="noopener noreferrer"
      title="Ver página del programa"
      class="program-link-btn"
    >
      <i class="fa-solid fa-arrow-up-right-from-square"></i>
    </a>

    <!-- Botón deshabilitado -->
    <span
      v-else
      class="program-link-btn program-link-btn--disabled"
      title="Sin página web registrada"
    >
      <i class="fa-solid fa-arrow-up-right-from-square"></i>
    </span>
  </h5>

  <!-- Edición -->
  <div class="program-edition" v-if="form.program_modality_selected_alias !== 'we_modality_online'">
    <i class="fa-solid fa-calendar-days me-1" style="color:var(--slate-400);font-size:.8rem;"></i>
    <SearchSelect
      v-model="form.edition_id"
      mode="remote"
      :fetcher="searchEditionsFiltered"
      label-field="start_date_label"
      value-field="edition_num_id"
      :viewOpen="6"
      placeholder="Seleccionar edición..."
      :model-label="form.edition_label"
      :minChars="0"
      :cache="false"
      style="min-width: 180px; font-size: .85rem;"
      @change="onEditionChange"
    />
  </div>

  <!-- Si es online: solo muestra el label estático (sin selector) -->
  <div class="program-edition" v-else-if="form.edition_label">
    <i class="fa-solid fa-calendar-days me-1"></i>
    <span>Edición: {{ form.edition_label }}</span>
  </div>

  <!-- Meta usuario -->
  <div class="user-meta mt-2">

    <div class="user-badge">
      <div class="user-icon">
        <i class="fa-solid fa-user"></i>
      </div>
      <span class="user-name text-truncate">
        {{ form.telefono }}
      </span>
    </div>

    <!-- Tipo perfil -->
    <div
      v-if="clientProfileType"
      class="profile-badge"
      :class="clientProfileType === 'estudiante' ? 'is-student' : 'is-pro'"
    >
      <i
        class="fa-solid"
        :class="clientProfileType === 'estudiante'
          ? 'fa-graduation-cap'
          : 'fa-briefcase'"
      ></i>

      <span>
        {{ clientProfileType === 'estudiante' ? 'Estudiante' : 'Profesional' }}
      </span>
    </div>
    <!-- Aviso: sin ocupación seleccionada -->
<div
  v-if="!clientProfileType"
  class="profile-badge"
  style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;"
  title="Ve a 'Datos del Contacto' y selecciona una Ocupación"
>
  <i class="fa-solid fa-triangle-exclamation"></i>
  <span>Sin ocupación · precio no definido</span>
</div>

    <!-- B2B -->
    <div
      v-if="form.ocupacion_alias === 'we_prospect_situation_corporate'"
      class="profile-badge is-b2b"
    >
      <i class="fa-solid fa-handshake"></i>
      <span>B2B · Convenio</span>
    </div>

  </div>
</div>
        <div class="insc-price-box">
          <span class="price-label">Precio Base</span>
          <div class="price-amount d-flex align-items-center">
            <CurrencyInput
              v-model="insc.montoOriginal"
              :currency="selectedCurrency"
              :storeAsMinor="false"
              class="exec-input-light border-0 bg-transparent text-end p-0 fw-bold"
              style="font-size:1.5rem;color:var(--teal-600,#0d9488);max-width:150px"
              @update:model-value="priceManuallySet = true"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div class="exec-fieldset mb-3">
        <h6 class="fieldset-title">Datos del Cliente / Inscripción</h6>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="exec-label">T. documento <span class="c-red">*</span></label>
            <SearchSelect
                :viewOpen="6" required v-model="insc.cat_type_document" :items="docTypeCatalog" label-field="description" placeholder="T. DOCUMENTO" value-field="alias" class="exec-select-light w-100" />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Documento <span class="c-red">*</span></label>
            <div class="d-flex gap-2">  
              <input
                autocomplete="nope" required v-model="insc.document" type="text"
                :placeholder="docConfig.placeholder" class="exec-input-light w-100"
                :maxlength="docConfig.maxLength" @keyup.enter="searchCustomerByDocument"
                v-restrict="{ trim:true, spaces:false, max:docConfig.maxLength, ...(docConfig.isNumeric ? { only: 'numbers' } : {}), transform:'upper' }"
                :disabled="!insc.cat_type_document"
              />
              <button
                type="button"
                class="btn-exec btn-exec-outline px-0"
                style="height:38px;width:38px;flex-shrink:0;"
                :disabled="!insc.cat_type_document || !insc.document || searchingCustomer"
                @click="searchCustomerByDocument"
                title="Buscar cliente en base de datos"
              >
                <i class="fa-solid" :class="searchingCustomer ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"
                  style="color:var(--teal-600,#12274e);"></i>
              </button>
            </div>
            <small v-if="insc.document && insc.document.length !== docConfig.maxLength && docConfig.isNumeric"
                  class="text-warning d-block mt-1" style="font-size:.7rem">
              <i class="fa-solid fa-circle-exclamation me-1"></i> Se esperan {{ docConfig.maxLength }} dígitos
            </small>
          </div>
          <div class="col-md-4">
            <label class="exec-label">Correo <span class="c-red">*</span></label>
            <input
              autocomplete="nope" required v-model="insc.email" type="email"
              placeholder="CORREO" class="exec-input-light w-100"
              v-restrict="{ trim:true, spaces:false, transform:'lower', max: 100 }"
              :disabled="!insc.cat_type_document"
              :class="{
    'input-valid':   insc.email && isValidEmail(insc.email),
    'input-invalid': insc.email && !isValidEmail(insc.email)
  }"
            />
            <small
  v-if="insc.email && !isValidEmail(insc.email)"
  class="text-danger d-block mt-1"
  style="font-size:.7rem;font-weight:600"
>
  <i class="fa-solid fa-circle-exclamation me-1"></i>
  Formato inválido · ej: nombre@dominio.com
</small>
          </div>
          <div class="col-md-4">
            <label class="exec-label">Nombres <span class="c-red">*</span></label>
            <input
              autocomplete="nope" required v-model="insc.full_name" type="text"
              placeholder="NOMBRES" class="exec-input-light w-100"
              v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
              :disabled="!insc.cat_type_document"
            />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Apellido Paterno <span class="c-red">*</span></label>
            <input
              autocomplete="nope" required v-model="insc.last_name" type="text"
              placeholder="A. PATERNO" class="exec-input-light w-100"
              v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
              :disabled="!insc.cat_type_document"
            />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Apellido Materno <span class="c-red">*</span></label>
            <input
              autocomplete="nope" required v-model="insc.mother_last_name" type="text"
              placeholder="A. MATERNO" class="exec-input-light w-100"
              v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
              :disabled="!insc.cat_type_document"
            />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Modalidad del programa <span class="c-red">*</span></label>
            <SearchSelect :viewOpen="6" required v-model="insc.cat_insc_modality" :model-label="form.program_modality_label" :items="inscModalidades" label-field="description" placeholder="M. PROGRAMA" value-field="alias" class="exec-select-light w-100" />
          </div>
          <div class="col-md-4">

  <label class="exec-label">Estado del Certificado <span class="c-red">*</span></label>
  <SearchSelect
    :viewOpen="6"
    required
    v-model="insc.cat_certificate_status"
    :items="certificateStatusCatalog.filter(e=>e.alias !='we_certificate_status_generated')"
    label-field="description"
    placeholder="ESTADO CERTIFICADO"
    value-field="alias"
    class="exec-select-light w-100"
  />
</div>
        </div>
      </div>

<div class="exec-fieldset mb-3" v-if="isEdit || validateInscriptionClientInfo()">
        <h6 class="fieldset-title">Condiciones de Pago</h6>
        <div class="row g-3">

          <div class="col-md-3">
            <label class="exec-label">Canal de Pago <span class="c-red">*</span></label>
            <SearchSelect
              v-model="insc.cat_payment_channel"
              :items="paymentChannelCatalog"
              label-field="description"
              value-field="id"
              placeholder="CANAL..."
              required
              class="exec-select-light w-100"
            />
          </div>

          <template v-if="isChannelGeneral">
            <div class="col-md-2">
              <label class="exec-label">Moneda <span class="c-red">*</span></label>
              <SearchSelect :viewOpen="6" v-model="insc.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." class="exec-select-light w-100" />
            </div>
            <div class="col-md-3">
              <label class="exec-label">
                Modalidad de pago <span class="c-red">*</span>
              </label>
              <SearchSelect
                :viewOpen="6"
                v-model="insc.cat_type_payment"
                required
                :items="isOnlineProgram
                  ? inscPaymentModes.filter(e => e.alias === 'we_payment_way_single')
                  : inscPaymentModes"
                placeholder="M. PAGO"
                label-field="description"
                value-field="alias"
                class="exec-select-light w-100"
                :disabled="isOnlineProgram"
              />
            </div>
            <div class="col-md-3">
              <label class="exec-label">Medio de Pago <span class="c-red">*</span></label>
              <SearchSelect
                :viewOpen="6"
                v-model="insc.cat_method_payment"
                :items="paymentMethodCatalog.filter(e => ['we_payment_method_transfer','we_payment_method_cash','we_payment_method_yape_plin','we_payment_method_deposit'].includes(e.alias))"
                required
                label-field="description"
                value-field="alias"
                placeholder="MEDIO..."
                class="exec-select-light w-100"
              />
            </div>
            <div class="col-md-3" v-if="insc.cat_type_payment=='we_payment_way_installments'">
              <label class="exec-label">Adelanto / Reserva <span class="c-red">*</span></label>
              <CurrencyInput v-model="insc.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
            </div>
          </template>

          <template v-if="isChannelToken">
            <div class="col-md-2">
              <label class="exec-label">Moneda <span class="c-red">*</span></label>
              <SearchSelect :viewOpen="6" v-model="insc.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." class="exec-select-light w-100" />
            </div>
            <div class="col-md-2">
              <label class="exec-label">Proveedor del Link <span class="c-red">*</span></label>
              <SearchSelect
                v-model="insc.cat_token_provider"
                :items="tokenProviderCatalog"
                label-field="description"
                value-field="id"
                placeholder="Qulqi, MercadoPago..."
                required
                class="exec-select-light w-100"
              />
            </div>
            <div class="col-md-3">
              <label class="exec-label">Modalidad de pago <span class="c-red">*</span></label>
              <SearchSelect
                :viewOpen="6"
                v-model="insc.cat_type_payment"
                required
                :items="inscPaymentModes"
                placeholder="M. PAGO"
                label-field="description"
                value-field="alias"
                class="exec-select-light w-100"
              />
            </div>
            <div class="col-md-3" v-if="insc.cat_type_payment === 'we_payment_way_installments'">
              <label class="exec-label">Adelanto / Reserva <span class="c-red">*</span></label>
              <CurrencyInput v-model="insc.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
            </div>
            <div class="col-md-12 mt-1">
              <div class="p-2 rounded border bg-light text-info" style="font-size:.85rem; border-color: #bee5eb !important; background-color: #e2f3f5 !important;">
                <i class="fa-solid fa-link me-2"></i> Este pago se registrará en la hoja <strong>"TOKEN DIGITAL 2026"</strong>
              </div>
            </div>
          </template>

          <template v-if="isChannelWeb">
            <div class="col-md-12 mt-1">
              <div class="p-2 rounded border bg-light text-info" style="font-size:.85rem; border-color: #bee5eb !important; background-color: #e2f3f5 !important;">
                <i class="fa-solid fa-globe me-2"></i> El alumno realizó el pago directamente por la pasarela web. Se notificará al canal de <strong>Slack</strong> apenas envies.
              </div>
            </div>
          </template>

          <template v-if="isEdit || validateInscriptionPaymentInfo()">
            <!-- DESCUENTO % — oculto si hay promo activa -->
            <div class="col-md-4 mt-3" >
              <label class="exec-label">
                Descuento
                <span v-if="!insc.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
              </label>
              <SearchSelect
                :key="`porcent-${discountResetKey}`"
                v-model="insc.dsct_porcent_id"
                mode="remote"
                :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_percentage').id, cat_currency: selectedCurrencyAlias })"
                label-field="full_label" value-field="id" :viewOpen="6"
                placeholder="DESCUENTO (%)" :minChars="0" :cache="false"
                class="exec-select-light w-100"
                :disabled="!insc.montoOriginal"
                :model-label="insc.dsct_porcent_label"
                @change="onChangeDescuentoPorcentual"
              />
            </div>

            <!-- PROMOCIÓN (stick) — oculta si hay % o beneficio activo -->
            <div class="col-md-4 mt-3" >
              <label class="exec-label">
                Promoción
                <span v-if="!insc.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
              </label>
              <SearchSelect
                :key="`stick-${discountResetKey}`"
                v-model="insc.dsct_stick_id"
                mode="remote" :viewOpen="6"
                :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_fixed').id, cat_currency: selectedCurrency.alias })"
                label-field="full_label" value-field="id"
                placeholder="DESCUENTO (S/)" :minChars="0" :cache="false"
                class="exec-select-light w-100"
                :disabled="!insc.montoOriginal"
                :model-label="insc.dsct_stick_label"
                @change="onChangeDescuentoFijo"
              />
            </div>

            <!-- BENEFICIO — oculto si hay promo activa -->
            <div class="col-md-4 mt-3">
              <label class="exec-label">
                Beneficio(s)
                <span v-if="!insc.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
              </label>
              <MultiSelect
                :key="`benefit-${discountResetKey}`"
                v-model="insc.dsct_benefit_ids"
                 mode="remote" :debounce-ms="400" 
                :disabled="!insc.montoOriginal"
                label-key="full_label" value-key="id" 
                :fetcher="q => discountService.discountCaller({
                  q,
                  cat_discount_type: discountCatalog.find(e => e.alias === 'we_discount_type_benefit').id,
                  cat_currency: selectedCurrency.alias
                })"
                placeholder="BENEFICIOS..."
                @change="onChangeBeneficios"
              />
              <!-- Resumen inline de beneficios seleccionados -->
              <div v-if="insc.dsct_benefit_ids.length > 0" class="mt-1">
                <div
                  v-for="ben in insc.dsct_benefit_ids"
                  :key="ben.value"
                  class="d-flex justify-content-between align-items-center"
                  style="font-size:11px; color: #b91c1c; padding: 1px 4px;"
                >
                  <span>• {{ ben.label }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

<!-- LAYOUT: side-by-side cuando NO es General, stacked cuando sí -->
<div class="d-flex gap-3"
     v-if="isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())">

  <!-- Documentación Adjunta -->
  <div class="exec-fieldset mb-3" style="flex:1;min-width:0">
    <h6 class="fieldset-title">Documentación Adjunta</h6>
    <div class="row g-3">

      <!-- GENERAL: Comprobantes de pago → enrollment_attachments -->
      <div class="col-12" v-if="isChannelGeneral">
        <label class="exec-label mb-1">
          Comprobante(s) de Pago
          <span v-if="!isVoucherOptional" class="c-red">*</span>
          <span v-else class="ms-1 pill pill-teal border" style="font-size:9px;padding:1px 7px;">
            Opcional · Descuento 100%
          </span>
        </label>
        <MultiFileUploader
          v-model="insc.ticket_payment_urls"
          ref="voucherUploaderRef"
          label="Clic para subir Comprobante(s)"
          accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
          :required="insc.val_porcentaje==100?false:!isVoucherOptional"
          :minFiles="1"
          :touched="voucherTouched"
        />
      </div>

      <!-- WEB: Constancias → lead_attachments -->
      <div class="col-12" v-if="isChannelWeb">
        <label class="exec-label mb-1">Constancias / Adjuntos</label>
        <MultiFileUploader
          v-model="insc.attachments"
          required
          :minFiles="2"
          label="Adjuntar evidencias PAGO WEB"
          accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
        />
      </div>

      <!-- TOKEN: sin adjunto -->
      <div class="col-12" v-if="isChannelToken">
        <div class="p-3 rounded border text-muted" style="font-size:.83rem; background:#fafafa;">
          <i class="fa-solid fa-circle-info me-2 text-info"></i>
          Para pagos por link/token no se requiere adjuntar comprobante.
          El proveedor enviará la confirmación directamente.
        </div>
      </div>

      <!-- Carnet: solo en canal General -->
      <div class="col-12" v-if="isChannelGeneral && clientProfileType === 'estudiante' ">
        <label class="exec-label mb-2">Carnet / Documento ID</label>
        <FileUploader
          label="Subir carnet estudiantil"
          v-model="form.carnet_url"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
      </div>

    </div>
  </div>

  <!-- Observaciones -->
  <div class="exec-fieldset mb-3" style="flex:1;min-width:0">
    <h6 class="fieldset-title">Observaciones</h6>
    <textarea
      v-model="insc.observacions"
      class="exec-textarea w-100"
      required
      :rows="!isChannelGeneral ? 8 : 2"
      placeholder="Escribe aquí notas adicionales..."
      v-restrict="{ trim: true, max: 500 }"
    ></textarea>
  </div>

</div>



<div
  class="exec-fieldset mb-3"
  v-if="isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())"
>
  <div class="d-flex gap-3 flex-column flex-lg-row align-items-start">

    <!-- ══ RESUMEN DE TRANSACCIÓN (existente) ══ -->
    <div :style="isInstallmentMode ? 'flex:0 0 340px;min-width:280px' : 'flex:1'">
      <div class="summary-card">
        <div class="summary-header"><i class="fa-solid fa-receipt me-2"></i> Resumen de Transacción</div>
        <div class="summary-body">
          <div class="summary-row">
            <span class="label">Precio del programa</span>
            <span class="value text-muted">{{ selectedCurrency.symbol }} {{ fmt2(insc.montoOriginal) }}</span>
          </div>
          <div class="summary-row" v-if="insc.dsct_porcent_id">
            <span class="label">Descuento</span>
            <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ fmt2(insc.montoDescuentoPorcentaje) }}</span>
          </div>
          <div class="summary-row" v-if="insc.dsct_stick_id">
            <span class="label">
              Promoción
              <small class="text-muted ms-1" style="font-size:9px;">
                (precio fijo S/ {{ fmt2(insc.val_fijo) }})
              </small>
            </span>
            <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ fmt2(insc.montoDescuentoFijo) }}</span>
          </div>
          <template v-if="insc.dsct_benefit_ids.length > 0">
            <div
              class="summary-row"
              v-for="(ben, i) in insc.dsct_benefit_ids"
              :key="ben.value"
            >
              <span class="label" style="font-size:.8rem;">
                Beneficio {{ insc.dsct_benefit_ids.length > 1 ? (i + 1) : '' }}
                <small class="text-muted ms-1" style="font-size:.7rem;">{{ ben.label }}</small>
              </span>
              <span class="value text-danger">
                - {{ selectedCurrency.symbol }} {{ fmt2(insc.val_beneficios[i] || 0) }}
              </span>
            </div>
            <!-- Total beneficios si hay más de uno -->
            <div class="summary-row" v-if="insc.dsct_benefit_ids.length > 1" style="opacity:.7; font-size:.78rem;">
              <span class="label text-muted">Subtotal beneficios</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ fmt2(insc.montoBeneficioTotal) }}</span>
            </div>
          </template>
          <div class="summary-divider"></div>
          <div class="summary-row total">
            <div class="d-flex flex-column">
              <span class="label-total">MONTO FINAL A PAGAR</span>
              <small class="text-muted fw-normal" v-if="isInstallmentMode">
                Adelanto: {{ selectedCurrency.symbol }} {{ fmt2(insc.saved_money) }}
              </small>
            </div>
            <span class="value-total">{{ selectedCurrency.symbol }} {{ fmt2(insc.total_amount) }}</span>
          </div>
        </div>
      </div>
    </div>

<div v-if="isInstallmentMode" style="flex:1;min-width:0">
  <div class="installment-card">

    <!-- Cabecera -->
    <div class="installment-header">
      <div class="d-flex align-items-center gap-2">
        <i class="fa-solid fa-table-list text-primary"></i>
        <span class="fw-700" style="font-size:13px;">Plan de Cuotas</span>
        <span class="pill border ms-1" :class="manualMode ? 'pill-amber' : 'pill-slate'" style="font-size:9px;">
          {{ manualMode ? 'MANUAL' : 'AUTOMÁTICO' }}
        </span>
      </div>
      <div class="d-flex align-items-center gap-3">
        <!-- Selector nro cuotas en modo manual -->
        <div v-if="manualMode" class="d-flex align-items-center gap-2">
          <span style="font-size:11px;color:var(--slate-400)">N° cuotas:</span>
          <input
            type="number" v-model.number="numCuotasManual"
            min="1" max="12"
            @change="onNumCuotasManualChange"
            class="exec-input-light text-center"
            style="width:58px;height:28px;padding:3px 6px;font-size:12px;"
          />
        </div>
        <div v-else style="font-size:11px;color:var(--slate-400);">
          <i class="fa-solid fa-calendar-days me-1"></i>
          {{ autoNumCuotas }} cuota{{ autoNumCuotas !== 1 ? 's' : '' }}
        </div>
        <!-- Toggle manual/auto -->
        <button
          type="button"
          class="btn-exec btn-exec-sm"
          :class="manualMode ? 'btn-exec-warning' : 'btn-exec-outline'"
          @click="toggleManualMode"
          :title="manualMode ? 'Restaurar cálculo automático' : 'Editar plan manualmente'"
        >
          <i class="fa-solid" :class="manualMode ? 'fa-rotate-left' : 'fa-pen-to-square'"></i>
          {{ manualMode ? 'Restaurar auto' : 'Editar' }}
        </button>
      </div>
    </div>

    <!-- Alerta de validación en modo manual -->
    <div v-if="manualMode && !installmentPlanValid" class="installment-alert">
      <i class="fa-solid fa-triangle-exclamation me-1"></i>
      La suma de cuotas <strong>{{ selectedCurrency.symbol }} {{ fmt2(installmentTotalSum) }}</strong>
      debe ser igual al saldo financiado <strong>{{ selectedCurrency.symbol }} {{ fmt2(installmentRemainder) }}</strong>
    </div>
    <div class="installment-reserva-row" :class="{ 'is-split': reservaSplitEnabled }">

      <!-- Badge + Título -->
      <div class="reserva-id">
        <span class="cuota-num" style="background:#dbeafe;color:#1e40af;">R</span>
        <div>
          <div class="fw-700" style="font-size:12px;">Reserva / Pago Inicial</div>
          <div style="font-size:10px;color:var(--slate-400);">Abono inicial al confirmar</div>
        </div>
      </div>

      <!-- Zona de montos -->
      <div class="reserva-amounts">
        <!-- Sin split: monto directo -->
        <div v-if="!reservaSplitEnabled" class="reserva-single">
          <span class="fw-700" style="font-size:15px;color:#1d4ed8;">
            {{ selectedCurrency.symbol }} {{ fmt2(insc.saved_money) }}
          </span>
        </div>

        <!-- Con split: 2 filas -->
        <template v-else>
          <div class="reserva-split-line">
            <span class="reserva-tag" style="background:#dbeafe;color:#1e40af;">Hoy</span>
            <CurrencyInput
              v-model="reservaInmediata"
              :currency="selectedCurrency"
              :storeAsMinor="false"
              class="exec-input-light text-end fw-700"
              style="font-size:13px;color:#1d4ed8;max-width:110px;height:28px;padding:3px 8px;"
              placeholder="0.00"
            />
          </div>
          <div class="reserva-split-line">
            <span class="reserva-tag" style="background:#fef3c7;color:#92400e;">Diferido</span>
            <span class="fw-700" style="font-size:13px;color:#b45309;min-width:80px;text-align:right;">
              {{ selectedCurrency.symbol }} {{ fmt2(reservaDiferida) }}
            </span>
            <i class="fa-solid fa-arrow-right" style="color:#94a3b8;font-size:9px;"></i>
            <BaseDatePicker
              v-model="reservaDiferidaFecha"
              :config="{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', allowInput: false, disableMobile: true }"
              style="max-width:105px;"
            />
          </div>
          <div v-if="Number(reservaInmediata) >= Number(insc.saved_money)" class="reserva-error">
            <i class="fa-solid fa-triangle-exclamation"></i>
            El monto inmediato no puede igualar o superar la reserva total.
          </div>
        </template>
      </div>

      <!-- Acciones -->
      <div class="reserva-actions">
        <span class="pill" style="background:#dbeafe;color:#1e40af;font-size:9px;">Inicial</span>
        <button
          type="button"
          class="btn-exec btn-exec-sm"
          :class="reservaSplitEnabled ? 'btn-exec-warning' : 'btn-exec-outline'"
          @click="reservaSplitEnabled = !reservaSplitEnabled"
          title="Aplazar parte de la reserva como cuota adicional"
        >
          <i class="fa-solid" :class="reservaSplitEnabled ? 'fa-xmark' : 'fa-scissors'"></i>
          {{ reservaSplitEnabled ? 'Cancelar' : 'Aplazar parte' }}
        </button>
      </div>

    </div>

    <div class="installment-divider"><span>Cuotas del plan</span></div>

    <!-- Tabla de cuotas -->
    <div class="installment-body">
      <div class="installment-row installment-row--head">
        <span>#</span>
        <span>Vencimiento</span>
        <span class="text-end">Monto</span>
        <span class="text-center">Estado</span>
      </div>

      <div
        v-for="(cuota, idx) in installmentPlan"
        :key="cuota.installment_number"
        class="installment-row"
        :class="{
            'installment-row--invalid': manualMode && !installmentPlanValid,
            'installment-row--diferida': cuota.is_reserva_diferida
          }" 
      >
        <!-- Número -->
        <span class="cuota-num">{{ cuota.installment_number }}</span>

        <!-- Fecha -->
        <BaseDatePicker
          :model-value="cuota.due_date"
          :config="{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', allowInput: false, disableMobile: true }"
          :disabled="!manualMode || cuota.is_reserva_diferida || cuota._editableIdx === -1"
          @update:model-value="val => cuota._editableIdx !== -1 && updateEditableDate(cuota._editableIdx, val)"
          class="w-100"
        />

        <!-- Monto -->
        <div class="d-flex justify-content-end">
          <CurrencyInput
            :model-value="cuota.amount"
            @update:model-value="val => cuota._editableIdx !== -1 && updateEditableAmount(cuota._editableIdx, val)"
            :currency="selectedCurrency"
            :storeAsMinor="false"
            :disabled="!manualMode || cuota.is_reserva_diferida || cuota._editableIdx === -1"
            :class="['cuota-currency-input', { 'is-invalid': manualMode && !installmentPlanValid }]"
            placeholder="0.00"
          />
        </div>

        <!-- Estado -->
        <div class="text-center">
          <span v-if="cuota.is_reserva_diferida" 
                class="pill" style="background:#fef3c7;color:#92400e;font-size:9.5px;">
            Reserva
          </span>
          <span class="pill pill-draft" v-else>Borrador</span>
        </div>
      </div>

      <!-- Saldo financiado -->
      <div class="installment-row installment-row--total">
        <span></span>
        <span class="fw-700 text-muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;">
          Saldo financiado
        </span>
        <span class="text-end fw-700" :class="installmentPlanValid ? 'c-green' : 'text-danger'">
          {{ selectedCurrency.symbol }} {{ fmt2(installmentTotalSum) }}
        </span>
        <span></span>
      </div>

      <!-- Gran total -->
      <div class="installment-row installment-row--grand">
        <span></span>
        <span class="fw-700" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;">
          Total (Reserva + Cuotas)
        </span>
        <span class="text-end fw-700" style="font-size:14px;color:var(--navy-900);">
         {{ fmt2(round2(
            (reservaSplitEnabled ? Number(reservaInmediata) : Number(insc.saved_money || 0))
            + installmentTotalSum
          )) }}
        </span>
        <span></span>
      </div>
    </div>

    <!-- Nota -->
    <div class="installment-footer-note">
      <i class="fa-solid fa-circle-info me-1 text-primary"></i>
      <span v-if="manualMode">Modo manual activo. Ajusta montos y fechas según lo acordado con el alumno.</span>
      <span v-else>Las fechas y montos son referenciales. Finanzas aprobará el plan antes de activarlo.</span>
    </div>

  </div>
</div>

  </div>
</div>


    </div>

    <template #footer>
      <button class="btn-exec btn-exec-ghost btn-exec-sm" @click="showViewModal = false">Cerrar</button>
      <button
  class="btn-exec btn-exec-primary btn-exec-sm"
  @click="confirmarInscripcion"
  :disabled="
  savingInsc ||
  form.enrollment_id ||
  (isInstallmentMode && !installmentPlanValid) ||
  (isInstallmentMode && reservaSplitEnabled && !reservaSplitValid)
"
>
        <i class="fa-solid fa-spinner fa-spin me-1" v-if="savingInsc"></i>
        {{ savingInsc ? 'Guardando...' : 'Guardar inscripción' }}
      </button>
    </template>
  </BaseModal>
<BaseModal v-model="showDeleteWarningModal" title="" size="sm" :hideHeader="true">
  <div class="delete-confirm-modal">
    <div class="delete-confirm-icon">
      <i class="fa-solid fa-trash-can fa-2x"></i>
    </div>
    <h5 class="delete-confirm-title">¿Eliminar este lead?</h5>
    <p class="delete-confirm-desc">
      Al confirmar, este lead será marcado como <strong>Eliminado</strong> y 
      <strong>desaparecerá del listado comercial</strong>. Esta acción puede 
      revertirse desde administración si es necesario.
    </p>
    <div class="delete-confirm-lead-info">
      <i class="fa-solid fa-user me-2 text-muted"></i>
      <span class="fw-bold">{{ form.full_name || '—' }}</span>
      <span class="text-muted ms-2">{{ form.telefono || '' }}</span>
    </div>
  </div>
  <template #footer>
    <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showDeleteWarningModal = false">
      <i class="fa-solid fa-arrow-left me-1"></i> Cancelar
    </button>
    <button
      class="btn-exec btn-exec-danger btn-exec-sm"
      @click="confirmarEliminacion"
      :disabled="saving"
    >
      <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-trash-can'" ></i>
      {{ saving ? 'Eliminando...' : 'Sí, eliminar del listado' }}
    </button>
  </template>
</BaseModal>
</template>

<script setup>
  import { ref, reactive, computed, onMounted, inject, nextTick, onBeforeUnmount, watch} from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useToast } from 'vue-toastification'
import MultiSelect from '@/components/MultiSelect.vue' 
import MultiFileUploader from '@/components/MultiFileUploader.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue';

import FileUploader from '@/components/FileUploader.vue'
  const toast = useToast()

  import CurrencyInput from '@/components/CurrencyInput.vue'
  import BaseModal from '@/components/BaseModal.vue'
  import SearchSelect from '@/components/SearchSelect.vue'
  import DateTime12 from '@/components/DateTime12.vue'

  import { ServiceKeys } from '@/services'

  const router = useRouter()
  const route  = useRoute()

const storedUserStr = localStorage.getItem('user')
const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const pastDateConfig = {
    minDate: sevenDaysAgo,
    maxDate: 'today' // Bloquea fechas futuras
};
const inscInitialized = ref(false)
// Configuración 2: Fechas futuras o presentes (Para Seguimientos)
// El usuario puede elegir desde HOY hacia el futuro.
const futureDateConfig = {
    minDate: 'today' // Bloquea fechas pasadas
};

const dateLimitConfig = {
    minDate: sevenDaysAgo
};
  const programService   = inject(ServiceKeys.Program)
  const comercialService = inject(ServiceKeys.Comercial)
  const customerService = inject(ServiceKeys.Customer)
  const discountService = inject(ServiceKeys.Discount)
  const editionService = inject(ServiceKeys.Edition)
  const catalog          = inject('catalog')

  const todayIso = new Date().toISOString().slice(0, 16)
const showDeleteWarningModal = ref(false)
const isDeleteStatus = computed(() => form.status_alias === 'we_lead_status_deleted')
  function currentHourIso() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const dd   = String(now.getDate()).padStart(2, '0')
  const hh   = String(now.getHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:00:00`
}
const paymentChannelCatalog = ref(catalog.options('we_payment_channel'))
const certificateStatusCatalog = ref(catalog.options('we_certificate_status'))
const tokenProviderCatalog  = ref(catalog.options('we_token_provider'))
const lAttempts = ref(catalog.options('we_attempt'))
  const leadIdParam = computed(() => {
    const raw = route.params?.id
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  })
  const isEdit = computed(() => !!leadIdParam.value)
const voucherUploaderRef = ref(null)
const voucherTouched     = ref(false)
const discountResetKey = ref(0)
  const loaded          = ref(false)
  const saving          = ref(false)
  const savingInsc      = ref(false)
  const showViewModal   = ref(false)
  const leadDataHistory = ref(false)
  const createdLeadId   = ref(null)
  const createdPersonId = ref(null)
// Variables reactivas para el modal
const showProgramDetail = ref(false);
const selectedProgram = ref(null);
const activeTab = ref('info'); // 'info' | 'editions'
const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

  const form = reactive({
    query_alias: null,
    category_alias: null,
    program_modality_alias: null,

  fechaContactoInicial: currentHourIso(),
    web: false,
    program_link: null,
  count_children: 0,
    price_student_soles:       0,
price_student_dollars:     0,
price_profesional_soles:   0,
price_profesional_dollars: 0,
    b2b: false,
    program_modality_selected_alias: null,
    program_version_id: null,
    cat_client_moment_alias:null,
    membership_moment_id: null,
    membership_tier_label:null,
    edition_id: null,
    link: null,
    client_status: null,
    client_status_label: null,
    enrollment_id: null,
    full_name: '',
    nombre: '',
    telefono: '',
    status_alias: null,
    country_alias: null,
    ocupacion_alias: null,
    bot: false,
    pay_date: null,
    nivel_alias: null,
    prox_medium_alias: null,
    mensajeChat: '',
    canal_alias: null,
    medium_alias: null,
    key_word_alias: null,
    strategy_alias: null,
    observacion: '',
    categoriaCliente: 'NEW',
    categoriaMember: '',
    contactos: [],
    program_sessions:           0,
    program_sessions_per_week:  1,
    edition_start_date:         null,

  })

  const insc = reactive({
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    saved_money: 0,
    selectedCurrencyAlias: '',
    modalidadPrograma: 'NORMAL',
    cat_insc_modality: 'we_insc_modality_normal',
    cat_certificate_status: null,
    promocion_id: null,
    descuento_id: null,
    dsct_porcent_label: null,
    dsct_stick_label: null,
    dsct_benefit_label: null,
    cat_method_payment: null,
    modalidadPago: 'CONTADO',
    montoOriginal: 0,  
    dsct_benefit_ids: [],
    val_beneficios: [],
    val_porcentaje: 0,
    val_fijo: 0,
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficioTotal: 0,
    montoFinal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,
    ticket_payment_urls: [],
    attachments: [],
  cat_payment_channel: null,    // we_channel_general | we_channel_token | we_channel_web
  cat_token_provider: null,
  })


// Comprobante opcional cuando el descuento porcentual es exactamente 100
const isVoucherOptional = computed(() =>
  !isChannelGeneral.value || Number(insc.val_porcentaje) === 100
)

watch(() => insc.cat_payment_channel, () => {
  insc.cat_token_provider    = null
  insc.cat_method_payment    = null
  insc.ticket_payment_urls   = []
  insc.attachments           = []
  voucherTouched.value       = false
})
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

// 3. LIMPIEZA DE TIMERS AL SALIR
onBeforeUnmount(() => {
  if (form.contactos) {
    form.contactos.forEach(item => {
      if (item.timerId) clearInterval(item.timerId)
    })
  }
})
const channelAlias = computed(() => {
  if (!insc.cat_payment_channel) return null
  return paymentChannelCatalog.value
    .find(c => c.id === insc.cat_payment_channel)?.alias ?? null
})

const isChannelGeneral = computed(() => channelAlias.value === 'we_channel_general')
const isChannelToken   = computed(() => channelAlias.value === 'we_channel_token')
const isChannelWeb     = computed(() => channelAlias.value === 'we_channel_web')

// Resetear tab al abrir modal
watch(showProgramDetail, (val) => {
  if (val) activeTab.value = 'info';
});

// Formateador de fechas simple (Ej: 20 Ene 2025)
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
  return new Date(dateString).toLocaleDateString('es-PE', options);
};

  const leadStatusCatalog        = ref(catalog.options('we_lead_status'))
  const leadInterestCatalog      = ref(catalog.options('we_lead_interest'))
  const countryCatalog = ref(
    catalog.options('we_country', {
      mapItem: x => ({
        id: x.id,
        description: `(${String(x?.variable_2)}) - ${x.description}`,
        alias: x.alias,
        variable_3: x.variable_3,
        variable_2: x.variable_2,
        variable_1: x.variable_1,
        raw: x
      })
    })
  )



  const momentCatalog           = ref(catalog.options('we_moment'))
  const clientCatalog           = ref(catalog.options('we_client'))
  const prospectSituationCatalog = ref(
    catalog.options('we_prospect_situation', {
      mapItem: x => ({
        id: x.id,
        description: `(${String(x?.variable_1)}) - ${x.description}`,
        alias: x.alias,
        variable_3: x.variable_3,
        raw: x
      })
    })
  )
  const strategyCatalog         = ref(catalog.options('we_type_strategy'))
  const mktWordsCatalog         = ref(catalog.options('we_key_word'))
  const socialMediaCatalog      = ref(catalog.options('we_social_media'))
  const contactAttemptStatusCat = ref(catalog.options('we_follow_lead'))
  const programCategoryCatalog  = ref(catalog.options('we_program_category'))
  const queryCatalog            = ref(catalog.options('we_category_query'))
  const inscModalidades         = ref(catalog.options('we_insc_modality'))
  const discountCatalog         = ref(catalog.options('we_discount_type'))
  const paymentMethodCatalog    = ref(catalog.options('we_payment_method'))
  const docTypeCatalog          = ref(catalog.options('we_type_document'))
  const programTypeCatalog      = ref(catalog.options('we_program_type'))
  const programModalityCatalog  = ref(catalog.options('we_modality'))
  const inscPaymentModes        = ref(catalog.options('we_payment_way'))
  //we_calling
  const callingCatalog          = ref(catalog.options('we_calling'))
  const attemptOriginCatalog    = ref(catalog.options('we_attempt_origin') || [])
// 1. Inicializa la lista vacía (un array vacío para evitar errores en el v-for/items)
const membershipList = ref([]);

  const currencyCatalog         = ref(
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


  // --- VARIABLES PARA EL MODAL DE HISTORIAL CLIENTE ---
const showClientHistory = ref(false)
const activeHistoryTab = ref('historico')

// Función auxiliar para estilos de badge (puedes borrarla si no la usas)
const getBadgeClass = (status) => {
  switch(status) {
    case 'Matriculado': return 'bg-success';
    case 'En Seguimiento': return 'bg-warning text-dark';
    case 'No Interesado': return 'bg-danger';
    default: return 'bg-secondary';
  }
}


const minDateForNewAttempt = computed(() => {
  const existing = form.contactos.filter(c => c.id)
  if (!existing.length) return null
  const dates = existing
    .map(c => new Date(c.fechaContactoProximo))
    .filter(d => !isNaN(d))

  if (!dates.length) return null

  // Obtenemos la máxima fecha del historial
  const maxHistoryDate = new Date(Math.max(...dates))
  const today = new Date()
  today.setHours(0,0,0,0) // Normalizamos hoy a la medianoche

  // Si la fecha del historial es menor a hoy, forzamos "hoy" como mínimo
  return maxHistoryDate < today ? today : maxHistoryDate
})

const hcEnrollmentData = ref([
  { fecha: '05 Dic 2025', programa: 'Power BI para Analistas', edicion: '2025-I', estado: 'En Curso', nota: null },
  { fecha: '10 Jun 2024', programa: 'SQL Server Database', edicion: '2024-II', estado: 'Finalizado', nota: 18 },
  { fecha: '15 Ene 2024', programa: 'Python for Data', edicion: '2024-I', estado: 'Finalizado', nota: 12 },
])

function onChangeDescuentoPorcentual(opt) {
  if (!opt) {
    insc.val_porcentaje = 0
    insc.dsct_porcent_label = null
    return
  }
  insc.val_porcentaje = Number(opt.value) || 0
  insc.dsct_porcent_label = opt.full_label || opt.label || null 
}
 
// Función auxiliar para redondear correctamente a 2 decimales (evita errores de punto flotante)
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100

watch(
  () => [
    insc.montoOriginal,
    insc.val_porcentaje,
    insc.val_fijo,
    insc.val_beneficios,
    insc.dsct_porcent_id,
    insc.dsct_stick_id,
    insc.dsct_benefit_ids,
  ],
  () => {
    const base = parseFloat(insc.montoOriginal) || 0

    // 1. Descuento porcentual
    let montoPorcentaje   = round2((base * (insc.val_porcentaje || 0)) / 100)
    let subtotalAfterPct  = round2(base - montoPorcentaje)

    // 2. Promoción fija
    let montoFijo = 0
    const promoTarget = round2(parseFloat(insc.val_fijo) || 0)
    if (insc.dsct_stick_id && promoTarget > 0) {
      montoFijo = round2(subtotalAfterPct - promoTarget)
      if (montoFijo < 0) montoFijo = 0
    }
    const subtotalAfterStick = (insc.dsct_stick_id && promoTarget > 0)
      ? promoTarget
      : subtotalAfterPct

    // 3. Beneficios múltiples
    const montoBeneficioTotal = round2(
      (insc.val_beneficios || []).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
    )

    // Validación: descuentos no superan base
    const totalDescuentos = round2(montoPorcentaje + montoFijo + montoBeneficioTotal)
    if (totalDescuentos > base) {
      toast.warning('¡Cuidado! Los descuentos superan el Precio Base.')
      insc.val_porcentaje   = 0; insc.dsct_porcent_id   = null
      insc.val_fijo         = 0; insc.dsct_stick_id     = null
      insc.val_beneficios   = []; insc.dsct_benefit_ids = []
      discountResetKey.value++
      insc.montoDescuentoPorcentaje = 0
      insc.montoDescuentoFijo       = 0
      insc.montoBeneficioTotal      = 0
      insc.total_amount             = base
      return
    }

    insc.montoDescuentoPorcentaje = montoPorcentaje
    insc.montoDescuentoFijo       = montoFijo
    insc.montoBeneficioTotal      = montoBeneficioTotal

    const final = round2(subtotalAfterStick - montoBeneficioTotal)
    insc.total_amount = final > 0 ? Math.floor(final) : 0
  },
  { deep: true }
)

 
  function onChangeDescuentoFijo(opt) {
    if (!opt) {
      insc.val_fijo = 0
      insc.dsct_stick_label = null
      return
    }
    insc.val_fijo = Number(opt.value) || 0
    insc.dsct_stick_label = opt.full_label || opt.label || null
  }

  function onChangeBeneficios(selectedItems) {
    insc.dsct_benefit_ids = selectedItems
    insc.val_beneficios   = selectedItems.map(i => parseFloat(i.raw?.value || 0)) 
  }

    const montoFinalCalculado = computed(() => {
      const base = Number(insc.montoOriginal) || 0
      const dscto = Number(insc.totalDescuentos) || 0
      return base - dscto
  })

  const selectedCurrency = computed(
    () =>
      currencyCatalog.value.find(i => i.alias === insc.selectedCurrencyAlias)?.raw ??
      { alias:'we_currency_soles', code:'PEN', symbol:'S/.', minorUnit:2, locale:'es-PE', decimal:'.', thousands:',', position:'prefix', allowNegative:false, allowZero:false }
  )

  const programs = ref([])
  const editions = ref([])
  const currentProgram = computed(() => {
    if (!form.program_version_id) return null
    return programs.value.find(p => p.id === form.program_version_id) || null
  })
const currentEdition = ref(null)  // reemplazar el computed por un ref


  function idByAlias(alias, list = []) {
    if (!alias) return null
    const it = list.find(i => i.alias === alias || i.raw?.alias === alias)
    return it?.id ?? null
  }
  function aliasById(id, list = []) {
    if (!id) return null
    const it = list.find(i => i.id === id || i.raw?.id === id)
    return it?.alias ?? null
  }
  watch(() => form.web, (val) => {
    if (val) form.b2b = false
  })

  watch(() => form.b2b, (val) => {
    if (val) form.web = false
  })
function normalizeDateTime(v) {
  if (!v) return ''
  // Recortar a 19 chars elimina .000Z o cualquier sufijo de timezone
  const s = String(v).slice(0, 19).replace('T', ' ')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 09:00:00`
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(s)) return `${s}:00`
  return s
}
  async function loadLead(id) {
    console.log(id)
    const data = await comercialService.leadGet({ id })

    const l = data?.lead || data || {}

    const modality_selected_alias = l.cat_program_modality_alias ?? l.program_modality_alias ?? null
    console.log(l)
    Object.assign(form, {
      fechaContactoInicial: normalizeDateTime(l.first_contact_date || l.registration_date) || todayIso,
      query_alias: l.query_alias ?? null,
      category_alias: l.cat_program_type_alias || l.category_alias || null,
      program_modality_alias: l.cat_program_modality_alias || l.program_modality_alias || null,
      program_modality_selected_alias: modality_selected_alias,
      web: l.web === 'Y' || l.web === true,
      b2b: l.b2b === 'Y' || l.b2b === true,
      program_version_id: l.program_version_id ?? null,
      edition_id: l.program_edition_id ?? l.edition_id ?? null,
      full_name: l.full_name ?? l.full_name_label ?? '',
      telefono:  l.origin_phone ?? l.phone ?? '',
      count_children: Number(l.count_children || 0),
      status_alias:   l.status_alias,
      country_alias:  l.country_alias,
      ocupacion_alias: l.ocupacion_alias,
      client_status: l.client_status,
      client_status_label: l.client_status_label,
      membership_moment_id: l.membership_moment_id,
      membership_tier_label: l.membership_tier_label,
      cat_client_moment_alias:l.cat_client_moment_alias,
      cat_client_moment_label: l.cat_client_moment_label,
      bot: l.bot!='N',
      active: l.active!='N',
      program_label: l.program_label ?? null,
      edition_label: l.edition_label ?? null,
      query_label: l.query_label ?? null,
      ocupacion_label: l.ocupacion_label ?? null,
      status_label: l.status_label ?? null,
  edition_start_date: l.edition_start_date || null,
      interest_label: l.interest_label ?? null,
      channel_label: l.channel_label ?? null,
      medium_label: l.medium_label ?? null,
      key_word_label: l.key_word_label ?? null,
      strategy_label: l.strategy_label ?? null,
      pay_date: l.pay_date ? String(l.pay_date).slice(0, 10) : null,
      nivel_alias: l.interest_alias,
      mensajeChat: l.message_init_conversation ?? '',
      canal_alias:  l.channel_alias,
      medium_alias: l.medium_alias,
      key_word_alias: l.key_word_alias ?? aliasById(l.key_word_alias, mktWordsCatalog.value),
      strategy_alias: l.strategy_alias,
      price_student_soles:       Number(l.price_student_soles    || 0),
      price_student_dollars:     Number(l.price_student_dollars  || 0),
      price_profesional_soles:   Number(l.price_profesional_soles   || 0),
      price_profesional_dollars: Number(l.price_profesional_dollars || 0),
       program_sessions:           Number(l.sessions || l.program_sessions || 0),
  program_sessions_per_week:  Number(l.sessions_per_week || l.program_sessions_per_week || 1),

      enrollment_id: l.enrollment_id,
      program_link: l.program_link ?? null,
      observacion: l.observations ?? '',
     contactos: (l.contact_attempts || []).map(att => {
        // 🔴 BUSCAMOS EL LABEL DEL ORIGEN BASADOS EN EL ALIAS QUE MANDA EL SP
        const originAlias = att.cat_creation_origin; // Este es el alias que inyectamos en el SP (ej. 'we_origin_rule_3days')
        const originObj = attemptOriginCatalog.value.find(o => o.alias === originAlias);

        return {
          id: att.lead_contact_attempt_id,
          status_alias: att.cat_status_alias,
          cat_type_attempt: att.cat_type_attempt_alias || 'we_attempt_call',
          calling_alias: att.cat_result_alias,
          calling_label: att.cat_result_label,
          status_label: att.cat_status_label,
          fechaContactoProximo: normalizeDateTime(att.contact_datetime),
          respuesta: att.response || '',
          contact_duration: att.contact_duration || 0,
          cat_reschedule_origin: att.cat_reschedule_origin || null,  // ← NUEVO
          was_rescheduled: !!att.cat_reschedule_origin,              // ← flag visual
          reschedule_label: att.cat_reschedule_origin_label || null,
          timerActive: false,
          timerId: null,

          // 🔴 NUEVAS PROPIEDADES PARA RENDERIZAR EN PANTALLA
          cat_creation_origin_alias: originAlias || 'we_origin_manual',
          cat_creation_origin_label: originObj ? originObj.description : 'Gestión Manual'
        }
      }),

      enrollment_id: l.enrollment_id

    })

    createdLeadId.value   = l.id ?? l.lead_id ?? id
    createdPersonId.value = l.person_id ?? null
  }
const docConfig = computed(() => {
  // Buscamos el objeto completo en el catálogo usando el alias seleccionado
  const selected = docTypeCatalog.value.find(item => item.alias === insc.cat_type_document);
    console.log(selected)
  // Obtenemos variable_1 (longitud). Si no existe, default a 15.
  const maxLength = selected?.variable_1 ? Number(selected.variable_1) : 15;

  // Detectamos si debe ser solo números.
  // Usualmente DNI (2.300) y RUC (2.301) son numéricos.
  // Pasaporte y Carnet de Extranjería suelen permitir letras.
  const isNumeric = ['we_type_document_dni', 'we_type_document_ruc'].includes(insc.cat_type_document);

  return {
    maxLength,
    isNumeric,
    placeholder: isNumeric ? `MÁX. ${maxLength} DÍGITOS` : `MÁX. ${maxLength} CARACTERES`
  };
});

// Watcher para limpiar/ajustar si cambia el tipo
watch(() => insc.cat_type_document, (newVal) => {
  // 1. Si el tipo de documento es nulo (se limpió), borramos los datos que dependen de él
  if (!newVal) {
    insc.document = '';
    insc.email = '';
    insc.full_name = '';
    insc.last_name = '';
    insc.mother_last_name = '';
    return;
  }

  if (!insc.document) return;

  // 2. Recortar si el nuevo tipo es más corto que el valor actual
  if (docConfig.value.maxLength && insc.document.length > docConfig.value.maxLength) {
     insc.document = insc.document.slice(0, docConfig.value.maxLength);
  }

  // 3. Si cambiamos a numérico y hay letras, limpiar letras
  if (docConfig.value.isNumeric && isNaN(Number(insc.document))) {
     insc.document = insc.document.replace(/\D/g, '');
  }
});

  async function loadDataForCloning(sourceId) {
      try {
      console.log(sourceId)
          const originalData = await comercialService.leadGet({ id: sourceId })

          Object.assign(form, { 
              fechaContactoInicial: currentHourIso(),
              query_alias: originalData.query_alias ?? null,
              category_alias: originalData.cat_type_program_alias || originalData.category_alias || null,
              program_modality_alias: originalData.program_modality_alias ?? null,
              program_modality_selected_alias: originalData.program_modality_alias  ?? null,
              program_version_id: originalData.program_version_id ?? null,
              edition_id: originalData.program_edition_id ?? originalData.edition_id ?? null,
              full_name: originalData.full_name ?? originalData.full_name_label ?? '',
              telefono: originalData.origin_phone ?? originalData.phone ?? '',
              status_alias: 'we_lead_status_atendido',
              country_alias: originalData.country_alias,
              client_status: originalData.client_status,
              client_status_label: originalData.client_status_label,
              ocupacion_alias: originalData.ocupacion_alias,
              bot: false,
              active: true,
              program_label: originalData.program_label ?? null,
              edition_label: originalData.edition_label ?? null,
              query_label: originalData.query_label ?? null,
              ocupacion_label: originalData.ocupacion_label ?? null,

              pay_date: null,
              nivel_alias: 'we_lead_interest_low',
              mensajeChat: originalData.message_init_conversation ?? '',
              canal_alias: originalData.channel_alias,
              medium_alias: originalData.medium_alias,
              key_word_alias: originalData.key_word_alias ?? aliasById(originalData.key_word_alias, mktWordsCatalog.value),
              strategy_alias: originalData.strategy_alias,
              observacion: originalData.observations ?? '',
              categoriaCliente: originalData.t_lead ?? 'NEW',
              categoriaMember: originalData.membresia ?? '',

      // ✅ AGREGAR ESTOS — son los que faltaban
      price_student_soles:       Number(originalData.price_student_soles    || 0),
      price_student_dollars:     Number(originalData.price_student_dollars  || 0),
      price_profesional_soles:   Number(originalData.price_profesional_soles   || 0),
      price_profesional_dollars: Number(originalData.price_profesional_dollars || 0),
      program_sessions:          Number(originalData.sessions || originalData.program_sessions || 0),
      program_sessions_per_week: Number(originalData.sessions_per_week || originalData.program_sessions_per_week || 1),
      program_link:              originalData.program_link ?? null,
          })
          createdLeadId.value = null
          createdPersonId.value = null
          toast.info('Formulario precargado con datos del lead original. Por favor, revise y guarde.', { timeout: 5000 })


      } catch (e) {
          console.error("Error cargando plantilla para clonar", e)
      }
  }

  onMounted(async () => {
    const data = await catalog.membershipList({ active: true });// 3. Asignamos el valor real a la variable reactiva
    membershipList.value = data;
    if (route.query.clone_from) {
        await loadDataForCloning(route.query.clone_from)
        loaded.value = true
        return
    }

    if (isEdit.value) {
      await loadLead(leadIdParam.value)
      loaded.value = true
      return
    }


    form.canal_alias   = 'we_social_media_other'
    form.medium_alias  = 'we_social_media_whatsapp'
    form.nivel_alias   = 'we_lead_interest_low'
    form.country_alias = 'we_country_peru'
    form.status_alias  = 'we_lead_status_atendido'
    form.client_status   = 'we_client_person'
    form.key_word_alias = 'we_key_word_null'
    form.active = true
    //{{form.category_alias}} we_program_type_course onProgramaTypeChange()
    // form.category_alias = 'we_program_type_course'
    // onProgramaTypeChange(programTypeCatalog.value.find(e => e.alias === form.category_alias))

    loaded.value = true
  })

  // Función para manejar el cambio de tipo de intento
function handleTypeChange(contacto, newVal) {
  // 1. Asignar valor
  contacto.cat_type_attempt = newVal;

  // 2. Lógica: Si NO es llamada
  if (newVal !== 'we_attempt_call') {
    // Forzamos el resultado a 'Mensaje / Gestión'
    contacto.calling_alias = 'we_calling_message'; 
    
    // Detenemos cronómetro si estaba activo y reseteamos duración
    if (contacto.timerActive) {
        clearInterval(contacto.timerId);
        contacto.timerActive = false;
        contacto.timerId = null;
    }
    contacto.contact_duration = 0;
  } else {
    // Si vuelve a ser llamada, lo ponemos en Pendiente
    contacto.calling_alias = 'we_calling_pending';
  }
}

function createEmptyAttempt() {
  return {
    cat_type_attempt: 'we_attempt_call', // Valor por defecto
    calling_alias: 'we_calling_pending',

    fechaContactoProximo: currentHourIso(),
    respuesta: '',
    contact_duration: 0, // Inicia en 0
    timerActive: false,
    timerId: null
  }
}
  function addContacto() { form.contactos.push(createEmptyAttempt()) }
  function removeContacto(idx) { form.contactos.splice(idx, 1) }

  function handleMensajeChatInput() {
    const msj = (form.mensajeChat || '').toLowerCase()

    const canal = socialMediaCatalog.value?.find(e =>
      e.description && msj.includes(e.description.toLowerCase())
    )?.alias
    form.canal_alias = canal || 'we_social_media_other'

    form.key_word_alias = mktWordsCatalog.value?.find(e =>
      e.description && msj.includes(e.description.toLowerCase())
    )?.alias || 'we_key_word_null'


  }

  function onStatusChange(opt) {
    if (!opt) return

    // Verificamos por descripción o por el alias directamente
    if (opt.description === 'Pagó' || opt.alias === 'we_lead_status_bought') {
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias

      // NUEVO: Si 'F. Pago (prevista)' está vacío, asignamos la fecha de hoy
      if (!form.pay_date) {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        form.pay_date = `${yyyy}-${mm}-${dd}`
      }

    } else if(opt.description === 'Interesado'){
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
    }
  }
const searchingCustomer = ref(false)

async function searchCustomerByDocument() {
  const doc = insc.document?.trim()
  if (!doc || doc.length < 3) {
    toast.warning('Ingrese el número de documento antes de buscar.')
    return
  }

  searchingCustomer.value = true
  try {
    const response = await customerService.customerInfoGet({ document: doc })

    console.log(response)

    if (response && response.result === 1) {
      insc.full_name        = response.first_name       || ''
      insc.last_name        = response.last_name        || ''
      insc.mother_last_name = response.mother_last_name || ''
      insc.email            = response.email            || ''
      toast.success('Cliente encontrado en base de datos.', { timeout: 3000 })
      return
    }

    // No existe en BD → consultar SUNAT
    await searchSunat()

  } catch {
    await searchSunat()
  } finally {
    searchingCustomer.value = false
  }
}
const searchingPhone = ref(false)

async function searchSunat() {
  const sunatData = await customerService.sunatGet({ document: insc.document })

    if (sunatData && sunatData.nombre_o_razon_social) {
      insc.full_name = sunatData.nombre_o_razon_social
      insc.last_name = ''
      insc.mother_last_name = ''
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.', { timeout: 3000 })
    }

  console.log('Buscando en SUNAT con documento:', insc.document)
}

const dataSetted = ref(null)
const saveBlockReason = computed(() => {
  if (!validateLeadInfo())      return 'Falta completar la información del Lead (fecha de contacto, programa, etc.)'
  if (!validateContactInfo())   return 'Falta completar los Datos del Contacto (teléfono, status, país, nombre, estado del cliente)'
  if (!validateCommercialInfo()) return 'Falta completar el Estado Comercial (nivel de interés, mensaje, canal, medio)'
  return null
})
async function searchLeadByPhone() {

  const phone = form.telefono?.trim()

  if (!phone || phone.length < 5) {
    toast.warning("Por favor ingrese un número de teléfono válido.");
    return;
  }

  if(dataSetted==phone)return

  dataSetted.value = phone

  if (!phone || phone.length < 6) return
  if (searchingPhone.value) return

  searchingPhone.value = true

  try {
    const response = await comercialService.searchPhoneGet({ phone });
    console.log(response)

  form.membership_moment_id  =  response.membership_tier_id
  form.cat_client_moment_alias = response.cat_client_moment

    if (response.cat_client_moment === 'we_moment_new') {
      toast.info('Número no registrado. Se registrará como NUEVO.', { timeout: 3000 })

    } else {
      toast.success(`Encontrado: (${response.cat_client_moment=='we_moment_lead'?'LEAD':'COMUNIDAD'})`, { timeout: 4000 })
      leadDataHistory.value = true

      if(response.lead_details.length>0){
        form.full_name = response.lead_details[0].full_name
        return
      }

      if(response.legacy_details.length>0){
        form.full_name = response.legacy_details[0].full_name
      }

    }


  } catch (error) {
    console.error(error)
    toast.error('Error al consultar el número de teléfono')
  } finally {
    searchingPhone.value = false
  }
}
// 1. VARIABLES REACTIVAS NUEVAS
const clientHistoryLegacy = ref([]) // Aquí guardaremos 'legacy_details'
const loadingHistory = ref(false)   // Para el spinner de carga
const clientHistoryLeads = ref([])

async function openPhoneDetail() {

  const phone = form.telefono?.trim();

  if (!phone || phone.length < 5) {
    toast.warning("Por favor ingrese un número de teléfono válido.");
    return;
  }


  if(dataSetted!=phone)dataSetted.value = phone



  showClientHistory.value = true;
  loadingHistory.value = true;

  // Reseteamos ambas listas
  clientHistoryLegacy.value = [];
  clientHistoryLeads.value = []; // <--- 2. RESETEAR AQUÍ

  activeHistoryTab.value = 'asesoria'; // (Opcional: Si quieres que se abra directo en esta pestaña para probar)

  try {
    const response = await comercialService.searchPhoneGet({ phone });

    if (response) {
        // Mapeamos el Histórico legado
        clientHistoryLegacy.value = response.legacy_details || [];

        // Mapeamos el detalle de Leads (CRM)
        clientHistoryLeads.value = response.lead_details || []; // <--- 3. ASIGNAR DATA AQUÍ
    }

  } catch (error) {
    console.error(error);
    toast.error("Error al obtener el historial.");
  } finally {
    loadingHistory.value = false;
  }
}

function onStrategyChange(option){
  if(!option){
    form.canal_alias   = 'we_social_media_other'
  }
}

// Función centralizada para limpiar todo el estado de la inscripción
function resetInscriptionData() {
  priceManuallySet.value = false
  Object.assign(insc, {
    dni: '',
    document: '',
    cat_type_document: null,
    nombres: '',
    apellidos: '',
    mother_last_name: '',
    email: '',
    full_name: '',
    last_name: '',
    saved_money: 0,
    selectedCurrencyAlias: 'we_currency_soles',
    cat_insc_modality: 'we_insc_modality_normal',
    cat_certificate_status: null,
    cat_type_payment: 'we_payment_way_single',
    cat_method_payment: null,
    modalidadPago: 'CONTADO',
    montoOriginal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_ids: [],
    val_porcentaje: 0,
    val_fijo: 0,
    val_beneficios: [],
    montoBeneficioTotal: 0,
    dsct_porcent_label: null,
    dsct_stick_label: null,
    dsct_benefit_label: null,
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficio: 0,
    montoFinal: 0,
    total_amount: 0,
    observacions: '',
    ticket_payment_urls: [],
    attachments: [],
    flag_agreement: false,
    b2b_contract_id: null,

    // ← FALTABAN ESTOS DOS
    cat_payment_channel: null,
    cat_token_provider: null,
  })

  voucherTouched.value = false
  form.carnet_url = null
}
const isMedioDisabled = computed(() =>
  ['we_social_media_coti', 'we_social_media_chatbot','we_social_media_wechat'].includes(form.canal_alias)
)

const filteredMediumCatalog = computed(() => {
  const socialList = socialMediaCatalog.value.filter(e =>
    ['we_social_media_whatsapp', 'we_social_media_wechat', 'we_social_media_msg', 'we_social_media_comment'].includes(e.alias)
  )

  const excludeWebFor = ['we_social_media_instagram', 'we_social_media_linkedin', 'we_social_media_facebook']
  if (excludeWebFor.includes(form.canal_alias)) {
    return socialList.filter(e => e.alias !== 'we_social_media_wechat')
  }

  return socialList
})
function onChannelChange(option) {
  if (!option) {
    // Regla 3: Canal vacío → limpiar Medio
    form.strategy_alias = null
    form.medium_alias = null
    return
  }

  const alias = option.alias

  // Regla 1: COTI o CHATBOT → forzar Medio a WEB y deshabilitar
  if (['we_social_media_coti', 'we_social_media_chatbot'].includes(alias)) {
    form.medium_alias = 'we_social_media_wechat'
    return
  }


  // Regla 1: COTI o CHATBOT → forzar Medio a WEB y deshabilitar
  if (['we_social_media_wechat','we_social_media_other'].includes(alias)) {
    form.medium_alias = 'we_social_media_whatsapp'
    return
  }

  // Regla 2: Instagram, LinkedIn, Facebook → limpiar Medio si es WEB
  if (['we_social_media_instagram', 'we_social_media_linkedin', 'we_social_media_facebook'].includes(alias)) {
    if (form.medium_alias === 'we_social_media_wechat') {
      form.medium_alias = null
    }
  }
}

// Helper para formatear fecha y hora (Agrégalo si no tienes uno global)
function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  // Retorna formato: 13 Ene 2026 10:58 PM
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) +
         ' ' +
         date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

  function cancelar() {

      router.push({ name: 'ComercialListado' })

   }

  function buildLeadPayload() {
    const cat_status_lead        = idByAlias(form.status_alias,          leadStatusCatalog.value)
    const cat_code_country       = idByAlias(form.country_alias,         countryCatalog.value)
    const cat_query              = idByAlias(form.query_alias,           queryCatalog.value)
    const cat_interest_level     = idByAlias(form.nivel_alias,           leadInterestCatalog.value)
    const cat_channel            = idByAlias(form.canal_alias,           socialMediaCatalog.value)
    const cat_medium_contact     = idByAlias(form.medium_alias,          socialMediaCatalog.value)
    const cat_frecuency_word     = idByAlias(form.key_word_alias,        mktWordsCatalog.value)
    const cat_type_strategy      = idByAlias(form.strategy_alias,        strategyCatalog.value)
    const cat_prospect_situation = idByAlias(form.ocupacion_alias,       prospectSituationCatalog.value)
    const cat_client_type        = idByAlias(form.client_status, clientCatalog.value)

    const cat_client_category    = idByAlias(form.cat_client_moment_alias, momentCatalog.value)
    const cat_program_modality = idByAlias(form.program_modality_alias, programModalityCatalog.value)
    const cat_program_type = idByAlias(form.category_alias, programTypeCatalog.value)

    const contact_attempts = (form.contactos || []).map((c, idx) => {
      return {
        id: c.id,
        attempt_number: idx + 1,
        cat_type_attempt: idByAlias(c.cat_type_attempt, lAttempts.value),
        contact_datetime: c.fechaContactoProximo,          // ← corregido
        cat_result: idByAlias(c.calling_alias, callingCatalog.value),
        response: c.respuesta || '',
        contact_duration: c.contact_duration || 0,
        cat_reschedule_origin: c.cat_reschedule_origin || null
      }
    })

    return {
      lead: {
        first_contact_date: form.fechaContactoInicial || null,
        cat_program_modality,
        cat_program_type,
        program_version_id: form.program_version_id || null,
        program_edition_id: form.edition_id || null,
        cat_status_lead,
        cat_code_country,
        cat_interest_level,
        cat_client_type,
        cat_channel,
        cat_medium_contact,
        bot: form.bot? 'Y' : 'N',
        active: form.active? 'Y' : 'N',
        web: form.web ? 'Y' : 'N',
        b2b: form.b2b ? 'Y' : 'N',
        cat_query,
        full_name: form.full_name,
        pay_date: form.pay_date,
        cat_frecuency_word,
        cat_type_strategy,
        cat_prospect_situation,
        cat_client_moment: cat_client_category,
        membership_moment_id: form.membership_moment_id,
        origin_phone: (form.telefono || '').trim() || null,
        origin_email: null,

        message_init_conversation: form.mensajeChat?.trim() || null,
        observations:              form.observacion?.trim() || null,
      },
      contact_attempts
    }
  }

// 1. NUEVA VARIABLE REACTIVA PARA EL DETALLE
const modelProgramVersion = ref(null)
const loadingDetail = ref(false)
const hasEditions = computed(() => {
  return modelProgramVersion.value?.editions_json && modelProgramVersion.value.editions_json.length > 0;
});
const maxPhoneLength = computed(() => {
  if (!form.country_alias) return 20; // Por defecto
  const country = countryCatalog.value.find(c => c.alias === form.country_alias);
  return country?.raw?.variable_1 ? Number(country.raw.variable_1) : 20;
});

// NUEVO: Watcher para recortar el teléfono si el país cambia y el límite es menor
watch(maxPhoneLength, (newMaxLength) => {
  if (form.telefono && form.telefono.length > newMaxLength) {
    // Si el teléfono tiene más dígitos que el nuevo límite, lo recortamos
    form.telefono = form.telefono.slice(0, newMaxLength);

    // Opcional: Avisarle al usuario que se ajustó el número
    toast.info(`El número se ajustó a ${newMaxLength} dígitos para este país.`, { timeout: 3000 });
  }
});
// 3. ACTUALIZAR LA FUNCIÓN DE APERTURA
async function openProgramVersionDetail() {
  // Validamos que haya una ID seleccionada
  if (!form.program_version_id) return;

  loadingDetail.value = true;
  modelProgramVersion.value = null; // Limpiamos data anterior

  try {
    // Llamamos al servicio (Postman: /api/program/programversiondetailget)
    const response = await programService.programVersionDetailGet({
      program_version_id: form.program_version_id
    });

    // Asignamos la respuesta completa a la variable
    modelProgramVersion.value = response;

    // Reseteamos el tab a 'info' y abrimos modal
    activeTab.value = 'info';
    showProgramDetail.value = true;

  } catch (error) {
    console.error(error);
    toast.error("No se pudo cargar el detalle del programa");
  } finally {
    loadingDetail.value = false;
  }
}

function buildEnrollmentPayload() {
  const cat_type_document  = idByAlias(insc.cat_type_document, docTypeCatalog.value)
  const cat_insc_modality  = idByAlias(insc.cat_insc_modality, inscModalidades.value)
  const cat_type_payment   = idByAlias(insc.cat_type_payment,  inscPaymentModes.value)
  const cat_currency       = idByAlias(insc.selectedCurrencyAlias, currencyCatalog.value)
  const cat_country        = idByAlias(form.country_alias, countryCatalog.value)
  const cat_certificate_status = idByAlias(insc.cat_certificate_status, certificateStatusCatalog.value)
  const cat_method_payment = isChannelGeneral.value
    ? idByAlias(insc.cat_method_payment, paymentMethodCatalog.value)
    : null

  const paymentFiles = (insc.ticket_payment_urls || []).map(f => ({
    url:  f.url  || f,
    name: f.name || (f.url || f).split('/').pop() || 'Comprobante',
    type: f.type || null
  }))

  const generalAttachments = (insc.attachments || []).map(f => ({
    url:  f.url  || f,
    name: f.name || (f.url || f).split('/').pop() || 'Adjunto',
    type: f.type || null
  }))

  return {
    inscription: {
      lead_id:              createdLeadId.value,
      program_version_id:   form.edition_id ? null : form.program_version_id,
      program_edition_id:   form.edition_id,

      // Datos del alumno
      document:             insc.document,
      cat_type_document,
      full_name:            insc.full_name,
      last_name:            insc.last_name,
      mother_last_name:     insc.mother_last_name,
      email:                insc.email,
      cat_country,
      cat_insc_modality,
cat_certificate_status,
      // Canal y pago
      cat_payment_channel:  insc.cat_payment_channel,   // ← NUEVO (id) 
      cat_type_payment: (isChannelGeneral.value || isChannelToken.value) ? cat_type_payment : null,
      cat_currency,
      cat_method_payment,                                // null si TOKEN o WEB
      cat_token_provider:   insc.cat_token_provider,    // ← NUEVO (id)
      saved_money: reservaSplitEnabled.value
  ? Number(reservaInmediata.value)   // solo lo que paga ahora
  : Number(insc.saved_money),

      // Precios y descuentos
      list_price:           insc.montoOriginal,
      total_amount:         Number(insc.total_amount),
      dsct_porcent_id:      insc.dsct_porcent_id,
      dsct_stick_id:        insc.dsct_stick_id,
      dsct_benefit_ids: insc.dsct_benefit_ids.map(b => ({
        value: b.value,
        label: b.label
      })),
    installment_plan: isInstallmentMode.value ? installmentPlan.value : null,

      // Observaciones y archivos
      observations:         insc.observacions,
      student_attachment_url: form.carnet_url || null,
      ticket_payment_urls:  paymentFiles,     // → enrollment_attachments
      attachments:          generalAttachments // → lead_attachments
    }
  }
}

async function confirmarInscripcion() {
   if (!comercialService) return console.error('comercialService no inyectado')


   if (!insc.montoOriginal || Number(insc.montoOriginal) <= 0) {
      toast.warning('El Precio Base no está configurado. No se puede procesar la inscripción.')
      return
    }

  if (!validateInscriptionClientInfo() || !validateInscriptionPaymentInfo()) {
    // ← reemplaza el toast genérico por esto:
    if (insc.email && !isValidEmail(insc.email)) {
      toast.warning('El correo no tiene formato válido · ej: nombre@dominio.com')
    } else {
      toast.warning("Por favor complete los campos obligatorios de la inscripción")
    }
    return
  }
  if (!validateLeadInfo() || !validateContactInfo() || !validateCommercialInfo()) {
    toast.warning("Faltan datos obligatorios en el formulario del Lead.")
    return
  }

  // Comprobante GENERAL
  if (isChannelGeneral.value && !isVoucherOptional.value &&
      (!insc.ticket_payment_urls || insc.ticket_payment_urls.length === 0)) {
    voucherTouched.value = true
    toast.warning('El canal General requiere al menos un Comprobante de Pago.')
    return
  }

  // Token provider
  if (isChannelToken.value && !insc.cat_token_provider) {
    toast.warning('Debe seleccionar el proveedor del Link / Token.')
    return
  }

  if (isInstallmentMode.value && reservaSplitEnabled.value && !reservaSplitValid.value) {
  toast.warning('Si aplazas parte de la reserva, debes indicar el monto inmediato y la fecha de la cuota diferida.')
  return
}

  // Validar plan de cuotas
if (isInstallmentMode.value && !installmentPlanValid.value) {
  toast.warning('El plan de cuotas no cuadra con el monto final. Ajusta los montos antes de guardar.')
  return
}

if (isInstallmentMode.value && reservaSplitEnabled.value && reservaDiferidaFecha.value) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaDif = new Date(reservaDiferidaFecha.value)
  if (fechaDif < hoy) {
    toast.warning('La fecha de la cuota diferida no puede ser una fecha pasada.')
    return
  }
}
  savingInsc.value = true


  try {
    // ── PASO A: Preparar payload del lead ──────────────────────
    const leadPayload    = buildLeadPayload()
    const currentLeadId  = leadIdParam.value || createdLeadId.value
    let   resolvedLeadId = currentLeadId
    let   resolvedPersonId = createdPersonId.value

    // ── PASO B: Preparar payload del enrollment ────────────────
    // Lo construimos ANTES de guardar nada, para detectar errores de validación
    // local sin haber tocado el servidor aún
    const enrollmentPayload = buildEnrollmentPayload()

    // ── PASO C: Guardar lead (solo si pasó la validación local) ─
    if (currentLeadId) {
      const leadResp = await comercialService.leadUpdate({ id: currentLeadId, ...leadPayload })
      if (leadResp.result === 0) { toast.error(leadResp.message);   return }
      if (leadResp.result === 2) { toast.warning(leadResp.message); return }
    } else {
      const leadResp = await comercialService.leadRegister(leadPayload)
      if (leadResp.result === 0) { toast.error(leadResp.message);   return }
      if (leadResp.result === 2) { toast.warning(leadResp.message); return }
      resolvedLeadId   = leadResp.lead_id
      resolvedPersonId = leadResp.person_id
      createdLeadId.value   = resolvedLeadId
      createdPersonId.value = resolvedPersonId
    }

    // ── PASO D: Guardar enrollment ─────────────────────────────
    // Actualizamos el lead_id en el payload con el ID real ya resuelto
    enrollmentPayload.inscription.lead_id = resolvedLeadId

    const enrollResp = await comercialService.enrollmentRegister(enrollmentPayload)

    if (enrollResp.result === 1) {
      toast.success(enrollResp.message)
  inscInitialized.value = false 
      showViewModal.value = false
      router.push({ name: 'ComercialListado' })

    } else if (enrollResp.result === 0) {
      // ── ROLLBACK VISUAL: avisamos que el lead sí se guardó pero la inscripción no ──
      toast.error(
        `${enrollResp.message} — El lead fue guardado, pero la inscripción no se registró. Inténtalo nuevamente.`,
        { timeout: 8000 }
      )
    } else {
      toast.warning(enrollResp.message)
    }

  } catch (err) {
    console.error(err)
    toast.error('Error inesperado al procesar la inscripción.')
  } finally {
    savingInsc.value = false
  }
}

async function confirmarEliminacion() {
  showDeleteWarningModal.value = false
  await guardarEfectivo()
}

async function guardarEfectivo() {
  if (!comercialService) return console.error('comercialService no inyectado')
  
  saving.value = true
  try {
    // Construimos los datos del formulario (incluyendo el nuevo status "Eliminado")
    const payload = buildLeadPayload()
    
    // Ejecutamos únicamente el UPDATE del lead
    const resp = await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
    
    // Manejo de la respuesta
    if (resp.result === 1) {
      toast.success(resp.message || 'Lead eliminado correctamente')
      router.push({ name: 'ComercialListado' })
    } else if (resp.result === 0) {
      toast.error(resp.message)
    } else {
      toast.warning(resp.message)
    }
  } catch (err) {
    console.error(err)
    toast.error('Error inesperado al intentar eliminar el lead.')
  } finally {
    saving.value = false
  }
}

async function guardar() {
    console.log('[guardar] edition_id:', form.edition_id, '| edition_label:', form.edition_label)

  if (!comercialService) return console.error('comercialService no inyectado')
  if (isDeleteStatus.value) {
    showDeleteWarningModal.value = true
    return
  }
  saving.value = true
  try {
    const payload = buildLeadPayload()
    let result, message

    if (isEdit.value) {
      const resp = await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
      result  = resp.result
      message = resp.message
    } else {
      const resp = await comercialService.leadRegister(payload)
      result  = resp.result
      message = resp.message
      if (result === 1) {
        createdLeadId.value   = resp.lead_id
        createdPersonId.value = resp.person_id
      }
    }

    if (result === 1) {
      toast.success(message)
      router.push({ name: 'ComercialListado' })
    } else if (result === 0) {
      toast.error(message)
    } else {
      toast.warning(message)
    }

  } catch (err) {
    console.error(err)
    toast.error('Error inesperado al guardar el lead.')
  } finally {
    saving.value = false
  }
}

function openInscription() {
  if (!inscInitialized.value) {
    resetInscriptionData()
    insc.full_name              = form.full_name || ''
    insc.email                  = ''
    insc.cat_insc_modality      = 'we_insc_modality_normal'
    insc.selectedCurrencyAlias  = 'we_currency_soles'
    insc.cat_type_payment       = 'we_payment_way_single'
    insc.cat_certificate_status = 'we_certificate_status_paid'

    const generalChannel = paymentChannelCatalog.value.find(c => c.alias === 'we_channel_general')
    if (generalChannel) insc.cat_payment_channel = generalChannel.id

    inscInitialized.value = true
  }

  nextTick(() => {
    // ✅ Solo carga el precio automático si el usuario NO lo editó manualmente
    if (!priceManuallySet.value) {
      const precio = calculatedBasePrice.value
      insc.montoOriginal = precio

      if (!precio) {
        toast.warning(
          '⚠️ No se pudo cargar el Precio Base. Verifique que el programa tenga precios configurados.',
          { timeout: 7000 }
        )
      }
    }

    showViewModal.value = true
  })
}

  function validateLeadInfo() {
    const required = ['fechaContactoInicial']
    for (const field of required) {
      if (field === 'edition_id') {
        if(route.query.clone_from)return true
        if (form.category_alias && form.program_version_id && form.program_modality_selected_alias !== 'we_modality_online' && !form[field]) {
          return false
        }
      } else if (!form[field]) return false
    }
    return true
  }
  function validateContactInfo() {
    const required = ['telefono','status_alias','country_alias','full_name','cat_client_moment_alias']
    return required.every(f => !!form[f])
  }
  function validateCommercialInfo() {
  const required = ['nivel_alias', 'mensajeChat', 'canal_alias', 'medium_alias', 'key_word_alias'] // ✅ agregar 'key_word_alias'
    return required.every(f => !!form[f])
  }
function validateInscriptionClientInfo() {
const required = ['cat_type_document','document','email','full_name','last_name','mother_last_name','cat_insc_modality', 'cat_certificate_status'] // <-- ACTUALIZADO
  if (!required.every(f => !!insc[f])) return false
  if (!isValidEmail(insc.email)) return false  // ← agrega esto
  return true
}
function validateInscriptionPaymentInfo() {
  // Moneda siempre obligatoria
  if (!insc.selectedCurrencyAlias) return false

  // Canal General: requiere modalidad y método de pago
  if (isChannelGeneral.value) {
    if (!insc.cat_type_payment) return false
    if (!insc.cat_method_payment) return false
    // Cuotas: requiere adelanto > 0
    if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
    return true
  }

  if (isChannelToken.value) {
    if (!insc.cat_token_provider) return false
    // Si eligió cuotas, también requiere reserva
    if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
    return true
  }

  // Canal Web: solo necesita el canal seleccionado
  if (isChannelWeb.value) return true

  // Sin canal: no pasa
  return false
}

 


function onProgramaTypeChange(opcion) {
  // Siempre limpiar programa y edición al cambiar (o limpiar) la categoría
  form.program_version_id              = null
  form.program_label                   = null
  form.program_link                    = null
  form.edition_id                      = null
  form.edition_label                   = null
  form.program_modality_selected_alias = null
  form.price_student_soles             = 0
  form.price_student_dollars           = 0
  form.price_profesional_soles         = 0
  form.price_profesional_dollars       = 0
  form.program_sessions                = 0
  form.program_sessions_per_week       = 1
  form.edition_start_date              = null

  if (!opcion) {
    form.program_modality_alias = null
    return
  }
}
    function openURL(param){
      window.open(param, '_blank', 'noopener,noreferrer');
    }

  // Busca esta función y REEMPLAZA las dos versiones que tienes por esta sola:
function onProgramaChange(opcion) {
  inscInitialized.value = false 
  priceManuallySet.value = false
  if (!opcion) {
    selectedProgram.value = null
    form.program_label = null
    form.program_link = null
    form.edition_id = null
    form.edition_label = null                      // ← AGREGAR
    form.program_modality_selected_alias = null
    form.price_student_soles = 0
    form.price_student_dollars = 0
    form.price_profesional_soles = 0
    form.count_children = 0
    form.price_profesional_dollars = 0
    return
  }

  form.edition_id    = null    // ← AGREGAR
  form.edition_label = null    // ← AGREGAR
  // A partir de aquí opcion ya está garantizado como no-null
  selectedProgram.value = opcion
  form.program_label = opcion.abbreviation || opcion.description || null
  form.program_link = opcion.link || null
  form.program_modality_selected_alias = opcion.cat_model_modality_alias
  form.program_sessions          = Number(opcion?.sessions || 0)
  form.program_sessions_per_week = Number(opcion?.sessions_per_week || 1)
  form.price_student_soles       = Number(opcion.price_student_soles    || 0)
  form.price_student_dollars     = Number(opcion.price_student_dollars  || 0)
  form.count_children = Number(opcion.count_children || 0)
  form.price_profesional_soles   = Number(opcion.price_profesional_soles   || 0)
  form.price_profesional_dollars = Number(opcion.price_profesional_dollars || 0)
}

const searchEditionsFiltered = async (q) => {
  const month = new Date().getMonth() + 1
  const year  = new Date().getFullYear()

  const response = await editionService.editionCaller({
    q,
    program_version_id: form.program_version_id,
    month,
    year
  })

  const hoy = new Date()

  // Desde el 1° del mes pasado
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  desde.setHours(0, 0, 0, 0)

  // Hasta el 31 dic del año actual
  const hasta = new Date(hoy.getFullYear(), 11, 31)
  hasta.setHours(23, 59, 59, 999)

  return (response || [])
    .filter(e => {
      if (!e.start_date) return true
      const fecha = new Date(e.start_date)
      return fecha >= desde && fecha <= hasta
    })
    .sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return new Date(a.start_date) - new Date(b.start_date)
    })
}
function onEditionChange(opcion) {
  if (!opcion) {
    currentEdition.value = null
    form.edition_label = null
    form.edition_start_date = null
    return
  }

  currentEdition.value    = opcion
  form.edition_label      = opcion.start_date_label || null  // ← AGREGAR
  form.edition_start_date = opcion.start_date || null
  console.log(opcion.start_date)
  console.log(opcion.end_date)
  console.log(form.program_sessions)
  // Calcular sessions_per_week desde las fechas reales de la edición
  if (opcion.start_date && opcion.end_date && form.program_sessions > 0) {
    console.log("PROCESANDO FECHAS")
    const inicio  = new Date(opcion.start_date)
    const fin     = new Date(opcion.end_date)
    const semanas = Math.max(1, Math.round((fin - inicio) / (7 * 24 * 60 * 60 * 1000)))
    form.program_sessions_per_week = Math.max(1, Math.round(form.program_sessions / semanas))
  } else {
    form.program_sessions_per_week = 1 // fallback
  }

  console.info('[Edición seleccionada]', {
    start:    opcion.start_date,
    end:      opcion.end_date,
    sessions: form.program_sessions,
    semanas:  Math.round((new Date(opcion.end_date) - new Date(opcion.start_date)) / (7 * 24 * 60 * 60 * 1000)),
    sessions_per_week: form.program_sessions_per_week,
    cuotas_resultado:  'ver autoNumCuotas'
  })
}

    const clientProfileType = computed(() => {
      if (!form.ocupacion_alias) return null

      const ocupacionInfo = prospectSituationCatalog.value.find(
        opt => opt.alias === form.ocupacion_alias
      )

      return ocupacionInfo?.variable_3 || null
    })

const calculatedBasePrice = computed(() => { 
  if (!insc.selectedCurrencyAlias) return 0
  const isUSD  = insc.selectedCurrencyAlias === 'we_currency_usd'
  const type   = clientProfileType.value

  if (type === 'estudiante') {
    return isUSD
      ? Number(form.price_student_dollars  || 0)
      : Number(form.price_student_soles    || 0)
  }

  // profesional o null → usa profesional, con fallback a estudiante si profesional es 0
  const proPrecio = isUSD
    ? Number(form.price_profesional_dollars || 0)
    : Number(form.price_profesional_soles   || 0)

  if (proPrecio > 0) return proPrecio

  // fallback: si no hay precio profesional, usa el de estudiante
  return isUSD
    ? Number(form.price_student_dollars || 0)
    : Number(form.price_student_soles   || 0)
})
const priceManuallySet = ref(false)


watch(calculatedBasePrice, (newPrice) => {
  if (!priceManuallySet.value) {
    insc.montoOriginal = newPrice
  }
}, { immediate: true })
  watch(() => insc.selectedCurrencyAlias, () => {
  })
 

// ══════════════════════════════════════════════════
// PLAN DE CUOTAS
// ══════════════════════════════════════════════════

const fmt2 = (val) => (Number(val) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })


const isInstallmentMode = computed(() =>
  !isChannelWeb.value &&
  !!insc.cat_payment_channel &&
  insc.cat_type_payment === 'we_payment_way_installments' &&
  Number(insc.montoOriginal) > 0
)

// Monto que queda después del adelanto → se reparte en cuotas 2..N 
const installmentRemainder = computed(() => {
  const adelantoEfectivo = reservaSplitEnabled.value
    ? (Number(reservaInmediata.value) || 0)
    : (Number(insc.saved_money)       || 0)
  const rem = round2((Number(insc.total_amount) || 0) - adelantoEfectivo)
  return rem > 0 ? rem : 0
})

const autoNumCuotas = computed(() => {
  const type     = form.category_alias
  const spw      = form.program_sessions_per_week || 1
  const children = form.count_children || 0

  if (['we_program_type_course', 'we_program_type_minicourse'].includes(type)) return 1
  if (type === 'we_program_type_pee')     return spw >= 2 ? 2 : 3
  if (type === 'we_program_type_diploma') return spw >= 2 ? 4 : 5
  if (type === 'we_program_type_specialization') {
    if (children <= 2) return 2
    return spw >= 2 ? 2 : 3
  }
  return 1
})
 
const autoInstallmentPlan = computed(() => {
  if (!isInstallmentMode.value) return []
  const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
  const n               = autoNumCuotas.value
  const startRaw        = form.edition_start_date
  const sessionsPerWeek = form.program_sessions_per_week || 1
  const isEsp           = form.category_alias === 'we_program_type_specialization'
  const isCourse        = ['we_program_type_course', 'we_program_type_minicourse'].includes(form.category_alias)

  if (saldo <= 0 || n < 1) return []

  const cuotaBase = Math.floor(saldo / n)
  const remainder = round2(saldo - cuotaBase * n)
  const base = startRaw
    ? new Date(String(startRaw).slice(0, 10) + 'T00:00:00')
    : new Date()
  const plan = []

  // ── CURSO / MINICURSO: única cuota = inicio + 6 días ──────
  if (isCourse) {
    const d = new Date(base)
    d.setDate(d.getDate() + 6)
    plan.push({
      installment_number: 1,
      amount: round2(cuotaBase + remainder),
      due_date: d.toISOString().slice(0, 10)
    })
    return plan
  }

  // ── ESPECIALIZACIÓN: snap a fechas clave ──────────────────
  if (isEsp) {
    // Cuota 1 → [1, 15, 30] con mínimo 7 días desde inicio
    const minC1 = new Date(base)
    minC1.setDate(minC1.getDate() + 7)
    const d1 = snapToKeyDate(minC1, [1, 15, 30])

    // Cuota 2 → [1, 15] siguiente después de cuota 1
    const minC2 = new Date(d1)
    minC2.setDate(minC2.getDate() + 1)
    const d2 = snapToKeyDate(minC2, [1, 15])

    // Cuota 3 (si aplica) → [1, 15, 30] siguiente después de cuota 2
    const minC3 = new Date(d2)
    minC3.setDate(minC3.getDate() + 1)
    const d3 = snapToKeyDate(minC3, [1, 15, 30])

    const keyDates = [d1, d2, d3]

    for (let i = 0; i < n; i++) {
      plan.push({
        installment_number: i + 1,
        amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase,
        due_date: keyDates[i].toISOString().slice(0, 10)
      })
    }
    return plan
  }

  // ── PEE / DIPLOMA: lógica existente sin cambios ───────────
  if (sessionsPerWeek >= 2) {
    const f1 = new Date(base)
    f1.setDate(f1.getDate() + 15)
    for (let i = 0; i < n; i++) {
      const d = new Date(f1)
      d.setDate(d.getDate() + i * 20)
      plan.push({
        installment_number: i + 1,
        amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase,
        due_date: d.toISOString().slice(0, 10)
      })
    }
  } else {
    const f1 = new Date(base)
    f1.setMonth(f1.getMonth() + 1)
    f1.setDate(15)
    for (let i = 0; i < n; i++) {
      let d
      if (i === 0) { d = new Date(f1) }
      else { d = new Date(f1); d.setMonth(d.getMonth() + i); d.setDate(1) }
      plan.push({
        installment_number: i + 1,
        amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase,
        due_date: d.toISOString().slice(0, 10)
      })
    }
  }

  return plan
})


// ── Helper: próxima fecha clave >= minDate ─────────────────
function snapToKeyDate(afterDate, keys = [1, 15, 30]) {
  const min = new Date(afterDate)
  min.setHours(0, 0, 0, 0)

  for (let mo = 0; mo <= 4; mo++) {
    const year  = min.getFullYear()
    const month = min.getMonth() + mo

    for (const k of keys) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const day = Math.min(k, daysInMonth) // ej: Feb no tiene día 30
      const candidate = new Date(year, month, day)
      candidate.setHours(0, 0, 0, 0)
      if (candidate >= min) return candidate
    }
  }
  return min // fallback
}

// ── Modo manual ───────────────────────────────────────────────
const manualMode           = ref(false)
const numCuotasManual      = ref(1)
const editableInstallments = ref([]) 
const reservaSplitEnabled  = ref(false)
const reservaInmediata     = ref(0)      // lo que paga ahora (los 100)
const reservaDiferidaFecha = ref('')     // fecha de la cuota diferida

 watch(reservaInmediata, () => {
  if (reservaSplitEnabled.value && Number(reservaInmediata.value) >= Number(insc.saved_money)) {
    reservaInmediata.value = Math.max(0, Number(insc.saved_money) - 1)
  }
})

watch(reservaSplitEnabled, (val) => { 
  if (val) {
    reservaInmediata.value     = 0
    reservaDiferidaFecha.value = defaultDiferidaFecha()
  } else {
    reservaInmediata.value     = 0
    reservaDiferidaFecha.value = ''
  }
})
// Si cambia saved_money y el split está activo, recalcular inmediata si supera el límite
watch(() => insc.saved_money, (val) => {
  if (reservaSplitEnabled.value && Number(reservaInmediata.value) > Number(val)) {
    reservaInmediata.value = Number(val)
  }
})

const reservaDiferida = computed(() =>
  round2(Math.max(0, (Number(insc.saved_money) || 0) - (Number(reservaInmediata.value) || 0)))
)

const reservaSplitValid = computed(() =>
  !reservaSplitEnabled.value ||
  (Number(reservaInmediata.value) > 0 && reservaDiferida.value > 0 && !!reservaDiferidaFecha.value)
)

function defaultDiferidaFecha() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}
function seedEditableInstallments(n) {
  const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
  if (saldo <= 0 || n < 1) { editableInstallments.value = []; return }

  const cuotaBase = Math.floor(saldo / n)
  const rem       = round2(saldo - cuotaBase * n)

  // ✅ Usamos las fechas ya calculadas por autoInstallmentPlan como base
  const autoPlan = autoInstallmentPlan.value

  editableInstallments.value = Array.from({ length: n }, (_, i) => {
    // Si existe la fecha en el plan automático, la reutilizamos
    // Si no (el usuario pidió más cuotas que las auto), calculamos desde la última
    let due_date
    if (autoPlan[i]?.due_date) {
      due_date = autoPlan[i].due_date
    } else {
      // Extiende desde la última fecha disponible sumando 1 mes
      const lastDate = autoPlan[autoPlan.length - 1]?.due_date
      const base = lastDate
        ? new Date(lastDate + 'T00:00:00')
        : new Date()
      base.setMonth(base.getMonth() + (i - autoPlan.length + 1))
      base.setDate(1)
      due_date = base.toISOString().slice(0, 10)
    }

    return {
      installment_number: i + 1,
      amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase,
      due_date
    }
  })
}

function toggleManualMode() {
  if (!manualMode.value) {
    numCuotasManual.value = autoNumCuotas.value
    seedEditableInstallments(numCuotasManual.value)
    manualMode.value = true
  } else {
    manualMode.value = false
    editableInstallments.value = []
  }
}

function onNumCuotasManualChange() {
  const n = Math.min(Math.max(Number(numCuotasManual.value) || 1, 1), 12)
  numCuotasManual.value = n
  seedEditableInstallments(n)
}

function updateEditableAmount(idx, val) {
  if (editableInstallments.value[idx]) editableInstallments.value[idx].amount = Number(val) || 0
}

function updateEditableDate(idx, val) {
  if (editableInstallments.value[idx]) editableInstallments.value[idx].due_date = val
}


// Plan efectivo que se usa en template y en el payload
// REEMPLAZA el computed installmentPlan existente
const installmentPlan = computed(() => {
  // Añadimos _editableIdx para rastrear posición real en editableInstallments
  const basePlan = (manualMode.value
    ? editableInstallments.value
    : autoInstallmentPlan.value
  ).map((c, i) => ({ ...c, _editableIdx: i }))

  if (!reservaSplitEnabled.value || reservaDiferida.value <= 0 || !reservaDiferidaFecha.value) {
    return basePlan
  }

  const extraCuota = {
    installment_number: 0,
    amount: reservaDiferida.value,
    due_date: reservaDiferidaFecha.value,
    is_reserva_diferida: true,
    _editableIdx: -1   // ← no existe en editableInstallments
  }

  return [...basePlan, extraCuota]
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
    .map((c, i) => ({ ...c, installment_number: i + 1 }))
})


const installmentTotalSum = computed(() =>
  round2((installmentPlan.value || []).reduce((acc, c) => acc + Number(c.amount || 0), 0))
)

const installmentPlanValid = computed(() => {
  if (!isInstallmentMode.value || installmentPlan.value.length === 0) return true
  return Math.abs(installmentTotalSum.value - installmentRemainder.value) < 0.01
})

// Watchers
// En el watcher de isInstallmentMode (el existente)
watch(isInstallmentMode, (val) => {
  if (!val) {
    manualMode.value           = false
    editableInstallments.value = []
    reservaSplitEnabled.value  = false   // ← AGREGAR
    reservaInmediata.value     = 0       // ← AGREGAR
    reservaDiferidaFecha.value = ''      // ← AGREGAR
  }
})

 watch(installmentRemainder, () => {
  if (manualMode.value) {
    const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
    const n = editableInstallments.value.length || numCuotasManual.value
    if (saldo <= 0 || n < 1) return
    const cuotaBase = Math.floor(saldo / n)
    const rem = round2(saldo - cuotaBase * n)
    editableInstallments.value = editableInstallments.value.map((c, i) => ({
      ...c,  // ← preserva due_date que el usuario editó
      amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase
    }))
    toast.warning(
      '⚠️ Los montos del plan se recalcularon automáticamente. Las fechas que editaste se conservaron.',
      { timeout: 5000 }
    )
  }
})

function isValidEmail(email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).toLowerCase())
}

const isOnlineProgram = computed(() =>
  form.program_modality_selected_alias === 'we_modality_online' &&
  form.category_alias !== 'we_program_type_membership'
)

// Detectar rol líder (igual que isComercial que ya tienes)
const isLiderComercial = storedUser?.roles?.includes('LIDER_COMERCIAL') ?? false

// ID del catálogo ya creado
const CAT_RESCHEDULE_LEADER_ID = 5002

function toggleReschedule(contacto) {
  if (contacto.cat_reschedule_origin) {
    // Si ya tiene, lo quita (cancela la reprogramación)
    contacto.cat_reschedule_origin = null
  } else {
    // Activa modo reprogramar
    contacto.cat_reschedule_origin = CAT_RESCHEDULE_LEADER_ID
  }
}

</script>

<style scoped>
/* ── CONTENEDORES PRINCIPALES (Solución de scroll único) ── */
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
  position: sticky;
  top: 60px; /* IMPORTANTE: Ajusta este valor si tu barra superior blanca es más alta o más baja. Si tu barra superior no es fija, pon esto en 0 */
  z-index: 100;
}

.exec-body {
  flex: 1;
  padding: 32px 28px;
}

/* ── RESTO DE TUS ESTILOS ── */
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
.brand-title {
  font-size: 19px;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
.masthead-actions { display: flex; gap: 10px; align-items: center; }

.exec-form-wrapper {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  margin: 0 auto;
}

.exec-fieldset {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 20px 24px;
  margin-bottom: 24px;
}
.fieldset-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary, #475569);
  font-weight: 700;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
  padding-bottom: 10px;
}
.exec-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 6px;
}
.c-red { color: var(--red-600, #dc2626); font-weight: 600; margin-left: .15rem; }

.exec-input-light,
.exec-select-light {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  transition: all 0.15s;
  height: 38px;
}
.exec-input-light:focus,
.exec-select-light:focus {
  outline: none;
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.12);
}
.exec-input-light:disabled,
.exec-select-light:disabled {
  background-color: var(--slate-50, #f8fafc);
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
  opacity: 1;
}
.exec-input-light.input-valid {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34,197,94,.1);
}

.exec-textarea {
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  transition: border-color .15s, box-shadow .15s;
  resize: vertical;
  min-height: 80px;
  display: block;
}
.exec-textarea:focus {
  outline: none;
  border-color: var(--teal-500, #14b8a6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.12);
}
.exec-textarea:disabled {
  background-color: var(--slate-50, #f8fafc);
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

.btn-exec {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  transition: all .15s;
  border: 1px solid transparent;
  white-space: nowrap;
  text-decoration: none;
  line-height: 1.2;
}
.btn-exec:disabled { opacity: .5; cursor: default; }

.btn-exec-primary {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-color: var(--navy-900, #0f172a);
}
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }

.btn-exec-ghost {
  background: transparent;
  color: var(--slate-300, #cbd5e1);
  border-color: var(--slate-600, #475569);
}
.btn-exec-ghost:hover:not(:disabled) {
  background: rgba(255,255,255,.06);
  color: #fff;
  border-color: var(--slate-400, #94a3b8);
}

.btn-exec-outline {
  background: #fff;
  color: var(--text-secondary, #475569);
  border-color: var(--border, #e2e8f0);
}
.btn-exec-outline:hover:not(:disabled) {
  background: var(--slate-50, #f8fafc);
  border-color: var(--slate-400, #94a3b8);
}

.btn-exec-warning {
  background: #f59e0b;
  color: #fff;
  border-color: #f59e0b;
}
.btn-exec-warning:hover:not(:disabled) { background: #d97706; }

.btn-exec-danger-ghost {
  background: transparent;
  border-color: #fca5a5;
  color: #b91c1c;
}
.btn-exec-danger-ghost:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #f87171;
}

.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--teal-500, #14b8a6);
  padding: 0 .2rem;
  font-size: .9rem;
  vertical-align: middle;
  opacity: .8;
  transition: opacity .15s;
}
.btn-icon:hover { opacity: 1; }
.btn-icon-sm { font-size: .8rem; }

.exec-switch { position: relative; width: 42px; height: 24px; display: inline-block; vertical-align: middle; }
.exec-switch input { display: none; }
.exec-switch span {
  position: absolute;
  inset: 0;
  background: #e2e8f0;
  border-radius: 9999px;
  transition: .2s;
  cursor: pointer;
}
.exec-switch span::after {
  content: '';
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: .2s;
  box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.exec-switch input:checked + span { background: var(--teal-500, #14b8a6); }
.exec-switch input:checked + span::after { left: 21px; }
.exec-switch-lg { width: 52px; height: 28px; }
.exec-switch-lg span::after { width: 22px; height: 22px; top: 3px; left: 3px; }
.exec-switch-lg input:checked + span::after { left: 27px; }

.x-small { font-size: .72rem; }
.fw-600 { font-weight: 600; }

.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .02em;
}
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--slate-600, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #f0fdfa; color: #0f766e; border-color: #99f6e4 !important; }
.pill-red    { background: #fef2f2; color: #b91c1c; border-color: #fecaca !important; }
.pill-amber  { background: #fffbeb; color: #92400e; border-color: #fde68a !important; }

.empty-state {
  text-align: center;
  color: var(--slate-400, #94a3b8);
  font-size: 13px;
  font-style: italic;
  padding: 20px;
  background: var(--slate-50, #f8fafc);
  border-radius: 6px;
  border: 1px dashed var(--slate-300, #cbd5e1);
}

.edition-meta {
  font-size: .72rem;
  color: var(--slate-400, #94a3b8);
  line-height: 1.7;
}
.edition-meta b { color: var(--slate-600, #475569); }

.attempt-head {
  display: grid;
  grid-template-columns: 40px 170px 1fr 165px 165px 64px;
  gap: .5rem;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  font-weight: 700;
  color: var(--slate-400, #94a3b8);
  padding: .4rem .75rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.attempt-row {
  display: grid;
  grid-template-columns: 40px 170px 1fr 165px 165px 64px;
  gap: .5rem;
  align-items: start;
  padding: .75rem;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
  transition: background .12s;
}
.attempt-row:last-child { border-bottom: none; }
.attempt-row:hover { background: var(--slate-50, #f8fafc); }
.attempt-row__num {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--slate-400, #94a3b8);
  padding-top: .3rem;
  font-size: .88rem;
}

.attempt-timer { display: flex; align-items: center; gap: .4rem; }
.timer-btn {
  width: 26px; height: 26px; border-radius: 50%; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: .6rem; transition: all .15s;
}
.timer-btn--start { background: #d1fae5; color: #059669; }
.timer-btn--start:hover { background: #a7f3d0; }
.timer-btn--stop  { background: #fee2e2; color: #dc2626; }
.timer-btn--stop:hover  { background: #fecaca; }
.timer-btn:disabled { opacity: .5; cursor: default; }
.timer-display {
  font-size: .78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--slate-600, #475569);
}
.timer-display--active { color: #dc2626; }

.exec-tabs {
  list-style: none;
  display: flex;
  gap: .2rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
  margin: 0;
}
.exec-tabs__item {
  display: block;
  padding: .55rem .85rem;
  font-size: .8rem;
  font-weight: 500;
  color: var(--slate-400, #94a3b8);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all .15s;
}
.exec-tabs__item:hover { color: var(--slate-600, #475569); }
.exec-tabs__item--active {
  color: var(--navy-900, #0f172a);
  border-bottom-color: var(--teal-500, #14b8a6);
  font-weight: 700;
}
.exec-tabs__panel {
  padding: 1rem;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.exec-table {
  width: 100%;
  font-size: .82rem;
  border-collapse: collapse;
}
.exec-table thead tr {
  background: var(--slate-50, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.exec-table th {
  padding: 8px 12px;
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 700;
  color: var(--slate-400, #94a3b8);
  text-align: left;
}
.exec-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
  vertical-align: middle;
}
.exec-table tbody tr:last-child td { border-bottom: none; }
.exec-table tbody tr:hover { background: var(--slate-50, #f8fafc); }
.exec-table--sm th { padding: 6px 8px; font-size: .66rem; }
.exec-table--sm td { padding: 6px 8px; }

.modal-info-bar {
  display: flex;
  gap: 2rem;
  padding: .65rem 1rem;
  background: var(--slate-50, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  margin-bottom: .75rem;
  font-size: .85rem;
}

.user-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--navy-900, #0f172a); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 700; flex-shrink: 0;
}

.price-panel {
  background: var(--slate-50, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 1rem;
}
.price-panel__title {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--slate-400, #94a3b8);
  font-weight: 700;
  margin-bottom: .75rem;
}

.edition-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
}
.edition-card__header {
  background: var(--slate-50, #f8fafc);
  padding: .55rem .85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.edition-card__body { padding: .75rem .85rem; }

.editions-scroll-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.editions-scroll-container::-webkit-scrollbar { width: 5px; }
.editions-scroll-container::-webkit-scrollbar-thumb { background: var(--slate-200, #e2e8f0); border-radius: 4px; }

.insc-modal { display: flex; flex-direction: column; gap: 0; }

.insc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 1.1rem 1.25rem;
}
.insc-info { flex: 1; min-width: 0; }
.program-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--navy-900, #0f172a);
  margin-bottom: .3rem;
  line-height: 1.3;
}
.program-edition {
  display: inline-flex;
  align-items: center;
  font-size: .82rem;
  color: var(--slate-400, #94a3b8);
  background: var(--slate-100, #f1f5f9);
  padding: .15rem .55rem;
  border-radius: 4px;
}
.user-meta { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; }
.user-badge {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  background: var(--slate-50, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  padding: .25rem .65rem;
  border-radius: 999px;
  font-size: .82rem;
  color: var(--slate-600, #475569);
}
.user-icon {
  width: 18px; height: 18px;
  background: var(--slate-300, #cbd5e1);
  color: #fff;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .6rem;
}
.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: .25rem .65rem;
  border-radius: 6px;
  font-size: .78rem;
  font-weight: 600;
}
.profile-badge.is-student { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.profile-badge.is-pro     { background: var(--slate-100, #f1f5f9); color: var(--navy-900, #0f172a); border: 1px solid var(--border, #e2e8f0); }
.profile-badge.is-b2b     { background: #fdf4ff; color: #7e22ce; border: 1px solid #e9d5ff; }
.insc-price-box {
  text-align: right;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: .7rem 1.1rem;
  border-radius: 6px;
  min-width: 135px;
  flex-shrink: 0;
}
.price-label {
  display: block;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #166534;
  font-weight: 700;
  margin-bottom: .2rem;
}
.price-amount { font-weight: 800; color: #15803d; }

.summary-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
}
.summary-header {
  background: var(--slate-50, #f8fafc);
  padding: .65rem 1.1rem;
  font-weight: 700;
  color: var(--slate-600, #475569);
  font-size: .85rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.summary-body { padding: 1rem 1.1rem; }
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .6rem;
  font-size: .88rem;
}
.summary-divider {
  height: 0;
  border-top: 1px dashed var(--border, #e2e8f0);
  margin: .85rem 0;
}
.summary-row.total { margin-bottom: 0; align-items: flex-end; }
.label-total {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--slate-400, #94a3b8);
  font-weight: 700;
}
.value-total {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--navy-900, #0f172a);
  line-height: 1;
}

.fade-in { animation: execFadeIn .2s ease; }
@keyframes execFadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 991px) {
  .attempt-head { display: none; }
  .attempt-row {
    display: flex;
    flex-direction: column;
    background: var(--slate-50, #f8fafc);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    margin-bottom: .75rem;
    padding: .85rem;
    gap: .6rem;
  }
  .attempt-row__num {
    justify-content: flex-start;
    font-size: 1rem;
    color: var(--teal-500, #14b8a6);
    border-bottom: 1px solid var(--border, #e2e8f0);
    padding-bottom: .5rem;
  }
}

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 14px 16px; }
  .masthead-actions { width: 100%; justify-content: flex-end; }
  .exec-body { padding: 16px 12px; }
  .exec-form-wrapper { padding: 16px; }
  .exec-fieldset { padding: 14px 16px; }
}

@media (max-width: 576px) {
  .insc-header { flex-direction: column; }
  .insc-price-box { text-align: left; width: 100%; }
}

/* ══ PLAN DE CUOTAS ══════════════════════════════════════════ */
.installment-card {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.installment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .65rem 1rem;
  background: var(--slate-50, #f8fafc);
  border-bottom: 1px solid var(--border, #e2e8f0);
  gap: 1rem;
}

.installment-alert {
  background: #fef3c7;
  color: #92400e;
  border-bottom: 1px solid #fde68a;
  padding: .5rem 1rem;
  font-size: 11.5px;
  font-weight: 600;
}

.installment-body { padding: .5rem 0; }

.installment-row {
  display: grid;
  grid-template-columns: 28px 1fr 130px 80px;
  gap: .5rem;
  align-items: center;
  padding: .45rem 1rem;
  border-bottom: 1px solid var(--slate-50, #f8fafc);
  font-size: 12.5px;
}
.installment-row:last-child { border-bottom: none; }
.installment-row--head {
  background: var(--slate-50, #f8fafc);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 700;
  color: var(--slate-400, #94a3b8);
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.installment-row--invalid td,
.installment-row--invalid { background: #fff5f5; }
.installment-row--total {
  background: var(--slate-50, #f8fafc);
  border-top: 2px solid var(--border, #e2e8f0);
  font-size: 12.5px;
}

.cuota-num {
  font-weight: 700;
  color: var(--slate-400, #94a3b8);
  text-align: center;
  font-size: 11px;
}
.cuota-date-fixed {
  font-size: 12px;
  color: #15803d;
  font-weight: 600;
}
.cuota-date-input {
  height: 30px;
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  width: 100%;
}
.cuota-amount-fixed {
  font-weight: 700;
  color: #15803d;
  font-size: 12.5px;
}
.cuota-amount-editable {
  display: flex;
  align-items: center;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
  height: 30px;
  justify-content: flex-end;
}
.cuota-amount-editable.is-invalid { border-color: #f87171; background: #fff5f5; }
.currency-prefix {
  padding: 0 5px;
  font-size: 11px;
  color: var(--slate-400, #94a3b8);
  border-right: 1px solid var(--border, #e2e8f0);
  height: 100%;
  display: flex;
  align-items: center;
  background: var(--slate-50, #f8fafc);
  flex-shrink: 0;
}
.cuota-amount-input {
  border: none;
  outline: none;
  width: 90px;
  padding: 0 6px;
  font-size: 12.5px;
  font-weight: 600;
  text-align: right;
  background: transparent;
}
.cuota-amount-input::-webkit-inner-spin-button { opacity: .5; }

.pill-pending { background: #dbeafe; color: #1e40af; font-size: 9.5px; }
.pill-draft   { background: #f1f5f9; color: #475569; font-size: 9.5px; }
/* CurrencyInput dentro del plan de cuotas */
.cuota-currency-input {
  max-width: 130px;
  height: 30px !important;
  padding: 3px 8px !important;
  font-size: 12.5px !important;
  font-weight: 600;
  text-align: right;
  border-radius: 4px;
  border: 1px solid var(--border, #e2e8f0) !important;
  transition: border-color .15s;
}
.cuota-currency-input:focus {
  border-color: var(--teal-500, #14b8a6) !important;
  box-shadow: 0 0 0 2px rgba(20,184,166,.12) !important;
  outline: none;
}
.cuota-currency-input.is-invalid {
  border-color: #f87171 !important;
  background: #fff5f5 !important;
}

.installment-reserva-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .7rem 1rem;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  transition: min-height .2s;
}

.installment-divider {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .35rem 1rem;
  background: var(--slate-50);
  border-bottom: 1px solid var(--border, #e2e8f0);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--slate-400);
  font-weight: 700;
}

.installment-row--grand {
  background: #f0fdf4;
  border-top: 2px solid #bbf7d0;
  font-size: 12.5px;
  padding: .55rem 1rem;
  display: grid;
  grid-template-columns: 28px 1fr 130px 80px;
  gap: .5rem;
  align-items: center;
}

.installment-footer-note {
  padding: .5rem 1rem;
  font-size: 10.5px;
  color: var(--slate-400);
  border-top: 1px solid var(--border, #e2e8f0);
  background: var(--slate-50);
}
.exec-input-light.input-invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239,68,68,.12);
}
.program-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  font-size: .75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  text-decoration: none;
  flex-shrink: 0;
  transition: all .15s;
}
.program-link-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
}
.program-link-btn--disabled {
  background: var(--slate-100, #f1f5f9);
  border: 1px solid var(--slate-200, #e2e8f0);
  color: var(--slate-300, #cbd5e1);
  cursor: not-allowed;
}
.c-green { color: #15803d; }
/* ══ ESTADO ELIMINADO ══════════════════════════════════════ */
.delete-status-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
  border-radius: 7px;
  padding: .85rem 1.2rem;
  margin-bottom: 1.25rem;
  animation: pulseRed 2s ease-in-out infinite;
}
@keyframes pulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  50%       { box-shadow: 0 0 0 5px rgba(239,68,68,.12); }
}
.delete-banner-icon {
  color: #dc2626;
  flex-shrink: 0;
  font-size: 1.4rem;
}
.delete-banner-body {
  flex: 1;
  font-size: .85rem;
  display: flex;
  flex-direction: column;
  gap: .15rem;
  color: #7f1d1d;
}
.delete-banner-body strong { font-size: .9rem; color: #991b1b; }
.delete-banner-label { flex-shrink: 0; }

.select--danger {
  border-color: #f87171 !important;
  background: #fff5f5 !important;
  color: #b91c1c !important;
  font-weight: 700 !important;
  box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important;
}

/* Modal de confirmación eliminación */
.delete-confirm-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 1rem .5rem;
  gap: .75rem;
}
.delete-confirm-icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: #fef2f2;
  border: 2px solid #fca5a5;
  display: flex; align-items: center; justify-content: center;
  color: #dc2626;
}
.delete-confirm-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #7f1d1d;
  margin: 0;
}
.delete-confirm-desc {
  font-size: .88rem;
  color: #374151;
  margin: 0;
  line-height: 1.6;
  max-width: 340px;
}
.delete-confirm-lead-info {
  background: var(--slate-50, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: .55rem 1rem;
  font-size: .83rem;
  width: 100%;
}
.btn-exec-danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.btn-exec-danger:hover:not(:disabled) { background: #b91c1c; border-color: #b91c1c; }

/* Transición suave del banner */
.delete-warn-enter-active, .delete-warn-leave-active { transition: all .25s ease; }
.delete-warn-enter-from, .delete-warn-leave-to { opacity: 0; transform: translateY(-8px); }
.installment-row--diferida {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
}
.installment-reserva-row.is-split { align-items: flex-start; padding-top: .8rem; padding-bottom: .8rem; }

.reserva-id {
  display: flex;
  align-items: center;
  gap: .5rem;
  min-width: 155px;
  flex-shrink: 0;
}

.reserva-amounts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: .3rem;
}
.reserva-single {
  display: flex;
  align-items: center;
}
.reserva-split-line {
  display: flex;
  align-items: center;
  gap: .45rem;
}
.reserva-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  min-width: 54px;
  text-align: center;
  letter-spacing: .03em;
}
.reserva-error {
  display: flex;
  align-items: center;
  gap: .3rem;
  font-size: 10px;
  color: #dc2626;
  font-weight: 600;
  margin-top: .15rem;
}

.reserva-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-shrink: 0;
}
</style>
