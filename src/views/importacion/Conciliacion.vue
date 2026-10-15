<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Conciliación</h1>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
    </header>

    <form class="ds-panel" @submit.prevent="conciliar">
      <header class="ds-panel-head">
        <h2 class="ds-panel-title">Hojas FICO del programa</h2>
        <button
          v-if="urls.length < MAX_HOJAS"
          class="btn-exec btn-exec-outline btn-sm-add"
          type="button"
          :disabled="loading"
          @click="agregarHoja"
        >
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar otra hoja
        </button>
      </header>
      <div class="ds-panel-body ds-stack">
        <div v-for="(_, i) in urls" :key="i" class="url-row">
          <div class="ds-field url-field">
            <label class="ds-label" :for="`sheet-url-${i}`">
              Hoja {{ i + 1 }}<span v-if="urls.length > 1"> · {{ i === urls.length - 1 ? 'más reciente' : i === 0 ? 'más antigua' : '' }}</span><span v-if="i === 0" class="ds-req">*</span>
            </label>
            <input
              :id="`sheet-url-${i}`"
              v-model.trim="urls[i]"
              class="ds-input"
              type="url"
              :required="i === 0"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              :disabled="loading"
            />
          </div>
          <button
            v-if="urls.length > 1"
            class="btn-icon btn-quitar"
            type="button"
            :title="`Quitar hoja ${i + 1}`"
            :aria-label="`Quitar hoja ${i + 1}`"
            :disabled="loading"
            @click="quitarHoja(i)"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <span class="ds-help">
          Un mismo programa puede estar en varias hojas (una por año, por ejemplo 2025 y 2026): agrégalas de la más antigua a la más reciente.
          Si una fila está en dos hojas, manda la más reciente. Abre la pestaña "1. INS - N" de cada una y copia el link; deben estar compartidas por enlace.
        </span>
      </div>
      <footer class="ds-panel-actions">
        <button class="btn-exec btn-exec-primary" type="submit" :disabled="loading || !urlsValidas">
          <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-scale-balanced'" aria-hidden="true"></i>
          {{ loading ? 'Conciliando…' : urlsListas.length > 1 ? `Conciliar ${urlsListas.length} hojas` : 'Conciliar hoja' }}
        </button>
      </footer>
    </form>

    <p v-if="error" class="ds-alert" role="alert">{{ error }}</p>

    <template v-if="result">
      <p class="ds-verdict" :class="verdict.tono">
        <strong>{{ verdict.titulo }}</strong>
        <span>{{ verdict.texto }}</span>
      </p>

      <div class="ds-kpis">
        <div v-for="k in tarjetas" :key="k.clave" class="ds-kpi">
          <span class="ds-kpi-icon" :class="k.tono" aria-hidden="true"><i class="fa-solid" :class="k.icono"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(k.valor, 'num') }}</span>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <span class="ds-kpi-note" :title="k.nota">{{ k.nota }}</span>
          </div>
        </div>
      </div>

      <section v-if="result.rows.length" class="ds-panel">
        <header class="ds-panel-head">
          <h2 class="ds-panel-title">¿Qué no coincide?</h2>
          <span class="ds-panel-hint">{{ filas.length }} de {{ result.rows.length }} filas</span>
        </header>
        <div class="ds-panel-body ds-stack">
          <div class="filters">
            <div class="ds-tabs" role="group" aria-label="Severidad">
              <button v-for="s in SEVERIDADES" :key="s.id" type="button" :aria-pressed="String(severidad === s.id)" @click="severidad = s.id">
                {{ s.label }}
              </button>
            </div>
            <input v-model.trim="texto" class="ds-input search" type="search" placeholder="Buscar alumno, DNI, fila o #inscripción" aria-label="Buscar" />
          </div>

          <div class="ds-tabs tipos" role="group" aria-label="Tipo de diferencia">
            <button type="button" :aria-pressed="String(!codigo)" @click="codigo = null">Todas</button>
            <button
              v-for="t in tipos"
              :key="t.code"
              type="button"
              :aria-pressed="String(codigo === t.code)"
              :title="accionOf(t.code)"
              @click="codigo = codigo === t.code ? null : t.code"
            >
              <i class="dot" :class="t.tono" aria-hidden="true"></i>{{ t.label }} <b>{{ t.n }}</b>
            </button>
          </div>

          <p v-if="codigo" class="accion"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> {{ accionOf(codigo) }}</p>

          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr>
                  <th scope="col" class="num">Fila</th>
                  <th scope="col">Alumno</th>
                  <th scope="col">Edición</th>
                  <th scope="col">Inscripción</th>
                  <th scope="col">Diferencias</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filas.length">
                  <td colspan="5" class="ds-empty ds-empty--lista">Ninguna fila con este filtro. Quita un filtro para ver más.</td>
                </tr>
                <tr v-for="r in filas" :key="`${r.row_number}-${r.enrollment_id}`">
                  <td class="num">
                    <span v-if="r.row_number">{{ r.row_number }}</span>
                    <span v-else class="muted" title="La inscripción no tiene fila en las hojas">—</span>
                    <span v-if="r.row_number && variasHojas" class="hoja">hoja {{ r.sheet }}</span>
                  </td>
                  <td>
                    <span class="alumno">{{ r.student }}</span>
                    <span class="dni">{{ r.document_number }}</span>
                  </td>
                  <td class="nowrap">
                    {{ r.edition }}
                    <span v-if="r.mode && r.mode !== 'ACT'" class="ds-pill violet">{{ r.mode }}</span>
                  </td>
                  <td class="nowrap">
                    <RouterLink
                      v-if="r.enrollment_id"
                      :to="{ name: 'enrollmentDetail', params: { id: r.enrollment_id } }"
                      target="_blank"
                      class="enr-link"
                    >#{{ r.enrollment_id }} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></RouterLink>
                    <span v-else class="muted">sin inscripción</span>
                  </td>
                  <td>
                    <ul class="hallazgos">
                      <li v-for="f in hallazgosOrdenados(r.findings)" :key="f.code">
                        <span class="ds-pill" :class="toneOf(f.severity)">{{ labelOf(f.code) }}</span>
                        <span class="msg">{{ f.message }}</span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Solo lectura: nada se corrige desde aquí. Se comparan las ediciones activas y las convalidaciones (E0); las históricas no se importan.</span>
        </footer>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import {
  isSheetUrl, hojasListas, veredicto, kpis, filtrosPorTipo, filtrarFilas, hallazgosOrdenados, labelOf, accionOf, toneOf
} from '@/features/conciliacion-fico/conciliacion'

