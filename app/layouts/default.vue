
<script setup lang="ts">
const user = useAuthUser()
const open = ref(false)
const route = useRoute()

// Logout confirmation modal
const showLogoutModal = ref(false)

watch(() => route.fullPath, () => {
  open.value = false
})

const links = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Face Recognition', to: '/face', icon: 'face' },
] as const

// Show confirmation popup
const logout = () => {
  showLogoutModal.value = true
}

// Confirm logout



const authUser = useAuthUser()

const confirmLogout = async () => {
  // Clear Google authentication data
  localStorage.removeItem('google_user')
  localStorage.removeItem('google_token')

  // Clear authentication cookie
  authUser.value = null

  // Close confirmation popup
  showLogoutModal.value = false

  // Redirect to login
  await navigateTo('/login', { replace: true })
}



</script>

<template>
  <div class="shell">
    <aside
      class="drawer"
      :class="{ open }"
      @mouseenter="open = true"
      @mouseleave="open = false"
      @focusin="open = true"
      @focusout="open = false"
    >
      <div v-if="user" class="profile">
        <img
          :src="user.picture"
          :alt="user.name"
          referrerpolicy="no-referrer"
        >
        <div class="text">
          <strong>{{ user.name }}</strong>
          <small>{{ user.email }}</small>
        </div>
      </div>

      <nav class="nav">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="item"
          active-class="active"
        >
          <AppIcon :name="l.icon" class="ico" />
          <span class="label">{{ l.label }}</span>
        </NuxtLink>
      </nav>

     <button class="item logout" @click="logout">
  <AppIcon name="logout" class="ico" />
  <span class="label">Sign out</span>
</button>
    </aside>

    <div class="col">
      <header class="appbar">
        System Integration
      </header>

      <main class="main">
        <slot />
      </main>
    </div>
  </div>

  <!-- Logout Confirmation Modal -->
  <Teleport to="body">
    <div
      v-if="showLogoutModal"
      class="modal-overlay"
      @click.self="showLogoutModal = false"
    >
      <div class="logout-modal">
        <div class="logout-icon">
          <AppIcon name="logout" />
        </div>

        <h2>Sign Out?</h2>

        <p>
          Are you sure you want to sign out of your account?
        </p>

        <div class="modal-actions">
          <button
            class="cancel-btn"
            @click="showLogoutModal = false"
          >
            Cancel
          </button>

          <button
            class="confirm-btn"
            @click="confirmLogout"
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
body {
  margin: 0;
  background: #04120d;
}
</style>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: #04120d;
  color: #e8fff5;
  font-family: system-ui, sans-serif;
}

/* Drawer */
.drawer {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #262626;
  border-right: 1px solid #1b1b1b;
  transition: width .2s ease;
  z-index: 5;
}

.drawer.open {
  width: 210px;
}

.profile {
  height: 54px;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  border-bottom: 1px solid #3a3a3a;
}

.profile img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

.text {
  width: 150px;
  display: grid;
  line-height: 1.2;
  opacity: 0;
  transition: opacity .15s;
}

.drawer.open .text {
  opacity: 1;
}

.text strong {
  font-size: 14px;
  color: #fff;
}

.text small {
  font-size: 11px;
  font-weight: 700;
  color: #b5b5b5;
  word-break: break-all;
}

.nav {
  display: grid;
  gap: 4px;
  padding: 8px 6px;
}

.item {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 38px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #e5e5e5;
  font: inherit;
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.item:hover {
  background: #333;
}

.item.active {
  background: #0a2a14;
  color: #21e065;
}

.ico {
  font-size: 22px;
  flex-shrink: 0;
}

.label {
  opacity: 0;
  transition: opacity .15s;
}

.drawer.open .label {
  opacity: 1;
}

.logout {
  margin: auto 6px 10px;
}

/* App bar */
.col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.appbar {
  position: sticky;
  top: 0;
  z-index: 4;
  height: 54px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 17px;
  color: #fff;
  background: linear-gradient(
    90deg,
    #052e1f 0%,
    #067a4a 60%,
    #00a859 100%
  );
  border-bottom: 1px solid #0b8a52;
}

.main {
  flex: 1;
  padding: 18px 16px 32px;
}

/* Logout modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  padding: 20px;
}

.logout-modal {
  width: 100%;
  max-width: 390px;
  box-sizing: border-box;
  padding: 32px 26px;
  border-radius: 18px;
  background: #064b29;
  border: 1px solid rgba(105, 240, 174, 0.25);
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalAppear .25s ease;
}

.logout-icon {
  width: 65px;
  height: 65px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(105, 240, 174, 0.12);
  color: #69f0ae;
  font-size: 30px;
}

.logout-modal h2 {
  color: #fff;
  font-size: 23px;
  margin: 0 0 10px;
}

.logout-modal p {
  color: #c5d8cc;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 25px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  flex: 1;
  padding: 12px 10px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: .2s ease;
}

.cancel-btn {
  background: #123d29;
  color: #fff;
  border: 1px solid #397052 !important;
}

.confirm-btn {
  background: #00c853;
  color: #002d16;
}

.modal-actions button:hover {
  opacity: .85;
  transform: translateY(-2px);
}

@keyframes modalAppear {
  from {
    opacity: 0;
    transform: translateY(15px) scale(.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Small screens */
@media (max-width: 760px) {
  .drawer {
    position: fixed;
    left: 0;
    top: 0;
  }

  .drawer.open {
    box-shadow: 8px 0 24px rgba(0, 0, 0, .6);
  }

  .col {
    margin-left: 56px;
  }

  .main {
    padding: 14px 12px 28px;
  }
}
</style>
