// 라우트 코드 분리(React.lazy) 중 페이지 청크를 받는 동안 보여주는 로딩 표시.
// 레이아웃(헤더/푸터)은 그대로 유지되므로 본문 영역 높이만 확보한다.
export default function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary"
        aria-hidden="true"
      />
      <span className="sr-only">불러오는 중</span>
    </div>
  );
}
