import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  autoNumCuotas, snapToKeyDate, buildAutoInstallmentPlan, installmentRemainder,
  composeInstallmentPlan, installmentTotalSum, isInstallmentPlanValid, seedEditablePlan, recalcManualAmounts
} from '../computeInstallments.js'
import { usePlanInstallments } from '../usePlanInstallments.js'

describe('autoNumCuotas', () => {
  it('curso/minicurso = 1', () => {
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_course' })).toBe(1)
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_minicourse' })).toBe(1)
  })
  it('pee: 2 si spw>=2, si no 3', () => {
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_pee', sessionsPerWeek: 2 })).toBe(2)
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_pee', sessionsPerWeek: 1 })).toBe(3)
  })
  it('diploma: 4 si spw>=2, si no 5', () => {
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_diploma', sessionsPerWeek: 2 })).toBe(4)
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_diploma', sessionsPerWeek: 1 })).toBe(5)
  })
  it('especializacion: 2 si <=2 hijos, si no depende de spw', () => {
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_specialization', countChildren: 2 })).toBe(2)
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_specialization', countChildren: 5, sessionsPerWeek: 1 })).toBe(3)
    expect(autoNumCuotas({ categoryAlias: 'we_program_type_specialization', countChildren: 5, sessionsPerWeek: 2 })).toBe(2)
  })
  it('desconocido = 1', () => {
    expect(autoNumCuotas({ categoryAlias: 'otro' })).toBe(1)
  })
})

describe('buildAutoInstallmentPlan', () => {
  it('saldo <= 0 o n < 1 devuelve []', () => {
    expect(buildAutoInstallmentPlan({ totalAmount: 100, savedMoney: 100, numCuotas: 3 })).toEqual([])
    expect(buildAutoInstallmentPlan({ totalAmount: 1000, savedMoney: 0, numCuotas: 0 })).toEqual([])
  })
  it('curso: una cuota a +6 dias con todo el saldo', () => {
    const plan = buildAutoInstallmentPlan({ totalAmount: 500, savedMoney: 0, numCuotas: 1, editionStartDate: '2026-03-01', categoryAlias: 'we_program_type_course' })
    expect(plan).toHaveLength(1)
    expect(plan[0].amount).toBe(500)
    expect(plan[0].due_date).toBe('2026-03-07')
  })
  it('equipara montos y la ultima cuota absorbe el resto (suma = saldo)', () => {
    const plan = buildAutoInstallmentPlan({ totalAmount: 1000, savedMoney: 100, numCuotas: 4, editionStartDate: '2026-03-01', sessionsPerWeek: 2, categoryAlias: 'we_program_type_diploma' })
    expect(plan).toHaveLength(4)
    const suma = plan.reduce((a, c) => a + c.amount, 0)
    expect(suma).toBe(900)
    // 900/4 = 225 exacto -> todas 225
    expect(plan.every(c => c.amount === 225)).toBe(true)
  })
  it('reparte el remanente en la ultima cuota cuando no es divisible', () => {
    const plan = buildAutoInstallmentPlan({ totalAmount: 1001, savedMoney: 0, numCuotas: 3, editionStartDate: '2026-03-01', sessionsPerWeek: 2, categoryAlias: 'we_program_type_diploma' })
    expect(plan.reduce((a, c) => a + c.amount, 0)).toBe(1001)
    expect(plan[0].amount).toBe(333)
    expect(plan[2].amount).toBe(335)
  })
})

describe('installmentRemainder', () => {
  it('sin split resta el adelanto completo', () => {
    expect(installmentRemainder({ totalAmount: 1000, savedMoney: 200 })).toBe(800)
  })
  it('con split resta solo la reserva inmediata', () => {
    expect(installmentRemainder({ totalAmount: 1000, savedMoney: 300, reservaSplitEnabled: true, reservaInmediata: 100 })).toBe(900)
  })
  it('nunca negativo', () => {
    expect(installmentRemainder({ totalAmount: 100, savedMoney: 500 })).toBe(0)
  })
})

describe('composeInstallmentPlan', () => {
  const base = [
    { installment_number: 1, amount: 300, due_date: '2026-04-15' },
    { installment_number: 2, amount: 300, due_date: '2026-05-15' }
  ]
  it('sin split devuelve el plan base con _editableIdx', () => {
    const r = composeInstallmentPlan({ basePlan: base })
    expect(r).toHaveLength(2)
    expect(r[0]._editableIdx).toBe(0)
  })
  it('con split inserta la reserva diferida ordenada por fecha y renumera', () => {
    const r = composeInstallmentPlan({ basePlan: base, reservaSplitEnabled: true, reservaDiferida: 150, reservaDiferidaFecha: '2026-04-01' })
    expect(r).toHaveLength(3)
    expect(r[0].is_reserva_diferida).toBe(true)
    expect(r.map(c => c.installment_number)).toEqual([1, 2, 3])
  })
})

