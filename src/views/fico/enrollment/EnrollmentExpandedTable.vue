<template>
  <div class="eet-scroll-wrapper">
    <table class="eet-table">
      <thead>
        <!-- Group headers row -->
        <tr class="eet-group-row">
          <th class="eet-th-action eet-sticky-col">&nbsp;</th>

          <th
            class="eet-group-header eet-grp-identity"
            :colspan="cg.identity ? 4 : 1"
            @click="toggle('identity')"
          >
            <span class="eet-group-label">
              <svg class="eet-chevron" :class="{ 'is-collapsed': !cg.identity }" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              IDENTIDAD
            </span>
          </th>

          <th
            class="eet-group-header eet-grp-profile"
            :colspan="cg.profile ? 5 : 1"
            @click="toggle('profile')"
          >
            <span class="eet-group-label">
              <svg class="eet-chevron" :class="{ 'is-collapsed': !cg.profile }" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              PERFIL ALUMNO
            </span>
          </th>

          <th
            class="eet-group-header eet-grp-program"
            :colspan="cg.program ? programCols : 1"
            @click="toggle('program')"
          >
            <span class="eet-group-label">
              <svg class="eet-chevron" :class="{ 'is-collapsed': !cg.program }" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              PROGRAMA
            </span>
          </th>

          <th
            class="eet-group-header eet-grp-finance"
            :colspan="cg.finance ? 14 : 1"
            @click="toggle('finance')"
          >
            <span class="eet-group-label">
              <svg class="eet-chevron" :class="{ 'is-collapsed': !cg.finance }" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              FINANZAS
            </span>
          </th>

          <th
            class="eet-group-header eet-grp-installments"
            :colspan="cg.installments ? 16 : 1"
            @click="toggle('installments')"
          >
            <span class="eet-group-label">
              <svg class="eet-chevron" :class="{ 'is-collapsed': !cg.installments }" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              CUOTAS
            </span>
          </th>
        </tr>

        <!-- Column headers row -->
        <tr class="eet-col-row">
          <th class="eet-th-action eet-sticky-col">Acc.</th>

          <!-- Identity -->
          <template v-if="cg.identity">
            <th class="eet-col-header">DNI</th>
            <th class="eet-col-header">Nombres</th>
            <th class="eet-col-header">Celular</th>
            <th class="eet-col-header">Correo</th>
          </template>
          <th v-else class="eet-col-header eet-collapsed-hint">...</th>

          <!-- Profile -->
          <template v-if="cg.profile">
            <th class="eet-col-header">Ocupacion</th>
            <th class="eet-col-header">Tip. Cliente</th>
            <th class="eet-col-header">Member</th>
            <th class="eet-col-header">Estado</th>
            <th class="eet-col-header">Mod./Tipo</th>
          </template>
          <th v-else class="eet-col-header eet-collapsed-hint">...</th>

          <!-- Program -->
          <template v-if="cg.program">
            <th class="eet-col-header">Tipo Prog.</th>
            <th class="eet-col-header">Mod. Prog.</th>
            <th class="eet-col-header">Programa</th>
            <th class="eet-col-header">ED</th>
            <template v-for="n in childCols" :key="'ch-' + n">
              <th class="eet-col-header">CURSO {{ n }}</th>
              <th class="eet-col-header">FI {{ n }}</th>
            </template>
          </template>
          <th v-else class="eet-col-header eet-collapsed-hint">...</th>

          <!-- Finance -->
          <template v-if="cg.finance">
            <th class="eet-col-header">F. Inicio</th>
            <th class="eet-col-header">F. Pago</th>
            <th class="eet-col-header">Asesor</th>
            <th class="eet-col-header">Tipo Pago</th>
            <th class="eet-col-header">Dsct Princ</th>
            <th class="eet-col-header">Dsct Adic</th>
            <th class="eet-col-header">Canal</th>
            <th class="eet-col-header">P. Lista</th>
            <th class="eet-col-header">Total</th>
            <th class="eet-col-header">Descontado</th>
            <th class="eet-col-header">Moneda</th>
            <th class="eet-col-header">Medio Pago</th>
            <th class="eet-col-header">Ent. Empresa</th>
            <th class="eet-col-header">Ent. Financ.</th>
          </template>
          <th v-else class="eet-col-header eet-collapsed-hint">...</th>

          <!-- Installments -->
          <template v-if="cg.installments">
            <template v-for="n in 8" :key="'ih-'+n">
              <th class="eet-col-header">FC{{ n }}</th>
              <th class="eet-col-header">C{{ n }}</th>
            </template>
          </template>
          <th v-else class="eet-col-header eet-collapsed-hint">...</th>
        </tr>
      </thead>

      <tbody>
        <template v-if="isLoading">
          <tr v-for="n in 10" :key="'sk-' + n" class="eet-skeleton-row">
            <td class="eet-td-action eet-sticky-col">
              <div class="eet-sk-cell" style="width:18px;height:18px;border-radius:4px;margin:0 auto"></div>
            </td>
            <template v-if="cg.identity">
              <td class="eet-cell"><div class="eet-sk-cell" style="width:80px"></div></td>
              <td class="eet-cell"><div class="eet-sk-cell" style="width:140px"></div></td>
              <td class="eet-cell"><div class="eet-sk-cell" style="width:90px"></div></td>
              <td class="eet-cell"><div class="eet-sk-cell" style="width:140px"></div></td>
            </template>
            <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

            <template v-if="cg.profile">
              <td v-for="c in 5" :key="'skp-'+c" class="eet-cell"><div class="eet-sk-cell"></div></td>
            </template>
            <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

            <template v-if="cg.program">
              <td v-for="c in programCols" :key="'skpr-'+c" class="eet-cell"><div class="eet-sk-cell"></div></td>
            </template>
            <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

            <template v-if="cg.finance">
              <td v-for="c in 14" :key="'skf-'+c" class="eet-cell"><div class="eet-sk-cell"></div></td>
            </template>
            <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

            <template v-if="cg.installments">
              <td v-for="c in 16" :key="'ski-'+c" class="eet-cell"><div class="eet-sk-cell"></div></td>
            </template>
            <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>
          </tr>
        </template>
        <template v-else>
        <tr
          v-for="e in enrollments"
          :key="e.id"
          class="eet-data-row"
        >
          <!-- Action -->
          <td class="eet-td-action eet-sticky-col">
            <button class="eet-btn-detail" @click="openDetail(e)" title="Ver detalle">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2.5C4 2.5 1.5 7.5 1.5 7.5s2.5 5 6 5 6-5 6-5-2.5-5-6-5z" stroke="currentColor" stroke-width="1.2"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.2"/></svg>
            </button>
          </td>

          <!-- Identity -->
          <template v-if="cg.identity">
            <td class="eet-cell">{{ e.document_number || '\u2014' }}</td>
            <td class="eet-cell eet-cell-name">{{ e.student_full_name || '\u2014' }}</td>
            <td class="eet-cell">{{ e.phone || '\u2014' }}</td>
            <td class="eet-cell eet-cell-email">{{ e.email || '\u2014' }}</td>
          </template>
          <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

          <!-- Profile -->
          <template v-if="cg.profile">
            <td class="eet-cell">{{ e.occupation_label || '\u2014' }}</td>
            <td class="eet-cell">{{ e.client_type_label || '\u2014' }}</td>
            <td class="eet-cell">{{ e.member_type_label || '\u2014' }}</td>
            <td class="eet-cell">
              <span :class="['eet-pill', fmt.statusPill(e.student_status)]">{{ e.student_status || '\u2014' }}</span>
            </td>
            <td class="eet-cell">{{ [e.modality, e.student_type_label].filter(Boolean).join(' / ') || '\u2014' }}</td>
          </template>
          <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

          <!-- Program -->
          <template v-if="cg.program">
            <td class="eet-cell">{{ e.program_type || '\u2014' }}</td>
            <td class="eet-cell">{{ e.program_modality || '\u2014' }}</td>
            <td class="eet-cell eet-cell-program">
              {{ e.program_name || '\u2014' }}
              <span
                v-if="Number(e.validations_count) > 0"
                class="eet-validation-badge"
                :title="`${e.validations_count} modulo(s) convalidado(s)`"
              >
                <i class="fa-solid fa-circle-check"></i> Convalida
              </span>
            </td>
            <td class="eet-cell">{{ e.edition_code || '\u2014' }}</td>
            <template v-for="n in childCols" :key="'cc-' + n">
              <td class="eet-cell eet-cell-course" :title="childAt(e, n)?.course_full_name">
                {{ childAt(e, n)?.course_name || '\u2014' }}
              </td>
              <td class="eet-cell eet-cell-date" :title="childAt(e, n)?.edition_code">
                {{ fmt.formatDate(childAt(e, n)?.start_date) }}
              </td>
            </template>
          </template>
          <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

          <!-- Finance -->
          <template v-if="cg.finance">
            <td class="eet-cell">{{ fmt.formatDate(e.start_date) }}</td>
            <td class="eet-cell">{{ fmt.formatDate(e.pay_date) }}</td>
            <td class="eet-cell">{{ e.seller_agent_name || '\u2014' }}</td>
            <td class="eet-cell">{{ e.payment_type || '\u2014' }}</td>
            <td class="eet-cell">{{ e.main_discount || '\u2014' }}</td>
            <td class="eet-cell">{{ e.additional_discounts || '\u2014' }}</td>
            <td class="eet-cell">{{ e.payment_channel || '\u2014' }}</td>
            <td class="eet-cell eet-cell-money">{{ fmt.formatMoney(e.list_price) }}</td>
            <td class="eet-cell eet-cell-money">{{ fmt.formatMoney(e.total_to_pay) }}</td>
            <td class="eet-cell eet-cell-money">{{ fmt.formatMoney(e.total_discounted) }}</td>
            <td class="eet-cell">{{ e.currency_label || '\u2014' }}</td>
            <td class="eet-cell">{{ e.method_payment_label || '\u2014' }}</td>
            <td class="eet-cell">{{ e.account_label || '\u2014' }}</td>
            <td class="eet-cell">{{ e.token_provider_label || '\u2014' }}</td>
          </template>
          <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>

          <!-- Installments -->
          <template v-if="cg.installments">
            <template v-for="n in 8" :key="'ic-'+n">
              <td class="eet-cell eet-cell-date">{{ fmt.formatDate(e['fc'+n]) }}</td>
              <td class="eet-cell eet-cell-money">{{ e['c'+n] != null ? fmt.formatMoney(e['c'+n]) : '\u2014' }}</td>
            </template>
          </template>
          <td v-else class="eet-cell eet-collapsed-hint">&nbsp;</td>
        </tr>

        <tr v-if="!enrollments.length">
          <td :colspan="totalCols" class="eet-empty">Sin registros</td>
        </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  isLoading:   { type: Boolean, default: false }
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

