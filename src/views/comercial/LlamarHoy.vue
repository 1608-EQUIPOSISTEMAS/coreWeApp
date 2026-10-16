<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Llamar hoy</h1>
        <p class="ds-sub">Clientes que volvieron a consultar y aún no compran. Se reparten a las 6:00; cada uno es tuyo por 14 días.</p>
      </div>
      <div class="ds-head-actions">
        <template v-if="esLider">
          <label class="visually-hidden" for="bandeja-asesor">Asesor</label>
          <select id="bandeja-asesor" v-model.number="asesor" class="ds-input selector">
            <option :value="0">Mi bandeja</option>
            <option v-for="a in data?.asesores ?? []" :key="a.user_id" :value="a.user_id">
              {{ displayName(a.alias) }} · {{ a.open }} por llamar
            </option>
          </select>
        </template>
        <button v-if="esAdmin" class="btn-exec btn-exec-outline" type="button" :disabled="generando" @click="generar">
          <i class="fa-solid fa-rotate" aria-hidden="true"></i> {{ generando ? 'Generando…' : 'Generar ahora' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <section v-if="loading && !data" class="ds-kpis" aria-busy="true">
      <div v-for="n in 3" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
    </section>

    <template v-else-if="data">
      <section class="ds-kpis" aria-label="Resumen de la bandeja">
        <div v-for="k in kpis" :key="k.id" class="ds-kpi">
          <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ k.value }}</span>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <span class="ds-kpi-note">{{ k.note }}</span>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr><th>Cliente</th><th>Qué consultó</th><th class="num">Probabilidad</th><th>Plazo</th><th class="num">Cerrar la llamada</th></tr>
              </thead>
              <tbody>
                <tr v-if="!filas.length">
                  <td colspan="5" class="ds-empty ds-empty--lista">
                    No hay clientes por llamar. La bandeja se arma a las 6:00 con clientes que volvieron a consultar.
                  </td>
                </tr>
                <tr v-for="f in filas" :key="f.id">
                  <td>
                    <strong class="cliente">{{ f.cliente }}</strong>
                    <span class="acciones">
                      <a class="btn-icon btn-icon-sm" :href="f.whatsapp" target="_blank" rel="noopener" :title="`Enviar propuesta por WhatsApp a ${f.telefono}`" :aria-label="`Enviar propuesta por WhatsApp a ${f.telefono}`">
                        <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
                      </a>
                      <router-link class="btn-icon btn-icon-sm" :to="{ name: 'FichaCliente', query: { tel: f.telefono } }" title="Ver ficha y qué ofrecerle" aria-label="Ver ficha y qué ofrecerle">
                        <i class="fa-solid fa-id-card" aria-hidden="true"></i>
                      </router-link>
                      <span class="nota">{{ f.telefono }}</span>
                    </span>
                  </td>
                  <td>
                    {{ f.programa }}
                    <span v-if="f.repetida" class="ds-pill info">2+ consultas</span>
                    <small class="nota">{{ f.consulta }}</small>
                    <span class="ds-pill" :class="f.edicionTone"><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> {{ f.edicion }}</span>
                  </td>
                  <td class="num">
                    <span class="prob" :class="f.probTone">{{ f.probabilidad }}</span>
                    <span class="ds-pill" :class="f.tierTone">{{ f.tier }}</span>
                  </td>
                  <td><span class="ds-pill" :class="f.venceTone">{{ f.vence }}</span></td>
                  <td class="num cierre">
                    <router-link v-if="f.inscribir" class="btn-exec btn-exec-outline btn-sm" :to="f.inscribir">
                      <i class="fa-solid fa-user-plus" aria-hidden="true"></i> Inscribir
                    </router-link>
                    <label class="visually-hidden" :for="`resultado-${f.id}`">Resultado de la llamada a {{ f.cliente }}</label>
                    <select
                      :id="`resultado-${f.id}`"
                      class="ds-input resultado"
                      :disabled="guardando === f.id"
                      @change="registrar(f, $event)"
                    >
                      <option value="">Registrar…</option>
                      <optgroup v-for="g in OUTCOME_GROUPS" :key="g.label" :label="g.label">
                        <option v-for="o in g.options" :key="o.value" :value="o.value">{{ o.label }}</option>
                      </optgroup>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Un cliente que vuelve a consultar compra algo en el mes el 4.4% de las veces (9% si consultó 2+ veces); un prospecto dormido, el 0.24%. Abre la ficha para ver qué ofrecerle; si dice que sí, "Inscribir" abre la venta con sus datos y la bandeja la cierra sola.</span>
        </footer>
      </section>

      <MedicionPanel v-if="esLider" :reload-key="medicionKey" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, getCurrentInstance } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { displayName } from '@/features/plan-comercial/planComercial'
import { OUTCOME_GROUPS, parseOutcome, assignmentRow, buildKpis } from '@/features/prediccion/bandeja'
import MedicionPanel from './llamar-hoy/MedicionPanel.vue'

const service = inject(ServiceKeys.Prediccion)
const toast = useToast()
const { proxy } = getCurrentInstance()
const esLider = proxy.$hasRole(['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'])
const esAdmin = proxy.$hasRole(['ADMIN'])

const asesor = ref(0)
const data = ref(null)
const loading = ref(false)
const error = ref('')
const guardando = ref(null)
const generando = ref(false)
const medicionKey = ref(0)

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.bandeja(asesor.value || undefined)
  } catch (err) {
    console.error('[LlamarHoy] bandeja', { asesor: asesor.value, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar la bandeja. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(asesor, cargar, { immediate: true })

async function registrar (fila, event) {
  if (!event.target.value) return
  const { outcome, reason } = parseOutcome(event.target.value)
  guardando.value = fila.id
  try {
    await service.registrarResultado(fila.id, outcome, reason)
    toast.success(`${fila.cliente}: resultado guardado`)
    await cargar()
  } catch (err) {
    console.error('[LlamarHoy] resultado', { assignmentId: fila.id, outcome, err })
    toast.error(err?.response?.data?.message || 'No se pudo guardar el resultado.')
    event.target.value = ''
  } finally {
    guardando.value = null
  }
}

async function generar () {
  generando.value = true
  try {
    const r = await service.generarBandeja()
    toast.success(`Bandeja generada: ${r.asignados} clientes repartidos entre ${r.asesores} asesores y ${r.control} en el grupo de control`)
    medicionKey.value++
    await cargar()
  } catch (err) {
    console.error('[LlamarHoy] generar', { err })
    toast.error(err?.response?.data?.message || 'No se pudo generar la bandeja.')
  } finally {
    generando.value = false
  }
}

const filas = computed(() => (data.value?.abiertos ?? []).map((a) => assignmentRow(a, data.value.today)))
const kpis = computed(() => buildKpis(data.value))
</script>

<style scoped>
.selector { width: 220px; }
.cliente { display: block; color: var(--ds-heading); }
.acciones { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; }
.nota { display: block; font-size: 11px; color: var(--ds-muted); }
.acciones .nota { display: inline; }
.prob { display: block; font-size: 15px; font-weight: 800; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.prob.ok { color: var(--ds-ok-ink); }
.cierre { white-space: nowrap; }
.cierre .btn-exec { margin-right: 6px; }
.resultado { display: inline-block; width: 190px; }

@media (max-width: 600px) {
  .selector { width: 100%; }
}
</style>
