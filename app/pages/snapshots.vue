
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Snapshot {
  id: number
  src: string
  time: string
}

const authUser = useAuthUser()

const snapshots = ref<Snapshot[]>([])
const loading = ref(true)
const selectedSnapshot = ref<Snapshot | null>(null)
const showClearModal = ref(false)

function getAccountStorageKey(key: string): string | null {
  const email = authUser.value?.email?.trim().toLowerCase()

  if (!email) return null

  return `${key}_${encodeURIComponent(email)}`
}

function loadSnapshots() {
  if (!import.meta.client) return

  const storageKey = getAccountStorageKey('face_snapshots')

  if (!storageKey) {
    snapshots.value = []
    loading.value = false
    return
  }

  try {
    const saved = localStorage.getItem(storageKey)
    snapshots.value = saved ? JSON.parse(saved) as Snapshot[] : []
  } catch (error) {
    console.error('Error loading snapshots:', error)
    snapshots.value = []
  }

  loading.value = false
}

function saveSnapshots() {
  const storageKey = getAccountStorageKey('face_snapshots')
  if (!storageKey) return

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(snapshots.value)
    )
  } catch (error) {
    console.error('Error saving snapshots:', error)
  }
}

function deleteSnapshot(id: number) {
  snapshots.value = snapshots.value.filter(
    snapshot => snapshot.id !== id
  )

  if (selectedSnapshot.value?.id === id) {
    selectedSnapshot.value = null
  }

  saveSnapshots()
}

function confirmClearSnapshots() {
  snapshots.value = []
  selectedSnapshot.value = null
  showClearModal.value = false
  saveSnapshots()
}

function formatDate(time: string) {
  const date = new Date(time)

  if (Number.isNaN(date.getTime())) return time

  return date.toLocaleString()
}

watch(
  () => authUser.value?.email,
  () => {
    selectedSnapshot.value = null
    loading.value = true
    loadSnapshots()
  }
)

onMounted(loadSnapshots)
</script>

