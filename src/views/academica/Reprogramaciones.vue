<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Reprogramaciones</h1>
        <p class="ds-sub">
          Alumnos varados porque su edición —o la del paquete que compraron— se canceló.
          Una fila por venta: los módulos viajan con ella.
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="cargando" @click="cargar">
          <i class="fa-solid fa-rotate" :class="{ 'fa-spin': cargando }" aria-hidden="true"></i> Actualizar
        </button>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tono" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">
              <span v-if="cargando" class="skel-kpi"></span>
              <template v-else>{{ formatValue(k.valor, 'num') }}</template>
            </span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.pie }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿A quién falta reubicar?</h3>
        <span class="ds-panel-hint">{{ filas.length }} resultados</span>
      </header>

      <div class="ds-panel-body">
        <div class="filtros">
          <div class="ds-tabs" role="group" aria-label="Filtrar por estado">
            <button
              v-for="e in chips"
              :key="e.key"
              type="button"
              :aria-pressed="String(filtroEstado === e.key)"
              @click="filtroEstado = e.key"
            >
              {{ e.label }} <span class="cuenta">{{ e.cuenta }}</span>
            </button>
          </div>
          <input
            v-model="busqueda"
            class="ds-input buscador"
            type="search"
            aria-label="Buscar por alumno, DNI o programa"
            placeholder="Buscar por alumno, DNI o programa…"
          />
        </div>

        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Contacto</th>
                <th>Compró</th>
                <th>Se le canceló</th>
                <th>Destino</th>
                <th>Estado</th>
                <th class="num">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="cargando">
                <tr v-for="n in 5" :key="'s' + n">
                  <td colspan="7"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <tr v-else-if="!filas.length">
                <td colspan="7" class="ds-empty ds-empty--lista">
                  Sin alumnos varados con este filtro. Elige «Todos» o borra la búsqueda para ver más.
                </td>
              </tr>
              <template v-else>
                <tr v-for="f in filas" :key="f.enrollment_id">
                  <td>
                    <span class="linea">{{ f.apellidos }}, {{ f.nombres }}</span>
                    <span class="nota mono">{{ f.dni || '--' }} &middot; venta #{{ f.enrollment_id }}</span>
                  </td>
                  <td>
                    <span v-if="f.celular" class="linea"><i class="fa-solid fa-phone ico" aria-hidden="true"></i> {{ f.celular }}</span>
                    <span v-if="f.correo" class="nota">{{ f.correo }}</span>
                    <span v-if="!f.celular && !f.correo" class="nota">sin contacto</span>
                  </td>
                  <td>
                    <span class="linea fuerte">{{ f.programa }}</span>
                    <span class="nota"><span class="code">{{ f.edicion_codigo || 's/e' }}</span> {{ fecha(f.edicion_inicio) }}</span>
                  </td>
                  <td>
                    <div v-for="c in f.caidas" :key="c.edition_id" class="caida">
                      <span class="code bad">{{ c.codigo }}</span>
                      <span>{{ c.programa }}</span>
                      <span class="nota">{{ fecha(c.inicio) }}</span>
                      <span v-if="c.es_la_venta" class="ds-pill">la venta</span>
                    </div>
                  </td>
                  <td>
                    <template v-if="cierre(f)">
                      <span class="ds-pill" :class="cierre(f).tono">{{ cierre(f).pill }}</span>
                      <span class="nota">no se reubica</span>
                    </template>
                    <template v-else-if="f.dest_program_version_id">
                      <span class="linea fuerte">{{ f.destino_programa }}</span>
                      <span class="nota">
                        <span class="code">{{ f.destino_codigo || 's/e' }}</span> {{ fecha(f.destino_inicio) }}
                        <span class="ds-pill" :class="tonoDeKind(f.dest_kind)">{{ f.dest_kind }}</span>
                      </span>
                      <!-- Producto propone el destino al cancelar la edicion, pero no
                           hablo con el alumno: hasta que Academica confirme, esto es una
                           sugerencia y no una decision. -->
                      <span v-if="f.proposed_source === 'producto'" class="nota origen-producto">
                        <i class="fa-solid fa-lightbulb" aria-hidden="true"></i> propuesto por Producto &middot; falta confirmar
                      </span>
                    </template>
                    <span v-else class="nota">— sin elegir —</span>
                  </td>
                  <td>
                    <span class="ds-pill" :class="estadoTono(f)">{{ estadoLabel(f) }}</span>
                    <span v-if="f.pending_steps?.length" class="ds-pill bad pendientes">
                      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> {{ f.pending_steps.length }} pendiente(s)
                    </span>
                    <span v-if="pasoDe(f)" class="paso-hint">{{ pasoHint(pasoDe(f)) }}</span>
                  </td>
                  <td class="num">
                    <!-- Un solo botón: el paso que sigue (con tres iguales no se sabía cuál tocaba). -->
                    <div v-if="pasoDe(f)" class="acciones">
                      <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="ejecutarPaso(f)">
                        {{ pasoDe(f).label }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="pasoDe(f).accion !== 'destino'"
                        class="btn-exec btn-exec-ghost btn-sm"
                        type="button"
                        @click="abrirDestino(f)"
                      >Cambiar destino</button>
                    </div>
                    <span v-else class="sin-pasos">Listo</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Destino: Academica elige a donde va -->
    <BaseModal v-model="modalDestino" title="¿A dónde lo reubicamos?" size="lg">
      <div v-if="actual" class="modal-body">
        <div class="alumno-head">
          <span class="linea fuerte">{{ actual.apellidos }}, {{ actual.nombres }}</span>
          <span class="nota">compró {{ actual.programa }}</span>
        </div>

        <fieldset class="salidas">
          <legend class="ds-label">¿Qué hacemos con él?</legend>
          <label
            v-for="s in SALIDAS"
            :key="s.key"
            class="opcion"
            :class="[{ on: salida === s.key }, s.tono]"
          >
            <input v-model="salida" type="radio" :value="s.key" />
            <span>
              <span class="linea fuerte">{{ s.label }}</span>
              <span class="nota">{{ s.detalle }}</span>
            </span>
          </label>
        </fieldset>

        <template v-if="salida === 'reubicar'">
          <div class="ds-field">
            <label class="ds-label">Programa destino</label>
            <SearchSelect
              v-model="destProgramVersionId"
              mode="remote"
              :fetcher="buscarProgramas"
              :model-label="destProgramLabel"
              label-field="program_name"
              value-field="program_version_id"
              sublabel-field="version_code"
              placeholder="Mismo programa u otro..."
              @change="alCambiarPrograma"
            />
          </div>

          <p v-if="rpSinEdicion" class="ds-callout bad">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>
              <b>Este programa no tiene ediciones futuras.</b>
              Para reubicarlo hay que elegir <b>otro programa</b>, y eso lo convierte en un cambio de curso.
            </span>
          </p>
          <p v-else class="ds-callout" :class="esCambioDeCurso ? 'violet' : 'info'">
            <i class="fa-solid" :class="esCambioDeCurso ? 'fa-right-left' : 'fa-calendar-day'" aria-hidden="true"></i>
            <span>
              <b>{{ esCambioDeCurso ? 'Cambio de curso' : 'Reprogramación' }}</b> —
              {{ esCambioDeCurso
                ? 'el destino es otro programa, se cobra al mismo neto ya pagado.'
                : 'misma malla, el alumno conserva su plan de cuotas.' }}
            </span>
          </p>

          <div class="ds-field">
            <label class="ds-label" for="rp-edicion">Edición destino</label>
            <select id="rp-edicion" v-model="destEditionId" class="ds-input" :disabled="cargandoEdiciones || !ediciones.length">
              <option :value="null">{{ etiquetaEdicionVacia }}</option>
              <option v-for="ed in ediciones" :key="ed.edition_num_id" :value="ed.edition_num_id">
                {{ ed.specific_code }} &middot; {{ fecha(ed.start_date) }}
              </option>
            </select>
          </div>
        </template>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="modalDestino = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!puedeGuardarDestino" @click="guardarDestino">
          {{ salidaActual.accion }}
        </button>
      </template>
    </BaseModal>

    <BaseModal v-model="modalContacto" title="Alumno contactado" size="md">
      <div v-if="actual" class="modal-body">
        <div class="alumno-head">
          <span class="linea fuerte">{{ actual.apellidos }}, {{ actual.nombres }}</span>
          <span class="nota">{{ actual.celular || 'sin celular' }} &middot; {{ actual.correo || 'sin correo' }}</span>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="rp-nota-contacto">¿Qué dijo?</label>
          <textarea id="rp-nota-contacto" v-model="notaContacto" class="ds-input" rows="4" placeholder="Aceptó pasar a la edición de octubre..."></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="modalContacto = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="guardando" @click="guardarContacto">Marcar contactado</button>
      </template>
    </BaseModal>

    <BaseModal v-model="modalVeredicto" title="Veredicto FICO" size="md">
      <div v-if="actual" class="modal-body">
        <div class="alumno-head">
          <span class="linea fuerte">{{ actual.apellidos }}, {{ actual.nombres }}</span>
          <span class="nota">{{ tipoDeCaso(actual) }}</span>
        </div>

        <p v-if="cierre(actual)" class="ds-callout" :class="cierre(actual).tono">
          <i class="fa-solid" :class="cierre(actual).icono" aria-hidden="true"></i>
          <span>
            <b>{{ cierre(actual).titulo }}</b>
            {{ cierre(actual).detalle }}
          </span>
        </p>

        <div v-else class="salto">
          <div class="salto-lado">
            <span class="nota">De</span>
            <span class="linea fuerte">{{ actual.programa }}</span>
            <span class="nota"><span class="code">{{ actual.edicion_codigo || 's/e' }}</span> {{ fecha(actual.edicion_inicio) }}</span>
          </div>
          <i class="fa-solid fa-arrow-right flecha" aria-hidden="true"></i>
          <div class="salto-lado">
            <span class="nota">A</span>
            <span class="linea fuerte">{{ actual.destino_programa }}</span>
            <span class="nota"><span class="code">{{ actual.destino_codigo || 's/e' }}</span> {{ fecha(actual.destino_inicio) }}</span>
          </div>
        </div>

        <blockquote v-if="actual.contact_notes" class="cita">“{{ actual.contact_notes }}”</blockquote>

        <!-- FICO firma con el saldo a la vista: la RP arrastra las cuotas pendientes
             al destino, el CC no, y en los dos casos el plan se ajusta desde FICO. -->
        <div class="cuotas">
          <div>
            <span class="nota">Cuotas pendientes</span>
            <span class="linea fuerte">{{ cuotas.cantidad }} cuota(s) &middot; {{ soles(cuotas.monto) }}</span>
          </div>
          <a class="btn-exec btn-exec-outline btn-sm" :href="linkFico(actual.enrollment_id)" target="_blank" rel="noopener">
            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar cuotas en FICO
          </a>
        </div>

        <p v-if="!cierre(actual) && !cuotas.cantidad" class="ds-callout warn">
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          <span>
            Esta venta no tiene cuotas por pagar: el destino nace al contado. Si el alumno necesita
            un plan de cuotas, ármaselo en FICO después de mover.
          </span>
        </p>

        <p v-if="!cierre(actual)" class="ds-callout warn">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            Aceptar mueve la inscripción en el ERP, lo inscribe en el aula nueva de Odoo, lo saca de
            la vieja y le manda el correo. Lo que falle queda anotado como pendiente manual.
          </span>
        </p>

        <div class="ds-field">
          <label class="ds-label" for="rp-nota-veredicto">Nota del veredicto</label>
          <textarea id="rp-nota-veredicto" v-model="notaVeredicto" class="ds-input" rows="3"></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="guardando" @click="rechazar">Rechazar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="guardando" @click="aceptar">
          {{ guardando ? 'Ejecutando…' : (cierre(actual)?.accion || 'Aceptar y mover') }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { siguientePaso, pasoHint } from '@/features/reprogramaciones/siguientePaso'

const servicio = inject(ServiceKeys.Reprogramacion)
const programas = inject(ServiceKeys.Program)
const toast = useToast()
const router = useRouter()

// Las tres cosas que Academica puede decidir. 'reubicar' es la de siempre; las
// otras dos cierran el caso sin mandarlo a ningun programa nuevo.
const SALIDAS = [
  {
    key: 'reubicar',
    label: 'Reubicarlo',
    detalle: 'Se va a otra edición del mismo programa, o a otro programa.',
    accion: 'Guardar destino',
    tono: ''
  },
  {
    key: 'reserva',
    label: 'Reservar vacante',
    detalle: 'Se retira de la edición pero su dinero se queda a su favor hasta que se vuelva a inscribir.',
    accion: 'Marcar vacante reservada',
    tono: 'info'
  },
  {
    key: 'reembolso',
    label: 'Reembolso',
    detalle: 'No se le quita nada: solo queda registrado en el historial que se le devolvió su dinero.',
    accion: 'Marcar reembolso',
    tono: 'bad'
  }
]

// dest_kind lo deriva el backend. Estos dos cierran el caso sin destino.
const CIERRES = {
  RF: {
    pill: 'Reembolso',
    hecho: 'Reembolsado',
    tono: 'bad',
    icono: 'fa-hand-holding-dollar',
    titulo: 'El alumno pidió reembolso.',
    detalle: 'Aceptar NO toca la inscripción ni Odoo: la venta se queda como está y el caso solo deja constancia en el historial de que se le devolvió su dinero.',
    accion: 'Aprobar reembolso'
  },
  RV: {
    pill: 'Vacante reservada',
    hecho: 'Vacante reservada',
    tono: 'info',
    icono: 'fa-bookmark',
    titulo: 'El alumno reserva su vacante.',
    detalle: 'Aceptar lo retira de la edición: se le cancelan las cuotas pendientes, salen sus módulos y se lo saca del aula en Odoo. Sin devolución — su pago queda a su favor hasta que se vuelva a inscribir.',
    accion: 'Reservar vacante'
  }
}
const cierre = f => CIERRES[f?.dest_kind] || null
const SALIDA_POR_KIND = { RV: 'reserva', RF: 'reembolso' }

// La RP se queda en la misma malla (info); el CC cambia de programa (violeta).
const TONO_POR_KIND = { RP: 'info', CC: 'violet' }
const tonoDeKind = kind => TONO_POR_KIND[kind] || 'violet'

// tono '' = pill neutra (el gris por defecto de .ds-pill).
const ESTADOS = [
  { key: 'detectado',  label: 'Sin tomar',   tono: '' },
  { key: 'propuesto',  label: 'Con destino', tono: 'info' },
  { key: 'contactado', label: 'Contactado',  tono: 'warn' },
  { key: 'aceptado',   label: 'Reubicado',   tono: 'ok' },
  { key: 'rechazado',  label: 'Rechazado',   tono: 'bad' },
  { key: 'cerrado',    label: 'Cerrado',     tono: '' }
]

const casos = ref([])
const cargando = ref(false)
const guardando = ref(false)
const busqueda = ref('')
const filtroEstado = ref('')

const actual = ref(null)
const modalDestino = ref(false)
const modalContacto = ref(false)
const modalVeredicto = ref(false)
const destProgramVersionId = ref(null)
// El SearchSelect remoto no tiene de donde sacar el nombre de un id que le
// llega ya elegido: sin esto pinta el id crudo ("86") en vez del programa.
const destProgramLabel = ref('')
const destEditionId = ref(null)
const salida = ref('reubicar')
const ediciones = ref([])
const cargandoEdiciones = ref(false)
const notaContacto = ref('')
const notaVeredicto = ref('')

// Sin fila en la BD el caso existe igual: es un afectado que nadie tomo.
const estadoDe = f => f.status || 'detectado'
const pasoDe = f => siguientePaso({ status: f.status, tieneDestino: Boolean(f.dest_program_version_id || cierre(f)) })
const ABRIR_PASO = { destino: f => abrirDestino(f), contactar: f => abrirContacto(f), veredicto: f => abrirVeredicto(f) }
const ejecutarPaso = f => ABRIR_PASO[pasoDe(f).accion](f)
// Un caso cerrado sin destino no es un "Reubicado": el alumno no se movio.
const estadoLabel = f => (cierre(f) && estadoDe(f) === 'aceptado')
  ? cierre(f).hecho
  : (ESTADOS.find(e => e.key === estadoDe(f))?.label || estadoDe(f))
const estadoTono = f => ESTADOS.find(e => e.key === estadoDe(f))?.tono || ''

const tipoDeCaso = f => cierre(f)?.pill
  || (f.dest_kind === 'RP' ? 'Reprogramación' : 'Cambio de curso')

// Con centimos a proposito: FICO firma contra el saldo exacto de las cuotas y
// formatValue('soles') redondea a soles enteros.
const soles = v => `S/ ${Number(v || 0).toFixed(2)}`
const linkFico = id => router.resolve({ name: 'enrollmentDetail', params: { id } }).href

const esCambioDeCurso = computed(() =>
  !!destProgramVersionId.value && !!actual.value &&
  Number(destProgramVersionId.value) !== Number(actual.value.program_version_id))

// Quedarse en el mismo programa sin edicion a la que ir no es reprogramable:
// misma regla que valida el backend, para no dejar guardar algo que va a fallar.
const rpSinEdicion = computed(() =>
  !!destProgramVersionId.value && !esCambioDeCurso.value &&
  !cargandoEdiciones.value && !ediciones.value.length)

const salidaActual = computed(() =>
  SALIDAS.find(s => s.key === salida.value) || SALIDAS[0])

const puedeGuardarDestino = computed(() => {
  if (guardando.value) return false
  // Solo la reubicacion necesita un destino valido; las otras dos se guardan solas.
  if (salida.value !== 'reubicar') return true
  // RP en el mismo programa exige edicion (resolveDestKind del backend).
  return !!destProgramVersionId.value && !rpSinEdicion.value &&
    (esCambioDeCurso.value || !!destEditionId.value)
})

// El backend manda el conteo con la MISMA regla que usa la RP para trasladarlas.
const cuotas = computed(() => actual.value?.cuotas_pendientes || { cantidad: 0, monto: 0 })

const etiquetaEdicionVacia = computed(() => {
  if (cargandoEdiciones.value) return 'Cargando ediciones...'
  if (!destProgramVersionId.value) return 'Elegir programa primero'
  return ediciones.value.length ? 'Elegir edición...' : 'Sin ediciones futuras'
})

const filas = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return casos.value.filter(f => {
    if (filtroEstado.value && estadoDe(f) !== filtroEstado.value) return false
    if (!q) return true
    return [f.nombres, f.apellidos, f.dni, f.programa].some(v => (v || '').toLowerCase().includes(q))
  })
})

