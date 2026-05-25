# Kyu Sik's Planner - 웹앱

## 배포 순서

### 1단계: Firebase 설정
1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭 → 이름 입력 (예: kyu-sik-planner)
3. Google Analytics 비활성화 → 프로젝트 만들기
4. 왼쪽 메뉴 "빌드" → "Authentication" → "시작하기"
5. "Google" 선택 → 활성화 → 저장
6. 왼쪽 메뉴 "빌드" → "Firestore Database" → "데이터베이스 만들기"
   → "테스트 모드로 시작" 선택 → 위치 선택 (asia-northeast3) → 완료
7. 왼쪽 상단 톱니바퀴 → "프로젝트 설정"
8. "내 앱" 섹션 → "</>" 웹 아이콘 클릭
9. 앱 닉네임 입력 → "앱 등록"
10. firebaseConfig 코드 복사

### 2단계: app.js에 Firebase 설정 입력
app.js 파일 상단의 firebaseConfig 부분을 복사한 코드로 교체

### 3단계: Vercel 배포
1. https://vercel.com 접속 → GitHub로 가입
2. "Add New Project" → "Upload" 탭 선택
3. 이 폴더(life-planner-web)를 통째로 드래그앤드롭
4. "Deploy" 클릭
5. 완료되면 URL이 생성됨 (예: kyu-sik-planner.vercel.app)

### 완료!
생성된 URL을 휴대폰 브라우저에서 열면 됩니다.
홈 화면에 추가하면 앱처럼 사용 가능합니다.
