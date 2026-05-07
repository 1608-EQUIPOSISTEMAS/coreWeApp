<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Exportar alumnos en aula"
    size="md"
  >
    <div class="ce-body">
      <p class="ce-help">
        Selecciona un curso y la edición. El archivo CSV se descarga con los alumnos confirmados de esa edición.
      </p>

      <div class="ce-field">
        <label class="ce-label">Curso <span class="ce-required">*</span></label>
        <div class="ce-select-wrap">
          <select
            v-model="selectedProgramId"
            class="ce-select"
            :disabled="loadingOptions"
            @change="onProgramChange"
          >
            <option :value="null" disabled>
              {{ loadingOptions ? 'Cargando cursos...' : 'Seleccionar curso...' }}
            </option>
            <option
              v-for="p in options"
              :key="p.program_version_id"
              :value="p.program_version_id"
            >{{ p.version_code }} — {{ p.abbreviation }}</option>
          </select>
          <i v-if="loadingOptions" class="fa-solid fa-spinner fa-spin ce-select-icon"></i>
          <i v-else class="fa-solid fa-chevron-down ce-select-icon"></i>
        </div>
      </div>

      <div class="ce-field">
        <label class="ce-label">Edición <span class="ce-required">*</span></label>
        <div class="ce-select-wrap">
          <select
            v-model="selectedEditionId"
            class="ce-select"
            :disabled="!selectedProgramId || availableEditions.length === 0"
          >
            <option :value="null" disabled>
              {{ !selectedProgramId ? 'Selecciona un curso primero' : (availableEditions.length === 0 ? 'Sin ediciones disponibles' : 'Seleccionar edición...') }}
            </option>
            <option
              v-for="ed in availableEditions"
              :key="ed.edition_num_id"
              :value="ed.edition_num_id"
            >{{ formatEditionLabel(ed) }}</option>
          </select>
          <i class="fa-solid fa-chevron-down ce-select-icon"></i>
        </div>
      </div>

      <div v-if="selectedEdition" class="ce-summary">
        <i class="fa-solid fa-users"></i>
        <span><strong>{{ selectedEdition.students_count }}</strong> alumno{{ selectedEdition.students_count === 1 ? '' : 's' }} en aula</span>
      </div>
    </div>

    <template #footer>
      <button class="ce-btn-cancel" @click="$emit('update:visible', false)">Cancelar</button>
      <button
        class="ce-btn-download"
        :disabled="!canDownload || downloading"
        @click="handleDownload"
      >
        <i v-if="downloading" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-file-arrow-down"></i>
        Descargar CSV
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

defineEmits(['update:visible'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const options = ref([])
const loadingOptions = ref(false)
const selectedProgramId = ref(null)
const selectedEditionId = ref(null)
const downloading = ref(false)

const selectedProgram = computed(() =>
  options.value.find(p => p.program_version_id === selectedProgramId.value) || null
)

const availableEditions = computed(() => selectedProgram.value?.editions || [])

const selectedEdition = computed(() =>
  availableEditions.value.find(e => e.edition_num_id === selectedEditionId.value) || null
)

const canDownload = computed(() => !!selectedProgramId.value && !!selectedEditionId.value)

watch(() => props.visible, async (v) => {
  if (!v) return
  selectedProgramId.value = null
  selectedEditionId.value = null
  loadingOptions.value = true
  try {
    options.value = await ficoService.getClassroomExportOptions() || []
  } catch (err) {
    console.error('[ClassroomExport] options error', err)
    toast.error('No se pudieron cargar los cursos disponibles.')
    options.value = []
  } finally {
    loadingOptions.value = false
  }
})

function onProgramChange () {
  selectedEditionId.value = null
}

function formatEditionLabel (ed) {
  // Formateo por componentes de la cadena calendario YYYY-MM-DD para evitar el
  // TZ shift de new Date().toLocaleDateString cuando el server Node corre en UTC.
  const m = ed.start_date ? String(ed.start_date).match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  const date = m ? `${m[3]}/${m[2]}/${m[1]}` : 'Sin fecha'
  return `${date} · ${ed.students_count} alumno${ed.students_count === 1 ? '' : 's'}`
}

async function handleDownload () {
  if (!canDownload.value) return
  downloading.value = true
  try {
    const response = await ficoService.downloadClassroomExport(
      selectedProgramId.value,
      selectedEditionId.value
    )
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const programCode = selectedProgram.value?.version_code || 'curso'
    const editionDate = selectedEdition.value?.start_date
      ? new Date(selectedEdition.value.start_date).toISOString().slice(0, 10)
      : 'edicion'
    link.download = `aula_${programCode}_${editionDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Descarga lista.')
  } catch (err) {
    console.error('[ClassroomExport] download error', err)
    toast.error(err?.response?.data?.error || 'Error al descargar el archivo.')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.ce-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ce-help {
  font-size: 13px;
  color: #6F6F66;
  margin: 0 0 4px 0;
  line-height: 1.5;
}
.ce-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ce-label {
  font-size: 12px;
  font-weight: 600;
  color: #14140F;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ce-required {
  color: #DC2626;
}
.ce-select-wrap {
  position: relative;
}
.ce-select {
  width: 100%;
  padding: 10px 36px 10px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: #14140F;
  background: #fff;
  border: 1px solid #E8E8E3;
  border-radius: 8px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.ce-select:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.ce-select:disabled {
  background: #FAFAF8;
  color: #A0A099;
  cursor: not-allowed;
}
.ce-select-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #6F6F66;
  pointer-events: none;
}
.ce-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ECFDF4;
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  font-size: 12.5px;
  color: #047857;
  align-self: flex-start;
}
.ce-summary i {
  font-size: 11px;
}
.ce-summary strong {
  font-weight: 700;
}
.ce-btn-cancel {
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #6F6F66;
  background: #fff;
  border: 1px solid #E8E8E3;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
}
.ce-btn-cancel:hover {
  background: #FAFAF8;
  color: #14140F;
}
.ce-btn-download {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  color: #fff;
  background: #14140F;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s ease;
}
.ce-btn-download:hover:not(:disabled) {
  background: #333;
}
.ce-btn-download:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ce-btn-download i {
  font-size: 11px;
}
</style>
