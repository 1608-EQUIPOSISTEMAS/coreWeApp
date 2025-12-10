<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">
      <div
        class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start"
      >
        <div class="pe-3">
          <div class="h3">
            {{ isEdit ? 'Editar instructor' : 'Nuevo instructor' }}
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
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos personales</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-4">
              <label class="form-label mb-1">
                Nombres <span class="required-star">*</span>
              </label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.first_name"
                type="text"
                class="form-control"
                required
                placeholder="NOMBRES"
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">
                Apellido paterno <span class="required-star">*</span>
              </label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.last_name"
                type="text"
                class="form-control"
                required
                placeholder="APELLIDO PATERNO"
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Apellido materno</label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.mother_last_name"
                type="text"
                class="form-control"
                placeholder="APELLIDO MATERNO"
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">
                Tipo de documento <span class="required-star">*</span>
              </label>
              <SearchSelect
                v-model="form.cat_type_document"
                :items="catalogs.documentTypeList"
                label-field="description"
                value-field="id"
                placeholder="T. DOCUMENTO..."
                required
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">
                N° documento <span class="required-star">*</span>
              </label>
              <input
                v-model.trim="form.document_number"
                type="text"
                class="form-control mono"
                v-restrict="{ only: 'numbers' }"
                required
                placeholder="NÚMERO DOCUMENTO"
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Fecha de nacimiento</label>
              <input
                v-model="form.birthday"
                type="date"
                class="form-control"
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">País</label>
              <SearchSelect
                v-model="form.cat_country"
                :items="catalogs.countryList"
                label-field="description"
                value-field="id"
                placeholder="PAÍS..."
              />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Ocupación / Especialidad</label>
              <SearchSelect
                v-model="form.cat_occupation"
                :items="catalogs.occupationList"
                label-field="description"
                value-field="id"
                placeholder="OCUPACIÓN..."
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1 d-block">Estado (Activo)</label>
              <label class="form-switch">
                <input type="checkbox" v-model="form.instructor_active" />
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

      <div
        class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3"
      >
        <button type="button" class="btn btn-outline-secondary" @click="cancelar">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="guardar"
          :disabled="saving"
        >
          <span v-if="saving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Datos' : 'Registrar Instructor') }}
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

/* ======================
 * DI & Utils
 * ====================== */
const toast = useToast()
const router = useRouter()
const route = useRoute()

// Inyecciones de servicio y catálogos
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')

/* ======================
 * Estado & Computed
 * ====================== */
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!idParam.value)

const loaded = ref(false)
const saving = ref(false)

// Estado del formulario
const form = reactive({
  person_id: null,        
  first_name: null,
  last_name: null,
  mother_last_name: null,
  document_number: null,
  cat_type_document: null,
  cat_occupation: null,
  cat_person_status: null, // Si lo usas internamente
  cat_country: null,
  birthday: null,         // 'YYYY-MM-DD'
  person_active: true,    
  instructor_active: true 
})

// Catálogos
const catalogs = ref({
  documentTypeList: catalog.options('we_type_document') || [],
  occupationList: catalog.options('we_program_topic') || [], // O el catálogo que corresponda
  countryList: catalog.options('we_country') || []
})

// Validación básica (puedes hacerla más compleja si deseas)
const isValid = computed(() => {
  return (
    !!form.first_name &&
    !!form.last_name &&
    !!form.document_number &&
    !!form.cat_type_document
  )
})

/* ======================
 * Métodos: Carga de Datos
 * ====================== */
async function loadData(id) {
  try {
    // Llamada al servicio
    const data = await instructorService.instructorGet({ id })

    if (!data) {
        throw new Error('No se encontraron datos para este instructor.')
    }

    // Mapeo seguro de datos (Null Coalescing)
    form.person_id = data.person_id ?? null
    form.first_name = data.first_name ?? ''
    form.last_name = data.last_name ?? ''
    form.mother_last_name = data.mother_last_name ?? ''
    form.document_number = data.document_number ?? ''
    
    // Mapeo de catálogos (si vienen como ID o Alias, aquí asumimos ID según tu código original)
    form.cat_type_document = data.cat_type_document ?? null
    form.cat_occupation = data.cat_occupation ?? null
    form.cat_person_status = data.cat_person_status ?? null
    form.cat_country = data.cat_country ?? null // Ajustar default si es necesario, ej: ID de Perú
    
    // Fechas
    form.birthday = data.birthday ? String(data.birthday).substring(0, 10) : null

    // Booleanos / Flags
    form.person_active = data.person_active !== 'N'
    form.instructor_active = data.instructor_active !== 'N'
    
  } catch (error) {
    console.error('Error cargando instructor:', error)
    toast.error('Error al cargar los datos del instructor.')
    // Opcional: Redirigir si no existe
    router.push({ name: 'Instructor' }) // Ajusta al nombre de ruta de tu listado
  }
}

