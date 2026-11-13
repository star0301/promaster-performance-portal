import {
  useEffect,
  useState,
} from 'react'

import {
  onAuthStateChanged,
} from 'firebase/auth'

import { auth } from './firebase/firebase'
import { getUserData } from './services/userService'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [
    firebaseUser,
    setFirebaseUser,
  ] = useState(null)

  const [
    userData,
    setUserData,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          setFirebaseUser(user)
          setUserData(null)
          setError('')

          if (!user) {
            setLoading(false)
            return
          }

          try {
            setLoading(true)

            const data =
              await getUserData(
                user.uid,
              )

            setUserData(data)
          } catch (error) {
            console.error(error)

            setError(
              '사용자 정보를 불러오지 못했습니다.',
            )
          } finally {
            setLoading(false)
          }
        },
      )

    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <img
          src="/tomato-solution-logo.png"
          alt="TomaTo Solution"
        />

        <div className="loading-dot" />

        <p>
          정보를 불러오고 있어요.
        </p>
      </div>
    )
  }

  if (!firebaseUser) {
    return <Login />
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>{error}</p>
      </div>
    )
  }

  if (!userData) {
    return null
  }

  return (
    <Dashboard
      userData={userData}
    />
  )
}

export default App