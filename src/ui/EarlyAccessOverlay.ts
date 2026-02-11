const SOLANA_WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DEFAULT_TWITTER_HANDLE = '@TheBigOneGame';
const DEFAULT_TWITTER_FOLLOW_URL = 'https://x.com/TheBigOneGame';
const DEFAULT_LIKE_TWEET_URL = 'https://x.com/TheBigOneGame/status/0000000000000000000';
const DEFAULT_CLAIM_ENDPOINT = '/api/early-access/claim-key';
const EARLY_ACCESS_CLAIMED_EVENT = 'tbo:early-access-claimed';

type EarlyAccessStep = 'wallet' | 'social' | 'claim';
type ClaimKeySource = 'remote' | 'local';

interface ClaimKeyResponse {
  key: string;
  source: ClaimKeySource;
}

interface ClaimKeyPayload {
  walletAddress: string;
  followedTwitter: boolean;
  likedTweet: boolean;
}

export interface EarlyAccessOverlayConfig {
  twitterHandle?: string;
  twitterFollowUrl?: string;
  likeTweetUrl?: string;
  claimEndpoint?: string;
}

interface EarlyAccessOverlayConfigResolved {
  twitterHandle: string;
  twitterFollowUrl: string;
  likeTweetUrl: string;
  claimEndpoint: string;
}

interface EarlyAccessClaimedDetail {
  walletAddress: string;
  key: string;
  source: ClaimKeySource;
}

export class EarlyAccessOverlay {
  private readonly container: HTMLElement;
  private readonly config: EarlyAccessOverlayConfigResolved;
  private readonly root: HTMLDivElement;
  private readonly backdrop: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly walletStep: HTMLElement;
  private readonly socialStep: HTMLElement;
  private readonly claimStep: HTMLElement;
  private readonly walletInput: HTMLInputElement;
  private readonly walletError: HTMLParagraphElement;
  private readonly walletBackButton: HTMLButtonElement;
  private readonly walletContinueButton: HTMLButtonElement;
  private readonly socialWalletValue: HTMLSpanElement;
  private readonly followLink: HTMLAnchorElement;
  private readonly likeLink: HTMLAnchorElement;
  private readonly followCheck: HTMLInputElement;
  private readonly likeCheck: HTMLInputElement;
  private readonly socialBackButton: HTMLButtonElement;
  private readonly socialContinueButton: HTMLButtonElement;
  private readonly claimWalletValue: HTMLSpanElement;
  private readonly claimBackButton: HTMLButtonElement;
  private readonly keyValue: HTMLSpanElement;
  private readonly keyStatus: HTMLParagraphElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly shareImageButton: HTMLButtonElement;
  private readonly indicatorWallet: HTMLElement;
  private readonly indicatorSocial: HTMLElement;
  private readonly indicatorClaim: HTMLElement;

  private walletAddress = '';
  private step: EarlyAccessStep = 'wallet';
  private generatedKey: string | null = null;
  private generatedKeySource: ClaimKeySource | null = null;
  private generatingKey = false;
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

  private readonly onWalletInput = (): void => {
    this.updateWalletValidationState(false);
  };

  private readonly onWalletContinueClick = (): void => {
    this.handleWalletContinue();
  };

  private readonly onWalletBackClick = (): void => {
    this.handleGoBack();
  };

  private readonly onSocialStateChange = (): void => {
    this.updateSocialContinueState();
  };

  private readonly onSocialBackClick = (): void => {
    this.handleGoBack();
  };

  private readonly onSocialContinueClick = (): void => {
    this.handleSocialContinue();
  };

  private readonly onClaimBackClick = (): void => {
    this.handleGoBack();
  };

  private readonly onCopyKeyClick = (): void => {
    void this.handleClaimKeyAction();
  };

  private readonly onShareImageClick = (): void => {
    void this.createShareableImage();
  };

