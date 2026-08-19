<template>
  <div class="leads-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">B2B</span>
        <h1 class="ep-title">Leads de Empresas</h1>
        <span class="ep-subtitle">Contactos y oportunidades corporativas</span>
      </div>
      <div class="ep-masthead-actions">
        <button class="ep-btn-control" @click="openFilterModal" title="Filtros avanzados">
          <i class="fa-solid fa-filter"></i>
          <span>Filtros</span>
        </button>
        <button class="ep-btn-new" @click="goNew">
          <i class="fa-solid fa-plus"></i> Nuevo Lead
        </button>
      </div>
    </header>

    <main class="ep-body">

      <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': activeFilterChips.length > 0 }">
        <div class="ep-filter-bar-main">
          <div class="ep-quick-row">
            <nav class="ep-tabs" aria-label="Vistas rapidas">
              <button
                v-for="v in quickViews"
                :key="v.key"
                :class="['ep-tab', { 'is-active': activeQuickView === v.key, 'is-highlight': v.highlight }]"
                :title="v.title"
                @click="applyQuickView(v.key)"
              >
                <i class="fa-solid" :class="v.icon"></i> {{ v.label }}
              </button>
            </nav>
            <div class="ep-quick-order" title="Ordenar resultados">
              <i class="fa-solid fa-arrow-down-wide-short ep-quick-order-icon"></i>
              <SearchSelect
                v-model="filters.order_by"
                :items="filtroOrden"
                label-field="description"
                value-field="value"
                placeholder="Ordenar..."
                class="ss-quick"
                @update:model-value="onOrderChange"
              />
            </div>
          </div>
          <div class="ep-toolbar">
            <BasePagination
              v-model="pagin"
              @open-filters="openFilterModal"
              @change="handlePaginationChange"
            />
          </div>
        </div>

        <div v-if="activeFilterChips.length > 0" class="ep-filter-strip">
          <span class="ep-filter-strip-badge">
            <i class="fa-solid fa-circle-half-stroke"></i>
            Filtros activos
            <span class="ep-filter-strip-count">{{ activeFilterChips.length }}</span>
          </span>
          <BaseFilterChips
            :items="activeFilterChips"
            @remove="clearFilter"
            @clear-all="clearFilters"
          />
        </div>
      </section>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:80px">Acciones</th>
                <th class="ts ts-c">Empresa Vinculada</th>
                <th class="ts ts-c">Nombre del Contacto</th>
                <th class="ts ts-c">Programa / Interés</th>
                <th class="ts ts-c">Status</th>
                <th class="ts ts-c">F. Pago</th>
                <th class="ts ts-c">Interés</th>
                <th class="ts ts-c">Registro</th>
                <th class="ts ts-c">Seguimiento</th>
              </tr>
              <tr class="thead-filter">
                <th class="tf tf-actions-cell">
                  <div class="hf-actions-group">
                    <button v-if="activeFilterChips.length" class="hf-clear-btn" @click="clearFilters" title="Limpiar filtros">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </th>
                <th class="tf">
                  <input v-model="filters.company_q" type="text" class="hf-input" placeholder="Empresa..." @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th class="tf">
                  <input v-model="filters.q" type="text" class="hf-input" placeholder="Nombre..." @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th class="tf">
                  <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Programa..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf">
                  <MultiSelect v-model="filters.status_lead_ids" :items="leadStatusCatalog" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf"></th>
                <th class="tf">
                  <MultiSelect v-model="filters.interest_level_ids" :items="leadInterestCatalog" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf"></th>
                <th class="tf">
                  <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton de carga (shimmer) mientras se traen los leads -->
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n" class="skel-row">
                  <td v-for="col in 9" :key="col"><span class="skel"></span></td>
                </tr>
              </template>
              <template v-else>
              <tr v-for="l in leadsRaw" :key="l.lead_id" class="tbody-row" @dblclick="editLead(l)">
                <td class="td-a text-center">
                  <button class="btn-icon" @click="editLead(l)" title="Editar">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600">{{ l.company_name || '—' }}</div>
                  <small class="text-muted text-mono">{{ l.company_document || '' }}</small>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600">{{ l.full_name_label || l.full_name || '—' }}</div>
                  <small class="text-muted">{{ l.origin_phone || '' }}</small>
                </td>
                <td class="td-a small fw-600 accent-text">{{ l.program_label || '—' }}</td>
                <td class="td-a">
                  <span class="pill pill-slate border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
                </td>
                <td class="td-a small fw-700 pay-date-cell">{{ l.pay_date || '—' }}</td>
                <td class="td-a">
                  <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="td-a small nowrap text-muted">{{ l.system_registration_date || '—' }}</td>
                <td class="td-a text-center" style="min-width:140px">
                  <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                    <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
              </tr>
              <tr v-if="!leadsRaw.length">
                <td colspan="9" class="empty-state">No se encontraron leads empresa con los filtros actuales.</td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros avanzados" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="exec-label">Empresa (nombre o RUC)</label>
          <input v-model.trim="filtersDraft.company_q" type="text" class="exec-input-light w-100" placeholder="Empresa S.A.C. / 20..." />
        </div>
        <div class="col-12">
          <label class="exec-label">Nombre del contacto</label>
          <input v-model.trim="filtersDraft.q" type="text" class="exec-input-light w-100" placeholder="Nombre..." />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn-exec btn-exec-outline btn-exec-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary btn-exec-sm" @click="applyModalFilters">Aplicar</button>
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

