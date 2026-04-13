<template>
  <div class="container-fluid px-3 py-3 fico-form">
    <div class="card shadow-sm border-0">

      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">FICO — Registro de Inscripcion</div>
          <small class="text-muted">Registro directo por Finanzas (sin lead)</small>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="resetForm">Limpiar</button>
          <button type="button" class="btn btn-primary fw-bold" :disabled="saving" @click="handleSave">
            {{ saving ? 'Guardando...' : 'Guardar inscripcion' }}
          </button>
        </div>
      </div>

      <div class="card-body pt-4 pb-4">

        <!-- A. CLIENTE -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del cliente</span>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-md-2">
              <label class="form-label mb-1">Tipo doc<span class="req">*</span></label>
              <SearchSelect v-model="form.cat_type_document" :items="catDocTypes" label-field="description" value-field="id" placeholder="DOC..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Nro. doc<span class="req">*</span></label>
              <input v-model="form.document_number" type="text" class="form-control" placeholder="DNI / CE / Pasaporte" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Nombres<span class="req">*</span></label>
              <input v-model="form.first_name" type="text" class="form-control" placeholder="NOMBRES" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Apellidos<span class="req">*</span></label>
              <input v-model="form.last_name" type="text" class="form-control" placeholder="APELLIDOS" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Correo<span class="req">*</span></label>
              <input v-model="form.email" type="email" class="form-control" placeholder="correo@ejemplo.com" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Telefono<span class="req">*</span></label>
              <input v-model="form.phone" type="text" class="form-control" placeholder="TELEFONO" />
            </div>
            <div class="col-md-2">
              <label class="form-label mb-1">Pais</label>
              <SearchSelect v-model="form.cat_country" :items="catCountries" label-field="description" value-field="id" placeholder="PAIS..." />
            </div>
          </div>
        </section>

        <!-- B. PROGRAMA Y EDICION -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Programa y edicion</span>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-md-5">
              <label class="form-label mb-1">Programa<span class="req">*</span></label>
              <SearchSelect v-model="form.program_version_id" :items="programsList" label-field="label" value-field="program_version_id" placeholder="Buscar programa..." @update:modelValue="onProgramChange" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Edicion<span class="req">*</span></label>
              <SearchSelect v-model="form.program_edition_id" :items="editionsList" label-field="label" value-field="id" placeholder="Seleccionar edicion..." @update:modelValue="onEditionChange" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Modalidad inscripcion</label>
              <SearchSelect v-model="form.cat_insc_modality" :items="catInscModality" label-field="description" value-field="id" placeholder="MODALIDAD..." />
            </div>
          </div>
        </section>

        <!-- C. PAGO -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Informacion de pago</span>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">Moneda</label>
              <SearchSelect v-model="form.cat_currency" :items="catCurrency" label-field="description" value-field="id" placeholder="MONEDA..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Forma de pago<span class="req">*</span></label>
              <SearchSelect v-model="form.cat_payment_way" :items="catPaymentWay" label-field="description" value-field="id" placeholder="CONTADO / CUOTAS..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Precio lista</label>
              <input v-model.number="form.list_price" type="number" class="form-control" placeholder="0.00" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Monto total a pagar</label>
              <input v-model.number="form.total_amount" type="number" class="form-control" placeholder="0.00" />
            </div>
          </div>
        </section>

        <!-- D. PLAN DE CUOTAS (solo si es cuotas) -->
        <section class="form-section mb-4" v-if="isInstallment">
          <div class="form-section__header d-flex align-items-center justify-content-between">
            <span class="form-section__title">Plan de cuotas</span>
            <button class="btn btn-outline-secondary btn-sm" @click="addInstallment">+ Agregar cuota</button>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-12">
              <div class="cuotas-head d-none d-md-grid">
                <div>#</div><div>Vence</div><div>Monto</div><div></div>
              </div>
              <div v-for="(c, idx) in installments" :key="idx" class="cuotas-row">
                <div class="idx">{{ idx + 1 }}</div>
                <div><input v-model="c.due_date" type="date" class="form-control form-control-sm" /></div>
                <div><input v-model.number="c.amount" type="number" class="form-control form-control-sm" placeholder="0.00" /></div>
                <div class="text-end"><button class="btn btn-outline-danger btn-sm" @click="installments.splice(idx,1)">X</button></div>
              </div>
              <div v-if="!installments.length" class="text-muted small">Sin cuotas configuradas.</div>
            </div>
          </div>
        </section>

        <!-- E. OBSERVACIONES -->
        <section class="form-section mb-0">
          <div class="form-section__header">
            <span class="form-section__title">Observaciones</span>
          </div>
          <div class="row g-3 form-section__body">
            <div class="col-12">
              <textarea v-model="form.observations" class="form-control" rows="2" placeholder="Notas internas de FICO"></textarea>
            </div>
          </div>
        </section>

      </div>

      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="goBack">Cancelar</button>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? 'Guardando...' : 'Guardar inscripcion' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'

const router = useRouter()
const toast = useToast()
const catalog = inject('catalog')
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const ficoService = inject(ServiceKeys.Fico)

const saving = ref(false)
const programsList = ref([])
const editionsList = ref([])
const installments = ref([])

const catDocTypes = catalog.options('we_type_document')
const catCountries = catalog.options('we_country')
const catCurrency = catalog.options('we_currency')
const catInscModality = catalog.options('we_insc_modality')
const catPaymentWay = catalog.options('we_payment_way')
const catPaymentChannel = catalog.options('we_payment_channel')

const channelGeneral = computed(() => catPaymentChannel.find(c => c.alias === 'we_channel_general'))

