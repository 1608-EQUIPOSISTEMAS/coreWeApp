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
  
  
  // Método para iniciar sesión
  async login(credentials) {
    // Ajusta la URL '/auth/login' según tu backend real
    const response = await api.post('/auth/login', credentials);
    console.log("datas")
    const data = response.data
    // Asumimos que el backend devuelve algo como: { data: { token: '...', user: {...} } }
    if (data.data && data.data.token) {
      console.log("bers")
      // Guardamos el token en LocalStorage para que persista
      localStorage.setItem('token', data.data.token);
      
      // Opcional: Guardar datos del usuario
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data.data;
  }

  // Método para cerrar sesión
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  // Método utilitario para ver si hay sesión activa
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
}