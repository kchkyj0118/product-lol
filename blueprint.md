# AI 롤 승리 플랜 코치 (AI LoL Win Plan Coach)

## 프로젝트 개요
사용자가 입력한 아군/적군 챔피언 조합과 자신의 라인을 바탕으로, 최신 LoL 메타를 반영한 전문적인 승리 전략을 제공하는 서비스입니다.

## 주요 기능
- **AI 분석**: Gemini 1.5 Pro/Flash 모델을 사용하여 10명의 챔피언 상성 및 조합 시너지를 분석합니다.
- **맞춤형 플랜**: 초반 라인전, 정글 동선 제안, 중후반 운영 및 한타 포지셔닝 등 단계별 전략을 제공합니다.
- **직관적 UI**: 챔피언 입력 및 라인 선택이 용이한 LoL 테마의 디자인을 적용했습니다.

## 기술 스택
- **Frontend**: Vanilla JS, Modern CSS (Baseline), HTML5
- **Backend**: Firebase Functions (Node.js)
- **AI API**: Google Gemini API
- **Hosting**: Firebase Hosting

## 디자인 가이드
- **색상**: LoL 공식 테마(Gold & Dark Blue)를 사용하여 몰입감을 높였습니다.
- **컴포넌트**: 카드 형태의 입력 섹션, 상태별 애니메이션(스피너), 가독성 높은 분석 결과창.

## 개발 계획
1. [x] 기본 인프라 구축 (Firebase Functions, Hosting 설정)
2. [x] 백엔드 AI 분석 로직 구현 (Gemini System Prompt 설계)
3. [x] 프론트엔드 UI/UX 개발
4. [ ] 챔피언 자동 완성 기능 추가 (향후)
5. [ ] 과거 매치 데이터 연동 (향후)
