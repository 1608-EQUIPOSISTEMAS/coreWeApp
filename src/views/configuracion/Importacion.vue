<template>
  <div class="exec-shell">
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Administración</span>
            <h1 class="brand-title">Importación</h1>
          </div>
        </div>
      </div>
    </header>

    <main class="exec-body">
      <!-- Paso 1: elegir entidad y descargar plantilla -->
      <section class="card">
        <div class="card-head">
          <span class="step-no">1</span>
          <div>
            <h2 class="card-title">¿Qué quieres importar?</h2>
            <p class="card-sub">Elige el tipo de dato y descarga la plantilla Excel para llenarla.</p>
          </div>
        </div>
        <div class="card-body row-flex">
          <div class="field">
            <label class="exec-label">Tipo de dato</label>
            <select v-model="selectedEntity" class="hf-input entity-select">
              <option v-for="e in entities" :key="e.key" :value="e.key">{{ e.label }}</option>
            </select>
            <p v-if="currentEntity" class="card-sub mt-1">{{ currentEntity.description }}</p>
          </div>
          <button v-if="currentEntity?.hasTemplate" class="btn-exec btn-exec-outline" :disabled="!selectedEntity || downloading" @click="downloadTemplate">
            <i class="fa-solid fa-download"></i>
            {{ downloading ? 'Generando…' : 'Descargar plantilla' }}
          </button>
        </div>
      </section>

      <!-- Paso 2: cargar datos (archivo o URL) y validar -->
      <section class="card">
        <div class="card-head">
          <span class="step-no">2</span>
          <div>
            <h2 class="card-title">Carga los datos</h2>
            <p class="card-sub">Validamos fila por fila antes de importar. Nada se guarda en este paso.</p>
          </div>
        </div>
        <div class="card-body">
          <!-- Selector de fuente (solo si la entidad acepta URL) -->
          <div v-if="currentEntity?.acceptsUrl" class="source-tabs">
            <button class="source-tab" :class="{ active: source === 'file' }" @click="source = 'file'">Subir archivo</button>
            <button class="source-tab" :class="{ active: source === 'url' }" @click="source = 'url'">Pegar URL de Google Sheet</button>
          </div>

          <!-- Modo URL -->
          <div v-if="source === 'url'" class="field url-field">
            <label class="exec-label">URL del Google Sheet (pestaña de inscripciones)</label>
            <input v-model.trim="sheetUrl" type="url" class="hf-input" placeholder="https://docs.google.com/spreadsheets/d/…/edit?gid=…" />
            <p class="card-sub mt-1">La hoja debe estar compartida como "cualquiera con el enlace". Asegúrate que la URL apunte a la pestaña correcta (el <code>gid</code>).</p>
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
            <input type="file" accept=".xlsx" class="dropzone-input" @change="onFileChange" />
            <i class="fa-solid fa-file-excel dropzone-icon"></i>
            <span v-if="file" class="dropzone-text"><strong>{{ file.name }}</strong> · {{ prettySize(file.size) }}</span>
            <span v-else class="dropzone-text">Arrastra el .xlsx aquí o haz clic para elegirlo</span>
          </label>

          <div class="card-actions">
            <button class="btn-exec btn-exec-primary" :disabled="!canValidate || validating" @click="validate">
              <i class="fa-solid fa-circle-check"></i>
              {{ validating ? 'Validando…' : 'Validar' }}
            </button>
            <button v-if="report" class="btn-exec btn-exec-ghost-dark" :disabled="committing" @click="reset">
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <!-- Paso 3: previsualización y resultado -->
      <section v-if="report" class="card">
        <div class="card-head">
          <span class="step-no">3</span>
          <div>
            <h2 class="card-title">{{ committed ? 'Resultado de la importación' : 'Previsualización' }}</h2>
            <p class="card-sub">{{ summaryText }}</p>
          </div>
        </div>

        <div class="card-body">
          <div class="summary-chips">
            <span class="pill pill-slate">Total: {{ report.summary.total }}</span>
            <span v-if="!committed" class="pill pill-green">Válidas: {{ report.summary.valid }}</span>
            <span v-if="committed" class="pill pill-green">Importadas: {{ report.summary.imported }}</span>
            <span v-if="report.summary.duplicate" class="pill pill-amber">Duplicadas: {{ report.summary.duplicate }}</span>
            <span v-if="report.summary.error" class="pill pill-red">Con error: {{ report.summary.error }}</span>
          </div>

          <div class="table-shell mt-2">
            <div class="table-responsive-custom">
              <table class="exec-table">
                <thead>
                  <tr class="thead-sub">
                    <th class="ts text-center" style="width:70px">Fila</th>
                    <th class="ts" style="width:120px">Estado</th>
                    <th class="ts">Alumno / Documento</th>
                    <th class="ts">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in report.results" :key="r.rowNumber" class="tbody-row">
                    <td class="td-a text-center text-mono">{{ r.rowNumber }}</td>
                    <td class="td-a">
                      <span class="pill" :class="statusPill(r.status)">{{ statusLabel(r.status) }}</span>
                    </td>
                    <td class="td-a">
                      <div class="fw-600">{{ r.raw?.first_name }} {{ r.raw?.last_name }}</div>
                      <div class="small text-muted text-mono">{{ r.raw?.document_number || '—' }}</div>
                    </td>
                    <td class="td-a">
                      <span v-if="r.errors && r.errors.length" class="err-list">
                        {{ r.errors.join(' · ') }}
                      </span>
                      <span v-else class="small text-muted">
                        {{ r.raw?.program }} · {{ r.raw?.edition }}
                        <template v-if="r.data?.installment_plan?.length">
                          · <i class="fa-solid fa-list-ol"></i> {{ r.data.installment_plan.length }} cuota(s)
                        </template>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="!committed" class="card-actions mt-2">
            <button
              class="btn-exec btn-exec-primary"
              :disabled="report.summary.valid === 0 || committing"
              @click="commit"
            >
              <i class="fa-solid fa-cloud-arrow-up"></i>
              {{ committing ? 'Importando…' : `Importar ${report.summary.valid} fila(s) válida(s)` }}
            </button>
            <span v-if="report.summary.error" class="small text-muted self-center">
              Corrige las filas con error en el origen y vuelve a validar.
            </span>
          </div>
        </div>
      </section>
    </main>
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
  if (err?.response?.data?.error || err?.response?.data?.message) {
    return err.response.data.error || err.response.data.message
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
.exec-shell { background: var(--slate-50, #f8fafc); min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }
.exec-masthead { background: var(--navy-900, #0f172a); color: #fff; border-bottom: 1px solid var(--navy-700, #334155); position: sticky; top: 0; z-index: 100; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }

.exec-body { flex: 1; padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; max-width: 1000px; }

.card { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: hidden; }
.card-head { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--slate-50, #f1f5f9); }
.step-no { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--navy-900, #0f172a); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.card-title { font-size: 14.5px; font-weight: 700; margin: 0; }
.card-sub { font-size: 12px; color: var(--text-muted, #94a3b8); margin: 2px 0 0; }
.card-body { padding: 18px 20px; }
.row-flex { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; }
.entity-select { width: 280px; }

.card-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
.self-center { align-self: center; }
.mt-1 { margin-top: 4px; } .mt-2 { margin-top: 14px; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-ghost-dark { background: transparent; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-ghost-dark:hover:not(:disabled) { background: var(--slate-50, #f8fafc); }

.source-tabs { display: flex; gap: 6px; margin-bottom: 14px; border-bottom: 1px solid var(--border, #e2e8f0); }
.source-tab { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: var(--text-muted, #94a3b8); cursor: pointer; font-family: inherit; margin-bottom: -1px; }
.source-tab.active { color: var(--navy-900, #0f172a); border-bottom-color: var(--teal-500, #14b8a6); }
.url-field { max-width: 640px; }
.url-field code { background: var(--slate-100, #f1f5f9); padding: 1px 5px; border-radius: 3px; font-size: 11px; }

.dropzone { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 28px; border: 2px dashed var(--slate-300, #cbd5e1); border-radius: 8px; background: var(--slate-50, #f8fafc); cursor: pointer; transition: all .15s; text-align: center; }
.dropzone:hover, .dropzone-over { border-color: var(--teal-500, #14b8a6); background: rgba(20,184,166,.05); }
.dropzone-has { border-style: solid; border-color: var(--teal-500, #14b8a6); background: rgba(20,184,166,.06); }
.dropzone-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dropzone-icon { font-size: 28px; color: #15803d; }
.dropzone-text { font-size: 12.5px; color: var(--text-secondary, #475569); }

.summary-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); }
.pill-green { background: #dcfce7; color: #15803d; }
.pill-red { background: #fee2e2; color: #b91c1c; }
.pill-amber { background: #fef3c7; color: #b45309; }
.err-list { color: #b91c1c; font-size: 12px; }

.hf-input { height: 34px; padding: 3px 10px; font-size: 12.5px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.15); }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.text-center { text-align: center; } .text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-600 { font-weight: 600; } .text-muted { color: var(--text-muted, #94a3b8); } .small { font-size: 11.5px; }

@media (max-width: 768px) {
  .masthead-inner { padding: 12px 16px; }
  .exec-body { padding: 16px 12px; }
  .entity-select { width: 100%; }
}
</style>
