import { ref, inject } from 'vue'
import { ServiceKeys } from '@/services'

export function useEnrollmentCatalogs () {
  const ficoService = inject(ServiceKeys.Fico)
  const catalog = inject('catalog')

  const catCurrency = ref([])
  const catPaymentMedium = ref([])
  const catBusinessEntity = ref([])
  const catFinancialEntity = ref([])
  const allBankAccounts = ref([])

  function mapCatalog (alias) {
    const items = catalog.options(alias)
    return items.map(i => ({
      id: i.id ?? i.raw?.id ?? i.raw?.catalogo_id,
      description: i.description ?? i.raw?.abbreviation ?? i.raw?.description ?? i.alias,
      abbreviation: i.raw?.abbreviation || '',
      alias: i.alias
    }))
  }

  async function loadCatalogs () {
    await catalog.ensureLoaded()
    catCurrency.value = mapCatalog('we_currency')
    catPaymentMedium.value = mapCatalog('we_payment_medium')
    catBusinessEntity.value = mapCatalog('we_business_entity')
    catFinancialEntity.value = mapCatalog('we_financial_entity')
    try {
      allBankAccounts.value = await ficoService.getBankAccounts()
    } catch (err) { console.error('Error cargando cuentas:', err) }
  }

  function filteredAccounts (entityId) {
    if (!entityId) return []
    return allBankAccounts.value.filter(a => a.business_entity_catalog_id === entityId)
  }

  return {
    catCurrency, catPaymentMedium, catBusinessEntity, catFinancialEntity,
    allBankAccounts, loadCatalogs, filteredAccounts, mapCatalog
  }
}
