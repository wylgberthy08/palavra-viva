import { create, isAxiosError } from 'axios';

import { bibleConfig } from '@/config/bible';


export const bibleHttp = create({
  baseURL: bibleConfig.baseURL,
  timeout: bibleConfig.timeout,
  headers: {
    Accept: 'application/json',
  },
});

bibleHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.data) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);
