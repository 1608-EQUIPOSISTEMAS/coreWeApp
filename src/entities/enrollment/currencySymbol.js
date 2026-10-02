// Moneda de un monto de FICO. El catalogo we_currency tiene SOLES (3041, 'S/.')
// y DOLARES (3042, '$'). Se reconoce por alias y, si el catalogo no cargo (el
// cache del navegador a veces llega sin el grupo), por el id: una cuota en
// dolares pintada con S/. se lee como otro monto.
export const DOLLAR_CURRENCY_ID = 3042

export function currencySymbol (currencyId, catCurrency = []) {
  if (currencyId == null) return 'S/.'
  const entry = catCurrency.find(c => Number(c.id) === Number(currencyId))
  const isDollar = entry?.alias === 'we_currency_dollars' || Number(currencyId) === DOLLAR_CURRENCY_ID
  return isDollar ? '$' : 'S/.'
}
