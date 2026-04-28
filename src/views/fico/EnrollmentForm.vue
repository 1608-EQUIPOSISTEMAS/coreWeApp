<template>
  <div class="ef-page">
    <div class="ef-page-header">
      <div class="ef-page-header-left">
        <span class="ef-breadcrumb">FICO</span>
        <h1 class="ef-page-title">Nueva Inscripcion</h1>
      </div>
      <div class="ef-header-actions">
        <button class="ef-btn-outline" @click="goBack">Cancelar</button>
      </div>
    </div>

    <!-- ASESOR -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-user-tie"></i> ASESOR</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Categoria <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.agent_category" :items="agentCategoryOptions" label-field="label" value-field="id" placeholder="Seleccionar..." @update:modelValue="form.seller_agent_id = null" />
        </div>
        <div class="ef-field" v-if="form.agent_category === 'comercial'">
          <label>Asesor <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="agentsList" label-field="label" value-field="id" placeholder="Buscar asesor..." />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'b2b'">
          <label>Asesor B2B <span class="ef-optional">(opcional)</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="b2bAgentsList" label-field="label" value-field="id" placeholder="Solo B2B (sin asesor)" />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'web'">
          <label>Asesor WEB <span class="ef-optional">(opcional)</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="webAgentsList" label-field="label" value-field="id" placeholder="Solo WEB (sin asesor)" />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'we'">
          <label>Area WE <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="weAreaOptions" label-field="label" value-field="id" placeholder="Seleccionar..." />
        </div>
        <div class="ef-field" v-if="form.agent_category === 'b2b' && !form.seller_agent_id">
          <label>Tipo de Inscripcion B2B</label>
          <SearchSelect v-model="form.cat_b2b_doctype" :items="catB2BDoctype" label-field="description" value-field="id" placeholder="Pago directo (default)" />
        </div>
      </div>
      <div v-if="isB2BDocumental" class="ef-b2b-note">
        <i class="fa-solid fa-circle-info"></i>
        Inscripcion B2B documental: el pago no se registra en FICO (gestionado por la empresa B2B). Total: 0, descuento 100%.
      </div>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-user"></i> DATOS DEL CLIENTE</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Tipo Documento <span v-if="requireDocument" class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_type_document" :items="catDocTypes" label-field="description" value-field="id" placeholder="DOC..." />
        </div>
        <div class="ef-field">
          <label>
            Nro. Documento
            <span v-if="requireDocument" class="ef-req">*</span>
            <span v-else class="ef-optional">(opcional)</span>
          </label>
          <div class="ef-input-with-btn">
            <input
              v-model="form.document_number"
              type="text"
              :placeholder="docConfig.isNumeric ? `Max. ${docConfig.maxLength} digitos` : `Max. ${docConfig.maxLength} caracteres`"
              :maxlength="docConfig.maxLength"
              @keyup.enter="searchCustomerByDocument"
              @input="onDocumentInput"
            />
            <button type="button" class="ef-search-btn" :disabled="!form.document_number || searchingCustomer" @click="searchCustomerByDocument" title="Buscar cliente">
              <i class="fa-solid" :class="searchingCustomer ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"></i>
            </button>
          </div>
          <small v-if="form.document_number && docConfig.isNumeric && form.document_number.length !== docConfig.maxLength" class="ef-hint-warn">
            Se esperan {{ docConfig.maxLength }} digitos
          </small>
        </div>
        <div class="ef-field">
          <label>Nombres <span class="ef-req">*</span></label>
          <input v-model="form.first_name" type="text" placeholder="NOMBRES" />
        </div>
        <div class="ef-field">
          <label>Apellidos <span class="ef-req">*</span></label>
          <input v-model="form.last_name" type="text" placeholder="APELLIDOS" />
        </div>
        <div class="ef-field">
          <label>Correo <span class="ef-req">*</span></label>
          <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" />
        </div>
        <div class="ef-field">
          <label>
            Telefono
            <span v-if="requirePhone" class="ef-req">*</span>
            <span v-else class="ef-optional">(opcional)</span>
          </label>
          <input v-model="form.phone" type="text" placeholder="TELEFONO" />
        </div>
        <div class="ef-field">
          <label>Pais</label>
          <SearchSelect v-model="form.cat_country" :items="catCountries" label-field="description" value-field="id" placeholder="PAIS..." />
        </div>
        <div class="ef-field">
          <label>Perfil <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.client_profile" :items="clientProfileOptions" label-field="label" value-field="id" placeholder="Profesional / Estudiante..." />
        </div>
      </div>
    </div>

    <!-- PROGRAMA Y EDICION -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-graduation-cap"></i> PROGRAMA Y EDICION</h6>
      <div class="ef-grid-4">
        <div class="ef-field">
          <label>Categoria <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_program_type" :items="catProgramType" label-field="description" value-field="id" placeholder="Curso, PEE, Diplomado..." @update:modelValue="onProgramTypeChange" />
        </div>
        <div class="ef-field">
          <label>Programa <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.program_version_id" :items="programsList" label-field="label" value-field="program_version_id" placeholder="Buscar programa..." :disabled="!form.cat_program_type" :external-loading="loadingPrograms" @update:modelValue="onProgramChange" />
        </div>
        <div class="ef-field">
          <label>Edicion <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.program_edition_id" :items="editionsList" label-field="label" value-field="id" placeholder="Seleccionar edicion..." :disabled="!form.program_version_id" :external-loading="loadingEditions" @update:modelValue="onEditionChange" />
        </div>
        <div class="ef-field">
          <label>Modalidad</label>
          <SearchSelect v-model="form.cat_insc_modality" :items="catInscModality" label-field="description" value-field="id" placeholder="MODALIDAD..." />
        </div>
      </div>
    </div>

    <!-- INFORMACION DE PAGO -->
    <div class="ef-card" v-if="!isB2BDocumental">
      <h6 class="ef-section-title"><i class="fa-solid fa-credit-card"></i> INFORMACION DE PAGO</h6>
      <div class="ef-grid-4">
        <div class="ef-field">
          <label>Moneda</label>
          <SearchSelect v-model="form.cat_currency" :items="catCurrency" label-field="description" value-field="id" placeholder="MONEDA..." />
        </div>
        <div class="ef-field">
          <label>Forma de Pago <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_payment_way" :items="catPaymentWay" label-field="description" value-field="id" placeholder="CONTADO / CUOTAS..." />
        </div>
        <div class="ef-field">
          <label>Precio Base</label>
          <div class="ef-price-base">{{ currencySymbol }} {{ formatMoney(calculatedBasePrice) }}</div>
        </div>
      </div>
      <div class="ef-grid-4" style="margin-top:16px">
        <div class="ef-field">
          <label>Precio Lista</label>
          <input v-model.number="form.list_price" type="number" placeholder="0.00" :disabled="form.is_scholarship" />
        </div>
        <div class="ef-field">
          <label>Monto Total</label>
          <input v-model.number="form.total_amount" type="number" placeholder="0.00" :disabled="form.is_scholarship" />
        </div>
        <div class="ef-field" style="justify-content:flex-end">
          <label class="ef-checkbox-label">
            <input type="checkbox" v-model="form.is_scholarship" @change="onScholarshipToggle" />
            <span>Beca (sin pago)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- DATOS DEL PAGO -->
    <div class="ef-card" v-if="!form.is_scholarship && !isB2BDocumental">
      <h6 class="ef-section-title"><i class="fa-solid fa-money-check-dollar"></i> DATOS DEL PAGO</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Medio de Pago</label>
          <SearchSelect v-model="form.cat_payment_medium" :items="catPaymentMedium" label-field="description" value-field="id" placeholder="Transferencia, Yape..." />
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <SearchSelect v-model="form.cat_business_entity" :items="catBusinessEntity" label-field="description" value-field="id" placeholder="Seleccionar..." @update:modelValue="form.bank_account_id = null" />
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <select v-model="form.bank_account_id" class="ef-input" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredBankAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
      </div>
      <div class="ef-grid-3" style="margin-top:16px">
        <div class="ef-field">
          <label>N. Operacion</label>
          <input v-model="form.transaction_code" type="text" placeholder="Numero de operacion" />
        </div>
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <BaseDatePicker v-model="form.payment_date" placeholder="dd/mm/aaaa" class="ef-datepicker" />
        </div>
      </div>
    </div>

    <!-- PLAN DE CUOTAS -->
    <div class="ef-card" v-if="isInstallment && !form.is_scholarship && !isB2BDocumental">
      <h6 class="ef-section-title"><i class="fa-solid fa-calendar-days"></i> PLAN DE CUOTAS</h6>

      <div class="ef-grid-3" style="margin-bottom:16px">
        <div class="ef-field">
          <label>Pago Inicial (Reserva)</label>
          <input v-model.number="form.saved_money" type="number" step="0.01" class="ef-input" placeholder="0.00" />
        </div>
        <div class="ef-field">
          <label>Saldo a Financiar</label>
          <div class="ef-readonly">S/. {{ formatMoney(installmentRemainder) }}</div>
        </div>
        <div class="ef-field">
          <label>N. Cuotas</label>
          <input v-model.number="numCuotas" type="number" min="1" max="12" class="ef-input" @change="generateInstallments" />
        </div>
      </div>

      <table class="ef-table" style="width:100%">
        <thead>
          <tr>
            <th style="width:40px">N</th>
            <th>Monto</th>
            <th>Vencimiento</th>
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, idx) in installments" :key="idx">
            <td class="tc fw700">{{ idx + 1 }}</td>
            <td><input v-model.number="c.amount" type="number" step="0.01" class="ef-input" placeholder="0.00" /></td>
            <td><BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="ef-datepicker" /></td>
            <td class="tc"><button class="ef-btn-del" @click="installments.splice(idx,1)"><i class="fa-solid fa-trash-can"></i></button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding:12px 0">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <button class="ef-btn-outline" style="font-size:12px" @click="addInstallment">+ Agregar Cuota</button>
                <div>
                  <span style="font-size:12px;color:#737373;margin-right:8px">Total cuotas:</span>
                  <span class="fw700" :style="{ color: installmentValid ? '#059669' : '#DC2626' }">S/. {{ formatMoney(installmentSum) }}</span>
                  <span v-if="!installmentValid" style="font-size:11px;color:#DC2626;margin-left:8px">
                    (debe ser S/. {{ formatMoney(installmentRemainder) }})
                  </span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- COMPROBANTE DE PAGO -->
    <div class="ef-card" v-if="!form.is_scholarship && !isB2BDocumental">
      <h6 class="ef-section-title"><i class="fa-solid fa-cloud-arrow-up"></i> COMPROBANTE DE PAGO</h6>
      <MultiFileUploader
        v-model="form.ticket_payment_urls"
        label="Clic para subir Comprobante(s)"
        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
        :required="false"
        :minFiles="0"
      />
    </div>

    <!-- OBSERVACIONES -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-message"></i> OBSERVACIONES</h6>
      <div class="ef-field">
        <textarea v-model="form.observations" rows="3" placeholder="Notas internas de FICO"></textarea>
      </div>
    </div>

    <!-- GUARDAR -->
    <div class="ef-footer-actions">
      <button class="ef-btn-outline" @click="goBack">Cancelar</button>
      <button class="ef-btn-primary" :disabled="saving" @click="handleSave">
        {{ saving ? 'Guardando...' : 'Guardar inscripcion' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'

const router = useRouter()
const toast = useToast()
const catalog = inject('catalog')
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const ficoService = inject(ServiceKeys.Fico)

const authService = inject(ServiceKeys.Auth)
const customerService = inject(ServiceKeys.Customer)

const saving = ref(false)
const searchingCustomer = ref(false)
const loadingPrograms = ref(false)
const loadingEditions = ref(false)
const programsList = ref([])
const editionsList = ref([])
const installments = ref([])
const agentsList = ref([])
const numCuotas = ref(1)
const editionStartDate = ref(null)
const programSessions = ref(0)
const programSessionsPerWeek = ref(1)
const allBankAccounts = ref([])

const programPrices = reactive({
  student_soles: 0, student_dollars: 0,
  profesional_soles: 0, profesional_dollars: 0
})

const catDocTypes = catalog.options('we_type_document')
const catCountries = catalog.options('we_country')
const catCurrency = catalog.options('we_currency', {
  mapItem: x => ({
    id: x.id,
    description: `${x.abbreviation || x.code || ''} (${x.prefix || x.symbol || ''})`,
    alias: x.alias
  })
})
const catInscModality = catalog.options('we_insc_modality')
const catPaymentWay = catalog.options('we_payment_way')
const catPaymentChannel = catalog.options('we_payment_channel')
const catProgramType = catalog.options('we_program_type')
const catPaymentMedium = catalog.options('we_payment_medium')
const catBusinessEntity = catalog.options('we_business_entity')
const catB2BDoctype = catalog.options('we_enrollment_b2b_doctype')

const channelGeneral = computed(() => catPaymentChannel.find(c => c.alias === 'we_channel_general'))

const form = reactive({
  cat_type_document: null,
  document_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  cat_country: null,
  cat_program_type: null,
  program_version_id: null,
  program_edition_id: null,
  cat_insc_modality: null,
  cat_currency: null,
  cat_payment_way: null,
  list_price: 0,
  total_amount: 0,
  saved_money: 0,
  is_scholarship: false,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  payment_date: '',
  client_profile: '',
  agent_category: '',
  seller_agent_id: null,
  cat_b2b_doctype: null,
  ticket_payment_urls: [],
  observations: ''
})

const isB2BDocumental = computed(() => {
  return form.agent_category === 'b2b' && !form.seller_agent_id && !!form.cat_b2b_doctype
})

watch(() => form.seller_agent_id, (val) => {
  if (val) form.cat_b2b_doctype = null
})

const docConfig = computed(() => {
  const selected = catDocTypes.find(item => item.id === form.cat_type_document)
  const alias = selected?.alias || ''
  const maxLength = selected?.variable_1 ? Number(selected.variable_1) : 15
  const isNumeric = ['we_type_document_dni', 'we_type_document_ruc'].includes(alias)
  return { maxLength, isNumeric, alias }
})

watch(() => form.cat_type_document, () => {
  if (!form.cat_type_document) {
    form.document_number = ''
    return
  }
  if (!form.document_number) return
  if (docConfig.value.maxLength && form.document_number.length > docConfig.value.maxLength) {
    form.document_number = form.document_number.slice(0, docConfig.value.maxLength)
  }
  if (docConfig.value.isNumeric) {
    form.document_number = form.document_number.replace(/\D/g, '')
  }
})

const isInstallment = computed(() => {
  const sel = catPaymentWay.find(c => c.id === form.cat_payment_way)
  return sel?.alias === 'we_payment_way_installments'
})

const programTypeAlias = computed(() => {
  const sel = catProgramType.find(c => c.id === form.cat_program_type)
  return sel?.alias || ''
})

const filteredBankAccounts = computed(() => {
  if (!form.cat_business_entity) return []
  return allBankAccounts.value.filter(a => a.business_entity_catalog_id === form.cat_business_entity)
})

const currencyAlias = computed(() => {
  const sel = catCurrency.find(c => c.id === form.cat_currency)
  return sel?.alias || ''
})

const currencySymbol = computed(() => {
  return currencyAlias.value === 'we_currency_usd' ? '$' : 'S/.'
})

const calculatedBasePrice = computed(() => {
  if (!form.cat_currency) return 0
  const isUSD = currencyAlias.value === 'we_currency_usd'
  const profile = form.client_profile

  if (profile === 'estudiante') {
    return isUSD ? programPrices.student_dollars : programPrices.student_soles
  }
  const pro = isUSD ? programPrices.profesional_dollars : programPrices.profesional_soles
  if (pro > 0) return pro
  return isUSD ? programPrices.student_dollars : programPrices.student_soles
})

watch(calculatedBasePrice, (price) => {
  if (price > 0) {
    form.list_price = price
    form.total_amount = price
  }
})

const autoNumCuotas = computed(() => {
  const type = programTypeAlias.value
  const spw = programSessionsPerWeek.value || 1
  if (['we_program_type_course', 'we_program_type_minicourse'].includes(type)) return 1
  if (type === 'we_program_type_pee') return spw >= 2 ? 2 : 3
  if (type === 'we_program_type_diploma') return spw >= 2 ? 4 : 5
  if (type === 'we_program_type_specialization') return spw >= 2 ? 2 : 3
  return 1
})

function autoGenerateInstallments () {
  if (!isInstallment.value || !form.total_amount) return
  const n = autoNumCuotas.value
  numCuotas.value = n
  const remainder = Math.max(0, (form.total_amount || 0) - (form.saved_money || 0))
  if (remainder <= 0) return

  const perCuota = Math.floor((remainder / n) * 100) / 100
  const last = Math.round((remainder - perCuota * (n - 1)) * 100) / 100
  const start = editionStartDate.value || new Date()

  installments.value = []
  for (let i = 0; i < n; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i + 1)
    d.setDate(15)
    installments.value.push({
      due_date: d.toISOString().slice(0, 10),
      amount: i === n - 1 ? last : perCuota
    })
  }
}

watch(() => form.cat_payment_way, () => {
  if (isInstallment.value && form.total_amount > 0) autoGenerateInstallments()
  if (!isInstallment.value) installments.value = []
})

watch(() => form.total_amount, () => {
  if (isInstallment.value && form.total_amount > 0) autoGenerateInstallments()
})

onMounted(async () => {
  await Promise.all([loadAgents(), loadBankAccounts()])
  const pen = catCurrency.find(c => c.alias === 'we_currency_soles' || c.description?.toLowerCase().includes('pen'))
  if (pen) form.cat_currency = pen.id
  const dni = catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))
  if (dni) form.cat_type_document = dni.id
})

