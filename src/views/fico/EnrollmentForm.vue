<template>
  <div class="container-fluid px-3 py-3 fico-form">
    <div class="card shadow-sm border-0">

      <!-- HEADER -->
      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">FICO — Registro de Inscripción</div>
          <small class="text-muted">Registro directo por Finanzas (sin lead)</small>
        </div>

        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" @click="resetForm">
            Limpiar
          </button>
          <button type="button" class="btn btn-primary fw-bold" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar inscripción' }}
          </button>
        </div>
      </div>

      <!-- BODY -->
      <div class="card-body pt-4 pb-4">

        <!-- A. CLIENTE -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del cliente</span>
            <span class="form-section__note">Persona que será matriculada</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-2">
              <label class="form-label mb-1">Tipo doc<span class="required-star">*</span></label>
              <SearchSelect v-model="person.cat_type_document" :items="docTypes" label-field="description" value-field="alias" required placeholder="DOC..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Nro. doc<span class="required-star">*</span></label>
              <input v-model="person.document_number" type="text" class="form-control" required placeholder="DNI / CE / Pasaporte" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Nombres<span class="required-star">*</span></label>
              <input v-model="person.first_name" type="text" class="form-control" required placeholder="NOMBRES" />
            </div>
            <div class="col-md-4">
              <label class="form-label mb-1">Apellidos<span class="required-star">*</span></label>
              <input v-model="person.last_name" type="text" class="form-control" required placeholder="APELLIDOS" />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Correo<span class="required-star">*</span></label>
              <input v-model="person.email" type="email" class="form-control" required placeholder="CORREO" />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Teléfono / WhatsApp<span class="required-star">*</span></label>
              <input v-model="person.phone" type="text" class="form-control" required placeholder="TELÉFONO" />
            </div>
            <div class="col-md-2">
              <label class="form-label mb-1">País<span class="required-star">*</span></label>
              <SearchSelect v-model="person.cat_country" :items="countries" label-field="description" value-field="alias" required placeholder="PAÍS..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Ocupación</label>
              <SearchSelect v-model="person.cat_occupation" :items="occupations" label-field="description" value-field="alias" placeholder="OCUPACIÓN..." />
            </div>
          </div>
        </section>

        <!-- B. FACTURACIÓN (opcional / Boleta o Factura) -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos de facturación (opcional)</span>
            <span class="form-section__note">Para emisión de comprobante</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">Tipo de comprobante</label>
              <SearchSelect v-model="billing.type" :items="invoiceTypes" label-field="description" value-field="alias" placeholder="BOLETA / FACTURA..." />
            </div>

            <template v-if="billing.type === 'FACTURA'">
              <div class="col-md-3">
                <label class="form-label mb-1">RUC</label>
                <input v-model="billing.ruc" type="text" class="form-control" placeholder="RUC" />
              </div>
              <div class="col-md-6">
                <label class="form-label mb-1">Razón social</label>
                <input v-model="billing.razon_social" type="text" class="form-control" placeholder="RAZÓN SOCIAL" />
              </div>
              <div class="col-md-6">
                <label class="form-label mb-1">Dirección fiscal</label>
                <input v-model="billing.address" type="text" class="form-control" placeholder="DIRECCIÓN" />
              </div>
              <div class="col-md-3">
                <label class="form-label mb-1">Correo de facturación</label>
                <input v-model="billing.email" type="email" class="form-control" placeholder="EMAIL FACTURACIÓN" />
              </div>
            </template>

            <template v-else-if="billing.type === 'BOLETA'">
              <div class="col-md-3">
                <label class="form-label mb-1">Doc. identidad</label>
                <input v-model="billing.doc" type="text" class="form-control" placeholder="DNI / CE" />
              </div>
              <div class="col-md-6">
                <label class="form-label mb-1">Nombres y apellidos</label>
                <input v-model="billing.fullname" type="text" class="form-control" placeholder="NOMBRES Y APELLIDOS" />
              </div>
              <div class="col-md-3">
                <label class="form-label mb-1">Correo</label>
                <input v-model="billing.email" type="email" class="form-control" placeholder="EMAIL" />
              </div>
            </template>
          </div>
        </section>

        <!-- C. PROGRAMA Y EDICIÓN -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Programa y edición</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-4">
              <label class="form-label mb-1">Programa<span class="required-star">*</span></label>
              <SearchSelect v-model="enrollment.program_id" :items="programs" label-field="description" value-field="id" required placeholder="PROGRAMA..." />
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1">Edición / Cohorte<span class="required-star">*</span></label>
              <SearchSelect v-model="enrollment.program_edition_id" :items="editions" label-field="description" value-field="id" required placeholder="EDICIÓN..." />
              <div v-if="currentEdition" class="text-label-aux">
                <b>Inicio:</b> {{ currentEdition.start }} · <b>Fin:</b> {{ currentEdition.end }} · <b>Vacantes:</b> {{ currentEdition.vacant }}
              </div>
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">Modalidad</label>
              <SearchSelect v-model="enrollment.modality" :items="modalities" label-field="description" value-field="alias" placeholder="MODALIDAD..." />
            </div>

            <div class="col-md-2">
              <label class="form-label mb-1">Precio lista (S/)</label>
              <input v-model.number="pricing.list_price" type="number" class="form-control" placeholder="0.00" />
            </div>
          </div>
        </section>

        <!-- D. INSCRIPCIÓN -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Estado de inscripción</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">Estado<span class="required-star">*</span></label>
              <SearchSelect v-model="enrollment.cat_type_status" :items="enrollmentStatus" label-field="description" value-field="alias" required placeholder="ESTADO..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Estado certificado</label>
              <SearchSelect v-model="enrollment.cat_certificate_status" :items="certificateStatus" label-field="description" value-field="alias" placeholder="CERTIFICADO..." />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Registro</label>
              <DateTime12 v-model="enrollment.registration_date" clearable />
            </div>
            <div class="col-md-3">
              <label class="form-label mb-1">Contrato B2B</label>
              <SearchSelect v-model="enrollment.b2b_contract_id" :items="b2bContracts" label-field="description" value-field="id" placeholder="(opcional)" />
            </div>
          </div>
        </section>

        <!-- E. DESCUENTOS / PROMOS -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Descuentos y promociones</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-3">
              <label class="form-label mb-1">Descuento (%)</label>
              <input v-model.number="pricing.discount_pct" type="number" min="0" max="100" class="form-control" placeholder="0" />
            </div>
            <div class="col-md-5">
              <label class="form-label mb-1">Aplicar promoción</label>
              <SearchSelect v-model="selectedDiscount" :items="discounts" label-field="description" value-field="id" placeholder="PROMO / CUPÓN..." />
              <div v-if="selectedDiscount" class="small text-muted mt-1">
                Valor: {{ discounts.find(d => d.id===selectedDiscount)?.value }} ({{ discounts.find(d => d.id===selectedDiscount)?.type }})
                <button class="btn btn-outline btn-sm ms-2" @click="addSelectedDiscount">+ Añadir</button>
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label mb-1 d-block">Promos aplicadas</label>
              <div class="chips">
                <button v-for="d in pricing.applied_discounts" :key="d.id" class="chip" @click="removeDiscount(d.id)">
                  {{ d.description }} <span class="x">×</span>
                </button>
                <span v-if="!pricing.applied_discounts.length" class="muted small">Ninguna</span>
              </div>
            </div>
          </div>
        </section>

        <!-- F. PAGOS -->
        <section class="form-section mb-4">
          <div class="form-section__header d-flex align-items-center justify-content-between">
            <span class="form-section__title">Pagos</span>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm" @click="openPaymentModal">+ Registrar pago</button>
              <button class="btn btn-outline-secondary btn-sm" @click="openInstallmentModal">+ Plan de cuotas</button>
            </div>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-12 pagos-table">
              <div class="pagos-head d-none d-md-grid">
                <div>#</div>
                <div>Fecha</div>
                <div>Monto (S/.)</div>
                <div>Método</div>
                <div>Vía</div>
                <div>Cuenta destino</div>
                <div>Estado liquidación</div>
                <div>Transacción</div>
                <div></div>
              </div>

              <div v-for="(p, idx) in payments" :key="p.uid" class="pagos-row">
                <div class="idx">{{ idx + 1 }}</div>
                <div>{{ p.date }}</div>
                <div>S/ {{ Number(p.amount || 0).toFixed(2) }}</div>
                <div>{{ p.method }}</div>
                <div>{{ p.way }}</div>
                <div>{{ p.account_name }}</div>
                <div>{{ p.settlement }}</div>
                <div class="mono">{{ p.tx }}</div>
                <div class="text-end">
                  <button class="btn btn-outline-danger btn-sm" @click="removePayment(idx)">
                    <i class="fa-solid fa-square-minus"></i>
                  </button>
                </div>
              </div>

              <div v-if="!payments.length" class="muted small">Sin pagos registrados.</div>
            </div>
          </div>
        </section>

        <!-- G. PLAN DE CUOTAS -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Plan de cuotas</span>
            <span class="form-section__note">Opcional si el pago es fraccionado</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-12 cuotas-table">
              <div class="cuotas-head d-none d-md-grid">
                <div>#</div>
                <div>Vence</div>
                <div>Monto (S/.)</div>
                <div>Estado</div>
                <div></div>
              </div>

              <div v-for="(c, idx) in installments" :key="c.uid" class="cuotas-row">
                <div class="idx">{{ idx + 1 }}</div>
                <div>{{ c.due_date }}</div>
                <div>S/ {{ Number(c.amount || 0).toFixed(2) }}</div>
                <div>{{ c.status }}</div>
                <div class="text-end">
                  <button class="btn btn-outline-danger btn-sm" @click="removeInstallment(idx)">
                    <i class="fa-solid fa-square-minus"></i>
                  </button>
                </div>
              </div>

              <div v-if="!installments.length" class="muted small">Sin cuotas configuradas.</div>
            </div>
          </div>
        </section>

        <!-- H. ADJUNTOS -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Adjuntos</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-6">
              <label class="form-label mb-1 d-block">Comprobante / Voucher</label>
              <input ref="adjPagoInput" type="file" class="d-none" @change="onAdjuntarPago" />
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="adjPagoInput?.click()">Seleccionar archivo</button>
              <div v-if="attachments.pagoNombre" class="small text-muted mt-1">{{ attachments.pagoNombre }}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1 d-block">Contrato / Carta</label>
              <input ref="adjContratoInput" type="file" class="d-none" @change="onAdjuntarContrato" />
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="adjContratoInput?.click()">Seleccionar archivo</button>
              <div v-if="attachments.contratoNombre" class="small text-muted mt-1">{{ attachments.contratoNombre }}</div>
            </div>
          </div>
        </section>

        <!-- I. RESUMEN ECONÓMICO -->
        <section class="form-section mb-0 insc-amount-summary">
          <div class="form-section__header">
            <span class="form-section__title">Resumen económico</span>
          </div>

          <div class="amount-grid">
            <div class="amount-item">
              <span class="amount-label">Monto lista</span>
              <span class="amount-value">S/ {{ Number(pricing.list_price || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">DSCT / PROMO</span>
              <span class="amount-value amount-discount">- S/ {{ discountTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">Monto final</span>
              <span class="amount-value amount-final">S/ {{ finalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">Pagado</span>
              <span class="amount-value">S/ {{ paidAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="amount-item amount-final-box">
              <span class="amount-label">Saldo</span>
              <span class="amount-value">S/ {{ balance.toLocaleString('es-PE', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>

          <div class="mt-3">
            <label class="form-label mb-1">Observaciones</label>
            <textarea v-model="enrollment.observations" class="form-control" rows="2" placeholder="Notas internas de FICO"></textarea>
          </div>
        </section>
      </div>

      <!-- FOOTER -->
      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="goBack">
          Cancelar
        </button>
        <button type="button" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar inscripción' }}
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: REGISTRAR PAGO -->
  <BaseModal v-model="showPaymentModal" title="Registrar pago" size="lg">
    <div class="row g-3">
      <div class="col-md-5">
        <label class="form-label mb-1">Fecha</label>
        <DateTime12 v-model="paymentForm.date" />
      </div>
      <div class="col-md-7">
        <label class="form-label mb-1">Monto (S/)</label>
        <input v-model.number="paymentForm.amount" type="number" class="form-control" placeholder="0.00" />
      </div>

      <div class="col-md-4">
        <label class="form-label mb-1">Método</label>
        <SearchSelect v-model="paymentForm.method" :items="paymentMethods" label-field="description" value-field="alias" placeholder="MÉTODO" />
      </div>
      <div class="col-md-4">
        <label class="form-label mb-1">Vía</label>
        <SearchSelect v-model="paymentForm.way" :items="paymentWays" label-field="description" value-field="alias" placeholder="VÍA" />
      </div>
      <div class="col-md-4">
        <label class="form-label mb-1">Cuenta destino</label>
        <SearchSelect v-model="paymentForm.account_id" :items="bankAccounts" label-field="description" value-field="id" placeholder="CUENTA" />
      </div>

      <div class="col-md-6">
        <label class="form-label mb-1">Estado liquidación</label>
        <SearchSelect v-model="paymentForm.settlement" :items="settlementStatus" label-field="description" value-field="alias" placeholder="ESTADO" />
      </div>
      <div class="col-md-6">
        <label class="form-label mb-1">Código de transacción</label>
        <input v-model="paymentForm.tx" type="text" class="form-control" placeholder="OP/ID/Boucher" />
      </div>
    </div>

    <template #footer>
      <button class="btn btn-outline btn-sm" @click="showPaymentModal=false">Cancelar</button>
      <button class="btn btn-primary btn-sm" @click="confirmAddPayment">Añadir pago</button>
    </template>
  </BaseModal>

  <!-- MODAL: PLAN DE CUOTAS -->
  <BaseModal v-model="showInstallmentModal" title="Configurar plan de cuotas" size="lg">
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label mb-1"># Cuotas</label>
        <input v-model.number="installmentForm.count" type="number" min="1" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label mb-1">Monto c/u (S/)</label>
        <input v-model.number="installmentForm.amount" type="number" class="form-control" />
      </div>
      <div class="col-md-4">
        <label class="form-label mb-1">1ra. Vence</label>
        <input v-model="installmentForm.firstDue" type="date" class="form-control" />
      </div>

      <div class="col-12">
        <small class="text-muted">Se generarán cuotas mensuales consecutivas (demo).</small>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-outline btn-sm" @click="showInstallmentModal=false">Cancelar</button>
      <button class="btn btn-primary btn-sm" @click="confirmGenerateInstallments">Generar cuotas</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import SearchSelect from '@/components/SearchSelect.vue'
import DateTime12 from '@/components/DateTime12.vue'
import BaseModal from '@/components/BaseModal.vue'

const router = useRouter()
const saving = ref(false)

/* =========================
   DEMO: Catálogos/Items UI
   ========================= */
const docTypes = [
  { alias:'DNI', description:'DNI' },
  { alias:'CE', description:'Carné de Extranjería' },
  { alias:'PASS', description:'Pasaporte' },
]
const countries = [
  { alias:'PE', description:'Perú' },
  { alias:'CL', description:'Chile' },
  { alias:'CO', description:'Colombia' },
]
const occupations = [
  { alias:'student', description:'Estudiante' },
  { alias:'worker', description:'Profesional' },
  { alias:'other', description:'Otro' },
]
const invoiceTypes = [
  { alias:'BOLETA', description:'Boleta' },
  { alias:'FACTURA', description:'Factura' },
]
const programs = [
  { id: 100, description: 'Power BI Avanzado' },
  { id: 101, description: 'Excel Profesional' },
  { id: 102, description: 'Gestión de Proyectos' },
]
const editions = [
  { id: 5001, description: 'Ed. 2025-11 (Sáb-Dom)', start: '2025-11-12', end:'2025-12-10', vacant: 12, price: 650 },
  { id: 5002, description: 'Ed. 2025-12 (Noches)', start: '2025-12-05', end:'2026-01-12', vacant: 8,  price: 490 },
]
const modalities = [
  { alias:'online', description:'Online' },
  { alias:'live', description:'En vivo' },
  { alias:'in_person', description:'Presencial' },
]
const enrollmentStatus = [
  { alias:'preinscrito', description:'Pre-inscrito' },
  { alias:'inscrito', description:'Inscrito' },
  { alias:'retirado', description:'Retirado' },
]
const certificateStatus = [
  { alias:'pendiente', description:'Pendiente' },
  { alias:'emitido', description:'Emitido' },
]
const b2bContracts = [
  { id: 1, description:'ACME S.A.C. — Convenio 2025' },
  { id: 2, description:'TechCorp — Paquete 15 licencias' },
]
const discounts = [
  { id: 1, description:'Cyber Days 10%', type:'%', value:10 },
  { id: 2, description:'Beca estudiante S/ 100', type:'S/', value:100 },
]
const paymentMethods = [
  { alias:'CONTADO', description:'Contado' },
  { alias:'CUOTAS', description:'Cuotas' },
]
const paymentWays = [
  { alias:'TRANSF', description:'Transferencia' },
  { alias:'TARJETA', description:'Tarjeta' },
  { alias:'EFECTIVO', description:'Efectivo' },
  { alias:'YAPE', description:'Yape' },
]
const settlementStatus = [
  { alias:'pendiente', description:'Pendiente' },
  { alias:'conciliado', description:'Conciliado' },
]
const bankAccounts = [
  { id: 10, description:'BCP — CTA 123-45678901-0-12' },
  { id: 11, description:'BBVA — CTA 0011-2222-3333' },
]

/* =========================
   Estado UI / Form Demo
   ========================= */
const person = reactive({
  cat_type_document: null,
  document_number: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  cat_country: 'PE',
  cat_occupation: null,
})

const billing = reactive({
  type: null, // 'BOLETA' | 'FACTURA'
  ruc: '', razon_social: '', address:'', email: '',
  doc: '', fullname: ''
})

const enrollment = reactive({
  program_id: null,
  program_edition_id: null,
  modality: null,
  registration_date: new Date().toISOString(),
  cat_type_status: 'inscrito',
  cat_certificate_status: 'pendiente',
  b2b_contract_id: null,
  observations: ''
})

const pricing = reactive({
  list_price: 0,
  discount_pct: 0,
  applied_discounts: []
})
const selectedDiscount = ref(null)

const payments = ref([])        // tabla payments
const installments = ref([])    // tabla payment_installments

// Adjuntos
const attachments = reactive({ pagoNombre: '', contratoNombre: '' })
const adjPagoInput = ref(null)
const adjContratoInput = ref(null)

/* ============== Helpers demo ============== */
const currentEdition = computed(() =>
  editions.find(e => e.id === enrollment.program_edition_id) || null
)

function addSelectedDiscount(){
  if(!selectedDiscount.value) return
  const d = discounts.find(x=>x.id===selectedDiscount.value)
  if(!d) return
  if(!pricing.applied_discounts.some(x=>x.id===d.id)){
    pricing.applied_discounts.push({ ...d })
  }
  selectedDiscount.value = null
}
function removeDiscount(id){
  pricing.applied_discounts = pricing.applied_discounts.filter(d=>d.id!==id)
}

/* Totales (demo) */
const discountTotal = computed(()=>{
  const base = Number(pricing.list_price || 0)
  const pct = Math.max(0, Number(pricing.discount_pct || 0))
  const pctAmount = base * (pct/100)

  const promos = pricing.applied_discounts.reduce((acc,d)=>{
    return acc + (d.type === '%' ? base*(d.value/100) : d.value)
  }, 0)

  return Math.min(base, pctAmount + promos)
})
const finalAmount = computed(()=> Math.max(0, Number(pricing.list_price||0) - discountTotal.value))
const paidAmount  = computed(()=> payments.value.reduce((a,b)=> a + Number(b.amount||0), 0))
const balance     = computed(()=> Math.max(0, finalAmount.value - paidAmount.value))

/* Navegación/acciones básicas */
function goBack(){ router.back() }
function resetForm(){
  Object.assign(person, { cat_type_document:null, document_number:'', first_name:'', last_name:'', phone:'', email:'', cat_country:'PE', cat_occupation:null })
  Object.assign(billing, { type:null, ruc:'', razon_social:'', address:'', email:'', doc:'', fullname:'' })
  Object.assign(enrollment, { program_id:null, program_edition_id:null, modality:null, registration_date:new Date().toISOString(), cat_type_status:'inscrito', cat_certificate_status:'pendiente', b2b_contract_id:null, observations:'' })
  Object.assign(pricing, { list_price:0, discount_pct:0, applied_discounts:[] })
  payments.value = []
  installments.value = []
  attachments.pagoNombre = ''
  attachments.contratoNombre = ''
}

/* Adjuntos (demo) */
function onAdjuntarPago(e){
  const file = e.target.files?.[0]
  if(file){ attachments.pagoNombre = file.name }
}
function onAdjuntarContrato(e){
  const file = e.target.files?.[0]
  if(file){ attachments.contratoNombre = file.name }
}

/* =========================
   Modales: Pagos / Cuotas
   ========================= */
const showPaymentModal = ref(false)
const paymentForm = reactive({
  date: new Date().toISOString(),
  amount: null,
  method: null,
  way: null,
  account_id: null,
  settlement: 'pendiente',
  tx: ''
})
function openPaymentModal(){ showPaymentModal.value = true }
function confirmAddPayment(){
  payments.value.push({
    uid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    date: paymentForm.date?.slice(0,16).replace('T',' ') || '',
    amount: paymentForm.amount || 0,
    method: paymentMethods.find(m=>m.alias===paymentForm.method)?.description || paymentForm.method || '—',
    way: paymentWays.find(w=>w.alias===paymentForm.way)?.description || paymentForm.way || '—',
    account_name: bankAccounts.find(a=>a.id===paymentForm.account_id)?.description || '—',
    settlement: settlementStatus.find(s=>s.alias===paymentForm.settlement)?.description || '—',
    tx: paymentForm.tx || ''
  })
  // limpiar form básico
  Object.assign(paymentForm, { date:new Date().toISOString(), amount:null, method:null, way:null, account_id:null, settlement:'pendiente', tx:'' })
  showPaymentModal.value = false
}
function removePayment(idx){ payments.value.splice(idx,1) }

const showInstallmentModal = ref(false)
const installmentForm = reactive({
  count: 3,
  amount: 0,
  firstDue: new Date().toISOString().slice(0,10)
})
function openInstallmentModal(){ showInstallmentModal.value = true }
function confirmGenerateInstallments(){
  installments.value = []
  const n = Math.max(1, Number(installmentForm.count||1))
  for(let i=0;i<n;i++){
    const due = new Date(installmentForm.firstDue)
    due.setMonth(due.getMonth()+i)
    installments.value.push({
      uid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      amount: Number(installmentForm.amount||0),
      due_date: due.toISOString().slice(0,10),
      status: 'Pendiente'
    })
  }
  showInstallmentModal.value = false
}
function removeInstallment(idx){ installments.value.splice(idx,1) }
</script>

<style scoped>
.fico-form { font-size: 0.95rem; color: #111827; }

/* Header */
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }

/* Form sections */
.form-section { background:#fff; }
.form-section__header {
  display:flex; flex-wrap:wrap; align-items:center; gap:.5rem .75rem;
  margin-bottom:1rem; position:relative; padding-left:.75rem; min-height:1.25rem;
}
.form-section__header::before {
  content:""; position:absolute; left:0; top:.15rem; bottom:.15rem; width:3px; border-radius:2px; background:#3b82f6;
}
.form-section__title { font-size:.8rem; font-weight:600; color:#111827; text-transform:uppercase; letter-spacing:.03em; }
.form-section__note { font-size:.7rem; color:#6b7280; }
.form-section__body { margin-left:.1rem; margin-right:.1rem; }

.form-label { color:#1f2937; font-weight:500; font-size:.8rem; margin-bottom:.25rem; }
.text-label-aux { font-size:.7rem; color:#6b7280; margin-top:.35rem; }
.required-star { color:#dc2626; font-weight:600; margin-left:.15rem; }

/* Chips */
.chips { display:flex; flex-wrap:wrap; gap:.35rem; }
.chip {
  background:#f3f4f6; border:1px solid #e5e7eb; color:#374151;
  border-radius:999px; padding:.2rem .6rem; font-size:.75rem; cursor:pointer;
}
.chip .x { margin-left:.35rem; color:#6b7280; }

/* Tables (pagos/cuotas) */
.pagos-table, .cuotas-table { display:flex; flex-direction:column; gap:.5rem; }
.pagos-head, .pagos-row { display:grid; grid-template-columns: 40px 150px 140px 130px 110px 1.2fr 160px 160px 70px; gap:.5rem; align-items:center; }
.cuotas-head, .cuotas-row { display:grid; grid-template-columns: 40px 180px 160px 1fr 70px; gap:.5rem; align-items:center; }
.idx{ font-weight:600; color:#6b7280; font-size:.75rem; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.btn-outline-danger{ border-color:#fca5a5; color:#b91c1c; background:#fff; padding:.15rem .5rem; }

@media (max-width: 992px) {
  .pagos-head, .pagos-row { grid-template-columns: 1fr; }
  .cuotas-head, .cuotas-row { grid-template-columns: 1fr; }
}

/* Resumen */
.insc-amount-summary { background:#f8fafc; border:1px solid #e2e8f0; border-radius:.6rem; padding: .75rem .85rem .85rem; }
.amount-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:.75rem; }
.amount-item { display:flex; flex-direction:column; gap:.25rem; }
.amount-label { font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; color:#6b7280; font-weight:500; }
.amount-value { font-size:1rem; font-weight:600; }
.amount-final-box { background:#ecfdf3; border:1px solid #bbf7d0; border-radius:.5rem; padding:.4rem .6rem; }
.amount-final { color:#166534; font-size:1.05rem; }

/* Inputs focus */
.form-control, .form-select, textarea.form-control { font-size:.85rem; line-height:1.4; border-color:#d1d5db; color:#111827; }
.form-control:focus, .form-select:focus, textarea.form-control:focus {
  border-color:#3b82f6; box-shadow:0 0 0 .2rem rgba(59,130,246,.15); outline:0;
}
</style>
