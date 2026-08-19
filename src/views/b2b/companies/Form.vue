<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">B2B · Empresas</span>
            <h1 class="brand-title">{{ isEdit ? 'Editar Empresa' : 'Nueva Empresa' }}</h1>
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

        <div class="col-left">

          <div class="exec-card exec-card--empresa mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-building me-2 text-primary"></i>
              <span>Datos de la Empresa</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-12">
                  <label class="exec-label">Razón Social <span class="c-red">*</span></label>
                  <input
                    v-model.trim="form.razon_social"
                    type="text"
                    class="exec-input w-100"
                    placeholder="EMPRESA S.A.C."
                    v-restrict="'upper|max:200'"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">RUC / Nro. Documento <span class="c-red">*</span></label>
                  <input
                    v-model.trim="form.document_number"
                    type="text"
                    class="exec-input w-100"
                    placeholder="20XXXXXXXXX"
                    v-restrict="'max:20'"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Nombre Comercial</label>
                  <input
                    v-model.trim="form.razon_comercial"
                    type="text"
                    class="exec-input w-100"
                    placeholder="Nombre con el que se le conoce"
                    v-restrict="'upper|max:200'"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Sector</label>
                  <SearchSelect
                    v-model="form.cat_sector"
                    :items="sectorList"
                    label-field="description"
                    value-field="id"
                    placeholder="Seleccionar..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Clasificación</label>
                  <SearchSelect
                    v-model="form.cat_classification"
                    :items="classificationList"
                    label-field="description"
                    value-field="id"
                    placeholder="Micro, Pequeña..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-12">
                  <label class="exec-label">Tipo de Empresa</label>
                  <div class="switch-row">
                    <label class="form-switch" title="Empresa Intermediaria">
                      <input type="checkbox" v-model="form.is_intermediary" />
                      <span></span>
                    </label>
                    <span class="switch-text">
                      {{ form.is_intermediary ? 'Intermediaria (ej: GoIntegro, holding)' : 'Empresa Normal' }}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Solo tiene sentido en una intermediaria: son las empresas que
               acceden al beneficio a través de ella. -->
          <div v-if="form.is_intermediary" class="exec-card mb-4">
            <div class="exec-card__header exec-card__header--split">
              <span>
                <i class="fa-solid fa-sitemap me-2 text-muted"></i>
                Empresas Socias Vinculadas
              </span>
              <button class="btn-exec btn-exec-sm" @click="addAffiliate" type="button">
                <i class="fa-solid fa-plus"></i> Vincular
              </button>
            </div>
            <div class="exec-card__body">
              <p v-if="!form.affiliates.length" class="exec-empty">Sin empresas vinculadas aún.</p>

              <div
                v-for="(aff, idx) in form.affiliates"
                :key="idx"
                class="d-flex align-items-center gap-2 mb-2"
              >
                <div class="flex-grow-1">
                  <SearchSelect
                    v-model="aff.company_id"
                    mode="remote"
                    :fetcher="q => b2bService.companyList({ q, size: 20, page: 1 }).then(r => r.items || [])"
                    label-field="razon_social"
                    value-field="company_id"
                    placeholder="BUSCAR EMPRESA SOCIA..."
                    class="exec-select-light w-100"
                  />
                </div>
                <button class="btn-exec btn-exec-xs btn-exec-danger" @click="removeAffiliate(idx)" type="button">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="col-right">

          <div class="exec-card mb-4">
            <div class="exec-card__header exec-card__header--split">
              <span>
                <i class="fa-solid fa-address-book me-2 text-muted"></i>
                Contactos
              </span>
              <button class="btn-exec btn-exec-sm" @click="addContact" type="button">
                <i class="fa-solid fa-plus"></i> Agregar contacto
              </button>
            </div>
            <div class="exec-card__body">

              <p v-if="!form.contacts.length" class="exec-empty">
                Sin contactos. Agrega al menos el contacto principal.
              </p>

              <div
                v-for="(contact, idx) in form.contacts"
                :key="idx"
                class="contact-card mb-3"
                :class="{ 'contact-card--primary': contact.is_primary }"
              >
                <div class="contact-card__header">
                  <span v-if="contact.is_primary" class="pill pill-primary">
                    <i class="fa-solid fa-star me-1"></i> Principal
                  </span>
                  <span v-else class="contact-card__index">Contacto {{ idx + 1 }}</span>
                  <div class="d-flex gap-2">
                    <button
                      v-if="!contact.is_primary"
                      class="btn-exec btn-exec-xs"
                      @click="setPrimary(idx)"
                      title="Marcar como principal"
                      type="button"
                    >
                      <i class="fa-regular fa-star text-warning"></i>
                    </button>
                    <button
                      class="btn-exec btn-exec-xs btn-exec-danger"
                      @click="removeContact(idx)"
                      title="Eliminar"
                      type="button"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>

                <div class="row g-2">
                  <div class="col-md-6">
                    <label class="exec-label">Nombre <span class="c-red">*</span></label>
                    <input v-model.trim="contact.contact_name" type="text" class="exec-input w-100" placeholder="Juan Pérez" />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Cargo</label>
                    <input v-model.trim="contact.contact_position" type="text" class="exec-input w-100" placeholder="Gerente de RRHH" />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Teléfono</label>
                    <input v-model.trim="contact.contact_phone" type="text" class="exec-input w-100" placeholder="+51 9XXXXXXXX" v-restrict="'max:20'" />
                  </div>
                  <div class="col-md-6">
                    <label class="exec-label">Email</label>
                    <input v-model.trim="contact.contact_email" type="email" class="exec-input w-100" placeholder="contacto@empresa.com" v-restrict="'max:120'" />
                  </div>
                </div>
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
const catalogSvc = inject('catalog')

