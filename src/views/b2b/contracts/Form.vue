<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">

      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">{{ isEdit ? 'Editar Contrato' : 'Nuevo Contrato B2B' }}</div>
          <div class="text-muted small" v-if="isEdit">ID: <span class="fw-bold">{{ idParam }}</span></div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline btn-sm" @click="cancelar">Cancelar</button>
          <button class="btn btn-primary btn-sm" :disabled="!isValid || saving" @click="guardar">
            <i class="fa-solid fa-save me-1"></i>
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">

        <!-- ── Datos del Contrato ── -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del Contrato</span>
          </div>
          <div class="row g-3 form-section__body">

            <div class="col-md-6">
              <label class="form-label mb-1">Empresa <span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.company_id"
                mode="remote"
                :fetcher="q => b2bService.companyList({ q, page: 1, size: 20 }).then(r => r.items || [])"
                label-field="razon_social"
                value-field="company_id"
                placeholder="BUSCAR EMPRESA..."
                :model-label="form.company_label"
                @change="opt => { form.company_label = opt ? opt.razon_social : '' }"
                required
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Tipo de Contrato <span class="required-star">*</span></label>
              <SearchSelect
                v-model="form.cat_contract_type"
                :items="catalogs.contractTypeList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                :model-label="form.contract_type_label"
                required
              />
            </div>

            <div class="col-md-3 d-flex flex-column justify-content-end">
              <label class="form-label mb-1">Estado</label>
              <div class="d-flex align-items-center gap-2 py-2">
                <label class="form-switch">
                  <input type="checkbox" v-model="form.active" />
                  <span></span>
                </label>
                <span class="small">{{ form.active ? 'Activo' : 'Inactivo / Cancelado' }}</span>
              </div>
            </div>

            <div class="col-md-8">
              <label class="form-label mb-1">Nombre del Contrato <span class="required-star">*</span></label>
              <input
                v-model.trim="form.contract_name"
                type="text"
                class="form-control"
                placeholder="Ej. CONTRATO MARCO 2026 - EMPRESA S.A.C."
                v-restrict="'upper|max:200'"
              />
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">Fecha Inicio <span class="required-star">*</span></label>
              <input v-model="form.start_date" type="date" class="form-control" />
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">Fecha Fin</label>
              <input v-model="form.end_date" type="date" class="form-control" />
              <small class="text-muted">Vacío = indefinido</small>
            </div>

            <div class="col-12">
              <label class="form-label mb-1">Descripción</label>
              <textarea
                v-model.trim="form.description"
                class="form-control"
                rows="3"
                placeholder="Describe el alcance y condiciones generales del contrato..."
              ></textarea>
            </div>

          </div>
        </section>

        <!-- ── Documento Oficial & Notas ── -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Documento y Observaciones</span>
          </div>
          <div class="row g-3 form-section__body">

            <div class="col-12">
              <label class="form-label mb-1">
                <i class="fa-solid fa-file-contract me-1 text-primary"></i>
                URL Orden de Compra / Documento Oficial
              </label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="fa-solid fa-link text-primary"></i>
                </span>
                <input
                  v-model.trim="form.purchase_order_url"
                  type="url"
                  class="form-control"
                  placeholder="https://drive.google.com/... o https://sharepoint.com/..."
                  v-restrict="'max:500'"
                />
                <a
                  v-if="form.purchase_order_url"
                  :href="form.purchase_order_url"
                  target="_blank"
                  class="btn btn-outline btn-sm"
                  title="Abrir documento"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
              <small class="text-muted">Pega el enlace al contrato firmado (Drive, SharePoint, etc.)</small>
            </div>

            <div class="col-12">
              <label class="form-label mb-1">Notas Internas</label>
              <textarea
                v-model.trim="form.notes"
                class="form-control"
                rows="3"
                placeholder="Notas internas, condiciones especiales, recordatorios..."
              ></textarea>
            </div>

          </div>
        </section>

      </div>

      <div v-else class="card-body py-5 text-center text-muted">
        Cargando...
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const b2bService = inject(ServiceKeys.B2b)
const catalog = inject('catalog')

