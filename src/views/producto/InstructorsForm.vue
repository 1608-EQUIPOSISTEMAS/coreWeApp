<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">
      
      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">
            {{ isEdit ? 'Editar Instructor' : 'Nuevo Instructor' }}
          </div>
          <div class="text-muted small" v-if="isEdit">
            ID: <span class="fw-bold">{{ idParam }}</span>
          </div>
        </div>
        
        <div v-if="isEdit" class="d-flex align-items-center gap-2">
            <span :class="['badge', form.instructor_active ? 'bg-success' : 'bg-danger']">
                {{ form.instructor_active ? 'ACTIVO' : 'INACTIVO' }}
            </span>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">
        
        <section class="form-section mb-5">
          <div class="form-section__header">
            <span class="form-section__title">Datos personales</span>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-md-4">
              <label class="form-label mb-1">Nombres <span class="required-star">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.first_name" type="text" class="form-control" required placeholder="NOMBRES" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Apellido paterno <span class="required-star">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.last_name" type="text" class="form-control" required placeholder="APELLIDO PATERNO" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Apellido materno</label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.mother_last_name" type="text" class="form-control" placeholder="APELLIDO MATERNO" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Tipo de documento <span class="required-star">*</span></label>
              <SearchSelect v-model="form.cat_type_document" :items="catalogs.documentTypeList" label-field="description" value-field="id" placeholder="SELECCIONAR..." required />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">N° documento <span class="required-star">*</span></label>
              <input v-model.trim="form.document_number" type="text" class="form-control mono" v-restrict="{ only: 'numbers' }" required placeholder="NÚMERO" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Fecha de nacimiento</label>
              <input v-model="form.birthday" type="date" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">País</label>
              <SearchSelect v-model="form.cat_country" :items="catalogs.countryList" label-field="description" value-field="id" placeholder="PAÍS..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1 d-block">Activo</label>
              <label class="form-switch">
                  <input type="checkbox" v-model="form.instructor_active" />
                <span></span>
              </label>
            </div>
          </div>
        </section>

        <section class="form-section mb-5" v-if="isEdit">
            <div class="form-section__header">
              <span class="form-section__title">Información Profesional</span>
            </div>
            <div class="row g-3 form-section__body">
              <div class="col-md-4">
                <label class="form-label mb-1">Puesto Relevante</label>
                <input v-model="form.relevant_work" type="text" class="form-control" placeholder="Ej. Gerente de TI" />
              </div>

              <div class="col-md-4">
                <label class="form-label mb-1">Empresa Relevante</label>
                <input v-model="form.relevant_company" type="text" class="form-control" placeholder="Ej. Microsoft" />
              </div>
              
              <div class="col-md-4">
                <label class="form-label mb-1">LinkedIn</label>
                <input v-model="form.linkedin" type="text" class="form-control" placeholder="URL Perfil" />
              </div>
                
              
            </div>
            
            <div class="row g-4 mt-1">
                <div class="col-md-6">
                    <label class="form-label fw-bold mb-2">Curriculum Simplificado (CV)</label>
                    <FileUploader 
                        label="Clic para subir CV Simplificado"
                        :current-url="form.cv_url"
                        :loading="uploading.cv"
                        accept=".pdf,.doc,.docx"
                        @upload="(file) => handleCvUpload(file, 'cv')"
                        @view="verArchivo(form.cv_url)"
                    />
                </div>
                
                <div class="col-md-6">
                    <label class="form-label fw-bold mb-2">Curriculum Documentado</label>
                    <FileUploader 
                        label="Clic para subir CV Documentado"
                        :current-url="form.cv_documents_url"
                        :loading="uploading.cv_doc"
                        accept=".pdf,.doc,.docx"
                        @upload="(file) => handleCvUpload(file, 'cv_doc')"
                        @view="verArchivo(form.cv_documents_url)"
                    />
                </div>
            </div>
        </section>

        <section class="form-section mb-4" v-if="isEdit">
            <div class="form-section__header d-flex justify-content-between align-items-center w-100 pe-3">
              <span class="form-section__title">Programas Autorizados</span>
              <button class="btn btn-sm btn-outline-primary" @click="addProgramItem">
                <i class="fas fa-plus"></i> Asignar Programa
              </button>
            </div>

            <div v-if="form.programs.length === 0" class="alert alert-light text-center border py-2">
                <small>No tiene programas asignados.</small>
            </div>

            <div v-for="(prog, index) in form.programs" :key="'prog-'+index" class="card mb-2 bg-white border shadow-sm">
                <div class="card-body py-2 row align-items-center g-2">
                    <div class="col-md-4">
                        <label class="small text-muted d-block mb-0">Programa</label>
                        <SearchSelect
                          v-model="prog.program_id"
                          mode="remote"
                          :fetcher="q => programService.programCaller({ q })"
                          label-field="description"
                          value-field="id"
                          sublabel-field="label_ui"
                          placeholder="Buscar programa..."
                          :cache="false"
                          view-open="6"
                          :model-label="prog.name" 
                      />
                      
                    </div>
                    <div class="col-md-8">
                         <label class="small text-muted d-block mb-0">Perfil Específico</label>
                         
                        <textarea class="form-control" rows="2" v-model.trim="prog.profile_summary" placeholder="Expertise en este programa..."></textarea>
                    </div>
                </div>
            </div>
        </section>

        <section class="form-section mb-4" v-if="isEdit">
            <div class="form-section__header d-flex justify-content-between align-items-center w-100 pe-3">
              <span class="form-section__title">Información Financiera</span>
              <button class="btn btn-sm btn-outline-primary" @click="addFinancialItem">
                <i class="fas fa-plus"></i> Agregar Cuenta
              </button>
            </div>

            <div v-if="form.financials.length === 0" class="alert alert-light text-center border">
                No hay cuentas financieras registradas.
            </div>

            <div v-for="(item, index) in form.financials" :key="index" class="card mb-3 bg-light border">
                <div class="card-body position-relative">
                    
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label small mb-1">Banco (Nombre)</label>
                            <input v-model="item.bank_name" type="text" class="form-control" placeholder="Ej. BCP, Interbank..." />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small mb-1">Tipo de Pago</label>
                            <SearchSelect :disabled="!!item.instructor_financial_id" v-model="item.cat_payment_type" :items="catalogs.paymentTypeList" label-field="description" value-field="id" placeholder="Tipo..." />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small mb-1">Tipo Tarifa</label>
                            <SearchSelect :disabled="!!item.instructor_financial_id" v-model="item.cat_rate_pay_id" :items="catalogs.ratePayList" label-field="description" value-field="id" placeholder="Tarifa..." />
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small mb-1">Moneda</label>
                            <SearchSelect :disabled="!!item.instructor_financial_id" v-model="item.cat_currency" :items="catalogs.currencyList" label-field="description" value-field="id" placeholder="Moneda..." />
                        </div>
                        <div class="col-md-12">
                            <label class="form-label small mb-1">Observaciones</label>
                            <textarea class="form-control" rows="2" v-model.trim="item.observations" placeholder="Cta, CCI, etc."></textarea>
                        </div>
                        
                        <div class="col-md-12 mt-2">
                             <label class="form-label small mb-1 fw-bold">Constancias / Adjuntos</label>
                             <MultiFileUploader 
                                v-model="item.attachments"
                                label="Agregar Constancia"
                                hint="PDF o Imagen"
                                :loading="uploading.financials[index]"
                                @upload-file="(file) => handleFinancialUpload(file, index)"
                             />
                        </div>
                    </div>
                </div>
            </div>
        </section>

      </div>
      
      <div class="card-body py-5 text-center" v-else>
         <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
         <p class="text-muted mt-2">Cargando información...</p>
      </div>

      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" @click="guardar" :disabled="saving || isUploadingAny">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Datos' : 'Registrar Instructor') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

