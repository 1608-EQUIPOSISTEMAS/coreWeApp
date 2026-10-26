import { h, resolveComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout'

//is ntanciar toast
import { useToast } from 'vue-toastification'
import { canAccess, readSession } from '@/shared/lib/navAccess.js'
const toast = useToast()

const RouterViewStub = {
  render() {
    return h(resolveComponent('router-view'))
  },
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DefaultLayout,
    // Home segun rol: ADMIN al dashboard, el resto al cronograma de solo
    // lectura (pedido 17/07). Mismo criterio que el post-login de Login.vue.
    redirect: () => {
      return homeFor(readSession())
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () =>
          import(
            /* webpackChunkName: "dashboard" */ '@/views/dashboard/Dashboard.vue'
          ),
      },

      // =====================
      // TICKETS
      // =====================
      // meta.module sin meta.roles: el guard (más abajo) solo consulta la
      // matriz de Configuración en ese caso (ver "CASO C"). ADMIN entra igual
      // porque el backend le otorga TODOS los módulos activos en
      // /config/mymodules, así que no hace falta listarlo aparte. El alcance
      // de lo que ve cada quien (ADMIN y GERENCIA todo, un líder lo de su
      // área, el resto lo suyo) lo sigue decidiendo el backend en
      // ticketScopeFor, no el router.
      {
        path: 'tickets',
        name: 'Tickets',
        meta: { module: 'TICKETS' },
        component: () =>
          import(
            /* webpackChunkName: "tickets" */ '@/views/tickets/TicketsView.vue'
          ),
      },
      // Documentos del módulo. Rutas estáticas: Vue Router las prioriza sobre
      // 'tickets/:id', así que "documentos" nunca se lee como un id de ticket.
      // Solo ADMIN: roles sin submodule = se abre solo por rol (CASO C).
      {
        path: 'tickets/documentos',
        name: 'TicketsDocumentos',
        meta: { module: 'TICKETS', roles: ['ADMIN'] },
        component: () =>
          import(
            /* webpackChunkName: "tickets" */ '@/views/tickets/documentos/TicketDocumentsView.vue'
          ),
      },
      {
        path: 'tickets/documentos/nuevo',
        name: 'TicketsDocumentoNuevo',
        meta: { module: 'TICKETS', roles: ['ADMIN'] },
        component: () =>
          import(
            /* webpackChunkName: "tickets" */ '@/views/tickets/documentos/TicketDocumentFormPage.vue'
          ),
      },
      {
        path: 'tickets/:id',
        name: 'TicketDetalle',
        meta: { module: 'TICKETS' },
        component: () =>
          import(
            /* webpackChunkName: "tickets" */ '@/views/tickets/TicketDetailPage.vue'
          ),
      },

      // =====================
      // FICO
      // =====================
      {
        path: 'fico',
        name: 'FICO',
        component: RouterViewStub,
        redirect: { name: 'FicoInscripciones' },
        meta: { module: 'FICO', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'LIDER_COMERCIAL', 'COMERCIAL', 'GERENCIA'] },
        children: [
          {
            path: 'inscripciones',
            name: 'enrollment',
            component: () => import('@/views/fico/Enrollment.vue'),
            meta: { submodule: 'INSCRIPCIONES', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          {
            path: 'inscripciones/new',
            name: 'enrollmentForm',
            component: () => import('@/views/fico/EnrollmentForm.vue'),
            meta: { submodule: 'INSCRIPCIONES', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          {
            path: 'inscripciones/:id',
            name: 'enrollmentDetail',
            component: () => import('@/views/fico/enrollment/EnrollmentDetailView.vue'),
            props: true,
            meta: { submodule: 'INSCRIPCIONES', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          {
            path: 'tokens',
            name: 'ficoTokens',
            component: () => import('@/views/fico/TokenPage.vue'),
            meta: { submodule: 'TOKENS', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'LIDER_COMERCIAL', 'COMERCIAL', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'cobranzas',
            name: 'ficoCollections',
            component: () => import('@/views/fico/Collections.vue'),
            meta: { submodule: 'COBRANZAS', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          {
            path: 'membresias',
            name: 'ficoMembershipExpiries',
            component: () => import('@/views/fico/MembershipExpiries.vue'),
            meta: { submodule: 'MEMBRESIAS', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          {
            path: 'retirados',
            name: 'ficoRetirados',
            component: () => import('@/views/fico/Retirados.vue'),
            meta: { submodule: 'RETIRADOS', roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'] },
          },
          // Informe del area contra sus objetivos (una pagina, como el Comercial).
          {
            path: 'reporte',
            name: 'ReporteFico',
            component: () => import('@/views/fico/ReporteFico.vue'),
            meta: { submodule: 'REPORTE', roles: ['ADMIN', 'LIDER_FICO', 'GERENCIA'] },
          },
          // Ventas por Linea -> Tipo de programa (dia/mes/año) y margen por programa.
          {
            path: 'rentabilidad',
            name: 'ficoRentabilidad',
            component: () => import('@/views/fico/Rentabilidad.vue'),
            meta: { submodule: 'RENTABILIDAD', roles: ['ADMIN', 'LIDER_FICO', 'GERENCIA', 'FICO'] },
          },
          // Consultor mensual de ingresos sin B2B (reemplaza el sheet "Ing. Operativos").
          // Ingresos Operativos y Pagos Adicionales: solo ADMIN hasta habilitarlos;
          // el resto entra cuando se le marque la casilla en Roles y Permisos.
          {
            path: 'ingresos-operativos',
            name: 'ficoIngresosOperativos',
            component: () => import('@/views/fico/IngresosOperativos.vue'),
            meta: { submodule: 'INGRESOS_OPERATIVOS', roles: ['ADMIN'] },
          },
          // Registro de pagos adicionales (reemplaza el sheet de adicionales).
          {
            path: 'pagos-adicionales',
            name: 'ficoPagosAdicionales',
            component: () => import('@/views/fico/PagosAdicionales.vue'),
            meta: { submodule: 'PAGOS_ADICIONALES', roles: ['ADMIN'] },
          },
          // Formulario en su propia página, como inscripciones/new.
          {
            path: 'pagos-adicionales/new',
            name: 'ficoPagoAdicionalNuevo',
            component: () => import('@/views/fico/pagos-adicionales/PagoAdicionalForm.vue'),
            meta: { submodule: 'PAGOS_ADICIONALES', roles: ['ADMIN'] },
          },
          {
            path: 'pagos-adicionales/:id(\\d+)',
            name: 'ficoPagoAdicionalEditar',
            component: () => import('@/views/fico/pagos-adicionales/PagoAdicionalForm.vue'),
            meta: { submodule: 'PAGOS_ADICIONALES', roles: ['ADMIN'] },
          },
          // {
          //   path: 'reportes',
          //   name: 'FicoReportes',
          //   component: () => import('@/views/fico/Reportes.vue'),
          //   meta: { roles: ['ADMIN', 'FICO', 'GERENCIA'] },
          // },
        ],
      },

      // =====================
      // PRODUCTO
      // =====================
      {
        path: 'producto',
        name: 'Producto',
        component: RouterViewStub,
        redirect: { name: 'program' },
        meta: { module: 'PRODUCTO', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
        children: [
          {
            path: 'programas',
            name: 'program',
            component: () => import('@/views/producto/Programs.vue'),
            meta: { submodule: 'PROGRAMAS', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'programas/new',
            name: 'ProgramNew',
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { submodule: 'PROGRAMAS', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'programas/:id',
            name: 'ProgramEdit',
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { submodule: 'PROGRAMAS', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes',
            name: 'Instructor',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Instructors.vue'),
            meta: { submodule: 'DOCENTES', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes/new',
            name: 'InstructorNew',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { submodule: 'DOCENTES', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes/:id',
            name: 'InstructorEdit',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { submodule: 'DOCENTES', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'cronograma',
            name: 'Edition',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Editions.vue'),
            meta: { submodule: 'CRONOGRAMA', roles: ['ADMIN', 'LIDER_PRODUCTO', 'PRODUCTO', 'LIDER_COMERCIAL', 'GERENCIA', 'ACADEMICA'] },
          },
          {
            path: 'planificacion',
            name: 'SchedulePlanner',
            // Cronograma borrador: arma la programacion de un anio futuro sin
            // tocar program_editions. Mismos roles que el cronograma real,
            // porque publicar crea ediciones de verdad.
            component: () => import('@/views/producto/SchedulePlanner.vue'),
            meta: { submodule: 'PLANIFICACION', roles: ['ADMIN', 'LIDER_PRODUCTO', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'cronograma-vista',
            name: 'ScheduleBoard',
            // Vista de solo lectura del cronograma: visible para TODOS los roles.
            // Necesita su propia meta.roles porque, sin ella, hereda la del grupo
            // padre 'producto' (ADMIN/PRODUCTO/GERENCIA) y el guard bloquea al resto.
            component: () => import('@/views/producto/ScheduleBoard.vue'),
            // Casilla propia CRONOGRAMA (no la del grupo Producto). roles: null
            // pisa los roles heredados del padre 'producto', que la cerrarían.
            meta: { module: 'CRONOGRAMA', roles: null },
          },
          {
            path: 'precios',
            name: 'Prices',
            component: () => import('@/views/producto/Prices.vue'),
            meta: { submodule: 'PRECIOS', roles: ['ADMIN', 'GERENCIA'] },
          },
          {
            path: 'links',
            name: 'BulkLinks',
            component: () => import('@/views/producto/BulkLinks.vue'),
            meta: { submodule: 'LINKS', roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          // Informe del area contra sus objetivos; En vivo y Online son pestañas.
          {
            path: 'reporte',
            name: 'ReporteProducto',
            component: () => import('@/views/producto/ReporteProducto.vue'),
            meta: { submodule: 'REPORTE', roles: ['ADMIN', 'LIDER_PRODUCTO', 'GERENCIA'] },
          },
          // Que se vende mas en En Vivo, Online y Membresias (la venta de FICO, sin margenes).
          {
            path: 'ventas',
            name: 'VentasProducto',
            component: () => import('@/views/producto/VentasProducto.vue'),
            meta: { submodule: 'VENTAS', roles: ['ADMIN', 'LIDER_PRODUCTO', 'PRODUCTO', 'GERENCIA'] },
          },
        ],
      },

      // =====================
      // GERENCIA
      // =====================
      {
        path: 'gerencia',
        name: 'Gerencia',
        component: RouterViewStub,
        redirect: { name: 'GerenciaEmbudo' },
        meta: { module: 'GERENCIA', roles: ['ADMIN', 'GERENCIA', 'LIDER_COMERCIAL'] },
        children: [
          {
            path: 'embudo',
            name: 'GerenciaEmbudo',
            // Embudo consultas -> ventas por edición y canal. Reemplaza al Sheet
            // "Reporte de Consultas 2026".
            component: () => import('@/views/gerencia/Embudo.vue'),
            meta: { submodule: 'EMBUDO', roles: ['ADMIN', 'GERENCIA'] },
          },
          {
            path: 'objetivos',
            name: 'GerenciaObjetivos',
            // Objetivos de ventas y consultas por edición. El estándar sale de
            // Gerencia > Parámetros y aquí se ajusta edición por edición; antes
            // se editaban desde Producto > Cronograma.
            component: () => import('@/views/gerencia/Objetivos.vue'),
            meta: { submodule: 'OBJETIVOS', roles: ['ADMIN', 'GERENCIA', 'LIDER_COMERCIAL'] },
          },
          {
            path: 'parametros',
            name: 'GerenciaParametros',
            // El "Plan 2027" adentro del ERP: el objetivo estándar por programa,
            // de donde sale el de cada edición futura.
            component: () => import('@/views/gerencia/Parametros.vue'),
            meta: { submodule: 'PARAMETROS', roles: ['ADMIN', 'GERENCIA'] },
          },
          {
            path: 'reporte-completo',
            name: 'GerenciaReporteCompleto',
            // Antes vivía en Marketing como "Reporte Completo" (/marketing/overview).
            // Al eliminarse el módulo Marketing (2026-08-26) la vista se mudó a
            // views/gerencia/; el contenido no cambió.
            component: () => import('@/views/gerencia/IngresosDiarios.vue'),
            meta: { submodule: 'REPORTE_COMPLETO', roles: ['ADMIN', 'GERENCIA'] },
          },
        ],
      },
      // =====================
      // B2B
      // =====================
      {
        path: 'business',
        name: 'Business',
        component: RouterViewStub,
        redirect: { name: 'B2BCompanies' },
        meta: { module: 'B2B', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
        children: [
          {
            path: 'companies',
            name: 'B2BCompanies',
            component: () => import('@/views/b2b/companies/Index.vue'),
            meta: { submodule: 'EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'companies/new',
            name: 'B2BCompanyNew',
            component: () => import('@/views/b2b/companies/Form.vue'),
            meta: { submodule: 'EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'companies/:id',
            name: 'B2BCompanyEdit',
            component: () => import('@/views/b2b/companies/Form.vue'),
            meta: { submodule: 'EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'company-leads',
            name: 'B2BCompanyLeads',
            component: () => import('@/views/b2b/company-leads/Index.vue'),
            meta: { submodule: 'LEADS_EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'company-leads/new',
            name: 'B2BCompanyLeadNew',
            component: () => import('@/views/b2b/company-leads/Form.vue'),
            meta: { submodule: 'LEADS_EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'company-leads/:id',
            name: 'B2BCompanyLeadEdit',
            component: () => import('@/views/b2b/company-leads/Form.vue'),
            meta: { submodule: 'LEADS_EMPRESAS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'contracts',
            name: 'B2BContracts',
            component: () => import('@/views/b2b/contracts/Index.vue'),
            meta: { submodule: 'CONTRATOS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'contracts/new',
            name: 'B2BContractNew',
            component: () => import('@/views/b2b/contracts/Form.vue'),
            meta: { submodule: 'CONTRATOS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'contracts/:id',
            name: 'B2BContractEdit',
            component: () => import('@/views/b2b/contracts/Form.vue'),
            meta: { submodule: 'CONTRATOS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          // Convenios dejo de ser un modulo propio (2026-08-17): un convenio es
          // un contrato con tipo CONVENIO, y sus % de descuento cuelgan de el.
        ],
      },

      // =====================
      // CLIENTE
      // =====================
      {
        path: 'general',
        name: 'General',
        component: RouterViewStub,
        redirect: { name: 'General' },
        meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
        children: [
          {
            path: 'notificaciones',
            name: 'NotificationList',
            component: () => import('@/views/general/notification.vue'),
            meta: { module: 'NOTIFICACIONES', roles: ['ADMIN'] },
          },
          {
            path: 'cliente',
            name: 'CustomerList',
            component: () => import('@/views/customer/customers.vue'),
            meta: { module: 'CLIENTE', roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'cliente/new',
            name: 'CustomerNew',
            component: () => import('@/views/customer/customerForm.vue'),
            meta: { module: 'CLIENTE', roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'cliente/:id',
            name: 'CustomerEdit',
            component: () => import('@/views/customer/customerForm.vue'),
            meta: { module: 'CLIENTE', roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          
        ],
      },
    // =====================
    // COMERCIAL — roles actualizados
    // =====================
    {
      path: 'comercial',
      name: 'Comercial',
      component: RouterViewStub,
      redirect: { name: 'ComercialOverview' },
      meta: { module: 'COMERCIAL', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] }, // + LIDER_COMERCIAL
      children: [
        {
          path: 'leads',
          name: 'ComercialListado',
          component: () => import('@/views/comercial/Leads.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'leads/new',
          name: 'ComercialLeadsNew',
          component: () => import('@/views/comercial/LeadsNew.vue'), // FSD re-revertido 2026-06-02: ver arriba
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'leads/:id',
          name: 'ComercialLeadDetalle',
          component: () => import('@/views/comercial/LeadsNew.vue'), // FSD re-revertido 2026-06-02: ver arriba
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
          props: true,
        },
        {
          path: 'overview',
          name: 'ComercialOverview',
          component: () => import('@/views/comercial/Overview.vue'),
          meta: { roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'discount',
          name: 'Discount',
          component: () => import('@/views/comercial/Discounts.vue'),
          meta: { submodule: 'DESCUENTOS', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'discount/new',
          name: 'DiscountNew',
          component: () => import('@/views/comercial/DiscountsNew.vue'),
          meta: { roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'] }, // solo líderes crean (sin submodule: exige rol)
        },
        {
          path: 'discount/:id',
          name: 'DiscountEdit',
          component: () => import('@/views/comercial/DiscountsNew.vue'),
          meta: { roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Objetivos, avance por asesor y ventas diarias en una sola pantalla con pestañas.
        {
          path: 'plan',
          name: 'PlanComercial',
          component: () => import('@/views/comercial/PlanComercial.vue'),
          meta: { submodule: 'PLAN_COMERCIAL', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Ficha del cliente: historia de un celular (ERP + histórico) y qué ofrecerle.
        {
          path: 'cliente',
          name: 'FichaCliente',
          component: () => import('@/views/comercial/FichaCliente.vue'),
          meta: { submodule: 'FICHA_CLIENTE', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Bot de WhatsApp: bandeja (la asesora ve su línea) y configuración (líderes).
        {
          path: 'whatsapp',
          name: 'WhatsappBandeja',
          component: () => import('@/views/comercial/WhatsappBandeja.vue'),
          meta: { submodule: 'WHATSAPP_BANDEJA', roles: ['ADMIN', 'LIDER_COMERCIAL'] },
        },
        {
          path: 'whatsapp/config',
          name: 'WhatsappConfig',
          component: () => import('@/views/comercial/WhatsappConfig.vue'),
          meta: { submodule: 'WHATSAPP_CONFIG', roles: ['ADMIN', 'LIDER_COMERCIAL'] },
        },
        // Bandeja predictiva: clientes que volvieron a consultar, repartidos entre asesores.
        {
          path: 'llamar-hoy',
          name: 'LlamarHoy',
          component: () => import('@/views/comercial/LlamarHoy.vue'),
          meta: { submodule: 'LLAMAR_HOY', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Ventas por canal (Marketing - Gestión). Mismos roles que /dashboard/ventas-canal.
        {
          path: 'RptMktProduct',
          name: 'ReportMktProduct',
          component: () => import('@/views/comercial/ReportMktProduct.vue'),
          meta: { submodule: 'MARKETING_GESTION', roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Informe del area contra sus objetivos (una pagina, como el Academico).
        {
          path: 'reporte',
          name: 'ReporteComercial',
          component: () => import('@/views/comercial/ReporteComercial.vue'),
          meta: { submodule: 'REPORTE', roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        // Reportes — solo líderes y admin
        {
          path: 'RptSLA',
          name: 'ReportSla',
          component: () => import('@/views/comercial/ReportSla.vue'),
          meta: { roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'RptPerformanceMarketing',
          name: 'ReportPerformanceMarketing',
          component: () => import('@/views/comercial/ReportPerformanceMarketing.vue'),
          meta: { roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
        {
          path: 'RptCoverageForecast',
          name: 'ReportCoverageForecast',
          component: () => import('@/views/comercial/ReportCoverageForecast.vue'),
          meta: { roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
        },
      ],
    },

    // =====================
    // FUNDACION
    // =====================
    {
      path: 'fundacion',
      name: 'Fundacion',
      component: RouterViewStub,
      redirect: { name: 'FundacionLeads' },
      meta: { module: 'FUNDACION', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
      children: [
        {
          path: 'leads',
          name: 'FundacionLeads',
          component: () => import('@/views/fundacion/Leads.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
        },
        {
          path: 'leads/new',
          name: 'FundacionLeadsNew',
          component: () => import('@/views/fundacion/LeadsNew.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
        },
        {
          path: 'leads/:id',
          name: 'FundacionLeadsEdit',
          component: () => import('@/views/fundacion/LeadsNew.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
          props: true,
        },
        {
          path: 'eventos',
          name: 'FundacionEventos',
          component: () => import('@/views/fundacion/Eventos.vue'),
          meta: { submodule: 'EVENTOS', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
        },
        {
          path: 'objetivos',
          name: 'FundacionObjetivos',
          component: () => import('@/views/fundacion/Objetivos.vue'),
          meta: { submodule: 'OBJETIVOS', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
        },
      ],
    },

    // =====================
    // B2B LEADS
    // =====================
    {
      path: 'b2b',
      name: 'B2B',
      component: RouterViewStub,
      redirect: { name: 'B2BLeads' },
      meta: { module: 'B2B', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
      children: [
        {
          path: 'leads',
          name: 'B2BLeads',
          component: () => import('@/views/b2b/Leads.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
        },
        {
          path: 'leads/new',
          name: 'B2BLeadsNew',
          component: () => import('@/views/b2b/LeadsNew.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
        },
        {
          path: 'leads/:id',
          name: 'B2BLeadsEdit',
          component: () => import('@/views/b2b/LeadsNew.vue'),
          meta: { submodule: 'LEADS', roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          props: true,
        },
      ],
    },

    // =====================
    // IMPORTACION: importar hojas y conciliarlas contra el sistema
    // =====================
    // Cada hoja es un permiso distinto de la matriz (importar escribe datos,
    // conciliar solo lee). ADMIN por rol; el resto, por submodulo.
    {
      path: 'importacion',
      name: 'Importacion',
      component: RouterViewStub,
      redirect: { name: 'ImportarHoja' },
      meta: { module: 'IMPORTACION', roles: ['ADMIN'] },
      children: [
        {
          path: 'carga',
          name: 'ImportarHoja',
          component: () => import('@/views/importacion/ImportarHoja.vue'),
          meta: { submodule: 'CARGA', roles: ['ADMIN'] },
        },
        {
          path: 'conciliacion',
          name: 'Conciliacion',
          component: () => import('@/views/importacion/Conciliacion.vue'),
          meta: { submodule: 'CONCILIACION', roles: ['ADMIN'] },
        },
      ],
    },

    // =====================
    // CONFIGURACION (solo ADMIN)
    // =====================
    {
      path: 'configuracion',
      name: 'Configuracion',
      component: RouterViewStub,
      redirect: { name: 'ConfigUsuarios' },
      meta: { module: 'CONFIGURACION', roles: ['ADMIN'] },
      children: [
        {
          path: 'usuarios',
          name: 'ConfigUsuarios',
          component: () => import('@/views/configuracion/Usuarios.vue'),
          meta: { submodule: 'USUARIOS', roles: ['ADMIN'] },
        },
        {
          path: 'roles',
          name: 'ConfigRoles',
          component: () => import('@/views/configuracion/RolesPermisos.vue'),
          meta: { submodule: 'ROLES', roles: ['ADMIN'] },
        },
        // Importacion se mudo a su propio modulo (/importacion). Se deja la
        // redireccion para los enlaces guardados.
        { path: 'importacion', redirect: { name: 'ImportarHoja' } },
        {
          path: 'membresia-cursos',
          name: 'ConfigMembresiaCursos',
          component: () => import('@/views/configuracion/MembresiaCursos.vue'),
          meta: { submodule: 'MEMBRESIA_CURSOS', roles: ['ADMIN', 'FICO', 'LIDER_FICO'] },
        },
        {
          // Los líderes entran solo aquí; el backend acota la bitácora a su área.
          path: 'auditoria',
          name: 'ConfigAuditoria',
          component: () => import('@/views/configuracion/Auditoria.vue'),
          meta: {
            submodule: 'AUDITORIA',
            roles: ['ADMIN', 'LIDER_COMERCIAL', 'LIDER_FICO', 'LIDER_ACADEMICA',
                    'LIDER_PRODUCTO', 'LIDER_FUNDACION', 'LIDER_B2B'],
          },
        },
      ],
    },

    // =====================
    // ACADEMICA
    // =====================
    {
      path: 'academica/aulas',
      name: 'AcademicaAulas',
      component: () => import('@/views/academica/Aulas.vue'),
      meta: { module: 'ACADEMICA', submodule: 'AULAS', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/aulas/:id',
      name: 'AcademicaAulaDetail',
      component: () => import('@/views/academica/AulaDetail.vue'),
      meta: { module: 'ACADEMICA', submodule: 'AULAS', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
      props: true,
    },
    {
      path: 'academica/semanal',
      name: 'AcademicaSemanal',
      component: () => import('@/views/academica/SemanaAcademica.vue'),
      meta: { module: 'ACADEMICA', submodule: 'SEMANAL', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/control-ediciones',
      name: 'AcademicaControlEdiciones',
      component: () => import('@/views/academica/ControlEdiciones.vue'),
      meta: { module: 'ACADEMICA', submodule: 'CONTROL_EDICIONES', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/seguimiento-b2b',
      name: 'AcademicaSeguimientoB2B',
      component: () => import('@/views/academica/SeguimientoB2B.vue'),
      meta: { module: 'ACADEMICA', submodule: 'SEGUIMIENTO_B2B', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/reporte',
      name: 'AcademicaReporte',
      component: () => import('@/views/academica/ReporteAcademico.vue'),
      meta: { module: 'ACADEMICA', submodule: 'REPORTE', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/reprogramaciones',
      name: 'AcademicaReprogramaciones',
      component: () => import('@/views/academica/Reprogramaciones.vue'),
      meta: { module: 'ACADEMICA', submodule: 'REPROGRAMACIONES', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA', 'FICO'] },
    },
    {
      path: 'academica/tickets',
      name: 'AcademicaTickets',
      component: () => import('@/views/academica/TicketsAlumnos.vue'),
      meta: { module: 'ACADEMICA', submodule: 'TICKETS_ALUMNOS', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA', 'FICO'] },
    },
    {
      path: 'academica/membresias',
      name: 'AcademicaMembresias',
      component: () => import('@/views/academica/MembresiasVigentes.vue'),
      meta: { module: 'ACADEMICA', submodule: 'MEMBRESIAS', roles: ['ADMIN', 'GERENCIA', 'LIDER_ACADEMICA', 'ACADEMICA'] },
    },
    {
      path: 'academica/seguimiento-alumno',
      name: 'AcademicaSeguimientoAlumno',
      component: () => import('@/views/academica/SeguimientoAlumno.vue'),
      meta: { module: 'ACADEMICA', submodule: 'SEGUIMIENTO_ALUMNO', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },
    {
      path: 'academica/bot',
      name: 'BotAcademico',
      component: () => import('@/views/academica/BotAcademicoIndex.vue'),
      meta: { module: 'ACADEMICA', submodule: 'BOT', roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'] },
    },

    ],
  },

  // =====================
  // PAGES (auth / errores)
  // =====================
  {
    path: '/pages',
    name: 'Pages',
    component: RouterViewStub,
    redirect: '/pages/404',
    children: [
      {
        path: '404',
        name: 'Page404',
        component: () => import('@/views/pages/Page404.vue'),
      },
      {
        path: '500',
        name: 'Page500',
        component: () => import('@/views/pages/Page500.vue'),
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/pages/Login.vue'),
      },
    ],
  },

  // catch-all → 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pages/404',
  },
]
// Home segun permisos: ADMIN al dashboard; el resto al cronograma de solo
// lectura si su rol tiene esa casilla, si no al dashboard (público).
function homeFor (session) {
  if (session.roles.includes('ADMIN')) return '/dashboard'
  return canAccess({ module: 'CRONOGRAMA' }, session) ? '/producto/cronograma-vista' : '/dashboard'
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Arriba solo al cambiar de pantalla. Una pestaña o filtro que vive en la
  // query (?linea=, ?tab=) es la misma pantalla: subir al inicio en cada clic
  // saca al usuario del panel que estaba usando. Atrás/adelante vuelve a donde estaba.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { top: 0 }
  },
})
router.beforeEach((to, from, next) => {
  // 1. Rutas públicas
  const publicPages = ['/pages/login', '/pages/404', '/pages/500'];
  // Verificamos si la ruta requiere auth y NO es pública
  const authRequired = !publicPages.includes(to.path);
  
  // 2. Obtener datos
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  let userRoles = []; // Inicializamos como array vacío por seguridad
  let userModules = null; // null = sesión sin módulos cargados (pre-matriz)
  let userSubmodules = null; // { FICO: ['TOKENS', ...], ... }

  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          // Aseguramos que sea un array, incluso si viene null
          userRoles = user.roles || [];
          userModules = Array.isArray(user.modules) ? user.modules : null;
          userSubmodules = (user.submodules && typeof user.submodules === 'object') ? user.submodules : null;
      } catch (e) {
          console.error("Error parseando user del storage", e);
          // Si falla el parseo, forzamos logout borrando token para evitar bucles
          localStorage.removeItem('token');
          return next('/pages/login');
      }
  }

  // CASO A: No logueado -> Login
  if (authRequired && !token) {
      toast.warning('Por favor, inicia sesión para acceder.');
    
    return next('/pages/login');
  }

  // CASO B: Logueado intentando ir a Login -> home segun rol
  // (ADMIN al dashboard; el resto al cronograma de solo lectura).
  if (to.path === '/pages/login' && token) {
    toast.info('Ya has iniciado sesión.');
    return next(homeFor(readSession()));
  }

  // ---------------------------------------------------------
  // CASO C: VALIDACIÓN DE ACCESO (la matriz de Configuración manda)
  // ---------------------------------------------------------
  // to.meta es el merge de toda la cadena matched: module del grupo padre,
  // roles/submodule de la hoja. Misma regla que el sidebar (navAccess.js):
  // si una mostrara lo que la otra niega, el usuario ve un link que no abre.
  // meta.public = cualquier usuario logueado (ignora lo heredado del padre).
  if (token && !to.meta.public && !canAccess(to.meta, { roles: userRoles, modules: userModules, submodules: userSubmodules })) {
      toast.info('No tienes permisos para acceder a esta sección.');
      console.warn(`Acceso denegado. Roles [${userRoles}] en ruta con módulo [${to.meta.module}] / submódulo [${to.meta.submodule}] / roles [${to.meta.roles}]`);
      // Primera navegación (no hay página de donde venir): a su home, no a un bucle.
      return next(from.matched.length ? from.fullPath : homeFor(readSession()));
  }

  next();
});
export default router
