<template>
  <div v-if="open" class="backdrop" @click.self="close">
    <div class="avatar-modal" role="dialog" aria-modal="true" :aria-label="hasExisting ? 'Edit profile picture' : 'Upload profile picture'">

      <div class="modal-header">
        <h2>{{ hasExisting ? 'Edit profile picture' : 'Upload profile picture' }}</h2>
        <button class="close-btn" @click="close" aria-label="Close" :disabled="saving">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Loading existing data -->
      <div v-if="loadingExisting" class="modal-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        Loading…
      </div>

      <!-- Step: select -->
      <template v-else-if="step === 'select'">
        <div class="step-select">
          <div class="current-avatar-preview">
            <img v-if="currentAvatarUrl" :src="currentAvatarUrl" class="preview-img" :alt="`u/${username}`" />
            <span v-else class="preview-letter">{{ avatarLetter(username) }}</span>
          </div>

          <p class="hint">Choose a photo to use as your profile picture. JPG, PNG, or GIF files are supported.</p>

          <div class="select-actions">
            <label class="btn primary file-label">
              <i class="fa-solid fa-arrow-up-from-bracket"></i>
              Choose photo
              <input type="file" accept="image/*" class="hidden-input" @change="onFileSelect" />
            </label>
            <button v-if="originalUrl" class="btn outline" @click="startReEdit">
              <i class="fa-regular fa-pen-to-square"></i>
              Re-edit existing
            </button>
            <button v-if="hasExisting" class="btn danger-outline" @click="clearAvatar" :disabled="saving">
              <i class="fa-regular fa-trash-can"></i>
              {{ saving ? 'Removing…' : 'Remove photo' }}
            </button>
          </div>

          <p v-if="error" class="modal-error">{{ error }}</p>
        </div>
      </template>

      <!-- Step: crop -->
      <template v-else-if="step === 'crop'">
        <div class="step-crop">
          <div class="cropper-container">
            <Cropper
              ref="cropperRef"
              class="cropper"
              :src="imageSrc"
              :stencil-component="CircleStencil"
              :stencil-props="{ movable: true, resizable: true }"
              :default-position="restorePosition"
              :default-size="restoreSize"
              image-restriction="stencil"
            />
          </div>

          <p v-if="error" class="modal-error">{{ error }}</p>

          <div class="crop-actions">
            <button class="btn outline" :disabled="saving" @click="backToSelect">
              <i class="fa-solid fa-arrow-left"></i>
              Back
            </button>
            <button class="btn primary" :disabled="saving" @click="saveCrop">
              <template v-if="saving">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                {{ uploadStatus }}
              </template>
              <template v-else>
                <i class="fa-solid fa-check"></i>
                Save picture
              </template>
            </button>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { getAvatar, updateAvatar } from '../services/api.js'
import { avatarLetter } from '../services/format.js'

const props = defineProps({
  open: Boolean,
  username: { type: String, default: '' },
})

const emit = defineEmits(['close', 'saved'])

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const step = ref('select')
const imageSrc = ref('')
const selectedFile = ref(null)
const originalUrl = ref(null)
const savedCrop = ref(null)
const currentAvatarUrl = ref(null)
const hasExisting = ref(false)
const saving = ref(false)
const loadingExisting = ref(false)
const uploadStatus = ref('')
const error = ref('')
const cropperRef = ref(null)

const restorePosition = computed(() =>
  savedCrop.value ? { left: savedCrop.value.left, top: savedCrop.value.top } : undefined
)
const restoreSize = computed(() =>
  savedCrop.value ? { width: savedCrop.value.width, height: savedCrop.value.height } : undefined
)

async function loadExisting() {
  loadingExisting.value = true
  error.value = ''
  try {
    const data = await getAvatar()
    currentAvatarUrl.value = data.avatarUrl
    originalUrl.value = data.avatarOriginalUrl
    savedCrop.value = data.avatarCrop
    hasExisting.value = Boolean(data.avatarUrl)
  } catch {
    // no avatar yet — silence the error
  } finally {
    loadingExisting.value = false
  }
}

function close() {
  if (saving.value) return
  emit('close')
}

function backToSelect() {
  step.value = 'select'
  imageSrc.value = ''
  selectedFile.value = null
  error.value = ''
}

function onFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  selectedFile.value = file
  imageSrc.value = URL.createObjectURL(file)
  savedCrop.value = null
  step.value = 'crop'
  // reset so same file can be re-selected
  event.target.value = ''
}

