import api from './api';

export default class FicoService {

  async enrollmentList(payload) {
    const response = (await api.post('/fico/enrollmentlist', payload)).data;
    return response.data;
  }

  async getPaymentDetail(enrollment_id) {
    const response = (await api.post('/fico/paymentdetailget', { enrollment_id })).data;
    return response.data;
  }
}
