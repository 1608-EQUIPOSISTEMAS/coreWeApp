// frontend/src/services/ProgramService.js
import api from './api';

export default class DiscountService {
    
  async discountRegister(payload) {
    return (await api.post('/discount/discountregister', payload)).data;
  }

  async discountList(payload) {
    const response = (await api.post('/discount/discountlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async discountGet(payload) {
    const response = (await api.post('/discount/discountget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async discountUpdate(payload) {
    return (await api.post('/discount/discountupdate', payload)).data;
  }
  
  async discountCaller(payload) {
    const response = (await api.post('/discount/discountcaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.data;
  }
  
  
}
