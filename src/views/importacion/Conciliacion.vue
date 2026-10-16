<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Conciliación</h1>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
    </header>

    <form class="ds-panel" @submit.prevent="conciliar()">
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

      <section v-if="aplicado" class="ds-panel" aria-live="polite">
        <header class="ds-panel-head">
          <h2 class="ds-panel-title">Resultado de la corrección</h2>
          <button class="btn-icon" type="button" title="Cerrar" aria-label="Cerrar resultado" @click="aplicado = null">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="ds-panel-body ds-stack">
          <p class="ds-verdict" :class="resumenAplicado.tono">
            <strong>{{ resumenAplicado.titulo }}</strong>
            <span>{{ resumenAplicado.texto }}</span>
          </p>
          <ul class="resultados">
            <li v-for="(r, i) in resultadosOrdenados" :key="i" :class="r.ok ? 'ok' : 'bad'">
              <i class="fa-solid" :class="r.ok ? 'fa-circle-check' : 'fa-circle-xmark'" aria-hidden="true"></i>
              <span class="res-quien">{{ r.label }} · {{ r.enrollment_id ? `#${r.enrollment_id}` : `fila ${r.row_number}` }}</span>
              <span class="msg">{{ r.message }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="result.rows.length" class="ds-panel">
        <header class="ds-panel-head">
          <h2 class="ds-panel-title">¿Qué no coincide?</h2>
          <span class="ds-panel-hint">{{ filas.length }} de {{ result.rows.length }} filas</span>
          <button
            v-if="loteBajoRiesgo.length"
            class="btn-exec btn-exec-primary btn-sm-add btn-lote"
            type="button"
            :disabled="ocupado"
            title="Fechas, asesores y pagos de cuotas que ya existen con el mismo monto. No cambia montos ni crea o anula inscripciones."
            @click="abrirLote"
          >
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Aplicar las de bajo riesgo ({{ loteBajoRiesgo.length }})
          </button>
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
                  <th scope="col">Corrección</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filas.length">
                  <td colspan="6" class="ds-empty ds-empty--lista">Ninguna fila con este filtro. Quita un filtro para ver más.</td>
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
                  <td class="col-fix">
                    <div v-if="r.fixes?.length" class="fixes">
                      <template v-for="fx in r.fixes" :key="fx.action">
                        <button
                          class="btn-exec btn-fix"
                          :class="fx.blocked || fx.risk === 'low' ? 'btn-exec-outline' : 'btn-exec-primary'"
                          type="button"
                          :disabled="ocupado || !!fx.blocked"
                          :title="fx.blocked || fx.description"
                          @click="elegir(r, fx)"
                        >
                          <i class="fa-solid" :class="enCurso === claveDe(r, fx) ? 'fa-spinner fa-spin' : fx.risk === 'low' ? 'fa-wand-magic-sparkles' : 'fa-pen-to-square'" aria-hidden="true"></i>
                          {{ fx.label }}
                        </button>
                        <span v-if="fx.blocked" class="fix-bloq">A mano: {{ fx.blocked }}</span>
                      </template>
                    </div>
                    <span v-else class="muted fix-none" title="Esta diferencia se revisa a mano desde el detalle de la inscripción">A mano</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            Las correcciones solo tocan inscripciones de la importación masiva y quedan en el historial de cada inscripción. Las de bajo riesgo (fecha, asesor, pagos que faltan registrar) se aplican con un clic; las que cambian montos o crean, anulan o retiran inscripciones piden confirmación.
            Se comparan las ediciones activas y las convalidaciones (E0); las históricas no se importan.
          </span>
        </footer>
      </section>
    </template>

    <BaseModal v-model="modal" :title="confirmar?.titulo || ''" size="lg">
      <div v-if="confirmar" class="ds-stack confirmar">
        <p v-if="confirmar.alumno" class="conf-alumno">
          <strong>{{ confirmar.alumno }}</strong>
          <span class="muted">{{ confirmar.ref }}</span>
        </p>
        <p class="conf-desc">{{ confirmar.descripcion }}</p>
        <ul v-if="confirmar.cambios.length" class="conf-cambios">
          <li v-for="(c, i) in confirmar.cambios" :key="i">{{ c }}</li>
        </ul>
        <p v-if="confirmar.aviso" class="ds-alert neutro conf-aviso">{{ confirmar.aviso }}</p>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="ocupado" @click="modal = false">Cancelar</button>
        <button class="btn-exec" :class="confirmar?.peligro ? 'btn-exec-danger' : 'btn-exec-primary'" type="button" :disabled="ocupado" @click="ejecutarConfirmado">
          <i class="fa-solid" :class="ocupado ? 'fa-spinner fa-spin' : 'fa-check'" aria-hidden="true"></i>
          {{ ocupado ? 'Aplicando…' : confirmar?.boton }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import {
  isSheetUrl, hojasListas, veredicto, kpis, filtrosPorTipo, filtrarFilas, hallazgosOrdenados, labelOf, accionOf, toneOf,
  pedidoDe, correccionesBajoRiesgo, conteoPorAccion, resumenResultado
} from '@/features/conciliacion-fico/conciliacion'

const importService = inject(ServiceKeys.Import)
const toast = useToast()

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

// Hojas de la ultima conciliacion: las correcciones se aplican sobre ESAS (el
// usuario puede haber editado los links despues).
const urlsConciliadas = ref([])

// mantenerFiltros: re-conciliar tras una correccion, sin perder la vista.
async function conciliar ({ mantenerFiltros = false } = {}) {
  if (!urlsValidas.value || loading.value) return
  loading.value = true
  error.value = ''
  if (!mantenerFiltros) aplicado.value = null
  try {
    const urlsActuales = mantenerFiltros && urlsConciliadas.value.length ? urlsConciliadas.value : urlsListas.value
    result.value = await importService.reconcile(urlsActuales)
    urlsConciliadas.value = urlsActuales
    revisadoA.value = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    if (!mantenerFiltros) {
      severidad.value = 'todas'
      codigo.value = null
      texto.value = ''
    }
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
// --- Correcciones (Fase 3) ----------------------------------------------------

const aplicando = ref(false)
const enCurso = ref(null) // clave de la correccion de un clic que esta corriendo
const aplicado = ref(null) // ultimo resultado { applied, failed, results }
const modal = ref(false)
const confirmar = ref(null) // { titulo, alumno, ref, descripcion, cambios, aviso, boton, peligro, pedidos }

const ocupado = computed(() => aplicando.value || loading.value)
const loteBajoRiesgo = computed(() => correccionesBajoRiesgo(result.value?.rows))
const resumenAplicado = computed(() => resumenResultado(aplicado.value))
// Primero lo que no se aplico: es lo que hay que leer.
const resultadosOrdenados = computed(() => [...(aplicado.value?.results || [])].sort((a, b) => Number(a.ok) - Number(b.ok)))

const claveDe = (r, fx) => `${fx.action}|${r.enrollment_id}|${r.row_number}|${r.sheet}`
const refDe = (r) => [r.enrollment_id ? `#${r.enrollment_id}` : null, r.row_number ? `fila ${r.row_number}` : null, r.edition].filter(Boolean).join(' · ')

// Avisos de las acciones con efectos que no se ven en la lista de cambios.
const AVISOS = {
  retire: 'Es el mismo retiro del detalle de la inscripción: retira las aulas hijas, elimina las cuotas pendientes, desinscribe de Odoo y envía el aviso de retiro.',
  annul_duplicates: 'Las inscripciones anuladas quedan inactivas (no se borran) y sus pagos dejan de contar. Revisa que no sean ventas distintas.',
  import_row: 'Crea la inscripción con sus cuotas, pagos, aulas hijas y membresía, igual que "Importar hoja", pero solo para esta fila.',
  link_rp: 'No se crea una inscripción nueva: se enlaza la que ya existe en la otra edición, que conserva sus aulas, asistencia y notas.',
  plan: 'Si un pago ya registrado cambia de monto, el monto anterior queda anotado en el historial de la inscripción.'
}

// Clic en una correccion: las de bajo riesgo se aplican al toque; las demas,
// con confirmacion y el detalle de lo que va a cambiar.
function elegir (r, fx) {
  if (fx.blocked || ocupado.value) return
  if (fx.risk === 'low') {
    aplicar([pedidoDe(r, fx)], claveDe(r, fx))
    return
  }
  confirmar.value = {
    titulo: fx.label,
    alumno: r.student,
    ref: refDe(r),
    descripcion: fx.description,
    cambios: fx.changes || [],
    aviso: AVISOS[fx.action] || '',
    boton: fx.label,
    peligro: fx.action === 'retire' || fx.action === 'annul_duplicates',
    pedidos: [pedidoDe(r, fx)]
  }
  modal.value = true
}

function abrirLote () {
  const items = loteBajoRiesgo.value
  if (!items.length) return
  confirmar.value = {
    titulo: 'Aplicar las correcciones de bajo riesgo',
    alumno: '',
    ref: '',
    descripcion: `${items.length === 1 ? 'Se aplica 1 corrección' : `Se aplican ${items.length} correcciones`} que no cambian montos ni crean o anulan inscripciones. Cada una se vuelve a verificar contra el sistema antes de escribir.`,
    cambios: conteoPorAccion(items).map(c => `${c.label}: ${c.n}`),
    aviso: '',
    boton: `Aplicar ${items.length}`,
    peligro: false,
    pedidos: items.map(({ row, fix }) => pedidoDe(row, fix))
  }
  modal.value = true
}

async function ejecutarConfirmado () {
  if (!confirmar.value) return
  await aplicar(confirmar.value.pedidos)
  modal.value = false
}

async function aplicar (pedidos, clave = null) {
  if (ocupado.value || !pedidos.length) return
  aplicando.value = true
  enCurso.value = clave
  try {
    const res = await importService.applyReconciliationFixes(urlsConciliadas.value, pedidos)
    aplicado.value = res
    if (res.failed) toast.warning(resumenResultado(res).titulo)
    else toast.success(resumenResultado(res).titulo)
  } catch (err) {
    console.error('Error aplicando correcciones de la conciliación:', err)
    toast.error(err?.response?.status === 403
      ? 'No tienes permiso para corregir: se necesita Importación > Carga además de Conciliación.'
      : err?.response?.data?.message || 'No se pudo aplicar la corrección.')
    return
  } finally {
    aplicando.value = false
    enCurso.value = null
  }
  // Con los datos nuevos: la fila corregida desaparece o muestra lo que falta.
  await conciliar({ mantenerFiltros: true })
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

.btn-lote { margin-left: auto; }
.col-fix { min-width: 170px; }
.fixes { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.btn-fix { padding: 4px 10px; font-size: 12px; white-space: nowrap; }
/* Bloqueada: que no se confunda con una de bajo riesgo disponible. */
.btn-fix:disabled { opacity: 0.45; cursor: not-allowed; }
.fix-bloq { max-width: 240px; font-size: 11.5px; line-height: 1.35; color: var(--ds-muted); }
.fix-none { font-size: 12px; }

.resultados { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.resultados li { display: flex; align-items: baseline; gap: 8px; }
.resultados li.ok i { color: var(--ds-ok); }
.resultados li.bad i { color: var(--ds-bad); }
.res-quien { flex-shrink: 0; font-size: 12.5px; font-weight: 600; color: var(--ds-heading); }

.confirmar { padding: 4px 0; }
.conf-alumno { margin: 0; display: flex; flex-direction: column; gap: 2px; }
.conf-alumno .muted { font-size: 12.5px; font-family: var(--ds-font-mono); }
.conf-desc { margin: 0; font-size: 14px; color: var(--ds-ink); }
.conf-cambios { margin: 0; padding-left: 18px; font-size: 13px; color: var(--ds-ink-2); display: flex; flex-direction: column; gap: 4px; }
.conf-aviso { font-weight: 500; font-size: 13px; }

@media (max-width: 900px) {
  .ds-panel-actions .btn-exec { width: 100%; justify-content: center; }
  .search { max-width: none; width: 100%; }
  .hallazgos li { flex-direction: column; gap: 2px; }
  .resultados li { flex-direction: column; gap: 2px; }
  .btn-lote { margin-left: 0; width: 100%; justify-content: center; }
}
</style>
