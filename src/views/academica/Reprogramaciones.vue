<template>
  <div class="rp-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Reprogramaciones</h1>
        <div class="subtitle">
          Alumnos varados porque su edicion —o la del paquete que compraron— se cancelo.
          Una fila por venta: los modulos viajan con ella.
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="cargando" @click="cargar">
          <i class="fa-solid fa-rotate" :class="{ girando: cargando }"></i> Actualizar
        </button>
      </div>
    </header>

    <div class="kpi-grid">
      <div v-for="k in kpis" :key="k.key" class="kpi" :style="{ '--bar': k.color }">
        <div class="k-label">
          <span>{{ k.label }}</span>
          <i class="fa-solid k-icon" :class="k.icon"></i>
        </div>
        <div class="k-value">
          <span v-if="cargando" class="skel skel-kpi"></span>
          <template v-else>{{ k.valor }}</template>
        </div>
        <div class="k-foot"><span>{{ k.pie }}</span></div>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="e in chips"
        :key="e.key"
        class="chip"
        :class="{ active: filtroEstado === e.key }"
        @click="filtroEstado = e.key"
      >
        <span v-if="filtroEstado === e.key" class="dot"></span>
        {{ e.label }}
        <span class="chip-count">{{ e.cuenta }}</span>
      </button>
      <span class="divider"></span>
      <div class="input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="busqueda" placeholder="Buscar por alumno, DNI o programa..." />
      </div>
      <div class="spacer"></div>
      <span class="muted">{{ filas.length }} resultados</span>
    </div>

    <table class="course-table">
      <thead>
        <tr>
          <th>Alumno</th>
          <th>Contacto</th>
          <th>Compro</th>
          <th>Se le cancelo</th>
          <th>Destino</th>
          <th>Estado</th>
          <th class="right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="cargando">
          <tr v-for="n in 5" :key="'s' + n" class="skel-row">
            <td v-for="c in 7" :key="c"><span class="skel skel-line"></span></td>
          </tr>
        </template>
        <tr v-else-if="!filas.length">
          <td colspan="7" class="empty">
            <i class="fa-solid fa-check"></i>
            Sin alumnos varados con este filtro.
          </td>
        </tr>
        <template v-else>
        <tr v-for="f in filas" :key="f.enrollment_id">
          <td class="ct-name">
            <div class="bold">{{ f.apellidos }}, {{ f.nombres }}</div>
            <div class="sub mono">{{ f.dni || '--' }} &middot; venta #{{ f.enrollment_id }}</div>
          </td>
          <td>
            <div v-if="f.celular" class="small"><i class="fa-solid fa-phone ico"></i> {{ f.celular }}</div>
            <div v-if="f.correo" class="sub">{{ f.correo }}</div>
            <span v-if="!f.celular && !f.correo" class="sub">sin contacto</span>
          </td>
          <td>
            <div class="small bold">{{ f.programa }}</div>
            <div class="sub"><span class="code">{{ f.edicion_codigo || 's/e' }}</span> {{ fecha(f.edicion_inicio) }}</div>
          </td>
          <td>
            <div v-for="c in f.caidas" :key="c.edition_id" class="caida">
              <span class="code code-red">{{ c.codigo }}</span>
              <span class="small">{{ c.programa }}</span>
              <span class="sub">{{ fecha(c.inicio) }}</span>
              <span v-if="c.es_la_venta" class="status-pill neutral">la venta</span>
            </div>
          </td>
          <td>
            <template v-if="cierre(f)">
              <span class="status-pill" :class="cierre(f).clase">
                <span class="dot"></span>{{ cierre(f).pill }}
              </span>
              <div class="sub">no se reubica</div>
            </template>
            <template v-else-if="f.dest_program_version_id">
              <div class="small bold">{{ f.destino_programa }}</div>
              <div class="sub">
                <span class="code">{{ f.destino_codigo || 's/e' }}</span> {{ fecha(f.destino_inicio) }}
                <span class="status-pill" :class="f.dest_kind === 'RP' ? 'info' : 'purple'">{{ f.dest_kind }}</span>
              </div>
            </template>
            <span v-else class="sub">— sin elegir —</span>
          </td>
          <td>
            <span class="status-pill" :class="estadoClase(f)">
              <span class="dot"></span>{{ estadoLabel(f) }}
            </span>
            <div v-if="f.pending_steps?.length" class="alert-flag">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ f.pending_steps.length }} pendiente(s)
            </div>
          </td>
          <td class="right nowrap">
            <button class="btn sm" @click="abrirDestino(f)">Destino</button>
            <button class="btn sm" :disabled="!f.dest_program_version_id && !cierre(f)" @click="abrirContacto(f)">Contactar</button>
            <button class="btn sm primary" :disabled="f.status !== 'contactado'" @click="abrirVeredicto(f)">Veredicto</button>
          </td>
        </tr>
        </template>
      </tbody>
    </table>

    <!-- Destino: Academica elige a donde va -->
    <BaseModal v-model="modalDestino" title="¿A donde lo reubicamos?" size="lg">
      <div v-if="actual" class="rp-shell modal-body">
        <div class="alumno-head">
        <div class="bold">{{ actual.apellidos }}, {{ actual.nombres }}</div>
        <div class="sub">compro {{ actual.programa }}</div>
        </div>

        <label class="lbl">¿Que hacemos con el?</label>
        <label
          v-for="s in SALIDAS"
          :key="s.key"
          class="opcion"
          :class="[{ on: salida === s.key }, s.clase]"
        >
          <input v-model="salida" type="radio" :value="s.key" />
          <div>
            <div class="bold small">{{ s.label }}</div>
            <div class="sub">{{ s.detalle }}</div>
          </div>
        </label>

        <template v-if="salida === 'reubicar'">
        <label class="lbl">Programa destino</label>
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

        <div v-if="rpSinEdicion" class="aviso danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <b>Este programa no tiene ediciones futuras.</b>
            Para reubicarlo hay que elegir <b>otro programa</b>, y eso lo convierte en un cambio de curso.
          </div>
        </div>
        <div v-else class="aviso" :class="esCambioDeCurso ? 'purple' : 'info'">
          <i class="fa-solid" :class="esCambioDeCurso ? 'fa-right-left' : 'fa-calendar-day'"></i>
          <div>
            <b>{{ esCambioDeCurso ? 'Cambio de curso' : 'Reprogramacion' }}</b> —
            {{ esCambioDeCurso
              ? 'el destino es otro programa, se cobra al mismo neto ya pagado.'
              : 'misma malla, el alumno conserva su plan de cuotas.' }}
          </div>
        </div>

        <label class="lbl">Edicion destino</label>
        <select v-model="destEditionId" class="sel" :disabled="cargandoEdiciones || !ediciones.length">
          <option :value="null">{{ etiquetaEdicionVacia }}</option>
          <option v-for="ed in ediciones" :key="ed.edition_num_id" :value="ed.edition_num_id">
            {{ ed.specific_code }} &middot; {{ fecha(ed.start_date) }}
          </option>
        </select>
        </template>
      </div>
      <template #footer>
        <button class="btn" @click="modalDestino = false">Cancelar</button>
        <button class="btn primary" :disabled="!puedeGuardarDestino" @click="guardarDestino">
          {{ salidaActual.accion }}
        </button>
      </template>
    </BaseModal>

    <!-- Contacto -->
    <BaseModal v-model="modalContacto" title="Alumno contactado" size="md">
      <div v-if="actual" class="rp-shell modal-body">
        <div class="alumno-head">
        <div class="bold">{{ actual.apellidos }}, {{ actual.nombres }}</div>
        <div class="sub">{{ actual.celular || 'sin celular' }} &middot; {{ actual.correo || 'sin correo' }}</div>
        </div>
        <label class="lbl">¿Que dijo?</label>
        <textarea v-model="notaContacto" class="sel" rows="4" placeholder="Acepto pasar a la edicion de octubre..."></textarea>
      </div>
      <template #footer>
        <button class="btn" @click="modalContacto = false">Cancelar</button>
        <button class="btn primary" :disabled="guardando" @click="guardarContacto">Marcar contactado</button>
      </template>
    </BaseModal>

    <!-- Veredicto FICO -->
    <BaseModal v-model="modalVeredicto" title="Veredicto FICO" size="md">
      <div v-if="actual" class="rp-shell modal-body">
        <div class="alumno-head">
        <div class="bold">{{ actual.apellidos }}, {{ actual.nombres }}</div>
        <div class="sub">{{ tipoDeCaso(actual) }}</div>
        </div>

        <div v-if="cierre(actual)" class="aviso" :class="cierre(actual).clase">
          <i class="fa-solid" :class="cierre(actual).icono"></i>
          <div>
            <b>{{ cierre(actual).titulo }}</b>
            {{ cierre(actual).detalle }}
          </div>
        </div>

        <div v-else class="salto">
          <div class="salto-lado">
            <div class="sub">DE</div>
            <div class="bold small">{{ actual.programa }}</div>
            <div class="sub"><span class="code">{{ actual.edicion_codigo || 's/e' }}</span> {{ fecha(actual.edicion_inicio) }}</div>
          </div>
          <i class="fa-solid fa-arrow-right flecha"></i>
          <div class="salto-lado">
            <div class="sub">A</div>
            <div class="bold small">{{ actual.destino_programa }}</div>
            <div class="sub"><span class="code">{{ actual.destino_codigo || 's/e' }}</span> {{ fecha(actual.destino_inicio) }}</div>
          </div>
        </div>

        <div v-if="actual.contact_notes" class="cita">“{{ actual.contact_notes }}”</div>

        <!-- FICO firma con el saldo a la vista: la RP arrastra las cuotas pendientes
             al destino, el CC no, y en los dos casos el plan se ajusta desde FICO. -->
        <div class="cuotas">
          <div>
            <div class="sub">CUOTAS PENDIENTES</div>
            <div class="bold small">
              {{ cuotas.cantidad }} cuota(s) &middot; {{ soles(cuotas.monto) }}
            </div>
          </div>
          <a class="btn sm" :href="linkFico(actual.enrollment_id)" target="_blank" rel="noopener">
            <i class="fa-solid fa-pen-to-square"></i> Editar cuotas en FICO
          </a>
        </div>

        <div v-if="!cierre(actual) && !cuotas.cantidad" class="aviso warn">
          <i class="fa-solid fa-circle-exclamation"></i>
          <div>
            Esta venta no tiene cuotas por pagar: el destino nace al contado. Si el alumno necesita
            un plan de cuotas, armaselo en FICO despues de mover.
          </div>
        </div>

        <div v-if="!cierre(actual)" class="aviso warn">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            Aceptar mueve la inscripcion en el ERP, lo inscribe en el aula nueva de Odoo, lo saca de
            la vieja y le manda el correo. Lo que falle queda anotado como pendiente manual.
          </div>
        </div>

        <label class="lbl">Nota del veredicto</label>
        <textarea v-model="notaVeredicto" class="sel" rows="3"></textarea>
      </div>
      <template #footer>
        <button class="btn" :disabled="guardando" @click="rechazar">Rechazar</button>
        <button class="btn primary" :disabled="guardando" @click="aceptar">
          {{ guardando ? 'Ejecutando...' : (cierre(actual)?.accion || 'Aceptar y mover') }}
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
    detalle: 'Se va a otra edicion del mismo programa, o a otro programa.',
    accion: 'Guardar destino',
    clase: ''
  },
  {
    key: 'reserva',
    label: 'Reservar vacante',
    detalle: 'Se retira de la edicion pero su dinero se queda a su favor hasta que se vuelva a inscribir.',
    accion: 'Marcar vacante reservada',
    clase: 'azul'
  },
  {
    key: 'reembolso',
    label: 'Reembolso',
    detalle: 'No se le quita nada: solo queda registrado en el historial que se le devolvio su dinero.',
    accion: 'Marcar reembolso',
    clase: 'rojo'
  }
]

