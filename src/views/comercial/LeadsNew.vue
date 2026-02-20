<template>
  <div class="lf-wrapper">

    <!-- ══════════════════════════════════════════════
         ENCABEZADO
    ══════════════════════════════════════════════ -->
    <div class="lf-page-header">
      <div class="lf-page-header__left">
        <div class="lf-page-header__eyebrow">CRM Comercial</div>
        <h1 class="lf-page-header__title">Formulario Comercial</h1>
      </div>
      <button
        type="button"
        v-if="!form.enrollment_id && form.status_alias=='we_lead_status_bought' && isEdit && form.pay_date && form.client_status == 'we_client_person'"
        class="lf-btn lf-btn--warning lf-btn--lg"
        :disabled="form.enrollment_id"
        @click="openInscription()"
      >
        <i class="fa-solid fa-graduation-cap me-2"></i> INSCRIBIR
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         BODY
    ══════════════════════════════════════════════ -->
    <div v-if="loaded" class="lf-body">

      <!-- ─── SECCIÓN 1: Información del lead ─── -->
      <div class="lf-card">
        <div class="lf-card__header">
          <span class="lf-card__icon lf-card__icon--blue"><i class="fa-solid fa-bullseye"></i></span>
          <span class="lf-card__title">Información del lead</span>
        </div>
        <div class="lf-card__body">
          <div class="row g-3">

            <div class="col-md-3">
              <label class="lf-label">Fecha contacto inicial <span class="lf-required">*</span></label>
              <DateTime12
                :onlyHours="true"
                :disabled="isEdit"
                v-model="form.fechaContactoInicial"
                required
                clearable
                :config="dateLimitConfig"
              />
            </div>

            <div class="col-md-5"></div>

            <div class="col-6 col-md-4">
              <label class="lf-label">T. Consulta</label>
              <SearchSelect
                v-model="form.query_alias"
                :items="queryCatalog"
                label-field="description"
                value-field="alias"
                placeholder="PROMOCIÓN..."
                :model-label="form.query_label"
              />
            </div>

            <div class="col-6 col-md-4 col-lg-3">
              <label class="lf-label">Categoría <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.category_alias"
                :items="programTypeCatalog"
                label-field="description"
                value-field="alias"
                :viewOpen="6"
                placeholder="CATEGORÍA..."
                @change="onProgramaTypeChange"
              />
            </div>

            <div class="col-6 col-md-4 col-lg-2"
              v-if="['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.category_alias">
              <label class="lf-label">Modalidad <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.program_modality_alias"
                :items="programModalityCatalog"
                label-field="description"
                :viewOpen="6"
                value-field="alias"
                placeholder="MODALIDAD..."
                @change="onProgramaTypeChange"
              />
            </div>

            <div class="col-6 col-md-4"
              v-if="form.category_alias &&
                (!['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) ||
                (['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.program_modality_alias))">
              <label class="lf-label">
                Producto / Programa <span class="lf-required">*</span>
                <button
                  v-if="form.program_version_id"
                  type="button"
                  class="lf-icon-btn ms-1"
                  @click="openProgramVersionDetail()"
                  title="Ver detalles del programa"
                >
                  <i class="fa-solid fa-circle-info"></i>
                </button>
              </label>
              <SearchSelect
                v-model="form.program_version_id"
                mode="remote"
                :fetcher="q => programService.programVersionCaller({ q,
                  cat_type_program: programTypeCatalog.find(e=>e.alias==form.category_alias).id,
                  cat_model_modality: !form.program_modality_alias ? null : programModalityCatalog.find(e=>e.alias==form.program_modality_alias).id
                })"
                label-field="abbreviation"
                sublabel-field="version_code"
                value-field="program_version_id"
                :viewOpen="6"
                :model-label="form.program_label"
                placeholder="Buscar programa…"
                :minChars="0"
                :cache="false"
                @change="onProgramaChange"
              />
            </div>

            <div class="col-12 col-lg-3"
              v-if="(isEdit && form.edition_id) || (form.program_modality_selected_alias && form.program_modality_selected_alias!='we_modality_online' && form.category_alias && form.program_version_id && !['we_program_type_event','we_program_type_membership'].includes(form.category_alias))">
              <label class="lf-label">Edición / Fecha prevista <span class="lf-required">*</span></label>
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
              />
              <div v-if="currentEdition" class="lf-edition-meta mt-2">
                <div><b>Inicio:</b> {{ currentEdition.inicio }}</div>
                <div><b>Fin:</b> {{ currentEdition.fin }}</div>
                <div><b>Docente:</b> {{ currentEdition.docente }}</div>
                <div><b>Horario:</b> {{ currentEdition.horario }}</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN 2: Datos del contacto ─── -->
      <div class="lf-card" v-if="isEdit || validateLeadInfo()">
        <div class="lf-card__header">
          <span class="lf-card__icon lf-card__icon--emerald"><i class="fa-solid fa-user"></i></span>
          <span class="lf-card__title">Datos del contacto</span>
        </div>
        <div class="lf-card__body">
          <div class="row g-3">

            <div class="col-6 col-md-3 col-lg-2">
              <label class="lf-label">T. Contacto</label>
              <SearchSelect
                v-model="form.client_status"
                :items="clientCatalog"
                label-field="description"
                value-field="alias"
                placeholder="TIPO..."
                required
                :model-label="form.client_status_label"
              />
            </div>

            <div class="col-6 col-md-6 col-lg-3">
              <label class="lf-label">Nombre / Razón Social</label>
              <input
                required
                autocomplete="off"
                v-model="form.full_name"
                type="text"
                class="form-control"
                placeholder="NOMBRE COMPLETO"
                v-restrict="{ transform: 'upper', trim: true }"
              />
            </div>

            <div class="col-6 col-md-3 col-lg-3">
              <label class="lf-label">
                Teléfono <span class="lf-required">*</span>
                <span v-if="searchingPhone" class="ms-2 badge bg-warning text-dark scale-in-center">
                  <i class="fas fa-spinner fa-spin"></i> Buscando...
                </span>
                <button
                  type="button"
                  class="lf-icon-btn ms-1"
                  @click="openPhoneDetail()"
                  title="Ver historial del cliente"
                >
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
              </label>
              <div class="input-group flex-nowrap">
                <input
                  autocomplete="off"
                  v-model="form.telefono"
                  type="text"
                  v-restrict="{ only: 'numbers', max: 15 }"
                  required
                  class="form-control"
                  :class="{ 'is-valid': leadDataHistory && !searchingPhone }"
                  placeholder="TELÉFONO + ENTER"
                  @keyup.enter="searchLeadByPhone"
                  :disabled="searchingPhone"
                />
              </div>
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="lf-label">E. Cliente</label>
              <SearchSelect
                v-model="form.cat_client_moment_alias"
                :items="momentCatalog"
                label-field="description"
                value-field="alias"
                placeholder="E. Cliente..."
                required
                :model-label="form.cat_client_moment_label"
              />
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="lf-label">Membresía</label>
              <SearchSelect
                v-model="form.membership_moment_id"
                :items="membershipList"
                label-field="tier_name"
                value-field="membership_tier_id"
                placeholder="MEMBRESÍA..."
                :model-label="form.membership_tier_label"
              />
            </div>

            <div class="col-6 col-md-3 col-lg-2">
              <label class="lf-label">Status <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.status_alias"
                :items="leadStatusCatalog"
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
              <label class="lf-label">Ocupación / Situación <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.ocupacion_alias"
                :items="prospectSituationCatalog"
                :viewOpen="6"
                label-field="description"
                value-field="alias"
                :model-label="form.ocupacion_label"
                placeholder="OCUPACIÓN..."
              />
            </div>

            <div class="col-6 col-md-3 col-md-2">
              <label class="lf-label">País <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.country_alias"
                :items="countryCatalog"
                :viewOpen="6"
                label-field="description"
                value-field="alias"
                required
                placeholder="PAÍS..."
              />
            </div>

          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN 3: Estado comercial y marketing ─── -->
      <div class="lf-card" v-if="isEdit || (validateLeadInfo() && validateContactInfo())">
        <div class="lf-card__header">
          <span class="lf-card__icon lf-card__icon--violet"><i class="fa-solid fa-chart-line"></i></span>
          <span class="lf-card__title">Estado comercial y marketing</span>
        </div>
        <div class="lf-card__body">
          <div class="row g-3">

            <div class="col-md-3">
              <label class="lf-label">F. Pago (prevista)</label>
              <BaseDatePicker
                v-model="form.pay_date"
                :required="form.status_alias=='we_lead_status_bought'"
                :config="dateLimitConfig"
                placeholder="dd/mm/aaaa"
              />
            </div>

            <div class="col-md-3">
              <label class="lf-label">Nivel de interés <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.nivel_alias"
                :items="leadInterestCatalog"
                required
                label-field="description"
                value-field="alias"
                :model-label="form.nivel_label"
                placeholder="NIVEL..."
              />
            </div>

            <div class="col-md-6">
              <label class="lf-label">Mensaje de chat <span class="lf-required">*</span></label>
              <textarea
                v-model="form.mensajeChat"
                class="form-control"
                placeholder="MENSAJE CHAT"
                required
                rows="2"
                @input="handleMensajeChatInput"
                style="resize: vertical; min-height: 80px;"
              ></textarea>
            </div>

            <div class="col-md-3">
              <label class="lf-label">Canal prospección <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.canal_alias"
                :items="socialMediaCatalog"
                required
                label-field="description"
                value-field="alias"
                :model-label="form.canal_label"
                @change="onChannelChange"
                placeholder="CANAL..."
              />
            </div>

            <div class="col-md-3">
              <label class="lf-label">Medio de llegada <span class="lf-required">*</span></label>
              <SearchSelect
                v-model="form.medium_alias"
                :items="socialMediaCatalog"
                required
                label-field="description"
                :model-label="form.medium_label"
                value-field="alias"
                placeholder="MEDIO..."
              />
            </div>

            <div class="col-md-3">
              <label class="lf-label">Palabra MKT</label>
              <SearchSelect
                v-model="form.key_word_alias"
                :items="mktWordsCatalog"
                :model-label="form.key_word_label"
                label-field="description"
                value-field="alias"
                placeholder="MKT..."
              />
            </div>

            <div class="col-md-3">
              <label class="lf-label">Estrategia</label>
              <SearchSelect
                v-model="form.strategy_alias"
                :disabled="!form.canal_alias || form.canal_alias!='we_social_media_other'"
                :items="strategyCatalog"
                label-field="description"
                value-field="alias"
                @change="onStrategyChange"
                placeholder="ESTRATEGIA..."
              />
            </div>

            <div class="col-md-12">
              <label class="lf-label">Observaciones</label>
              <textarea
                v-model="form.observacion"
                class="form-control"
                rows="2"
                style="resize: vertical; min-height: 80px;"
              ></textarea>
            </div>

          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN 4: Seguimiento ─── -->
      <div class="lf-card" v-if="isEdit || (validateLeadInfo(), validateContactInfo(), validateCommercialInfo())">
        <div class="lf-card__header">
          <span class="lf-card__icon lf-card__icon--amber"><i class="fa-solid fa-phone-volume"></i></span>
          <span class="lf-card__title">Seguimiento / Intentos de contacto</span>
          <button type="button" class="lf-btn lf-btn--outline lf-btn--sm ms-auto" @click="addContacto">
            <i class="fa-solid fa-plus me-1"></i> Añadir intento
          </button>
        </div>
        <div class="lf-card__body">

          <!-- Cabecera de tabla (solo desktop) -->
          <div class="lf-attempt-head d-none d-lg-grid mb-2">
            <div class="text-center">#</div>
            <div>Tipo / Duración</div>
            <div>Fecha y Hora <span class="lf-required">*</span></div>
            <div>T. Respuesta</div>
            <div>Observación</div>
            <div></div>
          </div>

          <!-- Filas -->
          <div
            v-for="(c, idx) in form.contactos"
            :key="c.id || idx"
            class="lf-attempt-row"
          >
            <!-- # -->
            <div class="lf-attempt-row__num">
              <span class="d-lg-none me-1 text-muted" style="font-size:.75rem">Intento</span>
              <strong>{{ idx + 1 }}</strong>
            </div>

            <!-- Tipo / Duración -->
            <div class="lf-attempt-row__type">
              <label class="lf-label d-lg-none">Tipo / Duración</label>
              <SearchSelect
                v-model="c.cat_type_attempt"
                :items="lAttempts"
                label-field="description"
                value-field="alias"
                placeholder="TIPO..."
                :disabled="!!c.id"
              />
              <div class="lf-timer mt-2" v-if="c.cat_type_attempt === 'we_attempt_call'">
                <button
                  type="button"
                  class="lf-timer__btn"
                  :class="c.timerActive ? 'lf-timer__btn--stop' : 'lf-timer__btn--start'"
                  @click="toggleTimer(c)"
                  :disabled="!!c.id && c.calling_alias !== 'we_calling_pending'"
                  :title="c.timerActive ? 'Detener' : 'Iniciar'"
                >
                  <i class="fa-solid" :class="c.timerActive ? 'fa-stop' : 'fa-play'"></i>
                </button>
                <span class="lf-timer__display" :class="c.timerActive ? 'lf-timer__display--active' : ''">
                  {{ formatDuration(c.contact_duration) }}
                </span>
              </div>
            </div>

            <!-- Fecha -->
            <div class="lf-attempt-row__date">
              <label class="lf-label d-lg-none">Fecha y Hora <span class="lf-required">*</span></label>
              <DateTime12
                v-model="c.fechaContactoProximo"
                required
                clearable
                :onlyHours="true"
                :disabled="c.calling_alias != 'we_calling_pending'"
                :config="dateLimitConfig"
              />
            </div>

            <!-- Resultado -->
            <div class="lf-attempt-row__result">
              <label class="lf-label d-lg-none">T. Resultado</label>
              <SearchSelect
                v-model="c.calling_alias"
                :items="callingCatalog"
                label-field="description"
                required
                value-field="alias"
                placeholder="T. RESPUESTA..."
                :model-label="c.calling_label"
                :disabled="c.calling_alias != 'we_calling_pending' && c.calling_alias!=null"
              />
            </div>

            <!-- Observación -->
            <div class="lf-attempt-row__obs">
              <label class="lf-label d-lg-none">Observación</label>
              <textarea
                v-model="c.respuesta"
                class="form-control form-control-sm"
                rows="2"
                placeholder="Observación..."
                :disabled="c.calling_alias != 'we_calling_pending'"
                style="resize: vertical; min-height: 38px;"
              ></textarea>
            </div>

            <!-- Eliminar -->
            <div class="lf-attempt-row__del">
              <button
                v-if="!c.id"
                type="button"
                class="lf-btn lf-btn--danger-ghost lf-btn--sm w-100"
                @click="removeContacto(idx)"
              >
                <i class="fa-solid fa-trash-can"></i>
                <span class="d-lg-none ms-2">Eliminar</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      <!-- ─── SECCIÓN 5: Estado del Registro ─── -->
      <div class="lf-card lf-card--flat" v-if="isEdit">
        <div class="lf-card__body d-flex align-items-center gap-3">
          <span class="lf-label mb-0">Estado del Registro <span class="lf-required">*</span></span>
          <label class="lf-switch">
            <input type="checkbox" v-model="form.active" />
            <span></span>
          </label>
          <span class="lf-switch-label">{{ form.active ? 'Activo' : 'Inactivo' }}</span>
        </div>
      </div>

    </div><!-- /lf-body -->

    <!-- ══════════════════════════════════════════════
         FOOTER
    ══════════════════════════════════════════════ -->
    <div class="lf-footer">
      <button type="button" class="lf-btn lf-btn--outline" @click="cancelar">
        {{ form.enrollment_id ? 'Volver' : 'Cancelar' }}
      </button>
      <button
        v-if="!form.enrollment_id && (isEdit || (validateLeadInfo(), validateContactInfo(), validateCommercialInfo()))"
        type="button"
        class="lf-btn lf-btn--primary"
        @click="guardar"
        :disabled="saving || form.enrollment_id"
      >
        <i class="fa-solid fa-floppy-disk me-2" v-if="!saving"></i>
        <i class="fa-solid fa-spinner fa-spin me-2" v-else></i>
        {{ saving ? 'Guardando...' : 'Guardar lead' }}
      </button>
    </div>

  </div><!-- /lf-wrapper -->


  <!-- ════════════════════════════════════════════════════════
       MODAL: Historial del Cliente
  ════════════════════════════════════════════════════════ -->
  <BaseModal v-model="showClientHistory" title="Historial Completo del Cliente" size="xl">

    <div v-if="loadingHistory" class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando historial...</span>
      </div>
    </div>

    <div v-else class="d-flex flex-column">

      <!-- Info rápida -->
      <div class="lf-modal-info-bar">
        <div><small class="text-muted d-block">Cliente (Formulario)</small><strong>{{ form.full_name || 'Nombre Desconocido' }}</strong></div>
        <div><small class="text-muted d-block">Teléfono</small><strong>{{ form.telefono || '---' }}</strong></div>
      </div>

      <!-- Tabs -->
      <ul class="lf-tabs">
        <li><a class="lf-tabs__item" :class="{ 'lf-tabs__item--active': activeHistoryTab === 'historico' }" href="#" @click.prevent="activeHistoryTab = 'historico'">
          <i class="fa-solid fa-list me-1"></i> Histórico
          <span class="lf-badge" v-if="clientHistoryLegacy.length">{{ clientHistoryLegacy.length }}</span>
        </a></li>
        <li><a class="lf-tabs__item" :class="{ 'lf-tabs__item--active': activeHistoryTab === 'asesoria' }" href="#" @click.prevent="activeHistoryTab = 'asesoria'">
          <i class="fa-solid fa-headset me-1"></i> Asesoría / CRM
        </a></li>
        <li><a class="lf-tabs__item" :class="{ 'lf-tabs__item--active': activeHistoryTab === 'inscripcion' }" href="#" @click.prevent="activeHistoryTab = 'inscripcion'">
          <i class="fa-solid fa-graduation-cap me-1"></i> Inscripciones
        </a></li>
      </ul>

      <div class="lf-tabs__panel">

        <!-- Histórico -->
        <div v-if="activeHistoryTab === 'historico'" class="fade-in">
          <div v-if="clientHistoryLegacy.length === 0" class="alert alert-info text-center">
            No se encontró historial legado para este número.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0">
              <thead class="table-light">
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

        <!-- Asesoría -->
        <div v-if="activeHistoryTab === 'asesoria'" class="fade-in">
          <div v-if="clientHistoryLeads.length === 0" class="alert alert-info text-center">
            No se encontraron gestiones de CRM recientes.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0">
              <thead class="table-light">
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
                      <span class="badge bg-light text-dark border mt-1">
                        <i class="fa-regular fa-calendar me-1"></i> {{ lead.edition }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center">
                      <div class="lf-avatar me-2">{{ lead.user_registration_full_name ? lead.user_registration_full_name.charAt(0) : '?' }}</div>
                      <small class="text-truncate" style="max-width:120px" :title="lead.user_registration_full_name">
                        {{ lead.user_registration_full_name || 'Sistema' }}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span class="badge"
                      :class="{
                        'bg-success': ['Inscrito','Pagó','Matriculado'].includes(lead.cat_status_lead_label),
                        'bg-warning text-dark': ['Interesado','En Seguimiento','Prox. Inicio'].includes(lead.cat_status_lead_label),
                        'bg-info text-dark': ['Atendido'].includes(lead.cat_status_lead_label),
                        'bg-danger': ['No Interesado','Rechazado'].includes(lead.cat_status_lead_label),
                        'bg-secondary': !['Inscrito','Pagó','Interesado','Atendido','No Interesado'].includes(lead.cat_status_lead_label)
                      }">
                      {{ lead.cat_status_lead_label || 'Pendiente' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-white text-dark border">
                      {{ lead.count_calling }} <i class="fa-solid fa-phone ms-1 text-muted" style="font-size:.7rem"></i>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Inscripciones -->
        <div v-if="activeHistoryTab === 'inscripcion'" class="fade-in">
          <div class="table-responsive">
            <table class="table table-hover table-sm align-middle mb-0">
              <thead class="table-light">
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
                  <td><span class="badge" :class="item.estado === 'Finalizado' ? 'bg-success' : 'bg-warning text-dark'">{{ item.estado }}</span></td>
                  <td class="text-center"><span class="fw-bold" :class="item.nota >= 14 ? 'text-primary' : 'text-danger'">{{ item.nota || '-' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </BaseModal>


  <!-- ════════════════════════════════════════════════════════
       MODAL: Detalle del Programa
  ════════════════════════════════════════════════════════ -->
  <BaseModal v-model="showProgramDetail" title="Detalle del Programa" size="lg">

    <div v-if="loadingDetail" class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div>
    </div>

    <div v-else-if="modelProgramVersion" class="d-flex flex-column">
      <ul class="lf-tabs mt-2" v-if="hasEditions">
        <li><a class="lf-tabs__item" :class="{ 'lf-tabs__item--active': activeTab === 'info' }" href="#" @click.prevent="activeTab = 'info'">
          <i class="fa-solid fa-file-lines me-1"></i> General
        </a></li>
        <li><a class="lf-tabs__item" :class="{ 'lf-tabs__item--active': activeTab === 'editions' }" href="#" @click.prevent="activeTab = 'editions'">
          <i class="fa-solid fa-calendar-days me-1"></i> Ediciones ({{ modelProgramVersion.editions_json.length }})
        </a></li>
      </ul>

      <div class="lf-tabs__panel" :class="{'rounded-top': !hasEditions}">

        <div v-if="activeTab === 'info'" class="fade-in">
          <div class="text-center mb-4 mt-2">
            <h4 class="fw-bold text-primary mb-0">{{ modelProgramVersion.program_name }}</h4>
            <small class="text-muted">Versión: {{ modelProgramVersion.version_code }}</small>
          </div>
          <div class="row g-3 mb-4 text-center">
            <div class="col-4">
              <small class="d-block text-secondary">Tipo</small>
              <span class="badge bg-light text-dark border">{{ modelProgramVersion.cat_type_program_label }}</span>
            </div>
            <div class="col-4">
              <small class="d-block text-secondary">Modalidad</small>
              <span class="badge bg-info bg-opacity-10 text-info border-info">{{ modelProgramVersion.cat_model_modality_label }}</span>
            </div>
            <div class="col-4">
              <small class="d-block text-secondary">Sesiones</small>
              <span class="fw-bold">{{ modelProgramVersion.sessions }}</span>
            </div>
          </div>

          <div class="lf-price-panel mb-4">
            <div class="lf-price-panel__title">Precios Referenciales</div>
            <div class="row">
              <div class="col-6 border-end text-center">
                <small class="text-muted">Estudiante</small>
                <div class="fw-bold">S/ {{ modelProgramVersion.price_student_soles }}</div>
                <small class="text-secondary">$ {{ modelProgramVersion.price_student_dollars }}</small>
              </div>
              <div class="col-6 text-center">
                <small class="text-muted">Profesional</small>
                <div class="fw-bold">S/ {{ modelProgramVersion.price_profesional_soles }}</div>
                <small class="text-secondary">$ {{ modelProgramVersion.price_profesional_dollars }}</small>
              </div>
            </div>
          </div>

          <div class="d-grid gap-2" v-if="modelProgramVersion.link">
            <a :href="modelProgramVersion.link" target="_blank" class="btn btn-outline-primary">
              <i class="fa-solid fa-external-link-alt me-2"></i> Ver landing page / Temario
            </a>
          </div>
          <div v-if="!hasEditions" class="alert alert-secondary text-center mt-3 mb-0 py-2 small">
            <i class="fa-solid fa-calendar-xmark me-1"></i> No hay ediciones programadas visibles.
          </div>
        </div>

        <div v-if="activeTab === 'editions'" class="fade-in">
          <div class="editions-scroll-container">
            <div v-for="edition in modelProgramVersion.editions_json" :key="edition.edition_num_id" class="lf-edition-card mb-3">
              <div class="lf-edition-card__header">
                <div>
                  <span class="badge bg-primary me-2">{{ edition.global_code }}</span>
                  <span class="fw-bold" style="font-size:.9rem">Inicio: {{ formatDate(edition.start_date) }}</span>
                </div>
                <span class="badge"
                  :class="(edition.vacant !== null && edition.vacant !== undefined) ? (edition.vacant > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger') : 'bg-secondary'">
                  {{ (edition.vacant !== null && edition.vacant !== undefined) ? (edition.vacant > 0 ? `${edition.vacant} Vacantes` : 'Lleno') : 'Sin Vacantes' }}
                </span>
              </div>
              <div class="lf-edition-card__body">
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
                  <div class="p-2 bg-light rounded border">
                    <h6 class="text-uppercase text-muted mb-2" style="font-size:.7rem;letter-spacing:.5px">Estructura Académica / Módulos</h6>
                    <div class="table-responsive">
                      <table class="table table-sm table-borderless mb-0 small align-middle">
                        <thead class="text-secondary border-bottom">
                          <tr><th>Módulo</th><th>Fecha</th><th>Horario</th><th>Docente</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="child in edition.edition_children" :key="child.edition_num_id">
                            <td class="fw-bold text-primary">{{ child.abbreviation }}</td>
                            <td>{{ formatDate(child.start_date) }}</td>
                            <td><div v-for="(csch,ci) in child.schedules" :key="ci" style="line-height:1.1"><small>{{ csch.day_combination_label }}</small></div></td>
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

    <div v-else class="text-center py-5 text-muted">
      No se encontró información detallada para este programa.
    </div>
  </BaseModal>


  <!-- ════════════════════════════════════════════════════════
       MODAL: Inscripción
  ════════════════════════════════════════════════════════ -->
  <BaseModal v-model="showViewModal" title="Inscripción del lead" size="xl">
    <div class="insc-modal">

      <!-- Header programa -->
      <header class="insc-header">
        <div class="insc-info">
          <h5 class="program-title">
            {{ form.program_label || currentProgram?.description || '— Programa no seleccionado —' }}
          </h5>
          <div class="program-edition" v-if="form.edition_label">
            <i class="fa-solid fa-calendar-days me-1"></i>
            <span>Edición: {{ form.edition_label }}</span>
          </div>
          <div class="user-meta mt-2">
            <div class="user-badge">
              <div class="user-icon"><i class="fa-solid fa-user"></i></div>
              <span class="user-name text-truncate">{{ form.telefono }}</span>
            </div>
            <div v-if="clientProfileType"
              class="profile-badge"
              :class="clientProfileType === 'estudiante' ? 'is-student' : 'is-pro'">
              <i class="fa-solid" :class="clientProfileType === 'estudiante' ? 'fa-graduation-cap' : 'fa-briefcase'"></i>
              <span>{{ clientProfileType === 'estudiante' ? 'Estudiante' : 'Profesional' }}</span>
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
              class="form-control form-control-sm fw-bold border-0 bg-transparent text-end p-0"
              style="font-size:1.5rem;color:var(--lf-blue);max-width:150px"
              placeholder="0.00"
            />
          </div>
        </div>
      </header>

      <!-- Datos cliente -->
      <div class="insc-section">
        <h6 class="insc-section__title">Datos del Cliente / Inscripción</h6>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="lf-label">T. documento <span class="lf-required">*</span></label>
            <SearchSelect required v-model="insc.cat_type_document" :items="docTypeCatalog" label-field="description" placeholder="T. DOCUMENTO" value-field="alias" />
          </div>
          <div class="col-md-4">
            <label class="lf-label">Documento <span class="lf-required">*</span></label>
            <input
              autocomplete="off" required v-model="insc.document" type="text"
              :placeholder="docConfig.placeholder" class="form-control"
              :maxlength="docConfig.maxLength" @keyup.enter="searchSunat"
              v-restrict="{ trim:true, spaces:false, max:docConfig.maxLength, only:docConfig.isNumeric?'numbers':undefined, transform:'upper' }"
            />
            <small v-if="insc.document && insc.document.length !== docConfig.maxLength && docConfig.isNumeric" class="text-warning d-block mt-1" style="font-size:.7rem">
              <i class="fa-solid fa-circle-exclamation me-1"></i> Se esperan {{ docConfig.maxLength }} dígitos
            </small>
          </div>
          <div class="col-md-4">
            <label class="lf-label">Correo <span class="lf-required">*</span></label>
            <input autocomplete="off" required v-model="insc.email" type="email" placeholder="CORREO" class="form-control" v-restrict="{ trim:true, spaces:false, transform:'lower' }" />
          </div>
          <div class="col-md-4">
            <label class="lf-label">Nombres <span class="lf-required">*</span></label>
            <input autocomplete="off" required v-model="insc.full_name" type="text" placeholder="NOMBRES" class="form-control" v-restrict="{ transform:'upper', trim:true, only:'letters' }" />
          </div>
          <div class="col-md-4">
            <label class="lf-label">Apellido Paterno <span class="lf-required">*</span></label>
            <input autocomplete="off" required v-model="insc.last_name" type="text" placeholder="A. PATERNO" class="form-control" v-restrict="{ transform:'upper', trim:true, only:'letters' }" />
          </div>
          <div class="col-md-4">
            <label class="lf-label">Apellido Materno <span class="lf-required">*</span></label>
            <input autocomplete="off" required v-model="insc.mother_last_name" type="text" placeholder="A. MATERNO" class="form-control" v-restrict="{ transform:'upper', trim:true, only:'letters' }" />
          </div>
          <div class="col-md-4">
            <label class="lf-label">Modalidad del programa <span class="lf-required">*</span></label>
            <SearchSelect required v-model="insc.cat_insc_modality" :model-label="form.program_modality_label" :items="inscModalidades" label-field="description" placeholder="M. PROGRAMA" value-field="alias" />
          </div>
        </div>
      </div>

      <!-- Condiciones de pago -->
      <div class="insc-section" v-if="isEdit || validateInscriptionClientInfo()">
        <h6 class="insc-section__title">Condiciones de pago</h6>
        <div class="row g-3">
          <div class="col-md-2">
            <label class="lf-label">T. moneda <span class="lf-required">*</span></label>
            <SearchSelect v-model="insc.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." />
          </div>
          <div class="col-md-2" v-if="insc.selectedCurrencyAlias">
            <label class="lf-label">Modalidad de pago <span class="lf-required">*</span></label>
            <SearchSelect v-model="insc.cat_type_payment" required :items="inscPaymentModes" placeholder="M. PAGO" label-field="description" value-field="alias" />
          </div>
          <div class="col-md-4" v-if="insc.selectedCurrencyAlias">
            <label class="lf-label">Medio de Pago <span class="lf-required">*</span></label>
            <SearchSelect v-model="insc.cat_method_payment" :items="paymentMethodCatalog" required label-field="description" value-field="alias" placeholder="MEDIO..." />
          </div>
          <div class="col-md-4" v-if="insc.selectedCurrencyAlias && insc.cat_type_payment=='we_payment_way_installments'">
            <label class="lf-label">Adelanto / Reserva <span class="lf-required">*</span></label>
            <CurrencyInput v-model="insc.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
          </div>

          <div class="col-md-4" v-if="isEdit || validateInscriptionPaymentInfo()">
            <label class="lf-label">Descuento</label>
            <SearchSelect v-model="insc.dsct_porcent_id" mode="remote"
              :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_percentage').id, cat_currency: selectedCurrencyAlias })"
              label-field="full_label" value-field="id" :viewOpen="6" placeholder="DESCUENTO (%)" :minChars="0" :cache="false" @change="onChangeDescuentoPorcentual" />
          </div>
          <div class="col-md-4" v-if="isEdit || validateInscriptionPaymentInfo()">
            <label class="lf-label">Promoción</label>
            <SearchSelect v-model="insc.dsct_stick_id" mode="remote" :viewOpen="6"
              :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_fixed').id, cat_currency: selectedCurrency.alias })"
              label-field="full_label" value-field="id" placeholder="DESCUENTO (S/)" :minChars="0" :cache="false" @change="onChangeDescuentoFijo" />
          </div>
          <div class="col-md-4" v-if="isEdit || validateInscriptionPaymentInfo()">
            <label class="lf-label">Beneficio</label>
            <SearchSelect v-model="insc.dsct_benefit_id" mode="remote"
              :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_benefit').id, cat_currency: selectedCurrency.alias })"
              label-field="full_label" value-field="id" :viewOpen="6" placeholder="DESCUENTO (S/)" :minChars="0" :cache="false" @change="onChangeBeneficio" />
          </div>
        </div>
      </div>

      <!-- Documentación -->
      <div class="insc-section" v-if="(isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())) && insc.cat_method_payment!='we_payment_method_token' && insc.cat_method_payment!='we_payment_method_web'">
        <h6 class="insc-section__title">Documentación Adjunta</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="lf-label fw-semibold mb-2">Comprobante de Pago</label>
            <FileUploader label="Clic para subir Voucher" :required="true" v-model="form.ticket_payment_url" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" />
          </div>
          <div class="col-md-6">
            <label class="lf-label fw-semibold mb-2">Carnet / Documento ID</label>
            <FileUploader label="Subir carnet estudiantil" v-model="form.carnet_url" accept=".pdf,.doc,.docx" />
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="insc-section" v-if="isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())">
        <div class="summary-card">
          <div class="summary-header"><i class="fa-solid fa-receipt me-2"></i> Resumen de Transacción</div>
          <div class="summary-body">
            <div class="summary-row">
              <span class="label">Precio del programa</span>
              <span class="value text-muted">{{ selectedCurrency.symbol }} {{ insc.montoOriginal?.toLocaleString('es-PE',{minimumFractionDigits:2}) || '0.00' }}</span>
            </div>
            <div class="summary-row" v-if="insc.dsct_porcent_id">
              <span class="label">Descuento</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoDescuentoPorcentaje?.toLocaleString('es-PE',{minimumFractionDigits:2}) || '0.00' }}</span>
            </div>
            <div class="summary-row" v-if="insc.dsct_stick_id">
              <span class="label">Promoción</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoDescuentoFijo?.toLocaleString('es-PE',{minimumFractionDigits:2}) || '0.00' }}</span>
            </div>
            <div class="summary-row" v-if="insc.dsct_benefit_id">
              <span class="label">Beneficio</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoBeneficio?.toLocaleString('es-PE',{minimumFractionDigits:2}) || '0.00' }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row total">
              <div class="d-flex flex-column">
                <span class="label-total">MONTO FINAL A PAGAR</span>
                <small class="text-muted fw-normal" v-if="insc.cat_type_payment!='we_payment_way_single'">
                  (Adelanto requerido: {{ selectedCurrency.symbol }}{{ insc.saved_money }})
                </small>
              </div>
              <span class="value-total">{{ selectedCurrency.symbol }} {{ insc.total_amount?.toLocaleString('es-PE',{minimumFractionDigits:2}) || '0.00' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Observaciones -->
      <div class="insc-section">
        <h6 class="insc-section__title">Observaciones</h6>
        <div class="row g-3">
          <div :class="insc.cat_method_payment=='we_payment_method_web'?'col-md-6':'col-md-12'">
            <textarea v-model="insc.observacions" class="form-control" required rows="2" style="resize:vertical;min-height:80px"></textarea>
          </div>
          <div class="col-md-6" v-if="insc.cat_method_payment=='we_payment_method_web'">
            <label class="lf-label fw-bold mb-1">Adjuntos</label>
            <MultiFileUploader v-model="insc.attachments" label="Agregar Constancia" />
          </div>
        </div>
      </div>

    </div><!-- /insc-modal -->

    <template #footer>
      <button class="lf-btn lf-btn--outline lf-btn--sm" @click="showViewModal = false">Cerrar</button>
      <button class="lf-btn lf-btn--primary lf-btn--sm" @click="confirmarInscripcion" :disabled="savingInsc || form.enrollment_id">
        <i class="fa-solid fa-spinner fa-spin me-1" v-if="savingInsc"></i>
        {{ savingInsc ? 'Guardando...' : 'Guardar inscripción' }}
      </button>
    </template>
  </BaseModal>

</template>


<!-- ═══════════════════════════════════════════════════════════════════
     STYLES
═══════════════════════════════════════════════════════════════════ -->
<style scoped>

/* ── Variables ─────────────────────────────────────────────────── */
:root {
  --lf-blue:    #2563eb;
  --lf-emerald: #059669;
  --lf-violet:  #7c3aed;
  --lf-amber:   #d97706;
  --lf-gray-50: #f8fafc;
  --lf-gray-100:#f1f5f9;
  --lf-gray-200:#e2e8f0;
  --lf-gray-400:#94a3b8;
  --lf-gray-600:#475569;
  --lf-gray-800:#1e293b;
  --lf-radius:  10px;
  --lf-shadow:  0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --lf-shadow-md: 0 4px 12px rgba(0,0,0,.08);
}

/* ── Layout ────────────────────────────────────────────────────── */
.lf-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2rem;
  font-size: .9rem;
  color: var(--lf-gray-800);
}

/* ── Page Header ───────────────────────────────────────────────── */
.lf-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--lf-gray-200);
}
.lf-page-header__eyebrow {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--lf-gray-400);
  font-weight: 600;
  margin-bottom: .2rem;
}
.lf-page-header__title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--lf-gray-800);
  margin: 0;
  line-height: 1.2;
}

