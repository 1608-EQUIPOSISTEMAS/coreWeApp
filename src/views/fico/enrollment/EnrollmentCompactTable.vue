<template>
  <div class="ect-wrap">
    <table class="ect">
      <thead>
        <tr class="ect-head">
          <th class="tc" style="width:42px"></th>
          <th style="width:120px">F. Registro</th>
          <th>Alumno / Documento</th>
          <th>Programa / Edicion</th>
          <th style="width:70px">Agente</th>
          <th style="width:85px">F. Pago</th>
          <th class="tc" style="width:80px">Tipo Pago</th>
          <th class="tr" style="width:95px">Monto Neto</th>
          <th class="tr" style="width:80px">Inicial</th>
          <th class="tr" style="width:80px">Pagado</th>
          <th class="tr" style="width:85px">Saldo</th>
          <th class="tc" style="width:125px">Estado FICO</th>
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
          <td>
            <input v-model="colFilters.fPago" class="filter-input" placeholder="Buscar..." />
          </td>
          <td>
            <select v-model="colFilters.tipoPago" class="filter-select">
              <option :value="null">Todos</option>
              <option v-for="t in uniqueTipoPago" :key="t" :value="t">{{ t }}</option>
            </select>
          </td>
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
          <td class="tr mono" :class="fmt.isContado(e) ? '' : (fmt.getReserva(e) > 0 ? 'c-blue' : 'c-muted')">
            {{ fmt.isContado(e) ? '\u2014' : 'S/. ' + fmt.formatMoney(fmt.getReserva(e)) }}
          </td>
          <td class="tr mono c-green">S/. {{ fmt.formatMoney(fmt.getPagado(e)) }}</td>
          <td
            class="tr mono"
            :class="fmt.isContado(e) ? '' : (fmt.calcSaldo(e) > 0 ? 'c-red fw700' : 'c-muted')"
          >{{ fmt.isContado(e) ? '\u2014' : 'S/. ' + fmt.formatMoney(fmt.calcSaldo(e)) }}</td>
          <td class="tc">
            <span class="pill" :class="fmt.statusPill(e.confirmation)">
              {{ e.confirmation || 'Pendiente' }}
            </span>
          </td>
        </tr>
        <tr v-if="!enrollments.length">
          <td colspan="12" class="empty-row">Sin resultados</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

const uniqueTipoPago = computed(() => {
  const set = new Set()
  props.enrollments.forEach(e => {
    set.add(fmt.isContado(e) ? 'Al contado' : 'Cuotas')
  })
  return [...set].sort()
})

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
  props.colFilters.fPago    = ''
  props.colFilters.tipoPago = null
  props.colFilters.estado   = null
}
</script>

<style scoped>
/* ---- wrapper ---- */
.ect-wrap {
  background: #fff;
  border-radius: 10px;
  overflow-x: auto;
  border: 1px solid #F0F0F0;
}

/* ---- table base ---- */
.ect {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #1A1A1A;
}
.tc { text-align: center; }
.tr { text-align: right; }

/* ---- header ---- */
.ect-head th {
  background: #FAFAFA;
  padding: 11px 12px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  border-bottom: 1px solid #F0F0F0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ---- filter row ---- */
.ect-filters {
  background: #FAFAFA;
}
.ect-filters td {
  padding: 6px 8px;
  border-bottom: 1px solid #F0F0F0;
}

.filter-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  font-size: 12px;
  color: #1A1A1A;
  background: #fff;
  transition: all .2s ease;
  font-family: inherit;
}
.filter-input:focus {
  outline: none;
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}
.filter-input::placeholder { color: #C4C4C4; }

.filter-select {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  font-size: 12px;
  color: #1A1A1A;
  background: #fff;
  cursor: pointer;
  transition: all .2s ease;
  appearance: auto;
  font-family: inherit;
}
.filter-select:focus {
  outline: none;
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}

.filter-clear {
  width: 28px;
  height: 28px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #A3A3A3;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
}
.filter-clear:hover {
  background: #FEF2F2;
  border-color: #FCA5A5;
  color: #EF4444;
}

/* ---- body rows ---- */
.ect-row td {
  padding: 14px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 52px;
  box-sizing: border-box;
  transition: background .15s ease;
}
.ect-row:hover td {
  background: #FAFAFA;
}
.ect-row:last-child td {
  border-bottom: none;
}

/* ---- row status indicator ---- */
.ect-row.row-green td:first-child { box-shadow: inset 3px 0 0 #10b981; }
.ect-row.row-amber td:first-child { box-shadow: inset 3px 0 0 #f59e0b; }
.ect-row.row-red td:first-child   { box-shadow: inset 3px 0 0 #ef4444; }

/* ---- action button ---- */
.act-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #A3A3A3;
  font-size: 12px;
  transition: all .2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.act-btn.act-teal {
  border-color: #E8E8E8;
  color: #737373;
}
.act-btn.act-teal:hover {
  background: #F0FDFA;
  border-color: #0D9488;
  color: #0D9488;
}

/* ---- cell typography ---- */
.cell-main {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 13px;
  line-height: 1.35;
}
.cell-clip {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-sub {
  color: #A3A3A3;
  font-size: 11.5px;
  margin-top: 2px;
}
.cell-date {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
}

/* ---- money / numeric ---- */
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 12.5px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.fw700 { font-weight: 700; }
.c-green { color: #059669; }
.c-blue  { color: #2563EB; }
.c-red   { color: #DC2626; }
.c-muted { color: #C4C4C4; }

/* ---- pills ---- */
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
}
.pill-sm {
  padding: 3px 8px;
  font-size: 10.5px;
}
.pill-slate { background: #F5F5F5; color: #737373; }
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-blue  { background: #EFF6FF; color: #1E40AF; }
.pill-red   { background: #FEF2F2; color: #991B1B; }

/* ---- empty state ---- */
.empty-row {
  padding: 48px;
  text-align: center;
  color: #C4C4C4;
  font-size: 13px;
}

/* ---- responsive ---- */
@media (max-width: 768px) {
  .cell-extra { display: none; }
  .cell-clip  { max-width: 140px; }
  .ect-head th { font-size: 10px; padding: 8px; }
  .ect-row td  { padding: 10px 8px; }
}
@media (max-width: 640px) {
  .cell-clip { max-width: 100px; }
}
</style>