const form = reactive({
  cat_type_document: null,
  document_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  cat_country: null,
  program_version_id: null,
  program_edition_id: null,
  cat_insc_modality: null,
  cat_currency: null,
  cat_payment_way: null,
  list_price: 0,
  total_amount: 0,
  observations: ''
})

const isInstallment = computed(() => {
  const sel = catPaymentWay.find(c => c.id === form.cat_payment_way)
  return sel?.alias === 'we_payment_way_installments'
})

onMounted(async () => {
  await loadPrograms()
  const pen = catCurrency.find(c => c.alias?.toLowerCase().includes('pen') || c.description?.toLowerCase().includes('sol'))
  if (pen) form.cat_currency = pen.id
  const dni = catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))
  if (dni) form.cat_type_document = dni.id
})

async function loadPrograms () {
  try {
    const items = await programService.programVersionCaller({ active: 'Y' })
    programsList.value = (items || []).map(p => ({
      ...p,
      label: `${p.abbreviation || ''} — ${p.version_code || ''}`
    }))
  } catch (e) { console.error(e) }
}

async function onProgramChange () {
  form.program_edition_id = null
  editionsList.value = []
  if (!form.program_version_id) return
  try {
    const items = await editionService.editionCaller({ program_version_id: form.program_version_id })
    editionsList.value = (items || []).map(e => ({
      ...e,
      id: e.edition_num_id || e.id,
      label: `${e.start_date ? new Date(e.start_date).toLocaleDateString('es-PE') : ''} — ${e.edition_code || ''}`
    }))
  } catch (e) { console.error(e) }
}

function onEditionChange () {
  const ed = editionsList.value.find(e => e.id === form.program_edition_id)
  if (ed?.list_price) {
    form.list_price = Number(ed.list_price) || 0
    form.total_amount = form.list_price
  }
}

function addInstallment () {
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + installments.value.length + 1)
  installments.value.push({
    due_date: nextMonth.toISOString().slice(0, 10),
    amount: 0
  })
}

function validate () {
  if (!form.document_number.trim()) { toast.error('Ingresa el numero de documento.'); return false }
  if (!form.first_name.trim()) { toast.error('Ingresa los nombres.'); return false }
  if (!form.last_name.trim()) { toast.error('Ingresa los apellidos.'); return false }
  if (!form.email.trim()) { toast.error('Ingresa el correo.'); return false }
  if (!form.phone.trim()) { toast.error('Ingresa el telefono.'); return false }
  if (!form.program_version_id) { toast.error('Selecciona un programa.'); return false }
  return true
}

async function handleSave () {
  if (saving.value || !validate()) return
  saving.value = true
  try {
    const payload = {
      inscription: {
        document: form.document_number.trim(),
        cat_type_document: form.cat_type_document,
        full_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        cat_country: form.cat_country,
        program_version_id: form.program_version_id,
        program_edition_id: form.program_edition_id,
        cat_insc_modality: form.cat_insc_modality,
        cat_payment_channel: channelGeneral.value?.id || null,
        cat_currency: form.cat_currency,
        cat_payment_way: form.cat_payment_way,
        list_price: form.list_price || 0,
        total_amount: form.total_amount || 0,
        saved_money: 0,
        observations: form.observations || null,
        installment_plan: isInstallment.value && installments.value.length > 0
          ? installments.value.map((c, i) => ({ installment_number: i + 1, amount: c.amount, due_date: c.due_date }))
          : null
      }
    }

    const resp = await ficoService.enrollmentRegister(payload)

    if (resp.result === 1) {
      toast.success(resp.message || 'Inscripcion registrada correctamente.')
      router.push({ name: 'enrollment' })
    } else {
      toast.error(resp.message || 'Error al registrar la inscripcion.')
    }
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar la inscripcion.')
  } finally { saving.value = false }
}

function resetForm () {
  Object.assign(form, {
    cat_type_document: catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))?.id || null,
    document_number: '', first_name: '', last_name: '', email: '', phone: '',
    cat_country: null, program_version_id: null, program_edition_id: null,
    cat_insc_modality: null, cat_payment_way: null, list_price: 0, total_amount: 0, observations: ''
  })
  installments.value = []
  editionsList.value = []
}

function goBack () { router.back() }
</script>

<style scoped>
.fico-form { font-size: 0.95rem; color: #111827; }
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }

.form-section { background:#fff; }
.form-section__header {
  display:flex; flex-wrap:wrap; align-items:center; gap:.5rem .75rem;
  margin-bottom:1rem; position:relative; padding-left:.75rem; min-height:1.25rem;
}
.form-section__header::before {
  content:""; position:absolute; left:0; top:.15rem; bottom:.15rem; width:3px; border-radius:2px; background:#3b82f6;
}
.form-section__title { font-size:.8rem; font-weight:600; color:#111827; text-transform:uppercase; letter-spacing:.03em; }
.form-label { color:#1f2937; font-weight:500; font-size:.8rem; margin-bottom:.25rem; }
.req { color:#dc2626; font-weight:600; margin-left:.15rem; }

.cuotas-head, .cuotas-row { display:grid; grid-template-columns: 40px 1fr 1fr 60px; gap:.5rem; align-items:center; }
.cuotas-head { font-size:.75rem; font-weight:600; color:#6b7280; text-transform:uppercase; padding-bottom:.35rem; border-bottom:1px solid #e5e7eb; }
.cuotas-row { padding:.35rem 0; border-bottom:1px solid #f3f4f6; }
.idx { font-weight:600; color:#6b7280; font-size:.75rem; }

.form-control, .form-select, textarea.form-control { font-size:.85rem; line-height:1.4; border-color:#d1d5db; color:#111827; }
.form-control:focus, .form-select:focus, textarea.form-control:focus {
  border-color:#3b82f6; box-shadow:0 0 0 .2rem rgba(59,130,246,.15); outline:0;
}
</style>
