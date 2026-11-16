<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const user = useAuthUser()
const buttonEl = ref<HTMLDivElement | null>(null)
const error = ref('')

async function onCredential(res: { credential: string }) {
  try {
    user.value = await $fetch<AuthUser>('/api/auth/google', {
      method: 'POST',
      body: { credential: res.credential },
    })
    await navigateTo('/dashboard')
  } catch {
    error.value = 'Sign-in failed. Please try again.'
  }
}

function initGoogle() {
  const google = (window as any).google
  google.accounts.id.initialize({
    client_id: config.public.googleClientId,
    callback: onCredential,
  })
  google.accounts.id.renderButton(buttonEl.value, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill',
    width: 280,
  })
}

onMounted(() => {
  if ((window as any).google?.accounts) return initGoogle()
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'
  s.async = true
  s.defer = true
  s.onload = initGoogle
  document.head.appendChild(s)
})
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Welcome</h1>
      <p>Sign in to continue to your dashboard.</p>
      <div ref="buttonEl" class="btn" />
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>

<style scoped>
.page { min-height: 100vh; display: grid; place-items: center; background: #f3f4f6; font-family: system-ui, sans-serif; }
.card { background: #fff; padding: 40px 36px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.08); text-align: center; width: min(360px, 90vw); }
h1 { margin: 0 0 8px; }
p { color: #6b7280; margin: 0 0 24px; }
.btn { display: flex; justify-content: center; min-height: 44px; }
.error { color: #dc2626; margin-top: 16px; }
</style>
