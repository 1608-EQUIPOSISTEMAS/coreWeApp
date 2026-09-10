import { describe, it, expect } from 'vitest'
import { reactive, ref, watch, nextTick } from 'vue'
import { restoreObservedInscription } from '../restoreObservedInscription.js'

const CHANNELS = [
  { id: 1, alias: 'we_channel_general' },
  { id: 2, alias: 'we_channel_token' },
  { id: 3, alias: 'we_channel_web' }
]
const DOC_TYPES = [{ id: 2300, alias: 'we_doc_type_dni' }]
const MODALITIES = [{ id: 2626, alias: 'we_insc_modality_flex' }]
const PAYMENT_MODES = [{ id: 2467, alias: 'we_payment_way_installments' }]
const CURRENCIES = [{ id: 3041, alias: 'we_currency_soles' }]
const CERT_STATUS = [{ id: 2569, alias: 'we_certificate_status_paid' }]
const METHODS = [{ id: 2496, alias: 'we_payment_method_yape' }]

const CATALOGS = {
  docType: DOC_TYPES, inscModalidades: MODALITIES, inscPaymentModes: PAYMENT_MODES,
  currency: CURRENCIES, certificateStatus: CERT_STATUS, paymentMethod: METHODS,
  paymentChannels: CHANNELS
}
const aliasById = (id, list = []) => list.find(o => o.id === id)?.alias || null

// Espejo del watch real de useLeadForm: cambiar de canal limpia proveedor,
// medio de pago y adjuntos. Sin el es imposible reproducir la trampa original.
function makeInscription () {
  const insc = reactive({
    cat_payment_channel: 1, cat_token_provider: null, cat_method_payment: null,
    token_payment_type: '', ticket_payment_urls: [], dsct_benefit_ids: [], val_beneficios: []
  })
  watch(() => insc.cat_payment_channel, () => {
    insc.cat_token_provider = null
    insc.cat_method_payment = null
    insc.ticket_payment_urls = []
  })
  return insc
}

const makeInstallments = () => ({
  manualMode: ref(false), numCuotasManual: ref(1), editableInstallments: ref([])
})

const VENTA_OBSERVADA = {
  payment_channel_alias: 'we_channel_general',
  document_number: '71452403',
  cat_type_document: 2300,
  first_name: 'JOHAN FERNANDO',
  last_name: 'BAUTISTA',
  mother_last_name: 'VASQUEZ',
  origin_email: 'johan.bautista.v@gmail.com',
  cat_inscription_modality: 2626,
  cat_certificate_status: 2569,
  cat_currency: 3041,
  cat_payment_plan: 2467,
  cat_method_payment: 2496,
  list_price: '1200.00',
  total_amount: '1000.00',
  saved_money: '200.00',
  discounts: [
    { discount_id: 10, type_alias: 'we_discount_type_percentage', value: 20, label: '20% PRONTO PAGO' },
    { discount_id: 55, type_alias: 'we_discount_type_benefit', value: 0, label: 'BECA' }
  ],
  installment_plan: [
    { installment_number: 1, amount: 400, due_date: '2026-10-30' },
    { installment_number: 2, amount: 400, due_date: '2026-11-15' }
  ],
  ticket_payment_urls: [{ url: 'https://we.pe/voucher.jpg', name: 'voucher.jpg', type: 'image/jpeg' }]
}

const restaurar = (insc, flags, extra = {}) => restoreObservedInscription({
  insc, flags, catalogs: CATALOGS, aliasById, ...extra
})

describe('restoreObservedInscription', () => {
  it('repinta la venta completa: sin esto el reenvio la guardaria vacia', async () => {
    const insc = makeInscription()
    const installments = makeInstallments()
    let precioRestaurado = false

    await restaurar(insc, VENTA_OBSERVADA, {
      installments,
      onPriceRestored: () => { precioRestaurado = true }
    })
    await nextTick()

    expect(insc.document).toBe('71452403')
    expect(insc.cat_type_document).toBe('we_doc_type_dni')
    expect(insc.email).toBe('johan.bautista.v@gmail.com')
    expect(insc.cat_insc_modality).toBe('we_insc_modality_flex')
    expect(insc.cat_type_payment).toBe('we_payment_way_installments')
    expect(insc.cat_method_payment).toBe('we_payment_method_yape')

    // El precio y el aviso al modal: sin priceManuallySet el PRECIO BASE
    // vuelve a 0 porque el programa no tiene fila en la lista de precios.
    expect(insc.montoOriginal).toBe(1200)
    expect(insc.total_amount).toBe(1000)
    expect(insc.saved_money).toBe(200)
    expect(precioRestaurado).toBe(true)

    expect(insc.dsct_porcent_id).toBe(10)
    expect(insc.val_porcentaje).toBe(20)
    expect(insc.dsct_benefit_ids).toEqual([{ value: 55, label: 'BECA' }])

    expect(installments.manualMode.value).toBe(true)
    expect(installments.editableInstallments.value).toHaveLength(2)
    expect(installments.editableInstallments.value[0].due_date).toBe('2026-10-30')

    // El SP borra los adjuntos y los recrea desde el payload: si el voucher no
    // vuelve al modal, el canal General rechaza el reenvio por falta de voucher.
    expect(insc.ticket_payment_urls).toHaveLength(1)
  })

  it('el voucher y el medio de pago sobreviven al watch que limpia el canal', async () => {
    const insc = makeInscription()

    await restaurar(insc, { ...VENTA_OBSERVADA, payment_channel_alias: 'we_channel_token', token_provider_id: 5061, token_payment_type: 'credito' })
    await nextTick()

    expect(insc.cat_payment_channel).toBe(2)
    expect(insc.cat_token_provider).toBe(5061)
    expect(insc.token_payment_type).toBe('credito')
    expect(insc.cat_method_payment).toBe('we_payment_method_yape')
    expect(insc.ticket_payment_urls).toHaveLength(1)
  })

  it('sin flags no toca nada: la observacion es informativa, no puede romper el modal', async () => {
    const insc = makeInscription()
    insc.montoOriginal = 999

    await restaurar(insc, null)

    expect(insc.montoOriginal).toBe(999)
    expect(insc.cat_payment_channel).toBe(1)
  })

  it('una venta sin cuotas ni descuentos no fuerza el modo manual', async () => {
    const insc = makeInscription()
    const installments = makeInstallments()

    await restaurar(insc, { ...VENTA_OBSERVADA, installment_plan: null, discounts: null }, { installments })

    expect(installments.manualMode.value).toBe(false)
    expect(insc.dsct_porcent_id).toBeUndefined()
  })
})
