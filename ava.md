# Profile Picture Upload Feature

## Overview

Users can upload a profile picture, zoom and crop it into a circular frame, save it, and come back later to re-edit their original photo with a different crop — without re-uploading the file. The feature is built across three layers: the Vue modal component, the Cloudinary image host, and the backend API that stores only URLs and crop coordinates.

---

## Files Involved

| File | Role |
|---|---|
| `src/components/AvatarUploadModal.vue` | The entire upload/crop UI |
| `src/views/ProfileView.vue` | Hosts the modal, shows the edit overlay on the avatar |
| `src/services/api.js` | `getAvatar()` and `updateAvatar()` API calls |
| `.env` | `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` |

---

## How It Is Triggered

In `ProfileView.vue`, the avatar element is wrapped in a `div.avatar-wrap`. When the profile belongs to the currently logged-in user (`viewer.isSelf === true`), the wrapper gets a camera icon overlay and becomes clickable:

```html
<div class="avatar-wrap" :class="{ 'avatar-wrap--editable': viewer.isSelf }"
     @click="viewer.isSelf ? (avatarModalOpen = true) : null">
  <img v-if="profile.avatarUrl" ... />
  <span v-else class="avatar">{{ avatarLetter(profile.username) }}</span>
  <div v-if="viewer.isSelf" class="avatar-edit-overlay">
    <i class="fa-solid fa-camera"></i>
  </div>
</div>
```

The overlay is hidden by default (`opacity: 0`) and fades in on hover via CSS. The modal is only mounted for the owner's own profile page — other users' profiles never show the edit controls.

---

## Modal Structure — Two Steps

The modal (`AvatarUploadModal.vue`) has a single `step` ref that switches between `'select'` and `'crop'`.

### Step 1 — Select

When the modal opens it immediately calls `loadExisting()`, which calls `GET /api/me/avatar`. The backend returns:

- `avatarUrl` — the current cropped display picture (shown as a preview)
- `avatarOriginalUrl` — the full-resolution original that was uploaded
- `avatarCrop` — the saved crop coordinates `{ left, top, width, height }`

These are stored in `currentAvatarUrl`, `originalUrl`, and `savedCrop` refs respectively.

The select step shows three buttons depending on what data came back:

| Button | Condition | Action |
|---|---|---|
| Choose photo | always | Opens native file picker |
| Re-edit existing | only if `originalUrl` is not null | Loads original URL directly into cropper |
| Remove photo | only if `avatarUrl` exists | Calls PATCH with all-null fields |

### Step 2 — Crop

The crop step renders a `vue-advanced-cropper` `Cropper` component with a `CircleStencil` — the crop area is always circular to match how avatars are displayed on the profile page.

```html
<Cropper
  ref="cropperRef"
  :src="imageSrc"
  :stencil-component="CircleStencil"
  :stencil-props="{ movable: true, resizable: true }"
  :default-position="restorePosition"
  :default-size="restoreSize"
  image-restriction="stencil"
/>
```

`restorePosition` and `restoreSize` are computed properties that translate `savedCrop` into the props the cropper expects:

```js
const restorePosition = computed(() =>
  savedCrop.value ? { left: savedCrop.value.left, top: savedCrop.value.top } : undefined
)
const restoreSize = computed(() =>
  savedCrop.value ? { width: savedCrop.value.width, height: savedCrop.value.height } : undefined
)
```

When re-editing, `imageSrc` is set to `originalUrl` (the Cloudinary URL of the original photo) and `savedCrop` still holds the previous coordinates, so the cropper opens in exactly the same position as the last save. The user can then drag or resize the circle and save a new crop without re-uploading the file.

When a new file is selected, `savedCrop` is cleared to `null` so the cropper starts in its default centered position.

---

## Save Flow — Three Async Steps

When the user clicks **Save picture**, `saveCrop()` runs:

