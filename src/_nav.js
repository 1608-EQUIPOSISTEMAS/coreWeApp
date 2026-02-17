export default [

  //
  // ÁREAS OPERATIVAS
  //
  {
    component: 'CNavTitle',
    name: 'Áreas',
  },

  //
  // ACADÉMICA
  //
  {
    component: 'CNavGroup',
    name: 'Académica',
    to: '/academica',
    icon: 'cil-notes', // Icono de edificio institucional / academia
    items: [
      {
        component: 'CNavItem',
        name: 'Gestión de Alumnos',
        to: '/academica/alumnos',
      },
      {
        component: 'CNavItem',
        name: 'Calificaciones',
        to: '/academica/notas',
      },
      {
        component: 'CNavItem',
        name: 'Asistencia',
        to: '/academica/asistencia',
      },
      {
        component: 'CNavItem',
        name: 'Actas y Certificados',
        to: '/academica/certificados',
      },
      {
        component: 'CNavItem',
        name: 'Horarios',
        to: '/academica/horarios',
      },
    ],
  },

  {
    component: 'CNavGroup',
    name: 'Finanzas',
    to: '/fico',
    icon: 'cil-calculator',
    items: [
      {
        component: 'CNavItem',
        name: 'Inscripciones',
        to: '/fico/inscripciones',
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
    icon: 'cil-layers',
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
    icon: 'cil-dollar',
    items: [
      {
        component: 'CNavItem',
        name: 'Comercial',
        to: '/comercial/leads',
      },
      {
        component: 'CNavItem',
        name: 'Control Comercial',
        to: '/comercial/RptControlComercial',
      },
      {
        component: 'CNavItem',
        name: 'Asesor - Objetivos',
        to: '/comercial/RptGoalAgent',
      },
      {
        component: 'CNavItem',
        name: 'Cronograma - Objetivos',
        to: '/comercial/RptGoalEdition',
      },
    ],
  },

  //
  // B2B
  //
  {
    component: 'CNavGroup',
    name: 'B2B',
    to: '/business',
    icon: 'cil-people',
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
    icon: 'cil-speech',
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
    icon: 'cil-user',
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
]