// options() incluye la fila padre del catálogo; solo interesan los hijos.
const sectorList = catalogSvc.options('company_sector').filter(c => c.alias !== 'company_sector')
const classificationList = catalogSvc.options('company_classification').filter(c => c.alias !== 'company_classification')

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
  razon_social: '',
  razon_comercial: '',
  document_number: '',
  is_intermediary: false,
  cat_sector: null,
  cat_classification: null,
  contacts: [],
  affiliates: [],
})

// Validación
const isValid = computed(() => {
  return (
    !!form.razon_social &&
    !!form.document_number &&
    form.contacts.every(c => !!c.contact_name)
  )
})

// ── Contactos ────────────────────────────────────────────

function addContact() {
  form.contacts.push({
    contact_name: '',
    contact_position: '',
    contact_phone: '',
    contact_email: '',
    is_primary: form.contacts.length === 0,
  })
}

function removeContact(idx) {
  const wasPrimary = form.contacts[idx].is_primary
  form.contacts.splice(idx, 1)
  if (wasPrimary && form.contacts.length > 0) {
    form.contacts[0].is_primary = true
  }
}

function setPrimary(idx) {
  form.contacts.forEach((c, i) => { c.is_primary = i === idx })
}

// ── Afiliados ────────────────────────────────────────────

function addAffiliate() {
  form.affiliates.push({ company_id: null })
}

function removeAffiliate(idx) {
  form.affiliates.splice(idx, 1)
}

// ── Cargar datos (editar) ────────────────────────────────

async function loadData(id) {
  try {
    const data = await b2bService.companyGet({ id })
    if (!data?.company_id) throw new Error('Empresa no encontrada')

    form.razon_social = data.razon_social || ''
    form.razon_comercial = data.commercial_name || ''
    form.document_number = data.document_number || ''
    form.is_intermediary = data.is_intermediary === 'Y'
    form.cat_sector = data.cat_sector ?? null
    form.cat_classification = data.cat_classification ?? null

    form.contacts = (data.contacts || []).map(c => ({
      contact_id: c.contact_id,
      contact_name: c.contact_name || '',
      contact_position: c.contact_position || '',
      contact_phone: c.contact_phone || '',
      contact_email: c.contact_email || '',
      is_primary: c.is_primary === 'Y',
    }))

    form.affiliates = (data.affiliates || []).map(a => ({
      company_id: a.company_id,
    }))
  } catch (e) {
    console.error(e)
    toast.error('Error cargando la empresa')
    router.back()
  }
}

