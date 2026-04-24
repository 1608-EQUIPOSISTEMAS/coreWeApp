<template>
  <main class="exec-body">
    <div class="row g-3 mb-4" v-if="!toolbarCollapsed && kpis">
      <div class="col-md-4">
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
      <div class="col-md-4">
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
      <div class="col-md-4">
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
    </div>

    <div class="exec-toolbar" v-show="!toolbarCollapsed">
      <div class="toolbar-pagination">
        <BasePagination
          v-model="pagin"
          @change="handlePaginationChange"
          :hide-filters="true"
        />
      </div>
      <div class="toolbar-actions">
        <div class="filter-date-wrap">
          <i class="fa-regular fa-calendar filter-icon"></i>
          <BaseDatePicker
            v-model="filters.date_range_string"
            :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
            class="filter-input"
            placeholder="Desde → Hasta"
            @on-change="(dates, dateStr) => handleDateFilterChange(dateStr)"
          />
        </div>
        <button v-if="filters.q || filters.status || filters.tipo || filters.assigned_to || filters.from_date" class="btn-exec btn-exec-outline" @click="clearFilters" title="Limpiar Filtros">
          <i class="fa-solid fa-eraser"></i>
        </button>

      </div>
    </div>

    <div class="tickets-layout">
      <div class="table-shell">
      <div class="table-responsive-custom">
        <table class="exec-table">
          <thead>
            <tr class="thead-sub">
              <th class="ts ts-c" style="width: 110px;">Ticket #</th>
              <th class="ts ts-c" style="width: 140px;">Estado</th>
              <th class="ts ts-c" style="width: 160px;">Tipo de Solicitud</th>
              <th class="ts ts-c">Alumno / Contacto</th>
              <th class="ts ts-c">Programa</th>
              <th class="ts ts-c" style="width: 170px;">Asignado a</th>
              <th class="ts ts-c" style="width: 150px;">Fecha Registro</th>
            </tr>
            <tr class="thead-filter">
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
              <th class="tf"></th>
              <th class="tf">
                <select v-model="filters.assigned_to" class="hf-input" @change="triggerInlineFilter">
                  <option :value="null">Todos</option>
                  <option :value="0">Sin asignar</option>
                  <option v-for="a in advisorOptions" :key="a.id" :value="a.id">{{ a.full_name }}</option>
                </select>
              </th>
              <th class="tf"></th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="t in ticketsRaw"
              :key="t.id"
              v-if="!isLoading"
              class="tbody-row"
              :class="[rowClassForStatus(t.status), { 'row-active': selectedTicket?.id === t.id }]"
              @click="openTicketModal(t.id)"
            >
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
                <span v-if="t.assigned_to_name" class="pill pill-assigned border">
                  <i class="fa-solid fa-user-tie me-1"></i> {{ t.assigned_to_name }}
                </span>
                <span v-else class="pill pill-slate border">
                  <i class="fa-solid fa-user-slash me-1"></i> Sin asignar
                </span>
              </td>
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
            <template v-if="isLoading">
              <tr v-for="n in 8" :key="`sk-${n}`" class="tbody-row skel-row">
                <td class="td-a"><div class="skel" style="width:90px;height:12px;"></div></td>
                <td class="td-a"><div class="skel" style="width:76px;height:20px;border-radius:10px;"></div></td>
                <td class="td-a"><div class="skel" style="width:110px;height:12px;"></div></td>
                <td class="td-a">
                  <div class="skel mb-1" style="width:120px;height:12px;"></div>
                  <div class="skel" style="width:80px;height:10px;"></div>
                </td>
                <td class="td-a"><div class="skel" style="width:100px;height:12px;"></div></td>
                <td class="td-a"><div class="skel" style="width:80px;height:20px;border-radius:10px;"></div></td>
                <td class="td-a"><div class="skel" style="width:80px;height:12px;"></div></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      </div>

      <!-- PANEL LATERAL -->
      <aside v-if="selectedTicket !== null || isPanelLoading" class="tkt-panel">

        <div v-if="isPanelLoading" class="tkt-panel-loading">
          <div class="loader-ring"></div>
          <p class="text-muted small mt-2">Cargando ticket...</p>
        </div>

        <template v-else-if="selectedTicket">
          <header class="tkt-panel-head">
            <div>
              <div class="tkt-panel-num">{{ selectedTicket.ticket_number }}</div>
              <div class="tkt-panel-student">{{ selectedTicket.full_name || selectedTicket.student_name }}</div>
            </div>
            <button class="tkt-close-btn" @click="closePanel" title="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div class="tkt-panel-meta">
            <span><i class="fa-solid fa-envelope me-1"></i>{{ selectedTicket.email }}</span>
            <span><i class="fa-brands fa-whatsapp text-success me-1"></i>{{ selectedTicket.phone }}</span>
          </div>

          <div class="tkt-panel-pills">
            <span class="pill border" :class="badgeForStatus(selectedTicket.status)">
              <i class="fa-solid me-1" :class="iconForStatus(selectedTicket.status)"></i>{{ selectedTicket.status }}
            </span>
            <span v-if="selectedTicket.membership_tier_name" class="pill pill-amber border">
              <i class="fa-solid fa-crown me-1"></i>{{ selectedTicket.membership_tier_name }}
            </span>
          </div>

          <div class="tkt-section">
            <div class="tkt-section-title">Detalles</div>
            <dl class="tkt-dl">
              <div class="tkt-dl-row"><dt>Tipo</dt><dd>{{ selectedTicket.tipo?.replace(/_/g, ' ') }}</dd></div>
              <div class="tkt-dl-row"><dt>Programa</dt><dd>{{ selectedTicket.program_name || '—' }}</dd></div>
              <div class="tkt-dl-row"><dt>Fecha</dt><dd>{{ selectedTicket.created_at_fmt }}</dd></div>
              <div v-if="selectedTicket.resolved_at_fmt" class="tkt-dl-row">
                <dt>Resuelto</dt><dd class="text-success fw-600">{{ selectedTicket.resolved_at_fmt }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="selectedTicket.csat_info" class="tkt-csat-card">
            <div class="tkt-section-title mb-2">Calificación CSAT</div>
            <div class="d-flex align-items-center gap-2">
              <div class="text-warning" style="font-size:14px;">
                <i v-for="n in 5" :key="n" class="fa-star" :class="n <= selectedTicket.csat_info.rating ? 'fa-solid' : 'fa-regular opacity-40'"></i>
              </div>
              <span class="fw-700 text-warning">{{ selectedTicket.csat_info.rating }}.0</span>
            </div>
            <div class="x-small text-muted mt-1">{{ selectedTicket.csat_info.created_at }}</div>
          </div>

          <div class="tkt-section">
            <div class="tkt-section-title">Resolución</div>
            <label class="exec-label mt-2">Estado actual</label>
            <SearchSelect
              v-model="formTicket.status"
              :items="ticketStatusOptions"
              value-field="value"
              label-field="label"
              placeholder="Seleccionar estado..."
              @change="(opt) => { if (opt) formTicket.status = opt.value }"
            />
            <label class="exec-label mt-3">Asesor asignado</label>
            <SearchSelect
              v-model="formTicket.assigned_to"
              :items="advisorOptions"
              value-field="id"
              label-field="full_name"
              placeholder="Sin asignar..."
              :clearable="true"
              @change="(opt) => { formTicket.assigned_to = opt?.id ?? null }"
            />
            <label class="exec-label mt-3">Observaciones</label>
            <textarea v-model="formTicket.notes" class="exec-textarea w-100 mt-1" rows="4" placeholder="Registra las acciones tomadas, enlaces enviados..."></textarea>
          </div>

          <footer class="tkt-panel-footer">
            <a v-if="selectedTicket.conversation_id" :href="`https://chat.we-educacion-ejecutiva.site/app/accounts/1/inbox/1/conversations/${selectedTicket.conversation_id}`" target="_blank" class="tkt-chatwoot-btn">
              <i class="fa-solid fa-up-right-from-square me-1"></i> Chatwoot
            </a>
            <span v-else></span>
            <button class="tkt-save-btn" @click="saveTicket" :disabled="isSaving">
              <i class="fa-solid fa-floppy-disk me-1"></i>{{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </footer>
        </template>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onActivated, onMounted, onBeforeUnmount, inject } from 'vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const toast = useToast()
const botService = inject(ServiceKeys.Bot)

const ticketStatusOptions = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROCESO', label: 'En Proceso (Revisando)' },
  { value: 'SOLUCIONADO', label: 'Solucionado (Completado)' },
]

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
  assigned_to: null,
  from_date: null,
  to_date: null,
  date_range_string: null
})

