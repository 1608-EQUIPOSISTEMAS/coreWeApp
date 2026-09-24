<template>
  <div class="ds-page par">
    <header class="ds-head">
      <div class="ds-head-titles">
        <span class="par-breadcrumb">Gerencia</span>
        <h1 class="ds-title">Parámetros</h1>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
      <div class="ds-head-actions">
        <input v-model="busqueda" class="ds-input par-buscar" type="search" placeholder="Buscar programa…" aria-label="Buscar programa" />
        <select v-model="temporada" class="ds-input par-select" aria-label="Temporada" @change="cargar">
          <option value="ALTA">Mes alto (ene, feb, mar, jul)</option>
          <option value="NORMAL">Mes normal</option>
        </select>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="cargando || guardando" @click="recalcular">
          <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Recalcular
        </button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="guardando || !pendientes.length" @click="guardar">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> {{ textoBoton }}
        </button>
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <p class="ds-alert neutro">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      Este es el estándar: lo que se pide por edición de cada programa. Al guardar baja solo a las ediciones que
      <strong>empiezan hoy o después</strong> y que nadie ajustó a mano; hacia atrás no se toca.
    </p>

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.label" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tono" aria-hidden="true"><i class="fa-solid" :class="k.icono"></i></span>
        <div class="ds-kpi-body">
          <span v-if="cargando" class="ds-skel"></span>
          <span v-else class="ds-kpi-value">{{ k.valor }}</span>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.nota }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿Qué le pedimos a una edición de cada programa?</h3>
        <span class="ds-panel-hint">{{ etiquetaTemporada }} · el OBJ es la suma de sus canales</span>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista par-table">
            <thead>
              <tr>
                <th rowspan="2" class="par-sticky">Programa</th>
                <th rowspan="2">Lado</th>
                <th :colspan="1 + CANALES_VENTA.length" class="par-group">Objetivo de ventas</th>
                <th :colspan="1 + CANALES_CONSULTA.length" class="par-group par-group--alt">Objetivo de consultas</th>
                <th rowspan="2" class="num">Ediciones<br />por venir</th>
              </tr>
              <tr>
                <th class="num par-obj">OBJ</th>
                <th v-for="c in CANALES_VENTA" :key="`v-${c.clave}`" class="num">{{ c.corto }}</th>
                <th class="num par-obj">OBJ</th>
                <th v-for="c in CANALES_CONSULTA" :key="`c-${c.clave}`" class="num">{{ c.corto }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="cargando">
                <tr v-for="n in 10" :key="n"><td :colspan="totalColumnas"><span class="ds-skel"></span></td></tr>
              </template>
              <tr v-else-if="!visibles.length">
                <td :colspan="totalColumnas" class="ds-empty ds-empty--lista">
                  {{ busqueda ? `Ningún programa coincide con "${busqueda}".` : 'No hay programas con ediciones por venir.' }}
                </td>
              </tr>
              <template v-else>
                <tr v-for="f in visibles" :key="f.program_version_id"
                    :class="{ 'is-tocada': tieneCambios(f), 'is-sin-plan': sinEstandar(f) }">
                  <td class="par-sticky par-prog">
                    {{ f.programa }}
                    <span v-if="sinEstandar(f)" class="ds-pill warn" title="Este programa todavía no tiene estándar cargado">sin plan</span>
                    <span class="par-linea">{{ f.linea || '—' }}</span>
                  </td>
                  <td>
                    <select v-model="f.lado" class="ds-input par-lado" :aria-label="`Lado de ${f.programa}`">
                      <option value="APERTURA">Apertura</option>
                      <option value="SEGUIMIENTO">Seguimiento</option>
                    </select>
                  </td>

                  <td class="num par-obj">{{ formatValue(total(f, 'ventas'), 'num') }}</td>
                  <td v-for="c in CANALES_VENTA" :key="`v-${f.program_version_id}-${c.clave}`" class="num">
                    <input v-model.number="f.canales[c.clave].ventas" class="ds-input par-meta"
                           type="number" min="0" :aria-label="`Ventas de ${c.nombre} en ${f.programa}`" />
                  </td>

                  <td class="num par-obj">{{ formatValue(total(f, 'consultas'), 'num') }}</td>
                  <td v-for="c in CANALES_CONSULTA" :key="`c-${f.program_version_id}-${c.clave}`" class="num">
                    <input v-model.number="f.canales[c.clave].consultas" class="ds-input par-meta"
                           type="number" min="0" :aria-label="`Consultas de ${c.nombre} en ${f.programa}`" />
                  </td>

                  <td class="num par-futuras">{{ formatValue(f.ediciones_futuras, 'num') }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <footer v-if="pendientes.length" class="ds-panel-foot warn">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>{{ textoPendientes }}</span>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'
import { confirmAction } from '@/composables/useConfirm'
import { formatValue } from '@/shared/lib/formatValue'

const dashboardService = inject(ServiceKeys.Dashboard)
const toast = useToast()

// Los mismos canales que el módulo de Objetivos, y con las mismas claves: aplicar
// el estándar es copiar este jsonb a la edición, no traducirlo.
const CANALES_VENTA = [
  { clave: 'MARKETING', corto: 'Mkt', nombre: 'Marketing' },
  { clave: 'COMERCIAL', corto: 'Com', nombre: 'Comercial' },
  { clave: 'WEB', corto: 'WEB', nombre: 'Web' },
  { clave: 'OTROS', corto: 'Otros', nombre: 'Otros' }
]
const CANALES_CONSULTA = CANALES_VENTA.filter((c) => c.clave !== 'WEB')
const TODAS_LAS_CLAVES = CANALES_VENTA.map((c) => c.clave)

const filas = ref([])
const temporada = ref('NORMAL')
const busqueda = ref('')
const originales = ref(new Map())
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')

const total = (fila, metrica) => TODAS_LAS_CLAVES.reduce((t, clave) => t + (fila.canales[clave]?.[metrica] || 0), 0)
const sinEstandar = (fila) => !fila.tenia_estandar

const huella = (fila) => `${fila.lado}|` +
  TODAS_LAS_CLAVES.map((c) => `${fila.canales[c].ventas}/${fila.canales[c].consultas}`).join('|')
const tieneCambios = (fila) => originales.value.get(fila.program_version_id) !== huella(fila)

// Se manda solo lo que cambió: guardar una fila la reaplica a sus ediciones, y
// reenviar las 190 del catálogo recalcularía medio cronograma sin motivo.
const pendientes = computed(() => filas.value.filter(tieneCambios))

const visibles = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return filas.value
  return filas.value.filter((f) => `${f.programa} ${f.programa_largo} ${f.linea}`.toLowerCase().includes(texto))
})

