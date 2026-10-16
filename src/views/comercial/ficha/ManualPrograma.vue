<template>
  <article class="ds-panel">
    <header class="ds-panel-head">
      <h3 class="ds-panel-title">Atender la consulta</h3>
      <span class="ds-panel-hint">Qué pide → califícalo → mándale el mensaje</span>
    </header>
    <div class="ds-panel-body">
      <section class="paso">
        <span class="ds-label"><span class="num-paso">1</span> ¿Qué pide?</span>
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
        <div v-if="vista" class="programa-meta">
          <span class="ds-pill" :class="vista.tierTone">{{ vista.tier }}</span>
          <span class="ds-pill" :class="vista.edicionTone"><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> {{ vista.edicion }}</span>
          <span v-if="vista.precio" class="precio">{{ vista.precio }}</span>
        </div>
      </section>

      <p v-if="error" class="ds-alert">{{ error }}</p>
      <span v-else-if="loading" class="ds-skel"></span>
      <p v-else-if="!vista" class="ds-empty">Elige el programa por el que escribe y te armo el mensaje y cómo cerrarlo.</p>

      <template v-else>
        <section class="paso">
          <span class="ds-label"><span class="num-paso">2</span> Califícalo</span>
          <div class="preguntas">
            <div v-for="q in QUALIFY_QUESTIONS" :key="q.key" class="pregunta">
              <span class="pregunta-label" :id="`q-${q.key}`">{{ q.label }}</span>
              <div class="ds-tabs" role="group" :aria-labelledby="`q-${q.key}`">
                <button
                  v-for="o in q.options"
                  :key="o.value"
                  type="button"
                  :aria-pressed="answers[q.key] === o.value"
                  @click="answers[q.key] = answers[q.key] === o.value ? null : o.value"
                >{{ o.label }}</button>
              </div>
            </div>
          </div>
        </section>

        <div class="ds-row ds-row--mitad">
          <section class="paso mensaje">
            <label class="ds-label" for="mensaje-wsp"><span class="num-paso">3</span> Mensaje para WhatsApp</label>
            <p v-if="priceObjection" class="ds-callout warn">
              <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>En la última llamada dijo que estaba caro: el mensaje ya ofrece cuotas.</span>
            </p>
            <textarea id="mensaje-wsp" v-model="mensaje" class="ds-input" rows="7"></textarea>
            <div class="acciones">
              <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="copiar(mensaje, 'mensaje')">
                <i class="fa-solid" :class="copiado === 'mensaje' ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i> {{ copiado === 'mensaje' ? 'Copiado' : 'Copiar' }}
              </button>
              <a v-if="phoneKey" class="btn-exec btn-exec-outline btn-sm" :href="whatsappUrl(phoneKey, mensaje)" target="_blank" rel="noopener">
                <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar por WhatsApp
              </a>
              <router-link v-if="phoneKey" class="btn-exec btn-exec-primary btn-sm" :to="registrar">
                <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Registrar consulta
              </router-link>
            </div>
            <span class="nota">"Registrar consulta" abre el formulario con el celular y la calificación ya escritos en Observaciones.</span>
          </section>

          <section class="paso">
            <span class="ds-label">Cómo cerrarlo</span>
            <ol class="guion">
              <li v-for="paso in vista.guion" :key="paso.titulo">
                <i class="fa-solid" :class="paso.icon" aria-hidden="true"></i>
                <div><strong>{{ paso.titulo }}</strong><span>{{ paso.texto }}</span></div>
              </li>
            </ol>

            <span class="ds-label objeciones-titulo">Si te dice…</span>
            <div class="objeciones">
              <button
                v-for="o in vista.objeciones"
                :key="o.key"
                type="button"
                class="btn-exec btn-exec-outline btn-sm"
                :aria-pressed="objecion === o.key"
                @click="objecion = objecion === o.key ? null : o.key"
              >{{ o.label }}</button>
            </div>
            <div v-if="respuesta" class="respuesta">
              <p>{{ respuesta.texto }}</p>
              <button type="button" class="btn-exec btn-exec-ghost btn-sm" @click="copiar(respuesta.texto, respuesta.key)">
                <i class="fa-solid" :class="copiado === respuesta.key ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i> {{ copiado === respuesta.key ? 'Copiado' : 'Copiar respuesta' }}
              </button>
            </div>

            <template v-if="vista.planB.length">
              <span class="ds-label objeciones-titulo">Si no es este, plan B</span>
              <ul class="plan-b">
                <li v-for="a in vista.planB" :key="a.key">
                  <span>{{ a.programa }} <span v-if="a.membresia" class="ds-pill info">Membresía</span></span>
                  <span class="nota">{{ a.base }} compradores</span>
                </li>
              </ul>
            </template>
          </section>
        </div>
      </template>
    </div>
  </article>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'
