<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">B2B · Contratos</span>
            <h1 class="brand-title">{{ isEdit ? 'Editar Contrato' : 'Nuevo Contrato B2B' }}</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <span v-if="isEdit" class="masthead-id">ID {{ idParam }}</span>
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelar">
            <i class="fa-solid fa-arrow-left"></i> Cancelar
          </button>
          <button
            type="button"
            class="btn-exec btn-exec-primary px-4"
            :disabled="!isValid || saving"
            @click="guardar"
          >
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body pb-5" v-if="loaded">
      <div class="exec-form-grid">

        <!-- ══ COLUMNA IZQUIERDA ══ -->
        <div class="col-left">

          <div class="exec-card exec-card--empresa mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-file-signature me-2 text-primary"></i>
              <span>Datos del Contrato</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-12">
                  <label class="exec-label">Empresa <span class="c-red">*</span></label>
                  <SearchSelect
                    v-model="form.company_id"
                    mode="remote"
                    :fetcher="q => b2bService.companyList({ q, page: 1, size: 20 }).then(r => r.items || [])"
                    label-field="razon_social"
                    value-field="company_id"
                    placeholder="BUSCAR EMPRESA..."
                    :model-label="form.company_label"
                    @change="opt => { form.company_label = opt ? opt.razon_social : '' }"
                    class="exec-select-light w-100"
                    required
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Tipo de Contrato <span class="c-red">*</span></label>
                  <SearchSelect
                    v-model="form.cat_contract_type"
                    :items="catalogs.contractTypeList"
                    label-field="description"
                    value-field="id"
                    placeholder="Seleccionar..."
                    :model-label="form.contract_type_label"
                    @change="opt => { form.contract_type_label = opt ? opt.description : ''; form.contract_type_alias = opt ? opt.alias : null }"
                    class="exec-select-light w-100"
                    required
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Estado</label>
                  <div class="switch-row">
                    <label class="form-switch">
                      <input type="checkbox" v-model="form.active" />
                      <span></span>
                    </label>
                    <span class="switch-text">{{ form.active ? 'Activo' : 'Inactivo / Cancelado' }}</span>
                  </div>
                </div>

                <div class="col-12">
                  <label class="exec-label">Nombre del Contrato <span class="c-red">*</span></label>
                  <input
                    v-model.trim="form.contract_name"
                    type="text"
                    class="exec-input w-100"
                    placeholder="Ej. CONTRATO MARCO 2026 - EMPRESA S.A.C."
                    v-restrict="'upper|max:200'"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Fecha Inicio <span class="c-red">*</span></label>
                  <input v-model="form.start_date" type="date" class="exec-input w-100" />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Fecha Fin</label>
                  <input v-model="form.end_date" type="date" class="exec-input w-100" />
                  <small class="exec-hint">Vacío = indefinido</small>
                </div>

                <div class="col-12">
                  <label class="exec-label">Descripción</label>
                  <textarea
                    v-model.trim="form.description"
                    class="exec-input w-100"
                    rows="2"
                    placeholder="Describe el alcance y condiciones generales del contrato..."
                  ></textarea>
                </div>

              </div>
            </div>
          </div>

          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-briefcase me-2 text-muted"></i>
              <span>Datos Comerciales</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-6">
                  <label class="exec-label">Tipo de Cliente</label>
                  <SearchSelect
                    v-model="form.cat_client_type"
                    :items="catalogs.clientTypeList"
                    label-field="description"
                    value-field="id"
                    placeholder="B2B Nacional / Internacional / Estado"
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Modalidad</label>
                  <SearchSelect
                    v-model="form.cat_modality"
                    :items="catalogs.modalityList"
                    label-field="description"
                    value-field="id"
                    placeholder="Seleccionar..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-8">
                  <label class="exec-label">Programa Vendido</label>
                  <SearchSelect
                    v-model="form.program_version_id"
                    mode="remote"
                    :fetcher="buscarProgramas"
                    label-field="description"
                    value-field="id"
                    sublabel-field="label_ui"
                    placeholder="BUSCAR PROGRAMA..."
                    :cache="false"
                    :model-label="form.program_label"
                    @change="opt => { form.program_label = opt ? opt.description : '' }"
                    class="exec-select-light w-100"
                  />
                  <small class="exec-hint">Opcional: si el trato es una bolsa de cupos, cada beneficiario lleva su curso.</small>
                </div>

                <div class="col-md-4">
                  <label class="exec-label">País</label>
                  <input v-model.trim="form.country" type="text" class="exec-input w-100" placeholder="PERÚ" v-restrict="'upper|max:60'" />
                </div>

              </div>
            </div>
          </div>

          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-flag-checkered me-2 text-muted"></i>
              <span>Hitos Comerciales</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-4">
                  <label class="exec-label">F. Consulta</label>
                  <input v-model="form.consultation_date" type="date" class="exec-input w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">F. Cierre</label>
                  <input v-model="form.close_date" type="date" class="exec-input w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">F. Pago</label>
                  <input v-model="form.payment_date" type="date" class="exec-input w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">F. Confirmación</label>
                  <input v-model="form.confirmation_sent_date" type="date" class="exec-input w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">F. Factura</label>
                  <input v-model="form.invoice_date" type="date" class="exec-input w-100" />
                </div>

                <div class="col-md-4 d-flex flex-column justify-content-end">
                  <div class="rangos">
                    <span title="Días entre la consulta y el cierre">C→C <b>{{ rangoCierre ?? '—' }}</b></span>
                    <span title="Días entre el cierre y el pago">C→P <b>{{ rangoPago ?? '—' }}</b></span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        <!-- ══ COLUMNA DERECHA ══ -->
        <div class="col-right">

          <div class="exec-card exec-card--plata mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-sack-dollar me-2 text-success"></i>
              <span>Registro de Plata</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-4">
                  <label class="exec-label">Moneda</label>
                  <SearchSelect
                    v-model="form.cat_currency"
                    :items="catalogs.currencyList"
                    label-field="description"
                    value-field="id"
                    placeholder="PEN / USD"
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-4">
                  <label class="exec-label">Monto Total</label>
                  <input v-model.number="form.total_amount" type="number" step="0.01" min="0" class="exec-input w-100" placeholder="0.00" />
                </div>

                <div class="col-md-4">
                  <label class="exec-label">Importe Pagado</label>
                  <input v-model.number="form.paid_amount" type="number" step="0.01" min="0" class="exec-input w-100" placeholder="0.00" />
                </div>

                <div class="col-md-4">
                  <label class="exec-label">Saldo</label>
                  <div class="exec-input saldo" :class="{ 'saldo--deuda': saldo > 0, 'saldo--exceso': saldo < 0 }">
                    {{ fmt(saldo) }}
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="exec-label">Condición de Pago</label>
                  <SearchSelect
                    v-model="form.cat_payment_terms"
                    :items="catalogs.paymentTermsList"
                    label-field="description"
                    value-field="id"
                    placeholder="Contado / Crédito"
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-4">
                  <label class="exec-label">Equivalente en Soles</label>
                  <input v-model.number="form.paid_amount_pen" type="number" step="0.01" min="0" class="exec-input w-100" placeholder="0.00" />
                  <small class="exec-hint">Solo si cobró en dólares.</small>
                </div>

              </div>
            </div>
          </div>

          <!-- Solo el convenio reparte % de descuento a los alumnos de la empresa. -->
          <div v-if="esConvenio" class="exec-card mb-4">
            <div class="exec-card__header exec-card__header--split">
              <span>
                <i class="fa-solid fa-percent me-2 text-muted"></i>
                Descuentos del Convenio
              </span>
              <button class="btn-exec btn-exec-sm" @click="agregarDescuento" type="button">
                <i class="fa-solid fa-plus"></i> Agregar
              </button>
            </div>
            <div class="exec-card__body">
              <p class="exec-hint mb-2">
                Porcentaje que se aplica a los alumnos de esta empresa. Dejar tipo y modalidad vacíos = aplica a todo.
              </p>

              <p v-if="!form.discounts.length" class="exec-empty">Sin descuentos definidos.</p>

              <div v-for="(d, i) in form.discounts" :key="'d' + i" class="row g-2 align-items-end mb-2">
                <div class="col-md-4">
                  <label class="exec-label">Tipo de Programa</label>
                  <SearchSelect v-model="d.cat_type_program" :items="catalogs.programTypeList" label-field="description" value-field="id" placeholder="Todos" class="exec-select-light w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Modalidad</label>
                  <SearchSelect v-model="d.cat_model_modality" :items="catalogs.modalityList" label-field="description" value-field="id" placeholder="Todas" class="exec-select-light w-100" />
                </div>
                <div class="col-md-3">
                  <label class="exec-label">% Descuento <span class="c-red">*</span></label>
                  <input v-model.number="d.discount_pct" type="number" step="0.01" min="0" max="100" class="exec-input w-100" placeholder="0" />
                </div>
                <div class="col-md-1">
                  <button class="btn-exec btn-exec-xs btn-exec-danger w-100" @click="form.discounts.splice(i, 1)" type="button">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-file-contract me-2 text-muted"></i>
              <span>Documento y Observaciones</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-12">
                  <label class="exec-label">URL Orden de Compra / Documento Oficial</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-link"></i></span>
                    <input
                      v-model.trim="form.purchase_order_url"
                      type="url"
                      class="exec-input"
                      placeholder="https://drive.google.com/... o https://sharepoint.com/..."
                      v-restrict="'max:500'"
                    />
                    <a
                      v-if="form.purchase_order_url"
                      :href="form.purchase_order_url"
                      target="_blank"
                      class="btn-exec btn-exec-sm"
                      title="Abrir documento"
                    >
                      <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                  </div>
                  <small class="exec-hint">Pega el enlace al contrato firmado (Drive, SharePoint, etc.)</small>
                </div>

                <div class="col-12">
                  <label class="exec-label">Notas Internas</label>
                  <textarea
                    v-model.trim="form.notes"
                    class="exec-input w-100"
                    rows="3"
                    placeholder="Notas internas, condiciones especiales, recordatorios..."
                  ></textarea>
                </div>

              </div>
            </div>
          </div>

        </div>

        <!-- ══ ANCHO COMPLETO: el reparto de cupos ══ -->
        <div class="col-full">
          <div class="exec-card mb-4">
            <div class="exec-card__header exec-card__header--split">
              <span>
                <i class="fa-solid fa-users me-2 text-muted"></i>
                Cupos y Beneficiarios
              </span>
              <div class="d-flex gap-2">
                <button class="btn-exec btn-exec-sm" @click="mostrarPegado = !mostrarPegado" type="button">
                  <i class="fa-solid fa-paste"></i> Pegar lista
                </button>
                <button class="btn-exec btn-exec-sm" @click="agregarBeneficiario" type="button">
                  <i class="fa-solid fa-plus"></i> Agregar
                </button>
                <button
                  class="btn-exec btn-exec-sm btn-exec-primary"
                  :disabled="enviando || saving || !cuposPorEnviar"
                  :title="cuposPorEnviar
                    ? `Crea la inscripción de ${cuposPorEnviar} cupo(s) en FICO`
                    : 'No hay cupos pendientes: asigna alumnos con su curso'"
                  @click="enviarAFico"
                  type="button"
                >
                  <i class="fa-solid fa-paper-plane"></i>
                  {{ enviando ? 'Enviando…' : `Enviar a FICO (${cuposPorEnviar})` }}
                </button>
              </div>
            </div>
            <div class="exec-card__body">

              <div v-if="resultadoEnvio" class="envio-resultado mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <b>
                    {{ resultadoEnvio.enrolled }} inscrito(s) ·
                    {{ resultadoEnvio.rejected }} sin enviar ·
                    {{ resultadoEnvio.skipped }} ya estaban
                  </b>
                  <button class="btn-exec btn-exec-xs" @click="resultadoEnvio = null" type="button">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div v-for="fila in resultadoEnvio.detail" :key="fila.beneficiary_id" class="envio-fila">
                  <span class="pill" :class="fila.estado === 'creado' ? 'pill-ok' : fila.estado === 'ya_matriculado' ? 'pill-pend' : 'pill-err'">
                    {{ fila.estado.replace('_', ' ') }}
                  </span>
                  <span class="envio-nombre">{{ fila.full_name }}</span>
                  <span class="exec-hint">{{ fila.mensaje }}</span>
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-3">
                  <label class="exec-label">Cupos Comprados</label>
                  <input v-model.number="form.number_of_licenses" type="number" min="0" class="exec-input w-100" placeholder="0" />
                </div>
                <div class="col-md-9 d-flex align-items-end">
                  <div class="cupos-resumen" :class="{ 'cupos-resumen--exceso': cuposLibres < 0 }">
                    <span><b>{{ form.beneficiaries.length }}</b> asignados</span>
                    <span><b>{{ cuposLibres }}</b> libres</span>
                    <span><b>{{ matriculados }}</b> ya inscritos por FICO</span>
                  </div>
                </div>
              </div>

              <div v-if="mostrarPegado" class="pegado mb-3">
                <label class="exec-label">Pega una fila por alumno: <code>nombres, apellidos, documento, correo, teléfono</code></label>
                <textarea v-model="textoPegado" class="exec-input w-100" rows="4" placeholder="JUAN CARLOS, PEREZ GOMEZ, 40506070, juan@empresa.com, 999888777"></textarea>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn-exec btn-exec-sm btn-exec-primary" @click="importarPegado" type="button">
                    Agregar {{ filasPegadas.length }} beneficiario(s)
                  </button>
                  <button class="btn-exec btn-exec-sm" @click="mostrarPegado = false; textoPegado = ''" type="button">Cancelar</button>
                </div>
              </div>

              <p v-if="!form.beneficiaries.length" class="exec-empty">
                Sin beneficiarios. Agrega los alumnos que la empresa quiere matricular.
              </p>

              <div class="tabla-scroll" v-else>
                <table class="tabla-beneficiarios">
                  <thead>
                    <tr>
                      <th style="min-width:170px">Nombres <span class="c-red">*</span></th>
                      <th style="min-width:170px">Apellidos <span class="c-red">*</span></th>
                      <th style="min-width:120px">Documento</th>
                      <th style="min-width:200px">Correo</th>
                      <th style="min-width:120px">Teléfono</th>
                      <th style="min-width:240px">Programa</th>
                      <th style="min-width:90px">Estado</th>
                      <th style="width:44px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(b, i) in form.beneficiaries" :key="'b' + i">
                      <td>
                        <input v-model.trim="b.first_name" class="exec-input w-100" v-restrict="'upper|max:150'" />
                        <!-- El nombre que traía la hoja: quien migró no sabía si venía
                             "NOMBRES APELLIDOS" o al revés, así que lo separa el asesor. -->
                        <small v-if="b.full_name && !b.first_name && !b.last_name" class="hint-nombre">
                          {{ b.full_name }}
                        </small>
                      </td>
                      <td><input v-model.trim="b.last_name" class="exec-input w-100" v-restrict="'upper|max:150'" /></td>
                      <td><input v-model.trim="b.document_number" class="exec-input w-100" v-restrict="'max:20'" /></td>
                      <td><input v-model.trim="b.email" type="email" class="exec-input w-100" v-restrict="'max:120'" /></td>
                      <td><input v-model.trim="b.phone" class="exec-input w-100" v-restrict="'max:20'" /></td>
                      <td>
                        <SearchSelect
                          v-model="b.program_version_id"
                          mode="remote"
                          :fetcher="buscarProgramas"
                          label-field="description"
                          value-field="id"
                          sublabel-field="label_ui"
                          placeholder="Programa del contrato"
                          :cache="false"
                          :model-label="b.program_label"
                          @change="opt => { b.program_label = opt ? opt.description : '' }"
                          class="exec-select-light w-100"
                        />
                      </td>
                      <td>
                        <span v-if="b.enrollment_id" class="pill pill-ok" title="Ya tiene inscripción">Inscrito</span>
                        <span v-else class="pill pill-pend">Pendiente</span>
                      </td>
                      <td>
                        <button
                          class="btn-exec btn-exec-xs btn-exec-danger"
                          :disabled="!!b.enrollment_id"
                          :title="b.enrollment_id ? 'Ya está inscrito: anula la inscripción desde FICO' : 'Quitar'"
                          @click="quitarBeneficiario(i)"
                          type="button"
                        >
                          <i class="fa-solid fa-xmark"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>
    </main>

    <main class="exec-body" v-else>
      <div class="exec-card exec-card--loading">Cargando...</div>
    </main>

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
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

