<template>
  <div class="ds-page imp-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Importación</h1>
        <p class="ds-sub">Carga masiva desde una plantilla Excel o un Google Sheet, en tres pasos.</p>
      </div>
    </header>

    <!-- Paso 1: elegir entidad y descargar plantilla -->
    <section class="ds-panel">
      <header class="ds-panel-head imp-step-head">
        <span class="step-no" aria-hidden="true">1</span>
        <div class="imp-step-titles">
          <h2 class="ds-panel-title">¿Qué quieres importar?</h2>
          <p class="ds-panel-sub">Elige el tipo de dato y descarga la plantilla Excel para llenarla.</p>
        </div>
      </header>
      <div class="ds-panel-body row-flex">
        <div class="ds-field">
          <label class="ds-label" for="imp-entity">Tipo de dato</label>
          <select id="imp-entity" v-model="selectedEntity" class="ds-input entity-select">
            <option v-for="e in entities" :key="e.key" :value="e.key">{{ e.label }}</option>
          </select>
          <span v-if="currentEntity" class="ds-help">{{ currentEntity.description }}</span>
        </div>
        <button v-if="currentEntity?.hasTemplate" class="btn-exec btn-exec-outline" type="button" :disabled="!selectedEntity || downloading" @click="downloadTemplate">
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          {{ downloading ? 'Generando…' : 'Descargar plantilla' }}
        </button>
      </div>
    </section>

    <!-- Paso 2: cargar datos (archivo o URL) y validar -->
    <section class="ds-panel">
      <header class="ds-panel-head imp-step-head">
        <span class="step-no" aria-hidden="true">2</span>
        <div class="imp-step-titles">
          <h2 class="ds-panel-title">Carga los datos</h2>
          <p class="ds-panel-sub">Validamos fila por fila antes de importar. Nada se guarda en este paso.</p>
        </div>
      </header>
      <div class="ds-panel-body">
        <!-- Selector de fuente (solo si la entidad acepta URL) -->
        <div v-if="currentEntity?.acceptsUrl" class="ds-tabs source-tabs" role="tablist" aria-label="Fuente de los datos">
          <button type="button" role="tab" :aria-selected="String(source === 'file')" @click="source = 'file'">Subir archivo</button>
          <button type="button" role="tab" :aria-selected="String(source === 'url')" @click="source = 'url'">Pegar URL de Google Sheet</button>
        </div>

        <!-- Modo URL -->
        <div v-if="source === 'url'" class="ds-field url-field">
          <label class="ds-label" for="imp-url">URL del Google Sheet (pestaña de inscripciones)</label>
          <input id="imp-url" v-model.trim="sheetUrl" type="url" class="ds-input" placeholder="https://docs.google.com/spreadsheets/d/…/edit?gid=…" />
          <span class="ds-help">La hoja debe estar compartida como "cualquiera con el enlace". Asegúrate de que la URL apunte a la pestaña correcta (el <code>gid</code>).</span>
        </div>

        <!-- Modo archivo -->
        <label
          v-else
          class="dropzone"
          :class="{ 'dropzone-over': dragOver, 'dropzone-has': !!file }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <input type="file" accept=".xlsx" class="dropzone-input" aria-label="Elegir archivo .xlsx" @change="onFileChange" />
          <i class="fa-solid fa-file-excel dropzone-icon" aria-hidden="true"></i>
          <span v-if="file" class="dropzone-text"><strong>{{ file.name }}</strong> · {{ prettySize(file.size) }}</span>
          <span v-else class="dropzone-text">Arrastra el .xlsx aquí o haz clic para elegirlo</span>
        </label>

        <div class="card-actions">
          <button class="btn-exec btn-exec-primary" type="button" :disabled="!canValidate || validating" @click="validate">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            {{ validating ? 'Validando…' : 'Validar' }}
          </button>
          <button v-if="report" class="btn-exec btn-exec-outline" type="button" :disabled="committing" @click="reset">
            Limpiar
          </button>
        </div>
      </div>
    </section>

    <!-- Paso 3: previsualización y resultado -->
    <section v-if="report" class="ds-panel">
      <header class="ds-panel-head imp-step-head">
        <span class="step-no" aria-hidden="true">3</span>
        <div class="imp-step-titles">
          <h2 class="ds-panel-title">{{ committed ? 'Resultado de la importación' : 'Previsualización' }}</h2>
          <p class="ds-panel-sub">{{ summaryText }}</p>
        </div>
      </header>

      <div class="ds-panel-body">
        <div class="summary-chips">
          <span class="ds-pill">Total: {{ report.summary.total }}</span>
          <span v-if="!committed" class="ds-pill ok">Válidas: {{ report.summary.valid }}</span>
          <span v-if="committed" class="ds-pill ok">Importadas: {{ report.summary.imported }}</span>
          <span v-if="report.summary.duplicate" class="ds-pill warn">Duplicadas: {{ report.summary.duplicate }}</span>
          <span v-if="report.summary.error" class="ds-pill bad">Con error: {{ report.summary.error }}</span>
        </div>

        <div class="ds-table-scroll imp-table">
          <table class="ds-table ds-table--lista imp-grid">
            <thead>
              <tr>
                <th class="tc" style="width:70px">Fila</th>
                <th style="width:120px">Estado</th>
                <th>Alumno / Documento</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <!-- statusPill devuelve pill-green/amber/red; la vista lo traduce
                   al tono ds (ok/warn/bad). -->
              <tr v-for="r in report.results" :key="r.rowNumber">
                <td class="tc mono">{{ r.rowNumber }}</td>
                <td>
                  <span
                    class="ds-pill"
                    :class="{ 'pill-green': 'ok', 'pill-amber': 'warn', 'pill-red': 'bad' }[statusPill(r.status)]"
                  >{{ statusLabel(r.status) }}</span>
                </td>
                <td>
                  <div class="cell-main">{{ r.raw?.first_name }} {{ r.raw?.last_name }}</div>
                  <div class="cell-sub mono">{{ r.raw?.document_number || '—' }}</div>
                </td>
                <td>
                  <span v-if="r.errors && r.errors.length" class="err-list">
                    {{ r.errors.join(' · ') }}
                  </span>
                  <span v-else class="cell-sub">
                    {{ r.raw?.program }} · {{ r.raw?.edition }}
                    <template v-if="r.data?.installment_plan?.length">
                      · <i class="fa-solid fa-list-ol" aria-hidden="true"></i> {{ r.data.installment_plan.length }} cuota(s)
                    </template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!committed" class="card-actions">
          <button
            class="btn-exec btn-exec-primary"
            type="button"
            :disabled="report.summary.valid === 0 || committing"
            @click="commit"
          >
            <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
            {{ committing ? 'Importando…' : `Importar ${report.summary.valid} fila(s) válida(s)` }}
          </button>
          <span v-if="report.summary.error" class="cell-sub">
            Corrige las filas con error en el origen y vuelve a validar.
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import Swal from 'sweetalert2'
import { ServiceKeys } from '@/services'

