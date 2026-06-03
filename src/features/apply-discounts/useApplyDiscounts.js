import { watch } from 'vue'
import { computeDiscounts } from './computeDiscounts.js'

// Aplicacion de descuentos a la inscripcion (porcentaje + promo fija + beneficios).
// Espejo de los handlers onChangeDescuento*/onChangeBeneficios y del watcher profundo
// de useLeadForm. El calculo vive en computeDiscounts (puro); aqui se cablea a la
// reactividad y se aplica sobre el objeto reactivo `insc`.
//
// insc: objeto reactivo de inscripcion.
// deps: { toast, discountResetKey }  (toast para avisar exceso; resetKey para forzar
//        re-render de los selects de descuento al limpiarlos)
export function useApplyDiscounts (insc, deps = {}) {
  const { toast, discountResetKey } = deps

  function onChangeDescuentoPorcentual (opt) {
    if (!opt) { insc.val_porcentaje = 0; insc.dsct_porcent_label = null; return }
    insc.val_porcentaje = Number(opt.value) || 0
    insc.dsct_porcent_label = opt.full_label || opt.label || null
  }

  function onChangeDescuentoFijo (opt) {
    if (!opt) { insc.val_fijo = 0; insc.dsct_stick_label = null; return }
    insc.val_fijo = Number(opt.value) || 0
    insc.dsct_stick_label = opt.full_label || opt.label || null
  }

  function onChangeBeneficios (selectedItems) {
    insc.dsct_benefit_ids = selectedItems
    insc.val_beneficios = selectedItems.map(i => parseFloat(i.raw?.value || 0))
  }

  // Recalcula y aplica los montos sobre insc. Si los descuentos superan la base,
  // avisa y resetea todos los descuentos (espejo del watcher original).
  function recalc () {
    const r = computeDiscounts(insc)
    if (r.exceedsBase) {
      toast?.warning('¡Cuidado! Los descuentos superan el Precio Base.')
      insc.val_porcentaje = 0; insc.dsct_porcent_id = null
      insc.val_fijo = 0; insc.dsct_stick_id = null
      insc.val_beneficios = []; insc.dsct_benefit_ids = []
      if (discountResetKey) discountResetKey.value++
      insc.montoDescuentoPorcentaje = 0; insc.montoDescuentoFijo = 0
      insc.montoBeneficioTotal = 0; insc.total_amount = r.base
      return
    }
    insc.montoDescuentoPorcentaje = r.montoPorcentaje
    insc.montoDescuentoFijo = r.montoFijo
    insc.montoBeneficioTotal = r.montoBeneficioTotal
    insc.total_amount = r.total_amount
  }

  const stopDiscountWatch = watch(
    () => [insc.montoOriginal, insc.val_porcentaje, insc.val_fijo, insc.val_beneficios, insc.dsct_porcent_id, insc.dsct_stick_id, insc.dsct_benefit_ids],
    recalc,
    { deep: true }
  )

  return {
    onChangeDescuentoPorcentual,
    onChangeDescuentoFijo,
    onChangeBeneficios,
    recalc,
    stopDiscountWatch
  }
}
