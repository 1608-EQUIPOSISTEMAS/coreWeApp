// Helpers de catalogo reutilizables (sin dominio). Traducen entre alias e id
// tolerando el shape { id, alias } o { raw: { id, alias } } que usan los selects.

export function idByAlias (alias, list = []) {
  if (!alias) return null
  const it = list.find(i => i.alias === alias || i.raw?.alias === alias)
  return it?.id ?? null
}

export function aliasById (id, list = []) {
  if (!id) return null
  const it = list.find(i => i.id === id || i.raw?.id === id)
  return it?.alias ?? null
}
