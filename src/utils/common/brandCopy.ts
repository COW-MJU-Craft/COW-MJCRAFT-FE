export function normalizeBrandCopy(value: string | undefined) {
  if (!value) return value;

  return value
    .replaceAll('(明智工房)', '')
    .replace(
      /본 프로젝트는 명지대학교와 무관하며,\s*교내\s+창업\s*동아리\s+소속\s*[‘’']?명지공방[‘’']?이\s+기획\s+및\s+프로젝트를\s+진행합니다\./g,
      '명지대학교 굿즈 제작 동아리 ‘명지공방’이 기획 및 프로젝트를 진행합니다.',
    )
    .replace(
      /This project has nothing to do with Myongji University\.\s*MJU Craft, a member of the school.?s start up club, will carry out the planning and project\./gi,
      "MJU Craft, Myongji University's merchandise-making club, plans and runs this project.",
    )
    .replace(
      /명지대학교\s+비공식\s+굿즈\s+제작\s+프로젝트\s+팀/g,
      '명지대학교 굿즈 제작 동아리',
    )
    .replace(
      /명지대학교\s+창업\s*동아리\s+소속\s+자체\s+제작\s+굿즈\s+프로젝트\s+팀/g,
      '명지대학교 굿즈 제작 동아리',
    );
}
