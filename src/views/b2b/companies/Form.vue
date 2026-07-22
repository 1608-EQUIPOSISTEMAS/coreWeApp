<template>
  <div class="container-fluid px-3 py-3 lead-form">
    <div class="card shadow-sm border-0">

      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">{{ isEdit ? 'Editar Empresa' : 'Nueva Empresa' }}</div>
          <div class="text-muted small" v-if="isEdit">ID: <span class="fw-bold">{{ idParam }}</span></div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline btn-sm" @click="cancelar">Cancelar</button>
          <button class="btn btn-primary btn-sm" :disabled="!isValid || saving" @click="guardar">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">

        <!-- ── Datos de la Empresa ── -->
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos de la Empresa</span>
          </div>
          <div class="row g-3 form-section__body">

            <div class="col-md-6">
              <label class="form-label mb-1">Razón Social <span class="required-star">*</span></label>
              <input
                v-model.trim="form.razon_social"
                type="text"
                class="form-control"
                placeholder="EMPRESA S.A.C."
                v-restrict="'upper|max:200'"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">RUC / Nro. Documento <span class="required-star">*</span></label>
              <input
                v-model.trim="form.document_number"
                type="text"
                class="form-control"
                placeholder="20XXXXXXXXX"
                v-restrict="'max:20'"
              />
            </div>

            <div class="col-md-3 d-flex flex-column justify-content-end">
              <label class="form-label mb-1">Tipo de Empresa</label>
              <div class="d-flex align-items-center gap-2 py-2">
                <label class="form-switch" title="Empresa Intermediaria">
                  <input type="checkbox" v-model="form.is_intermediary" />
                  <span></span>
                </label>
                <span class="small">
                  {{ form.is_intermediary ? 'Intermediaria (ej: GoIntegro, holding)' : 'Empresa Normal' }}
                </span>
              </div>
            </div>

          </div>
        </section>

        <!-- ── Contactos ── -->
        <section class="form-section mb-4">
          <div class="form-section__header d-flex justify-content-between align-items-center">
            <span class="form-section__title">Contactos</span>
            <button class="btn btn-outline btn-sm" @click="addContact" type="button">
              <i class="fa-solid fa-plus me-1"></i> Agregar contacto
            </button>
          </div>

          <div v-if="!form.contacts.length" class="text-muted small py-2 px-1">
            Sin contactos. Agrega al menos el contacto principal.
          </div>

          <div
            v-for="(contact, idx) in form.contacts"
            :key="idx"
            class="contact-card mb-3"
            :class="{ 'contact-card--primary': contact.is_primary }"
          >
            <div class="contact-card__header">
              <div class="d-flex align-items-center gap-2">
                <span v-if="contact.is_primary" class="badge badge-primary-contact">
                  <i class="fa-solid fa-star me-1"></i> Principal
                </span>
                <span v-else class="text-muted small">Contacto {{ idx + 1 }}</span>
              </div>
              <div class="d-flex gap-2">
                <button
                  v-if="!contact.is_primary"
                  class="btn btn-outline btn-xs"
                  @click="setPrimary(idx)"
                  title="Marcar como principal"
                  type="button"
                >
                  <i class="fa-regular fa-star text-warning"></i>
                </button>
                <button
                  class="btn btn-outline btn-xs text-danger"
                  @click="removeContact(idx)"
                  title="Eliminar"
                  type="button"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-4">
                <label class="form-label mb-0 small">Nombre <span class="required-star">*</span></label>
                <input
                  v-model.trim="contact.contact_name"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Juan Pérez"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label mb-0 small">Cargo</label>
                <input
                  v-model.trim="contact.contact_position"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Gerente de RRHH"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label mb-0 small">Teléfono</label>
                <input
                  v-model.trim="contact.contact_phone"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="+51 9XXXXXXXX"
                  v-restrict="'max:20'"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label mb-0 small">Email</label>
                <input
                  v-model.trim="contact.contact_email"
                  type="email"
                  class="form-control form-control-sm"
                  placeholder="contacto@empresa.com"
                  v-restrict="'max:120'"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- ── Empresas Socias (solo si is_intermediary) ── -->
        <section v-if="form.is_intermediary" class="form-section mb-4">
          <div class="form-section__header d-flex justify-content-between align-items-center">
            <span class="form-section__title">Empresas Socias Vinculadas</span>
            <button class="btn btn-outline btn-sm" @click="addAffiliate" type="button">
              <i class="fa-solid fa-plus me-1"></i> Vincular empresa
            </button>
          </div>
          <div class="small text-muted mb-2">
            Empresas que acceden a beneficios a través de este intermediario.
          </div>

          <div v-if="!form.affiliates.length" class="text-muted small py-2 px-1">
            Sin empresas vinculadas aún.
          </div>

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
              />
            </div>
            <button class="btn btn-outline btn-xs text-danger" @click="removeAffiliate(idx)" type="button">
              <i class="fa-solid fa-xmark"></i>
            </button>
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
  document_number: '',
  is_intermediary: false,
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
    form.document_number = data.document_number || ''
    form.is_intermediary = data.is_intermediary === 'Y'

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
        document_number: form.document_number,
        is_intermediary: form.is_intermediary ? 'Y' : 'N',
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

    if (isEdit.value) {
      payload.id = idParam.value
      await b2bService.companyUpdate(payload)
      toast.success('Empresa actualizada correctamente')
    } else {
      await b2bService.companyRegister(payload)
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
.lead-form { font-size: 0.95rem; color: #111827; }
.card-header { background-color: #ffffff; border-bottom: 1px solid #e5e7eb !important; }
.required-star { color: #dc2626; font-weight: 600; margin-left: .15rem; }

/* Secciones */
.form-section__header { display: flex; align-items: center; margin-bottom: 1rem; position: relative; padding-left: .75rem; }
.form-section__header::before { content: ""; position: absolute; left: 0; top: .15rem; bottom: .15rem; width: 3px; border-radius: 2px; background-color: #3b82f6; }
.form-section__title { font-size: .8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: .03em; }

/* Switch */
.form-switch { position: relative; width: 42px; height: 24px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span { position: absolute; inset: 0; background: #e5e7eb; border-radius: 9999px; transition: .2s; cursor: pointer; }
.form-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.form-switch input:checked + span { background: #3b82f6; }
.form-switch input:checked + span::after { left: 21px; }

/* Contactos */
.contact-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .5rem; padding: .75rem 1rem; }
.contact-card--primary { border-color: #3b82f6; background: #eff6ff; }
.contact-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .25rem; }
.badge-primary-contact { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: .72rem; padding: .15rem .45rem; border-radius: .5rem; }

/* Botones */
.btn { display: inline-flex; align-items: center; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .6rem; font-size: .78rem; }
.btn-xs { padding: .15rem .4rem; font-size: .75rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.form-control { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; width: 100%; }
.form-control-sm { padding: .3rem .5rem; font-size: .82rem; }
.form-label { font-size: .85rem; font-weight: 500; color: #374151; }

/* ══ DARK MODE ══ */
[data-coreui-theme="dark"] .lead-form { color: #F4F4F0; }
[data-coreui-theme="dark"] .card-header { background-color: #1A1A14; border-bottom: 1px solid #2A2A22 !important; }
[data-coreui-theme="dark"] .required-star { color: #F87171; }
[data-coreui-theme="dark"] .form-section__title { color: #F4F4F0; }
[data-coreui-theme="dark"] .form-switch span { background: #3A3A33; }
[data-coreui-theme="dark"] .form-switch input:checked + span { background: #3b82f6; }
[data-coreui-theme="dark"] .contact-card { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .contact-card--primary { border-color: #60A5FA; background: rgba(59,130,246,.14); }
[data-coreui-theme="dark"] .badge-primary-contact { background: rgba(59,130,246,.14); color: #60A5FA; border-color: rgba(59,130,246,.3); }
[data-coreui-theme="dark"] .btn { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-outline { background-color: #1A1A14; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .form-control { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .form-label { color: #A0A099; }
</style>
