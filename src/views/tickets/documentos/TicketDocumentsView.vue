<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Documentos</h1>
        <p class="ds-sub">Manuales, procedimientos y plantillas del área de soporte: PDF o documentos online.</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="cargando" @click="cargar">
          <i class="fa-solid" :class="cargando ? 'fa-spinner fa-spin' : 'fa-rotate'" aria-hidden="true"></i>
          {{ cargando ? 'Cargando…' : 'Actualizar' }}
        </button>
        <!-- Mismo botón que "Nueva inscripción" de Finanzas. -->
        <RouterLink class="btn-exec btn-exec-primary doc-btn-nuevo" :to="{ name: 'TicketsDocumentoNuevo' }">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Subir documento
        </RouterLink>
      </div>
    </header>

    <div class="doc-toolbar">
      <div class="doc-chips" role="tablist" aria-label="Filtrar documentos">
        <button
          v-for="f in FILTROS"
          :key="f.valor"
          type="button"
          role="tab"
          class="ds-chip doc-chip"
          :class="{ activo: filtro === f.valor }"
          :aria-selected="filtro === f.valor"
          @click="filtro = f.valor"
        >
          {{ f.label }} <span class="doc-chip-count">{{ conteo[f.valor] }}</span>
        </button>
      </div>

      <div class="doc-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          v-model="busqueda"
          type="search"
          class="doc-input"
          placeholder="Buscar por título, descripción o persona…"
          aria-label="Buscar documentos"
        />
      </div>
    </div>

    <!-- La tabla se muestra siempre, aunque esté vacía: sin avisos en su lugar. -->
    <div class="doc-panel">
      <div class="ds-table-scroll">
        <table class="ds-table doc-table">
          <colgroup>
            <col class="doc-col-titulo">
            <col class="doc-col-tipo">
            <col class="doc-col-persona">
            <col class="doc-col-fecha">
            <col class="doc-col-accion">
          </colgroup>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Subido por</th>
              <th>Fecha</th>
              <th class="doc-accion">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in visibles" :key="d.id">
              <td>
                <span class="doc-titulo-celda">
                  <span class="doc-icono" :class="d.tipo === 'PDF' ? 'doc-icono--pdf' : 'doc-icono--enlace'" aria-hidden="true">
                    <i class="fa-solid" :class="iconoDe(d)"></i>
                  </span>
                  <span class="doc-titulo-textos">
                    <span class="doc-titulo">{{ d.titulo }}</span>
                    <span v-if="d.descripcion" class="doc-descripcion" :title="d.descripcion">{{ d.descripcion }}</span>
                    <span class="doc-detalle">
                      <template v-if="d.tipo === 'PDF'">{{ d.archivo?.nombre }} · {{ pesoArchivo(d.archivo?.bytes) }}</template>
                      <template v-else>{{ dominio(d.url) }}</template>
                    </span>
                  </span>
                </span>
              </td>
              <td>
                <span class="ds-pill" :class="d.tipo === 'PDF' ? 'bad' : 'info'">
                  {{ d.tipo === 'PDF' ? 'PDF' : 'Enlace' }}
                </span>
              </td>
              <td>
                <span class="doc-persona">
                  <span class="doc-avatar" aria-hidden="true">{{ iniciales(d.subidoPor?.nombre) }}</span>
                  {{ d.subidoPor?.nombre || '—' }}
                </span>
              </td>
              <td class="doc-fecha">{{ fechaCorta(d.creadoEn) }}</td>
              <td class="doc-accion">
                <a
                  v-if="d.tipo === 'ENLACE' && hrefSeguro(d.url)"
                  class="btn-exec btn-exec-outline doc-btn"
                  :href="hrefSeguro(d.url)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  Abrir
                </a>
                <button
                  v-else-if="d.tipo === 'PDF'"
                  type="button"
                  class="btn-exec btn-exec-outline doc-btn"
                  :disabled="abriendoId === d.id"
                  @click="abrirPdf(d)"
                >
                  <i class="fa-solid" :class="abriendoId === d.id ? 'fa-spinner fa-spin' : 'fa-eye'" aria-hidden="true"></i>
                  Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { fechaCorta, iniciales, pesoArchivo, hrefSeguro } from '../ticket-format.js'

const service = inject(ServiceKeys.Tickets)
const toast = useToast()

const FILTROS = [
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'PDF', label: 'PDF' },
  { valor: 'ENLACE', label: 'Enlaces' },
]

const documentos = ref([])
const cargando = ref(false)
const filtro = ref('TODOS')
const busqueda = ref('')