/* ======================
 * Métodos: Guardado
 * ====================== */

/**
 * Construye el payload unificado.
 * Sirve tanto para crear como para editar, inyectando el ID si es edit.
 */
function buildPayload() {
  const payload = {
    instructor: {
        person_id: form.person_id ?? null,
        first_name: form.first_name?.trim() || null,
        last_name: form.last_name?.trim() || null,
        mother_last_name: form.mother_last_name?.trim() || null,
        document_number: form.document_number?.trim() || null,
        cat_type_document: form.cat_type_document ?? null,
        cat_occupation: form.cat_occupation ?? null,
        cat_country: form.cat_country ?? null,
        birthday: form.birthday || null,
        
        // Conversión a 'Y'/'N' para backend legacy/sql
        person_active: form.person_active ? 'Y' : 'N',
        instructor_active: form.instructor_active ? 'Y' : 'N',
        
        // Campos de auditoría (normalmente se manejan en backend, pero si se requieren:)
        // user_modification_id: ... 
    }
  }

  // Si es edición, agregamos el ID raíz
  if (isEdit.value) {
    payload.id = idParam.value
  }

  return payload
}

async function guardar() {
  // 1. Validación Previa
  if (!isValid.value) {
    toast.warning('Por favor, complete los campos obligatorios marcados con (*).')
    return
  }

  saving.value = true

  try {
    const payload = buildPayload()
    let response

    // 2. Selección de método (Update vs Register)
    if (isEdit.value) {
      response = await instructorService.instructorUpdate(payload)
    } else {
      response = await instructorService.instructorRegister(payload)
    }

    // 3. Verificación de respuesta
    // Asumimos que si devuelve un ID (instructor_id) o el objeto, fue exitoso.
    if (response && (response.instructor_id || response.id)) {
        
        const actionMsg = isEdit.value ? 'actualizado' : 'registrado'
        toast.success(`Instructor ${actionMsg} correctamente.`)
        
        // Redirección al listado
        router.push({ name: 'Instructor' }) // Ajusta a tu ruta de listado
        
    } else {
        // Si el backend devuelve 200 pero con status lógico de error
        throw new Error('La respuesta del servidor no indica éxito.')
    }

  } catch (e) {
    console.error('Error al guardar instructor:', e)
    
    // Manejo de mensaje de error específico si viene del backend
    const msg = e.response?.data?.message || e.message || 'Ocurrió un error inesperado.'
    toast.error(`Error: ${msg}`)
    
  } finally {
    saving.value = false
  }
}

function cancelar() {
  router.back()
}

/* ======================
 * Lifecycle
 * ====================== */
onMounted(async () => {
  if (isEdit.value) {
    await loadData(idParam.value)
  } else {
    // Defaults para Nuevo
    form.person_active = true
    form.instructor_active = true
    form.cat_country = catalogs.value.countryList.find(c => c.alias === 'we_country_peru')?.id || null
  }
  loaded.value = true
})
</script>

<style scoped>
    /* Estilos copiados y mantenidos para consistencia visual */
    
    .form-control:required:invalid:not(:disabled):not([readonly]),
    .form-select:required:invalid:not(:disabled):not([readonly]) {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 .2rem rgba(239,68,68,.15);
    }
    
    /* Resto de tus estilos (lead-form, card-header, timestamps, etc.) */
    .lead-form { font-size: 0.95rem; color: #111827; }
    .card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
    
    /* Form Switch */
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

    /* Required star */
    .required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }
    
    /* Section Headers */
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