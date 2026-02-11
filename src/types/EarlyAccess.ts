export type EarlyAccessStep = 1 | 2 | 3;

export type AcceptanceStatus = 'ACCEPTED' | 'IN_QUEUE';

export type CommunityActionMode = 'discord' | 'email' | 'lore';

export type GuildMemberStatus = 'PENDING' | 'VERIFIED';

export interface WalletState {
  connected: boolean;
  publicKey?: string;
  signature?: string;
  verified: boolean;
}

export interface SocialState {
  xConnected: boolean;
  followingVerified: boolean;
  likeVerified: boolean;
}

export interface DiscordCommunityActionState {
  mode: 'discord';
  verified: boolean;
}

export interface EmailCommunityActionState {
  mode: 'email';
  email?: string;
  code?: string;
  codeSent: boolean;
  verified: boolean;
}

export interface LoreCommunityActionState {
  mode: 'lore';
  answer?: string;
  verified: boolean;
}

export type CommunityActionState =
  | DiscordCommunityActionState
  | EmailCommunityActionState
  | LoreCommunityActionState;

export interface AcceptanceState {
  status: AcceptanceStatus;
  score?: number;
}

export interface FounderKeyState {
  serial: number;
  keyId: string;
}

export interface GuildMemberState {
  id: string;
  display: string;
  status: GuildMemberStatus;
  isCaptain?: boolean;
}

export interface GuildState {
  code: string;
  capacity: number;
  isLocked: boolean;
  members: GuildMemberState[];
}

export interface EarlyAccessFlowState {
  step: EarlyAccessStep;
  wallet: WalletState;
  social: SocialState;
  communityAction: CommunityActionState;
  acceptance: AcceptanceState;
  founderKey?: FounderKeyState;
  guild?: GuildState;
  deepLinkGuildCode?: string;
}
