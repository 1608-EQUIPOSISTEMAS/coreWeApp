<template>
  <section class="rs">
    <p v-if="resultados.titular?.texto" class="rs-titular" :class="resultados.titular.tono || 'neutro'">
      <strong>{{ ESTADO[resultados.titular.tono] ?? 'Resumen' }}</strong>
      <span>{{ resultados.titular.texto }}</span>
    </p>

    <div class="rs-cards">
      <div v-for="t in resultados.tarjetas" :key="t.label" class="rs-card">
        <span class="rs-card-icon" :class="t.tono || 'neutro'" aria-hidden="true">
          <i class="fa-solid" :class="t.icono || 'fa-chart-simple'"></i>
        </span>
        <div class="rs-card-body">
          <div class="rs-card-row">
            <span class="rs-card-val">{{ formato(t.valor, t.unidad) }}</span>
            <span v-if="t.ratio != null" class="rs-card-trend" :class="t.tono">{{ variacion(t.ratio) }}</span>
          </div>
          <span class="rs-card-label">{{ t.label }}</span>
          <span v-if="t.comparativo" class="rs-card-comp">{{ t.comparativo }}</span>
        </div>
      </div>
    </div>

    <div v-for="(fila, i) in resultados.filas" :key="i" class="rs-row" :class="'rs-' + fila.disposicion">
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
import ResultWidget from './ResultWidget.vue'

// Solo renderiza. Qué se mide, contra qué, el color y hasta la frase del
// veredicto lo decide el backend (dashboard/results/*.entity.js); este panel
// reparte los widgets en filas que usan todo el ancho (60/40, 50/50, tercios).
defineProps({
  resultados: { type: Object, required: true }
})

const ESTADO = { ok: 'Al día', warn: 'Atención', bad: 'Bajo lo esperado' }

const es = (n, decimales = 0) => Number(n).toLocaleString('es-PE', { maximumFractionDigits: decimales })

function formato (valor, unidad) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (unidad === 'texto') return valor
  if (unidad === 'soles') return `S/ ${es(valor)}`
  if (unidad === 'pct') return `${es(valor, 1)}%`
  if (unidad === 'horas') return `${es(valor, 1)} h`
  return es(valor, 1)
}

function variacion (ratio) {
  const cambio = Math.round((ratio - 1) * 100)
  return `${cambio >= 0 ? '↑' : '↓'} ${Math.abs(cambio)}%`
}
</script>

<style scoped>
/* Hereda --td-* de TeamDashboard; define la paleta de resultados para los widgets. */
.rs {
  --r-principal: #3a63b8;
  --r-secundario: #93b4e8;
  --r-referencia: #cbd5e1;
  --r-ok: #12a150;
  --r-warn: #e08a1e;
  --r-bad: #d64545;
  --r-ok-ink: #0f7a3d;
  --r-warn-ink: #a8620f;
  --r-bad-ink: #b83232;
  --r-soft-ok: #ecfdf3;
  --r-soft-warn: #fff7e8;
  --r-soft-bad: #fdf0f0;
  --r-soft-neutro: #f1f4f9;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.rs-titular {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 0;
  padding: 12px 18px;
  border: 1px solid var(--td-border);
  border-left: 4px solid var(--td-border);
  border-radius: 10px;
  background: var(--td-card);
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--td-navy);
}
.rs-titular strong { font-size: 12.5px; white-space: nowrap; }
.rs-titular.ok { border-left-color: var(--r-ok); } .rs-titular.ok strong { color: var(--r-ok-ink); }
.rs-titular.warn { border-left-color: var(--r-warn); } .rs-titular.warn strong { color: var(--r-warn-ink); }
.rs-titular.bad { border-left-color: var(--r-bad); } .rs-titular.bad strong { color: var(--r-bad-ink); }

.rs-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.rs-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 12px;
  min-width: 0;
}
.rs-card-icon { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 10px; font-size: 17px; }
.rs-card-icon.neutro { background: var(--r-soft-neutro); color: var(--r-principal); }
.rs-card-icon.ok { background: var(--r-soft-ok); color: var(--r-ok); }
.rs-card-icon.warn { background: var(--r-soft-warn); color: var(--r-warn); }
.rs-card-icon.bad { background: var(--r-soft-bad); color: var(--r-bad); }
.rs-card-body { min-width: 0; }
.rs-card-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.rs-card-val { font-size: 25px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; color: var(--td-navy); font-variant-numeric: tabular-nums; }
.rs-card-trend { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--r-soft-neutro); color: var(--td-ink2); }
.rs-card-trend.ok { background: var(--r-soft-ok); color: var(--r-ok-ink); }
.rs-card-trend.warn { background: var(--r-soft-warn); color: var(--r-warn-ink); }
.rs-card-trend.bad { background: var(--r-soft-bad); color: var(--r-bad-ink); }
.rs-card-label { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 600; color: var(--td-ink2); }
.rs-card-comp { display: block; margin-top: 1px; font-size: 11.5px; color: var(--td-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rs-row { display: grid; gap: 16px; }
.rs-hero { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.rs-mitad { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.rs-tercios { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rs-completa { grid-template-columns: minmax(0, 1fr); }

@media (max-width: 1200px) {
  .rs-tercios { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .rs-hero, .rs-mitad, .rs-tercios { grid-template-columns: minmax(0, 1fr); }
}

[data-coreui-theme="dark"] .rs {
  --r-principal: #8faadc;
  --r-secundario: #4f6a9a;
  --r-referencia: #4a4a42;
  --r-ok: #34d399;
  --r-warn: #e9b872;
  --r-bad: #f87171;
  --r-ok-ink: #34d399;
  --r-warn-ink: #e9b872;
  --r-bad-ink: #f87171;
  --r-soft-ok: rgba(52, 211, 153, 0.12);
  --r-soft-warn: rgba(233, 184, 114, 0.12);
  --r-soft-bad: rgba(248, 113, 113, 0.12);
  --r-soft-neutro: #24241e;
}
</style>