const cuenta = key => casos.value.filter(f => estadoDe(f) === key).length

const chips = computed(() => [
  { key: '', label: 'Todos', cuenta: casos.value.length },
  ...ESTADOS.map(e => ({ ...e, cuenta: cuenta(e.key) })).filter(e => e.cuenta > 0)
])

const kpis = computed(() => [
  { key: 'total', label: 'Alumnos varados', valor: casos.value.length, pie: 'una fila por venta', tono: 'bad', icon: 'fa-user-slash' },
  { key: 'detectado', label: 'Sin destino aún', valor: cuenta('detectado'), pie: 'esperan a Académica', tono: '', icon: 'fa-inbox' },
  { key: 'contactado', label: 'Esperando FICO', valor: cuenta('contactado'), pie: 'ya contactados', tono: 'warn', icon: 'fa-hourglass-half' },
  { key: 'aceptado', label: 'Reubicados', valor: cuenta('aceptado'), pie: 'movidos en el ERP', tono: 'ok', icon: 'fa-circle-check' }
])

function fecha (d) {
  if (!d) return '--'
  const [y, m, dd] = String(d).slice(0, 10).split('-')
  return y ? `${dd}/${m}/${y.slice(2)}` : '--'
}

async function cargar () {
  cargando.value = true
  try {
    casos.value = await servicio.list()
  } catch (e) {
    toast.error('No se pudo cargar la bandeja')
    console.error(e)
  } finally {
    cargando.value = false
  }
}

