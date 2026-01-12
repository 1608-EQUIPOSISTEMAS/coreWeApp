<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">

      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">Formulario Comercial</div>
        </div>

        <button type="button" v-if="!form.enrollment_id &&form.status_alias=='we_lead_status_bought' && isEdit && form.pay_date && form.client_status == 'we_client_person'"
          class="btn btn-warning"
          :disabled="form.enrollment_id"
          @click="openInscription()">
          INSCRIBIR
        </button>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">

        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Información del lead</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">
                Fecha contacto inicial <span class="required-star">*</span>
              </label>
              <DateTime12 :disabled="isEdit" v-model="form.fechaContactoInicial" required clearable />
            </div>

            <div class="col-md-5"></div>

            <div class="col-md-4">
              <label class="form-label mb-1">T. Consulta</label>
              <SearchSelect
                v-model="form.query_alias"
                :items="queryCatalog"
                :disabled="isEdit"
                label-field="description"
                required
                value-field="alias"
                placeholder="PROMOCIÓN..."
                :model-label="form.query_label"

              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Categoría<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.category_alias"
                :items="programTypeCatalog"
                label-field="description"
                :disabled="isEdit"
                value-field="alias"
                view-open="6"
                placeholder="CATEGORÍA..."
                required
                @change="onProgramaTypeChange"
              />
            </div>

            <div class="col-md-2" v-if="['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.category_alias" >
              <label class="form-label mb-1">Modalidad<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.program_modality_alias"
                :items="programModalityCatalog"
                label-field="description"
                view-open="6"
                :disabled="isEdit"
                value-field="alias"
                placeholder="MODALIDAD..."
                required
                @change="onProgramaTypeChange"
              />
            </div>

            <div class="col-md-4" v-if="form.category_alias &&
                                      (!['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) ||
                                      (['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias) && form.program_modality_alias))">
              <label class="form-label mb-1">Producto / Programa<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.program_version_id"
                mode="remote"
                :fetcher="q => programService.programVersionCaller({ q,
                                                            cat_type_program: programTypeCatalog.find(e=>e.alias==form.category_alias).id,
                                                            cat_model_modality: !form.program_modality_alias?null:programModalityCatalog.find(e=>e.alias==form.program_modality_alias).id
                                                          })"
                label-field="abbreviation"
                :disabled="isEdit"
                sublabel-field="version_code"
                value-field="program_version_id"
                view-open="6"
                :model-label="form.program_label"
                placeholder="Buscar programa…"
                :minChars="0"
                :cache="false"
                required
                @change="onProgramaChange"
              />
            </div>

            <div class="col-md-3" v-if="(isEdit && form.edition_id) || (form.program_modality_selected_alias && form.program_modality_selected_alias!='we_modality_online' && form.category_alias && form.program_version_id && !['we_program_type_membership'].includes(form.category_alias))">
              <label class="form-label mb-1">Edición / Fecha prevista<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.edition_id"
                mode="remote"
                :fetcher="q => editionService.editionCaller({ q, program_version_id: form.program_version_id})"
                label-field="start_date_label"
                :disabled="isEdit"
                value-field="edition_num_id"
                view-open="6"
                placeholder="Buscar Edicion…"
                :model-label="form.edition_label"
                :minChars="0"
                :cache="false"
                required
              />
              <div v-if="currentEdition">
                <div class="text-label-aux"><b>Inicio:</b> {{ currentEdition.inicio }}</div>
                <div class="text-label-aux"><b>Fin:</b> {{ currentEdition.fin }}</div>
                <div class="text-label-aux"><b>Docente:</b> {{ currentEdition.docente }}</div>
                <div class="text-label-aux"><b>Horario:</b> {{ currentEdition.horario }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="form-section mb-4" v-if="isEdit || validateLeadInfo()">
          <div class="form-section__header">
            <span class="form-section__title">Datos del contacto</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-2">
              <label class="form-label mb-1">T. Contacto</label>
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

            <div class="col-md-3">
              <label class="form-label mb-1">Nombre/Razón Social</label>
              <input autocomplete="off" v-model="form.full_name" type="text" class="form-control" placeholder="NOMBRE COMPLETO" />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                Teléfono / WhatsApp <span class="required-star">*</span>
                <span v-if="searchingPhone" class="ms-2 badge bg-warning text-dark scale-in-center">
                  <i class="fas fa-spinner fa-spin"></i> Buscando...
                </span>
              </label>

              <div class="input-group flex-nowrap">
                <input autocomplete="off"
                  v-model="form.telefono"
                  type="text"
                  v-restrict="{ only: 'numbers', max: 15 }"
                  required
                  class="form-control"
                  :class="{ 'is-valid': leadDataHistory && !searchingPhone }"
                  placeholder="TELEFONO + ENTER"
                  @keyup.enter="searchLeadByPhone"
                  @blur="searchLeadByPhone"
                  :disabled="searchingPhone"
                />
                <button class="btn btn-outline-secondary" type="button" @click="searchLeadByPhone" :disabled="searchingPhone" style="flex-shrink: 0;">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
            </div>


            <div class="col-md-2" v-if="leadDataHistory">
              <label class="form-label mb-1">E. Cliente</label>
              <SearchSelect
                v-model="form.client_category_alias"
                :items="momentCatalog"
                label-field="description"
                value-field="alias"
                placeholder="E. Cliente..."
                required
                :model-label="form.client_category_label"
              />
            </div>

            <div class="col-md-2" v-if="leadDataHistory">
              <label class="form-label mb-1">Membresía</label>
              <input autocomplete="off" v-model="form.categoriaMember" type="text" class="form-control" disabled />
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">Status<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.status_alias"
                :items="leadStatusCatalog"
                label-field="description"
                value-field="alias"
                placeholder="STATUS..."
                required
                :model-label="form.status_label"
                @change="onStatusChange"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Ocupación / Situación<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.ocupacion_alias"
                :items="prospectSituationCatalog"
                label-field="description"
                value-field="alias"
                required
                :model-label="form.ocupacion_label"
                placeholder="OCUPACIÓN..."
              />
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">País<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.country_alias"
                :items="countryCatalog"
                label-field="description"
                value-field="alias"
                required
                placeholder="PAÍS..."
              />
            </div>
            <div class="col-md-4"></div>

            <div class="col-md-1" v-if="isEdit">
              <label class="form-label mb-1">BOT<span class="required-star">*</span></label>
              <br>
              <label class="form-switch">
                <input type="checkbox" v-model="form.bot" />
                <span></span>
              </label>
            </div>
          </div>
        </section>

        <section class="form-section mb-4" v-if="isEdit || (validateLeadInfo() && validateContactInfo())">
          <div class="form-section__header">
            <span class="form-section__title">Estado comercial y marketing</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">F. Pago (prevista)</label>
              <BaseDatePicker
                v-model="form.pay_date"
                :required="form.status_alias=='we_lead_status_bought'"
                placeholder="dd/mm/aaaa"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Nivel de interés<span class="required-star">*</span></label>
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
              <label class="form-label mb-1">Mensaje de chat<span class="required-star">*</span></label>

              <textarea
                v-model="form.mensajeChat"
                class="form-control"
                placeholder="MENSAJE CHAT"
                required
                rows="2"
                @input="handleMensajeChatInput"
                style="resize: vertical; min-height: 80px; max-height: none;"
              ></textarea>
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Canal prospección<span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.canal_alias"
                :items="socialMediaCatalog"
                required
                label-field="description"
                value-field="alias"
                :model-label="form.canal_label"
                placeholder="CANAL..."
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Medio de llegada<span class="required-star">*</span></label>
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

            <div class="col-md-4">
              <label class="form-label mb-1">Palabra MKT</label>
              <SearchSelect
                v-model="form.key_word_alias"
                :items="mktWordsCatalog"
                :model-label="form.key_word_label"
                label-field="description"
                value-field="alias"
                placeholder="MKT..."
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Estrategia</label>
              <SearchSelect
                v-model="form.strategy_alias"
                :items="strategyCatalog"
                label-field="description"
                value-field="alias"
                placeholder="ESTRATEGIA..."
              />
            </div>

            <div class="col-md-12">
              <label class="form-label mb-1">Observaciones</label>
              <textarea
                v-model="form.observacion"
                class="form-control"
                rows="2"
                style="resize: vertical; min-height: 80px; max-height: none;"
              ></textarea>
            </div>
          </div>
        </section>

        <section class="form-section mb-0" v-if="isEdit || (validateLeadInfo(), validateContactInfo(), validateCommercialInfo())">
          <div class="form-section__header d-flex justify-content-between align-items-center gap-2">
            <div>
              <span class="form-section__title">Seguimiento / intentos de contacto</span>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="addContacto">
              + Añadir intento
            </button>
          </div>

          <div class="contacto-table">
            <!-- Header solo en desktop -->
            <div class="row contacto-table__head d-none d-lg-flex mb-2 gx-3">
              <div class="col-lg-1 text-center">#</div>
              <div class="col-lg-2">Estado<span class="required-star">*</span></div>
              <div class="col-lg-5">Fecha y Hora<span class="required-star">*</span></div>
              <div class="col-lg-3">Respuesta / Resultado</div>
              <div class="col-lg-1 text-center"></div>
            </div>

            <!-- Filas -->
            <div
              v-for="(c, idx) in form.contactos"
              :key="c.uid"
              class="contacto-table__row mb-3"
            >
              <div class="row gx-3 gy-2">
                <!-- Índice -->
                <div class="col-12 col-lg-1 d-flex align-items-center justify-content-lg-center">
                  <div class="contacto-index">
                    <span class="d-lg-none me-2">Intento:</span>
                    <strong>{{ idx + 1 }}</strong>
                  </div>
                </div>

                <!-- Estado -->
                <div class="col-12 col-lg-2">
                  <label class="form-label d-lg-none mb-1">
                    Estado<span class="required-star">*</span>
                  </label>
                  <SearchSelect
                    v-model="c.status_alias"
                    :items="contactAttemptStatusCat"
                    required
                    :disabled="c.status_alias == 'we_follow_lead_answered' || c.status_alias == 'we_follow_lead_no_answer'"
                    label-field="description"
                    value-field="alias"
                    placeholder="ESTADO..."
                    :model-label="c.status_label"
                  />
                </div>

                <!-- Fecha y Hora -->
                <div class="col-12 col-lg-5">
                  <label class="form-label d-lg-none mb-1">
                    Fecha y Hora<span class="required-star">*</span>
                  </label>
                  <DateTime12
                    v-model="c.fechaContactoProximo"
                    required
                    clearable
                    :disabled="c.status_alias != 'we_follow_lead_pending'"
                  />
                </div>

                <!-- Respuesta -->
                <div class="col-12 col-lg-3">
                  <label class="form-label d-lg-none mb-1">Respuesta / Resultado</label>
                  <input
                    autocomplete="off"
                    v-model="c.respuesta"
                    type="text"
                    class="form-control"
                    placeholder="RESULTADO"
                    :disabled="c.status_alias != 'we_follow_lead_pending'"
                  />
                </div>

                <!-- Acciones -->
                <div class="col-12 col-lg-1 d-flex align-items-start justify-content-lg-center" v-if="!c.id">
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm w-100 w-lg-auto"
                    @click="removeContacto(idx)"
                  >
                    <i class="fa-solid fa-square-minus"></i>
                    <span class="d-lg-none ms-2">Eliminar intento</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="form-section mb-0 mt-3" v-if=" isEdit">
          <label class="form-label mb-1">Estado del Registro<span class="required-star">*</span></label>
          <br>
          <label class="form-switch">
            <input type="checkbox" v-model="form.active" />
            <span></span>
          </label>
        </div>

      </div>

      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="cancelar">
          {{ form.enrollment_id ? 'Volver' : 'Cancelar' }}
        </button>
        <button v-if="!form.enrollment_id && ( isEdit || (validateLeadInfo(), validateContactInfo(), validateCommercialInfo()))" type="button" class="btn btn-primary" @click="guardar" :disabled="saving || form.enrollment_id" >
          {{ saving ? 'Guardando...' : 'Guardar lead' }}
        </button>
      </div>
    </div>
  </div>

  <BaseModal v-model="showViewModal" title="Inscripción del lead" size="xl">
    <div class="insc-modal">
      <header class="insc-header">
        <div class="insc-info">
          <div class="mb-3">
            <h5 class="program-title">
              {{ form.program_label || currentProgram?.description || '— Programa no seleccionado —' }}
            </h5>

            <div class="program-edition" v-if="form.edition_label">
              <i class="fa-solid fa-calendar-days me-1"></i>
              <span>Edición: {{ form.edition_label }}</span>
            </div>
          </div>

          <div class="user-meta">
            <div class="user-badge">
              <div class="user-icon">
                <i class="fa-solid fa-user"></i>
              </div>
              <span class="user-name text-truncate">{{ form.full_name }}</span>
            </div>

            <div v-if="clientProfileType"
                class="profile-badge"
                :class="clientProfileType === 'estudiante' ? 'is-student' : 'is-pro'">
              <i class="fa-solid" :class="clientProfileType === 'estudiante' ? 'fa-graduation-cap' : 'fa-briefcase'"></i>
              <span>{{ clientProfileType === 'estudiante' ? 'Estudiante' : 'Profesional' }}</span>
            </div>
          </div>
        </div>

        <div class="insc-price-box" v-if="insc.montoOriginal > 0">
            <span class="price-label">Precio Base</span>
            <div class="price-amount">
              <span class="currency">{{ selectedCurrency?.symbol }}</span>
              <span class="value">{{ insc.montoOriginal }}</span>
            </div>
        </div>
      </header>

      <section class="insc-section">
        <h6 class="insc-section__title">Datos del Cliente / Inscripción</h6>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label mb-1">T. documento<span class="required-star">*</span></label>
            <SearchSelect
              required
              v-model="insc.cat_type_document"
              :items="docTypeCatalog"
              label-field="description"
              placeholder="T. DOCUMENTO"
              value-field="alias"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">Documento<span class="required-star">*</span></label>
            <input autocomplete="off" required v-model="insc.document" type="text" placeholder="DOCUMENTO" class="form-control"  @keyup.enter="searchSunat" />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">Correo<span class="required-star">*</span></label>
            <input autocomplete="off" required v-model="insc.email" type="email" placeholder="CORREO" class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">Nombres<span class="required-star">*</span></label>
            <input autocomplete="off" required  v-model="insc.full_name" type="text" placeholder="NOMBRES" class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">Apellido Paterno<span class="required-star">*</span></label>
            <input autocomplete="off" required v-model="insc.last_name" type="text" placeholder="A. PATERNO" class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label mb-1">Apellido Materno<span class="required-star">*</span></label>
            <input autocomplete="off" required v-model="insc.mother_last_name" type="text" placeholder="A. MATERNO" class="form-control" />
          </div>

          <div class="col-md-4">
            <label required class="form-label mb-1">Modalidad del programa<span class="required-star">*</span></label>
            <SearchSelect
              required
              v-model="insc.cat_insc_modality"
              :model-label="form.program_modality_label"
              :items="inscModalidades"
              label-field="description"
              placeholder="M. PROGRAMA"
              value-field="alias"
            />
          </div>
        </div>
      </section>

      <section class="insc-section" v-if="isEdit || validateInscriptionClientInfo()">
        <h6 class="insc-section__title">Condiciones de pago</h6>
        <div class="row g-3">
          <div class="col-md-2">
            <label class="form-label mb-1">T. moneda<span class="required-star">*</span></label>
            <SearchSelect
              v-model="insc.selectedCurrencyAlias"
              :items="currencyCatalog"
              label-field="description"
              required
              value-field="alias"
              placeholder="MONEDA..."
            />
          </div>
          <div class="col-md-2" v-if="insc.selectedCurrencyAlias">
            <label class="form-label mb-1">Modalidad de pago<span class="required-star">*</span></label>
            <SearchSelect
              v-model="insc.cat_type_payment"
              required
              :items="inscPaymentModes"
              placeholder="M. PAGO"
              label-field="description"
              value-field="alias"
            />
          </div>
          <div class="col-md-4" v-if="insc.selectedCurrencyAlias && insc.cat_type_payment=='we_payment_way_installments'" >
            <label class="form-label mb-1">Adelanto / Reserva<span class="required-star">*</span></label>
            <CurrencyInput
              v-model="insc.saved_money"
              :currency="selectedCurrency"
              required
              :storeAsMinor="true"
              :softMinorTyping="true"
              zero-counts-as-empty
              placeholder="0.00"
            />
          </div>
          <div class="col-6" v-if="!insc.cat_type_payment || insc.cat_type_payment=='we_payment_way_single'"></div>
          <div class="col-2" v-if="insc.cat_type_payment && insc.cat_type_payment!='we_payment_way_single'"></div>
          <div class="col-md-2">
            <label class="form-label mb-1">Convenio Empresarial<span class="required-star">*</span></label>
            <br>
            <label class="form-switch">
              <input type="checkbox" v-model="form.b2b" />
              <span></span>
            </label>
          </div>

          <div class="col-md-4" v-if="isEdit || (validateInscriptionPaymentInfo())">
          <label class="form-label mb-1">Descuento</label>
          <SearchSelect
            v-model="insc.dsct_porcent_id"
            mode="remote"
            :fetcher="q => discountService.discountCaller({ q,
                                                        cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_percentage').id,
                                                        cat_currency: selectedCurrencyAlias
                                                      })"
            label-field="full_label"
            value-field="id"
            placeholder="DESCUENTO (%)"
            :minChars="0"
            :cache="false"
            @change="onChangeDescuentoPorcentual"
          />
          </div>

        <div class="col-md-4" v-if="isEdit || validateInscriptionPaymentInfo()">
          <label class="form-label mb-1">Promoción</label>
          <SearchSelect
            v-model="insc.dsct_stick_id"
            mode="remote"
            :fetcher="q => discountService.discountCaller({ q,
                                                        cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_fixed').id,
                                                        cat_currency: selectedCurrency.alias
                                                      })"
            label-field="full_label"
            value-field="id"
            placeholder="DESCUENTO (S/)"
            :minChars="0"
            :cache="false"
            @change="onChangeDescuentoFijo"
          />
          </div>

        <div class="col-md-4" v-if="isEdit || validateInscriptionPaymentInfo()">
          <label class="form-label mb-1">Beneficio</label>
          <SearchSelect
            v-model="insc.dsct_benefit_id"
            mode="remote"
            :fetcher="q => discountService.discountCaller({ q,
                                                        cat_discount_type: discountCatalog.find(e=>e.alias=='we_discount_type_benefit').id,
                                                        cat_currency: selectedCurrency.alias
                                                      })"
            label-field="full_label"
            value-field="id"
            placeholder="DESCUENTO (S/)"
            :minChars="0"
            :cache="false"
            @change="onChangeBeneficio"
          />
          </div>

        </div>
      </section>

      <section class="insc-section" v-if="isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())">
        <h6 class="insc-section__title">
          Documentación Adjunta
        </h6>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label mb-2 fw-semibold">Comprobante de Pago</label>
            <FileUploader
                label="Clic para subir Voucher"
                v-model="form.ticket_payment_url"
                accept=".pdf,.doc,.docx"
            />
          </div>

          <div class="col-md-6">
            <label class="form-label mb-2 fw-semibold">Carnet / Documento ID</label>
            <FileUploader
                label="Subir carnet estudiantil"
                v-model="form.carnet_url"
                accept=".pdf,.doc,.docx"
            />
          </div>
        </div>
      </section>

      <section class="insc-section mt-4" v-if="isEdit || (validateInscriptionClientInfo() && validateInscriptionPaymentInfo())">
        <div class="summary-card">
          <div class="summary-header">
            <i class="fa-solid fa-receipt me-2"></i> Resumen de Transacción
          </div>
          <div class="summary-body">
            <div class="summary-row">
              <span class="label">Precio del programa</span>
              <span class="value text-muted"> {{ selectedCurrency.symbol }} {{ insc.montoOriginal?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}</span>
            </div>

            <div class="summary-row" v-if="insc.dsct_porcent_id">
              <span class="label">Descuento</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoDescuentoPorcentaje?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}</span>
            </div>
            <div class="summary-row" v-if="insc.dsct_stick_id">
              <span class="label">Promoción</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoDescuentoFijo?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}</span>
            </div>
            <div class="summary-row" v-if="insc.dsct_benefit_id">
              <span class="label">Beneficio</span>
              <span class="value text-danger">- {{ selectedCurrency.symbol }} {{ insc.montoBeneficio?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}</span>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-row total">
              <div class="d-flex flex-column">
                <span class="label-total">MONTO FINAL A PAGAR</span>
                <small class="text-muted fw-normal" v-if="insc.cat_type_payment!='we_payment_way_single'">
                  (Adelanto requerido: {{ selectedCurrency.symbol }}{{ insc.saved_money }})
                </small>
              </div>
              <span class="value-total">
                {{ selectedCurrency.symbol }} {{ insc.total_amount?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}
              </span>
            </div>
          </div>
        </div>
      </section>

       <section class="insc-section">
            <h6 class="insc-section__title">OBSERVACIONES</h6>
            <div class="row g-3">
              <textarea
                v-model="insc.observacions"
                class="form-control"
                rows="2"
                style="resize: vertical; min-height: 80px; max-height: none;"
              ></textarea>
            </div>
        </section>
    </div>

    <template #footer>
      <button class="btn btn-outline btn-sm" @click="showViewModal = false">Cerrar</button>
      <button  class="btn btn-primary btn-sm" @click="confirmarInscripcion" :disabled="savingInsc || form.enrollment_id">
        {{ savingInsc ? 'Guardando...' : 'Guardar inscripción' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
  import { ref, reactive, computed, onMounted, inject, nextTick } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useToast } from 'vue-toastification'
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

  const programService   = inject(ServiceKeys.Program)
  const comercialService = inject(ServiceKeys.Comercial)
  const customerService = inject(ServiceKeys.Customer)
  const discountService = inject(ServiceKeys.Discount)
  const editionService = inject(ServiceKeys.Edition)
  const catalog          = inject('catalog')

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

  const todayIso = new Date().toISOString().slice(0, 16)

  const leadStatusCatalog        = ref(catalog.options('we_lead_status'))
  const leadInterestCatalog      = ref(catalog.options('we_lead_interest'))
  const countryCatalog           = ref(catalog.options('we_country'))
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
  const docTypeCatalog          = ref(catalog.options('we_type_document'))
  const programTypeCatalog      = ref(catalog.options('we_program_type'))
  const programModalityCatalog  = ref(catalog.options('we_modality'))
  const inscPaymentModes        = ref(catalog.options('we_payment_way'))
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

  const form = reactive({
    fechaContactoInicial: todayIso,
    query_alias: null,
    category_alias: null,
    program_modality_alias: null,
    program_modality_selected_alias: null,
    program_version_id: null,
    edition_id: null,
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
    contactos: []
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
  })

  function onChangeDescuentoPorcentual(opt) {
    if (!opt) {
      insc.val_porcentaje = 0
      return
    }
    insc.val_porcentaje = Number(opt.value) || 0
  }
  import { watchEffect } from 'vue'

  watchEffect(() => {
      const base = Number(insc.montoOriginal) || 0
      insc.montoDescuentoPorcentaje = (base * insc.val_porcentaje) / 100
      insc.montoDescuentoFijo = insc.val_fijo
      insc.montoBeneficio = insc.val_beneficio
      const totalDescuentos = insc.montoDescuentoPorcentaje + insc.montoDescuentoFijo + insc.montoBeneficio
      const final = base - totalDescuentos
      insc.total_amount = final > 0 ? final : 0
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

    const modality_selected_alias = l.cat_model_modality_alias ?? l.program_modality_selected_alias ?? null

    Object.assign(form, {
      fechaContactoInicial: normalizeDateTime(l.first_contact_date || l.registration_date) || todayIso,
      query_alias: l.query_alias ?? null,
      category_alias: l.cat_type_program_alias || l.category_alias || null,
      program_modality_alias: l.program_modality_alias ?? null,
      program_modality_selected_alias: modality_selected_alias,
      program_version_id: l.program_version_id ?? null,
      edition_id: l.program_edition_id ?? l.edition_id ?? null,
      full_name: l.full_name ?? l.full_name_label ?? '',
      telefono:  l.origin_phone ?? l.phone ?? '',
      status_alias:   l.status_alias,
      country_alias:  l.country_alias,
      ocupacion_alias: l.ocupacion_alias,
      client_status: l.client_status,
      client_status_label: l.client_status_label,
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
        status_label: att.cat_status_label,
        fechaContactoProximo: normalizeDateTime(att.contact_datetime),
        respuesta: att.response || ''
      })),

      enrollment_id: l.enrollment_id

    })

    createdLeadId.value   = l.id ?? l.lead_id ?? id
    createdPersonId.value = l.person_id ?? null
  }

  async function loadDataForCloning(sourceId) {
      try {
      console.log(sourceId)
          const originalData = await comercialService.leadGet({ id: sourceId })

          Object.assign(form, {
              fechaContactoInicial: normalizeDateTime(originalData.first_contact_date || originalData.registration_date) || todayIso,
              query_alias: originalData.query_alias ?? null,
              category_alias: originalData.cat_type_program_alias || originalData.category_alias || null,
              program_modality_alias: originalData.program_modality_alias ?? null,
              program_modality_selected_alias: originalData.cat_model_modality_alias ?? originalData.program_modality_selected_alias ?? null,
              program_version_id: originalData.program_version_id ?? null,
              edition_id: originalData.program_edition_id ?? originalData.edition_id ?? null,
              full_name: originalData.full_name ?? originalData.full_name_label ?? '',
              telefono: originalData.origin_phone ?? originalData.phone ?? '',
              status_alias: 'we_lead_status_atendido',
              country_alias: originalData.country_alias,
              client_status: originalData.client_status,
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
              contactos: [createEmptyAttempt()]
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

    if (isEdit.value) {
      await loadLead(leadIdParam.value)
      loaded.value = true
      return
    }

    form.contactos.push(createEmptyAttempt())

    form.canal_alias   = 'we_social_media_other'
    form.medium_alias  = 'we_social_media_whatsapp'
    form.nivel_alias   = 'we_lead_interest_low'
    form.country_alias = 'we_country_peru'
    form.status_alias  = 'we_lead_status_atendido'
    form.query_alias   = 'we_category_query_general'
    form.client_status   = 'we_client_person'
    form.active = true

    loaded.value = true
  })

  function createEmptyAttempt() {
    return {
      status_alias: 'we_follow_lead_pending',
      fechaContactoProximo: todayIso,
      respuesta: ''
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

async function searchLeadByPhone() {
  const phone = form.telefono?.trim()

  if (!phone || phone.length < 6) return
  if (searchingPhone.value) return

  searchingPhone.value = true

  try {
    const response = await comercialService.searchContact({ phone })

    const data = response.data || response

    if (!data || data.status === 'error') {
       return
    }

    if (data.status === 'new') {
      toast.info('Número no registrado. Se registrará como NUEVO.', { timeout: 3000 })

      client_category_alias = 'we_moment_new'

      form.categoriaMember  = ''

    } else {
      const tipo = data.t_lead === 'COMUNIDAD' ? 'CLIENTE / COMUNIDAD' : 'LEAD RECURRENTE'

      toast.success(`Encontrado: ${data.full_name} (${tipo})`, { timeout: 4000 })

      client_category_alias = 'we_moment_new'
      form.categoriaMember  = data.membresia || ''

      if (data.full_name) {
        form.full_name = data.full_name
      }

      if (data.last_program) {
        if (!form.observacion.includes(data.last_program)) {
           form.observacion = (form.observacion ? form.observacion + '\n' : '') + `[Histórico] Interés previo: ${data.last_program}`
        }
      }
    }

    leadDataHistory.value = true

  } catch (error) {
    console.error(error)
    toast.error('Error al consultar el número de teléfono')
  } finally {
    searchingPhone.value = false
  }
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


    const contact_attempts = (form.contactos || []).map((c, idx) => {
      const cat_status = idByAlias(c.status_alias, contactAttemptStatusCat.value)
      const contact_datetime = c.fechaContactoProximo || form.fechaContactoInicial
      return {
        id: c.id,
        attempt_number: idx + 1,
        cat_status,
        contact_datetime,
        response: c.respuesta || ''
      }
    })

    return {
      lead: {
        first_contact_date: form.fechaContactoInicial || null,
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
        cat_query,
        full_name: form.full_name,
        pay_date: form.pay_date,
        cat_frecuency_word,
        cat_type_strategy,
        cat_prospect_situation,

        origin_phone: (form.telefono || '').trim() || null,
        origin_email: null,

        message_init_conversation: form.mensajeChat?.trim() || null,
        observations:              form.observacion?.trim() || null,
      },
      contact_attempts
    }
  }


function buildEnrollmentPayload() {
  //obtengo las ID's
  const cat_type_document = idByAlias(insc.cat_type_document, docTypeCatalog.value)
  const cat_insc_modality = idByAlias(insc.cat_insc_modality, inscModalidades.value)
  const cat_type_payment  = idByAlias(insc.cat_type_payment, inscPaymentModes.value)
  const cat_currency      = idByAlias(insc.selectedCurrencyAlias, currencyCatalog.value)
  const cat_country       = idByAlias(form.country_alias, countryCatalog.value)

  return {

    inscription: {
      lead_id: createdLeadId.value,
      program_version_id: form.edition_id?null:form.program_version_id,
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
      saved_money: Number(insc.saved_money),
      dsct_porcent_id: insc.dsct_porcent_id,
      dsct_stick_id: insc.dsct_stick_id,
      dsct_benefit_id: insc.dsct_benefit_id,
      observations: insc.observacions,
      flag_agreement: insc.flag_agreement,
      b2b_contract_id: null //por ahora siempre null eso
    }
  }
}

async function confirmarInscripcion() {
  if (!comercialService) return console.error('comercialService no inyectado')

  if (!validateInscriptionClientInfo() || !validateInscriptionPaymentInfo()) {
     toast.warning("Por favor complete los campos obligatorios")
     return
  }

  savingInsc.value = true

  try {
    const payload = buildEnrollmentPayload()
    const response = await comercialService.enrollmentRegister(payload)

    toast.success('Inscripción y documentos subidos con éxito!')

    showViewModal.value = false
    router.push({ name: 'ComercialListado' })

  } catch (err) {
    console.error(err)
    toast.error('Ocurrió un error en el proceso de inscripción')
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

    if (!form.price_student_dollars || !form.price_student_soles || !form.price_profesional_soles || !form.price_profesional_dollars) {
      toast.info('No se encontraron precios para el programa seleccionado. Por favor, verifique la configuración del programa.', { timeout: 5000 })
      return
    }

    insc.cat_type_document = null
    insc.document          = ''
    insc.email             = ''
    insc.full_name         = form.full_name || ''
    insc.last_name         = ''
    insc.mother_last_name  = ''
    insc.cat_insc_modality = form.program_modality_selected_alias || 'we_insc_modality_normal'
    insc.selectedCurrencyAlias = 'we_currency_soles'
    insc.cat_type_payment  = 'we_payment_way_single'
    insc.saved_money       = 0
    insc.dsct_porcent_id   = null
    insc.dsct_money_id     = null
    insc.observacions       = ''
    showViewModal.value = true
  }

  function validateLeadInfo() {
    const required = ['fechaContactoInicial','category_alias','query_alias','program_version_id','edition_id']
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
    const required = ['telefono','status_alias','country_alias','ocupacion_alias']
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
    const required = ['selectedCurrencyAlias','cat_type_payment','saved_money']
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

    function onProgramaChange(opcion) {
        if (!opcion){
          form.edition_id = null
          form.program_modality_selected_alias = null
          return
        }

        form.program_modality_selected_alias = opcion.cat_model_modality_alias
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
        alCerrarModal()
      }
    })
</script>

<style scoped>

    .lead-form {
    font-size: 0.95rem;
    color: #111827;
    }

    .card-header {
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb !important;
    }

    .card-title-main {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.2;
    }

    .card-subtitle {
    font-size: 0.8rem;
    color: #6b7280;
    line-height: 1.2;
    margin-top: .25rem;
    }

    .timestamp-chip {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.2;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: .4rem;
    padding: .4rem .5rem;
    color: #374151;
    min-width: max-content;
    }

    .label-chip {
    font-size: .7rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: .03em;
    }

    .form-section {
    background-color: #ffffff;
    }

    .form-section__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 1rem;
    position: relative;
    padding-left: .75rem;
    min-height: 1.25rem;
    row-gap: .35rem;
    column-gap: .75rem;
    }

    .form-section__header::before {
    content: "";
    position: absolute;
    left: 0;
    top: .15rem;
    bottom: .15rem;
    width: 3px;
    border-radius: 2px;
    background-color: #3b82f6;
    }

    .form-section__title {
    font-size: .8rem;
    font-weight: 600;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: .03em;
    line-height: 1.2;
    }

    .form-section__note {
    font-size: .7rem;
    font-weight: 400;
    line-height: 1.2;
    color: #6b7280 !important;
    }

    .form-section__body {
    margin-left: .1rem;
    margin-right: .1rem;
    }

    .form-label {
    color: #1f2937;
    font-weight: 500;
    font-size: .8rem;
    line-height: 1.2;
    margin-bottom: .25rem;
    }

    .text-label-aux {
    font-size: .7rem;
    line-height: 1.3;
    color: #6b7280;
    margin-top: .35rem;
    }

    .form-control,
    .form-select,
    textarea.form-control {
    font-size: .85rem;
    line-height: 1.4;
    border-color: #d1d5db;
    color: #111827;
    }

    .form-control:focus,
    .form-select:focus,
    textarea.form-control:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 .2rem rgba(59,130,246,.15);
    outline: 0;
    }

    .required-star {
    color: #dc2626;
    font-weight: 600;
    margin-left: .15rem;
    }

    .card-footer {
    border-top: 1px solid #e5e7eb !important;
    background-color: #fff;
    }

    .btn-outline-secondary {
    border-color: #d1d5db;
    background-color: #fff;
    color: #374151;
    font-size: .85rem;
    font-weight: 500;
    }

    .btn-outline-secondary:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
    color: #1f2937;
    }

    .btn-primary {
    font-size: .85rem;
    font-weight: 500;
    line-height: 1.4;
    padding: .45rem .9rem;
    border-radius: .5rem;
    }

    .gap-2 {
    gap: .5rem;
    }

    .card-body {
    background-color: #fff;
    }

    section + section {
    border-top: 1px solid #f3f4f6;
    padding-top: 1.5rem;
    }

.contacto-table {
  margin-top: .75rem;
}

.contacto-table__head {
  font-size: .7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: .02em;
  font-weight: 600;
  padding: .5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.contacto-table__row {
  padding: .75rem;
  border-radius: .5rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  transition: all .2s;
}

.contacto-table__row:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.contacto-index {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #6b7280;
  font-size: .9rem;
  height: 100%;
}

.btn-outline-danger {
  border-color: #fca5a5;
  color: #b91c1c;
  background: #fff;
  padding: .35rem .65rem;
  font-size: .8rem;
  transition: all .2s;
}

.btn-outline-danger:hover {
  background-color: #fef2f2;
  border-color: #f87171;
  color: #991b1b;
}

@media (max-width: 767px) {
  .contacto-table__row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 1rem;
  }

  .contacto-index {
    justify-content: flex-start;
    padding-bottom: .5rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: .25rem;
    font-size: 1rem;
    color: #3b82f6;
  }

  .form-label {
    font-size: .75rem;
    text-transform: uppercase;
    letter-spacing: .03em;
    color: #64748b;
    font-weight: 600;
  }

  .btn-outline-danger {
    margin-top: .5rem;
    padding: .5rem 1rem;
  }
}
    .insc-head {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: .75rem;
    }
    .insc-title {
    font-weight: 600;
    font-size: .9rem;
    }
    .insc-sub {
    font-size: .7rem;
    color: #6b7280;
    }
    .insc-amount {
    background: #ecfdf3;
    color: #166534;
    border: 1px solid #bbf7d0;
    border-radius: .5rem;
    padding: .35rem .75rem;
    font-weight: 600;
    font-size: .85rem;
    }
    .pagos-table {
    display: flex;
    flex-direction: column;
    gap: .5rem;
    }
    .pagos-head {
    display: grid;
    grid-template-columns: 40px 160px 160px 60px;
    gap: .5rem;
    font-size: .7rem;
    text-transform: uppercase;
    color: #6b7280;
    }
    .pagos-row {
    display: grid;
    grid-template-columns: 40px 160px 160px 60px;
    gap: .5rem;
    align-items: center;
    }
    .pagos-row .idx {
    font-weight: 600;
    }
    @media (max-width: 768px) {
    .pagos-head {
        display: none;
    }
    .pagos-row {
        grid-template-columns: 1fr;
        background: #f9fafb;
        padding: .5rem .75rem;
        border-radius: .5rem;
        border: 1px solid #e5e7eb;
    }
    }
    .insc-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    }

    .insc-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: .6rem;
    padding: .75rem .85rem;
    }
    .insc-title {
    font-weight: 600;
    font-size: .9rem;
    color: #111827;
    }
    .insc-sub {
    font-size: .75rem;
    color: #6b7280;
    }
    .insc-amount {
    background: #ecfdf3;
    border: 1px solid #bbf7d0;
    color: #166534;
    font-weight: 600;
    padding: .25rem .65rem;
    border-radius: .75rem;
    font-size: .8rem;
    }

    .insc-section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: .6rem;
    padding: .75rem .85rem .85rem;
    }
    .insc-section__title {
    font-size: .75rem;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #6b7280;
    margin-bottom: .75rem;
    display: flex;
    align-items: center;
    gap: .35rem;
    }
    .insc-section__title::before {
    content: '';
    width: 4px;
    height: 14px;
    background: #3b82f6;
    border-radius: 9999px;
    }
