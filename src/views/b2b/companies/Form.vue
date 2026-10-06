<template>
  <div ref="companyForm" class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <!-- El tipo va pegado al título (DESIGN_SYSTEM §5.4) y sale del switch:
             cambia en vivo si el usuario la marca como intermediaria. -->
        <div class="cf-title-row">
          <h1 class="ds-title">{{ isEdit ? 'Editar empresa' : 'Nueva empresa' }}</h1>
          <span v-if="form.is_intermediary" class="ds-pill violet">
            <i class="fa-solid fa-link" aria-hidden="true"></i> Intermediaria
          </span>
        </div>
        <p class="ds-sub">
          <template v-if="isEdit">Empresa <span class="cf-mono">#{{ idParam }}</span> · datos, contactos y empresas socias</template>
          <template v-else>Registra la razón social, el RUC y al menos el contacto principal</template>
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
          {{ saving ? 'Guardando…' : 'Guardar empresa' }}
        </button>
      </div>
    </header>

    <div v-if="loaded" class="ds-row ds-row--mitad cf-cols">
      <div class="ds-stack">
        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-building cf-title-icon" aria-hidden="true"></i> Datos de la empresa</h3>
          </header>
          <div class="ds-panel-body ds-stack">
            <div class="ds-form-grid">
              <div class="ds-field cf-span-all">
                <label class="ds-label" for="cf-razon">Razón social<span class="ds-req">*</span></label>
                <input
                  id="cf-razon"
                  v-model.trim="form.razon_social"
                  type="text"
                  class="ds-input"
                  placeholder="EMPRESA S.A.C."
                  v-restrict="'upper|max:200'"
                  required
                />
              </div>

              <div class="ds-field">
                <label class="ds-label" for="cf-doc">RUC / nro. documento<span class="ds-req">*</span></label>
                <input
                  id="cf-doc"
                  v-model.trim="form.document_number"
                  type="text"
                  class="ds-input cf-mono"
                  placeholder="20XXXXXXXXX"
                  v-restrict="'max:20'"
                  required
                />
              </div>

              <div class="ds-field">
                <label class="ds-label" for="cf-comercial">Nombre comercial</label>
                <input
                  id="cf-comercial"
                  v-model.trim="form.razon_comercial"
                  type="text"
                  class="ds-input"
                  placeholder="Nombre con el que se le conoce"
                  v-restrict="'upper|max:200'"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Sector</label>
                <SearchSelect
                  v-model="form.cat_sector"
                  :items="sectorList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Clasificación</label>
                <SearchSelect
                  v-model="form.cat_classification"
                  :items="classificationList"
                  label-field="description"
                  value-field="id"
                  placeholder="Micro, Pequeña..."
                />
              </div>
            </div>

            <div class="cf-divider cf-switch-row">
              <span class="ds-label cf-inline-label">Tipo de empresa</span>
              <label class="exec-switch exec-switch-lg" title="Empresa intermediaria">
                <input type="checkbox" v-model="form.is_intermediary" aria-label="Empresa intermediaria" />
                <span></span>
              </label>
              <span class="cf-switch-text">
                {{ form.is_intermediary ? 'Intermediaria (ej: GoIntegro, holding)' : 'Empresa normal' }}
              </span>
            </div>
          </div>
        </section>

        <!-- Solo tiene sentido en una intermediaria: son las empresas que
             acceden al beneficio a través de ella. -->
        <section v-if="form.is_intermediary" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-sitemap cf-title-icon" aria-hidden="true"></i> Empresas socias vinculadas</h3>
            <button class="btn-exec btn-exec-outline btn-sm" @click="addAffiliate" type="button">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Vincular
            </button>
          </header>
          <div class="ds-panel-body ds-stack">
            <p v-if="!form.affiliates.length" class="ds-empty">
              Sin empresas vinculadas. Usa "Vincular" para sumar las empresas que acceden al beneficio.
            </p>

            <div
              v-for="(aff, idx) in form.affiliates"
              :key="idx"
              class="cf-affiliate"
            >
              <div class="cf-affiliate-select">
                <SearchSelect
                  v-model="aff.company_id"
                  mode="remote"
                  :fetcher="q => b2bService.companyList({ q, size: 20, page: 1 }).then(r => r.items || [])"
                  label-field="razon_social"
                  value-field="company_id"
                  placeholder="BUSCAR EMPRESA SOCIA..."
                />
              </div>
              <button
                class="btn-icon btn-icon-sm cf-danger"
                @click="removeAffiliate(idx)"
                type="button"
                title="Quitar empresa socia"
                aria-label="Quitar empresa socia"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div class="ds-stack">
        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-address-book cf-title-icon" aria-hidden="true"></i> Contactos</h3>
            <button class="btn-exec btn-exec-outline btn-sm" @click="addContact" type="button">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar contacto
            </button>
          </header>
          <div class="ds-panel-body ds-stack">
            <p v-if="!form.contacts.length" class="ds-empty">
              Sin contactos. Usa "Agregar contacto" para cargar al menos el principal.
            </p>

            <div
              v-for="(contact, idx) in form.contacts"
              :key="idx"
              class="cf-item ds-stack"
              :class="{ 'cf-item--primary': contact.is_primary }"
            >
              <div class="cf-item-head">
                <span v-if="contact.is_primary" class="ds-pill info">
                  <i class="fa-solid fa-star" aria-hidden="true"></i> Principal
                </span>
                <span v-else class="cf-item-index">Contacto {{ idx + 1 }}</span>
                <div class="cf-item-actions">
                  <button
                    v-if="!contact.is_primary"
                    class="btn-icon btn-icon-sm"
                    @click="setPrimary(idx)"
                    title="Marcar como principal"
                    aria-label="Marcar como principal"
                    type="button"
                  >
                    <i class="fa-regular fa-star cf-star" aria-hidden="true"></i>
                  </button>
                  <button
                    class="btn-icon btn-icon-sm cf-danger"
                    @click="removeContact(idx)"
                    title="Quitar contacto"
                    aria-label="Quitar contacto"
                    type="button"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
              </div>

              <div class="ds-form-grid">
                <div class="ds-field">
                  <label class="ds-label">Nombre<span class="ds-req">*</span></label>
                  <input v-model.trim="contact.contact_name" type="text" class="ds-input" placeholder="Juan Pérez" required />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Cargo</label>
                  <input v-model.trim="contact.contact_position" type="text" class="ds-input" placeholder="Gerente de RRHH" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Teléfono</label>
                  <input v-model.trim="contact.contact_phone" type="text" class="ds-input cf-mono" placeholder="+51 9XXXXXXXX" v-restrict="'max:20'" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Email</label>
                  <input v-model.trim="contact.contact_email" type="email" class="ds-input" placeholder="contacto@empresa.com" v-restrict="'max:120'" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <section v-else class="ds-panel" aria-label="Cargando empresa">
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

const companyForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(companyForm)

async function guardar() {
  if (!requiredFieldsFilled()) return
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
/* Estado pegado al título (DESIGN_SYSTEM §5.4): arriba a la derecha no se ve. */
.cf-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.cf-title-icon { margin-right: 6px; color: var(--ds-muted); }
.cf-mono { font-family: var(--ds-font-mono); }
.cf-span-all { grid-column: 1 / -1; }
/* Cada columna crece por su cuenta: contactos no estira el panel de datos. */
.cf-cols { align-items: start; }

/* Separa un sub-bloque dentro del mismo panel sin abrir otro panel. */
.cf-divider { padding-top: var(--ds-gap); border-top: 1px solid var(--ds-border); }
.cf-inline-label { margin-bottom: 0; }
.cf-switch-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.cf-switch-text { font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }

.cf-affiliate { display: flex; align-items: center; gap: 8px; }
.cf-affiliate-select { flex: 1; min-width: 0; }

/* Cada contacto es una tarjeta; el principal se marca con el borde de acento. */
.cf-item { padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.cf-item--primary { border-color: var(--ds-accent); }
.cf-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cf-item-index { font-size: 12px; font-weight: 600; color: var(--ds-ink-2); }
.cf-item-actions { display: flex; gap: 4px; }
.cf-star { color: var(--ds-warn); }
.cf-danger { color: var(--ds-bad-ink); }
</style>
