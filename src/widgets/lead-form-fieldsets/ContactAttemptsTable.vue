<template>
  <!-- Edita en sitio los items del arreglo `contactos` recibido por prop: mutacion
       de dos vias intencional, espejo del god component. -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-4">
    <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
      <h6 class="fieldset-title mb-0 border-0 pb-0"><i class="fa-solid fa-phone-volume me-2 text-warning"></i> Seguimiento / Intentos de Contacto</h6>
      <button type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="emit('add-attempt')">
        <i class="fa-solid fa-plus me-1"></i> Añadir intento
      </button>
    </div>

    <div class="attempt-head d-none d-lg-grid mb-2">
      <div class="text-center">#</div>
      <div>Tipo / Origen</div> <div>Fecha y Hora <span class="c-red">*</span></div>
      <div>T. Respuesta</div>
      <div>Observación</div>
      <div></div>
    </div>

    <div v-for="(c, idx) in contactos" :key="c.id || idx" class="attempt-row">
      <div class="attempt-row__num">
        <span class="d-lg-none me-1 text-muted" style="font-size:.75rem">Intento</span>
        <strong>{{ idx + 1 }}</strong>
      </div>

      <div class="attempt-row__type">
        <label class="exec-label d-lg-none">Tipo / Origen</label>
        <SearchSelect
          v-model="c.cat_type_attempt"
          :items="lAttempts"
          label-field="description"
          value-field="alias"
          placeholder="TIPO..."
          class="exec-select-light w-100"
          :disabled="!!c.id"
          @update:model-value="(val) => emit('type-change', c, val)"
        />

        <template v-if="c.id">
          <div class="mt-2 text-truncate" style="font-size: 10px;">
            <span
              class="pill border w-100 justify-content-center"
              :class="c.cat_creation_origin_alias === 'we_origin_manual' ? 'pill-slate' : 'pill-amber'"
              :title="c.cat_creation_origin_label || 'Gestión Manual'"
            >
              <i class="fa-solid me-1" :class="c.cat_creation_origin_alias === 'we_origin_manual' ? 'fa-user-pen' : 'fa-robot'"></i>
              {{ c.cat_creation_origin_label || 'Gestión Manual' }}
            </span>
          </div>

          <div v-if="c.calling_alias === 'we_calling_pending' && isLiderComercial" class="mt-2">
            <button
              type="button"
              class="btn-exec btn-exec-outline btn-exec-sm w-100"
              :class="c.cat_reschedule_origin ? 'btn-exec-active' : ''"
              @click="emit('toggle-reschedule', c)"
              title="Reprogramar fecha de esta llamada"
            >
              <i class="fa-solid fa-calendar-pen me-1"></i>
              {{ c.cat_reschedule_origin ? 'Reprogramación activa' : 'Reprogramar' }}
            </button>
          </div>

          <div v-if="c.was_rescheduled && !c.cat_reschedule_origin" class="mt-1" style="font-size:10px;">
            <span class="pill pill-amber border w-100 justify-content-center">
              <i class="fa-solid fa-calendar-pen me-1"></i> Reprogramado
            </span>
          </div>
        </template>

        <template v-else>
          <div class="mt-2 text-truncate text-center" style="font-size: 10px;">
            <span class="text-muted"><i class="fa-solid fa-asterisk me-1"></i>Nuevo (Manual)</span>
          </div>
        </template>

        <div class="attempt-timer mt-2" v-if="c.cat_type_attempt === 'we_attempt_call'">
          <button
            type="button"
            class="timer-btn"
            :class="c.timerActive ? 'timer-btn--stop' : 'timer-btn--start'"
            @click="emit('toggle-timer', c)"
            :disabled="!!c.id && c.calling_alias !== 'we_calling_pending'"
            :title="c.timerActive ? 'Detener' : 'Iniciar'"
          >
            <i class="fa-solid" :class="c.timerActive ? 'fa-stop' : 'fa-play'"></i>
          </button>
          <span class="timer-display" :class="c.timerActive ? 'timer-display--active' : ''">
            {{ formatDuration(c.contact_duration) }}
          </span>
        </div>
      </div>

      <div class="attempt-row__date">
        <DateTime12
          v-model="c.fechaContactoProximo"
          required
          clearable
          :onlyHours="true"
          :disabled="c.calling_alias != 'we_calling_pending' && !c.cat_reschedule_origin"
          :config="!c.id && minDateForNewAttempt ? { minDate: minDateForNewAttempt } : futureDateConfig"
        />
      </div>

      <div class="attempt-row__result">
        <label class="exec-label d-lg-none">T. Resultado</label>
        <SearchSelect
          v-if="c.cat_type_attempt === 'we_attempt_call'"
          v-model="c.calling_alias"
          :viewOpen="6"
          :items="callingCatalog"
          label-field="description"
          required
          value-field="alias"
          placeholder="T. RESPUESTA..."
          :model-label="c.calling_label"
          class="exec-select-light w-100"
          :disabled="c.calling_alias != 'we_calling_pending' && c.calling_alias != null"
        />
        <div v-else class="d-flex align-items-center h-100 text-muted small pt-2 px-1">
          <i class="fa-regular fa-paper-plane me-2"></i>
          <span>Mensaje / Gestión</span>
        </div>
      </div>

      <div class="attempt-row__obs">
        <label class="exec-label d-lg-none">Observación</label>
        <textarea
          v-model="c.respuesta"
          class="exec-textarea w-100"
          rows="2"
          placeholder="Observación..."
          :disabled="!!c.id && c.cat_type_attempt === 'we_attempt_call' && c.calling_alias !== 'we_calling_pending'"
          v-restrict="{ trim: true, max: 250 }"
        ></textarea>
      </div>

      <div class="attempt-row__del">
        <button
          v-if="!c.id"
          type="button"
          class="btn-exec btn-exec-danger-ghost btn-exec-sm w-100"
          @click="emit('remove-attempt', idx)"
        >
          <i class="fa-solid fa-trash-can"></i>
          <span class="d-lg-none ms-2">Eliminar</span>
        </button>
      </div>
    </div>

    <div v-if="contactos.length === 0" class="empty-state">
      <i class="fa-solid fa-inbox fa-2x mb-2 text-slate-300"></i>
      <p class="mb-0">No hay intentos de contacto registrados. Añade al menos uno.</p>
    </div>
  </div>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import DateTime12 from '../../components/DateTime12.vue'
import { useLeadFormatters } from '../../composables/useLeadFormatters.js'

defineProps({
  contactos: { type: Array, default: () => [] },
  lAttempts: { type: Array, default: () => [] },
  callingCatalog: { type: Array, default: () => [] },
  isLiderComercial: { type: Boolean, default: false },
  minDateForNewAttempt: { type: [Object, String, null], default: null },
  futureDateConfig: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['add-attempt', 'remove-attempt', 'toggle-timer', 'type-change', 'toggle-reschedule'])

const { formatDuration } = useLeadFormatters()
</script>
