<template>
  <section class="ds-panel">
    <div class="ds-table-scroll">
      <table class="ds-table ds-table--densa eet">
        <thead>
          <!-- Grupos plegables: el estado se recuerda en el navegador. -->
          <tr class="eet-groups">
            <th class="eet-sticky">&nbsp;</th>
            <th v-for="g in GROUPS" :key="g.key" :colspan="cg[g.key] ? groupCols[g.key] : 1" class="eet-group">
              <button
                type="button"
                class="eet-group-btn"
                :class="{ 'has-filter': groupHasFilter(g) }"
                :aria-expanded="cg[g.key]"
                :title="groupHasFilter(g) ? 'Hay un filtro activo en este grupo' : (cg[g.key] ? 'Plegar grupo' : 'Desplegar grupo')"
                @click="toggle(g.key)"
              >
                <i class="fa-solid fa-chevron-right eet-chevron" :class="{ 'is-open': cg[g.key] }" aria-hidden="true"></i>
                {{ g.label }}
                <i v-if="groupHasFilter(g)" class="fa-solid fa-filter" aria-hidden="true"></i>
              </button>
            </th>
          </tr>

          <tr>
            <th class="eet-sticky"><span class="sr-only">Abrir</span></th>

            <template v-if="cg.identity">
              <th>DNI</th>
              <th><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('alumno') }" :aria-expanded="colToggles.isOpen('alumno')" @click="colToggles.toggle('alumno')">Nombres <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th>Celular</th>
              <th>Correo</th>
            </template>
            <th v-else class="eet-folded">…</th>

            <template v-if="cg.profile">
              <th>Ocupación</th>
              <th>Tipo cliente</th>
              <th>Member</th>
              <th>Estado</th>
              <th>Mod. / tipo</th>
            </template>
            <th v-else class="eet-folded">…</th>

            <template v-if="cg.program">
              <th>Tipo prog.</th>
              <th>Mod. prog.</th>
              <th><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('programa') }" :aria-expanded="colToggles.isOpen('programa')" @click="colToggles.toggle('programa')">Programa <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th>Ed.</th>
              <template v-for="n in childCols" :key="'ch-' + n">
                <th>Curso {{ n }}</th>
                <th>FI {{ n }}</th>
              </template>
            </template>
            <th v-else class="eet-folded">…</th>

            <template v-if="cg.finance">
              <th>F. inicio</th>
              <th><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('fPago') }" :aria-expanded="colToggles.isOpen('fPago')" @click="colToggles.toggle('fPago')">F. pago <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('agente') }" :aria-expanded="colToggles.isOpen('agente')" @click="colToggles.toggle('agente')">Asesor <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('tipoPago') }" :aria-expanded="colToggles.isOpen('tipoPago')" @click="colToggles.toggle('tipoPago')">Tipo pago <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th>Dsct. princ.</th>
              <th>Dsct. adic.</th>
              <th>Canal</th>
              <th class="num">P. lista</th>
              <th class="num"><button type="button" class="ds-th-filter" :class="{ 'is-active': colToggles.isActive('montoMin') }" :aria-expanded="colToggles.isOpen('montoMin')" @click="colToggles.toggle('montoMin')">Total <i class="fa-solid fa-filter" aria-hidden="true"></i></button></th>
              <th class="num">Descontado</th>
              <th>Moneda</th>
              <th>Medio pago</th>
              <th>Ent. empresa</th>
              <th>Ent. financ.</th>
            </template>
            <th v-else class="eet-folded">…</th>

            <template v-if="cg.installments">
              <template v-for="n in 8" :key="'ih-' + n">
                <th>FC{{ n }}</th>
                <th class="num">C{{ n }}</th>
              </template>
            </template>
            <th v-else class="eet-folded">…</th>
          </tr>

          <!-- Fila de filtros: aparece solo al abrir una columna o con un filtro
               puesto. Misma forma que la fila de títulos para quedar alineada. -->
          <tr v-if="colToggles.anyVisible.value" class="eet-filters">
            <th class="eet-sticky">
              <button class="btn-icon btn-icon-sm" type="button" title="Limpiar y cerrar filtros" aria-label="Limpiar y cerrar filtros" @click="clearFilters">
                <i class="fa-solid fa-eraser" aria-hidden="true"></i>
              </button>
            </th>

            <template v-if="cg.identity">
              <th></th>
              <th><input v-if="colToggles.isOpen('alumno')" :value="colFilters.alumno" @input="setFilter('alumno', $event.target.value)" class="eet-filter" placeholder="Nombre o DNI…" aria-label="Filtrar por alumno" /></th>
              <th></th>
              <th></th>
            </template>
            <th v-else></th>

            <template v-if="cg.profile"><th v-for="c in 5" :key="'fp-' + c"></th></template>
            <th v-else></th>

            <template v-if="cg.program">
              <th></th>
              <th></th>
              <th><input v-if="colToggles.isOpen('programa')" :value="colFilters.programa" @input="setFilter('programa', $event.target.value)" class="eet-filter" placeholder="Programa…" aria-label="Filtrar por programa" /></th>
              <th></th>
              <th v-for="c in childCols * 2" :key="'fc-' + c"></th>
            </template>
            <th v-else></th>

            <template v-if="cg.finance">
              <th></th>
              <th><BaseDatePicker v-if="colToggles.isOpen('fPago')" :model-value="colFilters.fPago" @update:model-value="v => setFilter('fPago', v)" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" /></th>
              <th><ColumnFilterDropdown v-if="colToggles.isOpen('agente')" column-label="Agente" :all-items="enrollments" :value-extractor="e => e.seller_agent_name || '(Vacío)'" :model-value="colFilters.agente" @update:model-value="v => setFilter('agente', v)" /></th>
              <th><ColumnFilterDropdown v-if="colToggles.isOpen('tipoPago')" column-label="Tipo Pago" :all-items="enrollments" :value-extractor="e => (e.payment_type === 'PT') ? 'Al contado' : 'Cuotas'" :model-value="colFilters.tipoPago" @update:model-value="v => setFilter('tipoPago', v)" /></th>
              <th v-for="c in 4" :key="'ff-' + c"></th>
              <th><input v-if="colToggles.isOpen('montoMin')" :value="colFilters.montoMin" @input="setFilter('montoMin', $event.target.value)" type="number" min="0" class="eet-filter num" placeholder="&ge; 0" aria-label="Total mínimo" /></th>
              <th v-for="c in 5" :key="'fg-' + c"></th>
            </template>
            <th v-else></th>

            <template v-if="cg.installments"><th v-for="c in 16" :key="'fi-' + c"></th></template>
            <th v-else></th>
          </tr>
        </thead>

        <tbody>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-' + n">
              <td :colspan="totalCols"><span class="ds-skel"></span></td>
            </tr>
          </template>
          <tr v-else-if="!enrollments.length">
            <td :colspan="totalCols" class="ds-empty ds-empty--lista">No hay inscripciones con estos filtros. Quita un filtro para ver más.</td>
          </tr>
          <template v-else>
            <tr v-for="e in enrollments" :key="e.enrollment_id">
              <td class="eet-sticky">
                <button class="btn-icon btn-icon-sm" type="button" title="Abrir detalle completo" aria-label="Abrir detalle completo" @click="openDetail(e)">
                  <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i>
                </button>
              </td>

              <template v-if="cg.identity">
                <td class="mono">{{ e.document_number || '—' }}</td>
                <td class="eet-strong eet-clip" :title="e.student_full_name">{{ e.student_full_name || '—' }}</td>
                <td>{{ e.phone || '—' }}</td>
                <td class="eet-clip" :title="e.email">{{ e.email || '—' }}</td>
              </template>
              <td v-else class="eet-folded"></td>

              <template v-if="cg.profile">
                <td>{{ e.occupation_label || '—' }}</td>
                <td>{{ e.client_type_label || '—' }}</td>
                <td>{{ e.member_type_label || '—' }}</td>
                <td><span class="ds-pill" :class="studentTone(e.student_status)">{{ e.student_status || '—' }}</span></td>
                <td>{{ [e.modality, e.student_type_label].filter(Boolean).join(' / ') || '—' }}</td>
              </template>
              <td v-else class="eet-folded"></td>

              <template v-if="cg.program">
                <td>{{ e.program_type || '—' }}</td>
                <td>{{ e.program_modality || '—' }}</td>
                <td class="eet-strong eet-clip" :title="e.program_name">
                  {{ e.program_name || '—' }}
                  <span v-if="Number(e.validations_count) > 0" class="ds-pill violet" :title="`${e.validations_count} módulo(s) convalidado(s)`">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Convalida
                  </span>
                </td>
                <td>{{ e.edition_code || '—' }}</td>
                <template v-for="n in childCols" :key="'cc-' + n">
                  <td class="eet-clip" :title="childAt(e, n)?.course_full_name">{{ childAt(e, n)?.course_name || '—' }}</td>
                  <td :title="childAt(e, n)?.edition_code">{{ fmt.formatDate(childAt(e, n)?.start_date) }}</td>
                </template>
              </template>
              <td v-else class="eet-folded"></td>

              <template v-if="cg.finance">
                <td>{{ fmt.formatDate(e.start_date) }}</td>
                <td>{{ fmt.formatDate(e.pay_date) }}</td>
                <td>{{ e.seller_agent_name || '—' }}</td>
                <td>{{ e.payment_type || '—' }}</td>
                <td>{{ e.main_discount || '—' }}</td>
                <td>{{ e.additional_discounts || '—' }}</td>
                <td>{{ e.payment_channel || '—' }}</td>
                <td class="num mono">{{ fmt.formatMoney(e.list_price) }}</td>
                <td class="num mono eet-strong">{{ fmt.formatMoney(e.total_to_pay) }}</td>
                <td class="num mono">{{ fmt.formatMoney(e.total_discounted) }}</td>
                <td>{{ e.currency_label || '—' }}</td>
                <td>{{ e.method_payment_label || '—' }}</td>
                <td>{{ e.account_label || '—' }}</td>
                <td>{{ e.token_provider_label || '—' }}</td>
              </template>
              <td v-else class="eet-folded"></td>

              <template v-if="cg.installments">
                <template v-for="n in 8" :key="'ic-' + n">
                  <td>{{ fmt.formatDate(e['fc' + n]) }}</td>
                  <td class="num mono">{{ e['c' + n] != null ? fmt.formatMoney(e['c' + n]) : '—' }}</td>
                </template>
              </template>
              <td v-else class="eet-folded"></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useColumnFilterToggles } from '@/composables/useColumnFilterToggles.js'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'

