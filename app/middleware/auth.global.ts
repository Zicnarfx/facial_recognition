export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser()

  // Opening the site root always starts at the Google sign-in page.
  if (to.path === '/') {
    user.value = null
    return navigateTo('/login')
  }

  if (!user.value && to.path !== '/login') return navigateTo('/login')
  if (user.value && to.path === '/login') return navigateTo('/dashboard')
})