// El caller filtra por 'q' (no 'search'): con la clave equivocada devuelve el
// catalogo entero y el buscador parece roto. Solo versiones activas: mandar a un
// alumno a un programa dado de baja seria repetir el problema.
const buscarProgramas = termino => programas.programVersionCaller({ q: termino, active: 'Y' })

async function cargarEdiciones () {
  ediciones.value = []
  if (!destProgramVersionId.value) return
  cargandoEdiciones.value = true
  try {
    ediciones.value = await servicio.destinations(destProgramVersionId.value)
  } catch (e) {
    toast.error('No se pudieron cargar las ediciones destino')
    console.error('Reprogramaciones: ediciones destino', e)
  } finally {
    cargandoEdiciones.value = false
  }
}

// El evento trae la fila cruda del fetcher (o null si limpiaron el campo).
function alCambiarPrograma (programa) {
  destProgramLabel.value = programa?.program_name || ''
  destEditionId.value = null
  cargarEdiciones()
}

function abrirDestino (f) {
  actual.value = f
  salida.value = SALIDA_POR_KIND[f.dest_kind] || 'reubicar'
  destProgramVersionId.value = f.dest_program_version_id || f.program_version_id
  destProgramLabel.value = f.dest_program_version_id ? (f.destino_programa || '') : (f.programa || '')
  destEditionId.value = f.dest_edition_id || null
  ediciones.value = []
  cargarEdiciones()
  modalDestino.value = true
}

