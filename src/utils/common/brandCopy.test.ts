import { describe, expect, it } from 'vitest';
import { normalizeBrandCopy } from './brandCopy';

describe('normalizeBrandCopy', () => {
  it('명지공방 뒤 한자를 제거한다', () => {
    expect(normalizeBrandCopy('명지공방(明智工房)')).toBe('명지공방');
  });

  it('비공식 굿즈 프로젝트 표현을 굿즈 제작 동아리로 바꾼다', () => {
    expect(
      normalizeBrandCopy('명지대학교  비공식 굿즈 제작 프로젝트 팀'),
    ).toBe('명지대학교 굿즈 제작 동아리');
  });

  it('창업 동아리 소속 표현을 굿즈 제작 동아리로 바꾼다', () => {
    expect(
      normalizeBrandCopy(
        '명지대학교 창업 동아리 소속  자체 제작 굿즈 프로젝트 팀',
      ),
    ).toBe('명지대학교 굿즈 제작 동아리');
  });

  it('과거 상품 설명의 창업 동아리 문구를 굿즈 제작 동아리로 바꾼다', () => {
    expect(
      normalizeBrandCopy(
        '본 프로젝트는 명지대학교와 무관하며, 교내 창업 동아리 소속 ‘명지공방‘이 기획 및 프로젝트를 진행합니다.',
      ),
    ).toBe(
      '명지대학교 굿즈 제작 동아리 ‘명지공방’이 기획 및 프로젝트를 진행합니다.',
    );
  });

  it('과거 상품 설명의 영문 창업 동아리 문구도 굿즈 제작 동아리로 바꾼다', () => {
    expect(
      normalizeBrandCopy(
        "This project has nothing to do with Myongji University. MJU Craft, a member of the school's start up club, will carry out the planning and project.",
      ),
    ).toBe(
      "MJU Craft, Myongji University's merchandise-making club, plans and runs this project.",
    );
  });
});
