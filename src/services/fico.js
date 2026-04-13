import api from './api';

export default class FicoService {

  async enrollmentRegister(payload) {
    const response = (await api.post('/fico/enrollmentregister', payload)).data;
    return response.data;
  }

  async enrollmentList(payload) {
    const response = (await api.post('/fico/enrollmentlist', payload)).data;
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
    const response = (await api.post('/fico/enrollinodoo', { enrollment_id })).data;
    return response.data;
  }

  async confirmPayment(payload) {
    const response = (await api.post('/fico/confirmpayment', payload)).data;
    return response.data;
  }

  async sendConfirmationEmail(enrollment_id) {
    const response = (await api.post('/fico/sendconfirmationemail', { enrollment_id })).data;
    return response.data;
  }

  async sendPaymentConfirmationEmail(enrollment_id) {
    const response = (await api.post('/fico/sendpaymentconfirmationemail', { enrollment_id })).data;
    return response.data;
  }

  async sendActivationEmail(enrollment_id) {
    const response = (await api.post('/fico/sendactivationemail', { enrollment_id })).data;
    return response.data;
  }

  async syncInstallmentPayment(enrollment_id) {
    const response = (await api.post('/fico/syncinstallmentpayment', { enrollment_id })).data;
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

  async previewEmail(enrollment_id) {
    const response = (await api.post('/fico/previewemail', { enrollment_id })).data;
    return response.data;
  }

  async retireEnrollment(payload) {
    const response = (await api.post('/fico/retireenrollment', payload)).data;
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

  async changeModality(payload) {
    const response = (await api.post('/fico/changemodality', payload)).data;
    return response.data;
  }

  async courseChange(payload) {
    const response = (await api.post('/fico/coursechange', payload)).data;
    return response.data;
  }

  async reprogramEdition(payload) {
    const response = (await api.post('/fico/reprogramedition', payload)).data;
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
}
