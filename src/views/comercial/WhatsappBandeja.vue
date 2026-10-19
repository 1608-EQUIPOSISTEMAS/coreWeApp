<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">WhatsApp</h1>
        <p class="ds-sub">Conversaciones del bot y de tu línea. El bot manda la información del programa y a las 71 h deriva a la asesora.</p>
      </div>
      <div class="ds-head-actions">
        <div class="ds-tabs" role="group" aria-label="Filtrar por estado">
          <button v-for="f in STATUS_FILTERS" :key="f.value" type="button" :aria-pressed="estado === f.value" @click="estado = f.value">
            {{ f.label }}
          </button>
        </div>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="loading" @click="cargar">
          <i class="fa-solid fa-rotate" aria-hidden="true"></i> Actualizar
        </button>
        <button v-if="esLider" class="btn-exec btn-exec-outline" type="button" :disabled="derivando" @click="derivar">
          <i class="fa-solid fa-share" aria-hidden="true"></i> {{ derivando ? 'Derivando…' : 'Derivar vencidas' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <section class="ds-kpis" aria-label="Resumen de conversaciones" :aria-busy="loading && !lista">
      <div v-for="k in kpis" :key="k.id" class="ds-kpi">
        <template v-if="lista">
          <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(k.value, 'num') }}</span>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <span class="ds-kpi-note">{{ k.note }}</span>
          </div>
        </template>
        <span v-else class="ds-skel"></span>
      </div>
    </section>

    <div class="bandeja">
      <section class="ds-panel" aria-label="Conversaciones">
        <div class="ds-panel-body lista">
          <template v-if="loading && !lista">
            <span v-for="n in 6" :key="n" class="ds-skel fila-skel"></span>
          </template>
          <p v-else-if="!filas.length" class="ds-empty">
            No hay conversaciones {{ estado ? 'con este estado' : 'todavía' }}. Cuando un cliente le escriba al bot o a tu línea, aparece aquí.
          </p>
          <button
            v-for="f in filas"
            v-else
            :key="f.id"
            type="button"
            class="conversacion"
            :aria-current="f.id === seleccionada ? 'true' : undefined"
            @click="abrir(f.id)"
          >
            <span class="conversacion-top">
              <strong class="cliente">{{ f.cliente }}</strong>
              <small class="nota">{{ f.cuando }}</small>
            </span>
            <span class="nota">{{ f.programa }}</span>
            <span class="conversacion-top">
              <span class="preview">{{ f.ultimo }}</span>
              <span class="ds-pill" :class="f.estado.tone">{{ f.estado.label }}</span>
            </span>
          </button>
        </div>
      </section>

      <section class="ds-panel chat" aria-label="Conversación">
        <p v-if="!seleccionada" class="ds-empty">Elige una conversación de la lista para leerla y responder.</p>
        <template v-else-if="detalle">
          <header class="ds-panel-head">
            <div>
              <h2 class="ds-panel-title titulo">
                {{ cabecera.cliente }}
                <span class="ds-pill" :class="cabecera.estado.tone">
                  <i class="fa-solid" :class="cabecera.estado.icon" aria-hidden="true"></i> {{ cabecera.estado.label }}
                </span>
              </h2>
              <span class="ds-panel-hint">
                {{ cabecera.telefono }} · {{ cabecera.programa }} · {{ cabecera.origen }} · Línea {{ cabecera.linea }}<template v-if="cabecera.asesora"> · Asesora {{ cabecera.asesora }}</template>
              </span>
            </div>
          </header>

          <ol ref="mensajesRef" class="ds-panel-body mensajes" aria-live="polite">
            <li v-for="m in mensajes" :key="m.id" class="mensaje" :class="{ saliente: m.saliente }">
              <span v-if="m.autor" class="autor">{{ m.autor }}</span>
              <p class="texto">{{ m.texto }}</p>
              <span class="pie">
                {{ m.cuando }}
                <span v-if="m.entrega" class="entrega" :class="m.entrega.tone">
                  <i class="fa-solid" :class="m.entrega.icon" aria-hidden="true"></i> {{ m.entrega.label }}
                </span>
              </span>
              <span v-if="m.error" class="ds-pill bad">{{ m.error }}</span>
            </li>
          </ol>

          <form v-if="detalle.canReply" class="ds-panel-actions respuesta" @submit.prevent="enviar">
            <p class="ds-callout" :class="ventana.tone">
              <i class="fa-solid fa-clock" aria-hidden="true"></i>
              <span>{{ ventana.text }}</span>
            </p>
            <label class="visually-hidden" for="wa-respuesta">Mensaje para {{ cabecera.cliente }}</label>
            <textarea
              id="wa-respuesta"
              v-model="texto"
              class="ds-input"
              rows="2"
              maxlength="4096"
              :disabled="!ventana.open || enviando"
              :placeholder="ventana.open ? 'Escribe tu respuesta…' : 'Fuera de las 24 h WhatsApp solo deja mandar plantillas'"
              @keydown.enter.exact.prevent="enviar"
            ></textarea>
            <button class="btn-exec btn-exec-primary" type="submit" :disabled="!ventana.open || enviando || !texto.trim()">
              <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> {{ enviando ? 'Enviando…' : 'Enviar' }}
            </button>
          </form>
          <p v-else class="ds-callout info respuesta-info">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>Solo lectura: esta conversación es de otra línea. La responde quien la atiende.</span>
          </p>
        </template>
        <div v-else class="ds-panel-body"><span v-for="n in 4" :key="n" class="ds-skel fila-skel"></span></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, nextTick, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { STATUS_FILTERS, conversationRow, messageRow, serviceWindow, buildKpis } from '@/features/whatsapp/bandeja'

