import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api', () => ({ default: { post: vi.fn() } }))
import api from '../api'
import { createCatalogService } from '../catalog.service.js'

const LS_KEY = 'CORE_CATALOG_V5'
const CATALOGO = { we_day_combination: [{ catalogo_id: 3010, description: 'Dom', variable_2: '[0]' }] }

describe('catalog.service: cache envenenado', () => {
  beforeEach(() => {
    localStorage.clear()
    api.post.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('si /cataloglist falla, NO guarda el respaldo de monedas en el cache', async () => {
    api.post.mockRejectedValueOnce(new Error('backend reiniciando'))
    const svc = createCatalogService()
    await svc.ensureLoaded()
    expect(localStorage.getItem(LS_KEY)).toBeNull()
    expect(svc.get('we_currency').length).toBeGreaterThan(0)
  })

  it('un cache que solo tiene monedas se ignora y se vuelve a pedir el catalogo', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ we_currency: [{ id: 3041 }] }))
    api.post.mockResolvedValueOnce({ data: { data: CATALOGO } })
    const svc = createCatalogService()
    await svc.ensureLoaded()
    expect(api.post).toHaveBeenCalledWith('/catalog/cataloglist')
    expect(svc.options('we_day_combination').map(o => o.id)).toEqual([3010])
  })

  it('un cache completo se usa sin pedir nada', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(CATALOGO))
    const svc = createCatalogService()
    await svc.ensureLoaded()
    expect(api.post).not.toHaveBeenCalled()
    expect(svc.get('we_day_combination')).toHaveLength(1)
  })
})
