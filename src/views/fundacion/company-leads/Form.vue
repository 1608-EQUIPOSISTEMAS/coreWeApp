<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text d-flex align-items-center gap-3">
            <div>
              <span class="brand-eyebrow">FUNDACIÓN · Empresa</span>
              <h1 class="brand-title">Lead Empresa — Fundación</h1>
            </div>
          </div>
        </div>
        <div class="masthead-actions">
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelarCompany">
            <i class="fa-solid fa-arrow-left"></i> {{ 'Cancelar' }}
          </button>
          <button
            v-if="!form.enrollment_id"
            type="button"
            class="btn-exec btn-exec-primary px-4"
            @click="guardar"
            :disabled="saving || (!isEdit && !!saveBlockReason)"
            :title="!isEdit && saveBlockReason ? saveBlockReason : 'Guardar lead'"
          >
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ saving ? 'Guardando...' : 'Guardar lead' }}
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body pb-5" v-if="loaded">
      <div class="exec-form-grid">

        <!-- ══ COLUMNA IZQUIERDA ══ -->
        <div class="col-left">

          <!-- Empresa Vinculada -->
          <div class="exec-card exec-card--empresa mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-building me-2 text-primary"></i>
              <span>Empresa Vinculada</span>
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
                    @change="onCompanyChange"
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-12">
                  <label class="exec-label">Razón Social (contacto) <span class="c-red">*</span></label>
                  <input
                    v-model="form.full_name"
                    type="text"
                    class="exec-input w-100"
                    placeholder="Se autocompleta con la empresa..."
                    v-restrict="'upper|max:200'"
                  />
                </div>

              </div>
            </div>
          </div>

          <!-- Datos del Lead -->
          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-chart-line me-2 text-muted"></i>
              <span>Datos del Lead</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-6">
                  <label class="exec-label">Status <span class="c-red">*</span></label>
                  <SearchSelect
                    v-model="form.status_alias"
                    :items="leadStatusCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                    @change="onStatusChange"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Nivel de Interés</label>
                  <SearchSelect
                    v-model="form.nivel_alias"
                    :items="leadInterestCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">País</label>
                  <SearchSelect
                    v-model="form.country_alias"
                    :items="countryCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Fecha F. Pago</label>
                  <BaseDatePicker
                    v-model="form.pay_date"
                    :config="{ dateFormat: 'Y-m-d' }"
                    class="exec-input w-100"
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                <div class="col-12">
                  <label class="exec-label">Observaciones</label>
                  <textarea
                    v-model="form.observacion"
                    class="exec-input w-100"
                    rows="3"
                    placeholder="Notas internas sobre este lead empresa..."
                  ></textarea>
                </div>

              </div>
            </div>
          </div>

          <!-- Canal y Origen -->
          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-bullhorn me-2 text-muted"></i>
              <span>Canal y Origen</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-6">
                  <label class="exec-label">Canal</label>
                  <SearchSelect
                    v-model="form.canal_alias"
                    :items="socialMediaCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                    @change="onChannelChange"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Medio</label>
                  <SearchSelect
                    v-model="form.medium_alias"
                    :items="filteredMediumCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                    :disabled="isMedioDisabled"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Estrategia</label>
                  <SearchSelect
                    v-model="form.strategy_alias"
                    :items="strategyCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                    @change="onStrategyChange"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Keyword MKT</label>
                  <SearchSelect
                    v-model="form.key_word_alias"
                    :items="mktWordsCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                  />
                </div>

              </div>
            </div>
          </div>

        </div>

        <!-- ══ COLUMNA DERECHA ══ -->
        <div class="col-right">

          <!-- Programa de Interés -->
          <div class="exec-card mb-4">
            <div class="exec-card__header">
              <i class="fa-solid fa-graduation-cap me-2 text-muted"></i>
              <span>Programa de Interés</span>
            </div>
            <div class="exec-card__body">
              <div class="row g-3">

                <div class="col-md-6">
                  <label class="exec-label">Tipo de Programa</label>
                  <SearchSelect
                    v-model="form.category_alias"
                    :items="programTypeCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                    @change="onProgramaTypeChange"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Modalidad</label>
                  <SearchSelect
                    v-model="form.program_modality_alias"
                    :items="programModalityCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-12">
                  <label class="exec-label">Programa <span class="c-red">*</span></label>
                  <SearchSelect
                    v-model="form.program_version_id"
                    mode="remote"
                    :fetcher="q => programService.programVersionCaller({ q })"
                    :debounce-ms="300"
                    label-field="abbreviation"
                    value-field="program_version_id"
                    placeholder="BUSCAR PROGRAMA..."
                    :model-label="form.program_label"
                    @change="onProgramaChange"
                    class="exec-select-light w-100"
                  />
                </div>

                <div class="col-12" v-if="!isOnlineProgram">
                  <label class="exec-label">Edición</label>
                  <SearchSelect
                    v-model="form.edition_id"
                    mode="remote"
                    :fetcher="q => searchEditionsFiltered(q)"
                    :debounce-ms="300"
                    label-field="edition_label"
                    value-field="edition_id"
                    placeholder="BUSCAR EDICIÓN..."
                    :model-label="form.edition_label"
                    @change="onEditionChange"
                    class="exec-select-light w-100"
                    :disabled="!form.program_version_id"
                  />
                </div>

                <div class="col-md-6">
                  <label class="exec-label">Tipo Consulta</label>
                  <SearchSelect
                    v-model="form.query_alias"
                    :items="queryCatalog"
                    label-field="description"
                    value-field="alias"
                    placeholder="SELECCIONAR..."
                    class="exec-select-light w-100"
                  />
                </div>

              </div>
            </div>
          </div>

          <!-- Contactos / Seguimiento -->
          <div class="exec-card mb-4">
            <div class="exec-card__header d-flex justify-content-between">
              <div>
                <i class="fa-solid fa-phone me-2 text-muted"></i>
                <span>Seguimiento</span>
              </div>
              <button type="button" class="btn-exec btn-exec-ghost btn-exec-sm" @click="addContacto">
                <i class="fa-solid fa-plus me-1"></i> Agregar intento
              </button>
            </div>
            <div class="exec-card__body">
              <div v-if="!form.contactos.length" class="text-muted small py-2">Sin intentos de contacto registrados.</div>

              <div
                v-for="(c, idx) in form.contactos"
                :key="idx"
                class="contact-attempt-row mb-3"
              >
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small fw-600 text-muted"># {{ idx + 1 }}</span>
                  <button type="button" class="btn-exec btn-exec-ghost btn-exec-xs text-danger" @click="removeContacto(idx)">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div class="row g-2">
                  <div class="col-md-4">
                    <label class="exec-label mb-0 small">Tipo</label>
                    <SearchSelect v-model="c.cat_type_attempt" :items="lAttempts" label-field="description" value-field="alias" placeholder="Tipo..." class="exec-select-light w-100" @change="e => handleTypeChange(c, e)" />
                  </div>
                  <div class="col-md-4">
                    <label class="exec-label mb-0 small">Resultado</label>
                    <SearchSelect v-model="c.calling_alias" :items="callingCatalog" label-field="description" value-field="alias" placeholder="Resultado..." class="exec-select-light w-100" />
                  </div>
                  <div class="col-md-4">
                    <label class="exec-label mb-0 small">Fecha / Hora</label>
                    <DateTime12 v-model="c.fechaContactoProximo" class="exec-input w-100" />
                  </div>
                  <div class="col-12">
                    <label class="exec-label mb-0 small">Respuesta</label>
                    <textarea v-model="c.respuesta" class="exec-input w-100" rows="2" placeholder="Descripción del intento..."></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>

    <!-- Modal advertencia eliminación -->
    <BaseModal v-model="showDeleteWarningModal" title="Confirmar Eliminación" size="sm">
      <div class="px-3 py-2 text-center">
        <i class="fa-solid fa-triangle-exclamation text-danger fa-2x mb-3"></i>
        <p>¿Seguro que deseas eliminar este lead empresa?</p>
        <div class="text-muted small">
          <i class="fa-solid fa-building me-2"></i>
          <span class="fw-bold">{{ form.full_name || '—' }}</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-ghost btn-exec-sm" @click="showDeleteWarningModal = false">
          <i class="fa-solid fa-arrow-left me-1"></i> Cancelar
        </button>
        <button class="btn-exec btn-exec-danger btn-exec-sm" @click="confirmarEliminacion" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-trash-can'"></i>
          {{ saving ? 'Eliminando...' : 'Sí, eliminar' }}
        </button>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useLeadForm } from '@/composables/useLeadForm'
