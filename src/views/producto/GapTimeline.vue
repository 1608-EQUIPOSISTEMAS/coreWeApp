<template>
  <div v-if="loading" class="gt-skel" aria-busy="true">
    <span v-for="n in 3" :key="n" class="ds-skel"></span>
  </div>
  <p v-else-if="!items || items.length === 0" class="ds-empty">Sin datos.</p>
  <div v-else class="ds-table-scroll gt-scroll">
    <table class="ds-table ds-table--densa gt-tabla">
      <thead>
        <tr><th class="gt-idx">#</th><th>Fecha</th><th class="num">Estado</th></tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in items" :key="idx" :class="{ 'gt-actual': item.type === 'current' }">
          <td class="gt-idx">
            <i v-if="item.type === 'current'" class="fa-solid fa-caret-right gt-caret" aria-hidden="true"></i>
            <span v-else>{{ idx + 1 }}</span>
          </td>
          <td>
            <span class="gt-fecha">{{ formatDate(item.start_date_eff) + ' [' + item.global_code + ']' }}</span>
            <span class="gt-meta">
              <span>{{ item.hoursLabel }}</span>
              <span>{{ item.daysLabel }}</span>
            </span>
          </td>
          <td class="num">
            <span v-if="item.type === 'current'" class="ds-pill info">SELECCIÓN</span>
            <span v-else-if="item.gapInfo" class="ds-pill" :class="gapTone(item.gapInfo)">{{ item.gapInfo.label }}</span>
            <span v-else class="ds-pill ok">OK</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
// Tabla del popover "Analisis de Tiempos": el historial de ediciones del programa
// con la fila en edicion intercalada, para ver de un vistazo cuantos dias la
// separan de la anterior y de la siguiente.
//
// Solo dibuja: el historial y los gaps los calcula quien la usa (Editions.vue).
// formatDate se inyecta, igual que en utils/childEdition.js, para no atar esta
// tabla al formateador de una vista.
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  formatDate: { type: Function, required: true }
})

// gapInfo.color llega como clase de Bootstrap ('text-warning', etc.) desde
// Editions.vue; aqui solo se traduce a tono ds-* sin tocar ese contrato.
const TONO_POR_COLOR = { danger: 'bad', warning: 'warn', success: 'ok', info: 'info' }

function gapTone (gapInfo) {
  const clave = Object.keys(TONO_POR_COLOR).find(k => gapInfo.color?.includes(k))
  return TONO_POR_COLOR[clave] || 'info'
}
</script>

<style scoped>
.gt-skel { display: flex; flex-direction: column; gap: 10px; padding: 12px 0; }

/* El popover tiene alto fijo: la tabla scrollea por dentro con la cabecera fija
   (fondo opaco para que las filas no se transparenten debajo en oscuro). */
.gt-scroll { max-height: 280px; overflow-y: auto; }
.gt-tabla thead th { position: sticky; top: 0; z-index: 1; background: var(--ds-surface); box-shadow: inset 0 -1px 0 var(--ds-border); }
.gt-tabla td { vertical-align: middle; }
.gt-idx { width: 40px; text-align: center; color: var(--ds-muted); }

.gt-fecha { display: block; font-weight: 700; color: var(--ds-ink); }
.gt-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; text-transform: uppercase; color: var(--ds-muted); }

/* La edicion que se esta editando: tinte info + barra a la izquierda, para
   ubicarla entre las demas sin leer las fechas. */
.gt-actual td { background: var(--ds-soft-info); }
.gt-actual td:first-child { box-shadow: inset 3px 0 0 var(--ds-accent); }
.gt-caret { color: var(--ds-accent); }
</style>
