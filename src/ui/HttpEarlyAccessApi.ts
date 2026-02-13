import type {
  CreateWalletChallengePayload,
  CommunityActionPayload,
  CommunityActionResult,
  ConnectWalletResult,
  EarlyAccessApi,
  GuildCodePayload,
  GuildResult,
  KickPendingPayload,
  StatusResult,
  VerifySocialResult,
  VerifyWalletPayload,
  VerifyWalletResult,
  WalletChallengeResult,
} from './earlyAccessApiContract';
import type {
  AcceptanceState,
  AcceptanceStatus,
  GuildMemberState,
  GuildMemberStatus,
  GuildState,
} from '../types/EarlyAccess';

const DEV_WALLET_STORAGE_KEY = 'tbo:early-access:dev-wallet';
const SOLANA_CONNECT_TIMEOUT_MS = 15000;

interface ApiEnvelopeError {
  code?: string;
  message?: string;
}

interface SolanaKeyLike {
  toBase58?: () => string;
  toString?: () => string;
}

interface SolanaConnectResult {
  publicKey?: SolanaKeyLike | null;
}

interface SolanaProvider {
  connect: () => Promise<SolanaConnectResult>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeAcceptanceStatus = (value: unknown): AcceptanceStatus => {
  if (value === 'ACCEPTED' || value === 'IN_QUEUE') {
    return value;
  }
  throw new Error('Invalid acceptance status in backend response.');
};

const normalizeGuildMemberStatus = (value: unknown): GuildMemberStatus => {
  if (value === 'PENDING' || value === 'VERIFIED') {
    return value;
  }
  throw new Error('Invalid guild member status in backend response.');
};

const normalizeAcceptanceId = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const acceptanceId = asNumber(value);
  if (acceptanceId === undefined || !Number.isInteger(acceptanceId) || acceptanceId <= 0) {
    throw new Error('Invalid acceptance ID in backend response.');
  }
  return acceptanceId;
};

const normalizeLegacyFounderKeySerial = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error('Invalid acceptance ID in backend response.');
  }
  return normalizeAcceptanceId(value.serial);
};

const normalizeGuildMember = (value: unknown): GuildMemberState => {
  if (!isRecord(value)) {
    throw new Error('Invalid guild member in backend response.');
  }
  const id = asString(value.id);
  const display = asString(value.display);
  const status = normalizeGuildMemberStatus(value.status);
  const isCaptain = asBoolean(value.isCaptain);
  if (!id || !display) {
    throw new Error('Invalid guild member in backend response.');
  }
  return {
    id,
    display,
    status,
    isCaptain,
  };
};

const normalizeGuild = (value: unknown): GuildState | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error('Invalid guild in backend response.');
  }
  const code = asString(value.code);
  const capacity = asNumber(value.capacity);
  const isLocked = asBoolean(value.isLocked);
  const membersValue = value.members;
  if (!code || capacity === undefined || isLocked === undefined || !Array.isArray(membersValue)) {
    throw new Error('Invalid guild in backend response.');
  }
  return {
    code,
    capacity,
    isLocked,
    members: membersValue.map((member) => normalizeGuildMember(member)),
  };
};

const normalizeAcceptance = (value: unknown): AcceptanceState => {
  if (!isRecord(value)) {
    throw new Error('Invalid acceptance payload in backend response.');
  }
  const status = normalizeAcceptanceStatus(value.status);
  const score = asNumber(value.score);
  return {
    status,
    score,
  };
};

const normalizeStatusResult = (value: unknown): StatusResult => {
  if (!isRecord(value)) {
    throw new Error('Invalid status response from backend.');
  }
  const acceptanceId =
    normalizeAcceptanceId(value.acceptanceId) ?? normalizeLegacyFounderKeySerial(value.founderKey);
  return {
    acceptance: normalizeAcceptance(value.acceptance),
    acceptanceId,
    guild: normalizeGuild(value.guild),
  };
};

const normalizeGuildResult = (value: unknown): GuildResult => {
  const payload = isRecord(value) && 'guild' in value ? value.guild : value;
  const guild = normalizeGuild(payload);
  if (!guild) {
    throw new Error('Invalid guild response from backend.');
  }
  return { guild };
};

const normalizeVerifyWalletResult = (value: unknown): VerifyWalletResult => {
  if (!isRecord(value)) {
    throw new Error('Invalid wallet verification response from backend.');
  }
  const verified = asBoolean(value.verified);
  const flagged = asBoolean(value.flagged);
  if (verified === undefined || flagged === undefined) {
    throw new Error('Invalid wallet verification response from backend.');
  }
  return { verified, flagged };
};

