<template>
  <main class="exec-body">
    <div class="exec-toolbar mb-4">
      <div class="toolbar-pagination">
        <BasePagination v-model="pagin" @change="fetchStudents" />
      </div>
      <div class="toolbar-actions" style="width: 300px;">
        <input 
          v-model="filters.q" 
          type="text" 
          class="exec-input-light w-100" 
          placeholder="Buscar por nombre, correo o teléfono..." 
          @input="debouncedSearch"
        />
      </div>
    </div>

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
            <tr v-if="isLoading">
              <td colspan="5" class="text-center py-5"><div class="loader-ring mx-auto"></div></td>
            </tr>
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
            <div v-if="selectedStudent.programs && selectedStudent.programs.length">
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
            <div v-if="selectedStudent.tickets && selectedStudent.tickets.length">
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
          <button class="btn-exec btn-exec-outline px-4" @click="showProfileModal = false">Cerrar</button>
        </div>
      </template>
    </BaseModal>
  </main>
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

// Modal de Perfil
const showProfileModal = ref(false)
const isLoadingProfile = ref(false)
const selectedStudent = ref(null)

// Búsqueda con retardo
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

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20, 184, 166, .15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }

@media (max-width: 768px) {
  .exec-body { padding: 16px 12px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
}
.exec-body { padding: 20px 28px; }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; border: 1px solid #e0f2fe; }
.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.file-item { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
</style>