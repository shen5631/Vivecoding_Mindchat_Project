// 버전 관리
// - 최초 프로토타입: 1.0
// - 큰 변화: +1.0 (예: 1.0 -> 2.0)
// - 사소한 개선: +0.1 (예: 1.0 -> 1.1)
export const APP_VERSION = "1.3";

// 변경 이력 (최신이 위)
export const CHANGELOG: { version: string; note: string }[] = [
  { version: "1.3", note: "군 단위 지역 누락 보완(전국 시/군/구), AI 응답 JSON 노출 버그 수정(순수 텍스트+태그 방식), 메시지마다 즉시 자동 스크롤" },
  { version: "1.2", note: "채팅 자동 하단 스크롤 개선(bottomRef), 상담센터 링크를 mindinfo 지역 검색 목록(list.asp)으로 변경" },
  { version: "1.1", note: "자동 스크롤 개선, 상담사 연결을 팝업 다이얼로그로 변경, 지역 기반 상담센터 안내, 버전 표시 추가" },
  { version: "1.0", note: "MVP 최초 버전 — 익명 대화, 지역 선택, AI 상담 흐름" },
];
