import {
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

import { auth } from '../firebase/firebase'

const LOGIN_DOMAIN = 'promaster.local'

export function normalizePhone(phone) {
  return phone.replace(/\D/g, '')
}

export function phoneToEmail(phone) {
  const normalizedPhone = normalizePhone(phone)

  return `${normalizedPhone}@${LOGIN_DOMAIN}`
}

export async function loginWithPhone(phone, password) {
  const email = phoneToEmail(phone)

  // 브라우저를 닫았다 다시 열어도 로그인 상태 유지
  await setPersistence(
    auth,
    browserLocalPersistence,
  )

  return signInWithEmailAndPassword(
    auth,
    email,
    password,
  )
}

export async function logout() {
  return signOut(auth)
}