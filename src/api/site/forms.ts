import { api, withApiBase } from '../core/client';

export type FormQuestion = {
  id: number;
  orderNo: number;
  label: string;
  description?: string | null;
  required: boolean;
};

export type ActiveFormResponse = {
  formId: number;
  title: string;
  description?: string | null;
  questions: FormQuestion[];
};

export type ApplyRequest = {
  name: string;
  studentNo: string;
  major: string;
  grade: string;
  phone: string;
  answers: Array<{ questionId: number; value: string }>;
};

export type ApplyResponse = {
  applicationId: number;
  resultCode?: string;
};

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const demoForm: ActiveFormResponse = {
  formId: 1,
  title: '2026-1학기 모집',
  description: '명지공방 지원서를 작성해 주세요.',
  questions: [
    {
      id: 10,
      orderNo: 1,
      label: '지원 동기',
      description: '간단히 적어 주세요.',
      required: true,
    },
    {
      id: 11,
      orderNo: 2,
      label: '경험/프로젝트',
      description: '관련 경험이 있다면 알려주세요.',
      required: false,
    },
  ],
};

export const formsApi = {
  async getActiveForm() {
    try {
      return await api<ActiveFormResponse>(withApiBase('/forms/active'));
    } catch (err) {
      if (DEMO_MODE) return demoForm;
      throw err;
    }
  },
  async applyActiveForm(payload: ApplyRequest) {
    try {
      return await api<ApplyResponse>(withApiBase('/forms/active/apply'), {
        method: 'POST',
        body: payload,
      });      
    } catch (err) {
      if (DEMO_MODE) {
        return { applicationId: Date.now(), resultCode: 'DEMO' };
      }
      throw err;
    }
  },
};
