<template>
  <div class="wrapper min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow class="justify-content-center">
        <CCol :md="6">
          <div class="clearfix">
            <h1 class="float-start display-3 me-4">404</h1>
            <h4 class="pt-3">¡Ups! Te has perdido.</h4>
            <p class="text-body-secondary float-start">
              La página que buscas no existe o ha sido movida.
            </p>
          </div>
           
          <div class="d-grid gap-2 d-md-block">
            <router-link to="/">
              <CButton color="primary">
                Volver al inicio
              </CButton>
            </router-link>
          </div>
          
        </CCol>
      </CRow>
    </CContainer>
  </div>
</template>