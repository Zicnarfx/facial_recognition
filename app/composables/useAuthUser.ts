export interface AuthUser {
  name: string
  email: string
  picture: string
}

export const useAuthUser = () =>
  useCookie<AuthUser | null>('auth_user', {
    sameSite: 'lax',
    default: () => null,
  })