const normalizeWalletChallengeResult = (value: unknown): WalletChallengeResult => {
  if (!isRecord(value)) {
    throw new Error('Invalid wallet challenge response from backend.');
  }
  const nonce = asString(value.nonce);
  const message = asString(value.message);
  const expiresAt = asString(value.expiresAt);
  if (!nonce || !message || !expiresAt) {
    throw new Error('Invalid wallet challenge response from backend.');
  }
  return { nonce, message, expiresAt };
};

const normalizeVerifySocialResult = (value: unknown): VerifySocialResult => {
  if (!isRecord(value)) {
    throw new Error('Invalid verification response from backend.');
  }
  const verified = asBoolean(value.verified);
  if (verified === undefined) {
    throw new Error('Invalid verification response from backend.');
  }
  return { verified };
};

const normalizeConnectUrl = (value: unknown): { url: string; connected?: boolean } => {
  if (!isRecord(value)) {
    throw new Error('Invalid connect URL response from backend.');
  }
  const url = asString(value.url);
  if (!url) {
    throw new Error('Invalid connect URL response from backend.');
  }
  const connected = asBoolean(value.connected);
  return { url, connected };
};

const openPopupOrThrow = (url: string, label: string): void => {
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    throw new Error(`${label} popup was blocked. Allow popups and try again.`);
  }
};

const getPublicKeyFromProviderResult = (
  result: SolanaConnectResult | null | undefined
): string | null => {
  const publicKey = result?.publicKey ?? null;
  if (!publicKey) {
    return null;
  }
  if (typeof publicKey.toBase58 === 'function') {
    return publicKey.toBase58();
  }
  if (typeof publicKey.toString === 'function') {
    return publicKey.toString();
  }
  return null;
};

const getInjectedSolanaProvider = (): SolanaProvider | null => {
  const provider = (window as Window & { solana?: SolanaProvider }).solana;
  if (!provider || typeof provider.connect !== 'function') {
    return null;
  }
  return provider;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
};

const normalizeProviderConnectError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('locked') ||
    normalized.includes('unlock') ||
    normalized.includes('password') ||
    normalized.includes('timed out')
  ) {
    return new Error('Wallet is locked. Unlock it and try Connect Wallet again.');
  }

  if (
    normalized.includes('reject') ||
    normalized.includes('denied') ||
    normalized.includes('declin') ||
    normalized.includes('cancel')
  ) {
    return new Error('Wallet connection was canceled.');
  }

  return new Error('Unable to connect wallet. Unlock your wallet and try again.');
};

