import api from './api';

export default class FicoService {

  async enrollmentList(payload) {
    const response = (await api.post('/fico/enrollmentlist', payload)).data;
    console.log(response)
    return response.data;
  }
}
