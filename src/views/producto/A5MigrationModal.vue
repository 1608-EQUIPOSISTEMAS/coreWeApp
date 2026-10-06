<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="handleClose"
    title="Cancelar edicion y proponer destino"
    size="xl"
  >
    <div ref="migrationForm" class="a5-body" v-if="visible">
      <!-- Resumen edicion origen -->
      <div class="a5-origen">
        <i class="fa-solid fa-circle-xmark a5-origen-icono" aria-hidden="true"></i>
        <div class="a5-origen-texto">
          <div class="a5-origen-titulo">{{ origin?.global_code || '---' }} <span class="ds-pill bad">A5 (Cancelar)</span></div>
          <div class="a5-origen-sub">{{ origin?.program_name || '' }} &middot; {{ formatDate(origin?.start_date) }}</div>
        </div>
        <div class="a5-origen-conteo" v-if="enrollments.length > 0">
          <span class="a5-origen-num">{{ enrollments.length }}</span>
          <span class="a5-origen-lbl">alumnos vigentes</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="a5-skel" aria-busy="true">
        <span v-for="n in 4" :key="n" class="ds-skel"></span>
      </div>

      <!-- Error de carga. Va ANTES del estado vacio a proposito: una lista que no
           se pudo cargar NO es una lista vacia. Cuando ambos casos se veian igual,
           un fallo del endpoint mostraba "sin alumnos" y dejaba cancelar ediciones
           que si tenian gente adentro. -->
      <div v-else-if="loadError" class="ds-alert a5-error" role="alert">
        <span>
          <b>No se pudo verificar si hay alumnos.</b>
          Falló la consulta de inscripciones vigentes, así que no se puede cancelar la edición.
          Reintenta; si sigue fallando, avisa a sistemas.
        </span>
        <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="loadData">Reintentar</button>
      </div>

      <!-- Sin alumnos -->
      <p v-else-if="enrollments.length === 0" class="ds-empty ds-empty--lista">
        <b>Sin alumnos inscritos.</b> Esta edicion no tiene inscripciones vigentes. Puedes cancelarla directamente.
      </p>

      <!-- Tabla de destinos propuestos -->
      <template v-else>
        <!-- Bulk action -->
        <div class="a5-masivo">
          <div class="ds-field a5-masivo-campo">
            <label class="ds-label" for="a5-destino-masivo">Proponer la misma edicion destino para todos</label>
            <select id="a5-destino-masivo" class="ds-input" v-model="bulkTargetId" :disabled="loadingEditions">
              <option :value="null">— Seleccionar —</option>
              <option v-for="ed in availableEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
            </select>
          </div>
          <button type="button" class="btn-exec btn-exec-outline" @click="applyBulkTarget" :disabled="!bulkTargetId">Aplicar a todos</button>
        </div>

        <div class="ds-table-scroll a5-scroll">
          <table class="ds-table ds-table--densa a5-tabla">
            <thead>
              <tr>
                <th style="width:34%;">Alumno</th>
                <th style="width:22%;">Programa</th>
                <th class="a5-centro" style="width:8%;">Tipo</th>
                <th class="num" style="width:10%;">Monto pag.</th>
                <th style="width:26%;">Destino propuesto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in enrollments" :key="e.enrollment_id" :class="{ 'a5-fila-pendiente': needsTarget(e) && !selections[e.enrollment_id] }">
                <td>
                  <span class="a5-principal">{{ e.full_name }}</span>
                  <span class="a5-secundario">{{ e.document_number }}</span>
                </td>
                <td>
                  <span class="a5-principal">{{ e.program_name }}</span>
                  <span class="a5-secundario" v-if="e.is_child">
                    Hijo de {{ e.parent_program_name }} &middot; {{ e.parent_edition_code }}
                  </span>
                </td>
                <td class="a5-centro">
                  <span class="ds-pill" :class="{ info: !e.is_child }">
                    {{ e.is_child ? 'HIJO' : 'TOP' }}
                  </span>
                </td>
                <td class="num">{{ formatValue(e.amount_paid, 'monto') }}</td>
                <td>
                  <select v-if="needsTarget(e)" class="ds-input" v-model="selections[e.enrollment_id]" :aria-label="`Destino de ${e.full_name}`">
                    <option :value="null">— Seleccionar —</option>
                    <option v-for="ed in availableEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                  </select>
                  <!-- Un modulo de paquete no lleva destino propio: el caso vive en
                       su venta y mover la venta le vuelve a crear los modulos. -->
                  <span v-else class="a5-nota">Viaja con su venta del paquete</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Justificacion -->
        <div class="ds-field">
          <label class="ds-label" for="a5-justificacion">Justificacion de la cancelacion<span class="ds-req">*</span></label>
          <textarea
            id="a5-justificacion"
            v-model="justificacion"
            class="ds-input"
            rows="3"
            placeholder="Motivo de la cancelacion (lo ve Academica al contactar al alumno)..."
            required
          ></textarea>
        </div>

        <p class="ds-callout warn">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            <b>No se mueve a nadie todavia.</b> La edicion queda cancelada y sus alumnos pasan a
            <b>Academica &rsaquo; Reprogramaciones</b> con este destino marcado como propuesta de Producto.
            Academica contacta a cada alumno para confirmarlo (o cambiarlo por otra edicion, reserva de vacante
            o reembolso) y recien el <b>veredicto de FICO</b> ejecuta el movimiento, Odoo y el correo.
          </span>
        </p>
      </template>
    </div>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" @click="handleClose" :disabled="saving">Cancelar</button>
      <button
        v-if="enrollments.length === 0"
        class="btn-exec btn-exec-danger"
        type="button"
        :disabled="saving || loading || loadError"
        @click="handleSubmitEmpty"
      >
        Cancelar edicion
      </button>
      <button
        v-else
        class="btn-exec btn-exec-danger"
        type="button"
        :disabled="!canConfirm || saving"
        @click="handleSubmit"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
        {{ saving ? 'Cancelando…' : `Cancelar y derivar ${enrollments.length} a Reprogramaciones` }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { useToast } from 'vue-toastification'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import { confirmAction } from '@/composables/useConfirm'
import { formatValue } from '@/shared/lib/formatValue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  origin: { type: Object, default: null },
  a5SegmentId: { type: Number, default: null },
  userId: { type: Number, default: null }
})