.contacto-table {
  margin-top: .75rem;
}

.contacto-table__head {
  font-size: .7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: .02em;
  font-weight: 600;
  padding: .5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.contacto-table__row {
  padding: .75rem;
  border-radius: .5rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  transition: all .2s;
}

.contacto-table__row:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.contacto-index {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #6b7280;
  font-size: .9rem;
}

.btn-outline-danger {
  border-color: #fca5a5;
  color: #b91c1c;
  background: #fff;
  padding: .35rem .65rem;
  font-size: .8rem;
  transition: all .2s;
}

.btn-outline-danger:hover {
  background-color: #fef2f2;
  border-color: #f87171;
  color: #991b1b;
}

@media (max-width: 991px) {
  .contacto-table__row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 1rem;
  }

  .contacto-index {
    padding-bottom: .5rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: .25rem;
    font-size: 1rem;
    color: #3b82f6;
  }

  .form-label {
    font-size: .75rem;
    text-transform: uppercase;
    letter-spacing: .03em;
    color: #64748b;
    font-weight: 600;
  }

  .btn-outline-danger {
    margin-top: .5rem;
    padding: .5rem 1rem;
  }
}
    .insc-lead {
    background: #f9fafb;
    }
    .insc-lead__top {
    display: flex;
    justify-content: space-between;
    gap: .5rem;
    align-items: center;
    margin-bottom: .35rem;
    }
    .insc-lead__name {
    font-weight: 600;
    color: #111827;
    }
    .insc-lead__meta {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    font-size: .7rem;
    }

    .pagos-table {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    }
    .pagos-head {
    display: grid;
    grid-template-columns: 40px 170px 150px 40px;
    gap: .5rem;
    font-size: .7rem;
    color: #94a3b8;
    text-transform: uppercase;
    }
    .pagos-row {
    display: grid;
    grid-template-columns: 40px 170px 150px 40px;
    gap: .5rem;
    align-items: center;
    }
    .pagos-row .form-control-sm {
    height: 30px;
    font-size: .75rem;
    }
    .idx {
    font-weight: 600;
    color: #6b7280;
    font-size: .75rem;
    }

    @media (max-width: 768px) {
    .insc-head {
        flex-direction: column;
        align-items: flex-start;
    }
    .pagos-head,
    .pagos-row {
        grid-template-columns: 1fr;
    }
    .insc-section {
        padding: .75rem .65rem;
    }
    }

    .insc-amount-summary {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    }

    .amount-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: .75rem;
    }

    .amount-item {
    display: flex;
    flex-direction: column;
    gap: .25rem;
    }

    .amount-label {
    font-size: .7rem;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #6b7280;
    font-weight: 500;
    }

    .amount-value {
    font-size: 1rem;
    font-weight: 600;
    }

    .amount-original {
    color: #0f172a;
    }

    .amount-discount {
    color: #b91c1c;
    }

    .amount-final-box {
    background: #ecfdf3;
    border: 1px solid #bbf7d0;
    border-radius: .5rem;
    padding: .4rem .6rem;
    }

    .amount-final {
    color: #166534;
    font-size: 1.05rem;
    }

    .form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
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

  .upload-zone {
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    padding: 1.5rem;
    background-color: #f8fafc;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    position: relative;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .upload-zone:hover {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  .upload-zone--filled {
    border-style: solid;
    border-color: #10b981;
    background-color: #f0fdf4;
    cursor: default;
  }

  .upload-zone__empty {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .upload-icon-wrapper {
    width: 40px;
    height: 40px;
    background-color: #e2e8f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 1.2rem;
    margin-bottom: 4px;
  }

  .upload-zone:hover .upload-icon-wrapper {
    background-color: #dbeafe;
    color: #2563eb;
  }

  .upload-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: #334155;
  }

  .upload-hint {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .upload-zone__file {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    overflow: hidden;
  }

  .file-icon {
    font-size: 2rem;
    color: #10b981;
  }

  .file-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .file-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.95rem;
  }

  .file-status {
    font-size: 0.75rem;
    color: #10b981;
    font-weight: 500;
  }

  .btn-remove-file {
    background: white;
    border: 1px solid #fee2e2;
    color: #ef4444;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .btn-remove-file:hover {
    background: #fecaca;
    color: #b91c1c;
    border-color: #fecaca;
  }

  .summary-card {
    background-color: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .summary-header {
    background-color: #f1f5f9;
    padding: 12px 20px;
    font-weight: 600;
    color: #475569;
    font-size: 0.95rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .summary-body {
    padding: 20px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 0.95rem;
  }

  .summary-row.discount {
    color: #16a34a;
  }

  .summary-divider {
    height: 1px;
    background-color: #e2e8f0;
    margin: 16px 0;
    border-top: 1px dashed #cbd5e1;
    background: none;
  }

  .summary-row.total {
    margin-bottom: 0;
    align-items: flex-end;
  }

  .label-total {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    font-weight: 700;
  }

  .value-total {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1;
  }

  @media (max-width: 768px) {
    .upload-zone {
      min-height: 100px;
      padding: 1rem;
    }
  }
.insc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;

  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.insc-info {
  flex: 1;
  min-width: 0;
}

.program-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.35rem;
  line-height: 1.3;
}

.program-edition {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  color: #64748b;
  background: #f1f5f9;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.user-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #334155;
  max-width: 100%;
}

.user-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #cbd5e1;
  color: #fff;
  border-radius: 50%;
  font-size: 0.7rem;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.profile-badge.is-student {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.profile-badge.is-pro {
  background-color: #f1f5f9;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

.insc-price-box {
  text-align: right;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  min-width: 140px;
  flex-shrink: 0;
}

.price-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #166534;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.price-amount {
  font-weight: 800;
  color: #15803d;
  line-height: 1;
}

.price-amount .currency {
  font-size: 1rem;
  vertical-align: top;
  margin-right: 2px;
}

.price-amount .value {
  font-size: 1.5rem;
}

@media (max-width: 576px) {
  .insc-header {
    flex-direction: column;
    align-items: stretch;
  }
  .insc-price-box {
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
  }
}
</style>
```
