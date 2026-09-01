export type LinkKind =
  | 'instagram'
  | 'kakao'
  | 'notion'
  | 'drive'
  | 'form'
  | 'link';

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  kind: LinkKind;
  description?: string;
};

export type ProjectIntroLink = {
  label: string;
  url: string;
};

export type ProjectIntro = {
  id: string;
  term: string;
  title: string;
  date: string;
  summary: string;
  links: ProjectIntroLink[];
};

export type AdminContent = {
  about: {
    headline: string;
    subheadline: string;
    intro: string[];
    purposeTitle: string;
    purposeBody: string[];
    logoTitle: string;
    logoBody: string[];
    footerNote: string;
  };
  links: {
    instagramUrl: string;
    kakaoUrl: string;
  };
  linktree: LinkItem[];
  projectsIntro: ProjectIntro[];
  feedbackForm: {
    question1: string;
    question1Options: string[];
    question2: string;
  };
};

const STORAGE_KEY = 'cow_admin_content_v1';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDefaultAdminContent(): AdminContent {
  return {
    about: {
      headline: '“우리의 손끝에서, 명지가 피어납니다.”',
      subheadline:
        '명지대학교 창업 동아리 소속 자체 제작 굿즈 프로젝트 팀, 명지공방(明智工房) 입니다.',
      intro: [
        '안녕하세요! 저희는 명지대학교 창업 동아리 소속 자체 제작 굿즈 프로젝트 팀 명지공방(明智工房) 입니다.',
        '저희는 기획•운영 / 재무•회계 / 디자인 / 마케팅•홍보 총 네 팀으로 운영됩니다.',
        '명지공방만의 브랜드 가치를 담은 상품과 경험을 소비자들에게 전달하고자 합니다.',
      ],
      purposeTitle: '우리의 목적은',
      purposeBody: [
        '명지(明知)를 우리 손으로.',
        '명지인을 위한, 명지인에 의한 창작 공간.',
        '우리(明智工房)가 만드는 굿즈에 우리의 학교, 이야기를 담는 것 입니다.',
      ],
      logoTitle: '최종 명지공방(明智工房) 로고 (25.04.14~)',
      logoBody: [
        '우리가 누구를 위해 활동하는지(M), 무엇을 담고 전달하고자 하는지(상자), 어떤 방식으로 창작하고자 하는지(공방)를 담아낸 로고입니다.',
        '정육면체 형태: 학우들의 의견을 담고, 소중한 추억을 보관하며, 명지대학교에 대한 소속감을 상징합니다.',
        'M 형태: 로고 중심의 M은 명지대학교(MJU)를 의미합니다.',
        'ㄱ,ㅂ 초성: 공방의 초성을 시각적으로 표현한 디자인입니다.',
      ],
      footerNote: '명지공방은 학우분들의 관심과 함께 성장합니다.',
    },
    links: {
      instagramUrl: 'https://www.instagram.com/mju_craft/',
      kakaoUrl: 'https://open.kakao.com/o/s4f5ivoh',
    },
    linktree: [
      {
        id: createId('link'),
        title: '[MJU Journal]-2026 ver.',
        url: 'https://drive.google.com/drive/folders/1LhEAaOQAR4qGxUAu8bZEGA54WzO6c4Jp',
        kind: 'drive',
        description: '명지대 디지털 노트필기 양식 무료 배포',
      },
      {
        id: createId('link'),
        title: '명지공방 피드백 제출 폼',
        url: '/feedback#feedback',
        kind: 'form',
        description: '의견을 자유롭게 남겨 주세요.',
      },
      {
        id: createId('link'),
        title: '명지공방 노션 페이지',
        url: '',
        kind: 'notion',
        description: '소개/프로젝트 기록을 정리한 노션 페이지',
      },
      {
        id: createId('link'),
        title: '명지공방 카카오톡 문의 채널',
        url: 'https://open.kakao.com/o/s4f5ivoh',
        kind: 'kakao',
      },
    ],
    projectsIntro: [
      {
        id: createId('project'),
        term: '2025-1학기',
        title: '[MJU Journal] - 명지대 디지털 노트필기 양식 무료 배포',
        date: '25.04.01',
        summary: '명지공방 첫 번째 프로젝트, MJU Journal 배포.',
        links: [
          {
            label: '양식 다운로드',
            url: 'https://drive.google.com/drive/folders/1LhEAaOQAR4qGxUAu8bZEGA54WzO6c4Jp',
          },
          {
            label: '인스타그램',
            url: 'https://www.instagram.com/mju_craft/',
          },
        ],
      },
    ],
    feedbackForm: {
      question1: '재학생 이신가요?',
      question1Options: ['예', '아니오. (졸업생, 교직원, 외부인)'],
      question2: '명지공방에게 하고싶은 말을 자유롭게 남겨주세요!',
    },
  };
}

export function loadAdminContent(): AdminContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultAdminContent();
    const parsed = JSON.parse(raw) as AdminContent;
    return parsed;
  } catch {
    return getDefaultAdminContent();
  }
}

export function saveAdminContent(next: AdminContent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function createLinkItem(): LinkItem {
  return {
    id: createId('link'),
    title: '',
    url: '',
    kind: 'link',
  };
}

export function createProjectIntro(): ProjectIntro {
  return {
    id: createId('project'),
    term: '',
    title: '',
    date: '',
    summary: '',
    links: [{ label: '', url: '' }],
  };
}