async function loadBankAccounts () {
  try {
    allBankAccounts.value = await ficoService.getBankAccounts() || []
  } catch (e) { console.error(e) }
}

async function loadPrograms () {
  loadingPrograms.value = true
  try {
    const items = await programService.programVersionCaller({
      active: 'Y',
      cat_type_program: form.cat_program_type || null
    })
    programsList.value = (items || []).map(p => ({
      ...p,
      label: `${p.abbreviation || ''} — ${p.version_code || ''}`
    }))
  } catch (e) { console.error(e) }
  finally { loadingPrograms.value = false }
}

function onProgramTypeChange () {
  form.program_version_id = null
  form.program_edition_id = null
  editionsList.value = []
  programsList.value = []
  if (form.cat_program_type) loadPrograms()
}

async function onProgramChange () {
  form.program_edition_id = null
  editionsList.value = []
  if (!form.program_version_id) return

  const prog = programsList.value.find(p => p.program_version_id === form.program_version_id)
  if (prog) {
    programPrices.student_soles = Number(prog.price_student_soles || 0)
    programPrices.student_dollars = Number(prog.price_student_dollars || 0)
    programPrices.profesional_soles = Number(prog.price_profesional_soles || 0)
    programPrices.profesional_dollars = Number(prog.price_profesional_dollars || 0)
    programSessions.value = Number(prog.sessions || 0)
    programSessionsPerWeek.value = Number(prog.sessions_per_week || 1)
  }

  loadingEditions.value = true
  try {
    const items = await editionService.editionCaller({ program_version_id: form.program_version_id })
    const hoy = new Date()
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    desde.setHours(0, 0, 0, 0)

    editionsList.value = (items || [])
      .filter(e => {
        if (!e.start_date) return true
        return new Date(e.start_date) >= desde
      })
      .sort((a, b) => {
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return new Date(a.start_date) - new Date(b.start_date)
      })
      .map(e => ({
        ...e,
        id: e.edition_num_id || e.id,
        label: `${e.global_code || e.edition_code || ''} — ${e.start_date ? new Date(e.start_date).toLocaleDateString('es-PE') : ''}`
      }))
  } catch (e) { console.error('[EnrollmentForm] editionCaller error:', e) }
  finally { loadingEditions.value = false }
}