const catalogs = ref({
  contractTypeList: catalog?.options('we_b2b_contract') || [],
  clientTypeList: catalog?.options('we_b2b_client_type') || [],
  modalityList: catalog?.options('we_modality') || [],
  currencyList: catalog?.options('we_currency') || [],
  paymentTermsList: catalog?.options('we_payment_way') || [],
  programTypeList: catalog?.options('we_program_type') || [],
})

const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!idParam.value)

const loaded = ref(false)
const saving = ref(false)
const mostrarPegado = ref(false)
const textoPegado = ref('')
const enviando = ref(false)
const resultadoEnvio = ref(null)

const form = reactive({
  company_id: null,
  company_label: '',
  cat_contract_type: null,
  contract_type_label: '',
  contract_type_alias: null,
  contract_name: '',
  description: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  cat_client_type: null,
  cat_modality: null,
  cat_currency: null,
  cat_payment_terms: null,
  program_version_id: null,
  program_label: '',
  country: '',
  number_of_licenses: null,
  total_amount: null,
  paid_amount: null,
  paid_amount_pen: null,
  consultation_date: null,
  close_date: null,
  payment_date: null,
  confirmation_sent_date: null,
  invoice_date: null,
  purchase_order_url: '',
  notes: '',
  active: true,
  discounts: [],
  beneficiaries: [],
})

