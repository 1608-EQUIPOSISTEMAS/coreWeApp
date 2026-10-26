<template>
  <article
    class="aula-card"
    :style="{ '--aula-color': aula.color }"
    tabindex="0"
    :aria-label="`Abrir aula ${aula.name} ${aula.edition}`"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
  >
    <div class="aula-card-head">
      <div>
        <span class="aula-code">{{ aula.code }}</span>
        <span class="aula-edition">{{ aula.edition }}</span>
      </div>
      <div class="aula-pills">
        <span class="ds-pill" :class="AULA_STATUS_UI[aula.status]?.tone">{{ AULA_STATUS_UI[aula.status]?.label ?? aula.status }}</span>
        <slot name="pills" />
      </div>
    </div>
    <h3 class="aula-name">{{ aula.name }}</h3>
    <div class="aula-teacher">
      <span class="aula-avatar" aria-hidden="true">{{ initials(aula.teacher) }}</span>
      <div>
        <div class="aula-teacher-name">{{ aula.teacher }}</div>
        <div class="aula-teacher-role">Docente</div>
      </div>
    </div>
    <div class="aula-meta">
      <span>
        <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
        <strong>{{ aula.sessions || '—' }}</strong> {{ aula.sessions === 1 ? 'sesión' : 'sesiones' }}
      </span>
      <span>
        <i class="fa-solid fa-users" aria-hidden="true"></i>
        <strong>{{ formatValue(aula.students, 'num') }}</strong> alumnos
      </span>
      <span>
        <i class="fa-regular fa-calendar" aria-hidden="true"></i> {{ aula.startDate }} → {{ aula.endDate }}
      </span>
      <span>
        <i class="fa-regular fa-clock" aria-hidden="true"></i> {{ aula.schedule }}
      </span>
    </div>
    <div class="aula-foot">
      <slot name="foot" />
    </div>
  </article>
</template>

<script setup>
import { formatValue } from '@/shared/lib/formatValue'
import { AULA_STATUS_UI } from './aulaStatus'

// Tarjeta de aula compartida por Aulas y Seguimiento al Alumno: lo de arriba es
// igual en las dos; cada pantalla pone su pie (slot foot) y pills extra.
// `aula`: { code, edition, name, teacher, sessions, students, startDate,
// endDate (ya formateadas), schedule, status (aulaStatus), color }.
defineProps({ aula: { type: Object, required: true } })
defineEmits(['open'])

function initials (name) {
  if (!name) return '--'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
</script>

<style scoped>
.aula-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 18px 16px 16px;
  overflow: hidden;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius);
  cursor: pointer;
  transition: border-color 0.12s;
}
/* Barra superior con el color del segmento */
.aula-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--aula-color, var(--ds-accent));
}
.aula-card:hover { border-color: var(--ds-border-strong); }
.aula-card:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }

.aula-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.aula-pills { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.aula-code {
  padding: 2px 7px;
  font-family: var(--ds-font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-ink-2);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
}
.aula-edition { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.aula-name { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.25; color: var(--ds-heading); }

.aula-teacher { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--ds-surface-2); border-radius: var(--ds-radius-sm); }
.aula-teacher-name { font-size: 12.5px; font-weight: 600; line-height: 1.2; color: var(--ds-ink); }
.aula-teacher-role { font-size: 11px; color: var(--ds-muted); }
/* Iniciales en --ds-surface: blancas sobre el color en claro y oscuras en modo
   oscuro, donde los tonos del segmento se aclaran y el blanco perdería contraste. */
.aula-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--ds-surface);
  background: var(--aula-color, var(--ds-accent));
}

.aula-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; font-size: 12px; color: var(--ds-ink-2); }
.aula-meta span { display: flex; align-items: center; gap: 6px; min-width: 0; }
.aula-meta i { font-size: 11px; color: var(--ds-muted); }
.aula-meta strong { font-weight: 600; color: var(--ds-ink); }

.aula-foot { display: flex; align-items: center; gap: 14px; padding-top: 12px; border-top: 1px solid var(--ds-border); }
/* El pie lo pone cada pantalla; :slotted alcanza sus clases desde aqui. */
.aula-foot :slotted(.aula-stat) { font-size: 11px; color: var(--ds-muted); }
.aula-foot :slotted(.aula-stat b) { display: block; font-size: 14px; font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.aula-foot :slotted(.aula-open) { margin-left: auto; }
</style>
