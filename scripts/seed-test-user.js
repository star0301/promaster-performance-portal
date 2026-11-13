import { readFileSync } from 'node:fs'
import {
  cert,
  deleteApp,
  initializeApp,
} from 'firebase-admin/app'
import {
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore'

// --------------------------------------------------
// 1. 실행할 때 UID를 인자로 받는다.
// 예:
// node scripts/seed-test-user.js FirebaseUID
// --------------------------------------------------

const uid = process.argv[2]

if (!uid) {
  console.error('')
  console.error('Firebase UID가 필요합니다.')
  console.error('')
  console.error(
    '사용법: node scripts/seed-test-user.js YOUR_FIREBASE_UID',
  )
  console.error('')

  process.exit(1)
}

// --------------------------------------------------
// 2. Firebase Admin 서비스 계정 읽기
// --------------------------------------------------

const serviceAccountPath = new URL(
  '../secrets/firebase-admin.json',
  import.meta.url,
)

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8'),
)

// --------------------------------------------------
// 3. Firebase Admin 초기화
// --------------------------------------------------

const app = initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore(app)

// --------------------------------------------------
// 4. 테스트 매장 데이터
// --------------------------------------------------

const stores = [
  {
    storeName: '테스트마트 강남점',
    storeCode: 'TEST001',
    openedPosCount: 3,
    salesPosCount: 3,
  },
  {
    storeName: '테스트마트 송파점',
    storeCode: 'TEST002',
    openedPosCount: 3,
    salesPosCount: 2,
  },
]

// --------------------------------------------------
// 5. 매장 데이터를 기반으로 요약 실적 자동 계산
// --------------------------------------------------

const storeCount = stores.length

const openedPosCount = stores.reduce(
  (sum, store) => sum + store.openedPosCount,
  0,
)

const salesPosCount = stores.reduce(
  (sum, store) => sum + store.salesPosCount,
  0,
)

// --------------------------------------------------
// 6. Firestore에 저장할 사용자 객체
// --------------------------------------------------

const userData = {
  profile: {
    qualification: 'Master',
    category: '파트너사',

    name: '테스트 사용자',
    affiliation: '테스트 소속',
    position: '과장',

    birthDate: '1986-12-08',
    phone: '01012345678',

    examRound: '제3회 (2026-01-28)',

    proAcquiredAt: '2026-03-19',
    masterAcquiredAt: '2026-05-21',

    lastEvidenceAt: '2026-10-20',

    maintenanceRequired: true,

    note: null,
  },

  performance: {
    cumulativeEvidenceCount: 6,

    monthlyEvidenceCount: {
      '2026-08': 1,
      '2026-09': 2,
      '2026-10': 3,
    },

    storeCount,
    openedPosCount,
    salesPosCount,
  },

  allowance: {
    cumulativeAmountWon: 500000,

    monthlyPayments: {
      '2026-08': 100000,
      '2026-09': 200000,
      '2026-10': 200000,
    },
  },

  stores,

  metadata: {
    source: 'manual-test',
    syncedAt: FieldValue.serverTimestamp(),
  },
}

// --------------------------------------------------
// 7. Firestore 저장
// --------------------------------------------------

async function main() {
  try {
    console.log('')
    console.log('Firestore 테스트 데이터 입력 시작')
    console.log(`UID: ${uid}`)
    console.log('')

    const userRef = db.collection('users').doc(uid)

    await userRef.set(userData)

    console.log('저장 성공')
    console.log('')
    console.log(`users/${uid}`)
    console.log('')
    console.log('요약')
    console.log(`- 이름: ${userData.profile.name}`)
    console.log(`- 자격: ${userData.profile.qualification}`)
    console.log(`- 매장 수: ${storeCount}`)
    console.log(`- 오픈 POS: ${openedPosCount}`)
    console.log(`- 매출발생 POS: ${salesPosCount}`)
    console.log(
      `- 누적 수당: ${userData.allowance.cumulativeAmountWon.toLocaleString()}원`,
    )
    console.log('')
  } catch (error) {
    console.error('')
    console.error('Firestore 저장 실패')
    console.error(error)
    console.error('')

    process.exitCode = 1
  } finally {
    await deleteApp(app)
  }
}

main()