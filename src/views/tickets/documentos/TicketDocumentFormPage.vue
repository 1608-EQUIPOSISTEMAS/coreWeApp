<template>
  <div class="ds-page">
    <nav class="doc-crumbs" aria-label="breadcrumb">
      <RouterLink :to="{ name: 'TicketsDocumentos' }" class="doc-volver" title="Volver a Documentos">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Documentos
      </RouterLink>
      <span class="doc-crumbs-sep">/</span>
      <span class="doc-crumbs-actual">Nuevo documento</span>
    </nav>

    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Nuevo documento</h1>
        <p class="ds-sub">Sube un PDF o comparte el enlace de un documento online (Google Docs, Sheets o Word online).</p>
      </div>
    </header>

    <div class="doc-layout">
      <form class="doc-main" @submit.prevent="enviar">
        <!-- 01 · Título -->
        <section class="ds-panel doc-card">
          <h2 class="doc-paso"><span class="doc-paso-num">01</span> Título <b>*</b></h2>
          <input
            v-model="titulo"
            type="text"
            class="doc-input"
            maxlength="150"
            placeholder="Ej: Manual de inscripciones FICO"
            aria-label="Título del documento"
          />
          <div class="doc-hints">
            <small>Así aparecerá en el listado de documentos.</small>
            <small class="doc-contador">{{ titulo.length }}/150</small>
          </div>
        </section>

        <div class="doc-fila">
          <!-- 02 · Tipo -->
          <section class="ds-panel doc-card">
            <h2 class="doc-paso"><span class="doc-paso-num">02</span> ¿Cómo lo vas a compartir? <b>*</b></h2>
            <div class="doc-opciones" role="radiogroup" aria-label="Tipo de documento">
              <button
                v-for="op in OPCIONES"
                :key="op.valor"
                type="button"
                role="radio"
                class="doc-opcion"
                :class="{ activo: tipo === op.valor }"
                :aria-checked="tipo === op.valor"
                @click="tipo = op.valor"
              >
                <span class="doc-opcion-icono" :class="op.tono" aria-hidden="true">
                  <template v-if="op.valor === 'PDF'">PDF</template>
                  <i v-else class="fa-solid fa-link"></i>
                </span>
                <span class="doc-opcion-textos">
                  <strong>{{ op.label }}</strong>
                  <small>{{ op.ayuda }}</small>
                </span>
                <span class="doc-radio" aria-hidden="true"></span>
              </button>
            </div>
          </section>

          <!-- 03 · Archivo o enlace, según el tipo -->
          <section class="ds-panel doc-card">
            <template v-if="tipo === 'PDF'">
              <h2 class="doc-paso"><span class="doc-paso-num">03</span> Archivo PDF <b>*</b></h2>

              <div
                v-if="!archivo"
                class="doc-drop"
                :class="{ dragging }"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <input ref="input" type="file" class="doc-file" accept="application/pdf" @change="onSeleccion" />
                <i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i>
                <span>Arrastra el PDF aquí o <button type="button" class="doc-link" @click="input?.click()">elígelo</button></span>
                <small>Un archivo PDF de hasta {{ MAX_MB }} MB</small>
              </div>

              <div v-else class="doc-archivo">
                <span class="doc-archivo-icono" aria-hidden="true">PDF</span>
                <span class="doc-archivo-datos">
                  <span class="doc-archivo-nombre">{{ archivo.name }}</span>
                  <span class="doc-archivo-peso">{{ pesoArchivo(archivo.size) }}</span>
                </span>
                <button type="button" class="doc-quitar" :aria-label="`Quitar ${archivo.name}`" @click="archivo = null">×</button>
              </div>

              <p v-if="errorArchivo" class="ds-alert doc-alert">{{ errorArchivo }}</p>
            </template>

            <template v-else>
              <h2 class="doc-paso"><span class="doc-paso-num">03</span> Enlace del documento <b>*</b></h2>
              <label class="doc-campo">
                <span class="doc-label">Enlace del documento</span>
                <input
                  v-model="url"
                  type="url"
                  class="doc-input"
                  maxlength="2048"
                  placeholder="https://docs.google.com/…"
                />
              </label>
              <small class="doc-hint">Asegúrate de que el enlace tenga permisos de lectura.</small>
            </template>
          </section>
        </div>

        <!-- 04 · Descripción: la lee la IA para enviar el manual como solución -->
        <section class="ds-panel doc-card">
          <h2 class="doc-paso"><span class="doc-paso-num">04</span> ¿De qué trata? <b>*</b></h2>
          <textarea
            v-model="descripcion"
            class="doc-input doc-textarea"
            rows="4"
            :maxlength="DESC_MAX"
            placeholder="Ej: Qué hacer cuando el Google Sheets de ventas no muestra los datos o la base no está actualizada: cómo forzar la recarga y revisar la conexión con el ERP."
            aria-label="De qué trata el documento"
          ></textarea>
          <div class="doc-hints">
            <small>
              Cuenta qué problema resuelve y en qué casos sirve. El bot de Slack usa esta descripción para
              enviar el manual a quien reporte un ticket que se solucione con él.
            </small>
            <small class="doc-contador">{{ descripcion.trim().length }}/{{ DESC_MAX }}</small>
          </div>
        </section>

        <p v-if="error" class="ds-alert">{{ error }}</p>
      </form>

      <!-- Resumen: lo que se va a guardar y qué falta para poder hacerlo. -->
      <aside class="ds-panel doc-resumen" aria-label="Resumen">
        <div class="doc-resumen-head">
          <span class="doc-eyebrow">Resumen</span>
          <strong class="doc-resumen-titulo" :class="{ vacio: !titulo.trim() }">{{ titulo.trim() || 'Sin título' }}</strong>
          <span class="doc-resumen-tipo">{{ tipoLabel }}</span>
        </div>

        <ul class="doc-checks">
          <li v-for="c in checks" :key="c.label" :class="{ ok: c.ok }">
            <span class="doc-check" aria-hidden="true"><i v-if="c.ok" class="fa-solid fa-check"></i></span>
            {{ c.label }}
            <span class="doc-sr">{{ c.ok ? '(listo)' : '(pendiente)' }}</span>
          </li>
        </ul>

        <div class="doc-resumen-acciones">
          <button type="button" class="btn-exec btn-exec-primary" :disabled="!puedeEnviar || enviando" @click="enviar">
            <i v-if="enviando" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            {{ enviando ? 'Guardando…' : (tipo === 'PDF' ? 'Subir PDF' : 'Guardar enlace') }}
          </button>
          <RouterLink class="btn-exec btn-exec-outline" :to="{ name: 'TicketsDocumentos' }">
            Cancelar
          </RouterLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { pesoArchivo } from '../ticket-format.js'

