<script setup>
import { ref, computed } from 'vue'

// TODO: reemplazar por servicio real (academica.service.js)
// Cada "aula" representa un CURSO (no programa padre).
// El alumno se inscribe a un programa padre con su codigo SEG y luego es
// asignado a uno o varios cursos. Aqui solo mostramos el agregado por curso.
const COURSES = ref([
  {
    id: 'PC-EZ-02', code: 'PC-EZ-02', name: 'Esp. Power Apps y Aut.',
    edition: 'EDICION 14', modality: 'Virtual', agent: 'TM41',
    teacher: 'Carlos Mendoza Rivas', teacherInitials: 'CM',
    students: 24, sessions: 16, sessionsCompleted: 11,
    startDate: '10/03/2026', endDate: '26/06/2026', schedule: 'Mar/Jue 7:00 - 10:00 PM',
    attendance: 92, average: 16.4, atRisk: 2, status: 'Activo',
    color: '#10B981',
  },
  {
    id: 'PC-EX-01', code: 'PC-EX-01', name: 'Excel Avanzado para Negocios',
    edition: 'EDICION 22', modality: 'Presencial', agent: 'TM12',
    teacher: 'Lucia Paredes Quispe', teacherInitials: 'LP',
    students: 32, sessions: 14, sessionsCompleted: 8,
    startDate: '18/03/2026', endDate: '30/05/2026', schedule: 'Lun/Mie 6:30 - 9:30 PM',
    attendance: 88, average: 15.7, atRisk: 4, status: 'Activo',
    color: '#F59E0B',
  },
  {
    id: 'PC-PB-03', code: 'PC-PB-03', name: 'Power BI Analitica de Datos',
    edition: 'EDICION 09', modality: 'Virtual', agent: 'TM41',
    teacher: 'Renato Avila Soto', teacherInitials: 'RA',
    students: 28, sessions: 12, sessionsCompleted: 12,
    startDate: '05/01/2026', endDate: '20/03/2026', schedule: 'Sab 9:00 - 1:00 PM',
    attendance: 95, average: 17.1, atRisk: 0, status: 'Finalizado',
    color: '#6366F1',
  },
  {
    id: 'PC-SQ-04', code: 'PC-SQ-04', name: 'SQL Server para Reporteria',
    edition: 'EDICION 07', modality: 'Virtual', agent: 'TM33',
    teacher: 'Diana Salcedo Vega', teacherInitials: 'DS',
    students: 19, sessions: 14, sessionsCompleted: 4,
    startDate: '12/04/2026', endDate: '28/06/2026', schedule: 'Mar/Jue 6:00 - 9:00 PM',
    attendance: 90, average: 14.9, atRisk: 3, status: 'Activo',
    color: '#EC4899',
  },
  {
    id: 'PC-PY-05', code: 'PC-PY-05', name: 'Python para Analisis de Datos',
    edition: 'EDICION 11', modality: 'Hibrido', agent: 'TM12',
    teacher: 'Manuel Trujillo Ramos', teacherInitials: 'MT',
    students: 26, sessions: 18, sessionsCompleted: 0,
    startDate: '05/05/2026', endDate: '30/08/2026', schedule: 'Lun/Mie 7:00 - 10:00 PM',
    attendance: 0, average: 0, atRisk: 0, status: 'Proximo',
    color: '#0EA5E9',
  },
  {
    id: 'PC-AC-06', code: 'PC-AC-06', name: 'Access Bases de Datos',
    edition: 'EDICION 05', modality: 'Presencial', agent: 'TM41',
    teacher: 'Alessandra Gomez Reyes', teacherInitials: 'AG',
    students: 21, sessions: 12, sessionsCompleted: 6,
    startDate: '22/03/2026', endDate: '30/05/2026', schedule: 'Sab 2:00 - 6:00 PM',
    attendance: 86, average: 15.2, atRisk: 2, status: 'Activo',
    color: '#14B8A6',
  },
  {
    id: 'PC-VB-07', code: 'PC-VB-07', name: 'VBA Macros Profesional',
    edition: 'EDICION 13', modality: 'Virtual', agent: 'TM33',
    teacher: 'Paolo Mendieta Cardenas', teacherInitials: 'PM',
    students: 17, sessions: 14, sessionsCompleted: 9,
    startDate: '28/03/2026', endDate: '12/06/2026', schedule: 'Mar/Jue 8:00 - 11:00 PM',
    attendance: 91, average: 16.8, atRisk: 1, status: 'Activo',
    color: '#8B5CF6',
  },
])

