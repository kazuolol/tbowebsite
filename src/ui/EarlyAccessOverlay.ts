import * as THREE from 'three';
import { earlyAccessApi } from './earlyAccessApi';
import { MenuIcon3D } from './MenuIcon3D';
import type {
  AcceptanceState,
  CommunityActionMode,
  CommunityActionState,
  EarlyAccessFlowState,
  GuildMemberState,
  GuildState,
} from '../types/EarlyAccess';

const DEFAULT_TWITTER_HANDLE = '@THEBIGONEGG';
const DEFAULT_TWITTER_FOLLOW_URL = 'https://x.com/THEBIGONEGG';
const DEFAULT_LIKE_TWEET_URL = 'https://x.com/THEBIGONEGG/status/2022049710362829065';
const EARLY_ACCESS_CLAIMED_EVENT = 'tbo:early-access-claimed';
const FLOW_STORAGE_KEY = 'tbo:early-access-overlay:state:v2';
const REQUIRE_DISCORD_VERIFICATION =
  String(import.meta.env.VITE_EARLY_ACCESS_REQUIRE_DISCORD_VERIFICATION ?? 'false').toLowerCase() ===
  'true';

const COMMUNITY_ACTION_MODE: CommunityActionMode = 'discord';

const LORE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'shard', label: 'Recover the Ancient Shard' },
  { value: 'beacon', label: 'Light the Beacon of Clouds' },
  { value: 'rift', label: 'Seal the Storm Rift' },
];

interface SolanaSignResult {
  signature: Uint8Array;
}

interface SolanaProvider {
  signMessage?: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<SolanaSignResult>;
}

interface EarlyAccessClaimedDetail {
  walletPublicKey: string;
  status: AcceptanceState['status'];
  acceptanceId?: number;
  guildCode?: string;
}

export interface EarlyAccessOpenOptions {
  deepLinkGuildCode?: string;
}

export interface EarlyAccessOverlayConfig {
  twitterHandle?: string;
  twitterFollowUrl?: string;
  likeTweetUrl?: string;
}

interface EarlyAccessOverlayConfigResolved {
  twitterHandle: string;
  twitterFollowUrl: string;
  likeTweetUrl: string;
}

interface AsyncActionState {
  connectWallet: boolean;
  signWallet: boolean;
  connectX: boolean;
  verifyXFollow: boolean;
  verifyXLike: boolean;
  verifyCommunity: boolean;
  step3Status: boolean;
  guildAction: boolean;
}

export class EarlyAccessOverlay {
  private readonly container: HTMLElement;
  private readonly config: EarlyAccessOverlayConfigResolved;
  private readonly root: HTMLDivElement;
  private readonly backdrop: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly stepBody: HTMLDivElement;
  private readonly toastEl: HTMLParagraphElement;
  private readonly indicatorWallet: HTMLElement;
  private readonly indicatorSocial: HTMLElement;
  private readonly indicatorClaim: HTMLElement;
  private readonly communityActionMode: CommunityActionMode;

  private state: EarlyAccessFlowState;
  private asyncState: AsyncActionState = {
    connectWallet: false,
    signWallet: false,
    connectX: false,
    verifyXFollow: false,
    verifyXLike: false,
    verifyCommunity: false,
    step3Status: false,
    guildAction: false,
  };

  private walletNotice = '';
  private socialNotice = '';
  private claimNotice = '';
  private toastMessage = '';
  private toastTimer: number | null = null;
  private claimKeyVisualSrc: string | null = null;

  private openState = false;
  private destroyed = false;

  private readonly onWindowKeydown = (event: KeyboardEvent): void => {
    if (!this.openState || event.key !== 'Escape') {
      return;
    }
    this.close();
  };

  private readonly onBackdropClick = (): void => {
    this.close();
  };

  private readonly onCloseClick = (): void => {
    this.close();
  };

