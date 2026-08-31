import { api, withApiBase } from '../core/client';
import { unwrapApiResult } from '../core/types';
import type { ApiResult } from '../core/types';

export type AdminFormListItem = {
  formId: number;
  title: string;
  open: boolean;
};

export type AdminFormNoticeItem = {
  noticeId: number;
  sectionType: string;
  departmentType: string;
  title: string;
  content: string;
};

export type AdminFormQuestionInDetail = {
  formQuestionId: number;
  questionOrder: number;
  content: string;
  answerType: string;
  required: boolean;
};

export type AdminFormDetail = {
  formId: number;
  title: string;
  open: boolean;
  notices: AdminFormNoticeItem[];
  questions: AdminFormQuestionInDetail[];
};

export type AdminFormQuestion = {
  formQuestionId: number;
  questionId: number;
  label: string;
  description: string;
  questionOrder: number;
  required: boolean;
  answerType: string;
  selectOptions: string;
  sectionType: string;
  departmentType: string | null;
};

export type AdminFormCreateRequest = {
  title: string;
  open: boolean;
};

export type AdminFormCopyQuestionsRequest = {
  sourceFormId: number;
};

export type AdminFormCopyResponse = {
  targetFormId: number;
  sourceFormId: number;
  copiedCount: number;
};

export type AdminFormQuestionCreateRequest = {
  label: string;
  description: string;
  questionOrder: number;
  required: boolean;
  answerType: string;
  selectOptions: string | null;
  sectionType: string;
  departmentType: string | null;
};

export type AdminFormQuestionAddResponse = {
  questionId: number;
  formQuestionId: number;
};

export type AdminFormQuestionUpdateRequest = AdminFormQuestionCreateRequest;

export type AdminFormNoticeCreateRequest = {
  sectionType: string;
  departmentType: string | null;
  title: string;
  content: string;
};

export type AdminFormNoticeAddResponse = {
  noticeId: number;
};

export type AdminFormNoticeUpdateRequest = AdminFormNoticeCreateRequest;

export type AdminFormNotice = AdminFormNoticeItem;

export type AdminFormEmptyData = Record<string, never>;

export const adminFormsApi = {
  list() {
    return api<ApiResult<AdminFormListItem[]> | AdminFormListItem[]>(
      withApiBase('/admin/forms'),
    ).then((res) => unwrapApiResult(res));
  },

  getById(formId: string) {
    return api<ApiResult<AdminFormDetail> | AdminFormDetail>(
      withApiBase(`/admin/forms/${formId}`),
    ).then((res) => unwrapApiResult(res));
  },

  getQuestions(formId: string) {
    return api<ApiResult<AdminFormQuestion[]> | AdminFormQuestion[]>(
      withApiBase(`/admin/forms/${formId}/questions`),
    ).then((res) => unwrapApiResult(res));
  },

  create(body: AdminFormCreateRequest) {
    return api<ApiResult<AdminFormDetail> | AdminFormDetail>(
      withApiBase('/admin/forms'),
      { method: 'POST', body },
    ).then((res) => unwrapApiResult(res));
  },

  copyQuestions(targetFormId: string, body: AdminFormCopyQuestionsRequest) {
    return api<ApiResult<AdminFormCopyResponse> | AdminFormCopyResponse>(
      withApiBase(`/admin/forms/${targetFormId}/copy`),
      { method: 'POST', body },
    ).then((res) => unwrapApiResult(res));
  },

  addQuestion(formId: string, body: AdminFormQuestionCreateRequest) {
    return api<
      ApiResult<AdminFormQuestionAddResponse> | AdminFormQuestionAddResponse
    >(withApiBase(`/admin/forms/${formId}/questions`), {
      method: 'POST',
      body,
    }).then((res) => unwrapApiResult(res));
  },

  updateQuestion(
    formId: string,
    formQuestionId: string,
    body: AdminFormQuestionUpdateRequest,
  ) {
    return api<ApiResult<AdminFormEmptyData> | AdminFormEmptyData>(
      withApiBase(`/admin/forms/${formId}/questions/${formQuestionId}`),
      { method: 'PUT', body },
    ).then((res) => unwrapApiResult(res));
  },

  deleteQuestion(formId: string, formQuestionId: string) {
    return api<void>(
      withApiBase(`/admin/forms/${formId}/questions/${formQuestionId}`),
      { method: 'DELETE' },
    );
  },

  open(formId: string) {
    return api<ApiResult<AdminFormEmptyData> | AdminFormEmptyData>(
      withApiBase(`/admin/forms/${formId}/open`),
      { method: 'PUT' },
    ).then((res) => unwrapApiResult(res));
  },

  close(formId: string) {
    return api<ApiResult<AdminFormEmptyData> | AdminFormEmptyData>(
      withApiBase(`/admin/forms/${formId}/close`),
      { method: 'PUT' },
    ).then((res) => unwrapApiResult(res));
  },

  deleteForm(formId: string) {
    return api<void>(withApiBase(`/admin/forms/${formId}`), {
      method: 'DELETE',
    });
  },

  addNotice(formId: string, body: AdminFormNoticeCreateRequest) {
    return api<
      ApiResult<AdminFormNoticeAddResponse> | AdminFormNoticeAddResponse
    >(withApiBase(`/admin/forms/${formId}/notices`), {
      method: 'POST',
      body,
    }).then((res) => unwrapApiResult(res));
  },

  updateNotice(
    formId: string,
    noticeId: string,
    body: AdminFormNoticeUpdateRequest,
  ) {
    return api<ApiResult<AdminFormEmptyData> | AdminFormEmptyData>(
      withApiBase(`/admin/forms/${formId}/notices/${noticeId}`),
      { method: 'PUT', body },
    ).then((res) => unwrapApiResult(res));
  },

  deleteNotice(formId: string, noticeId: string) {
    return api<void>(
      withApiBase(`/admin/forms/${formId}/notices/${noticeId}`),
      { method: 'DELETE' },
    );
  },
};
