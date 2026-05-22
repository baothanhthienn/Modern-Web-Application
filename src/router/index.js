import { createRouter, createWebHistory } from "vue-router";
import ProfileDetails from "../pages/ProfileDetails.vue";
import Notifications from "../pages/Notifications.vue";

const routes = [
  {
    path: "/profile",
    name: "ProfileDetails",
    component: ProfileDetails
  },

  {
    path: "/notifications",
    name: "Notifications",
    component: Notifications
  }

];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;