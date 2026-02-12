import type { EarlyAccessApi, EarlyAccessApiMode } from './earlyAccessApiContract';
import { createHttpEarlyAccessApi } from './HttpEarlyAccessApi';
import { createMockEarlyAccessApi } from './MockEarlyAccessApi';

const parseMode = (value: unknown): EarlyAccessApiMode => {
  if (typeof value !== 'string') {
    return 'mock';
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'http' ? 'http' : 'mock';
};

const mode = parseMode(import.meta.env.VITE_EARLY_ACCESS_API_MODE);

const createEarlyAccessApi = (): EarlyAccessApi => {
  if (mode === 'http') {
    return createHttpEarlyAccessApi();
  }
  return createMockEarlyAccessApi();
};

export const earlyAccessApi = createEarlyAccessApi();
