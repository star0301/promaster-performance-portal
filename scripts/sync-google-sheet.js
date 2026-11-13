import { readFileSync } from 'node:fs'

import {
  cert,
  deleteApp,
  initializeApp,
} from 'firebase-admin/app'

import {
  getAuth,
} from 'firebase-admin/auth'

import {
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore'

import { google } from 'googleapis'


// ============================================================
// 기본 설정
// ============================================================

const SPREADSHEET_ID =
  '1Y6L3iGY7r3oVGEki9vRAB2-U6fpaS-Qw7-MxZT6gwEE'

const LOGIN_DOMAIN = 'promaster.local'

const WRITE_MODE = process.argv.includes('--write')

const ELIGIBLE_QUALIFICATIONS = new Set([
  '합격자',
  'Pro',
  'Master',
  'Grand Master',
])


// ============================================================
// 월별 컬럼
//
// Pro/Master 통합 명단
//
// 실적:
// P ~ AB
//
// 수당:
// AD ~ AP
// ============================================================

const MONTHS = [
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
]


// ============================================================
// 공통 함수
// ============================================================

function text(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).trim()
}


function nullableText(value) {
  const result = text(value)

  return result === '' ? null : result
}


function numberValue(value) {
  const cleaned = text(value)
    .replaceAll(',', '')
    .replaceAll(' ', '')

  if (!cleaned) {
    return 0
  }

  const parsed = Number(cleaned)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}


function normalizePhone(phone) {
  return text(phone).replace(/\D/g, '')
}


function phoneToEmail(phone) {
  return `${normalizePhone(phone)}@${LOGIN_DOMAIN}`
}


function personKey(category, name) {
  return `${text(category)}|${text(name)}`
}


function buildMonthlyMap(values) {
  const result = {}

  MONTHS.forEach((month, index) => {
    result[month] = numberValue(values[index])
  })

  return result
}


function buildAllowanceMap(values) {
  const result = {}

  MONTHS.forEach((month, index) => {
    // Sheet 단위 = 만원
    // Firebase = 원
    result[month] = numberValue(values[index]) * 10000
  })

  return result
}


// ============================================================
// Firebase Admin 서비스 계정
// ============================================================

const serviceAccountPath = new URL(
  '../secrets/firebase-admin.json',
  import.meta.url,
)

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8'),
)


// ============================================================
// Firebase Admin 초기화
// ============================================================

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
})

const firebaseAuth = getAuth(firebaseApp)
const db = getFirestore(firebaseApp)


// ============================================================
// Google Sheets 초기화
// ============================================================

const googleAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,

  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
})

const sheets = google.sheets({
  version: 'v4',
  auth: googleAuth,
})


// ============================================================
// Google Sheet 데이터 읽기
// ============================================================

async function readSheetData() {
  const response =
    await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,

      ranges: [
        // 실제 사용자 행은 12행부터 시작
        "'Pro/Master 통합 명단'!B12:AP1052",

        // 현장 증빙
        // G열 증빙일은 중복 제거 판단용으로만 사용
        "'현장 증빙(데이터만)'!A2:G990",
      ],
    })

  const valueRanges =
    response.data.valueRanges ?? []

  const mainRows =
    valueRanges[0]?.values ?? []

  const fieldRows =
    valueRanges[1]?.values ?? []

  return {
    mainRows,
    fieldRows,
  }
}


// ============================================================
// 현장 증빙 데이터 정리
//
// 동일 인물 + 동일 매장코드가 여러 번 있을 경우
// 증빙일이 가장 최근인 행만 사용
// ============================================================

