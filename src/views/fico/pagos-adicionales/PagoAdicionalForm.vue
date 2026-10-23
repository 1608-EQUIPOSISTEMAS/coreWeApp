<template>
  <div class="ef-page">
    <div class="ef-page-header">
      <div class="ef-page-header-left">
        <span class="ef-breadcrumb">FICO · Pagos fuera de venta</span>
        <h1 class="ef-page-title">{{ esEdicion ? `Pago Adicional N° ${id}` : 'Nuevo Pago Adicional' }}</h1>
      </div>
      <div class="ef-header-actions">
        <button class="ef-btn-outline" type="button" :disabled="saving" @click="goBack">Cancelar</button>
      </div>
    </div>

    <p v-if="loadError" class="ef-alert">{{ loadError }}</p>
    <div v-else-if="loading" class="ef-card"><span v-for="n in 4" :key="n" class="ds-skel ef-skel"></span></div>

    <template v-else>
      <!-- Las secciones siguen el orden de columnas del sheet de pagos adicionales. -->

      <!-- PAGO ADICIONAL -->
      <div class="ef-card">
        <h6 class="ef-section-title"><i class="fa-solid fa-file-invoice"></i> PAGO ADICIONAL</h6>
        <div class="ef-grid-4">
          <div class="ef-field">
            <label for="pa-linea">Línea de negocio <span class="ef-req">*</span></label>
            <select id="pa-linea" v-model="form.business_line">
              <option v-for="l in LINEAS" :key="l" :value="l">{{ l }}</option>
            </select>
            <small v-if="errors.business_line" class="ef-error">{{ errors.business_line }}</small>
          </div>
          <div class="ef-field">
            <label for="pa-programa">Programa <span class="ef-req">*</span></label>
            <input id="pa-programa" v-model="form.program" list="pa-programas" maxlength="150" autocomplete="off" placeholder="Elige o escribe" @change="onPrograma" />
            <datalist id="pa-programas">
              <option v-for="p in programas" :key="p" :value="p" />
            </datalist>
            <small v-if="errors.program" class="ef-error">{{ errors.program }}</small>
          </div>
          <div class="ef-field">
            <label for="pa-asunto">Asunto <span class="ef-req">*</span></label>
            <select id="pa-asunto" v-model="form.subject">
              <option value="" disabled>Seleccionar...</option>
              <option v-for="a in ASUNTOS" :key="a" :value="a">{{ a }}</option>
            </select>
            <small v-if="errors.subject" class="ef-error">{{ errors.subject }}</small>
          </div>
          <div class="ef-field">
            <label for="pa-fecha">F. pago <span class="ef-req">*</span></label>
            <input id="pa-fecha" v-model="form.payment_date" type="date" :min="`${PRIMER_MES}-01`" />
            <small v-if="errors.payment_date" class="ef-error">{{ errors.payment_date }}</small>
          </div>
        </div>
      </div>

      <!-- ALUMNO -->
      <div class="ef-card">
        <h6 class="ef-section-title"><i class="fa-solid fa-user"></i> ALUMNO</h6>
        <div class="ef-grid-3">
          <div class="ef-field">
            <label for="pa-nombre">Nombres y apellidos <span class="ef-req">*</span></label>
            <input id="pa-nombre" v-model="form.full_name" maxlength="200" />
            <small v-if="errors.full_name" class="ef-error">{{ errors.full_name }}</small>
          </div>
          <div class="ef-field">
            <label for="pa-celular">Celular</label>
            <input id="pa-celular" v-model="form.phone" inputmode="tel" maxlength="30" />
          </div>
          <div class="ef-field">
            <label for="pa-correo">Correo</label>
            <input id="pa-correo" v-model="form.email" type="email" maxlength="200" />
            <small v-if="errors.email" class="ef-error">{{ errors.email }}</small>
          </div>
        </div>
      </div>

      <!-- ESTADO -->
      <div class="ef-card">
        <h6 class="ef-section-title"><i class="fa-solid fa-circle-check"></i> ESTADO</h6>
        <div class="ef-grid-3">
          <div class="ef-field">
            <label for="pa-estado">Estado</label>
            <select id="pa-estado" v-model="form.status">
              <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label for="pa-realizado">¿Realizado?</label>
            <label class="ef-check" for="pa-realizado">
              <input id="pa-realizado" v-model="form.done" type="checkbox" />
              <span>{{ form.done ? 'Sí' : 'No' }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- DATOS DEL PAGO -->
      <div class="ef-card">
        <h6 class="ef-section-title"><i class="fa-solid fa-money-check-dollar"></i> DATOS DEL PAGO</h6>
        <div class="ef-grid-3">
          <div class="ef-field">
            <label for="pa-monto">Monto <span class="ef-req">*</span></label>
            <input id="pa-monto" v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="0.00" />
            <small v-if="errors.amount" class="ef-error">{{ errors.amount }}</small>
          </div>
          <div class="ef-field">
            <label for="pa-moneda">Tipo de moneda</label>
            <select id="pa-moneda" v-model="form.currency" @change="limpiarCuentaSiNoAplica">
              <option v-for="m in MONEDAS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label>Medio de Pago</label>
            <SearchSelect v-model="form.cat_payment_medium" :items="catPaymentMedium" label-field="description" value-field="id" placeholder="Transferencia, Yape..." />
          </div>
        </div>
        <div class="ef-grid-3 ef-row-gap">
          <div class="ef-field">
            <label>Entidad Empresa</label>
            <SearchSelect v-model="form.cat_business_entity" :items="catBusinessEntity" label-field="description" value-field="id" placeholder="Seleccionar..." @update:model-value="form.bank_account_id = null" />
          </div>
          <div class="ef-field">
            <label for="pa-cuenta">Entidad Financiera</label>
            <select id="pa-cuenta" v-model="form.bank_account_id" :disabled="!form.cat_business_entity">
              <option :value="null">{{ form.cat_business_entity ? (cuentas.length ? 'Seleccionar...' : `Sin cuentas en ${form.currency}`) : 'Seleccione empresa...' }}</option>
              <option v-for="a in cuentas" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label for="pa-oper">N° Operación</label>
            <input id="pa-oper" v-model="form.transaction_code" maxlength="60" />
          </div>
        </div>
      </div>

      <!-- CLASIFICACION -->
      <div class="ef-card">
        <h6 class="ef-section-title"><i class="fa-solid fa-tags"></i> CLASIFICACIÓN</h6>
        <div class="ef-grid-3">
          <div class="ef-field">
            <label>Tipo programa</label>
            <div class="ef-readonly">{{ TIPO_PROGRAMA }}</div>
          </div>
          <div class="ef-field">
            <label for="pa-lprod">Línea de producto</label>
            <input id="pa-lprod" v-model="form.product_line" list="pa-lineas-producto" maxlength="40" autocomplete="off" />
            <datalist id="pa-lineas-producto">
              <option v-for="l in LINEAS_PRODUCTO" :key="l" :value="l" />
            </datalist>
            <small class="ef-help">Se completa sola según el programa.</small>
          </div>
          <div class="ef-field">
            <label for="pa-tpago">Tipo de pago</label>
            <input id="pa-tpago" v-model="form.payment_type" maxlength="20" />
          </div>
        </div>
      </div>

      <p v-if="error" class="ef-alert">{{ error }}</p>

      <!-- GUARDAR -->
      <div class="ef-footer-actions">
        <button class="ef-btn-outline" type="button" :disabled="saving" @click="goBack">Cancelar</button>
        <button class="ef-btn-primary" type="button" :disabled="saving" @click="handleSave">
          {{ saving ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Guardar pago adicional') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import { LINEA_PRODUCTO } from '@/features/pagos-adicionales/listas.js'
import {
  LINEAS, ESTADOS, MONEDAS, ASUNTOS, PRIMER_MES, programasDe, lineaProductoDe,
  emptyForm, formFromFila, validateForm, buildPayload, cuentasDe
} from '@/features/pagos-adicionales/pagosAdicionales.js'

// Alta (/fico/pagos-adicionales/new) y edicion (/fico/pagos-adicionales/:id) de
// un pago adicional. Se abre como el formulario de inscripciones: en la misma
// pestaña, y al guardar vuelve al registro.
const route = useRoute()
const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const catalog = inject('catalog')
const catPaymentMedium = catalog.options('we_payment_medium')
const catBusinessEntity = catalog.options('we_business_entity')

const TIPO_PROGRAMA = 'ADICIONALES'
const LINEAS_PRODUCTO = [...new Set(Object.values(LINEA_PRODUCTO))].sort()

const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const esEdicion = computed(() => id.value !== null)

const form = ref(emptyForm())
const errors = ref({})
const error = ref('')
const loadError = ref('')
const loading = ref(false)
const saving = ref(false)
const cuentasBancarias = ref([])

const programas = computed(() => programasDe(form.value.business_line))
const cuentas = computed(() => cuentasDe(cuentasBancarias.value, form.value.cat_business_entity, form.value.currency))

const mensajeError = err => {
  const d = err?.response?.data
  return d?.message || d?.error || err?.message || ''
}

onMounted(async () => {
  loading.value = true
  try {
    const [cuentasRes, fila] = await Promise.all([
      ficoService.getBankAccounts().catch(err => { console.error('Error cargando cuentas:', err); return [] }),
      esEdicion.value ? ficoService.pagoAdicional(id.value) : null
    ])
    cuentasBancarias.value = cuentasRes || []
    if (fila) form.value = formFromFila(fila)
  } catch (err) {
    console.error('Error cargando el pago adicional:', err)
    loadError.value = mensajeError(err) || 'No se pudo cargar el pago adicional.'
  } finally {
    loading.value = false
  }
})

// Como el BUSCARV del sheet: al elegir el programa se completa la línea de
// producto (si el programa no esta en el portafolio, se deja lo escrito).
function onPrograma () {
  const lp = lineaProductoDe(form.value.program)
  if (lp) form.value.product_line = lp
}

function limpiarCuentaSiNoAplica () {
  if (form.value.bank_account_id && !cuentas.value.some(a => a.account_id === form.value.bank_account_id)) {
    form.value.bank_account_id = null
  }
}

function goBack () { router.back() }

async function handleSave () {
  errors.value = validateForm(form.value)
  if (Object.keys(errors.value).length) {
    error.value = 'Revisa los campos marcados.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = buildPayload(form.value)
    const fila = esEdicion.value
      ? await ficoService.editarPagoAdicional({ additional_payment_id: id.value, ...payload })
      : await ficoService.registrarPagoAdicional(payload)
    toast.success(esEdicion.value ? `Pago N° ${fila.id} actualizado.` : `Pago N° ${fila.id} registrado.`)
    // Vuelve al registro en el mes del pago, para verlo en la lista.
    router.push({ name: 'ficoPagosAdicionales', query: { mes: payload.payment_date.slice(0, 7) } })
  } catch (err) {
    console.error('Error guardando pago adicional:', err)
    error.value = mensajeError(err) || 'No se pudo guardar el pago. Intenta de nuevo.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Mismo diseño que el formulario de inscripciones (EnrollmentForm.vue). */
.ef-page {
  background: #FFFFFF;
  padding: 32px 32px 24px;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1A1A1A;
  min-height: 100vh;
}
.ef-page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; }
.ef-page-header-left { display: flex; flex-direction: column; gap: 2px; }
.ef-breadcrumb { font-size: 11px; color: #A3A3A3; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
.ef-page-title { font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0; letter-spacing: -0.02em; }
.ef-header-actions { display: flex; align-items: center; gap: 10px; }

.ef-btn-primary {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 24px;
  font-size: 13px; font-weight: 600; color: #fff; background: var(--we-navy, #002060);
  border: none; border-radius: 8px; cursor: pointer; transition: background .2s ease;
  font-family: inherit; letter-spacing: -0.01em;
}
.ef-btn-primary:hover { background: var(--we-navy-dark, #001540); }
.ef-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ef-btn-outline {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 24px;
  font-size: 13px; font-weight: 600; color: #737373; background: #fff;
  border: 1px solid #E8E8E8; border-radius: 8px; cursor: pointer; transition: all .2s ease; font-family: inherit;
}
.ef-btn-outline:hover { border-color: #D4D4D4; color: #1A1A1A; }
.ef-btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.ef-card { background: #fff; border: 1px solid #F0F0F0; border-radius: 10px; padding: 24px; margin-bottom: 20px; }
.ef-section-title {
  font-size: 11px; font-weight: 600; color: #8C8C8C; text-transform: uppercase; letter-spacing: 0.06em;
  margin: 0 0 20px 0; padding-left: 12px; border-left: 3px solid #1A1A1A; line-height: 1.4;
}
.ef-section-title i { margin-right: 6px; font-size: 11px; }

.ef-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.ef-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.ef-row-gap { margin-top: 16px; }

.ef-field { display: flex; flex-direction: column; gap: 6px; }
.ef-field label { font-size: 12px; font-weight: 600; color: #737373; text-transform: uppercase; letter-spacing: 0.03em; }
.ef-field input:not([type="checkbox"]),
.ef-field select {
  height: 38px; border: 1px solid #E8E8E8; border-radius: 8px; font-size: 13px; padding: 0 12px;
  color: #1A1A1A; background: #fff; font-family: inherit; transition: border-color .2s ease;
  outline: none; width: 100%; box-sizing: border-box;
}
.ef-field input:focus,
.ef-field select:focus { border-color: #A3A3A3; }
.ef-field input:disabled,
.ef-field select:disabled { background: #FAFAFA; color: #A3A3A3; cursor: not-allowed; }
.ef-field input[type="number"] { -moz-appearance: textfield; }
.ef-field input[type="number"]::-webkit-inner-spin-button,
.ef-field input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.ef-req { color: #DC2626; font-weight: 700; }
.ef-error { font-size: 11.5px; color: #DC2626; }
.ef-help { font-size: 11.5px; color: #A3A3A3; }
.ef-readonly {
  height: 38px; display: flex; align-items: center; padding: 0 12px; font-size: 13px; font-weight: 600;
  color: #737373; background: #FAFAFA; border: 1px solid #F0F0F0; border-radius: 8px;
}
.ef-field .ef-check {
  display: inline-flex; align-items: center; gap: 8px; height: 38px; margin: 0; cursor: pointer;
  font-size: 13px; font-weight: 500; color: #1A1A1A; text-transform: none; letter-spacing: 0;
}
.ef-check input { width: 16px; height: 16px; }
.ef-alert { margin: 0 0 16px; padding: 12px 16px; border-radius: 8px; background: #FEF2F2; color: #B91C1C; font-size: 13px; }
.ef-skel { margin-bottom: 12px; }

.ef-footer-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 24px 0 8px; }

@media (max-width: 900px) {
  .ef-grid-3, .ef-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ef-page { padding: 20px 16px; }
  .ef-grid-3, .ef-grid-4 { grid-template-columns: 1fr; }
  .ef-page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
}

/* ── Dark mode (igual que EnrollmentForm) ── */
[data-coreui-theme="dark"] .ef-page { background: #0E0E0A; color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-breadcrumb { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-page-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ef-section-title { color: #A0A099; border-left-color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-field label { color: #A0A099; }
[data-coreui-theme="dark"] .ef-field input:not([type="checkbox"]),
[data-coreui-theme="dark"] .ef-field select { background: #14140F; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-field input::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-field input:focus,
[data-coreui-theme="dark"] .ef-field select:focus { border-color: #34D399; }
[data-coreui-theme="dark"] .ef-field .ef-check { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-readonly { background: #14140F; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .ef-alert { background: rgba(220, 38, 38, 0.15); color: #FCA5A5; }
[data-coreui-theme="dark"] .ef-btn-primary { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ef-btn-primary:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .ef-btn-outline { background: #1A1A14; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .ef-btn-outline:hover { background: #2A2A22; border-color: #3A3A33; color: #F4F4F0; }
</style>
