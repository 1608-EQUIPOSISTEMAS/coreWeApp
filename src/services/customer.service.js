// frontend/src/services/ProgramService.js
import api from './api';

export default class CustomerService {
  async customerRegister(payload) {
    return (await api.post('/customer/customerregister', payload)).data;
  }

  async customerList(payload) {
    const response = (await api.post('/customer/customerlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async customerGet(payload) {
    const response = (await api.post('/customer/customerget', payload)).data;
    console.log(response.data)
    return response.data;
  }

  async customerUpdate(payload) {
    return (await api.post('/customer/customerupdate', payload)).data;
  }

  async sunatGet(payload) {
    const response = (await api.post('/customer/sunatget', payload)).data;
    console.log(response.data)
    return response.data;
  }



  // buscar cliente por documento (para modal de inscripción)
// fastify.post('/customerinfoget', {
//   schema: {
//     body: {
//       type: 'object',
//       required: ['document'],
//       additionalProperties: false,
//       properties: {
//         document: { type: 'string' }
//       }
//     }
//   }
// }, async (req, reply) => {
//   const data = await customerService.customerInfoGet(req.body)
//   const status = data.result === 1 ? 200 : data.result === 2 ? 422 : 404
//   return reply.code(status).send({ ok: data.result === 1, data })
// })

  async customerInfoGet(payload) {
    const response = (await api.post('/customer/customerinfoget', payload)).data;
    console.log(response.data)
    return response.data;
  }




}
