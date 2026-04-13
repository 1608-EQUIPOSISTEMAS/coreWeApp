<template>
  <div class="exec-shell list-shell">
    <header class="exec-masthead" :class="{ 'masthead--compact': toolbarCollapsed }">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule" :class="{ 'brand-rule--sm': toolbarCollapsed }"></div>
          <div class="brand-text">
            <span class="brand-eyebrow" v-show="!toolbarCollapsed">Atención Automatizada</span>
            <h1 class="brand-title">
              <span v-if="!toolbarCollapsed">Monitor del Bot Académico</span>
              <span v-else class="brand-title--inline">
                <span class="brand-eyebrow--inline">BOT</span> Tickets
              </span>
            </h1>
          </div>
        </div>

        <button
          class="focus-toggle-btn"
          :class="{ 'focus-toggle-btn--active': toolbarCollapsed }"
          @click="toolbarCollapsed = !toolbarCollapsed"
          :title="toolbarCollapsed ? 'Expandir barra' : 'Modo enfocado'"
        >
          <i class="fa-solid" :class="toolbarCollapsed ? 'fa-maximize' : 'fa-minimize'"></i>
          <span v-show="!toolbarCollapsed">Enfocar</span>
        </button>
      </div>
    </header>

    <main class="exec-body">
      <div class="row g-3 mb-4" v-if="!toolbarCollapsed && kpis">
        <div class="col-md-3">
          <div class="finance-card d-flex align-items-center gap-3">
            <div class="lead-avatar" style="background:#fffbeb; color:#d97706; border-color:#fde68a;">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <div class="small text-muted fw-600">Pendientes / En Proceso</div>
              <div class="fw-700 text-dark" style="font-size: 18px;">
                {{ kpis.tickets_pendientes + kpis.tickets_en_proceso }} <span class="x-small text-muted fw-500">/ {{ kpis.total_tickets }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="finance-card d-flex align-items-center gap-3">
            <div class="lead-avatar" style="background:#f0fdf4; color:#15803d; border-color:#bbf7d0;">
              <i class="fa-solid fa-check-double"></i>
            </div>
            <div>
              <div class="small text-muted fw-600">Solucionados</div>
              <div class="fw-700 text-dark" style="font-size: 18px;">{{ kpis.tickets_solucionados }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="finance-card d-flex align-items-center gap-3">
            <div class="lead-avatar" style="background:#f0f9ff; color:#0369a1; border-color:#bae6fd;">
              <i class="fa-solid fa-star"></i>
            </div>
            <div>
              <div class="small text-muted fw-600">CSAT Promedio</div>
              <div class="fw-700 text-dark" style="font-size: 18px;">
                {{ kpis.csat_avg_score || '0.0' }} <span class="x-small fw-500 text-warning"><i class="fa-solid fa-star"></i></span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="finance-card d-flex align-items-center justify-content-between">
            <div>
              <div class="small text-muted fw-600">Filtro Rango Fechas</div>
              <BaseDatePicker v-model="filters.date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="hf-input mt-1" style="height:28px;" placeholder="Desde → Hasta" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr)" />
            </div>
          </div>
        </div>
      </div>

      <div class="exec-toolbar" v-show="!toolbarCollapsed">
        <div class="toolbar-pagination">
          <BasePagination
            v-model="pagin"
            @change="handlePaginationChange"
          />
        </div>
        <div class="toolbar-actions">
          <button class="btn-exec btn-exec-outline" @click="clearFilters" title="Limpiar Filtros">
            <i class="fa-solid fa-eraser"></i> Limpiar
          </button>
          <button class="btn-exec btn-exec-primary" @click="fetchData">
            <i class="fa-solid fa-rotate-right"></i> Actualizar
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width: 60px;">Acciones</th>
                <th class="ts ts-c" style="width: 110px;">Ticket #</th>
                <th class="ts ts-c" style="width: 140px;">Estado</th>
                <th class="ts ts-c" style="width: 160px;">Tipo de Solicitud</th>
                <th class="ts ts-c">Alumno / Contacto</th>
                <th class="ts ts-c">Programa</th>
                <th class="ts ts-c" style="width: 150px;">Fecha Registro</th>
              </tr>
              <tr class="thead-filter">
                <th class="tf tf-actions-cell">
                  <button v-if="filters.q || filters.status || filters.tipo" class="hf-clear-btn" @click="clearFilters" title="Limpiar filtros">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </th>
                <th class="tf">
                  <input v-model="filters.q" type="text" class="hf-input text-mono fw-600" placeholder="Buscar..." @input="debouncedInlineFilter" @keyup.enter="triggerInlineFilter" />
                </th>
                <th class="tf">
                  <select v-model="filters.status" class="hf-input" @change="triggerInlineFilter">
                    <option :value="null">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="SOLUCIONADO">Solucionado</option>
                  </select>
                </th>
                <th class="tf">
                  <select v-model="filters.tipo" class="hf-input" @change="triggerInlineFilter">
                    <option :value="null">Todos</option>
                    <option value="CERTIFICADO_PENDIENTE">Certificado Pendiente</option>
                    <option value="SOLICITUD_FLEX">Flexibilidad Académica</option>
                    <option value="SOPORTE_TECNICO">Soporte Técnico</option>
                  </select>
                </th>
                <th class="tf">
                  <input v-model="filters.q" type="text" class="hf-input" placeholder="Nombre, correo, tel..." @input="debouncedInlineFilter" @keyup.enter="triggerInlineFilter" disabled title="Usa la búsqueda del ticket" />
                </th>
                <th class="tf"></th> <th class="tf"></th> </tr>
            </thead>

            <tbody>
              <tr
                v-for="t in ticketsRaw"
                :key="t.id"
                class="tbody-row"
                :class="rowClassForStatus(t.status)"
                @dblclick="openTicketModal(t.id)"
              >
                <td class="td-a text-center nowrap"> 
                  <button class="btn-icon" @click.stop="openTicketModal(t.id)" title="Gestionar Ticket">
                    <i class="fa-solid fa-clipboard-check" :class="t.status === 'SOLUCIONADO' ? 'text-success' : 'text-primary'"></i>
                  </button>
                </td>
                <td class="td-a fw-700 text-mono accent-text">{{ t.ticket_number }}</td>
                <td class="td-a">
                  <span class="pill border" :class="badgeForStatus(t.status)">
                    <i class="fa-solid me-1" :class="iconForStatus(t.status)"></i> {{ t.status }}
                  </span>
                </td>
                <td class="td-a fw-600 text-dark" style="font-size: 11.5px;">{{ t.tipo.replace(/_/g, ' ') }}</td>
                <td class="td-a">
                  <div class="d-flex flex-column">
                    <span class="fw-700 text-dark">{{ t.student_name || 'Desconocido' }}</span>
                    <span class="small text-muted"><i class="fa-brands fa-whatsapp text-success me-1"></i>{{ t.phone || '—' }}</span>
                  </div>
                </td>
                <td class="td-a small text-muted">{{ t.program_name || '—' }}</td>
                <td class="td-a small">
                  <div class="fw-600 text-dark">{{ t.created_at_fmt }}</div>
                </td>
              </tr>
              <tr v-if="!ticketsRaw.length && !isLoading">
                <td colspan="7" class="empty-state">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <p>No se encontraron tickets con los filtros actuales.</p>
                </td>
              </tr>
              <tr v-if="isLoading">
                <td colspan="7" class="text-center py-5">
                  <div class="loader-ring mx-auto"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <BaseModal v-model="showTicketModal" :title="`Gestión de Ticket: ${selectedTicket?.ticket_number || ''}`" size="lg">
      <div v-if="isLoadingModal" class="exec-loader py-5">
        <div class="loader-ring"></div>
        <p class="text-muted small mt-2 fw-600">Cargando detalles...</p>
      </div>
      <div v-else-if="selectedTicket" class="px-4 py-3">
        <div class="enrollment-header mb-4">
          <div>
            <h6 class="enrollment-title">{{ selectedTicket.student_name }}</h6>
            <div class="enrollment-sub">
              <span><i class="fa-solid fa-envelope me-1"></i> {{ selectedTicket.email }}</span>
              <span class="mx-2 text-slate-300">|</span>
              <span><i class="fa-solid fa-phone me-1"></i> {{ selectedTicket.phone }}</span>
            </div>
          </div>
          <span v-if="selectedTicket.membership_tier_name" class="pill border" :class="selectedTicket.membership_active ? 'pill-amber' : 'pill-slate'">
            <i class="fa-solid fa-crown me-1"></i> {{ selectedTicket.membership_tier_name }}
          </span>
        </div>

        <div class="row g-4">
          <div class="col-md-6 border-end pe-4">
            <h6 class="fieldset-title">Detalles de la Solicitud</h6>
            <div class="info-block mb-3">
              <label class="exec-label">Tipo de Consulta</label>
              <span class="info-value">{{ selectedTicket.tipo.replace(/_/g, ' ') }}</span>
            </div>
            <div class="info-block mb-3">
              <label class="exec-label">Programa Vinculado</label>
              <span class="info-value">{{ selectedTicket.program_name || '—' }}</span>
            </div>
            <div class="info-block mb-3">
              <label class="exec-label">Fecha de Solicitud</label>
              <span class="info-value text-muted">{{ selectedTicket.created_at_fmt }}</span>
            </div>

            <div v-if="selectedTicket.csat_info" class="exec-alert alert-info mt-4" style="border-left-color: #f59e0b; background:#fffbeb; color:#92400e;">
              <div>
                <strong>Calificación del Alumno:</strong><br>
                <div class="text-warning mt-1" style="font-size: 16px;">
                  <i v-for="n in 5" :key="n" class="fa-star" :class="n <= selectedTicket.csat_info.rating ? 'fa-solid' : 'fa-regular opacity-50'"></i>
                </div>
                <span class="x-small text-muted mt-1 d-block">Recibido: {{ selectedTicket.csat_info.created_at }}</span>
              </div>
            </div>
          </div>

          <div class="col-md-6 ps-3">
            <h6 class="fieldset-title">Resolución</h6>
            
            <label class="exec-label">Estado Actual</label>
            <select v-model="formTicket.status" class="exec-select-light w-100 mb-3" :class="{'border-success': formTicket.status === 'SOLUCIONADO'}">
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En Proceso (Revisando)</option>
              <option value="SOLUCIONADO">Solucionado (Completado)</option>
            </select>

            <label class="exec-label">Notas Internas (Solo Asesores)</label>
            <textarea v-model="formTicket.notes" class="exec-textarea w-100" rows="4" placeholder="Registra las acciones tomadas o enlaces enviados..."></textarea>

            <div v-if="selectedTicket.resolved_at_fmt" class="mt-3 text-muted x-small">
              <i class="fa-solid fa-check-double text-success me-1"></i> Marcado como solucionado el {{ selectedTicket.resolved_at_fmt }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="d-flex justify-content-between w-100 align-items-center">
          <a v-if="selectedTicket?.conversation_id" :href="`https://tu-chatwoot.com/app/accounts/1/conversations/${selectedTicket.conversation_id}`" target="_blank" class="btn-exec btn-exec-outline text-primary">
            <i class="fa-solid fa-up-right-from-square me-1"></i> Abrir en Chatwoot
          </a>
          <span v-else></span>
          
          <div class="d-flex gap-2">
            <button class="btn-exec btn-exec-outline" @click="showTicketModal = false">Cancelar</button>
            <button class="btn-exec btn-exec-primary" @click="saveTicket" :disabled="isSaving">
              <i class="fa-solid fa-save me-1"></i> {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services' // O ajusta según tu inyección de servicios

const toast = useToast()
const botService = inject(ServiceKeys.Bot) // Asegúrate de haber inyectado el nuevo botService

// === ESTADOS ===
const toolbarCollapsed = ref(false)
const ticketsRaw = ref([])
const kpis = ref(null)
const isLoading = ref(false)
const pagin = ref({ size: 25, page: 1, total: 0 })

const filters = reactive({
  q: '',
  status: null,
  tipo: null,
  from_date: null,
  to_date: null,
  date_range_string: null
})

// === MODAL ESTADOS ===
const showTicketModal = ref(false)
const isLoadingModal = ref(false)
const isSaving = ref(false)
const selectedTicket = ref(null)
const formTicket = reactive({ status: '', notes: '' })

// === FETCH DATA ===
async function fetchData() {
  isLoading.value = true
  try {
    // 1. Traer KPIs
    const metricResp = await botService.botDashboardMetricsGet({
      from_date: filters.from_date,
      to_date: filters.to_date
    })
    kpis.value = metricResp.data || null

    // 2. Traer Tabla
    const tableResp = await botService.botTicketList({
      q: filters.q || null,
      status: filters.status || null,
      tipo: filters.tipo || null,
      from_date: filters.from_date || null,
      to_date: filters.to_date || null,
      page: pagin.value.page,
      size: pagin.value.size
    })
    ticketsRaw.value = tableResp.items || []
    pagin.value.total = tableResp.total || 0
  } catch (error) {
    console.error(error)
    toast.error('Error al cargar la data del Bot')
  } finally {
    isLoading.value = false
  }
}

// === GESTIÓN DE TICKET ===
async function openTicketModal(id) {
  showTicketModal.value = true
  isLoadingModal.value = true
  selectedTicket.value = null
  try {
    const { data } = await botService.botTicketGet({ id })
    selectedTicket.value = data
    formTicket.status = data.status
    formTicket.notes = data.notes || ''
  } catch (error) {
    toast.error('No se pudo cargar el ticket')
    showTicketModal.value = false
  } finally {
    isLoadingModal.value = false
  }
}

async function saveTicket() {
  isSaving.value = true
  try {
    await botService.botTicketUpdate({
      id: selectedTicket.value.id,
      status: formTicket.status,
      notes: formTicket.notes
    })
    toast.success('Ticket actualizado correctamente')
    showTicketModal.value = false
    fetchData() // Recargar para actualizar tabla y KPIs
  } catch (error) {
    toast.error('Error al guardar los cambios')
  } finally {
    isSaving.value = false
  }
}

// === FILTROS EN LÍNEA ===
let inlineFilterTimer = null
function triggerInlineFilter() {
  pagin.value.page = 1
  fetchData()
}
function debouncedInlineFilter() {
  clearTimeout(inlineFilterTimer)
  inlineFilterTimer = setTimeout(() => triggerInlineFilter(), 400)
}

function handleDateFilterChange(dateStr) {
  if (dateStr && dateStr.includes(' a ')) {
    const [start, end] = dateStr.split(' a ')
    filters.from_date = start
    filters.to_date = end
  } else if (dateStr) {
    filters.from_date = dateStr
    filters.to_date = dateStr
  } else {
    filters.from_date = null
    filters.to_date = null
  }
  triggerInlineFilter()
}

function clearFilters() {
  filters.q = ''
  filters.status = null
  filters.tipo = null
  filters.from_date = null
  filters.to_date = null
  filters.date_range_string = null
  pagin.value.page = 1
  fetchData()
}

function handlePaginationChange() {
  fetchData()
}

// === HELPERS DE DISEÑO ===
function badgeForStatus(status) {
  const map = {
    'PENDIENTE': 'pill-amber',
    'EN_PROCESO': 'pill-slate', // O podrías usar 'pill-teal'
    'SOLUCIONADO': 'pill-teal'
  }
  return map[status] || 'pill-slate'
}

function iconForStatus(status) {
  const map = {
    'PENDIENTE': 'fa-clock',
    'EN_PROCESO': 'fa-spinner fa-spin-pulse',
    'SOLUCIONADO': 'fa-check'
  }
  return map[status] || 'fa-circle'
}

function rowClassForStatus(status) {
  const map = {
    'PENDIENTE': 'row-yellow',
    'EN_PROCESO': 'row-blue',
    'SOLUCIONADO': 'row-emerald'
  }
  return map[status] || ''
}

// === INIT ===
onMounted(() => {
  fetchData()
})
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

.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: padding .2s ease;
}
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; transition: padding .2s ease; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; transition: height .2s ease, width .2s ease; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; transition: font-size .2s ease; }

.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; text-decoration: none; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-active { background: #fff; color: var(--navy-900, #0f172a); border-color: #fff; }
.btn-exec-danger { background: rgba(220,38,38,.15); color: #fca5a5; border-color: rgba(220,38,38,.3); }
.btn-exec-warning { background: #f59e0b; color: var(--navy-900, #0f172a); border-color: #f59e0b; }
.btn-exec-warning:hover:not(:disabled) { background: #d97706; }
.btn-exec-success { background: #15803d; color: #fff; border-color: #15803d; }
.btn-exec-success:hover:not(:disabled) { background: #166534; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }

.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: visible; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

/* ═══════════════════════════════════════════════════════════════
   GRUPOS DE COLUMNAS COLAPSABLES
   ═══════════════════════════════════════════════════════════════ */
.thead-colgroup {
  background: #0f172a;
}

.tg-fixed {
  width: 80px;
  min-width: 80px;
  background: #0f172a;
  border-right: 1px solid #1e293b;
}

.tg-header {
  padding: 0;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #1e293b;
  transition: background 0.15s;
  white-space: nowrap;
}

.tg-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tg-icon { font-size: 9px; opacity: 0.8; }
.tg-text { flex: 1; text-align: center; }
.tg-chevron { font-size: 8px; opacity: 0.7; transition: transform 0.2s; }

/* Colores por grupo */
.tg-programa {
  background: #1e3a5f;
  color: #93c5fd;
  border-bottom: 2px solid #3b82f6;
}
.tg-programa:hover { background: #1d4ed8; color: #dbeafe; }

.tg-cliente {
  background: #1a3a2a;
  color: #86efac;
  border-bottom: 2px solid #22c55e;
}
.tg-cliente:hover { background: #166534; color: #dcfce7; }

.tg-lead {
  background: #3b2a1a;
  color: #fcd34d;
  border-bottom: 2px solid #f59e0b;
}
.tg-lead:hover { background: #92400e; color: #fef3c7; }

/* Estado colapsado */
.tg-collapsed {
  width: 36px !important;
  min-width: 36px !important;
  max-width: 36px !important;
}
.tg-collapsed .tg-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 9px;
  max-height: 80px;
  overflow: hidden;
}
.tg-collapsed .tg-label {
  flex-direction: column;
  padding: 8px 4px;
  gap: 4px;
}
.tg-collapsed.tg-programa { background: #1e3a5f; }
.tg-collapsed.tg-cliente  { background: #1a3a2a; }
.tg-collapsed.tg-lead     { background: #3b2a1a; }

/* Celda placeholder cuando grupo está colapsado */
.tg-placeholder-cell {
  width: 88px !important;
  min-width: 88px !important;
  max-width: 88px !important;
  padding: 4px 6px !important;
  vertical-align: middle;
}

/* Indicador visual en filas del tbody cuando colapsado */
.tg-collapsed-hint {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 5px;
  border-radius: 4px;
  width: 100%;
}

.tg-hint-programa { color: #3b82f6; background: #eff6ff; }
.tg-hint-cliente  { color: #22c55e; background: #f0fdf4; }
.tg-hint-lead     { color: #f59e0b; background: #fffbeb; }
/* ═══════════════════════════════════════════════════════════════ */

.thead-group .th-cat { background: var(--navy-900, #0f172a); color: var(--slate-300, #cbd5e1); padding: 10px 14px; border-right: 2px solid #334155; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; }
.th-group { padding: 8px 10px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border, #e2e8f0); }
.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 2px solid #bbf7d0; }
.ts-a { background: #f8fbff; color: #3b82f6; border-left: 1px solid #dbeafe; padding: 8px 12px; }
.ts-b { background: #f7fdf9; color: #16a34a; border-left: 1px solid #d1fae5; padding: 8px 12px; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.row-inscrito { border-left: 3px solid #10b981; } .row-inscrito > td  { background: #f0fdf4; }
.row-blue     { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald  { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow   { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }
.row-gray     { border-left: 3px solid #94a3b8; } .row-gray > td      { background: var(--slate-50, #f8fafc); color: var(--text-secondary, #475569); }
.row-red      { border-left: 3px solid #ef4444; } .row-red > td       { background: #fef2f2; }
.row-highlight > td { background: #eff6ff !important; }

.tbody-row::after { content: ""; position: absolute; left: 0; bottom: 0; top: 0; height: 100%; width: 0%; background: rgba(20,184,166,.13); transition: width .3s ease-out; pointer-events: none; z-index: 5; }
.row-pressing::after { width: 100%; transition: width 1s linear; }

.td-a { border-left: 1px solid transparent; }
.td-b { border-left: 1px solid transparent; }
.td-cat { padding-left: 14px; border-right: 2px solid #1e293b; background: var(--navy-900, #0f172a) !important; color: #fff !important; }

.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.c-green { color: #15803d; } .c-red { color: #dc2626; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }
.pay-date-cell { color: #15803d; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }
.pill-red    { background: #fee2e2; color: #b91c1c; border-color: #fecaca !important; }

.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover:not(:disabled) { background: var(--slate-100, #f1f5f9); color: var(--text-primary, #0f172a); border-color: var(--slate-300, #cbd5e1); }
.btn-icon:disabled { opacity: .4; cursor: default; }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }
.empty-state p { margin: 0; }

.compact-table { font-size: 11px; }
.compact-table .ts { padding: 6px 10px; font-size: 10px; }
.compact-table td { padding: 6px 10px; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.compact-table .pill { padding: 2px 6px; font-size: 9.5px; }

.exec-fieldset { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 16px 20px; }
.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }

.exec-input-light, .exec-select-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus, .exec-select-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; resize: vertical; min-height: 64px; display: block; }
.exec-textarea:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea:disabled, .exec-input-light:disabled, .exec-select-light:disabled { background: var(--slate-50, #f8fafc); color: var(--slate-400, #94a3b8); cursor: not-allowed; }

.exec-modal-body { display: flex; flex-direction: column; }
.modal-lead-strip { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #fff; border-bottom: 1px solid var(--border, #e2e8f0); }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid #e0f2fe; flex-shrink: 0; }

.timer-btn { width: 28px; height: 28px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: .65rem; transition: all .15s; }
.timer-btn--start { background: #d1fae5; color: #059669; }
.timer-btn--start:hover { background: #a7f3d0; }
.timer-btn--stop  { background: #fee2e2; color: #dc2626; }
.timer-btn--stop:hover  { background: #fecaca; }
.timer-btn:disabled { opacity: .45; cursor: default; }
.timer-display { font-size: 13px; font-variant-numeric: tabular-nums; color: var(--text-secondary, #475569); }
.timer-display--active { color: #dc2626; }

.exec-alert { padding: 12px 16px; border-radius: 6px; font-size: 12.5px; border-left: 4px solid; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
.alert-info    { background: #f0f9ff; color: #0369a1; border-color: #3b82f6; }
.alert-warning { background: #fffbeb; color: #92400e; border-color: #f59e0b; }
.alert-success { background: #f0fdf4; color: #166534; border-color: #22c55e; }

.exec-alert-banner { display: flex; align-items: center; padding: 20px; border-radius: 8px; gap: 20px; border: 1px solid; }
.banner-danger  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.banner-success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.banner-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.banner-text  { font-size: 12.5px; color: var(--text-primary, #0f172a); margin: 0; line-height: 1.5; }

.control-table-wrapper { max-height: 62vh; overflow: auto; }
.control-table-wrapper .sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0,0,0,.12); }
.control-table-wrapper tbody .sticky-col { background: #fff; }
.control-table-wrapper thead .sticky-col { z-index: 3; background: var(--navy-900, #0f172a); }
.minW-200 { min-width: 220px; }
.minW-300 { min-width: 320px; }

.enrollment-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.enrollment-title { font-size: 14px; font-weight: 700; color: #0d9488; margin: 0; text-transform: uppercase; letter-spacing: .03em; }
.enrollment-sub { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; font-weight: 500; }
.info-block { display: flex; flex-direction: column; gap: 2px; }
.info-value { font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); }

.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 14px; }
.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; transition: border-color .15s; }
.file-item:hover { border-color: #0d9488; }
.file-icon { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: var(--slate-50, #f8fafc); border-radius: 4px; flex-shrink: 0; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 16px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--border, #e2e8f0); border-top-color: #0d9488; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.scroll-area { max-height: 500px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--slate-300, #cbd5e1) transparent; }
.scroll-area::-webkit-scrollbar { width: 5px; }
.scroll-area::-webkit-scrollbar-thumb { background: var(--slate-200, #e2e8f0); border-radius: 4px; }

.pulse-alert { animation: pulseRed 2s infinite; }
@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,.4); } 70% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }

.text-slate-400 { color: var(--slate-400, #94a3b8); }

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20, 184, 166, .15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-multiselect { --ms-font-size: 11px; --ms-line-height: 1.3; --ms-min-height: 28px; --ms-py: 2px; --ms-px: 6px; --ms-tag-py: 1px; --ms-tag-px: 4px; --ms-tag-font-size: 9.5px; --ms-border-color: var(--border, #e2e8f0); --ms-border-color-active: var(--teal-500, #14b8a6); --ms-ring-color: rgba(20, 184, 166, .15); font-size: 11px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.thead-filter .flatpickr-input { height: 28px !important; font-size: 10.5px !important; padding: 3px 7px !important; }
.thead-sub .ts { border-bottom: 1px solid var(--border, #e2e8f0); }
/* ═══════════════════════════════════════════════════════════════ */

/* ══ FOCUS MODE TOGGLE ════════════════════════════════════════ */
.focus-toggle-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.07); color: var(--slate-300, #cbd5e1); transition: all 0.15s; white-space: nowrap; }
.focus-toggle-btn:hover { background: rgba(255, 255, 255, 0.13); color: #fff; border-color: rgba(255, 255, 255, 0.25); }
.exec-toolbar, .toolbar-chips { transition: opacity 0.2s ease; }
.tf-actions-cell { text-align: center; }
.hf-actions-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.hf-new-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #bbf7d0; border-radius: 4px; background: #f0fdf4; color: #15803d; cursor: pointer; font-size: 11px; font-weight: 700; transition: all 0.15s; }
.hf-new-btn:hover { background: #dcfce7; border-color: #86efac; color: #166534; }

/* ══ MASTHEAD COMPACT ═════════════════════════════════════════ */
.masthead--compact .masthead-inner { padding: 6px 28px; }
.brand-rule--sm { height: 24px !important; width: 3px !important; }
.masthead--compact .brand-title { font-size: 14px; letter-spacing: .01em; }
.brand-eyebrow--inline { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--teal-500, #14b8a6); margin-right: 6px; vertical-align: middle; }
.focus-toggle-btn--active { background: var(--teal-500, #14b8a6) !important; color: #fff !important; border-color: var(--teal-500, #14b8a6) !important; padding: 5px 10px; font-size: 11px; }
/* ═════════════════════════════════════════════════════════════ */

/* Últimas celdas del thead-filter — dropdown abre a la izquierda */
.thead-filter .tf:nth-last-child(-n+3) :deep(.multiselect-dropdown) { left: auto !important; right: 0 !important; }

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
  .exec-body { padding: 16px 12px; }
}


.tg-hint-line {
  display: block;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 76px;
  line-height: 1.3;
}

.tg-hint-main  { font-weight: 600; color: var(--text-primary, #0f172a); }
.tg-hint-strong { font-weight: 700; }
.tg-hint-muted { color: var(--text-muted, #94a3b8); }

.tg-hint-programa { background: #eff6ff; }
.tg-hint-cliente  { background: #f0fdf4; }
.tg-hint-lead     { background: #fffbeb; }
.tg-hint-asesor   { background: #f5f3ff; }

/* AÑADIR colores del grupo D. ASESOR */
.tg-asesor {
  background: #2e1a47;
  color: #c4b5fd;
  border-bottom: 2px solid #8b5cf6;
}
.tg-asesor:hover { background: #5b21b6; color: #ede9fe; }

.tg-collapsed.tg-asesor { background: #2e1a47; }

.tg-hint-asesor { color: #6d28d9; }

</style>