const etiquetaTemporada = computed(() => (temporada.value === 'ALTA' ? 'Mes alto' : 'Mes normal'))
const subtitulo = computed(() => `${filas.value.length} programas · estándar de ${etiquetaTemporada.value.toLowerCase()}`)
const textoBoton = computed(() => (guardando.value ? 'Guardando…' : pendientes.value.length ? `Guardar ${pendientes.value.length} cambios` : 'Sin cambios'))
const textoPendientes = computed(() => {
  const n = pendientes.value.length
  const ediciones = pendientes.value.reduce((t, f) => t + (f.ediciones_futuras || 0), 0)
  return `${n === 1 ? '1 programa' : `${n} programas`} sin guardar. Al guardar se recalculan ${ediciones} ediciones por venir.`
})

// Programa, lado + los dos OBJ + sus canales + ediciones por venir.
const totalColumnas = computed(() => 2 + 1 + CANALES_VENTA.length + 1 + CANALES_CONSULTA.length + 1)

const kpis = computed(() => {
  const ventas = filas.value.reduce((t, f) => t + total(f, 'ventas'), 0)
  const consultas = filas.value.reduce((t, f) => t + total(f, 'consultas'), 0)
  const sin = filas.value.filter(sinEstandar).length
  const ediciones = filas.value.reduce((t, f) => t + (f.ediciones_futuras || 0), 0)
  return [
    { label: 'Ventas por edición', valor: formatValue(ventas, 'num'), nota: 'Sumando todos los programas', icono: 'fa-cart-shopping', tono: '' },
    { label: 'Consultas por edición', valor: formatValue(consultas, 'num'), nota: 'Sumando todos los programas', icono: 'fa-comments', tono: '' },
    { label: 'Ediciones por venir', valor: formatValue(ediciones, 'num'), nota: 'Las que alcanza este estándar', icono: 'fa-calendar-day', tono: '' },
    { label: 'Programas sin plan', valor: formatValue(sin, 'num'), nota: `De ${filas.value.length} del catálogo`, icono: 'fa-circle-exclamation', tono: sin ? 'warn' : '' }
  ]
})

