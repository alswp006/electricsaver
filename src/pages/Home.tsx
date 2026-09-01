/**
 * 라우트 '/' 진입점.
 *
 * 홈은 데이터·검증·이동을 맡는 HomeData(라우트)와 입력 UI를 맡는 HomeInput(프레젠테이션)으로
 * 나뉜다. App.tsx의 라우트 배선은 이 파일을 가리키므로, 여기서는 HomeData를 그대로 내보낸다.
 */
export { default } from "./HomeData";
