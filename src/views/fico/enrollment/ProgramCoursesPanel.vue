<template>
  <section class="pcp">
    <p class="pcp-hint">
      Los cursos reales del alumno en este programa. Un curso reprogramado queda en <code class="pcp-tag">RP</code> y,
      debajo, el curso con su nueva fecha. Las cuotas siguen en el programa.
    </p>

    <p v-if="overdue?.cantidad" class="ds-callout warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <span>El programa tiene <b>{{ overdue.cantidad }} cuota(s) vencida(s)</b> por {{ fmtMoney(overdue.monto) }}.</span>
    </p>

    <ol class="pcp-list">
      <li
        v-for="c in numbered"
        :key="c.enrollment_id"
        class="pcp-item"
        :class="{ 'pcp-old': c.reprogrammed, 'pcp-new': c.reprogrammed_from }"
      >
        <span class="pcp-step" aria-hidden="true">{{ c.reprogrammed ? 'RP' : c.n }}</span>
        <div class="pcp-card">
          <div class="pcp-main">
            <i v-if="c.reprogrammed_from" class="fa-solid fa-turn-up fa-rotate-90 pcp-arrow" aria-hidden="true"></i>
            <span class="pcp-name">{{ c.course_name }}</span>
            <span class="pcp-id">#{{ c.enrollment_id }}</span>
            <span class="pcp-code">{{ c.edition_code || 's/e' }}</span>
          </div>
          <div class="pcp-dates">
            <span class="pcp-range">{{ fmtCourseRange(c.start_date, c.end_date) }}</span>
            <span v-if="courseWeeks(c.start_date, c.end_date)" class="pcp-weeks">{{ weeksLabel(courseWeeks(c.start_date, c.end_date)) }}</span>
          </div>
          <span v-if="c.reprogrammed" class="pcp-status warn">
            <span class="pcp-dot"></span>RP<template v-if="c.reprogrammed_to"> → #{{ c.reprogrammed_to }}</template>
          </span>
          <span v-else-if="c.state" class="pcp-status" :class="STATE[c.state].tone">
            <span class="pcp-dot"></span>{{ STATE[c.state].label }}
          </span>
          <span v-else class="pcp-status"><span class="pcp-dot"></span>{{ c.status_label || 'Fuera del aula' }}</span>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCourseRange, courseWeeks, weeksLabel } from './courseDates.js'

const props = defineProps({
  courses: { type: Array, default: () => [] },
  overdue: { type: Object, default: null }
})

const STATE = {
  terminado: { label: 'Terminado', tone: 'ok' },
  en_curso: { label: 'En curso', tone: 'info' },
  por_iniciar: { label: 'Por iniciar', tone: '' }
}

// El curso reprogramado no cuenta como paso: su reemplazo toma el número.
const numbered = computed(() => {
  let n = 0
  return props.courses.map(c => ({ ...c, n: c.reprogrammed ? null : ++n }))
})

const fmtMoney = v => `S/ ${Number(v || 0).toFixed(2)}`
</script>

<style scoped>
.pcp { display: flex; flex-direction: column; gap: 14px; }
.pcp-hint { margin: 0; max-width: 760px; font-size: 12.5px; line-height: 1.6; color: var(--ds-muted); }
.pcp-tag {
  padding: 1px 6px;
  font-family: var(--ds-font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-heading);
  background: var(--ds-surface-2);
  border-radius: var(--ds-radius-control);
}

.pcp-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pcp-item { position: relative; display: flex; align-items: center; gap: 16px; }
/* Línea que une los pasos */
.pcp-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 13px;
  top: calc(50% + 14px);
  height: calc(100% - 20px);
  width: 1px;
  background: var(--ds-border);
}
.pcp-step {
  flex: none;
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-muted);
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: 50%;
}

.pcp-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 14px 14px 16px;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-card, 10px);
}
.pcp-main { flex: 1; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; }
.pcp-name { font-size: 13.5px; font-weight: 700; color: var(--ds-heading); text-transform: uppercase; }
.pcp-id { font-size: 11.5px; color: var(--ds-muted); font-family: var(--ds-font-mono); }
.pcp-code {
  padding: 2px 7px;
  font-family: var(--ds-font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-heading);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-control);
}
.pcp-arrow { font-size: 11px; color: var(--ds-muted); }

.pcp-dates { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.pcp-range { font-size: 13px; color: var(--ds-heading); white-space: nowrap; }
.pcp-weeks { font-size: 10.5px; color: var(--ds-muted); }

.pcp-status {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ds-heading);
  background: var(--ds-surface-2);
  border-radius: 999px;
  white-space: nowrap;
}
.pcp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ds-muted); opacity: 0.6; }
.pcp-status.ok .pcp-dot { background: var(--ds-ok, #16a34a); opacity: 1; }
.pcp-status.info .pcp-dot { background: var(--ds-info, #2563eb); opacity: 1; }
.pcp-status.warn .pcp-dot { background: var(--ds-warn, #d97706); opacity: 1; }

.pcp-old .pcp-card { background: var(--ds-surface-2); }
.pcp-old .pcp-name { text-decoration: line-through; color: var(--ds-muted); }
.pcp-old .pcp-range { color: var(--ds-muted); }
.pcp-old .pcp-step { font-size: 9px; }

@media (max-width: 640px) {
  .pcp-card { flex-wrap: wrap; gap: 10px; }
  .pcp-dates { align-items: flex-start; text-align: left; }
}
</style>
