import { describe, it, expect } from 'vitest'
import { formatWhen, serviceWindow, conversationRow, messageRow, buildKpis } from '../bandeja'

// 15:00 en Lima (UTC-5).
const now = new Date('2026-10-19T20:00:00Z')
const hoursAgo = h => new Date(now.getTime() - h * 3600_000).toISOString()

describe('formatWhen', () => {
  it('hoy solo la hora de Lima; otro día con fecha', () => {
    expect(formatWhen('2026-10-19T14:30:00Z', now)).toBe('09:30')
    expect(formatWhen('2026-10-18T14:30:00Z', now)).toBe('18/10 09:30')
  })
  it('a las 23:00 de Lima ya es otro día en UTC, pero sigue siendo hoy', () => {
    expect(formatWhen('2026-10-20T04:00:00Z', new Date('2026-10-20T04:30:00Z'))).toBe('23:00')
  })
})

describe('serviceWindow', () => {
  it('abierta con las horas que quedan', () => {
    expect(serviceWindow(hoursAgo(5), now)).toMatchObject({ open: true, tone: 'info', text: 'Puedes responder por 19 h más' })
  })
  it('avisa en ámbar cuando quedan menos de 3 h, en minutos al final', () => {
    expect(serviceWindow(hoursAgo(22), now)).toMatchObject({ open: true, tone: 'warn' })
    expect(serviceWindow(hoursAgo(23.5), now).text).toBe('Puedes responder por 30 min más')
  })
  it('cerrada a las 24 h', () => {
    expect(serviceWindow(hoursAgo(24), now)).toMatchObject({ open: false, tone: 'bad' })
  })
})

describe('conversationRow', () => {
  const base = { conversation_id: 3, contact_phone: '51902218391', contact_name: null, program_name: null, status: 'HANDED_OFF', source: 'PC2', last_body: 'hola', last_direction: 'OUT', last_at: hoursAgo(1) }
  it('sin nombre muestra el teléfono y avisa si no se reconoció el programa', () => {
    expect(conversationRow(base, now)).toMatchObject({ cliente: '+51902218391', programa: 'Programa sin reconocer', origen: 'Anuncio Meta', ultimo: 'Nosotros: hola' })
    expect(conversationRow(base, now).estado.label).toBe('Derivada')
  })
})

describe('messageRow', () => {
  it('un saliente fallido explica el porqué de Meta', () => {
    const row = messageRow({ message_id: 1, direction: 'OUT', type: 'image', body: null, sent_by: 'SCRIPT', delivery_status: 'failed', errors: [{ code: 131031, title: 'Business Account locked' }], registration_date: hoursAgo(1) }, now)
    expect(row).toMatchObject({ saliente: true, texto: '(image)', autor: 'Bot', error: 'Business Account locked (131031)' })
    expect(row.entrega.tone).toBe('bad')
  })
  it('lo escrito desde el ERP lleva el alias de quien lo mandó', () => {
    expect(messageRow({ message_id: 2, direction: 'OUT', type: 'text', body: 'ok', sent_by: 'USER', user_alias: 'grecia', delivery_status: 'read', registration_date: hoursAgo(1) }, now).autor).toBe('grecia')
  })
  it('lo del cliente no lleva autor ni estado de entrega', () => {
    expect(messageRow({ message_id: 3, direction: 'IN', type: 'text', body: 'hola', registration_date: hoursAgo(1) }, now)).toMatchObject({ autor: null, entrega: null })
  })
})

describe('buildKpis', () => {
  it('cuenta por estado y por anuncio', () => {
    const kpis = buildKpis([{ status: 'BOT', source: 'PC2' }, { status: 'HANDED_OFF', source: 'DIRECT' }, { status: 'BOT', source: 'PC1' }])
    expect(Object.fromEntries(kpis.map(k => [k.id, k.value]))).toEqual({ total: 3, bot: 2, derivadas: 1, anuncio: 1 })
  })
})