describe('installmentTotalSum / isInstallmentPlanValid', () => {
  it('suma montos', () => {
    expect(installmentTotalSum([{ amount: 100 }, { amount: 50.5 }])).toBe(150.5)
  })
  it('valido si suma ~= remainder (tolerancia 0.01); vacio siempre valido', () => {
    expect(isInstallmentPlanValid({ plan: [{ amount: 800 }], remainder: 800 })).toBe(true)
    expect(isInstallmentPlanValid({ plan: [{ amount: 700 }], remainder: 800 })).toBe(false)
    expect(isInstallmentPlanValid({ plan: [], remainder: 800 })).toBe(true)
  })
})

describe('seedEditablePlan / recalcManualAmounts', () => {
  it('siembra n cuotas tomando fechas del autoPlan', () => {
    const autoPlan = [{ due_date: '2026-04-15' }, { due_date: '2026-05-15' }]
    const r = seedEditablePlan({ totalAmount: 1000, savedMoney: 100, n: 2, autoPlan })
    expect(r).toHaveLength(2)
    expect(r[0].due_date).toBe('2026-04-15')
    expect(r.reduce((a, c) => a + c.amount, 0)).toBe(900)
  })
  it('recalcManualAmounts conserva fechas y reparte el resto en la ultima', () => {
    const list = [{ due_date: 'a', amount: 0 }, { due_date: 'b', amount: 0 }, { due_date: 'c', amount: 0 }]
    const r = recalcManualAmounts({ totalAmount: 1001, savedMoney: 0, installments: list })
    expect(r.map(c => c.due_date)).toEqual(['a', 'b', 'c'])
    expect(r.reduce((a, c) => a + c.amount, 0)).toBe(1001)
  })
  it('recalcManualAmounts devuelve la lista intacta sin saldo', () => {
    const list = [{ amount: 5 }]
    expect(recalcManualAmounts({ totalAmount: 0, savedMoney: 0, installments: list })).toBe(list)
  })
})

// ── Composable ──────────────────────────────────────────────────
function setup ({ form: fOver = {}, insc: iOver = {}, isInstallmentMode = ref(true), toast } = {}) {
  const form = reactive({ category_alias: 'we_program_type_diploma', program_sessions_per_week: 2, count_children: 0, edition_start_date: '2026-03-01', ...fOver })
  const insc = reactive({ total_amount: 1000, saved_money: 100, ...iOver })
  let api
  const wrapper = mount({ setup () { api = usePlanInstallments(form, insc, { isInstallmentMode, toast }); return () => null } })
  return { form, insc, api, wrapper, isInstallmentMode }
}

describe('usePlanInstallments', () => {
  it('autoNum y autoPlan reflejan el tipo de programa', () => {
    const { api, wrapper } = setup()
    expect(api.autoNum.value).toBe(4)
    expect(api.autoPlan.value).toHaveLength(4)
    wrapper.unmount()
  })

  it('toggleManualMode siembra cuotas editables; otra vez las limpia', () => {
    const { api, wrapper } = setup()
    api.toggleManualMode()
    expect(api.manualMode.value).toBe(true)
    expect(api.editableInstallments.value).toHaveLength(4)
    api.toggleManualMode()
    expect(api.manualMode.value).toBe(false)
    expect(api.editableInstallments.value).toEqual([])
    wrapper.unmount()
  })

  it('onNumCuotasManualChange clampa entre 1 y 12', () => {
    const { api, wrapper } = setup()
    api.numCuotasManual.value = 99
    api.onNumCuotasManualChange()
    expect(api.numCuotasManual.value).toBe(12)
    api.numCuotasManual.value = 0
    api.onNumCuotasManualChange()
    expect(api.numCuotasManual.value).toBe(1)
    wrapper.unmount()
  })

  it('al salir de modo cuotas (isInstallmentMode=false) resetea todo', async () => {
    const mode = ref(true)
    const { api, wrapper } = setup({ isInstallmentMode: mode })
    api.toggleManualMode()
    api.reservaSplitEnabled.value = true
    mode.value = false
    await nextTick()
    expect(api.manualMode.value).toBe(false)
    expect(api.editableInstallments.value).toEqual([])
    expect(api.reservaSplitEnabled.value).toBe(false)
    wrapper.unmount()
  })

  it('installmentPlanValid: el plan auto cuadra con el saldo', () => {
    const { api, wrapper } = setup()
    expect(api.installmentPlanValid.value).toBe(true)
    wrapper.unmount()
  })

  it('reserva inmediata se topa por debajo del adelanto', async () => {
    const { api, insc, wrapper } = setup({ insc: { saved_money: 200, total_amount: 1000 } })
    api.reservaSplitEnabled.value = true
    await nextTick()
    api.reservaInmediata.value = 500
    await nextTick()
    expect(api.reservaInmediata.value).toBe(199)
    wrapper.unmount()
  })
})