// ── Derivados ────────────────────────────────────────────
// Ninguno de estos se guarda: el Sheet los tenía como columnas y por eso
// quedaban desincronizados apenas alguien editaba un monto o una fecha.

const saldo = computed(() => Number(form.total_amount || 0) - Number(form.paid_amount || 0))
const cuposLibres = computed(() => Number(form.number_of_licenses || 0) - form.beneficiaries.length)
const matriculados = computed(() => form.beneficiaries.filter(b => b.enrollment_id).length)
// Un cupo se puede enviar cuando tiene curso, nombre partido e identidad
// (documento o correo): son las mismas condiciones que exige el SP, adelantadas
// aquí para no mandar al asesor a leer una lista de rechazos evitable.
const cuposPorEnviar = computed(() => form.beneficiaries.filter(b =>
  !b.enrollment_id && b.program_version_id && b.first_name && b.last_name &&
  (b.document_number || b.email)).length)
const esConvenio = computed(() => form.contract_type_alias === 'we_b2b_contract_convenio')

const diasEntre = (desde, hasta) => {
  if (!desde || !hasta) return null
  return Math.round((new Date(hasta) - new Date(desde)) / 86400000)
}
const rangoCierre = computed(() => diasEntre(form.consultation_date, form.close_date))
const rangoPago = computed(() => diasEntre(form.close_date, form.payment_date))

