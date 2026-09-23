<template>
  <BaseModal :model-value="visible" title="Reportar una incidencia" size="lg" @update:model-value="cerrar">
    <form class="tk-form" @submit.prevent="enviar">
      <p class="tk-nota">
        La prioridad la calcula el sistema según lo que describas; no hace falta elegirla.
      </p>

      <label class="tk-campo">
        <span class="tk-label">Asunto <b>*</b></span>
        <input
          v-model="titulo"
          type="text"
          class="tk-input"
          maxlength="120"
          placeholder="Ej: No puedo registrar una inscripción"
          required
        />
        <small class="tk-hint">{{ titulo.length }}/120</small>
      </label>

      <label class="tk-campo">
        <span class="tk-label">¿Qué pasó? <b>*</b></span>
        <textarea
          v-model="problema"
          class="tk-input tk-textarea"
          rows="5"
          maxlength="2000"
          placeholder="Contá qué estabas haciendo, qué esperabas que pasara y qué pasó en su lugar."
          required
        ></textarea>
        <small class="tk-hint">{{ problema.length }}/2000 · mínimo 10</small>
      </label>

      <label class="tk-campo">
        <span class="tk-label">Enlaces de referencia</span>
        <textarea
          v-model="link"
          class="tk-input tk-textarea tk-textarea--enlaces"
          rows="2"
          maxlength="2048"
          placeholder="https://…&#10;Uno por línea"
        ></textarea>
        <small class="tk-hint tk-hint--izq">Opcional: las pantallas del ERP o los documentos donde ocurre. Puedes pegar varios, uno por línea.</small>
      </label>

      <div class="tk-campo">
        <span class="tk-label">Capturas o documentos</span>

        <!-- Selector propio: el ticket sube los archivos crudos por multipart,
             no una URL ya alojada como hace FileUploader. -->
        <div
          class="tk-drop"
          :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="input"
            type="file"
            multiple
            class="tk-file"
            :accept="ACCEPT"
            @change="onSeleccion"
          />
          <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
          <span>Arrastrá archivos, pegá con <kbd>Ctrl</kbd>+<kbd>V</kbd> o <button type="button" class="tk-link" @click="input?.click()">elegilos</button></span>
          <small>Hasta {{ MAX_FILES }} archivos de {{ MAX_MB }} MB · PNG, JPG, WEBP o PDF</small>
        </div>

        <ul v-if="archivos.length" class="tk-archivos">
          <li v-for="(a, i) in archivos" :key="a.name + i">
            <i class="fa-regular" :class="a.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-image'" aria-hidden="true"></i>
            <span class="tk-archivo-nombre">{{ a.name }}</span>
            <span class="tk-archivo-peso">{{ pesoArchivo(a.size) }}</span>
            <button type="button" class="tk-quitar" :aria-label="`Quitar ${a.name}`" @click="quitar(i)">×</button>
          </li>
        </ul>

        <p v-if="errorArchivos" class="ds-alert">{{ errorArchivos }}</p>
      </div>

      <p v-if="error" class="ds-alert">{{ error }}</p>
    </form>

    <template #footer>
      <button type="button" class="btn-exec btn-exec-outline" :disabled="enviando" @click="cerrar">
        Cancelar
      </button>
      <button type="button" class="btn-exec" :disabled="!puedeEnviar || enviando" @click="enviar">
        <i class="fa-solid" :class="enviando ? 'fa-spinner fa-spin' : 'fa-paper-plane'" aria-hidden="true"></i>
        {{ enviando ? 'Enviando…' : 'Crear ticket' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { pesoArchivo } from './ticket-format.js'
import { usePegarImagenes } from './usePegarImagenes.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  enviando: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'crear'])

// Mismos límites que impone el backend (tickets.files.js). Esto no es la
// validación real —el servidor revisa hasta los magic bytes— sino para no
// hacerle subir 20 MB a alguien para después rechazarlos.
const MAX_FILES = 4
const MAX_MB = 5
const MAX_BYTES = MAX_MB * 1024 * 1024
const MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const ACCEPT = MIMES.join(',')

const titulo = ref('')
const problema = ref('')
const link = ref('')
const archivos = ref([])
const errorArchivos = ref('')
const dragging = ref(false)
const input = ref(null)

const puedeEnviar = computed(() =>
  titulo.value.trim().length >= 3 && problema.value.trim().length >= 10)

function agregar (lista) {
  errorArchivos.value = ''
  for (const archivo of Array.from(lista ?? [])) {
    if (archivos.value.length >= MAX_FILES) {
      errorArchivos.value = `Como máximo ${MAX_FILES} archivos.`
      break
    }
    if (!MIMES.includes(archivo.type)) {
      errorArchivos.value = `"${archivo.name}" no es PNG, JPG, WEBP ni PDF.`
      continue
    }
    if (archivo.size > MAX_BYTES) {
      errorArchivos.value = `"${archivo.name}" pesa más de ${MAX_MB} MB.`
      continue
    }
    archivos.value.push(archivo)
  }
}

function onSeleccion (evento) {
  agregar(evento.target.files)
  // Se limpia para que volver a elegir el mismo archivo dispare el change.
  evento.target.value = ''
}

function onDrop (evento) {
  dragging.value = false
  agregar(evento.dataTransfer?.files)
}

// El modal queda montado incluso cerrado (BaseModal lo oculta con v-if
// interno); se ignora el pegado mientras no está visible, o un Ctrl+V en
// cualquier otra pantalla del ERP terminaría adjuntando capturas acá.
usePegarImagenes((imagenes) => {
  if (props.visible) agregar(imagenes)
})

function quitar (i) {
  archivos.value.splice(i, 1)
  errorArchivos.value = ''
}

function enviar () {
  if (!puedeEnviar.value || props.enviando) return
  emit('crear', {
    titulo: titulo.value.trim(),
    problema: problema.value.trim(),
    link: link.value.trim(),
    archivos: archivos.value,
  })
}

function cerrar () {
  if (props.enviando) return
  emit('close')
}

// Se limpia al CERRAR, no al abrir: si el alta falla, el formulario conserva lo
// escrito y se puede reintentar sin volver a tipear todo.
watch(() => props.visible, (abierto) => {
  if (abierto) return
  titulo.value = ''
  problema.value = ''
  link.value = ''
  archivos.value = []
  errorArchivos.value = ''
})
</script>

<style scoped>
/* Botones, alertas y colores: sistema de diseño (styles/design-system.css). */
.tk-form { display: flex; flex-direction: column; gap: 16px; }
.tk-nota { margin: 0; padding: 9px 12px; border-radius: 7px; background: var(--ds-soft-neutral); font-size: 12.5px; color: var(--ds-ink-2); }
.tk-campo { display: flex; flex-direction: column; gap: 5px; }
.tk-label { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); }
.tk-label b { color: var(--ds-bad-ink); }
.tk-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--ds-border); border-radius: 7px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13.5px; font-family: inherit;
}
.tk-input:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }
.tk-textarea { resize: vertical; min-height: 110px; }
.tk-textarea--enlaces { min-height: 56px; }
.tk-hint { align-self: flex-end; font-size: 11.5px; color: var(--ds-muted); }
.tk-hint--izq { align-self: flex-start; }

.tk-drop {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 18px; border: 1.5px dashed var(--ds-border); border-radius: 9px;
  font-size: 13px; color: var(--ds-ink-2); text-align: center; transition: 0.15s;
}
.tk-drop.dragging { border-color: var(--ds-accent); background: var(--ds-soft-neutral); }
.tk-drop i { font-size: 17px; color: var(--ds-muted); }
.tk-drop small { font-size: 11.5px; color: var(--ds-muted); }
.tk-drop kbd { padding: 1px 4px; border: 1px solid var(--ds-border); border-radius: 4px; font-size: 11px; }
.tk-file { display: none; }
.tk-link { border: 0; background: none; padding: 0; font: inherit; color: var(--ds-accent); cursor: pointer; text-decoration: underline; }

.tk-archivos { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tk-archivos li { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border: 1px solid var(--ds-border); border-radius: 7px; font-size: 12.5px; }
.tk-archivo-nombre { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ds-heading); }
.tk-archivo-peso { color: var(--ds-muted); font-size: 11.5px; white-space: nowrap; }
.tk-quitar { border: 0; background: none; font-size: 17px; line-height: 1; color: var(--ds-muted); cursor: pointer; }
.tk-quitar:hover { color: var(--ds-bad-ink); }
</style>
