<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">Notifications</h2>

      <button class="btn btn-outline-danger btn-sm" @click="clearAll">
        Clear All
      </button>
    </div>

    <div class="mb-3">
      <button
        class="btn btn-sm me-2"
        :class="activeFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
        @click="activeFilter = 'all'"
      >
        All
      </button>

      <button
        class="btn btn-sm"
        :class="activeFilter === 'unread' ? 'btn-primary' : 'btn-outline-primary'"
        @click="activeFilter = 'unread'"
      >
        Unread
      </button>
    </div>

    <div v-if="filteredNotifications.length === 0" class="alert alert-info">
      No notifications to show.
    </div>

    <div
      v-for="notification in filteredNotifications"
      :key="notification.id"
      class="card mb-3 shadow-sm border-0 rounded-4"
    >
      <div class="card-body d-flex align-items-start gap-3">
        <img :src="notification.avatar" alt="User Avatar" class="avatar" />

        <div class="flex-grow-1">
          <h6 class="mb-1" :class="{ 'fw-bold': !notification.read }">
            {{ notification.title }}
          </h6>

          <p class="mb-1 text-muted">
            {{ notification.message }}
          </p>

          <small class="text-muted">
            {{ notification.time }}
          </small>
        </div>

        <div class="dropdown">
          <button
            class="btn btn-light btn-sm"
            type="button"
            data-bs-toggle="dropdown"
          >
            ⋮
          </button>

          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <button class="dropdown-item" @click="markAsRead(notification.id)">
                Mark as Read
              </button>
            </li>

            <li>
              <button
                class="dropdown-item text-danger"
                @click="deleteNotification(notification.id)"
              >
                Delete Notification
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Notifications",

  data() {
    return {
      activeFilter: "all",
      notifications: []
    };
  },

  computed: {
    filteredNotifications() {
      if (this.activeFilter === "unread") {
        return this.notifications.filter((notification) => !notification.read);
      }

      return this.notifications;
    }
  },

  mounted() {
    const savedNotifications = localStorage.getItem("notifications");

    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
    }
  },

  methods: {
    saveNotifications() {
      localStorage.setItem("notifications", JSON.stringify(this.notifications));
    },

    markAsRead(id) {
      const notification = this.notifications.find((item) => item.id === id);

      if (notification) {
        notification.read = true;
        this.saveNotifications();
      }
    },

    deleteNotification(id) {
      this.notifications = this.notifications.filter(
        (notification) => notification.id !== id
      );

      this.saveNotifications();
    },

    clearAll() {
      this.notifications = [];
      this.saveNotifications();
    }
  }
};
</script>

<style scoped>
.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.card {
  transition: 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
}

.dropdown button {
  font-size: 20px;
  line-height: 1;
}
</style>