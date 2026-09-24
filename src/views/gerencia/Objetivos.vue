<template>
  <div class="ds-page obj">
    <header class="ds-head">
      <div class="ds-head-titles">
        <span class="obj-breadcrumb">Gerencia</span>
        <h1 class="ds-title">Objetivos del mes</h1>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
      <div class="ds-head-actions">
        <!-- Paso de mes en vez de dos selects: se recorre el año sin abrir nada. -->
        <div class="obj-mes">
          <button type="button" class="obj-mes-paso" aria-label="Mes anterior" @click="moverMes(-1)">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <span class="obj-mes-label">{{ MESES[filtros.mes - 1] }} {{ filtros.anio }}</span>
          <button type="button" class="obj-mes-paso" aria-label="Mes siguiente" @click="moverMes(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        <button class="btn-exec btn-exec-outline obj-icono" type="button" title="Actualizar datos"
                :disabled="cargando" @click="cargar">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': cargando }" aria-hidden="true"></i>
        </button>
        <template v-if="pendientes.length">
          <button class="btn-exec btn-exec-outline" type="button" :disabled="guardando" @click="descartar">Descartar</button>
          <button class="btn-exec btn-exec-primary" type="button" :disabled="guardando" @click="guardar">
            <i class="fa-solid fa-check" aria-hidden="true"></i> {{ textoBoton }}
          </button>
        </template>
        <span v-else class="obj-guardado">
          <span class="obj-punto" :class="{ ok: guardadoA }" aria-hidden="true"></span>
          {{ guardadoA ? `Guardado a las ${guardadoA}` : 'Sin cambios' }}
        </span>
      </div>
    </header>

    <nav class="obj-tabs" aria-label="Secciones de Objetivos">
      <button v-for="t in TABS" :key="t.clave" type="button"
              class="obj-tab" :class="{ 'is-active': tab === t.clave }" @click="tab = t.clave">
        {{ t.label }}
      </button>
    </nav>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <p v-if="tab === 'objetivos' && !puedeEditarTodo" class="ds-alert neutro">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      Editas el objetivo de <strong>ventas</strong> en tus canales: <strong>Com</strong> y <strong>Otros</strong>.
      Se guarda al instante; el resto de la tabla es solo lectura.
    </p>

    <p v-if="tab === 'objetivos' && !sinLimiteDeFecha && editableDesde" class="ds-alert neutro">
      <i class="fa-solid fa-lock" aria-hidden="true"></i>
      Solo se editan las ediciones que empiecen desde el <strong>{{ fecha(editableDesde) }}</strong>.
      Las que arrancan antes ya están en venta y su objetivo queda cerrado.
    </p>

    <template v-if="tab === 'objetivos'">
      <section class="obj-avance">
        <div class="obj-avance-head">
          <h2 class="obj-h2">Avance vs objetivo</h2>
          <span class="ds-panel-hint">{{ textoCorte }}</span>
        </div>
        <div class="ds-panel obj-medidores">
          <article v-for="m in medidores" :key="m.titulo" class="obj-medidor">
            <div class="obj-medidor-head">
              <span class="obj-medidor-titulo">{{ m.titulo }}</span>
              <span class="ds-pill" :class="m.tono">{{ m.estado }}</span>
            </div>
            <div class="obj-medidor-cifra">
              <span class="obj-real">{{ formatValue(m.real, 'num') }}</span>
              <span class="obj-obj-total">/ {{ formatValue(m.objetivo, 'num') }}</span>
              <span class="obj-pct">{{ formatValue(m.pct, 'pct') }}</span>
            </div>
            <div class="ds-track obj-barra">
              <i :style="{ width: m.ancho }"></i>
              <!-- La marca del ritmo esperado: sin ella el % no dice si va tarde. -->
              <span v-if="mesEnCurso" class="obj-ritmo" :style="{ left: m.ritmo }"></span>
            </div>
            <div class="obj-medidor-pie">
              <span>Avance real</span>
              <span v-if="mesEnCurso" class="obj-ritmo-txt">
                Ritmo esperado al día {{ corte.dia }}: {{ formatValue(m.esperado, 'num') }}
              </span>
            </div>
            <div class="obj-medidor-stats">
              <div><span class="ds-kpi-note">Faltan</span><strong>{{ formatValue(m.faltan, 'num') }}</strong></div>
              <div v-if="mesEnCurso">
                <span class="ds-kpi-note">Brecha vs ritmo</span>
                <strong :class="m.claseBrecha">{{ conSigno(m.brecha) }}</strong>
              </div>
              <div v-if="mesEnCurso">
                <span class="ds-kpi-note">Necesario por día</span><strong>{{ formatValue(m.porDia, 'num') }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div v-if="conteos['Sin plan']" class="ds-panel obj-avisoplan">
        <span class="obj-avisoplan-txt">
          <span class="obj-punto-aviso" aria-hidden="true"></span>
          <strong>{{ conteos['Sin plan'] }} de {{ filas.length }} ediciones</strong>
          <span class="obj-avisoplan-resto">no tienen objetivo asignado y no suman al total.</span>
        </span>
        <button type="button" class="obj-link" @click="filtro = 'Sin plan'">Revisar →</button>
      </div>

      <section class="ds-panel">
        <header class="ds-panel-head obj-panel-head">
          <div>
            <h3 class="ds-panel-title">Objetivos por edición</h3>
            <span class="ds-panel-hint">El OBJ se calcula como la suma de sus canales.</span>
          </div>
          <div class="obj-controles">
            <input v-model="busqueda" class="ds-input obj-buscar" type="search" placeholder="Buscar programa" aria-label="Buscar programa" />
            <div class="obj-segmento" role="group" aria-label="Filtrar ediciones">
              <button v-for="f in FILTROS" :key="f" type="button"
                      class="obj-seg" :class="{ 'is-active': filtro === f }" @click="filtro = f">
                {{ f }} <span class="obj-seg-num">{{ conteos[f] }}</span>
              </button>
            </div>
            <button type="button" class="btn-exec btn-exec-outline" @click="verCanales = !verCanales">
              {{ verCanales ? 'Ocultar canales' : 'Ver canales' }}
            </button>
          </div>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll obj-scroll">
            <table class="ds-table ds-table--lista obj-table">
              <thead>
                <tr>
                  <th rowspan="2" class="obj-sticky">Programa</th>
                  <th :colspan="1 + canalesVenta.length" class="obj-group obj-corte">Ventas</th>
                  <th :colspan="1 + canalesConsulta.length" class="obj-group obj-corte">Consultas</th>
                  <th rowspan="2" class="obj-corte">Origen</th>
                </tr>
                <tr>
                  <th class="num obj-obj obj-corte">OBJ</th>
                  <th v-for="c in canalesVenta" :key="`v-${c.clave}`" class="num obj-canal">{{ c.corto }}</th>
                  <th class="num obj-obj obj-corte">OBJ</th>
                  <th v-for="c in canalesConsulta" :key="`c-${c.clave}`" class="num obj-canal">{{ c.corto }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="cargando">
                  <tr v-for="n in 8" :key="n"><td :colspan="totalColumnas"><span class="ds-skel"></span></td></tr>
                </template>
                <tr v-else-if="!visibles.length">
                  <td :colspan="totalColumnas" class="ds-empty ds-empty--lista">No hay ediciones que coincidan.</td>
                </tr>
                <template v-else>
                  <tr v-for="f in visibles" :key="f.edition_id" :class="{ 'is-sin-plan': sinPlan(f) }">
                    <td class="obj-sticky obj-prog">
                      <span class="obj-prog-nombre">
                        {{ f.programa_abrev }}
                        <i v-if="cerrada(f)" class="fa-solid fa-lock obj-lock"
                           :title="`Empieza el ${fecha(f.inicio)}: fuera de la ventana de edición`" aria-hidden="true"></i>
                      </span>
                      <span class="obj-prog-inicio">Inicio {{ fecha(f.inicio) }}</span>
                    </td>

                    <td class="num obj-obj obj-corte" :class="{ 'is-cero': !total(f, 'ventas') }">{{ formatValue(total(f, 'ventas'), 'num') }}</td>
                    <td v-for="c in canalesVenta" :key="`v-${f.edition_id}-${c.clave}`" class="num">
                      <input v-if="editable(f, c, 'ventas')" v-model.number="f.canales[c.clave].ventas"
                             class="obj-meta" :class="{ 'is-tocada': tocada(f, c.clave, 'ventas'), 'es-cero': !f.canales[c.clave].ventas }"
                             type="number" min="0" :aria-label="`Ventas de ${c.nombre} en ${f.programa_abrev}`" />
                      <span v-else class="obj-fijo">{{ formatValue(f.canales[c.clave].ventas, 'num') }}</span>
                    </td>

                    <td class="num obj-obj obj-corte" :class="{ 'is-cero': !total(f, 'consultas') }">{{ formatValue(total(f, 'consultas'), 'num') }}</td>
                    <td v-for="c in canalesConsulta" :key="`c-${f.edition_id}-${c.clave}`" class="num">
                      <input v-if="editable(f, c, 'consultas')" v-model.number="f.canales[c.clave].consultas"
                             class="obj-meta" :class="{ 'is-tocada': tocada(f, c.clave, 'consultas'), 'es-cero': !f.canales[c.clave].consultas }"
                             type="number" min="0" :aria-label="`Consultas de ${c.nombre} en ${f.programa_abrev}`" />
                      <span v-else class="obj-fijo">{{ formatValue(f.canales[c.clave].consultas, 'num') }}</span>
                    </td>

                    <td class="obj-corte">
                      <button v-if="f.origen_meta === MODIFICADO" class="ds-pill info obj-origen obj-quien" type="button"
                              :title="`Modificado por ${f.editado_por || 'alguien'}: ver detalle`" @click="verQuien(f)">
                        <span class="obj-punto-pill" aria-hidden="true"></span>Modificado
                      </button>
                      <span v-else class="ds-pill obj-origen" :class="f.origen_meta ? 'info' : 'warn'">
                        <span class="obj-punto-pill" aria-hidden="true"></span>{{ ETIQUETA_ORIGEN[f.origen_meta] || 'Sin plan' }}
                      </span>
                    </td>
                  </tr>
                </template>
              </tbody>
              <tfoot v-if="!cargando && visibles.length">
                <tr>
                  <td class="obj-sticky">Total visible</td>
                  <td class="num obj-obj obj-corte">{{ formatValue(totalesVisibles.ventas, 'num') }}</td>
                  <td v-for="c in canalesVenta" :key="`tv-${c.clave}`" class="num">
                    {{ formatValue(totalCanal(c.clave, 'ventas'), 'num') }}
                  </td>
                  <td class="num obj-obj obj-corte">{{ formatValue(totalesVisibles.consultas, 'num') }}</td>
                  <td v-for="c in canalesConsulta" :key="`tc-${c.clave}`" class="num">
                    {{ formatValue(totalCanal(c.clave, 'consultas'), 'num') }}
                  </td>
                  <td class="obj-corte"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </template>

    <!-- Pestaña Historial: todo cambio del objetivo, venga de donde venga -->
    <template v-if="tab === 'historial'">
      <div class="ds-kpis">
        <div v-for="s in resumenHistorial" :key="s.label" class="ds-kpi">
          <div class="ds-kpi-body">
            <span class="ds-kpi-label">{{ s.label }}</span>
            <span class="ds-kpi-value">{{ s.valor }}</span>
            <span class="ds-kpi-note">{{ s.nota }}</span>
          </div>
        </div>
      </div>

      <section class="ds-panel">
        <header class="ds-panel-head obj-panel-head">
          <div>
            <h3 class="ds-panel-title">Registro de cambios</h3>
            <span class="ds-panel-hint">Quién movió cada objetivo y cuánto. Lo más reciente arriba.</span>
          </div>
          <div class="obj-controles">
            <input v-model="busquedaHist" class="ds-input obj-buscar" type="search" placeholder="Programa o edición" aria-label="Buscar en el historial" />
            <div class="obj-segmento" role="group" aria-label="Filtrar por origen">
              <button v-for="f in FILTROS_HIST" :key="f.clave" type="button"
                      class="obj-seg" :class="{ 'is-active': filtroHist === f.clave }" @click="filtroHist = f.clave">
                {{ f.label }}
              </button>
            </div>
          </div>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Programa</th>
                  <th class="num">Obj. ventas</th>
                  <th class="num">Obj. consultas</th>
                  <th>Origen</th>
                  <th>Quién</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="cargando">
                  <tr v-for="n in 6" :key="n"><td colspan="6"><span class="ds-skel"></span></td></tr>
                </template>
                <tr v-else-if="!gruposHistorial.length">
                  <td colspan="6" class="ds-empty ds-empty--lista">No hay cambios que coincidan.</td>
                </tr>
                <template v-for="g in gruposHistorial" v-else :key="g.dia">
                  <tr class="obj-dia">
                    <td colspan="6">{{ g.label }} <span class="obj-dia-num">· {{ g.items.length }} cambios</span></td>
                  </tr>
                  <tr v-for="(h, i) in g.items" :key="`${h.edition_id}-${h.fecha}-${i}`">
                    <td class="obj-salto">{{ hora(h.fecha) }}</td>
                    <td>
                      <span class="obj-prog-nombre">{{ h.programa }}</span>
                      <span class="obj-prog-inicio">Edición {{ h.codigo }}</span>
                    </td>
                    <td class="num obj-salto" v-html="salto(h.ventas_antes, h.ventas_despues)"></td>
                    <td class="num obj-salto" v-html="salto(h.consultas_antes, h.consultas_despues)"></td>
                    <td><span class="ds-pill" :class="TONO_ORIGEN[h.origen]">{{ ETIQUETA_ORIGEN[h.origen] || h.origen }}</span></td>
                    <td>
                      <span class="obj-autor">
                        <span class="obj-inicial" aria-hidden="true">{{ iniciales(h.autor) }}</span>{{ h.autor || '—' }}
                      </span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <!-- Quién movió este objetivo. Los cambios salen del historial ya cargado en
         la página: no hace falta ir al servidor para abrirlo. -->
    <BaseModal v-model="mostrarQuien" :title="detalle.titulo" size="md">
      <div class="obj-quien-body">
        <p class="obj-quien-lead">
          Lo modificó <strong>{{ detalle.autor }}</strong>
          <template v-if="detalle.cuando"> el <strong>{{ detalle.cuando }}</strong></template>.
          Mientras siga marcado así, una recarga de los parámetros no lo toca.
        </p>
        <table v-if="detalle.cambios.length" class="ds-table ds-table--lista">
          <thead>
            <tr><th>Cuándo</th><th class="num">Ventas</th><th class="num">Consultas</th><th>Quién</th></tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in detalle.cambios" :key="i">
              <td class="obj-salto">{{ cuando(h.fecha) }}</td>
              <td class="num obj-salto" v-html="salto(h.ventas_antes, h.ventas_despues)"></td>
              <td class="num obj-salto" v-html="salto(h.consultas_antes, h.consultas_despues)"></td>
              <td>{{ h.autor || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="ds-sub">
          No hay líneas de historial para esta edición: se modificó antes de que empezara a registrarse.
        </p>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, getCurrentInstance } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'
import { formatValue } from '@/shared/lib/formatValue'
import BaseModal from '@/components/BaseModal.vue'

const dashboardService = inject(ServiceKeys.Dashboard)
const toast = useToast()
const { proxy } = getCurrentInstance()

// Gerencia mueve cualquier cifra. El líder comercial también guarda directo,
// pero solo las VENTAS de sus dos canales: el backend le recorta el cambio a eso
// mismo, así que esconder el resto de campos es coherencia, no seguridad.
const puedeEditarTodo = proxy.$hasRole(['ADMIN', 'GERENCIA'])
const CANALES_DEL_LIDER = ['COMERCIAL', 'OTROS']
// La ventana de edición no aplica a ADMIN: es quien corrige un error en una
// edición que ya arrancó. El backend aplica la misma excepción; esto solo evita
// mostrar campos que el servidor va a rechazar. Si el backend manda
// `editable_desde` en null (ventana suspendida) no hay candado para nadie.
const sinLimiteDeFecha = proxy.$hasRole(['ADMIN'])

const TABS = [
  { clave: 'objetivos', label: 'Objetivos' },
  { clave: 'historial', label: 'Historial' }
]
// Los dos orígenes posibles de un objetivo: lo trajo el estándar de
// Gerencia > Parámetros, o alguien lo movió a mano y desde entonces manda él.
// 'GERENCIA' es el valor que guarda la BD; la pantalla lo llama "Modificado"
// porque también lo deja así el líder comercial.
const MODIFICADO = 'GERENCIA'
const ETIQUETA_ORIGEN = { PLAN: 'Parámetros', GERENCIA: 'Modificado' }
const TONO_ORIGEN = { PLAN: '', GERENCIA: 'info' }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// Los meses de campaña. El estándar tiene una cifra distinta para cada temporada,
// así que decirlo evita comparar contra la columna equivocada.
const MESES_ALTOS = new Set([1, 2, 3, 7])

const FILTROS = ['Todas', 'Sin plan', 'Editadas']
const FILTROS_HIST = [
  { clave: 'TODOS', label: 'Todos' },
  { clave: 'PLAN', label: 'Parámetros' },
  { clave: 'GERENCIA', label: 'Modificado' }
]

// El plan reparte las ventas en cuatro canales y las consultas en tres: la
// consulta WEB no existe como canal propio (una visita web no deja consulta).
const CANALES_VENTA = [
  { clave: 'MARKETING', corto: 'Mkt', nombre: 'Marketing' },
  { clave: 'COMERCIAL', corto: 'Com', nombre: 'Comercial' },
  { clave: 'WEB', corto: 'WEB', nombre: 'Web' },
  { clave: 'OTROS', corto: 'Otros', nombre: 'Otros' }
]
const CANALES_CONSULTA = CANALES_VENTA.filter((c) => c.clave !== 'WEB')
const TODAS_LAS_CLAVES = CANALES_VENTA.map((c) => c.clave)

const hoy = new Date()
// La pantalla abre en OCTUBRE y no en el mes en curso: el estándar de
// Gerencia > Parámetros arranca ahí (ene-sep son los objetivos que cargó
// Producto en su momento), así que abrir en el mes de hoy mostraría un mes que
// esta pantalla no gobierna. Las flechas llegan a cualquier otro.
const MES_POR_DEFECTO = 10
const filtros = reactive({ anio: hoy.getFullYear(), mes: MES_POR_DEFECTO })
const filas = ref([])
const historial = ref([])
const tab = ref('objetivos')
const editableDesde = ref('')
const originales = ref(new Map())
const busqueda = ref('')
const filtro = ref('Todas')
const verCanales = ref(true)
const busquedaHist = ref('')
const filtroHist = ref('TODOS')
const guardadoA = ref('')
const mostrarQuien = ref(false)
const filaEnDetalle = ref(null)
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')

const canalesVenta = computed(() => (verCanales.value ? CANALES_VENTA : []))
const canalesConsulta = computed(() => (verCanales.value ? CANALES_CONSULTA : []))

// Una edición queda cerrada si empieza antes de la ventana. Las fechas se
// comparan como texto ISO (YYYY-MM-DD), que ordena igual que el calendario y no
// pasa por Date: armarlo en Lima corre el día hacia atrás.
const cerrada = (fila) => !sinLimiteDeFecha && !!editableDesde.value && String(fila.inicio).slice(0, 10) < editableDesde.value
const editable = (fila, canal, metrica) => !cerrada(fila) &&
  (puedeEditarTodo || (metrica === 'ventas' && CANALES_DEL_LIDER.includes(canal.clave)))

// El estándar no llega a todas las ediciones (programas nuevos, versiones que no
// existen en Parámetros). Se reconoce por el reparto por canal vacío, no por el
// OBJ en cero: hay ediciones con una meta vieja de Producto y ningún canal.
const sinPlan = (fila) => !fila.origen_meta || !Object.keys(fila.metas_canal || {}).length

// La fecha viene como timestamp y se corta en seco: armar un Date con ella en
// Lima corre el día hacia atrás (ver fechas-utc-en-lima).
const fecha = (valor) => {
  const iso = String(valor ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}` : '—'
}
const hora = (valor) => String(valor ?? '').slice(11, 16) || '—'
const cuando = (valor) => {
  const iso = String(valor ?? '')
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}` : '—'
}
const conSigno = (n) => (n > 0 ? `+${formatValue(n, 'num')}` : formatValue(n, 'num'))
const iniciales = (nombre) => String(nombre || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

// El OBJ no se edita: es la suma de sus canales. En el plan las dos cifras se
// declaraban por separado y llegaron a contradecirse (470 contra 329 en octubre);
// derivándolo, el total nunca puede desmentir al detalle.
const total = (fila, metrica) => TODAS_LAS_CLAVES.reduce((t, clave) => t + (fila.canales[clave]?.[metrica] || 0), 0)

// Un alta no tiene "antes": se muestra solo el valor nuevo en vez de "0 → 12",
// que haría parecer que alguien bajó de cero.
const salto = (antes, despues) => {
  if (despues === null || despues === undefined) return '—'
  if (antes === null || antes === undefined) return `<strong>${despues}</strong>`
  if (antes === despues) return String(despues)
  const sentido = despues > antes ? 'sube' : 'baja'
  const delta = `${despues > antes ? '+' : ''}${despues - antes}`
  return `<span class="obj-antes">${antes}</span> → <strong>${despues}</strong> <span class="obj-delta ${sentido}">${delta}</span>`
}

const tocada = (fila, clave, metrica) => originales.value.get(fila.edition_id)?.[clave]?.[metrica] !== fila.canales[clave][metrica]
const tieneCambios = (fila) => TODAS_LAS_CLAVES.some((c) => tocada(fila, c, 'ventas') || tocada(fila, c, 'consultas'))

// Solo se manda lo que cambió: guardar una fila la marca como modificada para
// siempre, así que reenviar las 60 del mes convertiría el mes entero en
// "modificado" y el estándar no volvería a alcanzarlo nunca.
const pendientes = computed(() => filas.value.filter((f) => !cerrada(f) && tieneCambios(f)))

const conteos = computed(() => ({
  Todas: filas.value.length,
  'Sin plan': filas.value.filter(sinPlan).length,
  Editadas: filas.value.filter(tieneCambios).length
}))

const visibles = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return filas.value.filter((f) => {
    if (texto && !`${f.programa_abrev} ${f.programa}`.toLowerCase().includes(texto)) return false
    if (filtro.value === 'Sin plan') return sinPlan(f)
    if (filtro.value === 'Editadas') return tieneCambios(f)
    return true
  })
})

// El pie suma lo VISIBLE, no el mes entero: con un filtro puesto, un total que
// no cuadra con las filas de arriba es la forma más rápida de desconfiar de todo.
const totalCanal = (clave, metrica) => visibles.value.reduce((t, f) => t + (f.canales[clave]?.[metrica] || 0), 0)

const totalesVisibles = computed(() => visibles.value.reduce((t, f) => ({
  ventas: t.ventas + total(f, 'ventas'),
  consultas: t.consultas + total(f, 'consultas')
}), { ventas: 0, consultas: 0 }))

const totalesDelMes = computed(() => filas.value.reduce((t, f) => ({
  ventas: t.ventas + total(f, 'ventas'),
  consultas: t.consultas + total(f, 'consultas'),
  vendidas: t.vendidas + (f.venta_cantidad || 0),
  consultasReales: t.consultasReales + (f.consultas_reales || 0)
}), { ventas: 0, consultas: 0, vendidas: 0, consultasReales: 0 }))

// Corte del mes elegido. El ritmo esperado solo tiene sentido en el mes EN CURSO:
// en uno cerrado el mes ya terminó y en uno futuro todavía no empezó, y en ambos
// una "brecha vs ritmo" sería una cifra sin significado.
const corte = computed(() => {
  const dias = new Date(filtros.anio, filtros.mes, 0).getDate()
  const enCurso = filtros.anio === hoy.getFullYear() && filtros.mes === hoy.getMonth() + 1
  const pasado = filtros.anio < hoy.getFullYear() || (filtros.anio === hoy.getFullYear() && filtros.mes < hoy.getMonth() + 1)
  return { dias, enCurso, dia: enCurso ? hoy.getDate() : pasado ? dias : 0 }
})
const mesEnCurso = computed(() => corte.value.enCurso)

const textoCorte = computed(() => (corte.value.enCurso
  ? `Corte al día ${corte.value.dia} de ${corte.value.dias} · quedan ${corte.value.dias - corte.value.dia} días`
  : `Mes completo · ${corte.value.dias} días`))

function medidor (titulo, real, objetivo) {
  const { dia, dias } = corte.value
  const esperado = Math.round(objetivo * (dia / dias))
  const faltan = Math.max(0, objetivo - real)
  const brecha = real - esperado
  const alDia = brecha >= 0
  const cerca = !alDia && real >= esperado * 0.7
  return {
    titulo,
    real,
    objetivo,
    esperado,
    faltan,
    brecha,
    pct: objetivo ? (real / objetivo) * 100 : 0,
    ancho: `${Math.min(100, objetivo ? (real / objetivo) * 100 : 0)}%`,
    ritmo: `${(dia / dias) * 100}%`,
    porDia: Math.ceil(faltan / Math.max(1, dias - dia)),
    estado: alDia ? 'En ritmo' : cerca ? 'Ligeramente abajo' : 'Por debajo del ritmo',
    tono: alDia ? 'ok' : cerca ? 'warn' : 'bad',
    claseBrecha: alDia ? 'es-ok' : 'es-bad'
  }
}

const medidores = computed(() => {
  const t = totalesDelMes.value
  return [medidor('Ventas', t.vendidas, t.ventas), medidor('Consultas', t.consultasReales, t.consultas)]
})

const temporada = computed(() => (MESES_ALTOS.has(filtros.mes) ? 'mes alto' : 'mes normal'))
const subtitulo = computed(() => `${filas.value.length} ediciones · ${MESES[filtros.mes - 1]} ${filtros.anio} · ${temporada.value}`)
const textoBoton = computed(() => (guardando.value ? 'Guardando…' : `Guardar ${pendientes.value.length} cambios`))

// Programa + los dos OBJ + sus canales + origen.
const totalColumnas = computed(() => 2 + canalesVenta.value.length + canalesConsulta.value.length + 2)

// ── Historial ───────────────────────────────────────────────────────────────

const historialVisible = computed(() => {
  const texto = busquedaHist.value.trim().toLowerCase()
  return historial.value.filter((h) => {
    if (filtroHist.value !== 'TODOS' && h.origen !== filtroHist.value) return false
    return !texto || `${h.programa} ${h.codigo}`.toLowerCase().includes(texto)
  })
})

const etiquetaDelDia = (iso) => {
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const legible = `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1].toLowerCase()}`
  return iso === hoyIso ? `Hoy · ${legible}` : legible
}

// Agrupado por día: un registro de cambios se lee por jornadas, no como una lista
// plana de 200 líneas donde ayer y hoy se confunden.
const gruposHistorial = computed(() => {
  const grupos = []
  for (const h of historialVisible.value) {
    const dia = String(h.fecha).slice(0, 10)
    let grupo = grupos.find((g) => g.dia === dia)
    if (!grupo) grupos.push(grupo = { dia, label: etiquetaDelDia(dia), items: [] })
    grupo.items.push(h)
  }
  return grupos
})

const resumenHistorial = computed(() => {
  const items = historial.value
  // Un alta no tiene "antes": cuenta como efecto cero, no como una subida desde
  // el vacío, que inflaría el neto con ediciones que nadie movió.
  const neto = (antes, despues) => items.reduce((t, h) => t + ((h[despues] ?? 0) - (h[antes] ?? h[despues] ?? 0)), 0)
  const ultimo = items[0]
  return [
    { label: 'Cambios', valor: formatValue(items.length, 'num'), nota: `En ${MESES[filtros.mes - 1].toLowerCase()} ${filtros.anio}` },
    { label: 'Ediciones tocadas', valor: formatValue(new Set(items.map((h) => h.edition_id)).size, 'num'), nota: `De ${filas.value.length} del mes` },
    { label: 'Efecto neto', valor: `${conSigno(neto('ventas_antes', 'ventas_despues'))} / ${conSigno(neto('consultas_antes', 'consultas_despues'))}`, nota: 'Ventas / consultas' },
    { label: 'Último cambio', valor: ultimo ? hora(ultimo.fecha) : '—', nota: ultimo ? `${fecha(ultimo.fecha)} · ${ultimo.autor || 'sin autor'}` : 'Todavía nadie movió nada' }
  ]
})

const detalle = computed(() => {
  const f = filaEnDetalle.value
  if (!f) return { titulo: '', autor: '', cuando: '', cambios: [] }
  return {
    titulo: `${f.programa_abrev} ${f.codigo}`,
    autor: f.editado_por || 'alguien sin registrar',
    cuando: f.editado_en ? cuando(f.editado_en) : '',
    cambios: historial.value.filter((h) => h.edition_id === f.edition_id)
  }
})

// ── Carga y guardado ────────────────────────────────────────────────────────

// El backend manda solo los canales con algo cargado; la grilla necesita las
// cuatro celdas siempre, o el v-model escribiría sobre un objeto inexistente.
const conTodosLosCanales = (metas) => Object.fromEntries(TODAS_LAS_CLAVES.map((clave) => [
  clave, { ventas: Number(metas?.[clave]?.ventas || 0), consultas: Number(metas?.[clave]?.consultas || 0) }
]))

function moverMes (paso) {
  const mes = filtros.mes + paso
  if (mes < 1) { filtros.mes = 12; filtros.anio -= 1 } else if (mes > 12) { filtros.mes = 1; filtros.anio += 1 } else { filtros.mes = mes }
  cargar()
}

function verQuien (fila) {
  filaEnDetalle.value = fila
  mostrarQuien.value = true
}

// Vuelve a lo guardado. El original se reconstruye con conTodosLosCanales, que
// devuelve objetos nuevos: entregar la referencia haría que editar la fila
// moviera también su propio "antes" y nada volvería a marcarse como cambiado.
function descartar () {
  for (const f of filas.value) f.canales = conTodosLosCanales(originales.value.get(f.edition_id))
}

async function cargar () {
  cargando.value = true
  error.value = ''
  try {
    const periodo = { year: filtros.anio, month_num: filtros.mes }
    const [datos, cambios] = await Promise.all([
      dashboardService.programGoalsList(periodo),
      dashboardService.goalHistoryList(periodo)
    ])
    filas.value = (datos.items || datos || []).map((f) => ({ ...f, canales: conTodosLosCanales(f.metas_canal) }))
    originales.value = new Map(filas.value.map((f) => [f.edition_id, conTodosLosCanales(f.canales)]))
    // El corte lo calcula Postgres y viaja con la lista: si el front lo calculara
    // por su cuenta, el candado de la pantalla y el del servidor podrían discrepar.
    editableDesde.value = datos.editable_desde || ''
    historial.value = cambios.items || []
  } catch (e) {
    console.error('No se pudieron cargar los objetivos del mes:', e)
    error.value = 'No se pudieron cargar los objetivos. Reintenta o avisa a sistemas.'
    filas.value = []
  } finally {
    cargando.value = false
  }
}

async function guardar () {
  guardando.value = true
  try {
    // revenue_goal viaja igual que vino: el objetivo de ingresos no sale del plan
    // y mandarlo en 0 lo borraría. Al líder comercial el backend le recorta el
    // envío a las ventas de sus canales, así que manda la fila entera igual.
    const goals = pendientes.value.map((f) => ({
      edition_num_id: f.edition_id,
      target_vacants: total(f, 'ventas'),
      target_revenue: f.meta_monto || 0,
      target_leads: total(f, 'consultas'),
      channel_goals: f.canales
    }))
    await dashboardService.saveProgramGoals({ goals })
    toast.success(goals.length === 1 ? 'Objetivo guardado' : `${goals.length} objetivos guardados`)
    guardadoA.value = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    await cargar()
  } catch (e) {
    console.error('Error guardando objetivos:', e)
    toast.error(e?.response?.data?.message || 'No se pudieron guardar los objetivos')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.obj-breadcrumb { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ds-ink-2); }
.obj-h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--ds-heading); }

/* Paso de mes: dos flechas y la etiqueta, como un control único. */
.obj-mes { display: flex; align-items: center; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface); }
.obj-mes-paso { width: 32px; height: 32px; border: 0; background: none; cursor: pointer; color: var(--ds-ink-2); }
.obj-mes-paso:hover { color: var(--ds-ink); background: var(--ds-surface-3); }
.obj-mes-label { min-width: 124px; text-align: center; font-size: 13px; font-weight: 600; color: var(--ds-ink); }
.obj-icono { padding-left: 10px; padding-right: 10px; }

