<template>
  <div ref="companyLeadForm" class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <!-- Status pegado al título (DESIGN_SYSTEM §5.4); sale del select de
             Status, así que cambia en vivo. -->
        <div class="lf-title-row">
          <h1 class="ds-title">{{ isEdit ? 'Editar lead de empresa' : 'Nuevo lead de empresa' }}</h1>
          <span v-if="statusLabel" class="ds-pill info">
            <i class="fa-solid fa-circle-dot" aria-hidden="true"></i> {{ statusLabel }}
          </span>
        </div>
        <p class="ds-sub">
          <template v-if="form.enrollment_id">Este lead ya tiene una inscripción: se consulta, no se vuelve a guardar</template>
          <template v-else>Empresa, intención de negocio, programa de interés y seguimiento del contacto</template>
        </p>
      </div>
      <div class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-outline" @click="cancelarCompany">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Cancelar
        </button>
        <button
          v-if="!form.enrollment_id"
          type="button"
          class="btn-exec btn-exec-primary"
          @click="saveLead"
          :disabled="saving || (!isEdit && !!saveBlockReason)"
          :title="!isEdit && saveBlockReason ? saveBlockReason : 'Guardar lead'"
        >
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ saving ? 'Guardando…' : 'Guardar lead' }}
        </button>
      </div>
    </header>

    <div v-if="loaded" class="ds-row ds-row--mitad lf-cols">
      <div class="ds-stack">
        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-building lf-title-icon" aria-hidden="true"></i> Empresa vinculada</h3>
          </header>
          <div class="ds-panel-body ds-form-grid">
            <div class="ds-field lf-span-all">
              <label class="ds-label">Intención de negocio / tipo de trato<span class="ds-req">*</span></label>
              <SearchSelect
                v-model="form.cat_contract_type"
                :items="b2bContractTypesCatalog"
                label-field="description"
                value-field="id"
                placeholder="Ej: CONVENIO, IN HOUSE..."
                required
              />
            </div>

            <div class="ds-field lf-span-all">
              <label class="ds-label">Empresa<span class="ds-req">*</span></label>
              <SearchSelect
                v-model="form.company_id"
                mode="remote"
                :fetcher="q => b2bService.companyList({ q, page: 1, size: 20 }).then(r => r.items || [])"
                label-field="razon_social"
                value-field="company_id"
                placeholder="BUSCAR EMPRESA..."
                :model-label="form.company_label"
                @change="onCompanyChange"
                required
              />
            </div>

            <div class="ds-field lf-span-all">
              <label class="ds-label" for="lf-full-name">Nombre del contacto (persona)<span class="ds-req">*</span></label>
              <input
                id="lf-full-name"
                v-model="form.full_name"
                type="text"
                class="ds-input"
                placeholder="Ej: Juan Pérez - Gerente RRHH..."
                v-restrict="'upper|max:200'"
                required
              />
            </div>
          </div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-chart-line lf-title-icon" aria-hidden="true"></i> Datos del lead</h3>
          </header>
          <div class="ds-panel-body ds-form-grid">
            <div class="ds-field">
              <label class="ds-label">Status<span class="ds-req">*</span></label>
              <SearchSelect
                v-model="form.status_alias"
                :items="leadStatusCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
                @change="onStatusChange"
                required
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Nivel de interés</label>
              <SearchSelect
                v-model="form.nivel_alias"
                :items="leadInterestCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">País</label>
              <SearchSelect
                v-model="form.country_alias"
                :items="countryCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Fecha de pago</label>
              <BaseDatePicker
                v-model="form.pay_date"
                :config="{ dateFormat: 'Y-m-d' }"
                placeholder="dd/mm/aaaa"
              />
            </div>

            <div class="ds-field lf-span-all">
              <label class="ds-label" for="lf-obs">Observaciones</label>
              <textarea
                id="lf-obs"
                v-model="form.observacion"
                class="ds-input"
                rows="3"
                placeholder="Notas internas sobre este lead empresa..."
              ></textarea>
            </div>
          </div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-bullhorn lf-title-icon" aria-hidden="true"></i> Canal y origen</h3>
          </header>
          <div class="ds-panel-body ds-form-grid">
            <div class="ds-field">
              <label class="ds-label">Canal</label>
              <SearchSelect
                v-model="form.canal_alias"
                :items="socialMediaCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
                @change="onChannelChange"
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Medio</label>
              <SearchSelect
                v-model="form.medium_alias"
                :items="filteredMediumCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
                :disabled="isMedioDisabled"
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Estrategia</label>
              <SearchSelect
                v-model="form.strategy_alias"
                :items="strategyCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
                @change="onStrategyChange"
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Keyword MKT</label>
              <SearchSelect
                v-model="form.key_word_alias"
                :items="mktWordsCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
              />
            </div>
          </div>
        </section>
      </div>

      <div class="ds-stack">
        <section v-if="showProgramSection" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-graduation-cap lf-title-icon" aria-hidden="true"></i> Programa de interés</h3>
          </header>
          <div class="ds-panel-body ds-form-grid">
            <div class="ds-field">
              <label class="ds-label">Tipo de programa</label>
              <SearchSelect
                v-model="form.category_alias"
                :items="programTypeCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
                @change="onProgramaTypeChange"
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Modalidad</label>
              <SearchSelect
                v-model="form.program_modality_alias"
                :items="programModalityCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
              />
            </div>

            <div class="ds-field lf-span-all">
              <label class="ds-label">Programa</label>
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
              />
            </div>

            <div v-if="!isOnlineProgram" class="ds-field lf-span-all">
              <label class="ds-label">Edición</label>
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
                :disabled="!form.program_version_id"
              />
            </div>

            <div class="ds-field">
              <label class="ds-label">Tipo de consulta</label>
              <SearchSelect
                v-model="form.query_alias"
                :items="queryCatalog"
                label-field="description"
                value-field="alias"
                placeholder="SELECCIONAR..."
              />
            </div>
          </div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-phone lf-title-icon" aria-hidden="true"></i> Seguimiento</h3>
            <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="addContacto">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar intento
            </button>
          </header>
          <div class="ds-panel-body ds-stack">
            <p v-if="!form.contactos.length" class="ds-empty">
              Sin intentos de contacto. Usa "Agregar intento" para registrar la primera llamada o mensaje.
            </p>

            <div
              v-for="(c, idx) in form.contactos"
              :key="idx"
              class="lf-item ds-stack"
            >
              <div class="lf-item-head">
                <span class="lf-item-index">Intento {{ idx + 1 }}</span>
                <button
                  type="button"
                  class="btn-icon btn-icon-sm lf-danger"
                  title="Quitar intento"
                  aria-label="Quitar intento"
                  @click="removeContacto(idx)"
                >
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
              <div class="ds-form-grid">
                <div class="ds-field">
                  <label class="ds-label">Tipo</label>
                  <SearchSelect v-model="c.cat_type_attempt" :items="lAttempts" label-field="description" value-field="alias" placeholder="Tipo..." @change="e => handleTypeChange(c, e)" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Resultado</label>
                  <SearchSelect v-model="c.calling_alias" :items="callingCatalog" label-field="description" value-field="alias" placeholder="Resultado..." />
                </div>
                <div class="ds-field lf-span-all">
                  <label class="ds-label">Fecha / hora</label>
                  <DateTime12 v-model="c.fechaContactoProximo" />
                </div>
                <div class="ds-field lf-span-all">
                  <label class="ds-label">Respuesta</label>
                  <textarea v-model="c.respuesta" class="ds-input" rows="2" placeholder="Descripción del intento..."></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <section v-else class="ds-panel" aria-label="Cargando lead">
      <div class="ds-panel-body ds-stack">
        <span v-for="n in 6" :key="n" class="ds-skel"></span>
      </div>
    </section>

    <BaseModal v-model="showDeleteWarningModal" title="Eliminar lead empresa" size="sm">
      <p class="ds-callout bad">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <span>Se elimina el lead empresa <strong>{{ form.full_name || '—' }}</strong>.</span>
      </p>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="showDeleteWarningModal = false">
          Cancelar
        </button>
        <button class="btn-exec btn-exec-danger" type="button" @click="confirmarEliminacion" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-trash-can'" aria-hidden="true"></i>
          {{ saving ? 'Eliminando…' : 'Sí, eliminar' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, inject, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLeadForm } from '@/composables/useLeadForm'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import SearchSelect from '@/components/SearchSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import DateTime12 from '@/components/DateTime12.vue'
import BaseModal from '@/components/BaseModal.vue'

const router = useRouter()
const catalogSvc = inject('catalog')
const allContractTypes = catalogSvc?.options('we_b2b_contract') || []
const allowedContractAliases = ['we_b2b_contract_convenio', 'we_b2b_contract_corporate']
const b2bContractTypesCatalog = allContractTypes.filter(c => allowedContractAliases.includes(c.alias))

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
  businessLine:    'we_business_line_b2b',
  isCompanyLead:   true,
  showInscription: false,
})

