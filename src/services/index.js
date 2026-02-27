import api from './api'
import ProgramService from './program.service'
import ComercialService from './comercial.service'
import DiscountService from './discount.service'
import InstructorService from './instructor.service'
import EditionService from './edition.service'
import CustomerService from './customer.service'
import AuthService from './auth.service'
import CorporateAgreementService from './corporateAgreement.service'
import IntegrationService from './integration.service'
import FicoService from './fico';
import DashboardService from './dashboard.service'

import NotificationService from './notificationService'

// Re-exportar para fácil acceso
export { createCatalogService } from './catalog.service'

// Symbols para inject (evita colisiones)
export const ServiceKeys = {
  Program:   Symbol('ProgramService'),
  Comercial: Symbol('ComercialService'),
  Discount: Symbol('DiscountService'),
  Instructor: Symbol('InstructorService'),
  Edition: Symbol('EditionService'),
  Customer: Symbol('CustomerService'),
  Auth:      Symbol('AuthService'),
  CorporateAgreement: Symbol('CorporateAgreementService'),
  Integration: Symbol('IntegrationService'),
Notification: Symbol('NotificationService'),
  Fico: Symbol('FicoService'),
  Dashboard: Symbol('DashboardService')
}

export function createServices() {
  return {
    [ServiceKeys.Program]:   new ProgramService(api),
    [ServiceKeys.Comercial]: new ComercialService(api),
    [ServiceKeys.Discount]: new DiscountService(api),
    [ServiceKeys.Customer]: new CustomerService(api),
    [ServiceKeys.Instructor]: new InstructorService(api),
    [ServiceKeys.Edition]: new EditionService(api),
    [ServiceKeys.Auth]:      new AuthService(api),
    [ServiceKeys.CorporateAgreement]: new CorporateAgreementService(api),
    [ServiceKeys.Integration]: new IntegrationService(api),
    [ServiceKeys.Fico]: new FicoService(api),
[ServiceKeys.Notification]: new NotificationService(),
    [ServiceKeys.Dashboard]: new DashboardService(api)
  }
}
