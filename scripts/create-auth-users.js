import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'

import {
  cert,
  deleteApp,
  initializeApp,
} from 'firebase-admin/app'

import {
  getAuth,
} from 'firebase-admin/auth'

import { google } from 'googleapis'


// ============================================================
// 설정
// ============================================================

const SPREADSHEET_ID =
  '1Y6L3iGY7r3oVGEki9vRAB2-U6fpaS-Qw7-MxZT6gwEE'

const LOGIN_DOMAIN =
  'promaster.local'

const WRITE_MODE =
  process.argv.includes('--write')

const ELIGIBLE_QUALIFICATIONS = new Set([
  '합격자',
  'Pro',
  'Master',
  'Grand Master',
])

// ============================================================
// 한글 두벌식 → 영문 키보드 변환표
// ============================================================

const CHOSEONG = [
  'r',   // ㄱ
  'R',   // ㄲ
  's',   // ㄴ
  'e',   // ㄷ
  'E',   // ㄸ
  'f',   // ㄹ
  'a',   // ㅁ
  'q',   // ㅂ
  'Q',   // ㅃ
  't',   // ㅅ
  'T',   // ㅆ
  'd',   // ㅇ
  'w',   // ㅈ
  'W',   // ㅉ
  'c',   // ㅊ
  'z',   // ㅋ
  'x',   // ㅌ
  'v',   // ㅍ
  'g',   // ㅎ
]


const JUNGSEONG = [
  'k',   // ㅏ
  'o',   // ㅐ
  'i',   // ㅑ
  'O',   // ㅒ
  'j',   // ㅓ
  'p',   // ㅔ
  'u',   // ㅕ
  'P',   // ㅖ
  'h',   // ㅗ
  'hk',  // ㅘ
  'ho',  // ㅙ
  'hl',  // ㅚ
  'y',   // ㅛ
  'n',   // ㅜ
  'nj',  // ㅝ
  'np',  // ㅞ
  'nl',  // ㅟ
  'b',   // ㅠ
  'm',   // ㅡ
  'ml',  // ㅢ
  'l',   // ㅣ
]


const JONGSEONG = [
  '',    // 없음
  'r',   // ㄱ
  'R',   // ㄲ
  'rt',  // ㄳ
  's',   // ㄴ
  'sw',  // ㄵ
  'sg',  // ㄶ
  'e',   // ㄷ
  'f',   // ㄹ
  'fr',  // ㄺ
  'fa',  // ㄻ
  'fq',  // ㄼ
  'ft',  // ㄽ
  'fx',  // ㄾ
  'fv',  // ㄿ
  'fg',  // ㅀ
  'a',   // ㅁ
  'q',   // ㅂ
  'qt',  // ㅄ
  't',   // ㅅ
  'T',   // ㅆ
  'd',   // ㅇ
  'w',   // ㅈ
  'c',   // ㅊ
  'z',   // ㅋ
  'x',   // ㅌ
  'v',   // ㅍ
  'g',   // ㅎ
]


// ============================================================
// 공통 함수
// ============================================================

function text(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  return String(value).trim()
}


function normalizePhone(phone) {
  return text(phone)
    .replace(/\D/g, '')
}


function phoneToEmail(phone) {
  return (
    `${normalizePhone(phone)}` +
    `@${LOGIN_DOMAIN}`
  )
}


// ============================================================
// 한글 이름을 두벌식 영문 키 입력으로 변환
//
// 김동욱
// → rlaehddnr
// ============================================================

function hangulNameToEnglishKeys(name) {
  let result = ''

  for (const char of text(name)) {
    const code =
      char.charCodeAt(0)

    // 한글 완성형 가 ~ 힣
    if (
      code >= 0xac00 &&
      code <= 0xd7a3
    ) {
      const syllableIndex =
        code - 0xac00

      const jongIndex =
        syllableIndex % 28

      const jungIndex =
        Math.floor(
          syllableIndex / 28,
        ) % 21

      const choIndex =
        Math.floor(
          syllableIndex / 588,
        )

      result +=
        CHOSEONG[choIndex]

      result +=
        JUNGSEONG[jungIndex]

      result +=
        JONGSEONG[jongIndex]

      continue
    }

    // 영문/숫자가 이름에 포함되어 있으면 유지
    if (/[a-zA-Z0-9]/.test(char)) {
      result +=
        char.toLowerCase()

      continue
    }

    // 공백이나 특수문자는 비밀번호에서 제외
  }

  return result.toLowerCase()
}


