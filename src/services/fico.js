import api from './api';

// Endpoints que llaman a Odoo en serie sobre 50+ canales online (memberships) o
// crean un sale.order con cuotas. El timeout default de 30s se queda corto.
// 120s deja margen para Odoo lento + email + audit logs en la misma transaccion.
const SLOW_ENDPOINT_TIMEOUT = 120000

export default class FicoService {

  async enrollmentRegister(payload) {
    const response = (await api.post('/fico/enrollmentregister', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async enrollmentList(payload) {
    const response = (await api.post('/fico/enrollmentlist', payload)).data;
    return response.data;
  }

  async enrollmentAdvisorsList() {
    const response = (await api.get('/fico/enrollmentadvisors')).data;
    return response.data;
  }

  async getKpisDaily(today, yesterday) {
    const response = (await api.get('/fico/kpisdaily', { params: { today, yesterday } })).data;
    return response.data;
  }

  async getJobStatus(enrollmentId, jobType = null) {
    const params = jobType ? { jobType } : undefined;
    const response = (await api.get(`/fico/job-status/${enrollmentId}`, { params })).data;
    return response.data;
  }

  async getPaymentDetail(enrollment_id) {
    const response = (await api.post('/fico/paymentdetailget', { enrollment_id })).data;
    return response.data;
  }

  async getBankAccounts() {
    const response = (await api.get('/fico/bankaccounts')).data;
    return response.data;
  }

  async enrollInOdoo(enrollment_id) {
    const response = (await api.post('/fico/enrollinodoo', { enrollment_id }, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async confirmPayment(payload) {
    const response = (await api.post('/fico/confirmpayment', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async confirmInstallment(payload) {
    const response = (await api.post('/fico/confirminstallment', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async sendConfirmationEmail(enrollment_id) {
    const response = (await api.post('/fico/sendconfirmationemail', { enrollment_id }, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async sendPaymentConfirmationEmail(enrollment_id) {
    const response = (await api.post('/fico/sendpaymentconfirmationemail', { enrollment_id }, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async syncInstallmentPayment(enrollment_id) {
    const response = (await api.post('/fico/syncinstallmentpayment', { enrollment_id }, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async getAvailableEditions(enrollment_id) {
    const response = (await api.post('/fico/availableeditions', { enrollment_id })).data;
    return response.data;
  }

  async getProgramPrice(program_version_id) {
    const response = (await api.post('/fico/programprice', { program_version_id })).data;
    return response.data;
  }

  async previewEmail(enrollment_id, override_edition_id = null) {
    const payload = { enrollment_id }
    if (override_edition_id) payload.override_edition_id = override_edition_id
    const response = (await api.post('/fico/previewemail', payload)).data;
    return response.data;
  }

  async retireEnrollment(payload) {
    const response = (await api.post('/fico/retireenrollment', payload)).data;
    return response.data;
  }

  async deleteEnrollment(enrollment_id) {
    const response = (await api.post('/fico/deleteenrollment', { enrollment_id })).data;
    return response.data;
  }

  async getEnrollmentFlags(enrollment_id) {
    const response = (await api.post('/fico/enrollmentflags', { enrollment_id })).data;
    return response.data;
  }

  async changeProfile(payload) {
    const response = (await api.post('/fico/changeprofile', payload)).data;
    return response.data;
  }

  async editStudent(payload) {
    const response = (await api.post('/fico/editstudent', payload)).data;
    return response.data;
  }

  async editInstallmentAmount(payload) {
    const response = (await api.post('/fico/editinstallmentamount', payload)).data;
    return response.data;
  }

  async addInstallment(payload) {
    const response = (await api.post('/fico/addinstallment', payload)).data;
    return response.data;
  }

  async changeModality(payload) {
    const response = (await api.post('/fico/changemodality', payload)).data;
    return response.data;
  }

  async editSellerAgent(payload) {
    const response = (await api.post('/fico/editselleragent', payload)).data;
    return response.data;
  }

  async getCollections(payload) {
    const response = (await api.post('/fico/collections', payload)).data;
    return response.data;
  }

  async courseChange(payload) {
    const response = (await api.post('/fico/coursechange', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async reprogramEdition(payload) {
    const response = (await api.post('/fico/reprogramedition', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async approvePendingReview(enrollmentId) {
    const response = (await api.post('/fico/approvependingreview', { enrollment_id: enrollmentId }, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async rescheduleInstallments(payload) {
    const response = (await api.post('/fico/rescheduleinstallments', payload)).data;
    return response.data;
  }

  async enrollmentUpdate(payload) {
    const response = (await api.post('/fico/enrollmentupdate', payload)).data;
    return response.data;
  }

  async getAuditLog(enrollment_id) {
    const response = (await api.post('/fico/auditlog', { enrollment_id })).data;
    return response.data;
  }

  async getEmailLogs(enrollment_id) {
    const response = (await api.post('/fico/emaillogs', { enrollment_id })).data;
    return response.data;
  }

  async rejectEnrollment(payload) {
    const response = (await api.post('/fico/rejectenrollment', payload)).data;
    return response.data;
  }

  async resubmitEnrollment(payload) {
    const response = (await api.post('/fico/resubmitenrollment', payload)).data;
    return response.data;
  }

  async getProgramChildren(programVersionId, parentEditionId = null) {
    const url = parentEditionId
      ? `/fico/programchildren/${programVersionId}?parent_edition_id=${parentEditionId}`
      : `/fico/programchildren/${programVersionId}`
    const response = (await api.get(url)).data;
    return response.data;
  }

  async getValidations(enrollmentId) {
    const response = (await api.get(`/fico/validations/${enrollmentId}`)).data;
    return response.data;
  }

  async saveValidations(payload) {
    const response = (await api.post('/fico/validations', payload)).data;
    return response.data;
  }

  async tokenList(params) {
    const response = (await api.get('/token/list', { params })).data;
    return response.data;
  }

  async tokenCreate(payload) {
    const response = (await api.post('/token/create', payload)).data;
    return response.data;
  }

  async tokenUpdate(payload) {
    const response = (await api.put('/token/update', payload)).data;
    return response.data;
  }

  async tokenMarkPaid(payload) {
    const response = (await api.post('/token/markpaid', payload)).data;
    return response.data;
  }

  async tokenConfirm(payload) {
    const response = (await api.post('/token/confirm', payload)).data;
    return response.data;
  }

  async tokenDelete(id) {
    const response = (await api.delete(`/token/delete/${id}`)).data;
    return response.data;
  }

  async tokenGetById(id) {
    const response = (await api.get(`/token/${id}`)).data;
    return response.data;
  }

  async tokenEditInscription(payload) {
    const response = (await api.put('/token/edit-inscription', payload)).data;
    return response.data;
  }

  async getClassroomExportOptions() {
    const response = (await api.get('/fico/classroomexport/options')).data;
    return response.data;
  }

  async downloadClassroomExport(programVersionId, editionNumId) {
    return await api.get('/fico/classroomexport', {
      params: { programVersionId, editionNumId },
      responseType: 'blob'
    });
  }
}