// Catálogos
const catalogs = ref({
  contractTypeList: catalog?.options('we_b2b_contract') || [],
})

// Params
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!idParam.value)

// Estados
const loaded = ref(false)
const saving = ref(false)

// Form
const form = reactive({
  company_id: null,
  company_label: '',
  cat_contract_type: null,
  contract_type_label: '',
  contract_name: '',
  description: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  purchase_order_url: '',
  notes: '',
  active: true,
})

// Validación
const isValid = computed(() => {
  return (
    !!form.company_id &&
    !!form.cat_contract_type &&
    !!form.contract_name &&
    !!form.start_date
  )
})

// ── Cargar datos (editar) ────────────────────────────────

async function loadData(id) {
  try {
    const data = await b2bService.contractGet({ id })
    if (!data?.contract_id) throw new Error('Contrato no encontrado')

    form.company_id = data.company_id
    form.company_label = data.company_name || ''
    form.cat_contract_type = data.cat_contract_type
    form.contract_type_label = data.contract_type_label || ''
    form.contract_name = data.contract_name || ''
    form.description = data.description || ''
    form.start_date = data.start_date ? String(data.start_date).slice(0, 10) : null
    form.end_date = data.end_date ? String(data.end_date).slice(0, 10) : null
    form.purchase_order_url = data.purchase_order_url || ''
    form.notes = data.notes || ''
    form.active = data.active !== 'N'
  } catch (e) {
    console.error(e)
    toast.error('Error cargando el contrato')
    router.back()
  }
}

// ── Guardar ──────────────────────────────────────────────

async function guardar() {
  if (!isValid.value) {
    toast.warning('Completa los campos obligatorios: empresa, tipo, nombre y fecha inicio.')
    return
  }

  if (form.end_date && form.start_date > form.end_date) {
    toast.warning('La fecha fin no puede ser anterior a la fecha inicio.')
    return
  }

  saving.value = true
  try {
    const payload = {
      contract: {
        company_id: form.company_id,
        cat_contract_type: form.cat_contract_type,
        contract_name: form.contract_name,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        purchase_order_url: form.purchase_order_url || null,
        notes: form.notes || null,
        active: form.active ? 'Y' : 'N',
      },
    }

    if (isEdit.value) {
      payload.id = idParam.value
      await b2bService.contractUpdate(payload)
      toast.success('Contrato actualizado correctamente')
    } else {
      await b2bService.contractRegister(payload)
      toast.success('Contrato creado correctamente')
    }

    router.push({ name: 'B2BContracts' })
  } catch (e) {
    console.error(e)
    toast.error('Error al guardar: ' + (e?.response?.data?.message || e.message || 'Error desconocido'))
  } finally {
    saving.value = false
  }
}

function cancelar() { router.back() }

onMounted(async () => {
  if (isEdit.value) await loadData(idParam.value)
  loaded.value = true
})
</script>

<style scoped>
.lead-form { font-size: 0.95rem; color: #111827; }
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
.required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }

.form-section__header { display: flex; align-items: center; margin-bottom: 1rem; position: relative; padding-left: .75rem; }
.form-section__header::before { content: ""; position: absolute; left: 0; top: .15rem; bottom: .15rem; width: 3px; border-radius: 2px; background-color: #3b82f6; }
.form-section__title { font-size: .8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: .03em; }

.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; cursor: pointer; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

.btn { display: inline-flex; align-items: center; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; text-decoration: none; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .6rem; font-size: .78rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.form-control { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; width: 100%; font-size: .875rem; }
.form-label { font-size: .85rem; font-weight: 500; color: #374151; display: block; }
.input-group { display: flex; }
.input-group-text { background: #f9fafb; border: 1px solid #e5e7eb; border-right: none; padding: .4rem .6rem; border-radius: .375rem 0 0 .375rem; display: flex; align-items: center; }
.input-group .form-control { border-radius: 0; }
.input-group .btn-sm { border-radius: 0 .375rem .375rem 0; border-left: none; }
</style>