const fmt = (n) => Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const isValid = computed(() =>
  !!form.company_id &&
  !!form.cat_contract_type &&
  !!form.contract_name &&
  !!form.start_date &&
  form.beneficiaries.every(b => !!b.first_name && !!b.last_name) &&
  form.discounts.every(d => d.discount_pct !== null && d.discount_pct !== '' && Number(d.discount_pct) >= 0)
)

// programCaller y no programList: es el endpoint liviano de autocomplete y no
// dispara el loader global en cada tecla.
const buscarProgramas = (q) => programService.programCaller({ q })

// ── Descuentos y beneficiarios ───────────────────────────

function agregarDescuento() {
  form.discounts.push({ cat_type_program: null, cat_model_modality: null, discount_pct: null })
}

function agregarBeneficiario() {
  form.beneficiaries.push({
    first_name: '', last_name: '', full_name: '', document_number: '', email: '', phone: '',
    program_version_id: null, program_label: '', enrollment_id: null,
  })
}

// full_name es NOT NULL y lo lee media BD (matriz de cupos, reportes), pero la
// verdad ahora son los dos campos separados: se deriva, no se edita.
const nombreCompleto = (b) =>
  [b.first_name, b.last_name].filter(Boolean).join(' ').trim() || b.full_name || ''

function quitarBeneficiario(i) {
  // Un beneficiario ya inscrito no se saca desde aquí: la inscripción quedaría
  // colgando sin el contrato que la pagó. Primero se anula en FICO.
  if (form.beneficiaries[i].enrollment_id) return
  form.beneficiaries.splice(i, 1)
}

