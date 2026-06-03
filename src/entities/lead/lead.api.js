// API del dominio Lead. Envuelve la clase ComercialService preservando sus
// firmas; expone una factoria para inyectar el servicio (o instanciarlo por
// defecto) y mantener el store testeable con un doble.
import ComercialService from '@/services/comercial.service'

/**
 * Construye el cliente de API del dominio lead sobre una instancia de
 * ComercialService. Si no se pasa una, instancia la real.
 * @param {ComercialService} [service]
 */
export function createLeadApi(service = new ComercialService()) {
  return {
    leadRegister: (payload) => service.leadRegister(payload),
    leadUpdate: (payload) => service.leadUpdate(payload),
    leadGet: (payload) => service.leadGet(payload),
    leadList: (payload) => service.leadList(payload),
    searchPhoneGet: (payload) => service.searchPhoneGet(payload),
    enrollmentRegister: (payload) => service.enrollmentRegister(payload),
    restrictionsList: (payload = {}) => service.restrictionsList(payload),
    restrictionsUpdate: (payload) => service.restrictionsUpdate(payload)
  }
}

/** @typedef {ReturnType<typeof createLeadApi>} LeadApi */
