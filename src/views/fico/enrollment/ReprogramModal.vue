<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Reprogramacion de Edicion"
    size="md"
  >
    <div class="rp-body" v-if="enrollment">
      <!-- Student info bar -->
      <div class="rp-student-bar">
        <div class="rp-student-main">
          <span class="rp-student-name">{{ enrollment.student_name || enrollment.full_name || '—' }}</span>
          <span class="rp-student-doc">{{ enrollment.document_number || enrollment.dni || '—' }}</span>
        </div>
        <span class="rp-program-pill">{{ enrollment.program_name || enrollment.program || '—' }}</span>
      </div>

      <!-- Current edition (readonly) -->
      <div class="rp-grid">
        <div class="rp-field">
          <label class="rp-label">Edicion Actual</label>
          <div class="rp-readonly">{{ enrollment.edition_code || enrollment.global_code || '—' }}</div>
        </div>
        <div class="rp-field">
          <label class="rp-label">Fecha Inicio</label>
          <div class="rp-readonly">{{ fmt.formatDate(enrollment.start_date || enrollment.edition_start_date) }}</div>
        </div>
      </div>

      <!-- New edition select -->
      <div class="rp-field rp-field--full">
        <label class="rp-label">Nueva Edicion</label>
        <div class="rp-select-wrap">
          <select
            v-model="reprogramEditionId"
            class="rp-select"
            :disabled="loadingEditions"
          >
            <option :value="null" disabled>
              {{ loadingEditions ? 'Cargando ediciones...' : 'Seleccionar edicion...' }}
            </option>
            <option
              v-for="ed in reprogramEditions"
              :key="ed.id"
              :value="ed.id"
            >{{ ed.label }}</option>
          </select>
          <i v-if="loadingEditions" class="fa-solid fa-spinner fa-spin rp-select-icon"></i>
          <i v-else class="fa-solid fa-chevron-down rp-select-icon"></i>
        </div>
      </div>

      <!-- Justification -->
      <div class="rp-field rp-field--full">
        <label class="rp-label">Justificacion <span class="rp-required">*</span></label>
        <textarea
          v-model="reprogramJustificacion"
          class="rp-textarea"
          rows="3"
          placeholder="Motivo de la reprogramacion..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="rp-btn-cancel" @click="$emit('update:visible', false)">Cancelar</button>
      <button
        class="rp-btn-confirm"
        :disabled="!canConfirm || saving"
        @click="handleReprogram"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-arrow-right-arrow-left"></i>
        Confirmar Reprogramacion
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: { type: Boolean, default: false },
  enrollment: { type: Object, default: null },
  detail: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'completed'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()
const fmt = useEnrollmentFormatters()

const reprogramEditionId = ref(null)
const reprogramJustificacion = ref('')
const reprogramEditions = ref([])
const loadingEditions = ref(false)
const saving = ref(false)

const canConfirm = computed(() =>
  reprogramEditionId.value !== null && reprogramJustificacion.value.trim().length > 0
)

watch(() => props.visible, async (v) => {
  if (!v || !props.enrollment) return
  reprogramEditionId.value = null
  reprogramJustificacion.value = ''
  reprogramEditions.value = []
  loadingEditions.value = true
  try {
    const items = await ficoService.getAvailableEditions(Number(props.enrollment.enrollment_id))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reprogramEditions.value = (items || [])
      .filter(e => e.start_date && new Date(e.start_date) >= today)
      .map(e => ({
        id: e.edition_num_id || e.id,
        label: `${new Date(e.start_date).toLocaleDateString('es-PE')} — ${e.global_code || e.edition_code || ''}`
      }))
  } catch (err) {
    console.error('Error cargando ediciones:', err)
  } finally {
    loadingEditions.value = false
  }
})

async function handleReprogram () {
  if (!canConfirm.value) return
  saving.value = true
  try {
    await ficoService.reprogramEdition({
      enrollment_id: Number(props.enrollment.enrollment_id),
      new_edition_id: reprogramEditionId.value,
      justificacion: reprogramJustificacion.value.trim()
    })
    toast.success('Edicion reprogramada correctamente.')
    emit('completed')
    emit('update:visible', false)
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al reprogramar edicion.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rp-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Student info bar */
.rp-student-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 12px 16px;
}

.rp-student-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rp-student-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}

.rp-student-doc {
  font-size: 11.5px;
  color: #6B7280;
  font-weight: 500;
}

.rp-program-pill {
  font-size: 11px;
  font-weight: 600;
  color: #4338CA;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Grid for readonly fields */
.rp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* Field wrapper */
.rp-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rp-field--full {
  width: 100%;
}

.rp-label {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rp-required {
  color: #DC2626;
}

/* Readonly display */
.rp-readonly {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  padding: 8px 12px;
}

/* Select */
.rp-select-wrap {
  position: relative;
}

.rp-select {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 36px 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #374151;
  background: #FFFFFF;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.rp-select:focus {
  outline: none;
  border-color: #4338CA;
  box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.08);
}

.rp-select:disabled {
  background: #F9FAFB;
  color: #9CA3AF;
  cursor: not-allowed;
}

.rp-select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #9CA3AF;
  pointer-events: none;
}

/* Textarea */
.rp-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1.5px solid #F59E0B;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #374151;
  background: #FFFBEB;
  resize: vertical;
  min-height: 72px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.rp-textarea:focus {
  outline: none;
  border-color: #D97706;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.rp-textarea::placeholder {
  color: #D1D5DB;
}

/* Footer buttons */
.rp-btn-cancel {
  background: none;
  border: 1px solid #E5E7EB;
  color: #6B7280;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.rp-btn-cancel:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

.rp-btn-confirm {
  background: #4338CA;
  color: #FFFFFF;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: all 0.15s;
}

.rp-btn-confirm:hover:not(:disabled) {
  background: #3730A3;
}

.rp-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
