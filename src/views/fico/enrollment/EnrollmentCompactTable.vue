<template>
  <div class="ect-wrap">
    <table class="ect">
      <thead>
        <tr class="ect-head">
          <th class="tc" style="width:42px"></th>
          <th style="width:120px">F. Registro</th>
          <th>Alumno / Documento</th>
          <th>Programa / Edicion</th>
          <th style="width:90px">
            <div class="th-flex">
              <span>Agente</span>
              <ColumnFilterDropdown
                column-label="Agente"
                :all-items="enrollments"
                :value-extractor="e => e.seller_agent_name || '(Vacío)'"
                v-model="colFilters.agente"
              />
            </div>
          </th>
          <th style="width:85px">F. Pago</th>
          <th class="tc" style="width:100px">
            <div class="th-flex">
              <span>Tipo Pago</span>
              <ColumnFilterDropdown
                column-label="Tipo Pago"
                :all-items="enrollments"
                :value-extractor="e => (e.payment_type === 'PT') ? 'Al contado' : 'Cuotas'"
                v-model="colFilters.tipoPago"
              />
            </div>
          </th>
          <th class="tr" style="width:95px">Monto Neto</th>
          <th class="tr" style="width:80px">Inicial</th>
          <th class="tr" style="width:80px">Pagado</th>
          <th class="tr" style="width:85px">Saldo</th>
          <th class="tc" style="width:145px">
            <div class="th-flex">
              <span>Estado FICO</span>
              <ColumnFilterDropdown
                column-label="Estado FICO"
                :all-items="enrollments"
                :value-extractor="e => e.confirmation || 'Pendiente'"
                :fixed-options="['Aprobado', 'Pendiente Revisar', 'Pendiente']"
                v-model="colFilters.estado"
              />
            </div>
          </th>
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
          <td></td>
          <td>
            <input v-model="colFilters.fPago" class="filter-input" placeholder="Buscar..." />
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </thead>
      <tbody>
        <template v-if="isLoading">
          <tr v-for="n in 10" :key="'sk-' + n" class="skeleton-row">
            <td><div class="sk-cell" style="width:90px"></div></td>
            <td>
              <div class="sk-cell" style="width:140px"></div>
              <div class="sk-cell mt-1" style="width:90px;height:8px"></div>
            </td>
            <td>
              <div class="sk-cell" style="width:160px"></div>
              <div class="sk-cell mt-1" style="width:60px;height:8px"></div>
            </td>
            <td><div class="sk-cell" style="width:70px"></div></td>
            <td><div class="sk-cell" style="width:70px"></div></td>
            <td class="tc"><div class="sk-cell" style="width:62px;margin:0 auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:80px;margin-left:auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:64px;margin-left:auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:64px;margin-left:auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:70px;margin-left:auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:90px;margin:0 auto"></div></td>
          </tr>
        </template>
        <template v-else>
        <tr
          v-for="e in enrollments"
          :key="e.enrollment_id"
          class="ect-row"
          :class="[fmt.rowClass(e), { 'is-selected': e.enrollment_id === selectedId, 'has-validations': Number(e.validations_count) > 0, 'has-laptop': fmt.hasLaptopPromo(e), 'has-claude': fmt.hasClaudeAccount(e), 'has-cert': fmt.hasCertPaid(e) }]"
          @click="onRowClick(e, $event)"
        >
          <td class="tc">
            <button class="act-btn act-teal" title="Abrir detalle completo" @click.stop="openDetail(e)">
              <i class="fa-solid fa-clipboard-check"></i>
            </button>
          </td>
          <td class="cell-date">{{ fmt.formatDateTime(e.registration_date) }}</td>
          <td class="col-alumno">
            <div class="cell-main cell-clip" :title="e.student_full_name">
              {{ e.student_full_name }}
              <span v-for="chip in rowProblems(e)" :key="chip.key"
                :class="['ect-chip', `ect-chip-${chip.tone}`]"
                :title="chip.tooltip">
                <i class="fa-solid" :class="chip.icon"></i> {{ chip.label }}
              </span>
            </div>
            <div class="cell-sub cell-extra">{{ e.document_number || '— sin DNI' }}</div>
          </td>
          <td class="col-programa">
            <div class="cell-main cell-clip" :title="e.program_name">
              {{ e.program_name }}
              <span
                v-if="Number(e.validations_count) > 0"
                class="pill pill-purple pill-sm pill-validation"
                :title="`${e.validations_count} modulo(s) convalidado(s)`"
              >
                <i class="fa-solid fa-circle-check"></i>
                Convalida
              </span>
            </div>
            <span class="pill pill-slate cell-extra">{{ e.edition_code }}</span>
          </td>
          <td class="col-agente">
            <div class="cell-main cell-clip" :title="e.seller_agent_name">{{ e.seller_agent_name }}</div>
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
          <td colspan="12" class="empty-row">
            <div class="empty-state">
              <div class="empty-icon">
                <i class="fa-solid fa-magnifying-glass"></i>
              </div>
              <h4 class="empty-title">No hay matriculas que coincidan</h4>
              <p class="empty-text">Cambia los filtros o limpia los chips activos para ver mas resultados.</p>
            </div>
          </td>
        </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'

