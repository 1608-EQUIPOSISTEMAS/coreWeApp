<template>
  <section class="ds-panel">
    <header class="ds-panel-head">
      <h3 class="ds-panel-title">¿La bandeja hace vender más?</h3>
      <span class="ds-panel-hint">Llamados contra un {{ CONTROL_SHARE }}% sorteado que no se llama</span>
    </header>
    <div class="ds-panel-body">
      <p v-if="error" class="ds-alert">{{ error }}</p>
      <span v-else-if="loading" class="ds-skel"></span>
      <template v-else-if="vista">
        <p v-if="vista.vacio" class="ds-empty">{{ vista.nota }}</p>
        <template v-else>
          <div class="ds-table-scroll">
            <table class="ds-table">
              <thead>
                <tr><th>Segmento</th><th class="num">Llamados</th><th class="num">Sin llamar</th><th class="num">Lift</th><th>Resultado</th><th>Calibración</th></tr>
              </thead>
              <tbody>
                <tr v-for="f in vista.filas" :key="f.segmento">
                  <td>{{ f.segmento }}</td>
                  <td class="num">{{ f.llamados }}</td>
                  <td class="num">{{ f.control }}</td>
                  <td class="num">{{ f.lift }}</td>
                  <td><span class="ds-pill" :class="f.veredicto.tone">{{ f.veredicto.label }}</span></td>
                  <td><span :class="{ aviso: f.calibracionTone }">{{ f.calibracion }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="nota">{{ vista.nota }}</p>
        </template>
        <p v-if="vista.trabajo" class="ds-callout" :class="vista.trabajoTone">
          <i class="fa-solid fa-headset" aria-hidden="true"></i><span>{{ vista.trabajo }}</span>
        </p>
        <div v-if="vista.resultados.length" class="motivos">
          <strong>¿Qué dicen los clientes? (90 días)</strong>
          <ul>
            <li v-for="m in vista.resultados" :key="m.resultado"><span>{{ m.resultado }}</span><span class="num">{{ m.total }} · {{ m.pct }}</span></li>
          </ul>
        </div>
      </template>
    </div>
    <footer class="ds-panel-foot">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>"Vende más" solo aparece cuando la diferencia no se explica por azar (95%). Calibración: si quienes no se llamaron compran muy distinto a lo que dijimos, el nivel de la bandeja se recalibra.</span>
    </footer>
  </section>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { measurementView } from '@/features/prediccion/bandeja'

// Mismo % que el backend (bandeja.entity.js CONTROL_SHARE); solo es texto.
const CONTROL_SHARE = 15

const props = defineProps({ reloadKey: { type: Number, default: 0 } })

const service = inject(ServiceKeys.Prediccion)
const vista = ref(null)
const loading = ref(false)
const error = ref('')

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    vista.value = measurementView(await service.medicion())
  } catch (err) {
    console.error('[LlamarHoy] medicion', { err })
    error.value = err?.response?.data?.message || 'No se pudo cargar la medición.'
  } finally {
    loading.value = false
  }
}
watch(() => props.reloadKey, cargar, { immediate: true })
</script>

<style scoped>
.nota { margin: 8px 0 0; font-size: 12px; color: var(--ds-muted); }
.aviso { color: var(--ds-warn-ink); font-weight: 600; }
.ds-callout { margin-top: 12px; }
.motivos { margin-top: 12px; font-size: 12.5px; color: var(--ds-ink-2); }
.motivos ul { margin: 6px 0 0; padding: 0; list-style: none; }
.motivos li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--ds-border); }
.motivos li:last-child { border-bottom: 0; }
</style>
