<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Convenios Corporativos
        <span class="sub">Listado</span>
      </div>

      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nuevo
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="activeFilterChips.length" class="active-filters">
        <span class="label">Filtros:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="chip"
          @click="clearFilter(chip.key)"
        >
          {{ chip.text }} <span class="x">×</span>
        </button>
        <button class="chip clear-all" @click="clearFilters">Limpiar todo</button>
      </div>

      <div class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Estado</th>
              <th>Empresa Principal</th>
              <th>Intermediario</th>
              <th>Dscto. Vivo</th>
              <th>Dscto. Online</th>
              <th>Vigencia (Inicio - Fin)</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in agreements" :key="item.agreement_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editAgreement(item)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td>
                <span
                  class="badge"
                  :class="item.active === 'Y' ? 'badge-success' : 'badge-danger'"
                >
                  {{ item.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td class="minW">
                <div class="name">
                  {{ item.company_name }}
                </div>
                <small class="text-muted" v-if="item.company_commercial_name">
                   ({{ item.company_commercial_name }})
                </small>
              </td>

              <td class="minW">
                <div v-if="item.intermediary_name">
                   <span class="badge badge-neutral">
                     <i class="fa-solid fa-handshake me-1"></i> {{ item.intermediary_name }}
                   </span>
                </div>
                <span v-else class="text-muted">—</span>
              </td>

              <td>
                 <span class="fw-bold text-primary">{{ item.discount_live_pct }}%</span>
              </td>

              <td>
                 <span class="fw-bold text-info">{{ item.discount_online_pct }}%</span>
              </td>

              <td class="minW">
                <div class="mono small">
                   <div><i class="fa-solid fa-play text-success me-1"></i>{{ formatDate(item.start_date) }}</div>
                   <div v-if="item.end_date">
                     <i class="fa-solid fa-stop text-danger me-1"></i>{{ formatDate(item.end_date) }}
                   </div>
                   <div v-else class="text-muted">
                     <i class="fa-solid fa-infinity me-1"></i>Indefinido
                   </div>
                </div>
              </td>

              <td class="minW">
                <div class="small text-muted">{{ formatDate(item.registration_date) }}</div>
              </td>
            </tr>

            <tr v-if="!agreements.length">
              <td colspan="8" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <div class="page-size">
          <label>Tamaño</label>
          <select v-model.number="pagin.size" @change="resetToFirstPage">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="pager">
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === 1"
            @click="prevPage"
          >
            ‹ Anterior
          </button>
          <span class="muted">Página {{ pagin.page }} de {{ totalPages }}</span>
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === totalPages"
            @click="nextPage"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de convenios" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Estado</label>
          <SearchSelect
            v-model="filters.active"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="ESTADO..."
          />
        </div>

        <div class="col-12">
          <label class="form-label">Búsqueda (Empresa)</label>
          <div class="input-group">
            <span class="input-group-text">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Razón social o comercial..."
              @keyup.enter="applyFilters"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">
            Cerrar
          </button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">
            Aplicar filtros
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
// Inyectamos el servicio creado anteriormente
const agreementService = inject(ServiceKeys.CorporateAgreement) // Asegúrate de agregarlo a tu keys
// const customerService = inject(ServiceKeys.Customer) // Por si necesitaras catalogos externos

// === estado UI
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === tabla + paginación
const agreements = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() =>
  Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size))
)

function resetToFirstPage () {
  pagin.value.page = 1
  fetchAgreements()
}
function nextPage () {
  if (pagin.value.page < totalPages.value) {
    pagin.value.page++
    fetchAgreements()
  }
}
function prevPage () {
  if (pagin.value.page > 1) {
    pagin.value.page--
    fetchAgreements()
  }
}

// === filtros
const filters = reactive({
  active: null, 
  q: ''
})

const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]

// chips
const activeFilterChips = ref([])

function rebuildChips () {
  const chips = []
  if (filters.active !== null) {
    chips.push({
      key: 'active',
      text: `Estado: ${filters.active ? 'Activo' : 'Inactivo'}`
    })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `Buscar: ${filters.q}` })
  }
  activeFilterChips.value = chips
}

function clearFilter (key) {
  if (key === 'active') filters.active = null
  if (key === 'q') filters.q = ''
  applyFilters()
}

function clearFilters () {
  filters.active = null
  filters.q = ''
  pagin.value.page = 1
  rebuildChips()
  fetchAgreements()
}

function applyFilters () {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchAgreements()
}

// === helpers
function formatDate (value) {
  if (!value) return '—'
  // Ajuste simple para fechas YYYY-MM-DD
  const datePart = String(value).split('T')[0]
  const [y, m, d] = datePart.split('-')
  return `${d}/${m}/${y}`
}

// === acciones
function goNew () {
  router.push({ name: 'CorporateAgreementNew' }) 
}

function editAgreement (item) {
  router.push({ name: 'CorporateAgreementEdit', params: { id: item.agreement_id } })
}

// === Backend Call
async function fetchAgreements () {
  try {
    const payload = {
      active: filters.active,
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size
    }
    
    // Llamada al servicio 'agreementList'
    const { items, total, page, size } = await agreementService.agreementList(payload)

    agreements.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)

  } catch (err) {
    console.error('Error cargando convenios:', err)
    agreements.value = []
    pagin.value.total = 0
  }
}

onMounted(() => {
  rebuildChips()
  fetchAgreements()
})
</script>

<style scoped>
/* (Mismos estilos que tu componente InstructorList para mantener consistencia) */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.title { font-weight: 600; font-size: 1rem; color: #111827; display: flex; align-items: baseline; gap: .5rem; }
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.actions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.card-body { padding: 1rem 1.25rem; }
.active-filters { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; align-items: center; }
.active-filters .label { font-size: .8rem; color: #6b7280; margin-right: .25rem; }
.chip { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; border-radius: 999px; padding: .2rem .6rem; font-size: .75rem; cursor: pointer; }
.chip .x { margin-left: .35rem; color: #6b7280; }
.chip.clear-all { background: #fff; }
.table-responsive { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th { position: sticky; top: 0; background-color: #f9fafb; text-align: left; font-weight: 600; white-space: nowrap; padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; cursor: default; }
.table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; } /* Changed vertical-align to middle for better look */
.table.dense td, .table.dense thead th { padding: .35rem .5rem; }
.nowrap { white-space: nowrap; }
.ta-right { text-align: right; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.empty-state { text-align: center; padding: 1rem; color: #6b7280; font-style: italic; }
.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }
.badge { display: inline-block; padding: .2rem .45rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.btn { display: inline-block; font-size: .8rem; line-height: 1rem; font-weight: 500; border-radius: .375rem; padding: .5rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; line-height: .875rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap; }
.page-size { display: inline-flex; align-items: center; gap: .4rem; }
.page-size select { border: 1px solid #d1d5db; border-radius: .375rem; padding: .25rem .4rem; background: #fff; }
.pager { display: inline-flex; align-items: center; gap: .5rem; }
.minW { min-width: 150px; }
.input-group-text { background: #f9fafb; border-color: #e5e7eb; }
.form-control { border-color: #e5e7eb; }
</style>