function onEditionChange () {
  const ed = editionsList.value.find(e => e.id === form.program_edition_id)
  if (!ed) return

  editionStartDate.value = ed.start_date ? new Date(ed.start_date) : null

  if (ed.start_date && ed.end_date) {
    const inicio = new Date(ed.start_date)
    const fin = new Date(ed.end_date)
    const semanas = Math.max(1, Math.round((fin - inicio) / (7 * 24 * 60 * 60 * 1000)))
    if (programSessions.value > 0) {
      programSessionsPerWeek.value = Math.max(1, Math.round(programSessions.value / semanas))
    }
  }

  autoGenerateInstallments()
}

async function loadAgents () {
  try {
    const users = await authService.userList({})
    agentsList.value = (users || []).map(u => ({
      id: u.user_id,
      alias: u.alias || '',
      label: `${u.alias || ''} - ${(u.first_name || u.name || '').trim()}`,
      isAgent: true
    }))
  } catch (e) { console.error(e) }
}

const agentCategoryOptions = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'b2b', label: 'B2B' },
  { id: 'web', label: 'WEB' },
  { id: 'we', label: 'WE' },
  { id: 'sa', label: 'S/A' }
]

const weAreaOptions = [
  { id: 'twe', label: 'TWE - Talento' },
  { id: 'fwe', label: 'FWE - Fundacion' }
]

