// Reglas de presentación del cronograma: cómo se lee una edición (segmento,
// línea, fechas, horario) y cómo se agrupan las ediciones de un mes en semanas
// con sus familias padre → hijo.
//
// Vive aquí y no dentro de una vista porque lo usan dos pantallas —
// Producto > Cronograma Vista y Gerencia > Objetivos — y tienen que ordenar y
// pintar EXACTAMENTE igual: si divergen, dos pantallas del mismo mes muestran
// distinto orden y el usuario deja de creerle a las dos.

export const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Segmento A5 = cancelado. No se muestra en ninguna de las dos pantallas.
export const SEGMENTO_CANCELADO = 'A5'

// Paleta por segmento. `color` es la tinta del badge (legible sobre blanco);
// el fondo de la fila lo pone el CSS compartido con la variable --cro-seg-*.
const TINTA_DE_SEGMENTO = {
  A1: 'var(--cro-a1)',
  A2: 'var(--cro-a2)',
  A3: 'var(--cro-a3)',
  A4: 'var(--cro-a4)',
  A5: 'var(--cro-a5)',
  A6: 'var(--cro-a6)',
  A7: 'var(--cro-a7)'
}
export const segmentoDe = (e) => String(e?.cat_segment || '').toUpperCase()
export const tintaDeSegmento = (e) => TINTA_DE_SEGMENTO[segmentoDe(e)] || 'var(--ds-ink-2)'
// Fondo suave de un chip. color-mix y no hex+'1A' para que acepte una var() y
// siga al tema oscuro solo.
export const suave = (color) => `color-mix(in oklab, ${color} 11%, transparent)`

export const esEvento = (e) => e?.program_type_alias === 'we_program_type_event'
export const lineaDe = (e) => e?.program_line_business || '—'
export const tipoDe = (e) => e?.cat_course_category_label || e?.program_type || '—'
// Nueva metodología: el SP la manda como 'Y'/'N' (o boolean segun el driver). Se
// valida contra valores positivos y no por truthy: 'N' tambien es truthy.
export const esNuevaMetodologia = (e) => [true, 1, 'Y', 'y'].includes(e?.new_methodology)

// Parse local para evitar el corrimiento de un dia: "2026-05-21" en local, no UTC
// (ver la memoria fechas-utc-en-lima).
export function fechaLocal (v) {
  if (!v) return null
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
export function fechaCorta (v) {
  const d = fechaLocal(v)
  return d ? `${d.getDate()} ${MESES_ABREV[d.getMonth()]}` : '—'
}
export const diasDe = (e) => e?.schedules?.[0]?.day_combination_label || '—'
export function horasDe (e) {
  if (!e?.schedules?.length) return '—'
  const base = e.schedules[0].hour_combination_label || ''
  return e.schedules.length > 1 ? `${base} (+${e.schedules.length - 1})` : base
}

// El objetivo de una edición es la SUMA de su reparto por canal, nunca el total
// guardado: Gerencia > Objetivos se edita canal por canal y deriva el OBJ de
// ahí, así que cualquier otra pantalla que lea `vacant_goal` puede mostrar un
// número que Gerencia ya no reconoce.
//
// Pasó en producción el 24/09/2026: seis ediciones de octubre arrastraban un
// objetivo viejo de Producto sin ningún canal (12, 4, 5, 7, 8 y 15). El
// cronograma las sumaba y Gerencia no, y los dos KPI del mismo mes no cuadraban.
// Sin canales el objetivo es 0 y la edición sale "Sin meta": es lo correcto,
// porque el estándar todavía no la alcanzó y alguien tiene que cargarla.
export function objetivoDeCanales (metasCanal, metrica = 'ventas') {
  return Object.values(metasCanal || {}).reduce((t, c) => t + (Number(c?.[metrica]) || 0), 0)
}

// Agrupa el mes en semanas y arma las familias DIP → PEE → ESP → curso.
//
// El SP ya devuelve las ediciones de una familia consecutivas; aquí se unen las
// filas cuyos árboles (tree_detail) se intersectan, y cada programa suma un nivel
// de indentación. `tree_detail` CAMBIA DE FORMA segun el tipo: en un programa
// trae HIJOS (edition_num_id) y en un curso trae PADRES (parent_edition_id).
//
// `visible` deja filtrar por búsqueda o línea sin duplicar el resto de la lógica.
export function agruparPorSemana (semanas, { visible = () => true } = {}) {
  return (semanas || [])
    .map((w) => ({
      schedule: w.schedule,
      items: (w.items || []).filter((e) => segmentoDe(e) !== SEGMENTO_CANCELADO && visible(e))
    }))
    .filter((w) => w.items.length)
    .map((w) => {
      let familia = null
      let programas = 0
      const items = w.items.map((e) => {
        const esCurso = e.program_type_alias === 'we_program_type_course'
        const arbol = Array.isArray(e.tree_detail) ? e.tree_detail : []
        const esPrograma = !esCurso && arbol.length > 0
        const propios = [e.edition_num_id, ...arbol.map((x) => (esCurso ? x.parent_edition_id : x.edition_num_id))].filter(Boolean)
        const engancha = !!familia && propios.some((id) => familia.has(id))
        let nivel = 0
        if (engancha) {
          propios.forEach((id) => familia.add(id))
          nivel = programas
          if (esPrograma) programas++
        } else if (esPrograma) {
          familia = new Set(propios)
          programas = 1
        } else {
          familia = null
          programas = 0
        }
        return { e, nivel, enFamilia: engancha || esPrograma }
      })
      // Dentro de una familia solo el ultimo miembro conserva su linea divisoria.
      items.forEach((it, i) => { it.fundida = it.enFamilia && !!items[i + 1] && items[i + 1].nivel > 0 })
      return { schedule: w.schedule, items }
    })
}
