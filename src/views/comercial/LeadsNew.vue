

<template>
  <div class="tech-container">
    <div class="tech-header">
      <div class="header-left">
        <div class="header-icon">
          <i class="fa-solid fa-user-tag"></i>
        </div>
        <div>
          <h1 class="header-title">Gestión Comercial</h1>
          <span class="header-subtitle" v-if="form.full_name">{{ form.full_name }}</span>
          <span class="header-subtitle" v-else>Nuevo Lead</span>
        </div>
      </div>

      <div class="header-actions">
        <div v-if="isEdit" class="status-badge" :class="form.active ? 'bg-success-soft' : 'bg-danger-soft'">
          {{ form.active ? 'ACTIVO' : 'INACTIVO' }}
        </div>
        
        <button type="button" class="btn-tech btn-secondary" @click="cancelar">
          {{ form.enrollment_id ? 'Volver' : 'Cancelar' }}
        </button>
        
        <button 
          v-if="!form.enrollment_id && (isEdit || (validateLeadInfo() && validateContactInfo() && validateCommercialInfo()))" 
          type="button" 
          class="btn-tech btn-primary" 
          @click="guardar" 
          :disabled="saving">
          <i class="fa-solid fa-floppy-disk me-2"></i>
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>

        <button 
          type="button" 
          v-if="!form.enrollment_id && form.status_alias=='we_lead_status_bought' && isEdit && form.pay_date && form.client_status == 'we_client_person'"
          class="btn-tech btn-warning"
          @click="openInscription()">
          <i class="fa-solid fa-graduation-cap me-2"></i> INSCRIBIR
        </button>
      </div>
    </div>

    <div class="tech-grid-layout" v-if="loaded">
      
      <div class="tech-col-main">
        
        <section class="tech-card">
          <div class="tech-card__header">
            <span class="tech-card__title"><i class="fa-solid fa-layer-group me-2"></i>Interés y Programa</span>
          </div>
          <div class="tech-card__body grid-3">
            
            <div class="input-group-tech">
              <label>Fecha Contacto</label>
              <DateTime12 :disabled="isEdit" v-model="form.fechaContactoInicial" required clearable />
            </div>

            <div class="input-group-tech">
              <label>T. Consulta</label>
              <SearchSelect v-model="form.query_alias" :items="queryCatalog" :disabled="isEdit" label-field="description" value-field="alias" placeholder="Seleccionar..." :model-label="form.query_label" />
            </div>

            <div class="input-group-tech">
              <label>Categoría</label>
              <SearchSelect v-model="form.category_alias" :items="programTypeCatalog" label-field="description" :disabled="isEdit" value-field="alias" placeholder="Seleccionar..." required @change="onProgramaTypeChange" />
            </div>

            <div class="input-group-tech" v-if="['we_program_type_course', 'we_program_type_specialization'].includes(form.category_alias)">
              <label>Modalidad</label>
              <SearchSelect v-model="form.program_modality_alias" :items="programModalityCatalog" label-field="description" :disabled="isEdit" value-field="alias" placeholder="Seleccionar..." required @change="onProgramaTypeChange" />
            </div>

            <div class="input-group-tech span-2" v-if="form.category_alias">
              <label>Producto / Programa</label>
              <SearchSelect 
                v-model="form.program_version_id" 
                mode="remote" 
                            :minChars="0"
                            :cache="false"
                :fetcher="q => programService.programVersionCaller({ q, cat_type_program: programTypeCatalog.find(e=>e.alias==form.category_alias).id, cat_model_modality: !form.program_modality_alias?null:programModalityCatalog.find(e=>e.alias==form.program_modality_alias).id })"
                label-field="abbreviation" :disabled="isEdit" sublabel-field="version_code" value-field="program_version_id" :model-label="form.program_label" placeholder="Buscar programa..." required @change="onProgramaChange" 
              />
            </div>

            <div class="input-group-tech span-3" v-if="(isEdit && form.edition_id) || (form.program_modality_selected_alias && form.category_alias && form.program_version_id)">
              <label>Edición / Fecha</label>
              <div class="d-flex gap-2 align-items-center">
                 <div style="flex:1">
                   <SearchSelect v-model="form.edition_id" 
                            :minChars="0"
                            :cache="false" mode="remote" :fetcher="q => editionService.editionCaller({ q, program_version_id: form.program_version_id})" label-field="start_date_label" :disabled="isEdit" value-field="edition_num_id" placeholder="Buscar Edición..." :model-label="form.edition_label" required />
                 </div>
                 <div v-if="currentEdition" class="edition-mini-info scale-in-center">
                    <span><i class="fa-regular fa-clock"></i> {{ currentEdition.horario }}</span>
                    <span><i class="fa-solid fa-chalkboard-user"></i> {{ currentEdition.docente }}</span>
                 </div>
              </div>
            </div>

          </div>
        </section>

        <section class="tech-card" v-if="isEdit || validateLeadInfo()">
          <div class="tech-card__header">
            <span class="tech-card__title"><i class="fa-regular fa-address-card me-2"></i>Datos del Contacto</span>
            <div class="tech-header-controls" v-if="isEdit">
               <label class="toggle-tech">
                 <input type="checkbox" v-model="form.bot">
                 <span class="slider"></span>
                 <span class="label-text">BOT ACTIVO</span>
               </label>
            </div>
          </div>
          
          <div class="tech-card__body grid-4">
            
            <div class="input-group-tech">
              <label>Teléfono <span v-if="searchingPhone" class="loading-text">Buscando...</span></label>
              <div class="input-with-icon">
                <input autocomplete="off" v-model="form.telefono" type="text" class="form-control-tech" placeholder="999..." @keyup.enter="searchLeadByPhone" @blur="searchLeadByPhone" :disabled="searchingPhone" />
                <button class="icon-btn" @click="searchLeadByPhone"><i class="fa-solid fa-magnifying-glass"></i></button>
              </div>
            </div>

            <div class="input-group-tech span-2">
              <label>Nombre Completo</label>
              <input autocomplete="off" v-model="form.full_name" type="text" class="form-control-tech" placeholder="Razón Social o Nombres" />
            </div>

             <div class="input-group-tech">
              <label>País</label>
              <SearchSelect v-model="form.country_alias" :items="countryCatalog" label-field="description" value-field="alias" placeholder="País" required />
            </div>

            <div class="input-group-tech">
              <label>T. Cliente</label>
              <SearchSelect v-model="form.client_status" :items="clientCatalog" label-field="description" value-field="alias" placeholder="Tipo" required :model-label="form.client_status_label" />
            </div>

            <div class="input-group-tech">
              <label>Ocupación</label>
              <SearchSelect v-model="form.ocupacion_alias" :items="prospectSituationCatalog" label-field="description" value-field="alias" required :model-label="form.ocupacion_label" placeholder="Situación..." />
            </div>

             <div class="input-group-tech bg-readonly" v-if="leadDataHistory">
              <label>T. Lead (Histórico)</label>
              <input v-model="form.categoriaCliente" type="text" class="form-control-tech flat" disabled />
            </div>
            <div class="input-group-tech bg-readonly" v-if="leadDataHistory">
              <label>Membresía</label>
              <input v-model="form.categoriaMember" type="text" class="form-control-tech flat" disabled />
            </div>

          </div>
        </section>

      </div>

      <div class="tech-col-side">
        
        <section class="tech-card" v-if="isEdit || (validateLeadInfo() && validateContactInfo())">
          <div class="tech-card__header">
             <span class="tech-card__title"><i class="fa-solid fa-chart-line me-2"></i>Marketing & Estado</span>
          </div>
          <div class="tech-card__body grid-2">
            
            <div class="input-group-tech">
              <label>Status Lead</label>
              <SearchSelect v-model="form.status_alias" :items="leadStatusCatalog" label-field="description" value-field="alias" placeholder="Estado..." required :model-label="form.status_label" @change="onStatusChange" />
            </div>

             <div class="input-group-tech">
              <label>Nivel Interés</label>
              <SearchSelect v-model="form.nivel_alias" :items="leadInterestCatalog" required label-field="description" value-field="alias" :model-label="form.nivel_label" placeholder="Nivel..." />
            </div>

            <div class="input-group-tech">
              <label>F. Pago Prevista</label>
              <input autocomplete="off" v-model="form.pay_date" type="date" class="form-control-tech" :required="form.status_alias=='we_lead_status_bought'"/>
            </div>
            

            
             <div class="input-group-tech">
              <label>Medio</label>
              <SearchSelect disabled v-model="form.medium_alias" :items="socialMediaCatalog" required label-field="description" :model-label="form.medium_label" value-field="alias" placeholder="Medio..." />
            </div>
            

            <div class="input-group-tech span-2">
              <label>Mensaje Inicial / Chat</label>
              <textarea v-model="form.mensajeChat" class="form-control" rows="2" placeholder="Pegar mensaje del cliente..." required @input="handleMensajeChatInput"></textarea>
            </div>
              <div class="input-group-tech bg-readonly">
                <label>Canal</label>
                <input v-model="form.channel_label" type="text" class="form-control-tech flat" disabled />
              </div>

              <div class="input-group-tech bg-readonly">
                <label>Palabra Clave</label>
                <input v-model="form.key_word_label" type="text" class="form-control-tech flat" disabled />
              </div>
              
             <div class="input-group-tech span-2">
              <label>Observaciones Internas</label>
              <textarea v-model="form.observacion" class="form-control" rows="2"></textarea>
            </div>
             
             <div class="input-group-tech span-2" v-if="isEdit">
               <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                 <span class="small fw-bold text-muted">REGISTRO ACTIVO</span>
                  <label class="toggle-tech">
                    <input type="checkbox" v-model="form.active">
                    <span class="slider"></span>
                  </label>
               </div>
            </div>

          </div>
        </section>

        <section class="tech-card fill-height" v-if="isEdit || (validateLeadInfo() && validateContactInfo() && validateCommercialInfo())">
          <div class="tech-card__header">
            <span class="tech-card__title"><i class="fa-solid fa-timeline me-2"></i>Seguimiento</span>
            <button type="button" class="btn-mini" @click="addContacto"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div class="tech-card__body p-0">
            <div class="timeline-container">
              <div v-for="(c, idx) in form.contactos" :key="c.uid" class="timeline-item">
                <div class="timeline-marker">{{ idx + 1 }}</div>
                <div class="timeline-content">
                  <div class="timeline-row">
                     <div style="width: 160px;">
                        <SearchSelect view-open="2" v-model="c.status_alias" :items="contactAttemptStatusCat" required :disabled="c.status_alias == 'we_follow_lead_answered' || c.status_alias == 'we_follow_lead_no_answer'" label-field="description" value-field="alias" placeholder="Estado" :model-label="c.status_label" />
                     </div>
                     <div style="flex:1">
                        <DateTime12 v-model="c.fechaContactoProximo" required clearable :disabled="c.status_alias != 'we_follow_lead_pending'"/>
                     </div>
                  </div>
                  <div class="timeline-row mt-1">
                     <input autocomplete="off" v-model="c.respuesta" type="text" class="form-control-tech sm" placeholder="Resultado / Respuesta del cliente" :disabled="c.status_alias != 'we_follow_lead_pending'"/>
                      <button v-if="!c.id" type="button" class="btn-mini danger" @click="removeContacto(idx)">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
  
  
  <!-- MODAL DE INSCRIPCIÓN -->
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
          <i class="fa-solid fa-paperclip me-2 text-primary"></i>Documentación Adjunta
        </h6>
        
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label mb-2 fw-semibold">Comprobante de Pago</label>
            
            <input autocomplete="off" ref="adjPagoInput" type="file" class="d-none" @change="onAdjuntarPago" accept="image/*,.pdf"/>
            
            <div 
              class="upload-zone" 
              :class="{ 'upload-zone--filled': insc.adjPagoNombre }"
              @click="!insc.adjPagoNombre ? adjPagoInput?.click() : null"
            >
              <div v-if="!insc.adjPagoNombre" class="upload-zone__empty">
                <div class="upload-icon-wrapper">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <span class="upload-text">Haz clic para subir el voucher</span>
                <span class="upload-hint">PDF, JPG o PNG</span>
              </div>

              <div v-else class="upload-zone__file">
                <div class="file-info">
                  <i class="fa-solid fa-file-invoice-dollar file-icon"></i>
                  <div class="file-details">
                    <span class="file-name text-truncate">{{ insc.adjPagoNombre }}</span>
                    <span class="file-status">Listo para subir</span>
                  </div>
                </div>
                <button type="button" class="btn-remove-file" @click.stop="removeFile('pago')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label mb-2 fw-semibold">Carnet / Documento ID</label>
            
            <input autocomplete="off" ref="adjCarnetInput" type="file" class="d-none" @change="onAdjuntarCarnet" accept="image/*,.pdf"/>
            
            <div 
              class="upload-zone" 
              :class="{ 'upload-zone--filled': insc.adjCarnetNombre }"
              @click="!insc.adjCarnetNombre ? adjCarnetInput?.click() : null"
            >
              <div v-if="!insc.adjCarnetNombre" class="upload-zone__empty">
                <div class="upload-icon-wrapper">
                  <i class="fa-regular fa-id-card"></i>
                </div>
                <span class="upload-text">Subir carnet estudiantil</span>
                <span class="upload-hint">Opcional si aplica dscto.</span>
              </div>

              <div v-else class="upload-zone__file">
                <div class="file-info">
                  <i class="fa-solid fa-address-card file-icon"></i>
                  <div class="file-details">
                    <span class="file-name text-truncate">{{ insc.adjCarnetNombre }}</span>
                    <span class="file-status">Listo para subir</span>
                  </div>
                </div>
                <button type="button" class="btn-remove-file" @click.stop="removeFile('carnet')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
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
                {{ selectedCurrency.symbol }} {{ insc.montoFinal?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00' }}
              </span>
            </div>
          </div>
        </div>
      </section>
        

      <!-- 6. OBSERVACIONES --> 
       <section class="insc-section"> 
            <h6 class="insc-section__title">OBSERVACIONES</h6>
            <div class="row g-3"> 
              <textarea v-model="insc.observacion" class="form-control" rows="2"></textarea>
            </div> 
        </section> 
       
    </div>

    <template #footer>
      <button class="btn btn-outline btn-sm" @click="showViewModal = false">Cerrar</button>
      <button  class="btn btn-primary btn-sm" @click="confirmarInscripcion" :disabled="savingInsc">
        {{ savingInsc ? 'Guardando...' : 'Guardar inscripción' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
  /* ======================
  * Imports & DI
  * ====================== */
  import { ref, reactive, computed, onMounted, inject, nextTick } from 'vue'
  import { useRouter, useRoute } from 'vue-router'

  import { useToast } from 'vue-toastification'


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

  /* ======================
  * Flags crear/editar
  * ====================== */
  const leadIdParam = computed(() => {
    const raw = route.params?.id
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  })
  const isEdit = computed(() => !!leadIdParam.value)

  /* ======================
  * Estado general
  * ====================== */
  const loaded          = ref(false)
  const saving          = ref(false)
  const savingInsc      = ref(false)
  const showViewModal   = ref(false)
  const leadDataHistory = ref(false)
  const createdLeadId   = ref(null)
  const createdPersonId = ref(null)

  const todayIso = new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm → 16 chars

  /* ======================
  * Catálogos (localStorage)
  * ====================== */
  const leadStatusCatalog        = ref(catalog.options('we_lead_status'))
  const leadInterestCatalog      = ref(catalog.options('we_lead_interest'))
  const countryCatalog           = ref(catalog.options('we_country'))
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

  /* ======================
  * Formularios
  * ====================== */
  const form = reactive({
    // A. Información del lead
    fechaContactoInicial: todayIso,
    query_alias: null,                 // promoción / categoría de consulta
    category_alias: null,              // tipo de programa (alias)
    program_modality_alias: null,      // modalidad elegida para filtro
    program_modality_selected_alias: null, // modalidad real del programa elegido
    program_version_id: null,
    edition_id: null,
    // B. Contacto
    client_status: null,
    client_status_label: null,
    enrollment_id: null,


    // B. Contacto
    full_name: '',
    nombre: '',                        // (legacy opcional)
    telefono: '',
    status_alias: null,
    country_alias: null,
    ocupacion_alias: null,
    bot: false,

    // C. Comercial
    pay_date: null,
    nivel_alias: null,
    prox_medium_alias: null,
    mensajeChat: '',
    canal_alias: null,
    medium_alias: null,
    key_word_alias: null,
    channel_label: null,
    key_word_label: null,
    strategy_alias: null,
    observacion: '',
    categoriaCliente: 'NEW',
    categoriaMember: '',

    // Seguimiento
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
    
    // IDs seleccionados
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,

    // AGREGA ESTOS CAMPOS AUXILIARES PARA GUARDAR EL VALOR (Ej: 15, 20, 5)
    val_porcentaje: 0, // Ej: 15 (para 15%)
    val_fijo: 0,       // Ej: 20 (para 20 soles)
    val_beneficio: 0,  // Ej: 5  (para 5 soles)

    // Montos calculados (Dinero)
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficio: 0,
    montoFinal: 0,
    dsct_porcent_id: null, // ID del descuento porcentual
    dsct_stick_id: null, // ID del descuento fijo (promoción)
    dsct_benefit_id: null, // ID del beneficio (monto fijo)
  })

  function onChangeDescuentoPorcentual(opt) {
    if (!opt) {
      insc.val_porcentaje = 0
      return
    }
    // Guardamos el value (ej: 15)
    insc.val_porcentaje = Number(opt.value) || 0
  }
  import { watchEffect } from 'vue'

  watchEffect(() => {
      const base = Number(insc.montoOriginal) || 0

      // A. Calcular monto del porcentaje: (Base * 15) / 100
      // Nota: Depende de tu regla de negocio si el % se aplica al total o al remanente. 
      // Aquí asumo que es sobre el precio base.
      insc.montoDescuentoPorcentaje = (base * insc.val_porcentaje) / 100

      // B. Los fijos son directos
      insc.montoDescuentoFijo = insc.val_fijo
      insc.montoBeneficio = insc.val_beneficio

      // C. Calcular Final
      // Final = Base - (Calculado% + Fijo + Beneficio)
      const totalDescuentos = insc.montoDescuentoPorcentaje + insc.montoDescuentoFijo + insc.montoBeneficio
      
      const final = base - totalDescuentos

      // Evitar negativos
      insc.montoFinal = final > 0 ? final : 0
  })
  function onChangeDescuentoFijo(opt) {
    if (!opt) {
      insc.val_fijo = 0
      return
    }
    // Guardamos el value (ej: 20)
    insc.val_fijo = Number(opt.value) || 0
  }

  function onChangeBeneficio(opt) {
    if (!opt) {
      insc.val_beneficio = 0
      return
    }
    // Guardamos el value (ej: 5)
    insc.val_beneficio = Number(opt.value) || 0
  }

    const montoFinalCalculado = computed(() => {
      const base = Number(insc.montoOriginal) || 0
      // Asumiendo que calculas descuentos en otro lado
      const dscto = Number(insc.totalDescuentos) || 0 
      return base - dscto
  })

  const selectedCurrency = computed(
    () =>
      currencyCatalog.value.find(i => i.alias === insc.selectedCurrencyAlias)?.raw ??
      { alias:'we_currency_soles', code:'PEN', symbol:'S/.', minorUnit:2, locale:'es-PE', decimal:'.', thousands:',', position:'prefix', allowNegative:false, allowZero:false }
  )

  /* Programas / Ediciones (para modal) */
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

  /* ======================
  * Helpers (ids/alias/fecha)
  * ====================== */
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

  /* ======================
  * Load lead (editar)
  * ====================== */
  async function loadLead(id) {
    console.log(id)
    // Ajusta al nombre real de tu endpoint si es distinto
    const data = await comercialService.leadGet({ id })

    const l = data?.lead || data || {}

    // Aliases (si solo vienen IDs desde el backend)

    const modality_selected_alias = l.cat_model_modality_alias ?? l.program_modality_selected_alias ?? null

    Object.assign(form, {
      // A. Lead
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
      // Campos para mostrar en el formulario
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

      // C. Comercial
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
      
      observacion: l.observations ?? '',
      // Seguimiento
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
          // 2. Pedimos los datos del lead original al backend
          const originalData = await comercialService.leadGet({ id: sourceId })
          
          // 3. Mapeamos los datos del lead original al formulario actual
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
              status_alias: 'we_lead_status_atendido', // Resetear status para el nuevo lead
              country_alias: originalData.country_alias,
              client_status: originalData.client_status,
              ocupacion_alias: originalData.ocupacion_alias,
              bot: false, // Resetear bot
              active: true, // Activo por defecto
              program_label: originalData.program_label ?? null,
              edition_label: originalData.edition_label ?? null,
              query_label: originalData.query_label ?? null,
              ocupacion_label: originalData.ocupacion_label ?? null,
              // No copiar status_label, interest_label, etc. ya que el status se resetea
              
              pay_date: null, // Resetear fecha de pago
              nivel_alias: 'we_lead_interest_low', // Resetear nivel de interés
              mensajeChat: originalData.message_init_conversation ?? '',
              canal_alias: originalData.channel_alias,
              channel_label: originalData.channel_label ?? null,
              key_word_label: originalData.key_word_label ?? null,
              
              medium_alias: originalData.medium_alias,
              key_word_alias: originalData.key_word_alias ?? aliasById(originalData.key_word_alias, mktWordsCatalog.value),
              strategy_alias: originalData.strategy_alias,
              observacion: originalData.observations ?? '',
              categoriaCliente: originalData.t_lead ?? 'NEW',
              categoriaMember: originalData.membresia ?? '',
              // No copiar contactos para el nuevo lead, se inicia vacío
              contactos: [createEmptyAttempt()]
          })
          // Limpiar IDs para asegurar que se cree un nuevo lead
          createdLeadId.value = null
          createdPersonId.value = null
          toast.info('Formulario precargado con datos del lead original. Por favor, revise y guarde.', { timeout: 5000 })
          
          
      } catch (e) {
          console.error("Error cargando plantilla para clonar", e)
      }
  }

  /* ======================
  * Montaje
  * ====================== */
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

    // Defaults para NUEVO
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

  /* ======================
  * Seguimiento helpers
  * ====================== */
  function createEmptyAttempt() {
    return {
      status_alias: 'we_follow_lead_pending',
      fechaContactoProximo: todayIso,
      respuesta: ''
    }
  }
  function addContacto() { form.contactos.push(createEmptyAttempt()) }
  function removeContacto(idx) { form.contactos.splice(idx, 1) }

  /* ======================
  * Handlers de UI
  * ====================== */
  function handleMensajeChatInput() {
    const msj = (form.mensajeChat || '').toLowerCase()

    const canal = socialMediaCatalog.value?.find(e =>
      e.description && msj.includes(e.description.toLowerCase())
    )
    form.canal_alias = canal?.alias || 'we_social_media_other'
    form.channel_label = canal?.description || 'OTRO'

    const key_word =  mktWordsCatalog.value?.find(e =>
      e.description && msj.includes(e.description.toLowerCase())
    )
    
    form.key_word_alias = key_word? key_word.alias : null
    
    form.key_word_label = key_word? key_word.description : null
  }
  function onStatusChange(opt) {
    if (!opt) return
    if (opt.description === 'Pagó') {
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
    }
  }
  /* ======================
* Estado general
* ====================== */
// ... tus otras variables (loaded, saving, etc.) ...
const searchingPhone = ref(false) // <--- AGREGAR ESTA VARIABLE

/* ======================
* Handlers de UI
* ====================== */

//searchSunat
async function searchSunat() {
  // Implementa la lógica para buscar en SUNAT si es necesario
  //sunatGet
  const sunatData = await customerService.sunatGet({ document: insc.document })

    if (sunatData && sunatData.nombre_o_razon_social) {
      insc.full_name = sunatData.nombre_o_razon_social
      // Si es RUC, asumimos que es una empresa y no tiene apellidos separados
      insc.last_name = ''
      insc.mother_last_name = ''
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.', { timeout: 3000 })
    }

  // Esto es un placeholder
  console.log('Buscando en SUNAT con documento:', insc.document)
}

// REEMPLAZA TU FUNCIÓN searchLeadByPhone ACTUAL POR ESTA:
async function searchLeadByPhone() {
  const phone = form.telefono?.trim()

  // 1. Validaciones básicas para no llamar por gusto
  if (!phone || phone.length < 6) return 
  if (searchingPhone.value) return // Evitar doble llamada (Enter + Blur)

  searchingPhone.value = true
  
  try {
    // Llamamos al servicio (asegúrate que comercialService tenga searchContact)
    // Se asume que el servicio devuelve { ok: true, data: {...} } o directamente la data
    const response = await comercialService.searchContact({ phone })
    
    // Normalizamos la data (dependiendo de cómo tengas configurado tu axios response interceptor)
    const data = response.data || response 

    if (!data || data.status === 'error') {
       // Si falló algo silenciosamente
       return
    }

    // 2. Lógica de asignación según respuesta (Legacy / DB / New)
    if (data.status === 'new') {
      // Caso: Nuevo
      toast.info('Número no registrado. Se registrará como NUEVO.', { timeout: 3000 })
      
      form.categoriaCliente = 'NEW'
      form.categoriaMember  = ''
      
      // No borramos el nombre si el usuario ya lo escribió manualmente
    } else {
      // Caso: Encontrado (Legacy o DB)
      const tipo = data.t_lead === 'COMUNIDAD' ? 'CLIENTE / COMUNIDAD' : 'LEAD RECURRENTE'
      
      toast.success(`Encontrado: ${data.full_name} (${tipo})`, { timeout: 4000 })
      
      // Auto-completado
      form.categoriaCliente = data.t_lead       // 'COMUNIDAD' o 'LEAD'
      form.categoriaMember  = data.membresia || ''
      
      // Solo sobreescribimos el nombre si viene del backend
      if (data.full_name) {
        form.full_name = data.full_name
      }
      
      // Opcional: Si traes 'last_program' del legacy, podrías ponerlo en observaciones
      if (data.last_program) {
        if (!form.observacion.includes(data.last_program)) {
           form.observacion = (form.observacion ? form.observacion + '\n' : '') + `[Histórico] Interés previo: ${data.last_program}`
        }
      }
    }

    // 3. Habilitar visualización de campos T. Lead y Membresía
    leadDataHistory.value = true

  } catch (error) {
    console.error(error)
    toast.error('Error al consultar el número de teléfono')
  } finally {
    searchingPhone.value = false
  }
}

  function cancelar() { router.back() }

  /* ======================
  * Build payloads
  * ====================== */
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

/* ========================================================
 * CONSTRUCCIÓN DEL PAYLOAD (Datos para el SP)
 * ======================================================== */
function buildEnrollmentPayload() {
  
  // 1. Obtener IDs de los catálogos usando los Alias seleccionados
  const cat_type_document = idByAlias(insc.cat_type_document, docTypeCatalog.value)
  const cat_insc_modality = idByAlias(insc.cat_insc_modality, inscModalidades.value)
  const cat_type_payment  = idByAlias(insc.cat_type_payment, inscPaymentModes.value)
  const cat_currency      = idByAlias(insc.selectedCurrencyAlias, currencyCatalog.value)
  const cat_country       = idByAlias(form.country_alias, countryCatalog.value) // Usamos el país del lead

  // 2. Retornar estructura exacta que espera el Backend -> SP
  return {

    inscription: {
      // -- VINCULACIÓN --
      lead_id: createdLeadId.value, // ID del lead actual
      program_version_id: form.program_version_id,
      program_edition_id: form.edition_id,

      // -- DATOS DE PERSONA (Para Identity Resolution) --
      document: insc.document,
      cat_type_document: cat_type_document,
      full_name: insc.full_name,         // First Name
      last_name: insc.last_name,         // Apellido Paterno
      mother_last_name: insc.mother_last_name, // Apellido Materno
      email: insc.email,
      cat_country: cat_country,

      // -- DATOS DE INSCRIPCIÓN --
      cat_insc_modality: cat_insc_modality,
      cat_type_payment: cat_type_payment,
      
      // -- FINANCIERO --
      selectedCurrencyAlias: insc.selectedCurrencyAlias, // Opcional, referencia
      montoFinal: Number(insc.montoFinal),   // Importante: Enviar como Número
      saved_money: Number(insc.saved_money), // Importante: Enviar como Número

      // -- DESCUENTOS --
      dsct_porcent_id: insc.dsct_porcent_id,
      dsct_stick_id: insc.dsct_stick_id,
      dsct_benefit_id: insc.dsct_benefit_id,

      // -- OTROS --
      observations: insc.observacion,
      
      // -- B2B (Futuro) --
      b2b_contract_id: null 
    }
  }
}


/* ========================================================
 * FUNCIÓN DE CONFIRMACIÓN (ACTUALIZADA)
 * ======================================================== */
async function confirmarInscripcion() {
  if (!comercialService) return console.error('comercialService no inyectado')
  
  if (!validateInscriptionClientInfo() || !validateInscriptionPaymentInfo()) {
     toast.warning("Por favor complete los campos obligatorios")
     return
  }

  savingInsc.value = true
  
  try {
    // --- PASO 1: Guardar Datos (JSON) ---
    const payload = buildEnrollmentPayload()
    const response = await comercialService.enrollmentRegister(payload)
    
    const newEnrollmentId = response.enrollment_id
    
    // --- PASO 2: Subir Archivos (Si existen) ---
    // Verificamos si el usuario adjuntó algo en los inputs
    if (insc.adjPagoFile || insc.adjCarnetFile) {
        
        // Llamada al nuevo endpoint de subida
        // await uploadEnrollmentFiles(
        //     newEnrollmentId,     // ID que nos devolvió el paso 1
        //     insc.adjPagoFile,    // Archivo Blob/File del input de pago
        //     insc.adjCarnetFile   // Archivo Blob/File del input de carnet
        // )
        await comercialService.uploadEnrollmentFiles(
            newEnrollmentId,     // ID que nos devolvió el paso 1
            insc.adjPagoFile,    // Archivo Blob/File del input de pago
            insc.adjCarnetFile   // Archivo Blob/File del input de carnet
        )
        toast.success('Inscripción y documentos subidos con éxito!')
    } else {
        toast.success('Inscripción realizada con éxito (sin adjuntos)')
    }

    showViewModal.value = false
    router.push({ name: 'ComercialListado' })

  } catch (err) {
    console.error(err)
    toast.error('Ocurrió un error en el proceso de inscripción')
  } finally {
    savingInsc.value = false
  }
}

  /* ======================
  * Guardar / Inscripción
  * ====================== */
  async function guardar() {
    if (!comercialService) return console.error('comercialService no inyectado')
    saving.value = true
    try {
      const payload = buildLeadPayload()
      if (isEdit.value) {
        // Ajusta al nombre real del endpoint update:
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
    //si alguno de estos esta null

    if (!form.price_student_dollars || !form.price_student_soles || !form.price_profesional_soles || !form.price_profesional_dollars) {
      toast.info('No se encontraron precios para el programa seleccionado. Por favor, verifique la configuración del programa.', { timeout: 5000 })
      return
    }

    // Inicializar datos de inscripción con valores del lead
    insc.cat_type_document = null // Asumir que el tipo de documento se selecciona en la inscripción
    insc.document          = ''
    insc.email             = ''
    insc.full_name         = form.full_name || ''
    insc.last_name         = ''
    insc.mother_last_name  = ''
    insc.cat_insc_modality = form.program_modality_selected_alias || 'we_insc_modality_normal' // Default a virtual si no hay modalidad
    insc.selectedCurrencyAlias = 'we_currency_soles' // Default a soles
    insc.cat_type_payment  = 'we_payment_way_single' // Default a contado
    insc.saved_money       = 0
    insc.dsct_porcent_id   = null
    insc.dsct_money_id     = null
    insc.observacion       = ''

    // Limpiar adjuntos
    insc.adjPagoFile    = null
    insc.adjPagoNombre  = ''
    insc.adjCarnetFile  = null
    insc.adjCarnetNombre = ''

    showViewModal.value = true 
  }


  /* ======================
  * Validaciones
  * ====================== */
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

  /* ======================
  * Adjuntos (inscripción)
  * ====================== */
  const adjPagoInput = ref(null)
  const adjCarnetInput = ref(null)

  function onAdjuntarPago(e) {
    const file = e.target.files?.[0]
    if (file) {
      insc.adjPagoFile = file
      insc.adjPagoNombre = file.name
    }
  }
  function onAdjuntarCarnet(e) {
    const file = e.target.files?.[0]
    if (file) {
      insc.adjCarnetFile = file
      insc.adjCarnetNombre = file.name
    }
  }

  /* Montos demo (si necesitas) */
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

    // ... tus imports y variables existentes ...

    /* AGREGAR ESTA FUNCIÓN JUNTO A TUS OTRAS FUNCIONES DE ADJUNTOS */
    function removeFile(type) {
      if (type === 'pago') {
        insc.adjPagoFile = null
        insc.adjPagoNombre = ''
        if (adjPagoInput.value) adjPagoInput.value.value = '' // Reset input HTML
      } else if (type === 'carnet') {
        insc.adjCarnetFile = null
        insc.adjCarnetNombre = ''
        if (adjCarnetInput.value) adjCarnetInput.value.value = '' // Reset input HTML
      }
    }

    /* ==========================================
    * LÓGICA DE PRECIOS DINÁMICOS (MODAL)
    * ========================================== */

    // 1. Detectar si es Estudiante o Profesional basado en variable_3
    const clientProfileType = computed(() => {
      if (!form.ocupacion_alias) return null
      
      // Buscamos la opción completa en el catálogo usando el alias seleccionado
      const ocupacionInfo = prospectSituationCatalog.value.find(
        opt => opt.alias === form.ocupacion_alias
      )

      // Retornamos 'estudiante' o 'profesional' (variable_3)
      // Si no tiene variable_3, asumimos profesional por defecto o null
      return ocupacionInfo?.variable_3 || null
    })

    // 2. Calcular el precio base según moneda y perfil
    const calculatedBasePrice = computed(() => {
      // Si no hay moneda seleccionada, no hay precio
      if (!insc.selectedCurrencyAlias) return 0

      const isUSD = insc.selectedCurrencyAlias === 'we_currency_usd' // Ajusta al alias real de dólares en tu DB
      const type = clientProfileType.value // 'estudiante' | 'profesional'

      if (type === 'estudiante') {
        return isUSD 
          ? Number(form.price_student_dollars || 0) 
          : Number(form.price_student_soles || 0)
      } else {
        // Caso Profesional (o default)
        return isUSD 
          ? Number(form.price_profesional_dollars || 0) 
          : Number(form.price_profesional_soles || 0)
      }
    })

    // 3. Watcher: Cuando cambia el precio calculado, actualizamos el modelo de inscripción
    import { watch } from 'vue' // Asegúrate de importar watch

    watch(calculatedBasePrice, (newPrice) => {
      // Solo actualizamos si el precio es mayor a 0 para no borrar ediciones manuales previas si falla algo
      // O puedes forzarlo siempre:
      insc.montoOriginal = newPrice
    }, { immediate: true })

    // 4. Watcher auxiliar: Si cambian la moneda en el modal, recalcular
    watch(() => insc.selectedCurrencyAlias, () => {
      // Esto dispara el computed 'calculatedBasePrice', que a su vez dispara el watcher de arriba
      // Simplemente asegura que la reactividad fluya.
    })

    // Función personalizada
    const alCerrarModal = () => {
      console.log('La modal se ha cerrado. Limpiando formulario...')
      // Resetear todos los campos de `insc` a su estado inicial o vacío
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
        adjPagoFile: null,
        adjPagoNombre: '',
        adjCarnetFile: null,
        adjCarnetNombre: '',
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

      // Limpiar los inputs de tipo file si existen
      if (adjPagoInput.value) adjPagoInput.value.value = ''
      if (adjCarnetInput.value) adjCarnetInput.value.value = ''
      
    }

    // Observador
    watch(showViewModal, (estaAbierto) => {
      // Si estaAbierto es false, significa que se acaba de cerrar
      if (!estaAbierto) {
        alCerrarModal()
      }
    })
</script>

<style scoped>
/* =========================================
   VARIABLES & RESET
   ========================================= */
.tech-container {
  --primary: #4f46e5;       /* Indigo moderno */
  --primary-hover: #4338ca;
  --bg-page: #f3f4f6;
  --bg-card: #ffffff;
  --border: #e2e8f0;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --input-bg: #f8fafc;
  --radius: 8px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  
  background-color: var(--bg-page);
  min-height: 100vh;
  padding: 1rem;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--text-main);
}

/* =========================================
   HEADER
   ========================================= */
.tech-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  background: var(--bg-card);
  padding: 1rem 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 42px;
  height: 42px;
  background: #e0e7ff;
  color: var(--primary);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.header-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.bg-success-soft { background: #dcfce7; color: #166534; }
.bg-danger-soft { background: #fee2e2; color: #991b1b; }

/* =========================================
   GRID LAYOUT PRINCIPAL
   ========================================= */
.tech-grid-layout {
  display: grid;
  grid-template-columns: 2fr 1.5fr; /* 60% - 40% aprox */
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 992px) {
  .tech-grid-layout { grid-template-columns: 1fr; }
}

.tech-col-main, .tech-col-side {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* =========================================
   TARJETAS (CARDS)
   ========================================= */
.tech-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tech-card.fill-height {
  height: 100%;
}

.tech-card__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tech-card__title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.tech-card__body {
  padding: 1rem;
}

/* =========================================
   SISTEMA DE GRID INTERNO (Inputs)
   ========================================= */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }

.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }

@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .span-2, .span-3 { grid-column: span 1; }
}

/* =========================================
   INPUTS & CONTROLES MODERNOS
   ========================================= */
.input-group-tech {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.input-group-tech label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-control-tech {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  color: var(--text-main);
  transition: all 0.2s;
  width: 100%;
}

.form-control-tech:focus {
  background: #fff;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  outline: none;
}

.form-control-tech.sm {
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
}

.form-control-tech.flat {
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--border);
  border-radius: 0;
  padding-left: 0;
}

.bg-readonly {
    opacity: 0.8;
}

.input-with-icon {
  position: relative;
  display: flex;
}
.input-with-icon input {
  padding-right: 35px;
}
.icon-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 36px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.icon-btn:hover { color: var(--primary); }

/* =========================================
   BOTONES
   ========================================= */
.btn-tech {
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
  display: inline-flex;
  align-items: center;
}
.btn-tech:active { transform: translateY(1px); }

.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }

.btn-secondary { background: white; border: 1px solid var(--border); color: var(--text-main); }
.btn-secondary:hover { background: #f9fafb; border-color: #cbd5e1; }

.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }

.btn-mini {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: white;
  color: var(--text-muted);
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-mini:hover { border-color: var(--primary); color: var(--primary); }
.btn-mini.danger:hover { border-color: #ef4444; color: #ef4444; }

/* =========================================
   TIMELINE (Seguimiento)
   ========================================= */
.timeline-container {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1rem;
  position: relative;
}
.timeline-item:last-child { border-bottom: none; }

.timeline-marker {
  width: 24px;
  height: 24px;
  background: #e0e7ff;
  color: var(--primary);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4px;
}

.timeline-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* =========================================
   EXTRAS
   ========================================= */
.edition-mini-info {
    font-size: 0.75rem;
    color: var(--primary);
    background: #eef2ff;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
    display: flex;
    gap: 10px;
}

.toggle-tech {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.toggle-tech input { display: none; }
.slider {
  width: 36px;
  height: 20px;
  background: #cbd5e1;
  border-radius: 99px;
  position: relative;
  transition: 0.3s;
}
.slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: 0.3s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.toggle-tech input:checked + .slider { background: var(--primary); }
.toggle-tech input:checked + .slider::before { transform: translateX(16px); }
.label-text { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); }

.loading-text { color: #f59e0b; font-size: 0.7rem; animation: pulse 1s infinite; margin-left: 5px; }

@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
@keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.scale-in-center { animation: scale-in 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }


    /* Rojo cuando es requerido y NO es válido (vacío, formato inválido, etc.) */
    .form-control:required:invalid:not(:disabled):not([readonly]),
    .form-select:required:invalid:not(:disabled):not([readonly]),
    textarea.form-control:required:invalid:not(:disabled):not([readonly]) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 .2rem rgba(239,68,68,.15);
    }

    /* Verde cuando es requerido y SÍ es válido */
    .form-control:required:valid:not(:disabled):not([readonly]),
    .form-select:required:valid:not(:disabled):not([readonly]),
    textarea.form-control:required:valid:not(:disabled):not([readonly]) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 .2rem rgba(16,185,129,.15);
    }

    .lead-form {
    font-size: 0.95rem;
    color: #111827;
    }

    /* ---------- CARD HEADER ---------- */
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

    /* ---------- FORM SECTION ---------- */
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
    background-color: #3b82f6; /* azul suave corporativo */
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

    /* ---------- LABELS / AYUDA ---------- */
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

    /* ---------- CAMPOS ---------- */
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

    /* ---------- REQUERIDOS ---------- */
    .required-star {
    color: #dc2626;
    font-weight: 600;
    margin-left: .15rem;
    }

    /* ---------- FOOTER ACCIONES ---------- */
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

    /* ---------- SEPARADORES ENTRE SECCIONES DEL BODY ---------- */
    .card-body {
    background-color: #fff;
    }

    section + section {
    border-top: 1px solid #f3f4f6;
    padding-top: 1.5rem;
    }

    /* puedes meterlo en el mismo <style scoped> del form */
    .contacto-table {
    display: flex;
    flex-direction: column;
    gap: .5rem;
    margin-top: .75rem;
    }
    .contacto-table__head {
    display: grid;
    grid-template-columns: 40px 160px 320px 1fr 100px;
    gap: .5rem;
    font-size: .7rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: .02em;
    }
    .contacto-table__row {
    display: grid;
    grid-template-columns: 40px 160px 320px 1fr 100px;
    gap: .5rem;
    align-items: center;
    }
    .contacto-table__cell .form-control {
    height: 32px;
    font-size: .8rem;
    }
    .contacto-table__cell.actions {
    display: flex;
    justify-content: center;
    }
    .btn-outline-danger {
    border-color: #fca5a5;
    color: #b91c1c;
    background: #fff;
    padding: .15rem .5rem;
    }
    @media (max-width: 768px) {
      .contacto-table__head {
          display: none;
      }
      .contacto-table__row {
          grid-template-columns: 1fr;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: .5rem;
          padding: .5rem .75rem;
      }
      .contacto-table__cell {
          display: flex;
          flex-direction: column;
          gap: .25rem;
      }
      .contacto-table__cell.index {
          font-weight: 600;
          color: #111827;
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
    /* puedes meterlo en el mismo SFC donde usas el modal */
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

    /* lead */
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

    /* pagos */
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

    /* Simple switch */
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
    border: 2px dashed #cbd5e1; /* Gris azulado suave */
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
    border-color: #3b82f6; /* Azul primario */
    background-color: #eff6ff;
  }

  .upload-zone--filled {
    border-style: solid;
    border-color: #10b981; /* Verde éxito */
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

  /* Filled State Styles */
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

  /* ========================
    RESUMEN ECONÓMICO (TICKET)
    ======================== */
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
    color: #16a34a; /* Verde para descuentos */
  }

  .summary-divider {
    height: 1px;
    background-color: #e2e8f0;
    margin: 16px 0;
    border-top: 1px dashed #cbd5e1; /* Línea punteada tipo ticket */
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

  /* Ajustes responsive */
  @media (max-width: 768px) {
    .upload-zone {
      min-height: 100px;
      padding: 1rem;
    }
  }
  /* Contenedor Principal */
.insc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Alineación superior */
  gap: 1.5rem; /* Espacio vital entre columnas */
  
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem; /* Más padding para que no se vea apretado */
  border-radius: 0.5rem 0.5rem 0 0;
}

/* Columna Izquierda (Info) */
.insc-info {
  flex: 1; /* Toma el espacio disponible */
  min-width: 0; /* Permite que el truncate funcione */
}

.program-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b; /* Gris oscuro elegante */
  margin-bottom: 0.35rem;
  line-height: 1.3;
}

.program-edition {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  color: #64748b; /* Gris medio */
  background: #f1f5f9;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

/* Fila de Badges de Usuario */
.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

/* Badge de Usuario (Diseño Pastilla) */
.user-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px; /* Redondo */
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

/* Badge de Perfil (Estudiante/Pro) */
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
  background-color: #e0f2fe; /* Azul claro */
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.profile-badge.is-pro {
  background-color: #f1f5f9; /* Gris */
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

/* Columna Derecha (Precio) */
.insc-price-box {
  text-align: right;
  background: #f0fdf4; /* Fondo verde muy suave */
  border: 1px solid #bbf7d0;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  min-width: 140px;
  flex-shrink: 0; /* No se encoge si falta espacio */
}

.price-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #166534; /* Verde oscuro */
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.price-amount {
  font-weight: 800;
  color: #15803d; /* Verde vibrante */
  line-height: 1;
}

.price-amount .currency {
  font-size: 1rem;
  vertical-align: top;
  margin-right: 2px;
}

.price-amount .value {
  font-size: 1.5rem; /* Número grande */
}

/* Responsivo para móviles */
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