import type {
  AcceptanceState,
  CommunityActionMode,
  GuildState,
} from '../types/EarlyAccess';

export type EarlyAccessApiMode = 'mock' | 'http';

export interface CreateWalletChallengePayload {
  publicKey: string;
}

export interface WalletChallengeResult {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface VerifyWalletPayload {
  publicKey: string;
  nonce: string;
  signature: string;
}

export interface VerifyWalletResult {
  verified: boolean;
  flagged: boolean;
}

export interface CommunityActionPayload {
  mode: CommunityActionMode;
  email?: string;
  code?: string;
  answer?: string;
}

export interface CommunityActionResult {
  verified: boolean;
  codeSent?: boolean;
}

export interface GuildCodePayload {
  code: string;
}

export interface KickPendingPayload {
  memberId: string;
}

export interface StatusResult {
  acceptance: AcceptanceState;
  acceptanceId?: number;
  guild?: GuildState;
}

export interface ConnectWalletResult {
  publicKey: string;
}

export interface ConnectXResult {
  connected: boolean;
}

export interface VerifySocialResult {
  verified: boolean;
}

export interface GuildResult {
  guild: GuildState;
}

export interface EarlyAccessApi {
  connectWallet(): Promise<ConnectWalletResult>;
  createWalletChallenge(
    payload: CreateWalletChallengePayload
  ): Promise<WalletChallengeResult>;
  verifyWallet(payload: VerifyWalletPayload): Promise<VerifyWalletResult>;
  connectX(): Promise<ConnectXResult>;
  verifyXFollow(): Promise<VerifySocialResult>;
  verifyXLike(): Promise<VerifySocialResult>;
  verifyCommunityAction(payload: CommunityActionPayload): Promise<CommunityActionResult>;
  getStatus(): Promise<StatusResult>;
  createGuild(): Promise<GuildResult>;
  joinGuild(payload: GuildCodePayload): Promise<GuildResult>;
  lockGuild(payload: GuildCodePayload): Promise<GuildResult>;
  unlockGuild(payload: GuildCodePayload): Promise<GuildResult>;
  kickPending(payload: KickPendingPayload): Promise<GuildResult>;
}
