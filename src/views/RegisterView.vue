<template>
  <div class="auth-page">
    <div class="auth-card">

      <div class="auth-logo">
        <svg viewBox="0 0 32 32" fill="none" class="auth-logo-svg">
          <circle cx="16" cy="16" r="14" fill="#FF4500"/>
          <path d="M26.5 16a2.5 2.5 0 00-4.2-1.8 12.3 12.3 0 00-6.6-2l1.1-5.2 3.6.8a1.8 1.8 0 103.5-.3 1.8 1.8 0 00-1.7 1.2l-4-.9a.4.4 0 00-.5.3l-1.3 5.8a12.4 12.4 0 00-6.7 2 2.5 2.5 0 10-2.8 4 4.8 4.8 0 000 .6c0 3.9 4.5 7 10 7s10-3.1 10-7a4.8 4.8 0 000-.6 2.5 2.5 0 001.6-2.3zm-15 1.5a1.5 1.5 0 111.5 1.5 1.5 1.5 0 01-1.5-1.5zm8.4 4a5.2 5.2 0 01-3.9 1.2 5.2 5.2 0 01-3.9-1.2.4.4 0 01.6-.6 4.4 4.4 0 003.3.9 4.4 4.4 0 003.3-.9.4.4 0 11.6.6zm-.2-2.5a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5z" fill="white"/>
        </svg>
        <span class="auth-logo-text">reddit</span>
      </div>

      <h1 class="auth-title">Sign Up</h1>
      <p class="auth-subtitle">By continuing, you agree to our User Agreement and Privacy Policy.</p>

      <!-- Error list (form-level) -->
      <div v-if="formErrors.length > 0" class="error-list">
        <ul>
          <li v-for="err in formErrors" :key="err">{{ err }}</li>
        </ul>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form" novalidate>

        <!-- Email -->
        <div class="form-group" :class="{ 'form-group--error': errors.email }">
          <label class="form-label">Email</label>
          <input v-model="form.email" type="email" class="form-input"
            placeholder="Enter your email" @blur="validateField('email')" />
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>

        <!-- Username -->
        <div class="form-group" :class="{ 'form-group--error': errors.username }">
          <label class="form-label">Username</label>
          <input v-model="form.username" type="text" class="form-input"
            placeholder="Choose a username" @blur="validateField('username')" />
          <span class="field-hint">Username must be 3–20 characters, letters/numbers/underscores only</span>
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>

        <!-- Password -->
        <div class="form-group" :class="{ 'form-group--error': errors.password }">
          <label class="form-label">Password</label>
          <div class="input-password-wrap">
            <input v-model="form.password" :type="showPw ? 'text' : 'password'" class="form-input"
              placeholder="Create a password" @blur="validateField('password')" />
            <button type="button" class="toggle-pw" @click="showPw = !showPw">
              <i :class="showPw ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
            </button>
          </div>
          <!-- Password strength bar -->
          <div class="pw-strength">
            <div class="pw-strength-bar" :style="{ width: pwStrength.pct + '%', background: pwStrength.color }"></div>
          </div>
          <span class="field-hint">{{ pwStrength.label }}</span>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>

        <!-- Confirm Password -->
        <div class="form-group" :class="{ 'form-group--error': errors.confirmPassword }">
          <label class="form-label">Confirm Password</label>
          <input v-model="form.confirmPassword" type="password" class="form-input"
            placeholder="Repeat your password" @blur="validateField('confirmPassword')" />
          <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
        </div>

        <!-- Terms checkbox -->
        <div class="form-group form-group--check">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.acceptTerms" class="checkbox-input" />
            I agree to the <a href="#" class="inline-link">User Agreement</a> and
            <a href="#" class="inline-link">Privacy Policy</a>
          </label>
          <span v-if="errors.acceptTerms" class="field-error">{{ errors.acceptTerms }}</span>
        </div>

        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="isLoading"><i class="fa-solid fa-circle-notch fa-spin"></i> Creating account...</span>
          <span v-else">Sign Up</span>
        </button>
      </form>

      <p class="auth-switch">
        Already a Redditor?
        <router-link to="/login" class="auth-switch-link">Log In</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = reactive({
  email: '', username: '', password: '', confirmPassword: '', acceptTerms: false
})
const errors = reactive({
  email: '', username: '', password: '', confirmPassword: '', acceptTerms: ''
})
const formErrors = ref([])
const isLoading = ref(false)
const showPw = ref(false)

