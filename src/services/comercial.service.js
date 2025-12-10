// services/ComercialService.js
import api from './api';

export default class ComercialService {
  async leadRegister(payload) {
    return (await api.post('/comercial/leadregister', payload)).data;
  }
  async enrollmentRegister(payload) {
    return (await api.post('/comercial/enrollmentregister', payload)).data;
  }
  async leadList(payload) {
    const response = (await api.post('/comercial/leadlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async leadGet(payload) {
    const response = (await api.post('/comercial/leadget', payload)).data;
    console.log(response)
    return response.data;
  }

  //comercial/searchcontact
  async searchContact(payload) {
    const response = (await api.post('/comercial/searchcontact', payload)).data;
    console.log(response)
    return response.data;
  }


  async leadUpdate(payload) {
    return (await api.post('/comercial/leadupdate', payload)).data;
  }
  
  
  /*// En tu archivo de servicios del front
  async function uploadEnrollmentFiles(enrollmentId, paymentFile, studentFile) {
    const formData = new FormData();
    formData.append('enrollment_id', enrollmentId);
    
    if (paymentFile) {
      formData.append('payment_file', paymentFile);
    }
    if (studentFile) {
      formData.append('student_file', studentFile);
    }
  
    // Asumiendo que usas axios o fetch configurado
    // Es importante NO establecer Content-Type manualmente, el navegador lo hace
    return axios.post('/comercial/enrollment/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }*/

  async uploadEnrollmentFiles(enrollmentId, paymentFile, studentFile) {
    const formData = new FormData();
    formData.append('enrollment_id', enrollmentId);

    if (paymentFile) {
      formData.append('payment_file', paymentFile);
    }
    if (studentFile) {
      formData.append('student_file', studentFile);
    }

    return (await api.post('/comercial/enrollment/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data;
  }
  
}