import { QUALIFY_QUESTIONS, buildMessage, leadNote, manualView, programOptionLabel } from '@/features/prediccion/manual'
import { whatsappUrl } from '@/features/prediccion/fichaCliente'

const props = defineProps({
  phoneKey: { type: String, default: null },
  // La ultima consulta del cliente, si tiene: el manual arranca en ese programa.
  defaultProgramId: { type: Number, default: null },
  // Dijo "Caro" en su ultima llamada de Llamar hoy.
  priceObjection: { type: Boolean, default: false }
})

const service = inject(ServiceKeys.Prediccion)
const programas = ref([])
const programId = ref(props.defaultProgramId)
const manual = ref(null)
const loading = ref(false)
const error = ref('')
const answers = reactive({ paga: null, estudiante: null, cuando: null })
// El asesor edita el mensaje antes de mandarlo; se rearma al cambiar programa o respuestas.
const mensaje = ref('')
const objecion = ref(null)
const copiado = ref(null)

const opciones = computed(() => programas.value.map((p) => ({ ...p, opcion: programOptionLabel(p) })))
const vista = computed(() => (manual.value ? manualView(manual.value) : null))
const respuesta = computed(() => vista.value?.objeciones.find((o) => o.key === objecion.value) ?? null)
const registrar = computed(() => ({
  name: 'ComercialLeadsNew',
  query: { telefono: props.phoneKey, ...(manual.value ? { nota: leadNote(manual.value.programa, answers) } : {}) }
}))

watch([manual, answers, () => props.priceObjection], () => {
  mensaje.value = manual.value ? buildMessage({ m: manual.value, answers, priceObjection: props.priceObjection }) : ''
}, { deep: true })

async function copiar (texto, key) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = key
    setTimeout(() => { copiado.value = null }, 2000)
  } catch (err) {
    console.error('[FichaCliente] copiar', { key, err })
    error.value = 'No se pudo copiar: selecciona el texto y cópialo a mano.'
  }
}

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
  objecion.value = null
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
.paso { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.num-paso { display: inline-grid; place-items: center; width: 18px; height: 18px; margin-right: 4px; border-radius: 50%; background: var(--ds-brand); color: var(--ds-on-brand); font-size: 10.5px; }
.buscador { max-width: 520px; }
.programa-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.precio { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.preguntas { display: flex; flex-wrap: wrap; gap: 12px 24px; }
.pregunta { display: flex; flex-direction: column; gap: 4px; }
.pregunta-label { font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }
.mensaje textarea { font-size: 13px; line-height: 1.5; }
.acciones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.nota { font-size: 11.5px; color: var(--ds-muted); }
.guion { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.guion li { display: flex; gap: 10px; align-items: flex-start; }
.guion i { width: 18px; margin-top: 2px; text-align: center; color: var(--ds-accent); }
.guion div { display: flex; flex-direction: column; gap: 1px; font-size: 13px; color: var(--ds-ink-2); }
.guion strong { color: var(--ds-heading); }
.objeciones-titulo { margin-top: 8px; }
.objeciones { display: flex; flex-wrap: wrap; gap: 6px; }
.objeciones .btn-exec[aria-pressed="true"] { border-color: var(--ds-brand); color: var(--ds-heading); }
.respuesta { padding: 10px 12px; border: 1px solid var(--ds-border); border-radius: 8px; background: var(--ds-surface-2); }
.respuesta p { margin: 0 0 6px; font-size: 13px; line-height: 1.5; color: var(--ds-ink); }
.plan-b { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
.plan-b li { display: flex; justify-content: space-between; gap: 8px; color: var(--ds-ink); }
</style>
