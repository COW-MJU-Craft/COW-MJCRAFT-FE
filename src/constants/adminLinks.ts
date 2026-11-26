// 관리자 메뉴의 외부 바로가기 링크.
// 주소는 한 곳에서만 관리한다. Looker Studio 보고서로 바꾸고 싶으면 href만 교체하면 된다.

export type AdminExternalLink = {
  key: string;
  label: string;
  href: string;
};

// GA4 속성 "MJU CRAFT DATA"의 보고서 홈.
// 속성 ID는 비밀값이 아니다. 열람하려면 해당 구글 계정에 GA 속성 권한이 있어야 한다.
export const GA_REPORT_LINK: AdminExternalLink = {
  key: 'analytics',
  label: 'GA',
  href: 'https://analytics.google.com/analytics/web/#/p536574599/reports/intelligenthome',
};
