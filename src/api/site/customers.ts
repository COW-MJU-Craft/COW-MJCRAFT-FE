import { api, withApiBase } from '../core/client';
import {
  toOrderDetailResponse,
  type OrderDetailResponse,
} from './orders';

export type CustomerCredentials = {
  email: string;
  password: string;
};

export type CustomerOrderSummary = {
  orderId: number;
  orderNo: string;
  status: string;
  finalAmount: number;
  depositDeadline?: string | null;
  createdAt: string;
  itemSummary: string;
};

export type CustomerEnrollRequest = {
  email: string;
  code: string;
  password: string;
};

export const customersApi = {
  async sendEmailCode(email: string) {
    return api<void>(withApiBase('/customers/email-code'), {
      method: 'POST',
      body: { email },
    });
  },

  async enroll(payload: CustomerEnrollRequest) {
    return api<unknown>(withApiBase('/customers/enroll'), {
      method: 'POST',
      body: payload,
    });
  },

  async getOrders(payload: CustomerCredentials) {
    return api<CustomerOrderSummary[]>(withApiBase('/customers/orders'), {
      method: 'POST',
      body: payload,
    });
  },

  async getOrderDetail(orderId: number, payload: CustomerCredentials) {
    const data = await api<unknown>(
      withApiBase(`/customers/orders/${orderId}`),
      {
        method: 'POST',
        body: payload,
      },
    );
    return toOrderDetailResponse(data) as OrderDetailResponse;
  },
};
