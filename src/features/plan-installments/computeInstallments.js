// Calculo puro del plan de cuotas: numero de cuotas, fechas clave, plan automatico,
// saldo, composicion con reserva diferida y validacion. Extraido verbatim de los
// computeds de useLeadForm para poder testear la matematica de dinero/fechas sin
// reactividad. El caller decide cuando aplicarlo (isInstallmentMode).

export function round2 (num) {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

// Numero de cuotas sugerido segun tipo de programa, sesiones/semana e hijos.
export function autoNumCuotas ({ categoryAlias, sessionsPerWeek = 1, countChildren = 0 } = {}) {
  const spw = sessionsPerWeek || 1
  if (['we_program_type_course', 'we_program_type_minicourse'].includes(categoryAlias)) return 1
  if (categoryAlias === 'we_program_type_pee') return spw >= 2 ? 2 : 3
  if (categoryAlias === 'we_program_type_diploma') return spw >= 2 ? 4 : 5
  if (categoryAlias === 'we_program_type_specialization') {
    if (countChildren <= 2) return 2
    return spw >= 2 ? 2 : 3
  }
  return 1
}

// Primera fecha >= afterDate que caiga en uno de los dias clave (1/15/30).
export function snapToKeyDate (afterDate, keys = [1, 15, 30]) {
  const min = new Date(afterDate)
  min.setHours(0, 0, 0, 0)
  for (let mo = 0; mo <= 4; mo++) {
    const year = min.getFullYear()
    const month = min.getMonth() + mo
    for (const k of keys) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const day = Math.min(k, daysInMonth)
      const candidate = new Date(year, month, day)
      candidate.setHours(0, 0, 0, 0)
      if (candidate >= min) return candidate
    }
  }
  return min
}

// Plan automatico de cuotas (montos + fechas). Verbatim del computed
// autoInstallmentPlan, sin el guard isInstallmentMode (lo decide el caller).
export function buildAutoInstallmentPlan ({ totalAmount, savedMoney, numCuotas, editionStartDate, sessionsPerWeek = 1, categoryAlias } = {}) {
  const saldo = round2((Number(totalAmount) || 0) - (Number(savedMoney) || 0))
  const n = numCuotas
  const startRaw = editionStartDate
  const isEsp = categoryAlias === 'we_program_type_specialization'
  const isCourse = ['we_program_type_course', 'we_program_type_minicourse'].includes(categoryAlias)
  if (saldo <= 0 || n < 1) return []
  const cuotaBase = Math.floor(saldo / n)
  const remainder = round2(saldo - cuotaBase * n)
  const base = startRaw ? new Date(String(startRaw).slice(0, 10) + 'T00:00:00') : new Date()
  const plan = []

  if (isCourse) {
    const d = new Date(base); d.setDate(d.getDate() + 6)
    plan.push({ installment_number: 1, amount: round2(cuotaBase + remainder), due_date: d.toISOString().slice(0, 10) })
    return plan
  }

  if (isEsp) {
    if (sessionsPerWeek >= 2) {
      const f1 = new Date(base); f1.setDate(f1.getDate() + 15)
      for (let i = 0; i < n; i++) {
        const d = new Date(f1); d.setDate(d.getDate() + i * 20)
        plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
      }
      return plan
    }
    const minC1 = new Date(base); minC1.setDate(minC1.getDate() + 7)
    const d1 = snapToKeyDate(minC1, [1, 15, 30])
    const minC2 = new Date(d1); minC2.setDate(minC2.getDate() + 14)
    const d2 = snapToKeyDate(minC2, [1, 15])
    const minC3 = new Date(d2); minC3.setDate(minC3.getDate() + 14)
    const d3 = snapToKeyDate(minC3, [1, 15, 30])
    const keyDates = [d1, d2, d3]
    for (let i = 0; i < n; i++) {
      plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: keyDates[i].toISOString().slice(0, 10) })
    }
    return plan
  }

  if (sessionsPerWeek >= 2) {
    const f1 = new Date(base); f1.setDate(f1.getDate() + 15)
    for (let i = 0; i < n; i++) {
      const d = new Date(f1); d.setDate(d.getDate() + i * 20)
      plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
    }
  } else {
    const f1 = new Date(base); f1.setMonth(f1.getMonth() + 1); f1.setDate(15)
    for (let i = 0; i < n; i++) {
      let d
      if (i === 0) { d = new Date(f1) } else { d = new Date(f1); d.setMonth(d.getMonth() + i); d.setDate(1) }
      plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
    }
  }
  return plan
}

