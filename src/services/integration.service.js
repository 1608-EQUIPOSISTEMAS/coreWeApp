
import api from './api';

export default class IntegrationService {
    
  async updateLeadBase(payload) {
    return (await api.post('/integration/syncleadstosheet', payload)).data;
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
   
}