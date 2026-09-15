<template>
  <section class="ds-stack">
    <p v-if="resultados.titular?.texto" class="ds-verdict" :class="resultados.titular.tono || 'neutro'">
      <strong>{{ ESTADO[resultados.titular.tono] ?? 'Resumen' }}</strong>
      <span>{{ resultados.titular.texto }}</span>
    </p>

    <div class="ds-kpis">
      <div v-for="t in resultados.tarjetas" :key="t.label" class="ds-kpi">
        <span class="ds-kpi-icon" :class="t.tono" aria-hidden="true">
          <i class="fa-solid" :class="t.icono || 'fa-chart-simple'"></i>
        </span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">{{ formatValue(t.valor, t.unidad) }}</span>
            <span v-if="t.ratio != null" class="ds-trend" :class="t.tono">{{ variacion(t.ratio) }}</span>
          </div>
          <span class="ds-kpi-label">{{ t.label }}</span>
          <span v-if="t.comparativo" class="ds-kpi-note">{{ t.comparativo }}</span>
        </div>
      </div>
    </div>

    <div v-for="(fila, i) in resultados.filas" :key="i" class="ds-row" :class="'ds-row--' + fila.disposicion">
      <ResultWidget
        v-for="w in fila.widgets"
        :key="w.titulo"
        :widget="w"
        :alto="fila.disposicion === 'hero' ? 300 : 230"
      />
    </div>
  </section>
</template>

<script setup>
import { formatValue } from '@/shared/lib/formatValue.js'
import ResultWidget from './ResultWidget.vue'

// Solo renderiza. Qué se mide, contra qué, el color y hasta la frase del
// veredicto lo decide el backend (dashboard/results/*.entity.js). La grilla
// (60/40, 50/50, tercios) y los colores son del sistema de diseño global.
defineProps({
  resultados: { type: Object, required: true }
})

const ESTADO = { ok: 'Al día', warn: 'Atención', bad: 'Bajo lo esperado' }

function variacion (ratio) {
  const cambio = Math.round((ratio - 1) * 100)
  return `${cambio >= 0 ? '↑' : '↓'} ${Math.abs(cambio)}%`
}
</script>
