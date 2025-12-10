import { h, resolveComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout'

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
    redirect: '/dashboard',
    children: [
      //
      // DASHBOARD GENERAL (landing inicial)
      //
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () =>
          import(
            /* webpackChunkName: "dashboard" */ '@/views/dashboard/Dashboard.vue'
          ),
      },

      // =====================
      // FICO
      // =====================
      {
        path: 'fico',
        name: 'FICO',
        component: RouterViewStub,
        redirect: { name: 'FicoOverview' },
        meta: { area: 'FICO' },
        children: [
          {
            path: 'overview',
            name: 'FicoOverview',
            // salud del área (KPIs de cobranzas, etc.)
            component: () => import('@/views/fico/Overview.vue'),
            meta: { area: 'FICO' },
          },
          {
            path: 'inscripciones',
            name: 'FicoInscripciones',
            // inscripciones de leads convertidos a clientes
            component: () => import('@/views/fico/Inscripciones.vue'),
            meta: { area: 'FICO' },
          },
          {
            path: 'inscripciones/new',
            name: 'FicoInscripcionesNew',
            // formulario / alta nueva inscripción
            component: () => import('@/views/fico/InscripcionesNew.vue'),
            meta: { area: 'FICO' },
          },
          {
            path: 'reportes',
            name: 'FicoReportes',
            // export contable / ingresos operativos
            component: () => import('@/views/fico/Reportes.vue'),
            meta: { area: 'FICO' },
          },
        ],
      },

      // =====================
      // PRODUCTO
      // =====================
      {
        path: 'producto',
        name: 'Producto',
        component: RouterViewStub,
        redirect: { name: 'ProductoDashboard' },
        meta: { area: 'PRODUCTO' },
        children: [
          {
            path: 'programas',
            name: 'program',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Programs.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'programas/new',
            name: 'ProgramNew',
            // creación de nuevo programa
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'programas/:id',
            name: 'ProgramEdit',
            // creación de nuevo programa
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'docentes',
            name: 'Instructor',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Instructors.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'docentes/new',
            name: 'InstructorNew',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'docentes/:id',
            name: 'InstructorEdit',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'cronograma',
            name: 'Edition',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Editions.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'planeamiento',
            name: 'Schedule',
            // catálogo maestro de programas
            component: () => import('@/views/producto/ScheduleViewer.vue'),
            meta: { area: 'PRODUCTO' },
          },
          {
            path: 'precios',
            name: 'Prices',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Prices.vue'),
            meta: { area: 'PRECIO' },
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
        redirect: { name: 'GerenciaOverview' },
        meta: { area: 'GERENCIA' },
        children: [
          {
            path: 'indicadores',
            name: 'GerenciaIndicadores',
            // BI ejecutivo
            component: () => import('@/views/gerencia/Indicadores.vue'),
            meta: { area: 'GERENCIA' },
          },
          {
            path: 'reportes-ejecutivos',
            name: 'GerenciaReportesEjecutivos',
            // PDFs / board mensual
            component: () =>
              import('@/views/gerencia/ReportesEjecutivos.vue'),
            meta: { area: 'GERENCIA' },
          },
          {
            path: 'overview',
            name: 'GerenciaOverview',
            // vista resumen cross-área
            component: () => import('@/views/gerencia/Overview.vue'),
            meta: { area: 'GERENCIA' },
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
        redirect: { name: 'BusinessAgreement' },
        meta: { area: 'B2B' },
        children: [
          {
            path: 'agreement',
            name: 'BusinessAgreement',
            // panel general
            component: () => import('@/views/b2b/corporateAgreement.vue'),
            meta: { area: 'B2B' },
          },
          {
            path: 'agreement/new',
            name: 'BusinessAgreementNew',
            // panel general
            component: () => import('@/views/b2b/corporateAgreementForm.vue'),
            meta: { area: 'B2B' },
          },
          {
            path: 'agreement/:id',
            name: 'BusinessAgreementEdit',
            // panel general
            component: () => import('@/views/b2b/corporateAgreementForm.vue'),
            meta: { area: 'B2B' },
          },
        ],
      },

      // =====================
      // MARKETING
      // =====================
      {
        path: 'marketing',
        name: 'Marketing',
        component: RouterViewStub,
        redirect: { name: 'MarketingOverview' },
        meta: { area: 'MARKETING' },
        children: [
          {
            path: 'overview',
            name: 'MarketingOverview',
            // panel general
            component: () => import('@/views/marketing/Overview.vue'),
            meta: { area: 'MARKETING' },
          },
        ],
      },
      
      // =====================
      // CLIENTE
      // =====================
      {
        path: 'cliente',
        name: 'Cliente',
        component: RouterViewStub,
        redirect: { name: 'Cliente' },
        meta: { area: 'CLIENTE' },
        children: [
          {
            path: 'cliente',
            name: 'CustomerList',
            // catálogo maestro de programas
            component: () => import('@/views/customer/customers.vue'),
            meta: { area: 'CLIENTE' },
          },
          {
            path: 'cliente/new',
            name: 'CustomerNew',
            // creación de nuevo programa
            component: () => import('@/views/customer/CustomerForm.vue'),
            meta: { area: 'CLIENTE' },
          },
          {
            path: 'cliente/:id',
            name: 'CustomerEdit',
            // creación de nuevo programa
            component: () => import('@/views/customer/CustomerForm.vue'),
            meta: { area: 'CLIENTE' },
          },
          
        ],
      },
      // =====================
      // COMERCIAL
      // =====================
      {
        path: 'comercial',
        name: 'Comercial',
        component: RouterViewStub,
        redirect: { name: 'ComercialOverview' },
        meta: { area: 'COMERCIAL' },
        children: [
          // -----------------
          // CRUD / PIPELINE
          // -----------------
          {
            path: 'leads',
            name: 'ComercialListado',
            // pipeline ventas
            component: () => import('@/views/comercial/Leads.vue'),
            meta: { area: 'COMERCIAL' },
          },
          {
            path: 'leads/new',
            name: 'ComercialLeadsNew',
            // alta / captura de nuevo lead
            component: () => import('@/views/comercial/LeadsNew.vue'),
            meta: { area: 'COMERCIAL' },
          },
          {
            path: 'leads/:id',
            name: 'ComercialLeadDetalle',
            // ficha 1:1 del lead (timeline, pagos, adjuntos)
            component: () => import('@/views/comercial/LeadsNew.vue'),
            meta: { area: 'COMERCIAL' },
            props: true,
          },
          {
            path: 'RptMktProduct',
            name: 'ReportMktProduct',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportMktProduct.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'RptSLA',
            name: 'ReportSla',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportSla.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'RptCalling',
            name: 'ReportCalling',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportCalling.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'RptPerformanceMarketing',
            name: 'ReportPerformanceMarketing',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportPerformanceMarketing.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'RptCoverageForecast',
            name: 'ReportCoverageForecast',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportCoverageForecast.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'overview',
            name: 'ComercialOverview',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/Overview.vue'),
            meta: { area: 'COMERCIAL', report: true },
          },
          {
            path: 'discount',
            name: 'Discount',
            component: () => import('@/views/comercial/Discounts.vue'),
            meta: { area: 'COMERCIAL' },
          },
          {
            path: 'discount/new',
            name: 'DiscountNew',
            component: () => import('@/views/comercial/DiscountsNew.vue'),
            meta: { area: 'COMERCIAL'},
          },
          {
            path: 'discount/:id',
            name: 'DiscountEdit',
            component: () => import('@/views/comercial/DiscountsNew.vue'),
            meta: { area: 'COMERCIAL'},
          },

          // =====================
          // REPORTERÍA / ANALÍTICA
          // =====================
          {
            path: 'reportes',
            name: 'ComercialReportes',
            component: RouterViewStub,
            redirect: { name: 'RptComercialEmbudo' },
            meta: { area: 'COMERCIAL', reportGroup: true },
            children: [
              {
                path: 'embudo',
                name: 'RptComercialEmbudo',
                // 2) Embudo & conversión
                component: () => import('@/views/reportes/Embudo.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              /*{
                path: 'marketing',
                name: 'RptComercialMarketing',
                // 3) Marketing – canales, medios, palabras, estrategias
                component: () => import('@/views/comercial/reportes/Marketing.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'productividad',
                name: 'RptComercialProductividad',
                // 4) Comercial – seguimiento & productividad
                component: () => import('@/views/comercial/reportes/Productividad.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'programas',
                name: 'RptComercialProgramas',
                // 5) Programas & ediciones
                component: () => import('@/views/comercial/reportes/Programas.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'finanzas',
                name: 'RptComercialFinanzas',
                // 6) Finanzas – ventas, descuentos, promociones & pagos
                component: () => import('@/views/comercial/reportes/Finanzas.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'bot',
                name: 'RptComercialBot',
                // 7) Automatización – BOT
                component: () => import('@/views/comercial/reportes/Bot.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'calidad-datos',
                name: 'RptComercialCalidadDatos',
                // 8) Calidad de datos & SLA
                component: () => import('@/views/comercial/reportes/CalidadDatos.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
              {
                path: 'explorador',
                name: 'RptComercialExplorador',
                // 9) Operativo – Explorador de leads & contactos
                component: () => import('@/views/comercial/reportes/Explorador.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },*/
            ],
          },
        ],
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
      // {
      //   path: 'register',
      //   name: 'Register',
      //   component: () => import('@/views/pages/Register.vue'),
      // },
    ],
  },

  // catch-all → 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pages/404',
  },
]
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  // 1. Definir rutas públicas (que no requieren token)
  const publicPages = ['/pages/login', '/pages/404', '/pages/500'];
  
  // 2. Comprobar si la ruta a la que quiere ir (to.path) requiere autenticación
  // En tu estructura, casi todo requiere auth menos lo que empiece por /pages
  // O podemos verificar si NO está en la lista de páginas públicas
  const authRequired = !publicPages.includes(to.path);
  
  // 3. Verificar si tenemos token
  const loggedIn = localStorage.getItem('token');

  // CASO A: Intenta entrar a ruta privada SIN estar logueado
  if (authRequired && !loggedIn) {
    return next('/pages/login');
  }

  // CASO B: Intenta entrar al Login ESTANDO ya logueado (Redirigir a home)
  if (to.path === '/pages/login' && loggedIn) {
     return next('/dashboard');
  }

  // Si todo está bien, dejar pasar
  next();
});

export default router