// Saldo a financiar tras el adelanto efectivo (reserva inmediata si hay split,
// si no el adelanto completo).
export function installmentRemainder ({ totalAmount, savedMoney, reservaSplitEnabled, reservaInmediata } = {}) {
  const adelantoEfectivo = reservaSplitEnabled ? (Number(reservaInmediata) || 0) : (Number(savedMoney) || 0)
  const rem = round2((Number(totalAmount) || 0) - adelantoEfectivo)
  return rem > 0 ? rem : 0
}

// Compone el plan visible: agrega la cuota de reserva diferida (si aplica) y
// reordena por fecha, renumerando. Verbatim del computed installmentPlan.
export function composeInstallmentPlan ({ basePlan, reservaSplitEnabled, reservaDiferida, reservaDiferidaFecha } = {}) {
  const withIdx = (basePlan || []).map((c, i) => ({ ...c, _editableIdx: i }))
  if (!reservaSplitEnabled || reservaDiferida <= 0 || !reservaDiferidaFecha) return withIdx
  const extraCuota = {
    installment_number: 0, amount: reservaDiferida,
    due_date: reservaDiferidaFecha, is_reserva_diferida: true, _editableIdx: -1
  }
  return [...withIdx, extraCuota]
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
    .map((c, i) => ({ ...c, installment_number: i + 1 }))
}

export function installmentTotalSum (plan) {
  return round2((plan || []).reduce((acc, c) => acc + Number(c.amount || 0), 0))
}

export function isInstallmentPlanValid ({ plan, remainder } = {}) {
  if (!plan || plan.length === 0) return true
  return Math.abs(installmentTotalSum(plan) - remainder) < 0.01
}

// Cuotas editables sembradas: montos equiparados (ultima absorbe el resto) con
// las fechas del plan automatico. Verbatim de seedEditableInstallments.
export function seedEditablePlan ({ totalAmount, savedMoney, n, autoPlan = [] } = {}) {
  const saldo = round2((Number(totalAmount) || 0) - (Number(savedMoney) || 0))
  if (saldo <= 0 || n < 1) return []
  const cuotaBase = Math.floor(saldo / n)
  const rem = round2(saldo - cuotaBase * n)
  return Array.from({ length: n }, (_, i) => {
    let dueDate
    if (autoPlan[i]?.due_date) {
      dueDate = autoPlan[i].due_date
    } else {
      const lastDate = autoPlan[autoPlan.length - 1]?.due_date
      const base = lastDate ? new Date(lastDate + 'T00:00:00') : new Date()
      base.setMonth(base.getMonth() + (i - autoPlan.length + 1)); base.setDate(1)
      dueDate = base.toISOString().slice(0, 10)
    }
    return { installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase, due_date: dueDate }
  })
}

// Recalcula los montos del plan manual conservando fechas (la ultima absorbe el
// resto). Devuelve la lista intacta si no hay saldo/cuotas. Verbatim de la rama
// manualMode del watcher de installmentRemainder.
export function recalcManualAmounts ({ totalAmount, savedMoney, installments, numCuotasManual } = {}) {
  const list = installments || []
  const saldo = round2((Number(totalAmount) || 0) - (Number(savedMoney) || 0))
  const n = list.length || numCuotasManual
  if (saldo <= 0 || n < 1) return list
  const cuotaBase = Math.floor(saldo / n)
  const rem = round2(saldo - cuotaBase * n)
  return list.map((c, i) => ({ ...c, amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase }))
}
