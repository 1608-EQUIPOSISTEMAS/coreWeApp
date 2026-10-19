<template>
  <section class="ds-panel" aria-labelledby="pm-title">
    <header class="ds-panel-head">
      <h3 id="pm-title" class="ds-panel-title">Archivos del programa</h3>
      <span class="ds-panel-hint">Los manda el bot de WhatsApp al lead que pregunta por este programa</span>
    </header>

    <div class="ds-panel-body">
      <p v-if="error" class="ds-alert">{{ error }}</p>
      <template v-else-if="slots">
        <p class="ds-callout" :class="resumen.tone">
          <i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>{{ resumen.text }}</span>
        </p>
        <div class="pm-grid">
          <article v-for="s in vistas" :key="s.slot" class="pm-card">
            <div class="pm-preview">
              <img v-if="s.isImage && previews[s.slot]" :src="previews[s.slot]" :alt="s.label" />
              <i v-else class="fa-solid" :class="s.archivo ? 'fa-file-pdf' : 'fa-image'" aria-hidden="true"></i>
            </div>
            <h4 class="pm-title">
              {{ s.label }}
              <span class="ds-pill" :class="s.estado.tone">{{ s.estado.label }}</span>
            </h4>
            <p class="pm-note">{{ s.purpose }}</p>
            <p class="pm-note">{{ s.archivo ?? s.hint }}</p>
            <div class="pm-actions">
              <label class="btn-exec btn-exec-outline btn-sm" :class="{ 'is-busy': ocupado === s.slot }">
                <i class="fa-solid fa-upload" aria-hidden="true"></i>
                {{ ocupado === s.slot ? 'Subiendo…' : (s.archivo ? 'Reemplazar' : 'Subir') }}
                <input class="visually-hidden" type="file" :accept="s.accept" :disabled="ocupado !== null" @change="subir(s, $event)" />
              </label>
              <button v-if="s.archivo" class="btn-icon btn-icon-sm" type="button" :title="`Ver ${s.label}`" :aria-label="`Ver ${s.label}`" @click="ver(s)">
                <i class="fa-solid fa-eye" aria-hidden="true"></i>
              </button>
              <button v-if="s.archivo" class="btn-icon btn-icon-sm" type="button" :disabled="ocupado !== null" :title="`Quitar ${s.label}`" :aria-label="`Quitar ${s.label}`" @click="quitar(s)">
                <i class="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        </div>
      </template>
      <div v-else class="pm-grid" aria-busy="true">
        <span v-for="n in 3" :key="n" class="ds-skel pm-skel"></span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject, watch, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { confirmAction } from '@/composables/useConfirm'
import { slotView, fileProblem, mediaSummary } from '@/features/program-media/programMedia'

const props = defineProps({ programId: { type: Number, required: true } })

const programService = inject(ServiceKeys.Program)
const toast = useToast()

const slots = ref(null)
const error = ref('')
const ocupado = ref(null)
const previews = ref({})

const vistas = computed(() => (slots.value ?? []).map(slotView))
const resumen = computed(() => mediaSummary(slots.value ?? []))

function liberarPreviews () {
  Object.values(previews.value).forEach(url => URL.revokeObjectURL(url))
  previews.value = {}
}

// Las imágenes se piden como blob: en producción /uploads no es público.
async function cargarPreviews () {
  liberarPreviews()
  for (const s of vistas.value.filter(v => v.isImage)) {
    try {
      previews.value[s.slot] = URL.createObjectURL(await programService.mediaFile(props.programId, s.slot))
    } catch (err) {
      console.error('[ProgramMediaPanel] vista previa', { programId: props.programId, slot: s.slot, err })
    }
  }
}

async function aplicar (data) {
  slots.value = data
  await cargarPreviews()
}

async function cargar () {
  error.value = ''
  try {
    await aplicar(await programService.mediaGet(props.programId))
  } catch (err) {
    console.error('[ProgramMediaPanel] cargar', { programId: props.programId, err })
    error.value = err?.response?.data?.message || 'No se pudieron cargar los archivos del programa.'
  }
}
watch(() => props.programId, cargar, { immediate: true })
onUnmounted(liberarPreviews)

async function subir (s, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const definicion = slots.value.find(x => x.slot === s.slot)
  const problema = fileProblem(definicion, file)
  if (problema) return toast.error(problema)
  ocupado.value = s.slot
  try {
    await aplicar(await programService.mediaUpload(props.programId, s.slot, file))
    toast.success(`${s.label} subido`)
  } catch (err) {
    console.error('[ProgramMediaPanel] subir', { programId: props.programId, slot: s.slot, err })
    toast.error(err?.response?.data?.message || `No se pudo subir ${s.label.toLowerCase()}.`)
  } finally {
    ocupado.value = null
  }
}

async function ver (s) {
  try {
    const url = URL.createObjectURL(await programService.mediaFile(props.programId, s.slot))
    window.open(url, '_blank', 'noopener')
    // La pestaña nueva ya cargó el blob; se libera luego para no acumular memoria.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    console.error('[ProgramMediaPanel] ver', { programId: props.programId, slot: s.slot, err })
    toast.error('No se pudo abrir el archivo.')
  }
}

async function quitar (s) {
  const ok = await confirmAction({
    title: `Quitar ${s.label.toLowerCase()}`,
    text: 'El bot de WhatsApp deja de mandar la información de este programa hasta que subas otro.',
    confirmText: 'Quitar archivo',
    danger: true
  })
  if (!ok) return
  ocupado.value = s.slot
  try {
    await aplicar(await programService.mediaDelete(props.programId, s.slot))
    toast.success(`${s.label} quitado`)
  } catch (err) {
    console.error('[ProgramMediaPanel] quitar', { programId: props.programId, slot: s.slot, err })
    toast.error(err?.response?.data?.message || 'No se pudo quitar el archivo.')
  } finally {
    ocupado.value = null
  }
}
</script>

<style scoped>
.pm-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.pm-card { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-surface-2); }
.pm-preview { display: grid; place-items: center; height: 140px; border-radius: var(--ds-radius-sm); background: var(--ds-surface); overflow: hidden; font-size: 34px; color: var(--ds-muted); }
.pm-preview img { width: 100%; height: 100%; object-fit: contain; }
.pm-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 0 0; font-size: 14px; color: var(--ds-heading); }
.pm-note { margin: 0; font-size: 12px; color: var(--ds-ink-2); overflow-wrap: anywhere; }
.pm-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 6px; }
.pm-actions label { cursor: pointer; }
.pm-actions label.is-busy { opacity: .6; pointer-events: none; }
.pm-actions label:focus-within { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.pm-skel { display: block; height: 240px; }
@media (max-width: 900px) {
  .pm-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
