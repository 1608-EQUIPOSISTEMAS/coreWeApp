<template>
  <!-- Edita en sitio los objetos reactivos `lead` y `attempts` recibidos por prop:
       los v-model de SearchSelect/DateTime12/textarea mutan esas estructuras, espejo
       del god component. La logica (toggleTimer/addLocalAttempt/handleTypeChange/
       saveFastFollow) vive en useLeadFollowUp; el widget solo emite. -->
  <!-- eslint-disable vue/no-mutating-props -->
  <Teleport to="body">
    <Transition name="downbar">
      <div v-if="show" class="downbar-overlay" @click.self="emit('update:show', false)">
        <div class="downbar-panel" role="dialog" aria-modal="true">
          <header class="downbar-header">
            <div class="downbar-grabber" aria-hidden="true"></div>
            <h5 class="downbar-title">Gestión de Seguimiento</h5>
            <button class="downbar-close" @click="emit('update:show', false)" title="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div class="downbar-body" v-if="lead">
            <div class="modal-lead-strip">
              <div class="d-flex align-items-center gap-3">
                <div class="lead-avatar"><i class="fa-regular fa-user"></i></div>
                <div>
                  <h6 class="mb-0 fw-700 text-dark">{{ lead.full_name_label || 'Prospecto sin nombre' }}</h6>
                  <div class="d-flex gap-3 text-secondary small mt-1 fw-500 align-items-center">
                    <span><i class="fa-solid fa-phone me-1"></i>{{ lead.origin_phone }}</span>

                    <div class="d-flex align-items-center">
                      <i class="fa-solid fa-bullseye me-2"></i>
                      <SearchSelect
                        v-model="lead.cat_status_alias"
                        :items="pipeline"
                        label-field="description"
                        value-field="alias"
                        placeholder="Cambiar estado..."
                        class="exec-select-light"
                        style="min-width: 160px; height: 32px;"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button class="btn-exec btn-exec-primary" @click="emit('add-attempt')">
                <i class="fa-solid fa-plus me-1"></i> Nuevo Intento
              </button>
            </div>
            <div v-if="isLoading" class="exec-loader py-4">
              <div class="loader-ring"></div>
              <p class="text-muted small mt-2 fw-600">Cargando historial...</p>
            </div>
            <div v-else class="p-3 scroll-area">
              <div v-if="attempts.length > 0" class="table-shell" style="overflow-x: auto;">
                <table class="exec-table" style="min-width: 1100px;">
                  <thead>
                    <tr class="thead-sub">
                      <th class="ts ts-c text-center" style="width: 46px;">#</th>
                      <th class="ts ts-c" style="min-width: 175px;">Tipo / Origen</th>
                      <th class="ts ts-c" style="min-width: 155px;">Resultado</th>
                      <th class="ts ts-c" style="min-width: 280px;">Fecha / Hora</th>
                      <th class="ts ts-c text-center" style="min-width: 130px;">Duración</th>
                      <th class="ts ts-c" style="min-width: 190px;">Observación</th>
                      <th class="ts ts-c" style="min-width: 150px;">Registrado por</th>
                      <th class="ts ts-c" style="min-width: 150px;">Modificado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(attempt, idx) in attempts" :key="idx" class="tbody-row" :class="{ 'row-highlight': !attempt.id }">
                      <td class="td-a text-center fw-700 text-muted align-top pt-3">{{ attempt.attempt_number ?? '—' }}</td>
                      <td class="td-a align-top pt-2" style="min-width: 230px;">
                        <SearchSelect :items="lAttempts" v-model="attempt.cat_type_attempt" label-field="description" value-field="alias" placeholder="Seleccionar..." :disabled="attempt.id" class="exec-select-light w-100" required @update:model-value="(val) => emit('type-change', attempt, val)" />
                        <div v-if="attempt.id" class="mt-2 text-truncate" style="font-size: 10px;">
                          <span class="pill border w-100 justify-content-center" :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'pill-slate' : 'pill-amber'" :title="attempt.cat_creation_origin_label || 'Gestión Manual'">
                            <i class="fa-solid me-1" :class="attempt.cat_creation_origin_alias === 'we_origin_manual' ? 'fa-user-pen' : 'fa-robot'"></i>
                            {{ attempt.cat_creation_origin_label || 'Gestión Manual' }}
                          </span>
                        </div>
                        <div v-else class="mt-2 text-truncate text-center" style="font-size: 10px;">
                          <span class="text-muted"><i class="fa-solid fa-asterisk me-1"></i>Nuevo (Manual)</span>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2" style="min-width: 230px;">
                        <SearchSelect v-if="attempt.cat_type_attempt === 'we_attempt_call'" v-model="attempt.calling_alias" :items="callingByType(attempt.cat_type_attempt)" label-field="description" value-field="alias" placeholder="Seleccionar..." :disabled="attempt.calling_alias !== 'we_calling_pending' && attempt.calling_alias" class="exec-select-light w-100" />
                        <div v-else class="d-flex align-items-center h-100 text-muted small pt-2 px-1">
                          <i class="fa-regular fa-paper-plane me-2"></i>
                          <span>Mensaje / Gestión</span>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <DateTime12 v-model="attempt.contact_datetime" :onlyHours="true" :disabled="!!attempt.id && (attempt.calling_alias !== 'we_calling_pending' || !hasRole(['LIDER_COMERCIAL']))" :config="!attempt.id && minDate ? { minDate: minDate } : {}" />
                      </td>
                      <td class="td-a align-top text-center pt-2">
                        <div class="d-flex align-items-center justify-content-center gap-2" v-if="attempt.cat_type_attempt == 'we_attempt_call'">
                          <button class="timer-btn" :class="attempt.timerActive ? 'timer-btn--stop' : 'timer-btn--start'" @click="emit('toggle-timer', attempt)" :disabled="!!attempt.id && attempt.calling_alias !== 'we_calling_pending'" :title="attempt.timerActive ? 'Detener cronómetro' : 'Iniciar cronómetro'">
                            <i class="fa-solid" :class="attempt.timerActive ? 'fa-stop' : 'fa-play'"></i>
                          </button>
                          <div class="text-mono fw-700 timer-display" :class="attempt.timerActive ? 'timer-display--active' : ''">{{ formatDuration(attempt.contact_duration) }}</div>
                        </div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <textarea v-model="attempt.response" class="exec-textarea w-100" rows="2" placeholder="Escribe una observación..." :disabled="!!attempt.id && attempt.cat_type_attempt === 'we_attempt_call' && attempt.calling_alias !== 'we_calling_pending'"></textarea>
                      </td>
                      <td class="td-a align-top pt-2">
                        <div v-if="attempt.user_registration_label" class="small fw-600 text-dark">{{ attempt.user_registration_label }}</div>
                        <div class="text-muted x-small">{{ attempt.registration_date_fmt || '—' }}</div>
                      </td>
                      <td class="td-a align-top pt-2">
                        <div v-if="attempt.user_modification_label" class="small fw-600 text-dark">{{ attempt.user_modification_label }}</div>
                        <div class="text-muted x-small">{{ attempt.modification_date_fmt || '—' }}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <p>No hay historial previo. Agrega el primer intento.</p>
              </div>
            </div>
          </div>

          <footer class="downbar-footer">
            <button class="btn-exec btn-exec-outline" @click="emit('update:show', false)">Cancelar</button>
            <button class="btn-exec btn-exec-success" @click="emit('save')" :disabled="isSaving">
              <i class="fa-solid fa-save me-1"></i>
              {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import DateTime12 from '../../components/DateTime12.vue'

defineProps({
  show: { type: Boolean, default: false },
  lead: { type: Object, default: null },
  attempts: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  pipeline: { type: Array, default: () => [] },
  lAttempts: { type: Array, default: () => [] },
  callingByType: { type: Function, default: () => [] },
  minDate: { type: [Date, Number, String], default: null },
  hasRole: { type: Function, default: () => false }
})

const emit = defineEmits([
  'update:show',
  'add-attempt',
  'remove-attempt',
  'toggle-timer',
  'type-change',
  'save'
])

// Formato de visualizacion del cronometro (mm:ss). Solo presentacion, sin estado.
function formatDuration (seconds) {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
</script>
