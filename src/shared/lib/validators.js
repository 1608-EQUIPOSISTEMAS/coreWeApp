// Validadores genericos sin dominio.

export function isValidEmail (email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).toLowerCase())
}
