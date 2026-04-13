<template>
  <div class="ect-wrap">
    <table class="ect">
      <thead>
        <tr class="ect-head">
          <th class="tc" style="width:45px"></th>
          <th style="min-width:125px">F. Registro</th>
          <th style="min-width:170px">Alumno / Documento</th>
          <th style="min-width:170px">Programa / Edicion</th>
          <th style="min-width:80px">Agente</th>
          <th style="min-width:85px">F. Pago</th>
          <th class="tc" style="min-width:85px">Tipo Pago</th>
          <th class="tr" style="min-width:90px">Monto Neto</th>
          <th class="tr" style="min-width:80px">Pagado</th>
          <th class="tr" style="min-width:85px">Saldo</th>
          <th class="tc" style="min-width:95px">Estado FICO</th>
        </tr>
        <tr class="ect-filters">
          <td class="tc">
            <button class="filter-clear" title="Limpiar filtros columna" @click="clearColFilters">
              <i class="fa-solid fa-eraser"></i>
            </button>
          </td>
          <td></td>
          <td>
            <input v-model="colFilters.alumno" class="filter-input" placeholder="Buscar..." />
          </td>
          <td>
            <input v-model="colFilters.programa" class="filter-input" placeholder="Buscar..." />
          </td>
          <td>
            <select v-model="colFilters.agente" class="filter-select">
              <option :value="null">Todos</option>
              <option v-for="a in uniqueAgents" :key="a" :value="a">{{ a }}</option>
            </select>
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td>
            <select v-model="colFilters.estado" class="filter-select">
              <option :value="null">Todos</option>
              <option v-for="s in uniqueEstados" :key="s" :value="s">{{ s }}</option>
            </select>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="e in enrollments"
          :key="e.enrollment_id"
          class="ect-row"
          :class="fmt.rowClass(e)"
        >
          <td class="tc">
            <button class="act-btn act-teal" title="Revisar" @click="openDetail(e)">
              <i class="fa-solid fa-clipboard-check"></i>
            </button>
          </td>
          <td class="cell-date">{{ fmt.formatDateTime(e.registration_date) }}</td>
          <td>
            <div class="cell-main cell-clip">{{ e.student_full_name }}</div>
            <div class="cell-sub cell-extra">{{ e.document_number }}</div>
          </td>
          <td>
            <div class="cell-main cell-clip">{{ e.program_name }}</div>
            <span class="pill pill-slate cell-extra">{{ e.edition_code }}</span>
          </td>
          <td>
            <div class="cell-main cell-clip">{{ e.seller_agent_name }}</div>
          </td>
          <td class="cell-date">{{ fmt.formatDate(e.pay_date) }}</td>
          <td class="tc">
            <span class="pill pill-sm" :class="fmt.isContado(e) ? 'pill-slate' : 'pill-blue'">
              {{ fmt.isContado(e) ? 'Al contado' : 'Cuotas' }}
            </span>
          </td>
          <td class="tr mono">S/. {{ fmt.formatMoney(e.total_to_pay) }}</td>
          <td class="tr mono c-green">S/. {{ fmt.formatMoney(fmt.getPagado(e)) }}</td>
          <td
            class="tr mono"
            :class="fmt.calcSaldo(e) > 0 ? 'c-red fw700' : 'c-muted'"
          >S/. {{ fmt.formatMoney(fmt.calcSaldo(e)) }}</td>
          <td class="tc">
            <span class="pill" :class="fmt.statusPill(e.confirmation)">
              {{ e.confirmation || 'Pendiente' }}
            </span>
          </td>
        </tr>
        <tr v-if="!enrollments.length">
          <td colspan="11" class="empty-row">Sin resultados</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  colFilters:  { type: Object, required: true },
  uniqueAgents:  { type: Array, default: () => [] },
  uniqueEstados: { type: Array, default: () => [] }
})

const router = useRouter()
const fmt = useEnrollmentFormatters()

function openDetail (e) {
  router.push({
    name: 'enrollmentDetail',
    params: { id: e.enrollment_id },
    state: { enrollment: JSON.parse(JSON.stringify(e)) }
  })
}

