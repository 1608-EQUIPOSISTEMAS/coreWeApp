<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Tickets de alumnos</h1>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="cargando" @click="cargar">
          <i class="fa-solid fa-rotate" aria-hidden="true"></i> Actualizar
        </button>
      </div>
    </header>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">¿Qué trámites esperan a mi área?</h3>
        <span class="ds-panel-hint">{{ incluirCerrados ? 'Todos' : 'Solo pendientes' }}</span>
      </header>

      <div class="ds-panel-body">
        <div class="filtros">
          <div class="ds-field">
            <label class="ds-label" for="busca">Buscar</label>
            <input
              id="busca"
              v-model="filtros.q"
              class="ds-input"
              type="search"
              placeholder="Ticket, DNI o nombre"
              @keyup.enter="cargar"
            />
          </div>
          <div class="ds-field">
            <label class="ds-label" for="tipo">Tipo de trámite</label>
            <select id="tipo" v-model="filtros.tipo" class="ds-input" @change="cargar">
              <option :value="null">Todos</option>
              <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.etiqueta }}</option>
            </select>
          </div>
          <div class="ds-field ds-field--check">
            <label class="ds-label" for="cerrados">Incluir cerrados</label>
            <input id="cerrados" v-model="incluirCerrados" type="checkbox" @change="cargar" />
          </div>
        </div>

        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Alumno</th>
                <th>Trámite</th>
                <th>Programa</th>
                <th>Turno</th>
                <th>Estado</th>
                <th>Abierto</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="cargando">
                <tr v-for="n in 6" :key="`sk-${n}`">
                  <td colspan="7"><span class="ds-skel"></span></td>
                </tr>
              </template>

              <tr v-else-if="error">
                <td colspan="7">
                  <p class="ds-alert">{{ error }}</p>
                </td>
              </tr>

              <tr v-else-if="!tickets.length">
                <td colspan="7" class="ds-empty ds-empty--lista">
                  No hay trámites esperando a tu área. Marca «Incluir cerrados» para ver los resueltos.
                </td>
              </tr>

              <template v-else>
                <tr
                  v-for="t in tickets"
                  :key="t.solicitud_id"
                  class="link"
                  tabindex="0"
                  @click="abrir(t)"
                  @keydown.enter="abrir(t)"
                >
                  <td class="mono">{{ t.ticket_number }}</td>
                  <td>
                    <span class="alumno">{{ t.alumno }}</span>
                    <span class="dni">{{ t.dni || '—' }}</span>
                  </td>
                  <td>{{ etiquetaTipo(t.tipo) }}</td>
                  <td>{{ t.programa || '—' }}</td>
                  <td><span class="ds-pill info">{{ etiquetaTurno(t) }}</span></td>
                  <td><span class="ds-pill" :class="estado(t.status).tono">{{ estado(t.status).etiqueta }}</span></td>
                  <td>{{ fecha(t.registration_date) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <BaseModal v-model="abierto" :title="seleccionado?.ticket_number || 'Trámite'" size="md">
      <template v-if="seleccionado">
        <dl class="detalle">
          <div><dt>Alumno</dt><dd>{{ seleccionado.alumno }} · {{ seleccionado.dni || 's/DNI' }}</dd></div>
          <div><dt>Contacto</dt><dd>{{ seleccionado.correo || '—' }} · {{ seleccionado.celular || '—' }}</dd></div>
          <div><dt>Trámite</dt><dd>{{ etiquetaTipo(seleccionado.tipo) }}</dd></div>
          <div><dt>Programa</dt><dd>{{ seleccionado.programa || '—' }}</dd></div>
          <div v-for="fila in detalleDelPedido(seleccionado)" :key="fila.etiqueta">
            <dt>{{ fila.etiqueta }}</dt><dd>{{ fila.valor }}</dd>
          </div>
          <div><dt>Costo</dt><dd>{{ etiquetaMonto(seleccionado) }}</dd></div>
          <div><dt>Estado</dt><dd>{{ estado(seleccionado.status).etiqueta }} · turno {{ etiquetaTurno(seleccionado) }}</dd></div>
        </dl>

        <p v-if="seleccionado.detalle" class="motivo">{{ seleccionado.detalle }}</p>

        <p v-if="seleccionado.requiere_accion_manual" class="ds-alert">
          {{ seleccionado.requiere_accion_manual }}: al resolverlo, el ERP no moverá la matrícula solo.
        </p>

        <div v-if="seleccionado.voucher_key || seleccionado.evidencia_key" class="adjuntos">
          <button
            v-if="seleccionado.voucher_key"
            class="btn-exec btn-exec-outline"
            type="button"
            @click="verArchivo('voucher')"
          >
            <i class="fa-solid fa-receipt" aria-hidden="true"></i> Ver voucher
          </button>
          <button
            v-if="seleccionado.evidencia_key"
            class="btn-exec btn-exec-outline"
            type="button"
            @click="verArchivo('evidencia')"
          >
            <i class="fa-solid fa-paperclip" aria-hidden="true"></i> Ver evidencia
          </button>
        </div>

        <div v-if="puedeFijarMonto(seleccionado)" class="ds-field">
          <label class="ds-label" for="monto">Gasto administrativo (S/)</label>
          <input
            id="monto"
            v-model.number="monto"
            class="ds-input"
            type="number"
            min="0"
            step="1"
            placeholder="La lista de precios no tiene este curso"
          />
        </div>

        <div v-if="seleccionado.puede_firmar" class="ds-field">
          <label class="ds-label" for="respuesta">Respuesta para el alumno</label>
          <textarea
            id="respuesta"
            v-model="respuesta"
            class="ds-input"
            rows="4"
            maxlength="2000"
            placeholder="Lo que escribas acá lo lee el alumno en su portal."
          ></textarea>
        </div>
      </template>

      <template v-if="seleccionado?.puede_firmar" #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="guardando" @click="rechazar">
          Rechazar
        </button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="guardando || faltaMonto" @click="firmar">
          {{ guardando ? 'Guardando…' : textoFirmar(seleccionado) }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import { confirmAction } from '@/composables/useConfirm'
import { ServiceKeys } from '@/services'
import {
  TIPOS, detalleDelPedido, estado, etiquetaMonto, etiquetaTipo, etiquetaTurno, puedeFijarMonto, textoFirmar,
} from '@/entities/ticket-alumno/ticket-alumno.presentacion'

const toast = useToast()
const ticketsService = inject(ServiceKeys.TicketsAlumnos)

const tickets = ref([])
const cargando = ref(true)
const error = ref('')
const incluirCerrados = ref(false)
const filtros = reactive({ q: '', tipo: null })

const abierto = ref(false)
const seleccionado = ref(null)
const respuesta = ref('')
const monto = ref(null)
const guardando = ref(false)

// Sin monto Academica no puede aprobar: el alumno quedaria debiendo "S/ —".
const faltaMonto = computed(() =>
  Boolean(seleccionado.value) && puedeFijarMonto(seleccionado.value) && !(Number(monto.value) >= 0 && monto.value !== '' && monto.value !== null))

const subtitulo = computed(() => {
  if (cargando.value) return 'Cargando…'
  const n = tickets.value.length
  if (!n) return 'Nada pendiente de tu área'
  return `${n} ${n === 1 ? 'trámite espera' : 'trámites esperan'} tu firma`
})

function fecha (valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function cargar () {
  cargando.value = true
  error.value = ''
  try {
    tickets.value = await ticketsService.list({
      incluirCerrados: incluirCerrados.value,
      tipo: filtros.tipo,
      q: filtros.q || null,
    })
  } catch (err) {
    console.error('No se pudo cargar la bandeja de tickets', err)
    error.value = err.response?.data?.message || 'No pudimos cargar los trámites. Reintenta en unos segundos.'
  } finally {
    cargando.value = false
  }
}

function abrir (ticket) {
  seleccionado.value = ticket
  respuesta.value = ticket.respuesta || ''
  monto.value = null
  abierto.value = true
}

async function verArchivo (cual) {
  try {
    const url = await ticketsService.urlDeArchivo({ solicitudId: seleccionado.value.solicitud_id, cual })
    window.open(url, '_blank', 'noopener')
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo abrir el archivo')
  }
}

// Firmar es irreversible: o pasa el tramite a la otra area o lo da por resuelto,
// y el alumno ve el cambio en su portal. Por eso se confirma antes.
async function firmar () {
  // confirmAction devuelve un booleano, no { isConfirmed }: destructurarlo daba
  // undefined y el boton no hacia nada.
  const confirmado = await confirmAction({
    title: '¿Validar este trámite?',
    text: `${seleccionado.value.ticket_number} de ${seleccionado.value.alumno}. El alumno verá el cambio en su portal.`,
    confirmText: 'Sí, validar',
  })
  if (!confirmado) return

  await enviar(() => ticketsService.firmar({
    solicitudId: seleccionado.value.solicitud_id,
    respuesta: respuesta.value,
    monto: puedeFijarMonto(seleccionado.value) ? monto.value : null,
  }), resultado => resultado.status === 'RESUELTA'
    ? 'Trámite resuelto'
    : 'Aprobado: el alumno ya puede adjuntar su voucher')
}

async function rechazar () {
  const confirmado = await confirmAction({
    title: '¿Rechazar este trámite?',
    text: 'Se cierra y el alumno ve tu respuesta.',
    confirmText: 'Sí, rechazar',
    danger: true,
  })
  if (!confirmado) return

  await enviar(() => ticketsService.rechazar({
    solicitudId: seleccionado.value.solicitud_id,
    respuesta: respuesta.value,
  }), () => 'Trámite rechazado')
}

async function enviar (accion, mensaje) {
  guardando.value = true
  try {
    const resultado = await accion()
    toast.success(mensaje(resultado))
    abierto.value = false
    await cargar()
  } catch (err) {
    // El 403 de turno equivocado llega con el mensaje del backend, que dice
    // que area tiene que revisarlo: vale mas que un "error al guardar".
    toast.error(err.response?.data?.message || 'No se pudo guardar el trámite')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.filtros {
  display: flex;
  gap: var(--ds-gap);
  flex-wrap: wrap;
  margin-bottom: var(--ds-gap);
}
.filtros .ds-field { flex: 1 1 220px; }
.ds-field--check { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; }

.mono { font-family: var(--ds-font-mono); }
.alumno { display: block; }
.dni { display: block; font-size: 11.5px; color: var(--ds-muted); }

.detalle { margin: 0 0 var(--ds-gap); display: flex; flex-direction: column; gap: 6px; }
.detalle > div { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: baseline; }
.detalle dt { font-size: 11.5px; font-weight: 600; color: var(--ds-ink-2); }
.detalle dd { margin: 0; font-size: 13px; color: var(--ds-ink); }

.adjuntos { display: flex; gap: 8px; margin-bottom: var(--ds-gap); }

.motivo {
  margin: 0 0 var(--ds-gap);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ds-ink);
  white-space: pre-wrap;
  background: var(--ds-surface-2);
  border-radius: var(--ds-radius-sm);
}

@media (max-width: 900px) {
  .detalle > div { grid-template-columns: 1fr; gap: 2px; }
}
</style>
