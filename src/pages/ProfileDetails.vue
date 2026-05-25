<template>
  <div class="container py-4">
    <div class="row justify-content-center">
      <div class="col-12 col-md-10 col-lg-8">
        <div class="card shadow-sm border-0 rounded-4">
          <div class="card-body p-4">
            <h2 class="text-center mb-4">Profile Details</h2>

            <div class="text-center mb-4">
              <img
                :src="profile.photo || defaultPhoto"
                alt="Profile Photo"
                class="profile-img mb-3"
              />

              <div class="d-flex justify-content-center gap-2 mt-3">
                <button
                  v-if="profile.photo"
                  type="button"
                  class="btn btn-outline-primary"
                  @click="editPhoto"
                >
                  Edit Photo
                </button>

                <button
                  type="button"
                  class="btn btn-outline-dark"
                  @click="$refs.newPhotoInput.click()"
                >
                  Upload New Photo
                </button>
              </div>

              <input
                ref="newPhotoInput"
                type="file"
                class="d-none"
                accept="image/*"
                @change="handlePhotoUpload"
              />

              <div v-if="showCropper" class="cropper-box mt-3">
                <Cropper
                  ref="cropper"
                  :src="tempPhoto"
                  :stencil-props="{ aspectRatio: 1 }"
                />

                <div class="d-flex gap-2 mt-3">
                  <button type="button" class="btn btn-success w-50" @click="cropPhoto">
                    Save Crop
                  </button>

                  <button type="button" class="btn btn-secondary w-50" @click="cancelCrop">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <form @submit.prevent="saveProfile">
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input
                  v-model="profile.username"
                  type="text"
                  class="form-control"
                  placeholder="Enter username"
                />
                <small v-if="errors.username" class="text-danger">
                  {{ errors.username }}
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">Bio</label>
                <input
                  v-model="profile.bio"
                  class="form-control"
                  placeholder="Write something about yourself"
                />
                <small v-if="errors.bio" class="text-danger">
                  {{ errors.bio }}
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input
                  v-model="profile.email"
                  type="email"
                  class="form-control"
                  placeholder="Enter email"
                />
                <small v-if="errors.email" class="text-danger">
                  {{ errors.email }}
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">Lives In</label>
                <input
                  v-model="profile.livesIn"
                  type="text"
                  class="form-control"
                  placeholder="Enter city or country"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Date of Birth</label>
                <input v-model="profile.dob" type="date" class="form-control" />
                <small v-if="errors.dob" class="text-danger">
                  {{ errors.dob }}
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">Gender</label>
                <select v-model="profile.gender" class="form-select">
                  <option disabled value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Education</label>
                <input
                  v-model="profile.education"
                  type="text"
                  class="form-control"
                  placeholder="School or University"
                />
              </div>

              <div class="mb-4">
                <label class="form-label">Work Place</label>
                <input
                  v-model="profile.workPlace"
                  type="text"
                  class="form-control"
                  placeholder="Enter workplace"
                />
              </div>

              <button type="submit" class="btn btn-primary w-100">
                Save Profile
              </button>
            </form>

            <div v-if="savedMessage" class="alert alert-success mt-3">
              {{ savedMessage }}
            </div>
          </div>
        </div>

        <div class="card mt-4 shadow-sm border-0 rounded-4">
          <div class="card-body">
            <h4 class="mb-3">Profile Preview</h4>

            <div class="d-flex align-items-center gap-3 mb-3">
              <img
                :src="profile.photo || defaultPhoto"
                alt="Profile Photo"
                class="preview-img"
              />

              <div>
                <h5 class="mb-1">{{ profile.username || "Username" }}</h5>
                <p class="text-muted mb-0">
                  {{ profile.bio || "No bio added yet." }}
                </p>
              </div>
            </div>

            <ul class="list-group list-group-flush">
              <li class="list-group-item">
                <strong>Email:</strong> {{ profile.email || "Not added" }}
              </li>
              <li class="list-group-item">
                <strong>Lives in:</strong> {{ profile.livesIn || "Not added" }}
              </li>
              <li class="list-group-item">
                <strong>Date of Birth:</strong> {{ profile.dob || "Not added" }}
              </li>
              <li class="list-group-item">
                <strong>Gender:</strong> {{ profile.gender || "Not added" }}
              </li>
              <li class="list-group-item">
                <strong>Education:</strong> {{ profile.education || "Not added" }}
              </li>
              <li class="list-group-item">
                <strong>Work Place:</strong> {{ profile.workPlace || "Not added" }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

const defaultProfile = {
  photo: "",
  originalPhoto: "",
  username: "",
  bio: "",
  email: "",
  livesIn: "",
  dob: "",
  gender: "",
  education: "",
  workPlace: "",
};

export default {
  name: "ProfileDetails",

  components: {
    Cropper,
  },

  data() {
    return {
      profile: { ...defaultProfile },
      errors: {},
      savedMessage: "",
      showCropper: false,
      tempPhoto: "",
      defaultPhoto: "https://via.placeholder.com/150?text=Profile",
    };
  },

  mounted() {
    const savedProfile = localStorage.getItem("currentUser");

    if (savedProfile) {
      this.profile = {
        ...defaultProfile,
        ...JSON.parse(savedProfile),
      };
    }
  },

  methods: {
    handlePhotoUpload(event) {
      const file = event.target.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        this.profile.originalPhoto = reader.result;
        this.tempPhoto = reader.result;
        this.showCropper = true;
      };

      reader.readAsDataURL(file);
    },

    cropPhoto() {
      const result = this.$refs.cropper.getResult();

      if (result && result.canvas) {
        this.profile.photo = result.canvas.toDataURL("image/jpeg");
        this.showCropper = false;
        this.tempPhoto = "";
      }
    },

    cancelCrop() {
      this.showCropper = false;
      this.tempPhoto = "";
    },

    editPhoto() {
      this.tempPhoto = this.profile.originalPhoto || this.profile.photo;
      this.showCropper = true;
    },

    validateForm() {
      this.errors = {};

      if (!this.profile.username.trim()) {
        this.errors.username = "Username is required";
      }

      if (!this.profile.email.trim()) {
        this.errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.profile.email)) {
        this.errors.email = "Invalid email format";
      }

      if (this.profile.dob) {
        const today = new Date();
        const selected = new Date(this.profile.dob);

        if (selected > today) {
          this.errors.dob = "DOB cannot be in the future";
        }
      }

      if (this.profile.bio && this.profile.bio.length > 150) {
        this.errors.bio = "Bio must be under 150 characters";
      }

      return Object.keys(this.errors).length === 0;
    },

    saveProfile() {
      if (!this.validateForm()) {
        this.savedMessage = "";
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(this.profile));
      this.savedMessage = "Profile saved successfully";
    },
  },
};
</script>

<style scoped>
.profile-img {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #dee2e6;
  background-color: #f8f9fa;
}

.preview-img {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid #dee2e6;
}

.cropper-box {
  max-width: 400px;
  margin: 0 auto;
}

.cropper-box .vue-advanced-cropper {
  height: 300px;
  background: #f8f9fa;
}

.card {
  background-color: #ffffff;
}

@media (max-width: 576px) {
  .profile-img {
    width: 110px;
    height: 110px;
  }

  .preview-img {
    width: 60px;
    height: 60px;
  }
}
</style>