const clientProfileOptions = [
  { id: 'profesional', label: 'Profesional' },
  { id: 'estudiante', label: 'Estudiante' }
]

const B2B_HARDCODED_AGENTS = [
  { id: 'NY12-B2B', label: 'NY12 - B2B', isHardcoded: true },
  { id: 'MC40-B2B', label: 'MC40 - B2B', isHardcoded: true },
  { id: 'JF39-B2B', label: 'JF39 - B2B', isHardcoded: true }
]

const b2bAgentsList = computed(() => {
  const hardcodedAliases = new Set(B2B_HARDCODED_AGENTS.map(h => h.id.split('-')[0].toUpperCase()))
  const reales = agentsList.value
    .filter(a => !hardcodedAliases.has((a.alias || '').toUpperCase()))
    .map(a => ({ id: a.id, label: `${a.alias || ''} - B2B`, isHardcoded: false }))
  return [...reales, ...B2B_HARDCODED_AGENTS]
})

const webAgentsList = computed(() => {
  return agentsList.value.map(a => ({
    id: a.id,
    label: `${a.alias || ''} - WEB`,
    isHardcoded: false
  }))
})

function onScholarshipToggle () {
  if (form.is_scholarship) {
    form.total_amount = 0
    form.saved_money = 0
    form.cat_payment_way = null
    form.cat_payment_medium = null
    form.cat_business_entity = null
    form.bank_account_id = null
    form.transaction_code = ''
    form.ticket_payment_urls = []
    installments.value = []
  } else if (calculatedBasePrice.value > 0) {
    form.total_amount = calculatedBasePrice.value
    form.list_price = calculatedBasePrice.value
  }
}

