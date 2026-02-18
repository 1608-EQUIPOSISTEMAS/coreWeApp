<script setup>
  import avatar from '@/assets/images/avatars/8.jpg'

  const itemsCount = 0

  //updateBase()
  import { inject } from 'vue'
  import { ServiceKeys } from '@/services'
  import { useToast } from 'vue-toastification'

  const toast = useToast()
  const integrationService = inject(ServiceKeys.Integration)

  //extraer localstorage info user
  const user = JSON.parse(localStorage.getItem('user'))
  const userAlias = user.alias
  

  async function updateBase() {
    try {
      const response = await integrationService.updateLeadBase()
      
      if (response && response.ok) {
        toast.success(`Base actualizada. Registros generados: ${response.data.rows_generated}`);
      } else {
        throw new Error(response?.message || 'Error desconocido al actualizar la base');
      }
    } catch (error) {
      console.error('Error al actualizar la base de Asesor:', error)
      toast.error('Error al actualizar la base de Asesor')
    }
    
  }

  //updateEnrollmentBase
  async function updateEnrollmentBase() {
    try {
      const response = await integrationService.updateEnrollmentBase()
      
      if (response && response.ok) {
        toast.success(`Base de inscritos actualizada correctamente`);
      } else {
        throw new Error(response?.message || 'Error desconocido al actualizar inscritos');
      }
    } catch (error) {
      console.error('Error al actualizar la base de inscritos:', error)
      toast.error('Error al actualizar la base de inscritos')
    }
  }
  

  //syncScheduleToSheet
  async function syncScheduleToSheet() {
    try {
      const response = await integrationService.syncScheduleToSheet()
      
      if (response && response.ok) {
        toast.success(`GOOGLE SHEET PLANEAMIENTO SINCRONIZADO`);
      } else {
        throw new Error(response?.message || 'Error desconocido al sincronizar el cronograma');
      }
    } catch (error) {
      console.error('Error al sincronizar el cronograma:', error)
      toast.error('Error al sincronizar el cronograma')
    }
  }
  
  function logout(){
    console.log("datos")
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.reload()
  }
  
</script>

<template>
  <CDropdown placement="bottom-end" variant="nav-item">
    <CDropdownToggle class="py-0 pe-0" :caret="false">
      <CAvatar :src="avatar" size="md" />
    </CDropdownToggle>
    <CDropdownMenu class="pt-0">
      <CDropdownHeader
        component="h6"
        class="bg-body-secondary text-body-secondary fw-semibold mb-2 rounded-top"
      >
        Cuenta
      </CDropdownHeader>
      <CDropdownItem>
        <CIcon icon="cil-envelope-open" /> Mensajes
        <CBadge color="success" class="ms-auto">{{ itemsCount }}</CBadge>
      </CDropdownItem>
       <CDropdownItem @click="updateBase()" v-if="$hasRole(['COMERCIAL'])">
        <CIcon  icon="cil-cloud-download" /> Actualizar {{ userAlias }}
      </CDropdownItem>
       <CDropdownItem @click="updateEnrollmentBase()"  v-if="$hasRole(['LIDER_COMERCIAL'])">
        <CIcon  icon="cil-cloud-download" /> Inscritos
      </CDropdownItem>
       <CDropdownItem @click="syncScheduleToSheet()"  v-if="$hasRole(['ADMIN','PRODUCTO','LIDER GERENCIA'])">
        <CIcon  icon="cil-cloud-download" /> Planeamiento
      </CDropdownItem>
      <CDropdownHeader
        component="h6"
        class="bg-body-secondary text-body-secondary fw-semibold my-2"
      >
        Configuración
      </CDropdownHeader>
      <CDropdownItem> <CIcon icon="cil-user" /> Perfil </CDropdownItem>
      <CDropdownItem> <CIcon icon="cil-settings" /> Ajustes </CDropdownItem>
      <CDropdownDivider />
      <CDropdownItem @click="logout()"> <CIcon icon="cil-lock-locked"/> Cerrar Sesión </CDropdownItem>
    </CDropdownMenu>
  </CDropdown>
</template>