const layout = ref('grid')
const filter = ref('Activo')
const query = ref('')

const filtered = computed(() =>
  COURSES.value.filter((c) => {
    if (filter.value !== 'Todos' && c.status !== filter.value) return false
    if (query.value) {
      const q = query.value.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q)
      )
    }
    return true
  }),
)

const activeCourses = computed(() => COURSES.value.filter((c) => c.status === 'Activo'))
const totalActive = computed(() => activeCourses.value.length)
const totalStudents = computed(() => activeCourses.value.reduce((a, c) => a + c.students, 0))
const totalAtRisk = computed(() => activeCourses.value.reduce((a, c) => a + c.atRisk, 0))
const avgAttendance = computed(() => {
  const list = activeCourses.value
  if (!list.length) return 0
  return Math.round(list.reduce((a, c) => a + c.attendance, 0) / list.length)
})

const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']
const countByStatus = (s) =>
  s === 'Todos' ? COURSES.value.length : COURSES.value.filter((c) => c.status === s).length

const modalityIcon = (m) =>
  m === 'Virtual' ? 'fa-video' : m === 'Hibrido' ? 'fa-arrows-rotate' : 'fa-building'

const statusPillClass = (s) =>
  s === 'Activo' ? 'ok' : s === 'Finalizado' ? 'neutral' : 'info'

const progressPct = (c) => Math.round((c.sessionsCompleted / c.sessions) * 100)
</script>