// === PANEL ESTADOS ===
const isPanelLoading = ref(false)
const isSaving = ref(false)
const selectedTicket = ref(null)
const formTicket = reactive({ status: '', notes: '', assigned_to: null })

// === ASESORES (para asignación) ===
const advisorOptions = ref([])
async function loadAdvisors() {
  try {
    const data = await botService.botAdvisorList()
    advisorOptions.value = data?.items || []
  } catch (error) {
    console.error('No se pudo cargar la lista de asesores', error)
  }
}

// === FETCH DATA ===
async function fetchData() {
  isLoading.value = true
  try {
    const metricResp = await botService.botDashboardMetricsGet({
      from_date: filters.from_date,
      to_date: filters.to_date
    })
    kpis.value = metricResp.data || null

    const tableResp = await botService.botTicketList({
      q: filters.q || null,
      status: filters.status || null,
      tipo: filters.tipo || null,
      assigned_to: filters.assigned_to,
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
  if (selectedTicket.value?.id === id) { closePanel(); return }
  isPanelLoading.value = true
  selectedTicket.value = null
  try {
    const { data } = await botService.botTicketGet({ id })
    selectedTicket.value = data
    formTicket.status = data.status
    formTicket.notes = data.notes || ''
    formTicket.assigned_to = data.assigned_to || null
  } catch (error) {
    toast.error('No se pudo cargar el ticket')
    isPanelLoading.value = false
  } finally {
    isPanelLoading.value = false
  }
}

function closePanel() {
  selectedTicket.value = null
  isPanelLoading.value = false
}

async function saveTicket() {
  isSaving.value = true
  try {
    await botService.botTicketUpdate({
      id: selectedTicket.value.id,
      status: formTicket.status,
      notes: formTicket.notes,
      assigned_to: formTicket.assigned_to
    })
    toast.success('Ticket actualizado correctamente')
    closePanel()
    fetchData()
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
  filters.assigned_to = null
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
    'EN_PROCESO': 'pill-slate',
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
function onKeyDown(e) {
  if (e.key === 'Escape') closePanel()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

onActivated(() => {
  if (!advisorOptions.value.length) loadAdvisors()
  fetchData()
})
</script>

<style scoped>
.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; text-decoration: none; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }

.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: visible; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.row-blue     { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald  { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow   { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }

.td-a { border-left: 1px solid transparent; }

.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }
.pill-assigned { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe !important; }

.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover:not(:disabled) { background: var(--slate-100, #f1f5f9); color: var(--text-primary, #0f172a); border-color: var(--slate-300, #cbd5e1); }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }
.empty-state p { margin: 0; }

.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }

.exec-select-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-select-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; resize: vertical; min-height: 64px; display: block; }
.exec-textarea:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

.enrollment-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.enrollment-title { font-size: 14px; font-weight: 700; color: #0d9488; margin: 0; text-transform: uppercase; letter-spacing: .03em; }
.enrollment-sub { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; font-weight: 500; }
.info-block { display: flex; flex-direction: column; gap: 2px; }
.info-value { font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); }

.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 14px; }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid #e0f2fe; flex-shrink: 0; }

.exec-alert { padding: 12px 16px; border-radius: 6px; font-size: 12.5px; border-left: 4px solid; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 16px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--border, #e2e8f0); border-top-color: #0d9488; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ TICKETS LAYOUT (tabla + panel) ══════════════════════════ */
.tickets-layout { display: flex; gap: 16px; align-items: flex-start; }
.tickets-layout .table-shell { flex: 1; min-width: 0; }

.row-active td { background: #f0fdfa !important; }
.row-active { border-left: 3px solid #0d9488 !important; }

/* ══ PANEL LATERAL ═══════════════════════════════════════════ */
.tkt-panel {
  width: 370px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #efefef;
  border-radius: 12px;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.tkt-panel::-webkit-scrollbar { width: 4px; }
.tkt-panel::-webkit-scrollbar-track { background: transparent; }
.tkt-panel::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

.tkt-panel-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; }

.tkt-panel-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 18px 0; gap: 10px; }
.tkt-panel-num { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: #0d9488; font-weight: 700; letter-spacing: .04em; }
.tkt-panel-student { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-top: 2px; letter-spacing: -.01em; }
.tkt-close-btn { width: 28px; height: 28px; border: 1px solid #efefef; background: #fff; border-radius: 6px; cursor: pointer; color: #737373; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
.tkt-close-btn:hover { background: #f5f5f5; color: #1a1a1a; }

.tkt-panel-meta { padding: 8px 18px 0; display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; color: #737373; }
.tkt-panel-pills { padding: 10px 18px 0; display: flex; gap: 6px; flex-wrap: wrap; }

.tkt-section { padding: 16px 18px 0; display: flex; flex-direction: column; gap: 6px; }
.tkt-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #a3a3a3; }
.tkt-dl { margin: 0; padding: 0; display: flex; flex-direction: column; }
.tkt-dl-row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: baseline; padding: 5px 0; border-bottom: 1px solid #f5f5f5; }
.tkt-dl-row:last-child { border-bottom: none; }
.tkt-dl-row dt { font-size: 11px; color: #a3a3a3; font-weight: 500; }
.tkt-dl-row dd { font-size: 12.5px; color: #1a1a1a; font-weight: 500; margin: 0; word-break: break-word; }

.tkt-csat-card { margin: 14px 18px 0; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; }

.tkt-panel-footer { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #efefef; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.tkt-chatwoot-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #0d9488; text-decoration: none; padding: 6px 10px; border: 1px solid #99f6e4; border-radius: 6px; background: #f0fdfa; transition: all .15s; }
.tkt-chatwoot-btn:hover { background: #ccfbf1; }
.tkt-save-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .15s; font-family: inherit; }
.tkt-save-btn:hover:not(:disabled) { background: #333; }
.tkt-save-btn:disabled { opacity: .5; cursor: default; }

.exec-textarea { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 7px 10px; font-size: 12px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; resize: vertical; min-height: 72px; display: block; width: 100%; box-sizing: border-box; }
.exec-textarea:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.1); }

.skel-row td { background: #fafbfc !important; }
.skel { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ══ FILTROS DE TOOLBAR ═══════════════════════════════════════ */
.filter-search-wrap, .filter-date-wrap { position: relative; display: flex; align-items: center; }
.filter-icon { position: absolute; left: 9px; color: #94a3b8; font-size: 11px; pointer-events: none; z-index: 1; }
.filter-input { height: 34px; padding: 0 10px 0 28px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; background: #fff; font-size: 12px; font-family: inherit; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; }
.filter-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.1); }
.filter-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 11.5px; }

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20, 184, 166, .15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }

.border-success-wrapper :deep(.searchselect-control) { border-color: #10b981; }

@media (max-width: 768px) {
  .exec-body { padding: 16px 12px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
}
</style>
