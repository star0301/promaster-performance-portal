import { logout } from '../services/authService'

const PARTNER_TARGETS = {
  합격자: {
    target: 1,
    nextLevel: 'Pro',
  },

  Pro: {
    target: 10,
    nextLevel: 'Master',
  },

  Master: {
    target: 24,
    nextLevel: 'Grand Master',
  },
}

function formatWon(value = 0) {
  return Number(value)
    .toLocaleString('ko-KR')
}

function getLatestUpdatedMonth() {
  const now = new Date()

  let year =
    now.getFullYear()

  let month =
    now.getMonth() + 1

  // 매월 20일 반영.
  // 아직 20일 전이면 전월까지만 확정 데이터로 본다.
  if (now.getDate() < 20) {
    month -= 1

    if (month === 0) {
      month = 12
      year -= 1
    }
  }

  return (
    `${year}-` +
    `${String(month).padStart(2, '0')}`
  )
}

function formatMonth(month) {
  if (!month) {
    return ''
  }

  const [, monthNumber] =
    month.split('-')

  return `${Number(monthNumber)}월`
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  const [
    year,
    month,
    day,
  ] = date.split('-')

  if (
    !year ||
    !month ||
    !day
  ) {
    return date
  }

  return (
    `${Number(month)}월 ` +
    `${Number(day)}일`
  )
}

function getLatestPayment(
  monthlyPayments = {},
  latestMonth,
) {
  const entries =
    Object.entries(monthlyPayments)
      .filter(
        ([month, amount]) =>
          month <= latestMonth &&
          Number(amount) > 0,
      )
      .sort(
        ([a], [b]) =>
          b.localeCompare(a),
      )

  if (entries.length === 0) {
    return {
      month: null,
      amount: 0,
    }
  }

  return {
    month: entries[0][0],
    amount: entries[0][1],
  }
}

function getVisibleMonths(
  startMonth,
  endMonth,
) {
  const result = []

  const [
    startYear,
    startMonthNumber,
  ] = startMonth
    .split('-')
    .map(Number)

  const [
    endYear,
    endMonthNumber,
  ] = endMonth
    .split('-')
    .map(Number)

  let year =
    startYear

  let month =
    startMonthNumber

  while (
    year < endYear ||
    (
      year === endYear &&
      month <= endMonthNumber
    )
  ) {
    result.push(
      `${year}-${String(month).padStart(2, '0')}`,
    )

    month += 1

    if (month === 13) {
      month = 1
      year += 1
    }
  }

  return result.reverse()
}

function getPartnerProgress(
  qualification,
  currentCount,
) {
  if (
    qualification ===
    'Grand Master'
  ) {
    return {
      target: 24,
      remaining: 0,
      percent: 100,
      title:
        'Grand Master 달성',
      message:
        '최고 등급을 달성했어요. 현재 실적을 꾸준히 이어가보세요!',
    }
  }

  // 합격자는 별도 메시지
  if (
    qualification ===
    '합격자'
  ) {
    const completed =
      currentCount >= 1

    return {
      target: 1,

      remaining:
        completed ? 0 : 1,

      percent:
        completed ? 100 : 0,

      title:
        completed
          ? '첫 오픈 달성!'
          : '첫 오픈에 도전해보세요',

      message:
        completed
          ? '첫 실적을 만들었어요! Pro 자격 반영을 기다려주세요.'
          : 'POS 1대만 오픈하고 증빙하면 Pro에 한 걸음 더 가까워져요. 첫 수당에도 도전해보세요!',
    }
  }

  const config =
    PARTNER_TARGETS[
      qualification
    ]

  if (!config) {
    return null
  }

  const remaining =
    Math.max(
      config.target -
        currentCount,
      0,
    )

  const percent =
    Math.min(
      100,
      Math.round(
        (
          currentCount /
          config.target
        ) * 100,
      ),
    )

  let message = ''

  if (remaining === 0) {
    message =
      `${config.nextLevel} 기준을 달성했어요!`
  } else if (remaining === 1) {
    message =
      `딱 1대 남았어요! 다음 오픈이면 ${config.nextLevel} 기준 달성입니다!`
  } else if (remaining <= 2) {
    message =
      `${remaining}대만 더 오픈하면 ${config.nextLevel}예요. 거의 다 왔어요!`
  } else if (remaining <= 4) {
    message =
      `${remaining}대 남았어요! 이제 조금만 힘내면 ${config.nextLevel} 달성할 수 있어요!`
  } else {
    message =
      `${config.nextLevel}까지 ${remaining}대 남았어요. 한 대씩 차근차근 쌓아가요!`
  }

  return {
    target:
      config.target,

    remaining,

    percent,

    title:
      `${config.nextLevel}까지 ${remaining}대`,

    message,
  }
}

