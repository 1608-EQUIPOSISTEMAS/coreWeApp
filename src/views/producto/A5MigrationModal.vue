<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="handleClose"
    title="Cancelar edicion y migrar alumnos"
    size="xl"
  >
    <div class="a5-body" v-if="visible">
      <!-- Resumen edicion origen -->
      <div class="a5-origin-card">
        <div class="a5-origin-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="a5-origin-text">
          <div class="a5-origin-title">{{ origin?.global_code || '---' }} <span class="a5-segment-pill">A5 (Cancelar)</span></div>
          <div class="a5-origin-sub">{{ origin?.program_name || '' }} &middot; {{ formatDate(origin?.start_date) }}</div>
        </div>
        <div class="a5-origin-count" v-if="enrollments.length > 0">
          <span class="a5-origin-count-num">{{ enrollments.length }}</span>
          <span class="a5-origin-count-lbl">alumnos vigentes</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="a5-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Cargando alumnos vigentes...
      </div>

      <!-- Sin alumnos -->
      <div v-else-if="enrollments.length === 0" class="a5-empty">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <div class="a5-empty-title">Sin alumnos inscritos</div>
        <div class="a5-empty-sub">Esta edicion no tiene inscripciones vigentes. Puedes cancelarla directamente.</div>
      </div>

      <!-- Tabla migracion -->
      <template v-else>
        <!-- Bulk action -->
        <div class="a5-bulk-bar">
          <span class="a5-bulk-label">Asignar la misma edicion destino a todos:</span>
          <select class="a5-bulk-select" v-model="bulkTargetId" :disabled="loadingEditions">
            <option :value="null">— Seleccionar —</option>
            <option v-for="ed in availableEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
          </select>
          <button type="button" class="a5-btn-ghost" @click="applyBulkTarget" :disabled="!bulkTargetId">Aplicar a todos</button>
        </div>

        <div class="a5-table-wrap">
          <table class="a5-table">
            <thead>
              <tr>
                <th style="width:34%;">Alumno</th>
                <th style="width:22%;">Programa</th>
                <th class="text-center" style="width:8%;">Tipo</th>
                <th class="text-end" style="width:10%;">Monto pag.</th>
                <th style="width:26%;">Edicion destino</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in enrollments" :key="e.enrollment_id" :class="{ 'a5-row-warn': !selections[e.enrollment_id] }">
                <td>
                  <div class="a5-stu-name">{{ e.full_name }}</div>
                  <div class="a5-stu-doc">{{ e.document_number }}</div>
                </td>
                <td>
                  <div class="a5-prog-name">{{ e.program_name }}</div>
                  <div class="a5-prog-sub" v-if="e.is_child">
                    Hijo de {{ e.parent_program_name }} &middot; {{ e.parent_edition_code }}
                  </div>
                </td>
                <td class="text-center">
                  <span class="a5-type-pill" :class="e.is_child ? 'a5-pill-child' : 'a5-pill-parent'">
                    {{ e.is_child ? 'HIJO' : 'TOP' }}
                  </span>
                </td>
                <td class="text-end">
                  <span class="a5-amt">{{ formatAmount(e.amount_paid) }}</span>
                </td>
                <td>
                  <select class="a5-row-select" v-model="selections[e.enrollment_id]">
                    <option :value="null">— Seleccionar —</option>
                    <option v-for="ed in availableEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Justificacion -->
        <div class="a5-just">
          <label class="a5-just-label">Justificacion de la cancelacion <span class="a5-required">*</span></label>
          <textarea
            v-model="justificacion"
            class="a5-textarea"
            rows="3"
            placeholder="Motivo de la cancelacion y migracion (visible en historial de cada inscripcion)..."
          ></textarea>
        </div>

        <div class="a5-warning">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Las inscripciones originales quedaran en <b>RP (Reprogramada)</b>. Se crearan inscripciones nuevas en estado <b>"Pendiente a revisar"</b> con asesor <b>S/A</b>. No se enviaran correos ni se modificara Odoo hasta que cada migracion sea aprobada individualmente.
        </div>
      </template>
    </div>

    <template #footer>
      <button class="a5-btn-cancel" @click="handleClose" :disabled="saving">Cancelar</button>
      <button
        v-if="enrollments.length === 0"
        class="a5-btn-confirm"
        :disabled="saving"
        @click="handleSubmitEmpty"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        Cancelar edicion sin migrar
      </button>
      <button
        v-else
        class="a5-btn-confirm"
        :disabled="!canConfirm || saving"
        @click="handleSubmit"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        Migrar {{ enrollments.length }} y cancelar
      </button>
    </template>

    <!-- Doble confirmacion -->
    <div v-if="showConfirm" class="a5-confirm-overlay" @click.self="showConfirm = false">
      <div class="a5-confirm-box">
        <div class="a5-confirm-title">Confirmar cancelacion</div>
        <div class="a5-confirm-text">
          Vas a mover <b>{{ enrollments.length }}</b> inscripcion(es) y marcar la edicion <b>{{ origin?.global_code }}</b> como <b>A5</b>.<br/><br/>
          Esta accion <b>no se puede revertir automaticamente</b>.
        </div>
        <div class="a5-confirm-actions">
          <button class="a5-btn-cancel" @click="showConfirm = false">Volver</button>
          <button class="a5-btn-confirm" @click="executeMigration">Confirmar</button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: { type: Boolean, default: false },
  origin: { type: Object, default: null },
  a5SegmentId: { type: Number, default: null },
  userId: { type: Number, default: null }
})

