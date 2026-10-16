<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Llamar hoy</h1>
        <p class="ds-sub">Tus 20 mejores oportunidades del día, Alta primero. Cada una es tuya por 14 días; registra el resultado de cada llamada.</p>
      </div>
      <div class="ds-head-actions">
        <template v-if="esLider">
          <label class="visually-hidden" for="bandeja-asesor">Asesor</label>
          <select id="bandeja-asesor" v-model.number="asesor" class="ds-input selector">
            <option :value="0">Mi bandeja</option>
            <option v-for="a in data?.asesores ?? []" :key="a.user_id" :value="a.user_id">
              {{ displayName(a.alias) }} · {{ a.open }} abiertos
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
      <div v-for="n in 4" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
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

      <section v-if="!grupos.length" class="ds-panel">
        <p class="ds-empty">No tienes llamadas pendientes hoy. La bandeja se arma a las 6:00; lo reprogramado ("Lo pienso", "No contesta") aparece el día que toca.</p>
      </section>

      <section v-for="g in grupos" :key="g.level" class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">
            <span class="ds-pill" :class="g.tone"><i class="fa-solid" :class="g.icon" aria-hidden="true"></i> {{ g.label }}</span>
            {{ g.rows.length }} por llamar
          </h3>
          <span class="ds-panel-hint">{{ g.hint }}</span>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr><th>Cliente</th><th>Programa y por qué llamarlo</th><th class="num">Acciones</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in g.rows" :key="f.id">
                  <td>
                    <strong class="cliente">{{ f.cliente }}</strong>
                    <span v-if="f.sinNombre" class="ds-pill warn">Pide su nombre primero</span>
                    <span class="acciones">
                      <a class="btn-icon btn-icon-sm" :href="f.whatsapp" target="_blank" rel="noopener" :title="`WhatsApp a ${f.telefono}`" :aria-label="`WhatsApp a ${f.telefono}`">
                        <i class="fa-brands fa-whatsapp" aria-hidden="true"></i>
                      </a>
                      <span class="nota">{{ f.telefono }}</span>
                    </span>
                  </td>
                  <td>
                    {{ f.programa }} <span class="ds-pill" :class="f.tierTone">{{ f.tier }}</span>
                    <span v-if="f.plazo" class="ds-pill warn">{{ f.plazo }}</span>
                    <small class="nota">{{ f.porQue }}</small>
                    <small v-if="f.antes" class="antes"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> {{ f.antes }}</small>
                  </td>
                  <td class="num cierre">
                    <router-link class="btn-exec btn-exec-outline btn-sm" :to="f.ficha">
                      <i class="fa-solid fa-id-card" aria-hidden="true"></i> Abrir ficha
                    </router-link>
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
                      <option value="">Registrar resultado…</option>
                      <option v-for="o in OUTCOME_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="seguimientos.length" class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">Mensajes de seguimiento de hoy</h3>
          <span class="ds-panel-hint">Cadencia por WhatsApp (días 1, 3 y 7): el mensaje ya va escrito</span>
        </header>
        <div class="ds-panel-body">
          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista">
              <thead>
                <tr><th>Cliente</th><th>Programa</th><th>Paso</th><th class="num">Acciones</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in seguimientos" :key="s.id">
                  <td><strong class="cliente">{{ s.cliente }}</strong><span class="nota">{{ s.telefono }}</span></td>
                  <td>{{ s.programa }}<small class="nota">{{ s.motivo }}</small></td>
                  <td>
                    <span class="ds-pill info">{{ s.paso }}</span>
                    <span v-if="s.atraso" class="ds-pill warn">{{ s.atraso }}</span>
                  </td>
                  <td class="num cierre">
                    <a class="btn-exec btn-sm" :href="s.whatsapp" target="_blank" rel="noopener">
                      <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar
                    </a>
                    <button type="button" class="btn-exec btn-exec-outline btn-sm" :disabled="marcando === s.id" @click="marcarEnviado(s)">
                      <i class="fa-solid fa-check" aria-hidden="true"></i> Enviado
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Si el cliente responde o vuelve a consultar, sube de nivel y entra a tu lista de llamadas; si compra, la cadencia se cancela sola.</span>
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
import { OUTCOME_OPTIONS, OUTCOME_LABEL, assignmentRow, groupByLevel, followUpRow, buildKpis } from '@/features/prediccion/bandeja'
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
const marcando = ref(null)
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
  const outcome = event.target.value
  if (!outcome) return
  guardando.value = fila.id
  try {
    const r = await service.registrarResultado(fila.id, outcome)
    const siguiente = r.cerrado ? 'sale de tu lista' : r.cadencia ? 'pasa a la cadencia de WhatsApp' : 'vuelve el día que toca'
    toast.success(`${fila.cliente}: ${OUTCOME_LABEL[outcome]}, ${siguiente}`)
    await cargar()
  } catch (err) {
    console.error('[LlamarHoy] resultado', { assignmentId: fila.id, outcome, err })
    toast.error(err?.response?.data?.message || 'No se pudo guardar el resultado.')
    event.target.value = ''
  } finally {
    guardando.value = null
  }
}

async function marcarEnviado (fila) {
  marcando.value = fila.id
  try {
    await service.marcarSeguimiento(fila.id)
    await cargar()
  } catch (err) {
    console.error('[LlamarHoy] seguimiento', { followupId: fila.id, err })
    toast.error(err?.response?.data?.message || 'No se pudo marcar el mensaje como enviado.')
  } finally {
    marcando.value = null
  }
}

async function generar () {
  generando.value = true
  try {
    const r = await service.generarBandeja()
    toast.success(`Bandeja generada: ${r.asignados} llamadas entre ${r.asesores} asesores, ${r.control} en control y ${r.cadencia} mensajes de cadencia`)
    medicionKey.value++
    await cargar()
  } catch (err) {
    console.error('[LlamarHoy] generar', { err })
    toast.error(err?.response?.data?.message || 'No se pudo generar la bandeja.')
  } finally {
    generando.value = false
  }
}

const grupos = computed(() => groupByLevel((data.value?.abiertos ?? []).map((a) => assignmentRow(a, data.value.today))))
const seguimientos = computed(() => (data.value?.seguimientos ?? []).map((f) => followUpRow(f, data.value.today)))
const kpis = computed(() => buildKpis(data.value))
</script>

<style scoped>
.selector { width: 220px; }
.cliente { display: block; color: var(--ds-heading); }
.acciones { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; }
.nota { display: block; font-size: 11.5px; color: var(--ds-muted); }
.acciones .nota { display: inline; }
.antes { display: block; margin-top: 2px; font-size: 11.5px; color: var(--ds-warn-ink); }
.cierre { white-space: nowrap; }
.cierre .btn-exec { margin-right: 6px; }
.resultado { display: inline-block; width: 210px; }

@media (max-width: 600px) {
  .selector { width: 100%; }
  .cierre { white-space: normal; }
  .cierre .btn-exec { margin-bottom: 6px; }
  .resultado { width: 100%; }
}
</style>