const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  colFilters:  { type: Object, required: true },
  uniqueAgents:  { type: Array, default: () => [] },
  uniqueEstados: { type: Array, default: () => [] },
  isLoading:   { type: Boolean, default: false },
  selectedId:  { type: [Number, String], default: null }
})
const emit = defineEmits(['select-row'])

const router = useRouter()
const fmt = useEnrollmentFormatters()

function onRowClick (e, evt) {
  if (evt.target.closest('button, input, select, a, label')) return
  emit('select-row', e)
}

// Detecta problemas comunes en una fila para mostrar chips de warning.
// Cada chip lleva al ojo de FICO algo que necesita atencion antes de procesar.
function rowProblems (e) {
  const out = []
  // Sin email: bloqueante para envio de confirmacion al alumno.
  if (!e.email || !String(e.email).trim()) {
    out.push({ key: 'email', tone: 'red', icon: 'fa-envelope-circle-check', label: 'sin correo', tooltip: 'No se podra enviar confirmacion ni acceso al campus' })
  }
  // Sin DNI: usual en B2B/WEB pero relevante avisar.
  if (!e.document_number || !String(e.document_number).trim()) {
    out.push({ key: 'doc', tone: 'amber', icon: 'fa-id-card', label: 'sin DNI', tooltip: 'Inscripcion sin documento (caso B2B/WEB tipico)' })
  }
  // Sin voucher en pago al contado pendiente: probablemente hay que pedirlo.
  const isCash = fmt.isContado(e)
  const pending = fmt.isPendiente(e)
  if (isCash && pending && (!e.payment_vouchers || !String(e.payment_vouchers).trim())) {
    out.push({ key: 'voucher', tone: 'amber', icon: 'fa-receipt', label: 'sin voucher', tooltip: 'Pago al contado pendiente sin comprobante adjunto' })
  }
  // Nota: convalidaciones ya tienen chip propio en columna Programa, no se duplican aqui.
  return out
}

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
  props.colFilters.fPago    = ''
  props.colFilters.agente   = []
  props.colFilters.tipoPago = []
  props.colFilters.estado   = []
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
  font-size: 11.5px;
  color: #1A1A1A;
}
.tc { text-align: center; }
.tr { text-align: right; }

/* ---- header ---- */
.ect-head th {
  background: #FAFAFA;
  padding: 8px 10px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  border-bottom: 1px solid #F0F0F0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.th-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.tc .th-flex { justify-content: center; }
.tc .th-flex > span { flex: 1; text-align: center; }

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
  padding: 7px 10px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 36px;
  box-sizing: border-box;
  transition: background .15s ease;
}
.ect-row {
  cursor: pointer;
}
.ect-row:hover td {
  background: #FAFAFA;
}
.ect-row.is-selected td {
  background: #F0FDFA;
  box-shadow: inset 0 -1px 0 #CCFBF1;
}
.ect-row.is-selected td:first-child {
  box-shadow: inset 3px 0 0 #0D9488, inset 0 -1px 0 #CCFBF1;
}
.ect-row:last-child td {
  border-bottom: none;
}