const filasPegadas = computed(() =>
  textoPegado.value
    .split('\n')
    .map(l => l.split(/[,;\t]/).map(c => c.trim()))
    .filter(c => c[0])
)

function importarPegado() {
  for (const [first_name, last_name, document_number, email, phone] of filasPegadas.value) {
    form.beneficiaries.push({
      first_name: (first_name || '').toUpperCase(),
      last_name: (last_name || '').toUpperCase(),
      full_name: `${first_name || ''} ${last_name || ''}`.trim().toUpperCase(),
      document_number: document_number || '',
      email: email || '',
      phone: phone || '',
      program_version_id: null, program_label: '', enrollment_id: null,
    })
  }
  textoPegado.value = ''
  mostrarPegado.value = false
}

// ── Carga y guardado ─────────────────────────────────────

const soloFecha = (v) => (v ? String(v).slice(0, 10) : null)

async function loadData(id) {
  try {
    const data = await b2bService.contractGet({ id })
    if (!data?.contract_id) throw new Error('Contrato no encontrado')

    Object.assign(form, {
      company_id: data.company_id,
      company_label: data.company_name || '',
      cat_contract_type: data.cat_contract_type,
      contract_type_label: data.contract_type_label || '',
      contract_type_alias: data.contract_type_alias || null,
      contract_name: data.contract_name || '',
      description: data.description || '',
      start_date: soloFecha(data.start_date),
      end_date: soloFecha(data.end_date),
      cat_client_type: data.cat_client_type,
      cat_modality: data.cat_modality,
      cat_currency: data.cat_currency,
      cat_payment_terms: data.cat_payment_terms,
      program_version_id: data.program_version_id,
      country: data.country || '',
      number_of_licenses: data.number_of_licenses,
      total_amount: data.total_amount === null ? null : Number(data.total_amount),
      paid_amount: data.paid_amount === null ? null : Number(data.paid_amount),
      paid_amount_pen: data.paid_amount_pen === null ? null : Number(data.paid_amount_pen),
      consultation_date: soloFecha(data.consultation_date),
      close_date: soloFecha(data.close_date),
      payment_date: soloFecha(data.payment_date),
      confirmation_sent_date: soloFecha(data.confirmation_sent_date),
      invoice_date: soloFecha(data.invoice_date),
      purchase_order_url: data.purchase_order_url || '',
      notes: data.notes || '',
      active: data.active !== 'N',
      discounts: (data.discounts || []).map(d => ({ ...d })),
      beneficiaries: (data.beneficiaries || []).map(b => ({ ...b, program_label: b.program_label || '' })),
    })
  } catch (e) {
    console.error(e)
    toast.error('Error cargando el contrato')
    router.back()
  }
}

