// Rubrica de auditoria de aula (textos y versiones).
// Conviven DOS rubricas. El area academica recorto la suya de 20 criterios a 10
// (16/09/26): se retiraron los 9 que no se podian auditar de forma objetiva y
// "resuelve dudas en sesion" + "responde por WhatsApp" se fusionaron en
// interaction.2, que eran la misma conducta partida en dos. La nota sigue siendo
// sobre 20, asi que cada criterio paso a valer 2 puntos.
//
// Cada auditoria se muestra y se califica con la rubrica que regia cuando se
// guardo (classroom_audit_rubric.updated_at), para no reescribir la evaluacion
// de docentes ya auditados. Espeja rubricaDe() en Backend edition.entity.js.
// La usan AulaDetail (marcar la rubrica) y el Reporte Academico (criterios que
// mas restan): un solo texto por criterio.
export const FECHA_CORTE_RUBRICA = '2026-09-15'

// CONGELADA: es el texto con el que se evaluo a esos docentes. No se toca.
const RUBRIC_V1 = [
  {
    key: 'interaction',
    label: 'Interaccion con el alumno',
    items: [
      { key: 'interaction.1', label: 'Brinda oportunidades de participacion' },
      { key: 'interaction.2', label: 'Resuelve dudas durante la sesion' },
      { key: 'interaction.3', label: 'Responde consultas por el canal de WhatsApp' },
      { key: 'interaction.4', label: 'Utiliza plantilla de contacto al alumno' },
      { key: 'interaction.5', label: 'Acompanamiento continuo para monitorear niveles de aprendizaje de los estudiantes' },
    ],
  },
  {
    key: 'content',
    label: 'Contenido y dinamica de clase',
    items: [
      { key: 'content.1', label: 'El material visual debe estar actualizado en un tiempo no mas de 5 anos de antiguedad' },
      { key: 'content.2', label: 'Refuerza el uso de las carpetas de M. de Revision y M. Complementario' },
      { key: 'content.3', label: 'El docente explica las fechas establecidas de entrega de proyectos' },
      { key: 'content.4', label: 'Comparte por lo menos 1 video relativo al tema' },
      { key: 'content.5', label: 'Desarrolla la sesion a traves de taller y/o casos practicos' },
      { key: 'content.6', label: 'Evalua lo aprendido por medio de una herramienta tecnologica en cada sesion' },
    ],
  },
  {
    key: 'environment',
    label: 'Entorno',
    items: [
      { key: 'environment.1', label: 'Equipamiento tecnico adecuado (conexion a internet, audio en buen estado y camara encendida en todo momento de la sesion)' },
      { key: 'environment.2', label: 'Puntualidad al ingreso y culminacion de la sesion' },
      { key: 'environment.3', label: 'Audio claro (sin interferencias)' },
    ],
  },
  {
    key: 'communication',
    label: 'Comunicacion academica',
    items: [
      { key: 'communication.1', label: 'Responde a notificaciones' },
      { key: 'communication.2', label: 'Envia el pantallazo de apertura de sesion' },
      { key: 'communication.3', label: 'Registra la asistencia durante la sesion' },
      { key: 'communication.4', label: 'Comunica si tiene alguna duda o consulta, o le falta un recurso por lo menos 48 horas antes de empezar la sesion' },
      { key: 'communication.5', label: 'Notifica la actualizacion de la videoclase' },
      { key: 'communication.6', label: 'El docente cumple con la fecha establecida de entrega de notas' },
    ],
  },
]

// VIGENTE. Las claves sobrevivientes conservan su numero original y por eso
// quedan salteadas (falta interaction.1, interaction.3...): renumerarlas
// reinterpretaria las marcas ya guardadas con el criterio equivocado.
export const RUBRIC_V2 = [
  {
    key: 'interaction',
    label: 'Interaccion con el alumno',
    items: [
      { key: 'interaction.2', label: 'Resuelve dudas durante la sesion y por el canal de WhatsApp' },
      { key: 'interaction.4', label: 'Utiliza plantilla de contacto al alumno' },
    ],
  },
  {
    key: 'content',
    label: 'Contenido y dinamica de clase',
    items: [
      { key: 'content.2', label: 'Refuerza el uso de las carpetas de M. de Revision y M. Complementario' },
      { key: 'content.3', label: 'El docente explica las fechas establecidas de entrega de proyectos' },
      { key: 'content.5', label: 'Desarrolla la sesion a traves de taller y/o casos practicos' },
    ],
  },
  {
    key: 'environment',
    label: 'Entorno',
    items: [
      { key: 'environment.1', label: 'Equipamiento tecnico adecuado (conexion a internet, audio en buen estado y camara encendida en todo momento de la sesion)' },
      { key: 'environment.2', label: 'Puntualidad al ingreso y culminacion de la sesion' },
    ],
  },
  {
    key: 'communication',
    label: 'Comunicacion academica',
    items: [
      { key: 'communication.1', label: 'Responde a notificaciones' },
      { key: 'communication.2', label: 'Envia el pantallazo de apertura de sesion' },
      { key: 'communication.5', label: 'Notifica la actualizacion de la videoclase' },
    ],
  },
]

const NOTA_MAXIMA_RUBRICA = 20

function buildRubric(version, categorias) {
  const totalItems = categorias.reduce((a, c) => a + c.items.length, 0)
  return {
    version,
    categorias,
    totalItems,
    keys: new Set(categorias.flatMap((c) => c.items.map((it) => it.key))),
    puntosPorCriterio: NOTA_MAXIMA_RUBRICA / totalItems,
  }
}

const RUBRICA_V1 = buildRubric(1, RUBRIC_V1)
export const RUBRICA_V2 = buildRubric(2, RUBRIC_V2)

// Sin fecha devolvemos la vigente: una rubrica que todavia no se guardo se esta
// llenando ahora.
export function rubricaDe(fecha) {
  const dia = fecha ? String(fecha).slice(0, 10) : ''
  return dia !== '' && dia <= FECHA_CORTE_RUBRICA ? RUBRICA_V1 : RUBRICA_V2
}

// Texto del criterio en la rubrica vigente (o en la vieja si ya se retiro).
const LABELS = new Map([...RUBRIC_V1, ...RUBRIC_V2].flatMap((c) => c.items.map((it) => [it.key, it.label])))
export const criterionLabel = (key) => LABELS.get(key) || key