const emit = defineEmits(['update:visible', 'completed'])

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

const loading = ref(false)
const loadingEditions = ref(false)
const saving = ref(false)
const showConfirm = ref(false)

const enrollments = ref([])
const availableEditions = ref([])
const selections = reactive({})
const bulkTargetId = ref(null)
const justificacion = ref('')

const canConfirm = computed(() => {
  if (justificacion.value.trim().length === 0) return false
  if (enrollments.value.length === 0) return false
  return enrollments.value.every(e => selections[e.enrollment_id])
})

watch(() => props.visible, async (v) => {
  if (!v) return
  resetState()
  await loadData()
})

async function loadData () {
  if (!props.origin?.edition_num_id) return
  loading.value = true
  loadingEditions.value = true
  try {
    enrollments.value = await editionService.a5PendingEnrollments(props.origin.edition_num_id)

    if (props.origin.program_version_id) {
      const eds = await editionService.editionCaller({
        program_version_id: props.origin.program_version_id,
        active: 'Y'
      })
      const today = new Date(); today.setHours(0, 0, 0, 0)
      availableEditions.value = (eds || [])
        .filter(ed => {
          if ((ed.edition_num_id || ed.id) === props.origin.edition_num_id) return false
          // Las A5 las excluye sp_edition_caller: no devuelve el segmento, asi
          // que aqui no habia forma de filtrarlas (el guard viejo nunca disparaba).
          if (!ed.start_date) return false
          const m = String(ed.start_date).match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!m) return false
          const sd = new Date(+m[1], +m[2] - 1, +m[3])
          return sd >= today
        })
        .map(ed => ({
          id: ed.edition_num_id || ed.id,
          start_date: ed.start_date,
          label: `${formatDate(ed.start_date)} — ${ed.global_code || ed.specific_code || ''}`
        }))
        .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
    }

    // Default inteligente: pre-seleccionar la edicion mas proxima
    const defaultId = availableEditions.value[0]?.id || null
    for (const e of enrollments.value) {
      selections[e.enrollment_id] = defaultId
    }
  } catch (err) {
    console.error('[A5Migration] loadData error:', err)
    toast.error('Error cargando datos de migracion.')
  } finally {
    loading.value = false
    loadingEditions.value = false
  }
}

function applyBulkTarget () {
  if (!bulkTargetId.value) return
  for (const e of enrollments.value) {
    selections[e.enrollment_id] = bulkTargetId.value
  }
}

function resetState () {
  enrollments.value = []
  availableEditions.value = []
  bulkTargetId.value = null
  justificacion.value = ''
  Object.keys(selections).forEach(k => delete selections[k])
  showConfirm.value = false
}

function handleClose () {
  if (saving.value) return
  emit('update:visible', false)
}

function handleSubmit () {
  if (!canConfirm.value) return
  showConfirm.value = true
}

async function handleSubmitEmpty () {
  // Sin alumnos: solo cambia segmento a A5 directamente via editionUpdate del caller
  emit('completed', { migrated: 0, applyA5: true })
  emit('update:visible', false)
}

async function executeMigration () {
  showConfirm.value = false
  saving.value = true
  try {
    const payload = {
      edition_num_id: props.origin.edition_num_id,
      a5_segment_id: props.a5SegmentId,
      justificacion: justificacion.value.trim(),
      user_id: props.userId,
      migrations: enrollments.value.map(e => ({
        enrollment_id: e.enrollment_id,
        target_edition_id: selections[e.enrollment_id]
      }))
    }
    const resp = await editionService.a5MigrationExecute(payload)
    if (resp?.result === 1) {
      toast.success(resp.message || 'Migracion completada')
      emit('completed', { migrated: resp.migrated_count, applyA5: false })
      emit('update:visible', false)
    } else {
      toast.error(resp?.message || 'Error al migrar')
    }
  } catch (err) {
    console.error('[A5Migration] execute error:', err)
    toast.error(err?.response?.data?.message || err?.message || 'Error al migrar')
  } finally {
    saving.value = false
  }
}

