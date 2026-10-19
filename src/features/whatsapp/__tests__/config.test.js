import { describe, it, expect } from 'vitest'
import { parsePhrases, normalizePhone, numberPayload, configWarnings, emptyNumber } from '../config'

describe('parsePhrases', () => {
  it('una por línea, sin vacías ni repetidas', () => {
    expect(parsePhrases('  info del curso N8N \n\ninfo del curso N8N\nestoy en la web')).toEqual(['info del curso N8N', 'estoy en la web'])
  })
})

describe('normalizePhone', () => {
  it('deja solo dígitos para el wa.me', () => {
    expect(normalizePhone('+51 920-764-971')).toBe('51920764971')
  })
})

describe('numberPayload', () => {
  it('nuevo: sin id y con el teléfono limpio', () => {
    const body = numberPayload({ ...emptyNumber(), phone_number_id: '123', display_phone: '+51 920 764 971', label: 'Grecia', user_id: 7 })
    expect(body).not.toHaveProperty('wa_number_id')
    expect(body).toMatchObject({ display_phone: '51920764971', user_id: 7 })
  })
  it('el bot no tiene usuaria ni puede ser la asesora por defecto', () => {
    expect(numberPayload({ ...emptyNumber(), wa_number_id: 5, role: 'BOT', user_id: 7, is_default_advisor: true }))
      .toMatchObject({ wa_number_id: 5, user_id: null, is_default_advisor: false })
  })
})

describe('configWarnings', () => {
  it('avisa si falta el bot o la asesora por defecto', () => {
    expect(configWarnings({ numbers: [] })).toHaveLength(2)
    expect(configWarnings({ numbers: [
      { role: 'BOT', active: 'Y', is_default_advisor: false },
      { role: 'ADVISOR', active: 'Y', is_default_advisor: true }
    ] })).toEqual([])
  })
  it('un número inactivo no cuenta', () => {
    expect(configWarnings({ numbers: [{ role: 'BOT', active: 'N' }, { role: 'ADVISOR', active: 'Y', is_default_advisor: true }] })).toHaveLength(1)
  })
})
