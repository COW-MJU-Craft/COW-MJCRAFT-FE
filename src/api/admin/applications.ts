import { api, withApiBase } from '../core/client';
import type { DepartmentType } from '../../types/recruit';

export type AdminApplicationResultStatus = 'PASS' | 'FAIL' | 'NOT_PUBLISHED';

export type AdminApplicationListItem = {
  applicationId: number;
  studentId: string;
  applicantName?: string | null;
  firstDepartment: DepartmentType;
  secondDepartment: DepartmentType;
  resultStatus: AdminApplicationResultStatus;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
};

export type AdminApplicationAnswerItem = {
  formQuestionId: number;
  value: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  fileName?: string | null;
};

export type AdminApplicationDetail = {
  applicationId: number;
  studentId: string;
  applicantName?: string | null;
  firstDepartment: DepartmentType;
  secondDepartment: DepartmentType;
  resultStatus: AdminApplicationResultStatus;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
  basicAnswers?: AdminApplicationAnswerItem[];
  commonAnswers?: AdminApplicationAnswerItem[];
  firstDepartmentAnswers?: AdminApplicationAnswerItem[];
  secondDepartmentAnswers?: AdminApplicationAnswerItem[];
};

export type AdminApplicationResultUpdateRequest = {
  resultStatus: AdminApplicationResultStatus;
};

export const adminApplicationsApi = {
  list(formId: string) {
    return api<AdminApplicationListItem[]>(
      withApiBase(`/admin/forms/${formId}/applications`),
    );
  },

  getById(formId: string, applicationId: string) {
    return api<AdminApplicationDetail>(
      withApiBase(`/admin/forms/${formId}/applications/${applicationId}`),
    );
  },

  updateResult(
    applicationId: string,
    body: AdminApplicationResultUpdateRequest,
  ) {
    return api<void>(
      withApiBase(`/admin/applications/${applicationId}/result`),
      {
        method: 'PUT',
        body,
      },
    );
  },

  delete(applicationId: string) {
    return api<void>(withApiBase(`/admin/applications/${applicationId}`), {
      method: 'DELETE',
    });
  },
};