const importService = inject(ServiceKeys.Import)

const SEVERIDADES = [
  { id: 'todas', label: 'Todas' },
  { id: 'error', label: 'Errores' },
  { id: 'warning', label: 'Advertencias' }
]
const MAX_HOJAS = 5 // mismo tope que el backend

// Los ultimos links usados se recuerdan en este navegador (comodidad, no estado).
const URLS_KEY = 'importacion.conciliacion.urls'
function leerUrls () {
  try {
    const guardadas = JSON.parse(localStorage.getItem(URLS_KEY) || '[]')
    return Array.isArray(guardadas) && guardadas.length ? guardadas.slice(0, MAX_HOJAS) : ['']
  } catch { return [''] }
}
const urls = ref(leerUrls())
watch(urls, (v) => { try { localStorage.setItem(URLS_KEY, JSON.stringify(v)) } catch { /* sin storage */ } }, { deep: true })

const agregarHoja = () => { if (urls.value.length < MAX_HOJAS) urls.value.push('') }
const quitarHoja = (i) => { urls.value.splice(i, 1) }

const loading = ref(false)
const error = ref('')
const result = ref(null)
const revisadoA = ref(null)

const severidad = ref('todas')
const codigo = ref(null)
const texto = ref('')

const urlsListas = computed(() => hojasListas(urls.value))
// Todas las cargadas deben ser links de Google Sheets (una vacia se ignora).
const urlsValidas = computed(() => urlsListas.value.length > 0 && urls.value.every(u => !u || isSheetUrl(u)))
const variasHojas = computed(() => (result.value?.sheets?.length || 0) > 1)
const verdict = computed(() => veredicto(result.value?.summary))
const tarjetas = computed(() => kpis(result.value?.summary))
const tipos = computed(() => filtrosPorTipo(result.value?.rows))
const filas = computed(() => filtrarFilas(result.value?.rows, { codigo: codigo.value, severidad: severidad.value, texto: texto.value }))

const subtitulo = computed(() => {
  if (!result.value) return 'Compara las hojas FICO con lo registrado y muestra solo lo que no coincide.'
  const cursos = (result.value.version_codes || []).join(', ')
  const n = result.value.sheets?.length || 1
  return `${cursos} · ${n} ${n === 1 ? 'hoja revisada' : 'hojas revisadas'} a las ${revisadoA.value}`
})

async function conciliar () {
  if (!urlsValidas.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    result.value = await importService.reconcile(urlsListas.value)
    revisadoA.value = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    severidad.value = 'todas'
    codigo.value = null
    texto.value = ''
  } catch (err) {
    console.error('Error conciliando la hoja FICO:', err)
    error.value = err?.response?.status === 403
      ? 'No tienes permiso para conciliar. Pídelo en Configuración > Roles y Permisos (Importación > Conciliación).'
      : err?.response?.data?.message || 'No se pudo conciliar. Revisa los links e inténtalo de nuevo.'
    result.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.url-row { display: flex; align-items: flex-end; gap: 8px; }
.url-field { flex: 1; min-width: 0; }
.btn-quitar { margin-bottom: 4px; }
.btn-sm-add { padding: 4px 10px; font-size: 12.5px; }
.hoja { display: block; font-size: 11px; font-weight: 500; color: var(--ds-muted); white-space: nowrap; }

.filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.search { max-width: 320px; }
/* Son hasta 14 tipos: al pasar a varias lineas, la pildora de .ds-tabs se volvia un ovalo. */
.tipos { border-radius: var(--ds-radius); }
.tipos > button b { margin-left: 4px; font-variant-numeric: tabular-nums; }
.dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; vertical-align: 1px; }
.dot.bad { background: var(--ds-bad); }
.dot.warn { background: var(--ds-warn); }

.accion { margin: 0; font-size: 13px; color: var(--ds-ink-2); }
.accion i { margin-right: 6px; color: var(--ds-accent); }

.alumno { display: block; font-weight: 600; color: var(--ds-heading); }
.dni { display: block; font-size: 11.5px; color: var(--ds-muted); font-family: var(--ds-font-mono); }
.nowrap { white-space: nowrap; }
.muted { color: var(--ds-muted); }
.enr-link { font-weight: 600; color: var(--ds-accent); font-family: var(--ds-font-mono); text-decoration: none; }
.enr-link:hover, .enr-link:focus-visible { text-decoration: underline; }
.enr-link i { font-size: 10px; }

.hallazgos { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.hallazgos li { display: flex; align-items: baseline; gap: 8px; }
.hallazgos .ds-pill { flex-shrink: 0; }
.msg { font-size: 12.5px; color: var(--ds-ink-2); }

@media (max-width: 900px) {
  .ds-panel-actions .btn-exec { width: 100%; justify-content: center; }
  .search { max-width: none; width: 100%; }
  .hallazgos li { flex-direction: column; gap: 2px; }
}
</style>
