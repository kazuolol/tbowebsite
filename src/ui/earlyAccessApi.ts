import type {
  AcceptanceState,
  AcceptanceStatus,
  CommunityActionMode,
  FounderKeyState,
  GuildState,
} from '../types/EarlyAccess';

const MOCK_STATE_STORAGE_KEY = 'tbo:early-access-api:mock-state:v1';
const MOCK_CLIENT_ID_STORAGE_KEY = 'tbo:early-access-api:client-id:v1';
const MOCK_EMAIL_CODE = '424242';
const LATENCY_MIN_MS = 300;
const LATENCY_MAX_MS = 800;
const DEFAULT_GUILD_CAPACITY = 5;

type MockAcceptanceOverride = AcceptanceStatus | 'seeded';

interface VerifyWalletPayload {
  publicKey: string;
  signature: string;
}

interface VerifyWalletResult {
  verified: boolean;
  flagged: boolean;
}

interface CommunityActionPayload {
  mode: CommunityActionMode;
  email?: string;
  code?: string;
  answer?: string;
}

interface CommunityActionResult {
  verified: boolean;
  codeSent?: boolean;
}

interface GuildCodePayload {
  code: string;
}

interface KickPendingPayload {
  memberId: string;
}

interface StatusResult {
  acceptance: AcceptanceState;
  founderKey?: FounderKeyState;
  guild?: GuildState;
}

interface MockSessionState {
  id: string;
  publicKey?: string;
  signature?: string;
  walletVerified: boolean;
  walletFlagged: boolean;
  xConnected: boolean;
  xFollowVerified: boolean;
  xLikeVerified: boolean;
  communityMode: CommunityActionMode;
  communityVerified: boolean;
  guildCode?: string;
  founderKey?: FounderKeyState;
}

interface MockGuildMemberState {
  id: string;
  display: string;
  status: 'PENDING' | 'VERIFIED';
  isCaptain?: boolean;
  pendingCycles: number;
}

interface MockGuildRecord {
  code: string;
  capacity: number;
  isLocked: boolean;
  members: MockGuildMemberState[];
}

interface MockStateShape {
  activeSessionId: string;
  acceptanceOverride: MockAcceptanceOverride;
  sessions: Record<string, MockSessionState>;
  guilds: Record<string, MockGuildRecord>;
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

const resolveAcceptanceOverride = (): MockAcceptanceOverride => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('tboMockAcceptance')?.trim().toUpperCase();
  if (fromQuery === 'ACCEPTED' || fromQuery === 'QUEUE' || fromQuery === 'IN_QUEUE') {
    return fromQuery === 'ACCEPTED' ? 'ACCEPTED' : 'IN_QUEUE';
  }
  return 'seeded';
};

const randomLatencyMs = (): number =>
  LATENCY_MIN_MS + Math.floor(Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS + 1));

const wait = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

const createClientId = (): string => {
  const seeded = `${Date.now()}-${Math.random()}-${navigator.userAgent}`;
  return `client-${base36Fragment(seeded, 10)}`;
};

