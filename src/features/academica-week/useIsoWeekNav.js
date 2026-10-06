import { ref, computed } from 'vue'
import { isoWeekOf } from '@/utils/isoWeek'
import { addDaysIso, toLocalIsoDate } from '@/shared/lib/localDate'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Las fechas viajan como texto 'YYYY-MM-DD' y se leen cortando el string:
// new Date('YYYY-MM-DD') es medianoche UTC y en Lima corre un dia atras.
function ymdParts (ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

// '2026-06-03' -> '3/6'. Formato corto de las celdas de sesion.
export function formatDayMonth (ymd) {
  if (!ymd) return ''
  const { m, d } = ymdParts(ymd)
  return `${d}/${m}`
}

// '1 jun al 7 jun 2026'. Vacio mientras no llegue el rango del backend.
export function weekRangeLabel (start, end) {
  if (!start || !end) return ''
  const s = ymdParts(start)
  const e = ymdParts(end)
  return `${s.d} ${MONTHS[s.m - 1]} al ${e.d} ${MONTHS[e.m - 1]} ${e.y}`
}

// Se navega por el lunes de la semana: sumar 7 dias cruza de anio sin la
// aritmetica de "este anio tiene 52 o 53 semanas".
export function shiftWeek (monday, delta) {
  return addDaysIso(monday, 7 * delta)
}

// Semana ISO visible en una pantalla semanal de Academica (Control de
// Ediciones, Vista Semanal). Arranca en la semana de hoy en Lima.
export function useIsoWeekNav () {
  const todayYmd = toLocalIsoDate()
  const monday = ref(isoWeekOf(todayYmd).monday)
  const current = computed(() => isoWeekOf(monday.value))

  const move = (delta) => { monday.value = shiftWeek(monday.value, delta) }
  const goToday = () => { monday.value = isoWeekOf(todayYmd).monday }

  return {
    todayYmd,
    monday,
    year: computed(() => current.value.year),
    week: computed(() => current.value.week),
    sunday: computed(() => current.value.sunday),
    move,
    goToday
  }
}
