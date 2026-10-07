// Un permiso = una casilla de la matriz: cada submódulo cuenta uno y un módulo
// sin submódulos cuenta como uno. Así el % de la tarjeta sale de lo mismo que
// el usuario marca en "Editar", no de un conteo de módulos que esconde cuánto
// adentro de cada uno se concedió.
export function roleSummary (role, modules, isSuper = false) {
  const moduleIds = new Set(role.module_ids)
  const subIds = new Set(role.submodule_ids)
  let total = 0
  const chips = []
  for (const m of modules) {
    const size = m.submodules.length || 1
    total += size
    const count = isSuper
      ? size
      : m.submodules.length
        ? m.submodules.filter(s => subIds.has(s.submodule_id)).length
        : Number(moduleIds.has(m.module_id))
    if (count) chips.push({ id: m.module_id, name: m.name, count })
  }
  const granted = chips.reduce((sum, c) => sum + c.count, 0)
  return { granted, total, pct: total ? Math.round((granted / total) * 100) : 0, chips }
}
