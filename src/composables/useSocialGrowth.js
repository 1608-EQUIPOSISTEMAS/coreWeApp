import { ref, computed, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const NETWORK_LABEL = {
  FACEBOOK: 'Facebook',
  FACEBOOK_GROUP: 'Grupo de Facebook',
  INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  WHATSAPP: 'WhatsApp'
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const HISTORY_WEEKS = 12

// Espejo de isoWeekStart() del backend (growth.entity.js). La duplicación es
// deliberada: son dos runtimes distintos y el frontend necesita saber qué semana
// está cargando antes de preguntarle nada al servidor.
export function isoWeekStart (date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const daysSinceMonday = (utc.getUTCDay() + 6) % 7
  return new Date(utc.getTime() - daysSinceMonday * MS_PER_DAY).toISOString().slice(0, 10)
}

function shiftWeeks (weekStart, weeks) {
  return new Date(Date.parse(`${weekStart}T00:00:00Z`) + weeks * 7 * MS_PER_DAY)
    .toISOString().slice(0, 10)
}

export const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Último día del mes (1-12) como 'YYYY-MM-DD'. El día 0 del mes siguiente es el
// último del actual, y Date.UTC resuelve solo el salto de diciembre a enero.
export function monthEnd (year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

// Hoy en el calendario local, no en UTC: con toISOString() a secas, después de
// las 19:00 en Lima el día ya es el siguiente y un mes se daría por empezado
// antes de tiempo.
export function todayLocal (now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Cuántas columnas semanales se toleran antes de pasar a meses. Más allá de esto
// la tabla deja de leerse de un vistazo y el detalle semanal estorba en vez de
// aportar.
const MAX_WEEK_COLUMNS = 26

// 'YYYY-MM-DD' a Date en el calendario LOCAL. new Date('2026-08-10') lo
// interpreta como UTC y en Lima devuelve el 9, corriendo la semana entera.
function parseLocalYmd (value) {
  const [y, m, d] = String(value).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Columnas de la matriz según el rango elegido: semanas si el período es corto,
// meses si es largo. La granularidad sale del ancho del rango y no de un selector
// aparte — pedir "el último año" y recibir 52 columnas no le sirve a nadie.
//
// La semántica de la celda cambia con la granularidad, y es deliberado:
//   week   la medición DE esa semana; vacía si nadie la cargó
//   month  el CIERRE del mes, o sea la última medición que no lo pasa
export function buildColumns (start, end, today = todayLocal()) {
  if (!start || !end || end < start) return []

  const firstWeek = isoWeekStart(parseLocalYmd(start))
  const lastWeek = isoWeekStart(parseLocalYmd(end))
  const weeks = Math.round(
    (Date.parse(`${lastWeek}T00:00:00Z`) - Date.parse(`${firstWeek}T00:00:00Z`)) / (7 * MS_PER_DAY)) + 1

  if (weeks <= MAX_WEEK_COLUMNS) {
    return Array.from({ length: weeks }, (_, i) => {
      const week = shiftWeeks(firstWeek, i)
      return {
        kind: 'week',
        key: week,
        label: `${week.slice(8, 10)}/${week.slice(5, 7)}`,
        boundary: week,
        future: week > today
      }
    })
  }

  const columns = []
  let year = Number(start.slice(0, 4))
  let month = Number(start.slice(5, 7))
  const endYear = Number(end.slice(0, 4))
  const endMonth = Number(end.slice(5, 7))
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mm = String(month).padStart(2, '0')
    columns.push({
      kind: 'month',
      key: `${year}-${mm}`,
      label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`,
      boundary: monthEnd(year, month),
      future: `${year}-${mm}-01` > today
    })
    month += 1
    if (month > 12) { month = 1; year += 1 }
  }
  return columns
}

// Última medición de la cuenta hasta esa semana inclusive, o null si nunca se
// midió. Los seguidores son un stock: una semana sin cargar no significa que la
// cuenta no tuviera seguidores, sino que sigue teniendo los de la última medida.
// De acá salen el total por marca y el orden del módulo.
export function lastPointUpTo (points, week) {
  let last = null
  for (const point of points.values()) {
    if (point.week_start <= week && (!last || point.week_start > last.week_start)) last = point
  }
  return last
}

// Puntos de un polyline SVG normalizados a la caja. Con un solo valor no hay
// pendiente que dibujar, así que se devuelve una línea plana en vez de un NaN.
export function sparkPoints (values, width = 160, height = 34) {
  if (!values.length) return ''
  if (values.length === 1) return `0,${height / 2} ${width},${height / 2}`
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  return values
    .map((v, i) => `${(i / (values.length - 1) * width).toFixed(1)},` +
                   `${(height - (v - min) / range * height).toFixed(1)}`)
    .join(' ')
}

export function useSocialGrowth () {
  const marketing = inject(ServiceKeys.Marketing)
  const toast = useToast()

  const accounts = ref([])
  const series = ref([])
  const goals = ref({})
  const loading = ref(false)
  const saving = ref(false)
  const activeIndex = ref(0)

  const currentWeek = ref(isoWeekStart(new Date()))
  const previousWeek = computed(() => shiftWeeks(currentWeek.value, -1))
  const historyFrom = computed(() => shiftWeeks(currentWeek.value, -(HISTORY_WEEKS - 1)))

  // Período del resumen. Arranca en las últimas HISTORY_WEEKS semanas, que es la
  // vista con la que nació el módulo; el rango es lo único que decide si las
  // columnas salen por semana o por mes.
  const range = ref({
    start: shiftWeeks(isoWeekStart(new Date()), -(HISTORY_WEEKS - 1)),
    end: todayLocal(),
    compare: null
  })

  const columns = computed(() => buildColumns(range.value.start, range.value.end))

  // El objetivo es anual: se toma el año donde termina el período mirado.
  const goalYear = computed(() => Number((range.value.end || todayLocal()).slice(0, 4)))

  // Seguidores vigentes de la cuenta en la semana en foco. Sin ninguna medición
  // da 0 y la cuenta cae al fondo del orden.
  const followersNow = row => lastPointUpTo(row.points, currentWeek.value)?.followers ?? 0

  // TODAS las cuentas con sus snapshots indexados por semana, de más a menos
  // seguidores: lo primero que se mira es lo que más pesa. El backend las manda
  // por marca/red/nombre, que es un orden de catálogo, no de importancia.
  const rows = computed(() => {
    const byAccount = new Map(accounts.value.map(account => [account.account_id, {
      ...account,
      label: NETWORK_LABEL[account.network] || account.network,
      isManual: !account.external_id,
      points: new Map()
    }]))
    for (const point of series.value) byAccount.get(point.account_id)?.points.set(point.week_start, point)

    return [...byAccount.values()]
      .map(row => {
        const current = row.points.get(currentWeek.value)
        return {
          ...row,
          current,
          previous: row.points.get(previousWeek.value),
          // "done" es tener dato de esta semana, venga de la API o de la carga
          // manual: es lo mismo que la cola necesita saber.
          state: current ? 'done' : 'todo'
        }
      })
      .sort((a, b) => followersNow(b) - followersNow(a))
  })

  // La cola de carga lista SOLO las cuentas sin API: las que tienen lector las
  // llena el cron, y tenerlas en la fila obligaba a saltearlas de a una con "S".
  // El índice se asigna acá, después de filtrar, porque es la posición dentro de
  // la cola: asignarlo antes deja huecos y advance() salta a filas que no están.
  const queue = computed(() =>
    rows.value.filter(row => row.isManual).map((row, index) => ({ ...row, index })))

  // Rango que se le pide al backend: tiene que cubrir a la vez el período del
  // resumen y la semana que está cargando la cola, que pueden no coincidir.
  // Se pide un mes de más hacia atrás para que la primera columna pueda arrastrar
  // el último valor conocido en vez de salir vacía.
  const fetchFrom = computed(() => {
    const desde = shiftWeeks(isoWeekStart(parseLocalYmd(range.value.start)), -4)
    return desde < historyFrom.value ? desde : historyFrom.value
  })
  const fetchTo = computed(() => {
    const hasta = isoWeekStart(parseLocalYmd(range.value.end))
    return hasta > currentWeek.value ? hasta : currentWeek.value
  })

  // El total arrastra el último valor conocido de cada cuenta en vez de omitirla,
  // que es lo que hacía la hoja y le desplomaba el consolidado sin motivo real.
  // Devuelve null —no 0— cuando ninguna cuenta tiene medición hasta esa semana:
  // un "0 seguidores" se lee como que la marca perdió a toda su audiencia,
  // cuando lo que pasa es que nadie cargó el dato todavía.
  function totalAt (accountRows, week) {
    let sum = null
    for (const row of accountRows) {
      const last = lastPointUpTo(row.points, week)
      if (last) sum = (sum ?? 0) + last.followers
    }
    return sum
  }

  // Valor de una cuenta en cada columna. Se arma acá y no en la plantilla porque
  // es una regla —qué muestra una celda— y el .vue solo pinta.
  function columnSeries (row) {
    let previous = null
    return columns.value.map(column => {
      if (column.future) return null
      const point = column.kind === 'week'
        ? row.points.get(column.boundary) ?? null
        : lastPointUpTo(row.points, column.boundary)
      if (!point) return null
      const cell = {
        followers: point.followers,
        // En semanas el crecimiento ya viene derivado del backend, que además
        // sabe cuántas semanas abarca; en meses se calcula contra el mes medido
        // anterior, que es la columna de al lado y no el snapshot de al lado.
        growth: column.kind === 'week'
          ? point.growth
          : (previous === null ? null : point.followers - previous),
        weeks_spanned: column.kind === 'week' ? point.weeks_spanned : null
      }
      previous = point.followers
      return cell
    })
  }

  // El resumen agrupa `rows`, NO `queue`: la cola está filtrada a las manuales y
  // usarla acá borraría del reporte justo las cuentas que sí tienen API.
  const brands = computed(() => {
    const grouped = new Map()
    for (const row of rows.value) {
      if (!grouped.has(row.brand)) grouped.set(row.brand, [])
      grouped.get(row.brand).push(row)
    }
    return [...grouped]
      .map(([brand, accountRows]) => {
        const totals = columns.value.map(c => (c.future ? null : totalAt(accountRows, c.boundary)))
        // El avance se mide contra la última columna con dato. Mostrar 0% porque
        // la última semana todavía no se cargó diría que la marca no creció, que
        // es distinto a no saberlo.
        const reached = [...totals].reverse().find(t => t !== null) ?? null
        const goal = goals.value[brand] ?? null
        return {
          brand,
          rows: accountRows.map(row => ({ ...row, cells: columnSeries(row) })),
          totals,
          reached,
          goal,
          goalPct: goal && reached !== null ? Math.round(reached / goal * 100) : null
        }
      })
      .sort((a, b) => (b.reached ?? 0) - (a.reached ?? 0))
  })

  const total = computed(() => queue.value.length)
  const doneCount = computed(() => queue.value.filter(row => row.state === 'done').length)
  const pendingCount = computed(() => total.value - doneCount.value)
  const progressPct = computed(() => (total.value ? Math.round(doneCount.value / total.value * 100) : 0))

  const active = computed(() => queue.value[activeIndex.value] || null)

  // Historial del foco, de la semana más vieja a la más nueva.
  const activeHistory = computed(() => {
    if (!active.value) return []
    return [...active.value.points.values()]
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
  })

  const activeSpark = computed(() =>
    sparkPoints(activeHistory.value.map(p => p.followers), 160, 60))

  // Las últimas 4 semanas medidas, para el resumen bajo el capturador.
  const activeRecent = computed(() => activeHistory.value.slice(-4))

  // Ritmo promedio: solo tiene sentido con al menos dos mediciones.
  const activePace = computed(() => {
    const growths = activeHistory.value.map(p => p.growth).filter(g => g !== null && g !== undefined)
    if (!growths.length) return null
    return Math.round(growths.reduce((a, b) => a + b, 0) / growths.length)
  })

  function focusAccount (index) {
    if (index >= 0 && index < total.value) activeIndex.value = index
  }

  // Salta al siguiente pendiente; si no queda ninguno adelante, se queda donde
  // está para no rebotar al principio cuando ya se cargó todo.
  function advance () {
    const next = queue.value.findIndex((row, i) => i > activeIndex.value && row.state === 'todo')
    if (next !== -1) activeIndex.value = next
    else if (activeIndex.value < total.value - 1) activeIndex.value += 1
  }

  async function fetchData () {
    const [accountList, growth, goalList] = await Promise.all([
      marketing.socialAccounts(),
      marketing.socialGrowth({ from: fetchFrom.value, to: fetchTo.value }),
      marketing.socialGoals(goalYear.value)
    ])
    accounts.value = accountList
    series.value = growth
    goals.value = Object.fromEntries(goalList.map(g => [g.brand, g.followers_goal]))
  }

  async function load () {
    loading.value = true
    try {
      await fetchData()
      const firstPending = queue.value.findIndex(row => row.state === 'todo')
      if (firstPending !== -1) activeIndex.value = firstPending
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo cargar el crecimiento')
    } finally {
      loading.value = false
    }
  }

  // Inserta el snapshot recién guardado en la serie local en vez de recargarla.
  //
  // Recargar en cada Enter costaba ~6 s contra la BD de producción: con 33
  // cuentas por semana eso son más de tres minutos de espera en una pantalla
  // cuyo punto entero es cargar rápido con el teclado. El próximo load()
  // reconcilia contra la BD.
  //
  // El cálculo del crecimiento repite la regla de buildGrowthSeries del backend
  // (diferencia contra la última medición anterior, y cuántas semanas abarca).
  // Si divergen, gana el backend en la siguiente carga.
  function applyLocalSnapshot (row, followers) {
    const earlier = [...row.points.values()]
      .filter(point => point.week_start < currentWeek.value)
      .sort((a, b) => a.week_start.localeCompare(b.week_start))
      .pop()
    const saved = {
      account_id: row.account_id,
      brand: row.brand,
      network: row.network,
      display_name: row.display_name,
      week_start: currentWeek.value,
      followers,
      source: 'MANUAL',
      growth: earlier ? followers - earlier.followers : null,
      weeks_spanned: earlier
        ? Math.round((Date.parse(`${currentWeek.value}T00:00:00Z`) -
                      Date.parse(`${earlier.week_start}T00:00:00Z`)) / (7 * MS_PER_DAY))
        : null
    }
    const existing = series.value.findIndex(
      point => point.account_id === row.account_id && point.week_start === currentWeek.value)
    series.value = existing === -1
      ? [...series.value, saved]
      : series.value.map((point, i) => (i === existing ? saved : point))
  }

  async function saveActive (rawValue) {
    const value = String(rawValue ?? '').trim()
    if (!active.value || value === '') return
    const row = active.value
    saving.value = true
    try {
      await marketing.saveSocialGrowth({
        account_id: row.account_id,
        week_start: currentWeek.value,
        followers: Number(value)
      })
      applyLocalSnapshot(row, Number(value))
      advance()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo guardar el valor')
    } finally {
      saving.value = false
    }
  }

  // "Sin dato" no escribe nada: deja la semana vacía a propósito. Guardar un 0
  // sería inventar una caída de miles de seguidores.
  function skipActive () {
    advance()
  }


  function shiftPeriod (weeksDelta) {
    currentWeek.value = shiftWeeks(currentWeek.value, weeksDelta)
    return load()
  }

  // Cambiar el período recarga: el rango pedido al backend y el año del objetivo
  // pueden ser otros.
  function setRange (value) {
    range.value = value
    return load()
  }

  async function saveGoal (brand, rawValue) {
    const value = Number(String(rawValue ?? '').trim())
    if (!Number.isInteger(value) || value <= 0) {
      toast.error('El objetivo debe ser un número entero mayor a 0')
      return
    }
    saving.value = true
    try {
      await marketing.saveSocialGoal({ brand, year: goalYear.value, followers_goal: value })
      goals.value = { ...goals.value, [brand]: value }
      toast.success(`Objetivo de ${brand} guardado`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo guardar el objetivo')
    } finally {
      saving.value = false
    }
  }

  return {
    rows, queue, brands, columns, active, activeIndex, activeHistory, activeSpark, activeRecent, activePace,
    currentWeek, previousWeek, historyFrom, range, goalYear,
    total, doneCount, pendingCount, progressPct,
    loading, saving,
    load, saveActive, skipActive, focusAccount, shiftPeriod, setRange, saveGoal
  }
}
