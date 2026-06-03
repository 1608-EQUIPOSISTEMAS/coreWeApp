import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LeadFilterBar from '../LeadFilterBar.vue'
import LeadListTable from '../LeadListTable.vue'

const colGroups = { programa: true, cliente: true, lead: true, asesor: true }
const maps = { pipeline: {}, query: {}, interest: {}, follow: {} }

describe('widgets/lead-list', () => {
  it('LeadFilterBar monta sin throw con props minimas', () => {
    const wrapper = shallowMount(LeadFilterBar, {
      props: {
        activeQuickView: null,
        filterChips: [],
        filtroOrden: [],
        pagination: { size: 25, page: 1, total: 0, order_by: 0 }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('LeadFilterBar emite quick-view al pulsar una vista rapida', async () => {
    const wrapper = shallowMount(LeadFilterBar, {
      props: {
        activeQuickView: null,
        filterChips: [],
        filtroOrden: [],
        pagination: { size: 25, page: 1, total: 0, order_by: 0 }
      }
    })
    await wrapper.find('.ep-tab').trigger('click')
    expect(wrapper.emitted('quick-view')).toBeTruthy()
    expect(wrapper.emitted('quick-view')[0]).toEqual(['all'])
  })

  it('LeadListTable monta sin throw en modo expandido', () => {
    const wrapper = shallowMount(LeadListTable, {
      props: { leads: [], isCompact: false, isLoading: false, colGroups, maps, isComercial: false }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('LeadListTable monta sin throw en modo compacto', () => {
    const wrapper = shallowMount(LeadListTable, {
      props: { leads: [], isCompact: true, isLoading: false, colGroups, maps, isComercial: false }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('LeadListTable renderiza filas y emite row-click', async () => {
    const leads = [{ id: 1, cat_status_alias: 'we_lead_status_interesado', origin_phone: '999' }]
    const wrapper = shallowMount(LeadListTable, {
      props: { leads, isCompact: false, isLoading: false, colGroups, maps, isComercial: false }
    })
    await wrapper.find('tbody .tbody-row').trigger('click')
    expect(wrapper.emitted('row-click')).toBeTruthy()
    expect(wrapper.emitted('row-click')[0]).toEqual([leads[0]])
  })

  it('LeadListTable emite toggle-col-group al colapsar un grupo en compacto', async () => {
    const wrapper = shallowMount(LeadListTable, {
      props: { leads: [], isCompact: true, isLoading: false, colGroups, maps, isComercial: false }
    })
    await wrapper.find('.tg-programa').trigger('click')
    expect(wrapper.emitted('toggle-col-group')).toBeTruthy()
    expect(wrapper.emitted('toggle-col-group')[0]).toEqual(['programa'])
  })
})