// Los mensajes nuevos llegan por webhook al backend; la bandeja los trae cada 20 s.
// ponytail: sondeo; pasar al SSE de notificaciones cuando haya varias asesoras atendiendo a la vez.
const REFRESH_MS = 20_000

const service = inject(ServiceKeys.Whatsapp)
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()
const esLider = proxy.$hasRole(['ADMIN', 'LIDER_COMERCIAL'])

const estado = ref('')
const lista = ref(null)
const detalle = ref(null)
const loading = ref(false)
const error = ref('')
const texto = ref('')
const enviando = ref(false)
const derivando = ref(false)
const mensajesRef = ref(null)
const now = ref(new Date())

const seleccionada = computed(() => Number(route.query.c) || null)

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    lista.value = await service.conversaciones(estado.value || undefined)
    now.value = new Date()
    if (seleccionada.value) await cargarDetalle()
  } catch (err) {
    console.error('[WhatsappBandeja] conversaciones', { estado: estado.value, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar la bandeja de WhatsApp. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}

async function cargarDetalle () {
  const id = seleccionada.value
  const anterior = detalle.value?.messages.length
  try {
    const data = await service.conversacion(id)
    if (id !== seleccionada.value) return
    detalle.value = data
    if (data.messages.length !== anterior) await bajarAlFinal()
  } catch (err) {
    console.error('[WhatsappBandeja] conversacion', { id, err })
    toast.error(err?.response?.data?.message || 'No se pudo abrir la conversación.')
  }
}

async function bajarAlFinal () {
  await nextTick()
  mensajesRef.value?.scrollTo({ top: mensajesRef.value.scrollHeight })
}

function abrir (id) {
  router.replace({ query: { ...route.query, c: id } })
}

watch(seleccionada, id => {
  detalle.value = null
  texto.value = ''
  if (id) cargarDetalle()
}, { immediate: true })
watch(estado, cargar)

async function enviar () {
  const body = texto.value.trim()
  if (!body || enviando.value) return
  enviando.value = true
  try {
    await service.responder(seleccionada.value, body)
    texto.value = ''
    await cargar()
  } catch (err) {
    console.error('[WhatsappBandeja] responder', { id: seleccionada.value, err })
    toast.error(err?.response?.data?.message || 'No se pudo enviar el mensaje.')
  } finally {
    enviando.value = false
  }
}

async function derivar () {
  derivando.value = true
  try {
    const r = await service.ejecutarDerivaciones()
    toast.success(r.due ? `Derivadas ${r.sent} de ${r.due} conversaciones vencidas` : 'No hay conversaciones por derivar')
    await cargar()
  } catch (err) {
    console.error('[WhatsappBandeja] derivar', { err })
    toast.error(err?.response?.data?.message || 'No se pudo derivar.')
  } finally {
    derivando.value = false
  }
}

let timer
onMounted(() => {
  cargar()
  timer = setInterval(cargar, REFRESH_MS)
})
onUnmounted(() => clearInterval(timer))

const filas = computed(() => (lista.value ?? []).map(c => conversationRow(c, now.value)))
const kpis = computed(() => buildKpis(lista.value ?? []))
const cabecera = computed(() => conversationRow(detalle.value.conversation, now.value))
const mensajes = computed(() => detalle.value.messages.map(m => messageRow(m, now.value)))
const ventana = computed(() => serviceWindow(detalle.value.conversation.last_lead_message_at, now.value))
</script>

<style scoped>
.bandeja { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: var(--ds-gap); align-items: start; }
.lista { display: flex; flex-direction: column; gap: 2px; max-height: 70vh; overflow-y: auto; padding: 6px; }
.fila-skel { display: block; height: 58px; margin-bottom: 6px; }
.conversacion { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 9px 10px; border: 0; border-radius: var(--ds-radius-sm); background: transparent; text-align: left; color: var(--ds-ink); cursor: pointer; }
.conversacion:hover { background: var(--ds-surface-2); }
.conversacion[aria-current="true"] { background: var(--ds-soft-info); }
.conversacion:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.conversacion-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cliente { color: var(--ds-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nota { font-size: 11.5px; color: var(--ds-muted); }
.preview { flex: 1; min-width: 0; font-size: 12.5px; color: var(--ds-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.titulo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mensajes { list-style: none; margin: 0; display: flex; flex-direction: column; gap: 8px; height: 52vh; overflow-y: auto; background: var(--ds-surface-2); }
.mensaje { align-self: flex-start; max-width: 75%; padding: 8px 11px; border-radius: var(--ds-radius); background: var(--ds-surface); border: 1px solid var(--ds-border); }
.mensaje.saliente { align-self: flex-end; background: var(--ds-soft-ok); border-color: transparent; }
.autor { display: block; font-size: 11px; font-weight: 700; color: var(--ds-ok-ink); }
.texto { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ds-ink); }
.pie { display: flex; justify-content: flex-end; gap: 8px; margin-top: 3px; font-size: 11px; color: var(--ds-muted); }
.entrega.ok { color: var(--ds-ok-ink); }
.entrega.bad { color: var(--ds-bad-ink); }
.respuesta { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }
.respuesta .ds-callout { grid-column: 1 / -1; margin: 0; }
.respuesta textarea { resize: vertical; }
.respuesta-info { margin: 12px; }
@media (max-width: 900px) {
  .bandeja { grid-template-columns: minmax(0, 1fr); }
  .lista { max-height: 40vh; }
  .mensaje { max-width: 90%; }
}
</style>
