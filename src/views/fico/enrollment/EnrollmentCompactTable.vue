<template>
  <section class="ds-panel">
    <div class="ds-table-scroll">
      <table class="ds-table ds-table--lista ds-table--densa ect">
        <thead>
          <tr>
            <th class="tc" style="width:44px"><span class="sr-only">Abrir</span></th>
            <th style="width:120px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('fRegistro') }" :aria-expanded="colToggles.isOpen('fRegistro')" :title="colToggles.isOpen('fRegistro') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('fRegistro')">
                F. registro <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th>
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('alumno') }" :aria-expanded="colToggles.isOpen('alumno')" :title="colToggles.isOpen('alumno') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('alumno')">
                Alumno / documento <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th>
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('programa') }" :aria-expanded="colToggles.isOpen('programa')" :title="colToggles.isOpen('programa') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('programa')">
                Programa / edición <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th style="width:96px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('agente') }" :aria-expanded="colToggles.isOpen('agente')" :title="colToggles.isOpen('agente') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('agente')">
                Agente <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th style="width:96px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('fPago') }" :aria-expanded="colToggles.isOpen('fPago')" :title="colToggles.isOpen('fPago') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('fPago')">
                F. pago <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="tc" style="width:110px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('tipoPago') }" :aria-expanded="colToggles.isOpen('tipoPago')" :title="colToggles.isOpen('tipoPago') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('tipoPago')">
                Tipo de pago <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="num" style="width:100px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('montoMin') }" :aria-expanded="colToggles.isOpen('montoMin')" :title="colToggles.isOpen('montoMin') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('montoMin')">
                Monto neto <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="num" style="width:90px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('inicialMin') }" :aria-expanded="colToggles.isOpen('inicialMin')" :title="colToggles.isOpen('inicialMin') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('inicialMin')">
                Inicial <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="num" style="width:90px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('pagadoMin') }" :aria-expanded="colToggles.isOpen('pagadoMin')" :title="colToggles.isOpen('pagadoMin') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('pagadoMin')">
                Pagado <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="num" style="width:90px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('saldoMin') }" :aria-expanded="colToggles.isOpen('saldoMin')" :title="colToggles.isOpen('saldoMin') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('saldoMin')">
                Saldo <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
            <th class="tc" style="width:140px">
              <button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('estado') }" :aria-expanded="colToggles.isOpen('estado')" :title="colToggles.isOpen('estado') ? 'Ocultar filtro' : 'Filtrar por esta columna'" @click="colToggles.toggle('estado')">
                Estado FICO <i class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
          </tr>
          <!-- Fila de filtros: aparece solo con alguna columna abierta o con
               un filtro puesto (useColumnFilterToggles). -->
          <tr v-if="colToggles.anyVisible.value" class="ect-filters">
            <th class="tc">
              <button class="btn-icon btn-icon-sm" type="button" title="Limpiar y cerrar filtros" aria-label="Limpiar y cerrar filtros" @click="clearFilters">
                <i class="fa-solid fa-eraser" aria-hidden="true"></i>
              </button>
            </th>
            <th><template v-if="colToggles.isOpen('fRegistro')"><BaseDatePicker :model-value="colFilters.fRegistro" @update:model-value="v => setFilter('fRegistro', v)" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" /></template></th>
            <th><template v-if="colToggles.isOpen('alumno')"><input :value="colFilters.alumno" @input="setFilter('alumno', $event.target.value)" class="ect-filter" placeholder="Nombre o DNI…" aria-label="Filtrar por alumno" /></template></th>
            <th><template v-if="colToggles.isOpen('programa')"><input :value="colFilters.programa" @input="setFilter('programa', $event.target.value)" class="ect-filter" placeholder="Programa…" aria-label="Filtrar por programa" /></template></th>
            <th><template v-if="colToggles.isOpen('agente')"><ColumnFilterDropdown column-label="Agente" :all-items="enrollments" :value-extractor="e => e.seller_agent_name || '(Vacío)'" :model-value="colFilters.agente" @update:model-value="v => setFilter('agente', v)" /></template></th>
            <th><template v-if="colToggles.isOpen('fPago')"><BaseDatePicker :model-value="colFilters.fPago" @update:model-value="v => setFilter('fPago', v)" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" /></template></th>
            <th><template v-if="colToggles.isOpen('tipoPago')"><ColumnFilterDropdown column-label="Tipo Pago" :all-items="enrollments" :value-extractor="e => (e.payment_type === 'PT') ? 'Al contado' : 'Cuotas'" :model-value="colFilters.tipoPago" @update:model-value="v => setFilter('tipoPago', v)" /></template></th>
            <th><template v-if="colToggles.isOpen('montoMin')"><input :value="colFilters.montoMin" @input="setFilter('montoMin', $event.target.value)" type="number" min="0" class="ect-filter num" placeholder="&ge; 0" aria-label="Monto neto mínimo" /></template></th>
            <th><template v-if="colToggles.isOpen('inicialMin')"><input :value="colFilters.inicialMin" @input="setFilter('inicialMin', $event.target.value)" type="number" min="0" class="ect-filter num" placeholder="&ge; 0" aria-label="Inicial mínima" /></template></th>
            <th><template v-if="colToggles.isOpen('pagadoMin')"><input :value="colFilters.pagadoMin" @input="setFilter('pagadoMin', $event.target.value)" type="number" min="0" class="ect-filter num" placeholder="&ge; 0" aria-label="Pagado mínimo" /></template></th>
            <th><template v-if="colToggles.isOpen('saldoMin')"><input :value="colFilters.saldoMin" @input="setFilter('saldoMin', $event.target.value)" type="number" min="0" class="ect-filter num" placeholder="&ge; 0" aria-label="Saldo mínimo" /></template></th>
            <th><template v-if="colToggles.isOpen('estado')"><ColumnFilterDropdown column-label="Estado FICO" :all-items="enrollments" :value-extractor="e => e.confirmation || 'Pendiente'" :fixed-options="['Aprobado', 'Pendiente Revisar', 'Pendiente']" :model-value="colFilters.estado" @update:model-value="v => setFilter('estado', v)" /></template></th>
          </tr>
        </thead>
        <tbody>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-' + n">
              <td colspan="12"><span class="ds-skel"></span></td>
            </tr>
          </template>
          <tr v-else-if="!enrollments.length">
            <td colspan="12" class="ds-empty ds-empty--lista">
              No hay inscripciones con estos filtros. Quita un filtro o limpia los de columna para ver más.
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="e in enrollments"
              :key="e.enrollment_id"
              class="link"
              tabindex="0"
              :class="rowMarks(e)"
              :aria-selected="e.enrollment_id === selectedId"
              @click="onRowClick(e, $event)"
              @keydown.enter.self.stop="openDetail(e)"
            >
              <td class="tc">
                <button class="btn-icon btn-icon-sm" type="button" title="Abrir detalle completo" aria-label="Abrir detalle completo" @click.stop="openDetail(e)">
                  <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i>
                </button>
              </td>
              <td class="ect-date">{{ fmt.formatDateTime(e.registration_date) }}</td>
              <td>
                <div class="ect-main ect-clip ect-alumno" :title="e.student_full_name">
                  {{ e.student_full_name }}
                  <span v-for="chip in rowProblems(e)" :key="chip.key" class="ds-pill ect-flag" :class="chip.tone" :title="chip.tooltip">
                    <i class="fa-solid" :class="chip.icon" aria-hidden="true"></i> {{ chip.label }}
                  </span>
                </div>
                <div class="ect-sub ect-extra">{{ e.document_number || '— sin DNI' }}</div>
              </td>
              <td>
                <div class="ect-main ect-clip ect-programa" :title="e.program_name">
                  {{ e.program_name }}
                  <span v-if="Number(e.validations_count) > 0" class="ds-pill violet ect-flag" :title="`${e.validations_count} módulo(s) convalidado(s)`">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Convalida
                  </span>
                </div>
                <span class="ds-pill ect-extra">{{ e.edition_code }}</span>
              </td>
              <td><div class="ect-main ect-clip ect-agente" :title="e.seller_agent_name">{{ e.seller_agent_name }}</div></td>
              <td class="ect-date">{{ fmt.formatDate(e.pay_date) }}</td>
              <td class="tc">
                <span class="ds-pill" :class="fmt.isContado(e) ? '' : 'info'">{{ fmt.isContado(e) ? 'Al contado' : 'Cuotas' }}</span>
              </td>
              <td class="num mono ect-strong">S/. {{ fmt.formatMoney(e.total_to_pay) }}</td>
              <td class="num mono" :class="!fmt.isContado(e) && fmt.getReserva(e) > 0 ? 'is-info' : 'is-muted'">
                {{ fmt.isContado(e) ? '—' : 'S/. ' + fmt.formatMoney(fmt.getReserva(e)) }}
              </td>
              <td class="num mono is-ok">S/. {{ fmt.formatMoney(fmt.getPagado(e)) }}</td>
              <td class="num mono" :class="!fmt.isContado(e) && fmt.calcSaldo(e) > 0 ? 'is-bad' : 'is-muted'">
                {{ fmt.isContado(e) ? '—' : 'S/. ' + fmt.formatMoney(fmt.calcSaldo(e)) }}
              </td>
              <td class="tc">
                <span class="ds-pill" :class="fmt.statusTone(e.confirmation)">{{ e.confirmation || 'Pendiente' }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useColumnFilterToggles } from '@/composables/useColumnFilterToggles.js'

