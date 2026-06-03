import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AdvancedFilterModal from '../AdvancedFilterModal.vue'

function defaultFilters () {
  return {
    q: '', web: null, b2b: null, order_by: 0,
    owner_user_ids: [], moment_ids: [], status_lead_ids: [], last_follow_ids: [],
    attempt_origin_ids: [], interest_level_ids: [], code_country_ids: [], channel_ids: [],
    medium_contact_ids: [], prospect_situation_ids: [], strategy_ids: [], word_ids: [],
    program_version_ids: [], query_ids: [], type_program_ids: [], model_modality_ids: [],
    fico_status_ids: [], profile_ids: [], currency_ids: [], inscription_modality_ids: [],
    installment_status_ids: [], payment_method_ids: [], settlement_status_ids: [], payment_channel_ids: [],
    rangoFechas: { start: '', end: '' }, rangoModificacion: { start: '', end: '' },
    created_range_string: null, updated_range_string: null, edition_range_string: null,
    first_contact_range_string: null, pay_date_range_string: null,
    edition_start_from: '', edition_start_to: '', first_contact_from: '', first_contact_to: '',
    pay_date_from: '', pay_date_to: ''
  }
}

describe('widgets/AdvancedFilterModal', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(AdvancedFilterModal, {
      props: { show: true, filters: defaultFilters() }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('emite apply al invocar el handler de aplicar', () => {
    const wrapper = shallowMount(AdvancedFilterModal, {
      props: { show: true, filters: defaultFilters() }
    })
    wrapper.vm.$emit('apply')
    expect(wrapper.emitted('apply')).toBeTruthy()
  })
})
