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

  // Recarga forzada: el backend regenera la vista materializada (~4s) antes de
  // responder, así el enrollmentList siguiente trae todo fresco.
  async refreshEnrollmentList() {
    const response = (await api.post('/fico/refreshlist', {}, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
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

  // Pago adicional de becado (certificado): registra el pago suelto y activa
  // la etiqueta Certificar (cat_certificate_status -> pagado).
  async registerAdditionalPayment(payload) {
    const response = (await api.post('/fico/additionalpayment', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  // Edicion del pago de certificado ya registrado (exige justificacion; audita diff).
  async editAdditionalPayment(payload) {
    const response = (await api.post('/fico/additionalpayment/edit', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async sendConfirmationEmail(enrollment_id, sapCreds = {}) {
    const payload = { enrollment_id }
    if (sapCreds.sapUsername != null) payload.sap_username = sapCreds.sapUsername
    if (sapCreds.sapPassword != null) payload.sap_password = sapCreds.sapPassword
    const response = (await api.post('/fico/sendconfirmationemail', payload, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async updateMembershipActivationDate(enrollment_id, activation_date) {
    const response = (await api.patch('/fico/membershipactivationdate', { enrollment_id, activation_date })).data;
    if (!response.ok) throw new Error(response.error || 'No se pudo actualizar la fecha de activacion');
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

  async previewEmail(enrollment_id, override_edition_id = null, activation_date = null, sapCreds = {}, override_program_version_id = null, override_installments = null) {
    const payload = { enrollment_id }
    if (override_edition_id) payload.override_edition_id = override_edition_id
    if (override_program_version_id) payload.override_program_version_id = override_program_version_id
    if (Array.isArray(override_installments)) payload.override_installments = override_installments
    if (activation_date) payload.activation_date = activation_date
    if (sapCreds.sapUsername != null) payload.sap_username = sapCreds.sapUsername
    if (sapCreds.sapPassword != null) payload.sap_password = sapCreds.sapPassword
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

  async approvePendingReview(enrollmentId, activation_date = null) {
    const body = { enrollment_id: enrollmentId };
    if (activation_date) body.activation_date = activation_date;
    const response = (await api.post('/fico/approvependingreview', body, { timeout: SLOW_ENDPOINT_TIMEOUT })).data;
    return response.data;
  }

  async rescheduleInstallments(payload) {
    const response = (await api.post('/fico/rescheduleinstallments', payload)).data;
    return response.data;
  }

  async applyCollectionCampaign(payload) {
    const response = (await api.post('/fico/collectioncampaign', payload)).data;
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

}
