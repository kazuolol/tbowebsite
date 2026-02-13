import type { EarlyAccessApi, EarlyAccessApiMode } from './earlyAccessApiContract';
import { createHttpEarlyAccessApi } from './HttpEarlyAccessApi';
import { createMockEarlyAccessApi } from './MockEarlyAccessApi';

const DEFAULT_HTTP_BASE_URL = '/v1/early-access';

const parseMode = (value: unknown): EarlyAccessApiMode => {
  if (typeof value !== 'string') {
    return 'http';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'mock' ? 'mock' : 'http';
};

const parseHttpBaseUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return DEFAULT_HTTP_BASE_URL;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return DEFAULT_HTTP_BASE_URL;
  }
  return normalized.replace(/\/+$/, '');
};

const mode = parseMode(import.meta.env.VITE_EARLY_ACCESS_API_MODE);
const httpBaseUrl = parseHttpBaseUrl(import.meta.env.VITE_EARLY_ACCESS_API_BASE_URL);

const createEarlyAccessApi = (): EarlyAccessApi => {
  if (mode === 'mock') {
    return createMockEarlyAccessApi();
  }
  return createHttpEarlyAccessApi(httpBaseUrl);
};

export const earlyAccessApi = createEarlyAccessApi();