const service = inject(ServiceKeys.Tickets)
const router = useRouter()
const toast = useToast()

// Mismo límite que el backend (DOCUMENTO_MAX_BYTES en tickets.files.js). No es
// la validación real —el servidor revisa hasta los magic bytes— sino para no
// subir 40 MB y que después los rechace.
const MAX_MB = 20
const MAX_BYTES = MAX_MB * 1024 * 1024

const OPCIONES = [
  { valor: 'PDF', label: 'Archivo PDF', ayuda: 'Se sube y queda guardado en el ERP', tono: 'pdf' },
  { valor: 'ENLACE', label: 'Documento online', ayuda: 'Google Docs, Sheets o Word online', tono: 'enlace' },
]

// Mismos topes que el backend (validateDocumentInput).
const DESC_MIN = 20
const DESC_MAX = 1000

const titulo = ref('')
const descripcion = ref('')
const tipo = ref('ENLACE')
const url = ref('')
const archivo = ref(null)
const errorArchivo = ref('')
const dragging = ref(false)
const input = ref(null)

const enviando = ref(false)
const error = ref('')

const tipoLabel = computed(() => OPCIONES.find(o => o.valor === tipo.value)?.label ?? '')

const urlValida = computed(() => {
  try {
    const { protocol } = new URL(url.value.trim())
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
})

const tituloValido = computed(() => titulo.value.trim().length >= 3)
const contenidoValido = computed(() => (tipo.value === 'PDF' ? !!archivo.value : urlValida.value))
const descripcionValida = computed(() => descripcion.value.trim().length >= DESC_MIN)

// Lo que pinta el resumen: el botón se habilita cuando están todos.
const checks = computed(() => [
  { label: 'Tipo seleccionado', ok: !!tipo.value },
  { label: tipo.value === 'PDF' ? 'Archivo adjunto' : 'Enlace válido', ok: contenidoValido.value },
  { label: 'Título', ok: tituloValido.value },
  { label: `De qué trata (mín. ${DESC_MIN} caracteres)`, ok: descripcionValida.value },
])

const puedeEnviar = computed(() => tituloValido.value && contenidoValido.value && descripcionValida.value)

function elegir (lista) {
  errorArchivo.value = ''
  const f = Array.from(lista ?? [])[0]
  if (!f) return
  if (f.type !== 'application/pdf') {
    errorArchivo.value = `"${f.name}" no es un PDF.`
    return
  }
  if (f.size > MAX_BYTES) {
    errorArchivo.value = `"${f.name}" pesa más de ${MAX_MB} MB.`
    return
  }
  archivo.value = f
}

function onSeleccion (evento) {
  elegir(evento.target.files)
  evento.target.value = ''
}

function onDrop (evento) {
  dragging.value = false
  elegir(evento.dataTransfer?.files)
}

async function enviar () {
  if (!puedeEnviar.value || enviando.value) return
  enviando.value = true
  error.value = ''
  try {
    await service.createDocument({
      titulo: titulo.value.trim(),
      descripcion: descripcion.value.trim(),
      tipo: tipo.value,
      url: url.value.trim(),
      archivo: archivo.value,
    })
    toast.success('Documento guardado')
    router.push({ name: 'TicketsDocumentos' })
  } catch (e) {
    console.error('tickets.createDocument:', e)
    // El formulario conserva lo escrito para reintentar.
    error.value = e?.response?.data?.message || 'No se pudo guardar el documento.'
  } finally {
    enviando.value = false
  }
}
</script>

<style scoped>
/* Botones, alertas y colores: sistema de diseño (styles/design-system.css). */
.doc-crumbs { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ds-muted); }
.doc-crumbs a { color: var(--ds-muted); text-decoration: none; }
.doc-crumbs a:hover { color: var(--ds-accent); }
.doc-volver { display: inline-flex; align-items: center; gap: 6px; }
.doc-volver i { transition: transform 0.15s ease; }
.doc-volver:hover i { transform: translateX(-2px); }
.doc-crumbs-sep { color: var(--ds-border); }
.doc-crumbs-actual { color: var(--ds-heading); }

