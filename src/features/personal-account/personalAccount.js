// Etiqueta CUENTA PERSONAL (Claude / ChatGPT) que Academica usa para saber a
// quien entregar una cuenta por modulo. La regla comercial:
//   - curso suelto con el beneficio             -> la cuenta es del curso
//   - especializacion + beneficio S/200         -> todos los modulos
//   - especializacion + beneficio S/100         -> solo los modulos que marca la asesora
// El beneficio llega como opcion del combo: { value, label: '200.00 - CUENTA CLAUDE' }.

const PROVIDER_PATTERNS = [
  ['CLAUDE', /CUENTA\s+CLAUDE/i],
  ['CHATGPT', /CUENTA\s+CHATGPT/i]
]

export const PERSONAL_ACCOUNT_OPTIONS = PROVIDER_PATTERNS.map(([provider]) => provider)

// Montos que cubren la especializacion completa (una cuenta por cada modulo).
const FULL_PACKAGE_AMOUNT = 200

function accountBenefit (benefits = []) {
  for (const b of benefits) {
    const label = String(b?.label ?? b?.full_label ?? '')
    const hit = PROVIDER_PATTERNS.find(([, re]) => re.test(label))
    if (hit) return { provider: hit[0], amount: parseFloat(label) || 0 }
  }
  return null
}

// ¿La asesora tiene que marcar los modulos? Solo S/100 en un paquete.
export function requiresModulePick (benefits, moduleCount) {
  const b = accountBenefit(benefits)
  return !!b && moduleCount > 0 && b.amount < FULL_PACKAGE_AMOUNT
}

// Lo que viaja en el payload de la venta. modules null = todos (o curso suelto).
export function resolvePersonalAccount ({ benefits, moduleCount = 0, selectedModules = [] }) {
  const b = accountBenefit(benefits)
  if (!b) return { personal_account: null, personal_account_modules: null }
  return {
    personal_account: b.provider,
    personal_account_modules: requiresModulePick(benefits, moduleCount) ? [...selectedModules] : null
  }
}
