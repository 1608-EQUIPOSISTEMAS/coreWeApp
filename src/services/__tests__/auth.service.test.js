import { describe, it, expect, vi } from 'vitest'
import AuthService from '../auth.service.js'

// El universo B2B se arma con dos roles: el que solo tiene LIDER_B2B tiene que
// entrar igual, y el que carga los dos no puede salir duplicado.
describe('userListB2B', () => {
  it('une B2B y LIDER_B2B sin duplicar al que tiene ambos', async () => {
    const service = new AuthService()
    service.userListByRole = vi.fn(async (rol) => rol === 'B2B'
      ? [{ user_id: 40, alias: 'JF39' }, { user_id: 38, alias: 'NY12' }]
      : [{ user_id: 38, alias: 'NY12' }, { user_id: 99, alias: 'SOLOLIDER' }])

    const users = await service.userListB2B()

    expect(users.map(u => u.user_id).sort()).toEqual([38, 40, 99])
  })
})
