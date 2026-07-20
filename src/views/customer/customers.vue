<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">General</span>
            <h1 class="brand-title">Clientes</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-ghost" @click="goNew">
            <i class="fa-solid fa-plus"></i> Nuevo Cliente
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div class="toolbar-chips mb-2" v-if="activeFilterChips.length">
        <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearFilters" />
      </div>

      <div class="exec-toolbar">
        <div class="toolbar-pagination">
          <BasePagination v-model="pagin" @open-filters="openFilterModal" @change="fetchCustomers" />
        </div>
        <div class="toolbar-actions">
          <button class="btn-exec btn-exec-outline" @click="openFilterModal">
            <i class="fa-solid fa-filter"></i> Filtros
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:80px">Acciones</th>
                <th class="ts ts-c">Estado</th>
                <th class="ts ts-c text-center">Tipo</th>
                <th class="ts ts-c">Cliente (Razón Social / Nombre)</th>
                <th class="ts ts-c">Documento</th>
                <th class="ts ts-c">Celular</th>
                <th class="ts ts-c">Correo</th>
                <th class="ts ts-c">Segmento</th>
                <th class="ts ts-c">Estado Cliente</th>
                <th class="ts ts-c">Registro</th>
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
                  <SearchSelect
                    v-model="filters.active"
                    :items="filtroEstado"
                    label-field="description"
                    value-field="value"
                    placeholder="Todos..."
                    :nullable="true"
                    class="hf-searchselect"
                    @change="applyFilters"
                  />
                </th>
                <th class="tf">
                  <SearchSelect
                    v-model="filters.cat_client_type"
                    :items="filtroClientType"
                    label-field="description"
                    value-field="id"
                    placeholder="Todos..."
                    :nullable="true"
                    class="hf-searchselect"
                    @change="applyFilters"
                  />
                </th>
                <th class="tf">
                  <input v-model="filters.q" type="text" class="hf-input" placeholder="Nombre, RUC, DNI..." @input="debouncedFilter" @keyup.enter="applyFilters" />
                </th>
                <th class="tf"></th>
                <th class="tf">
                  <input v-model="filters.phone_q" type="text" class="hf-input" placeholder="Celular..." @input="debouncedFilter" @keyup.enter="applyFilters" />
                </th>
                <th class="tf">
                  <input v-model="filters.email_q" type="text" class="hf-input" placeholder="Correo..." @input="debouncedFilter" @keyup.enter="applyFilters" />
                </th>
                <th class="tf">
                  <SearchSelect
                    v-model="filters.cat_customer_segment"
                    :items="filtroSegmentos"
                    label-field="description"
                    value-field="id"
                    placeholder="Todos..."
                    :nullable="true"
                    class="hf-searchselect"
                    @change="applyFilters"
                  />
                </th>
                <th class="tf">
                  <SearchSelect
                    v-model="filters.cat_customer_status"
                    :items="filtroEstadosCliente"
                    label-field="description"
                    value-field="id"
                    placeholder="Todos..."
                    :nullable="true"
                    class="hf-searchselect"
                    @change="applyFilters"
                  />
                </th>
                <th class="tf"></th>
              </tr>
            </thead>
            <tbody>
              <!-- skeleton de carga -->
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n" class="skel-row">
                  <td v-for="col in 10" :key="col"><span class="skel"></span></td>
                </tr>
              </template>
              <template v-else>
              <tr v-for="c in customers" :key="c.customer_id" class="tbody-row" @dblclick="editCustomer(c)">
                <td class="td-a text-center">
                  <button class="btn-icon" @click="editCustomer(c)" title="Editar">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a">
                  <span class="pill" :class="c.active === 'Y' ? 'pill-green' : 'pill-red'">
                    {{ c.active === 'Y' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="td-a text-center">
                  <i
                    class="fa-solid"
                    :class="c.company_id ? 'fa-building text-primary' : 'fa-user text-muted'"
                    :title="c.company_id ? 'Empresa' : 'Persona'"
                  ></i>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600">{{ c.display_name || '—' }}</div>
                </td>
                <td class="td-a small text-mono">
                  {{ c.document_number || '—' }}
                </td>
                <td class="td-a small nowrap">
                  <span v-if="c.phone">
                    <span class="text-muted me-1">{{ c.phone_country_code || '' }}</span>{{ c.phone }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="td-a small nowrap text-muted">{{ c.email || '—' }}</td>
                <td class="td-a">
                  <span v-if="c.cat_customer_segment_label" class="pill pill-slate border">{{ c.cat_customer_segment_label }}</span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="td-a small">{{ c.cat_customer_status_label || '—' }}</td>
                <td class="td-a small nowrap text-muted">{{ formatDate(c.registration_date) }}</td>
              </tr>
              <tr v-if="!customers.length">
                <td colspan="10" class="empty-state">Sin resultados con los filtros actuales.</td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros de Clientes" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="exec-label">Estado</label>
          <SearchSelect v-model="filters.active" :items="filtroEstado" label-field="description" value-field="value" placeholder="Todos..." :nullable="true" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Tipo de Cliente</label>
          <SearchSelect v-model="filters.cat_client_type" :items="filtroClientType" label-field="description" value-field="id" placeholder="Todos..." :nullable="true" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Segmento</label>
          <SearchSelect v-model="filters.cat_customer_segment" :items="filtroSegmentos" label-field="description" value-field="id" placeholder="Segmento..." :nullable="true" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Estado Cliente</label>
          <SearchSelect v-model="filters.cat_customer_status" :items="filtroEstadosCliente" label-field="description" value-field="id" placeholder="Estatus..." :nullable="true" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Celular</label>
          <input v-model.trim="filters.phone_q" type="text" class="exec-input-light w-100" placeholder="Número de celular..." />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Correo</label>
          <input v-model.trim="filters.email_q" type="text" class="exec-input-light w-100" placeholder="correo@..." />
        </div>
        <div class="col-12">
          <label class="exec-label">Búsqueda general</label>
          <input v-model.trim="filters.q" type="text" class="exec-input-light w-100" placeholder="Nombre, Razón Social, RUC, DNI..." />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn-exec btn-exec-outline btn-exec-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary btn-exec-sm" @click="applyFilters">Aplicar filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import BasePagination from '@/components/BasePagination.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const customerService = inject(ServiceKeys.Customer)
const catalog = inject('catalog')

const showFilterModal = ref(false)
function openFilterModal() { showFilterModal.value = true }

const customers = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const isLoading = ref(false)

const filters = reactive({
  active: null,
  cat_client_type: null,
  cat_customer_segment: null,
  cat_customer_status: null,
  q: '',
  phone_q: '',
  email_q: '',
})

const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: 'Y', description: 'Activo' },
  { value: 'N', description: 'Inactivo' }
]
const filtroClientType = ref(catalog.options('we_client').filter(c => c.alias !== 'we_client') || [])
const filtroSegmentos = ref(catalog.options('customer_segment') || [])
const filtroEstadosCliente = ref(catalog.options('customer_status') || [])

const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.active !== null) chips.push({ key: 'active', label: `Estado: ${filters.active === 'Y' ? 'Activo' : 'Inactivo'}` })
  if (filters.cat_client_type) {
    const it = filtroClientType.value.find(i => i.id === filters.cat_client_type)
    chips.push({ key: 'cat_client_type', label: `Tipo: ${it?.description || filters.cat_client_type}` })
  }
  if (filters.cat_customer_segment) {
    const it = filtroSegmentos.value.find(i => i.id === filters.cat_customer_segment)
    chips.push({ key: 'cat_customer_segment', label: `Segmento: ${it?.description || filters.cat_customer_segment}` })
  }
  if (filters.cat_customer_status) {
    const it = filtroEstadosCliente.value.find(i => i.id === filters.cat_customer_status)
    chips.push({ key: 'cat_customer_status', label: `Estatus: ${it?.description || filters.cat_customer_status}` })
  }
  if (filters.q) chips.push({ key: 'q', label: `Búsqueda: ${filters.q}` })
  if (filters.phone_q) chips.push({ key: 'phone_q', label: `Celular: ${filters.phone_q}` })
  if (filters.email_q) chips.push({ key: 'email_q', label: `Correo: ${filters.email_q}` })
  activeFilterChips.value = chips
}