const importService = inject(ServiceKeys.Import)
const toast = useToast()

const entities = ref([])
const selectedEntity = ref(null)
const source = ref('file') // 'file' | 'url'
const file = ref(null)
const sheetUrl = ref('')
const report = ref(null)
const committed = ref(false)

const downloading = ref(false)
const validating = ref(false)
const committing = ref(false)
const dragOver = ref(false)

const currentEntity = computed(() => entities.value.find(e => e.key === selectedEntity.value) || null)
const canValidate = computed(() => source.value === 'url' ? !!sheetUrl.value : !!file.value)

// Al cambiar de entidad, limpia el reporte y vuelve a modo archivo si la nueva
// no acepta URL.
watch(selectedEntity, () => {
  report.value = null
  committed.value = false
  if (!currentEntity.value?.acceptsUrl) source.value = 'file'
})

const summaryText = computed(() => {
  if (!report.value) return ''
  const s = report.value.summary
  if (committed.value) return `${s.imported} importada(s), ${s.duplicate} duplicada(s), ${s.error} con error.`
  return `${s.valid} de ${s.total} fila(s) listas para importar.`
})

onMounted(async () => {
  try {
    entities.value = await importService.getEntities()
    if (entities.value.length) selectedEntity.value = entities.value[0].key
  } catch (err) {
    toast.error('No se pudieron cargar las entidades de importación.')
  }
})

async function downloadTemplate () {
  downloading.value = true
  try {
    const filename = `plantilla-${selectedEntity.value}.xlsx`
    await importService.downloadTemplate(selectedEntity.value, filename)
  } catch (err) {
    toast.error('No se pudo descargar la plantilla.')
  } finally {
    downloading.value = false
  }
}

function onFileChange (ev) {
  setFile(ev.target.files?.[0] || null)
}

function onDrop (ev) {
  dragOver.value = false
  setFile(ev.dataTransfer?.files?.[0] || null)
}

function setFile (f) {
  if (f && !f.name.toLowerCase().endsWith('.xlsx')) {
    toast.warning('El archivo debe ser .xlsx (Excel).')
    return
  }
  file.value = f
  report.value = null
  committed.value = false
}

async function validate () {
  validating.value = true
  committed.value = false
  try {
    report.value = source.value === 'url'
      ? await importService.validateUrl(selectedEntity.value, sheetUrl.value)
      : await importService.validate(selectedEntity.value, file.value)
    if (report.value.summary.valid === 0) {
      toast.warning('Ninguna fila pasó la validación. Revisa los detalles.')
    }
  } catch (err) {
    toast.error(errMsg(err, 'No se pudo validar.'))
  } finally {
    validating.value = false
  }
}

