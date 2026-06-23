<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Reprogramar Cuotas"
    size="lg"
  >
    <div class="ri-body" v-if="enrollment">
      <!-- Student info bar -->
      <div class="ri-student-bar">
        <div class="ri-student-main">
          <span class="ri-student-name">{{ studentName }}</span>
          <span class="ri-student-doc">{{ enrollment.document_number || enrollment.dni || '—' }}</span>
        </div>
        <span class="ri-program-pill">{{ enrollment.program_name || enrollment.program || '—' }}</span>
      </div>

      <!-- Mode tabs -->
      <div class="ri-tabs">
        <button :class="['ri-tab', { active: mode === 'shift' }]" @click="mode = 'shift'">
          <i class="fa-solid fa-forward"></i> Correr fechas
        </button>
        <button :class="['ri-tab', { active: mode === 'individual' }]" @click="mode = 'individual'">
          <i class="fa-solid fa-pen-to-square"></i> Editar individualmente
        </button>
      </div>

      <!-- Shift mode -->
      <div v-if="mode === 'shift'" class="ri-panel">
        <div class="ri-shift-row">
          <label class="ri-label">Dias a posponer</label>
          <div class="ri-shift-input-wrap">
            <input
              type="number"
              min="1"
              v-model.number="shiftDays"
              class="ri-shift-input"
              placeholder="15"
            />
            <span class="ri-shift-hint">Se aplicara a todas las cuotas pendientes</span>
          </div>
        </div>
      </div>

      <!-- Preview table -->
      <div class="ri-preview">
        <div class="ri-preview-title">Vista previa</div>
        <table class="ri-table">
          <thead>
            <tr>
              <th style="width:40px">N</th>
              <th style="width:90px">Monto</th>
              <th style="width:115px">Fecha actual</th>
              <th style="width:130px">Nueva fecha</th>
              <th class="tc" style="width:100px">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.installment_id"
              :class="{ 'ri-row-paid': row.isPaid, 'ri-row-error': rowMeta(row).error }"
            >
              <td class="fw700 tc">{{ row.installment_number }}</td>
              <td class="mono">S/. {{ formatMoney(row.amount) }}</td>
              <td>{{ formatDate(row.old_due_date) }}</td>
              <td>
                <template v-if="row.isPaid">—</template>
                <BaseDatePicker
                  v-else-if="mode === 'individual'"
                  v-model="row.new_due_date"
                  placeholder="dd/mm/aaaa"
                  class="ri-datepicker"
                />
                <span v-else>{{ formatDate(row.new_due_date) }}</span>
              </td>
              <td class="tc">
                <span v-if="row.isPaid" class="ri-pill ri-pill-muted">Pagada</span>
                <template v-else>
                  <span v-if="rowMeta(row).error" class="ri-pill ri-pill-red" :title="rowMeta(row).error">{{ rowMeta(row).errorShort }}</span>
                  <span v-else-if="rowMeta(row).changed" class="ri-pill ri-pill-green">Se movera</span>
                  <span v-else class="ri-pill ri-pill-muted">Sin cambio</span>
                </template>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="ri-empty">Sin cuotas para reprogramar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reason + justification -->
      <div class="ri-grid2">
        <div class="ri-field">
          <label class="ri-label">Motivo <span class="ri-req">*</span></label>
          <select v-model="reasonCode" class="ri-select">
            <option value="">Seleccionar...</option>
            <option value="financiero">Financiero</option>
            <option value="academico">Academico</option>
            <option value="personal">Personal</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div class="ri-field ri-field-full">
          <label class="ri-label">Justificacion <span class="ri-req">*</span></label>
          <textarea
            v-model="justificacion"
            class="ri-textarea"
            rows="2"
            placeholder="Describe el motivo del cambio..."
          ></textarea>
        </div>
      </div>

      <!-- Edition end-date warning -->
      <div v-if="editionEndDate" class="ri-edition-note">
        <i class="fa-solid fa-circle-info"></i>
        Ninguna cuota puede superar el fin de la edicion: <strong>{{ formatDate(editionEndDate) }}</strong>
      </div>
    </div>

    <template #footer>
      <button class="ri-btn-cancel" @click="$emit('update:visible', false)">Cancelar</button>
      <button
        class="ri-btn-confirm"
        :disabled="!canConfirm || saving"
        @click="handleSave"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-calendar-check"></i>
        Reprogramar {{ pendingChangesCount }} cuota{{ pendingChangesCount === 1 ? '' : 's' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: { type: Boolean, default: false },
  enrollment: { type: Object, default: null },
  installments: { type: Array, default: () => [] },
  editionEndDate: { type: [String, Date, null], default: null }
})

