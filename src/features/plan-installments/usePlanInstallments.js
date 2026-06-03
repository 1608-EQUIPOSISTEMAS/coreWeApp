import { ref, computed, watch } from 'vue'
import {
  autoNumCuotas,
  buildAutoInstallmentPlan,
  installmentRemainder as calcRemainder,
  composeInstallmentPlan,
  installmentTotalSum as calcTotalSum,
  seedEditablePlan,
  recalcManualAmounts,
  round2
} from './computeInstallments.js'

// Plan de cuotas (auto/manual) + reserva split. Espejo de la logica de cuotas de
// useLeadForm: el calculo vive en computeInstallments (puro) y aqui se cablea a la
// reactividad. isInstallmentMode se inyecta (depende de la deteccion de canal, fuera
// del alcance de esta feature).
//
// form, insc: objetos reactivos. deps: { isInstallmentMode: Ref<boolean>, toast }
export function usePlanInstallments (form, insc, deps = {}) {
  const { isInstallmentMode, toast } = deps

  const manualMode = ref(false)
  const numCuotasManual = ref(1)
  const editableInstallments = ref([])
  const reservaSplitEnabled = ref(false)
  const reservaInmediata = ref(0)
  const reservaDiferidaFecha = ref('')

  const autoNum = computed(() => autoNumCuotas({
    categoryAlias: form.category_alias,
    sessionsPerWeek: form.program_sessions_per_week,
    countChildren: form.count_children
  }))

  const remainder = computed(() => calcRemainder({
    totalAmount: insc.total_amount,
    savedMoney: insc.saved_money,
    reservaSplitEnabled: reservaSplitEnabled.value,
    reservaInmediata: reservaInmediata.value
  }))

  const autoPlan = computed(() => {
    if (!isInstallmentMode?.value) return []
    return buildAutoInstallmentPlan({
      totalAmount: insc.total_amount,
      savedMoney: insc.saved_money,
      numCuotas: autoNum.value,
      editionStartDate: form.edition_start_date,
      sessionsPerWeek: form.program_sessions_per_week,
      categoryAlias: form.category_alias
    })
  })

  const reservaDiferida = computed(() =>
    round2(Math.max(0, (Number(insc.saved_money) || 0) - (Number(reservaInmediata.value) || 0)))
  )

  const reservaSplitValid = computed(() =>
    !reservaSplitEnabled.value ||
    (Number(reservaInmediata.value) > 0 && reservaDiferida.value > 0 && !!reservaDiferidaFecha.value)
  )

  const installmentPlan = computed(() => composeInstallmentPlan({
    basePlan: manualMode.value ? editableInstallments.value : autoPlan.value,
    reservaSplitEnabled: reservaSplitEnabled.value,
    reservaDiferida: reservaDiferida.value,
    reservaDiferidaFecha: reservaDiferidaFecha.value
  }))

  const installmentTotalSum = computed(() => calcTotalSum(installmentPlan.value))

  const installmentPlanValid = computed(() => {
    if (!isInstallmentMode?.value || installmentPlan.value.length === 0) return true
    return Math.abs(installmentTotalSum.value - remainder.value) < 0.01
  })

  function defaultDiferidaFecha () {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }

  function seedEditableInstallments (n) {
    editableInstallments.value = seedEditablePlan({
      totalAmount: insc.total_amount,
      savedMoney: insc.saved_money,
      n,
      autoPlan: autoPlan.value
    })
  }

  function toggleManualMode () {
    if (!manualMode.value) {
      numCuotasManual.value = autoNum.value
      seedEditableInstallments(numCuotasManual.value)
      manualMode.value = true
    } else {
      manualMode.value = false
      editableInstallments.value = []
    }
  }

  function onNumCuotasManualChange () {
    const n = Math.min(Math.max(Number(numCuotasManual.value) || 1, 1), 12)
    numCuotasManual.value = n
    seedEditableInstallments(n)
  }

  function updateEditableAmount (idx, val) {
    if (editableInstallments.value[idx]) editableInstallments.value[idx].amount = Number(val) || 0
  }

  function updateEditableDate (idx, val) {
    if (editableInstallments.value[idx]) editableInstallments.value[idx].due_date = val
  }

  if (isInstallmentMode) {
    watch(isInstallmentMode, (val) => {
      if (!val) {
        manualMode.value = false; editableInstallments.value = []
        reservaSplitEnabled.value = false; reservaInmediata.value = 0; reservaDiferidaFecha.value = ''
      }
    })
  }

  watch(reservaInmediata, () => {
    if (reservaSplitEnabled.value && Number(reservaInmediata.value) >= Number(insc.saved_money)) {
      reservaInmediata.value = Math.max(0, Number(insc.saved_money) - 1)
    }
  })

  watch(reservaSplitEnabled, (val) => {
    if (val) {
      reservaInmediata.value = 0
      reservaDiferidaFecha.value = defaultDiferidaFecha()
    } else {
      reservaInmediata.value = 0; reservaDiferidaFecha.value = ''
    }
  })

  watch(() => insc.saved_money, (val) => {
    if (reservaSplitEnabled.value && Number(reservaInmediata.value) > Number(val)) {
      reservaInmediata.value = Number(val)
    }
  })

  // Recalcula montos del plan manual cuando cambia el saldo, conservando fechas.
  watch(remainder, () => {
    if (!manualMode.value) return
    const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
    const n = editableInstallments.value.length || numCuotasManual.value
    if (saldo <= 0 || n < 1) return
    editableInstallments.value = recalcManualAmounts({
      totalAmount: insc.total_amount,
      savedMoney: insc.saved_money,
      installments: editableInstallments.value,
      numCuotasManual: numCuotasManual.value
    })
    toast?.warning('⚠️ Los montos del plan se recalcularon automáticamente. Las fechas que editaste se conservaron.', { timeout: 5000 })
  })

  return {
    manualMode,
    numCuotasManual,
    editableInstallments,
    reservaSplitEnabled,
    reservaInmediata,
    reservaDiferidaFecha,
    autoNum,
    remainder,
    autoPlan,
    reservaDiferida,
    reservaSplitValid,
    installmentPlan,
    installmentTotalSum,
    installmentPlanValid,
    toggleManualMode,
    onNumCuotasManualChange,
    updateEditableAmount,
    updateEditableDate,
    seedEditableInstallments
  }
}
