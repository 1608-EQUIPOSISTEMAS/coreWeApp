<template>
  <article class="rw">
    <header class="rw-head">
      <h3 class="rw-title">{{ widget.titulo }}</h3>
      <RouterLink v-if="widget.verTodo" :to="widget.verTodo.ruta" class="rw-link">
        {{ widget.verTodo.texto || 'Ver todos' }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </RouterLink>
      <span v-else-if="widget.pista" class="rw-hint">{{ widget.pista }}</span>
    </header>

    <div class="rw-body">
      <p v-if="vacio" class="rw-empty">Sin datos en el período.</p>

      <ResultChart v-else-if="widget.tipo === 'grafico'" :grafico="widget.grafico" :alto="alto" />

      <!-- Comparativo: la cifra del período contra la anterior -->
      <div v-else-if="widget.tipo === 'comparativo'" class="cmp">
        <div class="cmp-big">
          <span class="cmp-num">{{ formato(widget.valor, widget.unidad) }}</span>
          <span class="cmp-label">{{ widget.etiqueta }}</span>
          <span v-if="widget.ratio != null" class="cmp-trend" :class="widget.tono">
            {{ variacion(widget.ratio) }} {{ widget.contra }}
          </span>
        </div>
        <div v-for="b in widget.barras" :key="b.label" class="cmp-row">
          <span class="cmp-row-label">{{ b.label }}</span>
          <div class="cmp-track">
            <i class="actual" :style="{ width: anchoComparativo(b.actual) + '%' }"></i>
            <i class="anterior" :style="{ width: anchoComparativo(b.anterior) + '%' }"></i>
          </div>
          <span class="cmp-nums">{{ formato(b.actual, b.unidad) }} <small>/ {{ formato(b.anterior, b.unidad) }}</small></span>
        </div>
        <div v-if="widget.barras?.length" class="cmp-legend">
          <span><i class="dot actual"></i> Este período</span>
          <span><i class="dot anterior"></i> Anterior</span>
        </div>
      </div>

      <!-- Ranking: top N con barra relativa al primero -->
      <ol v-else-if="widget.tipo === 'ranking'" class="rank">
        <li v-for="(item, i) in widget.items" :key="item.label + i">
          <component :is="item.ruta ? 'RouterLink' : 'div'" :to="item.ruta" class="rank-item" :class="{ link: item.ruta }">
            <div class="rank-info">
              <span class="rank-pos">{{ i + 1 }}</span>
              <span class="rank-name">
                {{ item.label }}
                <small v-if="item.sublabel">{{ item.sublabel }}</small>
              </span>
              <span class="rank-val" :class="item.tono">{{ formato(item.valor, widget.unidad) }}</span>
            </div>
            <div class="rank-track"><i :class="item.tono" :style="{ width: anchoRanking(item.valor) + '%' }"></i></div>
          </component>
        </li>
      </ol>

      <!-- Dona -->
      <div v-else-if="widget.tipo === 'dona'" class="dona">
        <svg viewBox="0 0 120 120" class="dona-svg" role="img" :aria-label="widget.titulo">
          <circle cx="60" cy="60" r="48" fill="none" class="dona-base" stroke-width="16" />
          <circle
            v-for="s in arcos" :key="s.label"
            cx="60" cy="60" r="48" fill="none" stroke-width="16"
            :class="'seg-' + (s.tono || 'principal')"
            :stroke-dasharray="`${s.largo} ${CIRCUNFERENCIA}`"
            :stroke-dashoffset="-s.inicio"
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="58" text-anchor="middle" class="dona-num">{{ formatoCompacto(widget.total, widget.unidad) }}</text>
          <text x="60" y="73" text-anchor="middle" class="dona-sub">{{ widget.etiquetaTotal }}</text>
        </svg>
        <ul class="leyenda">
          <li v-for="s in widget.segmentos" :key="s.label">
            <i class="dot" :class="'seg-bg-' + (s.tono || 'principal')"></i>
            {{ s.label }} <strong>{{ formato(s.valor, widget.unidad) }}</strong>
          </li>
        </ul>
      </div>

      <!-- Medidor (media luna) para un porcentaje contra el 100% -->
      <div v-else-if="widget.tipo === 'medidor'" class="gauge">
        <svg
          viewBox="0 0 200 120" class="gauge-svg" role="img"
          :style="{ width: alto >= 300 ? '270px' : '190px' }"
          :aria-label="`${widget.titulo}: ${widget.pct}%`"
        >
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" class="gauge-base" stroke-width="14" stroke-linecap="round" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke-width="14" stroke-linecap="round"
            :class="'seg-' + (widget.tono || 'principal')"
            :stroke-dasharray="`${arcoMedidor} ${ARCO_MEDIDOR}`"
          />
          <text x="100" y="90" text-anchor="middle" class="gauge-num">{{ formato(widget.pct, 'pct') }}</text>
          <text x="100" y="110" text-anchor="middle" class="gauge-sub">{{ widget.etiqueta }}</text>
        </svg>
        <div v-if="widget.leyenda?.length" class="gauge-legend">
          <span v-for="l in widget.leyenda" :key="l.label" :class="l.tono">{{ formato(l.valor, 'num') }} {{ l.label }}</span>
        </div>
      </div>

      <!-- Métricas: lista label / valor -->
      <dl v-else-if="widget.tipo === 'metricas'" class="metricas">
        <div v-for="m in widget.items" :key="m.label" class="metrica">
          <dt>{{ m.label }}<small v-if="m.nota">{{ m.nota }}</small></dt>
          <dd :class="m.tono">{{ formato(m.valor, m.unidad) }}</dd>
        </div>
      </dl>

      <!-- Tabla corta: cada fila puede llevar al registro -->
      <div v-else-if="widget.tipo === 'tabla'" class="tabla-scroll">
        <table class="tabla">
          <thead>
            <tr>
              <th v-for="c in widget.columnas" :key="c.key" :class="{ num: c.unidad !== 'texto' }">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(fila, i) in widget.filas" :key="i"
              :class="{ link: fila.ruta }"
              :tabindex="fila.ruta ? 0 : undefined"
              @click="ir(fila.ruta)"
              @keydown.enter="ir(fila.ruta)"
            >
              <td
                v-for="c in widget.columnas" :key="c.key"
                :class="[{ num: c.unidad !== 'texto' }, fila['tono_' + c.key]]"
              >{{ formato(fila[c.key], c.unidad) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer v-if="widget.insight?.texto" class="rw-insight" :class="widget.insight.tono || 'neutro'">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>{{ widget.insight.texto }}</span>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ResultChart from './ResultChart.vue'

// Un widget del contrato de resultados (dashboard/results/results.entity.js).
// Solo dibuja: qué mide, contra qué, el tono y la frase de insight vienen del backend.
const props = defineProps({
  widget: { type: Object, required: true },
  alto: { type: Number, default: 230 }
})

const router = useRouter()
const ir = (ruta) => { if (ruta) router.push(ruta) }

const CIRCUNFERENCIA = 2 * Math.PI * 48
const ARCO_MEDIDOR = Math.PI * 80

const vacio = computed(() => {
  const w = props.widget
  if (w.tipo === 'grafico') return !w.grafico?.categorias?.length
  if (w.tipo === 'ranking') return !w.items?.length
  if (w.tipo === 'tabla') return !w.filas?.length
  if (w.tipo === 'dona') return !w.total
  if (w.tipo === 'medidor') return w.pct === null || w.pct === undefined
  if (w.tipo === 'metricas') return !w.items?.length
  return false
})

const es = (n, decimales = 0) => Number(n).toLocaleString('es-PE', { maximumFractionDigits: decimales })

function formato (valor, unidad) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (unidad === 'texto') return valor
  if (unidad === 'soles') return `S/ ${es(valor)}`
  if (unidad === 'pct') return `${es(valor, 1)}%`
  if (unidad === 'horas') return `${es(valor, 1)} h`
  return es(valor, 1)
}

// El centro de la dona mide ~70px: "S/ 1,256,059" se sale del anillo. Ahí va
// compacto (S/ 1.3 M); la cifra exacta queda en la leyenda.
function formatoCompacto (valor, unidad) {
  const n = Number(valor)
  if (unidad !== 'soles' || !Number.isFinite(n) || Math.abs(n) < 10000) return formato(valor, unidad)
  return `S/ ${n.toLocaleString('es-PE', { notation: 'compact', maximumFractionDigits: 1 })}`
}

function variacion (ratio) {
  const cambio = Math.round((ratio - 1) * 100)
  return `${cambio >= 0 ? '+' : '−'}${Math.abs(cambio)}%`
}

const maxComparativo = computed(() => Math.max(1, ...(props.widget.barras ?? []).flatMap(b => [Number(b.actual) || 0, Number(b.anterior) || 0])))
const anchoComparativo = (v) => Math.round(((Number(v) || 0) / maxComparativo.value) * 100)

const maxRanking = computed(() => Math.max(1, ...(props.widget.items ?? []).map(i => Number(i.valor) || 0)))
const anchoRanking = (v) => Math.max(2, Math.round(((Number(v) || 0) / maxRanking.value) * 100))

const arcos = computed(() => {
  const total = Number(props.widget.total) || 0
  let inicio = 0
  return (props.widget.segmentos ?? []).map(s => {
    const largo = total ? (Number(s.valor) / total) * CIRCUNFERENCIA : 0
    const arco = { ...s, largo, inicio }
    inicio += largo
    return arco
  })
})

const arcoMedidor = computed(() => (Math.min(100, Math.max(0, Number(props.widget.pct) || 0)) / 100) * ARCO_MEDIDOR)
</script>

<style scoped>
/* Colores de las variables --td-* (TeamDashboard) y --r-* (TeamResults). */
.rw {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 12px;
  overflow: hidden;
}
.rw-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--td-border);
}
.rw-title { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--td-navy); }
.rw-hint { font-size: 11.5px; color: var(--td-muted); white-space: nowrap; }
.rw-link { font-size: 12px; font-weight: 600; color: var(--td-ink2); text-decoration: none; white-space: nowrap; }
.rw-link:hover, .rw-link:focus-visible { color: var(--r-principal); }
.rw-link i { font-size: 10px; margin-left: 3px; }
.rw-body { flex: 1; padding: 16px 18px; display: flex; flex-direction: column; justify-content: center; min-height: 170px; }
.rw-empty { margin: 0; text-align: center; font-size: 13px; color: var(--td-muted); }