/* ---- row status indicator ---- */
/* Barras de color removidas — ya no marcamos las filas con borde lateral. */

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
  font-size: 11.5px;
  line-height: 1.35;
}
.cell-clip {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
/* Per-column max widths so long names get clipped to ellipsis instead
   of stretching the table out of proportion. Native title=hover shows full name. */
.col-alumno { max-width: 180px; }
.col-alumno .cell-clip { max-width: 180px; }
.col-programa { max-width: 220px; }
.col-programa .cell-clip { max-width: 220px; }
.col-agente { max-width: 90px; }
.col-agente .cell-clip { max-width: 90px; }
.cell-sub {
  color: #A3A3A3;
  font-size: 10.5px;
  margin-top: 1px;
}
.cell-date {
  font-size: 11px;
  color: #737373;
  white-space: nowrap;
}

/* ---- money / numeric ---- */
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
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
.pill-purple { background: #F5F3FF; color: #5B21B6; border: 1px solid #DDD6FE; }

/* Chips de problemas en fila (junto al nombre del alumno) */
.ect-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 9.5px;
  font-weight: 600;
  border-radius: 4px;
  vertical-align: middle;
  white-space: nowrap;
  text-transform: lowercase;
}
.ect-chip i { font-size: 8px; }
.ect-chip-red    { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
.ect-chip-amber  { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
.ect-chip-purple { background: #F5F3FF; color: #5B21B6; border: 1px solid #DDD6FE; }

/* Badge especifico de convalidacion: distintivo + clickeable */
.pill-validation {
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  vertical-align: middle;
}
.pill-validation i {
  font-size: 9px;
}

/* Fila con tinte cian cuando la inscripcion incluye promo LAPTOP
   (mismo color que la etiqueta "Traera laptop" del panel lateral).
   Se pinta sobre los td porque hover/is-selected tambien pintan td. */
.ect-row.has-laptop td {
  background: #ECFEFF;
}
.ect-row.has-laptop:hover td {
  background: #CFFAFE;
}
.ect-row.has-laptop.is-selected td {
  background: #A5F3FC;
}
[data-coreui-theme="dark"] .ect-row.has-laptop td {
  background: rgba(8, 145, 178, 0.14);
}
[data-coreui-theme="dark"] .ect-row.has-laptop:hover td,
[data-coreui-theme="dark"] .ect-row.has-laptop.is-selected td {
  background: rgba(8, 145, 178, 0.26);
}

/* Fila con tinte naranja cuando tiene el beneficio CUENTA CLAUDE
   (mismo color que la etiqueta "CUENTA PERSONAL" del panel lateral) */
.ect-row.has-claude td {
  background: #FFF7ED;
}
.ect-row.has-claude:hover td {
  background: #FFEDD5;
}
.ect-row.has-claude.is-selected td {
  background: #FED7AA;
}
[data-coreui-theme="dark"] .ect-row.has-claude td {
  background: rgba(234, 88, 12, 0.14);
}
[data-coreui-theme="dark"] .ect-row.has-claude:hover td,
[data-coreui-theme="dark"] .ect-row.has-claude.is-selected td {
  background: rgba(234, 88, 12, 0.26);
}

/* Fila con tinte verde cuando el becado ya pago su certificado
   (etiqueta "Certificar", mismo verde que el pill del detalle) */
.ect-row.has-cert td {
  background: #ECFDF5;
}
.ect-row.has-cert:hover td {
  background: #D1FAE5;
}
.ect-row.has-cert.is-selected td {
  background: #A7F3D0;
}
[data-coreui-theme="dark"] .ect-row.has-cert td {
  background: rgba(16, 185, 129, 0.14);
}
[data-coreui-theme="dark"] .ect-row.has-cert:hover td,
[data-coreui-theme="dark"] .ect-row.has-cert.is-selected td {
  background: rgba(16, 185, 129, 0.26);
}

/* Fila completa con tinte morado claro cuando tiene convalidaciones */
.ect-row.has-validations {
  background: linear-gradient(90deg, #FAF5FF 0%, #FFFFFF 30%);
}
.ect-row.has-validations:hover {
  background: linear-gradient(90deg, #F3E8FF 0%, #FAFAFA 30%);
}
.ect-row.has-validations.is-selected {
  background: linear-gradient(90deg, #EDE9FE 0%, #F8FAFC 30%);
}

/* ---- empty state ---- */
.empty-row {
  padding: 0;
}
.empty-state {
  padding: 56px 24px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px;
}
.empty-icon {
  width: 56px; height: 56px;
  border-radius: 14px;
  background: #FAFAFA;
  color: #A3A3A3;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 20px;
  margin-bottom: 8px;
  border: 1px solid #EFEFEF;
}
.empty-title {
  font-size: 14px; font-weight: 700;
  color: #1A1A1A; margin: 0;
  letter-spacing: -0.01em;
}
.empty-text {
  font-size: 12.5px; color: #737373;
  margin: 0; max-width: 320px; line-height: 1.5;
}

/* ---- skeleton loading ---- */
.skeleton-row td {
  padding: 14px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 52px;
  box-sizing: border-box;
}
.sk-cell {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: ect-sk-shimmer 1.4s ease-in-out infinite;
  width: 100%;
}
.sk-cell.mt-1 { margin-top: 6px; }
@keyframes ect-sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .ect-wrap {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ect { color: #F4F4F0; }
[data-coreui-theme="dark"] .ect-head th {
  background: #1F1F1A;
  color: #A0A099;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ect-filters,
[data-coreui-theme="dark"] .ect-filters td {
  background: #1F1F1A;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .filter-input,
[data-coreui-theme="dark"] .filter-select {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-input::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .filter-input:focus,
[data-coreui-theme="dark"] .filter-select:focus {
  border-color: #34D399;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
}
[data-coreui-theme="dark"] .filter-clear {
  background: #14140F;
  border-color: #2A2A22;
  color: #6F6F66;
}
[data-coreui-theme="dark"] .filter-clear:hover {
  background: rgba(239,68,68,0.16);
  border-color: rgba(239,68,68,0.4);
  color: #F87171;
}
[data-coreui-theme="dark"] .ect-row td {
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .ect-row:hover td { background: #1F1F1A; }
[data-coreui-theme="dark"] .ect-row.is-selected td { background: #2A2A22; }
[data-coreui-theme="dark"] .cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .cell-sub { color: #A0A099; }
[data-coreui-theme="dark"] .cell-date { color: #A0A099; }
[data-coreui-theme="dark"] .mono { color: #F4F4F0; }
[data-coreui-theme="dark"] .c-muted { color: #6F6F66; }
[data-coreui-theme="dark"] .pill-slate { background: #2A2A22; color: #A0A099; }
</style>