.obj-guardado { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ds-ink-2); }
.obj-punto { width: 7px; height: 7px; border-radius: 50%; background: var(--ds-muted); }
.obj-punto.ok { background: var(--ds-ok); }

/* Pestañas: la activa se marca con la línea inferior, no con un fondo, para que
   no compitan con los paneles que vienen debajo. */
.obj-tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--ds-border); }
.obj-tab { padding: 9px 2px; border: 0; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--ds-ink-2); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.obj-tab:hover { color: var(--ds-ink); }
.obj-tab.is-active { color: var(--ds-heading); border-bottom-color: var(--ds-brand); }
.obj-tab:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }

/* ── Avance vs objetivo ─────────────────────────────────────────────────── */
.obj-avance { display: flex; flex-direction: column; gap: 10px; }
.obj-avance-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
/* .ds-panel es flex EN COLUMNA: sin este flex-direction el `flex-basis` de cada
   medidor se aplica al alto y los dos quedan apilados y larguísimos. */
.obj-medidores { display: flex; flex-direction: row; flex-wrap: wrap; padding: 0; }
.obj-medidor { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 12px; padding: 20px 22px; }
.obj-medidor + .obj-medidor { border-left: 1px solid var(--ds-border); }
/* Ya envueltos uno debajo del otro, el divisor va arriba y no al costado. */
@media (max-width: 760px) {
  .obj-medidor + .obj-medidor { border-left: 0; border-top: 1px solid var(--ds-border); }
}
.obj-medidor-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.obj-medidor-titulo { font-size: 11.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ds-ink-2); }
.obj-medidor-cifra { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.obj-real { font-size: 42px; line-height: 1; font-weight: 700; letter-spacing: -.03em; color: var(--ds-heading); }
.obj-obj-total { font-size: 16px; color: var(--ds-muted); }
.obj-pct { margin-left: auto; font-size: 22px; font-weight: 700; color: var(--ds-ink); }

.obj-barra { position: relative; overflow: visible; }
.obj-barra > i { background: var(--ds-brand); }
/* La marca del ritmo esperado a hoy: el % solo no dice si el mes va tarde. */
.obj-ritmo { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ds-warn); }
.obj-medidor-pie { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ds-muted); gap: 12px; }
.obj-ritmo-txt { color: var(--ds-warn-ink); }
.obj-medidor-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; padding-top: 14px; border-top: 1px solid var(--ds-border); }
.obj-medidor-stats div { display: flex; flex-direction: column; gap: 3px; }
.obj-medidor-stats strong { font-size: 18px; font-weight: 700; color: var(--ds-ink); }
.obj-medidor-stats .es-ok { color: var(--ds-ok-ink); }
.obj-medidor-stats .es-bad { color: var(--ds-bad-ink); }