// dest_kind lo deriva el backend. Estos dos cierran el caso sin destino.
const CIERRES = {
  RF: {
    pill: 'Reembolso',
    hecho: 'Reembolsado',
    clase: 'danger',
    icono: 'fa-hand-holding-dollar',
    titulo: 'El alumno pidio reembolso.',
    detalle: 'Aceptar NO toca la inscripcion ni Odoo: la venta se queda como esta y el caso solo deja constancia en el historial de que se le devolvio su dinero.',
    accion: 'Aprobar reembolso'
  },
  RV: {
    pill: 'Vacante reservada',
    hecho: 'Vacante reservada',
    clase: 'info',
    icono: 'fa-bookmark',
    titulo: 'El alumno reserva su vacante.',
    detalle: 'Aceptar lo retira de la edicion: se le cancelan las cuotas pendientes, salen sus modulos y se lo saca del aula en Odoo. Sin devolucion — su pago queda a su favor hasta que se vuelva a inscribir.',
    accion: 'Reservar vacante'
  }
}
const cierre = f => CIERRES[f?.dest_kind] || null
const SALIDA_POR_KIND = { RV: 'reserva', RF: 'reembolso' }

const ESTADOS = [
  { key: 'detectado',  label: 'Sin tomar',   clase: 'neutral' },
  { key: 'propuesto',  label: 'Con destino', clase: 'info' },
  { key: 'contactado', label: 'Contactado',  clase: 'warn' },
  { key: 'aceptado',   label: 'Reubicado',   clase: 'ok' },
  { key: 'rechazado',  label: 'Rechazado',   clase: 'danger' },
  { key: 'cerrado',    label: 'Cerrado',     clase: 'neutral' }
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
// Un caso cerrado sin destino no es un "Reubicado": el alumno no se movio.
const estadoLabel = f => (cierre(f) && estadoDe(f) === 'aceptado')
  ? cierre(f).hecho
  : (ESTADOS.find(e => e.key === estadoDe(f))?.label || estadoDe(f))
const estadoClase = f => ESTADOS.find(e => e.key === estadoDe(f))?.clase || 'neutral'

const tipoDeCaso = f => cierre(f)?.pill
  || (f.dest_kind === 'RP' ? 'Reprogramacion' : 'Cambio de curso')

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
  return !!destProgramVersionId.value && !rpSinEdicion.value
})

