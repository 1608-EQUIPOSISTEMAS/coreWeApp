<template>
  <div class="container-fluid px-3 py-3 customer-form">
    <div class="card shadow-sm border-0">
      <div
        class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start"
      >
        <div class="pe-3">
          <div class="h3">
            {{ isEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}
          </div>
          <div class="text-muted small" v-if="isEdit">
            ID: <span class="fw-bold">{{ idParam }}</span>
          </div>
        </div>
        
        <div v-if="isEdit" class="d-flex align-items-center gap-2">
            <span :class="['badge', form.active ? 'bg-success' : 'bg-danger']">
                {{ form.active ? 'ACTIVO' : 'INACTIVO' }}
            </span>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">
        
        <div class="type-selector mb-4">
            <div class="btn-group w-100" role="group">
                <input 
                    type="radio" class="btn-check" name="customerType" id="typePerson" 
                    autocomplete="off" :checked="!isCompany" @change="setCompany(false)"
                    :disabled="isEdit"
                >
                <label class="btn btn-outline-primary" for="typePerson">
                    <i class="fa-solid fa-user me-2"></i>Persona Natural
                </label>

                <input 
                    type="radio" class="btn-check" name="customerType" id="typeCompany" 
                    autocomplete="off" :checked="isCompany" @change="setCompany(true)"
                    :disabled="isEdit"
                >
                <label class="btn btn-outline-primary" for="typeCompany">
                    <i class="fa-solid fa-building me-2"></i>Empresa
                </label>
            </div>
        </div>

        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">
                Datos de {{ isCompany ? 'la Empresa' : 'la Persona' }}
            </span>
          </div>

          <div class="row g-3 form-section__body">
            
            <template v-if="!isCompany">
                <div class="col-md-4">
                    <label class="form-label mb-1">Nombres <span class="required-star">*</span></label>
                    <input autocomplete="off" v-restrict="{ transform: 'upper' }" v-model.trim="form.first_name" type="text" class="form-control" placeholder="NOMBRES"/>
                </div>
                <div class="col-md-4">
                    <label class="form-label mb-1">Apellido Paterno <span class="required-star">*</span></label>
                    <input autocomplete="off" v-restrict="{ transform: 'upper' }" v-model.trim="form.last_name" type="text" class="form-control" placeholder="A. PATERNO" />
                </div>
                <div class="col-md-4">
                    <label class="form-label mb-1">Apellido Materno</label>
                    <input autocomplete="off" v-restrict="{ transform: 'upper' }" v-model.trim="form.mother_last_name" type="text" class="form-control" placeholder="A. MATERNO" />
                </div>
                <div class="col-md-4">
                    <label class="form-label mb-1">Tipo Documento <span class="required-star">*</span></label>
                    <SearchSelect v-model="form.cat_type_document" :items="catalogs.documentTypeList" label-field="description" value-field="id" placeholder="SELECCIONAR..." />
                </div>
            </template>

            <template v-else>
                <div class="col-md-6">
                    <label class="form-label mb-1">Razón Social <span class="required-star">*</span></label>
                    <input autocomplete="off" v-restrict="{ transform: 'upper' }" v-model.trim="form.razon_social" type="text" class="form-control" placeholder="RAZÓN SOCIAL" />
                </div>
                <div class="col-md-6">
                    <label class="form-label mb-1">Razón Comercial</label>
                    <input autocomplete="off" v-restrict="{ transform: 'upper' }" v-model.trim="form.razon_comercial" type="text" class="form-control" placeholder="NOMBRE COMERCIAL" />
                </div>
                <div class="col-md-4">
                    <label class="form-label mb-1">Tipo Documento</label>
                    <SearchSelect v-model="form.cat_type_document" :items="catalogs.documentTypeList" label-field="description" value-field="id" placeholder="SELECCIONAR..." />
                </div>
            </template>

            <div class="col-md-4">
              <label class="form-label mb-1">
                N° Documento <span class="required-star">*</span>
              </label>
              <input autocomplete="off"
                v-model.trim="form.document_number"
                type="text"
                class="form-control mono"
                v-restrict="{ only: 'numbers' }"
                placeholder="NUMERO"
              />
            </div>
            
             <div class="col-md-4">
                <label class="form-label mb-1">País</label>
                <SearchSelect v-model="form.cat_country" :items="catalogs.countryList" label-field="description" value-field="id" placeholder="PAÍS..." />
            </div>

          </div>
        </section>  

        <section class="form-section mb-4">
            <div class="form-section__header">
              <span class="form-section__title">Configuración del Cliente</span>
            </div>
            
            <div class="row g-3 form-section__body">
                <div class="col-md-4">
                    <label class="form-label mb-1">Segmento</label>
                    <SearchSelect v-model="form.cat_customer_segment" :items="catalogs.segmentList" label-field="description" value-field="id" placeholder="VIP, REGULAR..." />
                </div>
                <div class="col-md-4">
                    <label class="form-label mb-1">Estatus Comercial</label>
                    <SearchSelect v-model="form.cat_customer_status" :items="catalogs.statusList" label-field="description" value-field="id" placeholder="LEAD, ACTIVO..." />
                </div>
                
                <div class="col-md-3">
                    <label class="form-label mb-1 d-block">Estado (Sistema)</label>
                    <label class="form-switch">
                      <input autocomplete="off" type="checkbox" v-model="form.active" />
                      <span></span>
                    </label>
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
        <button type="button" class="btn btn-primary" @click="guardar" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const customerService = inject(ServiceKeys.Customer)
const catalog = inject('catalog')

// ID y Edit
const idParam = computed(() => { const n = Number(route.params?.id); return Number.isFinite(n) ? n : null })
const isEdit = computed(() => !!idParam.value)

// Estados de carga
const loaded = ref(false)
const saving = ref(false)

// Estado Tipo de Cliente
const isCompany = ref(false)
function setCompany(val) {
    if (!isEdit.value) isCompany.value = val
}

// Formulario unificado
const form = reactive({
  // Identificadores internos
  person_id: null,
  company_id: null,
  
  // Persona
  first_name: '',
  last_name: '',
  mother_last_name: '',
  
  // Empresa
  razon_social: '',
  razon_comercial: '',
  
  // Comunes
  document_number: '',
  cat_type_document: null,
  cat_country: null,
  
  // Cliente
  cat_customer_segment: null,
  cat_customer_status: null,
  active: true
})

// Catálogos
const catalogs = ref({
  documentTypeList: catalog.options('we_type_document') || [],
  countryList: catalog.options('we_country') || [],
  segmentList: catalog.options('customer_segment') || [],
  statusList: catalog.options('customer_status') || []
})

// Validación simple
const isValid = computed(() => {
    if (isCompany.value) {
        return !!form.razon_social && !!form.document_number
    } else {
        return !!form.first_name && !!form.last_name && !!form.document_number && !!form.cat_type_document
    }
})

// Cargar Datos
async function loadData(id) {
  try {
    const data = await customerService.customerGet({ id })
    if (!data) throw new Error('Cliente no encontrado')

    // Determinar tipo
    if (data.company_id) isCompany.value = true
    else isCompany.value = false

    // Mapear
    form.person_id = data.person_id
    form.company_id = data.company_id
    form.first_name = data.first_name || ''
    form.last_name = data.last_name || ''
    form.mother_last_name = data.mother_last_name || ''
    form.razon_social = data.razon_social || ''
    form.razon_comercial = data.razon_comercial || ''
    
    // El SP devuelve campos separados (person_doc vs company_doc), aquí usamos la lógica unificada
    // pero idealmente tomamos el que venga lleno
    form.document_number = data.person_document_number || data.company_document_number || ''
    form.cat_type_document = data.person_cat_type_document || data.company_cat_type_document || null
    
    form.cat_customer_segment = data.cat_customer_segment
    form.cat_customer_status = data.cat_customer_status
    form.active = data.active === 'Y' || data.active === true

  } catch (error) {
    console.error(error)
    toast.error('Error al cargar cliente')
    router.push({ name: 'CustomerList' })
  }
}

// Guardar
async function guardar() {
  if (!isValid.value) {
    toast.warning('Complete los campos obligatorios.')
    return
  }

  saving.value = true
  try {
    // Construir Payload
    // El SP register decide si es empresa si viene 'razon_social' o flag.
    // Nosotros limpiaremos los campos que no correspondan al tipo seleccionado para evitar ambigüedad.
    
    const payload = {
        customer: {
            active: form.active ? 'Y' : 'N',
            cat_customer_segment: form.cat_customer_segment,
            cat_customer_status: form.cat_customer_status,
            document_number: form.document_number,
            cat_type_document: form.cat_type_document,
            cat_country: form.cat_country
        }
    }

    if (isCompany.value) {
        // Enviar datos empresa
        payload.customer.razon_social = form.razon_social
        payload.customer.razon_comercial = form.razon_comercial
        // En update necesitamos ID si existe
        if (isEdit.value) payload.customer.company_id = form.company_id 
    } else {
        // Enviar datos persona
        payload.customer.first_name = form.first_name
        payload.customer.last_name = form.last_name
        payload.customer.mother_last_name = form.mother_last_name
        if (isEdit.value) payload.customer.person_id = form.person_id
    }

    let res
    if (isEdit.value) {
        res = await customerService.customerUpdate({ id: idParam.value, customer: payload.customer })
    } else {
        res = await customerService.customerRegister({ customer: payload.customer })
    }

    if (res && (res.customer_id || res.id)) {
        toast.success(isEdit.value ? 'Actualizado correctamente' : 'Registrado correctamente')
        router.push({ name: 'CustomerList' }) // Ajusta la ruta
    } else {
        throw new Error('Respuesta inválida')
    }

  } catch (e) {
    console.error(e)
    const msg = e.response?.data?.message || e.message || 'Error desconocido'
    toast.error('Error: ' + msg)
  } finally {
    saving.value = false
  }
}

function cancelar() { router.back() }

onMounted(async () => {
  if (isEdit.value) {
    await loadData(idParam.value)
  } else {
    // Defaults
    form.active = true
    form.cat_type_document = 1 // Ajusta default ID DNI si quieres
    form.cat_country = catalogs.value.countryList.find(c => c.alias === 'we_country_peru')?.id
  }
  loaded.value = true
})
</script>

<style scoped>
/* Estilos consistentes con InstructorForm */
.customer-form { font-size: 0.95rem; color: #111827; }
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }

/* Switch de Tipo de Cliente */
.type-selector .btn-check:checked + .btn-outline-primary {
    background-color: #eef2ff; color: #2563eb; border-color: #2563eb; font-weight: 600;
}

/* Form Switch (Toggle activo) */
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

.required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }
.form-section__header { display: flex; align-items: center; margin-bottom: 1rem; position: relative; padding-left: .75rem; }
.form-section__header::before { content: ""; position: absolute; left: 0; top: .15rem; bottom: .15rem; width: 3px; border-radius: 2px; background-color: #3b82f6; }
.form-section__title { font-size: .8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: .03em; }

.form-control:required:invalid:not(:disabled) { border-color: #ef4444 !important; }
</style>