function buildFieldData(fieldRows) {
  const storePeople = new Map()
  const activityPeople = new Map()

  for (const row of fieldRows) {
    const category = text(row[0])
    const name = text(row[1])

    const itemName = text(row[2])
    const storeCode = text(row[3])

    const openedPosCount =
      numberValue(row[4])

    const salesPosCount =
      numberValue(row[5])

    const evidenceDate =
      text(row[6])

    if (
      !category ||
      !name ||
      !itemName
    ) {
      continue
    }

    const pKey =
      personKey(category, name)

    // ======================================================
    // RI
    //
    // RI는 POS 오픈뿐 아니라
    // 교육 / CS / 현장지원 / VAN 직영 등도 실적이다.
    // 매장코드가 없어도 버리지 않는다.
    // ======================================================

    if (category === 'RI') {
      if (!activityPeople.has(pKey)) {
        activityPeople.set(
          pKey,
          new Map(),
        )
      }

      const activities =
        activityPeople.get(pKey)

      const activityKey = [
        evidenceDate,
        itemName,
        storeCode,
      ].join('|')

      activities.set(
        activityKey,
        {
          activityName:
            itemName,

          activityCode:
            storeCode || null,

          recognizedCount:
            openedPosCount || 1,

          evidenceDate:
            evidenceDate || null,
        },
      )

      continue
    }

    // ======================================================
    // 파트너사
    //
    // 매장코드 기준으로 오픈 실적 관리
    // ======================================================

    if (!storeCode) {
      continue
    }

    if (!storePeople.has(pKey)) {
      storePeople.set(
        pKey,
        new Map(),
      )
    }

    const stores =
      storePeople.get(pKey)

    const existing =
      stores.get(storeCode)

const evidenceMonth =
  evidenceDate
    ? evidenceDate.slice(0, 7)
    : null

const nextStore = {
  storeName:
    itemName,

  storeCode,

  openedPosCount,

  salesPosCount,

  evidenceDate,

  evidenceMonth,
}

    if (!existing) {
      stores.set(
        storeCode,
        nextStore,
      )

      continue
    }

    // 같은 매장코드가 여러 번 있다면
    // 가장 최근 증빙 데이터를 채택
    if (
      evidenceDate &&
      evidenceDate >=
        existing.evidenceDate
    ) {
      stores.set(
        storeCode,
        nextStore,
      )
    }
  }

  // ------------------------------------------------------
  // 파트너사 매장
  // ------------------------------------------------------

  const storesByPerson =
    new Map()

  for (
    const [
      key,
      storesMap,
    ]
    of storePeople
  ) {
    const stores =[...storesMap.values()]
    .map((store) => ({
      storeName:
        store.storeName,

      storeCode:
        store.storeCode,

      openedPosCount:
        store.openedPosCount,

      salesPosCount:
        store.salesPosCount,

      evidenceMonth:
        store.evidenceMonth,
    }))
        .sort(
          (a, b) =>
            a.storeCode.localeCompare(
              b.storeCode,
            ),
        )

    storesByPerson.set(
      key,
      stores,
    )
  }

  // ------------------------------------------------------
  // RI 업무 실적
  // ------------------------------------------------------

  const activitiesByPerson =
    new Map()

  for (
    const [
      key,
      activityMap,
    ]
    of activityPeople
  ) {
    const activities =
      [...activityMap.values()]
        .sort(
          (a, b) =>
            (b.evidenceDate ?? '')
              .localeCompare(
                a.evidenceDate ?? '',
              ),
        )

    activitiesByPerson.set(
      key,
      activities,
    )
  }

  return {
    storesByPerson,
    activitiesByPerson,
  }
}


// ============================================================
// 통합 명단 1행 → 사용자 데이터
//
// B부터 시작했으므로 배열 index는:
//
//  0 B  자격 구분
//  1 C  구분
//  2 D  성명
//  3 E  소속
//  4 F  직급
//  5 G  생년월일
//  6 H  연락처
//  7 I  응시회차
//  8 J  Pro취득일
//  9 K  Master취득일
// 10 L  최종 증빙일
// 11 M  유지 필요
// 12 N  특이사항
//
// 13 O  실적 누적
// 14~26 P~AB 월별 실적
//
// 27 AC 수당 누적
// 28~40 AD~AP 월별 수당
// ============================================================

