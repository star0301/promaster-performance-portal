import { useState } from 'react'
import { loginWithPhone } from '../services/authService'

function formatPhone(value) {
  const numbers = value
    .replace(/\D/g, '')
    .slice(0, 11)

  if (numbers.length <= 3) {
    return numbers
  }

  if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  }

  return (
    `${numbers.slice(0, 3)}-` +
    `${numbers.slice(3, 7)}-` +
    `${numbers.slice(7)}`
  )
}

function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePhoneChange = (event) => {
    setPhone(
      formatPhone(event.target.value),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!phone || !password) {
      setError(
        '휴대폰 번호와 비밀번호를 입력해주세요.',
      )
      return
    }

    setError('')
    setLoading(true)

    try {
      await loginWithPhone(
        phone,
        password,
      )
    } catch (error) {
      console.error(error)

      setError(
        '휴대폰 번호 또는 비밀번호를 확인해주세요.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <header className="login-brand">
          <img
            src="/tomato-solution-logo.png"
            alt="TomaTo Solution"
            className="brand-logo"
          />
        </header>

        <section className="login-intro">
          <span className="login-eyebrow">
            Pro · Master
          </span>

          <h1>
            나의 실적을
            <br />
            확인해보세요.
          </h1>

          <p>
            오픈 실적과 자격 현황,
            지급 내역을 한눈에 확인할 수 있어요.
          </p>
        </section>

        <form
          className="login-card"
          onSubmit={handleSubmit}
        >
          <div className="field-group">
            <label htmlFor="phone">
              휴대폰 번호
            </label>

            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">
              비밀번호
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="비밀번호를 입력해주세요"
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? '확인하고 있어요...'
              : '로그인'}
          </button>

          <p className="login-helper">
            한 번 로그인하면 이 기기에서는
            로그인 상태가 유지됩니다.
          </p>
        </form>
      </div>
    </div>
  )
}

export default Login