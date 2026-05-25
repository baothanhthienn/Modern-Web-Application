<template>
  <nav class="navbar navbar-dark bg-dark px-3">
    <router-link to="/profile" class="navbar-brand">
      Web App
    </router-link>

    <div>
      <router-link to="/profile" class="btn btn-outline-light me-2">
        Profile
      </router-link>

      <router-link to="/notifications" class="btn btn-outline-light">
        Notifications
      </router-link>
    </div>
  </nav>

  <router-view />
</template>

<script>
export default {
  name: "App"
};
</script>