const emit = defineEmits(['update:visible', 'completed'])

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

const loading = ref(false)
// Distingue "no hay alumnos" de "no pude averiguarlo": con el segundo caso la
// cancelacion queda bloqueada (ver el bloque de error en el template).
const loadError = ref(false)
const loadingEditions = ref(false)
const saving = ref(false)

const enrollments = ref([])
const availableEditions = ref([])
const selections = reactive({})
const bulkTargetId = ref(null)
const justificacion = ref('')

// Un modulo de un paquete (hijo) no lleva destino propio: su caso vive en la
// venta del paquete y mover esa venta le vuelve a crear los modulos en el
// destino. Pedirle destino aqui seria guardar una propuesta inejecutable.
function needsTarget (e) {
  return !e.is_child
}

const ventas = computed(() => enrollments.value.filter(needsTarget))

const canConfirm = computed(() => {
  if (justificacion.value.trim().length === 0) return false
  if (enrollments.value.length === 0) return false
  return ventas.value.every(e => selections[e.enrollment_id])
})

watch(() => props.visible, async (v) => {
  if (!v) return
  resetState()
  await loadData()
})

async function loadData () {
  if (!props.origin?.edition_num_id) return
  loading.value = true
  loadError.value = false
  loadingEditions.value = true
  try {
    enrollments.value = await editionService.a5PendingEnrollments(props.origin.edition_num_id)

    if (props.origin.program_version_id) {
      const eds = await editionService.editionCaller({
        program_version_id: props.origin.program_version_id,
        active: 'Y'
      })
      const today = new Date(); today.setHours(0, 0, 0, 0)
      availableEditions.value = (eds || [])
        .filter(ed => {
          if ((ed.edition_num_id || ed.id) === props.origin.edition_num_id) return false
          // Las A5 las excluye sp_edition_caller: no devuelve el segmento, asi
          // que aqui no habia forma de filtrarlas (el guard viejo nunca disparaba).
          if (!ed.start_date) return false
          const m = String(ed.start_date).match(/^(\d{4})-(\d{2})-(\d{2})/)
          if (!m) return false
          const sd = new Date(+m[1], +m[2] - 1, +m[3])
          return sd >= today
        })
        .map(ed => ({
          id: ed.edition_num_id || ed.id,
          start_date: ed.start_date,
          label: `${formatDate(ed.start_date)} — ${ed.global_code || ed.specific_code || ''}`
        }))
        .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
    }

    // Default inteligente: pre-seleccionar la edicion mas proxima
    const defaultId = availableEditions.value[0]?.id || null
    for (const e of ventas.value) {
      selections[e.enrollment_id] = defaultId
    }
  } catch (err) {
    console.error('[A5Migration] loadData error:', err)
    loadError.value = true
    enrollments.value = []
    toast.error('Error cargando datos de migracion.')
  } finally {
    loading.value = false
    loadingEditions.value = false
  }
}

function applyBulkTarget () {
  if (!bulkTargetId.value) return
  for (const e of ventas.value) {
    selections[e.enrollment_id] = bulkTargetId.value
  }
}

function resetState () {
  enrollments.value = []
  loadError.value = false
  availableEditions.value = []
  bulkTargetId.value = null
  justificacion.value = ''
  Object.keys(selections).forEach(k => delete selections[k])
}

