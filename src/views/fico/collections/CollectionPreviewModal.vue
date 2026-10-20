<template>
  <BaseModal :model-value="!!row" :title="row?.student_full_name || 'Alumno'" size="lg" @update:model-value="close">
    <template v-if="row">
      <dl class="cp-facts">
        <div><dt>Documento</dt><dd class="mono">{{ row.document_number || 'sin DNI' }}</dd></div>
        <div><dt>Celular</dt><dd class="mono">{{ row.phone || '—' }}</dd></div>
        <div><dt>Correo de registro</dt><dd>{{ row.email || '—' }}</dd></div>
        <div>
          <dt>Correo del Campus Virtual</dt>
          <dd>
            <span v-if="loading" class="ds-skel cp-skel"></span>
            <template v-else>{{ campusEmail || 'Sin acceso al campus' }}</template>
          </dd>
        </div>
        <div><dt>Programa</dt><dd>{{ row.program_name || '—' }} <span class="cp-muted">{{ row.edition_code }}</span></dd></div>
        <div><dt>Asesor</dt><dd>{{ row.seller_agent_name || '—' }}</dd></div>
      </dl>

      <div class="cp-totals">
        <div class="cp-total ok"><span>Pagado</span><strong class="mono">{{ sign }} {{ fmt.formatMoney(timeline.totals.paid) }}</strong></div>
        <div class="cp-total bad"><span>Vencido</span><strong class="mono">{{ sign }} {{ fmt.formatMoney(timeline.totals.overdue) }}</strong></div>
        <div class="cp-total"><span>Saldo pendiente</span><strong class="mono">{{ sign }} {{ fmt.formatMoney(timeline.totals.balance) }}</strong></div>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--densa">
          <thead>
            <tr>
              <th>Cuota</th>
              <th class="num">Monto</th>
              <th>Vence</th>
              <th>Estado</th>
              <th>Pagó el</th>
              <th>Medio</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 4" :key="`sk-${n}`"><td colspan="6"><span class="ds-skel"></span></td></tr>
            </template>
            <tr v-else-if="!timeline.rows.length">
              <td colspan="6" class="cp-muted">La venta no tiene cuotas registradas.</td>
            </tr>
            <tr
              v-for="c in timeline.rows"
              v-else
              :key="c.id"
              :class="{ 'is-current': c.id === row.installment_id }"
            >
              <td><strong>{{ c.label }}</strong></td>
              <td class="num mono">{{ sign }} {{ fmt.formatMoney(c.amount) }}</td>
              <td class="mono">{{ fmt.formatDate(c.due_date) }}</td>
              <td><span class="ds-pill" :class="c.tono">{{ c.stateLabel }}</span></td>
              <td class="mono">{{ c.paid_on ? fmt.formatDate(c.paid_on) : '—' }}</td>
              <td>{{ c.method || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" @click="close">Cerrar</button>
      <button class="btn-exec btn-exec-primary" type="button" @click="$emit('open-enrollment', row.enrollment_id)">
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir inscripción
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { buildInstallmentTimeline } from '@/entities/collection/collectionView.js'
import { toLocalIsoDate } from '@/shared/lib/localDate.js'

// Vista previa de Cobranzas: el estado de TODAS las cuotas de la venta y los
// datos de contacto, sin salir de la lista. A diferencia del panel de
// Inscripciones, aqui no hay acciones: para cobrar se abre la inscripcion.
const props = defineProps({
  row: { type: Object, default: null }
})
const emit = defineEmits(['close', 'open-enrollment'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()
const fmt = useEnrollmentFormatters()

const detail = ref({})
const campusEmail = ref(null)
const loading = ref(false)

const sign = computed(() => (props.row?.currency === 'USD' ? '$' : 'S/.'))
const timeline = computed(() => buildInstallmentTimeline(detail.value, toLocalIsoDate()))

watch(() => props.row?.enrollment_id, async id => {
  detail.value = {}
  campusEmail.value = null
  if (!id) return
  loading.value = true
  try {
    const [payment, flags] = await Promise.all([
      ficoService.getPaymentDetail(id),
      ficoService.getEnrollmentFlags(id)
    ])
    detail.value = payment || {}
    campusEmail.value = flags?.odoo_email || null
  } catch (err) {
    console.error('[CollectionPreviewModal]', err)
    toast.error('No se pudo cargar el detalle de cuotas.')
  } finally {
    loading.value = false
  }
}, { immediate: true })

function close () {
  emit('close')
}
</script>

<style scoped>
.cp-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px 18px; margin: 0 0 16px; }
.cp-facts dt { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ds-muted); }
.cp-facts dd { margin: 2px 0 0; color: var(--ds-ink); overflow-wrap: anywhere; }
.cp-skel { display: inline-block; width: 160px; }
.cp-muted { color: var(--ds-muted); }

.cp-totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.cp-total { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.cp-total span { font-size: 11.5px; color: var(--ds-ink-2); }
.cp-total strong { font-size: 16px; color: var(--ds-heading); }
.cp-total.ok strong { color: var(--ds-ok-ink); }
.cp-total.bad strong { color: var(--ds-bad-ink); }

tr.is-current td { background: var(--ds-soft-warn); }
.num { text-align: right; }
.mono { font-variant-numeric: tabular-nums; }
@media (max-width: 560px) { .cp-totals { grid-template-columns: 1fr; } }
</style>
