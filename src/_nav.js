export default [
  {
    component: 'CNavTitle',
    name: 'Áreas',
    // Sin roles = siempre visible
  },
  {
    component: 'CNavGroup',
    name: 'Finanzas',
    to: '/fico',
    icon: 'cil-calculator',
    roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'LIDER_COMERCIAL', 'COMERCIAL', 'GERENCIA'],
    items: [
      {
        component: 'CNavItem',
        name: 'Inscripciones',
        to: '/fico/inscripciones',
        roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Tokens de Pago',
        to: '/fico/tokens',
        roles: ['ADMIN', 'FICO', 'LIDER_FICO', 'LIDER_COMERCIAL', 'COMERCIAL', 'GERENCIA'],
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'Producto',
    to: '/producto',
    icon: 'cil-layers',
    roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Programas',
        to: '/producto/programas',
        roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Docentes',
        to: '/producto/docentes',
        roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Cronograma',
        to: '/producto/cronograma',
        roles: ['ADMIN', 'LIDER_PRODUCTO', 'PRODUCTO', 'COMERCIAL', 'GERENCIA', 'ACADEMICA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Lista de Precios',
        to: '/producto/precios',
        roles: ['ADMIN', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Carga de Links',
        to: '/producto/links',
        roles: ['ADMIN', 'PRODUCTO', 'GERENCIA'],
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'Comercial',
    to: '/comercial',
    icon: 'cil-dollar',
    roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Comercial',
        to: '/comercial/leads',
        roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Control - Gestión',
        to: '/comercial/RptControlComercial',
        roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Marketing - Gestión',
        to: '/comercial/RptMktProduct',
        roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Llamada - Gestión',
        to: '/comercial/RptCalling',
        roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Asesor - Objetivos',
        to: '/comercial/RptGoalAgent',
        roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Cronograma - Objetivos',
        to: '/comercial/RptGoalEdition',
        roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'Fundación',
    to: '/fundacion',
    icon: 'cil-education',
    roles: ['ADMIN', 'FUNDACION', 'GERENCIA'],
    items: [
      {
        component: 'CNavItem',
        name: 'Leads Fundación',
        to: '/fundacion/leads',
        roles: ['ADMIN', 'FUNDACION', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Leads Empresas',
        to: '/fundacion/company-leads',
        roles: ['ADMIN', 'FUNDACION', 'GERENCIA'],
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'B2B',
    to: '/business',
    icon: 'cil-people',
    roles: ['ADMIN', 'B2B', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Leads B2B',
        to: '/b2b/leads',
        roles: ['ADMIN', 'B2B', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Leads Empresas',
        to: '/business/company-leads',
        roles: ['ADMIN', 'B2B', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Empresas',
        to: '/business/companies',
        roles: ['ADMIN', 'B2B', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Contratos',
        to: '/business/contracts',
        roles: ['ADMIN', 'B2B', 'GERENCIA'],
      },
      {
        component: 'CNavItem',
        name: 'Convenios',
        to: '/business/agreements',
        roles: ['ADMIN', 'B2B', 'GERENCIA'],
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'Académica',
    to: '/academica',
    icon: 'cil-notes',
    roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'],
    items: [
      {
        component: 'CNavItem',
        name: 'Bot Académico',
        to: '/academica/bot',
        roles: ['ADMIN', 'GERENCIA', 'ACADEMICA'],
      },
    ],
  },
  {
    component: 'CNavGroup',
    name: 'Marketing',
    to: '/marketing',
    icon: 'cil-speech',
    roles: ['ADMIN', 'MARKETING', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Overview',
        to: '/marketing/overview',
        roles: ['ADMIN', 'MARKETING', 'GERENCIA'], // 👈
      },
    ],
  },
  {
    component: 'CNavTitle',
    name: 'General',
  },
  {
    component: 'CNavItem',
    name: 'Cliente',
    to: '/general/cliente',
    icon: 'cil-user',
    roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'],
  },
  {
    component: 'CNavItem',
    name: 'Notificaciones',
    to: '/general/notificaciones',
    icon: 'cil-bell',
    roles: ['ADMIN'],
  },
]
