// frontend/src/services/ProgramService.js
import api from './api';

export default class ProgramService {
  async programRegister(payload) {
    return (await api.post('/program/programregister', payload)).data;
  }

  async programList(payload) {
    const response = (await api.post('/program/programlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async programVersionCaller(payload) {
    const response = (await api.post('/program/programversioncaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.data.items;
  }

  // Categorias de entrada (VIP/GENERAL/PREMIUM/VIRTUAL) con el precio cargado
  // para esa version de programa. Siempre devuelve las 4.
  async eventCategoryList(program_version_id) {
    const response = (await api.post('/program/eventcategorylist', { program_version_id }, {
      meta: { skipLoader: true }
    })).data;
    return response.data.items;
  }

  async programGet(payload) {
    const response = (await api.post('/program/programget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async programUpdate(payload) {
    return (await api.post('/program/programupdate', payload)).data;
  }

  async programVersionList(payload) {
    const response = (await api.post('/program/programversionlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async programCaller(payload) {
    const response = (await api.post('/program/programcaller', payload,{
                        meta: { skipLoader: true }
                      })).data;
      console.log(response)
      return response.data;
    }

  
  
  async programVersionUpdate(payload) {
    return (await api.post('/program/programversionupdate', payload)).data;
  }

  //programversiondetailget
  async programVersionDetailGet(payload) {
    const response = (await api.post('/program/programversiondetailget', payload)).data;
    console.log(response.data)
    return response.data;
  }

  // Informe de Producto de una linea ('envivo' | 'online') en { date_start, date_end }.
  async reporte(payload) {
    const response = (await api.post('/program/reporte', payload)).data;
    return response.data;
  }

  // Archivos del programa que manda el bot de WhatsApp (docente, brochure, certificado).
  async mediaGet(program_id) {
    return (await api.post('/program/programmediaget', { program_id })).data.data;
  }

  // Los campos van antes del archivo: el backend los lee en orden. Content-Type
  // undefined: el default JSON de api.js haría que axios aplane el FormData a JSON.
  async mediaUpload(program_id, slot, file) {
    const form = new FormData();
    form.append('program_id', String(program_id));
    form.append('slot', slot);
    form.append('file', file);
    return (await api.post('/program/programmediaupload', form, { headers: { 'Content-Type': undefined } })).data.data;
  }

  async mediaDelete(program_id, slot) {
    return (await api.post('/program/programmediadelete', { program_id, slot })).data.data;
  }

  // Blob para la vista previa: en producción /uploads no es público.
  async mediaFile(program_id, slot) {
    return (await api.post('/program/programmediafile', { program_id, slot }, { responseType: 'blob' })).data;
  }
}
