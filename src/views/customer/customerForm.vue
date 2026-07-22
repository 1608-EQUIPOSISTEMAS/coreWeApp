<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">General · Cliente</span>
            <h1 class="brand-title">{{ isEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelar">
            <i class="fa-solid fa-arrow-left"></i> Cancelar
          </button>
          <button type="button" class="btn-exec btn-exec-primary" @click="guardar" :disabled="saving">
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar') }}
          </button>
        </div>
      </div>
    </header>
    
    <main class="exec-body pb-5" v-if="loaded">
      <div class="exec-form-single">

        <!-- ══ Tipo de Cliente ══ -->
        <div class="exec-card mb-4">
          <div class="exec-card__header">
            <i class="fa-solid fa-id-card me-2 text-muted"></i>
            <span>Tipo de Cliente</span>
          </div>
          <div class="exec-card__body">
            <div class="type-selector">
              <button type="button" class="type-btn" :class="{ 'type-btn--active': !isCompany }" @click="setCompany(false)" :disabled="isEdit">
                <i class="fa-solid fa-user me-2"></i>Persona Natural
              </button>
              <button type="button" class="type-btn" :class="{ 'type-btn--active': isCompany }" @click="setCompany(true)" :disabled="isEdit">
                <i class="fa-solid fa-building me-2"></i>Empresa
              </button>
            </div>
          </div>
        </div>

        <!-- ══ Datos del cliente ══ -->
        <div class="exec-card mb-4">
          <div class="exec-card__header">
            <i class="fa-solid fa-user me-2 text-primary"></i>
            <span>Datos de {{ isCompany ? 'la Empresa' : 'la Persona' }}</span>
          </div>
          <div class="exec-card__body">
            <div class="row g-3">

              <template v-if="!isCompany">
                <div class="col-md-4">
                  <label class="exec-label">Nombres <span class="c-red">*</span></label>
                  <input autocomplete="nope" v-restrict="{ transform: 'upper' }" v-model.trim="form.first_name" type="text" class="exec-input w-100" placeholder="NOMBRES" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Apellido Paterno <span class="c-red">*</span></label>
                  <input autocomplete="nope" v-restrict="{ transform: 'upper' }" v-model.trim="form.last_name" type="text" class="exec-input w-100" placeholder="A. PATERNO" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Apellido Materno</label>
                  <input autocomplete="nope" v-restrict="{ transform: 'upper' }" v-model.trim="form.mother_last_name" type="text" class="exec-input w-100" placeholder="A. MATERNO" />
                </div> 
                <div class="col-md-4">
                  <label class="exec-label">Tipo Documento <span class="c-red">*</span></label>
                  <SearchSelect v-model="form.cat_type_document" :items="catalogs.documentTypeList" label-field="description" value-field="id" placeholder="SELECCIONAR..." class="exec-select-light w-100" />
                </div>
              </template>

              <template v-else>
                <div class="col-md-6">
                  <label class="exec-label">Razón Social <span class="c-red">*</span></label>
                  <input autocomplete="nope" v-restrict="{ transform: 'upper' }" v-model.trim="form.razon_social" type="text" class="exec-input w-100" placeholder="RAZÓN SOCIAL" />
                </div>
                <div class="col-md-6">
                  <label class="exec-label">Razón Comercial</label>
                  <input autocomplete="nope" v-restrict="{ transform: 'upper' }" v-model.trim="form.razon_comercial" type="text" class="exec-input w-100" placeholder="NOMBRE COMERCIAL" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Tipo Documento</label>
                  <SearchSelect v-model="form.cat_type_document" :items="catalogs.documentTypeList" label-field="description" value-field="id" placeholder="SELECCIONAR..." class="exec-select-light w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Sector Empresarial</label>
                  <SearchSelect v-model="form.cat_sector" :items="catalogs.sectorList" label-field="description" value-field="id" placeholder="Seleccionar..." class="exec-select-light w-100" :nullable="true" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label">Clasificación</label>
                  <SearchSelect v-model="form.cat_classification" :items="catalogs.classificationList" label-field="description" value-field="id" placeholder="Micro, Pequeña..." class="exec-select-light w-100" :nullable="true" />
                </div>
                <div class="col-md-4 d-flex flex-column justify-content-end">
                  <label class="exec-label mb-2">Perfil</label>
                  <div class="d-flex align-items-center gap-2">
                    <label class="form-switch">
                      <input type="checkbox" v-model="form.is_intermediary" />
                      <span></span>
                    </label>
                    <span class="small text-muted">Es empresa intermediaria</span>
                  </div>
                </div>
              </template>

              <div class="col-md-4">
                <label class="exec-label">N° Documento <span class="c-red">*</span></label>
                <div class="input-sunat">
                  <input autocomplete="nope" v-model.trim="form.document_number" type="text" class="exec-input text-mono" v-restrict="{ only: 'numbers' }" placeholder="NUMERO" />
                  <button type="button" class="btn-sunat" @click="searchSunat" :disabled="!form.document_number || searchingSunat" title="Buscar en SUNAT">
                    <i class="fa-solid" :class="searchingSunat ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"></i>
                    <span>SUNAT</span>
                  </button>
                </div>
              </div>
              <div class="col-md-4">
                <label class="exec-label">País</label>
                <SearchSelect v-model="form.cat_country" :items="catalogs.countryList" label-field="description" value-field="id" placeholder="PAÍS..." class="exec-select-light w-100" />
              </div>

            </div>
          </div>
        </div>

        <!-- ══ Celulares + Correos (Persona Natural) ══ -->
        <div v-if="!isCompany" class="row g-3 mb-4">

          <div class="col-md-6">
            <div class="exec-card h-100">
              <div class="exec-card__header d-flex justify-content-between align-items-center">
                <div><i class="fa-solid fa-mobile-screen me-2 text-muted"></i><span>Celulares</span></div>
                <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="addPhone">
                  <i class="fa-solid fa-plus me-1"></i> Agregar
                </button>
              </div>
              <div class="exec-card__body">
                <div v-if="!form.phones.length" class="text-muted small py-1">Sin números registrados.</div>
                <div class="contact-list">
                <div v-for="(p, idx) in form.phones" :key="idx" class="contact-row" :class="{ 'contact-row--border': idx > 0 }">
                  <div class="contact-col contact-col--country">
                    <label class="exec-label mb-1">Código</label>
                    <SearchSelect v-model="p.cat_country" :items="phoneCountryCatalog" label-field="variable_2" value-field="id" placeholder="+..." :model-label="countryCodeLabel(p.cat_country)" class="exec-select-light w-100" />
                  </div>
                  <div class="contact-col contact-col--value">
                    <label class="exec-label mb-1">Número</label>
                    <input v-model="p.value" type="text" class="exec-input w-100 text-mono" v-restrict="{ only: 'numbers', max: 15, spaces: false }" placeholder="987654321" />
                  </div>
                  <div class="contact-col contact-col--main">
                    <label class="exec-label mb-1">Ppal.</label>
                    <label class="form-switch mt-1">
                      <input type="checkbox" v-model="p.is_main" @change="onPhoneMainChange(idx)" />
                      <span></span>
                    </label>
                  </div>
                  <div class="contact-col contact-col--del">
                    <label class="exec-label mb-1 invisible">·</label>
                    <button type="button" class="contact-del-btn" @click="removePhone(idx)" title="Eliminar">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="exec-card h-100">
              <div class="exec-card__header d-flex justify-content-between align-items-center">
                <div><i class="fa-solid fa-envelope me-2 text-muted"></i><span>Correos Electrónicos</span></div>
                <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="addEmail">
                  <i class="fa-solid fa-plus me-1"></i> Agregar
                </button>
              </div>
              <div class="exec-card__body">
                <div v-if="!form.emails.length" class="text-muted small py-1">Sin correos registrados.</div>
                <div class="contact-list">
                <div v-for="(e, idx) in form.emails" :key="idx" class="contact-row" :class="{ 'contact-row--border': idx > 0 }">
                  <div class="contact-col contact-col--country-desc">
                    <label class="exec-label mb-1">País</label>
                    <SearchSelect v-model="e.cat_country" :items="catalogs.countryList" label-field="description" value-field="id" placeholder="País..." class="exec-select-light w-100" />
                  </div>
                  <div class="contact-col contact-col--value">
                    <label class="exec-label mb-1">Correo electrónico</label>
                    <input v-model="e.value" type="text" class="exec-input w-100" placeholder="correo@ejemplo.com" />
                  </div>
                  <div class="contact-col contact-col--main">
                    <label class="exec-label mb-1">Ppal.</label>
                    <label class="form-switch mt-1">
                      <input type="checkbox" v-model="e.is_main" @change="onEmailMainChange(idx)" />
                      <span></span>
                    </label>
                  </div>
                  <div class="contact-col contact-col--del">
                    <label class="exec-label mb-1 invisible">·</label>
                    <button type="button" class="contact-del-btn" @click="removeEmail(idx)" title="Eliminar">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ══ Contactos Clave B2B (Empresa) ══ -->
        <div v-if="isCompany" class="exec-card mb-4">
          <div class="exec-card__header d-flex justify-content-between align-items-center">
            <div><i class="fa-solid fa-address-book me-2 text-muted"></i><span>Contactos Clave</span></div>
            <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="addB2bContact">
              <i class="fa-solid fa-plus me-1"></i> Agregar
            </button>
          </div>
          <div class="exec-card__body">
            <div v-if="!form.b2b_contacts.length" class="text-muted small py-1">Sin contactos registrados.</div>
            <div v-for="(c, idx) in form.b2b_contacts" :key="idx" class="b2b-contact-block" :class="{ 'b2b-contact-block--border': idx > 0 }">
              <div class="row g-2 align-items-end">
                <div class="col-md-3">
                  <label class="exec-label mb-1">Nombre</label>
                  <input v-model="c.contact_name" type="text" class="exec-input w-100" v-restrict="{ transform: 'upper', max: 100 }" placeholder="JUAN PÉREZ" />
                </div>
                <div class="col-md-2">
                  <label class="exec-label mb-1">Cargo</label>
                  <input v-model="c.contact_position" type="text" class="exec-input w-100" v-restrict="{ transform: 'upper', max: 100 }" placeholder="GERENTE" />
                </div>
                <div class="col-md-2">
                  <label class="exec-label mb-1">Teléfono</label>
                  <input v-model="c.contact_phone" type="text" class="exec-input w-100 text-mono" v-restrict="{ only: 'numbers', max: 15 }" placeholder="987654321" />
                </div>
                <div class="col-md-3">
                  <label class="exec-label mb-1">Correo</label>
                  <input v-model="c.contact_email" type="text" class="exec-input w-100" placeholder="contacto@empresa.com" />
                </div>
                <div class="col-auto d-flex flex-column align-items-center">
                  <label class="exec-label mb-1">Ppal.</label>
                  <label class="form-switch mt-1">
                    <input type="checkbox" v-model="c.is_main" @change="onB2bPrimaryChange(idx)" />
                    <span></span>
                  </label>
                </div>
                <div class="col-auto d-flex flex-column">
                  <label class="exec-label mb-1 invisible">·</label>
                  <button type="button" class="contact-del-btn" @click="removeB2bContact(idx)" title="Eliminar">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ Empresas Socias (Intermediaria) ══ -->
        <div v-if="isCompany && form.is_intermediary" class="exec-card mb-4">
          <div class="exec-card__header">
            <i class="fa-solid fa-handshake me-2 text-muted"></i><span>Empresas Socias / Afiliadas</span>
          </div>
          <div class="exec-card__body">
            <div class="mb-3">
              <label class="exec-label mb-1">Buscar y vincular empresa</label>
              <SearchSelect
                v-model="affiliatePicker"
                mode="remote"
                :fetcher="affiliateFetcher"
                label-field="razon_social"
                value-field="company_id"
                :nullable="true"
                placeholder="Buscar empresa..."
                @update:modelValue="onAffiliateSelected"
                class="exec-select-light w-100"
              />
            </div>
            <div v-if="!form.affiliates.length" class="text-muted small py-1">Sin empresas vinculadas.</div>
            <div v-for="(aff, idx) in form.affiliates" :key="aff.company_id" class="affiliate-row">
              <div class="affiliate-name">
                <i class="fa-solid fa-building me-2 text-primary"></i>
                <span>{{ aff.razon_social }}</span>
              </div>
              <button type="button" class="contact-del-btn" @click="removeAffiliate(idx)" title="Desvincular">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- ══ Direcciones ══ -->
        <div class="exec-card mb-4">
          <div class="exec-card__header d-flex justify-content-between align-items-center">
            <div><i class="fa-solid fa-location-dot me-2 text-muted"></i><span>Direcciones</span></div>
            <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="addAddress">
              <i class="fa-solid fa-plus me-1"></i> Agregar
            </button>
          </div>
          <div class="exec-card__body">
            <div v-if="!form.addresses.length" class="text-muted small py-1">Sin direcciones registradas.</div>

            <div v-for="(a, idx) in form.addresses" :key="idx" class="address-block" :class="{ 'address-block--border': idx > 0 }">

              <!-- Fila 1: tipo + país + principal -->
              <div class="row g-2 mb-2">
                <div class="col-md-4">
                  <label class="exec-label mb-1">Tipo de Dirección</label>
                  <SearchSelect v-model="a.cat_address_type" :items="catalogs.addressTypeList" label-field="description" value-field="id" placeholder="Fiscal, Domicilio..." class="exec-select-light w-100" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label mb-1">País</label>
                  <SearchSelect v-model="a.cat_country" :items="catalogs.countryList" label-field="description" value-field="id" placeholder="PAÍS..." class="exec-select-light w-100" />
                </div>
                <div class="col-md-2 d-flex flex-column">
                  <label class="exec-label mb-1">Principal</label>
                  <label class="form-switch mt-1">
                    <input type="checkbox" v-model="a.is_main" @change="onMainChange(idx)" />
                    <span></span>
                  </label>
                </div>
                <div class="col-md-2 d-flex flex-column align-items-end">
                  <label class="exec-label mb-1 invisible">·</label>
                  <button type="button" class="contact-del-btn" @click="removeAddress(idx)" title="Eliminar">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              <!-- Fila 2: tipo vía + nombre vía + número -->
              <div class="row g-2 mb-2">
                <div class="col-md-3">
                  <label class="exec-label mb-1">Tipo de Vía</label>
                  <SearchSelect v-model="a.cat_street_type" :items="catalogs.streetTypeList" label-field="description" value-field="id" placeholder="Calle, Av., Jr..." class="exec-select-light w-100" />
                </div>
                <div class="col-md-6">
                  <label class="exec-label mb-1">Nombre de Vía</label>
                  <input v-model="a.street" type="text" class="exec-input w-100" v-restrict="{ transform: 'upper', max: 300 }" placeholder="LOS PINOS, AREQUIPA..." />
                </div>
                <div class="col-md-3">
                  <label class="exec-label mb-1">N° de Puerta</label>
                  <input v-model="a.street_number" type="text" class="exec-input w-100 text-mono" v-restrict="{ max: 50 }" placeholder="123" />
                </div>
              </div>

              <!-- Fila 3: tipo interior + valor interior + código postal -->
              <div class="row g-2 mb-2">
                <div class="col-md-3">
                  <label class="exec-label mb-1">Tipo Interior</label>
                  <SearchSelect v-model="a.cat_interior_type" :items="catalogs.interiorTypeList" label-field="description" value-field="id" placeholder="Piso, Dpto..." class="exec-select-light w-100" :nullable="true" />
                </div>
                <div class="col-md-4">
                  <label class="exec-label mb-1">Interior / Piso</label>
                  <input v-model="a.floor_apt" type="text" class="exec-input w-100" v-restrict="{ max: 100 }" placeholder="3, 2B, INT. 4..." />
                </div>
                <div class="col-md-3">
                  <label class="exec-label mb-1">Cód. Postal</label>
                  <input v-model="a.zip_code" type="text" class="exec-input w-100 text-mono" v-restrict="{ max: 20 }" placeholder="15001" />
                </div>
              </div>

              <!-- Fila 4: referencia -->
              <div class="row g-2">
                <div class="col-12">
                  <label class="exec-label mb-1">Referencia</label>
                  <input v-model="a.reference" type="text" class="exec-input w-100" v-restrict="{ max: 500 }" placeholder="Frente al parque, edificio azul..." />
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </main>

    <main class="exec-body d-flex align-items-center justify-content-center py-5" v-else>
      <div class="text-center text-muted">
        <i class="fa-solid fa-spinner fa-spin fa-2x mb-2"></i>
        <p class="small mb-0">Cargando información...</p>
      </div>
    </main>

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
const customerService = inject(ServiceKeys.Customer)
const b2bService = inject(ServiceKeys.B2b)
const catalog = inject('catalog')

const idParam = computed(() => { const n = Number(route.params?.id); return Number.isFinite(n) ? n : null })
const isEdit = computed(() => !!idParam.value)

const loaded = ref(false)
const saving = ref(false)
const searchingSunat = ref(false)

const form = reactive({
  person_id: null,
  company_id: null,
  cat_client_type: null,
  first_name: '',
  last_name: '',
  mother_last_name: '',
  razon_social: '',
  razon_comercial: '',
  document_number: '',
  cat_type_document: null,
  cat_country: null,
  cat_sector: null,
  cat_classification: null,
  is_intermediary: false,
  phones: [],
  emails: [],
  b2b_contacts: [],
  affiliates: [],
  addresses: [],
})

const catalogs = ref({
  documentTypeList:  catalog.options('we_type_document') || [],
  countryList:       catalog.options('we_country') || [],
  clientTypeList:    catalog.options('we_client').filter(c => c.alias !== 'we_client'),
  addressTypeList:   catalog.options('address_type').filter(c => c.alias !== 'address_type'),
  streetTypeList:    catalog.options('address_street_type').filter(c => c.alias !== 'address_street_type'),
  interiorTypeList:  catalog.options('address_interior_type').filter(c => c.alias !== 'address_interior_type'),
  wayContactList:      catalog.options('we_way_contact').filter(c =>
    ['we_way_contact_phone', 'we_way_contact_email'].includes(c.alias)
  ),
  sectorList:          catalog.options('company_sector').filter(c => c.alias !== 'company_sector'),
  classificationList:  catalog.options('company_classification').filter(c => c.alias !== 'company_classification'),
})

const personTypeId  = computed(() => catalogs.value.clientTypeList.find(c => c.alias === 'we_client_person')?.id)
const companyTypeId = computed(() => catalogs.value.clientTypeList.find(c => c.alias === 'we_client_company')?.id)
const isCompany     = computed(() => form.cat_client_type === companyTypeId.value)

const dniTypeId = computed(() => catalogs.value.documentTypeList.find(c => c.alias === 'we_type_document_dni')?.id ?? null)
const rucTypeId = computed(() => catalogs.value.documentTypeList.find(c => c.alias === 'we_type_document_ruc')?.id ?? null)

function setCompany(val) {
  if (!isEdit.value) {
    form.cat_client_type   = val ? companyTypeId.value : personTypeId.value
    form.cat_type_document = val ? rucTypeId.value : dniTypeId.value
  }
}

const phoneWayContactId = computed(() => catalogs.value.wayContactList.find(c => c.alias === 'we_way_contact_phone')?.id)
const emailWayContactId = computed(() => catalogs.value.wayContactList.find(c => c.alias === 'we_way_contact_email')?.id)

const peruId = computed(() => catalogs.value.countryList.find(c => c.alias === 'we_country_peru')?.id ?? null)

const phoneCountryCatalog = computed(() => catalogs.value.countryList.filter(c => c.variable_2))

function countryCodeLabel(id) {
  if (!id) return ''
  return phoneCountryCatalog.value.find(c => c.id === id)?.variable_2 || ''
}

// ── Phones ──────────────────────────────────────────────
function addPhone() { form.phones.push({ cat_country: peruId.value, value: '', is_main: false }) }
function removePhone(idx) { form.phones.splice(idx, 1) }
function onPhoneMainChange(idx) {
  if (form.phones[idx].is_main) form.phones.forEach((p, i) => { if (i !== idx) p.is_main = false })
}

// ── Emails ──────────────────────────────────────────────
function addEmail() { form.emails.push({ cat_country: peruId.value, value: '', is_main: false }) }
function removeEmail(idx) { form.emails.splice(idx, 1) }
function onEmailMainChange(idx) {
  if (form.emails[idx].is_main) form.emails.forEach((e, i) => { if (i !== idx) e.is_main = false })
}

// ── Addresses ───────────────────────────────────────────
function newAddress() {
  return { cat_address_type: null, cat_country: peruId.value, cat_street_type: null, street: '', street_number: '', cat_interior_type: null, floor_apt: '', zip_code: '', reference: '', is_main: false }
}
function addAddress() { form.addresses.push(newAddress()) }
function removeAddress(idx) { form.addresses.splice(idx, 1) }
function onMainChange(idx) {
  if (form.addresses[idx].is_main) form.addresses.forEach((a, i) => { if (i !== idx) a.is_main = false })
}

// ── B2B Contacts ─────────────────────────────────────────
function addB2bContact() {
  form.b2b_contacts.push({ contact_name: '', contact_position: '', contact_phone: '', contact_email: '', is_main: false })
}
function removeB2bContact(idx) { form.b2b_contacts.splice(idx, 1) }
function onB2bPrimaryChange(idx) {
  if (form.b2b_contacts[idx].is_main) form.b2b_contacts.forEach((c, i) => { if (i !== idx) c.is_main = false })
}

// ── Affiliates ────────────────────────────────────────────
const affiliatePicker = ref(null)
const affiliateOptions = ref([])
async function affiliateFetcher(q) {
  const items = await b2bService.companyCaller({ 
    q, 
    size: 20, 
    page: 1, 
    exclude_id: form.company_id || null 
  })
  affiliateOptions.value = items || []
  return items || []
}
function onAffiliateSelected(id) {
  if (!id) return
  const company = affiliateOptions.value.find(c => c.company_id === id)
  if (!company) return
  if (form.affiliates.some(a => a.company_id === id)) { affiliatePicker.value = null; return }
  form.affiliates.push({ company_id: id, razon_social: company.razon_social })
  affiliatePicker.value = null
}
function removeAffiliate(idx) { form.affiliates.splice(idx, 1) }

// ── SUNAT ────────────────────────────────────────────────
async function searchSunat() {
  if (!form.document_number) return
  searchingSunat.value = true
  try {
    const data = await customerService.sunatGet({ document: form.document_number })
    if (data && data.nombre_o_razon_social) {
      form.razon_social = data.nombre_o_razon_social
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else if (data && (data.nombres || data.apellido_paterno)) {
      form.first_name       = data.nombres          || ''
      form.last_name        = data.apellido_paterno  || ''
      form.mother_last_name = data.apellido_materno  || ''
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.', { timeout: 3000 })
    }
  } catch (e) {
    toast.error('Error consultando SUNAT')
  } finally {
    searchingSunat.value = false
  }
}

// ── Validación ───────────────────────────────────────────
const isValid = computed(() => {
  if (isCompany.value) return !!form.razon_social && !!form.document_number
  return !!form.first_name && !!form.last_name && !!form.document_number && !!form.cat_type_document
})

// ── Cargar ───────────────────────────────────────────────
async function loadData(id) {
  try {
    const data = await customerService.customerGet({ id })
    if (!data) throw new Error('Cliente no encontrado')
    form.cat_client_type = data.cat_client_type ?? (data.company_id ? companyTypeId.value : personTypeId.value)
    form.person_id = data.person_id
    form.company_id = data.company_id
    form.first_name = data.first_name || ''
    form.last_name = data.last_name || ''
    form.mother_last_name = data.mother_last_name || ''
    form.razon_social = data.razon_social || ''
    form.razon_comercial = data.razon_comercial || ''
    form.document_number = data.person_document_number || data.company_document_number || ''
    form.cat_type_document = data.person_cat_type_document || data.company_cat_type_document || null
    form.cat_country        = data.cat_country        || null
    form.cat_sector         = data.cat_sector         ?? null
    form.cat_classification = data.cat_classification ?? null
    form.is_intermediary    = !!data.is_intermediary
    // Contactos persona
    const contacts = data.contacts || []
    form.phones = contacts
      .filter(c => c.cat_way_contact === phoneWayContactId.value)
      .map(c => ({ cat_country: c.cat_country ?? null, value: c.value || '', is_main: !!c.is_main }))
    form.emails = contacts
      .filter(c => c.cat_way_contact === emailWayContactId.value)
      .map(c => ({ cat_country: c.cat_country ?? null, value: c.value || '', is_main: !!c.is_main }))
    // Contactos B2B
    form.b2b_contacts = (data.b2b_contacts || []).map(c => ({
      contact_name:     c.contact_name     || '',
      contact_position: c.contact_position || '',
      contact_phone:    c.contact_phone    || '',
      contact_email:    c.contact_email    || '',
      is_main:          !!c.is_main,
    }))
    // Empresas afiliadas
    form.affiliates = (data.affiliates || []).map(a => ({
      company_id:   a.company_id,
      razon_social: a.razon_social || '',
    }))
    // Direcciones
    form.addresses = (data.addresses || []).map(a => ({
      cat_address_type:  a.cat_address_type  ?? null,
      cat_country:       a.cat_country       ?? null,
      cat_street_type:   a.cat_street_type   ?? null,
      street:            a.street            || '',
      street_number:     a.street_number     || '',
      cat_interior_type: a.cat_interior_type ?? null,
      floor_apt:         a.floor_apt         || '',
      zip_code:          a.zip_code          || '',
      reference:         a.reference         || '',
      is_main:           !!a.is_main,
    }))
  } catch (error) {
    console.error(error)
    toast.error('Error al cargar cliente')
    router.push({ name: 'CustomerList' })
  }
}

// ── Guardar ───────────────────────────────────────────────
async function guardar() {
  if (!isValid.value) { toast.warning('Complete los campos obligatorios.'); return }
  saving.value = true
  try {
    const customer = {
      cat_client_type:  form.cat_client_type,
      document_number:  form.document_number,
      cat_type_document: form.cat_type_document,
      cat_country:      form.cat_country,
    }
    if (isCompany.value) {
      customer.razon_social       = form.razon_social
      customer.razon_comercial    = form.razon_comercial
      customer.cat_sector         = form.cat_sector         || null
      customer.cat_classification = form.cat_classification || null
      customer.is_intermediary    = form.is_intermediary
      if (isEdit.value) customer.company_id = form.company_id
    } else {
      customer.first_name       = form.first_name
      customer.last_name        = form.last_name
      customer.mother_last_name = form.mother_last_name
      if (isEdit.value) customer.person_id = form.person_id
    }

    const contacts = isCompany.value
      ? form.b2b_contacts.map(c => ({
          contact_name:     c.contact_name     || null,
          contact_position: c.contact_position || null,
          contact_phone:    c.contact_phone    || null,
          contact_email:    c.contact_email    || null,
          is_main:          c.is_main,
        }))
      : [
          ...form.phones
            .filter(p => p.value?.trim())
            .map(p => ({ cat_way_contact: phoneWayContactId.value, cat_country: p.cat_country || null, value: p.value.trim(), is_main: p.is_main })),
          ...form.emails
            .filter(e => e.value?.trim())
            .map(e => ({ cat_way_contact: emailWayContactId.value, cat_country: e.cat_country || null, value: e.value.trim(), is_main: e.is_main })),
        ]

    const affiliate_ids = form.affiliates.map(a => a.company_id)

    const addresses = form.addresses.map(a => ({
      cat_address_type:  a.cat_address_type  || null,
      cat_country:       a.cat_country       || null,
      cat_street_type:   a.cat_street_type   || null,
      street:            a.street            || null,
      street_number:     a.street_number     || null,
      cat_interior_type: a.cat_interior_type || null,
      floor_apt:         a.floor_apt         || null,
      zip_code:          a.zip_code          || null,
      reference:         a.reference         || null,
      is_main:           a.is_main,
    }))

    let res
    if (isEdit.value) res = await customerService.customerUpdate({ id: idParam.value, customer, contacts, addresses, affiliate_ids })
    else              res = await customerService.customerRegister({ customer, contacts, addresses, affiliate_ids })

    if (res && (res.customer_id || res.id)) {
      toast.success(isEdit.value ? 'Actualizado correctamente' : 'Registrado correctamente')
      router.push({ name: 'CustomerList' })
    } else throw new Error('Respuesta inválida')
  } catch (e) {
    console.error(e)
    toast.error('Error: ' + (e.response?.data?.message || e.message || 'Error desconocido'))
  } finally {
    saving.value = false
  }
}

function cancelar() { router.back() }

onMounted(async () => {
  if (isEdit.value) {
    await loadData(idParam.value)
  } else {
    form.cat_client_type   = personTypeId.value
    form.cat_type_document = dniTypeId.value
    form.cat_country       = peruId.value
  }
  loaded.value = true
})
</script>

<style scoped>
.exec-shell { background: var(--slate-50, #f8fafc); min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }

/* ══ MASTHEAD ═══════════════════════════════════════════════════ */
.exec-masthead { background: var(--navy-900, #0f172a); color: #fff; border-bottom: 1px solid var(--navy-700, #334155); position: sticky; top: 0; z-index: 100; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; flex-wrap: wrap; gap: .5rem; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ══ BODY ════════════════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 20px 28px; }
.exec-form-single { max-width: 860px; margin: 0 auto; }

/* ══ BOTONES ═════════════════════════════════════════════════════ */
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: #0d9488; color: #fff; border-color: #0d9488; }
.btn-exec-primary:hover:not(:disabled) { background: #0f766e; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }

/* ══ CARDS ═══════════════════════════════════════════════════════ */
.exec-card { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.exec-card__header { padding: .65rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: .8rem; font-weight: 600; color: #374151; display: flex; align-items: center; }
.exec-card__body { padding: 1.25rem; }

/* ══ INPUTS ══════════════════════════════════════════════════════ */
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input { border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; background: #fff; width: 100%; box-sizing: border-box; }
.exec-input:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-select-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.c-red { color: #dc2626; }

/* ══ SUNAT ════════════════════════════════════════════════════════ */
.input-sunat { display: flex; }
.input-sunat .exec-input { flex: 1; border-radius: 4px 0 0 4px; border-right: none; width: auto; }
.btn-sunat { display: inline-flex; align-items: center; gap: 5px; padding: 0 11px; height: 36px; background: #1e40af; color: #fff; border: 1px solid #1e40af; border-radius: 0 4px 4px 0; font-size: 11px; font-weight: 700; letter-spacing: .04em; cursor: pointer; white-space: nowrap; transition: background .15s; font-family: inherit; flex-shrink: 0; }
.btn-sunat:hover:not(:disabled) { background: #1d4ed8; }
.btn-sunat:disabled { opacity: .45; cursor: default; }

/* ══ TIPO SELECTOR ════════════════════════════════════════════════ */
.type-selector { display: flex; gap: .5rem; }
.type-btn { flex: 1; padding: 10px 16px; border-radius: 4px; border: 1px solid var(--border, #e2e8f0); background: #fff; color: var(--text-secondary, #475569); font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.type-btn:hover:not(:disabled) { border-color: var(--teal-500, #14b8a6); }
.type-btn--active { background: #f0fdfa; border-color: #0d9488; color: #0d9488; font-weight: 700; }
.type-btn:disabled { opacity: .5; cursor: default; }

/* ══ SWITCH ══════════════════════════════════════════════════════ */
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #0d9488; }
.form-switch input:checked + span::after { left: 21px; }

/* ══ CONTACTOS / EMAILS ══════════════════════════════════════════ */
.contact-list { max-height: 180px; overflow-y: auto; padding-right: 2px; }
.contact-list::-webkit-scrollbar { width: 4px; }
.contact-list::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
.contact-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.contact-row { display: flex; align-items: flex-end; gap: .75rem; padding: .5rem 0; }
.contact-row--border { border-top: 1px solid var(--slate-100, #f1f5f9); padding-top: .75rem; margin-top: .25rem; }
.contact-col { display: flex; flex-direction: column; }
.contact-col--country { flex: 0 0 110px; }
.contact-col--country-desc { flex: 0 0 130px; }
.contact-col--value { flex: 1; }
.contact-col--main { flex: 0 0 44px; display: flex; flex-direction: column; align-items: center; }
.contact-col--del { flex: 0 0 auto; }
.contact-del-btn { width: 34px; height: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 12px; transition: all .15s; }
.contact-del-btn:hover { background: #fee2e2; border-color: #f87171; }
.invisible { visibility: hidden; }

/* ══ CONTACTOS B2B ════════════════════════════════════════════════ */
.b2b-contact-block { padding: .6rem 0; }
.b2b-contact-block--border { border-top: 1px solid var(--slate-100, #f1f5f9); margin-top: .25rem; padding-top: .75rem; }

/* ══ AFFILIATES ═══════════════════════════════════════════════════ */
.affiliate-row { display: flex; align-items: center; justify-content: space-between; padding: .4rem .5rem; border-radius: 4px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: .4rem; font-size: 12.5px; }
.affiliate-name { display: flex; align-items: center; flex: 1; font-weight: 500; color: #0f172a; }

/* ══ DIRECCIONES ══════════════════════════════════════════════════ */
.address-block { padding: .75rem 0; }
.address-block--border { border-top: 2px solid var(--slate-100, #f1f5f9); margin-top: .5rem; }

@media (max-width: 768px) {
  .masthead-inner { padding: 12px 16px; }
  .exec-body { padding: 16px 12px; }
  .type-selector { flex-direction: column; }
  .contact-row { flex-wrap: wrap; }
  .contact-col--country { flex: 0 0 110px; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  /* los var(--x, fallback) no estan definidos en light: definirlos solo
     en dark no altera el modo claro */
  --slate-50: #1F1F1A;
  --slate-100: #24241E;
  --slate-300: #3A3A33;
  --slate-400: #8A8A80;
  --border: #2A2A22;
  --text-primary: #F4F4F0;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
  background: #14140F;
}
[data-coreui-theme="dark"] .exec-shell .exec-card { background: #1A1A14; box-shadow: 0 1px 3px rgba(0, 0, 0, .4); }
[data-coreui-theme="dark"] .exec-shell .exec-card__header { border-bottom-color: #2A2A22; color: #C9C9C1; }
[data-coreui-theme="dark"] .exec-shell .exec-input,
[data-coreui-theme="dark"] .exec-shell .exec-select-light { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .btn-exec-outline { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .btn-exec-outline:hover:not(:disabled) { background: #24241E; }
[data-coreui-theme="dark"] .exec-shell .c-red { color: #F87171; }
[data-coreui-theme="dark"] .exec-shell .type-btn { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .type-btn--active { background: rgba(20, 184, 166, .12); border-color: #2DD4BF; color: #2DD4BF; }
[data-coreui-theme="dark"] .exec-shell .form-switch span { background: #3A3A33; }
[data-coreui-theme="dark"] .exec-shell .form-switch input:checked + span { background: #0d9488; }
[data-coreui-theme="dark"] .exec-shell .contact-list::-webkit-scrollbar-track { background: #24241E; }
[data-coreui-theme="dark"] .exec-shell .contact-list::-webkit-scrollbar-thumb { background: #3A3A33; }
[data-coreui-theme="dark"] .exec-shell .contact-del-btn { background: rgba(239, 68, 68, .14); border-color: rgba(239, 68, 68, .35); color: #F87171; }
[data-coreui-theme="dark"] .exec-shell .contact-del-btn:hover { background: rgba(239, 68, 68, .22); border-color: rgba(239, 68, 68, .5); }
[data-coreui-theme="dark"] .exec-shell .affiliate-row { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .exec-shell .affiliate-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-shell .text-muted { color: #8A8A80; }
</style>