function startReEdit() {
  if (!originalUrl.value) return
  imageSrc.value = originalUrl.value
  selectedFile.value = null
  step.value = 'crop'
}

async function uploadToCloudinary(blobOrFile, filename) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
    throw new Error(
      'Image hosting is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    )
  }
  const formData = new FormData()
  formData.append('file', blobOrFile, filename)
  formData.append('upload_preset', CLOUDINARY_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!response.ok) throw new Error('Image upload failed. Please try again.')
  const data = await response.json()
  if (!data.secure_url) throw new Error('Image upload did not return a URL.')
  return data.secure_url
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export cropped image.'))),
      'image/jpeg',
      0.9
    )
  })
}

async function saveCrop() {
  if (saving.value || !cropperRef.value) return
  saving.value = true
  error.value = ''
  try {
    const { coordinates, canvas } = cropperRef.value.getResult()
    if (!canvas) throw new Error('Could not read the cropped image. Try a different photo.')

    const crop = {
      left: Math.round(coordinates.left),
      top: Math.round(coordinates.top),
      width: Math.round(coordinates.width),
      height: Math.round(coordinates.height),
    }

    let finalOriginalUrl = originalUrl.value

    if (selectedFile.value) {
      uploadStatus.value = 'Uploading original…'
      finalOriginalUrl = await uploadToCloudinary(selectedFile.value, selectedFile.value.name)
    }

    uploadStatus.value = 'Uploading crop…'
    const croppedBlob = await canvasToBlob(canvas)
    const finalAvatarUrl = await uploadToCloudinary(croppedBlob, 'avatar.jpg')

    uploadStatus.value = 'Saving…'
    const data = await updateAvatar({ avatarUrl: finalAvatarUrl, originalUrl: finalOriginalUrl, crop })

    emit('saved', { avatarUrl: data.avatarUrl })
    emit('close')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
    uploadStatus.value = ''
  }
}

async function clearAvatar() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await updateAvatar({ avatarUrl: null, originalUrl: null, crop: null })
    emit('saved', { avatarUrl: null })
    emit('close')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      step.value = 'select'
      imageSrc.value = ''
      selectedFile.value = null
      error.value = ''
      loadExisting()
    }
  }
)
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-content: center;
  background: rgba(15, 26, 28, 0.55);
  padding: 16px;
}

.avatar-modal {
  width: min(500px, 100vw - 32px);
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(15, 26, 28, 0.22);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.close-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--reddit-text-secondary);
  font-size: 16px;
  flex-shrink: 0;
}
.close-btn:hover:not(:disabled) { background: var(--reddit-surface-inset); }
.close-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  color: var(--reddit-text-secondary);
  font-size: 14px;
}

/* ── Step: select ── */
.step-select {
  padding: 20px;
}

.current-avatar-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.preview-img,
.preview-letter {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 3px solid var(--reddit-border-soft);
  object-fit: cover;
}

.preview-letter {
  display: grid;
  place-items: center;
  background: var(--reddit-blue);
  color: white;
  font-size: 38px;
  font-weight: 700;
}

.hint {
  text-align: center;
  color: var(--reddit-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.select-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  height: 42px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 21px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  border: 0;
  transition: background 0.12s, opacity 0.12s;
}

.btn.primary {
  background: var(--reddit-blue);
  color: white;
}
.btn.primary:hover:not(:disabled) { background: #003d9a; }

.btn.outline {
  border: 1.5px solid var(--reddit-border-emphasis);
  background: transparent;
  color: var(--reddit-text);
}
.btn.outline:hover:not(:disabled) { background: var(--reddit-surface-inset); }

.btn.danger-outline {
  border: 1.5px solid rgba(180, 35, 24, 0.22);
  background: transparent;
  color: #b42318;
}
.btn.danger-outline:hover:not(:disabled) { background: rgba(180, 35, 24, 0.06); }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.file-label {
  cursor: pointer;
  width: 100%;
}

.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.modal-error {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(180, 35, 24, 0.07);
  color: #b42318;
  font-size: 13px;
  line-height: 1.45;
}

/* ── Step: crop ── */
.step-crop {
  padding: 16px 20px 20px;
}

.cropper-container {
  width: 100%;
  height: 340px;
  border-radius: 12px;
  overflow: hidden;
  background: #111;
  margin-bottom: 14px;
}

.cropper {
  height: 340px;
  width: 100%;
}

.crop-actions {
  display: flex;
  gap: 10px;
}

.crop-actions .btn.outline { flex: 0 0 auto; }
.crop-actions .btn.primary { flex: 1; }
</style>
