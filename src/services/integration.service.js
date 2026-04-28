
import api from './api';

export default class IntegrationService {
    
  async updateLeadBase(payload) {
    return (await api.post('/integration/syncleadstosheet', payload)).data;
  }


  async updateEnrollmentBase(payload) {
    return (await api.post('/integration/syncEnrollmentToSheet', payload)).data;
  }

  async syncFicoSalesToSheet() {
    return (await api.post('/integration/syncFicoSalesToSheet')).data;
  }

  async syncFicoToSheets() {
    return (await api.post('/integration/syncFicoToSheets')).data;
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