function onDocumentInput () {
  if (docConfig.value.isNumeric) {
    form.document_number = form.document_number.replace(/\D/g, '')
  }
  form.document_number = form.document_number.toUpperCase().slice(0, docConfig.value.maxLength)
}

async function searchCustomerByDocument () {
  const doc = form.document_number?.trim()
  if (!doc || doc.length < 3) {
    toast.warning('Ingrese el numero de documento antes de buscar.')
    return
  }
  searchingCustomer.value = true
  try {
    const response = await customerService.customerInfoGet({ document: doc })
    if (response && response.result === 1) {
      form.first_name = response.first_name || ''
      form.last_name = response.last_name || ''
      if (response.mother_last_name) form.last_name += ' ' + response.mother_last_name
      form.email = response.email || ''
      form.phone = response.phone || form.phone
      toast.success('Cliente encontrado en base de datos.')
      return
    }
    if (docConfig.value.isNumeric) await searchSunat()
    else toast.info('No se encontro cliente con ese documento.')
  } catch (err) {
    console.error('[searchCustomer]', err)
    if (docConfig.value.isNumeric) await searchSunat()
    else toast.info('No se encontro cliente con ese documento.')
  } finally {
    searchingCustomer.value = false
  }
}

async function searchSunat () {
  const doc = form.document_number?.trim()
  if (!doc) return
  try {
    const sunatData = await customerService.sunatGet({ document: doc })
    if (sunatData && sunatData.nombre_o_razon_social) {
      const fullName = sunatData.nombre_o_razon_social.trim()
      const parts = fullName.split(' ')
      if (doc.length === 8 && parts.length >= 3) {
        form.last_name = parts.slice(0, 2).join(' ')
        form.first_name = parts.slice(2).join(' ')
      } else {
        form.first_name = fullName
        form.last_name = ''
      }
      toast.info('Datos de SUNAT encontrados y precargados.')
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.')
    }
  } catch (err) {
    console.error('[searchSunat]', err)
    toast.info('No se pudo consultar SUNAT.')
  }
}

