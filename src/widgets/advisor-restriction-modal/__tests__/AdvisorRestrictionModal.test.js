import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AdvisorRestrictionModal from '../AdvisorRestrictionModal.vue'

describe('widgets/advisor-restriction-modal', () => {
  it('monta sin throw en modo control con props minimas', () => {
    const wrapper = shallowMount(AdvisorRestrictionModal, {
      props: { show: true }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('monta sin throw en modo comercial con un asesor', () => {
    const asesor = {
      user_id: 1,
      name: 'Asesor Demo',
      type_program_ids: [],
      model_modality_ids: [],
      program_ids: [],
      status_lead_ids: [],
      last_follow_ids: [],
      interest_level_ids: [],
      channel_ids: [],
      strategy_ids: [],
      moment_ids: [],
      first_contact_date_from: null,
      first_contact_date_to: null,
      edition_start_date_from: null,
      edition_start_date_to: null,
      first_contact_range_string: null,
      edition_start_range_string: null
    }
    const wrapper = shallowMount(AdvisorRestrictionModal, {
      props: { show: true, isComercial: true, hasActiveRestrictions: true, asesores: [asesor] }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
