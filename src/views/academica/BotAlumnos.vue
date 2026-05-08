<template>
  <div class="bot-tab">
    <!-- Filter bar (estilo Leads) -->
    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': !!filters.q }">
      <div class="ep-filter-bar-main">
        <div class="ep-quick-row">
          <span class="ep-section-eyebrow">
            <i class="fa-solid fa-users"></i>
            Base ODS de Alumnos
          </span>
        </div>
        <div class="ep-toolbar">
          <BasePagination v-model="pagin" @change="fetchStudents" :hide-filters="true" />
        </div>
      </div>
      <div class="ep-filter-bar-controls">
        <div class="filter-search-wrap grow">
          <i class="fa-solid fa-magnifying-glass filter-icon"></i>
          <input
            v-model="filters.q"
            type="text"
            class="filter-input"
            placeholder="Buscar por nombre, correo o teléfono..."
            @input="debouncedSearch"
          />
        </div>
        <button v-if="filters.q" class="ep-btn-control" @click="filters.q = ''; fetchStudents()" title="Limpiar">
          <i class="fa-solid fa-xmark"></i>
          <span>Limpiar</span>
        </button>
      </div>
    </section>

    <div class="table-shell">
      <div class="table-responsive-custom">
        <table class="exec-table">
          <thead>
            <tr class="thead-sub">
              <th class="ts ts-c text-center" style="width: 60px;">Perfil</th>
              <th class="ts ts-c">Alumno</th>
              <th class="ts ts-c">Contacto</th>
              <th class="ts ts-c">Membresía</th>
              <th class="ts ts-c" style="width: 150px;">Registro Bot</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in students"
              :key="s.id"
              v-if="!isLoading"
              class="tbody-row"
              @click="openStudentProfile(s.id)"
            >
              <td class="td-a text-center">
                <div class="lead-avatar mx-auto" style="width: 32px; height: 32px; font-size: 14px;">
                  <i class="fa-solid fa-user"></i>
                </div>
              </td>
              <td class="td-a fw-600 text-dark">{{ s.full_name }}</td>
              <td class="td-a">
                <div class="d-flex flex-column">
                  <span class="fw-600 text-dark"><i class="fa-brands fa-whatsapp text-success me-1"></i>{{ s.phone || '—' }}</span>
                  <span class="small text-muted"><i class="fa-regular fa-envelope me-1"></i>{{ s.email || '—' }}</span>
                </div>
              </td>
              <td class="td-a">
                <span v-if="s.membership_tier_name" class="pill border" :class="s.membership_active ? 'pill-amber' : 'pill-slate'">
                  <i class="fa-solid fa-crown me-1"></i> {{ s.membership_tier_name }}
                </span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td class="td-a small text-muted">{{ s.created_at_fmt }}</td>
            </tr>
            <tr v-if="!students.length && !isLoading">
              <td colspan="5" class="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <p>No se encontraron alumnos.</p>
              </td>
            </tr>
            <template v-if="isLoading">
              <tr v-for="n in 8" :key="`sk-${n}`" class="tbody-row skel-row">
                <td class="td-a text-center"><div class="skel" style="width:32px;height:32px;border-radius:50%;margin:0 auto;"></div></td>
                <td class="td-a"><div class="skel" style="width:130px;height:12px;"></div></td>
                <td class="td-a">
                  <div class="skel mb-1" style="width:110px;height:12px;"></div>
                  <div class="skel" style="width:140px;height:10px;"></div>
                </td>
                <td class="td-a"><div class="skel" style="width:80px;height:20px;border-radius:10px;"></div></td>
                <td class="td-a"><div class="skel" style="width:80px;height:12px;"></div></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal v-model="showProfileModal" title="Expediente del Alumno" size="lg">
      <div v-if="isLoadingProfile" class="exec-loader py-5">
        <div class="loader-ring"></div>
        <p class="text-muted small mt-2 fw-600">Cargando expediente...</p>
      </div>
      <div v-else-if="selectedStudent" class="px-4 py-3">

        <div class="enrollment-header mb-4">
          <div class="d-flex align-items-center gap-3">
            <div class="lead-avatar shadow-sm" style="width:50px; height:50px; font-size:20px;">
              <i class="fa-regular fa-user"></i>
            </div>
            <div>
              <h5 class="fw-700 text-dark mb-1">{{ selectedStudent.full_name }}</h5>
              <div class="text-muted small">
                <span class="me-3"><i class="fa-solid fa-envelope me-1"></i> {{ selectedStudent.email }}</span>
                <span><i class="fa-solid fa-phone me-1"></i> {{ selectedStudent.phone }}</span>
              </div>
            </div>
          </div>
          <span v-if="selectedStudent.membership_tier_name" class="pill border pill-amber" style="font-size: 12px;">
            <i class="fa-solid fa-crown me-1"></i> {{ selectedStudent.membership_tier_name }}
          </span>
        </div>

        <div class="row g-4">
          <div class="col-md-6 border-end pe-4">
            <h6 class="fieldset-title text-primary"><i class="fa-solid fa-graduation-cap me-1"></i> Programas Matriculados</h6>
            <div v-if="selectedStudent.programs && selectedStudent.programs.length" class="student-scroll-area">
              <div v-for="(prog, idx) in selectedStudent.programs" :key="idx" class="finance-card mb-2 p-3">
                <div class="fw-700 text-dark" style="font-size: 13px;">{{ prog.program_name }}</div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                  <span class="pill pill-slate" style="font-size: 9px;">{{ prog.modality }}</span>
                  <span class="small fw-600" :class="prog.certificate_status === 'EMITIDO' ? 'text-success' : 'text-muted'">
                    <i class="fa-solid fa-certificate me-1"></i> {{ prog.certificate_status }}
                  </span>
                </div>
              </div>
            </div>
            <p v-else class="text-muted small italic">No registra programas en la ODS.</p>
          </div>

          <div class="col-md-6 ps-3">
            <h6 class="fieldset-title text-amber"><i class="fa-solid fa-ticket me-1"></i> Historial con el Bot</h6>
            <div v-if="selectedStudent.tickets && selectedStudent.tickets.length" class="student-scroll-area">
              <div v-for="(tick, idx) in selectedStudent.tickets" :key="idx" class="file-item mb-2" style="padding: 8px 12px;">
                <div class="d-flex flex-column w-100">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-700 text-mono accent-text" style="font-size: 12px;">{{ tick.ticket_number }}</span>
                    <span class="pill" :class="tick.status === 'SOLUCIONADO' ? 'pill-teal' : 'pill-amber'" style="font-size: 9px;">{{ tick.status }}</span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mt-1">
                    <span class="text-dark small fw-600">{{ tick.tipo.replace(/_/g, ' ') }}</span>
                    <span class="text-muted x-small">{{ tick.created_at_fmt }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-muted small italic">No ha generado tickets previos.</p>
          </div>
        </div>

      </div>
      <template #footer>
        <div class="d-flex justify-content-end w-100">
          <button class="ep-btn-control" @click="showProfileModal = false">Cerrar</button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, onActivated, inject } from 'vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseModal from '@/components/BaseModal.vue'