// Texto del pill junto al título: la descripción del status elegido.
const statusLabel = computed(() =>
  leadStatusCatalog.value?.find(s => s.alias === form.status_alias)?.description || ''
)

const showProgramSection = computed(() => {
  if (!form.cat_contract_type) return false
  const selected = b2bContractTypesCatalog.find(c => c.catalog_id === form.cat_contract_type)
  return selected?.alias === 'we_b2b_contract_corporate'
})

watch(() => form.cat_contract_type, () => {
  form.program_version_id = null
  form.program_label = ''
  form.category_alias = null
  form.program_modality_alias = null
  form.edition_id = null
  form.edition_label = ''
})

function cancelarCompany() { router.push({ name: 'B2BCompanyLeads' }) }

// El guard va aquí y no en useLeadForm.guardar: ese composable no conoce el DOM
// de cada pantalla que lo usa.
const companyLeadForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(companyLeadForm)

function saveLead() {
  if (!requiredFieldsFilled()) return
  guardar()
}

function onCompanyChange(opt) {
  if (opt) {
    form.company_label = opt.razon_social || ''
  }
}
</script>

<style scoped>
/* Estado pegado al título (DESIGN_SYSTEM §5.4): arriba a la derecha no se ve. */
.lf-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.lf-title-icon { margin-right: 6px; color: var(--ds-muted); }
.lf-span-all { grid-column: 1 / -1; }
/* Cada columna crece por su cuenta: el seguimiento no estira los paneles de la izquierda. */
.lf-cols { align-items: start; }

/* Cada intento de contacto es una tarjeta dentro del panel. */
.lf-item { padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.lf-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lf-item-index { font-size: 12px; font-weight: 600; color: var(--ds-ink-2); }
.lf-danger { color: var(--ds-bad-ink); }
</style>
