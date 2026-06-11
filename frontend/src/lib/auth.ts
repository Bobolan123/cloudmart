import Cookies from 'js-cookie'
import { api } from './api'

export interface User {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

export async function loginUser(email: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/login', { email, password })
  Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 })
  Cookies.set('refreshToken', data.refreshToken, { expires: 7 })
  return data.user
}

export async function registerUser(email: string, password: string, name: string) {
  const { data } = await api.post('/auth/register', { email, password, name })
  return data
}

export async function logoutUser() {
  const refreshToken = Cookies.get('refreshToken')
  await api.post('/auth/logout', { refreshToken }).catch(() => {})
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
}

export function isLoggedIn() {
  return !!Cookies.get('accessToken') || !!Cookies.get('refreshToken')
}