const LS_KEY = 'fico_col_groups_v1'

function loadState () {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return null
}

const defaults = { identity: true, profile: true, program: true, finance: true, installments: true }
const cg = reactive({ ...defaults, ...loadState() })

watch(cg, val => {
  localStorage.setItem(LS_KEY, JSON.stringify(val))
}, { deep: true })

function toggle (key) {
  cg[key] = !cg[key]
}

// Un paquete (diplomado/especializacion) se vende como una fila padre con un
// hijo por curso. Se muestran en pares CURSO n / FI n, igual que la hoja de
// calculo de FICO. El ancho lo fija la fila con mas hijos de la pagina actual:
// una pagina sin paquetes no paga columnas vacias.
const childCols = computed(
  () => props.enrollments.reduce((max, e) => Math.max(max, e.children?.length || 0), 0)
)

// Tipo Prog. + Mod. Prog. + Programa + ED, mas el par de cada curso hijo.
const programCols = computed(() => 4 + childCols.value * 2)

const childAt = (e, n) => e.children?.[n - 1]

const totalCols = computed(() => {
  let n = 1 // action col
  n += cg.identity ? 4 : 1
  n += cg.profile ? 5 : 1
  n += cg.program ? programCols.value : 1
  n += cg.finance ? 14 : 1
  n += cg.installments ? 16 : 1
  return n
})
</script>

