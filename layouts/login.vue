<template>
  <div>
    <div class="logo-container">
      <img src="/logo.jpg" alt />
    </div>
    <nuxt />
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss">
.login-container {
  width: 100%;
  .login-form {
  width: 400px;
    padding: 20px 0;
    margin: 0 auto;
    font-size: 20px;
  }
}
.logo-container {
  width: 300px;
  height: 220px;
  margin: 0 auto;
  img {
    width: 100%;
    height: 100%;
  }
}
</style>