function buildUserData(
  row,
  storesByPerson,
  activitiesByPerson,
  sourceRowNumber,
) {
  const qualification = text(row[0])
  const category = text(row[1])
  const name = text(row[2])

  const phone =
    normalizePhone(row[6])

const key =
  personKey(
    category,
    name,
  )

const isRI =
  category === 'RI'

const stores =
  isRI
    ? []
    : (
        storesByPerson.get(
          key,
        ) ?? []
      )

const activities =
  isRI
    ? (
        activitiesByPerson.get(
          key,
        ) ?? []
      )
    : []


  const openedPosCount =
    stores.reduce(
      (sum, store) =>
        sum + store.openedPosCount,
      0,
    )


  const salesPosCount =
    stores.reduce(
      (sum, store) =>
        sum + store.salesPosCount,
      0,
    )


  const monthlyEvidenceValues =
    row.slice(14, 27)


  const monthlyAllowanceValues =
    row.slice(28, 41)


  return {
    profile: {
      qualification,
      category,
      name,

      affiliation:
        nullableText(row[3]),

      position:
        nullableText(row[4]),

      birthDate:
        nullableText(row[5]),

      phone,

      examRound:
        nullableText(row[7]),

      proAcquiredAt:
        nullableText(row[8]),

      masterAcquiredAt:
        nullableText(row[9]),

      lastEvidenceAt:
        nullableText(row[10]),

      maintenanceRequired:
        text(row[11]) !== '',

      note:
        nullableText(row[12]),
    },


    performance: {
      cumulativeEvidenceCount:
        numberValue(row[13]),

      monthlyEvidenceCount:
        buildMonthlyMap(
          monthlyEvidenceValues,
        ),

      storeCount:
        stores.length,

      openedPosCount,

      salesPosCount,
    },


    allowance: {
      // AC 단위 = 만원
      cumulativeAmountWon:
        numberValue(row[27]) * 10000,

      monthlyPayments:
        buildAllowanceMap(
          monthlyAllowanceValues,
        ),
    },


    stores,

    activities,


    metadata: {
      source:
        'google-sheet',

      sourceSpreadsheetId:
        SPREADSHEET_ID,

      sourceMainRow:
        sourceRowNumber,

      syncedAt:
        FieldValue.serverTimestamp(),
    },
  }
}


// ============================================================
// Firebase Auth 사용자 찾기
// ============================================================

async function findFirebaseUser(
  phone,
) {
  const email =
    phoneToEmail(phone)

  try {
    const user =
      await firebaseAuth.getUserByEmail(
        email,
      )

    return {
      user,
      email,
    }
  } catch (error) {
    if (
      error?.code ===
      'auth/user-not-found'
    ) {
      return {
        user: null,
        email,
      }
    }

    throw error
  }
}


// ============================================================
// 실행
// ============================================================