const getStoredClientId = (): string => {
  try {
    const existing = window.localStorage.getItem(MOCK_CLIENT_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }
    const created = createClientId();
    window.localStorage.setItem(MOCK_CLIENT_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return createClientId();
  }
};

const createDefaultMockState = (): MockStateShape => {
  const clientId = getStoredClientId();
  return {
    activeSessionId: clientId,
    acceptanceOverride: resolveAcceptanceOverride(),
    sessions: {
      [clientId]: {
        id: clientId,
        walletVerified: false,
        walletFlagged: false,
        xConnected: false,
        xFollowVerified: false,
        xLikeVerified: false,
        communityMode: 'discord',
        communityVerified: false,
      },
    },
    guilds: {},
  };
};

const normalizeGuildCode = (value: string): string => value.trim().toUpperCase();

const readMockState = (): MockStateShape => {
  try {
    const raw = window.localStorage.getItem(MOCK_STATE_STORAGE_KEY);
    if (!raw) {
      return createDefaultMockState();
    }
    const parsed = JSON.parse(raw) as Partial<MockStateShape>;
    const fallback = createDefaultMockState();
    const sessions = parsed.sessions ?? {};
    if (!sessions[fallback.activeSessionId]) {
      sessions[fallback.activeSessionId] = fallback.sessions[fallback.activeSessionId];
    }
    return {
      activeSessionId: parsed.activeSessionId ?? fallback.activeSessionId,
      acceptanceOverride: resolveAcceptanceOverride(),
      sessions,
      guilds: parsed.guilds ?? {},
    };
  } catch {
    return createDefaultMockState();
  }
};

const writeMockState = (state: MockStateShape): void => {
  try {
    window.localStorage.setItem(MOCK_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
};

const getActiveSession = (state: MockStateShape): MockSessionState => {
  const id = state.activeSessionId;
  if (!state.sessions[id]) {
    state.sessions[id] = {
      id,
      walletVerified: false,
      walletFlagged: false,
      xConnected: false,
      xFollowVerified: false,
      xLikeVerified: false,
      communityMode: 'discord',
      communityVerified: false,
    };
  }
  return state.sessions[id];
};

const deriveSessionIdFromWallet = (publicKey: string): string => `wallet-${publicKey}`;

const isVerificationComplete = (session: MockSessionState): boolean =>
  session.walletVerified &&
  session.xConnected &&
  session.xFollowVerified &&
  session.xLikeVerified &&
  session.communityVerified &&
  !session.walletFlagged;

const resolveSeededAcceptance = (session: MockSessionState): AcceptanceStatus => {
  const seed = session.publicKey ?? session.id;
  return hashString(seed) % 2 === 0 ? 'ACCEPTED' : 'IN_QUEUE';
};

const resolveAcceptanceForSession = (
  session: MockSessionState,
  acceptanceOverride: MockAcceptanceOverride
): AcceptanceState => {
  if (!isVerificationComplete(session)) {
    return { status: 'IN_QUEUE', score: 0 };
  }

  const status =
    acceptanceOverride === 'seeded' ? resolveSeededAcceptance(session) : acceptanceOverride;
  const score = 60 + (hashString(`${session.id}:${status}`) % 41);
  return { status, score };
};

const getOrCreateFounderKey = (session: MockSessionState): FounderKeyState => {
  if (session.founderKey) {
    return session.founderKey;
  }
  const serial = 1000 + (hashString(session.id) % 9000);
  const segmentA = base36Fragment(`${session.id}:A`, 4);
  const segmentB = base36Fragment(`${session.id}:B`, 4);
  const segmentC = base36Fragment(`${session.id}:C`, 4);
  const keyId = `FK-${segmentA}-${segmentB}-${segmentC}`;
  const founderKey: FounderKeyState = { serial, keyId };
  session.founderKey = founderKey;
  return founderKey;
};

const toGuildState = (record: MockGuildRecord): GuildState => ({
  code: record.code,
  capacity: record.capacity,
  isLocked: record.isLocked,
  members: record.members.map((member) => ({
    id: member.id,
    display: member.display,
    status: member.status,
    isCaptain: member.isCaptain,
  })),
});

const verifiedMemberCount = (guild: MockGuildRecord): number =>
  guild.members.filter((member) => member.status === 'VERIFIED').length;

const displayNameForSession = (session: MockSessionState): string => {
  const publicKey = session.publicKey;
  if (!publicKey || publicKey.length < 8) {
    return `Player-${base36Fragment(session.id, 4)}`;
  }
  return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
};

const reconcileGuildMembership = (state: MockStateShape, session: MockSessionState): void => {
  const guildCode = session.guildCode;
  if (!guildCode) {
    return;
  }
  const guild = state.guilds[guildCode];
  if (!guild) {
    session.guildCode = undefined;
    return;
  }

  const member = guild.members.find((item) => item.id === session.id);
  if (!member) {
    session.guildCode = undefined;
    return;
  }

  const complete = isVerificationComplete(session);
  if (!complete || guild.isLocked) {
    return;
  }
  if (member.status === 'VERIFIED') {
    return;
  }
  if (member.pendingCycles > 0) {
    member.pendingCycles -= 1;
    return;
  }
  if (verifiedMemberCount(guild) >= guild.capacity) {
    return;
  }
  member.status = 'VERIFIED';
};

const resolveGuild = (state: MockStateShape, session: MockSessionState): GuildState | undefined => {
  reconcileGuildMembership(state, session);
  if (!session.guildCode) {
    return undefined;
  }
  const guild = state.guilds[session.guildCode];
  if (!guild) {
    return undefined;
  }
  return toGuildState(guild);
};

const requireGuildForSession = (state: MockStateShape, session: MockSessionState): MockGuildRecord => {
  const code = session.guildCode;
  if (!code) {
    throw new Error('No guild for current user.');
  }
  const guild = state.guilds[code];
  if (!guild) {
    throw new Error('Guild no longer exists.');
  }
  return guild;
};

const assertCaptain = (guild: MockGuildRecord, sessionId: string): void => {
  const member = guild.members.find((item) => item.id === sessionId);
  if (!member?.isCaptain) {
    throw new Error('Captain permissions are required for this action.');
  }
};

const createGuildCode = (state: MockStateShape, seed: string): string => {
  let index = 0;
  while (index < 50) {
    const code = `G${base36Fragment(`${seed}:${index}`, 5)}`;
    if (!state.guilds[code]) {
      return code;
    }
    index += 1;
  }
  return `G${base36Fragment(`${seed}:fallback:${Date.now()}`, 5)}`;
};

const getPublicKeyFromProviderResult = (result: SolanaConnectResult | null | undefined): string | null => {
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

const getInjectedSolanaPublicKey = async (): Promise<string | null> => {
  const provider = (window as Window & { solana?: SolanaProvider }).solana;
  if (!provider || typeof provider.connect !== 'function') {
    return null;
  }
  try {
    const result = await provider.connect();
    return getPublicKeyFromProviderResult(result);
  } catch {
    return null;
  }
};

const getOrCreateDevWallet = async (): Promise<string> => {
  const fromProvider = await getInjectedSolanaPublicKey();
  if (fromProvider) {
    return fromProvider;
  }
  const stored = window.localStorage.getItem('tbo:early-access:dev-wallet');
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  const generated = `${base36Fragment(navigator.userAgent, 8)}${base36Fragment(
    `${Date.now()}-${Math.random()}`,
    30
  )}`
    .replace(/0/g, 'A')
    .replace(/O/g, 'B');
  window.localStorage.setItem('tbo:early-access:dev-wallet', generated);
  return generated;
};

const executeWithState = async <T>(
  task: (state: MockStateShape, session: MockSessionState) => T
): Promise<T> => {
  await wait(randomLatencyMs());
  const state = readMockState();
  state.acceptanceOverride = resolveAcceptanceOverride();
  const session = getActiveSession(state);
  const result = task(state, session);
  writeMockState(state);
  return result;
};

export const earlyAccessApi = {
  async connectWallet(): Promise<{ publicKey: string }> {
    const publicKey = await getOrCreateDevWallet();
    return { publicKey };
  },

  async verifyWallet(payload: VerifyWalletPayload): Promise<VerifyWalletResult> {
    return executeWithState((state, session) => {
      const normalizedPublicKey = payload.publicKey.trim();
      if (!normalizedPublicKey || !payload.signature.trim()) {
        return { verified: false, flagged: false };
      }

      const nextSessionId = deriveSessionIdFromWallet(normalizedPublicKey);
      const existing = state.sessions[nextSessionId];
      const target: MockSessionState =
        existing ??
        ({
          id: nextSessionId,
          walletVerified: false,
          walletFlagged: false,
          xConnected: false,
          xFollowVerified: false,
          xLikeVerified: false,
          communityMode: session.communityMode,
          communityVerified: false,
        } satisfies MockSessionState);

      target.publicKey = normalizedPublicKey;
      target.signature = payload.signature.trim();
      target.walletVerified = true;
      target.walletFlagged = false;
      state.sessions[nextSessionId] = target;
      state.activeSessionId = nextSessionId;
      return { verified: true, flagged: false };
    });
  },

  async connectX(): Promise<{ connected: boolean }> {
    return executeWithState((_state, session) => {
      session.xConnected = true;
      return { connected: true };
    });
  },

  async verifyXFollow(): Promise<{ verified: boolean }> {
    return executeWithState((_state, session) => {
      if (!session.xConnected) {
        return { verified: false };
      }
      session.xFollowVerified = true;
      return { verified: true };
    });
  },

  async verifyXLike(): Promise<{ verified: boolean }> {
    return executeWithState((_state, session) => {
      if (!session.xConnected) {
        return { verified: false };
      }
      session.xLikeVerified = true;
      return { verified: true };
    });
  },

  async verifyCommunityAction(payload: CommunityActionPayload): Promise<CommunityActionResult> {
    return executeWithState((_state, session) => {
      session.communityMode = payload.mode;
      switch (payload.mode) {
        case 'discord':
          session.communityVerified = true;
          return { verified: true };
        case 'email': {
          const email = payload.email?.trim() ?? '';
          if (!email.includes('@')) {
            session.communityVerified = false;
            return { verified: false, codeSent: false };
          }
          if (!payload.code) {
            session.communityVerified = false;
            return { verified: false, codeSent: true };
          }
          const verified = payload.code.trim() === MOCK_EMAIL_CODE;
          session.communityVerified = verified;
          return { verified, codeSent: true };
        }
        case 'lore': {
          const normalized = (payload.answer ?? '').trim().toLowerCase();
          const verified = normalized === 'shard';
          session.communityVerified = verified;
          return { verified };
        }
        default:
          return { verified: false };
      }
    });
  },

  async getStatus(): Promise<StatusResult> {
    return executeWithState((state, session) => {
      const acceptance = resolveAcceptanceForSession(session, state.acceptanceOverride);
      const founderKey =
        acceptance.status === 'ACCEPTED' ? getOrCreateFounderKey(session) : undefined;
      const guild = resolveGuild(state, session);
      return { acceptance, founderKey, guild };
    });
  },

  async createGuild(): Promise<{ guild: GuildState }> {
    return executeWithState((state, session) => {
      if (session.guildCode && state.guilds[session.guildCode]) {
        return { guild: toGuildState(state.guilds[session.guildCode]) };
      }

      const code = createGuildCode(state, session.id);
      const complete = isVerificationComplete(session);
      const guild: MockGuildRecord = {
        code,
        capacity: DEFAULT_GUILD_CAPACITY,
        isLocked: false,
        members: [
          {
            id: session.id,
            display: displayNameForSession(session),
            status: complete ? 'VERIFIED' : 'PENDING',
            isCaptain: true,
            pendingCycles: 0,
          },
        ],
      };
      state.guilds[code] = guild;
      session.guildCode = code;
      return { guild: toGuildState(guild) };
    });
  },

  async joinGuild(payload: GuildCodePayload): Promise<{ guild: GuildState }> {
    return executeWithState((state, session) => {
      const code = normalizeGuildCode(payload.code);
      const guild = state.guilds[code];
      if (!guild) {
        throw new Error('Guild not found.');
      }

      const existingMember = guild.members.find((member) => member.id === session.id);
      if (!existingMember) {
        if (guild.isLocked) {
          throw new Error('Guild is locked.');
        }
        guild.members.push({
          id: session.id,
          display: displayNameForSession(session),
          status: 'PENDING',
          pendingCycles: 1,
        });
      }

      session.guildCode = code;
      return { guild: toGuildState(guild) };
    });
  },

  async lockGuild(payload: GuildCodePayload): Promise<{ guild: GuildState }> {
    return executeWithState((state, session) => {
      const code = normalizeGuildCode(payload.code);
      const guild = state.guilds[code];
      if (!guild) {
        throw new Error('Guild not found.');
      }
      assertCaptain(guild, session.id);
      guild.isLocked = true;
      return { guild: toGuildState(guild) };
    });
  },

  async unlockGuild(payload: GuildCodePayload): Promise<{ guild: GuildState }> {
    return executeWithState((state, session) => {
      const code = normalizeGuildCode(payload.code);
      const guild = state.guilds[code];
      if (!guild) {
        throw new Error('Guild not found.');
      }
      assertCaptain(guild, session.id);
      guild.isLocked = false;
      return { guild: toGuildState(guild) };
    });
  },

  async kickPending(payload: KickPendingPayload): Promise<{ guild: GuildState }> {
    return executeWithState((state, session) => {
      const guild = requireGuildForSession(state, session);
      assertCaptain(guild, session.id);

      const targetIndex = guild.members.findIndex((member) => member.id === payload.memberId);
      if (targetIndex < 0) {
        return { guild: toGuildState(guild) };
      }
      const target = guild.members[targetIndex];
      if (target.isCaptain || target.status !== 'PENDING') {
        return { guild: toGuildState(guild) };
      }

      guild.members.splice(targetIndex, 1);
      const targetSession = state.sessions[target.id];
      if (targetSession?.guildCode === guild.code) {
        targetSession.guildCode = undefined;
      }
      return { guild: toGuildState(guild) };
    });
  },
};