// ============================================================
// 초기 비밀번호 생성
//
// 이름 영문키 + 휴대폰 뒤 4자리
// ============================================================

function createInitialPassword(
  name,
  phone,
) {
  const englishName =
    hangulNameToEnglishKeys(name)

  const normalizedPhone =
    normalizePhone(phone)

  const phoneLast4 =
    normalizedPhone.slice(-4)

  const password =
    `${englishName}${phoneLast4}`

  if (password.length < 6) {
    throw new Error(
      `생성된 비밀번호가 너무 짧습니다: ${name}`,
    )
  }

  return password
}


// ============================================================
// CSV 처리
// ============================================================

function csvCell(value) {
  const str =
    String(value ?? '')

  return (
    `"${str.replaceAll('"', '""')}"`
  )
}


function saveCredentialsCsv(records) {
  const header = [
    '성명',
    '자격',
    '구분',
    '휴대폰번호',
    '로그인 이메일',
    '초기 비밀번호',
    'Firebase UID',
    '상태',
  ]

  const lines = [
    header
      .map(csvCell)
      .join(','),
  ]

  for (const record of records) {
    lines.push(
      [
        record.name,
        record.qualification,
        record.category,
        record.phone,
        record.email,
        record.password,
        record.uid,
        record.status,
      ]
        .map(csvCell)
        .join(','),
    )
  }

  const secretsDirectory =
    new URL(
      '../secrets/',
      import.meta.url,
    )

  mkdirSync(
    secretsDirectory,
    {
      recursive: true,
    },
  )

  const date =
    new Date()
      .toISOString()
      .slice(0, 10)

  const outputUrl =
    new URL(
      `../secrets/auth-credentials-${date}.csv`,
      import.meta.url,
    )

  writeFileSync(
    outputUrl,
    '\uFEFF' + lines.join('\n'),
    'utf8',
  )

  return outputUrl
}


// ============================================================
// Firebase 서비스 계정
// ============================================================

const serviceAccountPath =
  new URL(
    '../secrets/firebase-admin.json',
    import.meta.url,
  )

const serviceAccount =
  JSON.parse(
    readFileSync(
      serviceAccountPath,
      'utf8',
    ),
  )


// ============================================================
// Firebase Admin
// ============================================================

const firebaseApp =
  initializeApp({
    credential:
      cert(serviceAccount),
  })

const firebaseAuth =
  getAuth(firebaseApp)


// ============================================================
// Google Sheets
// ============================================================

const googleAuth =
  new google.auth.GoogleAuth({
    credentials:
      serviceAccount,

    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  })


const sheets =
  google.sheets({
    version: 'v4',
    auth: googleAuth,
  })


// ============================================================
// 통합 명단 읽기
// ============================================================

async function readUsersFromSheet() {
  const response =
    await sheets
      .spreadsheets
      .values
      .get({
        spreadsheetId:
          SPREADSHEET_ID,

        range:
          "'Pro/Master 통합 명단'!B12:H1052",
      })


  const rows =
    response.data.values ?? []


  return rows
    .map(
      (
        row,
        index,
      ) => ({
        sourceRow:
          12 + index,

        qualification:
          text(row[0]),

        category:
          text(row[1]),

        name:
          text(row[2]),

        affiliation:
          text(row[3]),

        position:
          text(row[4]),

        birthDate:
          text(row[5]),

        phone:
          normalizePhone(
            row[6],
          ),
      }),
    )
    .filter(
      (person) =>
        ELIGIBLE_QUALIFICATIONS
          .has(
            person.qualification,
          ),
    )
}


// ============================================================
// Firebase Auth 사용자 확인
// ============================================================

async function findExistingUser(
  email,
) {
  try {
    return await firebaseAuth
      .getUserByEmail(email)
  } catch (error) {
    if (
      error?.code ===
      'auth/user-not-found'
    ) {
      return null
    }

    throw error
  }
}


// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('')
  console.log(
    '========================================',
  )

  console.log(
    ' Firebase Authentication 사용자 생성',
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
  // Google Sheet
  // --------------------------------------------------------

  console.log(
    'Google Sheet 사용자 읽는 중...',
  )

  const people =
    await readUsersFromSheet()

  console.log(
    `서비스 대상자: ${people.length}명`,
  )

  console.log('')


  const records = []

  let createCount = 0
  let existingCount = 0
  let invalidCount = 0


  // --------------------------------------------------------
  // 사용자별 처리
  // --------------------------------------------------------

  for (const person of people) {
    const {
      sourceRow,
      qualification,
      category,
      name,
      phone,
    } = person


    if (
      !name ||
      !phone
    ) {
      console.log(
        `! 데이터 오류: ${sourceRow}행`,
      )

      invalidCount += 1

      continue
    }


    const email =
      phoneToEmail(phone)

    const password =
      createInitialPassword(
        name,
        phone,
      )


    const existingUser =
      await findExistingUser(
        email,
      )


    // ------------------------------------------------------
    // 이미 Auth 계정이 있는 경우
    // ------------------------------------------------------

    if (existingUser) {
      console.log(
        `= 기존 계정: ${name}`,
      )

      console.log(
        `  ${email}`,
      )

      console.log(
        `  UID: ${existingUser.uid}`,
      )

      console.log('')


      records.push({
        name,
        qualification,
        category,
        phone,
        email,

        // 기존 사용자의 비밀번호는
        // 이 스크립트가 알 수 없으므로 비워둔다.
        password: '',

        uid:
          existingUser.uid,

        status:
          'EXISTING',
      })


      existingCount += 1

      continue
    }


    // ------------------------------------------------------
    // DRY RUN
    // ------------------------------------------------------

    if (!WRITE_MODE) {
      console.log(
        `+ 생성 예정: ${name}`,
      )

      console.log(
        `  로그인: ${email}`,
      )

      console.log(
        `  초기 PW: ${password}`,
      )

      console.log('')


      records.push({
        name,
        qualification,
        category,
        phone,
        email,
        password,
        uid: '',
        status:
          'DRY_RUN',
      })


      createCount += 1

      continue
    }


    // ------------------------------------------------------
    // 실제 Authentication 계정 생성
    // ------------------------------------------------------

    const createdUser =
      await firebaseAuth
        .createUser({
          email,

          password,

          displayName:
            name,

          emailVerified:
            false,

          disabled:
            false,
        })


    console.log(
      `✓ 생성 완료: ${name}`,
    )

    console.log(
      `  로그인: ${email}`,
    )

    console.log(
      `  UID: ${createdUser.uid}`,
    )

    console.log('')


    records.push({
      name,
      qualification,
      category,
      phone,
      email,
      password,

      uid:
        createdUser.uid,

      status:
        'CREATED',
    })


    createCount += 1
  }


  // --------------------------------------------------------
  // 결과
  // --------------------------------------------------------

  console.log(
    '----------------------------------------',
  )

  if (WRITE_MODE) {
    console.log(
      `신규 생성: ${createCount}명`,
    )
  } else {
    console.log(
      `생성 예정: ${createCount}명`,
    )
  }

  console.log(
    `기존 계정: ${existingCount}명`,
  )

  console.log(
    `데이터 오류: ${invalidCount}명`,
  )

  console.log(
    '----------------------------------------',
  )

  console.log('')


  // --------------------------------------------------------
  // WRITE일 때만 로그인 목록 CSV 저장
  // --------------------------------------------------------

  if (WRITE_MODE) {
    const outputUrl =
      saveCredentialsCsv(
        records,
      )

    console.log(
      '초기 로그인 정보 CSV 저장 완료',
    )

    console.log(
      outputUrl.pathname,
    )

    console.log('')
  }


  if (!WRITE_MODE) {
    console.log(
      'DRY RUN 완료.',
    )

    console.log(
      'Authentication에는 아무 것도 생성하지 않았습니다.',
    )

    console.log('')

    console.log(
      '실제 생성:',
    )

    console.log(
      'node scripts/create-auth-users.js --write',
    )

    console.log('')
  }
}


// ============================================================
// 실행 및 종료
// ============================================================

main()
  .catch((error) => {
    console.error('')
    console.error(
      '사용자 생성 작업 실패',
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