import { h, resolveComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout'

//is ntanciar toast
import { useToast } from 'vue-toastification'
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
    redirect: '/dashboard',
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
      // FICO
      // =====================
      {
        path: 'fico',
        name: 'FICO',
        component: RouterViewStub,
        redirect: { name: 'FicoInscripciones' },
        meta: { roles: ['ADMIN', 'FICO', 'GERENCIA'] },
        children: [
          {
            path: 'inscripciones',
            name: 'enrollment',
            component: () => import('@/views/fico/Enrollment.vue'),
            meta: { roles: ['ADMIN', 'FICO', 'GERENCIA'] },
          },
          {
            path: 'inscripciones/new',
            name: 'enrollmentForm',
            component: () => import('@/views/fico/EnrollmentForm.vue'),
            meta: { roles: ['ADMIN', 'FICO', 'GERENCIA'] },
          },
          {
            path: 'reportes',
            name: 'FicoReportes',
            component: () => import('@/views/fico/Reportes.vue'),
            meta: { roles: ['ADMIN', 'FICO', 'GERENCIA'] },
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
        meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
        children: [
          {
            path: 'programas',
            name: 'program',
            component: () => import('@/views/producto/Programs.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'programas/new',
            name: 'ProgramNew',
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'programas/:id',
            name: 'ProgramEdit',
            component: () => import('@/views/producto/ProgramsForm.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes',
            name: 'Instructor',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Instructors.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes/new',
            name: 'InstructorNew',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'docentes/:id',
            name: 'InstructorEdit',
            // creación de nuevo programa
            component: () => import('@/views/producto/InstructorsForm.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'cronograma',
            name: 'Edition',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Editions.vue'),
            meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
          },
          {
            path: 'precios',
            name: 'Prices',
            // catálogo maestro de programas
            component: () => import('@/views/producto/Prices.vue'),
            meta: { roles: ['ADMIN', 'GERENCIA'] },
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
        meta: { roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'] },
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
        meta: { roles: ['ADMIN', 'B2B', 'GERENCIA'] },
        children: [
          {
            path: 'agreement',
            name: 'BusinessAgreement',
            // panel general
            component: () => import('@/views/b2b/corporateAgreement.vue'),
            meta: { roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'agreement/new',
            name: 'BusinessAgreementNew',
            // panel general
            component: () => import('@/views/b2b/corporateAgreementForm.vue'),
            meta: { roles: ['ADMIN', 'B2B', 'GERENCIA'] },
          },
          {
            path: 'agreement/:id',
            name: 'BusinessAgreementEdit',
            // panel general
            component: () => import('@/views/b2b/corporateAgreementForm.vue'),
            meta: { roles: ['ADMIN', 'B2B', 'GERENCIA'] },
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
        meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
        children: [
          {
            path: 'cliente',
            name: 'CustomerList',
            // catálogo maestro de programas
            component: () => import('@/views/customer/customers.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'cliente/new',
            name: 'CustomerNew',
            // creación de nuevo programa
            component: () => import('@/views/customer/customerForm.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'cliente/:id',
            name: 'CustomerEdit',
            // creación de nuevo programa
            component: () => import('@/views/customer/customerForm.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
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
        meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
        children: [
          // -----------------
          // CRUD / PIPELINE
          // -----------------
          {
            path: 'leads',
            name: 'ComercialListado',
            // pipeline ventas
            component: () => import('@/views/comercial/Leads.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'leads/new',
            name: 'ComercialLeadsNew',
            // alta / captura de nuevo lead
            component: () => import('@/views/comercial/LeadsNew.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'leads/:id',
            name: 'ComercialLeadDetalle',
            // ficha 1:1 del lead (timeline, pagos, adjuntos)
            component: () => import('@/views/comercial/LeadsNew.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
            props: true,
          },
          {
            path: 'RptMktProduct',
            name: 'ReportMktProduct',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportMktProduct.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'RptSLA',
            name: 'ReportSla',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportSla.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'RptCalling',
            name: 'ReportCalling',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportCalling.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'RptPerformanceMarketing',
            name: 'ReportPerformanceMarketing',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportPerformanceMarketing.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'RptCoverageForecast',
            name: 'ReportCoverageForecast',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/ReportCoverageForecast.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'overview',
            name: 'ComercialOverview',
            // vista rápida del equipo comercial (kpis, embudo mini)
            component: () => import('@/views/comercial/Overview.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'discount',
            name: 'Discount',
            component: () => import('@/views/comercial/Discounts.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'discount/new',
            name: 'DiscountNew',
            component: () => import('@/views/comercial/DiscountsNew.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },
          {
            path: 'discount/:id',
            name: 'DiscountEdit',
            component: () => import('@/views/comercial/DiscountsNew.vue'),
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
          },

          // =====================
          // REPORTERÍA / ANALÍTICA
          // =====================
          {
            path: 'reportes',
            name: 'ComercialReportes',
            component: RouterViewStub,
            redirect: { name: 'RptComercialEmbudo' },
            meta: { roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'] },
            children: [
              {
                path: 'embudo',
                name: 'RptComercialEmbudo',
                component: () => import('@/views/reportes/Embudo.vue'),
                meta: { area: 'COMERCIAL', report: true },
              },
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
    ],
  },

  // catch-all → 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pages/404',
  },
]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
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

  if (userStr) {
      try {
          const user = JSON.parse(userStr);
          // Aseguramos que sea un array, incluso si viene null
          userRoles = user.roles || []; 
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

  // CASO B: Logueado intentando ir a Login -> Dashboard
  if (to.path === '/pages/login' && token) {
      //TOAST
      
    toast.info('Ya has iniciado sesión. Redirigiendo al dashboard.');
    
     return next('/dashboard');
  }

  // ---------------------------------------------------------
  // CASO C: VALIDACIÓN DE ROLES (CORREGIDO)
  // ---------------------------------------------------------
  // Si hay token Y la ruta define roles permitidos
  if (token && to.meta.roles) {
    
      
      // LÓGICA DE INTERSECCIÓN DE ARRAYS:
      // "Verifica si ALGUNO (some) de los roles del usuario está INCLUIDO en los roles de la ruta"
      const tienePermiso = userRoles.some(rolUsuario => to.meta.roles.includes(rolUsuario));

      if (!tienePermiso) {
          toast.info('No tienes permisos para acceder a esta sección.');
        
          console.warn(`Acceso denegado. Usuario con roles [${userRoles}] intentó entrar a ruta que requiere [${to.meta.roles}]`);
          
          // no rediriga a nada
          return next(from.fullPath); // Quédate en la página actual
          
      }
  }

  next();
});
export default router