import SearchSelect from '@/components/SearchSelect.vue'
import FileUploader from '@/components/FileUploader.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'

import { ServiceKeys } from '@/services'

/* ======================
 * DI & Utils
 * ====================== */
const toast = useToast()
const router = useRouter()
const route = useRoute()
const instructorService = inject(ServiceKeys.Instructor)
const integrationService = inject(ServiceKeys.Integration)
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

/* ======================
 * Estado
 * ====================== */
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!idParam.value)
const loaded = ref(false)
const saving = ref(false)

const uploading = reactive({
    cv: false,
    cv_doc: false,
    financials: {}
})

const isUploadingAny = computed(() => 
    uploading.cv || 
    uploading.cv_doc || 
    Object.values(uploading.financials).some(v => v)
)

// Formulario Principal
const form = reactive({
  person_id: null,        
  first_name: null,
  last_name: null,
  mother_last_name: null,
  document_number: null,
  cat_type_document: null,
  cat_occupation: null,
  cat_person_status: null,
  cat_country: null,
  birthday: null,
  person_active: true,    
  instructor_active: true,
  
  // Nuevos campos de texto
  resume: null,            
  relevant_company: null,  
  relevant_work: null,     
  profile_summary: null,
  linkedin: null,

  // Archivos CV
  cv_url: null, 
  cv_documents_url: null,

  // Listas
  financials: [],
  programs: []             // <--- Nueva lista
})