/* ── Body ──────────────────────────────────────────────────────── */
.lf-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Card ──────────────────────────────────────────────────────── */
.lf-card {
  background: #fff;
  border: 1px solid var(--lf-gray-200);
  border-radius: var(--lf-radius);
  box-shadow: var(--lf-shadow);
  overflow: hidden;
}
.lf-card--flat {
  box-shadow: none;
}

.lf-card__header {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .65rem 1rem;
  background: var(--lf-gray-50);
  border-bottom: 1px solid var(--lf-gray-200);
  min-height: 44px;
}

.lf-card__icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .75rem;
  flex-shrink: 0;
}
.lf-card__icon--blue   { background: #eff6ff; color: var(--lf-blue); }
.lf-card__icon--emerald{ background: #ecfdf5; color: var(--lf-emerald); }
.lf-card__icon--violet { background: #f5f3ff; color: var(--lf-violet); }
.lf-card__icon--amber  { background: #fffbeb; color: var(--lf-amber); }

.lf-card__title {
  font-size: .78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--lf-gray-600);
}

.lf-card__body {
  padding: 1rem 1rem 1.1rem;
}

/* ── Labels ────────────────────────────────────────────────────── */
.lf-label {
  display: block;
  font-size: .78rem;
  font-weight: 600;
  color: var(--lf-gray-600);
  margin-bottom: .3rem;
  line-height: 1.3;
}
.lf-required { color: #dc2626; margin-left: .1rem; }

/* ── Form controls ─────────────────────────────────────────────── */
.form-control,
.form-select,
textarea.form-control {
  font-size: .83rem;
  border-color: var(--lf-gray-200);
  border-radius: 7px;
  color: var(--lf-gray-800);
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.form-control:focus,
textarea.form-control:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37,99,235,.1);
}

/* ── Buttons ───────────────────────────────────────────────────── */
.lf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  font-size: .83rem;
  font-weight: 600;
  padding: .45rem .9rem;
  cursor: pointer;
  transition: all .15s;
  border: 1px solid transparent;
  white-space: nowrap;
  text-decoration: none;
}
.lf-btn--sm  { padding: .3rem .65rem; font-size: .78rem; }
.lf-btn--lg  { padding: .55rem 1.2rem; font-size: .9rem; }



.lf-btn--primary:hover:not(:disabled) { background: #0d1a3e; color: white; }
.lf-btn--primary:disabled { opacity: .55; cursor: default; }

.lf-btn--warning {
  background: #f59e0b;
  color: #fff;
}
.lf-btn--warning:hover:not(:disabled) { background: #d97706; }

.lf-btn--outline {
  background: #fff;
  border-color: var(--lf-gray-200);
  color: var(--lf-gray-600);
}
.lf-btn--outline:hover { background: var(--lf-gray-50); border-color: var(--lf-gray-400); }

.lf-btn--danger-ghost {
  background: transparent;
  border-color: #fca5a5;
  color: #b91c1c;
}
.lf-btn--danger-ghost:hover { background: #fef2f2; border-color: #f87171; }

/* ── Icon Button ───────────────────────────────────────────────── */
.lf-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lf-blue);
  padding: 0 .2rem;
  font-size: .9rem;
  vertical-align: middle;
  opacity: .8;
  transition: opacity .15s;
}
.lf-icon-btn:hover { opacity: 1; }

/* ── Switch ────────────────────────────────────────────────────── */
.lf-switch { position: relative; width: 42px; height: 24px; display: inline-block; vertical-align: middle; }
.lf-switch input { display: none; }
.lf-switch span {
  position: absolute; inset: 0; background: #e2e8f0; border-radius: 9999px; transition: .2s; cursor: pointer;
}
.lf-switch span::after {
  content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%;
  position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.lf-switch input:checked + span { background: var(--lf-blue); }
.lf-switch input:checked + span::after { left: 21px; }
.lf-switch-label { font-size: .78rem; color: var(--lf-gray-600); vertical-align: middle; }

/* ── Attempt / Seguimiento table ───────────────────────────────── */
.lf-attempt-head {
  display: grid;
  grid-template-columns: 40px 160px 1fr 160px 160px 60px;
  gap: .5rem;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  font-weight: 700;
  color: var(--lf-gray-400);
  padding: .4rem .75rem;
  border-bottom: 1px solid var(--lf-gray-200);
}
.lf-attempt-row {
  display: grid;
  grid-template-columns: 40px 160px 1fr 160px 160px 60px;
  gap: .5rem;
  align-items: start;
  padding: .75rem;
  border-bottom: 1px solid var(--lf-gray-100);
  transition: background .12s;
}
.lf-attempt-row:last-child { border-bottom: none; }
.lf-attempt-row:hover { background: var(--lf-gray-50); }

.lf-attempt-row__num {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--lf-gray-400);
  padding-top: .3rem;
  font-size: .85rem;
}

/* Timer */
.lf-timer {
  display: flex;
  align-items: center;
  gap: .4rem;
}
.lf-timer__btn {
  width: 26px; height: 26px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: .6rem; transition: all .15s;
}
.lf-timer__btn--start { background: #d1fae5; color: #059669; }
.lf-timer__btn--start:hover { background: #a7f3d0; }
.lf-timer__btn--stop  { background: #fee2e2; color: #dc2626; }
.lf-timer__btn--stop:hover  { background: #fecaca; }
.lf-timer__display { font-size: .78rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--lf-gray-600); }
.lf-timer__display--active { color: #dc2626; }

/* ── Edition Meta ──────────────────────────────────────────────── */
.lf-edition-meta {
  font-size: .72rem;
  color: var(--lf-gray-400);
  line-height: 1.6;
}
.lf-edition-meta b { color: var(--lf-gray-600); }

/* ── Footer ────────────────────────────────────────────────────── */
.lf-footer {
  display: flex;
  justify-content: flex-end;
  gap: .6rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lf-gray-200);
}

/* ── Modals shared ─────────────────────────────────────────────── */
.lf-modal-info-bar {
  display: flex;
  gap: 2rem;
  padding: .65rem 1rem;
  background: var(--lf-gray-50);
  border-bottom: 1px solid var(--lf-gray-200);
  border-radius: 6px;
  margin-bottom: .75rem;
  font-size: .85rem;
}

.lf-tabs {
  list-style: none;
  display: flex;
  gap: .25rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--lf-gray-200);
  margin: 0 0 0 0;
}
.lf-tabs__item {
  display: block;
  padding: .55rem .85rem;
  font-size: .82rem;
  font-weight: 500;
  color: var(--lf-gray-400);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all .15s;
}
.lf-tabs__item:hover { color: var(--lf-gray-600); }
.lf-tabs__item--active {
  color: var(--lf-blue);
  border-bottom-color: var(--lf-blue);
  font-weight: 700;
}
.lf-tabs__panel {
  padding: 1rem;
  background: #fff;
}

.lf-badge {
  display: inline-block;
  background: var(--lf-gray-200);
  color: var(--lf-gray-600);
  border-radius: 999px;
  padding: .05rem .45rem;
  font-size: .68rem;
  font-weight: 700;
  margin-left: .35rem;
}

.lf-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--lf-blue); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 700; flex-shrink: 0;
}

/* ── Price panel (modal programa) ──────────────────────────────── */
.lf-price-panel {
  background: var(--lf-gray-50);
  border: 1px solid var(--lf-gray-200);
  border-radius: 8px;
  padding: 1rem;
}
.lf-price-panel__title {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--lf-gray-400);
  font-weight: 700;
  margin-bottom: .75rem;
}

/* ── Edition card ──────────────────────────────────────────────── */
.lf-edition-card {
  border: 1px solid var(--lf-gray-200);
  border-radius: 8px;
  overflow: hidden;
}
.lf-edition-card__header {
  background: var(--lf-gray-50);
  padding: .55rem .85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--lf-gray-200);
}
.lf-edition-card__body { padding: .75rem .85rem; }

/* ── Inscription modal ─────────────────────────────────────────── */
.insc-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.insc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  background: #fff;
  border: 1px solid var(--lf-gray-200);
  border-radius: var(--lf-radius);
  padding: 1.1rem 1.25rem;
}
.insc-info { flex: 1; min-width: 0; }
.program-title { font-size: 1rem; font-weight: 700; color: var(--lf-gray-800); margin-bottom: .3rem; line-height: 1.3; }
.program-edition { display: inline-flex; align-items: center; font-size: .82rem; color: var(--lf-gray-400); background: var(--lf-gray-100); padding: .15rem .55rem; border-radius: 4px; }
.user-meta { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; margin-top: .65rem; }
.user-badge { display: inline-flex; align-items: center; gap: .4rem; background: var(--lf-gray-50); border: 1px solid var(--lf-gray-200); padding: .25rem .65rem; border-radius: 999px; font-size: .82rem; color: var(--lf-gray-600); }
.user-icon { width: 18px; height: 18px; background: var(--lf-gray-200); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .6rem; }
.profile-badge { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem .65rem; border-radius: 6px; font-size: .78rem; font-weight: 600; }
.profile-badge.is-student { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.profile-badge.is-pro { background: var(--lf-gray-100); color: var(--lf-gray-800); border: 1px solid var(--lf-gray-200); }

.insc-price-box {
  text-align: right;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: .7rem 1.1rem;
  border-radius: 8px;
  min-width: 135px;
  flex-shrink: 0;
}
.price-label { display: block; font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: #166534; font-weight: 700; margin-bottom: .2rem; }
.price-amount { font-weight: 800; color: #15803d; }

.insc-section {
  background: #fff;
  border: 1px solid var(--lf-gray-200);
  border-radius: var(--lf-radius);
  padding: .85rem 1rem .95rem;
}
.insc-section__title {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--lf-gray-400);
  font-weight: 700;
  margin-bottom: .75rem;
  display: flex;
  align-items: center;
  gap: .35rem;
}
.insc-section__title::before {
  content: '';
  width: 3px; height: 13px;
  background: var(--lf-blue);
  border-radius: 9999px;
}

/* Summary */
.summary-card { background: #fff; border: 1px solid var(--lf-gray-200); border-radius: 10px; overflow: hidden; }
.summary-header { background: var(--lf-gray-100); padding: .65rem 1.1rem; font-weight: 700; color: var(--lf-gray-600); font-size: .85rem; border-bottom: 1px solid var(--lf-gray-200); }
.summary-body { padding: 1rem 1.1rem; }
.summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: .6rem; font-size: .88rem; }
.summary-divider { height: 0; border-top: 1px dashed var(--lf-gray-200); margin: .85rem 0; }
.summary-row.total { margin-bottom: 0; align-items: flex-end; }
.label-total { font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: var(--lf-gray-400); font-weight: 700; }
.value-total { font-size: 1.45rem; font-weight: 800; color: var(--lf-gray-800); line-height: 1; }

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 991px) {
  .lf-attempt-head { display: none; }
  .lf-attempt-row {
    display: flex;
    flex-direction: column;
    background: var(--lf-gray-50);
    border: 1px solid var(--lf-gray-200);
    border-radius: 8px;
    margin-bottom: .75rem;
    padding: .85rem;
    gap: .6rem;
  }
  .lf-attempt-row__num {
    justify-content: flex-start;
    font-size: 1rem;
    color: var(--lf-blue);
    border-bottom: 1px solid var(--lf-gray-200);
    padding-bottom: .5rem;
  }
}

@media (max-width: 576px) {
  .lf-page-header { flex-direction: column; align-items: stretch; }
  .insc-header { flex-direction: column; }
  .insc-price-box { text-align: left; }
}

/* ── Animations ────────────────────────────────────────────────── */
.fade-in {
  animation: lfFadeIn .25s ease;
}
@keyframes lfFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Editions scroll */
.editions-scroll-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.editions-scroll-container::-webkit-scrollbar { width: 5px; }
.editions-scroll-container::-webkit-scrollbar-thumb { background: var(--lf-gray-200); border-radius: 4px; }

.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}
</style>

