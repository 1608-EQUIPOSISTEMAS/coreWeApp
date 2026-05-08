<template>
  <div class="bot-tab">
    <!-- KPI cards (estilo Leads) -->
    <div class="row g-3 mb-3" v-if="kpis">
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-icon bg-amber-light text-amber"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">Pendientes / En Proceso</span>
            <span class="kpi-value">
              {{ (kpis.tickets_pendientes || 0) + (kpis.tickets_en_proceso || 0) }}
              <span class="small fw-500 text-muted">/ {{ kpis.total_tickets || 0 }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-icon bg-teal-light text-teal"><i class="fa-solid fa-check-double"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">Solucionados</span>
            <span class="kpi-value">{{ kpis.tickets_solucionados || 0 }}</span>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-icon bg-yellow-light text-yellow"><i class="fa-solid fa-star"></i></div>
          <div class="kpi-info">
            <span class="kpi-label">CSAT Promedio</span>
            <span class="kpi-value">{{ kpis.csat_avg_score || '0.0' }} <span class="small fw-500 text-muted">/ 5.0</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter bar (estilo Leads) -->
    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': hasActiveFilters }">
      <div class="ep-filter-bar-main">
        <div class="ep-quick-row">
          <span class="ep-section-eyebrow">
            <i class="fa-solid fa-ticket"></i>
            Solicitudes / Tickets
          </span>
        </div>
        <div class="ep-toolbar">
          <BasePagination
            v-model="pagin"
            @change="handlePaginationChange"
            :hide-filters="true"
          />
        </div>
      </div>
      <div class="ep-filter-bar-controls">
        <div class="filter-date-wrap grow">
          <i class="fa-regular fa-calendar filter-icon"></i>
          <BaseDatePicker
            v-model="filters.date_range_string"
            :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
            class="filter-input"
            placeholder="Desde → Hasta"
            @on-change="(dates, dateStr) => handleDateFilterChange(dateStr)"
          />
        </div>
        <button v-if="hasActiveFilters" class="ep-btn-control" @click="clearFilters" title="Limpiar Filtros">
          <i class="fa-solid fa-eraser"></i>
          <span>Limpiar</span>
        </button>
      </div>
      <div v-if="hasActiveFilters" class="ep-filter-strip">
        <span class="ep-filter-strip-badge">
          <i class="fa-solid fa-circle-half-stroke"></i>
          Filtros activos
          <span class="ep-filter-strip-count">{{ activeFilterCount }}</span>
        </span>
      </div>
    </section>

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
            <button class="ep-btn-new" @click="saveTicket" :disabled="isSaving">
              <i class="fa-solid fa-floppy-disk"></i>{{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </footer>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onActivated, onMounted, onBeforeUnmount, inject } from 'vue'
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

const hasActiveFilters = computed(() =>
  !!filters.q || !!filters.status || !!filters.tipo || filters.assigned_to !== null || !!filters.from_date
)
const activeFilterCount = computed(() => {
  let n = 0
  if (filters.q) n++
  if (filters.status) n++
  if (filters.tipo) n++
  if (filters.assigned_to !== null) n++
  if (filters.from_date) n++
  return n
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
.bot-tab { display: flex; flex-direction: column; gap: 0; }

/* === KPI cards (igual a Dashboard / Leads) === */
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--e-border, #E8E8E3);
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04), 0 1px 2px rgba(15, 23, 42, .03);
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
}
.kpi-card:hover {
  border-color: var(--e-border-strong, #D4D4CC);
  box-shadow: 0 4px 10px rgba(15, 23, 42, .06), 0 2px 4px rgba(15, 23, 42, .04);
  transform: translateY(-1px);
}
.kpi-icon {
  width: 46px; height: 46px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.bg-amber-light { background: #fffbeb; } .text-amber { color: #d97706; }
.bg-teal-light  { background: #ecfdf4; } .text-teal  { color: #047857; }
.bg-yellow-light{ background: #fefce8; } .text-yellow{ color: #eab308; }

.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 10.5px; color: var(--e-text-secondary, #6F6F66); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.kpi-value { font-size: 22px; font-weight: 700; color: var(--e-text, #14140F); line-height: 1.2; margin-top: 4px; letter-spacing: -0.01em; }

/* === Filter bar (estilo Leads) === */
.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
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
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}
.ep-quick-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ep-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; flex: 1 1 auto; }
.ep-filter-bar-controls {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px;
  border-top: 1px solid var(--e-border, #E8E8E3);
  background: var(--e-bg-subtle, #FAFAF8);
}
.ep-filter-bar-controls .filter-date-wrap.grow,
.ep-filter-bar-controls .filter-date-wrap.grow .filter-input { flex: 1 1 260px; min-width: 260px; }

.ep-section-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 600;
  color: var(--e-text, #14140F);
}
.ep-section-eyebrow i { color: var(--e-accent, #10B981); font-size: 12px; }

.ep-filter-strip {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border, #E8E8E3);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 600; color: #047857;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--e-accent, #10B981); color: #fff;
  border-radius: 9px; font-size: 10.5px; font-weight: 700;
}

.ep-btn-control {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; font-size: 12.5px; font-weight: 600;
  color: var(--e-text, #14140F); background: #fff;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  cursor: pointer; transition: all .2s ease; font-family: inherit;
}
.ep-btn-control:hover { border-color: var(--e-border-strong, #D4D4CC); background: var(--e-bg-subtle, #FAFAF8); }
.ep-btn-control i { font-size: 11px; }

button.ep-btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; font-size: 12.5px; font-weight: 600;
  color: #fff !important; background: #14140F !important;
  border: 1px solid #14140F !important; border-radius: 8px;
  cursor: pointer; font-family: inherit;
  letter-spacing: -0.01em;
  transition: background .2s ease, border-color .2s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .08);
}
button.ep-btn-new:hover:not(:disabled) {
  background: #333 !important; border-color: #333 !important;
}
button.ep-btn-new:disabled { opacity: .5; cursor: default; }
button.ep-btn-new i { font-size: 11px; }

/* === Filtro de fecha === */
.filter-date-wrap { position: relative; display: flex; align-items: center; }
.filter-icon { position: absolute; left: 9px; color: var(--e-text-muted, #A0A099); font-size: 11px; pointer-events: none; z-index: 1; }
.filter-input {
  height: 34px; padding: 0 10px 0 28px;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  background: #fff; font-size: 12px; font-family: inherit;
  color: var(--e-text, #14140F); outline: none;
  transition: border-color .15s, box-shadow .15s; min-width: 220px;
}
.filter-input:focus { border-color: var(--e-accent, #10B981); box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
.filter-input::placeholder { color: var(--e-text-muted, #A0A099); font-size: 11.5px; }

/* === Tabla === */
.table-shell {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 10px;
  overflow: hidden;
}
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 10px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts {
  padding: 10px 14px; font-size: 10px; letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 600;
  border-bottom: 1px solid var(--e-border, #E8E8E3);
  text-align: left; background: var(--e-bg-subtle, #FAFAF8);
  color: var(--e-text-secondary, #6F6F66); white-space: nowrap;
}
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td {
  padding: 10px 14px; border-bottom: 1px solid var(--e-border, #E8E8E3);
  vertical-align: middle; color: var(--e-text, #14140F);
}
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: var(--e-bg-subtle, #FAFAF8); cursor: pointer; }

.row-blue     { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald  { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow   { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }

.td-a { border-left: 1px solid transparent; }

.text-center { text-align: center; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--e-text-muted, #A0A099); }
.text-dark { color: var(--e-text, #14140F); }
.text-success { color: #059669; }
.accent-text { color: #047857; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: #f1f5f9; color: #475569; border-color: #e2e8f0 !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }
.pill-assigned { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe !important; }

.empty-state { padding: 40px; text-align: center; color: var(--e-text-muted, #A0A099); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--e-text-muted, #A0A099); }
.empty-state p { margin: 0; }

/* === Loader === */
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--e-border, #E8E8E3); border-top-color: var(--e-accent, #10B981); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* === TICKETS LAYOUT === */
.tickets-layout { display: flex; gap: 16px; align-items: flex-start; margin-top: 14px; }
.tickets-layout .table-shell { flex: 1; min-width: 0; }

.row-active td { background: #f0fdfa !important; }
.row-active { border-left: 3px solid #0d9488 !important; }

/* === PANEL LATERAL === */
.tkt-panel {
  width: 370px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 10px;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.tkt-panel::-webkit-scrollbar { width: 4px; }
.tkt-panel::-webkit-scrollbar-track { background: transparent; }
.tkt-panel::-webkit-scrollbar-thumb { background: var(--e-border-strong, #D4D4CC); border-radius: 4px; }

.tkt-panel-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; }

.tkt-panel-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 18px 0; gap: 10px; }
.tkt-panel-num { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: var(--e-accent, #10B981); font-weight: 700; letter-spacing: .04em; }
.tkt-panel-student { font-size: 15px; font-weight: 700; color: var(--e-text, #14140F); margin-top: 2px; letter-spacing: -.01em; }
.tkt-close-btn {
  width: 28px; height: 28px;
  border: 1px solid var(--e-border, #E8E8E3);
  background: #fff; border-radius: 6px;
  cursor: pointer; color: var(--e-text-secondary, #6F6F66); font-size: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .15s;
}
.tkt-close-btn:hover { background: var(--e-bg-subtle, #FAFAF8); color: var(--e-text, #14140F); }

.tkt-panel-meta { padding: 8px 18px 0; display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; color: var(--e-text-secondary, #6F6F66); }
.tkt-panel-pills { padding: 10px 18px 0; display: flex; gap: 6px; flex-wrap: wrap; }

.tkt-section { padding: 16px 18px 0; display: flex; flex-direction: column; gap: 6px; }
.tkt-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--e-text-muted, #A0A099); }
.tkt-dl { margin: 0; padding: 0; display: flex; flex-direction: column; }
.tkt-dl-row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: baseline; padding: 5px 0; border-bottom: 1px solid var(--e-border, #E8E8E3); }
.tkt-dl-row:last-child { border-bottom: none; }
.tkt-dl-row dt { font-size: 11px; color: var(--e-text-muted, #A0A099); font-weight: 500; }
.tkt-dl-row dd { font-size: 12.5px; color: var(--e-text, #14140F); font-weight: 500; margin: 0; word-break: break-word; }

.tkt-csat-card { margin: 14px 18px 0; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; }
.text-warning { color: #d97706; }

.tkt-panel-footer {
  position: sticky; bottom: 0; background: #fff;
  border-top: 1px solid var(--e-border, #E8E8E3);
  padding: 12px 18px; display: flex;
  justify-content: space-between; align-items: center;
  margin-top: auto;
}
.tkt-chatwoot-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: #047857;
  text-decoration: none; padding: 6px 10px;
  border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px;
  background: var(--e-accent-soft, #ECFDF4); transition: all .15s;
}
.tkt-chatwoot-btn:hover { background: #d1fae5; }

/* === Form controls in panel === */
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--e-text-secondary, #6F6F66); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-textarea {
  background: #fff; border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  padding: 7px 10px; font-size: 12px; font-family: inherit;
  color: var(--e-text, #14140F); transition: border-color .15s;
  resize: vertical; min-height: 72px; display: block;
  width: 100%; box-sizing: border-box;
}
.exec-textarea:focus { outline: none; border-color: var(--e-accent, #10B981); box-shadow: 0 0 0 2px rgba(16,185,129,.12); }

/* === Skeleton === */
.skel-row td { background: var(--e-bg-subtle, #FAFAF8) !important; }
.skel { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* === FILTROS INLINE EN CABECERA === */
.thead-filter .tf {
  padding: 5px 6px; background: #f0f4f8;
  border-bottom: 2px solid var(--e-accent, #10B981);
  vertical-align: middle; position: relative;
}
.hf-input {
  width: 100%; height: 28px; padding: 3px 8px;
  font-size: 11px; font-family: inherit;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 6px;
  background: #fff; color: var(--e-text, #14140F);
  outline: none; transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.hf-input:focus { border-color: var(--e-accent, #10B981); box-shadow: 0 0 0 2px rgba(16, 185, 129, .15); }
.hf-input::placeholder { color: var(--e-text-muted, #A0A099); font-size: 10.5px; }

@media (max-width: 768px) {
  .ep-filter-bar-main { flex-direction: column; align-items: stretch; }
  .ep-toolbar { justify-content: flex-end; }
  .tickets-layout { flex-direction: column; }
  .tkt-panel { width: 100%; position: static; }
}

/* === Dark mode === */
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
[data-coreui-theme="dark"] .ep-btn-control { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] button.ep-btn-new { background: #F4F4F0 !important; color: #14140F !important; border-color: #F4F4F0 !important; }
[data-coreui-theme="dark"] button.ep-btn-new:hover:not(:disabled) { background: #E4E4DD !important; border-color: #E4E4DD !important; }
[data-coreui-theme="dark"] .ep-filter-bar-controls { background: #1F1F1A; border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-input,
[data-coreui-theme="dark"] .hf-input,
[data-coreui-theme="dark"] .exec-textarea { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .kpi-card,
[data-coreui-theme="dark"] .table-shell,
[data-coreui-theme="dark"] .tkt-panel { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .kpi-value,
[data-coreui-theme="dark"] .text-dark,
[data-coreui-theme="dark"] .tkt-panel-student,
[data-coreui-theme="dark"] .tkt-dl-row dd { color: #F4F4F0; }
[data-coreui-theme="dark"] .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .thead-filter .tf { background: #1F1F1A; }
[data-coreui-theme="dark"] .tbody-row td { color: #E4E4DD; border-bottom-color: #2A2A22; background: #1A1A14; }
[data-coreui-theme="dark"] .tbody-row:hover td { background: #232319; }
[data-coreui-theme="dark"] .row-blue > td { background: rgba(59, 130, 246, 0.10); }
[data-coreui-theme="dark"] .row-emerald > td { background: rgba(13, 148, 136, 0.10); }
[data-coreui-theme="dark"] .row-yellow > td { background: rgba(245, 158, 11, 0.10); }
[data-coreui-theme="dark"] .row-blue:hover > td { background: rgba(59, 130, 246, 0.18); }
[data-coreui-theme="dark"] .row-emerald:hover > td { background: rgba(13, 148, 136, 0.18); }
[data-coreui-theme="dark"] .row-yellow:hover > td { background: rgba(245, 158, 11, 0.18); }
[data-coreui-theme="dark"] .tkt-panel-footer { background: #1A1A14; border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .tkt-chatwoot-btn { background: rgba(16, 185, 129, 0.16); color: #34D399; border-color: rgba(52, 211, 153, 0.32); }
</style>