<template>
  <div class="aulas-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Aulas</h1>
        <div class="subtitle">
          Gestion de cursos, asistencias y notas - {{ COURSES.length }} aulas en el periodo 2026-I
        </div>
      </div>
      <div class="actions">
        <button class="btn">
          <i class="fa-solid fa-download"></i> Exportar
        </button>
        <button class="btn">
          <i class="fa-solid fa-arrows-rotate"></i> Sincronizar
        </button>
        <button class="btn primary">
          <i class="fa-solid fa-plus"></i> Nueva aula
        </button>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi" style="--bar: #10B981">
        <div class="k-label">
          <span>Aulas activas</span>
          <i class="fa-solid fa-graduation-cap k-icon"></i>
        </div>
        <div class="k-value">{{ totalActive }}</div>
        <div class="k-foot">
          <span>de {{ COURSES.length }} totales</span>
          <span class="k-delta up">+2 este mes</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #2563EB">
        <div class="k-label">
          <span>Alumnos en curso</span>
          <i class="fa-solid fa-users k-icon"></i>
        </div>
        <div class="k-value">{{ totalStudents }}</div>
        <div class="k-foot">
          <span>matriculados</span>
          <span class="k-delta up">+12 vs ed. anterior</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #F59E0B">
        <div class="k-label">
          <span>Asistencia promedio</span>
          <i class="fa-solid fa-arrow-trend-up k-icon"></i>
        </div>
        <div class="k-value">{{ avgAttendance }}%</div>
        <div class="k-foot">
          <span>en aulas activas</span>
          <span class="k-delta up">+3 pts</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #EF4444">
        <div class="k-label">
          <span>Alumnos en riesgo</span>
          <i class="fa-solid fa-triangle-exclamation k-icon"></i>
        </div>
        <div class="k-value">{{ totalAtRisk }}</div>
        <div class="k-foot">
          <span>requieren seguimiento</span>
          <span class="k-delta down">+1 esta semana</span>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="s in filterStates"
        :key="s"
        class="chip"
        :class="{ active: filter === s }"
        @click="filter = s"
      >
        <span v-if="filter === s" class="dot"></span>
        {{ s }}
        <span class="chip-count">{{ countByStatus(s) }}</span>
      </button>
      <span class="divider"></span>
      <div class="input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="query" placeholder="Buscar por nombre, codigo o docente..." />
      </div>
      <button class="chip">
        <i class="fa-solid fa-filter"></i> Mas filtros
      </button>
      <div class="spacer"></div>
      <span class="muted">{{ filtered.length }} resultados</span>
      <div class="toggle-group">
        <button :class="{ active: layout === 'grid' }" @click="layout = 'grid'">
          <i class="fa-solid fa-table-cells"></i> Tarjetas
        </button>
        <button :class="{ active: layout === 'list' }" @click="layout = 'list'">
          <i class="fa-solid fa-list"></i> Tabla
        </button>
      </div>
    </div>

    <div v-if="layout === 'grid'" class="course-grid">
      <article
        v-for="c in filtered"
        :key="c.id"
        class="course-card"
        :style="{ '--cbar': c.color }"
      >
        <div class="c-bar"></div>
        <div class="c-head">
          <div>
            <span class="c-code">{{ c.code }}</span>
            <span class="c-edition">{{ c.edition }}</span>
          </div>
          <div class="row">
            <span v-if="c.atRisk > 0" class="alert-flag">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ c.atRisk }}
            </span>
            <span class="status-pill" :class="statusPillClass(c.status)">
              <span class="dot"></span>{{ c.status }}
            </span>
          </div>
        </div>
        <h3>{{ c.name }}</h3>
        <div class="c-teacher">
          <div class="av" :style="{ background: c.color }">{{ c.teacherInitials }}</div>
          <div>
            <div class="tn">{{ c.teacher }}</div>
            <div class="tr">Docente - agente {{ c.agent }}</div>
          </div>
        </div>
        <div class="c-meta">
          <div class="m">
            <i class="fa-solid" :class="modalityIcon(c.modality)"></i>
            <strong>{{ c.modality }}</strong>
          </div>
          <div class="m">
            <i class="fa-solid fa-users"></i> <strong>{{ c.students }}</strong> alumnos
          </div>
          <div class="m">
            <i class="fa-regular fa-calendar"></i> {{ c.startDate }} -> {{ c.endDate }}
          </div>
          <div class="m">
            <i class="fa-regular fa-clock"></i> {{ c.schedule }}
          </div>
        </div>
        <div class="c-progress">
          <span class="mono">{{ c.sessionsCompleted }}/{{ c.sessions }}</span>
          <div class="track">
            <div class="fill" :style="{ width: progressPct(c) + '%' }"></div>
          </div>
          <span class="mono">{{ progressPct(c) }}%</span>
        </div>
        <div class="c-stats">
          <div class="s">
            <b>{{ c.attendance || '-' }}{{ c.attendance ? '%' : '' }}</b>Asistencia
          </div>
          <div class="s">
            <b>{{ c.average || '-' }}</b>Prom. nota
          </div>
          <div class="spacer"></div>
          <button class="btn sm">
            Ver aula <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </article>
    </div>

    <table v-else class="course-table">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Curso</th>
          <th>Docente</th>
          <th>Modalidad</th>
          <th class="center">Alumnos</th>
          <th class="center">Progreso</th>
          <th class="center">Asist.</th>
          <th class="center">Prom.</th>
          <th>Riesgo</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in filtered" :key="c.id">
          <td class="mono">{{ c.code }}</td>
          <td class="ct-name">
            {{ c.name }}<div class="sub">{{ c.edition }}</div>
          </td>
          <td>
            <div class="row">
              <div class="t-av" :style="{ background: c.color }">{{ c.teacherInitials }}</div>
              {{ c.teacher }}
            </div>
          </td>
          <td>{{ c.modality }}</td>
          <td class="center mono">{{ c.students }}</td>
          <td class="center">
            <div class="t-progress">
              <span class="mono small">{{ c.sessionsCompleted }}/{{ c.sessions }}</span>
              <div class="t-track">
                <div
                  class="t-fill"
                  :style="{ width: progressPct(c) + '%', background: c.color }"
                ></div>
              </div>
            </div>
          </td>
          <td class="center mono">{{ c.attendance ? c.attendance + '%' : '-' }}</td>
          <td class="center mono bold">{{ c.average || '-' }}</td>
          <td>
            <span v-if="c.atRisk > 0" class="alert-flag">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ c.atRisk }}
            </span>
            <span v-else class="muted small">-</span>
          </td>
          <td>
            <span class="status-pill" :class="statusPillClass(c.status)">
              <span class="dot"></span>{{ c.status }}
            </span>
          </td>
          <td class="right">
            <button class="row-action">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.aulas-shell {
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --line-soft: #EFEFEA;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;
  --green: #10B981;
  --green-soft: #ECFDF4;
  --green-ink: #047857;
  --amber-soft: #FEF6E1;
  --amber-ink: #B45309;
  --red-soft: #FEECEC;
  --red-ink: #B91C1C;
  --blue-soft: #ECF2FE;
  --blue-ink: #1D4ED8;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-md: 0 1px 2px rgba(20,20,15,0.04), 0 4px 12px rgba(20,20,15,0.06);
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
}