const emit = defineEmits(['update:visible', 'completed'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const mode = ref('shift')
const shiftDays = ref(15)
const reasonCode = ref('')
const justificacion = ref('')
const saving = ref(false)
const rows = ref([])

const PAID_STATUS = 4454

const studentName = computed(() => {
  const e = props.enrollment || {}
  return e.student_full_name
    || e.student_name
    || e.full_name
    || [e.first_name, e.last_name].filter(Boolean).join(' ')
    || '—'
})

function toISO (d) {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate (d) {
  if (!d) return '—'
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
  }
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-PE')
}

function formatMoney (n) {
  return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildInitialRows () {
  return (props.installments || [])
    .filter(i => Number(i.installment_number) > 0 && !i.is_reserva)
    .map(i => ({
      installment_id: i.installment_id,
      installment_number: i.installment_number,
      amount: i.amount,
      old_due_date: toISO(i.due_date),
      new_due_date: toISO(i.due_date),
      isPaid: Number(i.cat_status) === PAID_STATUS || i.status === 'paid'
    }))
}

function applyShift () {
  const n = Number(shiftDays.value)
  for (const r of rows.value) {
    if (r.isPaid) continue
    if (!Number.isFinite(n) || n < 1) { r.new_due_date = r.old_due_date; continue }
    const d = new Date(r.old_due_date)
    d.setDate(d.getDate() + n)
    r.new_due_date = toISO(d)
  }
}

const rowValidations = computed(() => {
  const endLimit = props.editionEndDate ? new Date(props.editionEndDate) : null
  if (endLimit) endLimit.setHours(0, 0, 0, 0)

  const map = new Map()
  for (const r of rows.value) {
    if (r.isPaid) { map.set(r.installment_id, { isPaid: true, error: null, errorShort: null, changed: false }); continue }

    const oldD = new Date(r.old_due_date); oldD.setHours(0, 0, 0, 0)
    const newD = new Date(r.new_due_date); newD.setHours(0, 0, 0, 0)

    // ponytail: se permite mover la fecha hacia atras o adelante; solo se valida
    // que sea valida y que no supere el fin de la edicion.
    let error = null, errorShort = null, changed = false
    if (isNaN(newD.getTime())) { error = 'Fecha invalida'; errorShort = 'Invalida' }
    else if (newD.getTime() === oldD.getTime()) { changed = false }
    else if (endLimit && newD > endLimit) { error = `Supera fin de edicion (${formatDate(endLimit)})`; errorShort = 'Fuera rango' }
    else { changed = true }

    map.set(r.installment_id, { isPaid: false, error, errorShort, changed })
  }
  return map
})

function rowMeta (row) {
  return rowValidations.value.get(row.installment_id) || { isPaid: false, error: null, errorShort: null, changed: false }
}

watch(() => props.visible, (v) => {
  if (!v) return
  mode.value = 'shift'
  shiftDays.value = 15
  reasonCode.value = ''
  justificacion.value = ''
  rows.value = buildInitialRows()
  applyShift()
})

watch(() => props.installments, () => {
  if (!props.visible) return
  rows.value = buildInitialRows()
  if (mode.value === 'shift') applyShift()
}, { deep: true })

watch([shiftDays, mode], () => {
  if (!props.visible) return
  if (mode.value === 'shift') applyShift()
})

const pendingChangesCount = computed(() => {
  let n = 0
  for (const r of rows.value) {
    const m = rowMeta(r)
    if (m.changed && !m.error) n++
  }
  return n
})
const hasErrors = computed(() => {
  for (const r of rows.value) { if (rowMeta(r).error) return true }
  return false
})

const canConfirm = computed(() =>
  pendingChangesCount.value > 0 &&
  !hasErrors.value &&
  reasonCode.value &&
  justificacion.value.trim().length > 0
)

async function handleSave () {
  if (!canConfirm.value) return
  saving.value = true
  try {
    const changes = rows.value
      .filter(r => {
        const m = rowMeta(r)
        return !r.isPaid && m.changed && !m.error
      })
      .map(r => ({ installment_id: r.installment_id, new_due_date: r.new_due_date }))

    const res = await ficoService.rescheduleInstallments({
      enrollment_id: Number(props.enrollment.enrollment_id),
      changes,
      justificacion: justificacion.value.trim(),
      reason_code: reasonCode.value
    })

    if (res?.odoo_sync === false) {
      const allSameError = Array.isArray(res.odoo_failed_fees)
        && res.odoo_failed_fees.length > 0
        && res.odoo_failed_fees.every(f => f.error === res.odoo_failed_fees[0].error)
      const msg = allSameError
        ? res.odoo_failed_fees[0].error
        : (res.odoo_error || 'Odoo no se sincronizo')
      toast.warning(`Cuotas guardadas. ${msg}`, { timeout: 7000 })
    } else if (res?.odoo_skipped) {
      toast.success(`${res?.updated || changes.length} cuota(s) reprogramada(s).`)
    } else {
      toast.success(`${res?.updated || changes.length} cuota(s) reprogramada(s) y sincronizada(s) con Odoo.`)
    }
    emit('completed')
    emit('update:visible', false)
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al reprogramar cuotas.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ri-body { display: flex; flex-direction: column; gap: 16px; }

.ri-student-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px;
}
.ri-student-main { display: flex; flex-direction: column; gap: 2px; }
.ri-student-name { font-size: 13.5px; font-weight: 700; color: #111827; }
.ri-student-doc { font-size: 11.5px; color: #6B7280; font-weight: 500; }
.ri-program-pill {
  font-size: 11px; font-weight: 600; color: #4338CA;
  background: #EEF2FF; border: 1px solid #C7D2FE;
  padding: 4px 12px; border-radius: 20px;
}

.ri-tabs { display: flex; gap: 0; border-bottom: 1px solid #F0F0F0; }
.ri-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px; font-size: 12.5px; font-weight: 500;
  color: #A3A3A3; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-family: inherit; transition: color .2s, border-color .2s;
}
.ri-tab:hover { color: #1A1A1A; }
.ri-tab.active { color: #1A1A1A; font-weight: 600; border-bottom-color: #4338CA; }

.ri-panel { padding: 4px 0; }

.ri-shift-row { display: flex; align-items: flex-end; gap: 14px; }
.ri-shift-input-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
.ri-shift-input {
  width: 100px; height: 38px; padding: 0 12px; font-size: 14px;
  font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1A1A1A;
  border: 1px solid #E5E7EB; border-radius: 8px; outline: none;
  text-align: center; transition: border-color .2s;
}
.ri-shift-input:focus { border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67,56,202,.08); }
.ri-shift-hint { font-size: 11.5px; color: #737373; }

.ri-preview { display: flex; flex-direction: column; gap: 8px; }
.ri-preview-title {
  font-size: 11px; font-weight: 600; color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.05em;
}

.ri-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ri-table thead th {
  background: #FAFAFA; padding: 9px 10px; text-align: left;
  font-weight: 500; color: #A3A3A3; border-bottom: 1px solid #F0F0F0;
  font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
}
.ri-table tbody td {
  padding: 8px 10px; border-bottom: 1px solid #F5F5F5; vertical-align: middle;
}
.ri-row-paid td { background: #FAFAFA; color: #A3A3A3; }
.ri-row-error td { background: #FFFBFB; }

.ri-datepicker :deep(input) {
  height: 32px; padding: 0 10px; font-size: 12px;
  border: 1px solid #E8E8E8; border-radius: 6px; width: 100%; font-family: inherit;
}

.ri-empty { text-align: center; padding: 24px; color: #C4C4C4; }

.ri-pill {
  display: inline-flex; padding: 3px 10px;
  border-radius: 6px; font-size: 10.5px; font-weight: 600;
}
.ri-pill-green { background: #ECFDF5; color: #065F46; }
.ri-pill-red { background: #FEF2F2; color: #991B1B; }
.ri-pill-muted { background: #F3F4F6; color: #6B7280; }

.ri-grid2 { display: grid; grid-template-columns: 180px 1fr; gap: 14px; }

.ri-field { display: flex; flex-direction: column; gap: 5px; }
.ri-field-full { grid-column: 2 / span 1; }
.ri-label {
  font-size: 11px; font-weight: 600; color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.ri-req { color: #DC2626; }

.ri-select, .ri-textarea {
  width: 100%; box-sizing: border-box;
  padding: 8px 12px; font-size: 13px; font-family: inherit;
  color: #374151; background: #FFFFFF;
  border: 1px solid #E5E7EB; border-radius: 6px; outline: none;
  transition: border-color .15s;
}
.ri-select:focus, .ri-textarea:focus {
  border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.08);
}
.ri-textarea { min-height: 60px; resize: vertical; background: #FFFBEB; border-color: #F59E0B; }

.ri-edition-note {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #EFF6FF; border: 1px solid #BFDBFE;
  border-radius: 8px; font-size: 12px; color: #1E40AF;
}
.ri-edition-note i { color: #3B82F6; }

.ri-btn-cancel {
  background: none; border: 1px solid #E5E7EB; color: #6B7280;
  padding: 8px 16px; border-radius: 6px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.ri-btn-cancel:hover { background: #F9FAFB; border-color: #D1D5DB; }

.ri-btn-confirm {
  background: #4338CA; color: #FFFFFF; border: none;
  padding: 8px 20px; border-radius: 6px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 7px;
  transition: all .15s;
}
.ri-btn-confirm:hover:not(:disabled) { background: #3730A3; }
.ri-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
