// src/services/AuthService.js
import api from './api'; // Asumo que este es tu axios configurado

export default class AuthService {

  //auth/userlist
  async userList(payload) {
    const response = (await api.post('/auth/userlist', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.data;
  }

  // Lista users filtrados por alias de rol (ej. 'B2B', 'COMERCIAL').
  // Usado en formularios donde el catalogo de asesores depende del canal.
  async userListByRole(roleAlias) {
    const response = (await api.post('/auth/userlist-by-role', { role_alias: roleAlias }, {
      meta: { skipLoader: true }
    })).data;
    return response.data;
  }

  // Universo de asesores de convenio: el rol raso B2B mas el de lider. Pedir un
  // solo alias dejaba fuera al que solo tiene LIDER_B2B, que tambien cierra
  // ventas de convenio (mismo agujero que tenia sp_user_list con
  // LIDER_COMERCIAL). Sin catch: quien llama decide si degrada o avisa.
  async userListB2B() {
    const listas = await Promise.all(
      ['B2B', 'LIDER_B2B'].map(rol => this.userListByRole(rol))
    );
    const porId = new Map();
    for (const u of listas.flat()) if (!porId.has(u.user_id)) porId.set(u.user_id, u);
    return [...porId.values()];
  }


  // src/services/AuthService.js (Vue)
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    const data = response.data

    if (data.data && data.data.token) {
      localStorage.setItem('token', data.data.token);
      
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data.data;
  }

  // Método para cerrar sesión
  logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login' // <-- asegura redirección limpia
}
  
  // Método utilitario para ver si hay sesión activa
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
}