const props = defineProps({
  enrollments: { type: Array, default: () => [] },
  colFilters: { type: Object, required: true },
  isLoading: { type: Boolean, default: false }
})
const emit = defineEmits(['clear-col-filters', 'update-filter'])

const router = useRouter()
const fmt = useEnrollmentFormatters()
// Mismos filtros que la vista compacta (useEnrollmentList.colFilters): lo que se
// filtra en una vista sigue filtrado al cambiar a la otra.
const colToggles = useColumnFilterToggles(props.colFilters)

// Los filtros son del composable de la pagina (useEnrollmentList.colFilters): la
// tabla no los muta, avisa el cambio y la pagina lo aplica.
const setFilter = (key, value) => emit('update-filter', key, value)

// Estado del ALUMNO (no el de FICO): activo es lo normal, retirado/anulado es
// baja; SEG, RP, CC, E0... son situaciones de la venta, no alertas.
function studentTone (status) {
  if (/activ/i.test(status || '')) return 'ok'
  if (/retir|anul/i.test(status || '')) return 'bad'
  return ''
}

function clearFilters () {
  emit('clear-col-filters')
  colToggles.closeAll()
}

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
  } catch { /* preferencia corrupta o sin storage: se usan los defaults */ }
  return null
}

const defaults = { identity: true, profile: true, program: true, finance: true, installments: true }
const cg = reactive({ ...defaults, ...loadState() })

