<template>
  <section class="tk-hilo">
    <div v-if="!comentarios.length" class="tk-vacio">
      <span class="tk-vacio-icono"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></span>
      <p class="tk-vacio-titulo">Todavía no hay comentarios</p>
      <p class="tk-vacio-sub">
        Escribí acá abajo{{ reportadoPor ? ` para responderle a ${reportadoPor}` : '' }}.
      </p>
    </div>

    <ol v-else class="tk-comentarios">
      <li v-for="c in comentarios" :key="c.id" class="tk-comentario">
        <div class="tk-comentario-cab">
          <span class="tk-autor">{{ c.autor?.nombre || 'Sistema' }}</span>
          <span class="tk-fecha">{{ fechaHora(c.creadoEn) }}</span>
        </div>
        <p class="tk-cuerpo">{{ c.cuerpo }}</p>
        <TicketAttachments v-if="c.adjuntos?.length" :adjuntos="c.adjuntos" kind="comment" />
      </li>
    </ol>

    <form class="tk-responder" @submit.prevent="enviar">
      <textarea
        v-model="cuerpo"
        class="tk-input tk-textarea"
        rows="3"
        maxlength="2000"
        placeholder="Escribí un comentario…"
        :disabled="enviando"
      ></textarea>

      <div class="tk-responder-pie">
        <div class="tk-responder-archivos">
          <input ref="input" type="file" multiple class="tk-file" :accept="ACCEPT" @change="onSeleccion" />
          <button type="button" class="btn-exec btn-exec-outline btn-sm" :disabled="enviando" @click="input?.click()">
            <i class="fa-solid fa-paperclip" aria-hidden="true"></i> Adjuntar
          </button>
          <small class="tk-paste-hint">o pegá con <kbd>Ctrl</kbd>+<kbd>V</kbd></small>
          <span v-for="(a, i) in archivos" :key="a.name + i" class="ds-chip tk-archivo">
            {{ a.name }}
            <button type="button" class="tk-quitar" :aria-label="`Quitar ${a.name}`" @click="archivos.splice(i, 1)">×</button>
          </span>
        </div>

        <button type="submit" class="btn-exec btn-sm" :disabled="!cuerpo.trim() || enviando">
          <i class="fa-solid" :class="enviando ? 'fa-spinner fa-spin' : 'fa-paper-plane'" aria-hidden="true"></i>
          {{ enviando ? 'Enviando…' : 'Responder' }}
        </button>
      </div>

      <p v-if="error" class="ds-alert">{{ error }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import TicketAttachments from './TicketAttachments.vue'
import { fechaHora } from './ticket-format.js'
import { usePegarImagenes } from './usePegarImagenes.js'

defineProps({
  comentarios: { type: Array, default: () => [] },
  enviando: { type: Boolean, default: false },
  error: { type: String, default: '' },
  reportadoPor: { type: String, default: '' },
})

const emit = defineEmits(['comentar'])

const MAX_FILES = 4
const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf'

const cuerpo = ref('')
const archivos = ref([])
const input = ref(null)

function onSeleccion (evento) {
  archivos.value = [...archivos.value, ...Array.from(evento.target.files)].slice(0, MAX_FILES)
  evento.target.value = ''
}

// TicketComments solo se monta mientras hay un ticket abierto (v-if="ticket"
// en TicketDetail.vue), así que el pegado siempre corresponde a este hilo.
usePegarImagenes((imagenes) => {
  archivos.value = [...archivos.value, ...imagenes].slice(0, MAX_FILES)
})

// El padre limpia el formulario llamando a reset() cuando el servidor confirma:
// si el envío falla, lo escrito no se pierde.
function enviar () {
  if (!cuerpo.value.trim()) return
  emit('comentar', { cuerpo: cuerpo.value.trim(), archivos: archivos.value })
}

function reset () {
  cuerpo.value = ''
  archivos.value = []
}

// Precarga el cuadro de respuesta (p. ej. con el borrador de la IA) sin
// enviarlo: el agente lo revisa y lo manda él.
function prellenar (texto) {
  cuerpo.value = texto
}

defineExpose({ reset, prellenar })
</script>

<style scoped>
/* Chips, botones, vacíos y colores: sistema de diseño (styles/design-system.css). */
.tk-hilo { display: flex; flex-direction: column; gap: 12px; }

.tk-vacio { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 34px 16px; text-align: center; }
.tk-vacio-icono {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 999px;
  background: var(--ds-soft-neutral); color: var(--ds-muted); font-size: 13px;
}
.tk-vacio-titulo { margin: 4px 0 0; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }
.tk-vacio-sub { margin: 0; font-size: 12.5px; color: var(--ds-muted); max-width: 320px; }

.tk-comentarios { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.tk-comentario { padding: 11px 13px; border: 1px solid var(--ds-border); border-radius: 9px; }
.tk-comentario-cab { display: flex; align-items: baseline; gap: 9px; margin-bottom: 5px; }
.tk-autor { font-size: 12.5px; font-weight: 700; color: var(--ds-heading); }
.tk-fecha { font-size: 11.5px; color: var(--ds-muted); }
.tk-cuerpo { margin: 0 0 8px; font-size: 13.5px; color: var(--ds-ink); white-space: pre-wrap; word-break: break-word; }
.tk-comentario :deep(.tk-adjuntos) { margin-top: 8px; }

.tk-responder { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.tk-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--ds-border); border-radius: 7px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13.5px; font-family: inherit;
}
.tk-input:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }
.tk-textarea { resize: vertical; min-height: 72px; }
.tk-responder-pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.tk-responder-archivos { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tk-file { display: none; }
.tk-archivo { display: inline-flex; align-items: center; gap: 5px; max-width: 190px; }
.tk-quitar { border: 0; background: none; padding: 0; font-size: 15px; line-height: 1; color: inherit; cursor: pointer; }
.tk-paste-hint { color: var(--ds-muted); }
.tk-paste-hint kbd { padding: 1px 4px; border: 1px solid var(--ds-border); border-radius: 4px; font-size: 10.5px; }
</style>