function formatDate (raw) {
  if (!raw) return '---'
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return raw
  return `${m[3]}/${m[2]}/${m[1]}`
}

function formatAmount (n) {
  const v = Number(n) || 0
  return 'S/ ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.a5-body { display: flex; flex-direction: column; gap: 16px; }

.a5-origin-card {
  display: flex; align-items: center; gap: 14px;
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
  padding: 14px 18px;
}
.a5-origin-icon { color: #B91C1C; display: flex; }
.a5-origin-text { flex: 1; }
.a5-origin-title { font-size: 14px; font-weight: 700; color: #7F1D1D; display: flex; align-items: center; gap: 8px; }
.a5-origin-sub { font-size: 12px; color: #991B1B; margin-top: 2px; }
.a5-segment-pill {
  background: #DC2626; color: #fff; font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px; letter-spacing: 0.05em;
}
.a5-origin-count { text-align: right; }
.a5-origin-count-num { display: block; font-size: 22px; font-weight: 700; color: #7F1D1D; line-height: 1; }
.a5-origin-count-lbl { font-size: 10px; color: #B91C1C; text-transform: uppercase; letter-spacing: 0.05em; }

.a5-loading, .a5-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; color: #6B7280; gap: 10px;
}
.a5-empty-title { font-size: 14px; font-weight: 600; color: #374151; }
.a5-empty-sub { font-size: 12px; color: #6B7280; }

.a5-bulk-bar {
  display: flex; align-items: center; gap: 10px;
  background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px;
  padding: 10px 14px;
}
.a5-bulk-label { font-size: 12px; font-weight: 600; color: #374151; }
.a5-bulk-select {
  flex: 1; max-width: 320px;
  border: 1px solid #D1D5DB; border-radius: 6px; padding: 6px 10px; font-size: 12.5px;
  background: #fff;
}

.a5-table-wrap {
  border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;
  max-height: 380px; overflow-y: auto;
}
.a5-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.a5-table thead th {
  background: #F3F4F6; padding: 9px 12px; text-align: left;
  font-size: 11px; font-weight: 600; color: #4B5563;
  text-transform: uppercase; letter-spacing: 0.04em;
  position: sticky; top: 0;
  border-bottom: 1px solid #E5E7EB;
}
.a5-table tbody td { padding: 10px 12px; border-top: 1px solid #F3F4F6; vertical-align: middle; }
.a5-row-warn td { background: #FFFBEB; }

.a5-stu-name { font-weight: 600; color: #111827; font-size: 13px; }
.a5-stu-doc { font-size: 11px; color: #6B7280; margin-top: 1px; }
.a5-prog-name { font-weight: 500; color: #374151; }
.a5-prog-sub { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
.a5-amt { font-weight: 600; color: #059669; font-size: 12.5px; }

.a5-type-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.a5-pill-parent { background: #DBEAFE; color: #1E40AF; }
.a5-pill-child { background: #E0E7FF; color: #4338CA; }

.a5-row-select {
  width: 100%; border: 1px solid #D1D5DB; border-radius: 6px;
  padding: 6px 8px; font-size: 12px; background: #fff;
}

.a5-just { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.a5-just-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.03em; }
.a5-required { color: #DC2626; }
.a5-textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1.5px solid #F59E0B; border-radius: 6px; font-size: 13px;
  font-family: inherit; color: #374151; background: #FFFBEB;
  resize: vertical; min-height: 72px;
}
.a5-textarea:focus { outline: none; border-color: #D97706; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }

.a5-warning {
  background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px;
  padding: 10px 14px; font-size: 12px; color: #92400E; line-height: 1.5;
}
.a5-warning i { margin-right: 6px; color: #B45309; }

.a5-btn-cancel, .a5-btn-confirm, .a5-btn-ghost {
  font-family: inherit; font-size: 12.5px; font-weight: 600;
  border-radius: 6px; padding: 8px 16px; cursor: pointer;
  transition: all 0.15s;
}
.a5-btn-cancel { background: none; border: 1px solid #E5E7EB; color: #6B7280; }
.a5-btn-cancel:hover:not(:disabled) { background: #F9FAFB; }
.a5-btn-ghost { background: #fff; border: 1px solid #D1D5DB; color: #374151; }
.a5-btn-ghost:hover:not(:disabled) { background: #F9FAFB; }
.a5-btn-confirm { background: #DC2626; color: #fff; border: none; display: inline-flex; align-items: center; gap: 8px; }
.a5-btn-confirm:hover:not(:disabled) { background: #B91C1C; }
.a5-btn-confirm:disabled, .a5-btn-cancel:disabled, .a5-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.a5-confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.a5-confirm-box {
  background: #fff; border-radius: 10px; padding: 24px; max-width: 420px; width: 90%;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.a5-confirm-title { font-size: 16px; font-weight: 700; color: #7F1D1D; margin-bottom: 12px; }
.a5-confirm-text { font-size: 13px; color: #374151; line-height: 1.5; margin-bottom: 20px; }
.a5-confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }

.text-center { text-align: center; }
.text-end { text-align: right; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .a5-origin-card { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.35); }
[data-coreui-theme="dark"] .a5-origin-icon { color: #F87171; }
[data-coreui-theme="dark"] .a5-origin-title { color: #FCA5A5; }
[data-coreui-theme="dark"] .a5-origin-sub { color: #F87171; }
[data-coreui-theme="dark"] .a5-origin-count-num { color: #FCA5A5; }
[data-coreui-theme="dark"] .a5-origin-count-lbl { color: #F87171; }
[data-coreui-theme="dark"] .a5-loading,
[data-coreui-theme="dark"] .a5-empty { color: #A0A099; }
[data-coreui-theme="dark"] .a5-empty-title { color: #D0D0C8; }
[data-coreui-theme="dark"] .a5-empty-sub { color: #8A8A80; }
[data-coreui-theme="dark"] .a5-bulk-bar { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .a5-bulk-label { color: #D0D0C8; }
[data-coreui-theme="dark"] .a5-bulk-select,
[data-coreui-theme="dark"] .a5-row-select { background: #14140F; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .a5-table-wrap { border-color: #2A2A22; }
[data-coreui-theme="dark"] .a5-table thead th { background: #24241E; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .a5-table tbody td { border-top-color: #24241E; }
[data-coreui-theme="dark"] .a5-row-warn td { background: rgba(245,158,11,.12); }
[data-coreui-theme="dark"] .a5-stu-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .a5-stu-doc { color: #8A8A80; }
[data-coreui-theme="dark"] .a5-prog-name { color: #D0D0C8; }
[data-coreui-theme="dark"] .a5-prog-sub { color: #8A8A80; }
[data-coreui-theme="dark"] .a5-amt { color: #34D399; }
[data-coreui-theme="dark"] .a5-pill-parent { background: rgba(59,130,246,.2); color: #93C5FD; }
[data-coreui-theme="dark"] .a5-pill-child { background: rgba(99,102,241,.2); color: #C7D2FE; }
[data-coreui-theme="dark"] .a5-just-label { color: #A0A099; }
[data-coreui-theme="dark"] .a5-required { color: #F87171; }
[data-coreui-theme="dark"] .a5-textarea {
  border-color: rgba(245,158,11,.45);
  background: rgba(245,158,11,.10);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .a5-textarea:focus { border-color: #FBBF24; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
[data-coreui-theme="dark"] .a5-warning { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #FBBF24; }
[data-coreui-theme="dark"] .a5-warning i { color: #FBBF24; }
[data-coreui-theme="dark"] .a5-btn-cancel { border-color: #3A3A33; color: #A0A099; }
[data-coreui-theme="dark"] .a5-btn-cancel:hover:not(:disabled) { background: #1F1F1A; }
[data-coreui-theme="dark"] .a5-btn-ghost { background: #1F1F1A; border-color: #3A3A33; color: #D0D0C8; }
[data-coreui-theme="dark"] .a5-btn-ghost:hover:not(:disabled) { background: #24241E; }
[data-coreui-theme="dark"] .a5-confirm-overlay { background: rgba(0,0,0,0.65); }
[data-coreui-theme="dark"] .a5-confirm-box { background: #1A1A14; box-shadow: 0 20px 40px rgba(0,0,0,0.55); }
[data-coreui-theme="dark"] .a5-confirm-title { color: #FCA5A5; }
[data-coreui-theme="dark"] .a5-confirm-text { color: #D0D0C8; }
</style>

<style>
/* Casco del BaseModal (teleported a body, fuera del scope): solo en dark y
   solo cuando el modal contiene este cuerpo (.a5-body). */
[data-coreui-theme="dark"] .modal-card:has(.a5-body) {
  background: #1A1A14;
  border-color: #2A2A22;
  box-shadow: 0 20px 40px rgba(0,0,0,.5);
}
[data-coreui-theme="dark"] .modal-card:has(.a5-body) .modal-header { border-bottom-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .modal-card:has(.a5-body) .modal-footer { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .modal-card:has(.a5-body) .btn-close { color: #A0A099; }
</style>
