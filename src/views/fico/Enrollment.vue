<template>
  <div class="card fico-enrollments-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión de Inscripciones</span>
        <span class="sub">Finanzas / FICO</span>
      </div>
      <!--nuevo form-->
      
      <button class="btn btn-primary" @click="goNew">+ Nuevo</button>
    </div>

    <div class="card-body">
      <BaseFilterChips 
        :items="activeFilterChips"
        @remove="clearFilter"
        @clear-all="clearFilters"
      />

      <div class="pagination-bar">
        <BasePagination
          v-model="pagin"
          @open-filters="openFilterModal"
          @change="handlePaginationChange"
        />
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Alumno / Documento</th>
              <th>Programa / Edición</th>
              <th>Agente</th>
              <th class="ta-right">Monto Neto</th>
              <th class="ta-right">Pagado</th>
              <th class="ta-right">Saldo</th>
              <th class="ta-center">Estado FICO</th>
              <th class="ta-center">Semáforo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in enrollments" :key="e.enrollment_id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm" title="Ver Detalle / Pagos" @click="viewDetail(e)">
                  <i class="fa-solid fa-eye text-primary"></i>
                </button>
                <button class="btn btn-outline btn-sm ms-1" title="Gestionar Cuotas" @click="manageInstallments(e)">
                  <i class="fa-solid fa-file-invoice-dollar text-success"></i>
                </button>
              </td>
              <td>
                <div class="name">{{ e.student_full_name }}</div>
                <div class="muted small">{{ e.document_number }}</div>
              </td>
              <td>
                <div class="name">{{ e.program_name }}</div>
                <div class="badge badge-neutral small">{{ e.edition_code }}</div>
              </td>
              <td>
                <div class="small">{{ e.seller_agent_name }}</div>
                <div class="muted x-small">{{ formatDate(e.registration_date) }}</div>
              </td>
              <td class="ta-right font-mono">
                {{ e.currency_symbol }} {{ formatMoney(e.net_amount) }}
              </td>
              <td class="ta-right font-mono text-success">
                {{ e.currency_symbol }} {{ formatMoney(e.amount_paid) }}
              </td>
              <td class="ta-right font-mono" :class="e.balance_due > 0 ? 'text-danger fw-bold' : 'text-muted'">
                {{ e.currency_symbol }} {{ formatMoney(e.balance_due) }}
              </td>
              <td class="ta-center">
                <span class="badge badge-fico" :class="getFicoBadgeClass(e.fico_status_label)">
                  {{ e.fico_status_label || 'Pendiente' }}
                </span>
              </td>
              <td class="ta-center">
                <span class="dot-status" :class="getTagClass(e.financial_summary_tag)" :title="e.financial_summary_tag"></span>
                <span class="small-tag">{{ e.financial_summary_tag }}</span>
              </td>
            </tr>

            <tr v-if="!enrollments.length">
              <td colspan="9" class="empty-state">No se encontraron inscripciones con los criterios seleccionados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros Avanzados - Finanzas" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Búsqueda Global</label>
          <input v-model.trim="filters.q" type="text" class="form-control" placeholder="Nombre, Documento o Código de Edición..." @keyup.enter="applyFilters" />
        </div>

        <div class="col-md-6">
          <label class="form-label">Estado de Matrícula</label>
          <SearchSelect v-model="filters.cat_type_status" :items="filtroStatus" label-field="description" value-field="id" placeholder="Todos los estados..." />
        </div>

        <div class="col-md-6">
          <label class="form-label">Estado FICO</label>
          <SearchSelect v-model="filters.cat_fico_status" :items="filtroFico" label-field="description" value-field="id" placeholder="Todos los estados FICO..." />
        </div>

        <div class="col-md-6">
          <label class="form-label">Desde</label>
          <input v-model="filters.date_from" type="date" class="form-control" />
        </div>

        <div class="col-md-6">
          <label class="form-label">Hasta</label>
          <input v-model="filters.date_to" type="date" class="form-control" />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar Todo</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cancelar</button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>

  <BaseModal v-model="showDetailModal" :title="'Detalle Financiero: ' + selectedDetail.student_name" size="xl">
    <div v-if="loadingDetail" class="p-5 text-center">
      <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary"></i>
      <p class="mt-2">Cargando información...</p>
    </div>

    <div v-else class="px-3 py-2">
      <div class="row mb-4 bg-light p-3 rounded">
        <div class="col-md-4">
          <label class="x-small muted d-block">PROGRAMA</label>
          <span class="fw-bold text-primary">{{ selectedDetail.program_name }}</span>
          <div class="small">{{ selectedDetail.edition_code }}</div>
        </div>
        <div class="col-md-4">
          <label class="x-small muted d-block">DOCUMENTO</label>
          <span class="fw-bold">{{ selectedDetail.document_number }}</span>
        </div>
        <div class="col-md-4 text-end">
          <label class="x-small muted d-block">MONTO NETO PACTADO</label>
          <span class="h5 fw-bold">{{ selectedDetail.currency_symbol }} {{ formatMoney(selectedDetail.net_amount) }}</span>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'installments' }" @click="activeTab = 'installments'">
            <i class="fa-solid fa-calendar-days me-1"></i> Plan de Cuotas
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">
            <i class="fa-solid fa-receipt me-1"></i> Historial de Vouchers
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <div v-if="activeTab === 'installments'" class="table-responsive">
          <table class="table table-sm">
            <thead class="table-light">
              <tr>
                <th>N°</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in selectedDetail.installments" :key="i.installment_id">
                <td>{{ i.installment_number === 0 ? 'Inicial' : 'Cuota ' + i.installment_number }}</td>
                <td class="font-mono">{{ selectedDetail.currency_symbol }} {{ formatMoney(i.amount) }}</td>
                <td>{{ formatDate(i.due_date) }}</td>
                <td>
                  <span class="badge" :class="i.status_alias === 'we_installment_status_paid' ? 'badge-success' : 'badge-warning'">
                    {{ i.status_label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="activeTab === 'payments'" class="table-responsive">
          <table class="table table-sm">
            <thead class="table-light">
              <tr>
                <th>Fecha Pago</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Código Operación</th>
                <th class="ta-center">Voucher</th>
                <th>Estado Liq.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in selectedDetail.payment_history" :key="p.payment_id">
                <td>{{ formatDate(p.payment_date) }}</td>
                <td>{{ p.payment_method }}</td>
                <td class="font-mono fw-bold">{{ selectedDetail.currency_symbol }} {{ formatMoney(p.amount) }}</td>
                <td><code class="small">{{ p.transaction_code || '---' }}</code></td>
                <td class="ta-center">
                  <a v-if="p.evidence_url" :href="p.evidence_url" target="_blank" class="btn btn-outline btn-sm">
                    <i class="fa-solid fa-image text-success"></i> Ver
                  </a>
                  <span v-else class="muted">---</span>
                </td>
                <td>
                  <span class="badge" :class="p.settlement_alias === 'we_payment_settlement_conciliated' ? 'badge-success' : 'badge-warning'">
                    {{ p.settlement_status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="btn btn-outline btn-sm" @click="showDetailModal = false">Cerrar Detalle</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'
// --- Nuevos estados para el Modal de Detalle ---
const showDetailModal = ref(false)
const loadingDetail = ref(false)
const activeTab = ref('installments') // 'installments' o 'payments'
const selectedDetail = ref({
  installments: [],
  payment_history: []
})

// Función para abrir el detalle
async function viewDetail(enrollment) {
  showDetailModal.value = true
  loadingDetail.value = true
  activeTab.value = 'installments' // Resetear tab al abrir
  
  try {
    // Llamada al nuevo SP sp_fico_payment_detail_get
    const response = await ficoService.getPaymentDetail(enrollment.enrollment_id)
    selectedDetail.value = response || {}
  } catch (err) {
    console.error('Error cargando detalle:', err)
  } finally {
    loadingDetail.value = false
  }
}

// Función para el botón de gestionar cuotas (puedes redirigir o abrir otro modal)
function manageInstallments(enrollment) {
  console.log('Gestionar cuotas de:', enrollment.enrollment_id)
  // Aquí podrías abrir un editor de cuotas si el plan es Crédito
}

// Inyecciones
const ficoService = inject(ServiceKeys.Fico) // sp_fico_enrollment_list
const catalog = inject('catalog')

// Estado
const enrollments = ref([])
const showFilterModal = ref(false)
const pagin = ref({ size: 25, page: 1, total: 0 })

const filters = reactive({
  q: '',
  cat_type_status: null,
  cat_fico_status: null,
  date_from: null,
  date_to: null,
  seller_agent_id: null,
  validator_user_id: null
})

// Catálogos
const filtroStatus = ref(catalog.options('we_enrollment_status') || [])
const filtroFico = ref(catalog.options('we_fico_status') || [])
const activeFilterChips = ref([])

// Persistencia
const { saveState } = useTablePersistence('fico_enrollments_state_v1', filters, pagin)

// Funciones
async function fetchEnrollments() {
  try {
    const params = {
      ...filters,
      page: pagin.value.page,
      size: pagin.value.size
    }
    const { items, total } = await ficoService.enrollmentList(params)
    enrollments.value = items || []
    pagin.value.total = Number(total || 0)
    rebuildChips()
  } catch (err) {
    console.error(err)
    enrollments.value = []
  }
}

function handlePaginationChange() {
  saveState()
  fetchEnrollments()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  fetchEnrollments()
}

function clearFilters() {
  Object.assign(filters, { q: '', cat_type_status: null, cat_fico_status: null, date_from: null, date_to: null })
  pagin.value.page = 1
  saveState()
  fetchEnrollments()
}

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', text: `Búsqueda: ${filters.q}` })
  if (filters.cat_fico_status) {
    const it = filtroFico.value.find(i => i.id === filters.cat_fico_status)
    chips.push({ key: 'cat_fico_status', text: `FICO: ${it?.description}` })
  }
  if (filters.date_from) chips.push({ key: 'date_from', text: `Desde: ${filters.date_from}` })
  activeFilterChips.value = chips
}


function goNew() { 
    router.push({ name: 'enrollmentForm' }) 
}

// Helpers Visuales
const formatMoney = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
const formatDate = (val) => val ? new Date(val).toLocaleDateString('es-PE') : '—'

const getTagClass = (tag) => {
  if (tag === 'PAGADO') return 'bg-success'
  if (tag === 'PARCIAL') return 'bg-warning'
  return 'bg-danger'
}

const getFicoBadgeClass = (label) => {
  if (!label) return 'badge-neutral'
  if (label.includes('Aprobado')) return 'badge-success'
  if (label.includes('Observado')) return 'badge-danger'
  return 'badge-warning'
}

onMounted(() => {
  fetchEnrollments()
})
</script>


<style scoped>
/* Contenedor Principal */
.fico-enrollments-card { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 0.6rem; 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3b82f6; 
  margin-bottom: 2rem;
}

.card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 1.25rem; 
  border-bottom: 1px solid #f3f4f6; 
}

.title { display: flex; flex-direction: column; }
.title span { font-weight: 700; font-size: 1.1rem; color: #111827; }
.title .sub { font-weight: 500; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }

.card-body { padding: 1.25rem; }

/* Tabla Financiera */
.table-responsive { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #374151; }
.table thead th { 
  background: #f9fafb; 
  padding: 0.75rem; 
  text-align: left; 
  font-weight: 600; 
  color: #4b5563; 
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
.table td { padding: 0.85rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.table-hover tbody tr:hover { background-color: #f8fafc; }

/* Tipografía y Alineación */
.font-mono { font-size: 0.9rem; letter-spacing: -0.02em; }
.ta-right { text-align: right; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.fw-bold { font-weight: 700; }

/* Textos y Etiquetas */
.name { font-weight: 600; color: #1e293b; line-height: 1.2; }
.muted { color: #6b7280; }
.small { font-size: 0.75rem; }
.x-small { font-size: 0.65rem; }
.text-success { color: #10b981; }
.text-danger { color: #ef4444; }
.text-primary { color: #3b82f6; }

/* Semáforo de Deuda */
.dot-status {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  border: 2px solid rgba(255,255,255,0.8);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
}
.bg-success { background-color: #10b981; } /* Pagado */
.bg-warning { background-color: #f59e0b; } /* Parcial */
.bg-danger  { background-color: #ef4444; } /* Deuda */

.small-tag { font-size: 0.65rem; font-weight: 800; color: #4b5563; }

/* Badges */
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; }
.badge-neutral { background: #f1f5f9; color: #475569; }
.badge-fico { border: 1px solid currentColor; }
.badge-success { background: #ecfdf5; color: #065f46; }
.badge-warning { background: #fffbeb; color: #92400e; }
.badge-danger { background: #fef2f2; color: #991b1b; }

/* Botones */
.btn { 
  border: 1px solid #d1d5db; 
  padding: 0.4rem 0.6rem; 
  border-radius: 0.4rem; 
  cursor: pointer; 
  transition: all 0.2s; 
  background: #fff;
}
.btn-sm { padding: 0.25rem 0.4rem; font-size: 0.75rem; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.ms-1 { margin-left: 0.25rem; }

.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
/* Estilos para Tabs */
.nav-tabs { border-bottom: 2px solid #e5e7eb; display: flex; gap: 1rem; list-style: none; padding: 0; }
.nav-link { 
  border: none; 
  background: none; 
  padding: 0.5rem 1rem; 
  color: #6b7280; 
  font-weight: 600; 
  cursor: pointer; 
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.nav-link:hover { color: #3b82f6; }
.nav-link.active { color: #3b82f6; border-bottom-color: #3b82f6; }

.bg-light { background-color: #f8fafc !important; }
.rounded { border-radius: 0.5rem; }
.h5 { font-size: 1.25rem; }
.font-mono { font-family: 'monospace'; }

/* Estilos de tabla dentro del modal */
.table-sm td, .table-sm th { padding: 0.5rem; font-size: 0.8rem; }
code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.3rem; color: #475569; }
</style>