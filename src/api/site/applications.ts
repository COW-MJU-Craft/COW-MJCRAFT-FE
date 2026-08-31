import { api, withApiBase } from '../core/client';
import type { DepartmentType } from '../../types/recruit';

export type ApplicationNotice = {
  noticeId: number | string;
  sectionType?: string | null;
  departmentType?: string | null;
  title?: string | null;
  content?: string | null;
};

export type ApplicationQuestion = {
  formQuestionId: number;
  questionOrder?: number | null;
  content?: string | null;
  description?: string | null;
  answerType?: string | null;
  required?: boolean | null;
  sectionType?: string | null;
  departmentType?: string | null;
  selectOptions?: string | null;
};

export type ApplicationFormResponse = {
  formId: number;
  title?: string | null;
  notices?: ApplicationNotice[] | null;
  questions?: ApplicationQuestion[] | null;
};

export type ApplicationAnswer = {
  formQuestionId: number;
  value: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
};

export type ApplicationCreateRequest = {
  formId?: number;
  studentId: string;
  password: string;
  firstDepartment: DepartmentType;
  secondDepartment: DepartmentType;
  answers: ApplicationAnswer[];
};

export type ApplicationUpdateRequest = ApplicationCreateRequest;

export type ApplicationReadRequest = {
  formId?: number;
  studentId: string;
  password: string;
};

export type ApplicationReadResponse = {
  editable?: boolean | null;
  applicationId?: number | string | null;
  studentId?: string | null;
  firstDepartment?: DepartmentType | string | null;
  secondDepartment?: DepartmentType | string | null;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
  commonNotice?: { title?: string | null; content?: string | null } | null;
  firstDepartmentNotice?: {
    title?: string | null;
    content?: string | null;
  } | null;
  secondDepartmentNotice?: {
    title?: string | null;
    content?: string | null;
  } | null;
  basicAnswers?: ApplicationAnswer[] | null;
  commonAnswers?: ApplicationAnswer[] | null;
  firstDepartmentAnswers?: ApplicationAnswer[] | null;
  secondDepartmentAnswers?: ApplicationAnswer[] | null;
  questions?: ApplicationQuestion[] | null;
  notices?: ApplicationNotice[] | null;
};

export type ApplicationResultRequest = {
  formId?: number;
  studentId: string;
  password: string;
};

export type ApplicationResultResponse = {
  resultStatus?: string | null;
  message?: string | null;
};

export type PresignFileRequest = Array<{
  fileName: string;
  contentType: string;
}>;

export type PresignFileItem = {
  fileName: string;
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export type PresignFileResponse = {
  items: PresignFileItem[];
};

export const applicationsApi = {
  getForm() {
    return api<ApplicationFormResponse>(
      withApiBase('/application/form'),
    );
  },

  create(body: ApplicationCreateRequest) {
    return api<void>(withApiBase('/application'), {
      method: 'POST',
      body,
    });
  },

  update(body: ApplicationUpdateRequest) {
    return api<void>(withApiBase('/application'), {
      method: 'PUT',
      body,
    });
  },

  read(body: ApplicationReadRequest) {
    return api<ApplicationReadResponse>(
      withApiBase('/application/read'),
      {
        method: 'POST',
        body,
      },
    );
  },

  getResult(body: ApplicationResultRequest) {
    return api<ApplicationResultResponse>(withApiBase('/result'), {
      method: 'POST',
      body,
    });
  },

  presignFiles(body: PresignFileRequest) {
    return api<PresignFileResponse>(
      withApiBase('/forms/files'),
      {
        method: 'POST',
        body,
      },
    );
  },
};