.row { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.muted { color: var(--ink-3); font-size: 12px; }
.small { font-size: 11.5px; }
.bold { font-weight: 600; }
.center { text-align: center; }
.right { text-align: right; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* page-head */
.page-head {
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 18px;
}
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 {
  margin: 4px 0 2px; font-size: 26px; font-weight: 600;
  letter-spacing: -0.02em;
}
.page-head .subtitle { color: var(--ink-3); font-size: 13.5px; }
.page-head .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

/* buttons */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: 1px solid var(--line); background: white;
  color: var(--ink-2); cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn:hover { background: var(--bg-soft); border-color: #DDD; }
.btn.primary {
  background: var(--ink); color: white; border-color: var(--ink);
}
.btn.primary:hover { background: #2A2A22; }
.btn.sm { padding: 5px 9px; font-size: 12.5px; }

/* KPIs */
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 18px;
}
.kpi {
  background: white; border-radius: var(--radius);
  padding: 14px 16px; border: 1px solid var(--line);
  position: relative; overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px;
  background: var(--bar, var(--ink-4));
}
.kpi .k-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.kpi .k-icon { color: var(--ink-4); font-size: 14px; }
.kpi .k-value {
  font-size: 30px; font-weight: 600; letter-spacing: -0.025em;
  margin-top: 4px; line-height: 1.1;
}
.kpi .k-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; font-size: 12px; color: var(--ink-3);
}
.kpi .k-delta { font-weight: 500; }
.kpi .k-delta.up { color: var(--green-ink); }
.kpi .k-delta.down { color: var(--red-ink); }

/* filter bar */
.filter-bar {
  background: white; border-radius: var(--radius);
  border: 1px solid var(--line);
  padding: 12px 14px;
  margin-bottom: 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  background: white; border: 1px solid var(--line);
  font-size: 12.5px; color: var(--ink-2); cursor: pointer;
  transition: background 0.15s;
}
.chip:hover { background: var(--bg-soft); }
.chip.active {
  background: #ECF8F2; color: var(--green-ink);
  border-color: #C8EFD8; font-weight: 500;
}
.chip .dot {
  width: 6px; height: 6px; border-radius: 999px; background: currentColor;
}
.chip .chip-count { color: var(--ink-4); font-size: 11px; }
.chip.active .chip-count { color: var(--green-ink); opacity: 0.7; }
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; background: white; font-size: 13px;
  min-width: 240px; color: var(--ink-3);
}
.input input {
  border: none; outline: none; font-size: 13px;
  flex: 1; background: transparent; color: var(--ink);
}
.input input::placeholder { color: var(--ink-4); }

.toggle-group {
  display: inline-flex; padding: 3px;
  background: var(--bg-soft); border: 1px solid var(--line);
  border-radius: 8px;
}
.toggle-group button {
  border: none; background: transparent;
  padding: 5px 10px; border-radius: 6px;
  font-size: 12.5px; color: var(--ink-3); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.toggle-group button.active {
  background: white; color: var(--ink);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  font-weight: 500;
}

/* status pills */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.status-pill .dot {
  width: 5px; height: 5px; border-radius: 999px; background: currentColor;
}
.status-pill.ok { background: var(--green-soft); color: var(--green-ink); }
.status-pill.warn { background: var(--amber-soft); color: var(--amber-ink); }
.status-pill.danger { background: var(--red-soft); color: var(--red-ink); }
.status-pill.info { background: var(--blue-soft); color: var(--blue-ink); }
.status-pill.neutral { background: var(--bg-soft); color: var(--ink-3); }

.alert-flag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
  background: var(--red-soft); color: var(--red-ink);
}

/* course grid */
.course-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.course-card {
  background: white; border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  padding: 16px; cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
  position: relative; overflow: hidden;
}
.course-card:hover {
  border-color: #D4D4CC;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.course-card .c-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--cbar, var(--green));
}
.course-card .c-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; margin-bottom: 12px;
}
.course-card .c-code {
  font-family: var(--font-mono); font-size: 11px;
  font-weight: 600; color: var(--ink-3);
  background: var(--bg-soft); padding: 2px 7px; border-radius: 5px;
  border: 1px solid var(--line-soft);
}
.course-card .c-edition {
  margin-left: 6px; font-size: 10.5px; color: var(--ink-4);
  font-weight: 600; letter-spacing: 0.05em;
}
.course-card h3 {
  margin: 0 0 4px; font-size: 16px; font-weight: 600;
  letter-spacing: -0.015em; line-height: 1.25;
}
.course-card .c-teacher {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 0;
  padding: 10px; background: var(--bg-soft); border-radius: 8px;
}
.course-card .c-teacher .av {
  width: 28px; height: 28px; border-radius: 999px;
  display: grid; place-items: center;
  color: white; font-weight: 600; font-size: 11px;
}
.course-card .c-teacher .tn { font-size: 12.5px; font-weight: 500; line-height: 1.2; }
.course-card .c-teacher .tr { font-size: 11px; color: var(--ink-3); }
.course-card .c-meta {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px;
  font-size: 12px;
}
.course-card .c-meta .m {
  display: flex; align-items: center; gap: 6px; color: var(--ink-3);
}
.course-card .c-meta .m i { font-size: 11px; }
.course-card .c-meta .m strong { color: var(--ink); font-weight: 500; }
.course-card .c-progress {
  margin-top: 12px;
  display: flex; align-items: center; gap: 10px;
  font-size: 11.5px; color: var(--ink-3);
}
.course-card .c-progress .track {
  flex: 1; height: 4px; background: var(--line-soft);
  border-radius: 999px; overflow: hidden;
}
.course-card .c-progress .fill {
  height: 100%; background: var(--cbar, var(--green));
  border-radius: 999px;
}
.course-card .c-stats {
  display: flex; align-items: center; gap: 14px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px solid var(--line-soft);
}
.course-card .c-stats .s { font-size: 11px; color: var(--ink-3); }
.course-card .c-stats .s b {
  color: var(--ink); font-size: 14px; font-weight: 600; display: block;
}

