import api from './api';

// Módulo de Configuración: usuarios, roles y permisos por módulo (solo ADMIN).
export default class ConfigService {

  async userList() {
    return (await api.post('/config/userlist', {})).data.data;
  }

  async userRegister(payload) {
    return (await api.post('/config/userregister', payload)).data;
  }

  async userUpdate(payload) {
    return (await api.post('/config/userupdate', payload)).data;
  }

  async roleList() {
    return (await api.post('/config/rolelist', {})).data.data;
  }

  async roleRegister(payload) {
    return (await api.post('/config/roleregister', payload)).data;
  }

  async roleUpdate(payload) {
    return (await api.post('/config/roleupdate', payload)).data;
  }

  async moduleList() {
    return (await api.post('/config/modulelist', {})).data.data;
  }

  async permissionUpdate(payload) {
    return (await api.post('/config/permissionupdate', payload)).data;
  }

  // Cursos online del Campus que entran a la membresía.
  async membershipCourseList() {
    return (await api.post('/config/membershipcourselist', {})).data.data;
  }

  async membershipCourseSave(channelIds) {
    return (await api.post('/config/membershipcoursesave', { channel_ids: channelIds })).data;
  }

  // Bitácora de auditoría. Vive bajo /api/audit (módulo propio en el backend)
  // pero se expone aquí porque la vista cuelga de Configuración: un servicio
  // nuevo son tres archivos y un app.provide fácil de olvidar.
  async auditLog(filters) {
    return (await api.post('/audit/loglist', filters)).data.data;
  }
}
