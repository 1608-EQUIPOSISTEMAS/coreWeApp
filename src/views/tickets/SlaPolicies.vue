<template>
  <section class="ds-panel">
    <header class="ds-panel-head">
      <div>
        <h3 class="ds-panel-title">Plazos de atención</h3>
        <p class="ds-panel-sub">
          Minutos corridos desde que se crea el ticket. El reloj no se detiene fuera del horario laboral.
        </p>
      </div>
    </header>

    <div class="ds-panel-body">
      <p v-if="cargando" class="ds-alert neutro">Cargando las políticas…</p>
      <p v-else-if="error" class="ds-alert">{{ error }}</p>

      <template v-else>
        <p class="tk-aviso">
          Cambiar un plazo <strong>no reescribe los tickets ya creados</strong>: cada uno conserva el
          compromiso que tenía al abrirse.
        </p>

        <div class="ds-table-scroll">
          <table class="ds-table">
            <thead>
              <tr>
                <th>Prioridad</th>
                <th class="num">Primera respuesta</th>
                <th class="num">Resolución</th>
                <th>Última edición</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in editables" :key="p.prioridad">
                <td><span class="ds-pill" :class="PRIORIDAD_TONO[p.prioridad]">{{ p.prioridad }}</span></td>
                <td class="num">
                  <input
                    v-model.number="p.minutosPrimeraRespuesta"
                    type="number"
                    class="tk-num"
                    :min="MIN"
                    :max="MAX"
                  />
                  <small class="tk-equiv">{{ enHoras(p.minutosPrimeraRespuesta) }}</small>
                </td>
                <td class="num">
                  <input
                    v-model.number="p.minutosResolucion"
                    type="number"
                    class="tk-num"
                    :min="MIN"
                    :max="MAX"
                  />
                  <small class="tk-equiv">{{ enHoras(p.minutosResolucion) }}</small>
                </td>
                <td class="tk-meta">
                  <span>{{ fechaCorta(p.actualizadoEn) }}</span>
                  <small v-if="p.actualizadoPor">{{ p.actualizadoPor }}</small>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-exec btn-exec-outline btn-sm"
                    :disabled="!cambio(p) || invalido(p) || guardando === p.prioridad"
                    @click="guardar(p)"
                  >
                    <i class="fa-solid" :class="guardando === p.prioridad ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
                    Guardar
                  </button>
                  <small v-if="invalido(p)" class="tk-error">{{ invalido(p) }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { PRIORIDAD_TONO, fechaCorta } from './ticket-format.js'

// Mismos límites que el CHECK de la tabla y que valida el backend: 1 minuto a
// 30 días. Más allá deja de ser un compromiso de servicio.
const MIN = 1
const MAX = 43200

const service = inject(ServiceKeys.Tickets)
const toast = useToast()

const editables = ref([])
const originales = ref({})
const cargando = ref(false)
const guardando = ref(null)
const error = ref('')

onMounted(cargar)

async function cargar () {
  cargando.value = true
  error.value = ''
  try {
    const politicas = await service.slaPolicies()
    editables.value = politicas.map(p => ({ ...p }))
    originales.value = Object.fromEntries(politicas.map(p => [p.prioridad, { ...p }]))
  } catch (e) {
    console.error('tickets.slaPolicies:', e)
    error.value = e?.response?.data?.message || 'No se pudieron cargar las políticas.'
  } finally {
    cargando.value = false
  }
}

const cambio = (p) => {
  const original = originales.value[p.prioridad]
  return original && (
    original.minutosPrimeraRespuesta !== p.minutosPrimeraRespuesta ||
    original.minutosResolucion !== p.minutosResolucion)
}

// Se avisa antes de pedirlo al servidor, que igual vuelve a validar.
function invalido (p) {
  const enRango = n => Number.isInteger(n) && n >= MIN && n <= MAX
  if (!enRango(p.minutosPrimeraRespuesta) || !enRango(p.minutosResolucion)) {
    return `Entre ${MIN} y ${MAX} minutos`
  }
  if (p.minutosResolucion < p.minutosPrimeraRespuesta) {
    return 'La resolución no puede ser menor que la respuesta'
  }
  return null
}

async function guardar (p) {
  if (invalido(p)) return
  guardando.value = p.prioridad
  try {
    await service.saveSlaPolicy(p)
    originales.value[p.prioridad] = { ...p }
    toast.success(`Plazos de ${p.prioridad} actualizados`)
  } catch (e) {
    console.error('tickets.saveSlaPolicy:', e)
    toast.error(e?.response?.data?.message || 'No se pudo guardar la política.')
  } finally {
    guardando.value = null
  }
}

// 1440 minutos no le dice nada a nadie; "24 h" sí.
function enHoras (minutos) {
  if (!Number.isFinite(minutos) || minutos <= 0) return ''
  const horas = minutos / 60
  if (horas < 1) return `${minutos} min`
  if (horas < 24) return `${Number(horas.toFixed(1))} h`
  return `${Number((horas / 24).toFixed(1))} días`
}
</script>

<style scoped>
/* Panel, tabla, pills, botones y colores: sistema de diseño (styles/design-system.css). */
.tk-aviso { margin: 0 0 14px; padding: 9px 12px; border-radius: 7px; background: var(--ds-soft-neutral); font-size: 12.5px; color: var(--ds-ink-2); }
.tk-num {
  width: 92px; padding: 5px 8px; text-align: right;
  border: 1px solid var(--ds-border); border-radius: 6px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13px; font-variant-numeric: tabular-nums;
}
.tk-num:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }
.tk-equiv { display: block; margin-top: 2px; font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.tk-meta { white-space: nowrap; }
.tk-meta small { display: block; font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.tk-error { display: block; margin-top: 3px; font-size: 11px; color: var(--ds-bad-ink); }
</style>
