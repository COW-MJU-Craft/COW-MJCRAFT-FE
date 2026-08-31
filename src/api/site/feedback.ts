// src/api/site/feedback.ts
import { api, withApiBase } from '../core/client';

export type CreateFeedbackBody = {
  isStudent: boolean;
  message: string;
};

export type CreateFeedbackResponse = {
  id?: string;
  message?: string;
};

export const feedbackApi = {
  create(body: CreateFeedbackBody) {
    return api<CreateFeedbackResponse>(withApiBase('/feedback'), {
      method: 'POST',
      body,
    });
  },
};