function clearColFilters () {
  props.colFilters.alumno   = ''
  props.colFilters.programa = ''
  props.colFilters.agente   = null
  props.colFilters.estado   = null
}
</script>

<style scoped>
/* ---- wrapper ---- */
.ect-wrap {
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02);
  border: 1px solid #e2e8f0;
}

/* ---- table base ---- */
.ect {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #334155;
}
.tc { text-align: center; }
.tr { text-align: right; }

/* ---- header ---- */
.ect-head th {
  background: #F9FAFB;
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: #6B7280;
  border-bottom: 2px solid #E5E7EB;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ---- filter row ---- */
.ect-filters {
  background: #F3F4F6;
}
.ect-filters td {
  padding: 6px 8px;
  border-bottom: 2px solid #14b8a6;
}

.filter-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  font-size: 11px;
  color: #334155;
  background: #F3F4F6;
  transition: border-color .15s;
}
.filter-input:focus {
  outline: none;
  border-color: #14b8a6;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(20,184,166,.1);
}
.filter-input::placeholder { color: #94a3b8; }

.filter-select {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  font-size: 11px;
  color: #334155;
  background: #F3F4F6;
  cursor: pointer;
  transition: border-color .15s;
  appearance: auto;
}
.filter-select:focus {
  outline: none;
  border-color: #14b8a6;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(20,184,166,.1);
}

.filter-clear {
  width: 28px;
  height: 28px;
  border: 1px solid #fecaca;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  color: #ef4444;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.filter-clear:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

/* ---- body rows ---- */
.ect-row td {
  padding: 12px 16px;
  border-bottom: 1px solid #E5E7EB;
  vertical-align: middle;
  height: 48px;
  box-sizing: border-box;
}
.ect-row:hover td {
  background: #F9FAFB;
}
.ect-row:last-child td {
  border-bottom: none;
}

/* ---- row status borders ---- */
.ect-row.row-green  { border-left: 3px solid #10b981; }
.ect-row.row-green  td:first-child { padding-left: 13px; }
.ect-row.row-amber  { border-left: 3px solid #f59e0b; }
.ect-row.row-amber  td:first-child { padding-left: 13px; }
.ect-row.row-red    { border-left: 3px solid #ef4444; }
.ect-row.row-red    td:first-child { padding-left: 13px; }

/* ---- action button ---- */
.act-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #E5E7EB;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  color: #64748b;
  font-size: 11px;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.act-btn.act-teal {
  border-color: #99f6e4;
  color: #0d9488;
}
.act-btn.act-teal:hover {
  background: #f0fdfa;
  border-color: #5eead4;
  color: #0f766e;
}

/* ---- cell typography ---- */
.cell-main {
  font-weight: 700;
  color: #0f172a;
  font-size: 12.5px;
  line-height: 1.3;
}
.cell-clip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.cell-sub {
  color: #94a3b8;
  font-size: 11px;
  margin-top: 1px;
}
.cell-date {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

/* ---- money / numeric ---- */
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  letter-spacing: -0.01em;
}
.fw700 { font-weight: 700; }
.c-green { color: #059669; }
.c-red   { color: #dc2626; }
.c-muted { color: #94a3b8; }

/* ---- pills ---- */
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .01em;
  white-space: nowrap;
}
.pill-sm {
  padding: 2px 6px;
  font-size: 10px;
}
.pill-slate { background: #f1f5f9; color: #64748b; }
.pill-green { background: #ecfdf5; color: #065f46; }
.pill-amber { background: #fffbeb; color: #92400e; }
.pill-blue  { background: #eff6ff; color: #1e40af; }
.pill-red   { background: #fef2f2; color: #991b1b; }

/* ---- empty state ---- */
.empty-row {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  font-size: 12.5px;
}

/* ---- responsive ---- */
@media (max-width: 768px) {
  .cell-extra { display: none; }
  .cell-clip  { max-width: 140px; }
  .ect-head th { font-size: 10px; padding: 8px; }
  .ect-row td  { padding: 8px; }
}
@media (max-width: 640px) {
  .cell-clip { max-width: 100px; }
}
</style>