/* table */
.course-table {
  width: 100%; background: white;
  border: 1px solid var(--line); border-radius: var(--radius);
  border-collapse: collapse; overflow: hidden;
  font-size: 13px;
}
.course-table th, .course-table td {
  text-align: left; padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft);
}
.course-table th {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--bg-soft);
}
.course-table tr { cursor: pointer; }
.course-table tbody tr:hover { background: #FAFAF6; }
.course-table tr:last-child td { border-bottom: none; }
.course-table .ct-name { font-weight: 500; }
.course-table .ct-name .sub {
  font-size: 11px; color: var(--ink-3); font-weight: 400;
}
.t-av {
  width: 22px; height: 22px; border-radius: 999px; color: white;
  display: grid; place-items: center; font-size: 9.5px; font-weight: 700;
}
.t-progress {
  display: inline-flex; align-items: center; gap: 8px; min-width: 110px;
}
.t-progress .t-track {
  flex: 1; height: 4px; background: var(--line-soft);
  border-radius: 999px; overflow: hidden;
}
.t-progress .t-fill { height: 100%; border-radius: 999px; }

.row-action {
  width: 24px; height: 24px; border-radius: 6px;
  background: transparent; border: none;
  display: grid; place-items: center; color: var(--ink-3);
  cursor: pointer;
}
.row-action:hover { background: var(--bg-soft); color: var(--ink); }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .aulas-shell {
  --bg-soft: #1F1F1A;
  --line: #2A2A22;
  --line-soft: #1F1F1A;
  --ink: #F4F4F0;
  --ink-2: #D4D4CC;
  --ink-3: #A0A099;
  --ink-4: #6F6F66;
  --green-soft: rgba(16,185,129,0.14);
  --green-ink: #34D399;
  --amber-soft: rgba(245,158,11,0.14);
  --amber-ink: #FBBF24;
  --red-soft: rgba(239,68,68,0.14);
  --red-ink: #F87171;
  --blue-soft: rgba(37,99,235,0.18);
  --blue-ink: #60A5FA;
  --shadow-md: 0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.35);
}
[data-coreui-theme="dark"] .aulas-shell .btn {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .aulas-shell .btn:hover {
  background: #2A2A22;
  border-color: #3A3A33;
}
[data-coreui-theme="dark"] .aulas-shell .btn.primary {
  background: #F4F4F0;
  border-color: #F4F4F0;
  color: #14140F;
}
[data-coreui-theme="dark"] .aulas-shell .btn.primary:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .aulas-shell .kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .chip { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .chip:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .chip.active {
  background: rgba(16,185,129,0.16);
  color: #34D399;
  border-color: rgba(16,185,129,0.3);
}
[data-coreui-theme="dark"] .aulas-shell .input { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .input input { color: #F4F4F0; }
[data-coreui-theme="dark"] .aulas-shell .toggle-group { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .aulas-shell .toggle-group button.active {
  background: #2A2A22; color: #F4F4F0;
}
[data-coreui-theme="dark"] .aulas-shell .course-card { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-card:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-code { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-teacher { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-table th { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table tbody tr:hover { background: #1F1F1A; }
</style>