const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  colFilters:  { type: Object, required: true },
  uniqueAgents:  { type: Array, default: () => [] },
  uniqueEstados: { type: Array, default: () => [] },
  isLoading:   { type: Boolean, default: false },
  selectedId:  { type: [Number, String], default: null }
})
// Limpiar lo hace el composable (useEnrollmentList.clearColFilters): limpia
// TODOS los filtros, incluidas fechas y montos, y vuelve a consultar. La copia
// local de antes se saltaba fRegistro y los 4 montos minimos.
const emit = defineEmits(['select-row', 'clear-col-filters', 'update-filter'])

const router = useRouter()
const fmt = useEnrollmentFormatters()
const colToggles = useColumnFilterToggles(props.colFilters)

// Los filtros son del composable de la pagina (useEnrollmentList.colFilters): la
// tabla no los muta, avisa el cambio y la pagina lo aplica.
const setFilter = (key, value) => emit('update-filter', key, value)

function clearFilters () {
  emit('clear-col-filters')
  colToggles.closeAll()
}


// Marcas de negocio que tinen la fila (mismo color que su etiqueta en el panel).
function rowMarks (e) {
  return {
    'is-selected': e.enrollment_id === props.selectedId,
    'mark-validation': Number(e.validations_count) > 0,
    'mark-laptop': fmt.hasLaptopPromo(e),
    'mark-personal': fmt.hasPersonalAccount(e),
    'mark-cert': fmt.hasCertPaid(e)
  }
}

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
    out.push({ key: 'email', tone: 'bad', icon: 'fa-envelope-circle-check', label: 'sin correo', tooltip: 'No se podra enviar confirmacion ni acceso al campus' })
  }
  // Sin DNI: usual en B2B/WEB pero relevante avisar.
  if (!e.document_number || !String(e.document_number).trim()) {
    out.push({ key: 'doc', tone: 'warn', icon: 'fa-id-card', label: 'sin DNI', tooltip: 'Inscripcion sin documento (caso B2B/WEB tipico)' })
  }
  // Sin voucher en pago al contado pendiente: probablemente hay que pedirlo.
  const isCash = fmt.isContado(e)
  const pending = fmt.isPendiente(e)
  if (isCash && pending && (!e.payment_vouchers || !String(e.payment_vouchers).trim())) {
    out.push({ key: 'voucher', tone: 'warn', icon: 'fa-receipt', label: 'sin voucher', tooltip: 'Pago al contado pendiente sin comprobante adjunto' })
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

</script>

<style scoped>
/* Tabla, pills, vacío y skeleton salen de ds-* (design-system.css). Aquí solo
   lo propio: la fila de filtros, recortes de texto y los tintes de negocio.
   Sin bloque dark: todo va con tokens. */
.tc { text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Fila de filtros: debajo de los títulos, sin el sticky del encabezado. */
.ect-filters th { position: static; padding-top: 6px; padding-bottom: 6px; background: var(--ds-surface-2); }
.ect-filter,
.ect-filters :deep(.exec-flatpickr-input) {
  width: 100%;
  height: 30px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-control);
  background: var(--ds-surface);
  color: var(--ds-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 400;
  outline: none;
}
.ect-filter::placeholder,
.ect-filters :deep(.exec-flatpickr-input::placeholder) { color: var(--ds-muted); }
.ect-filter:focus,
.ect-filters :deep(.exec-flatpickr-input:focus) { border-color: var(--ds-accent); }
.ect-filter.num { text-align: right; }
/* Las flechitas del input number tapan el monto en 30px de alto. */
.ect-filter[type="number"] { -moz-appearance: textfield; }
.ect-filter[type="number"]::-webkit-outer-spin-button,
.ect-filter[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Celdas */
.ect td:first-child { color: inherit; }
.ect-main { font-weight: 600; color: var(--ds-ink); line-height: 1.35; }
.ect-sub { margin-top: 1px; font-size: 11px; color: var(--ds-muted); }
.ect-date { font-size: 11.5px; white-space: nowrap; }
.ect-clip { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Nombres largos se recortan; el title muestra el completo. */
.ect-alumno { max-width: 200px; }
.ect-programa { max-width: 240px; }
.ect-agente { max-width: 90px; }
.ect-flag { margin-left: 6px; vertical-align: middle; font-size: 10px; }
.ect .ect-extra { margin-top: 3px; font-weight: 600; }

.mono { font-family: var(--ds-font-mono); font-size: 11.5px; }
.ect-strong { font-weight: 700; color: var(--ds-ink); }
.is-ok { color: var(--ds-ok-ink); }
.is-info { color: var(--ds-info-ink); }
.is-bad { color: var(--ds-bad-ink); font-weight: 700; }
.is-muted { color: var(--ds-muted); }

/* Tintes de negocio, el mismo color que su etiqueta en el panel lateral
   (si hay varios, gana el último declarado). */
.ect tr.mark-validation td { background: var(--ds-soft-violet); }
.ect tr.mark-cert td { background: var(--ds-soft-ok); }
.ect tr.mark-personal td { background: var(--ds-soft-orange); }
.ect tr.mark-laptop td { background: var(--ds-soft-cyan); }

/* Selección al final: manda sobre cualquier tinte de negocio. */
.ect tr.is-selected td { background: var(--ds-soft-info); }
.ect tr.is-selected td:first-child { box-shadow: inset 3px 0 0 var(--ds-accent); }

@media (max-width: 768px) {
  .ect-extra { display: none; }
  .ect-alumno, .ect-programa { max-width: 140px; }
}
</style>