/* Tarjeta, no bloque teñido: es un dato del mes que pide una acción, y teñir el
   ancho completo lo pone al nivel de un error. El color va en el punto.
   .ds-panel es flex EN COLUMNA, así que la fila hay que pedirla. */
.obj-avisoplan { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 18px; font-size: 13px; }
.obj-avisoplan-txt { display: inline-flex; align-items: center; gap: 8px; color: var(--ds-heading); font-weight: 700; }
.obj-avisoplan-resto { color: var(--ds-ink-2); font-weight: 400; }
.obj-punto-aviso { width: 7px; height: 7px; border-radius: 50%; background: var(--ds-warn); }
.obj-link { border: 0; background: none; padding: 0; font: inherit; font-weight: 700; color: var(--ds-heading); cursor: pointer; }
.obj-link:hover { text-decoration: underline; }

/* ── Tabla ──────────────────────────────────────────────────────────────── */
.obj-panel-head { align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.obj-controles { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.obj-buscar { width: auto; min-width: 190px; }

/* Segmentado: tres estados excluyentes con su conteo. Ocupa menos que tres
   casillas y deja ver de un vistazo cuántas ediciones caen en cada uno. */
.obj-segmento { display: flex; gap: 2px; padding: 3px; background: var(--ds-surface-3); border-radius: var(--ds-radius-sm); }
.obj-seg { height: 28px; padding: 0 11px; border: 0; border-radius: var(--ds-radius-control); background: none; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }
.obj-seg.is-active { background: var(--ds-surface); color: var(--ds-heading); }
.obj-seg-num { opacity: .6; font-weight: 500; }

.obj-scroll { max-height: 640px; }
.obj-lock { color: var(--ds-muted); font-size: 10px; margin-left: 4px; }

/* Cabecera de dos niveles: el grupo arriba y sus canales debajo. Así se lee
   "estos cuatro números reparten este OBJ". Los dos grupos se separan con una
   línea vertical (.obj-corte) y no con color: el color en la cabecera compite
   con los datos, que es lo que hay que mirar. */
/* La banda va en el tinte de marca y no en gris: --ds-surface-2/3 es el gris de
   campo inerte y deshabilitado del sistema, y sobre una tabla entera se lee como
   "esto no se toca". Ventas y Consultas comparten tinte a propósito: distinguir
   las dos con colores distintos las convertiría en estados (verde = bien), que
   aquí no significan nada. Lo que las separa es el divisor y el rótulo. */
.obj-group { text-align: center; background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.obj-canal { background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 500; }
/* Divisor entre Programa | Ventas | Consultas | Origen. */
.obj-corte { border-left: 1px solid var(--ds-border); }

/* Aquí la cifra va CENTRADA y no a la derecha como en el resto del ERP: cada
   columna es un canal de una o dos cifras, no una lista de montos que se lea
   alineando unidades, y el input de al lado ya está centrado. */
.obj-table .num { text-align: center; }

/* El OBJ es el total de su banda: mismo tinte y negrita, sin invertir a navy. */
.obj-table thead .obj-obj { background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 800; }
.obj-table tbody .obj-obj,
.obj-table tfoot .obj-obj { font-size: 14px; font-weight: 800; color: var(--ds-heading); background: var(--ds-soft-info); }
.obj-table tbody .obj-obj.is-cero { color: var(--ds-muted); }

/* El campo no se dibuja como un input de formulario: es una celda rellena que se
   escribe. Con 7 por fila, siete bordes marcados serían una reja. */
.obj-meta {
  width: 50px; height: 30px; box-sizing: border-box; text-align: center;
  border: 1px solid transparent; border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-3); color: var(--ds-ink);
  font: inherit; font-size: 13px; outline: none;
}
.obj-meta:focus { border-color: var(--ds-accent); background: var(--ds-surface); }
.obj-meta.es-cero { color: var(--ds-muted); }
/* Celda cambiada y sin guardar: se marca la celda, no la fila entera, para ver
   exactamente qué número se movió. */
.obj-meta.is-tocada { border-color: var(--ds-warn); background: var(--ds-soft-warn); color: var(--ds-ink); }
/* Celda que este rol no puede tocar: se lee, pero no aparenta ser un campo. */
.obj-fijo { color: var(--ds-ink-2); }

/* El punto le da color propio al origen sin teñir la píldora entera. */
.obj-origen { height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.obj-punto-pill { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.obj-prog-nombre { display: block; font-weight: 600; white-space: nowrap; }
.obj-prog-inicio { display: block; font-size: 11.5px; color: var(--ds-muted); }
.obj-salto { white-space: nowrap; }

/* El programa se queda a la vista mientras se recorren los siete canales. */
.obj-sticky { position: sticky; left: 0; z-index: 1; background: var(--ds-surface); }
tr.is-sin-plan td,
tr.is-sin-plan .obj-sticky { background: var(--ds-soft-warn); }

.obj-table tfoot td { font-weight: 700; border-top: 2px solid var(--ds-border-strong); background: var(--ds-surface-2); }

/* ── Historial ──────────────────────────────────────────────────────────── */
.obj-dia td { font-size: 11.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ds-ink-2); background: var(--ds-surface-2); }
.obj-dia-num { font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--ds-muted); }
.obj-autor { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.obj-inicial { width: 26px; height: 26px; border-radius: 50%; background: var(--ds-brand); color: var(--ds-on-brand); font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }

/* La píldora de "Modificado" es un botón: se abre para decir quién fue. */
.obj-quien { border: 0; cursor: pointer; font: inherit; }
.obj-quien i { font-size: 9px; opacity: .7; }
.obj-quien-body { padding: 4px 2px; }
.obj-quien-lead { margin-bottom: 14px; color: var(--ds-ink); }
</style>

<style>
/* El salto "antes → después" se pinta con v-html, así que sus clases no pueden
   ser scoped; van acotadas por .obj para no filtrarse a otras vistas. */
.obj .obj-antes { color: var(--ds-muted); }
.obj .obj-delta { font-size: 11px; font-weight: 700; }
.obj .obj-delta.sube { color: var(--ds-ok-ink); }
.obj .obj-delta.baja { color: var(--ds-bad-ink); }
</style>