function formatYearMonth(value) {
  if (!value) {
    return ''
  }

  const [
    year,
    month,
  ] = value
    .split('-')

  return (
    `${year}년 ` +
    `${Number(month)}월`
  )
}

function getQualificationBadgeClass(qualification) {
  switch (qualification) {
    case 'Pro':
      return 'qualification-badge badge-pro'

    case 'Master':
      return 'qualification-badge badge-master'

    case 'Grand Master':
      return 'qualification-badge badge-grand-master'

    case '합격자':
      return 'qualification-badge badge-passed'

    default:
      return 'qualification-badge'
  }
}

function getActivityType(
  activityName = '',
) {
  if (
    activityName.includes(
      '심화',
    ) ||
    activityName.includes(
      '워크샵',
    ) ||
    activityName.includes(
      '교육',
    )
  ) {
    return '교육'
  }

  if (
    activityName.includes(
      'CS',
    )
  ) {
    return 'CS 지원'
  }

  if (
    activityName.includes(
      'VAN',
    )
  ) {
    return 'VAN 직영'
  }

  if (
    activityName.includes(
      '현장지원',
    )
  ) {
    return '현장 지원'
  }

  return '인정 실적'
}

function Dashboard({
  userData,
}) {
  const profile =
    userData.profile ?? {}

  const performance =
    userData.performance ?? {}

  const allowance =
    userData.allowance ?? {}

  const stores =
    userData.stores ?? []

  const activities =
    userData.activities ?? []

  const isRI =
    profile.category === 'RI'

  const latestMonth =
    getLatestUpdatedMonth()

  const monthlyEvidence =
    performance
      .monthlyEvidenceCount ?? {}

  const monthlyPayments =
    allowance
      .monthlyPayments ?? {}

  const latestEvidence =
    monthlyEvidence[
      latestMonth
    ] ?? 0

  const latestPayment =
    getLatestPayment(
      monthlyPayments,
      latestMonth,
    )

const recentMonths =
  getVisibleMonths(
    '2026-01',
    latestMonth,
  )

  const cumulativeCount =
    Number(
      performance
        .cumulativeEvidenceCount ??
        0,
    )

  const openedPosCount =
    Number(
      performance
        .openedPosCount ??
        0,
    )

  const salesPosCount =
    Number(
      performance
        .salesPosCount ??
        0,
    )

  const inactivePosCount =
    Math.max(
      openedPosCount -
        salesPosCount,
      0,
    )

  const salesRate =
    openedPosCount > 0
      ? Math.min(
          100,
          Math.round(
            (
              salesPosCount /
              openedPosCount
            ) * 100,
          ),
        )
      : 0

  const progress =
    isRI
      ? null
      : getPartnerProgress(
          profile.qualification,
          cumulativeCount,
        )

return (
  <div className="dashboard-page">
    <header className="app-header">
      <div className="app-header-inner">
        <img
          src="/tomato-solution-logo.png"
          alt="TomaTo Solution"
          className="brand-logo"
        />

        <button
          className="logout-button"
          type="button"
          onClick={logout}
        >
          로그아웃
        </button>
      </div>
    </header>

    <main className="dashboard">
      {/* ========================================
          사용자 정보
      ======================================== */}

      <section className="user-heading">
        <div>
          <p className="user-greeting">
            안녕하세요,
          </p>

          <h1>
            {profile.name}님
          </h1>
        </div>

        <div
  className={getQualificationBadgeClass(
    profile.qualification,
  )}
>
          <span className="badge-dot" />

          {profile.qualification}
        </div>
      </section>

      <p className="user-meta">
        {profile.category}

        {profile.affiliation &&
          ` · ${profile.affiliation}`}
      </p>


      {/* ========================================
          업데이트 안내
      ======================================== */}

      <div className="update-notice">
        <span className="update-notice-dot" />

        <p>
          실적 및 수당 데이터는
          <strong>
            {' '}매월 20일{' '}
          </strong>
          업데이트됩니다.
        </p>
      </div>


      {/* ========================================
          파트너사 목표 카드
      ======================================== */}

      {!isRI && progress && (
        <section className="goal-card">
          <div className="goal-card-top">
            <div>
              <span className="goal-label">
                다음 목표
              </span>

              <h2>
                {progress.title}
              </h2>
            </div>

            <span className="goal-percent">
              {progress.percent}%
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progress.percent}%`,
              }}
            />
          </div>

          <div className="progress-values">
            <strong>
              {cumulativeCount}대
            </strong>

            <span>
              목표 {progress.target}대
            </span>
          </div>

          <div className="motivation-message">
            <span className="motivation-icon">
              ↑
            </span>

            <p>
              {progress.message}
            </p>
          </div>
        </section>
      )}


      {/* ========================================
          RI 목표 카드
      ======================================== */}

      {isRI && (
        <section className="goal-card ri-card">
          <span className="goal-label">
            {profile.qualification === '합격자'
              ? '첫 인정 실적'
              : 'RI 인정 실적'}
          </span>

          {profile.qualification === '합격자' ? (
            <>
              <div className="ri-performance">
                <strong>
                  시작
                </strong>
              </div>

              <p className="ri-message">
                첫 업무 실적 1건부터 시작해보세요.
                교육, 현장 지원, VAN 직영,
                CS 지원 등 인정된 활동이
                실적으로 반영됩니다.
              </p>
            </>
          ) : (
            <>
              <div className="ri-performance">
                <strong>
                  {cumulativeCount}
                </strong>

                <span>
                  건
                </span>
              </div>

              <p className="ri-message">
                교육, 현장 지원, VAN 직영,
                CS 지원 등 인정된 업무 실적을
                모두 합산한 결과예요.
              </p>
            </>
          )}
        </section>
      )}


      {/* ========================================
          나의 실적
      ======================================== */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="section-eyebrow">
              PERFORMANCE
            </span>

            <h2>
              나의 실적
            </h2>
          </div>
        </div>


        {/* 파트너사 합격자 전용 안내 */}

        {!isRI &&
          profile.qualification === '합격자' && (
            <div className="starter-message">
              <div className="starter-icon">
                1
              </div>

              <div>
                <strong>
                  첫 POS 오픈부터 시작해볼까요?
                </strong>

                <p>
                  첫 오픈 실적이 등록되면
                  여기에서 매장과 POS 현황을
                  바로 확인할 수 있어요.
                </p>
              </div>
            </div>
          )}


        {/* RI 실적 */}

        {isRI ? (
          <div className="stats-grid ri-stats-grid">
            <article className="stat-card accent">
              <span className="stat-label">
                누적 인정 실적
              </span>

              <strong>
                {cumulativeCount}
              </strong>

              <span className="stat-unit">
                건
              </span>
            </article>

            <article className="stat-card">
              <span className="stat-label">
                {formatMonth(latestMonth)} 인정 실적
              </span>

              <strong>
                {latestEvidence}
              </strong>

              <span className="stat-unit">
                건
              </span>
            </article>
          </div>
        ) : (

          /* 파트너사 실적 */

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">
                오픈 매장
              </span>

              <strong>
                {performance.storeCount ??
                  stores.length}
              </strong>

              <span className="stat-unit">
                개
              </span>
            </article>

            <article className="stat-card">
              <span className="stat-label">
                오픈 POS
              </span>

              <strong>
                {openedPosCount}
              </strong>

              <span className="stat-unit">
                대
              </span>
            </article>

            <article className="stat-card accent">
              <span className="stat-label">
                매출발생 POS
              </span>

              <strong>
                {salesPosCount}
              </strong>

              <span className="stat-unit">
                대
              </span>
            </article>

            <article className="stat-card">
              <span className="stat-label">
                {formatMonth(latestMonth)} 실적
              </span>

              <strong>
                {latestEvidence}
              </strong>

              <span className="stat-unit">
                건
              </span>
            </article>
          </div>
        )}
      </section>


      {/* ========================================
          파트너사 매출발생 현황
      ======================================== */}

      {!isRI && (
        <section className="sales-health-card">
          <div className="sales-health-header">
            <div>
              <span className="section-eyebrow">
                SALES STATUS
              </span>

              <h2>
                매출발생 현황
              </h2>
            </div>

            <strong>
              {salesRate}%
            </strong>
          </div>

          <div className="sales-progress-track">
            <div
              className="sales-progress-fill"
              style={{
                width: `${salesRate}%`,
              }}
            />
          </div>

          <div className="sales-summary">
            <span>
              매출발생{' '}
              <strong>
                {salesPosCount}대
              </strong>
            </span>

            <span>
              오픈{' '}
              <strong>
                {openedPosCount}대
              </strong>
            </span>
          </div>

          {inactivePosCount === 0 &&
          openedPosCount > 0 ? (
            <p className="status-good">
              오픈된 POS 전체에서
              매출이 발생하고 있어요.
            </p>
          ) : inactivePosCount > 0 ? (
            <p className="status-check">
              {inactivePosCount}대는 아직
              매출발생 확인이 필요해요.
            </p>
          ) : (
            <p className="status-check">
              아직 등록된 POS 실적이 없어요.
            </p>
          )}

          <p className="status-description">
            수당 지급은 정상적인 매출 발생이
            확인된 실적을 기준으로 반영됩니다.
          </p>
        </section>
      )}


      {/* ========================================
          수당
      ======================================== */}

      {profile.qualification === '합격자' &&
      !isRI ? (
        <section className="allowance-card starter-allowance">
          <div>
            <span className="allowance-label">
              첫 수당 목표
            </span>

            <strong className="allowance-total">
              100,000
              <small>
                원
              </small>
            </strong>
          </div>

          <div className="latest-payment">
            <span>
              Pro 자격 취득 후
            </span>

            <strong>
              월 수당에 도전!
            </strong>
          </div>
        </section>
      ) : (
        <section className="allowance-card">
          <div>
            <span className="allowance-label">
              누적 지급액
            </span>

            <strong className="allowance-total">
              {formatWon(
                allowance.cumulativeAmountWon,
              )}

              <small>
                원
              </small>
            </strong>
          </div>

          {latestPayment.month && (
            <div className="latest-payment">
              <span>
                {formatMonth(
                  latestPayment.month,
                )}{' '}
                지급
              </span>

              <strong>
                {formatWon(
                  latestPayment.amount,
                )}
                원
              </strong>
            </div>
          )}
        </section>
      )}


      {/* ========================================
          월별 실적
      ======================================== */}

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="section-eyebrow">
              MONTHLY
            </span>

            <h2>
              월별 실적
            </h2>

            <p className="section-description">
              매월 20일 반영 · 현재{' '}
              {formatMonth(latestMonth)}
              까지 확인할 수 있어요.
            </p>
          </div>
        </div>

        <div className="monthly-list">
          {recentMonths.map(
            (month) => (
              <div
                className="monthly-row"
                key={month}
              >
                <div className="monthly-date">
                  {formatMonth(month)}
                </div>

                <div className="monthly-value">
                  <span>
                    실적
                  </span>

                  <strong>
                    {monthlyEvidence[month] ?? 0}
                    건
                  </strong>
                </div>

                <div className="monthly-value payment">
                  <span>
                    지급액
                  </span>

                  <strong>
                    {formatWon(
                      monthlyPayments[month] ?? 0,
                    )}
                    원
                  </strong>
                </div>
              </div>
            ),
          )}
        </div>
      </section>


      {/* ========================================
          파트너사 오픈 매장
      ======================================== */}

      {!isRI &&
        stores.length > 0 && (
          <section className="section-block">
            <div className="section-title">
              <div>
                <span className="section-eyebrow">
                  STORE
                </span>

                <h2>
                  오픈 매장
                </h2>
              </div>

              <span className="section-count">
                {stores.length}개
              </span>
            </div>

            <div className="store-list">
              {stores.map(
                (store, index) => (
                  <article
                    className="store-card"
                    key={
                      store.storeCode ??
                      index
                    }
                  >
<div className="store-info">
  <div className="store-title-row">
    <strong>
      {store.storeName}
    </strong>

    {store.evidenceMonth && (
      <span className="store-month">
        {formatYearMonth(
          store.evidenceMonth,
        )}
      </span>
    )}
  </div>

  <span>
    매장코드{' '}
    {store.storeCode}
  </span>
</div>

                    <div className="store-pos">
                      <div>
                        <span>
                          오픈
                        </span>

                        <strong>
                          {store.openedPosCount}대
                        </strong>
                      </div>

                      <div>
                        <span>
                          매출발생
                        </span>

                        <strong className="green-text">
                          {store.salesPosCount}대
                        </strong>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}


      {/* ========================================
          RI 업무 실적
      ======================================== */}

      {isRI &&
        activities.length > 0 && (
          <section className="section-block">
            <div className="section-title">
              <div>
                <span className="section-eyebrow">
                  ACTIVITY
                </span>

                <h2>
                  업무 실적
                </h2>

                <p className="section-description">
                  인정된 교육, 현장 지원,
                  VAN 직영 등의 실적이에요.
                </p>
              </div>

              <span className="section-count">
                {activities.length}건
              </span>
            </div>

            <div className="activity-list">
              {activities.map(
                (activity, index) => (
                  <article
                    className="activity-card"
                    key={
                      `${activity.evidenceDate}-${activity.activityName}-${index}`
                    }
                  >
                    <div className="activity-card-top">
                      <span className="activity-type">
                        {getActivityType(
                          activity.activityName,
                        )}
                      </span>

                      <span className="activity-date">
                        {formatDate(
                          activity.evidenceDate,
                        )}
                      </span>
                    </div>

                    <strong className="activity-name">
                      {activity.activityName}
                    </strong>

                    <div className="activity-bottom">
                      <span>
                        인정 실적
                      </span>

                      <strong>
                        {activity.recognizedCount ?? 1}
                        건
                      </strong>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}


      {/* ========================================
          FOOTER
      ======================================== */}

      <section className="evidence-submit-section">
        <div className="evidence-submit-card">
          <div>
            <span className="evidence-submit-label">
              실적이 생기셨나요?
            </span>

            <h2>
              새로운 실적을 제출해주세요.
            </h2>

            <p>
              제출된 실적은 확인 후 반영되며,
              매월 20일 업데이트됩니다.
            </p>
          </div>

          <a
            className="evidence-submit-button"
            href="https://forms.gle/83g74ox7KuoweDMZ8"
            target="_blank"
            rel="noopener noreferrer"
          >
            실적 증빙 제출하기
            <span>↗</span>
          </a>
        </div>
      </section>

      <footer className="dashboard-footer">
        <p>
          데이터는 관리자 확인 및
          반영 시점에 따라 차이가 있을 수 있습니다.
        </p>
      </footer>
    </main>
  </div>
)

}

export default Dashboard