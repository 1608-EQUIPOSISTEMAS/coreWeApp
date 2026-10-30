<template>
  <div class="ds-page pl-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Planilla</h1>
        <p class="ds-sub">Huellero, tardanzas y pago del mes. 1.ª quincena 40 % · fin de mes 60 % menos tardanzas.</p>
      </div>
      <div class="ds-head-actions">
        <label class="ds-label sr-only" for="pl-periodo">Periodo</label>
        <input id="pl-periodo" v-model="periodo" type="month" class="ds-input pl-mes" />
      </div>
    </header>

    <div class="ds-tabs" role="tablist" aria-label="Secciones de planilla">
      <button v-for="t in tabsVisibles" :key="t.key" type="button" role="tab" :aria-selected="String(tab === t.key)" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- ── Planilla del mes ───────────────────────────────────────────── -->
    <template v-if="tab === 'planilla'">
      <div v-if="!puedeVerSueldos" class="ds-callout">
        Los montos de la planilla solo los ve el área de Talento.
      </div>
      <template v-else>
        <section v-if="calc" class="ds-kpis">
          <div class="ds-kpi"><div class="ds-kpi-body"><span class="ds-kpi-value">{{ calc.totales.trabajadores }}</span><span class="ds-kpi-label">Trabajadores</span></div></div>
          <div class="ds-kpi"><div class="ds-kpi-body"><span class="ds-kpi-value">{{ soles(calc.totales.pago_quincena) }}</span><span class="ds-kpi-label">1.ª quincena (40 %)</span></div></div>
          <div class="ds-kpi"><div class="ds-kpi-icon bad"><i class="fa-solid fa-clock" aria-hidden="true"></i></div><div class="ds-kpi-body"><span class="ds-kpi-value">{{ soles(calc.totales.descuento_tardanza) }}</span><span class="ds-kpi-label">Descuento por tardanzas ({{ calc.totales.minutos_tardanza }} min)</span></div></div>
          <div class="ds-kpi"><div class="ds-kpi-icon ok"><i class="fa-solid fa-money-bill" aria-hidden="true"></i></div><div class="ds-kpi-body"><span class="ds-kpi-value">{{ soles(calc.totales.pago_fin_mes) }}</span><span class="ds-kpi-label">A pagar fin de mes (60 % − tardanzas)</span></div></div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h2 class="ds-panel-title">Planilla {{ nombreMes }}</h2>
              <p class="ds-panel-sub">
                <span v-if="calc?.cerrado" class="ds-pill ok"><i class="fa-solid fa-lock" aria-hidden="true"></i> Cerrada (congelada) por {{ calc.cierre.cerrado_por || '—' }} el {{ fechaHora(calc.cierre.cerrado_at) }}</span>
                <span v-else class="ds-pill warn">Abierta</span>
                Valor del minuto = sueldo neto ÷ 30 días ÷ 8 h ÷ 60.
              </p>
            </div>
            <div class="ds-panel-actions">
              <input v-model.trim="filtro" type="search" class="ds-input" placeholder="Buscar nombre, código o área" aria-label="Buscar" />
              <button class="btn-exec btn-exec-outline" type="button" :disabled="!calc || exportando" @click="exportar">
                <i class="fa-solid fa-file-excel" aria-hidden="true"></i> {{ exportando ? 'Exportando…' : 'Exportar Excel' }}
              </button>
              <button v-if="calc && !calc.cerrado" class="btn-exec btn-exec-primary" type="button" @click="cerrar">
                <i class="fa-solid fa-lock" aria-hidden="true"></i> Cerrar periodo
              </button>
              <button v-else-if="calc" class="btn-exec btn-exec-outline" type="button" @click="reabrir">
                <i class="fa-solid fa-lock-open" aria-hidden="true"></i> Reabrir
              </button>
            </div>
          </header>
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr>
                  <th>Trabajador</th><th>Área</th><th class="tr">Sueldo neto</th><th class="tr">Quincena</th>
                  <th class="tr">Fin de mes</th><th class="tc">Tardanzas</th><th class="tr">Descuento</th><th class="tr">A pagar fin de mes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cargando"><td colspan="8" class="ds-empty">Calculando…</td></tr>
                <tr v-else-if="!trabajadoresFiltrados.length"><td colspan="8" class="ds-empty">Sin personal. Importa el maestro de personal en la pestaña "Personal".</td></tr>
                <template v-for="t in trabajadoresFiltrados" :key="t.codigo">
                  <tr class="pl-fila" @click="abierto = abierto === t.codigo ? null : t.codigo">
                    <td>
                      <div class="cell-main"><i class="fa-solid pl-caret" :class="abierto === t.codigo ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i> {{ t.nombre }}</div>
                      <div class="cell-sub mono">{{ t.codigo }} · ingreso {{ t.hora_ingreso }}</div>
                    </td>
                    <td>{{ t.area || '—' }}</td>
                    <td class="tr mono">{{ t.sin_sueldo ? 'sin sueldo' : soles(t.sueldo_neto) }}</td>
                    <td class="tr mono">{{ soles(t.pago_quincena) }}</td>
                    <td class="tr mono">{{ soles(t.pago_fin_mes_bruto) }}</td>
                    <td class="tc">
                      <span v-if="t.tardanzas" class="ds-pill bad">{{ t.tardanzas }} · {{ t.minutos_tardanza }} min</span>
                      <span v-else class="cell-sub">{{ t.dias_asistidos ? '0' : 'sin marcas' }}</span>
                    </td>
                    <td class="tr mono pl-desc">{{ t.descuento_tardanza ? '− ' + soles(t.descuento_tardanza) : '—' }}</td>
                    <td class="tr mono"><strong>{{ soles(t.pago_fin_mes) }}</strong></td>
                  </tr>
                  <tr v-if="abierto === t.codigo" class="pl-detalle">
                    <td colspan="8">
                      <div v-if="!t.detalle.length" class="cell-sub">Sin marcaciones en el periodo.</div>
                      <div v-else class="pl-dias">
                        <span v-for="d in t.detalle" :key="d.fecha" class="pl-dia" :class="{ tarde: d.minutos_tardanza, just: d.justificado }" :title="d.justificacion || ''">
                          <b>{{ diaCorto(d.fecha) }}</b> {{ d.entrada.slice(0, 5) }}
                          <template v-if="d.minutos_tardanza"> · {{ d.minutos_tardanza }}′ · −{{ soles(d.descuento) }}</template>
                          <template v-if="d.justificado"> · justificado</template>
                        </span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>

    <!-- ── Asistencia y tardanzas ─────────────────────────────────────── -->
    <section v-if="tab === 'asistencia'" class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h2 class="ds-panel-title">Asistencia {{ nombreMes }}</h2>
          <p class="ds-panel-sub">Tolerancia hasta el minuto 10:59. Del 11 al 30 se computa 30 min; desde el 31, 1 hora. Justifica los días con permiso, comisión o descanso médico.</p>
        </div>
        <div class="ds-panel-actions">
          <label class="pl-check"><input v-model="soloTardanzas" type="checkbox" /> Solo tardanzas e incidencias</label>
          <input v-model.trim="filtro" type="search" class="ds-input" placeholder="Buscar" aria-label="Buscar" />
        </div>
      </header>
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--densa">
          <thead>
            <tr><th>Fecha</th><th>Trabajador</th><th class="tc">Ingreso</th><th class="tc">Entrada</th><th class="tc">Salida</th><th class="tc">Tardanza</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-if="cargando"><td colspan="7" class="ds-empty">Cargando…</td></tr>
            <tr v-else-if="!asistenciaFiltrada.length"><td colspan="7" class="ds-empty">Sin marcaciones en el periodo. Importa el Excel del huellero.</td></tr>
            <tr v-for="a in asistenciaFiltrada" :key="a.asistencia_id">
              <td class="mono">{{ diaCorto(a.fecha) }}</td>
              <td>
                <div class="cell-main">{{ a.nombre }} <span v-if="!a.en_ficha" class="ds-pill warn">sin ficha</span></div>
                <div class="cell-sub mono">{{ a.codigo }}{{ a.area ? ' · ' + a.area : '' }}</div>
              </td>
              <td class="tc mono">{{ a.hora_ingreso }}</td>
              <td class="tc mono">{{ a.entrada }}</td>
              <td class="tc mono">{{ a.salida || '' }}<span v-if="!a.salida" class="ds-pill warn">sin salida</span></td>
              <td class="tc">
                <span v-if="a.justificado" class="ds-pill ok" :title="a.justificacion">Justificado</span>
                <span v-else-if="a.minutos_tardanza" class="ds-pill bad">{{ a.minutos_tardanza }} min</span>
                <span v-else class="cell-sub">—</span>
              </td>
              <td class="tr">
                <button v-if="!asis?.cerrado && (a.minutos_tardanza || a.justificado)" class="btn-exec btn-exec-outline btn-sm" type="button" @click="justificar(a)">
                  {{ a.justificado ? 'Quitar' : 'Justificar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Importar huellero ──────────────────────────────────────────── -->
    <template v-if="tab === 'huellero'">
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">Importar marcaciones del huellero</h2>
            <p class="ds-panel-sub">Sube el Excel tal como lo exporta el huellero (.xlsx o .csv). Se toma la primera marca del día como entrada y la última como salida. Reimportar el mismo día lo reemplaza, sin duplicar.</p>
          </div>
        </header>
        <div class="ds-panel-body">
          <label class="dropzone" :class="{ 'dropzone-has': !!archivoHuellero }">
            <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo del huellero" @change="e => { archivoHuellero = e.target.files?.[0] || null; previaHuellero = null }" />
            <i class="fa-solid fa-fingerprint dropzone-icon" aria-hidden="true"></i>
            <span class="dropzone-text">{{ archivoHuellero ? archivoHuellero.name : 'Haz clic para elegir el archivo del huellero' }}</span>
          </label>
          <div class="card-actions">
            <button class="btn-exec btn-exec-primary" type="button" :disabled="!archivoHuellero || subiendo" @click="previsualizarHuellero">
              {{ subiendo ? 'Leyendo…' : 'Vista previa' }}
            </button>
          </div>

          <div v-if="previaHuellero" class="pl-previa">
            <div class="summary-chips">
              <span class="ds-pill">{{ previaHuellero.desde }} → {{ previaHuellero.hasta }}</span>
              <span class="ds-pill">{{ previaHuellero.marcaciones }} marcaciones</span>
              <span class="ds-pill ok">{{ previaHuellero.dias }} días-trabajador</span>
              <span class="ds-pill">{{ previaHuellero.trabajadores }} trabajadores</span>
              <span v-if="previaHuellero.sin_salida" class="ds-pill warn">{{ previaHuellero.sin_salida }} sin salida</span>
              <span v-if="previaHuellero.total_errores" class="ds-pill bad">{{ previaHuellero.total_errores }} filas ilegibles</span>
            </div>
            <div v-if="previaHuellero.sin_ficha.length" class="ds-callout">
              <b>{{ previaHuellero.sin_ficha.length }} código(s) del huellero no están en el maestro de personal</b> (se guardan igual, pero no entran a la planilla hasta registrarlos):
              {{ previaHuellero.sin_ficha.map(s => `${s.codigo}${s.nombre ? ' ' + s.nombre : ''}`).join(' · ') }}
            </div>
            <div v-if="previaHuellero.errores?.length" class="err-list">
              {{ previaHuellero.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
            </div>
            <div v-if="previaHuellero.muestra?.length" class="ds-table-scroll">
              <table class="ds-table ds-table--densa">
                <thead><tr><th>Código</th><th>Nombre (huellero)</th><th>Fecha</th><th class="tc">Entrada</th><th class="tc">Salida</th><th class="tc">Marcas</th></tr></thead>
                <tbody>
                  <tr v-for="d in previaHuellero.muestra" :key="d.codigo + d.fecha">
                    <td class="mono">{{ d.codigo }}</td><td>{{ d.nombre || '—' }}</td><td class="mono">{{ diaCorto(d.fecha) }}</td>
                    <td class="tc mono">{{ d.entrada }}</td>
                    <td class="tc mono">{{ d.salida || '' }}<span v-if="!d.salida" class="ds-pill warn">sin salida</span></td>
                    <td class="tc">{{ d.marcas }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="cell-sub">Primeras {{ previaHuellero.muestra.length }} de {{ previaHuellero.dias }} filas (una por trabajador y día).</p>
            </div>
            <div v-if="!previaHuellero.confirmado" class="card-actions">
              <button class="btn-exec btn-exec-primary" type="button" :disabled="subiendo" @click="confirmarHuellero">
                <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Guardar {{ previaHuellero.dias }} registro(s)
              </button>
            </div>
            <div v-else class="ds-pill ok">Importado.</div>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <header class="ds-panel-head"><h2 class="ds-panel-title">Últimas importaciones</h2></header>
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Archivo</th><th>Rango</th><th class="tr">Filas</th><th>Usuario</th></tr></thead>
            <tbody>
              <tr v-if="!importaciones.length"><td colspan="6" class="ds-empty">Aún no hay importaciones.</td></tr>
              <tr v-for="i in importaciones" :key="i.importacion_id">
                <td class="mono">{{ fechaHora(i.created_at) }}</td><td>{{ i.tipo }}</td><td>{{ i.archivo }}</td>
                <td class="mono">{{ i.desde ? `${i.desde} → ${i.hasta}` : '—' }}</td><td class="tr">{{ i.filas }}</td><td>{{ i.usuario || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ── Personal ───────────────────────────────────────────────────── -->
    <template v-if="tab === 'personal'">
      <section v-if="puedeVerSueldos" class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h2 class="ds-panel-title">Cargar sueldos vigentes desde {{ nombreMes }}</h2>
            <p class="ds-panel-sub">Se carga a inicio de mes. Los sueldos valen desde el mes elegido arriba hasta la próxima carga; los meses anteriores no cambian. El sueldo se guarda cifrado y solo lo ve Talento. El archivo no se almacena: se lee y se descarta. El horario se asigna por área (FICO y B2B 8:30; el resto 9:00) y se puede ajustar abajo.</p>
          </div>
          <div class="ds-panel-actions">
            <button class="btn-exec btn-exec-outline" type="button" @click="svc.descargarPlantilla()">
              <i class="fa-solid fa-download" aria-hidden="true"></i> Plantilla
            </button>
          </div>
        </header>
        <div class="ds-panel-body">
          <label class="dropzone" :class="{ 'dropzone-has': !!archivoPersonal }">
            <input type="file" accept=".xlsx,.csv" class="dropzone-input" aria-label="Elegir archivo de personal" @change="e => { archivoPersonal = e.target.files?.[0] || null; previaPersonal = null }" />
            <i class="fa-solid fa-file-excel dropzone-icon" aria-hidden="true"></i>
            <span class="dropzone-text">{{ archivoPersonal ? archivoPersonal.name : 'Columnas: Código huellero, DNI, Nombre, Área, Sueldo neto' }}</span>
          </label>
          <div class="card-actions">
            <button class="btn-exec btn-exec-primary" type="button" :disabled="!archivoPersonal || subiendo" @click="previsualizarPersonal">Vista previa</button>
            <button v-if="previaPersonal && !previaPersonal.confirmado" class="btn-exec btn-exec-primary" type="button" :disabled="subiendo || !previaPersonal.total" @click="confirmarPersonal">
              Guardar {{ previaPersonal.total }} trabajador(es)
            </button>
            <span v-if="previaPersonal?.confirmado" class="ds-pill ok">Guardado: {{ previaPersonal.total }} trabajador(es).</span>
          </div>

          <div v-if="previaPersonal && !previaPersonal.confirmado" class="pl-previa">
            <div class="summary-chips">
              <span class="ds-pill ok">{{ previaPersonal.total }} fila(s) válidas</span>
              <span v-if="previaPersonal.errores.length" class="ds-pill bad">{{ previaPersonal.errores.length }} con error</span>
              <span class="cell-sub">Vista previa: todavía no se guardó nada. Vigentes desde {{ nombreMes }}.</span>
            </div>
            <div v-if="previaPersonal.errores.length" class="err-list">
              {{ previaPersonal.errores.map(e => `Fila ${e.fila}: ${e.motivo}`).join(' · ') }}
            </div>
            <div class="ds-table-scroll">
              <table class="ds-table ds-table--densa">
                <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Área</th><th class="tc">Horario</th><th class="tr">Sueldo neto</th><th class="tr">Quincena 40 %</th><th class="tr">Fin de mes 60 %</th></tr></thead>
                <tbody>
                  <tr v-for="p in previaPersonal.personal" :key="p.codigo">
                    <td class="mono">{{ p.codigo }}</td><td>{{ p.nombre }}</td><td class="mono">{{ p.dni || '—' }}</td><td>{{ p.area || '—' }}</td>
                    <td class="tc mono">{{ p.hora_ingreso }} – {{ p.hora_salida }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto) }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto * 0.4) }}</td>
                    <td class="tr mono">{{ soles(p.sueldo_neto * 0.6) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h2 class="ds-panel-title">Personal ({{ personal.length }})</h2>
          <input v-model.trim="filtro" type="search" class="ds-input" placeholder="Buscar" aria-label="Buscar" />
        </header>
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--densa">
            <thead><tr><th>Código</th><th>Nombre</th><th>DNI</th><th>Área</th><th class="tc">Ingreso</th><th class="tc">Salida</th><th class="tr">Sueldo neto</th><th class="tc">Activo</th></tr></thead>
            <tbody>
              <tr v-if="!personalFiltrado.length"><td colspan="8" class="ds-empty">Sin personal registrado.</td></tr>
              <tr v-for="p in personalFiltrado" :key="p.personal_id" :class="{ 'pl-inactivo': !p.activo }">
                <td class="mono">{{ p.codigo }}</td><td>{{ p.nombre }}</td><td class="mono">{{ p.dni || '—' }}</td><td>{{ p.area || '—' }}</td>
                <td class="tc"><input class="ds-input pl-hora" type="time" :value="p.hora_ingreso" @change="e => editar(p, { hora_ingreso: e.target.value })" /></td>
                <td class="tc"><input class="ds-input pl-hora" type="time" :value="p.hora_salida" @change="e => editar(p, { hora_salida: e.target.value })" /></td>
                <td class="tr mono">{{ puedeVerSueldos ? soles(p.sueldo_neto) : (p.tiene_sueldo ? '••••••' : 'sin sueldo') }}</td>
                <td class="tc"><input type="checkbox" :checked="p.activo" :aria-label="`Activo ${p.nombre}`" @change="e => editar(p, { activo: e.target.checked })" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import Swal from 'sweetalert2'
import { ServiceKeys } from '@/services'

const svc = inject(ServiceKeys.Planilla)
const toast = useToast()

const roles = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').roles || [] } catch { return [] } })()
// Solo una pista para la UI: quien decide es el backend (responde 403 sin TALENTO).
const puedeVerSueldos = roles.includes('TALENTO')

const TABS = [
  { key: 'planilla', label: 'Planilla del mes' },
  { key: 'asistencia', label: 'Asistencia y tardanzas' },
  { key: 'huellero', label: 'Importar huellero' },
  { key: 'personal', label: 'Personal' }
]
const tabsVisibles = TABS
const tab = ref(puedeVerSueldos ? 'planilla' : 'asistencia')

const hoy = new Date()
const periodo = ref(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)
const anioMes = computed(() => { const [a, m] = periodo.value.split('-').map(Number); return { anio: a, mes: m } })
const nombreMes = computed(() => new Date(anioMes.value.anio, anioMes.value.mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }))

const cargando = ref(false)
const filtro = ref('')
const calc = ref(null)
const asis = ref(null)
const personal = ref([])
const importaciones = ref([])
const abierto = ref(null)
const soloTardanzas = ref(true)
const exportando = ref(false)
const subiendo = ref(false)
const archivoHuellero = ref(null)
const previaHuellero = ref(null)
const archivoPersonal = ref(null)
const previaPersonal = ref(null)

const fmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const soles = n => (n === null || n === undefined ? '—' : fmt.format(n))
const fechaHora = d => (d ? new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const diaCorto = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' })
const errMsg = (e, def) => e?.response?.data?.message || e?.response?.data?.error || def

const coincide = (...campos) => {
  const q = filtro.value.toLowerCase()
  return !q || campos.some(c => String(c || '').toLowerCase().includes(q))
}
const trabajadoresFiltrados = computed(() => (calc.value?.trabajadores || []).filter(t => coincide(t.nombre, t.codigo, t.area)))
const asistenciaFiltrada = computed(() => (asis.value?.filas || [])
  .filter(a => !soloTardanzas.value || a.minutos_tardanza || a.justificado || !a.salida || !a.en_ficha)
  .filter(a => coincide(a.nombre, a.codigo, a.area)))
const personalFiltrado = computed(() => personal.value.filter(p => coincide(p.nombre, p.codigo, p.area, p.dni)))

async function cargar () {
  cargando.value = true
  const { anio, mes } = anioMes.value
  try {
    if (tab.value === 'planilla' && puedeVerSueldos) calc.value = await svc.calculo(anio, mes)
    if (tab.value === 'asistencia') asis.value = await svc.asistencia(anio, mes)
    if (tab.value === 'huellero') importaciones.value = await svc.importaciones()
    if (tab.value === 'personal') personal.value = (await svc.personal()).personal
  } catch (e) {
    toast.error(errMsg(e, 'No se pudo cargar la información.'))
  } finally {
    cargando.value = false
  }
}

watch([tab, periodo], () => { filtro.value = ''; cargar() })
onMounted(cargar)

async function exportar () {
  exportando.value = true
  try { await svc.exportar(anioMes.value.anio, anioMes.value.mes) } catch (e) { toast.error('No se pudo exportar.') } finally { exportando.value = false }
}

async function cerrar () {
  const ok = await Swal.fire({ title: `¿Cerrar la planilla de ${nombreMes.value}?`, text: 'No se podrán reimportar marcaciones ni justificar días de este mes hasta reabrirla.', icon: 'question', showCancelButton: true, confirmButtonText: 'Cerrar periodo', cancelButtonText: 'Cancelar' })
  if (!ok.isConfirmed) return
  try { await svc.cerrar(anioMes.value.anio, anioMes.value.mes); toast.success('Periodo cerrado.'); cargar() } catch (e) { toast.error(errMsg(e, 'No se pudo cerrar.')) }
}

async function reabrir () {
  const ok = await Swal.fire({ title: '¿Reabrir el periodo?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Reabrir', cancelButtonText: 'Cancelar' })
  if (!ok.isConfirmed) return
  try { await svc.reabrir(anioMes.value.anio, anioMes.value.mes); toast.success('Periodo reabierto.'); cargar() } catch (e) { toast.error(errMsg(e, 'No se pudo reabrir.')) }
}

async function justificar (a) {
  let motivo = null
  if (!a.justificado) {
    const r = await Swal.fire({
      title: `Justificar ${a.nombre}`,
      text: `${diaCorto(a.fecha)} · entrada ${a.entrada}`,
      input: 'select',
      inputOptions: { Permiso: 'Permiso', Comisión: 'Comisión de servicio', 'Descanso médico': 'Descanso médico', 'Falla del huellero': 'Falla del huellero', Otro: 'Otro' },
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      confirmButtonText: 'Justificar',
      cancelButtonText: 'Cancelar',
      inputValidator: v => (!v ? 'Elige un motivo' : null)
    })
    if (!r.isConfirmed) return
    motivo = r.value
  }
  try {
    await svc.justificar(a.asistencia_id, !a.justificado, motivo)
    toast.success(a.justificado ? 'Justificación quitada.' : 'Día justificado.')
    cargar()
  } catch (e) { toast.error(errMsg(e, 'No se pudo justificar.')) }
}

async function previsualizarHuellero () {
  subiendo.value = true
  try { previaHuellero.value = await svc.importarHuellero(archivoHuellero.value, false) } catch (e) { toast.error(errMsg(e, 'No se pudo leer el archivo.')) } finally { subiendo.value = false }
}

async function confirmarHuellero () {
  subiendo.value = true
  try {
    previaHuellero.value = await svc.importarHuellero(archivoHuellero.value, true)
    toast.success(`Se guardaron ${previaHuellero.value.dias} registro(s).`)
    importaciones.value = await svc.importaciones()
  } catch (e) { toast.error(errMsg(e, 'No se pudo importar.')) } finally { subiendo.value = false }
}

async function previsualizarPersonal () {
  subiendo.value = true
  try { previaPersonal.value = await svc.importarPersonal(archivoPersonal.value, anioMes.value, false) } catch (e) { toast.error(errMsg(e, 'No se pudo leer el archivo.')) } finally { subiendo.value = false }
}

async function confirmarPersonal () {
  subiendo.value = true
  try {
    previaPersonal.value = await svc.importarPersonal(archivoPersonal.value, anioMes.value, true)
    toast.success(`Se guardaron ${previaPersonal.value.total} trabajador(es).`)
    archivoPersonal.value = null
    cargar()
  } catch (e) { toast.error(errMsg(e, 'No se pudo guardar.')) } finally { subiendo.value = false }
}

async function editar (p, cambios) {
  try { await svc.actualizarPersonal(p.personal_id, cambios); Object.assign(p, cambios); toast.success('Actualizado.') } catch (e) { toast.error(errMsg(e, 'No se pudo actualizar.')) }
}
</script>

<style scoped>
.pl-mes { width: 170px; }
.ds-tabs { margin-bottom: 16px; }
.ds-kpis { margin-bottom: 16px; }
.ds-panel { margin-bottom: 16px; }
.ds-panel-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tr { text-align: right; }
.tc { text-align: center; }
.mono { font-variant-numeric: tabular-nums; }
.cell-main { font-weight: 600; }
.cell-sub { font-size: 12px; color: var(--ds-ink-2); }
.pl-fila { cursor: pointer; }
.pl-caret { font-size: 10px; width: 12px; color: var(--ds-ink-2); }
.pl-desc { color: var(--ds-bad); }
.pl-detalle td { background: var(--ds-soft-neutral); }
.pl-dias { display: flex; flex-wrap: wrap; gap: 6px; }
.pl-dia { font-size: 12px; padding: 3px 8px; border-radius: 6px; background: var(--ds-soft-ok); font-variant-numeric: tabular-nums; }
.pl-dia.tarde { background: var(--ds-soft-bad); }
.pl-dia.just { background: var(--ds-soft-warn); }
.pl-check { display: flex; gap: 6px; align-items: center; font-size: 13px; white-space: nowrap; }
.pl-hora { width: 110px; padding: 2px 6px; }
.pl-inactivo { opacity: 0.5; }
.pl-previa { margin-top: 14px; display: grid; gap: 10px; }
.summary-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.card-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.err-list { color: var(--ds-bad); font-size: 12.5px; }
.btn-sm { padding: 3px 10px; font-size: 12px; }
.dropzone { display: flex; align-items: center; gap: 12px; padding: 20px; border: 1.5px dashed var(--ds-line, #ccc); border-radius: 10px; cursor: pointer; }
.dropzone-has { border-style: solid; }
.dropzone-input { display: none; }
.dropzone-icon { font-size: 24px; color: var(--ds-accent); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
