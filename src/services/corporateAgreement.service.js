import api from './api';

export default class CorporateAgreementService {
    
  async corporateAgreementRegister(payload) {
    return (await api.post('/corporateagreement/corporateagreementregister', payload)).data;
  }

  async corporateAgreementList(payload) {
    const response = (await api.post('/corporateagreement/corporateagreementlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async corporateAgreementGet(payload) {
    const response = (await api.post('/corporateagreement/corporateagreementget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async corporateAgreementUpdate(payload) {
    return (await api.post('/corporateagreement/corporateagreementupdate', payload)).data;
  }
  
}