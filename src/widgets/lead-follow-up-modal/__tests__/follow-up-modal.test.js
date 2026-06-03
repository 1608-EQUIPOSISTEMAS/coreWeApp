import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import FollowUpModal from '../FollowUpModal.vue'

describe('widgets/lead-follow-up-modal', () => {
  it('monta sin throw con props minimas (cerrado)', () => {
    const wrapper = shallowMount(FollowUpModal, {
      props: { show: false }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('monta sin throw abierto con lead e intentos', () => {
    const lead = { full_name_label: 'Juan', origin_phone: '999', cat_status_alias: 'we_lead_status_interesado' }
    const attempts = [{ id: null, attempt_number: null, cat_type_attempt: 'we_attempt_call', calling_alias: 'we_calling_pending', contact_datetime: '', response: '', contact_duration: 0, timerActive: false }]
    const wrapper = shallowMount(FollowUpModal, {
      props: {
        show: true,
        lead,
        attempts,
        isLoading: false,
        isSaving: false,
        pipeline: [],
        lAttempts: [],
        callingByType: () => [],
        minDate: null,
        hasRole: () => false
      }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
