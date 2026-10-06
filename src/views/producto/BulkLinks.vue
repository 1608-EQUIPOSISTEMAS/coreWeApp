<template>
  <div class="ds-page">

    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Carga masiva de links</h1>
        <p class="ds-sub">Pega desde Google Sheets la abreviatura, el inicio y el link de WhatsApp de cada edición.</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" @click="clearAll" :disabled="!rawText">
          <i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar
        </button>
        <button class="btn-exec btn-exec-primary" type="button" @click="submitBulk" :disabled="!parsedRows.length || submitting">
          <i class="fa-solid" :class="submitting ? 'fa-spinner fa-spin' : 'fa-upload'" aria-hidden="true"></i>
          {{ submitting ? 'Subiendo...' : `Subir ${parsedRows.length} registros` }}
        </button>
      </div>
    </header>

    <div v-if="parsedRows.length || result" class="ds-kpis">
      <div v-if="parsedRows.length" class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-table-list"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ parsedRows.length }}</span>
          <span class="ds-kpi-label">Filas listas para subir</span>
        </div>
      </div>
      <div v-if="result" class="ds-kpi">
        <span class="ds-kpi-icon ok" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ result.updated }}</span>
          <span class="ds-kpi-label">Actualizados</span>
          <span class="ds-kpi-note">De {{ parsedRows.length }} filas pegadas</span>
        </div>
      </div>
      <div v-if="result && result.not_found.length" class="ds-kpi">
        <span class="ds-kpi-icon warn" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ result.not_found.length }}</span>
          <span class="ds-kpi-label">No encontrados</span>
          <span class="ds-kpi-note">Revisa la lista de abajo</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h2 class="ds-panel-title">Pegar datos desde Google Sheets</h2>
          <p class="ds-panel-sub">3 columnas separadas por TAB: abreviatura · inicio (d/m/aaaa) · link WSP</p>
        </div>
      </header>
      <div class="ds-panel-body paste-body">
        <textarea
          ref="pasteArea"
          v-model="rawText"
          class="ds-input paste-textarea"
          :rows="8"
          aria-label="Datos pegados desde Google Sheets"
          placeholder="EXCEL AVANZ&#9;4/02/2026&#9;https://bit.ly/49fIcuB&#10;POWER BI&#9;8/02/2026&#9;https://bit.ly/3NkxzhB&#10;..."
          spellcheck="false"
          @paste="handlePaste"
        ></textarea>
        <span v-if="skippedLines > 0" class="paste-skipped">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          {{ skippedLines }} fila(s) ignorada(s): no traen las 3 columnas.
        </span>
      </div>
    </section>

    <section class="ds-panel" v-if="parsedRows.length">
      <header class="ds-panel-head">
        <h2 class="ds-panel-title">Vista previa</h2>
        <span class="ds-panel-hint">{{ parsedRows.length }} filas</span>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista preview-table">
            <thead>
              <tr>
                <th class="num">#</th>
                <th>Abreviatura</th>
                <th>Inicio</th>
                <th>Link WhatsApp</th>
                <th v-if="result">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in parsedRows" :key="i" :class="{ 'is-not-found': result && isNotFound(row) }">
                <td class="num preview-num">{{ i + 1 }}</td>
                <td class="preview-abbr">{{ row.abbreviation }}</td>
                <td class="preview-mono">{{ row.start_date }}</td>
                <td>
                  <a class="preview-link" :href="row.whatsapp_link" target="_blank" rel="noopener">{{ row.whatsapp_link }}</a>
                </td>
                <td v-if="result">
                  <span v-if="isNotFound(row)" class="ds-pill bad">No encontrado</span>
                  <span v-else class="ds-pill ok">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="ds-panel" v-if="result && result.not_found.length">
      <header class="ds-panel-head">
        <h2 class="ds-panel-title">¿Qué filas no se actualizaron? ({{ result.not_found.length }})</h2>
      </header>
      <div class="ds-panel-body">
        <ul class="notfound-list">
          <li v-for="item in result.not_found" :key="item" class="ds-pill bad">{{ item }}</li>
        </ul>
      </div>
      <footer class="ds-panel-foot bad">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Verifica que la abreviatura y la fecha coincidan con la edición en el sistema.</span>
      </footer>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

const rawText = ref('')
const submitting = ref(false)
const result = ref(null)
const pasteArea = ref(null)

const pastedLines = computed(() =>
  rawText.value.split('\n').map(line => line.trim()).filter(line => line.length > 0))

const parsedRows = computed(() => {
  return pastedLines.value
    .map(line => {
      const parts = line.split('\t')
      if (parts.length < 3) return null
      return {
        abbreviation: parts[0].trim(),
        start_date: parts[1].trim(),
        whatsapp_link: parts[2].trim()
      }
    })
    .filter(r => r && r.abbreviation && r.start_date && r.whatsapp_link)
})

// Filas que no traen las 3 columnas: se avisan en vez de descartarlas callando.
const skippedLines = computed(() => pastedLines.value.length - parsedRows.value.length)

watch(rawText, () => { result.value = null })

function isNotFound (row) {
  if (!result.value) return false
  const key = `${row.abbreviation} - ${row.start_date}`
  return result.value.not_found.some(nf => nf === key || nf.startsWith(`${key} (`))
}

function handlePaste () {
  result.value = null
}

function clearAll () {
  rawText.value = ''
  result.value = null
}

async function submitBulk () {
  if (!parsedRows.value.length || submitting.value) return
  submitting.value = true
  result.value = null
  try {
    const res = await editionService.bulkUpdateWhatsapp(parsedRows.value)
    result.value = res
    if (res.updated > 0) {
      toast.success(`${res.updated} links actualizados correctamente.`, { timeout: 4000 })
    }
    if (res.not_found.length > 0) {
      toast.warning(`${res.not_found.length} filas sin actualizar (edición no encontrada o fecha inválida).`, { timeout: 5000 })
    }
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Error al procesar la carga masiva.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.paste-body { display: flex; flex-direction: column; gap: 8px; }
/* Monoespaciada y tab ancho: así las 3 columnas pegadas se ven alineadas y se
   nota a simple vista una fila corrida. */
.paste-textarea { font-family: var(--ds-font-mono); line-height: 1.7; tab-size: 24; }
.paste-skipped { font-size: 12px; font-weight: 600; color: var(--ds-warn-ink); }
.paste-skipped i { margin-right: 4px; }

.preview-table .preview-num { width: 40px; font-weight: 400; color: var(--ds-muted); }
.preview-abbr { min-width: 160px; }
.preview-mono { font-family: var(--ds-font-mono); white-space: nowrap; }
.preview-link { font-family: var(--ds-font-mono); font-size: 11.5px; color: var(--ds-accent); text-decoration: none; overflow-wrap: anywhere; }
.preview-link:hover { text-decoration: underline; }
/* La fila que el backend no encontró se tiñe para ubicarla sin leer la columna Estado. */
.preview-table tr.is-not-found td,
.preview-table tbody tr.is-not-found:hover td { background: var(--ds-soft-bad); }

.notfound-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.notfound-list .ds-pill { font-family: var(--ds-font-mono); white-space: normal; line-height: 1.3; }
</style>