// Badge helpers
function badgeForInterest(alias) {
  if (alias === 'we_lead_interest_high')   return 'pill-green'
  if (alias === 'we_lead_interest_medium') return 'pill-yellow'
  if (alias === 'we_lead_interest_low')    return 'pill-red'
  return 'pill-slate'
}
function badgeForFollow(alias) {
  if (alias?.includes('hot'))   return 'pill-green'
  if (alias?.includes('warm'))  return 'pill-yellow'
  if (alias?.includes('cold'))  return 'pill-red'
  return 'pill-slate'
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
.leads-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 28px;
  font-size: 13px;
}

/* ══ MASTHEAD ═══════════════════════════════════════════════════ */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle { font-size: 13.5px; color: var(--e-text-secondary); font-weight: 400; margin-top: 2px; }
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; }
.ep-btn-control {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  color: var(--e-text); background: #fff;
  border: 1px solid var(--e-border); border-radius: 8px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-btn-control:hover { border-color: var(--e-border-strong); background: var(--e-bg-subtle); }
.ep-btn-control i { font-size: 11px; }
.ep-btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; font-size: 13px; font-weight: 600;
  color: #fff; background: var(--we-navy, #002060);
  border: none; border-radius: 8px; cursor: pointer;
  transition: background .2s ease; font-family: inherit;
  letter-spacing: -0.01em;
}
.ep-btn-new:hover { background: var(--we-navy-dark, #001540); }
.ep-btn-new i { font-size: 11px; }

/* ══ BODY + BARRA DE FILTROS ═════════════════════════════════════ */
.ep-body { padding: 0; }
.ep-section { background: transparent; border: none; padding: 0; margin-bottom: 14px; }
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap; flex: 1 1 auto; }
.ep-quick-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex: 0 1 auto; }
.ep-quick-order { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.ep-quick-order-icon { font-size: 11px; color: var(--e-text-secondary); }
.ss-quick { width: 230px; }
.ss-quick :deep(.searchselect-control) { min-height: 32px; padding: 0.15rem 2.25rem 0.15rem 0.6rem; border-radius: 8px; }
.ss-quick :deep(.searchselect-input),
.ss-quick :deep(.ss-locked-label) { font-size: 12.5px; }

.ep-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 0 1 auto; }
.ep-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary);
  background: var(--e-bg-subtle);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.ep-tab i { font-size: 11px; opacity: 0.7; }
.ep-tab:hover { color: var(--e-text); background: #F5F5F5; }
.ep-tab.is-active {
  color: var(--e-accent);
  background: var(--e-accent-soft);
  border-color: rgba(16, 185, 129, 0.25);
  font-weight: 600;
}
.ep-tab.is-active i { opacity: 1; }
.ep-tab.is-highlight i { opacity: 1; }
.ep-tab.is-highlight::before {
  content: '';
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--e-accent);
  margin-right: 6px;
  vertical-align: middle;
}
.ep-filter-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #047857;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: var(--e-accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ep-filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.ep-filter-strip :deep(.active-filters .label) { display: none; }