function abrirContacto (f) {
  actual.value = f
  notaContacto.value = f.contact_notes || ''
  modalContacto.value = true
}

function abrirVeredicto (f) {
  actual.value = f
  notaVeredicto.value = ''
  modalVeredicto.value = true
}

const conGuardado = async (accion, exito) => {
  guardando.value = true
  try {
    const res = await accion()
    // El veredicto mueve al alumno aunque falle un paso de Odoo y lo deja
    // anotado: un verde aqui hacia creer a FICO que no quedaba nada por hacer.
    const pendientes = res?.data?.pending_steps?.length || 0
    if (pendientes) toast.warning(`${exito}, pero quedan ${pendientes} paso(s) pendiente(s) en Odoo`)
    else toast.success(exito)
    await cargar()
    return true
  } catch (e) {
    toast.error(e?.response?.data?.message || 'No se pudo completar la acción')
    console.error(e)
    return false
  } finally {
    guardando.value = false
  }
}

async function guardarDestino () {
  const ok = await conGuardado(() => servicio.propose({
    enrollmentId: actual.value.enrollment_id,
    destProgramVersionId: destProgramVersionId.value,
    destEditionId: destEditionId.value,
    salida: salida.value
  }), `${salidaActual.value.label}: guardado`)
  if (ok) modalDestino.value = false
}

