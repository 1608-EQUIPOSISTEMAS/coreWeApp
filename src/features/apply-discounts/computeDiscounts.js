// Redondeo a 2 decimales estable (mismo helper que useLeadForm).
export function round2 (num) {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

// Calcula los montos de descuento y el total a partir del precio base y los
// descuentos seleccionados (porcentaje, promo fija/stick, beneficios). Funcion
// PURA: misma matematica que el watcher profundo de useLeadForm, extraida para
// testearla sin reactividad. La regla de promo fija interpreta val_fijo como el
// precio objetivo final tras el porcentaje, no como un monto a restar.
export function computeDiscounts ({ montoOriginal, val_porcentaje, val_fijo, val_beneficios, dsct_stick_id } = {}) {
  const base = parseFloat(montoOriginal) || 0
  const montoPorcentaje = round2((base * (val_porcentaje || 0)) / 100)
  const subtotalAfterPct = round2(base - montoPorcentaje)

  let montoFijo = 0
  const promoTarget = round2(parseFloat(val_fijo) || 0)
  if (dsct_stick_id && promoTarget > 0) {
    montoFijo = round2(subtotalAfterPct - promoTarget)
    if (montoFijo < 0) montoFijo = 0
  }
  const subtotalAfterStick = (dsct_stick_id && promoTarget > 0) ? promoTarget : subtotalAfterPct

  const sumaBeneficios = round2((val_beneficios || []).reduce((acc, v) => acc + (parseFloat(v) || 0), 0))

  // Beca: cuando el porcentaje o la promo ya dejaron el saldo en cero, el
  // beneficio entra por su BADGE y no por su monto. El badge (CUENTA PERSONAL,
  // Traera laptop) es lo que avisa a Sistemas y a Logistica, y restar S/100 de
  // un saldo 0 no tiene sentido: antes eso disparaba exceedsBase y borraba toda
  // la seleccion, dejando al becado sin forma de registrar el beneficio.
  // Solo aplica con saldo exactamente 0 — si queda saldo el beneficio descuenta
  // normal y, si no cabe, exceedsBase resetea como siempre.
  const beneficiosSoloBadge = sumaBeneficios > 0 && subtotalAfterStick === 0
  const montoBeneficioTotal = beneficiosSoloBadge ? 0 : sumaBeneficios

  const totalDescuentos = round2(montoPorcentaje + montoFijo + montoBeneficioTotal)
  const exceedsBase = totalDescuentos > base

  const finalAmount = round2(subtotalAfterStick - montoBeneficioTotal)

  return {
    base,
    montoPorcentaje,
    montoFijo,
    montoBeneficioTotal,
    beneficiosSoloBadge,
    totalDescuentos,
    exceedsBase,
    // Espejo del watcher: si excede la base, el total cae a la base (y el caller
    // resetea los descuentos). Si no, se trunca a entero (Math.floor).
    total_amount: exceedsBase ? base : (finalAmount > 0 ? Math.floor(finalAmount) : 0)
  }
}