<style scoped>
/* Scroll wrapper */
.eet-scroll-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #fff;
}

/* Table base */
.eet-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-family: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  color: #1F2937;
}

/* Sticky action column */
.eet-sticky-col {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #fff;
  min-width: 48px;
  width: 48px;
  text-align: center;
  border-right: 1px solid #E5E7EB;
}

/* Group header row */
.eet-group-row {
  background: #FAFAFA;
}

.eet-group-row .eet-sticky-col {
  background: #FAFAFA;
}

.eet-group-header {
  padding: 6px 10px;
  background: #fff;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  border-bottom: 1px solid #F3F4F6;
  transition: background 0.15s;
}

.eet-group-header:hover {
  background: #F9FAFB;
}

.eet-group-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #374151;
}

/* Group accent borders */
.eet-grp-identity { border-left: 2px solid #2563eb; }
.eet-grp-profile { border-left: 2px solid #7c3aed; }
.eet-grp-program { border-left: 2px solid #059669; }
.eet-grp-finance { border-left: 2px solid #d97706; }
.eet-grp-installments { border-left: 2px solid #0ea5e9; }

/* Chevron rotation */
.eet-chevron {
  transition: transform 0.2s;
  transform: rotate(90deg);
  flex-shrink: 0;
}

.eet-chevron.is-collapsed {
  transform: rotate(0deg);
}

/* Column header row */
.eet-col-row {
  background: #FAFAFA;
}

.eet-col-row .eet-sticky-col {
  background: #FAFAFA;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6B7280;
  padding: 5px 6px;
  border-bottom: 1px solid #E5E7EB;
}

.eet-col-header {
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6B7280;
  white-space: nowrap;
  border-bottom: 1px solid #E5E7EB;
  background: #FAFAFA;
}

.eet-collapsed-hint {
  color: #9CA3AF;
  text-align: center;
  min-width: 32px;
  width: 32px;
  font-size: 11px;
  letter-spacing: 2px;
}

/* Data rows */
.eet-data-row {
  height: 44px;
  transition: background 0.12s;
}

.eet-data-row:hover {
  background: #F9FAFB;
}

.eet-data-row:hover .eet-sticky-col {
  background: #F9FAFB;
}

.eet-data-row .eet-sticky-col {
  border-bottom: 1px solid #F3F4F6;
}

/* Cells */
.eet-cell {
  padding: 0 8px;
  white-space: nowrap;
  border-bottom: 1px solid #F3F4F6;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.eet-cell-name {
  max-width: 180px;
  font-weight: 500;
}

.eet-cell-email {
  max-width: 180px;
  color: #6B7280;
  font-size: 11px;
}

.eet-cell-program {
  max-width: 220px;
}

.eet-cell-course {
  max-width: 150px;
}

.eet-validation-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 9.5px;
  font-weight: 700;
  color: #5B21B6;
  background: #F5F3FF;
  border: 1px solid #DDD6FE;
  border-radius: 4px;
  vertical-align: middle;
  white-space: nowrap;
}
.eet-validation-badge i {
  font-size: 8px;
}

.eet-cell-money {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.eet-cell-date {
  font-size: 11px;
  color: #6B7280;
}

.eet-td-action {
  padding: 0;
  border-bottom: 1px solid #F3F4F6;
  vertical-align: middle;
}

/* Action button */
.eet-btn-detail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.15s;
}

.eet-btn-detail:hover {
  background: #EFF6FF;
  color: #2563eb;
}

/* Status pills */
.eet-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.pill-green {
  background: #ECFDF5;
  color: #065F46;
}

.pill-amber {
  background: #FFFBEB;
  color: #92400E;
}

.pill-red {
  background: #FEF2F2;
  color: #991B1B;
}

/* Voucher link */
.eet-voucher-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  transition: color 0.15s;
}

.eet-voucher-link:hover {
  color: #1D4ED8;
}

.eet-muted {
  color: #D1D5DB;
}

/* Empty state */
.eet-empty {
  text-align: center;
  padding: 40px 16px;
  color: #9CA3AF;
  font-size: 13px;
  border-bottom: none;
}

/* Skeleton loading */
.eet-skeleton-row {
  height: 44px;
}
.eet-skeleton-row td {
  border-bottom: 1px solid #F3F4F6;
  vertical-align: middle;
}
.eet-sk-cell {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
  background-size: 200% 100%;
  animation: eet-sk-shimmer 1.4s ease-in-out infinite;
  width: 100%;
}
@keyframes eet-sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .eet-scroll-wrapper {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .eet-table { color: #D4D4CC; }

[data-coreui-theme="dark"] .eet-sticky-col {
  background: #1A1A14;
  border-right-color: #2A2A22;
}

[data-coreui-theme="dark"] .eet-group-row,
[data-coreui-theme="dark"] .eet-group-row .eet-sticky-col,
[data-coreui-theme="dark"] .eet-col-row,
[data-coreui-theme="dark"] .eet-col-row .eet-sticky-col,
[data-coreui-theme="dark"] .eet-col-header {
  background: #1F1F1A;
  color: #6F6F66;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .eet-group-header {
  background: #1A1A14;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .eet-group-header:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .eet-group-label { color: #D4D4CC; }

/* Group accent borders — keep colors but slightly brighter on dark */
[data-coreui-theme="dark"] .eet-grp-identity { border-left-color: #60A5FA; }
[data-coreui-theme="dark"] .eet-grp-profile { border-left-color: #A78BFA; }
[data-coreui-theme="dark"] .eet-grp-program { border-left-color: #34D399; }
[data-coreui-theme="dark"] .eet-grp-finance { border-left-color: #FBBF24; }
[data-coreui-theme="dark"] .eet-grp-installments { border-left-color: #38BDF8; }

[data-coreui-theme="dark"] .eet-collapsed-hint { color: #6F6F66; }

[data-coreui-theme="dark"] .eet-data-row .eet-sticky-col,
[data-coreui-theme="dark"] .eet-cell,
[data-coreui-theme="dark"] .eet-td-action {
  border-bottom-color: #1F1F1A;
}
[data-coreui-theme="dark"] .eet-data-row:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .eet-data-row:hover .eet-sticky-col { background: #1F1F1A; }

[data-coreui-theme="dark"] .eet-cell-email { color: #A0A099; }
[data-coreui-theme="dark"] .eet-cell-date { color: #A0A099; }
[data-coreui-theme="dark"] .eet-muted { color: #3A3A33; }

[data-coreui-theme="dark"] .eet-validation-badge {
  background: rgba(139,92,246,0.16);
  border-color: rgba(139,92,246,0.4);
  color: #C4B5FD;
}

[data-coreui-theme="dark"] .eet-btn-detail { color: #A0A099; }
[data-coreui-theme="dark"] .eet-btn-detail:hover {
  background: rgba(37,99,235,0.16);
  color: #60A5FA;
}

[data-coreui-theme="dark"] .pill-green { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,0.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red   { background: rgba(239,68,68,0.16); color: #F87171; }

[data-coreui-theme="dark"] .eet-voucher-link { color: #60A5FA; }
[data-coreui-theme="dark"] .eet-voucher-link:hover { color: #93C5FD; }

[data-coreui-theme="dark"] .eet-empty { color: #6F6F66; }

[data-coreui-theme="dark"] .eet-skeleton-row td { border-bottom-color: #1F1F1A; }
[data-coreui-theme="dark"] .eet-sk-cell {
  background: linear-gradient(90deg, #1F1F1A 25%, #2A2A22 50%, #1F1F1A 75%);
  background-size: 200% 100%;
}
</style>
