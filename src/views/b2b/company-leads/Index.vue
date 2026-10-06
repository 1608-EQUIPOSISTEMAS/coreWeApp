<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Leads de empresas</h1>
        <p class="ds-sub">
          {{ isLoading ? 'Cargando leads…' : `${formatValue(pagin.total, 'num')} contactos y oportunidades corporativas${activeQuickView !== 'all' || activeFilterChips.length ? ' con los filtros aplicados' : ''}` }}
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="goNew">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo lead
        </button>
      </div>
    </header>

    <BaseFilterChips
      :items="activeFilterChips"
      @remove="clearFilter"
      @clear-all="clearFilters"
    />

    <section class="ds-panel">
      <div class="ds-panel-body ld-body">
        <div class="ld-toolbar">
          <div class="ld-quick">
            <div class="ds-tabs" role="tablist" aria-label="Vistas rápidas">
              <button
                v-for="v in quickViews"
                :key="v.key"
                type="button"
                role="tab"
                :aria-selected="String(activeQuickView === v.key)"
                :title="v.title"
                @click="applyQuickView(v.key)"
              >
                <i class="fa-solid ld-tab-icon" :class="v.icon" aria-hidden="true"></i> {{ v.label }}
              </button>
            </div>
            <div class="ld-order" title="Ordenar resultados">
              <i class="fa-solid fa-arrow-down-wide-short ld-order-icon" aria-hidden="true"></i>
              <SearchSelect
                v-model="filters.order_by"
                :items="filtroOrden"
                label-field="description"
                value-field="value"
                placeholder="Ordenar..."
                class="ld-order-select"
                @update:model-value="onOrderChange"
              />
            </div>
          </div>
          <BasePagination
            v-model="pagin"
            @open-filters="openFilterModal"
            @change="handlePaginationChange"
          />
        </div>

        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista ld-table">
            <thead>
              <tr>
                <th class="ld-col-action"><span class="visually-hidden">Acciones</span></th>
                <th>Empresa vinculada</th>
                <th>Nombre del contacto</th>
                <th>Programa / interés</th>
                <th>Status</th>
                <th>F. pago</th>
                <th>Interés</th>
                <th>Registro</th>
                <th>Seguimiento</th>
              </tr>
              <tr class="ld-flt-row">
                <th class="ld-col-action">
                  <button
                    v-if="activeFilterChips.length"
                    class="btn-icon btn-icon-sm ld-danger"
                    type="button"
                    title="Limpiar filtros"
                    aria-label="Limpiar filtros"
                    @click="clearFilters"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </th>
                <th>
                  <input v-model="filters.company_q" type="text" class="ds-input ld-flt" placeholder="Empresa..." aria-label="Filtrar por empresa" @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th>
                  <input v-model="filters.q" type="text" class="ds-input ld-flt" placeholder="Nombre..." aria-label="Filtrar por nombre del contacto" @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th>
                  <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Programa..." class="ld-ms" @update:model-value="triggerFilter" />
                </th>
                <th>
                  <MultiSelect v-model="filters.status_lead_ids" :items="leadStatusCatalog" label-key="description" value-key="id" placeholder="Todos..." class="ld-ms" @update:model-value="triggerFilter" />
                </th>
                <th></th>
                <th>
                  <MultiSelect v-model="filters.interest_level_ids" :items="leadInterestCatalog" label-key="description" value-key="id" placeholder="Todos..." class="ld-ms" @update:model-value="triggerFilter" />
                </th>
                <th></th>
                <th>
                  <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." class="ld-ms" @update:model-value="triggerFilter" />
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td colspan="9"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="l in leadsRaw" :key="l.lead_id" class="link" @dblclick="editLead(l)">
                  <td class="ld-col-action">
                    <button class="btn-icon btn-icon-sm" type="button" title="Editar lead" aria-label="Editar lead" @click="editLead(l)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td class="nowrap">
                    <div class="ld-main">{{ l.company_name || '—' }}</div>
                    <div class="ld-sub ld-mono">{{ l.company_document || '' }}</div>
                  </td>
                  <td class="nowrap">
                    <div class="ld-main">{{ l.full_name_label || l.full_name || '—' }}</div>
                    <div class="ld-sub">{{ l.origin_phone || '' }}</div>
                  </td>
                  <td class="ld-program">{{ l.program_label || '—' }}</td>
                  <td>
                    <span class="ds-pill">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
                  </td>
                  <td class="ld-pay-date">{{ l.pay_date || '—' }}</td>
                  <td>
                    <span v-if="l.cat_interest_alias" class="ds-pill" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
                    <span v-else class="ld-muted">—</span>
                  </td>
                  <td class="nowrap ld-muted">{{ l.system_registration_date || '—' }}</td>
                  <td class="ld-follow">
                    <span v-if="l.cat_last_follow_alias" class="ds-pill" :class="badgeForFollow(l.cat_last_follow_alias)">
                      {{ followMap[l.cat_last_follow_alias] }}
                    </span>
                    <span v-else class="ld-muted">—</span>
                  </td>
                </tr>
                <tr v-if="!leadsRaw.length">
                  <td colspan="9" class="ds-empty ds-empty--lista">
                    No hay leads de empresa con estos filtros. Quita un filtro o vuelve a la vista "Todos".
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros avanzados" size="md">
    <div class="ds-form-grid">
      <div class="ds-field">
        <label class="ds-label" for="ld-flt-company">Empresa (nombre o RUC)</label>
        <input id="ld-flt-company" v-model.trim="filtersDraft.company_q" type="text" class="ds-input" placeholder="Empresa S.A.C. / 20..." />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="ld-flt-q">Nombre del contacto</label>
        <input id="ld-flt-q" v-model.trim="filtersDraft.q" type="text" class="ds-input" placeholder="Nombre..." />
      </div>
    </div>
    <template #footer>
      <div class="ld-modal-foot">
        <button class="btn-exec btn-exec-ghost" type="button" @click="clearFilters">
          <i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar todo
        </button>
        <div class="ld-modal-actions">
          <button class="btn-exec btn-exec-outline" type="button" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" type="button" @click="applyModalFilters">
            <i class="fa-solid fa-filter" aria-hidden="true"></i> Aplicar filtros
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseModal from '@/components/BaseModal.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'