async function commit () {
  committing.value = true
  const jobId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  const total = report.value?.summary?.total || 0

  Swal.fire({
    title: 'Importando…',
    html: `Procesando <b id="imp-done">0</b> de <b>${total}</b> fila(s)…<br><small>No cierres esta ventana.</small>`,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  })

  // Polling del avance: cada ~700ms pregunta cuantas filas lleva el backend y
  // actualiza solo el numero (sin re-render del Swal, para no cortar el spinner).
  let polling = true
  const poll = async () => {
    while (polling) {
      try {
        const p = await importService.getProgress(jobId)
        const el = document.getElementById('imp-done')
        if (el && p) el.textContent = p.done
      } catch { /* el avance es best-effort; el commit sigue corriendo igual */ }
      await new Promise(r => setTimeout(r, 700))
    }
  }
  poll()

  try {
    report.value = source.value === 'url'
      ? await importService.commitUrl(selectedEntity.value, sheetUrl.value, jobId)
      : await importService.commit(selectedEntity.value, file.value, jobId)
    committed.value = true
    const s = report.value.summary
    if (s.imported > 0) toast.success(`${s.imported} inscripción(es) importada(s).`)
    if (s.error > 0 || s.duplicate > 0) toast.warning(`${s.error + s.duplicate} fila(s) no se importaron.`)
  } catch (err) {
    toast.error(errMsg(err, 'No se pudo completar la importación.'))
  } finally {
    polling = false
    committing.value = false
    Swal.close()
  }
}

function reset () {
  file.value = null
  report.value = null
  committed.value = false
}

function statusLabel (s) {
  return { valid: 'Válida', imported: 'Importada', duplicate: 'Duplicada', error: 'Error' }[s] || s
}
function statusPill (s) {
  return { valid: 'pill-green', imported: 'pill-green', duplicate: 'pill-amber', error: 'pill-red' }[s] || 'pill-slate'
}
function prettySize (bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function errMsg (err, fallback) {
  // message primero: en el formato por defecto de Fastify `error` es solo el
  // texto del status ("Bad Request") y el motivo real viene en `message`.
  if (err?.response?.data?.message || err?.response?.data?.error) {
    return err.response.data.message || err.response.data.error
  }
  // Sin respuesta del backend = fallo de red/timeout (la hoja grande tarda mas
  // que el timeout). Decirlo en vez del generico, que no da ninguna pista.
  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
    // En validacion no se escribe nada; en commit pueden haber entrado filas.
    return committing.value
      ? 'La importacion tardo demasiado: algunas filas pueden haberse importado. Revisa el listado antes de reintentar (los duplicados se saltan solos).'
      : 'La validacion tardo demasiado (la hoja puede ser muy grande). Es un dry-run: no se guardo nada. Reintenta o sube el .xlsx.'
  }
  if (!err?.response) return `${fallback} No hubo respuesta del servidor (revisa que el backend este corriendo).`
  return fallback
}
</script>

<style scoped>
/* Asistente de tres pasos: a todo el ancho los campos quedan perdidos. */
.imp-page { max-width: 1000px; }

/* Cabecera de paso: numero + titulo a la izquierda (no space-between). */
.imp-step-head { justify-content: flex-start; align-items: flex-start; gap: 14px; }
.imp-step-titles { min-width: 0; }
.step-no {
  flex: none; width: 26px; height: 26px; border-radius: 50%;
  background: var(--ds-brand); color: var(--ds-on-brand);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
}

.row-flex { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.entity-select { width: 280px; }

.card-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }

.source-tabs { margin-bottom: 14px; }
.url-field { max-width: 640px; }
.url-field code {
  background: var(--ds-surface-3); color: var(--ds-ink);
  padding: 1px 5px; border-radius: var(--ds-radius-control); font-size: 11px;
}

.dropzone {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 28px; margin: 0;
  border: 2px dashed var(--ds-border-strong); border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2); cursor: pointer; transition: border-color .15s, background .15s; text-align: center;
}
.dropzone:hover, .dropzone-over { border-color: var(--ds-accent); background: var(--ds-soft-info); }
.dropzone-has { border-style: solid; border-color: var(--ds-ok); background: var(--ds-soft-ok); }
.dropzone-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dropzone-icon { font-size: 28px; color: var(--ds-ok-ink); }
.dropzone-text { font-size: 12.5px; color: var(--ds-ink-2); }

.summary-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.imp-table { margin-top: 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.imp-grid { min-width: 560px; }
.tc { text-align: center; }
.imp-table th.tc { text-align: center; }

.cell-main { font-weight: 600; color: var(--ds-heading); }
.cell-sub { font-size: 11.5px; color: var(--ds-muted); }
.mono { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.err-list { color: var(--ds-bad-ink); font-size: 12px; }

@media (max-width: 768px) {
  .entity-select { width: 100%; }
}
</style>