/* ══ BOTONES ═════════════════════════════════════════════════════ */
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover { background: var(--slate-100, #f1f5f9); border-color: var(--slate-300, #cbd5e1); }

/* ══ TABLA ═══════════════════════════════════════════════════════ */
.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: visible; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.td-a { border-left: 1px solid transparent; }
.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.small { font-size: 11.5px; }
.pay-date-cell { color: #15803d; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-green  { background: #dcfce7; color: #15803d; }
.pill-yellow { background: #fef9c3; color: #854d0e; }
.pill-red    { background: #fee2e2; color: #b91c1c; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; }
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ══ FILTROS INLINE EN CABECERA ══════════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-multiselect { --ms-font-size: 11px; --ms-line-height: 1.3; --ms-min-height: 28px; --ms-py: 2px; --ms-px: 6px; --ms-tag-py: 1px; --ms-tag-px: 4px; --ms-tag-font-size: 9.5px; --ms-border-color: var(--border, #e2e8f0); --ms-border-color-active: var(--teal-500, #14b8a6); --ms-ring-color: rgba(20,184,166,.15); font-size: 11px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }
.hf-actions-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }

/* Dropdown de los últimos filtros abre a la izquierda */
.thead-filter .tf:nth-last-child(-n+3) :deep(.multiselect-dropdown) { left: auto !important; right: 0 !important; }

/* ══ INPUTS MODAL ════════════════════════════════════════════════ */
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

@media (max-width: 768px) {
  .leads-page { padding: 16px 12px; }
  .ep-masthead { flex-direction: column; align-items: flex-start; gap: 12px; }
  .ep-filter-bar-main { flex-direction: column; align-items: stretch; }
  .ss-quick { width: 100%; }
}

/* ══ DARK MODE ═══════════════════════════════════════════════════ */
/* El masthead navy (#0f172a) con texto blanco ya funciona en dark: no se toca. */
[data-coreui-theme="dark"] .leads-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16,185,129,0.16);
  background: #14140F;
}
[data-coreui-theme="dark"] .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .ep-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .ep-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .ep-btn-control { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-btn-new { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ep-btn-new:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .ep-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .ep-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-outline { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-exec-outline:hover:not(:disabled) { background: #24241E; border-color: #3A3A33; }
[data-coreui-theme="dark"] .btn-icon { border-color: #3A3A33; color: #A0A099; }
[data-coreui-theme="dark"] .btn-icon:hover { background: #24241E; border-color: #3A3A33; }
[data-coreui-theme="dark"] .table-shell { background: #1A1A14; border-color: #2A2A22; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
[data-coreui-theme="dark"] .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .tbody-row td { border-bottom-color: #24241E; color: #F4F4F0; }
[data-coreui-theme="dark"] .tbody-row:hover td { background: #1F1F1A; }
[data-coreui-theme="dark"] .text-muted { color: #8A8A80; }
[data-coreui-theme="dark"] .accent-text { color: #2DD4BF; }
[data-coreui-theme="dark"] .pay-date-cell { color: #34D399; }
[data-coreui-theme="dark"] .pill-slate  { background: #24241E; color: #F4F4F0; border-color: #3A3A33 !important; }
[data-coreui-theme="dark"] .pill-green  { background: rgba(16,185,129,.14); color: #34D399; }
[data-coreui-theme="dark"] .pill-yellow { background: rgba(245,158,11,.14); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red    { background: rgba(239,68,68,.14); color: #F87171; }
[data-coreui-theme="dark"] .pill-teal   { background: rgba(20,184,166,.14); color: #2DD4BF; }
[data-coreui-theme="dark"] .empty-state { color: #8A8A80; }
[data-coreui-theme="dark"] .skel-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
[data-coreui-theme="dark"] .thead-filter .tf { background: #1F1F1A; }
[data-coreui-theme="dark"] .hf-input { background: #24241E; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .hf-input::placeholder { color: #8A8A80; }
[data-coreui-theme="dark"] .hf-multiselect { --ms-border-color: #3A3A33; }
[data-coreui-theme="dark"] .hf-clear-btn { background: rgba(239,68,68,.14); border-color: rgba(239,68,68,.35); color: #F87171; }
[data-coreui-theme="dark"] .hf-clear-btn:hover { background: rgba(239,68,68,.24); border-color: #F87171; }
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input-light { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
</style>