watch(cg, val => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)) } catch { /* modo privado: no se recuerda */ }
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

const childAt = (e, n) => e.children?.[n - 1]

// filters = claves de colFilters que viven en el grupo: si el grupo esta plegado
// y alguna filtra, su encabezado lo avisa (si no, el filtro quedaria invisible).
const GROUPS = [
  { key: 'identity', label: 'Identidad', filters: ['alumno'] },
  { key: 'profile', label: 'Perfil del alumno', filters: [] },
  { key: 'program', label: 'Programa', filters: ['programa'] },
  { key: 'finance', label: 'Finanzas', filters: ['fPago', 'agente', 'tipoPago', 'montoMin'] },
  { key: 'installments', label: 'Cuotas', filters: [] }
]
const groupHasFilter = (g) => g.filters.some(colToggles.isActive)

const groupCols = computed(() => ({
  identity: 4,
  profile: 5,
  program: 4 + childCols.value * 2,
  finance: 14,
  installments: 16
}))

const totalCols = computed(() =>
  1 + GROUPS.reduce((n, g) => n + (cg[g.key] ? groupCols.value[g.key] : 1), 0))
</script>

<style scoped>
/* Tabla, pills, vacío y skeleton salen de ds-*. Aquí: la columna fija, los
   grupos plegables y la fila de filtros. Sin bloque dark: todo va con tokens. */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.eet { width: max-content; min-width: 100%; }
.eet th, .eet td { white-space: nowrap; }
.eet td { vertical-align: middle; }
.eet td:first-child { color: inherit; }

/* Columna de acción fija al hacer scroll horizontal. */
.eet-sticky {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 48px;
  text-align: center;
  background: var(--ds-surface);
  box-shadow: inset -1px 0 0 var(--ds-border);
}

.eet-groups th { padding-top: 8px; padding-bottom: 6px; background: var(--ds-surface-2); }
.eet-group { border-left: 1px solid var(--ds-border); }
.eet-group-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: 11.5px; font-weight: 700; color: var(--ds-heading);
}
.eet-group-btn.has-filter { color: var(--ds-accent); }
.eet-group-btn:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; }
.eet-chevron { font-size: 9px; transition: transform 0.15s; }
.eet-chevron.is-open { transform: rotate(90deg); }
.eet-folded { width: 32px; text-align: center; color: var(--ds-muted); }

.eet-filters th { padding-top: 6px; padding-bottom: 6px; background: var(--ds-surface-2); }
.eet-filter,
.eet-filters :deep(.exec-flatpickr-input) {
  width: 100%;
  min-width: 120px;
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
.eet-filter::placeholder,
.eet-filters :deep(.exec-flatpickr-input::placeholder) { color: var(--ds-muted); }
.eet-filter:focus,
.eet-filters :deep(.exec-flatpickr-input:focus) { border-color: var(--ds-accent); }
.eet-filter.num { min-width: 90px; text-align: right; -moz-appearance: textfield; }
.eet-filter.num::-webkit-outer-spin-button,
.eet-filter.num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.eet-strong { font-weight: 600; color: var(--ds-ink); }
.eet-clip { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.mono { font-family: var(--ds-font-mono); font-size: 11.5px; }
.eet .ds-pill.violet { margin-left: 6px; }
</style>