/* Formulario a la izquierda, resumen a la derecha. */
.doc-layout { display: grid; grid-template-columns: minmax(0, 1fr) 305px; gap: var(--ds-gap); align-items: start; }
.doc-main { display: flex; flex-direction: column; gap: var(--ds-gap); min-width: 0; }
.doc-fila { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: var(--ds-gap); }

.doc-card { padding: 22px 24px; }
.doc-paso { display: flex; align-items: baseline; gap: 10px; margin: 0 0 16px; font-size: 15px; font-weight: 700; color: var(--ds-heading); }
.doc-paso b { margin-left: -6px; color: var(--ds-bad-ink); }
.doc-paso-num { font-family: var(--ds-font-mono); font-size: 11px; font-weight: 600; color: var(--ds-muted); }

.doc-campo { display: flex; flex-direction: column; gap: 6px; }
.doc-label { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); }
.doc-input {
  width: 100%; height: 42px; padding: 0 12px; border: 1px solid var(--ds-border); border-radius: 8px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13.5px; font-family: inherit;
}
.doc-input::placeholder { color: var(--ds-muted); }
.doc-textarea { height: auto; min-height: 96px; padding: 10px 12px; line-height: 1.45; resize: vertical; }
.doc-input:focus { outline: 2px solid var(--ds-brand); outline-offset: -1px; }
.doc-hints { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; }
.doc-hints small, .doc-hint { font-size: 11.5px; color: var(--ds-muted); }
.doc-hint { display: block; margin-top: 8px; }
.doc-contador { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }

