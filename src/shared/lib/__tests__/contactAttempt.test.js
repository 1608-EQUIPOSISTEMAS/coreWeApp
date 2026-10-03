import { describe, it, expect } from 'vitest'
import { isCallAttempt, attemptAsksResult } from '../contactAttempt.js'

describe('isCallAttempt', () => {
  it('toda variante de llamada cuenta como llamada', () => {
    expect(['we_attempt_call', 'we_attempt_call_2', 'we_attempt_call_uv'].every(isCallAttempt)).toBe(true)
  })
  it('seguimientos, plantillas y WhatsApp no son llamada', () => {
    expect(['we_attempt_seg_1', 'we_attempt_msg_last', 'we_attempt_whatsapp', null, undefined].some(isCallAttempt)).toBe(false)
  })
})

describe('attemptAsksResult', () => {
  it('llamadas y WhatsApp piden resultado', () => {
    expect(['we_attempt_call', 'we_attempt_call_2', 'we_attempt_whatsapp'].every(attemptAsksResult)).toBe(true)
  })
  it('seguimientos y plantillas siguen como "Mensaje / Gestion"', () => {
    expect(['we_attempt_seg_1', 'we_attempt_msg_close', 'we_attempt_msg_last', null].some(attemptAsksResult)).toBe(false)
  })
})
