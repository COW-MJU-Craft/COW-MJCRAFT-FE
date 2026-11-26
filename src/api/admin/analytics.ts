import { api, withApiBase } from '../core/client';

export type AdminAnalyticsChannel = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  viewItem: number;
  addToCart: number;
  beginCheckout: number;
  orders: number;
};

export type AdminAnalyticsDaily = {
  date: string;
  sessions: number;
  users: number;
};

export type AdminAnalyticsChannels = {
  from: string;
  to: string;
  channels: AdminAnalyticsChannel[];
  daily: AdminAnalyticsDaily[];
};

export const adminAnalyticsApi = {
  channels(from: string, to: string) {
    const query = new URLSearchParams({ from, to }).toString();
    return api<AdminAnalyticsChannels>(
      withApiBase(`/admin/analytics/channels?${query}`),
    );
  },
};
