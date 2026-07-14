
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
    // Fire-and-forget: el backend responde al instante (202) y sincroniza en
    // segundo plano. El progreso se consulta con getFicoSyncStatus().
    return (await api.post('/integration/syncFicoToSheets')).data;
  }

  async getFicoSyncStatus() {
    return (await api.get('/integration/syncFicoToSheets/status')).data;
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