async function main() {
  console.log('')
  console.log(
    '========================================',
  )
  console.log(
    ' Pro/Master Google Sheet 동기화',
  )
  console.log(
    '========================================',
  )

  console.log('')

  console.log(
    WRITE_MODE
      ? 'MODE: WRITE'
      : 'MODE: DRY RUN',
  )

  console.log('')


  // --------------------------------------------------------
  // 1. Sheet 읽기
  // --------------------------------------------------------

  console.log(
    'Google Sheet 읽는 중...',
  )

  const {
    mainRows,
    fieldRows,
  } = await readSheetData()

  console.log(
    `통합 명단 행: ${mainRows.length}`,
  )

  console.log(
    `현장 증빙 행: ${fieldRows.length}`,
  )

  console.log('')


  // --------------------------------------------------------
  // 2. 매장 데이터 정리
  // --------------------------------------------------------

const {
  storesByPerson,
  activitiesByPerson,
} = buildFieldData(fieldRows)


  // --------------------------------------------------------
  // 3. 자격 대상자만 추출
  // --------------------------------------------------------

  const eligibleRows =
    mainRows
      .map((row, index) => ({
        row,

        // 실제 Sheet 행 번호
        sourceRowNumber:
          12 + index,
      }))
      .filter(({ row }) =>
        ELIGIBLE_QUALIFICATIONS.has(
          text(row[0]),
        ),
      )


  console.log(
    `서비스 대상자: ${eligibleRows.length}명`,
  )

  console.log('')


  // --------------------------------------------------------
  // 4. Auth 매칭
  // --------------------------------------------------------

  const matched = []
  const missingAuth = []
  const invalid = []


  for (
    const {
      row,
      sourceRowNumber,
    }
    of eligibleRows
  ) {
    const qualification =
      text(row[0])

    const category =
      text(row[1])

    const name =
      text(row[2])

    const phone =
      normalizePhone(row[6])


    if (
      !name ||
      !phone
    ) {
      invalid.push({
        sourceRowNumber,
        name,
        phone,
      })

      continue
    }


    const {
      user,
      email,
    } =
      await findFirebaseUser(phone)


    if (!user) {
      missingAuth.push({
        sourceRowNumber,
        qualification,
        category,
        name,
        phone,
        email,
      })

      continue
    }


const userData =
  buildUserData(
    row,
    storesByPerson,
    activitiesByPerson,
    sourceRowNumber,
  )


    matched.push({
      uid: user.uid,
      email,
      userData,
    })


    console.log(
      `✓ ${name} / ${qualification} / ${phone}`,
    )

    console.log(
      `  UID: ${user.uid}`,
    )

    console.log(
      `  매장: ${userData.performance.storeCount}`,
    )

    console.log(
      `  오픈 POS: ${userData.performance.openedPosCount}`,
    )

    console.log(
      `  매출발생 POS: ${userData.performance.salesPosCount}`,
    )

    console.log(
      `  누적 수당: ${userData.allowance.cumulativeAmountWon.toLocaleString()}원`,
    )

    console.log('')
  }


  // --------------------------------------------------------
  // 5. 결과 출력
  // --------------------------------------------------------

  console.log(
    '----------------------------------------',
  )

  console.log(
    `Auth 매칭 성공: ${matched.length}명`,
  )

  console.log(
    `Auth 계정 없음: ${missingAuth.length}명`,
  )

  console.log(
    `유효하지 않은 행: ${invalid.length}명`,
  )

  console.log(
    '----------------------------------------',
  )

  console.log('')


  if (missingAuth.length > 0) {
    console.log(
      'Authentication 계정이 없는 사용자',
    )

    console.log('')

    for (
      const person
      of missingAuth
    ) {
      console.log(
        `- ${person.name}`,
        `| ${person.qualification}`,
        `| ${person.category}`,
        `| ${person.phone}`,
      )
    }

    console.log('')
  }


  // --------------------------------------------------------
  // DRY RUN이면 여기서 끝
  // --------------------------------------------------------

  if (!WRITE_MODE) {
    console.log(
      'DRY RUN 완료.',
    )

    console.log(
      'Firestore에는 아무 것도 쓰지 않았습니다.',
    )

    console.log('')

    console.log(
      '실제 반영하려면:',
    )

    console.log(
      'node scripts/sync-google-sheet.js --write',
    )

    console.log('')

    return
  }


  // --------------------------------------------------------
  // 6. 실제 Firestore 기록
  // --------------------------------------------------------

  if (matched.length === 0) {
    console.log(
      'Firestore에 기록할 사용자가 없습니다.',
    )

    return
  }


  console.log(
    'Firestore 기록 시작...',
  )


  const batch =
    db.batch()


  for (
    const {
      uid,
      userData,
    }
    of matched
  ) {
    const ref =
      db.collection('users').doc(uid)

    // Google Sheet가 원본이므로
    // 동기화되는 사용자 문서는 전체 교체
    batch.set(
      ref,
      userData,
    )
  }


  await batch.commit()


  console.log('')
  console.log(
    `Firestore ${matched.length}명 업데이트 완료`,
  )
  console.log('')
}


// ============================================================
// 종료 처리
// ============================================================

main()
  .catch((error) => {
    console.error('')
    console.error(
      '동기화 실패',
    )

    console.error(error)

    console.error('')

    process.exitCode = 1
  })
  .finally(async () => {
    await deleteApp(
      firebaseApp,
    )
  })