const router = useRouter()
const route = useRoute()
const comercialService = inject(ServiceKeys.Comercial)
const b2bService = inject(ServiceKeys.B2b)
const programService = inject(ServiceKeys.Program)
const catalogSvc = inject('catalog')

// Catálogos
const leadStatusCatalog = ref(catalogSvc?.options('we_lead_status') || [])
const leadInterestCatalog = ref(catalogSvc?.options('we_lead_interest') || [])
const followCatalog = ref(catalogSvc?.options('we_follow_lead') || [])

const filtroFollow = computed(() => followCatalog.value)
const followMap = computed(() =>
  Object.fromEntries(followCatalog.value.map(f => [f.alias, f.description]))
)

// Estado
const showFilterModal = ref(false)
const leadsRaw = ref([])
// Flag de carga para el skeleton de la tabla
const isLoading = ref(false)
const pagin = ref({ page: 1, size: 25, total: 0 })

// Filtros inline
const filters = reactive({
  q: '',
  order_by: 0,
  company_q: '',
  status_lead_ids: [],
  program_version_ids: [],
  interest_level_ids: [],
  last_follow_ids: [],
})

// Filtros modal (draft)
const filtersDraft = reactive({ q: '', company_q: '' })

const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', label: `Nombre: ${filters.q}` })
  if (filters.company_q) chips.push({ key: 'company_q', label: `Empresa: ${filters.company_q}` })
  activeFilterChips.value = chips
}