.rw-insight { display: flex; gap: 8px; align-items: flex-start; padding: 10px 18px; font-size: 12px; line-height: 1.5; border-top: 1px solid var(--td-border); }
.rw-insight i { margin-top: 2px; font-size: 12px; }
.rw-insight.neutro { background: var(--r-soft-neutro); color: var(--td-ink2); }
.rw-insight.ok { background: var(--r-soft-ok); color: var(--r-ok-ink); }
.rw-insight.warn { background: var(--r-soft-warn); color: var(--r-warn-ink); }
.rw-insight.bad { background: var(--r-soft-bad); color: var(--r-bad-ink); }

/* Comparativo */
.cmp { display: flex; flex-direction: column; gap: 14px; }
.cmp-big { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.cmp-num { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: var(--td-navy); font-variant-numeric: tabular-nums; }
.cmp-label { font-size: 12px; color: var(--td-muted); }
.cmp-trend { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; background: var(--r-soft-neutro); color: var(--td-ink2); }
.cmp-trend.ok { background: var(--r-soft-ok); color: var(--r-ok-ink); }
.cmp-trend.warn { background: var(--r-soft-warn); color: var(--r-warn-ink); }
.cmp-trend.bad { background: var(--r-soft-bad); color: var(--r-bad-ink); }
.cmp-row { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; }
.cmp-row-label { grid-column: 1 / -1; font-size: 11.5px; font-weight: 600; color: var(--td-ink2); }
.cmp-track { display: flex; flex-direction: column; gap: 3px; }
.cmp-track i { display: block; height: 8px; border-radius: 4px; }
.cmp-track i.actual, .dot.actual { background: var(--r-principal); }
.cmp-track i.anterior, .dot.anterior { background: var(--r-referencia); }
.cmp-nums { font-size: 12px; font-weight: 700; color: var(--td-navy); font-variant-numeric: tabular-nums; white-space: nowrap; }
.cmp-nums small { font-weight: 500; color: var(--td-muted); }
.cmp-legend { display: flex; justify-content: center; gap: 14px; font-size: 11px; color: var(--td-muted); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }

/* Ranking */
.rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.rank-item { display: block; color: inherit; text-decoration: none; border-radius: 6px; }
.rank-item.link:hover .rank-name, .rank-item.link:focus-visible .rank-name { color: var(--r-principal); }
.rank-info { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.rank-pos { width: 19px; height: 19px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: var(--r-soft-neutro); color: var(--td-ink2); }
.rank-name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--td-navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-name small { margin-left: 6px; font-weight: 500; color: var(--td-muted); }
.rank-val { font-size: 12.5px; font-weight: 700; color: var(--r-principal); font-variant-numeric: tabular-nums; }
.rank-track { height: 6px; border-radius: 3px; background: var(--r-soft-neutro); overflow: hidden; }
.rank-track i { display: block; height: 100%; border-radius: 3px; background: var(--r-principal); }

/* Tonos compartidos por ranking, dona, medidor, métricas y tabla */
.rank-val.ok, .metrica dd.ok, .tabla td.ok, .gauge-legend .ok { color: var(--r-ok-ink); }
.rank-val.warn, .metrica dd.warn, .tabla td.warn, .gauge-legend .warn { color: var(--r-warn-ink); }
.rank-val.bad, .metrica dd.bad, .tabla td.bad, .gauge-legend .bad { color: var(--r-bad-ink); }
.rank-track i.ok { background: var(--r-ok); }
.rank-track i.warn { background: var(--r-warn); }
.rank-track i.bad { background: var(--r-bad); }
.seg-principal { stroke: var(--r-principal); } .seg-bg-principal { background: var(--r-principal); }
.seg-secundario { stroke: var(--r-secundario); } .seg-bg-secundario { background: var(--r-secundario); }
.seg-neutro { stroke: var(--r-referencia); } .seg-bg-neutro { background: var(--r-referencia); }
.seg-ok { stroke: var(--r-ok); } .seg-bg-ok { background: var(--r-ok); }
.seg-warn { stroke: var(--r-warn); } .seg-bg-warn { background: var(--r-warn); }
.seg-bad { stroke: var(--r-bad); } .seg-bg-bad { background: var(--r-bad); }

/* Dona */
.dona { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; justify-content: center; }
.dona-svg { width: 132px; height: 132px; flex-shrink: 0; }
.dona-base, .gauge-base { stroke: var(--r-soft-neutro); }
.dona-num { font-size: 20px; font-weight: 800; fill: var(--td-navy); }
.dona-sub { font-size: 9.5px; fill: var(--td-muted); }
.leyenda { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; min-width: 150px; }
.leyenda li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--td-ink2); }
.leyenda strong { margin-left: auto; padding-left: 12px; color: var(--td-navy); font-variant-numeric: tabular-nums; }
.leyenda .dot { margin-right: 2px; }

