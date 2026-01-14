// src/services/catalog.service.js
import api from './api'

const LS_KEY = 'CORE_CATALOG_V1'

const DEFAULT_WE_CURRENCY = [
  {
    id: 3041,
    abbreviation: 'PEN',
      alias: 'we_currency_soles',
    prefix: 'S/.',
    suffix: '',
    precision: '2',
    decimal: '.',
    thousands: ',',
    allowNegative: false,
    allowZero: true,
    predefined: true
  },
  {
    id: 3042,
    abbreviation: 'USD',
    alias: 'we_currency_usd',
    prefix: '$',
    suffix: '',
    precision: '2',
    decimal: '.',
    thousands: ',',
    allowNegative: false,
    allowZero: true,
    predefined: true
  }
]

// Merge que garantiza que we_currency exista
function withBootstrap(map) {
  const out = { ...(map || {}) }
  if (!Array.isArray(out.we_currency) || out.we_currency.length === 0) {
    out.we_currency = DEFAULT_WE_CURRENCY
  }
  return out
}


export function createCatalogService () {
  let map = null

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : null
    } catch {
      return null
    }
  }

  function saveToLocal(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj || {}))
  }

  async function ensureLoaded(force = false) {
    if (!force) {
      const local = loadFromLocal()
      if (local) {
        map = withBootstrap(local)
        return map
      }
    }
    try {
      const { data: resp } = await api.post('/catalog/cataloglist')
      const incoming = resp?.data ?? resp ?? {}
      map = withBootstrap(incoming)
      saveToLocal(map)
      return map
    } catch (e) {
      // fallback offline: al menos garantiza bootstrap
      map = withBootstrap(loadFromLocal() || {})
      saveToLocal(map)
      return map
    }
  }

  function getMap() {
    return withBootstrap(map || loadFromLocal() || {})
  }

  function get(alias) {
    return getMap()[alias] || []
  }

  function byId(alias, id) {
    const sid = String(id)
    return get(alias).find(x =>
      String(x.catalogo_id) === sid || String(x.id) === sid
    ) || null
  }

  function options(alias, {
    label = 'description',
    value = 'catalogo_id',
    filter = () => true,
    mapItem
  } = {}) {
    const arr = get(alias).filter(filter)
    return arr.map(x => mapItem
      ? mapItem(x)
      : ({
        alias: x.alias,
        id: x[value] ?? x.catalogo_id,
        description: x[label] ?? x.description,
        raw: x,
        variable_1: x.variable_1,
        variable_2: x.variable_2,
        variable_3: x.variable_3 })
    )
  }

  async function membershipList(payload) {
    //si ya existe el listado en localhost solo retornar sino llamar api post y guardar localStorage.setItem('membershipList', JSON.stringify(response.data)); const response = (await api.post('/catalog/membershiplist', payload)).data;
debugger
    const local = localStorage.getItem('membershipList');
    if (local) {
      return JSON.parse(local);
    }
    const response = (await api.post('/catalog/membershiplist', payload)).data;
    localStorage.setItem('membershipList', JSON.stringify(response.data));
    return response.data;
  }





  return {
    ensureLoaded,
    refresh: () => ensureLoaded(true),
    getMap,
    get,
    byId,
    options,
    membershipList
  }
}