```
1. cropperRef.getResult()
   → coordinates { left, top, width, height }  ← stored as crop
   → canvas  ← the cropped image as an HTML Canvas element

2. If a new file was selected (selectedFile is not null):
   uploadToCloudinary(selectedFile, filename)
   → finalOriginalUrl  ← full-resolution original, for future re-edits

3. canvasToBlob(canvas)           ← export cropped canvas as JPEG blob at 90% quality
   uploadToCloudinary(blob, 'avatar.jpg')
   → finalAvatarUrl  ← the display image shown on the profile

4. updateAvatar({ avatarUrl: finalAvatarUrl, originalUrl: finalOriginalUrl, crop })
   PATCH /api/me/avatar
   → backend stores both URLs and the crop JSON

5. emit('saved', { avatarUrl })   ← ProfileView updates profile.avatarUrl immediately
   emit('close')
```

For a **re-edit** (no new file selected), step 2 is skipped — `finalOriginalUrl` reuses the existing `originalUrl` ref, so the original is never re-uploaded.

The `uploadStatus` ref drives the button label while saving, cycling through `'Uploading original…'` → `'Uploading crop…'` → `'Saving…'`.

---

## Cloudinary Integration

The backend does not store or serve image files. All image data lives on Cloudinary. The frontend uploads directly from the browser using an **unsigned upload preset**, which requires no API secret:

```js
async function uploadToCloudinary(blobOrFile, filename) {
  const formData = new FormData()
  formData.append('file', blobOrFile, filename)
  formData.append('upload_preset', CLOUDINARY_PRESET)   // unsigned preset name

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )
  const data = await response.json()
  return data.secure_url  // HTTPS CDN URL returned by Cloudinary
}
```

Two environment variables configure this, set in `.env`:

```
VITE_CLOUDINARY_CLOUD_NAME=dg8yxgtjv
VITE_CLOUDINARY_UPLOAD_PRESET=modern_web_application
```

Both are safe to expose in frontend code. The cloud name is already visible in every Cloudinary URL. The upload preset is unsigned, meaning it is designed to be used from browser JavaScript without a secret. Access control is enforced by the preset's settings in the Cloudinary dashboard (allowed formats, file size limit, destination folder).

The API secret is **never used in the frontend** and must never be placed in a `VITE_*` variable — doing so would embed it in the compiled JS bundle and expose it publicly.

---

## Backend API Endpoints Used

### `GET /api/me/avatar`

Called on modal open. Returns the authenticated user's current avatar data:

```json
{
  "success": true,
  "avatarUrl": "https://res.cloudinary.com/.../cropped.jpg",
  "avatarOriginalUrl": "https://res.cloudinary.com/.../original.jpg",
  "avatarCrop": { "left": 120, "top": 40, "width": 640, "height": 640 }
}
```

`avatarOriginalUrl` and `avatarCrop` are private — they are only returned to the authenticated owner through this endpoint. The public profile route (`GET /api/profiles/:username`) returns only `avatarUrl`.

### `PATCH /api/me/avatar`

Called on save or clear. Request body for setting an avatar:

```json
{
  "avatarUrl": "https://res.cloudinary.com/.../cropped.jpg",
  "originalUrl": "https://res.cloudinary.com/.../original.jpg",
  "crop": { "left": 120, "top": 40, "width": 640, "height": 640 }
}
```

Request body to remove the avatar entirely:

```json
{ "avatarUrl": null, "originalUrl": null, "crop": null }
```

The backend stores the crop as a JSONB column and returns the same shape as `GET /api/me/avatar` on success.

---

## Reactive Update After Save

`AvatarUploadModal` emits `saved` with `{ avatarUrl }`. `ProfileView` handles it with:

```js
function onAvatarSaved({ avatarUrl }) {
  if (profile.value) profile.value.avatarUrl = avatarUrl
}
```

This updates the avatar displayed on the profile page immediately without a page reload or re-fetch. Passing `null` (from "Remove photo") clears the avatar and the letter fallback appears.

---

## Re-edit Flow Summary

```
First upload
  User selects file  →  Cloudinary (original)  →  originalUrl stored
  User crops         →  Cloudinary (crop)       →  avatarUrl stored
  PATCH backend      →  both URLs + crop coords saved

Re-edit later
  Modal opens        →  GET /api/me/avatar      →  originalUrl + savedCrop loaded
  Cropper opens      →  imageSrc = originalUrl, default-position/size = savedCrop
  User adjusts crop  →  Cloudinary (new crop)   →  new avatarUrl
  PATCH backend      →  same originalUrl, new avatarUrl, new crop coords
```

The original photo is uploaded exactly once. Every subsequent re-edit only uploads the new cropped result.
