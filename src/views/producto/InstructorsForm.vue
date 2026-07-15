<template>
  <div class="exec-shell form-shell">
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text d-flex align-items-center gap-3">
            <div>
              <span class="brand-eyebrow">Gestión de Instructores</span>
              <h1 class="brand-title">{{ isEdit ? 'Editar Instructor' : 'Nuevo Instructor' }}</h1>
            </div>
            <span v-if="isEdit" class="pill pill-slate border mt-3">ID: {{ idParam }}</span>
            <span v-if="isEdit" :class="['pill', form.instructor_active ? 'pill-teal' : 'pill-red', 'border', 'mt-3']">
              {{ form.instructor_active ? 'ACTIVO' : 'INACTIVO' }}
            </span>
          </div>
        </div>

        <div class="masthead-actions">
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelar">
            <i class="fa-solid fa-arrow-left"></i> Cancelar
          </button>
          <button
            type="button"
            class="btn-exec btn-exec-primary px-4"
            @click="guardar"
            :disabled="saving || isUploadingAny || !isValid"
          >
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar Datos' : 'Registrar Instructor') }}
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body pb-5 d-flex justify-content-center" v-if="loaded">
      <div class="exec-form-wrapper w-100" style="max-width: 1100px;">

        <!-- ═══════════════════════════════════════
             SECCIÓN 1: DATOS PERSONALES
        ════════════════════════════════════════ -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title">
            <i class="fa-solid fa-user me-2 text-primary"></i> Datos Personales
          </h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="exec-label">Nombre <span class="c-red">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.first_name" type="text" class="exec-input-light w-100" required placeholder="NOMBRES" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Apellido paterno <span class="c-red">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.last_name" type="text" class="exec-input-light w-100" required placeholder="APELLIDO PATERNO" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Apellido materno</label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.mother_last_name" type="text" class="exec-input-light w-100" placeholder="APELLIDO MATERNO" />
            </div>

            <div class="col-md-4">
              <label class="exec-label">Tipo de documento <span class="c-red">*</span></label>
              <SearchSelect
                v-model="form.cat_type_document"
                :items="catalogs.documentTypeList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                class="exec-select-light w-100"
                required
              />
            </div>
            <div class="col-md-4">
              <label class="exec-label">N° documento <span class="c-red">*</span></label>
              <input v-model.trim="form.document_number" type="text" class="exec-input-light w-100 text-mono" v-restrict="{ only: 'numbers' }" required placeholder="NÚMERO" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Fecha de nacimiento</label>
              <input v-model="form.birthday" type="date" class="exec-input-light w-100" />
            </div>

            <div class="col-md-4">
              <label class="exec-label">País</label>
              <SearchSelect
                v-model="form.cat_country"
                :items="catalogs.countryList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar país..."
                class="exec-select-light w-100"
              />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Correo <span class="c-red">*</span></label>
              <input v-model.trim="form.email" type="email" class="exec-input-light w-100" placeholder="correo@ejemplo.com" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Teléfono</label>
              <input v-model.trim="form.phone" type="text" class="exec-input-light w-100 text-mono" placeholder="Ej. +51 999 999 999" />
            </div>

            <div class="col-md-12 border-top mt-4 pt-3 d-flex align-items-center gap-3">
              <label class="exec-label mb-0">Estado del Instructor</label>
              <label class="exec-switch exec-switch-lg">
                <input type="checkbox" v-model="form.instructor_active" />
                <span></span>
              </label>
              <span class="x-small text-muted fw-600">
                {{ form.instructor_active ? 'ACTIVO EN EL SISTEMA' : 'INACTIVO' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════
             SECCIÓN 2: INFORMACIÓN PROFESIONAL
             Visible siempre (linkedin + notas van a Odoo al registrar)
        ════════════════════════════════════════ -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title">
            <i class="fa-solid fa-briefcase me-2 text-info"></i> Información Profesional
          </h6>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="exec-label">Puesto Relevante</label>
              <input v-model.trim="form.relevant_work" type="text" class="exec-input-light w-100" placeholder="Ej. Gerente de TI" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">Empresa Relevante</label>
              <input v-model.trim="form.relevant_company" type="text" class="exec-input-light w-100" placeholder="Ej. Microsoft" />
            </div>
            <div class="col-md-4">
              <label class="exec-label">LinkedIn</label>
              <div class="input-group-custom">
                <i class="fa-brands fa-linkedin input-icon text-primary"></i>
                <input v-model.trim="form.linkedin" type="url" class="exec-input-light w-100 icon-padded" placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div class="col-md-12">
              <label class="exec-label">Resumen de Perfil / Notas internas</label>
              <textarea v-model="form.profile_resume" class="exec-textarea w-100" rows="3" placeholder="Breve resumen profesional..."></textarea>
            </div>
          </div>

          <!-- CV solo en edición -->
          <div class="row g-4 mt-1 border-top pt-3" v-if="isEdit">
            <div class="col-md-6">
              <label class="exec-label mb-2">Curriculum Simplificado (CV)</label>
              <FileUploader
                label="Clic para subir CV Simplificado"
                v-model="form.cv_url"
                accept=".pdf,.doc,.docx"
              />
            </div>
            <div class="col-md-6">
              <label class="exec-label mb-2">Curriculum Documentado</label>
              <FileUploader
                label="Clic para subir CV Documentado"
                v-model="form.cv_documents_url"
                accept=".pdf,.doc,.docx"
              />
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════
             SECCIÓN 3: PROGRAMAS Y FINANCIEROS
             Solo en edición
        ════════════════════════════════════════ -->
        <div class="row g-4" v-if="isEdit">
          <div class="col-lg-6">
            <div class="exec-fieldset h-100 mb-0">
              <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <h6 class="fieldset-title mb-0 border-0 pb-0">
                  <i class="fa-solid fa-chalkboard-user me-2" style="color: var(--teal-600);"></i> Programas Personalización
                </h6>
                <button type="button" class="btn-exec btn-exec-outline text-primary border-primary btn-sm" @click="addProgramItem">
                  <i class="fa-solid fa-plus me-1"></i> Asignar Programa
                </button>
              </div>

              <div v-if="form.programs.length === 0" class="empty-state">
                <p class="mb-0">No tiene programas personalizados asignados.</p>
              </div>

              <div v-for="(prog, index) in form.programs" :key="'prog-'+index" class="exec-version-card mb-3">
                <div class="version-body p-3 row g-2">
                  <div class="col-md-12">
                    <label class="exec-label text-muted">Programa Asignado</label>
                    <SearchSelect
                      v-model="prog.program_id"
                      mode="remote"
                      :fetcher="q => programService.programCaller({ q })"
                      label-field="description"
                      value-field="id"
                      sublabel-field="label_ui"
                      placeholder="Buscar programa..."
                      :cache="false"
                      :view-open="6"
                      :model-label="prog.program_name"
                      class="exec-select-light w-100"
                    />
                  </div>
                  <div class="col-md-12 mt-2">
                    <label class="exec-label text-muted">Perfil Específico</label>
                    <textarea class="exec-textarea w-100" rows="2" v-model.trim="prog.profile_summary" placeholder="Expertise en este programa..."></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="exec-fieldset h-100 mb-0">
              <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <h6 class="fieldset-title mb-0 border-0 pb-0">
                  <i class="fa-solid fa-wallet me-2" style="color: var(--amber-500);"></i> Información Financiera
                </h6>
                <button type="button" class="btn-exec btn-exec-outline text-primary border-primary btn-sm" @click="addFinancialItem">
                  <i class="fa-solid fa-plus me-1"></i> Agregar Cuenta
                </button>
              </div>

              <div v-if="form.financials.length === 0" class="empty-state">
                <p class="mb-0">No hay cuentas financieras registradas.</p>
              </div>

              <div v-for="(item, index) in form.financials" :key="'fin-'+index" class="exec-version-card mb-3 bg-slate-50">
                <div class="version-body p-3 row g-3">
                  <div class="col-md-6">
                    <label class="exec-label">Banco (Nombre)</label>
                    <input v-model="item.bank_name" type="text" class="exec-input-light w-100 bg-white" placeholder="Ej. BCP, Interbank..." />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Tipo de Pago</label>
                    <SearchSelect
                      :disabled="!!item.instructor_financial_id"
                      v-model="item.cat_payment_type"
                      :items="catalogs.paymentTypeList"
                      label-field="description"
                      value-field="id"
                      placeholder="Seleccionar..."
                      class="exec-select-light w-100 bg-white"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Tipo Tarifa</label>
                    <SearchSelect
                      :disabled="!!item.instructor_financial_id"
                      v-model="item.cat_rate_pay_id"
                      :items="catalogs.ratePayList"
                      label-field="description"
                      value-field="id"
                      placeholder="Seleccionar..."
                      class="exec-select-light w-100 bg-white"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Moneda</label>
                    <SearchSelect
                      :disabled="!!item.instructor_financial_id"
                      v-model="item.cat_currency"
                      :items="catalogs.currencyList"
                      label-field="description"
                      value-field="id"
                      placeholder="Seleccionar..."
                      class="exec-select-light w-100 bg-white"
                    />
                  </div>
                  <div class="col-md-12">
                    <label class="exec-label">Observaciones</label>
                    <textarea class="exec-textarea w-100 bg-white" rows="2" v-model.trim="item.observations" placeholder="Cta, CCI, etc."></textarea>
                  </div>
                  <div class="col-md-12 mt-2 pt-2 border-top">
                    <label class="exec-label mb-2">Constancias / Adjuntos</label>
                    <MultiFileUploader v-model="item.attachments" label="Agregar Constancia" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>

    <main class="exec-body pb-5 d-flex justify-content-center align-items-center" v-else style="min-height: 50vh;">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin fa-2x text-slate-400 mb-3"></i>
        <p class="text-muted fw-600">Cargando información del instructor...</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
:root {
  --navy-900: #0f172a; --navy-800: #1e293b; --navy-700: #334155;
  --slate-400: #94a3b8; --slate-300: #cbd5e1; --slate-100: #f1f5f9; --slate-50: #f8fafc;
  --teal-600: #002060; --teal-500: #002060; /* navy WE */
  --blue-600: #2563eb;
  --amber-500: #f59e0b;
  --red-600: #dc2626;
  --white: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
}

.exec-shell {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary, #0f172a);
}

/* ── Masthead ── */
.exec-masthead { background: var(--navy-900, #0f172a); color: var(--white, #fff); border-bottom: 1px solid var(--navy-700, #334155); position: sticky; top: 0; z-index: 100; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #12274e); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white, #fff); }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

/* ── Layout ── */
.exec-body { padding: 32px 28px; }
.exec-form-wrapper { background: var(--white, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }

/* ── Fieldsets ── */
.exec-fieldset { background: var(--white, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 20px 24px; margin-bottom: 24px; }
.fieldset-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 10px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
.c-red { color: var(--red-600, #dc2626); font-weight: 600; margin-left: .15rem; }

/* ── Inputs ── */
.exec-input-light,
.exec-select-light {
  background: var(--white, #fff);
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
  border-color: var(--teal-500, #12274e);
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1);
}
.exec-input-light:disabled,
.exec-select-light:disabled {
  background-color: var(--slate-50, #f8fafc);
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

/* ── Input con ícono ── */
.input-group-custom { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 12px; color: var(--slate-400, #94a3b8); font-size: 13px; }
.icon-padded { padding-left: 32px; }

/* ── Textarea ── */
.exec-textarea {
  background: var(--white, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  resize: vertical;
  transition: all 0.15s;
}
.exec-textarea:focus {
  outline: none;
  border-color: var(--teal-500, #12274e);
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1);
}

/* ── Listas dinámicas ── */
.exec-version-card { border: 1px solid var(--border, #e2e8f0); border-radius: 6px; background: var(--white, #fff); overflow: hidden; transition: box-shadow 0.2s; }
.exec-version-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
.empty-state { text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-style: italic; padding: 20px; background: var(--slate-50, #f8fafc); border-radius: 6px; border: 1px dashed var(--slate-300, #cbd5e1); }
</style>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

import SearchSelect from '@/components/SearchSelect.vue'
import FileUploader from '@/components/FileUploader.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'

import { ServiceKeys } from '@/services'

/* ── DI & Utils ── */
const toast              = useToast()
const router             = useRouter()
const route              = useRoute()
const instructorService  = inject(ServiceKeys.Instructor)
const integrationService = inject(ServiceKeys.Integration)
const programService     = inject(ServiceKeys.Program)
const catalog            = inject('catalog')

/* ── Estado de ruta ── */
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit  = computed(() => !!idParam.value)
const loaded  = ref(false)
const saving  = ref(false)

const uploading = reactive({ financials: {} })

const isUploadingAny = computed(() =>
  uploading.cv ||
  uploading.cv_doc ||
  Object.values(uploading.financials).some(v => v)
)

/* ── Formulario ── */
const form = reactive({
  person_id:         null,
  first_name:        null,
  last_name:         null,
  mother_last_name:  null,
  document_number:   null,
  cat_type_document: null,
  cat_occupation:    null,
  cat_person_status: null,
  cat_country:       null,
  birthday:          null,
  email:             null,   // requerido para crear usuario Odoo
  phone:             null,
  person_active:     true,
  instructor_active: true,
  profile_resume:    null,   // notas internas → Odoo comment
  resume:            null,
  relevant_company:  null,
  relevant_work:     null,
  profile_summary:   null,
  linkedin:          null,   // → Odoo social_linkedin
  cv_url:            null,
  cv_documents_url:  null,
  financials:        [],
  programs:          []
})

/* ── Catálogos ── */
const catalogs = ref({
  documentTypeList: catalog.options('we_type_document') || [],
  countryList:      catalog.options('we_country')       || [],
  paymentTypeList:  catalog.options('we_way_billing')   || [],
  programList:      catalog.options('we_educational_program') || [],
  ratePayList:      catalog.options('we_rate')          || [],
  currencyList: catalog.options('we_currency', {
    mapItem: x => ({
      id:          x.id,
      description: `${x.code || x.abbreviation} (${x.symbol || x.prefix})`,
      raw:         { ...x }
    })
  }) || []
})

/* ── Validación ── */
const isValid = computed(() =>
  !!form.first_name        &&
  !!form.last_name         &&
  !!form.document_number   &&
  !!form.cat_type_document &&
  !!form.email
)

/* ── Gestión de listas dinámicas ── */
function addFinancialItem () {
  form.financials.push({
    instructor_financial_id: null,
    attachments:     [],
    bank_name:       '',
    cat_payment_type: null,
    cat_rate_pay_id:  null,
    cat_currency:    null,
    observations:    ''
  })
  uploading.financials[form.financials.length - 1] = false
}

function addProgramItem () {
  form.programs.push({
    instructor_program_id: null,
    program_id:            null,
    program_name:          null,
    profile_summary:       '',
    active:                true
  })
}

/* ── Carga de datos (edición) ── */
async function loadData (id) {
  try {
    const data = await instructorService.instructorGet({ id })
    if (!data) throw new Error('No se encontraron datos')

    Object.assign(form, {
      person_id:         data.person_id         ?? null,
      first_name:        data.first_name        ?? '',
      last_name:         data.last_name         ?? '',
      mother_last_name:  data.mother_last_name  ?? '',
      document_number:   data.document_number   ?? '',
      cat_type_document: data.cat_type_document ?? null,
      cat_country:       data.cat_country       ?? null,
      birthday:          data.birthday ? String(data.birthday).substring(0, 10) : null,
      email:             data.email             ?? null,
      phone:             data.phone             ?? null,
      person_active:     data.person_active     !== 'N',
      instructor_active: data.instructor_active !== 'N',
      profile_resume:    data.profile_resume    ?? null,
      resume:            data.resume            ?? null,
      relevant_company:  data.relevant_company  ?? null,
      relevant_work:     data.relevant_work     ?? null,
      profile_summary:   data.profile_summary   ?? null,
      linkedin:          data.linkedin          ?? null,
      cv_url:            data.cv_url            || null,
      cv_documents_url:  data.cv_documents_url  || null
    })

    if (Array.isArray(data.financials)) {
      form.financials = data.financials.map(f => ({
        instructor_financial_id: f.instructor_financial_id,
        attachments:     Array.isArray(f.attachments) ? f.attachments : [],
        bank_name:       f.bank_name       || '',
        cat_payment_type: f.cat_payment_type,
        cat_rate_pay_id:  f.cat_rate_pay_id,
        observations:    f.observations,
        cat_currency:    f.cat_currency
      }))
    }

    if (Array.isArray(data.programs)) {
      form.programs = data.programs.map(p => ({
        instructor_program_id: p.instructor_program_id,
        program_id:            p.program_id,
        program_name:          p.program_name,
        profile_summary:       p.profile_summary,
        active:                p.active === 'Y'
      }))
    }

  } catch (error) {
    console.error(error)
    toast.error('Error cargando instructor')
    router.push({ name: 'Instructor' })
  }
}

/* ── Payload ── */
function buildPayload () {
  const payload = {
    instructor: {
      person_id:           form.person_id         ?? null,
      first_name:          form.first_name?.trim(),
      last_name:           form.last_name?.trim(),
      mother_last_name:    form.mother_last_name?.trim(),
      document_number:     form.document_number?.trim(),
      cat_type_document:   form.cat_type_document,
      cat_country:         form.cat_country,
      birthday:            form.birthday           || null,
      person_active:       form.person_active      ? 'Y' : 'N',
      instructor_active:   form.instructor_active  ? 'Y' : 'N',
      email:               form.email              ?? null,
      phone:               form.phone              ?? null,
      linkedin:            form.linkedin           ?? null,
      relevant_company:    form.relevant_company   ?? null,
      relevant_work:       form.relevant_work      ?? null,
      profile_resume:      form.profile_resume     ?? null,
      cv_url:              form.cv_url             ?? null,
      cv_documents_url:    form.cv_documents_url   ?? null,
      financials: form.financials.map(f => ({
        instructor_financial_id: f.instructor_financial_id || null,
        attachments:             f.attachments             || [],
        bank_name:               f.bank_name,
        cat_payment_type:        f.cat_payment_type,
        cat_rate_pay_id:         f.cat_rate_pay_id,
        observations:            f.observations,
        cat_currency:            f.cat_currency
      })),
      programs: form.programs.map(p => ({
        instructor_program_id: p.instructor_program_id || null,
        program_id:            p.program_id,
        profile_summary:       p.profile_summary,
        active:                p.active ? 'Y' : 'N'
      }))
    }
  }

  if (isEdit.value) payload.id = idParam.value
  return payload
}

/* ── Guardar ── */
async function guardar () {
  if (!isValid.value) {
    toast.warning('Complete los campos obligatorios (*)')
    return
  }

  saving.value = true
  try {
    const payload  = buildPayload()
    const response = isEdit.value
      ? await instructorService.instructorUpdate(payload)
      : await instructorService.instructorRegister(payload)

    if (response) {
      toast.success(isEdit.value ? 'Actualizado correctamente' : 'Registrado correctamente')
      router.push({ name: 'Instructor' })
    }
  } catch (e) {
    console.error(e)
    toast.error('Error al guardar: ' + (e.response?.data?.message || e.message || 'Error desconocido'))
  } finally {
    saving.value = false
  }
}

function cancelar () { router.back() }

/* ── Lifecycle ── */
onMounted(async () => {
  if (isEdit.value) {
    await loadData(idParam.value)
  } else {
    form.cat_country = catalogs.value.countryList.find(c => c.description?.includes('PERU'))?.id || null
  }
  loaded.value = true
})
</script>