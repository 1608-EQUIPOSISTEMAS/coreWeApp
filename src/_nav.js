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
    roles: ['ADMIN', 'FICO', 'GERENCIA'], // 👈 agrega esto
    items: [
      {
        component: 'CNavItem',
        name: 'Inscripciones',
        to: '/fico/inscripciones',
        roles: ['ADMIN', 'FICO', 'GERENCIA'], // 👈 agrega esto
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
        roles: ['ADMIN', 'LIDER_PRODUCTO', 'PRODUCTO', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Lista de Precios',
        to: '/producto/precios',
        roles: ['ADMIN', 'GERENCIA'], // 👈
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
        roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Llamada - Gestión',
        to: '/comercial/RptCalling',
        roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
      },
      {
        component: 'CNavItem',
        name: 'Asesor - Objetivos',
        to: '/comercial/RptGoalAgent',
        roles: ['ADMIN', 'LIDER_COMERCIAL', 'GERENCIA'], // 👈
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
    name: 'B2B',
    to: '/business',
    icon: 'cil-people',
    roles: ['ADMIN', 'B2B', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Convenios',
        to: '/business/agreement',
        roles: ['ADMIN', 'B2B', 'GERENCIA'], // 👈
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
    component: 'CNavGroup',
    name: 'Cliente',
    to: '/cliente',
    icon: 'cil-user',
    roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'], // 👈
    items: [
      {
        component: 'CNavItem',
        name: 'Cliente',
        to: '/cliente/cliente',
        roles: ['ADMIN', 'COMERCIAL', 'GERENCIA'], // 👈
      },
    ],
  },
]