import { ServiceKeys } from '@/services'

const botService = inject(ServiceKeys.Bot)

const students = ref([])
const isLoading = ref(false)
const pagin = ref({ size: 25, page: 1, total: 0 })
const filters = reactive({ q: '' })

const showProfileModal = ref(false)
const isLoadingProfile = ref(false)
const selectedStudent = ref(null)

let searchTimer = null
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagin.value.page = 1
    fetchStudents()
  }, 400)
}

async function fetchStudents() {
  isLoading.value = true
  try {
    const tableResp = await botService.botStudentList({
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size
    })
    students.value = tableResp.items || []
    pagin.value.total = tableResp.total || 0
  } catch (error) {
    console.error("Error al obtener alumnos", error)
  } finally {
    isLoading.value = false
  }
}

async function openStudentProfile(id) {
  showProfileModal.value = true
  isLoadingProfile.value = true
  selectedStudent.value = null
  try {
    const { data } = await botService.botStudentGet({ id })
    selectedStudent.value = data
  } catch (error) {
    console.error("Error al cargar perfil", error)
  } finally {
    isLoadingProfile.value = false
  }
}

onActivated(() => {
  fetchStudents()
})
</script>

<style scoped>
.bot-tab { display: flex; flex-direction: column; gap: 14px; }

