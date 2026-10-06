<template>
  <div ref="contractForm" class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <div class="cf-title-row">
          <h1 class="ds-title">{{ isEdit ? 'Editar contrato' : 'Nuevo contrato B2B' }}</h1>
          <span v-if="isEdit" class="ds-pill" :class="form.active ? 'ok' : ''">
            <i class="fa-solid" :class="form.active ? 'fa-circle-check' : 'fa-circle-pause'" aria-hidden="true"></i>
            {{ form.active ? 'Activo' : 'Inactivo / Cancelado' }}
          </span>
        </div>
        <p class="ds-sub">
          <template v-if="isEdit">Contrato <span class="cf-mono">#{{ idParam }}</span> · datos, plata, descuentos y cupos de la empresa</template>
          <template v-else>Registra el acuerdo con la empresa; los cupos se envían a FICO desde aquí mismo</template>
        </p>
      </div>
      <div class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-outline" @click="cancelar">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Cancelar
        </button>
        <button
          type="button"
          class="btn-exec btn-exec-primary"
          :disabled="!isValid || saving"
          @click="guardar"
        >
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ saving ? 'Guardando…' : 'Guardar contrato' }}
        </button>
      </div>
    </header>

    <template v-if="loaded">
      <div class="ds-row ds-row--mitad cf-cols">
        <div class="ds-stack">
          <section class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-file-signature cf-title-icon" aria-hidden="true"></i> Datos del contrato</h3>
            </header>
            <div class="ds-panel-body ds-form-grid">
              <div class="ds-field cf-span-all">
                <label class="ds-label">Empresa<span class="ds-req">*</span></label>
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

              <div class="ds-field">
                <label class="ds-label">Tipo de contrato<span class="ds-req">*</span></label>
                <SearchSelect
                  v-model="form.cat_contract_type"
                  :items="catalogs.contractTypeList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                  :model-label="form.contract_type_label"
                  @change="opt => { form.contract_type_label = opt ? opt.description : ''; form.contract_type_alias = opt ? opt.alias : null }"
                  required
                />
              </div>

              <div class="ds-field">
                <span class="ds-label">Estado</span>
                <div class="cf-switch-row">
                  <label class="exec-switch exec-switch-lg">
                    <input type="checkbox" v-model="form.active" aria-label="Contrato activo" />
                    <span></span>
                  </label>
                  <span class="cf-switch-text">{{ form.active ? 'Activo' : 'Inactivo / Cancelado' }}</span>
                </div>
              </div>

              <div class="ds-field cf-span-all">
                <label class="ds-label">Nombre del contrato<span class="ds-req">*</span></label>
                <input
                  v-model.trim="form.contract_name"
                  type="text"
                  class="ds-input"
                  placeholder="Ej. CONTRATO MARCO 2026 - EMPRESA S.A.C."
                  v-restrict="'upper|max:200'"
                  required
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Fecha inicio<span class="ds-req">*</span></label>
                <input v-model="form.start_date" type="date" class="ds-input" required />
              </div>

              <div class="ds-field">
                <label class="ds-label">Fecha fin</label>
                <input v-model="form.end_date" type="date" class="ds-input" />
                <span class="ds-help">Vacío = indefinido</span>
              </div>

              <div class="ds-field cf-span-all">
                <label class="ds-label">Descripción</label>
                <textarea
                  v-model.trim="form.description"
                  class="ds-input"
                  rows="2"
                  placeholder="Describe el alcance y condiciones generales del contrato..."
                ></textarea>
              </div>
            </div>
          </section>

          <section class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-briefcase cf-title-icon" aria-hidden="true"></i> Datos comerciales</h3>
            </header>
            <div class="ds-panel-body ds-form-grid">
              <div class="ds-field">
                <label class="ds-label">Tipo de cliente</label>
                <SearchSelect
                  v-model="form.cat_client_type"
                  :items="catalogs.clientTypeList"
                  label-field="description"
                  value-field="id"
                  placeholder="B2B Nacional / Internacional / Estado"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Modalidad</label>
                <SearchSelect
                  v-model="form.cat_modality"
                  :items="catalogs.modalityList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                />
              </div>

              <div class="ds-field cf-span-all">
                <label class="ds-label">Programa vendido</label>
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
                />
                <span class="ds-help">Opcional: si el trato es una bolsa de cupos, cada beneficiario lleva su curso.</span>
              </div>

              <div class="ds-field">
                <label class="ds-label">País</label>
                <input v-model.trim="form.country" type="text" class="ds-input" placeholder="PERÚ" v-restrict="'upper|max:60'" />
              </div>
            </div>
          </section>

          <section class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-flag-checkered cf-title-icon" aria-hidden="true"></i> Hitos comerciales</h3>
            </header>
            <div class="ds-panel-body ds-form-grid cf-grid-fechas">
              <div class="ds-field">
                <label class="ds-label">F. consulta</label>
                <input v-model="form.consultation_date" type="date" class="ds-input" />
              </div>
              <div class="ds-field">
                <label class="ds-label">F. cierre</label>
                <input v-model="form.close_date" type="date" class="ds-input" />
              </div>
              <div class="ds-field">
                <label class="ds-label">F. pago</label>
                <input v-model="form.payment_date" type="date" class="ds-input" />
              </div>
              <div class="ds-field">
                <label class="ds-label">F. confirmación</label>
                <input v-model="form.confirmation_sent_date" type="date" class="ds-input" />
              </div>
              <div class="ds-field">
                <label class="ds-label">F. factura</label>
                <input v-model="form.invoice_date" type="date" class="ds-input" />
              </div>
              <div class="ds-field">
                <span class="ds-label">Días entre hitos</span>
                <div class="cf-ranges">
                  <span class="ds-chip" title="Días entre la consulta y el cierre">C→C {{ rangoCierre ?? '—' }}</span>
                  <span class="ds-chip" title="Días entre el cierre y el pago">C→P {{ rangoPago ?? '—' }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="ds-stack">
          <section class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-sack-dollar cf-title-icon" aria-hidden="true"></i> Registro de plata</h3>
            </header>
            <div class="ds-panel-body ds-form-grid">
              <div class="ds-field">
                <label class="ds-label">Moneda</label>
                <SearchSelect
                  v-model="form.cat_currency"
                  :items="catalogs.currencyList"
                  label-field="description"
                  value-field="id"
                  placeholder="PEN / USD"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Condición de pago</label>
                <SearchSelect
                  v-model="form.cat_payment_terms"
                  :items="catalogs.paymentTermsList"
                  label-field="description"
                  value-field="id"
                  placeholder="Contado / Crédito"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Monto total</label>
                <input v-model.number="form.total_amount" type="number" step="0.01" min="0" class="ds-input cf-num" placeholder="0.00" />
              </div>

              <div class="ds-field">
                <label class="ds-label">Importe pagado</label>
                <input v-model.number="form.paid_amount" type="number" step="0.01" min="0" class="ds-input cf-num" placeholder="0.00" />
              </div>

              <!-- Saldo se calcula: un dato ya resuelto se lee, no se escribe. -->
              <div class="ds-field">
                <span class="ds-label">Saldo</span>
                <output class="ds-input cf-num cf-saldo" :class="{ 'cf-saldo--deuda': saldo > 0, 'cf-saldo--exceso': saldo < 0 }">
                  {{ fmt(saldo) }}
                </output>
              </div>

              <div class="ds-field">
                <label class="ds-label">Equivalente en soles</label>
                <input v-model.number="form.paid_amount_pen" type="number" step="0.01" min="0" class="ds-input cf-num" placeholder="0.00" />
                <span class="ds-help">Solo si cobró en dólares.</span>
              </div>
            </div>
          </section>

          <!-- Solo el convenio reparte % de descuento a los alumnos de la empresa. -->
          <section v-if="esConvenio" class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-percent cf-title-icon" aria-hidden="true"></i> Descuentos del convenio</h3>
              <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="agregarDescuento">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar descuento
              </button>
            </header>
            <div class="ds-panel-body ds-stack">
              <p class="ds-help cf-help-top">
                Porcentaje que se aplica a los alumnos de esta empresa. Dejar tipo y modalidad vacíos = aplica a todo.
              </p>

              <p v-if="!form.discounts.length" class="ds-empty">
                Sin descuentos definidos. Usa "Agregar descuento" para crear uno.
              </p>

              <div v-for="(d, i) in form.discounts" :key="'d' + i" class="cf-item cf-discount">
                <div class="ds-field">
                  <label class="ds-label">Tipo de programa</label>
                  <SearchSelect v-model="d.cat_type_program" :items="catalogs.programTypeList" label-field="description" value-field="id" placeholder="Todos" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Modalidad</label>
                  <SearchSelect v-model="d.cat_model_modality" :items="catalogs.modalityList" label-field="description" value-field="id" placeholder="Todas" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">% descuento<span class="ds-req">*</span></label>
                  <input v-model.number="d.discount_pct" type="number" step="0.01" min="0" max="100" class="ds-input cf-num" placeholder="0" required />
                </div>
                <button
                  class="btn-icon btn-icon-sm cf-danger cf-item-remove"
                  type="button"
                  title="Quitar descuento"
                  aria-label="Quitar descuento"
                  @click="form.discounts.splice(i, 1)"
                >
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </section>

          <section class="ds-panel">
            <header class="ds-panel-head">
              <h3 class="ds-panel-title"><i class="fa-solid fa-file-contract cf-title-icon" aria-hidden="true"></i> Documento y observaciones</h3>
            </header>
            <div class="ds-panel-body ds-form-grid">
              <div class="ds-field cf-span-all">
                <label class="ds-label">URL orden de compra / documento oficial</label>
                <div class="cf-url-row">
                  <div class="cf-icon-wrap">
                    <i class="fa-solid fa-link cf-icon" aria-hidden="true"></i>
                    <input
                      v-model.trim="form.purchase_order_url"
                      type="url"
                      class="ds-input cf-icon-input"
                      placeholder="https://drive.google.com/... o https://sharepoint.com/..."
                      v-restrict="'max:500'"
                    />
                  </div>
                  <a
                    v-if="form.purchase_order_url"
                    :href="form.purchase_order_url"
                    target="_blank"
                    class="btn-icon"
                    title="Abrir documento"
                    aria-label="Abrir documento"
                  >
                    <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  </a>
                </div>
                <span class="ds-help">Pega el enlace al contrato firmado (Drive, SharePoint, etc.)</span>
              </div>

              <div class="ds-field cf-span-all">
                <label class="ds-label">Notas internas</label>
                <textarea
                  v-model.trim="form.notes"
                  class="ds-input"
                  rows="3"
                  placeholder="Notas internas, condiciones especiales, recordatorios..."
                ></textarea>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- El reparto de cupos va a todo el ancho: es una hoja, no un campo. -->
      <section class="ds-panel">
        <header class="ds-panel-head cf-head-wrap">
          <h3 class="ds-panel-title"><i class="fa-solid fa-users cf-title-icon" aria-hidden="true"></i> Cupos y beneficiarios</h3>
          <div class="cf-head-actions">
            <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="mostrarPegado = !mostrarPegado">
              <i class="fa-solid fa-paste" aria-hidden="true"></i> Pegar lista
            </button>
            <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="agregarBeneficiario">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar beneficiario
            </button>
            <button
              class="btn-exec btn-exec-outline btn-sm"
              :disabled="enviando || saving || !cuposPorEnviar"
              :title="cuposPorEnviar
                ? `Crea la inscripción de ${cuposPorEnviar} cupo(s) en FICO`
                : 'No hay cupos pendientes: asigna alumnos con su curso'"
              @click="enviarAFico"
              type="button"
            >
              <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
              {{ enviando ? 'Enviando…' : `Enviar a FICO (${cuposPorEnviar})` }}
            </button>
          </div>
        </header>
        <div class="ds-panel-body ds-stack">
          <div v-if="resultadoEnvio" class="cf-item ds-stack cf-envio">
            <div class="cf-envio-head">
              <strong>
                {{ resultadoEnvio.enrolled }} inscrito(s) ·
                {{ resultadoEnvio.rejected }} sin enviar ·
                {{ resultadoEnvio.skipped }} ya estaban
              </strong>
              <button class="btn-icon btn-icon-sm" type="button" title="Cerrar resultado" aria-label="Cerrar resultado" @click="resultadoEnvio = null">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <ul class="cf-envio-list">
              <li v-for="fila in resultadoEnvio.detail" :key="fila.beneficiary_id" class="cf-envio-fila">
                <span class="ds-pill" :class="fila.estado === 'creado' ? 'ok' : fila.estado === 'ya_matriculado' ? '' : 'bad'">
                  {{ fila.estado.replace('_', ' ') }}
                </span>
                <span class="cf-envio-nombre">{{ fila.full_name }}</span>
                <span class="ds-help cf-envio-msg">{{ fila.mensaje }}</span>
              </li>
            </ul>
          </div>

          <div class="cf-cupos">
            <div class="ds-field cf-cupos-field">
              <label class="ds-label">Cupos comprados</label>
              <input v-model.number="form.number_of_licenses" type="number" min="0" class="ds-input cf-num" placeholder="0" />
            </div>
            <p class="ds-callout cf-cupos-resumen" :class="{ bad: cuposLibres < 0 }">
              <i class="fa-solid" :class="cuposLibres < 0 ? 'fa-triangle-exclamation' : 'fa-chair'" aria-hidden="true"></i>
              <span><strong>{{ form.beneficiaries.length }}</strong> asignados</span>
              <span><strong>{{ cuposLibres }}</strong> libres</span>
              <span><strong>{{ matriculados }}</strong> ya inscritos por FICO</span>
            </p>
          </div>

          <div v-if="mostrarPegado" class="cf-item ds-stack">
            <div class="ds-field">
              <label class="ds-label">Pegar lista de alumnos</label>
              <textarea v-model="textoPegado" class="ds-input" rows="4" placeholder="JUAN CARLOS, PEREZ GOMEZ, 40506070, juan@empresa.com, 999888777"></textarea>
              <span class="ds-help">Una fila por alumno: nombres, apellidos, documento, correo, teléfono.</span>
            </div>
            <div class="cf-head-actions">
              <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="mostrarPegado = false; textoPegado = ''">Cancelar</button>
              <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="importarPegado">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar {{ filasPegadas.length }} beneficiario(s)
              </button>
            </div>
          </div>

          <p v-if="!form.beneficiaries.length" class="ds-empty">
            Sin beneficiarios. Agrega los alumnos que la empresa quiere matricular o pega la lista.
          </p>

          <div v-else class="ds-table-scroll">
            <table class="ds-table ds-table--densa cf-benef">
              <thead>
                <tr>
                  <th style="min-width:170px">Nombres<span class="ds-req">*</span></th>
                  <th style="min-width:170px">Apellidos<span class="ds-req">*</span></th>
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
                    <input v-model.trim="b.first_name" class="ds-input" v-restrict="'upper|max:150'" required aria-label="Nombres" />
                    <!-- El nombre que traía la hoja: quien migró no sabía si venía
                         "NOMBRES APELLIDOS" o al revés, así que lo separa el asesor. -->
                    <small v-if="b.full_name && !b.first_name && !b.last_name" class="ds-help cf-hint-nombre">
                      {{ b.full_name }}
                    </small>
                  </td>
                  <td><input v-model.trim="b.last_name" class="ds-input" v-restrict="'upper|max:150'" required aria-label="Apellidos" /></td>
                  <td><input v-model.trim="b.document_number" class="ds-input cf-mono" v-restrict="'max:20'" aria-label="Documento" /></td>
                  <td><input v-model.trim="b.email" type="email" class="ds-input" v-restrict="'max:120'" aria-label="Correo" /></td>
                  <td><input v-model.trim="b.phone" class="ds-input" v-restrict="'max:20'" aria-label="Teléfono" /></td>
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
                    />
                  </td>
                  <td>
                    <span v-if="b.enrollment_id" class="ds-pill ok" title="Ya tiene inscripción">Inscrito</span>
                    <span v-else class="ds-pill warn">Pendiente</span>
                  </td>
                  <td>
                    <button
                      class="btn-icon btn-icon-sm cf-danger"
                      :disabled="!!b.enrollment_id"
                      :title="b.enrollment_id ? 'Ya está inscrito: anula la inscripción desde FICO' : 'Quitar'"
                      :aria-label="b.enrollment_id ? 'Ya está inscrito: anula la inscripción desde FICO' : 'Quitar beneficiario'"
                      @click="quitarBeneficiario(i)"
                      type="button"
                    >
                      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <section v-else class="ds-panel" aria-busy="true" aria-label="Cargando el contrato">
      <div class="ds-panel-body ds-stack">
        <span v-for="n in 6" :key="n" class="ds-skel"></span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
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
// En persistir (y no en guardar) para que también lo respete enviarAFico.
const contractForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(contractForm)

async function persistir() {
  if (!requiredFieldsFilled()) return null
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
/* Estado pegado al título (DESIGN_SYSTEM §5.4): arriba a la derecha no se ve. */
.cf-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.cf-title-icon { margin-right: 6px; color: var(--ds-muted); }
.cf-mono { font-family: var(--ds-font-mono); }
.cf-span-all { grid-column: 1 / -1; }
.cf-num { text-align: right; font-variant-numeric: tabular-nums; }

/* Las dos columnas crecen por separado: sin esto la más corta se estira. */
.cf-cols { align-items: start; }

/* Seis fechas cortas: 240px de mínimo las dejaba en dos columnas con mucho aire. */
.cf-grid-fechas { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }

.cf-switch-row { display: flex; align-items: center; gap: 10px; min-height: 36px; }
.cf-switch-text { font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }

.cf-ranges { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-height: 36px; }

.cf-saldo { background: var(--ds-surface-2); font-weight: 700; }
.cf-saldo--deuda { color: var(--ds-warn-ink); }
.cf-saldo--exceso { color: var(--ds-bad-ink); }

.cf-help-top { margin-top: 0; }

/* Cada descuento / bloque auxiliar es una tarjeta dentro del panel (§5.5). */
.cf-item { padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.cf-discount { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 110px auto; align-items: end; gap: 10px; }
.cf-item-remove { margin-bottom: 5px; }
.cf-danger { color: var(--ds-bad-ink); }

.cf-url-row { display: flex; align-items: center; gap: 8px; }
.cf-icon-wrap { position: relative; display: flex; align-items: center; flex: 1; min-width: 0; }
.cf-icon { position: absolute; left: 11px; font-size: 13px; color: var(--ds-accent); pointer-events: none; }
.cf-icon-input { padding-left: 32px; }

.cf-head-wrap { flex-wrap: wrap; }
.cf-head-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }

.cf-cupos { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 12px; }
.cf-cupos-field { flex: 0 0 180px; }
.cf-cupos-resumen { flex: 1 1 280px; flex-wrap: wrap; align-items: center; column-gap: 16px; }
.cf-cupos-resumen > i { margin-top: 0; }

.cf-envio-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--ds-heading); }
.cf-envio-list { margin: 0; padding: 0; list-style: none; }
.cf-envio-fila { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 3px 0; }
.cf-envio-nombre { font-size: 12.5px; font-weight: 600; color: var(--ds-ink); }
.cf-envio-msg { margin-top: 0; }

/* Grilla editable (§5.5.1): las celdas llevan inputs, así que van centradas. */
.cf-benef td { vertical-align: middle; }
/* Nombre original de la hoja, mientras nadie lo haya separado */
.cf-hint-nombre { display: block; margin-top: 2px; }

@media (max-width: 600px) {
  .cf-discount { grid-template-columns: minmax(0, 1fr) auto; }
  .cf-discount .ds-field:not(:nth-child(3)) { grid-column: 1 / -1; }
  .cf-cupos-field { flex: 1 1 100%; }
}
</style>
