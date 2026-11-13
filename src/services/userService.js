import {
  doc,
  getDoc,
} from 'firebase/firestore'

import { db } from '../firebase/firebase'

export async function getUserData(uid) {
  const userRef = doc(db, 'users', uid)
  const userSnapshot = await getDoc(userRef)

  if (!userSnapshot.exists()) {
    throw new Error('USER_DATA_NOT_FOUND')
  }

  return {
    id: userSnapshot.id,
    ...userSnapshot.data(),
  }
}