<template>
  <!--
    LoginView.vue
    Full login page — no AppShell (no sidebar/navbar needed for auth pages).
    Uses Vue form validation (v-model + computed errors).
    On success → redirects to home.
  -->
  <div class="auth-page">
    <div class="auth-card">

      <!-- Logo -->
      <div class="auth-logo">
        <svg viewBox="0 0 32 32" fill="none" class="auth-logo-svg">
          <circle cx="16" cy="16" r="14" fill="#FF4500"/>
          <path d="M26.5 16a2.5 2.5 0 00-4.2-1.8 12.3 12.3 0 00-6.6-2l1.1-5.2 3.6.8a1.8 1.8 0 103.5-.3 1.8 1.8 0 00-1.7 1.2l-4-.9a.4.4 0 00-.5.3l-1.3 5.8a12.4 12.4 0 00-6.7 2 2.5 2.5 0 10-2.8 4 4.8 4.8 0 000 .6c0 3.9 4.5 7 10 7s10-3.1 10-7a4.8 4.8 0 000-.6 2.5 2.5 0 001.6-2.3zm-15 1.5a1.5 1.5 0 111.5 1.5 1.5 1.5 0 01-1.5-1.5zm8.4 4a5.2 5.2 0 01-3.9 1.2 5.2 5.2 0 01-3.9-1.2.4.4 0 01.6-.6 4.4 4.4 0 003.3.9 4.4 4.4 0 003.3-.9.4.4 0 11.6.6zm-.2-2.5a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5z" fill="white"/>
        </svg>
        <span class="auth-logo-text">reddit</span>
      </div>

      <h1 class="auth-title">Log in</h1>
      <p class="auth-subtitle">By continuing, you agree to our User Agreement and Privacy Policy.</p>

      <!-- Error banner -->
      <div v-if="submitError" class="error-banner">
        <i class="fa-solid fa-circle-exclamation"></i>
        {{ submitError }}
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form" novalidate>

        <!-- Username field -->
        <div class="form-group" :class="{ 'form-group--error': errors.username }">
          <label class="form-label">Username</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="Enter your username"
            autocomplete="username"
            @blur="validateField('username')"
          />
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>

        <!-- Password field -->
        <div class="form-group" :class="{ 'form-group--error': errors.password }">
          <label class="form-label">Password</label>
          <div class="input-password-wrap">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="Enter your password"
              autocomplete="current-password"
              @blur="validateField('password')"
            />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
          </div>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>

        <!-- Forgot password -->
        <a href="#" class="forgot-pw">Forgot your password?</a>

        <!-- Submit -->
        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="isLoading">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Logging in...
          </span>
          <span v-else>Log In</span>
        </button>

      </form>

      <div class="auth-divider"><span>OR</span></div>

      <!-- Social login placeholder -->
      <button class="btn-social">
        <i class="fa-brands fa-google"></i> Continue with Google
      </button>
      <button class="btn-social">
        <i class="fa-brands fa-apple"></i> Continue with Apple
      </button>

      <p class="auth-switch">
        New to Reddit?
        <router-link to="/register" class="auth-switch-link">Sign Up</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ── Form state ──
const form = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })
const submitError = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

// ── Per-field validation ──
function validateField(field) {
  if (field === 'username') {
    if (!form.username.trim()) {
      errors.username = 'Username is required'
    } else if (form.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else {
      errors.username = ''
    }
  }
  if (field === 'password') {
    if (!form.password) {
      errors.password = 'Password is required'
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    } else {
      errors.password = ''
    }
  }
}

// ── Form submit ──
async function handleSubmit() {
  // Validate all fields
  validateField('username')
  validateField('password')
  if (errors.username || errors.password) return

  isLoading.value = true
  submitError.value = ''

  try {
    // In production: POST /api/auth/login
    // For now: mock auth — any username + password works
    await new Promise(r => setTimeout(r, 800))

    // Mock: store logged-in user in localStorage
    localStorage.setItem('reddit_user', JSON.stringify({
      username: form.username,
      loggedIn: true,
      joinDate: new Date().toISOString(),
    }))

    router.push('/')
  } catch (err) {
    submitError.value = 'Invalid username or password. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #DAE0E6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.auth-card {
  background: white;
  border-radius: 4px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}
.auth-logo-svg { width: 40px; height: 40px; }
.auth-logo-text { font-size: 22px; font-weight: 800; color: #1c1c1c; }
.auth-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 6px; }
.auth-subtitle { font-size: 12px; color: #878A8C; text-align: center; margin-bottom: 20px; line-height: 1.5; }

.error-banner {
  background: #FFF1F0;
  border: 1px solid #FCA5A5;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 13px;
  color: #DC2626;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #1c1c1c; }
.form-input {
  padding: 10px 12px;
  border: 1px solid #EDEFF1;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  background: #F6F7F8;
}
.form-input:focus { border-color: #0079D3; background: white; }
.form-group--error .form-input { border-color: #EA0027; }
.field-error { font-size: 12px; color: #EA0027; }
.input-password-wrap { position: relative; }
.input-password-wrap .form-input { width: 100%; padding-right: 40px; }
.toggle-pw {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: #878A8C; background: none; border: none; cursor: pointer;
}
.forgot-pw { font-size: 12px; color: #0079D3; text-decoration: none; align-self: flex-end; }
.forgot-pw:hover { text-decoration: underline; }

.btn-submit {
  padding: 10px;
  background: #FF4500;
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.btn-submit:hover { background: #E03D00; }
.btn-submit:disabled { background: #D1D5DB; cursor: not-allowed; }

.auth-divider {
  display: flex; align-items: center; gap: 12px; margin: 16px 0;
  font-size: 12px; color: #878A8C; font-weight: 700; text-transform: uppercase;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; height: 1px; background: #EDEFF1;
}

.btn-social {
  width: 100%; padding: 10px; background: white; border: 1px solid #878A8C;
  border-radius: 20px; font-size: 14px; font-weight: 700; font-family: inherit;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  gap: 10px; transition: background 0.1s; margin-bottom: 8px;
}
.btn-social:hover { background: #F6F7F8; }

.auth-switch { font-size: 14px; text-align: center; margin-top: 16px; color: #1c1c1c; }
.auth-switch-link { color: #FF4500; font-weight: 700; text-decoration: none; }
.auth-switch-link:hover { text-decoration: underline; }
</style>