<template>
  <div class="gallery-page">
    <!-- Header -->
    <header class="gallery-header">
      <div class="header-left">
        <div class="header-icon">
          <span>▧</span>
        </div>

        <div>
          <div class="eyebrow">FACE RECOGNITION SYSTEM</div>
          <h1>Snapshot Gallery</h1>
          <p>Manage and explore your captured snapshots.</p>
        </div>
      </div>

      <div class="header-actions">
        <NuxtLink to="/face" class="capture-btn">
          <span>＋</span>
          Capture Snapshot
        </NuxtLink>

        <button
          v-if="snapshots.length > 0"
          class="clear-btn"
          @click="showClearModal = true"
        >
          <span>⌫</span>
          Clear All
        </button>
      </div>
    </header>

    <!-- Statistics -->
    <section class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">▧</div>
        <div>
          <p>Total Snapshots</p>
          <h2>{{ snapshots.length }}</h2>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">◉</div>
        <div>
          <p>Gallery Status</p>
          <h2>{{ snapshots.length > 0 ? 'Active' : 'Empty' }}</h2>
        </div>
      </div>
    </section>

    <!-- Gallery -->
    <section class="gallery-section">
      <div class="section-heading">
        <div>
          <h2>Your Captures</h2>
          <p>Click any photo to view it in full size.</p>
        </div>

        <span class="total-label">
          {{ snapshots.length }} items
        </span>
      </div>

      <div v-if="loading" class="empty-state">
        <div class="loading-spinner"></div>
        <h3>Loading gallery...</h3>
      </div>

      <div
        v-else-if="snapshots.length === 0"
        class="empty-state"
      >
        <div class="empty-icon">▧</div>
        <h3>No snapshots yet</h3>
        <p>
          Your captured images will appear here once you take
          your first snapshot.
        </p>

        <NuxtLink to="/face" class="capture-btn">
          Go to Face Recognition
        </NuxtLink>
      </div>

      <div v-else class="gallery-grid">
        <article
          v-for="(snapshot, index) in snapshots"
          :key="snapshot.id"
          class="snapshot-card"
        >
          <button
            class="photo-button"
            type="button"
            :aria-label="`View snapshot ${snapshot.id}`"
            @click="selectedSnapshot = snapshot"
          >
            <div class="photo-wrapper">
              <img
                :src="snapshot.src"
                :alt="`Snapshot ${snapshot.id}`"
                class="snapshot-image"
              />

              <div class="photo-overlay">
                <span class="zoom-icon">⌕</span>
                <span>View Photo</span>
              </div>

              <span class="photo-number">
                #{{ String(index + 1).padStart(2, '0') }}
              </span>
            </div>
          </button>

          <div class="snapshot-info">
            <div class="snapshot-details">
              <h3>Snapshot {{ snapshot.id }}</h3>
              <p>{{ formatDate(snapshot.time) }}</p>
            </div>

            <button
              class="delete-btn"
              title="Delete snapshot"
              @click="deleteSnapshot(snapshot.id)"
            >
              <span>⌫</span>
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedSnapshot"
          class="modal-backdrop"
          @click.self="selectedSnapshot = null"
          @keydown.esc="selectedSnapshot = null"
        >
          <div class="preview-modal">
            <div class="preview-header">
              <div>
                <span class="preview-label">PHOTO PREVIEW</span>
                <h3>Snapshot {{ selectedSnapshot.id }}</h3>
              </div>

              <button
                class="close-btn"
                aria-label="Close preview"
                @click="selectedSnapshot = null"
              >
                ×
              </button>
            </div>

            <div class="preview-image-container">
              <img
                :src="selectedSnapshot.src"
                :alt="`Snapshot ${selectedSnapshot.id}`"
              />
            </div>

            <div class="preview-footer">
              <div>
                <span>Captured on</span>
                <p>{{ formatDate(selectedSnapshot.time) }}</p>
              </div>

              <button
                class="preview-delete-btn"
                @click="deleteSnapshot(selectedSnapshot.id)"
              >
                Delete Snapshot
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Clear Confirmation -->
      <Transition name="fade">
        <div
          v-if="showClearModal"
          class="modal-backdrop"
          @click.self="showClearModal = false"
        >
          <div class="confirm-modal">
            <div class="confirm-icon">!</div>
            <h3>Clear all snapshots?</h3>
            <p>
              This will permanently remove all snapshots from
              this account's gallery.
            </p>

            <div class="confirm-actions">
              <button
                class="cancel-btn"
                @click="showClearModal = false"
              >
                Cancel
              </button>

              <button
                class="confirm-delete-btn"
                @click="confirmClearSnapshots"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery-page {
  min-height: 100vh;
  padding: 32px;
  background: #001f12;
  color: #e8f5ec;
}

/* Header */
.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 17px;
}

.header-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: #064b29;
  border: 1px solid #126b3b;
  color: #69f0ae;
  font-size: 30px;
}

.eyebrow {
  color: #69f0ae;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 7px;
}

.gallery-header h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 750;
  color: #f0fff4;
}

.gallery-header p {
  margin: 7px 0 0;
  color: #91aa99;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.capture-btn,
.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: none;
  border-radius: 9px;
  padding: 12px 17px;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s;
}

.capture-btn {
  background: #00c853;
  color: #002d16;
}

.capture-btn:hover {
  background: #69f0ae;
  transform: translateY(-2px);
}

.clear-btn {
  background: #3b2023;
  border: 1px solid #663238;
  color: #ffaaaa;
}

.clear-btn:hover {
  background: #57272d;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #06351f;
  border: 1px solid #125b34;
  border-radius: 13px;
}

.stat-icon {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #0b5830;
  color: #69f0ae;
  font-size: 22px;
}

.stat-card p {
  margin: 0 0 5px;
  color: #9ab5a2;
  font-size: 12px;
}

.stat-card h2 {
  margin: 0;
  color: #f0fff4;
  font-size: 22px;
}

