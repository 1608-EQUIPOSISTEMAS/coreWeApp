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
  const loading = ref(false)
  const syncing = ref(false)
  const saving = ref(false)
  const activeIndex = ref(0)

  const currentWeek = ref(isoWeekStart(new Date()))
  const previousWeek = computed(() => shiftWeeks(currentWeek.value, -1))
  const historyFrom = computed(() => shiftWeeks(currentWeek.value, -(HISTORY_WEEKS - 1)))

  // Una fila por cuenta con sus snapshots indexados por semana. El orden es el
  // que manda el backend (marca, red, nombre) y es el orden de la cola.
  const queue = computed(() => {
    const byAccount = new Map(accounts.value.map(account => [account.account_id, {
      ...account,
      label: NETWORK_LABEL[account.network] || account.network,
      isManual: !account.external_id,
      points: new Map()
    }]))
    for (const point of series.value) byAccount.get(point.account_id)?.points.set(point.week_start, point)

    return [...byAccount.values()].map((row, index) => {
      const current = row.points.get(currentWeek.value)
      return {
        ...row,
        index,
        current,
        previous: row.points.get(previousWeek.value),
        // "done" es tener dato de esta semana, venga de la API o de la carga
        // manual: es lo mismo que la cola necesita saber.
        state: current ? 'done' : 'todo'
      }
    })
  })

  // Columnas del resumen: las últimas HISTORY_WEEKS semanas, de la más vieja a
  // la más reciente. Es el mismo rango que pide load().
  const weeks = computed(() =>
    Array.from({ length: HISTORY_WEEKS }, (_, i) => shiftWeeks(currentWeek.value, i - HISTORY_WEEKS + 1)))

  // Los seguidores son un stock, no un flujo: si una semana no se midió, la
  // cuenta igual tenía los seguidores de la última medición. Por eso el total
  // arrastra el último valor conocido en vez de omitir la cuenta, que es lo que
  // hacía la hoja y le desplomaba el consolidado sin motivo real.
  // Devuelve null —no 0— cuando ninguna cuenta tiene medición hasta esa semana:
  // un "0 seguidores" se lee como que la marca perdió a toda su audiencia,
  // cuando lo que pasa es que nadie cargó el dato todavía.
  function totalAt (rows, week) {
    let sum = null
    for (const row of rows) {
      let last = null
      for (const point of row.points.values()) {
        if (point.week_start <= week && (!last || point.week_start > last.week_start)) last = point
      }
      if (last) sum = (sum ?? 0) + last.followers
    }
    return sum
  }

  const brands = computed(() => {
    const grouped = new Map()
    for (const row of queue.value) {
      if (!grouped.has(row.brand)) grouped.set(row.brand, [])
      grouped.get(row.brand).push(row)
    }
    return [...grouped].map(([brand, rows]) => ({
      brand,
      rows,
      totals: weeks.value.map(week => totalAt(rows, week))
    }))
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
    const [accountList, growth] = await Promise.all([
      marketing.socialAccounts(),
      marketing.socialGrowth({ from: historyFrom.value, to: currentWeek.value })
    ])
    accounts.value = accountList
    series.value = growth
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

  async function sync () {
    syncing.value = true
    try {
      const result = await marketing.syncSocialGrowth()
      const errores = result?.errores || []
      if (errores.length) toast.warning(`${result.guardadas} cuentas actualizadas · ${errores.length} con error`)
      else if (result?.guardadas) toast.success(`${result.guardadas} cuentas actualizadas`)
      else toast.info('Ninguna red tiene credenciales configuradas todavía')
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo sincronizar')
    } finally {
      syncing.value = false
    }
  }

  function shiftPeriod (weeksDelta) {
    currentWeek.value = shiftWeeks(currentWeek.value, weeksDelta)
    return load()
  }

  return {
    queue, brands, weeks, active, activeIndex, activeHistory, activeSpark, activeRecent, activePace,
    currentWeek, previousWeek, historyFrom,
    total, doneCount, pendingCount, progressPct,
    loading, syncing, saving,
    load, saveActive, skipActive, focusAccount, sync, shiftPeriod
  }
}
