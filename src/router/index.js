import { createRouter, createWebHashHistory } from 'vue-router'

// Views — lazy-loaded for performance
const HomeView     = () => import('../views/HomeView.vue')
const ChatView     = () => import('../views/ChatView.vue')
const InboxView    = () => import('../views/InboxView.vue')
const LoginView    = () => import('../views/LoginView.vue')
const RegisterView = () => import('../views/RegisterView.vue')
const ProfileView  = () => import('../views/ProfileView.vue')
const PostView     = () => import('../views/PostView.vue')
const SearchView   = () => import('../views/SearchView.vue')
// const AboutView    = () => import('../views/AboutView.vue')
// const CommunityView = () => import('../views/CommunityView.vue')
const NotificationsView = () => import('../views/NotificationsView.vue')

const routes = [
  { path: '/',                    component: HomeView,          name: 'home' },
  { path: '/chat/:roomId?',       component: ChatView,          name: 'chat' },
  { path: '/inbox',               component: InboxView,         name: 'inbox' },
  { path: '/login',               component: LoginView,         name: 'login' },
  { path: '/register',            component: RegisterView,      name: 'register' },
  { path: '/profile/:username',   component: ProfileView,       name: 'profile' },
  { path: '/post/:id',            component: PostView,          name: 'post' },
  { path: '/search',              component: SearchView,        name: 'search' },
  // { path: '/about',               component: AboutView,         name: 'about' },
  // { path: '/r/:community',        component: CommunityView,     name: 'community' },
  { path: '/notifications',       component: NotificationsView, name: 'notifications' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  // Scroll to top on every navigation
  scrollBehavior() { return { top: 0 } }
})
