<script setup>
import { inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useStudentSearch } from '@/features/student-search/useStudentSearch'
import { statusTone, paymentView, summaryLine } from '@/features/student-search/studentCourseView'

const { q, results, loading, searched, MIN_CHARS } = useStudentSearch(inject(ServiceKeys.Edition))

// Fecha calendario 'YYYY-MM-DD' -> 'DD/MM/AA', como texto (sin new Date: UTC).
const fmtDay = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '--')
const nota = (c) => (c.final_grade == null ? '--' : Number(c.final_grade).toFixed(1))
</script>

<template>
  <section class="ds-panel">
    <header class="ds-panel-head">
      <h3 class="ds-panel-title">Buscar alumno</h3>
      <span class="ds-panel-hint">DNI, celular, correo o nombre</span>
    </header>
    <div class="ds-panel-body">
      <div class="st-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          v-model="q"
          type="search"
          class="ds-input"
          placeholder="Ej. 72456155, 987434037, nombre@gmail.com o Kamila Benavides"
          aria-label="Buscar alumno por DNI, celular, correo o nombre"
        />
        <i v-if="loading" class="fa-solid fa-spinner fa-spin st-spin" aria-hidden="true"></i>
      </div>

      <p v-if="q.trim() && q.trim().length < MIN_CHARS" class="ds-empty">Escribe al menos {{ MIN_CHARS }} caracteres.</p>
      <p v-else-if="searched && !results.length && !loading" class="ds-empty">
        No encontramos alumnos con "{{ searched }}". Prueba con el DNI o solo el apellido.
      </p>

      <article v-for="p in results" :key="p.person_id" class="st-person">
        <div class="st-person-head">
          <strong>{{ p.full_name }}</strong>
          <span class="st-muted">
            DNI {{ p.dni || '--' }}
            <template v-if="p.phone"> · {{ p.phone }}</template>
            <template v-if="p.email"> · {{ p.email }}</template>
          </span>
        </div>
        <div class="st-summary">{{ summaryLine(p.summary) }}</div>

        <div class="st-table-wrap">
          <table class="ds-table">
            <thead>
              <tr>
                <th>Aula</th>
                <th>Fechas</th>
                <th>Estado</th>
                <th class="num">Nota</th>
                <th>Certificado</th>
                <th>Pago</th>
                <th>Clase</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!p.courses.length">
                <td colspan="7" class="ds-empty">Sin aulas confirmadas por FICO.</td>
              </tr>
              <tr v-for="c in p.courses" :key="c.enrollment_id">
                <td>
                  <router-link :to="{ name: 'AcademicaAulaDetail', params: { id: c.edition_num_id } }">
                    {{ c.abbreviation }} {{ c.specific_code }}
                  </router-link>
                </td>
                <td class="st-nowrap">{{ fmtDay(c.start_date) }} – {{ fmtDay(c.end_date) }}</td>
                <td><span class="ds-pill" :class="statusTone(c.status)">{{ c.status }}</span></td>
                <td class="num">{{ nota(c) }}</td>
                <td>{{ c.odoo_cert_code || '--' }}</td>
                <td><span class="ds-pill" :class="paymentView(c).tone">{{ paymentView(c).label }}</span></td>
                <td class="st-nowrap">
                  <a v-if="c.teams_link" :href="c.teams_link" target="_blank" rel="noopener" title="Link de clase (Teams)">
                    <i class="fa-solid fa-video"></i> Teams
                  </a>
                  <a v-if="c.whatsapp_link" :href="c.whatsapp_link" target="_blank" rel="noopener" title="Grupo de WhatsApp" class="st-link-gap">
                    <i class="fa-brands fa-whatsapp"></i>
                  </a>
                  <span v-if="!c.teams_link && !c.whatsapp_link" class="st-muted">--</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.st-search { position: relative; display: flex; align-items: center; }
.st-search > .fa-magnifying-glass { position: absolute; left: 12px; color: var(--ds-muted); pointer-events: none; }
.st-search .ds-input { padding-left: 34px; }
.st-spin { position: absolute; right: 12px; color: var(--ds-muted); }
.st-person { padding: 14px 0 4px; border-top: 1px solid var(--ds-border); margin-top: 14px; }
.st-person-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; color: var(--ds-ink); }
.st-muted { color: var(--ds-muted); font-size: 12.5px; }
.st-summary { margin: 4px 0 10px; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }
.st-table-wrap { overflow-x: auto; }
.st-nowrap { white-space: nowrap; }
.st-link-gap { margin-left: 10px; }
</style>