  private readonly onRootClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const button = target.closest<HTMLElement>('[data-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    if (!action) {
      return;
    }
    event.preventDefault();
    void this.handleAction(action, button);
  };

  private readonly onRootInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    const field = target.dataset.field;
    if (!field) {
      return;
    }

    if (field === 'community-email' && this.state.communityAction.mode === 'email') {
      this.state.communityAction.email = target.value.trim();
      this.state.communityAction.verified = false;
      this.persistState();
      this.render();
      return;
    }
    if (field === 'community-email-code' && this.state.communityAction.mode === 'email') {
      this.state.communityAction.code = target.value.trim();
      this.state.communityAction.verified = false;
      this.persistState();
      this.render();
    }
  };

  constructor(container: HTMLElement, config?: EarlyAccessOverlayConfig) {
    this.container = container;
    this.config = {
      twitterHandle: config?.twitterHandle ?? DEFAULT_TWITTER_HANDLE,
      twitterFollowUrl: config?.twitterFollowUrl ?? DEFAULT_TWITTER_FOLLOW_URL,
      likeTweetUrl: config?.likeTweetUrl ?? DEFAULT_LIKE_TWEET_URL,
    };
    this.communityActionMode = COMMUNITY_ACTION_MODE;
    this.state = this.restoreState();

    this.root = document.createElement('div');
    this.root.className = 'dc-early-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = `
      <div class="dc-early-backdrop"></div>
      <section class="dc-early-screen" role="dialog" aria-modal="true" aria-labelledby="dc-early-title">
        <div class="dc-overlay-card dc-early-card">
          <header class="dc-overlay-card-header dc-early-header">
            <div class="dc-early-heading">
              <h2 id="dc-early-title" class="dc-early-title text-title-large text-normal-shadow">Claim Early Access</h2>
            </div>
          </header>
          <button type="button" class="dc-early-close close-button" data-action="close" aria-label="Close early access form">&times;</button>
          <ol class="dc-early-indicator" aria-label="Sign up progress">
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="wallet">1 Wallet</li>
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="social">2 Social</li>
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="claim">3 Claim/Queue</li>
          </ol>
          <div class="dc-early-body" data-role="step-body"></div>
          <p class="dc-early-toast text-normal-shadow" data-role="toast" aria-live="polite"></p>
        </div>
      </section>
    `;
    this.container.appendChild(this.root);

    this.backdrop = this.queryRequired<HTMLDivElement>('.dc-early-backdrop');
    this.closeButton = this.queryRequired<HTMLButtonElement>('.dc-early-close');
    this.stepBody = this.queryRequired<HTMLDivElement>('[data-role="step-body"]');
    this.toastEl = this.queryRequired<HTMLParagraphElement>('[data-role="toast"]');
    this.indicatorWallet = this.queryRequired<HTMLElement>('[data-step-indicator="wallet"]');
    this.indicatorSocial = this.queryRequired<HTMLElement>('[data-step-indicator="social"]');
    this.indicatorClaim = this.queryRequired<HTMLElement>('[data-step-indicator="claim"]');

    this.bindEvents();
    this.render();
  }

  open(options?: EarlyAccessOpenOptions): void {
    if (this.destroyed) {
      return;
    }
    if (options?.deepLinkGuildCode) {
      const normalized = this.normalizeGuildCode(options.deepLinkGuildCode);
      if (normalized) {
        this.state.deepLinkGuildCode = normalized;
        this.persistState();
      }
    }
    this.openState = true;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.render();
    if (this.state.step === 3) {
      void this.refreshStepThreeStatus();
    }
  }

  close(): void {
    if (this.destroyed) {
      return;
    }
    this.openState = false;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.unbindEvents();
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.root.remove();
    this.openState = false;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onWindowKeydown);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    this.closeButton.addEventListener('click', this.onCloseClick);
    this.root.addEventListener('click', this.onRootClick);
    this.root.addEventListener('input', this.onRootInput);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.onWindowKeydown);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.root.removeEventListener('click', this.onRootClick);
    this.root.removeEventListener('input', this.onRootInput);
  }

  private render(): void {
    if (this.destroyed) {
      return;
    }
    this.updateIndicatorState(this.indicatorWallet, this.state.step >= 1);
    this.updateIndicatorState(this.indicatorSocial, this.state.step >= 2);
    this.updateIndicatorState(this.indicatorClaim, this.state.step >= 3);

    switch (this.state.step) {
      case 1:
        this.stepBody.innerHTML = this.renderWalletStep();
        break;
      case 2:
        this.stepBody.innerHTML = this.renderSocialStep();
        break;
      case 3:
      default:
        this.stepBody.innerHTML = this.renderClaimStep();
        break;
    }

    this.toastEl.textContent = this.toastMessage;
    this.toastEl.classList.toggle('is-visible', this.toastMessage.length > 0);
  }

  private renderWalletStep(): string {
    const wallet = this.state.wallet;
    const connectLabel = this.asyncState.connectWallet
      ? 'Connecting...'
      : wallet.connected
        ? 'Reconnect Wallet'
        : 'Connect Wallet';
    const signLabel = this.asyncState.signWallet ? 'Verifying...' : 'Sign to Verify';
    const canSign = wallet.connected && !this.asyncState.signWallet && !this.asyncState.connectWallet;
    const canContinue = wallet.verified && !this.asyncState.signWallet;
    return `
      <section class="dc-early-step is-active" data-step="wallet">
        <p class="dc-early-help text-normal-shadow">We will never ask for your private key. This signature only proves you own this wallet.</p>
        <div class="dc-early-step-content dc-early-step-content-centered">
          <div class="dc-early-status-list">
            <div class="dc-early-status-row dc-early-status-row-action">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="wallet-connect" ${
                this.asyncState.connectWallet ? 'disabled' : ''
              }>${this.escapeHtml(connectLabel)}</button>
              ${this.renderBadge(wallet.connected)}
            </div>
            <div class="dc-early-status-row dc-early-status-row-action">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="wallet-sign" ${
                canSign ? '' : 'disabled'
              }>${this.escapeHtml(signLabel)}</button>
              ${this.renderBadge(wallet.verified)}
            </div>
          </div>
        </div>
        ${this.renderNotice(this.walletNotice)}
        <div class="dc-early-nav">
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="step-back">Go back</button>
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="step-wallet-continue" ${
            canContinue ? '' : 'disabled'
          }>Continue</button>
        </div>
      </section>
    `;
  }

  private renderSocialStep(): string {
    const social = this.state.social;
    const community = this.state.communityAction;
    const communitySection = community.mode === 'discord' ? '' : this.renderCommunitySection();
    const canContinue = this.isSocialStepVerified();
    return `
      <section class="dc-early-step is-active" data-step="social">
        <p class="dc-early-help text-normal-shadow">Wallet: <span class="dc-early-mono">${this.escapeHtml(this.maskWalletAddress(this.state.wallet.publicKey))}</span></p>
        <div class="dc-early-step-content dc-early-step-content-centered">
          <div class="dc-early-status-list">
            <div class="dc-early-status-row dc-early-status-row-action">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="x-connect" ${
                this.asyncState.connectX ? 'disabled' : ''
              }>${this.asyncState.connectX ? 'Connecting...' : 'Connect X'}</button>
              ${this.renderBadge(social.xConnected)}
            </div>
            <div class="dc-early-status-row dc-early-status-row-action">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="x-follow" ${
                this.asyncState.verifyXFollow ? 'disabled' : ''
              }>${this.asyncState.verifyXFollow ? 'Verifying...' : `Verify Follow ${this.config.twitterHandle}`}</button>
              ${this.renderBadge(social.followingVerified)}
            </div>
            <div class="dc-early-status-row dc-early-status-row-action">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="x-like" ${
                this.asyncState.verifyXLike ? 'disabled' : ''
              }>${this.asyncState.verifyXLike ? 'Verifying...' : 'Verify Like Campaign Tweet'}</button>
              ${this.renderBadge(social.likeVerified)}
            </div>
            ${
              community.mode === 'discord' && this.isDiscordVerificationRequired()
                ? this.renderDiscordCommunityRow()
                : ''
            }
          </div>
          ${communitySection}
        </div>
        ${this.renderNotice(this.socialNotice)}
        <div class="dc-early-nav">
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="step-back">Go back</button>
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="step-social-continue" ${
            canContinue ? '' : 'disabled'
          }>Continue</button>
        </div>
      </section>
    `;
  }

  private renderDiscordCommunityRow(): string {
    const community = this.state.communityAction;
    if (community.mode !== 'discord' || !this.isDiscordVerificationRequired()) {
      return '';
    }
    return `
      <div class="dc-early-status-row dc-early-status-row-action">
        <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="community-discord-verify" ${
          this.asyncState.verifyCommunity ? 'disabled' : ''
        }>${this.asyncState.verifyCommunity ? 'Verifying...' : 'Connect Discord + Verify'}</button>
        ${this.renderBadge(community.verified)}
      </div>
    `;
  }

  private renderCommunitySection(): string {
    const community = this.state.communityAction;
    if (community.mode === 'discord') {
      return `
        <div class="dc-early-status-list">
          <div class="dc-early-status-row dc-early-status-row-action">
            <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="community-discord-verify" ${
              this.asyncState.verifyCommunity ? 'disabled' : ''
            }>${this.asyncState.verifyCommunity ? 'Verifying...' : 'Connect Discord + Verify'}</button>
            ${this.renderBadge(community.verified)}
          </div>
        </div>
      `;
    }
    if (community.mode === 'email') {
      const canSend = !this.asyncState.verifyCommunity && (community.email ?? '').length > 3;
      const canVerify =
        !this.asyncState.verifyCommunity &&
        community.codeSent &&
        (community.email ?? '').length > 3 &&
        (community.code ?? '').length > 0;
      return `
        <h3 class="dc-early-section-title text-normal-shadow">Community Action (Email)</h3>
        <div class="dc-early-email-grid">
          <input class="dc-early-input basic-button text-normal-shadow" type="email" placeholder="you@example.com" value="${this.escapeHtml(
            community.email ?? ''
          )}" data-field="community-email" />
          <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="community-email-send" ${
            canSend ? '' : 'disabled'
          }>${this.asyncState.verifyCommunity ? 'Sending...' : 'Send code'}</button>
          <input class="dc-early-input basic-button text-normal-shadow" type="text" placeholder="Enter code (mock: 424242)" value="${this.escapeHtml(
            community.code ?? ''
          )}" data-field="community-email-code" />
          <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="community-email-verify" ${
            canVerify ? '' : 'disabled'
          }>${this.asyncState.verifyCommunity ? 'Verifying...' : 'Verify'}</button>
        </div>
        <div class="dc-early-status-row">
          <span class="text-normal-shadow">Email Verified</span>
          ${this.renderBadge(community.verified)}
        </div>
      `;
    }
    const selectedAnswer = community.answer ?? '';
    const canSubmitLore = !this.asyncState.verifyCommunity && selectedAnswer.length > 0;
    return `
      <h3 class="dc-early-section-title text-normal-shadow">Community Action (Lore)</h3>
      <div class="dc-early-lore-options">
        ${LORE_OPTIONS.map((option) => {
          const active = selectedAnswer === option.value ? 'is-selected' : '';
          return `<button type="button" class="dc-early-lore-option basic-button text-normal-shadow ${active}" data-action="community-lore-answer" data-answer="${option.value}">${this.escapeHtml(option.label)}</button>`;
        }).join('')}
      </div>
      <div class="dc-early-status-row dc-early-status-row-action">
        <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="community-lore-submit" ${
          canSubmitLore ? '' : 'disabled'
        }>${this.asyncState.verifyCommunity ? 'Submitting...' : 'Submit answer'}</button>
        ${this.renderBadge(community.verified)}
      </div>
    `;
  }

  private renderClaimStep(): string {
    const isAccepted = this.state.acceptance.status === 'ACCEPTED';
    const statusNotice = this.asyncState.step3Status ? 'Checking status...' : this.claimNotice;
    const body = isAccepted ? this.renderAcceptedContent() : this.renderQueueContent();
    return `
      <section class="dc-early-step is-active" data-step="claim">
        <p class="dc-early-help text-normal-shadow">Wallet: <span class="dc-early-mono">${this.escapeHtml(this.maskWalletAddress(this.state.wallet.publicKey))}</span></p>
        <div class="dc-early-step-content dc-early-step-content-centered">
          ${body}
        </div>
        ${this.renderNotice(statusNotice)}
        <div class="dc-early-nav">
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="step-back">Go back</button>
          <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-action="claim-refresh" ${
            this.asyncState.step3Status ? 'disabled' : ''
          }>${this.asyncState.step3Status ? 'Refreshing...' : 'Refresh status'}</button>
        </div>
      </section>
    `;
  }

  private renderAcceptedContent(): string {
    const acceptanceId = this.state.acceptanceId;
    const idLabel = acceptanceId ? `#${acceptanceId}` : 'Not assigned';
    const keyVisualSrc = this.getClaimKeyVisualSrc();
    const keyVisualHtml = keyVisualSrc
      ? `<img class="dc-early-keymog-image" src="${this.escapeHtml(keyVisualSrc)}" alt="The Big One 3D key model" />`
      : '<div class="dc-early-keymog-fallback text-normal-shadow">KEY</div>';
    return `
      <h3 class="dc-early-claim-title text-normal-shadow">Access Granted</h3>
      <div class="dc-early-claim-card">
        <p class="dc-early-help text-normal-shadow">Early Access ID: <span class="dc-early-mono">${this.escapeHtml(idLabel)}</span></p>
        <div class="dc-early-keymog-card">
          <div class="dc-early-keymog-inline">
            <p class="dc-early-keymog-title text-normal-shadow">Keymog your friends!</p>
            ${keyVisualHtml}
            <button type="button" class="dc-early-btn basic-button text-normal-shadow dc-early-keymog-copy-btn" data-action="keymog-copy-image">Share</button>
          </div>
        </div>
      </div>
      ${this.renderAcceptedGuildPanel()}
    `;
  }

  private renderAcceptedGuildPanel(): string {
    const guild = this.state.guild;
    if (!guild) {
      const deepLinkCode = this.state.deepLinkGuildCode;
      const hasDeepLink = typeof deepLinkCode === 'string' && deepLinkCode.length > 0;
      return `
        <div class="dc-early-guild-card">
          <h4 class="dc-early-section-title text-normal-shadow">Guild Captain Panel</h4>
          ${
            hasDeepLink
              ? `<p class="dc-early-help text-normal-shadow">Invite code detected: <span class="dc-early-mono">${this.escapeHtml(
                  deepLinkCode ?? ''
                )}</span></p>`
              : '<p class="dc-early-help text-normal-shadow">Create a guild link and invite by sharing <span class="dc-early-mono">/claim?guild=CODE</span>.</p>'
          }
          <div class="dc-early-guild-actions">
            ${
              hasDeepLink
                ? `<button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="guild-join" data-guild-code="${this.escapeHtml(
                    deepLinkCode ?? ''
                  )}" ${this.asyncState.guildAction ? 'disabled' : ''}>${
                    this.asyncState.guildAction ? 'Working...' : 'Join Guild'
                  }</button>`
                : ''
            }
            <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="guild-create" ${
              this.asyncState.guildAction ? 'disabled' : ''
            }>${this.asyncState.guildAction ? 'Working...' : 'Create Guild'}</button>
          </div>
        </div>
      `;
    }

    const verified = this.getVerifiedCount(guild);
    const isCaptain = this.isCaptain(guild);
    const pendingMembers = guild.members.filter((member) => member.status === 'PENDING');
    const visibleMembers = guild.members.filter((member) => !member.isCaptain);
    const progress = Math.min(100, (verified / Math.max(1, guild.capacity)) * 100);
    return `
      <div class="dc-early-guild-card">
        <h4 class="dc-early-section-title text-normal-shadow">Guild Captain Panel</h4>
        <p class="dc-early-help text-normal-shadow">Guild Code: <span class="dc-early-mono">${this.escapeHtml(guild.code)}</span></p>
        <div class="dc-early-guild-actions">
          <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="guild-copy-link">Copy Guild Link</button>
          ${
            isCaptain
              ? `<button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="${
                  guild.isLocked ? 'guild-unlock' : 'guild-lock'
                }" ${this.asyncState.guildAction ? 'disabled' : ''}>${
                  guild.isLocked ? 'Unlock Guild' : 'Lock Guild'
                }</button>`
              : ''
          }
        </div>
        <div class="dc-early-progress">
          <div class="dc-early-progress-track"><div class="dc-early-progress-fill" style="width:${progress.toFixed(2)}%"></div></div>
          <p class="dc-early-help text-normal-shadow">${verified}/${guild.capacity} verified members</p>
        </div>
        ${
          visibleMembers.length > 0
            ? `<ul class="dc-early-member-list">
          ${visibleMembers
            .map((member) => {
              const canKick = isCaptain && !member.isCaptain && member.status === 'PENDING';
              return `
                  <li class="dc-early-member-item">
                    <span class="dc-early-member-name text-normal-shadow">${this.escapeHtml(member.display)}${
                      member.isCaptain ? ' (Captain)' : ''
                    }</span>
                    <span class="dc-early-inline">${this.renderBadge(member.status === 'VERIFIED')}</span>
                    ${
                      canKick
                        ? `<button type="button" class="dc-early-btn basic-button text-normal-shadow dc-early-mini-btn" data-action="guild-kick" data-member-id="${this.escapeHtml(
                            member.id
                          )}" ${this.asyncState.guildAction ? 'disabled' : ''}>Kick</button>`
                        : ''
                    }
                  </li>
                `;
            })
            .join('')}
        </ul>`
            : ''
        }
        ${
          pendingMembers.length > 0
            ? `<p class="dc-early-help text-normal-shadow">${pendingMembers.length} pending member(s) waiting for verification.</p>`
            : ''
        }
      </div>
    `;
  }

  private renderQueueContent(): string {
    const guild = this.state.guild;
    const deepLinkCode = this.state.deepLinkGuildCode;
    const verificationChecklist = [
      { label: 'Wallet verified', verified: this.state.wallet.verified },
      { label: 'X follow + like verified', verified: this.isXComplete() },
      { label: 'Community action complete', verified: this.isCommunityComplete() },
    ];
    const checklistHtml = verificationChecklist
      .map(
        (item) => `
          <li class="dc-early-status-row">
            <span class="text-normal-shadow">${this.escapeHtml(item.label)}</span>
            ${this.renderBadge(item.verified)}
          </li>
        `
      )
      .join('');

    const guildCard = guild
      ? this.renderQueueGuildCard(guild)
      : deepLinkCode
        ? `
            <div class="dc-early-guild-card">
              <h4 class="dc-early-section-title text-normal-shadow">Guild Invite</h4>
              <p class="dc-early-help text-normal-shadow">Invite code detected: <span class="dc-early-mono">${this.escapeHtml(
                deepLinkCode
              )}</span></p>
              <button type="button" class="dc-early-btn basic-button text-normal-shadow menu-button-width" data-action="guild-join" data-guild-code="${this.escapeHtml(
                deepLinkCode
              )}" ${this.asyncState.guildAction ? 'disabled' : ''}>Join Guild</button>
            </div>
          `
        : `
            <div class="dc-early-guild-card">
              <h4 class="dc-early-section-title text-normal-shadow">Guild</h4>
              <p class="dc-early-help text-normal-shadow">No invite selected. Join via link: <span class="dc-early-mono">/claim?guild=CODE</span></p>
            </div>
          `;

    return `
      <h3 class="dc-early-claim-title text-normal-shadow">You're in the queue.</h3>
      <ul class="dc-early-status-list">${checklistHtml}</ul>
      ${guildCard}
    `;
  }

  private renderQueueGuildCard(guild: GuildState): string {
    const verified = this.getVerifiedCount(guild);
    const progress = Math.min(100, (verified / Math.max(1, guild.capacity)) * 100);
    const myMember = this.getCurrentMember(guild);
    return `
      <div class="dc-early-guild-card">
        <h4 class="dc-early-section-title text-normal-shadow">Guild</h4>
        <p class="dc-early-help text-normal-shadow">Code: <span class="dc-early-mono">${this.escapeHtml(guild.code)}</span></p>
        <div class="dc-early-progress">
          <div class="dc-early-progress-track"><div class="dc-early-progress-fill" style="width:${progress.toFixed(2)}%"></div></div>
          <p class="dc-early-help text-normal-shadow">${verified}/${guild.capacity} verified members</p>
          <p class="dc-early-help text-normal-shadow">Your membership: <strong>${this.escapeHtml(
            myMember?.status ?? 'PENDING'
          )}</strong></p>
        </div>
        <ul class="dc-early-member-list">
          ${guild.members
            .map(
              (member) => `
                <li class="dc-early-member-item">
                  <span class="dc-early-member-name text-normal-shadow">${this.escapeHtml(member.display)}${
                    member.isCaptain ? ' (Captain)' : ''
                  }</span>
                  <span class="dc-early-inline">${this.renderBadge(member.status === 'VERIFIED')}</span>
                </li>
              `
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  private async handleAction(action: string, target: HTMLElement): Promise<void> {
    switch (action) {
      case 'close':
        this.close();
        return;
      case 'step-back':
        this.handleStepBack();
        return;
      case 'step-wallet-continue':
        this.handleWalletContinue();
        return;
      case 'step-social-continue':
        await this.handleSocialContinue();
        return;
      case 'wallet-connect':
        await this.handleWalletConnect();
        return;
      case 'wallet-sign':
        await this.handleWalletSign();
        return;
      case 'x-connect':
        await this.handleConnectX();
        return;
      case 'x-follow':
        await this.handleVerifyXFollow();
        return;
      case 'x-like':
        await this.handleVerifyXLike();
        return;
      case 'community-discord-verify':
        await this.handleVerifyDiscord();
        return;
      case 'community-email-send':
        await this.handleSendEmailCode();
        return;
      case 'community-email-verify':
        await this.handleVerifyEmailCode();
        return;
      case 'community-lore-answer': {
        const answer = target.dataset.answer ?? '';
        this.handleSelectLoreAnswer(answer);
        return;
      }
      case 'community-lore-submit':
        await this.handleSubmitLoreAnswer();
        return;
      case 'claim-refresh':
        await this.refreshStepThreeStatus();
        return;
      case 'keymog-copy-image':
        await this.handleCopyKeymogImage();
        return;
      case 'guild-create':
        await this.handleCreateGuild();
        return;
      case 'guild-copy-link':
        await this.handleCopyGuildLink();
        return;
      case 'guild-join':
        await this.handleJoinGuild(target.dataset.guildCode);
        return;
      case 'guild-lock':
        await this.handleToggleGuildLock(true);
        return;
      case 'guild-unlock':
        await this.handleToggleGuildLock(false);
        return;
      case 'guild-kick':
        await this.handleKickPending(target.dataset.memberId);
        return;
      default:
        return;
    }
  }

  private handleStepBack(): void {
    if (this.state.step === 1) {
      this.close();
      return;
    }
    if (this.state.step === 2) {
      this.state.step = 1;
    } else {
      this.state.step = 2;
    }
    this.persistState();
    this.render();
  }

  private handleWalletContinue(): void {
    if (!this.state.wallet.verified) {
      this.walletNotice = 'Connect and verify your wallet first.';
      this.render();
      return;
    }
    this.state.step = 2;
    this.walletNotice = '';
    this.persistState();
    this.render();
  }

  private async handleSocialContinue(): Promise<void> {
    if (!this.isSocialStepVerified()) {
      this.socialNotice = 'Complete all required verifications before continuing.';
      this.render();
      return;
    }
    this.socialNotice = '';
    this.state.step = 3;
    this.persistState();
    this.render();
    await this.refreshStepThreeStatus();
  }

  private async handleWalletConnect(): Promise<void> {
    if (this.asyncState.connectWallet) {
      return;
    }
    this.asyncState.connectWallet = true;
    this.walletNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.connectWallet();
      const changedWallet = this.state.wallet.publicKey !== result.publicKey;
      this.state.wallet.connected = true;
      this.state.wallet.publicKey = result.publicKey;
      this.state.wallet.signature = undefined;
      this.state.wallet.verified = false;
      if (changedWallet) {
        this.resetDownstreamFlowState();
      }
      this.walletNotice = 'Wallet connected. Sign to verify ownership.';
      this.persistState();
    } catch (error) {
      this.walletNotice =
        error instanceof Error ? error.message : 'Wallet connection was canceled.';
    } finally {
      this.asyncState.connectWallet = false;
      this.render();
    }
  }

  private async handleWalletSign(): Promise<void> {
    if (this.asyncState.signWallet) {
      return;
    }
    const publicKey = this.state.wallet.publicKey;
    if (!publicKey) {
      this.walletNotice = 'Connect your wallet first.';
      this.render();
      return;
    }
    this.asyncState.signWallet = true;
    this.walletNotice = '';
    this.render();
    try {
      const challenge = await earlyAccessApi.createWalletChallenge({ publicKey });
      const signature = await this.signWalletOwnership(publicKey, challenge.message);
      const result = await earlyAccessApi.verifyWallet({
        publicKey,
        nonce: challenge.nonce,
        signature,
      });
      this.state.wallet.connected = true;
      this.state.wallet.signature = signature;
      this.state.wallet.verified = result.verified;
      this.walletNotice = result.verified
        ? 'Wallet verified successfully.'
        : 'Wallet verification failed.';
      this.persistState();
    } catch (error) {
      this.walletNotice =
        error instanceof Error ? error.message : 'Wallet signature verification failed.';
    } finally {
      this.asyncState.signWallet = false;
      this.render();
    }
  }

  private async handleConnectX(): Promise<void> {
    if (this.asyncState.connectX) {
      return;
    }
    this.asyncState.connectX = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.connectX();
      if (result.connected) {
        this.state.social.xConnected = true;
        this.socialNotice = 'X account already connected. Verify follow and like to continue.';
        this.persistState();
      } else {
        this.socialNotice =
          'Finish X authentication in the popup, then run follow/like verification.';
      }
    } catch (error) {
      this.socialNotice = error instanceof Error ? error.message : 'Failed to connect X account.';
    } finally {
      this.asyncState.connectX = false;
      this.render();
    }
  }

  private async handleVerifyXFollow(): Promise<void> {
    if (this.asyncState.verifyXFollow) {
      return;
    }
    this.asyncState.verifyXFollow = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyXFollow();
      this.state.social.xConnected = this.state.social.xConnected || result.verified;
      this.state.social.followingVerified = result.verified;
      this.socialNotice = result.verified
        ? `Follow verification complete for ${this.config.twitterHandle}.`
        : `Follow not detected for ${this.config.twitterHandle} yet. Complete it on X and try again.`;
      this.persistState();
    } catch (error) {
      this.socialNotice = error instanceof Error ? error.message : 'Follow verification failed.';
    } finally {
      this.asyncState.verifyXFollow = false;
      this.render();
    }
  }

  private async handleVerifyXLike(): Promise<void> {
    if (this.asyncState.verifyXLike) {
      return;
    }
    this.asyncState.verifyXLike = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyXLike();
      this.state.social.xConnected = this.state.social.xConnected || result.verified;
      this.state.social.likeVerified = result.verified;
      this.socialNotice = result.verified
        ? 'Campaign tweet like verified.'
        : 'Campaign tweet like not detected yet. Complete it on X and try again.';
      this.persistState();
    } catch (error) {
      this.socialNotice = error instanceof Error ? error.message : 'Like verification failed.';
    } finally {
      this.asyncState.verifyXLike = false;
      this.render();
    }
  }

  private async handleVerifyDiscord(): Promise<void> {
    if (this.asyncState.verifyCommunity || this.state.communityAction.mode !== 'discord') {
      return;
    }
    this.asyncState.verifyCommunity = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyCommunityAction({
        mode: 'discord',
      });
      this.state.communityAction.verified = result.verified;
      this.socialNotice = result.verified
        ? 'Discord verification complete.'
        : 'Discord verification failed.';
      this.persistState();
    } catch (error) {
      this.socialNotice =
        error instanceof Error ? error.message : 'Discord verification failed.';
    } finally {
      this.asyncState.verifyCommunity = false;
      this.render();
    }
  }

  private async handleSendEmailCode(): Promise<void> {
    if (this.asyncState.verifyCommunity || this.state.communityAction.mode !== 'email') {
      return;
    }
    const email = this.state.communityAction.email?.trim() ?? '';
    if (!email.includes('@')) {
      this.socialNotice = 'Enter a valid email before requesting a code.';
      this.render();
      return;
    }
    this.asyncState.verifyCommunity = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyCommunityAction({
        mode: 'email',
        email,
      });
      this.state.communityAction.codeSent = !!result.codeSent;
      this.state.communityAction.verified = false;
      this.socialNotice = result.codeSent
        ? 'Verification code sent. Use mock code 424242.'
        : 'Could not send verification code.';
      this.persistState();
    } catch (error) {
      this.socialNotice =
        error instanceof Error ? error.message : 'Could not send verification code.';
    } finally {
      this.asyncState.verifyCommunity = false;
      this.render();
    }
  }

  private async handleVerifyEmailCode(): Promise<void> {
    if (this.asyncState.verifyCommunity || this.state.communityAction.mode !== 'email') {
      return;
    }
    const email = this.state.communityAction.email?.trim() ?? '';
    const code = this.state.communityAction.code?.trim() ?? '';
    if (!email.includes('@') || code.length === 0) {
      this.socialNotice = 'Enter both email and verification code.';
      this.render();
      return;
    }
    this.asyncState.verifyCommunity = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyCommunityAction({
        mode: 'email',
        email,
        code,
      });
      this.state.communityAction.verified = result.verified;
      this.socialNotice = result.verified
        ? 'Email verification complete.'
        : 'Verification code did not match.';
      this.persistState();
    } catch (error) {
      this.socialNotice =
        error instanceof Error ? error.message : 'Email verification failed.';
    } finally {
      this.asyncState.verifyCommunity = false;
      this.render();
    }
  }

  private handleSelectLoreAnswer(answer: string): void {
    if (this.state.communityAction.mode !== 'lore') {
      return;
    }
    this.state.communityAction.answer = answer;
    this.state.communityAction.verified = false;
    this.persistState();
    this.render();
  }

  private async handleSubmitLoreAnswer(): Promise<void> {
    if (this.asyncState.verifyCommunity || this.state.communityAction.mode !== 'lore') {
      return;
    }
    const answer = this.state.communityAction.answer?.trim() ?? '';
    if (!answer) {
      this.socialNotice = 'Choose an option before submitting.';
      this.render();
      return;
    }
    this.asyncState.verifyCommunity = true;
    this.socialNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.verifyCommunityAction({
        mode: 'lore',
        answer,
      });
      this.state.communityAction.verified = result.verified;
      this.socialNotice = result.verified
        ? 'Lore answer verified.'
        : 'Lore answer incorrect.';
      this.persistState();
    } catch (error) {
      this.socialNotice =
        error instanceof Error ? error.message : 'Lore verification failed.';
    } finally {
      this.asyncState.verifyCommunity = false;
      this.render();
    }
  }

  private async refreshStepThreeStatus(): Promise<void> {
    if (this.asyncState.step3Status) {
      return;
    }
    this.asyncState.step3Status = true;
    this.claimNotice = '';
    this.render();
    try {
      await this.refreshStatusCacheFromBackend();
      this.claimNotice =
        this.state.acceptance.status === 'ACCEPTED'
          ? 'Access granted. Your Early Access ID is ready.'
          : "You're in the queue. We'll update this status as slots open.";
    } catch (error) {
      this.claimNotice = error instanceof Error ? error.message : 'Unable to refresh claim status.';
    } finally {
      this.asyncState.step3Status = false;
      this.render();
    }
  }

  private async handleCopyKeymogImage(): Promise<void> {
    const dataUrl = this.createKeymogShareImage();
    if (!dataUrl) {
      this.claimNotice = 'Unable to generate image. Try again.';
      this.render();
      return;
    }
    const copiedImage = await this.copyImageToClipboard(dataUrl);
    if (copiedImage) {
      this.showToast('Image copied.');
      return;
    }
    const copiedText = await this.copyToClipboard(dataUrl);
    if (copiedText) {
      this.showToast('Image data copied.');
      return;
    }
    this.claimNotice = 'Copy failed. Clipboard image access was blocked.';
    this.render();
  }

  private async handleCreateGuild(): Promise<void> {
    if (this.asyncState.guildAction) {
      return;
    }
    this.asyncState.guildAction = true;
    this.claimNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.createGuild();
      this.state.guild = result.guild;
      this.persistState();
      await this.refreshStatusCacheFromBackend().catch(() => undefined);
      this.claimNotice = 'Guild created.';
    } catch (error) {
      this.claimNotice = error instanceof Error ? error.message : 'Could not create guild.';
    } finally {
      this.asyncState.guildAction = false;
      this.render();
    }
  }

  private async handleJoinGuild(codeMaybe: string | undefined): Promise<void> {
    if (this.asyncState.guildAction) {
      return;
    }
    const rawCode = codeMaybe ?? this.state.deepLinkGuildCode;
    const code = rawCode ? this.normalizeGuildCode(rawCode) : undefined;
    if (!code) {
      this.claimNotice = 'Invalid guild code.';
      this.render();
      return;
    }
    this.asyncState.guildAction = true;
    this.claimNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.joinGuild({ code });
      this.state.guild = result.guild;
      this.state.deepLinkGuildCode = undefined;
      this.persistState();
      await this.refreshStatusCacheFromBackend().catch(() => undefined);
      this.claimNotice = 'Joined guild.';
    } catch (error) {
      this.claimNotice = error instanceof Error ? error.message : 'Could not join guild.';
      this.render();
    } finally {
      this.asyncState.guildAction = false;
      this.render();
    }
  }

  private async handleCopyGuildLink(): Promise<void> {
    const code = this.state.guild?.code;
    if (!code) {
      return;
    }
    const link = `/claim?guild=${encodeURIComponent(code)}`;
    const copied = await this.copyToClipboard(link);
    if (copied) {
      this.showToast('Guild link copied.');
    } else {
      this.claimNotice = 'Copy failed. Copy the guild link manually.';
      this.render();
    }
  }

  private async handleToggleGuildLock(lock: boolean): Promise<void> {
    if (this.asyncState.guildAction) {
      return;
    }
    const code = this.state.guild?.code;
    if (!code) {
      return;
    }
    this.asyncState.guildAction = true;
    this.claimNotice = '';
    this.render();
    try {
      const result = lock
        ? await earlyAccessApi.lockGuild({ code })
        : await earlyAccessApi.unlockGuild({ code });
      this.state.guild = result.guild;
      this.persistState();
      await this.refreshStatusCacheFromBackend().catch(() => undefined);
      this.claimNotice = lock ? 'Guild locked.' : 'Guild unlocked.';
    } catch (error) {
      this.claimNotice =
        error instanceof Error ? error.message : 'Could not update guild lock state.';
    } finally {
      this.asyncState.guildAction = false;
      this.render();
    }
  }

  private async handleKickPending(memberId: string | undefined): Promise<void> {
    if (!memberId || this.asyncState.guildAction) {
      return;
    }
    this.asyncState.guildAction = true;
    this.claimNotice = '';
    this.render();
    try {
      const result = await earlyAccessApi.kickPending({ memberId });
      this.state.guild = result.guild;
      this.persistState();
      await this.refreshStatusCacheFromBackend().catch(() => undefined);
      this.claimNotice = 'Pending member removed.';
    } catch (error) {
      this.claimNotice =
        error instanceof Error ? error.message : 'Unable to remove member.';
    } finally {
      this.asyncState.guildAction = false;
      this.render();
    }
  }

  private async signWalletOwnership(publicKey: string, message: string): Promise<string> {
    const provider = (window as Window & { solana?: SolanaProvider }).solana;
    if (provider?.signMessage) {
      const bytes = new TextEncoder().encode(message);
      const signed = await provider.signMessage(bytes, 'utf8');
      return this.uint8ToBase64(signed.signature);
    }
    return `mock-signature-${this.base36Fragment(`${publicKey}:${message}`, 22)}`;
  }

  private dispatchClaimedEvent(
    acceptance: AcceptanceState,
    acceptanceId?: number,
    guildCode?: string
  ): void {
    const walletPublicKey = this.state.wallet.publicKey;
    if (!walletPublicKey) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent<EarlyAccessClaimedDetail>(EARLY_ACCESS_CLAIMED_EVENT, {
        detail: {
          walletPublicKey,
          status: acceptance.status,
          acceptanceId,
          guildCode,
        },
      })
    );
  }

  private async copyToClipboard(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  private async copyImageToClipboard(dataUrl: string): Promise<boolean> {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      return false;
    }
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageType = blob.type || 'image/png';
      const item = new ClipboardItem({ [imageType]: blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      return false;
    }
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = '';
      this.toastTimer = null;
      this.render();
    }, 2200);
    this.render();
  }

  private isSocialStepVerified(): boolean {
    return this.isXComplete() && this.isCommunityComplete();
  }

  private isXComplete(): boolean {
    return (
      this.state.social.followingVerified &&
      this.state.social.likeVerified
    );
  }

  private isCommunityComplete(): boolean {
    if (this.state.communityAction.mode === 'discord' && !this.isDiscordVerificationRequired()) {
      return true;
    }
    return this.state.communityAction.verified;
  }

  private isDiscordVerificationRequired(): boolean {
    return this.communityActionMode === 'discord' && REQUIRE_DISCORD_VERIFICATION;
  }

  private resetDownstreamFlowState(): void {
    this.state.step = 1;
    this.state.social = {
      xConnected: false,
      followingVerified: false,
      likeVerified: false,
    };
    this.state.communityAction = this.createDefaultCommunityAction(this.communityActionMode);
    this.state.acceptance = { status: 'IN_QUEUE' };
    this.state.acceptanceId = undefined;
    this.state.guild = undefined;
    this.socialNotice = '';
    this.claimNotice = '';
  }

  private createDefaultFlowState(): EarlyAccessFlowState {
    return {
      step: 1,
      wallet: {
        connected: false,
        verified: false,
      },
      social: {
        xConnected: false,
        followingVerified: false,
        likeVerified: false,
      },
      communityAction: this.createDefaultCommunityAction(this.communityActionMode),
      acceptance: {
        status: 'IN_QUEUE',
      },
      acceptanceId: undefined,
      guild: undefined,
      deepLinkGuildCode: undefined,
    };
  }

  private createDefaultCommunityAction(mode: CommunityActionMode): CommunityActionState {
    if (mode === 'discord') {
      return {
        mode: 'discord',
        verified: !this.isDiscordVerificationRequired(),
      };
    }
    if (mode === 'email') {
      return {
        mode: 'email',
        verified: false,
        codeSent: false,
      };
    }
    return {
      mode: 'lore',
      verified: false,
    };
  }

  private restoreState(): EarlyAccessFlowState {
    const fallback = this.createDefaultFlowState();
    try {
      const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<EarlyAccessFlowState>;
      const step = parsed.step === 1 || parsed.step === 2 || parsed.step === 3 ? parsed.step : 1;
      const wallet = {
        connected: parsed.wallet?.connected === true,
        publicKey: parsed.wallet?.publicKey,
        signature: parsed.wallet?.signature,
        verified: parsed.wallet?.verified === true,
      };
      const social = {
        xConnected: parsed.social?.xConnected === true,
        followingVerified: parsed.social?.followingVerified === true,
        likeVerified: parsed.social?.likeVerified === true,
      };
      const acceptanceStatus =
        parsed.acceptance?.status === 'ACCEPTED' || parsed.acceptance?.status === 'IN_QUEUE'
          ? parsed.acceptance.status
          : 'IN_QUEUE';
      const acceptance: AcceptanceState = {
        status: acceptanceStatus,
        score: parsed.acceptance?.score,
      };
      const parsedWithLegacy = parsed as Partial<EarlyAccessFlowState> & {
        founderKey?: { serial?: unknown };
      };
      const acceptanceId =
        this.normalizeAcceptanceId(parsed.acceptanceId) ??
        this.normalizeAcceptanceId(parsedWithLegacy.founderKey?.serial);

      const community =
        parsed.communityAction?.mode === this.communityActionMode
          ? this.normalizeCommunityState(parsed.communityAction)
          : this.createDefaultCommunityAction(this.communityActionMode);

      return {
        step,
        wallet,
        social,
        communityAction: community,
        acceptance,
        acceptanceId,
        guild: parsed.guild,
        deepLinkGuildCode: this.normalizeGuildCode(parsed.deepLinkGuildCode),
      };
    } catch {
      return fallback;
    }
  }

  private normalizeCommunityState(input: Partial<CommunityActionState>): CommunityActionState {
    if (input.mode === 'discord') {
      return {
        mode: 'discord',
        verified: this.isDiscordVerificationRequired() ? input.verified === true : true,
      };
    }
    if (input.mode === 'email') {
      const maybeEmail = 'email' in input && typeof input.email === 'string' ? input.email : undefined;
      const maybeCode = 'code' in input && typeof input.code === 'string' ? input.code : undefined;
      return {
        mode: 'email',
        email: maybeEmail,
        code: maybeCode,
        codeSent: input.codeSent === true,
        verified: input.verified === true,
      };
    }
    const maybeAnswer =
      'answer' in input && typeof input.answer === 'string' ? input.answer : undefined;
    return {
      mode: 'lore',
      answer: maybeAnswer,
      verified: input.verified === true,
    };
  }

  private persistState(): void {
    try {
      window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage failures.
    }
  }

  private async refreshStatusCacheFromBackend(): Promise<void> {
    const result = await earlyAccessApi.getStatus();
    this.applyStatusResult(result);
    this.persistState();
  }

  private applyStatusResult(result: {
    acceptance: AcceptanceState;
    acceptanceId?: number;
    guild?: GuildState;
  }): void {
    this.state.acceptance = result.acceptance;
    this.state.acceptanceId = result.acceptanceId;
    this.state.guild = result.guild;
    if (result.acceptance.status === 'ACCEPTED' && this.state.wallet.publicKey) {
      this.dispatchClaimedEvent(result.acceptance, result.acceptanceId, result.guild?.code);
    }
  }

  private isCaptain(guild: GuildState): boolean {
    const current = this.getCurrentMember(guild);
    return current?.isCaptain === true;
  }

  private getCurrentMember(guild: GuildState): GuildMemberState | undefined {
    const publicKey = this.state.wallet.publicKey;
    if (!publicKey) {
      return undefined;
    }
    const currentMemberId = this.sessionIdForWallet(publicKey);
    return guild.members.find((member) => member.id === currentMemberId);
  }

  private getVerifiedCount(guild: GuildState): number {
    return guild.members.filter((member) => member.status === 'VERIFIED').length;
  }

  private sessionIdForWallet(publicKey: string): string {
    return `wallet-${publicKey}`;
  }

  private updateIndicatorState(indicator: HTMLElement, active: boolean): void {
    indicator.classList.toggle('is-active', active);
    indicator.classList.toggle('basic-button-active', active);
  }

  private maskWalletAddress(value?: string): string {
    if (!value) {
      return 'Not connected';
    }
    if (value.length <= 10) {
      return value;
    }
    return `${value.slice(0, 5)}...${value.slice(-5)}`;
  }

  private normalizeGuildCode(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,20}$/.test(normalized)) {
      return undefined;
    }
    return normalized;
  }

  private normalizeAcceptanceId(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return undefined;
    }
    return value;
  }

  private getClaimKeyVisualSrc(): string {
    if (this.claimKeyVisualSrc !== null) {
      return this.claimKeyVisualSrc;
    }

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 256;
    iconCanvas.height = 256;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const icon = new MenuIcon3D(iconCanvas, 'key');

    try {
      renderer.setSize(256, 256, false);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      icon.update(0.016, renderer);
      this.claimKeyVisualSrc = iconCanvas.toDataURL('image/png');
      return this.claimKeyVisualSrc;
    } catch {
      this.claimKeyVisualSrc = '';
      return this.claimKeyVisualSrc;
    } finally {
      icon.dispose();
      renderer.dispose();
    }
  }

  private createKeymogShareImage(): string | null {
    const acceptanceId = this.state.acceptanceId;
    const idText = acceptanceId ? `ID #${acceptanceId}` : 'ID pending';

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 256;
    iconCanvas.height = 256;
    const shareCanvas = document.createElement('canvas');
    shareCanvas.width = 560;
    shareCanvas.height = 256;
    const shareCtx = shareCanvas.getContext('2d');
    if (!shareCtx) {
      return null;
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const icon = new MenuIcon3D(iconCanvas, 'key');

    try {
      renderer.setSize(256, 256, false);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      icon.update(0.016, renderer);

      shareCtx.clearRect(0, 0, shareCanvas.width, shareCanvas.height);
      shareCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      shareCtx.fillRect(0, 0, shareCanvas.width, shareCanvas.height);
      shareCtx.drawImage(iconCanvas, 0, 0, 256, 256);
      shareCtx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      shareCtx.font = '500 28px Jost, sans-serif';
      shareCtx.fillText('Keymog your friends!', 268, 106);
      shareCtx.font = '600 42px Jost, sans-serif';
      shareCtx.fillText(idText, 268, 160);
      return shareCanvas.toDataURL('image/png');
    } catch {
      return null;
    } finally {
      icon.dispose();
      renderer.dispose();
    }
  }

  private renderBadge(verified: boolean): string {
    const className = verified ? 'is-verified' : 'is-not-verified';
    const label = verified ? 'Verified' : 'Not Verified';
    return `<span class="dc-early-badge text-normal-shadow ${className}">${label}</span>`;
  }

  private renderNotice(message: string): string {
    return `<p class="dc-early-help dc-early-notice text-normal-shadow">${this.escapeHtml(message)}</p>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private uint8ToBase64(value: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < value.length; i += 1) {
      binary += String.fromCharCode(value[i]);
    }
    return btoa(binary);
  }

  private base36Fragment(value: string, length: number): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    const normalized = Math.abs(hash).toString(36).toUpperCase();
    if (normalized.length >= length) {
      return normalized.slice(0, length);
    }
    return normalized.padEnd(length, 'X');
  }

  private queryRequired<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing required overlay element: ${selector}`);
    }
    return element;
  }
}
