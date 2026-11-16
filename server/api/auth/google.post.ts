// Verifies the Google ID token with Google, then returns basic profile info.
export default defineEventHandler(async (event) => {
  const { credential } = await readBody<{ credential?: string }>(event)
  const config = useRuntimeConfig(event)

  const info = credential
    ? await $fetch<Record<string, string>>('https://oauth2.googleapis.com/tokeninfo', {
        query: { id_token: credential },
      }).catch(() => null)
    : null

  if (!info || info.aud !== config.public.googleClientId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Google token' })
  }

  return { name: info.name, email: info.email, picture: info.picture }
})