import SearchSelect from '@/components/SearchSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import DateTime12 from '@/components/DateTime12.vue'
import BaseModal from '@/components/BaseModal.vue'

const router = useRouter()

const {
  form, insc,
  loaded, saving,
  showDeleteWarningModal,
  leadStatusCatalog, leadInterestCatalog, countryCatalog,
  strategyCatalog, mktWordsCatalog, socialMediaCatalog,
  queryCatalog, programTypeCatalog, programModalityCatalog,
  lAttempts, callingCatalog,
  isEdit, saveBlockReason, isOnlineProgram,
  isMedioDisabled, filteredMediumCatalog,
  b2bService, programService,
  guardar, confirmarEliminacion,
  addContacto, removeContacto, handleTypeChange,
  onStatusChange, onChannelChange, onStrategyChange,
  onProgramaTypeChange, onProgramaChange, onEditionChange,
  searchEditionsFiltered,
} = useLeadForm({
  businessLine:    'we_business_line_fundacion',
  isCompanyLead:   true,
  showInscription: false,
})

function cancelarCompany() { router.push({ name: 'FundacionCompanyLeads' }) }

function onCompanyChange(opt) {
  if (opt) {
    form.company_label = opt.razon_social || ''
    if (!form.full_name) form.full_name = opt.razon_social || ''
  }
}
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
.exec-body { flex: 1; padding: 1.25rem; }
.exec-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
@media (max-width: 900px) { .exec-form-grid { grid-template-columns: 1fr; } }
.exec-card { background: #fff; border: 1px solid #e5e7eb; border-radius: .5rem; }
.exec-card--empresa { border-color: #3b82f6; border-left-width: 3px; }
.exec-card__header { padding: .65rem 1rem; border-bottom: 1px solid #f3f4f6; font-size: .8rem; font-weight: 600; color: #374151; display: flex; align-items: center; }
.exec-card__body { padding: 1rem; }
.exec-label { font-size: .8rem; font-weight: 500; color: #374151; display: block; margin-bottom: .25rem; }
.exec-input { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; font-size: .875rem; width: 100%; }
.c-red { color: #dc2626; }
.contact-attempt-row { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: .375rem; padding: .65rem .75rem; }
.fw-600 { font-weight: 600; }
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
[data-coreui-theme="dark"] .exec-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .exec-card--empresa { border-color: #60A5FA; }
[data-coreui-theme="dark"] .exec-card__header { border-bottom-color: #24241E; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .contact-attempt-row { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .btn-exec { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-exec-ghost { background-color: transparent; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-danger { background-color: #dc2626; border-color: #dc2626; color: #fff; }
</style>