function clearFilter(key) {
  filters[key] = Array.isArray(filters[key]) ? [] : ''
  rebuildChips()
  fetchLeads()
}

// Dejar los filtros en cero SIN ir al servidor: las vistas rapidas resetean y
// despues arman su propio filtro, y un fetch en el medio seria un viaje al
// pedo cuyo resultado se descarta al instante.
function resetFilters() {
  activeQuickView.value = 'all'
  filters.q = ''
  filters.company_q = ''
  filters.status_lead_ids = []
  filters.program_version_ids = []
  filters.interest_level_ids = []
  filters.last_follow_ids = []
  filtersDraft.q = ''
  filtersDraft.company_q = ''
}

function clearFilters() {
  resetFilters()
  rebuildChips()
  fetchLeads()
}

function applyModalFilters() {
  filters.q = filtersDraft.q
  filters.company_q = filtersDraft.company_q
  showFilterModal.value = false
  rebuildChips()
  fetchLeads()
}

let debounceTimer = null
function debouncedFilter() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { rebuildChips(); fetchLeads() }, 400)
}

function triggerFilter() { rebuildChips(); fetchLeads() }
function openFilterModal() {
  filtersDraft.q = filters.q
  filtersDraft.company_q = filters.company_q
  showFilterModal.value = true
}

function handlePaginationChange() { fetchLeads() }

// === Vistas rapidas ===
// Mismo contrato que /b2b/leads: la pestaña no filtra en memoria, arma el filtro
// del SP a partir del ALIAS del catalogo. El id numerico cambia entre entornos;
// el alias no.
const quickViews = [
  { key: 'all',       label: 'Todos',       icon: 'fa-list',        highlight: true, title: 'Limpiar todos los filtros' },
  { key: 'follow',    label: 'Seguimiento', icon: 'fa-phone',       title: 'Pendientes de contacto' },
  { key: 'will_pay',  label: 'Pagará',      icon: 'fa-coins',       title: 'Leads que comprometieron pago' },
  { key: 'hot',       label: 'Interés alto', icon: 'fa-fire',       title: 'Nivel de interes alto' }
]
const activeQuickView = ref('all')

const filtroOrden = [
  { value: 0, description: 'Fecha de Registro' },
  { value: 2, description: 'Fecha de Pago' },
  { value: 4, description: 'Fecha de Contacto' }
]

function resolveByAlias(catalogRef, aliases) {
  const items = catalogRef.value || []
  return aliases
    .map(a => items.find(i => i.alias === a))
    .filter(Boolean)
    .map(i => ({ value: i.id, label: i.description }))
}

function applyQuickView(key) {
  resetFilters()
  activeQuickView.value = key

  if (key === 'follow') {
    filters.last_follow_ids = resolveByAlias(followCatalog, ['we_calling_pending'])
  } else if (key === 'will_pay') {
    filters.status_lead_ids = resolveByAlias(leadStatusCatalog, ['we_lead_status_will_pay'])
  } else if (key === 'hot') {
    filters.interest_level_ids = resolveByAlias(leadInterestCatalog, ['we_lead_interest_high'])
  }

  pagin.value.page = 1
  rebuildChips()
  fetchLeads()
}

function onOrderChange() {
  pagin.value.page = 1
  rebuildChips()
  fetchLeads()
}

// Navegación
function goNew() { router.push({ name: 'B2BCompanyLeadNew' }) }
function editLead(l) { router.push({ name: 'B2BCompanyLeadEdit', params: { id: l.lead_id } }) }

// Tono de .ds-pill: alto/caliente = ok, medio/tibio = warn, bajo/frío = bad;
// lo demás queda neutro ('').
function badgeForInterest(alias) {
  if (alias === 'we_lead_interest_high')   return 'ok'
  if (alias === 'we_lead_interest_medium') return 'warn'
  if (alias === 'we_lead_interest_low')    return 'bad'
  return ''
}
function badgeForFollow(alias) {
  if (alias?.includes('hot'))   return 'ok'
  if (alias?.includes('warm'))  return 'warn'
  if (alias?.includes('cold'))  return 'bad'
  return ''
}