const requireDocument = computed(() => {
  return !['b2b', 'web'].includes(form.agent_category)
})

const requirePhone = computed(() => {
  return form.agent_category !== 'b2b'
})

function resolveAgentId () {
  const cat = form.agent_category
  if (['sa', 'we'].includes(cat)) return null
  const val = form.seller_agent_id
  if (typeof val === 'string') return null
  return Number(val) || null
}

function resolveAgentCode () {
  const val = form.seller_agent_id
  return typeof val === 'string' && val ? val : null
}

function resolveAgentOrigin () {
  const cat = form.agent_category
  if (cat === 'b2b') return 'B2B'
  if (cat === 'web') return 'WEB'
  if (cat === 'we') return 'WE'
  if (cat === 'sa') return 'SA'
  return null
}

function buildObservationsWithAgentCode () {
  const parts = []
  if (form.observations?.trim()) parts.push(form.observations.trim())
  const code = resolveAgentCode()
  if (code) parts.push(`[Asesor: ${code}]`)
  return parts.length ? parts.join(' — ') : null
}

const installmentRemainder = computed(() => {
  return Math.max(0, (form.total_amount || 0) - (form.saved_money || 0))
})

const installmentSum = computed(() => {
  return installments.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
})

const installmentValid = computed(() => {
  return Math.abs(installmentSum.value - installmentRemainder.value) < 0.01
})

function generateInstallments () {
  const n = numCuotas.value || 1
  const remainder = installmentRemainder.value
  const perCuota = Math.floor((remainder / n) * 100) / 100
  const last = Math.round((remainder - perCuota * (n - 1)) * 100) / 100

  installments.value = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() + i + 1)
    installments.value.push({
      due_date: d.toISOString().slice(0, 10),
      amount: i === n - 1 ? last : perCuota
    })
  }
}

function formatMoney (v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addInstallment () {
  const remaining = installmentRemainder.value - installmentSum.value
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + installments.value.length + 1)
  installments.value.push({
    due_date: nextMonth.toISOString().slice(0, 10),
    amount: Math.max(0, Math.round(remaining * 100) / 100)
  })
}

