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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  // Método utilitario para ver si hay sesión activa
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
}