const getInjectedSolanaPublicKey = async (provider: SolanaProvider): Promise<string> => {
  try {
    const result = await withTimeout(
      provider.connect(),
      SOLANA_CONNECT_TIMEOUT_MS,
      'Wallet connection timed out.'
    );
    const publicKey = getPublicKeyFromProviderResult(result);
    if (!publicKey) {
      throw new Error('Wallet public key is unavailable.');
    }
    return publicKey;
  } catch (error) {
    throw normalizeProviderConnectError(error);
  }
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const base36Fragment = (value: string, length: number): string => {
  const normalized = hashString(value).toString(36).toUpperCase();
  if (normalized.length >= length) {
    return normalized.slice(0, length);
  }
  return normalized.padEnd(length, 'X');
};

const getOrCreateDevWallet = async (): Promise<string> => {
  const provider = getInjectedSolanaProvider();
  if (provider) {
    return getInjectedSolanaPublicKey(provider);
  }
  const stored = window.localStorage.getItem(DEV_WALLET_STORAGE_KEY);
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  const generated = `${base36Fragment(navigator.userAgent, 8)}${base36Fragment(
    `${Date.now()}-${Math.random()}`,
    30
  )}`
    .replace(/0/g, 'A')
    .replace(/O/g, 'B');
  window.localStorage.setItem(DEV_WALLET_STORAGE_KEY, generated);
  return generated;
};

class HttpEarlyAccessApi implements EarlyAccessApi {
  constructor(private readonly baseUrl: string) {}

  async connectWallet(): Promise<ConnectWalletResult> {
    const publicKey = await getOrCreateDevWallet();
    return { publicKey };
  }

  async createWalletChallenge(
    payload: CreateWalletChallengePayload
  ): Promise<WalletChallengeResult> {
    const walletPublicKey = payload.publicKey.trim();
    if (!walletPublicKey) {
      throw new Error('Wallet public key is required.');
    }
    return this.request('/wallet/challenge', {
      method: 'POST',
      body: {
        walletPublicKey,
      },
      parse: normalizeWalletChallengeResult,
    });
  }

  async verifyWallet(payload: VerifyWalletPayload): Promise<VerifyWalletResult> {
    return this.request('/wallet/verify', {
      method: 'POST',
      body: {
        walletPublicKey: payload.publicKey,
        nonce: payload.nonce,
        signature: payload.signature,
      },
      parse: normalizeVerifyWalletResult,
    });
  }

  async connectX(): Promise<{ connected: boolean }> {
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ returnTo });
    const result = await this.request(`/social/x/connect-url?${params.toString()}`, {
      method: 'GET',
      parse: normalizeConnectUrl,
    });
    openPopupOrThrow(result.url, 'X authentication');
    return { connected: result.connected === true };
  }

  async verifyXFollow(): Promise<VerifySocialResult> {
    return this.request('/social/x/verify-follow', {
      method: 'POST',
      body: {},
      parse: normalizeVerifySocialResult,
    });
  }

  async verifyXLike(): Promise<VerifySocialResult> {
    return this.request('/social/x/verify-like', {
      method: 'POST',
      body: {},
      parse: normalizeVerifySocialResult,
    });
  }

  async verifyCommunityAction(payload: CommunityActionPayload): Promise<CommunityActionResult> {
    if (payload.mode !== 'telegram' && payload.mode !== 'discord') {
      throw new Error(
        `Community mode "${payload.mode}" is only available in mock mode. Use telegram for http mode.`
      );
    }
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ returnTo });
    const connect = await this.request(`/community/telegram/connect-url?${params.toString()}`, {
      method: 'GET',
      parse: normalizeConnectUrl,
    });
    openPopupOrThrow(connect.url, 'Telegram authentication');
    return this.request('/community/telegram/verify', {
      method: 'POST',
      body: {},
      parse: normalizeVerifySocialResult,
    });
  }

  async getStatus(): Promise<StatusResult> {
    return this.request('/status', {
      method: 'GET',
      parse: normalizeStatusResult,
    });
  }

  async createGuild(): Promise<GuildResult> {
    return this.request('/guild', {
      method: 'POST',
      body: {},
      parse: normalizeGuildResult,
    });
  }

  async joinGuild(payload: GuildCodePayload): Promise<GuildResult> {
    return this.request('/guild/join', {
      method: 'POST',
      body: { code: payload.code },
      parse: normalizeGuildResult,
    });
  }

  async lockGuild(payload: GuildCodePayload): Promise<GuildResult> {
    return this.request('/guild/lock', {
      method: 'POST',
      body: { code: payload.code },
      parse: normalizeGuildResult,
    });
  }

  async unlockGuild(payload: GuildCodePayload): Promise<GuildResult> {
    return this.request('/guild/unlock', {
      method: 'POST',
      body: { code: payload.code },
      parse: normalizeGuildResult,
    });
  }

  async kickPending(payload: KickPendingPayload): Promise<GuildResult> {
    return this.request('/guild/kick', {
      method: 'POST',
      body: { memberId: payload.memberId },
      parse: normalizeGuildResult,
    });
  }

  private async request<T>(configPath: string, options: {
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
    parse: (value: unknown) => T;
  }): Promise<T> {
    const url = `${this.baseUrl}${configPath.startsWith('/') ? configPath : `/${configPath}`}`;
    const init: RequestInit = {
      method: options.method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    };
    if (options.body !== undefined) {
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      };
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      throw new Error('Network request failed. Check your connection and retry.');
    }

    const payload = await this.parseResponsePayload(response);
    const data = this.unwrapEnvelope(payload, response.status);
    return options.parse(data);
  }

  private async parseResponsePayload(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.toLowerCase().includes('application/json');
    if (!isJson) {
      if (response.ok) {
        throw new Error('Backend returned a non-JSON response.');
      }
      return {
        ok: false,
        error: {
          message: `Request failed (${response.status}).`,
        },
      };
    }

    try {
      return await response.json();
    } catch {
      throw new Error('Backend returned invalid JSON.');
    }
  }

  private unwrapEnvelope(value: unknown, status: number): unknown {
    if (!isRecord(value)) {
      throw new Error(`Invalid backend response (${status}).`);
    }

    const maybeOk = value.ok;
    if (typeof maybeOk !== 'boolean') {
      if (status >= 400) {
        throw new Error(`Request failed (${status}).`);
      }
      return value;
    }

    if (maybeOk) {
      return value.data;
    }

    const error = isRecord(value.error) ? (value.error as ApiEnvelopeError) : undefined;
    const message =
      typeof error?.message === 'string' && error.message.trim().length > 0
        ? error.message
        : `Request failed (${status}).`;
    throw new Error(message);
  }
}

export const createHttpEarlyAccessApi = (baseUrl = '/v1/early-access'): EarlyAccessApi =>
  new HttpEarlyAccessApi(baseUrl);
