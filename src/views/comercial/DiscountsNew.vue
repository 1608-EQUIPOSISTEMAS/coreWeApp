<template>
  <div class="container-fluid px-3 py-3">
    <div class="card shadow-sm border-0">
      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">{{ isEdit ? 'Editar descuento' : 'Nuevo descuento' }}</div>
          <div class="text-muted small" v-if="isEdit">ID: {{ idParam }}</div>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">
        
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del descuento</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-6">
              <label class="form-label mb-1">Descripción <span class="required-star">*</span></label>
              <input :disabled="isEdit" v-restrict="{transform:'upper'}" v-model.trim="form.description" type="text" class="form-control" required placeholder="Descripción visible…" />
            </div>

            <div class="col-md-6">
              <label class="form-label mb-1">Alias</label>
              <input :disabled="isEdit" v-restrict="{transform:'lower'}" v-model.trim="form.alias" type="text" class="form-control mono" placeholder="alias_interno" />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Tipo <span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.cat_discount_type"
                :disabled="isEdit" 
                :model-label="form.cat_discount_type_label"
                :items="catalogs.discountsList"
                label-field="description"
                value-field="alias"
                placeholder="Selecciona..."
                required
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Moneda <span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.cat_currency_type"
                :model-label="form.cat_currency_type_label"
                :items="currencyCatalog"
                label-field="description"
                required
                value-field="alias"
                placeholder="Selecciona..."
                :disabled="isEdit"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                Valor <span class="required-star">*</span>
                <small class="text-muted" v-if="isPercentage">(%)</small>
              </label>

              <div v-if="isPercentage" class="input-group">
                <input
                  v-model.number="form.value"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  class="form-control mono"
                  required
                  placeholder="0 - 100"
                  :disabled="isEdit" 
                />
                <span class="input-group-text text-muted bg-light">%</span>
              </div>

              <CurrencyInput
                v-else
                v-model="form.value"
                :currency="selectedCurrency"
                required
                :storeAsMinor="false" 
                :disabled="isEdit" 
                :softMinorTyping="true"
                zero-counts-as-empty
                placeholder="0.00"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Campaña</label>
              <SearchSelect
                v-model="form.campaign_id"
                :items="campaniaOptions"
                :disabled="isEdit" 
                label-field="description"
                value-field="value"
                placeholder="— Opcional —"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Inicio vigencia <span class="required-star">*</span></label>
              <input :disabled="isEdit"  v-model="form.start_date" type="date" class="form-control" required />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Fin vigencia <span class="required-star">*</span></label>
              <input v-model="form.end_date" type="date" class="form-control" required />
              <small v-if="dateError" class="text-danger d-block mt-1">Fecha fin < inicio.</small>
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1 d-block">Global</label>
              <label class="form-switch">
                <input type="checkbox" v-model="form.is_global" :disabled="assignedPrograms.length > 0" />
                <span></span>
              </label>
              <div class="text-label-aux">Aplica a todo el catálogo</div>
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1 d-block">Activo</label>
              <label class="form-switch">
                <input type="checkbox" v-model="form.active" />
                <span></span>
              </label>
            </div>
          </div>
        </section>

        <section class="form-section mb-4" v-if="!form.is_global">
          <div class="form-section__header d-flex justify-content-between">
            <div>
              <span class="form-section__title">Programas Aplicables</span>
              <div class="form-section__note">Descuento exclusivo para los siguientes items.</div>
            </div>
            <button class="btn btn-sm btn-outline-primary fw-medium" type="button" @click="openProgramModal">
              <i class="bi bi-plus-lg me-1"></i> Agregar Programa
            </button>
          </div>

          <div class="form-section__body">
            <div class="table-responsive border rounded-3 bg-white">
              <table class="table table-hover mb-0 align-middle">
                <thead class="bg-light text-secondary text-uppercase text-xs">
                  <tr>
                    <th class="ps-3 py-2">Código</th>
                    <th class="py-2">Programa</th>
                    <th class="py-2">Tipo</th>
                    <th class="text-end pe-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(prog, idx) in assignedPrograms" :key="prog.id">
                    <td class="ps-3"><span class="badge bg-light text-dark border">{{ prog.code || 'ID-'+prog.id }}</span></td>
                    <td>
                      <div class="fw-medium text-dark">{{ prog.description }}</div>
                    </td>
                    <td><span class="badge bg-blue-light text-primary">{{ prog.typeLabel || 'General' }}</span></td>
                    <td class="text-end pe-3">
                      <button v-if="prog.id" class="btn btn-icon btn-sm text-danger" title="Quitar" @click="removeProgram(idx)">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="assignedPrograms.length === 0">
                    <td colspan="4" class="text-center py-4 text-muted">
                      No hay programas asignados. El descuento no aplicará a nada específico.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" @click="guardar" :disabled="saving || !isValid">
          {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </div>

    <BaseModal v-model="modalState.show" title="Asignar Programa" size="lg">
      <div class="insc-modal">
        <header class="insc-head p-3 bg-light border-bottom">
          <div class="d-flex justify-content-between align-items-center w-100">
            <div>
              <h5 class="insc-title mb-1 fw-bold text-primary">
                Seleccionar Programa
              </h5>
              <div class="text-muted small">
                Busca y selecciona el programa al que deseas aplicar este descuento.
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-white text-dark border">
                  <i class="bi bi-tag-fill me-1 text-primary"></i> 
                  {{ isPercentage ? 'Descuento %' : 'Monto Fijo' }}
                </span>
            </div>
          </div>
        </header>

        <section class="insc-section p-3">
          <div class="row g-3">
            <div class="col-12">
               <label class="form-label mb-1 fw-bold">Buscar Programa / Curso <span class="required-star">*</span></label>
               
               <SearchSelect
                  v-model="modalState.tempProgramId"
                  mode="remote"
                  :fetcher="fetchProgramasRemotos"
                  label-field="description"
                  sublabel-field="code"
                  value-field="id"
                  placeholder="Escribe el nombre del programa..."
                  :minChars="0"
                  :cache="false"
                  required
                  @change="onModalProgramChange"
                />
            </div>
            
            <div class="col-12" v-if="modalState.tempProgramData">
               <div class="p-3 bg-light rounded border d-flex gap-3 align-items-center animate__animated animate__fadeIn">
                  <div class="display-6 text-secondary"><i class="bi bi-journal-bookmark"></i></div>
                  <div class="flex-grow-1">
                    <div class="fw-bold text-dark">{{ modalState.tempProgramData.description }}</div>
                    <div class="d-flex gap-2 mt-1">
                      <span class="badge bg-info bg-opacity-10 text-info border border-info">{{ modalState.tempProgramData.typeLabel }}</span>
                      <span class="badge bg-secondary bg-opacity-10 text-secondary border">{{ modalState.tempProgramData.modalityLabel }}</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <button class="btn btn-outline-secondary btn-sm" @click="modalState.show = false">Cancelar</button>
        <button class="btn btn-primary btn-sm px-4" @click="addProgramToTable" :disabled="!modalState.tempProgramId">
          <i class="bi bi-plus-circle me-1"></i> Agregar
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

/* Componentes */
import SearchSelect from '@/components/SearchSelect.vue'
import BaseModal from '@/components/BaseModal.vue'
import CurrencyInput from '@/components/CurrencyInput.vue' 
import { ServiceKeys } from '@/services'

const toast = useToast()
const router = useRouter()
const route  = useRoute()

// INJECTIONS
const discountService = inject(ServiceKeys.Discount)
const programService = inject(ServiceKeys.Program) // Inyectamos el servicio de programas
const catalog = inject('catalog')

/* -----------------------------------------
   ESTADO Y FORMULARIO
----------------------------------------- */
const idParam = computed(() => Number(route.params?.id))
const isEdit = computed(() => !!idParam.value && !isNaN(idParam.value))
const loaded = ref(false)
const saving = ref(false)

const form = reactive({
  description: null,
  alias: null,
  cat_discount_type: null, 
  cat_currency_type: null,
  value: null,            
  is_global: false,       
  campaign_id: null,      
  start_date: '',         
  end_date: '',           
  active: true            
})

/* -----------------------------------------
   CATÁLOGOS
----------------------------------------- */
const catalogs = ref({
  discountsList: catalog.options('we_discount_type')
})

const currencyCatalog = ref(
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

const campaniaOptions = ref([]) // Cargar campañas si es necesario

/* -----------------------------------------
   LÓGICA INPUT VALOR (DINÁMICO)
----------------------------------------- */
const isPercentage = computed(() => {
  return form.cat_discount_type === 'we_discount_type_percentage'
})

// Moneda seleccionada (default PEN)
const selectedCurrency = computed(() => 
  currencyCatalog.value.find(i => i.alias === form.cat_currency_type)?.raw ??
  { alias:'we_currency_pen', code:'PEN', symbol:'S/.', minorUnit:2, locale:'es-PE', decimal:'.', thousands:',', position:'prefix', allowNegative:false, allowZero:false }
)

// Reset valor si cambia tipo
watch(() => form.cat_discount_type, (newVal, oldVal) => {
    if (loaded.value && newVal !== oldVal) {
        form.value = 0
    }
})

/* -----------------------------------------
   LÓGICA TABLA PROGRAMAS Y MODAL
----------------------------------------- */
const assignedPrograms = ref([]) // Lista local de programas agregados

const modalState = reactive({
    show: false,
    tempProgramId: null,
    tempProgramData: null // Objeto completo para preview
})

// Abrir modal y resetear
function openProgramModal() {
    modalState.tempProgramId = null
    modalState.tempProgramData = null
    modalState.show = true
}

/**
 * Fetcher para SearchSelect remoto
 * Llama a programCaller (que mapea sp_program_caller)
 */
async function fetchProgramasRemotos(q) {
  try {
    // Solo buscamos programas activos por defecto
    const res = await programService.programCaller({ q })
    // Asumiendo que el servicio devuelve { ok: true, data: [...] } o directamente el array
    return Array.isArray(res) ? res : (res.data || [])
  } catch (e) {
    console.error("Error buscando programas", e)
    return []
  }
}

// Al seleccionar en el modal, guardamos el objeto completo para previsualizar
function onModalProgramChange(item) {
  modalState.tempProgramData = item || null
}

// Agregar a la tabla principal
function addProgramToTable() {
    if (!modalState.tempProgramData) return;

    // Verificar duplicados
    const exists = assignedPrograms.value.find(p => p.id === modalState.tempProgramData.id)
    if (exists) {
        toast.warning('Este programa ya está agregado.')
        return
    }

    assignedPrograms.value.push({ ...modalState.tempProgramData })
    modalState.show = false
    toast.success('Programa agregado')
}

function removeProgram(index) {
    assignedPrograms.value.splice(index, 1)
}

/* -----------------------------------------
   VALIDACIONES Y GUARDADO
----------------------------------------- */
const dateError = computed(() => {
  if (!form.start_date || !form.end_date) return false
  return new Date(form.end_date) < new Date(form.start_date)
})

const isValid = computed(() =>
  !!form.description &&
  !!form.cat_discount_type &&
  !!form.cat_currency_type && 
  form.value !== null && form.value !== '' &&
  !Number.isNaN(Number(form.value)) &&
  (isPercentage.value ? (form.value >= 0 && form.value <= 100) : true) &&
  !!form.start_date &&
  !!form.end_date &&
  !dateError.value
)

/* LOAD & SAVE */
async function loadData(id) {
  try {
    const res = await discountService.discountGet({ id })
    const data = res || {}
    
    // Mapeo de campos
    Object.assign(form, {
      description: data.description ?? null,
      alias: data.alias ?? null,
      cat_discount_type: data.cat_discount_type ?? null,
      cat_discount_type_label: data.cat_discount_type_label ?? null,
      cat_currency_type_label: data.cat_currency_type_label,
      cat_currency_type: data.cat_currency_type ?? null,
      value: data.value ?? null,
      is_global: !!data.is_global,
      campaign_id: data.campaign_id ?? null,
      start_date: (data.start_date || '').slice(0, 10),
      end_date: (data.end_date || '').slice(0, 10),
      active: !!data.active
    })

    // Cargar programas si existen (vienen del SP get)
    if (data.programs && Array.isArray(data.programs)) {
      assignedPrograms.value = data.programs
    }

  } catch (error) {
    console.error(error)
    toast.error("No se pudo cargar el descuento")
    router.back()
  }
}

async function guardar() {
  if (!isValid.value) return
  saving.value = true
  try {
    const payload = {
        discount: {
            description: form.description || null,
            alias: form.alias || null,
            cat_discount_type: catalogs.value.discountsList.find(e => e.alias == form.cat_discount_type).id || null,
            cat_currency_type: currencyCatalog.value.find(e=>e.alias==form.cat_currency_type).id || null,
            value: Number(form.value),
            is_global: !!form.is_global,
            campaign_id: form.campaign_id != null ? Number(form.campaign_id) : null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            active: !!form.active,
            program_ids: form.is_global ? [] : assignedPrograms.value.map(p => p.id)
        }
    }

    let r
    if (isEdit.value) {
      r = await discountService.discountUpdate({ id: idParam.value, ...payload })
      toast.success('Descuento actualizado')
    } else {
      r = await discountService.discountRegister(payload)
      toast.success('Descuento creado')
    }

    if (r && r.discount_id) {
       router.back()
    }

  } catch (e) {
    console.error(e)
    toast.error('Error al guardar')
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
  } else {
    // Defaults
    form.active = true
    form.is_global = false
    // Default a PEN si existe
    const pen = currencyCatalog.value.find(c => c.raw.code === 'PEN')
    if(pen) form.cat_currency_type = pen.alias
  }
  loaded.value = true
})
</script>

<style scoped>
/* Estilos existentes + Form Styles */
.form-control:required:invalid:not(:disabled):not([readonly]),
.form-select:required:invalid:not(:disabled):not([readonly]) {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 .2rem rgba(239,68,68,.15);
}
.form-control:required:valid:not(:disabled):not([readonly]),
.form-select:required:valid:not(:disabled):not([readonly]) {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 .2rem rgba(16,185,129,.15);
}

.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
.form-section { background-color: #ffffff; }
.form-section__header {
  display: flex; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; position: relative;
  padding-left: .75rem; min-height: 1.25rem; column-gap: .75rem;
}
.form-section__header::before {
  content: ""; position: absolute; left: 0; top: .15rem; bottom: .15rem; width: 3px;
  border-radius: 2px; background-color: #3b82f6;
}
.form-section__title {
  font-size: .8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: .03em;
}
.form-section__note { font-size: .75rem; color: #6b7280; margin-top: 0.1rem; font-weight: 400; }
.form-label { color: #1f2937; font-weight: 500; font-size: .8rem; line-height: 1.2; margin-bottom: .25rem; }
.text-label-aux { font-size: .7rem; line-height: 1.3; color: #6b7280; margin-top: .35rem; }
.form-control, .form-select { font-size: .85rem; line-height: 1.4; border-color: #d1d5db; color: #111827; }
.form-control:focus { border-color: #3b82f6; box-shadow: 0 0 0 .2rem rgba(59,130,246,.15); outline: 0; }
.required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }
.card-footer { border-top: 1px solid #e5e7eb !important; background-color: #fff; }

/* Switch */
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; }
.form-switch span::after {
  content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%;
  position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

/* Styles tabla */
.bg-blue-light { background-color: #e0f2fe; }
.text-xs { font-size: 0.75rem; }
.btn-icon { border: none; background: transparent; padding: 0.25rem 0.5rem; }
.btn-icon:hover { background-color: #fee2e2; border-radius: 4px; }

/* Modal Styles */
.insc-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-radius: .3rem .3rem 0 0; }
.insc-title { font-weight: 600; font-size: 1.1rem; color: #111827; }
.insc-section { background: #fff; }
</style>