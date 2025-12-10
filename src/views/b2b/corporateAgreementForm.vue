<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">
      
      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">
            {{ isEdit ? 'Editar Convenio' : 'Nuevo Convenio' }}
          </div>
          <div class="text-muted small" v-if="isEdit">
            ID: <span class="fw-bold">{{ idParam }}</span>
          </div>
        </div>
        
        <div class="d-flex align-items-center gap-2">
            <span :class="['badge', form.active ? 'bg-success' : 'bg-danger']">
                {{ form.active ? 'ACTIVO' : 'INACTIVO' }}
            </span>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">
        
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Empresas Participantes</span>
          </div>

          <div class="row g-3 form-section__body">
            
            <div class="col-md-6">
              <label class="form-label mb-1">
                Empresa Aliada (Principal) <span class="required-star">*</span>
              </label>
              <SearchSelect
                v-model="form.company_id"
                mode="remote"
                :fetcher="q => customerService.companyCaller({ q })"
                label-field="razon_social"
                value-field="company_id"
                placeholder="BUSCAR EMPRESA..."
                required
                :disabled="isEdit" 
              />
              <small class="text-muted" v-if="isEdit">La empresa principal no se puede cambiar una vez creada.</small>
            </div>

            <div class="col-md-6">
              <label class="form-label mb-1">
                Intermediario (Opcional)
              </label>
              <SearchSelect
                v-model="form.intermediary_id"
                mode="remote"
                :fetcher="q => customerService.companyCaller({ q })"
                label-field="razon_social"
                value-field="company_id"
                placeholder="BUSCAR INTERMEDIARIO (EJ. GOINTEGRO)..."
              />
              <small class="text-muted">Ej: Plataformas de beneficios, holdings, etc.</small>
            </div>
          </div>
        </section>

        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Beneficios y Descuentos</span>
          </div>
          
          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">Dscto. Vivo (%)</label>
              <div class="input-group">
                <input 
                   v-model.number="form.discount_live_pct" 
                   type="number" 
                   min="0" max="100" 
                   step="0.01"
                   class="form-control" 
                   placeholder="0.00"
                />
                <span class="input-group-text">%</span>
              </div>
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Dscto. Online (%)</label>
              <div class="input-group">
                <input 
                   v-model.number="form.discount_online_pct" 
                   type="number" 
                   min="0" max="100"
                   step="0.01" 
                   class="form-control" 
                   placeholder="0.00"
                />
                <span class="input-group-text">%</span>
              </div>
            </div>
            
            <div class="col-md-6 align-self-center">
                 <div class="alert alert-info py-2 mb-0 small">
                    <i class="fa-solid fa-circle-info me-1"></i>
                    Estos porcentajes se aplicarán automáticamente al seleccionar la empresa en la venta.
                 </div>
            </div>
          </div>
        </section>

        <section class="form-section mb-4">
          <div class="form-section__header">
             <span class="form-section__title">Vigencia y Estado</span>
          </div>

          <div class="row g-3 form-section__body">
             <div class="col-md-4">
                <label class="form-label mb-1">Fecha Inicio <span class="required-star">*</span></label>
                <input v-model="form.start_date" type="date" class="form-control" required />
             </div>

             <div class="col-md-4">
                <label class="form-label mb-1">Fecha Fin (Opcional)</label>
                <input v-model="form.end_date" type="date" class="form-control" />
                <small class="text-muted">Dejar vacío si es indefinido.</small>
             </div>

             <div class="col-md-4">
                <label class="form-label mb-1 d-block">Estado (Activo)</label>
                <label class="form-switch">
                  <input type="checkbox" v-model="form.active" />
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
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Convenio' : 'Crear Convenio') }}
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

// Servicios
const agreementService = inject(ServiceKeys.CorporateAgreement)
const customerService = inject(ServiceKeys.Customer) // Para buscar empresas

// Computados ID
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!idParam.value)

// Estados
const loaded = ref(false)
const saving = ref(false)

const form = reactive({
    company_id: null,
    intermediary_id: null,
    discount_live_pct: 0,
    discount_online_pct: 0,
    start_date: new Date().toISOString().slice(0, 10), // Hoy por defecto
    end_date: null,
    active: true
})

// Validación
const isValid = computed(() => {
    return !!form.company_id && !!form.start_date
})

/* ======================
 * Carga de Datos (Editar)
 * ====================== */
async function loadData(id) {
    try {
        // NOTA: Asegúrate de tener implementado agreementGet en tu servicio
        // Si no, puedes usar agreementList filtrando, aunque no es lo ideal.
        const response = await agreementService.agreementGet({ id }) 
        const data = response?.data || {}

        if (!data.agreement_id) throw new Error("Convenio no encontrado")

        form.company_id = data.company_id
        // Para SearchSelect remote en modo "Edit", a veces necesitas pre-cargar el label
        // Depende de tu implementación de SearchSelect. Si soporta initial-data, pásalo.
        // form.initialCompany = { id: data.company_id, razon_social: data.company_label }

        form.intermediary_id = data.intermediary_id
        
        form.discount_live_pct = Number(data.discount_live_pct) || 0
        form.discount_online_pct = Number(data.discount_online_pct) || 0
        
        form.start_date = data.start_date ? String(data.start_date).slice(0, 10) : null
        form.end_date = data.end_date ? String(data.end_date).slice(0, 10) : null
        
        form.active = data.active === 'Y'

    } catch (e) {
        console.error(e)
        toast.error("Error cargando el convenio")
        router.back()
    }
}

/* ======================
 * Guardar
 * ====================== */
async function guardar() {
    if (!isValid.value) {
        toast.warning('Seleccione la empresa principal y la fecha de inicio.')
        return
    }

    // Validar fechas
    if (form.end_date && form.start_date > form.end_date) {
        toast.warning('La fecha fin no puede ser anterior a la fecha inicio.')
        return
    }

    saving.value = true
    try {
        const payload = {
            agreement: {
                company_id: form.company_id,
                intermediary_id: form.intermediary_id || null,
                discount_live_pct: form.discount_live_pct,
                discount_online_pct: form.discount_online_pct,
                start_date: form.start_date,
                end_date: form.end_date || null,
                active: form.active ? 'Y' : 'N'
            }
        }

        if (isEdit.value) {
            payload.id = idParam.value
            await agreementService.agreementUpdate(payload)
            toast.success('Convenio actualizado correctamente')
        } else {
            await agreementService.agreementRegister(payload)
            toast.success('Convenio creado correctamente')
        }
        
        router.push({ name: 'CorporateAgreementList' }) // Ajusta nombre de ruta

    } catch (e) {
        console.error(e)
        toast.error('Error al guardar: ' + (e.message || 'Error desconocido'))
    } finally {
        saving.value = false
    }
}

function cancelar() {
    router.back()
}

onMounted(async () => {
    if (isEdit.value) {
        await loadData(idParam.value)
    }
    loaded.value = true
})
</script>

<style scoped>
/* Estilos copiados para consistencia */
.lead-form { font-size: 0.95rem; color: #111827; }
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
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
.input-group-text { background-color: #f9fafb; font-size: 0.85rem; }
</style>