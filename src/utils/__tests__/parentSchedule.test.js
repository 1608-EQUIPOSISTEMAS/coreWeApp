import { describe, it, expect } from 'vitest'
import { parentScheduleFromChildren } from '../parentSchedule.js'

// Caso real: ESP. POWER APPS Y AUT. E29, donde los dos modulos se programaron en
// frecuencias distintas (el padre en el historial sale "Dom / Mar-Jue").
const POWER_APPS = [
  { start_date: '2026-05-07', day_label: 'Mar-Jue', hour_label: '7PM - 10PM' },
  { start_date: '2026-06-16', day_label: 'Dom', hour_label: '9AM - 12PM' }
]

describe('parentScheduleFromChildren', () => {
  it('arranca en la fecha del hijo mas temprano', () => {
    expect(parentScheduleFromChildren(POWER_APPS).start_date).toBe('2026-05-07')
  })

  it('suma las frecuencias distintas de los hijos', () => {
    const { day_combination_label, hour_combination_label } = parentScheduleFromChildren(POWER_APPS)
    expect(day_combination_label).toBe('Mar-Jue / Dom')
    expect(hour_combination_label).toBe('7PM - 10PM / 9AM - 12PM')
  })

  it('no repite la frecuencia cuando todos los hijos van igual', () => {
    const mismos = POWER_APPS.map(child => ({ ...child, day_label: 'Sáb' }))
    expect(parentScheduleFromChildren(mismos).day_combination_label).toBe('Sáb')
  })

  it('ignora a los hijos que todavia no tienen fecha', () => {
    const conPendiente = [...POWER_APPS, { start_date: null, day_label: 'Lun-Mie' }]
    const schedule = parentScheduleFromChildren(conPendiente)
    expect(schedule.start_date).toBe('2026-05-07')
    expect(schedule.day_combination_label).toBe('Mar-Jue / Dom')
  })

  it('devuelve null cuando ningun hijo tiene fecha: no hay nada que comparar', () => {
    expect(parentScheduleFromChildren([{ start_date: null }])).toBeNull()
    expect(parentScheduleFromChildren([])).toBeNull()
  })

  it('recorta la hora del ISO: el analisis compara dias, no horas', () => {
    const conHora = [{ start_date: '2026-05-07T00:00:00.000Z', day_label: 'Sáb' }]
    expect(parentScheduleFromChildren(conHora).start_date).toBe('2026-05-07')
  })
})