// Persiste y devuelve el id del contrato, o null si no se pudo. Lo comparten
// "Guardar" y "Enviar a FICO": mandar cupos leyendo la BD sin guardar antes
// enviaría los nombres viejos.
async function persistir() {
  if (!isValid.value) {
    toast.warning('Completa los obligatorios: empresa, tipo, nombre, fecha inicio y los nombres y apellidos de cada beneficiario.')
    return null
  }
  if (form.end_date && form.start_date > form.end_date) {
    toast.warning('La fecha fin no puede ser anterior a la fecha inicio.')
    return null
  }
  if (cuposLibres.value < 0) {
    toast.warning(`Asignaste ${form.beneficiaries.length} beneficiarios y compraron ${form.number_of_licenses || 0} cupos.`)
    return null
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
        cat_client_type: form.cat_client_type || null,
        cat_modality: form.cat_modality || null,
        cat_currency: form.cat_currency || null,
        cat_payment_terms: form.cat_payment_terms || null,
        program_version_id: form.program_version_id || null,
        country: form.country || null,
        number_of_licenses: form.number_of_licenses ?? null,
        total_amount: form.total_amount ?? null,
        paid_amount: form.paid_amount ?? null,
        paid_amount_pen: form.paid_amount_pen ?? null,
        consultation_date: form.consultation_date || null,
        close_date: form.close_date || null,
        payment_date: form.payment_date || null,
        confirmation_sent_date: form.confirmation_sent_date || null,
        invoice_date: form.invoice_date || null,
        purchase_order_url: form.purchase_order_url || null,
        notes: form.notes || null,
        active: form.active ? 'Y' : 'N',
      },
      // Solo un convenio lleva tarifa propia: mandar [] en los demás tipos
      // borra descuentos heredados de un cambio de tipo.
      discounts: esConvenio.value
        ? form.discounts.map(d => ({
            ...(d.discount_id ? { discount_id: d.discount_id } : {}),
            cat_type_program: d.cat_type_program || null,
            cat_model_modality: d.cat_model_modality || null,
            discount_pct: Number(d.discount_pct),
          }))
        : [],
      beneficiaries: form.beneficiaries.map(b => ({
        ...(b.beneficiary_id ? { beneficiary_id: b.beneficiary_id } : {}),
        full_name: nombreCompleto(b),
        first_name: b.first_name || null,
        last_name: b.last_name || null,
        document_number: b.document_number || null,
        email: b.email || null,
        phone: b.phone || null,
        program_version_id: b.program_version_id || null,
      })),
    }

    if (isEdit.value) {
      payload.id = idParam.value
      const r = await b2bService.contractUpdate(payload)
      if (r?.result === 0) throw new Error(r.message)
      toast.success('Contrato actualizado correctamente')
      return Number(idParam.value)
    }

    const r = await b2bService.contractRegister(payload)
    if (r?.result === 0) throw new Error(r.message)
    toast.success('Contrato creado correctamente')
    return r?.contract_id ?? null
  } catch (e) {
    console.error(e)
    toast.error('Error al guardar: ' + (e?.response?.data?.message || e.message || 'Error desconocido'))
    return null
  } finally {
    saving.value = false
  }
}