<script setup>
  import { ref, reactive, computed, onMounted, inject, nextTick, onBeforeUnmount} from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useToast } from 'vue-toastification'

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
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const dateLimitConfig = {
    minDate: sevenDaysAgo
};
  const programService   = inject(ServiceKeys.Program)
  const comercialService = inject(ServiceKeys.Comercial)
  const customerService = inject(ServiceKeys.Customer)
  const discountService = inject(ServiceKeys.Discount)
  const editionService = inject(ServiceKeys.Edition)
  const catalog          = inject('catalog')

const lAttempts = ref(catalog.options('we_attempt'))
  const leadIdParam = computed(() => {
    const raw = route.params?.id
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  })
  const isEdit = computed(() => !!leadIdParam.value)

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
  const todayIso = new Date().toISOString().slice(0, 16)

  const leadStatusCatalog        = ref(catalog.options('we_lead_status'))
  const leadInterestCatalog      = ref(catalog.options('we_lead_interest'))
  const countryCatalog = ref(
    catalog.options('we_country', {
      mapItem: x => ({
        id: x.id,
        description: `(${String(x?.codigo)}) - ${x.description}`,
        alias: x.alias,
        variable_3: x.variable_3,
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

// --- DATA HARDCORE (MOCKUP) ---

const hcHistoryData = ref([
  { fecha: '12 Ene 2025', programa: 'Gestión de Proyectos', tipo: 'Curso', nombre: 'Eliuth Diaz' },
  { fecha: '15 Nov 2024', programa: 'Excel Empresarial', tipo: 'Taller', nombre: 'Eliuth J. Diaz' },
  { fecha: '20 Ago 2024', programa: 'Power BI Avanzado', tipo: 'Especialización', nombre: 'Eliuth Diaz' },
])

const hcAdvisoryData = ref([
  { fecha: '14 Ene 2026', interes: 'PMP Certification', asesor: 'Ana Lopez', status: 'En Seguimiento', intentos: 3 },
  { fecha: '10 Ene 2026', interes: 'Scrum Master', asesor: 'Carlos Ruiz', status: 'No Interesado', intentos: 5 },
  { fecha: '05 Dic 2025', interes: 'Power BI', asesor: 'Maria Paz', status: 'Matriculado', intentos: 2 },
])

const hcEnrollmentData = ref([
  { fecha: '05 Dic 2025', programa: 'Power BI para Analistas', edicion: '2025-I', estado: 'En Curso', nota: null },
  { fecha: '10 Jun 2024', programa: 'SQL Server Database', edicion: '2024-II', estado: 'Finalizado', nota: 18 },
  { fecha: '15 Ene 2024', programa: 'Python for Data', edicion: '2024-I', estado: 'Finalizado', nota: 12 },
])
  const form = reactive({
    fechaContactoInicial: todayIso,
    query_alias: null,
    category_alias: null,
    program_modality_alias: null,
    web: false,
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

  })

  const insc = reactive({
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    saved_money: 0,
    selectedCurrencyAlias: '',
    modalidadPrograma: 'NORMAL',
    promocion_id: null,
    descuento_id: null,
    cat_method_payment: null,
    modalidadPago: 'CONTADO',
    montoOriginal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,
    val_porcentaje: 0,
    val_fijo: 0,
    val_beneficio: 0,
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficio: 0,
    montoFinal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,
    attachments: []
  })

  function onChangeDescuentoPorcentual(opt) {
    if (!opt) {
      insc.val_porcentaje = 0
      return
    }
    insc.val_porcentaje = Number(opt.value) || 0
  }
  import { watchEffect } from 'vue'
// Función auxiliar para redondear correctamente a 2 decimales (evita errores de punto flotante)
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100

watchEffect(() => {
  const base = parseFloat(insc.montoOriginal) || 0

  // 1. Calcular montos brutos
  // Nota: Usamos round2 inmediatamente para que el dinero "exista" en 2 decimales desde el cálculo
  let montoPorcentaje = round2((base * (insc.val_porcentaje || 0)) / 100)
  let montoFijo = round2(parseFloat(insc.val_fijo) || 0)
  let montoBeneficio = round2(parseFloat(insc.val_beneficio) || 0)

  // 2. Sumar todos los descuentos
  const totalDescuentos = round2(montoPorcentaje + montoFijo + montoBeneficio)

  // 3. VALIDACIÓN: ¿Los descuentos superan el precio base?
  if (totalDescuentos > base) {
    // A. Mostrar Alerta
    toast.warning('¡Cuidado! Los descuentos superan el Precio Base. Se han reiniciado los valores.')

    // B. Limpiar inputs (Reseteamos los valores y los selectores para evitar negativos)
    // Reiniciar Porcentaje
    insc.val_porcentaje = 0
    insc.dsct_porcent_id = null

    // Reiniciar Monto Fijo
    insc.val_fijo = 0
    insc.dsct_stick_id = null

    // Reiniciar Beneficio
    insc.val_beneficio = 0
    insc.dsct_benefit_id = null

    // C. Forzar recálculo visual a 0
    insc.montoDescuentoPorcentaje = 0
    insc.montoDescuentoFijo = 0
    insc.montoBeneficio = 0
    insc.total_amount = base



    return // Salimos para evitar asignar valores erróneos
  }

  // 4. Si todo está bien, asignamos los valores redondeados a la vista
  insc.montoDescuentoPorcentaje = montoPorcentaje
  insc.montoDescuentoFijo = montoFijo
  insc.montoBeneficio = montoBeneficio

  // 5. Cálculo Final (Base - Descuentos)
  const final = base - totalDescuentos
  insc.total_amount = round2(final > 0 ? final : 0)
})
  function onChangeDescuentoFijo(opt) {
    if (!opt) {
      insc.val_fijo = 0
      return
    }
    insc.val_fijo = Number(opt.value) || 0
  }

  function onChangeBeneficio(opt) {
    if (!opt) {
      insc.val_beneficio = 0
      return
    }
    insc.val_beneficio = Number(opt.value) || 0
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
  const currentEdition = computed(() => {
    if (!form.edition_id) return null
    return editions.value.find(e => e.id === form.edition_id) || null
  })

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
    const s = String(v).replace('T', ' ')
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
      price_student_dollars: l.price_student_dollars ?? null,
      price_student_soles: l.price_student_soles ?? null,
      price_profesional_soles: l.price_profesional_soles ?? null,
      price_profesional_dollars: l.price_profesional_dollars ?? null,
      enrollment_id: l.enrollment_id,
      observacion: l.observations ?? '',
      contactos: (l.contact_attempts || []).map(att => ({
        id: att.lead_contact_attempt_id,
        status_alias: att.cat_status_alias,
        cat_type_attempt: att.cat_type_attempt_alias || 'we_attempt_call',
        calling_alias: att.cat_result_alias,
        calling_label: att.cat_result_label,
        status_label: att.cat_status_label,
        fechaContactoProximo: normalizeDateTime(att.contact_datetime),
        respuesta: att.response || '',
        // Mapear Duración y Timer
  contact_duration: att.contact_duration || 0,
  timerActive: false,
  timerId: null
      })),

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

// 2. Watcher para limpiar/ajustar si cambia el tipo
watch(() => insc.cat_type_document, (newVal) => {
  if (!insc.document) return;

  // Opción A: Limpiar el campo al cambiar de tipo (Más seguro para evitar errores)
  // insc.document = '';

  // Opción B: Recortar si el nuevo tipo es más corto que el valor actual
  if (docConfig.value.maxLength && insc.document.length > docConfig.value.maxLength) {
     insc.document = insc.document.slice(0, docConfig.value.maxLength);
  }

  // Si cambiamos a numérico y hay letras, limpiar
  if (docConfig.value.isNumeric && isNaN(Number(insc.document))) {
     insc.document = insc.document.replace(/\D/g, '');
  }
});
  async function loadDataForCloning(sourceId) {
      try {
      console.log(sourceId)
          const originalData = await comercialService.leadGet({ id: sourceId })


          Object.assign(form, {
              fechaContactoInicial: normalizeDateTime(originalData.first_contact_date || originalData.registration_date) || todayIso,
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
              categoriaMember: originalData.membresia ?? ''
          })
          createdLeadId.value = null
          createdPersonId.value = null
          toast.info('Formulario precargado con datos del lead original. Por favor, revise y guarde.', { timeout: 5000 })


      } catch (e) {
          console.error("Error cargando plantilla para clonar", e)
      }
  }

  onMounted(async () => {
    if (route.query.clone_from) {
        await loadDataForCloning(route.query.clone_from)
        loaded.value = true
        return
    }
    const data = await catalog.membershipList({ active: true });// 3. Asignamos el valor real a la variable reactiva
    membershipList.value = data;
    // 3. Asignamos el valor real a la variable reactiva
    membershipList.value = data;

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
    form.active = true
    //{{form.category_alias}} we_program_type_course onProgramaTypeChange()
    form.category_alias = 'we_program_type_course'
    onProgramaTypeChange(programTypeCatalog.value.find(e => e.alias === form.category_alias))

    loaded.value = true
  })

function createEmptyAttempt() {
  return {
    cat_type_attempt: 'we_attempt_call', // Valor por defecto
    calling_alias: 'we_calling_pending',
    fechaContactoProximo: todayIso,
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
    )?.alias
  }
  function onStatusChange(opt) {
    if (!opt) return
    if (opt.description === 'Pagó') {
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
    }else if(opt.description === 'Interesado'){
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
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
  console.log('Reseteando formulario de inscripción...');

  // 1. Limpiar objeto de inscripción (insc)
  Object.assign(insc, {
    dni: '',
    // No limpiamos nombres/apellidos aquí si queremos que se mantengan los del lead,
    // pero si quieres limpieza total, déjalos vacíos:
    document: '',
    cat_type_document: null,
    nombres: '',
    apellidos: '',
    mother_last_name: '',
    email: '',

    // Financiero
    saved_money: 0,
    selectedCurrencyAlias: 'we_currency_soles', // Valor por defecto
    cat_insc_modality: 'we_insc_modality_normal', // Valor por defecto
    cat_type_payment: 'we_payment_way_single',    // Valor por defecto
    cat_method_payment: null,
    modalidadPago: 'CONTADO',

    // Montos y Descuentos
    montoOriginal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,

    // Valores numéricos auxiliares para la reactividad
    val_porcentaje: 0,
    val_fijo: 0,
    val_beneficio: 0,
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficio: 0,
    montoFinal: 0,

    // Observaciones y Adjuntos
    observacions: '',
    attachments: [], // IMPORTANTE: Limpiar el array de adjuntos múltiples
    flag_agreement: false,
    b2b_contract_id: null
  });

  // 2. Limpiar campos del 'form' que se usan dentro de la modal (Archivos únicos)
  // Como usas v-model="form.ticket_payment_url" dentro de la modal, hay que limpiarlo también
  form.ticket_payment_url = null;
  form.carnet_url = null;
}

function onChannelChange(option){
  if(!option){
    form.strategy_alias   = null
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

  function cancelar() { router.back() }

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
      const cat_status = idByAlias(c.status_alias, contactAttemptStatusCat.value)

      const contact_datetime = c.fechaContactoProximo || form.fechaContactoInicial
      return {
        id: c.id,
        attempt_number: idx + 1,
        cat_type_attempt: idByAlias(c.cat_type_attempt, lAttempts.value),
        cat_status,
        contact_datetime,
        cat_result: idByAlias(c.calling_alias, callingCatalog.value),
        response: c.respuesta || '',
        contact_duration: c.contact_duration || 0
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
  // ... obtengo las ID's (código existente) ...
  const cat_type_document = idByAlias(insc.cat_type_document, docTypeCatalog.value)
  const cat_insc_modality = idByAlias(insc.cat_insc_modality, inscModalidades.value)
  const cat_type_payment  = idByAlias(insc.cat_type_payment, inscPaymentModes.value)
  const cat_currency      = idByAlias(insc.selectedCurrencyAlias, currencyCatalog.value)
  const cat_country       = idByAlias(form.country_alias, countryCatalog.value)
  const cat_method_payment = idByAlias(insc.cat_method_payment, paymentMethodCatalog.value)

  // Transformación de los adjuntos múltiples (lo que vimos antes)
  const formattedAttachments = (insc.attachments || []).map(file => {
      if (typeof file === 'object' && file.url) return file;
      return { url: file, name: file.split('/').pop() || 'Adjunto', type: null };
  });

  return {
    inscription: {
      lead_id: createdLeadId.value,
      program_version_id: form.edition_id ? null : form.program_version_id,
      program_edition_id: form.edition_id,
      document: insc.document,
      cat_type_document: cat_type_document,
      full_name: insc.full_name,
      last_name: insc.last_name,
      mother_last_name: insc.mother_last_name,
      email: insc.email,
      cat_country: cat_country,
      cat_insc_modality: cat_insc_modality,
      cat_type_payment: cat_type_payment,
      cat_currency:  cat_currency,
      total_amount: Number(insc.total_amount),
      cat_method_payment: cat_method_payment,
      saved_money: Number(insc.saved_money),
      dsct_porcent_id: insc.dsct_porcent_id,
      dsct_stick_id: insc.dsct_stick_id,
      dsct_benefit_id: insc.dsct_benefit_id,
      observations: insc.observacions,
      flag_agreement: insc.flag_agreement,
      b2b_contract_id: null,
      list_price: insc.montoOriginal,
      // --- AQUÍ ESTÁ LA CORRECCIÓN DEL MAPEO ---
      // Asignamos la variable del form al nombre que espera el SP
      payment_attachment_url: form.ticket_payment_url || null,
      student_attachment_url: form.carnet_url || null,

      // Adjuntos múltiples (Array)
      attachments: formattedAttachments
    }
  }
}

async function confirmarInscripcion() {
  if (!comercialService) return console.error('comercialService no inyectado')

  // 1. Validar datos de INSCRIPCIÓN
  if (!validateInscriptionClientInfo() || !validateInscriptionPaymentInfo()) {
      toast.warning("Por favor complete los campos obligatorios de la inscripción")
      return
  }

  // 2. Validar datos del LEAD (Porque ahora vamos a guardar el lead primero)
  if (!validateLeadInfo() || !validateContactInfo() || !validateCommercialInfo()) {
      toast.warning("Faltan datos obligatorios en el formulario del Lead. Revise la información principal.")
      return
  }

  savingInsc.value = true

  try {
    // --- PASO A: GUARDAR EL LEAD ---
    const leadPayload = buildLeadPayload()

    // Determinamos si es edición o creación basado en si ya existe un ID en la URL o uno creado en memoria
    const currentLeadId = leadIdParam.value || createdLeadId.value

    if (currentLeadId) {
      // ACTUALIZAR LEAD EXISTENTE
      await comercialService.leadUpdate({ id: currentLeadId, ...leadPayload })
      // No necesitamos cambiar createdLeadId, ya es correcto
    } else {
      // CREAR NUEVO LEAD
      const resp = await comercialService.leadRegister(leadPayload)
      // Asignamos los IDs recibidos para que el payload de inscripción los use
      createdLeadId.value   = resp.lead_id
      createdPersonId.value = resp.person_id
    }

    // --- PASO B: GUARDAR LA INSCRIPCIÓN ---
    // Ahora que el lead está guardado y tenemos su ID actualizado en createdLeadId,
    // construimos el payload de inscripción.
    const enrollmentPayload = buildEnrollmentPayload()

    const response = await comercialService.enrollmentRegister(enrollmentPayload)

    toast.success('Lead actualizado e Inscripción realizada con éxito!')

    showViewModal.value = false
    router.push({ name: 'ComercialListado' })

  } catch (err) {
    console.error(err)
    // Identificamos si el error fue al guardar el lead o la inscripción para dar mejor feedback
    if (!createdLeadId.value && !leadIdParam.value) {
        toast.error('Error al guardar el Lead inicial. La inscripción no se procesó.')
    } else {
        toast.error('El Lead se guardó, pero ocurrió un error al procesar la inscripción.')
    }
  } finally {
    savingInsc.value = false
  }
}

  async function guardar() {
    if (!comercialService) return console.error('comercialService no inyectado')
    saving.value = true
    try {
      const payload = buildLeadPayload()
      if (isEdit.value) {
        await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
        toast.success('Lead actualizado con éxito!', { timeout: 2000 })
      } else {
        const resp = await comercialService.leadRegister(payload)
        createdLeadId.value   = resp.lead_id
        createdPersonId.value = resp.person_id
        toast.success('Lead registrado con éxito!', { timeout: 2000 })
      }
      saving.value = false
      router.push({ name: 'ComercialListado' })
    } catch (err) {
      console.error(err)
      saving.value = false
    }
  }

function openInscription() {
    // 1. Primero limpiamos todo rastro anterior
    resetInscriptionData();

    // 2. Pre-llenamos datos desde el Lead (form)
    insc.full_name = form.full_name || '';
    insc.email     = ''; // O form.email si tuvieras ese dato

    // 3. Configuraciones por defecto iniciales
    insc.cat_insc_modality = 'we_insc_modality_normal';
    insc.selectedCurrencyAlias = 'we_currency_soles';
    insc.cat_type_payment  = 'we_payment_way_single';

    // 4. Recalcular precio base según el Lead actual (Importante para que aparezca el precio)
    // Forzamos la actualización del precio base basado en la moneda por defecto
    const basePrice = calculatedBasePrice.value;
    insc.montoOriginal = basePrice;

    // 5. Mostrar modal
    showViewModal.value = true;
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
    const required = ['telefono','status_alias','country_alias']
    return required.every(f => !!form[f])
  }
  function validateCommercialInfo() {
    const required = ['nivel_alias','mensajeChat','canal_alias','medium_alias']
    return required.every(f => !!form[f])
  }
  function validateInscriptionClientInfo() {
    const required = ['cat_type_document','document','email','full_name','last_name','mother_last_name','cat_insc_modality']
    return required.every(f => !!insc[f])
  }
  function validateInscriptionPaymentInfo() {
    const required = ['selectedCurrencyAlias','cat_type_payment','saved_money','cat_method_payment']
    return required.every(f => insc[f] || insc[f] === 0)
  }


  const montoOriginal = computed(() => 1000)


    function onProgramaTypeChange(opcion) {
        if (!opcion){
          form.program_version_id = null
          form.program_modality_alias = null
          form.edition_id = null
          return
        }
    }

    function openURL(param){
      window.open(param, '_blank', 'noopener,noreferrer');
    }

  // Busca esta función y REEMPLAZA las dos versiones que tienes por esta sola:
  function onProgramaChange(opcion) {
    // 1. Lógica para la Modal de Info
    selectedProgram.value = opcion;

    // 2. Lógica del Formulario
    if (!opcion){
        form.edition_id = null;
        form.link = null;
        form.program_modality_selected_alias = null;

        // IMPORTANTE: Resetear precios si se limpia el programa
        form.price_student_soles = 0;
        form.price_student_dollars = 0;
        form.price_profesional_soles = 0;
        form.price_profesional_dollars = 0;

        return;
    }

    form.program_modality_selected_alias = opcion.cat_model_modality_alias;

    // Guardamos el link en el form por si acaso
    if(opcion.link){
        form.link = opcion.link;
    }

    // --- AQUÍ ESTÁ EL FIX ---
    // Debes asignar los precios del objeto 'opcion' a las variables del 'form'
    // para que el computed 'calculatedBasePrice' detecte el cambio.
    form.price_student_soles = Number(opcion.price_student_soles || 0);
    form.price_student_dollars = Number(opcion.price_student_dollars || 0);
    form.price_profesional_soles = Number(opcion.price_profesional_soles || 0);
    form.price_profesional_dollars = Number(opcion.price_profesional_dollars || 0);
}


  const searchEditionsFiltered = async (q, child, index) => {

    //crear const month y year
    const month = new Date().getMonth() + 1; // Mes actual
    const year = new Date().getFullYear();    // Año actual


    // 1. Llamar al servicio original
    const response = await editionService.editionCaller({
      q,
      program_version_id: form.program_version_id,
      month,
      year
    });


    return response;
  }

    function onEditionChange(opcion) {
        if (!opcion) return
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

      const isUSD = insc.selectedCurrencyAlias === 'we_currency_usd'
      const type = clientProfileType.value

      if (type === 'estudiante') {
        return isUSD
          ? Number(form.price_student_dollars || 0)
          : Number(form.price_student_soles || 0)
      } else {
        return isUSD
          ? Number(form.price_profesional_dollars || 0)
          : Number(form.price_profesional_soles || 0)
      }
    })

    import { watch } from 'vue'

    watch(calculatedBasePrice, (newPrice) => {
      insc.montoOriginal = newPrice
    }, { immediate: true })

    watch(() => insc.selectedCurrencyAlias, () => {
    })

    const alCerrarModal = () => {
      console.log('La modal se ha cerrado. Limpiando formulario...')
      Object.assign(insc, {
        dni: '',
        nombres: '',
        apellidos: '',
        correo: '',
        saved_money: 0,
        selectedCurrencyAlias: '',
        modalidadPrograma: 'NORMAL',
        promocion_id: null,
        descuento_id: null,
        modalidadPago: 'CONTADO',
        cat_method_payment: null,
        montoOriginal: 0,
        adelanto: 0,
        observacion: '',
        montoDescuentoPorcentaje: 0,
        montoDescuentoFijo: 0,
        montoFinal: 0,
        dsct_porcent_id: null,
        dsct_stick_id: null,
        dsct_benefit_id: null,
        val_porcentaje: 0,
        val_fijo: 0,
        val_beneficio: 0,
        montoDescuentoPorcentaje: 0,
        montoDescuentoFijo: 0,
        montoBeneficio: 0,
        montoFinal: 0,
      })

    }

    watch(showViewModal, (estaAbierto) => {
      if (!estaAbierto) {
        resetInscriptionData();
      }
    })



</script>

