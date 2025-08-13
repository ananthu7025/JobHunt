// src/utils/response.ts
import { IApiResponse } from '../types';

export const createResponse = <T = any>(
  success: boolean,
  message: string,
  data?: T,
  error?: string
): IApiResponse<T> => {
  const response: IApiResponse<T> = {
    success,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (error) {
    response.error = error;
  }

  return response;
};
