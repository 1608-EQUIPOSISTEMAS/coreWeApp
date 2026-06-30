
import api from './api';

export default class IntegrationService {
    
  async updateLeadBase(payload) {
    return (await api.post('/integration/syncleadstosheet', payload)).data;
  }


  async updateEnrollmentBase(payload) {
    return (await api.post('/integration/syncEnrollmentToSheet', payload)).data;
  }

  async syncFicoSalesToSheet() {
    // timeout: 0 = sin timeout. La query FICO + sobreescritura del Sheet supera
    // los 30s globales de axios; sin esto axios aborta con "timeout exceeded".
    return (await api.post('/integration/syncFicoSalesToSheet', undefined, { timeout: 0 })).data;
  }

  async syncFicoToSheets() {
    // 4 hojas en serie, aun mas lento que la de ventas sola → sin timeout.
    return (await api.post('/integration/syncFicoToSheets', undefined, { timeout: 0 })).data;
  }

  async syncScheduleToSheet(payload) {
    return (await api.post('/integration/syncscheduletosheet', payload)).data;
  }
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    return (await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data;
  }

  
  async syncRprospectos(payload) {
    const response = (await api.post('/integration/syncrprospectos', payload)).data;
    return response;
  }
     
}