// Un fallo de carga se avisa con un toast: la tabla queda en pantalla igual.
async function cargar () {
  cargando.value = true
  try {
    documentos.value = await service.documents()
  } catch (e) {
    console.error('tickets.documents:', e)
    toast.error(e?.response?.data?.message || 'No se pudieron cargar los documentos.')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// Son pocos (una biblioteca interna): filtro y búsqueda en el cliente.
const conteo = computed(() => ({
  TODOS: documentos.value.length,
  PDF: documentos.value.filter(d => d.tipo === 'PDF').length,
  ENLACE: documentos.value.filter(d => d.tipo === 'ENLACE').length,
}))

const visibles = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return documentos.value.filter(d =>
    (filtro.value === 'TODOS' || d.tipo === filtro.value) &&
    (!q || d.titulo.toLowerCase().includes(q) || (d.descripcion || '').toLowerCase().includes(q) ||
      (d.subidoPor?.nombre || '').toLowerCase().includes(q)))
})

// Ícono según el servicio del enlace, para reconocer de un vistazo una hoja de
// cálculo de un documento de texto.
function iconoDe (d) {
  if (d.tipo === 'PDF') return 'fa-file-pdf'
  const url = String(d.url || '')
  if (/spreadsheets|sheet|excel|xlsx/i.test(url)) return 'fa-file-excel'
  if (/document|docs\.google|word|docx/i.test(url)) return 'fa-file-word'
  return 'fa-link'
}

function dominio (url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// El PDF no se enlaza directo: el endpoint exige Authorization. Se baja como
// blob y se abre en pestaña nueva; las URLs se revocan al salir de la vista.
const abriendoId = ref(null)
const urls = []

async function abrirPdf (d) {
  abriendoId.value = d.id
  try {
    const url = URL.createObjectURL(await service.documentBlob(d.id))
    urls.push(url)
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    console.error('tickets.documentBlob:', e)
    toast.error('No se pudo abrir el documento.')
  } finally {
    abriendoId.value = null
  }
}

onUnmounted(() => urls.forEach(URL.revokeObjectURL))
</script>

<style scoped>
/* Página, cabecera, botones y colores: sistema de diseño (styles/design-system.css).
   Toolbar y tabla replican las de la bandeja (TicketsToolbar / TicketsTable). */
.doc-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.doc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.doc-chip { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; border: 1px solid var(--ds-border); background: transparent; transition: 0.15s; }
.doc-chip:hover { border-color: var(--ds-accent); }
.doc-chip.activo { background: var(--ds-accent); border-color: var(--ds-accent); color: #fff; }
.doc-chip-count { padding: 0 6px; border-radius: 999px; font-size: 10.5px; font-weight: 700; background: var(--ds-soft-neutral); color: var(--ds-ink-2); }
.doc-chip.activo .doc-chip-count { background: rgba(255, 255, 255, 0.24); color: #fff; }

.doc-search { position: relative; display: flex; align-items: center; }
.doc-search i { position: absolute; left: 10px; font-size: 12px; color: var(--ds-muted); pointer-events: none; }
.doc-input {
  width: 260px; max-width: 100%; height: 34px; padding: 0 10px 0 30px;
  border: 1px solid var(--ds-border); border-radius: 7px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13px;
}
.doc-input:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }

.doc-panel {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius);
  overflow: hidden;
}
.doc-table { font-size: 13px; table-layout: fixed; width: 100%; }
.doc-col-titulo { width: 44%; }
.doc-col-tipo { width: 11%; }
.doc-col-persona { width: 20%; }
.doc-col-fecha { width: 13%; }
.doc-col-accion { width: 110px; }
.doc-table thead th {
  padding: 12px 14px;
  background: var(--ds-surface-2);
  border-bottom: 1px solid var(--ds-border);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ds-ink-2);
  text-align: left;
}
.doc-table thead th:first-child { padding-left: 16px; }
.doc-table tbody td { padding: 12px 14px; border-top: 1px solid var(--ds-border); vertical-align: middle; transition: background-color 0.12s; }
.doc-table tbody td:first-child { padding-left: 16px; }
.doc-table tbody tr:hover td { background: var(--ds-surface-2); }
.doc-table .doc-accion { text-align: center; }

.doc-titulo-celda { display: flex; align-items: center; gap: 11px; min-width: 0; }
.doc-icono { width: 34px; height: 34px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; font-size: 15px; }
.doc-icono--pdf { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.doc-icono--enlace { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.doc-titulo-textos { display: flex; flex-direction: column; min-width: 0; }
.doc-titulo { font-weight: 600; color: var(--ds-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-descripcion { font-size: 12px; color: var(--ds-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-detalle { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.doc-persona { display: inline-flex; align-items: center; gap: 8px; }
.doc-avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--ds-soft-info); color: var(--ds-info-ink);
  font-size: 10.5px; font-weight: 700;
}
.doc-fecha { color: var(--ds-ink-2); white-space: nowrap; }
.doc-btn-nuevo { text-decoration: none; }
.doc-btn { padding: 5px 11px; font-size: 12px; white-space: nowrap; text-decoration: none; }
</style>