/* Opciones tipo radio */
.doc-opciones { display: flex; flex-direction: column; gap: 12px; }
.doc-opcion {
  display: flex; align-items: flex-start; gap: 14px; width: 100%;
  padding: 16px; border: 1px solid var(--ds-border); border-radius: 9px;
  background: var(--ds-surface); text-align: left; font: inherit; cursor: pointer; transition: 0.15s;
}
.doc-opcion:hover { border-color: var(--ds-brand); }
.doc-opcion.activo { border-color: var(--ds-brand); background: var(--ds-soft-neutral); }
.doc-opcion:focus-visible { outline: 2px solid var(--ds-brand); outline-offset: 2px; }
.doc-opcion-icono {
  width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em;
}
.doc-opcion-icono.pdf { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.doc-opcion-icono.enlace { background: var(--ds-soft-info); color: var(--ds-brand); font-size: 14px; }
.doc-opcion-textos { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.doc-opcion-textos strong { font-size: 13.5px; color: var(--ds-heading); }
.doc-opcion-textos small { font-size: 12px; line-height: 1.35; color: var(--ds-ink-2); }
.doc-radio {
  width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; border-radius: 50%;
  border: 1.5px solid var(--ds-border); background: var(--ds-surface); transition: 0.15s;
}
.doc-opcion.activo .doc-radio { border: 5px solid var(--ds-brand); }

/* PDF */
.doc-drop {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 26px 18px; border: 1.5px dashed var(--ds-border); border-radius: 9px;
  font-size: 13px; color: var(--ds-ink-2); text-align: center; transition: 0.15s;
}
.doc-drop.dragging { border-color: var(--ds-brand); background: var(--ds-soft-neutral); }
.doc-drop > i { font-size: 20px; color: var(--ds-muted); }
.doc-drop small { font-size: 11.5px; color: var(--ds-muted); }
.doc-file { display: none; }
.doc-link { border: 0; background: none; padding: 0; font: inherit; color: var(--ds-brand); font-weight: 600; cursor: pointer; text-decoration: underline; }
.doc-archivo { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--ds-border); border-radius: 9px; }
.doc-archivo-icono { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; background: var(--ds-soft-bad); color: var(--ds-bad-ink); font-size: 10.5px; font-weight: 800; }
.doc-archivo-datos { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.doc-archivo-nombre { font-size: 13px; font-weight: 600; color: var(--ds-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-archivo-peso { font-size: 11.5px; color: var(--ds-muted); }
.doc-quitar { border: 0; background: none; font-size: 19px; line-height: 1; color: var(--ds-muted); cursor: pointer; }
.doc-quitar:hover { color: var(--ds-bad-ink); }
.doc-alert { margin-top: 10px; padding: 10px 14px; font-size: 13px; }

/* Resumen */
.doc-resumen { position: sticky; top: 16px; }
.doc-resumen-head { display: flex; flex-direction: column; gap: 4px; padding: 20px 20px 18px; border-bottom: 1px solid var(--ds-border); }
.doc-eyebrow { margin-bottom: 8px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ds-ink-2); }
.doc-resumen-titulo { font-size: 15px; font-weight: 700; color: var(--ds-heading); overflow-wrap: anywhere; }
.doc-resumen-titulo.vacio { color: var(--ds-muted); }
.doc-resumen-tipo { font-size: 12px; color: var(--ds-ink-2); }

.doc-checks { list-style: none; margin: 0; padding: 16px 20px; display: flex; flex-direction: column; gap: 11px; border-bottom: 1px solid var(--ds-border); }
.doc-checks li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ds-ink-2); }
.doc-checks li.ok { color: var(--ds-heading); }
.doc-check {
  width: 18px; height: 18px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%;
  border: 1.5px solid var(--ds-border); font-size: 9px; color: #fff; transition: 0.15s;
}
.doc-checks li.ok .doc-check { border-color: var(--ds-brand); background: var(--ds-brand); }
.doc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.doc-resumen-acciones { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px 20px; background: var(--ds-surface-2); }
.doc-resumen-acciones .btn-exec { width: 100%; justify-content: center; text-decoration: none; }

@media (max-width: 1100px) {
  .doc-layout { grid-template-columns: minmax(0, 1fr); }
  .doc-resumen { position: static; }
}
@media (max-width: 760px) {
  .doc-fila { grid-template-columns: minmax(0, 1fr); }
}
</style>