async function guardarContacto () {
  const ok = await conGuardado(() => servicio.contact({
    enrollmentId: actual.value.enrollment_id,
    notes: notaContacto.value
  }), 'Alumno marcado como contactado')
  if (ok) modalContacto.value = false
}

async function aceptar () {
  const salidaFinal = cierre(actual.value)
  const ok = await conGuardado(() => servicio.accept({
    enrollmentId: actual.value.enrollment_id,
    notes: notaVeredicto.value
  }), salidaFinal ? `${salidaFinal.hecho}: registrado` : 'Alumno reubicado')
  if (ok) modalVeredicto.value = false
}

async function rechazar () {
  const ok = await conGuardado(() => servicio.reject({
    enrollmentId: actual.value.enrollment_id,
    notes: notaVeredicto.value
  }), 'Caso rechazado')
  if (ok) modalVeredicto.value = false
}

onMounted(cargar)
</script>

<style scoped>
.paso-hint { display: block; margin-top: 4px; font-size: 11.5px; color: var(--ds-muted); }
.sin-pasos { font-size: 12.5px; color: var(--ds-muted); }
.filtros { display: flex; flex-wrap: wrap; align-items: center; gap: 10px var(--ds-gap); margin-bottom: var(--ds-gap); }
.buscador { flex: 1 1 260px; max-width: 420px; }
.cuenta { margin-left: 2px; font-size: 11px; opacity: 0.7; }

