<template>
  <article class="ds-panel">
    <header class="ds-panel-head">
      <h3 class="ds-panel-title">¿Qué está pidiendo?</h3>
      <span class="ds-panel-hint">Lo que hicieron las personas nuevas que preguntaron lo mismo</span>
    </header>
    <div class="ds-panel-body">
      <div class="buscador">
        <SearchSelect
          v-model="programId"
          :items="opciones"
          label-field="program_name"
          value-field="program_id"
          sublabel-field="opcion"
          placeholder="Busca el programa que pide (ej. Power BI)"
        />
      </div>

      <p v-if="error" class="ds-alert">{{ error }}</p>
      <span v-else-if="loading" class="ds-skel"></span>
      <p v-else-if="!vista" class="ds-empty">Elige el programa por el que escribe y te digo qué suelen hacer los que preguntan eso.</p>

      <div v-else class="manual">
        <div class="manual-head">
          <strong class="manual-programa">{{ vista.programa }}</strong>
          <span class="ds-pill" :class="vista.tierTone">{{ vista.tier }}</span>
          <span v-if="vista.conversion" class="manual-pct">{{ vista.conversion }}</span>
        </div>
        <p class="manual-texto">{{ vista.resumen }}</p>
        <p v-if="vista.velocidad" class="ds-callout info">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i><span>{{ vista.velocidad }}</span>
        </p>

        <div v-if="vista.destinos.length" class="destinos">
          <span class="destinos-titulo">Los que compraron terminaron llevando:</span>
          <div v-for="d in vista.destinos" :key="d.key" class="destino">
            <span class="destino-nombre">{{ d.programa }} <span class="ds-pill" :class="d.tag.tone">{{ d.tag.label }}</span></span>
            <span class="destino-barra" aria-hidden="true"><i :style="{ width: d.ancho }"></i></span>
            <span class="destino-pct">{{ d.pct }}</span>
          </div>
        </div>

        <div class="cierre">
          <span class="ds-pill" :class="vista.edicionTone"><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> {{ vista.edicion }}</span>
          <span v-if="vista.precio" class="precio">{{ vista.precio }}</span>
          <a v-if="vista.whatsapp" class="btn-exec btn-exec-outline btn-sm" :href="vista.whatsapp" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar propuesta
          </a>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'
import { manualView, programOptionLabel } from '@/features/prediccion/manual'

const props = defineProps({
  phoneKey: { type: String, default: null },
  // La ultima consulta del cliente, si tiene: el manual arranca en ese programa.
  defaultProgramId: { type: Number, default: null }
})

const service = inject(ServiceKeys.Prediccion)
const programas = ref([])
const programId = ref(props.defaultProgramId)
const manual = ref(null)
const loading = ref(false)
const error = ref('')

const opciones = computed(() => programas.value.map((p) => ({ ...p, opcion: programOptionLabel(p) })))
const vista = computed(() => (manual.value ? manualView(manual.value, props.phoneKey) : null))

onMounted(async () => {
  try {
    programas.value = await service.programas()
  } catch (err) {
    console.error('[FichaCliente] programas', { err })
    error.value = 'No se pudo cargar la lista de programas.'
  }
})

watch(programId, async (id) => {
  manual.value = null
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    manual.value = await service.manual(Number(id))
  } catch (err) {
    console.error('[FichaCliente] manual', { programId: id, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar el manual de ese programa.'
  } finally {
    loading.value = false
  }
}, { immediate: true })
watch(() => props.defaultProgramId, (id) => { programId.value = id })
</script>

<style scoped>
.buscador { max-width: 520px; margin-bottom: 12px; }
.manual { display: flex; flex-direction: column; gap: 10px; }
.manual-head { display: flex; align-items: center; gap: 8px; }
.manual-programa { flex: 1; min-width: 0; font-size: 14px; color: var(--ds-heading); }
.manual-pct { font-size: 20px; font-weight: 800; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.manual-texto { margin: 0; font-size: 13px; color: var(--ds-ink-2); }
.destinos { display: flex; flex-direction: column; gap: 6px; }
.destinos-titulo { font-size: 12px; font-weight: 600; color: var(--ds-ink-2); }
.destino { display: grid; grid-template-columns: minmax(0, 2fr) minmax(80px, 1fr) 52px; align-items: center; gap: 10px; font-size: 12.5px; }
.destino-nombre { color: var(--ds-ink); }
.destino-barra { height: 8px; border-radius: 4px; background: var(--ds-surface-3); overflow: hidden; }
.destino-barra i { display: block; height: 100%; background: var(--ds-accent); }
.destino-pct { text-align: right; font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.cierre { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.cierre .btn-exec { margin-left: auto; }
.precio { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
</style>
