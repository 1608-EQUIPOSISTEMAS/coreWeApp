<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Becas</h1>
        <p class="ds-sub">Becas por convenio o auspicio. La beca termina cuando termina el curso.</p>
      </div>
      <div v-if="canManage" class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-primary" @click="openForm()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Registrar beca
        </button>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in cards" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ formatValue(kpis[k.key] ?? 0, 'num') }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <p v-if="attentionCount" class="ds-callout warn bc-callout">
      <i class="fa-solid fa-bell" aria-hidden="true"></i>
      <span>
        <template v-if="alerts.stalePending.length">{{ alerts.stalePending.length }} pendiente(s) registradas hace más de 3 días</template>
        <template v-if="alerts.stalePending.length && alerts.expiringSoon.length"> · </template>
        <template v-if="alerts.expiringSoon.length">{{ alerts.expiringSoon.length }} por vencer en 7 días o menos</template>
      </span>
      <button type="button" class="btn-exec btn-exec-outline bc-activate" @click="statusFilter = 'attention'">Ver</button>
    </p>

    <section class="ds-panel">
      <div class="bc-toolbar">
        <input
          v-model="search"
          type="search"
          class="ds-input bc-search"
          placeholder="Buscar por beneficiario, DNI, aliado o curso…"
          aria-label="Buscar beca"
        />
        <div class="ds-tabs" role="group" aria-label="Estado de la beca">
          <button
            v-for="t in STATUS_TABS"
            :key="t.key"
            type="button"
            :aria-pressed="statusFilter === t.key"
            @click="statusFilter = t.key"
          >
            {{ t.label }} <span class="bc-count">{{ kpis[t.key] ?? 0 }}</span>
          </button>
          <button v-if="attentionCount" type="button" :aria-pressed="statusFilter === 'attention'" @click="statusFilter = 'attention'">
            Requieren acción <span class="bc-count">{{ attentionCount }}</span>
          </button>
        </div>
      </div>
      <div class="bc-toolbar">
        <span class="bc-label">Modalidad</span>
        <div class="ds-tabs" role="group" aria-label="Modalidad">
          <button type="button" :aria-pressed="!modalityFilter" @click="modalityFilter = ''">
            Todas <span class="bc-count">{{ kpis.total ?? 0 }}</span>
          </button>
          <button
            v-for="m in byModality"
            :key="m.modality"
            type="button"
            :aria-pressed="modalityFilter === m.modality"
            :title="`${m.pending} pendientes · ${m.active} activas · ${m.expired} vencidas`"
            @click="modalityFilter = m.modality"
          >
            {{ m.modality }} <span class="bc-count">{{ m.total }}</span>
          </button>
        </div>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa">
          <thead>
            <tr>
              <th>Beneficiario / documento</th>
              <th style="width:170px">Aliado / evento</th>
              <th>Curso</th>
              <th style="width:110px">Tipo</th>
              <th style="width:110px">Fin</th>
              <th style="width:140px">Estado</th>
              <th v-if="canManage" style="width:80px"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`">
                <td :colspan="columns"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr v-else-if="!visible.length">
              <td :colspan="columns" class="ds-empty--lista bc-empty">
                {{ items.length ? 'No hay becas con estos filtros. Prueba otra pestaña o quita la búsqueda.' : 'Aún no hay becas registradas.' }}
              </td>
            </tr>
            <tr v-for="b in visible" v-else :key="b.scholarship_id">
              <td>
                <div class="bc-main">{{ b.beneficiary_name }}</div>
                <div class="bc-sub">{{ b.document_number }}<template v-if="b.email"> · {{ b.email }}</template></div>
              </td>
              <td>
                <div>{{ b.partner_name }}</div>
                <div class="bc-sub">{{ AGREEMENT_LABEL[b.agreement_type] }}</div>
              </td>
              <td>
                <div>{{ b.program_name }}</div>
                <div class="bc-sub">{{ b.modality }}<template v-if="b.specific_code"> · {{ b.specific_code }}</template></div>
              </td>
              <td><span class="ds-pill">{{ TYPE_LABEL[b.scholarship_type] }}</span></td>
              <td class="mono">{{ b.end_date ? fmt.formatDate(b.end_date) : 'sin plazo' }}</td>
              <td>
                <span class="ds-pill" :class="STATUS[b.status].tone">{{ STATUS[b.status].label }}</span>
                <span v-if="b.purchases" class="ds-pill info bc-bought" title="Compró otro curso después de la beca">Compró {{ b.purchases }}</span>
                <button
                  v-if="canManage && b.status === 'pending'"
                  type="button"
                  class="btn-exec btn-exec-outline bc-activate"
                  :disabled="activating.has(b.scholarship_id)"
                  @click="activar(b)"
                >
                  Activar
                </button>
              </td>
              <td v-if="canManage" class="bc-actions">
                <button
                  v-if="b.status !== 'expired'"
                  type="button"
                  class="btn-icon btn-icon-sm"
                  :title="`Editar beca de ${b.beneficiary_name}`"
                  :aria-label="`Editar beca de ${b.beneficiary_name}`"
                  @click="openForm(b)"
                >
                  <i class="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="btn-icon btn-icon-sm"
                  :title="`Eliminar beca de ${b.beneficiary_name}`"
                  :aria-label="`Eliminar beca de ${b.beneficiary_name}`"
                  :disabled="deleting.has(b.scholarship_id)"
                  @click="eliminar(b)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="byPartner.length" class="ds-panel bc-partners">
      <div class="bc-toolbar">
        <span class="bc-main">Conversión por aliado</span>
        <span class="bc-sub">Becarios que compraron otro curso después de su beca. Sirve para decidir qué convenios renovar.</span>
      </div>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa">
          <thead>
            <tr>
              <th>Aliado / evento</th>
              <th style="width:110px" class="bc-partner-rate">Becas</th>
              <th style="width:130px" class="bc-partner-rate">Convertidos</th>
              <th style="width:110px" class="bc-partner-rate">Conversión</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in byPartner" :key="p.partner">
              <td>{{ p.partner }}</td>
              <td class="bc-partner-rate">{{ p.total }}</td>
              <td class="bc-partner-rate">{{ p.converted }}</td>
              <td class="bc-partner-rate">{{ p.rate }} %</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <BaseModal v-model="formOpen" :title="editingId ? 'Editar beca' : 'Registrar beca'" size="lg">
      <div ref="formRef" class="ds-form-grid">
        <div class="ds-field">
          <label class="ds-label" for="bc-agreement">Tipo de acuerdo<span class="ds-req">*</span></label>
          <select id="bc-agreement" v-model="form.agreement_type" class="ds-input" required>
            <option v-for="(label, key) in AGREEMENT_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-partner">{{ form.agreement_type === 'AUSPICIO' ? 'Evento' : 'Aliado' }}<span class="ds-req">*</span></label>
          <input id="bc-partner" v-model.trim="form.partner_name" class="ds-input" list="bc-partners" maxlength="150" required />
          <datalist id="bc-partners"><option v-for="p in partners" :key="p" :value="p" /></datalist>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-name">Beneficiario<span class="ds-req">*</span></label>
          <input id="bc-name" v-model.trim="form.beneficiary_name" class="ds-input" maxlength="200" required />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-doc">DNI / documento<span class="ds-req">*</span></label>
          <input id="bc-doc" v-model.trim="form.document_number" class="ds-input" maxlength="20" pattern="[0-9A-Za-z]{6,20}" required />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-email">Correo</label>
          <input id="bc-email" v-model.trim="form.email" type="email" class="ds-input" maxlength="150" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-phone">Celular</label>
          <input id="bc-phone" v-model.trim="form.phone" type="tel" class="ds-input" maxlength="20" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-career">Carrera</label>
          <input id="bc-career" v-model.trim="form.career" class="ds-input" maxlength="150" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="bc-type">Tipo de beca<span class="ds-req">*</span></label>
          <select id="bc-type" v-model="form.scholarship_type" class="ds-input" required>
            <option v-for="(label, key) in TYPE_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="ds-field">
          <label class="ds-label">Curso<span class="ds-req">*</span></label>
          <SearchSelect
            v-model="form.program_id"
            :items="courses.programs"
            label-field="program_name"
            value-field="program_id"
            sublabel-field="modality"
            required
            :disabled="editingActivated"
            @change="form.program_edition_id = null"
          />
          <span v-if="editingActivated" class="ds-help">La beca ya está activada: el curso no se puede cambiar.</span>
        </div>
        <div v-if="selectedProgram && !isOnline" class="ds-field">
          <label class="ds-label">Edición<span class="ds-req">*</span></label>
          <SearchSelect
            v-model="form.program_edition_id"
            :items="programEditions"
            label-field="label"
            value-field="program_edition_id"
            required
          />
          <span class="ds-help">La beca vence cuando termina esta edición.</span>
        </div>
        <div v-if="isOnline" class="ds-field">
          <label class="ds-label">Acceso hasta</label>
          <BaseDatePicker v-model="form.access_until" :config="{ dateFormat: 'Y-m-d' }" />
          <span class="ds-help">Opcional: sin fecha, la beca online no vence.</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="formOpen = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="saving" @click="guardar">
          {{ saving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Registrar beca') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import { confirmAction } from '@/composables/useConfirm'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const toast = useToast()
const becasService = inject(ServiceKeys.FundacionBecas)
const fmt = useEnrollmentFormatters()

// Las claves coinciden con status y kpis del backend (fundacion-becas.entity.js),
// que calcula el estado contra el hoy de Lima.
const STATUS = {
  pending: { label: 'Pendiente', tone: 'warn' },
  active: { label: 'Activa', tone: 'ok' },
  expired: { label: 'Vencida', tone: 'bad' }
}
const STATUS_TABS = [
  { key: 'total', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'active', label: 'Activas' },
  { key: 'expired', label: 'Vencidas' }
]
const cards = [
  { key: 'total', label: 'Becas registradas', note: 'convenios y auspicios', icon: 'fa-graduation-cap', tone: 'info' },
  { key: 'pending', label: 'Pendientes', note: 'registradas, falta activar el acceso', icon: 'fa-hourglass-half', tone: 'warn' },
  { key: 'active', label: 'Activas', note: 'con el curso en marcha', icon: 'fa-circle-check', tone: 'ok' },
  { key: 'expired', label: 'Vencidas', note: 'el curso ya terminó', icon: 'fa-calendar-xmark', tone: 'bad' },
  { key: 'converted', label: 'Convertidos', note: 'compraron otro curso después', icon: 'fa-cart-shopping', tone: 'info' }
]
const AGREEMENT_LABEL = { CONVENIO: 'Convenio', AUSPICIO: 'Auspicio' }
const TYPE_LABEL = { COMPLETA: 'Completa', SEMIBECA: 'Semibeca' }

const items = ref([])
const kpis = ref({})
const byModality = ref([])
const byPartner = ref([])
// Misma regla que el correo diario a Fundación (scholarshipAlerts en el backend).
const alerts = ref({ stalePending: [], expiringSoon: [] })
const attentionIds = computed(() => new Set([...alerts.value.stalePending, ...alerts.value.expiringSoon].map(b => b.scholarship_id)))
const attentionCount = computed(() => attentionIds.value.size)
const loading = ref(false)
const search = ref('')
const statusFilter = ref('total')
const modalityFilter = ref('')

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(b =>
    (statusFilter.value === 'total' || b.status === statusFilter.value ||
      (statusFilter.value === 'attention' && attentionIds.value.has(b.scholarship_id))) &&
    (!modalityFilter.value || b.modality === modalityFilter.value) &&
    (!q || [b.beneficiary_name, b.document_number, b.partner_name, b.program_name].some(v => String(v || '').toLowerCase().includes(q)))
  )
})

// Sugerencias para no escribir el mismo aliado de cinco formas distintas.
const partners = computed(() => [...new Set(items.value.map(b => b.partner_name))].sort())

// Registrar y activar es de Fundación; GERENCIA solo consulta (el backend lo vuelve a validar).
const roles = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').roles || [] } catch { return [] }
})()
const canManage = ['ADMIN', 'LIDER_FUNDACION', 'FUNDACION'].some(r => roles.includes(r))
const columns = canManage ? 7 : 6

async function load () {
  loading.value = true
  try {
    const r = await becasService.listar()
    items.value = r?.items || []
    kpis.value = r?.kpis || {}
    byModality.value = r?.byModality || []
    byPartner.value = r?.byPartner || []
    alerts.value = r?.alerts || { stalePending: [], expiringSoon: [] }
  } catch (err) {
    console.error('[Becas]', err)
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudieron cargar las becas.')
  } finally {
    loading.value = false
  }
}

const activating = ref(new Set())
async function activar (b) {
  activating.value.add(b.scholarship_id)
  try {
    await becasService.activar(b.scholarship_id)
    toast.success('Beca activada')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudo activar la beca.')
  } finally {
    activating.value.delete(b.scholarship_id)
  }
}

const deleting = ref(new Set())
async function eliminar (b) {
  const confirmado = await confirmAction({
    title: '¿Eliminar esta beca?',
    text: `Se borra la beca de ${b.beneficiary_name} en ${b.program_name}. No se puede deshacer.`,
    confirmText: 'Sí, eliminar',
    danger: true
  })
  if (!confirmado) return
  deleting.value.add(b.scholarship_id)
  try {
    await becasService.eliminar(b.scholarship_id)
    toast.success('Beca eliminada')
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudo eliminar la beca.')
  } finally {
    deleting.value.delete(b.scholarship_id)
  }
}

// ── Formulario (registrar y editar) ──
const formOpen = ref(false)
const editingId = ref(null)
const editingEdition = ref(null)
// El backend tambien lo valida (assertEditable).
const editingActivated = ref(false)
const formRef = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(formRef)
const saving = ref(false)
const courses = ref({ programs: [], editions: [] })
const emptyForm = () => ({
  agreement_type: 'CONVENIO', partner_name: '', beneficiary_name: '', document_number: '',
  email: '', phone: '', career: '', scholarship_type: 'COMPLETA',
  program_id: null, program_edition_id: null, access_until: ''
})
const form = ref(emptyForm())

const selectedProgram = computed(() => courses.value.programs.find(p => p.program_id === form.value.program_id))
const isOnline = computed(() => selectedProgram.value?.modality_alias === 'we_modality_online')
// El catálogo trae solo ediciones vigentes; al editar una beca cuya edición ya
// terminó, se agrega la suya para que el selector no aparezca vacío.
const programEditions = computed(() => {
  const own = editingEdition.value
  const list = courses.value.editions.filter(e => e.program_id === form.value.program_id)
  const all = own && own.program_id === form.value.program_id && !list.some(e => e.program_edition_id === own.program_edition_id)
    ? [own, ...list]
    : list
  return all.map(e => ({ ...e, label: `${e.specific_code || `Edición ${e.program_edition_id}`} · ${fmt.formatDate(e.start_date)} al ${fmt.formatDate(e.end_date)}` }))
})

// Sin beca: registrar. Con beca: editar sus datos (la activación no se toca aquí).
async function openForm (beca = null) {
  editingId.value = beca?.scholarship_id ?? null
  editingActivated.value = !!beca?.activated_at
  editingEdition.value = beca?.program_edition_id
    ? { program_edition_id: beca.program_edition_id, program_id: beca.program_id, specific_code: beca.specific_code, start_date: beca.edition_start_date, end_date: beca.edition_end_date }
    : null
  form.value = beca ? formFrom(beca) : emptyForm()
  formOpen.value = true
  if (courses.value.programs.length) return
  try {
    courses.value = await becasService.cursos()
  } catch (err) {
    toast.error(err?.response?.data?.message || 'No se pudieron cargar los cursos.')
  }
}

function formFrom (b) {
  return {
    agreement_type: b.agreement_type, partner_name: b.partner_name, beneficiary_name: b.beneficiary_name,
    document_number: b.document_number, email: b.email || '', phone: b.phone || '', career: b.career || '',
    scholarship_type: b.scholarship_type, program_id: b.program_id, program_edition_id: b.program_edition_id,
    access_until: b.access_until || ''
  }
}

// Vacíos a null: el backend valida formato (correo, fecha) y "" no lo pasa.
const orNull = v => (v === '' || v === undefined ? null : v)

async function guardar () {
  if (!requiredFieldsFilled()) return
  saving.value = true
  try {
    const f = form.value
    const beca = {
      ...f,
      email: orNull(f.email),
      phone: orNull(f.phone),
      career: orNull(f.career),
      program_edition_id: isOnline.value ? null : f.program_edition_id,
      access_until: isOnline.value ? orNull(f.access_until) : null
    }
    if (editingId.value) await becasService.actualizar(editingId.value, beca)
    else await becasService.registrar(beca)
    toast.success(editingId.value ? 'Beca actualizada' : 'Beca registrada')
    formOpen.value = false
    await load()
  } catch (err) {
    // 409 = duplicado: el backend dice cuál beca ya existe.
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudo guardar la beca.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.bc-search { flex: 1; min-width: 220px; }
.bc-label { font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }
.bc-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .bc-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.bc-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.bc-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.bc-empty { text-align: center; color: var(--ds-muted); }
.bc-activate { margin-left: 6px; padding: 2px 8px; font-size: 11.5px; }
.bc-bought { margin-left: 4px; }
.bc-callout { margin-bottom: 14px; }
.bc-partners { margin-top: 16px; }
.bc-callout .bc-activate { margin-left: auto; }
.bc-partner-rate { font-variant-numeric: tabular-nums; text-align: right; }
.bc-actions { white-space: nowrap; text-align: right; }
.mono { font-variant-numeric: tabular-nums; }
</style>