// El backend manda el conteo con la MISMA regla que usa la RP para trasladarlas.
const cuotas = computed(() => actual.value?.cuotas_pendientes || { cantidad: 0, monto: 0 })

const etiquetaEdicionVacia = computed(() => {
  if (cargandoEdiciones.value) return 'Cargando ediciones...'
  if (!destProgramVersionId.value) return 'Elegir programa primero'
  return ediciones.value.length ? 'Elegir edicion...' : 'Sin ediciones futuras'
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
  { key: 'total', label: 'Alumnos varados', valor: casos.value.length, pie: 'una fila por venta', color: '#EF4444', icon: 'fa-user-slash' },
  { key: 'detectado', label: 'Sin destino aun', valor: cuenta('detectado'), pie: 'esperan a Academica', color: '#A0A099', icon: 'fa-inbox' },
  { key: 'contactado', label: 'Esperando FICO', valor: cuenta('contactado'), pie: 'ya contactados', color: '#F59E0B', icon: 'fa-hourglass-half' },
  { key: 'aceptado', label: 'Reubicados', valor: cuenta('aceptado'), pie: 'movidos en el ERP', color: '#10B981', icon: 'fa-circle-check' }
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
    await accion()
    toast.success(exito)
    await cargar()
    return true
  } catch (e) {
    toast.error(e?.response?.data?.message || 'No se pudo completar la accion')
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
/* Mismo sistema visual que /academica/aulas: si cambia alla, cambia aca. */
.rp-shell {
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --line-soft: #EFEFEA;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;
  --green: #10B981;
  --green-soft: #ECFDF4;
  --green-ink: #047857;
  --amber-soft: #FEF6E1;
  --amber-ink: #B45309;
  --red-soft: #FEECEC;
  --red-ink: #B91C1C;
  --blue-soft: #ECF2FE;
  --blue-ink: #1D4ED8;
  --purple-soft: #F3EEFE;
  --purple-ink: #6D28D9;
  --radius: 10px;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
}

.row { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.muted { color: var(--ink-3); font-size: 12px; }
.small { font-size: 12.5px; }
.sub { font-size: 11px; color: var(--ink-3); }
.bold { font-weight: 600; }
.right { text-align: right; }
.nowrap { white-space: nowrap; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* page-head */
.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 { margin: 4px 0 2px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.page-head .subtitle { color: var(--ink-3); font-size: 13.5px; max-width: 80ch; }
.page-head .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

/* buttons */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: 1px solid var(--line); background: white;
  color: var(--ink-2); cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn:hover:not(:disabled) { background: var(--bg-soft); border-color: #DDD; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { background: var(--we-navy, #002060); color: white; border-color: var(--we-navy, #002060); }
.btn.primary:hover:not(:disabled) { background: #1a3a75; }
.btn.sm { padding: 5px 9px; font-size: 12.5px; margin-left: 4px; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.kpi {
  background: white; border-radius: var(--radius);
  padding: 14px 16px; border: 1px solid var(--line);
  position: relative; overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px; background: var(--bar, var(--ink-4));
}
.kpi .k-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.kpi .k-icon { color: var(--ink-4); font-size: 14px; }
.kpi .k-value { font-size: 30px; font-weight: 600; letter-spacing: -0.025em; margin-top: 4px; line-height: 1.1; }
.kpi .k-foot { margin-top: 10px; font-size: 12px; color: var(--ink-3); }

/* filter bar */
.filter-bar {
  background: white; border-radius: var(--radius); border: 1px solid var(--line);
  padding: 12px 14px; margin-bottom: 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  background: white; border: 1px solid var(--line);
  font-size: 12.5px; color: var(--ink-2); cursor: pointer; transition: background 0.15s;
}
.chip:hover { background: var(--bg-soft); }
.chip.active { background: #ECF8F2; color: var(--green-ink); border-color: #C8EFD8; font-weight: 500; }
.chip .dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.chip .chip-count { color: var(--ink-4); font-size: 11px; }
.chip.active .chip-count { color: var(--green-ink); opacity: 0.7; }
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; background: white; font-size: 13px;
  min-width: 260px; color: var(--ink-3);
}
.input input { border: none; outline: none; font-size: 13px; flex: 1; background: transparent; color: var(--ink); }
.input input::placeholder { color: var(--ink-4); }

/* table */
.course-table {
  width: 100%; background: white;
  border: 1px solid var(--line); border-radius: var(--radius);
  border-collapse: collapse; overflow: hidden; font-size: 13px;
}
.course-table th, .course-table td {
  text-align: left; padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft); vertical-align: top;
}
.course-table th {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--bg-soft); white-space: nowrap;
}
.course-table tbody tr:hover { background: #FAFAF6; }
.course-table tr:last-child td { border-bottom: none; }
.course-table td.right { text-align: right; }
.course-table .empty { text-align: center; color: var(--ink-3); padding: 34px; }
.course-table .empty i { color: var(--green); margin-right: 6px; }
.ico { color: var(--ink-4); font-size: 10px; }
.caida { margin-bottom: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.caida:last-child { margin-bottom: 0; }
.code {
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 600;
  color: var(--ink-3); background: var(--bg-soft);
  padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line-soft);
}
.code-red { background: var(--red-soft); color: var(--red-ink); border-color: transparent; }

/* status pills */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.status-pill .dot { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.status-pill.ok { background: var(--green-soft); color: var(--green-ink); }
.status-pill.warn { background: var(--amber-soft); color: var(--amber-ink); }
.status-pill.danger { background: var(--red-soft); color: var(--red-ink); }
.status-pill.info { background: var(--blue-soft); color: var(--blue-ink); }
.status-pill.purple { background: var(--purple-soft); color: var(--purple-ink); }
.status-pill.neutral { background: var(--bg-soft); color: var(--ink-3); }
.alert-flag {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;
  font-size: 10.5px; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
  background: var(--red-soft); color: var(--red-ink);
}

/* skeleton (mismo shimmer que Aulas) */
.skel {
  display: block;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
.skel-kpi { width: 56px; height: 30px; }
.skel-line { height: 14px; width: 90%; }
.skel-row td { padding: 12px 14px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.girando { animation: giro 1s linear infinite; }
@keyframes giro { to { transform: rotate(360deg); } }

/* modales */
.modal-body { display: flex; flex-direction: column; gap: 4px; max-width: none; }
.alumno-head {
  padding: 10px 12px; background: var(--bg-soft);
  border-radius: 8px; margin-bottom: 6px;
}
.lbl {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em; margin-top: 12px;
}
.sel {
  border: 1px solid var(--line); border-radius: 8px;
  padding: 8px 10px; font-size: 13px; width: 100%;
  background: white; color: var(--ink); font-family: inherit;
}
.aviso {
  display: flex; gap: 9px; align-items: flex-start;
  font-size: 12.5px; border-radius: 8px; padding: 10px 12px; margin-top: 12px;
}
.aviso i { margin-top: 2px; }
.aviso.info { background: var(--blue-soft); color: var(--blue-ink); }
.aviso.purple { background: var(--purple-soft); color: var(--purple-ink); }
.aviso.warn { background: var(--amber-soft); color: var(--amber-ink); }
.aviso.danger { background: var(--red-soft); color: var(--red-ink); }
.salto {
  display: flex; align-items: center; gap: 14px;
  padding: 12px; border: 1px solid var(--line); border-radius: 8px;
}
.salto-lado { flex: 1; min-width: 0; }
.flecha { color: var(--ink-4); }
.cita {
  font-size: 12.5px; color: var(--ink-2); font-style: italic;
  border-left: 3px solid var(--line); padding: 4px 0 4px 10px; margin-top: 10px;
}
.opcion {
  display: flex; gap: 10px; align-items: flex-start; cursor: pointer;
  border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-top: 6px;
}
.opcion:hover { background: var(--bg-soft); }
.opcion.on { background: var(--bg-soft); border-color: var(--ink-4); }
.opcion.on.azul { background: var(--blue-soft); border-color: transparent; color: var(--blue-ink); }
.opcion.on.rojo { background: var(--red-soft); border-color: transparent; color: var(--red-ink); }
.opcion.on .sub { color: inherit; opacity: 0.8; }
.opcion input { margin-top: 3px; }
.cuotas {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-top: 12px;
}
.cuotas .btn { text-decoration: none; margin-left: 0; }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* dark: mismos overrides que Aulas */
[data-coreui-theme="dark"] .rp-shell { color: #F4F4F0; }
[data-coreui-theme="dark"] .rp-shell .btn { background: #1F1F1A; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .rp-shell .btn:hover:not(:disabled) { background: #2A2A22; border-color: #3A3A33; }
[data-coreui-theme="dark"] .rp-shell .btn.primary { background: var(--we-navy, #002060); border-color: #2f4a8a; color: #fff; }
[data-coreui-theme="dark"] .rp-shell .kpi { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .rp-shell .filter-bar { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .rp-shell .chip { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .rp-shell .chip:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .rp-shell .chip.active {
  background: rgba(16,185,129,0.16); color: #34D399; border-color: rgba(16,185,129,0.3);
}
[data-coreui-theme="dark"] .rp-shell .input { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .rp-shell .input input { color: #F4F4F0; }
[data-coreui-theme="dark"] .rp-shell .course-table { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .rp-shell .course-table th { background: #1F1F1A; }
[data-coreui-theme="dark"] .rp-shell .course-table th,
[data-coreui-theme="dark"] .rp-shell .course-table td { border-color: #2A2A22; }
[data-coreui-theme="dark"] .rp-shell .course-table tbody tr:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .rp-shell .code { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .rp-shell .alumno-head { background: #1F1F1A; }
[data-coreui-theme="dark"] .rp-shell .sel { background: #1A1A14; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .rp-shell .salto,
[data-coreui-theme="dark"] .rp-shell .opcion,
[data-coreui-theme="dark"] .rp-shell .cuotas { border-color: #2A2A22; }
[data-coreui-theme="dark"] .rp-shell .opcion:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .rp-shell .opcion.on { background: #24241C; border-color: #4A4A40; }
[data-coreui-theme="dark"] .rp-shell .opcion.on.azul { background: rgba(29,78,216,0.22); color: #93B4FD; }
[data-coreui-theme="dark"] .rp-shell .opcion.on.rojo { background: rgba(185,28,28,0.18); color: #FCA5A5; }
[data-coreui-theme="dark"] .rp-shell .skel {
  background: linear-gradient(90deg, #1F1F1A 25%, #2A2A22 50%, #1F1F1A 75%);
  background-size: 200% 100%;
}
</style>