// Fetch
async function fetchLeads() {
  isLoading.value = true
  try {
    const getIds = (arr) => (Array.isArray(arr) ? arr.map(i => (typeof i === 'object' ? i.value : i)) : [])
    const { items, total: t, page: p } = await b2bService.companyLeadList({
      q: filters.q || null,
      company_q: filters.company_q || null,
      order_by: filters.order_by ?? 0,
      page: pagin.value.page,
      size: pagin.value.size,
      status_lead_ids: getIds(filters.status_lead_ids),
      program_version_ids: getIds(filters.program_version_ids),
      interest_level_ids: getIds(filters.interest_level_ids),
      last_follow_ids: getIds(filters.last_follow_ids),
    })
    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)
    pagin.value.page  = Number(p || pagin.value.page)
  } catch (err) {
    console.error('Error cargando leads empresa:', err)
    leadsRaw.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (route.query.company_id) {
    filters.company_q = route.query.company_name || route.query.company_id
    filtersDraft.company_q = filters.company_q
    rebuildChips()
  }
  fetchLeads()
})
</script>

<style scoped>
.ld-body { display: flex; flex-direction: column; gap: 14px; }

/* Vistas rápidas + orden a la izquierda, paginación a la derecha; se apilan al achicarse. */
.ld-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
.ld-quick { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.ld-tab-icon { margin-right: 4px; font-size: 11px; opacity: 0.75; }
.ld-order { display: flex; align-items: center; gap: 6px; }
.ld-order-icon { font-size: 11px; color: var(--ds-ink-2); }
.ld-order-select { width: 230px; max-width: 100%; }

/* 9 columnas con filtro: bajo este ancho la tabla hace scroll dentro de
   .ds-table-scroll en vez de aplastar los filtros. */
.ld-table { min-width: 1180px; }
.ld-col-action { width: 48px; text-align: center; }
.nowrap { white-space: nowrap; }

/* Fila de filtros por columna: controles compactos bajo el encabezado. */
.ld-flt-row th { padding: 6px 8px; }
.ld-flt { height: 30px; min-width: 90px; font-size: 12px; }
.ld-ms {
  --ms-font-size: 11px; --ms-line-height: 1.3; --ms-min-height: 30px;
  --ms-py: 2px; --ms-px: 6px; --ms-tag-py: 1px; --ms-tag-px: 4px; --ms-tag-font-size: 9.5px;
  --ms-border-color: var(--ds-border); --ms-border-color-active: var(--ds-brand);
  min-width: 120px; font-size: 11px;
}
/* Los desplegables de las últimas columnas abren hacia la izquierda: si no, se salen de la tabla. */
.ld-flt-row th:nth-last-child(-n+3) :deep(.multiselect-dropdown) { left: auto !important; right: 0 !important; }

.ld-main { font-weight: 600; color: var(--ds-heading); }
.ld-sub { margin-top: 1px; font-size: 11.5px; font-weight: 400; color: var(--ds-muted); }
.ld-mono { font-family: var(--ds-font-mono); }
.ld-muted { color: var(--ds-muted); }
.ld-program { font-size: 12px; font-weight: 600; color: var(--ds-accent); }
/* La fecha de pago es el compromiso del lead: se lee en verde y alineada. */
.ld-pay-date { font-weight: 700; color: var(--ds-ok-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ld-follow { min-width: 140px; }
.ld-danger { color: var(--ds-bad-ink); }

/* El pie del BaseModal no trae layout propio: "Limpiar" a la izquierda y las
   acciones a la derecha; a 400 px se apilan sin desbordar. */
.ld-modal-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
.ld-modal-actions { display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 600px) {
  .ld-order, .ld-order-select { width: 100%; }
}
</style>
