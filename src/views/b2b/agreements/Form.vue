<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">

      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">{{ isEdit ? 'Editar Convenio' : 'Nuevo Convenio B2B' }}</div>
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

        <!-- ── Cabecera del Convenio ── -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del Convenio</span>
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
              <label class="form-label mb-1">Fecha Inicio <span class="required-star">*</span></label>
              <input v-model="form.start_date" type="date" class="form-control" />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">Fecha Fin</label>
              <input v-model="form.end_date" type="date" class="form-control" />
              <small class="text-muted">Vacío = indefinido</small>
            </div>

            <div class="col-12">
              <label class="form-label mb-1">Notas</label>
              <textarea
                v-model.trim="form.notes"
                class="form-control"
                rows="2"
                placeholder="Condiciones especiales, acuerdos adicionales..."
              ></textarea>
            </div>

          </div>
        </section>

        <!-- ── Tabla de Descuentos ── -->
        <section class="form-section mb-4">
          <div class="form-section__header d-flex justify-content-between align-items-center">
            <span class="form-section__title">Descuentos por Tipo y Modalidad</span>
            <button type="button" class="btn btn-outline btn-sm" @click="addDiscount">
              <i class="fa-solid fa-plus me-1"></i> Agregar fila
            </button>
          </div>

          <div class="text-muted small mb-3">
            Define descuentos específicos por combinación de tipo de programa y modalidad.
            Deja en blanco para aplicar a "Todos".
          </div>

          <div v-if="!form.discounts.length" class="empty-discounts">
            Sin descuentos configurados. Agrega al menos una fila.
          </div>

          <div v-else class="discount-table-wrapper">
            <table class="discount-table">
              <thead>
                <tr>
                  <th style="width:35%">Tipo de Programa</th>
                  <th style="width:35%">Modalidad</th>
                  <th style="width:20%" class="ta-center">Descuento (%)</th>
                  <th style="width:10%"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in form.discounts" :key="idx">
                  <td>
                    <SearchSelect
                      v-model="row.cat_type_program"
                      :items="catalogs.programTypeList"
                      label-field="description"
                      value-field="id"
                      placeholder="Todos los tipos"
                      class="select-inline"
                    />
                  </td>
                  <td>
                    <SearchSelect
                      v-model="row.cat_model_modality"
                      :items="catalogs.modalityList"
                      label-field="description"
                      value-field="id"
                      placeholder="Todas las modalidades"
                      class="select-inline"
                    />
                  </td>
                  <td>
                    <div class="pct-input-wrapper">
                      <input
                        v-model.number="row.discount_pct"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        class="form-control pct-input"
                        placeholder="0.00"
                      />
                      <span class="pct-symbol">%</span>
                    </div>
                  </td>
                  <td class="ta-center">
                    <button
                      type="button"
                      class="btn btn-outline btn-xs text-danger"
                      @click="removeDiscount(idx)"
                      title="Eliminar fila"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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
  programTypeList: catalog?.options('we_program_type') || [],
  modalityList: catalog?.options('we_modality') || [],
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
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  notes: '',
  discounts: [],
})

// Validación
const isValid = computed(() => {
  return (
    !!form.company_id &&
    !!form.start_date &&
    form.discounts.every(d => d.discount_pct !== null && d.discount_pct !== '' && Number(d.discount_pct) >= 0)
  )
})

// ── Gestión de descuentos ────────────────────────────────

function addDiscount() {
  form.discounts.push({
    cat_type_program: null,
    cat_model_modality: null,
    discount_pct: null,
  })
}

function removeDiscount(idx) {
  form.discounts.splice(idx, 1)
}

// ── Cargar datos (editar) ────────────────────────────────

async function loadData(id) {
  try {
    const data = await b2bService.agreementGet({ id })
    if (!data?.agreement_id) throw new Error('Convenio no encontrado')

    form.company_id = data.company_id
    form.company_label = data.company_name || ''
    form.start_date = data.start_date ? String(data.start_date).slice(0, 10) : null
    form.end_date = data.end_date ? String(data.end_date).slice(0, 10) : null
    form.notes = data.notes || ''

    form.discounts = (data.discounts || []).map(d => ({
      discount_id: d.discount_id,
      cat_type_program: d.cat_type_program ?? null,
      cat_model_modality: d.cat_model_modality ?? null,
      discount_pct: d.discount_pct ?? null,
    }))
  } catch (e) {
    console.error(e)
    toast.error('Error cargando el convenio')
    router.back()
  }
}

// ── Guardar ──────────────────────────────────────────────

async function guardar() {
  if (!isValid.value) {
    toast.warning('Completa los campos obligatorios y verifica que todos los descuentos tengan porcentaje.')
    return
  }

  if (form.end_date && form.start_date > form.end_date) {
    toast.warning('La fecha fin no puede ser anterior a la fecha inicio.')
    return
  }

  saving.value = true
  try {
    const payload = {
      agreement: {
        company_id: form.company_id,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      },
      discounts: form.discounts.map(d => ({
        ...(d.discount_id ? { discount_id: d.discount_id } : {}),
        cat_type_program: d.cat_type_program || null,
        cat_model_modality: d.cat_model_modality || null,
        discount_pct: Number(d.discount_pct),
      })),
    }

    if (isEdit.value) {
      payload.id = idParam.value
      await b2bService.agreementUpdate(payload)
      toast.success('Convenio actualizado correctamente')
    } else {
      await b2bService.agreementRegister(payload)
      toast.success('Convenio creado correctamente')
    }

    router.push({ name: 'B2BAgreements' })
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

/* Tabla de descuentos */
.discount-table-wrapper { border: 1px solid #e5e7eb; border-radius: .5rem; overflow: hidden; }
.discount-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.discount-table thead th { background: #f9fafb; padding: .5rem .75rem; text-align: left; font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
.discount-table tbody tr { border-bottom: 1px solid #f3f4f6; }
.discount-table tbody tr:last-child { border-bottom: none; }
.discount-table td { padding: .4rem .5rem; vertical-align: middle; }
.ta-center { text-align: center; }

.select-inline { width: 100%; }

.pct-input-wrapper { display: flex; align-items: center; gap: .3rem; }
.pct-input { width: 90px; text-align: right; padding: .3rem .5rem; font-size: .875rem; border: 1px solid #e5e7eb; border-radius: .375rem; }
.pct-symbol { font-weight: 600; color: #374151; }

.empty-discounts { text-align: center; padding: 1.5rem; color: #9ca3af; font-style: italic; font-size: .875rem; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: .5rem; }

/* Botones */
.btn { display: inline-flex; align-items: center; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .6rem; font-size: .78rem; }
.btn-xs { padding: .15rem .4rem; font-size: .75rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.form-control { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; width: 100%; font-size: .875rem; }
.form-label { font-size: .85rem; font-weight: 500; color: #374151; display: block; }
</style>