function handleClose () {
  if (saving.value) return
  emit('update:visible', false)
}

const migrationForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(migrationForm)

// SweetAlert recibe `html` como markup: el codigo de edicion viene de la BD y
// se escapa igual, para que nunca se interprete como HTML.
function escapeHtml (value) {
  return String(value ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
}

async function handleSubmit () {
  if (!requiredFieldsFilled()) return
  if (!canConfirm.value) return
  // Doble confirmacion: cancelar a A5 no se deshace desde aqui.
  const confirmado = await confirmAction({
    title: 'Confirmar cancelacion',
    html: `Vas a marcar la edicion <b>${escapeHtml(props.origin?.global_code)}</b> como <b>A5</b> y derivar ` +
      `<b>${enrollments.value.length}</b> inscripcion(es) a Reprogramaciones con el destino propuesto.<br/><br/>` +
      'Los alumnos <b>no se mueven aun</b>: no se envia ningun correo hasta que FICO de el veredicto.',
    confirmText: 'Confirmar',
    cancelText: 'Volver',
    icon: 'warning',
    danger: true
  })
  if (confirmado) await cancelarYDerivar()
}

async function handleSubmitEmpty () {
  // Sin alumnos: solo cambia segmento a A5 directamente via editionUpdate del caller.
  // Guarda por si el boton se habilita de otra forma: sin lista confirmada no se
  // cancela nada (el backend igual lo rechaza, esto solo evita el viaje).
  if (loadError.value || loading.value) return
  emit('completed', { migrated: 0, applyA5: true })
  emit('update:visible', false)
}

async function cancelarYDerivar () {
  saving.value = true
  try {
    const payload = {
      edition_num_id: props.origin.edition_num_id,
      a5_segment_id: props.a5SegmentId,
      justificacion: justificacion.value.trim(),
      user_id: props.userId,
      migrations: ventas.value.map(e => ({
        enrollment_id: e.enrollment_id,
        target_edition_id: selections[e.enrollment_id]
      }))
    }
    const resp = await editionService.a5CancelAndHandOff(payload)
    if (resp?.result === 1) {
      toast.success(resp.message || 'Edicion cancelada y derivada a Reprogramaciones')
      emit('completed', { migrated: resp.migrated_count, applyA5: false })
      emit('update:visible', false)
    } else {
      toast.error(resp?.message || 'Error al cancelar la edicion')
    }
  } catch (err) {
    console.error('[A5Migration] handoff error:', err)
    toast.error(err?.response?.data?.message || err?.message || 'Error al cancelar la edicion')
  } finally {
    saving.value = false
  }
}

function formatDate (raw) {
  if (!raw) return '---'
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return raw
  return `${m[3]}/${m[2]}/${m[1]}`
}
</script>

<style scoped>
.a5-body { display: flex; flex-direction: column; gap: var(--ds-gap); }

/* Cabecera roja: la edicion que se va a cancelar se lee antes que la tabla. */
.a5-origen {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px 14px;
  padding: 14px 18px; border-radius: var(--ds-radius);
  background: var(--ds-soft-bad); color: var(--ds-bad-ink);
}
.a5-origen-icono { font-size: 20px; }
.a5-origen-texto { flex: 1; min-width: 0; }
.a5-origen-titulo { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 14px; font-weight: 700; }
.a5-origen-sub { margin-top: 2px; font-size: 12px; }
.a5-origen-conteo { text-align: right; }
.a5-origen-num { display: block; font-size: 22px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.a5-origen-lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; }

.a5-skel { display: flex; flex-direction: column; gap: 12px; padding: 12px 0; }

.a5-error { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 13px; font-weight: 500; }
.a5-error > span { flex: 1; min-width: 220px; }

.a5-masivo { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 10px; }
.a5-masivo-campo { flex: 1; min-width: 220px; max-width: 420px; }

/* Lista larga dentro del modal: scroll propio con cabecera fija y opaca. El
   min-width evita que los selects se aplasten a 400 px (la tabla scrollea en X). */
.a5-scroll { max-height: 380px; overflow-y: auto; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.a5-tabla { min-width: 720px; }
.a5-tabla thead th { position: sticky; top: 0; z-index: 1; background: var(--ds-surface); box-shadow: inset 0 -1px 0 var(--ds-border); }
.a5-tabla td { vertical-align: middle; }
.a5-centro { text-align: center; }

/* Venta sin destino elegido: es lo que bloquea el boton de confirmar. */
.a5-fila-pendiente td { background: var(--ds-soft-warn); }

.a5-principal { display: block; font-weight: 600; color: var(--ds-ink); }
.a5-secundario { display: block; margin-top: 1px; font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.a5-nota { font-size: 11px; font-style: italic; color: var(--ds-muted); }
</style>