// ── Guardar ──────────────────────────────────────────────

async function guardar() {
  if (!isValid.value) {
    toast.warning('Completa los campos obligatorios.')
    return
  }

  saving.value = true
  try {
    const payload = {
      company: {
        razon_social: form.razon_social,
        razon_comercial: form.razon_comercial || null,
        document_number: form.document_number,
        is_intermediary: form.is_intermediary ? 'Y' : 'N',
        cat_sector: form.cat_sector || null,
        cat_classification: form.cat_classification || null,
      },
      contacts: form.contacts.map(c => ({
        ...(c.contact_id ? { contact_id: c.contact_id } : {}),
        contact_name: c.contact_name,
        contact_position: c.contact_position || null,
        contact_phone: c.contact_phone || null,
        contact_email: c.contact_email || null,
        is_primary: c.is_primary ? 'Y' : 'N',
      })),
      affiliate_ids: form.affiliates
        .map(a => a.company_id)
        .filter(Boolean),
    }

    // El SP contesta HTTP 200 tambien cuando rechaza (result 0 + motivo): sin
    // esta guarda la pantalla canta "creada" y la empresa nunca existio.
    if (isEdit.value) {
      payload.id = idParam.value
      const r = await b2bService.companyUpdate(payload)
      if (r?.result === 0) throw new Error(r.message)
      toast.success('Empresa actualizada correctamente')
    } else {
      const r = await b2bService.companyRegister(payload)
      if (r?.result === 0) throw new Error(r.message)
      toast.success('Empresa creada correctamente')
    }

    router.push({ name: 'B2BCompanies' })
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
@media (max-width: 900px) { .exec-form-grid { grid-template-columns: 1fr; } }
.exec-card { background: #fff; border: 1px solid #e5e7eb; border-radius: .5rem; }
.exec-card--empresa { border-color: #3b82f6; border-left-width: 3px; }
.exec-card--loading { padding: 2.5rem; text-align: center; color: #6b7280; }
.exec-card__header { padding: .65rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: .8rem; font-weight: 600; color: #374151; display: flex; align-items: center; }
.exec-card__header--split { justify-content: space-between; }
.exec-card__body { padding: 1rem; }
.exec-label { font-size: .8rem; font-weight: 500; color: #374151; display: block; margin-bottom: .25rem; }
.exec-input { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; font-size: .875rem; width: 100%; }
.exec-empty { font-size: .8rem; color: #9ca3af; margin: 0; }
.c-red { color: #dc2626; }

.switch-row { display: flex; align-items: center; gap: .5rem; padding-top: .15rem; }
.switch-text { font-size: .8rem; color: #374151; }
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; flex: 0 0 auto; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; cursor: pointer; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

.contact-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .5rem; padding: .75rem; }
.contact-card--primary { border-color: #3b82f6; background: #eff6ff; }
.contact-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.contact-card__index { font-size: .75rem; color: #6b7280; }
.pill { font-size: .72rem; padding: .15rem .5rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.pill-primary { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }

.btn-exec { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
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
[data-coreui-theme="dark"] .exec-card--loading { color: #A0A099; }
[data-coreui-theme="dark"] .exec-card__header { border-bottom-color: #24241E; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-empty { color: #8A8A80; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .switch-text { color: #F4F4F0; }
[data-coreui-theme="dark"] .form-switch span { background: #3A3A33; }
[data-coreui-theme="dark"] .form-switch input:checked + span { background: #3b82f6; }
[data-coreui-theme="dark"] .contact-card { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .contact-card--primary { border-color: #60A5FA; background: rgba(59,130,246,.14); }
[data-coreui-theme="dark"] .contact-card__index { color: #A0A099; }
[data-coreui-theme="dark"] .pill-primary { background: rgba(59,130,246,.14); color: #60A5FA; border-color: rgba(59,130,246,.3); }
[data-coreui-theme="dark"] .btn-exec { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-exec-ghost { background-color: transparent; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-danger { background-color: #dc2626; border-color: #dc2626; color: #fff; }
</style>