  constructor(container: HTMLElement, config?: EarlyAccessOverlayConfig) {
    this.container = container;
    this.config = {
      twitterHandle: config?.twitterHandle ?? DEFAULT_TWITTER_HANDLE,
      twitterFollowUrl: config?.twitterFollowUrl ?? DEFAULT_TWITTER_FOLLOW_URL,
      likeTweetUrl: config?.likeTweetUrl ?? DEFAULT_LIKE_TWEET_URL,
      claimEndpoint: config?.claimEndpoint ?? DEFAULT_CLAIM_ENDPOINT,
    };

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
              <p class="dc-early-subtitle text-large text-normal-shadow">Verify your wallet and social actions to receive a key.</p>
            </div>
          </header>
          <button type="button" class="dc-early-close close-button" aria-label="Close early access form">&times;</button>
          <ol class="dc-early-indicator" aria-label="Sign up progress">
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="wallet">1 Wallet</li>
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="social">2 Social</li>
            <li class="dc-early-indicator-item basic-button text-normal-shadow dc-early-transparent-button" data-step-indicator="claim">3 Claim Key</li>
          </ol>
          <section class="dc-early-step" data-step="wallet">
            <label class="dc-early-label text-normal-shadow" for="dc-early-wallet-input">SOL Wallet Address</label>
            <input
              id="dc-early-wallet-input"
              class="dc-early-input basic-button text-normal-shadow menu-button-width"
              type="text"
              spellcheck="false"
              autocomplete="off"
              placeholder="Enter Solana wallet address"
            />
            <p class="dc-early-help text-normal-shadow">Use your public wallet address. Private keys are never requested.</p>
            <p class="dc-early-error text-normal-shadow" data-role="wallet-error"></p>
            <div class="dc-early-nav">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="wallet-go-back">Go back</button>
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="wallet-continue" disabled>Continue</button>
            </div>
          </section>
          <section class="dc-early-step" data-step="social">
            <p class="dc-early-help text-normal-shadow">Wallet: <span data-role="social-wallet-value"></span></p>
            <div class="dc-early-actions">
              <a class="dc-early-btn is-link basic-button text-normal-shadow menu-button-width" data-role="follow-link" target="_blank" rel="noopener noreferrer">Follow on X</a>
              <a class="dc-early-btn is-link basic-button text-normal-shadow menu-button-width" data-role="like-link" target="_blank" rel="noopener noreferrer">Like Tweet</a>
            </div>
            <label class="dc-early-check text-normal-shadow">
              <input type="checkbox" data-role="follow-check" />
              <span>I followed <span data-role="twitter-handle-value"></span></span>
            </label>
            <label class="dc-early-check text-normal-shadow">
              <input type="checkbox" data-role="like-check" />
              <span>I liked the campaign tweet</span>
            </label>
            <div class="dc-early-nav">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="social-go-back">Go back</button>
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="social-continue" disabled>Continue</button>
            </div>
          </section>
          <section class="dc-early-step" data-step="claim">
            <p class="dc-early-help text-normal-shadow">Wallet: <span data-role="claim-wallet-value"></span></p>
            <div class="dc-early-key">
              <span class="dc-early-key-value text-normal-shadow" data-role="key-value">No key generated yet</span>
              <button type="button" class="dc-early-btn is-secondary is-key-action basic-button text-normal-shadow" data-role="copy-key">Generate Access Key</button>
            </div>
            <p class="dc-early-help text-normal-shadow" data-role="key-status"></p>
            <div class="dc-early-nav">
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="claim-go-back">Go back</button>
              <button type="button" class="dc-early-btn basic-button text-normal-shadow" data-role="share-image">Mog your friends</button>
            </div>
          </section>
        </div>
      </section>
    `;
    this.container.appendChild(this.root);

    this.backdrop = this.queryRequired<HTMLDivElement>('.dc-early-backdrop');
    this.closeButton = this.queryRequired<HTMLButtonElement>('.dc-early-close');
    this.walletStep = this.queryRequired<HTMLElement>('[data-step="wallet"]');
    this.socialStep = this.queryRequired<HTMLElement>('[data-step="social"]');
    this.claimStep = this.queryRequired<HTMLElement>('[data-step="claim"]');
    this.walletInput = this.queryRequired<HTMLInputElement>('#dc-early-wallet-input');
    this.walletError = this.queryRequired<HTMLParagraphElement>('[data-role="wallet-error"]');
    this.walletBackButton = this.queryRequired<HTMLButtonElement>('[data-role="wallet-go-back"]');
    this.walletContinueButton = this.queryRequired<HTMLButtonElement>('[data-role="wallet-continue"]');
    this.socialWalletValue = this.queryRequired<HTMLSpanElement>('[data-role="social-wallet-value"]');
    this.followLink = this.queryRequired<HTMLAnchorElement>('[data-role="follow-link"]');
    this.likeLink = this.queryRequired<HTMLAnchorElement>('[data-role="like-link"]');
    this.followCheck = this.queryRequired<HTMLInputElement>('[data-role="follow-check"]');
    this.likeCheck = this.queryRequired<HTMLInputElement>('[data-role="like-check"]');
    this.socialBackButton = this.queryRequired<HTMLButtonElement>('[data-role="social-go-back"]');
    this.socialContinueButton = this.queryRequired<HTMLButtonElement>('[data-role="social-continue"]');
    this.claimWalletValue = this.queryRequired<HTMLSpanElement>('[data-role="claim-wallet-value"]');
    this.claimBackButton = this.queryRequired<HTMLButtonElement>('[data-role="claim-go-back"]');
    this.keyValue = this.queryRequired<HTMLSpanElement>('[data-role="key-value"]');
    this.keyStatus = this.queryRequired<HTMLParagraphElement>('[data-role="key-status"]');
    this.copyButton = this.queryRequired<HTMLButtonElement>('[data-role="copy-key"]');
    this.shareImageButton = this.queryRequired<HTMLButtonElement>('[data-role="share-image"]');
    this.indicatorWallet = this.queryRequired<HTMLElement>('[data-step-indicator="wallet"]');
    this.indicatorSocial = this.queryRequired<HTMLElement>('[data-step-indicator="social"]');
    this.indicatorClaim = this.queryRequired<HTMLElement>('[data-step-indicator="claim"]');

    this.followLink.href = this.config.twitterFollowUrl;
    this.likeLink.href = this.config.likeTweetUrl;
    const twitterHandleValue = this.queryRequired<HTMLElement>('[data-role="twitter-handle-value"]');
    twitterHandleValue.textContent = this.config.twitterHandle;

    this.bindEvents();
    this.syncStepUI();
    this.updateWalletValidationState(false);
    this.updateSocialContinueState();
    this.syncClaimSection();
  }

  open(): void {
    if (this.destroyed) {
      return;
    }
    this.openState = true;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    if (this.step === 'wallet') {
      this.walletInput.focus();
      this.walletInput.select();
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
    this.root.remove();
    this.openState = false;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onWindowKeydown);
    this.backdrop.addEventListener('click', this.onBackdropClick);
    this.closeButton.addEventListener('click', this.onCloseClick);
    this.walletInput.addEventListener('input', this.onWalletInput);
    this.walletBackButton.addEventListener('click', this.onWalletBackClick);
    this.walletContinueButton.addEventListener('click', this.onWalletContinueClick);
    this.followCheck.addEventListener('change', this.onSocialStateChange);
    this.likeCheck.addEventListener('change', this.onSocialStateChange);
    this.socialBackButton.addEventListener('click', this.onSocialBackClick);
    this.socialContinueButton.addEventListener('click', this.onSocialContinueClick);
    this.claimBackButton.addEventListener('click', this.onClaimBackClick);
    this.copyButton.addEventListener('click', this.onCopyKeyClick);
    this.shareImageButton.addEventListener('click', this.onShareImageClick);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.onWindowKeydown);
    this.backdrop.removeEventListener('click', this.onBackdropClick);
    this.closeButton.removeEventListener('click', this.onCloseClick);
    this.walletInput.removeEventListener('input', this.onWalletInput);
    this.walletBackButton.removeEventListener('click', this.onWalletBackClick);
    this.walletContinueButton.removeEventListener('click', this.onWalletContinueClick);
    this.followCheck.removeEventListener('change', this.onSocialStateChange);
    this.likeCheck.removeEventListener('change', this.onSocialStateChange);
    this.socialBackButton.removeEventListener('click', this.onSocialBackClick);
    this.socialContinueButton.removeEventListener('click', this.onSocialContinueClick);
    this.claimBackButton.removeEventListener('click', this.onClaimBackClick);
    this.copyButton.removeEventListener('click', this.onCopyKeyClick);
    this.shareImageButton.removeEventListener('click', this.onShareImageClick);
  }

  private handleWalletContinue(): void {
    const walletCandidate = this.walletInput.value.trim();
    if (!this.updateWalletValidationState(true)) {
      return;
    }
    if (walletCandidate !== this.walletAddress) {
      this.clearGeneratedKeyState();
    }
    this.walletAddress = walletCandidate;
    this.socialWalletValue.textContent = this.maskWalletAddress(this.walletAddress);
    this.claimWalletValue.textContent = this.maskWalletAddress(this.walletAddress);
    this.step = 'social';
    this.syncStepUI();
  }

  private handleSocialContinue(): void {
    if (!this.followCheck.checked || !this.likeCheck.checked) {
      this.updateSocialContinueState();
      return;
    }
    this.step = 'claim';
    this.syncStepUI();
  }

  private handleGoBack(): void {
    switch (this.step) {
      case 'wallet':
        this.close();
        return;
      case 'social':
        this.step = 'wallet';
        break;
      case 'claim':
        this.step = 'social';
        break;
      default:
        return;
    }

    this.syncStepUI();
    if (this.step === 'wallet') {
      this.walletInput.focus();
      this.walletInput.select();
    }
  }

  private async handleClaimKeyAction(): Promise<void> {
    if (this.generatedKey) {
      await this.copyKeyToClipboard();
      return;
    }
    await this.handleGenerateKey();
  }

  private async handleGenerateKey(): Promise<void> {
    if (this.generatingKey || !this.walletAddress) {
      return;
    }
    this.generatingKey = true;
    this.syncClaimSection();
    this.keyStatus.textContent = 'Generating your access key...';

    try {
      const result = await this.requestClaimKey({
        walletAddress: this.walletAddress,
        followedTwitter: this.followCheck.checked,
        likedTweet: this.likeCheck.checked,
      });
      this.generatedKey = result.key;
      this.generatedKeySource = result.source;
      this.keyValue.textContent = result.key;
      this.keyStatus.textContent =
        result.source === 'remote'
          ? 'Key generated and registered successfully.'
          : 'Preview key generated locally. Connect backend endpoint to issue production keys.';
      window.dispatchEvent(
        new CustomEvent<EarlyAccessClaimedDetail>(EARLY_ACCESS_CLAIMED_EVENT, {
          detail: {
            walletAddress: this.walletAddress,
            key: result.key,
            source: result.source,
          },
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate key.';
      this.keyStatus.textContent = message;
    } finally {
      this.generatingKey = false;
      this.syncClaimSection();
    }
  }

  private async requestClaimKey(payload: ClaimKeyPayload): Promise<ClaimKeyResponse> {
    try {
      const response = await fetch(this.config.claimEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { key?: unknown };
      if (typeof data.key !== 'string' || data.key.trim().length === 0) {
        throw new Error('Missing key in claim response.');
      }
      return { key: data.key.trim(), source: 'remote' };
    } catch {
      return { key: this.generateLocalKey(), source: 'local' };
    }
  }

  private async copyKeyToClipboard(): Promise<void> {
    if (!this.generatedKey) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.generatedKey);
      this.keyStatus.textContent = 'Key copied to clipboard.';
    } catch {
      this.keyStatus.textContent = 'Copy failed. Please copy the key manually.';
    }
  }

  private async createShareableImage(): Promise<void> {
    if (!this.generatedKey) {
      this.keyStatus.textContent = 'Generate an access key before creating a shareable image.';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.keyStatus.textContent = 'Share image is unavailable in this browser.';
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2f3f7a');
    gradient.addColorStop(0.55, '#4159a8');
    gradient.addColorStop(1, '#8197df');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(70, 70, canvas.width - 140, canvas.height - 140);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 64px Jost, sans-serif';
    ctx.fillText('The Big One - Early Access', 110, 120);

    ctx.font = '400 34px Jost, sans-serif';
    ctx.fillText('Wallet', 110, 240);
    ctx.font = '600 38px Jost, sans-serif';
    ctx.fillText(this.maskWalletAddress(this.walletAddress), 110, 282);

    ctx.font = '400 34px Jost, sans-serif';
    ctx.fillText('Access Key', 110, 372);
    ctx.font = '700 46px Jost, sans-serif';
    ctx.fillText(this.generatedKey, 110, 416);

    ctx.font = '400 28px Jost, sans-serif';
    ctx.fillText('Join the waitlist at thebig.one', 110, 530);

    const blob = await this.canvasToBlob(canvas);
    if (!blob) {
      this.keyStatus.textContent = 'Failed to create shareable image.';
      return;
    }

    const safeKeySlug = this.generatedKey.replace(/[^A-Za-z0-9-]+/g, '').slice(0, 20);
    const fileName = `tbo-early-access-${safeKeySlug || 'key'}.png`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.keyStatus.textContent = 'Shareable image downloaded.';
  }

  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  private clearGeneratedKeyState(): void {
    this.generatedKey = null;
    this.generatedKeySource = null;
    this.generatingKey = false;
    this.keyValue.textContent = 'No key generated yet';
    this.keyStatus.textContent = '';
    this.syncClaimSection();
  }

  private syncStepUI(): void {
    this.walletStep.classList.toggle('is-active', this.step === 'wallet');
    this.socialStep.classList.toggle('is-active', this.step === 'social');
    this.claimStep.classList.toggle('is-active', this.step === 'claim');

    this.updateIndicatorState(
      this.indicatorWallet,
      this.step === 'wallet' || this.step === 'social' || this.step === 'claim'
    );
    this.updateIndicatorState(
      this.indicatorSocial,
      this.step === 'social' || this.step === 'claim'
    );
    this.updateIndicatorState(this.indicatorClaim, this.step === 'claim');
    this.syncClaimSection();
  }

  private syncClaimSection(): void {
    const hasKey = this.generatedKey !== null;
    if (this.generatingKey) {
      this.copyButton.textContent = 'Generating...';
      this.copyButton.disabled = true;
    } else if (hasKey) {
      this.copyButton.textContent = 'Copy';
      this.copyButton.disabled = false;
    } else {
      this.copyButton.textContent = 'Generate Access Key';
      this.copyButton.disabled = !this.walletAddress;
    }
    this.shareImageButton.disabled = !hasKey || this.generatingKey;
  }

  private updateWalletValidationState(showError: boolean): boolean {
    const walletCandidate = this.walletInput.value.trim();
    const valid = this.isValidSolWalletAddress(walletCandidate);
    this.walletContinueButton.disabled = !valid;
    this.walletInput.classList.toggle('is-invalid', showError && !valid);
    if (!showError) {
      this.walletError.textContent = '';
      return valid;
    }
    this.walletError.textContent = valid ? '' : 'Enter a valid Solana wallet address.';
    return valid;
  }

  private updateSocialContinueState(): void {
    this.socialContinueButton.disabled = !(this.followCheck.checked && this.likeCheck.checked);
  }

  private isValidSolWalletAddress(value: string): boolean {
    return SOLANA_WALLET_PATTERN.test(value);
  }

  private maskWalletAddress(value: string): string {
    if (value.length <= 10) {
      return value;
    }
    return `${value.slice(0, 5)}...${value.slice(-5)}`;
  }

  private generateLocalKey(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = new Uint8Array(20);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(random);
    } else {
      for (let i = 0; i < random.length; i += 1) {
        random[i] = Math.floor(Math.random() * 256);
      }
    }

    let keyBody = '';
    for (let i = 0; i < random.length; i += 1) {
      keyBody += alphabet[random[i] % alphabet.length];
    }

    return `TBO-${keyBody.slice(0, 5)}-${keyBody.slice(5, 10)}-${keyBody.slice(10, 15)}-${keyBody.slice(15, 20)}`;
  }

  private updateIndicatorState(indicator: HTMLElement, active: boolean): void {
    indicator.classList.toggle('is-active', active);
    indicator.classList.toggle('basic-button-active', active);
  }

  private queryRequired<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing required overlay element: ${selector}`);
    }
    return element;
  }
}