function validate () {
  if (!form.agent_category) { toast.error('Selecciona una categoria de asesor.'); return false }
  if (form.agent_category === 'comercial' && !form.seller_agent_id) {
    toast.error('Selecciona un asesor comercial.'); return false
  }
  if (form.agent_category === 'we' && !form.seller_agent_id) {
    toast.error('Selecciona el area WE (TWE/FWE).'); return false
  }
  if (requireDocument.value) {
    if (!form.document_number.trim()) { toast.error('Ingresa el numero de documento.'); return false }
    if (docConfig.value.isNumeric && form.document_number.length !== docConfig.value.maxLength) {
      toast.error(`El documento debe tener exactamente ${docConfig.value.maxLength} digitos.`); return false
    }
  }
  if (!form.first_name.trim()) { toast.error('Ingresa los nombres.'); return false }
  if (!form.last_name.trim()) { toast.error('Ingresa los apellidos.'); return false }
  if (!form.email.trim()) { toast.error('Ingresa el correo.'); return false }
  if (requirePhone.value && !form.phone.trim()) { toast.error('Ingresa el telefono.'); return false }
  if (!form.program_version_id) { toast.error('Selecciona un programa.'); return false }
  if (!form.client_profile) { toast.error('Selecciona un perfil (Profesional/Estudiante).'); return false }
  if (!isB2BDocumental.value && !form.is_scholarship && isInstallment.value && installments.value.length > 0 && !installmentValid.value) {
    toast.error('El total de cuotas no coincide con el saldo a financiar.'); return false
  }
  return true
}

async function handleSave () {
  if (saving.value || !validate()) return
  saving.value = true
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const payload = {
      user_id: currentUser.user_id || currentUser.id || null,
      inscription: {
        document_number: form.document_number?.trim() || null,
        cat_type_document: form.document_number?.trim() ? form.cat_type_document : null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        cat_country: form.cat_country,
        program_version_id: form.program_version_id,
        program_edition_id: form.program_edition_id,
        cat_insc_modality: form.cat_insc_modality,
        cat_payment_channel: channelGeneral.value?.id || null,
        cat_currency: form.cat_currency || catCurrency.find(c => c.alias === 'we_currency_soles')?.id || null,
        cat_payment_way: form.cat_payment_way || catPaymentWay.find(c => c.alias === 'we_payment_way_single')?.id || null,
        list_price: form.list_price || 0,
        total_amount: form.total_amount || 0,
        saved_money: form.saved_money || 0,
        seller_agent_id: resolveAgentId(),
        agent_origin: resolveAgentOrigin(),
        client_profile: form.client_profile || null,
        is_scholarship: form.is_scholarship || false,
        cat_b2b_doctype: isB2BDocumental.value ? form.cat_b2b_doctype : null,
        cat_payment_medium: (form.is_scholarship || isB2BDocumental.value) ? null : form.cat_payment_medium,
        cat_business_entity: form.cat_business_entity,
        bank_account_id: form.bank_account_id,
        transaction_code: form.transaction_code || null,
        payment_date: form.payment_date || null,
        ticket_payment_urls: form.ticket_payment_urls.length > 0 ? form.ticket_payment_urls : null,
        observations: buildObservationsWithAgentCode(),
        installment_plan: isInstallment.value && installments.value.length > 0
          ? installments.value.map((c, i) => ({ installment_number: i + 1, amount: c.amount, due_date: c.due_date }))
          : null
      }
    }

    const resp = await ficoService.enrollmentRegister(payload)

    if (resp?.result === 1) {
      toast.success(resp.message || 'Inscripcion registrada correctamente.')
      router.push({ name: 'enrollment' })
    } else {
      toast.error(resp?.message || resp?.error || 'Error al registrar la inscripcion.')
    }
  } catch (err) {
    console.error('[handleSave]', err)
    const msg = err?.response?.data?.error || err?.message || 'Error al guardar la inscripcion.'
    toast.error(msg)
  } finally { saving.value = false }
}

function resetForm () {
  Object.assign(form, {
    cat_type_document: catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))?.id || null,
    document_number: '', first_name: '', last_name: '', email: '', phone: '',
    cat_country: null, cat_program_type: null, program_version_id: null, program_edition_id: null,
    cat_insc_modality: null, cat_payment_way: null, list_price: 0, total_amount: 0, saved_money: 0, is_scholarship: false,
    cat_payment_medium: null, cat_business_entity: null, bank_account_id: null, transaction_code: '', payment_date: '',
    client_profile: '', agent_category: '', seller_agent_id: null, ticket_payment_urls: [], observations: ''
  })
  installments.value = []
  editionsList.value = []
}

function goBack () { router.back() }
</script>

<style scoped>
.ef-page {
  background: #FFFFFF;
  padding: 32px 32px 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1A1A1A;
  min-height: 100vh;
}