.linea { display: block; }
.fuerte { font-weight: 600; color: var(--ds-heading); }
.nota { display: block; font-size: 11.5px; color: var(--ds-muted); }
.mono { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.ico { font-size: 10px; color: var(--ds-muted); }
.origen-producto { margin-top: 2px; color: var(--ds-warn-ink); }
.pendientes { margin-top: 4px; }
.acciones { display: flex; justify-content: flex-end; gap: 4px; }

.caida { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 4px; }
.caida:last-child { margin-bottom: 0; }

/* Codigo de edicion: chip monoespaciado; en rojo la edicion que se cayo. */
.code {
  padding: 1px 6px;
  font-family: var(--ds-font-mono);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ds-ink-2);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-control);
}
.code.bad { color: var(--ds-bad-ink); background: var(--ds-soft-bad); border-color: transparent; }

.modal-body { display: flex; flex-direction: column; gap: 12px; }
.alumno-head { padding: 10px 12px; background: var(--ds-surface-2); border-radius: var(--ds-radius-sm); }

.salidas { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; border: 0; }
.opcion {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
}
.opcion:hover { background: var(--ds-surface-2); }
.opcion.on { background: var(--ds-surface-2); border-color: var(--ds-border-strong); }
.opcion.on.info { background: var(--ds-soft-info); border-color: transparent; color: var(--ds-info-ink); }
.opcion.on.bad { background: var(--ds-soft-bad); border-color: transparent; color: var(--ds-bad-ink); }
.opcion.on.info .fuerte, .opcion.on.bad .fuerte,
.opcion.on.info .nota, .opcion.on.bad .nota { color: inherit; }
.opcion input { margin-top: 3px; }

/* El aviso de cambio de curso usa la marca violeta del CC (no hay .ds-callout.violet). */

.salto { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.salto-lado { flex: 1; min-width: 0; }
.flecha { color: var(--ds-muted); }

.cita { margin: 0; padding: 4px 0 4px 10px; font-size: 12.5px; font-style: italic; color: var(--ds-ink-2); border-left: 3px solid var(--ds-border); }

.cuotas { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.cuotas a { text-decoration: none; }
</style>
