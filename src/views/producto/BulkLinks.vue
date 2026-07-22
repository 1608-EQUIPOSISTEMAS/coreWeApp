<template>
  <div class="exec-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gesti&oacute;n Acad&eacute;mica</span>
            <h1 class="brand-title">Carga Masiva de Links</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <div class="kpi-pill" v-if="parsedRows.length">
            <span class="kpi-label">FILAS</span>
            <span class="kpi-value">{{ parsedRows.length }}</span>
          </div>
          <div class="kpi-pill kpi-ok" v-if="result">
            <span class="kpi-label">ACTUALIZADOS</span>
            <span class="kpi-value">{{ result.updated }}</span>
          </div>
          <div class="kpi-pill kpi-warn" v-if="result && result.not_found.length">
            <span class="kpi-label">NO ENCONTRADOS</span>
            <span class="kpi-value">{{ result.not_found.length }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="bulk-body">

      <section class="paste-section">
        <div class="section-head">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
            Pegar datos desde Google Sheets
          </h2>
          <span class="section-hint">3 columnas separadas por TAB: ABREVIATURA &middot; INICIO (d/m/aaaa) &middot; LINK WSP</span>
        </div>
        <textarea
          ref="pasteArea"
          v-model="rawText"
          class="paste-textarea"
          :rows="8"
          placeholder="EXCEL AVANZ&#9;4/02/2026&#9;https://bit.ly/49fIcuB&#10;POWER BI&#9;8/02/2026&#9;https://bit.ly/3NkxzhB&#10;..."
          spellcheck="false"
          @paste="handlePaste"
        ></textarea>
        <div class="paste-actions">
          <button class="btn-exec btn-exec-ghost" @click="clearAll" :disabled="!rawText">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Limpiar
          </button>
          <button class="btn-exec btn-exec-primary" @click="submitBulk" :disabled="!parsedRows.length || submitting">
            <svg v-if="!submitting" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span v-if="submitting" class="spinner"></span>
            {{ submitting ? 'Subiendo...' : `Subir ${parsedRows.length} registros` }}
          </button>
        </div>
      </section>

      <section class="preview-section" v-if="parsedRows.length">
        <div class="section-head">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Vista previa
          </h2>
        </div>
        <div class="table-wrap">
          <table class="preview-table">
            <thead>
              <tr>
                <th class="th-num">#</th>
                <th class="th-abr">Abreviatura</th>
                <th class="th-date">Inicio</th>
                <th class="th-link">Link WhatsApp</th>
                <th class="th-status" v-if="result">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in parsedRows" :key="i" :class="{ 'row-error': result && isNotFound(row) }">
                <td class="td-num">{{ i + 1 }}</td>
                <td class="td-abr">{{ row.abbreviation }}</td>
                <td class="td-date">{{ row.start_date }}</td>
                <td class="td-link">
                  <a :href="row.whatsapp_link" target="_blank" rel="noopener">{{ row.whatsapp_link }}</a>
                </td>
                <td class="td-status" v-if="result">
                  <span v-if="isNotFound(row)" class="badge-fail">No encontrado</span>
                  <span v-else class="badge-ok">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="notfound-section" v-if="result && result.not_found.length">
        <div class="section-head">
          <h2 class="section-title" style="color:#dc2626;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            No encontrados ({{ result.not_found.length }})
          </h2>
          <span class="section-hint">Verifica que la abreviatura y fecha coincidan con la edici&oacute;n en el sistema</span>
        </div>
        <ul class="notfound-list">
          <li v-for="item in result.not_found" :key="item">{{ item }}</li>
        </ul>
      </section>

    </div>
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

const parsedRows = computed(() => {
  if (!rawText.value.trim()) return []
  return rawText.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
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

watch(rawText, () => { result.value = null })

function isNotFound (row) {
  if (!result.value) return false
  return result.value.not_found.some(nf => nf.startsWith(row.abbreviation))
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
      toast.warning(`${res.not_found.length} ediciones no encontradas.`, { timeout: 5000 })
    }
  } catch (err) {
    console.error(err)
    toast.error('Error al procesar la carga masiva.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #0f172a;

  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-100: #f1f5f9;
  --teal-500: #12274e;
  --white: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
}

.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
  flex-shrink: 0;
}
.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px 14px;
}
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule {
  width: 3px; height: 42px;
  background: var(--teal-500);
  border-radius: 2px; flex-shrink: 0;
}
.brand-text { display: flex; flex-direction: column; }
.brand-eyebrow {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 500; margin-bottom: 3px;
}
.brand-title {
  font-size: 18px; font-weight: 700; margin: 0;
  letter-spacing: -0.01em; color: var(--white);
}
.masthead-actions { display: flex; gap: 10px; align-items: center; }

.kpi-pill {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; padding: 6px 14px; min-width: 70px;
}
.kpi-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; }
.kpi-value { font-size: 18px; font-weight: 700; color: var(--white); font-family: 'IBM Plex Mono', monospace; }
.kpi-ok .kpi-value { color: #4ade80; }
.kpi-warn .kpi-value { color: #fbbf24; }

.bulk-body { padding: 28px; display: flex; flex-direction: column; gap: 24px; flex: 1; }

.section-head { margin-bottom: 10px; }
.section-title {
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  display: flex; align-items: center; gap: 8px; margin: 0 0 4px 0;
}
.section-hint { font-size: 12px; color: var(--text-muted); }

.paste-textarea {
  width: 100%; box-sizing: border-box;
  font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
  padding: 14px 16px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--white); color: var(--text-primary);
  resize: vertical; line-height: 1.7; transition: border-color 0.15s;
  tab-size: 24;
}
.paste-textarea:focus { outline: none; border-color: var(--teal-500); box-shadow: 0 0 0 3px rgba(18,39,78,0.08); }
.paste-textarea::placeholder { color: var(--slate-300); }

.paste-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

.btn-exec {
  font-family: 'Hanken Grotesk', sans-serif; font-size: 12px; font-weight: 600;
  padding: 8px 16px; border-radius: 5px; border: 1px solid transparent;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  transition: all 0.15s; letter-spacing: 0.01em;
}
.btn-exec:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-exec-ghost {
  background: transparent; border-color: var(--border); color: var(--text-secondary);
}
.btn-exec-ghost:hover:not(:disabled) { background: var(--slate-100); color: var(--text-primary); }
.btn-exec-primary {
  background: var(--navy-900); color: var(--white); border-color: var(--navy-900);
}
.btn-exec-primary:hover:not(:disabled) { background: var(--navy-800); }

.spinner {
  width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.6s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.table-wrap {
  overflow-x: auto; border: 1px solid var(--border); border-radius: 6px;
  background: var(--white);
}
.preview-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.preview-table thead { background: var(--navy-900); color: var(--white); }
.preview-table th {
  padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px;
  letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap;
}
.preview-table td { padding: 8px 14px; border-top: 1px solid var(--border); }
.preview-table tbody tr:hover { background: #f1f5f9; }

.th-num, .td-num { width: 40px; text-align: center; color: var(--text-muted); font-family: 'IBM Plex Mono', monospace; }
.th-abr { min-width: 180px; }
.th-date { width: 120px; }
.th-link { min-width: 240px; }
.th-status { width: 120px; text-align: center; }
.td-status { text-align: center; }
.td-link a { color: #2563eb; text-decoration: none; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }
.td-link a:hover { text-decoration: underline; }
.td-date { font-family: 'IBM Plex Mono', monospace; }

.row-error { background: #fef2f2 !important; }
.row-error:hover { background: #fee2e2 !important; }

.badge-ok {
  display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;
  background: #dcfce7; color: #166534;
}
.badge-fail {
  display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;
  background: #fee2e2; color: #991b1b;
}

.notfound-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-wrap: wrap; gap: 6px;
}
.notfound-list li {
  background: #fee2e2; color: #991b1b; padding: 4px 12px;
  border-radius: 4px; font-size: 12px; font-family: 'IBM Plex Mono', monospace;
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  background: #14140F;
  color: #F4F4F0;
  --slate-100: #24241E;
  --teal-500: #8FAADC; /* navy WE derivado claro: el puro no se lee en dark */
  --white: #1A1A14;
  --text-primary: #F4F4F0;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
  --border: #2A2A22;
}
[data-coreui-theme="dark"] .paste-textarea { background: #1A1A14; }
[data-coreui-theme="dark"] .paste-textarea:focus { box-shadow: 0 0 0 3px rgba(143,170,220,0.15); }
[data-coreui-theme="dark"] .paste-textarea::placeholder { color: #6A6A60; }
[data-coreui-theme="dark"] .preview-table tbody tr:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .td-link a { color: #60A5FA; }
[data-coreui-theme="dark"] .row-error { background: rgba(239,68,68,.14) !important; }
[data-coreui-theme="dark"] .row-error:hover { background: rgba(239,68,68,.22) !important; }
[data-coreui-theme="dark"] .badge-ok { background: rgba(52,211,153,.16); color: #34D399; }
[data-coreui-theme="dark"] .badge-fail { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .notfound-list li { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .notfound-section .section-title { color: #F87171 !important; }
</style>