// Password strength indicator
const pwStrength = computed(() => {
  const pw = form.password
  if (!pw) return { pct: 0, color: '#E5E7EB', label: '' }
  const hasUpper  = /[A-Z]/.test(pw)
  const hasLower  = /[a-z]/.test(pw)
  const hasNumber = /\d/.test(pw)
  const hasSymbol = /[!@#$%^&*]/.test(pw)
  const score = [pw.length >= 8, hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length
  if (score <= 2) return { pct: 33,  color: '#EF4444', label: 'Weak — add uppercase, numbers, symbols' }
  if (score <= 3) return { pct: 66,  color: '#F59E0B', label: 'Moderate — almost there' }
  return           { pct: 100, color: '#22C55E', label: 'Strong password ✓' }
})

// Regex patterns (from Lab 06 learning)
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function validateField(field) {
  if (field === 'email') {
    if (!form.email) errors.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email)) errors.email = 'Enter a valid email address'
    else errors.email = ''
  }
  if (field === 'username') {
    if (!form.username) errors.username = 'Username is required'
    else if (!USERNAME_RE.test(form.username)) errors.username = 'Username must be 3–20 chars, letters/numbers/underscores only'
    else errors.username = ''
  }
  if (field === 'password') {
    if (!form.password) errors.password = 'Password is required'
    else if (!PASSWORD_RE.test(form.password)) errors.password = 'Must be 8+ chars with uppercase, lowercase, and a number'
    else errors.password = ''
  }
  if (field === 'confirmPassword') {
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match'
    else errors.confirmPassword = ''
  }
}

async function handleSubmit() {
  // Validate all fields
  ;['email', 'username', 'password', 'confirmPassword'].forEach(validateField)

  if (!form.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms to continue'
  } else {
    errors.acceptTerms = ''
  }

  const hasErrors = Object.values(errors).some(e => e !== '')
  if (hasErrors) return

  isLoading.value = true
  try {
    await new Promise(r => setTimeout(r, 1000))
    localStorage.setItem('reddit_user', JSON.stringify({
      username: form.username,
      email: form.email,
      loggedIn: true,
      joinDate: new Date().toISOString(),
    }))
    router.push('/')
  } catch {
    formErrors.value = ['Registration failed. Please try again.']
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; background: #DAE0E6; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: white; border-radius: 4px; padding: 32px; width: 100%; max-width: 420px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.auth-logo { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 20px; }
.auth-logo-svg { width: 40px; height: 40px; }
.auth-logo-text { font-size: 22px; font-weight: 800; color: #1c1c1c; }
.auth-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 6px; }
.auth-subtitle { font-size: 12px; color: #878A8C; text-align: center; margin-bottom: 20px; line-height: 1.5; }
.error-list { background: #FFF1F0; border: 1px solid #FCA5A5; border-radius: 4px; padding: 10px 12px; margin-bottom: 16px; }
.error-list ul { margin: 0; padding-left: 16px; font-size: 13px; color: #DC2626; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group--check { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
.form-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.form-input { padding: 10px 12px; border: 1px solid #EDEFF1; border-radius: 4px; font-size: 14px; font-family: inherit; outline: none; background: #F6F7F8; transition: border-color 0.15s; }
.form-input:focus { border-color: #0079D3; background: white; }
.form-group--error .form-input { border-color: #EA0027; }
.field-error { font-size: 12px; color: #EA0027; }
.field-hint { font-size: 11px; color: #878A8C; }
.input-password-wrap { position: relative; }
.input-password-wrap .form-input { width: 100%; padding-right: 40px; }
.toggle-pw { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #878A8C; background: none; border: none; cursor: pointer; }
.pw-strength { height: 4px; background: #F3F4F6; border-radius: 2px; margin-top: 6px; overflow: hidden; }
.pw-strength-bar { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
.checkbox-label { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; cursor: pointer; }
.checkbox-input { width: 16px; height: 16px; margin-top: 1px; accent-color: #FF4500; flex-shrink: 0; }
.inline-link { color: #0079D3; text-decoration: none; }
.inline-link:hover { text-decoration: underline; }
.btn-submit { padding: 10px; background: #FF4500; color: white; font-weight: 700; font-size: 14px; border-radius: 20px; border: none; cursor: pointer; font-family: inherit; transition: background 0.1s; }
.btn-submit:hover { background: #E03D00; }
.btn-submit:disabled { background: #D1D5DB; cursor: not-allowed; }
.auth-switch { font-size: 14px; text-align: center; margin-top: 16px; }
.auth-switch-link { color: #FF4500; font-weight: 700; text-decoration: none; }
.auth-switch-link:hover { text-decoration: underline; }
</style>