/* === Filter bar (estilo Leads) === */
.ep-section { background: transparent; border: none; padding: 0; margin: 0; }
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
.ep-filter-bar-controls .filter-search-wrap.grow,
.ep-filter-bar-controls .filter-search-wrap.grow .filter-input { flex: 1 1 280px; min-width: 280px; }

.ep-section-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 600; color: var(--e-text, #14140F);
}
.ep-section-eyebrow i { color: var(--e-accent, #10B981); font-size: 12px; }

.ep-btn-control {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; font-size: 12.5px; font-weight: 600;
  color: var(--e-text, #14140F); background: #fff;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  cursor: pointer; transition: all .2s ease; font-family: inherit;
}
.ep-btn-control:hover { border-color: var(--e-border-strong, #D4D4CC); background: var(--e-bg-subtle, #FAFAF8); }
.ep-btn-control i { font-size: 11px; }

/* === Filtros de búsqueda === */
.filter-search-wrap { position: relative; display: flex; align-items: center; }
.filter-icon { position: absolute; left: 9px; color: var(--e-text-muted, #A0A099); font-size: 11px; pointer-events: none; z-index: 1; }
.filter-input {
  height: 34px; padding: 0 10px 0 28px;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  background: #fff; font-size: 12px; font-family: inherit;
  color: var(--e-text, #14140F); outline: none;
  transition: border-color .15s, box-shadow .15s;
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

.td-a { border-left: 1px solid transparent; }

.text-center { text-align: center; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--e-text-muted, #A0A099); }
.text-dark { color: var(--e-text, #14140F); }
.text-success { color: #059669; }
.text-amber { color: #d97706; }
.text-primary { color: #2563eb; }
.accent-text { color: #047857; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: #f1f5f9; color: #475569; border-color: #e2e8f0 !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }

.empty-state { padding: 40px; text-align: center; color: var(--e-text-muted, #A0A099); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--e-text-muted, #A0A099); }
.empty-state p { margin: 0; }

.fieldset-title {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: .06em; color: var(--e-text-secondary, #6F6F66);
  font-weight: 700; margin-bottom: 14px;
  border-bottom: 1px solid var(--e-border, #E8E8E3);
  padding-bottom: 6px;
}

/* === Modal — Expediente === */
.enrollment-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; background: #fff;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 10px;
}
.lead-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--e-accent-soft, #ECFDF4); color: var(--e-accent, #10B981);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; border: 1px solid rgba(16, 185, 129, 0.25); flex-shrink: 0;
}
.finance-card {
  background: var(--e-bg-subtle, #FAFAF8);
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
}
.file-item {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
}

.student-scroll-area { max-height: 320px; overflow-y: auto; padding-right: 4px; }
.student-scroll-area::-webkit-scrollbar { width: 4px; }
.student-scroll-area::-webkit-scrollbar-track { background: transparent; }
.student-scroll-area::-webkit-scrollbar-thumb { background: var(--e-border-strong, #D4D4CC); border-radius: 4px; }

/* === Loader === */
.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 16px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--e-border, #E8E8E3); border-top-color: var(--e-accent, #10B981); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* === Skeleton === */
.skel-row td { background: var(--e-bg-subtle, #FAFAF8) !important; }
.skel { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 768px) {
  .ep-filter-bar-main { flex-direction: column; align-items: stretch; }
  .ep-toolbar { justify-content: flex-end; }
  .filter-input { width: 100% !important; }
}

/* === Dark mode === */
[data-coreui-theme="dark"] .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-filter-bar-controls { background: #1F1F1A; border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .ep-btn-control { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-input { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .table-shell,
[data-coreui-theme="dark"] .enrollment-header,
[data-coreui-theme="dark"] .file-item { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .finance-card { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .tbody-row td { color: #E4E4DD; border-bottom-color: #2A2A22; background: #1A1A14; }
[data-coreui-theme="dark"] .tbody-row:hover td { background: #232319; }
[data-coreui-theme="dark"] .text-dark { color: #F4F4F0; }
</style>
