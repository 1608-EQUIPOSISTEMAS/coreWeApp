<!-- src/components/UnattendedCallsModal.vue -->
<template>
  <CModal
    :visible="modelValue"
    size="lg"
    backdrop="static"    
    keyboard="false"
    @close="$emit('update:modelValue', false)"
  >
    <CModalHeader class="bg-danger text-white">
      <CModalTitle>
        ⚠️ Llamadas sin atención — {{ new Date().toLocaleDateString('es-PE') }}
      </CModalTitle>
    </CModalHeader>

    <CModalBody>
      <p class="text-muted mb-3">
        Las siguientes llamadas no fueron atendidas en el horario programado.
        Se reprogramaron automáticamente para mañana a las <strong>12:00 PM</strong>.
      </p>

      <CTable hover responsive small>
        <CTableHead color="dark">
          <CTableRow>
            <CTableHeaderCell>Lead</CTableHeaderCell>
            <CTableHeaderCell>Asesor</CTableHeaderCell>
            <CTableHeaderCell>Hora programada</CTableHeaderCell>
            <CTableHeaderCell>Reprogramada</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow v-for="r in registros" :key="r.attempt_id_original">
            <CTableDataCell>
              <span class="fw-semibold">{{ r.full_name }}</span>
              <small class="text-muted d-block">#{{ r.lead_id }}</small>
            </CTableDataCell>
            <CTableDataCell>{{ r.asesor_nombre }}</CTableDataCell>
            <CTableDataCell>
              <CBadge color="danger">{{ r.hora_programada }}</CBadge>
            </CTableDataCell>
            <CTableDataCell>
              <CBadge color="warning" text-color="dark">{{ r.nueva_cita }}</CBadge>
            </CTableDataCell>
          </CTableRow>
        </CTableBody>
      </CTable>
    </CModalBody>

    <CModalFooter>
      <span class="text-muted me-auto small">
        {{ registros.length }} registro(s) afectado(s)
      </span>
      <CButton color="danger" @click="$emit('update:modelValue', false)">
        Entendido, cerrar
      </CButton>
    </CModalFooter>
  </CModal>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  registros:  { type: Array, default: () => [] }
})
defineEmits(['update:modelValue'])
</script>