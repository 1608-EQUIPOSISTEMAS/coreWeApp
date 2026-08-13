import { describe, it, expect } from 'vitest'
import { reactive, watch, nextTick } from 'vue'
import { restoreObservedChannel } from '../restoreObservedChannel.js'

const CHANNELS = [
  { id: 1, alias: 'we_channel_general' },
  { id: 2, alias: 'we_channel_token' },
  { id: 3, alias: 'we_channel_web' }
]

// Espejo del watch real de useLeadForm: cambiar de canal limpia proveedor y
// medio de pago. Sin el es imposible reproducir la trampa que motivo el helper.
function makeInscription () {
  const insc = reactive({
    cat_payment_channel: 1, cat_token_provider: null, cat_method_payment: 7, token_payment_type: ''
  })
  watch(() => insc.cat_payment_channel, () => {
    insc.cat_token_provider = null
    insc.cat_method_payment = null
  })
  return insc
}

describe('restoreObservedChannel', () => {
  it('restaura canal token y el proveedor sobrevive al watch que lo limpia', async () => {
    const insc = makeInscription()

    await restoreObservedChannel(insc, {
      payment_channel_alias: 'we_channel_token',
      token_provider_id: 5061,
      token_payment_type: 'credito'
    }, CHANNELS)
    await nextTick()

    expect(insc.cat_payment_channel).toBe(2)
    expect(insc.cat_token_provider).toBe(5061)
    expect(insc.token_payment_type).toBe('credito')
  })

  it('canal General se queda como esta: es el default del modal', async () => {
    const insc = makeInscription()
    insc.cat_payment_channel = 1

    await restoreObservedChannel(insc, { payment_channel_alias: 'we_channel_general' }, CHANNELS)

    expect(insc.cat_payment_channel).toBe(1)
    expect(insc.cat_method_payment).toBe(7)
  })

  it('sin flags o con un alias que el catalogo no trae, no toca nada', async () => {
    const insc = makeInscription()

    await restoreObservedChannel(insc, null, CHANNELS)
    await restoreObservedChannel(insc, { payment_channel_alias: 'we_channel_inventado' }, CHANNELS)

    expect(insc.cat_payment_channel).toBe(1)
    expect(insc.cat_method_payment).toBe(7)
  })
})