// Catálogos
const catalogs = ref({
  documentTypeList: catalog.options('we_type_document') || [],
  countryList: catalog.options('we_country') || [],
  paymentTypeList: catalog.options('we_way_billing') || [],
  
  // Asume que tienes este catálogo o ajusta el key
  programList: catalog.options('we_educational_program') || [], 
  // Asume que tienes este catálogo para tarifas
  ratePayList: catalog.options('we_rate') || [], 
  
  currencyList: ref(
  catalog.options('we_currency', {
    mapItem: x => ({
      id: x.id,
      description: `${x.code || x.abbreviation} (${x.symbol || x.prefix})`,
      raw: { ...x } 
    })
  })
) || [] 
})

const isValid = computed(() => 
    !!form.first_name && 
    !!form.last_name && 
    !!form.document_number && 
    !!form.cat_type_document
)

/* ======================
 * Métodos: Uploads
 * ====================== */
async function handleCvUpload(file, type) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { 
        toast.warning('El archivo es muy pesado (>20MB)')
        return
    }

    if (type === 'cv') uploading.cv = true
    else if (type === 'cv_doc') uploading.cv_doc = true

    try {
        const res = await integrationService.uploadFile(file)
        const data = res 

        if (type === 'cv') {
            form.cv_url = data.url
            toast.success('CV Simplificado cargado')
        } else {
            form.cv_documents_url = data.url
            toast.success('CV Documentado cargado')
        }

    } catch (error) {
        console.error(error)
        toast.error('Error al subir el CV')
    } finally {
        if (type === 'cv') uploading.cv = false
        else uploading.cv_doc = false
    }
}

async function handleFinancialUpload(file, index) {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { 
        toast.warning('> 20MB')
        return
    }
    uploading.financials[index] = true
    try {
        const res = await integrationService.uploadFile(file)
        if(!form.financials[index].attachments) {
            form.financials[index].attachments = []
        }
        form.financials[index].attachments.push(res.url)
        toast.success('Sustento agregado')
    } catch (error) {
        console.error(error)
        toast.error('Error al subir sustento')
    } finally {
        uploading.financials[index] = false
    }
}

function verArchivo(url) {
    if(url) window.open(url, '_blank')
}

/* ======================
 * Métodos: Gestión Listas
 * ====================== */
function addFinancialItem() {
    form.financials.push({
        instructor_financial_id: null,
        attachments: [], 
        bank_name: '', // <--- Ahora es texto string vacío
        cat_payment_type: null,
        cat_rate_pay_id: null, // <--- Nuevo campo
        cat_currency: null,
        observations: ''
    })
    const idx = form.financials.length - 1
    uploading.financials[idx] = false
}

function addProgramItem() {
    form.programs.push({
        instructor_program_id: null,
        program_id: null,
        profile_summary: '',
        active: true
    })
}

/* ======================
 * Carga y Guardado
 * ====================== */
async function loadData(id) {
  try {
    const data = await instructorService.instructorGet({ id })
    if (!data) throw new Error('No se encontraron datos')

    Object.assign(form, {
        person_id: data.person_id ?? null,
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        mother_last_name: data.mother_last_name ?? '',
        document_number: data.document_number ?? '',
        cat_type_document: data.cat_type_document ?? null,
        cat_country: data.cat_country ?? null,
        birthday: data.birthday ? String(data.birthday).substring(0, 10) : null,
        person_active: data.person_active !== 'N',
        instructor_active: data.instructor_active !== 'N',
        
        // Mapeo de nuevos campos de texto
        resume: data.resume ?? null,
        relevant_company: data.relevant_company ?? null,
        relevant_work: data.relevant_work ?? null,
        profile_summary: data.profile_summary ?? null,
        linkedin: data.linkedin ?? null,
        
        cv_url: data.cv_url || null,
        cv_documents_url: data.cv_documents_url || null
    })

    // Mapeo Financieros
    if (Array.isArray(data.financials)) {
        form.financials = data.financials.map(f => ({
            instructor_financial_id: f.instructor_financial_id,
            attachments: Array.isArray(f.attachments) ? f.attachments : [], 
            bank_name: f.bank_name || '', 
            cat_payment_type: f.cat_payment_type,
            cat_rate_pay_id: f.cat_rate_pay_id, // <---
            observations: f.observations,
            cat_currency: f.cat_currency
        }))
    }

    // Mapeo Programas (Nuevo)
    if (Array.isArray(data.programs)) {
        form.programs = data.programs.map(p => ({
            instructor_program_id: p.instructor_program_id,
            program_id: p.program_id,
            profile_summary: p.profile_summary,
            active: p.active === 'Y'
        }))
    }
    
  } catch (error) {
    console.error(error)
    toast.error('Error cargando instructor')
    router.push({ name: 'Instructor' })
  }
}