function clearFilter(key) {
  if (['cat_client_type', 'cat_customer_segment', 'cat_customer_status'].includes(key)) filters[key] = null
  else filters[key] = ''
  if (key === 'active') filters.active = null
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, { active: null, cat_client_type: null, cat_customer_segment: null, cat_customer_status: null, q: '', phone_q: '', email_q: '' })
  pagin.value.page = 1
  rebuildChips()
  fetchCustomers()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchCustomers()
}

let debounceTimer = null
function debouncedFilter() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => applyFilters(), 400)
}

function formatDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  } catch { return '—' }
}

function goNew() { router.push({ name: 'CustomerNew' }) }
function editCustomer(c) { router.push({ name: 'CustomerEdit', params: { id: c.customer_id } }) }

async function fetchCustomers() {
  isLoading.value = true
  try {
    const { items, total, page, size } = await customerService.customerList({
      active: filters.active,
      cat_client_type: filters.cat_client_type,
      cat_customer_segment: filters.cat_customer_segment,
      cat_customer_status: filters.cat_customer_status,
      q: filters.q || null,
      phone_q: filters.phone_q || null,
      email_q: filters.email_q || null,
      page: pagin.value.page,
      size: pagin.value.size
    })
    customers.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page  = Number(page  || pagin.value.page)
    pagin.value.size  = Number(size  || pagin.value.size)
  } catch (err) {
    console.error('Error cargando clientes:', err)
    customers.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { rebuildChips(); fetchCustomers() })
</script>

<style scoped>
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--text-primary, #0f172a);
}

/* ══ MASTHEAD ═══════════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
  position: sticky;
  top: 0;
  z-index: 100;
}
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

/* ══ BODY ════════════════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }

/* ══ BOTONES ═════════════════════════════════════════════════════ */
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; }
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
.fw-600 { font-weight: 600; }
.text-muted { color: var(--text-muted, #94a3b8); }
.small { font-size: 11.5px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-green  { background: #dcfce7; color: #15803d; }
.pill-red    { background: #fee2e2; color: #b91c1c; }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); }

/* ══ FILTROS INLINE EN CABECERA ══════════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-searchselect { --ss-height: 28px; --ss-font-size: 11px; font-size: 11px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }
.hf-actions-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }

/* ══ MODAL ═══════════════════════════════════════════════════════ */
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .exec-body { padding: 16px 12px; }
}
</style>