// El backend manda solo los canales con algo cargado; la grilla necesita las
// cuatro celdas siempre, o el v-model escribiría sobre un objeto inexistente.
const conTodosLosCanales = (canales) => Object.fromEntries(TODAS_LAS_CLAVES.map((clave) => [
  clave, { ventas: Number(canales?.[clave]?.ventas || 0), consultas: Number(canales?.[clave]?.consultas || 0) }
]))

async function cargar () {
  cargando.value = true
  error.value = ''
  try {
    const datos = await dashboardService.goalStandardsList({ season: temporada.value })
    filas.value = (datos.items || []).map((f) => ({
      ...f,
      // lado en null = nunca se cargó. Se muestra Seguimiento (el caso común: un
      // curso suelto) pero la fila queda marcada como "sin plan".
      tenia_estandar: !!f.lado,
      lado: f.lado || 'SEGUIMIENTO',
      canales: conTodosLosCanales(f.canales)
    }))
    originales.value = new Map(filas.value.map((f) => [f.program_version_id, huella(f)]))
  } catch (e) {
    console.error('No se pudieron cargar los parámetros:', e)
    error.value = 'No se pudieron cargar los parámetros. Reintenta o avisa a sistemas.'
    filas.value = []
  } finally {
    cargando.value = false
  }
}

async function guardar () {
  guardando.value = true
  try {
    const standards = pendientes.value.map((f) => ({
      program_version_id: f.program_version_id,
      lado: f.lado,
      canales: f.canales
    }))
    const r = await dashboardService.saveGoalStandards({ season: temporada.value, standards })
    toast.success(`${r.saved} parámetros guardados · ${r.applied} ediciones recalculadas`)
    await cargar()
  } catch (e) {
    console.error('Error guardando parámetros:', e)
    toast.error(e?.response?.data?.message || 'No se pudieron guardar los parámetros')
  } finally {
    guardando.value = false
  }
}

// Reaplica TODO el estándar. Hace falta para las ediciones creadas después del
// último cambio de parámetros: nacen sin objetivo y nadie vuelve a esta pantalla.
async function recalcular () {
  const ok = await confirmAction({
    title: 'Recalcular objetivos',
    text: 'Vuelve a bajar el estándar a todas las ediciones que empiezan hoy o después. No toca las que Gerencia ajustó a mano.',
    confirmText: 'Recalcular'
  })
  if (!ok) return
  guardando.value = true
  try {
    const r = await dashboardService.applyGoalStandards()
    toast.success(`${r.applied} ediciones recalculadas`)
  } catch (e) {
    console.error('Error recalculando objetivos:', e)
    toast.error(e?.response?.data?.message || 'No se pudo recalcular')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.par-breadcrumb { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); }
.par-select { width: auto; min-width: 190px; }
.par-buscar { width: auto; min-width: 180px; }
.par-lado { width: 128px; padding: 3px 6px; }

/* Cabecera de dos niveles, como la del plan: el grupo arriba y sus canales
   debajo. Así se lee "estos cuatro números reparten este OBJ". */
.par-group { text-align: center; background: var(--ds-surface-3); border-bottom: 1px solid var(--ds-border); }
.par-group--alt { background: var(--ds-soft-info); color: var(--ds-info-ink); }

/* El OBJ va en la marca, como en el plan: es el total y los canales lo rodean. */
.par-table thead .par-obj { background: var(--ds-brand); color: var(--ds-on-brand); }
.par-table tbody .par-obj { font-weight: 800; color: var(--ds-heading); background: var(--ds-surface-2); }

.par-meta { width: 62px; text-align: right; padding: 3px 6px; }
.par-prog { font-weight: 600; }
.par-linea { display: block; font-weight: 400; font-size: 11.5px; color: var(--ds-ink-2); }
.par-futuras { color: var(--ds-ink-2); }

/* El programa se queda a la vista mientras se recorren los siete canales. */
.par-sticky { position: sticky; left: 0; z-index: 1; background: var(--ds-surface); }
tr.is-sin-plan td,
tr.is-sin-plan .par-sticky { background: var(--ds-soft-warn); }
tr.is-tocada td,
tr.is-tocada .par-sticky { background: var(--ds-soft-info); }
</style>
