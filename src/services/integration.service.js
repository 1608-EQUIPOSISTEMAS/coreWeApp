
import api from './api';

export default class IntegrationService {
    
  async updateLeadBase(payload) {
    return (await api.post('/integration/syncleadstosheet', payload)).data;
  }

  async syncScheduleToSheet(payload) {
    return (await api.post('/integration/syncscheduletosheet', payload)).data;
  }
  
  
}