/* Medidor */
.gauge { display: flex; flex-direction: column; align-items: center; gap: 8px; }
/* El ancho lo fija `alto`: en la columna del 40% de la fila principal un medidor chico deja la mitad del panel vacía. */
.gauge-svg { height: auto; max-width: 100%; }
.gauge-num { font-size: 26px; font-weight: 800; fill: var(--td-navy); }
.gauge-sub { font-size: 10.5px; fill: var(--td-muted); }
.gauge-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; font-size: 12px; font-weight: 600; color: var(--td-ink2); }

/* Métricas */
.metricas { margin: 0; display: flex; flex-direction: column; }
.metrica { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 9px 0; border-top: 1px solid var(--td-border); }
.metrica:first-child { border-top: 0; padding-top: 0; }
.metrica dt { font-size: 12.5px; color: var(--td-ink2); }
.metrica dt small { display: block; font-size: 11px; color: var(--td-muted); }
.metrica dd { margin: 0; font-size: 15px; font-weight: 800; color: var(--td-navy); font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Tabla */
.tabla-scroll { overflow-x: auto; align-self: stretch; }
.tabla { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tabla th { text-align: left; font-size: 11.5px; font-weight: 600; color: var(--td-muted); padding: 0 12px 9px 0; white-space: nowrap; }
.tabla td { padding: 9px 12px 9px 0; border-top: 1px solid var(--td-border); color: var(--td-ink2); }
.tabla td:first-child { font-weight: 600; color: var(--td-navy); }
.tabla .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tabla td.ok, .tabla td.warn, .tabla td.bad { font-weight: 700; }
.tabla tr.link { cursor: pointer; }
.tabla tr.link:hover td, .tabla tr.link:focus-visible td { background: var(--r-soft-neutro); }
.tabla tr.link:focus-visible { outline: 2px solid var(--r-principal); outline-offset: -2px; }
</style>
