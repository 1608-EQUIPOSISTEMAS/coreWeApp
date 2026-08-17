// Resolucion de la edicion que le toca a cada modulo hijo de un programa padre.
//
// Regla de negocio: los modulos de un diplomado NO arrancan todos el mismo dia.
// El arbol del padre le asigna a cada uno su propia edicion (tree_edition_id), y
// dos modulos del mismo diplomado pueden empezar con meses de diferencia. Por eso
// la etiqueta se resuelve POR HIJO: un texto unico tipo "misma edicion" para toda
// la tabla oculta justo el dato que FICO necesita, la fecha de inicio.

// Devuelve la edicion del arbol para este hijo, o null si el arbol no lo programa
// (modulo online sin ediciones, o modulo fuera del arbol del padre).
export function findTreeEdition (child) {
  const treeId = child?.tree_edition_id
  if (!treeId) return null
  return (child.editions || []).find(e => e.edition_id === treeId) || null
}

// Etiqueta de la columna Edicion: "E101 - 17/10/2026".
// formatDate se inyecta para no atar esta regla al formateador de Vue.
export function childEditionLabel (child, formatDate) {
  const ed = findTreeEdition(child)
  if (!ed) return null
  return ed.start_date ? `${ed.code} - ${formatDate(ed.start_date)}` : ed.code
}
