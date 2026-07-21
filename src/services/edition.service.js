
import api from './api';

export default class EditionService {
    
  async editionRegister(payload) {
    return (await api.post('/edition/editionregister', payload)).data;
  }

  async editionList(payload) {
    const response = (await api.post('/edition/editionlist', payload)).data;
    console.log(response)
    return response.data;
  }

  //editionbyweeklist
  async editionByWeekList(payload) {
    const response = (await api.post('/edition/editionbyweeklist', payload)).data;
    console.log(response)
    return response.data;
  }
  

  async editionGet(payload) {
    const response = (await api.post('/edition/editionget', payload)).data;
    console.log(response.data)
    return response.data;
  }

  //editiontreeget
  async editionTreeGet(payload) {
    const response = (await api.post('/edition/editiontreeget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  
  async editionUpdate(payload) {
    return (await api.post('/edition/editionupdate', payload)).data;
  }
  
  // Vista Semanal Academica: aulas en curso por dia con nº de sesion.
  async weeklySessions(payload) {
    const response = (await api.post('/edition/weeklysessions', payload)).data
    return response.data
  }

  // Control de ediciones: aulas que inician en la semana + estados por sesion.
  async weeklyControl(payload) {
    const response = (await api.post('/edition/weeklycontrol', payload)).data
    return response.data
  }

  // Guarda estado de una sesion (A/R/T + fecha reprogramada) y devuelve la
  // fila recalculada del aula. Sin loader global: el guardado es por celda.
  async sessionControlSave(payload) {
    const response = (await api.post('/edition/sessioncontrolsave', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data
  }

  async classroomMetricsList(payload) {
    const response = (await api.post('/edition/classroommetricslist', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomStudentsList(payload) {
    const response = (await api.post('/edition/classroomstudentslist', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomStudentsHistory(payload) {
    const response = (await api.post('/edition/classroomstudentshistory', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomAuditGet(payload) {
    const response = (await api.post('/edition/classroomauditget', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomAuditSummaryList(payload) {
    const response = (await api.post('/edition/classroomauditsummarylist', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomAuditSave(payload) {
    const response = (await api.post('/edition/classroomauditsave', payload, {
      meta: { skipLoader: true }
    })).data
    return response
  }

  async classroomGradesGet(payload) {
    const response = (await api.post('/edition/classroomgradesget', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  async classroomGradesSave(payload) {
    const response = (await api.post('/edition/classroomgradessave', payload, {
      meta: { skipLoader: true }
    })).data
    return response
  }

  // Certificar aula en Odoo: notas → evaluaciones + certificación masiva +
  // PDFs. Puede tardar varios minutos con un aula completa.
  async classroomOdooCertify(payload) {
    const response = (await api.post('/edition/classroomodoocertify', payload, {
      meta: { skipLoader: true },
      timeout: 300000
    })).data
    return response
  }

  // Datos del Reporte Academico: una sola llamada ligera (ediciones curso +
  // resumen de auditoria juntos). Reemplaza al par editionList(500) +
  // classroomAuditSummaryList que tardaba 15s+ contra la BD remota.
  async academicReport(payload = {}) {
    const response = (await api.post('/edition/academicreport', payload, {
      meta: { skipLoader: true }
    })).data
    return response.data || []
  }

  // Recomendaciones IA del Reporte Academico (Ollama local). El backend hace
  // hasta 2 intentos de ~60s; sin loader global (la carta muestra el suyo).
  async reportRecommendations(payload) {
    const response = (await api.post('/edition/reportrecommendations', payload, {
      meta: { skipLoader: true },
      timeout: 150000
    })).data
    return response
  }

  // Borradores de observacion con la IA local (Ollama). Puede tardar ~1 min
  // con un aula completa; timeout amplio y sin loader global.
  async classroomGradesObservations(payload) {
    const response = (await api.post('/edition/classroomgradesobservations', payload, {
      meta: { skipLoader: true },
      timeout: 180000
    })).data
    return response
  }

  async classroomAuditRunAi({ edition_id, session_number, transcript_text, syllabus_image }) {
    const fd = new FormData()
    fd.append('edition_id', String(edition_id))
    fd.append('session_number', String(session_number))
    fd.append('transcript_text', transcript_text)
    fd.append('syllabus_image', syllabus_image)
    // Timeout amplio (10 min): Gemini con AFC puede iterar hasta 10 veces
    // internamente para auto-corregir el output contra el schema. Cada
    // iteracion son ~30-60s con thinking, asi que el peor caso real ronda
    // los 8 min. Cortar antes desperdicia tokens ya gastados.
    const response = (await api.post('/edition/classroomauditrunai', fd, {
      headers: { 'Content-Type': undefined },
      timeout: 600000,
    })).data
    return response
  }

  //editionCaller
  async editionCaller(payload) {
    const response = (await api.post('/edition/editioncaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.items;
  }
  
  async editionTreeRegister(payload) {
    return (await api.post('/edition/editiontreeregister', payload)).data;
  }

  async editionTreeUpdate(payload) {
    return (await api.post('/edition/editiontreeupdate', payload)).data;
  }
  
  async auditLogsGet(payload) {
    // Nota: Asegúrate que en tu Backend la ruta sea '/edition/auditlogsget' 
    // o cambia aquí a '/audit-logs/get' según como lo hayas definido en Fastify.
    const response = (await api.post('/edition/auditlogsget', payload)).data;
    return response.data;
  }

  //edition_extra_info_caller
  async editionExtraInfoCaller(payload) {
    const response = (await api.post('/edition/editionextrainfocaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.items;
  }

  async bulkUpdateWhatsapp(items) {
    const response = (await api.post('/edition/bulkupdatewhatsapp', { items })).data;
    return response.data;
  }

  async a5PendingEnrollments(editionNumId) {
    const response = (await api.post('/edition/a5pendingenrollments', { edition_num_id: editionNumId })).data;
    return response.items || [];
  }

  async a5MigrationExecute(payload) {
    const response = (await api.post('/edition/a5migrationexecute', payload, {
      timeout: 60000
    })).data;
    return response;
  }

  async downloadSchedulePdf(parentEditionId, childEditionId) {
    const response = await api.post(
      '/edition/schedule-pdf',
      { parent_edition_id: parentEditionId, child_edition_id: childEditionId },
      { responseType: 'blob', meta: { skipLoader: true } }
    )
    return response.data
  }

}