.ef-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}

.ef-page-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ef-breadcrumb {
  font-size: 11px;
  color: #A3A3A3;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
}

.ef-page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  letter-spacing: -0.02em;
}

.ef-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ef-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #1A1A1A;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.ef-btn-primary:hover { background: #333; }
.ef-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.ef-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  transition: all .2s ease;
  font-family: inherit;
}
.ef-btn-outline:hover { border-color: #D4D4D4; color: #1A1A1A; }

.ef-btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.ef-card {
  background: #fff;
  border: 1px solid #F0F0F0;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
}

.ef-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #8C8C8C;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 20px 0;
  padding-left: 12px;
  border-left: 3px solid #1A1A1A;
  line-height: 1.4;
}
.ef-section-title i {
  margin-right: 6px;
  font-size: 11px;
}

.ef-section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
}
.ef-section-header-row .ef-section-title {
  margin-bottom: 0;
}

.ef-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.ef-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.ef-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

.ef-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ef-field label {
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ef-field input,
.ef-field select,
.ef-field textarea {
  height: 38px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  padding: 0 12px;
  color: #1A1A1A;
  background: #fff;
  font-family: inherit;
  transition: border-color .2s ease;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.ef-field input:focus,
.ef-field select:focus,
.ef-field textarea:focus {
  border-color: #A3A3A3;
}

.ef-field textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
  min-height: 72px;
}

.ef-field input[type="number"] {
  -moz-appearance: textfield;
}
.ef-field input[type="number"]::-webkit-inner-spin-button,
.ef-field input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ef-req {
  color: #DC2626;
  font-weight: 700;
}

.ef-optional {
  color: #A3A3A3;
  font-weight: 400;
  font-size: 10px;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 4px;
}

.ef-b2b-note {
  margin-top: 16px;
  padding: 10px 14px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  color: #1E40AF;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ef-b2b-note i {
  color: #2563EB;
  font-size: 13px;
}

.ef-cuotas-table {
  margin-top: 16px;
}

.ef-cuotas-head {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 50px;
  gap: 12px;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #8C8C8C;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-bottom: 10px;
  border-bottom: 1px solid #F0F0F0;
}

.ef-cuotas-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 50px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #FAFAFA;
}
.ef-cuotas-row input {
  height: 34px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  padding: 0 10px;
  color: #1A1A1A;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.ef-cuotas-row input:focus {
  border-color: #A3A3A3;
}

.ef-cuota-idx {
  font-size: 12px;
  font-weight: 600;
  color: #8C8C8C;
  text-align: center;
}

.ef-cuota-actions {
  display: flex;
  justify-content: center;
}

.ef-btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #F0F0F0;
  border-radius: 6px;
  background: #fff;
  color: #A3A3A3;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 12px;
}
.ef-btn-del:hover {
  border-color: #DC2626;
  color: #DC2626;
  background: #FEF2F2;
}

.ef-empty {
  color: #A3A3A3;
  font-size: 13px;
  padding: 16px 0 0;
}

.ef-datepicker {
  width: 100%;
}

.ef-readonly {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  background: #FAFAFA;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
}

.ef-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ef-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid #F0F0F0;
}
.ef-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
}

.ef-input-with-btn {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ef-input-with-btn input {
  flex: 1;
}

.ef-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: #fff;
  color: #1A1A1A;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 13px;
}
.ef-search-btn:hover { border-color: #A3A3A3; background: #FAFAFA; }
.ef-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ef-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
  height: 38px;
  padding: 0 12px;
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 8px;
  transition: all .2s ease;
  user-select: none;
}
.ef-checkbox-label:has(input:checked) {
  background: #FEF3C7;
  border-color: #FCD34D;
  color: #92400E;
}
.ef-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #D97706;
  cursor: pointer;
}

.ef-price-base {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #059669;
  background: #ECFDF5;
  border: 1px solid #D1FAE5;
  border-radius: 8px;
}

.ef-hint-warn {
  font-size: 11px;
  font-weight: 500;
  color: #D97706;
  margin-top: 2px;
}

.ef-footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 24px 0 8px;
}

.tc { text-align: center; }
.fw700 { font-weight: 700; }

@media (max-width: 900px) {
  .ef-grid-3, .ef-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ef-page { padding: 20px 16px; }
  .ef-grid-2, .ef-grid-3, .ef-grid-4 { grid-template-columns: 1fr; }
  .ef-page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .ef-cuotas-head, .ef-cuotas-row { grid-template-columns: 30px 1fr 1fr 40px; gap: 8px; }
}
</style>