/* Gallery */
.gallery-section {
  padding: 24px;
  background: #032a19;
  border: 1px solid #10482c;
  border-radius: 15px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.section-heading h2 {
  margin: 0;
  font-size: 18px;
  color: #edfff2;
}

.section-heading p {
  margin: 6px 0 0;
  color: #8eaa98;
  font-size: 12px;
}

.total-label {
  padding: 7px 12px;
  border-radius: 20px;
  background: #0b4a2a;
  color: #69f0ae;
  font-size: 11px;
  font-weight: 650;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 19px;
}

.snapshot-card {
  overflow: hidden;
  border: 1px solid #145335;
  border-radius: 12px;
  background: #064126;
  transition: transform 0.2s, border-color 0.2s;
}

.snapshot-card:hover {
  transform: translateY(-4px);
  border-color: #00c853;
}

.photo-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.photo-wrapper {
  position: relative;
  height: 210px;
  overflow: hidden;
  background: #002d16;
}

.snapshot-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}

.snapshot-card:hover .snapshot-image {
  transform: scale(1.06);
}

.photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  background: rgba(0, 35, 19, 0.72);
  color: #ffffff;
  font-size: 12px;
  font-weight: 650;
  opacity: 0;
  transition: opacity 0.25s;
}

.snapshot-card:hover .photo-overlay,
.photo-button:focus-visible .photo-overlay {
  opacity: 1;
}

.zoom-icon {
  font-size: 35px;
  color: #69f0ae;
}

.photo-number {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(0, 35, 19, 0.85);
  color: #69f0ae;
  font-size: 10px;
  font-weight: 700;
}

.snapshot-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
}

.snapshot-details h3 {
  margin: 0 0 6px;
  font-size: 13px;
  color: #eaffef;
}

.snapshot-details p {
  margin: 0;
  color: #8eaa98;
  font-size: 10px;
}

.delete-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #62353a;
  border-radius: 8px;
  background: #3b2023;
  color: #ffaaaa;
  cursor: pointer;
}

.delete-btn:hover {
  background: #662b32;
}

/* Empty state */
.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
}

.empty-icon {
  width: 75px;
  height: 75px;
  display: grid;
  place-items: center;
  margin-bottom: 15px;
  border-radius: 20px;
  background: #0a4a2b;
  color: #69f0ae;
  font-size: 35px;
}

.empty-state h3 {
  color: #effff3;
  margin: 0 0 8px;
}

.empty-state p {
  max-width: 380px;
  color: #91aa99;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 35px;
  height: 35px;
  border: 3px solid #185a36;
  border-top-color: #69f0ae;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 12, 7, 0.88);
  backdrop-filter: blur(7px);
}

.preview-modal,
.confirm-modal {
  width: 100%;
  max-width: 760px;
  overflow: hidden;
  border: 1px solid #17613a;
  border-radius: 16px;
  background: #032a19;
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.45);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #145335;
}

.preview-label {
  color: #69f0ae;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
}

.preview-header h3 {
  margin: 5px 0 0;
  color: #f0fff4;
  font-size: 16px;
}

.close-btn {
  width: 35px;
  height: 35px;
  border: 1px solid #286344;
  border-radius: 8px;
  background: #0a4529;
  color: #69f0ae;
  font-size: 25px;
  cursor: pointer;
}

.preview-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 65vh;
  min-height: 200px;
  padding: 15px;
  background: #001b10;
}

.preview-image-container img {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 7px;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 17px 22px;
}

.preview-footer span {
  color: #8eaa98;
  font-size: 10px;
}

.preview-footer p {
  margin: 5px 0 0;
  color: #eaffef;
  font-size: 12px;
}

.preview-delete-btn,
.confirm-delete-btn {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #662b32;
  color: #ffcccc;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.confirm-modal {
  max-width: 390px;
  padding: 28px;
  text-align: center;
}

.confirm-icon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: #57272d;
  color: #ffaaaa;
  font-size: 25px;
  font-weight: 800;
}

.confirm-modal h3 {
  margin: 0 0 10px;
  color: #f0fff4;
}

.confirm-modal p {
  color: #9ab5a2;
  font-size: 13px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
}

.cancel-btn {
  padding: 10px 16px;
  border: 1px solid #286344;
  border-radius: 8px;
  background: #0a4529;
  color: #d9f5e2;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 650px) {
  .gallery-page {
    padding: 18px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .gallery-section {
    padding: 15px;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .photo-wrapper {
    height: 160px;
  }

  .preview-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