function buildPayload() {
  const payload = {
    instructor: {
        // Datos Personales
        person_id: form.person_id ?? null,
        first_name: form.first_name?.trim(),
        last_name: form.last_name?.trim(),
        mother_last_name: form.mother_last_name?.trim(),
        document_number: form.document_number?.trim(),
        cat_type_document: form.cat_type_document,
        cat_country: form.cat_country,
        birthday: form.birthday || null,
        person_active: form.person_active ? 'Y' : 'N',
        
        // Datos Instructor
        instructor_active: form.instructor_active ? 'Y' : 'N',       
        relevant_company: form.relevant_company, 
        relevant_work: form.relevant_work,       
        linkedin: form.linkedin,
        cv_url: form.cv_url, 
        cv_documents_url: form.cv_documents_url,
        
        // Array Financieros
        financials: form.financials.map(f => ({
            instructor_financial_id: f.instructor_financial_id || null,
            attachments: f.attachments || [],
            bank_name: f.bank_name, 
            cat_payment_type: f.cat_payment_type,
            cat_rate_pay_id: f.cat_rate_pay_id, // <--- Enviamos ID de tarifa, NO hourly_rate
            observations: f.observations,
            cat_currency: f.cat_currency
        })),

        // Array Programas
        programs: form.programs.map(p => ({
            instructor_program_id: p.instructor_program_id || null,
            program_id: p.program_id,
            profile_summary: p.profile_summary,
            active: p.active ? 'Y' : 'N'
        }))
    }
  }

  if (isEdit.value) payload.id = idParam.value
  return payload
}

async function guardar() {
  if (!isValid.value) {
    toast.warning('Complete los campos obligatorios (*)')
    return
  }
  
  saving.value = true
  try {
    const payload = buildPayload()
    let response
    
    if (isEdit.value) response = await instructorService.instructorUpdate(payload)
    else response = await instructorService.instructorRegister(payload)

    if (response) {
        toast.success(isEdit.value ? 'Actualizado correctamente' : 'Registrado correctamente')
        router.push({ name: 'Instructor' })
    }
  } catch (e) {
    console.error(e)
    const msg = e.response?.data?.message || e.message || 'Error desconocido'
    toast.error('Error al guardar: ' + msg)
  } finally {
    saving.value = false
  }
}

function cancelar() {
  router.back()
}

onMounted(async () => {
  if (isEdit.value) await loadData(idParam.value)
  else {
      form.cat_country = catalogs.value.countryList.find(c => c.description?.includes('PERU'))?.id || null
  }
  loaded.value = true
})
</script>

<style scoped>
    .form-control:required:invalid:not(:disabled):not([readonly]),
    .form-select:required:invalid:not(:disabled):not([readonly]) {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 .2rem rgba(239,68,68,.15);
    }
    
    .lead-form { font-size: 0.95rem; color: #111827; }
    .card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
    
    .form-switch { position: relative; width: 42px; height: 24px; display: inline-block; margin-bottom: 0; }
    .form-switch input { display: none; }
    .form-switch span {
      position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s;
      cursor: pointer;
    }
    .form-switch span::after {
      content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%;
      position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
    }
    .form-switch input:checked + span { background: #3b82f6; }
    .form-switch input:checked + span::after { left: 21px; }

    .required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }
    
    .form-section__header {
        display: flex; align-items: center; margin-bottom: 1rem; position: relative; padding-left: .75rem;
    }
    .form-section__header::before {
        content: ""; position: absolute; left: 0; top: .15rem; bottom: .15rem; width: 3px; border-radius: 2px; background-color: #3b82f6;
    }
    .form-section__title {
        font-size: .8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: .03em;
    }
</style>