async function guardar() {
  if (await persistir()) router.push({ name: 'B2BContracts' })
}

// Convierte los cupos en inscripciones reales de FICO. No navega: el asesor
// tiene que ver en la misma pantalla cuáles entraron y cuáles rebotaron.
async function enviarAFico() {
  const contractId = await persistir()
  if (!contractId) return

  enviando.value = true
  try {
    const r = await b2bService.contractEnroll({ contract_id: contractId })
    if (r?.result === 0) throw new Error(r.message)

    resultadoEnvio.value = r
    await loadData(contractId)

    if (r.enrolled) toast.success(`${r.enrolled} alumno(s) inscrito(s) en FICO`)
    if (r.rejected) toast.warning(`${r.rejected} cupo(s) sin enviar: revisa el detalle`)
    if (!r.enrolled && !r.rejected) toast.info('No había cupos pendientes de enviar')
  } catch (e) {
    console.error(e)
    toast.error('Error al enviar a FICO: ' + (e?.response?.data?.message || e.message || 'Error desconocido'))
  } finally {
    enviando.value = false
  }
}

function cancelar() { router.back() }

onMounted(async () => {
  if (isEdit.value) await loadData(idParam.value)
  loaded.value = true
})
</script>

<style scoped>
.exec-shell { background: var(--slate-50, #f8fafc); min-height: 100vh; display: flex; flex-direction: column; }
.exec-masthead { background: #fff; border-bottom: 1px solid #e5e7eb; padding: .75rem 1.25rem; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
.masthead-brand { display: flex; align-items: center; gap: .75rem; }
.brand-rule { width: 4px; height: 2rem; background: #3b82f6; border-radius: 2px; }
.brand-eyebrow { font-size: .7rem; font-weight: 600; text-transform: uppercase; color: #6b7280; display: block; }
.brand-title { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0; }
.masthead-actions { display: flex; gap: .5rem; align-items: center; }
.masthead-id { font-size: .72rem; font-weight: 600; color: #6b7280; font-family: 'IBM Plex Mono', monospace; }
.exec-body { flex: 1; padding: 1.25rem; }
.exec-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: start; }
/* La tabla de beneficiarios necesita las dos columnas: es una hoja, no un campo. */
.col-full { grid-column: 1 / -1; }
@media (max-width: 900px) { .exec-form-grid { grid-template-columns: 1fr; } }
.exec-card { background: #fff; border: 1px solid #e5e7eb; border-radius: .5rem; }
.exec-card--empresa { border-color: #3b82f6; border-left-width: 3px; }
.exec-card--plata { border-color: #16a34a; border-left-width: 3px; }
.exec-card--loading { padding: 2.5rem; text-align: center; color: #6b7280; }
.exec-card__header { padding: .65rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: .8rem; font-weight: 600; color: #374151; display: flex; align-items: center; }
.exec-card__header--split { justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.exec-card__body { padding: 1rem; }
.exec-label { font-size: .8rem; font-weight: 500; color: #374151; display: block; margin-bottom: .25rem; }
.exec-input { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; font-size: .875rem; width: 100%; background: #fff; color: #111827; }
.exec-hint { display: block; font-size: .75rem; color: #6b7280; }
.exec-empty { font-size: .8rem; color: #9ca3af; margin: 0; }
.c-red { color: #dc2626; }

.switch-row { display: flex; align-items: center; gap: .5rem; padding-top: .3rem; }
.switch-text { font-size: .8rem; color: #374151; }
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; flex: 0 0 auto; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; cursor: pointer; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

.input-group { display: flex; }
.input-group-text { background: #f9fafb; border: 1px solid #e5e7eb; border-right: none; padding: .4rem .6rem; border-radius: .375rem 0 0 .375rem; display: flex; align-items: center; color: #2563eb; }
.input-group .exec-input { border-radius: 0; }
.input-group .btn-exec { border-radius: 0 .375rem .375rem 0; border-left: none; }

/* Saldo y cupos */
.saldo { background: #f9fafb; font-weight: 600; text-align: right; }
.saldo--deuda { color: #b45309; }
.saldo--exceso { color: #dc2626; }
.rangos { display: flex; gap: .75rem; font-size: .78rem; color: #6b7280; padding-bottom: .5rem; }
.rangos b { color: #111827; }
.cupos-resumen { display: flex; gap: 1.25rem; font-size: .85rem; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .375rem; padding: .45rem .8rem; }
.cupos-resumen--exceso { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
.pegado { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: .5rem; padding: .75rem; }

/* Tabla de beneficiarios */
.tabla-scroll { overflow-x: auto; }
.tabla-beneficiarios { width: 100%; border-collapse: collapse; }
.tabla-beneficiarios th { font-size: .72rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .03em; padding: .35rem .4rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.tabla-beneficiarios td { padding: .25rem .4rem; vertical-align: middle; }
.pill { display: inline-flex; align-items: center; font-size: .72rem; padding: .15rem .5rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.pill-ok { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.pill-pend { background: #fef3c7; color: #b45309; border-color: #fde68a; }
.pill-err { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

/* Nombre original de la hoja, mientras nadie lo haya separado */
.hint-nombre { display: block; font-size: .7rem; color: #9ca3af; padding: .1rem .2rem 0; }

/* Resultado del envío a FICO */
.envio-resultado { border: 1px solid #e5e7eb; border-radius: .5rem; padding: .7rem .8rem; background: #f9fafb; }
.envio-fila { display: flex; align-items: center; gap: .5rem; padding: .18rem 0; }
.envio-nombre { font-size: .82rem; font-weight: 500; }

.btn-exec { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; text-decoration: none; }
.btn-exec[disabled] { opacity: .4; cursor: not-allowed; }
.btn-exec-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-exec-ghost { background-color: transparent; border-color: #d1d5db; color: #374151; }
.btn-exec-danger { background-color: #dc2626; border-color: #dc2626; color: #fff; }
.btn-exec-sm { padding: .25rem .5rem; font-size: .75rem; }
.btn-exec-xs { padding: .15rem .4rem; font-size: .72rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }

/* ══ DARK MODE ══ */
[data-coreui-theme="dark"] .exec-shell { background: #14140F; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-masthead { background: #1A1A14; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .brand-rule { background: #60A5FA; }
[data-coreui-theme="dark"] .brand-eyebrow { color: #A0A099; }
[data-coreui-theme="dark"] .brand-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .masthead-id { color: #8A8A80; }
[data-coreui-theme="dark"] .exec-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .exec-card--empresa { border-color: #60A5FA; }
[data-coreui-theme="dark"] .exec-card--plata { border-color: #4ADE80; }
[data-coreui-theme="dark"] .exec-card--loading { color: #A0A099; }
[data-coreui-theme="dark"] .exec-card__header { border-bottom-color: #24241E; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-hint { color: #8A8A80; }
[data-coreui-theme="dark"] .exec-empty { color: #8A8A80; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .switch-text { color: #F4F4F0; }
[data-coreui-theme="dark"] .form-switch span { background: #3A3A33; }
[data-coreui-theme="dark"] .form-switch input:checked + span { background: #3b82f6; }
[data-coreui-theme="dark"] .input-group-text { background: #1F1F1A; border-color: #3A3A33; color: #60A5FA; }
[data-coreui-theme="dark"] .saldo { background: #1F1F1A; }
[data-coreui-theme="dark"] .saldo--deuda { color: #FBBF24; }
[data-coreui-theme="dark"] .saldo--exceso { color: #F87171; }
[data-coreui-theme="dark"] .rangos { color: #A0A099; }
[data-coreui-theme="dark"] .rangos b { color: #F4F4F0; }
[data-coreui-theme="dark"] .cupos-resumen { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .cupos-resumen--exceso { background: rgba(220,38,38,.14); border-color: rgba(220,38,38,.35); color: #F87171; }
[data-coreui-theme="dark"] .pegado { background: #1F1F1A; border-color: #3A3A33; }
[data-coreui-theme="dark"] .tabla-beneficiarios th { color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .pill-ok { background: rgba(34,197,94,.14); color: #4ADE80; border-color: rgba(34,197,94,.3); }
[data-coreui-theme="dark"] .pill-pend { background: rgba(251,191,36,.14); color: #FBBF24; border-color: rgba(251,191,36,.3); }
[data-coreui-theme="dark"] .pill-err { background: rgba(248,113,113,.14); color: #F87171; border-color: rgba(248,113,113,.3); }
[data-coreui-theme="dark"] .hint-nombre { color: #6B6B63; }
[data-coreui-theme="dark"] .envio-resultado { background: #1F1F18; border-color: #2A2A22; }
[data-coreui-theme="dark"] .btn-exec { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-exec-ghost { background-color: transparent; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-danger { background-color: #dc2626; border-color: #dc2626; color: #fff; }
</style>
