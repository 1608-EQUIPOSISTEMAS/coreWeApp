export default [

  //
  // ÁREAS OPERATIVAS
  //
  {
    component: 'CNavTitle',
    name: 'Áreas',
  },

  //
  // GERENCIA
  //
  {
    component: 'CNavGroup',
    name: 'Gerencia',
    to: '/gerencia',
    icon: 'cil-layers', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Overview',
        to: '/gerencia/overview',
      },
      {
        component: 'CNavItem',
        name: 'Indicadores',
        to: '/gerencia/indicadores',
      },
      {
        component: 'CNavItem',
        name: 'Reportes Ejecutivos',
        to: '/gerencia/reportes-ejecutivos',
      },
    ],
  },
  //
  // FICO
  //
  {
    component: 'CNavGroup',
    name: 'Finanzas',
    to: '/fico',
    icon: 'cil-layers', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Overview',
        to: '/fico/overview',
      },
      {
        component: 'CNavItem',
        name: 'Enrollment',
        to: '/fico/inscripciones',
      },
      {
        component: 'CNavItem',
        name: 'Reportes',
        to: '/fico/reportes',
      },
    ],
  },

  //
  // PRODUCTO
  //
  {
    component: 'CNavGroup',
    name: 'Producto',
    to: '/producto',
    icon: 'cil-layers', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Programas',
        to: '/producto/programas',
      },
      {
        component: 'CNavItem',
        name: 'Docentes',
        to: '/producto/docentes',
      },
      {
        component: 'CNavItem',
        name: 'Cronograma',
        to: '/producto/cronograma',
      },
      {
        component: 'CNavItem',
        name: 'Lista de Precios',
        to: '/producto/precios',
      },
    ],
  },
 //
  // COMERCIAL
  //
  {
    component: 'CNavGroup',
    name: 'Comercial',
    to: '/comercial',
    icon: 'cil-people', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Overview',
        to: '/comercial/overview',
      },
      {
        component: 'CNavItem',
        name: 'Comercial',
        to: '/comercial/leads',
      },
      {
        component: 'CNavItem',
        name: 'Descuento',
        to: '/comercial/discount',
      },
      {
        component: 'CNavItem',
        name: 'R. Producto',
        to: '/comercial/RptMktProduct',
      },
      {
        component: 'CNavItem',
        name: 'R. SLA',
        to: '/comercial/RptSLA',
      },
      {
        component: 'CNavItem',
        name: 'R. LLamadas',
        to: '/comercial/RptCalling',
      },
      {
        component: 'CNavItem',
        name: 'R. Rendimiento',
        to: '/comercial/RptPerformanceMarketing',
      },
      // {
      //   component: 'CNavItem',
      //   name: 'R. Cobertura',
      //   to: '/comercial/RptCoverageForecast',
      // }
    ],
  },

  //
  // B2B
  //
  {
    component: 'CNavGroup',
    name: 'B2B',
    to: '/business',
    icon: 'cil-layers', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Convenios',
        to: '/Business/agreement',
      },
    ],
  },

  //
  // MARKETING
  //
  {
    component: 'CNavGroup',
    name: 'Marketing',
    to: '/marketing',
    icon: 'cil-layers', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Overview',
        to: '/marketing/overview',
      },
    ],
  },
 
  
  {
    component: 'CNavTitle',
    name: 'General',
  },
  //
  // CLIENTE
  //
  {
    component: 'CNavGroup',
    name: 'Cliente',
    to: '/cliente',
    icon: 'cil-user', // icono sugerido
    items: [
      {
        component: 'CNavItem',
        name: 'Cliente',
        to: '/cliente/cliente',
      },
    ],
  },
  
  {
    component: 'CNavGroup',
    name: 'Reportes',
    to: '/comercial/reportes',
    icon: 'cil-chart-pie',
    items: [
      {
        component: 'CNavItem',
        name: 'Embudo',
        to: '/comercial/reportes/embudo',
      },
    ],
  },

  //
  // EXTRAS
  //
  /*{
    component: 'CNavTitle',
    name: 'Extras',
  },
  {
    component: 'CNavGroup',
    name: 'Pages',
    to: '/pages',
    icon: 'cil-star',
    items: [
      {
        component: 'CNavItem',
        name: 'Login',
        to: '/pages/login',
      },
      {
        component: 'CNavItem',
        name: 'Register',
        to: '/pages/register',
      },
      {
        component: 'CNavItem',
        name: 'Error 404',
        to: '/pages/404',
      },
      {
        component: 'CNavItem',
        name: 'Error 500',
        to: '/pages/500',
      },
    ],
  },*/
]
