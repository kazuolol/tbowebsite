import { Modal } from './Modal';
import { SignupFlow } from './SignupFlow';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  colorClass: string;
}

export class DreamcastMenu {
  private container: HTMLElement;
  private modal: Modal;
  private signupFlow: SignupFlow | null = null;
  private clockInterval: number | null = null;

  private menuItems: MenuItem[] = [
    {
      id: 'signup',
      label: 'Signup / Login',
      colorClass: 'dc-pill-btn--signup',
      icon: this.createUserIcon()
    },
    {
      id: 'play',
      label: 'Play',
      colorClass: 'dc-pill-btn--play',
      icon: this.createPlayIcon()
    },
    {
      id: 'early',
      label: 'Early Access',
      colorClass: 'dc-pill-btn--early',
      icon: this.createStarIcon()
    }
  ];

  constructor(container: HTMLElement) {
    this.container = container;
    this.modal = new Modal(container);
    this.render();
  }

  private render(): void {
    // Create header
    const header = this.createHeader();
    this.container.appendChild(header);

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.className = 'dc-menu-container';

    this.menuItems.forEach(item => {
      const menuItem = this.createMenuItem(item);
      menuContainer.appendChild(menuItem);
    });

    this.container.appendChild(menuContainer);

    // Setup modal close handler to reset signup flow
    this.modal.onClose(() => {
      // Reset signup flow when modal closes
      setTimeout(() => {
        if (this.signupFlow) {
          this.signupFlow.reset();
        }
      }, 300);
    });
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'dc-header';

    const title = document.createElement('span');
    title.className = 'dc-title';
    title.textContent = 'The Big One';

    const datetime = document.createElement('span');
    datetime.className = 'dc-datetime';
    this.updateDateTime(datetime);

    // Update clock every second
    this.clockInterval = window.setInterval(() => {
      this.updateDateTime(datetime);
    }, 1000);

    header.appendChild(title);
    header.appendChild(datetime);

    return header;
  }

  private updateDateTime(element: HTMLElement): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    element.textContent = now.toLocaleDateString('en-US', options);
  }

  private createMenuItem(item: MenuItem): HTMLElement {
    const menuItem = document.createElement('div');
    menuItem.className = 'dc-menu-item';

    const iconFloat = document.createElement('div');
    iconFloat.className = 'dc-icon-float';
    iconFloat.innerHTML = item.icon;

    const button = document.createElement('button');
    button.className = `dc-pill-btn ${item.colorClass}`;
    button.textContent = item.label;

    menuItem.appendChild(iconFloat);
    menuItem.appendChild(button);

    // Click handler
    menuItem.addEventListener('click', () => this.handleMenuClick(item.id));

    return menuItem;
  }

  private handleMenuClick(id: string): void {
    switch (id) {
      case 'signup':
      case 'early':
        this.openSignupModal(id === 'early' ? 'Early Access' : 'Sign Up');
        break;
      case 'play':
        this.openComingSoonModal();
        break;
    }
  }

  private openSignupModal(title: string): void {
    this.modal.clearContent();
    this.modal.setTitle(title);
    this.signupFlow = new SignupFlow(this.modal.getContentContainer());
    this.modal.open();
  }

  private openComingSoonModal(): void {
    this.modal.clearContent();
    this.modal.setTitle('Play');

    const content = this.modal.getContentContainer();
    content.innerHTML = `
      <div class="dc-coming-soon">
        <div class="dc-coming-soon-icon">🎮</div>
        <div class="dc-coming-soon-text">Coming Soon</div>
        <div class="dc-signup-line dim" style="margin-top: 12px;">
          Sign up for early access to be first in line!
        </div>
      </div>
    `;

    this.modal.open();
  }

  private createUserIcon(): string {
    // Ethereal user silhouette with soft 3D effect
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="userGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f0c0b0"/>
            <stop offset="40%" stop-color="#e8a090"/>
            <stop offset="100%" stop-color="#c87868"/>
          </linearGradient>
          <linearGradient id="userHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </linearGradient>
          <filter id="userSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#a06050" flood-opacity="0.3"/>
          </filter>
        </defs>
        <!-- Body -->
        <ellipse cx="32" cy="48" rx="20" ry="14" fill="url(#userGrad)" filter="url(#userSoftShadow)"/>
        <ellipse cx="32" cy="46" rx="18" ry="10" fill="url(#userHighlight)"/>
        <!-- Head -->
        <circle cx="32" cy="22" r="14" fill="url(#userGrad)" filter="url(#userSoftShadow)"/>
        <ellipse cx="32" cy="18" rx="10" ry="8" fill="url(#userHighlight)"/>
      </svg>
    `;
  }

  private createPlayIcon(): string {
    // Ethereal play button with soft glow effect
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="playGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#a0e0d0"/>
            <stop offset="40%" stop-color="#7cc5b8"/>
            <stop offset="100%" stop-color="#50a090"/>
          </linearGradient>
          <linearGradient id="playHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
            <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
          </linearGradient>
          <filter id="playSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#408070" flood-opacity="0.3"/>
          </filter>
        </defs>
        <!-- Circle base -->
        <circle cx="32" cy="32" r="28" fill="url(#playGrad)" filter="url(#playSoftShadow)"/>
        <!-- Highlight -->
        <ellipse cx="32" cy="24" rx="22" ry="16" fill="url(#playHighlight)"/>
        <!-- Play triangle with subtle shadow -->
        <path d="M26 20v24l20-12L26 20z" fill="white" fill-opacity="0.95"/>
        <path d="M27 22v20l16-10L27 22z" fill="rgba(255,255,255,0.3)"/>
      </svg>
    `;
  }

  private createStarIcon(): string {
    // Ethereal star with soft 3D glow
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#d0c0e8"/>
            <stop offset="40%" stop-color="#b8a0d0"/>
            <stop offset="100%" stop-color="#8870a8"/>
          </linearGradient>
          <linearGradient id="starHighlight" x1="50%" y1="0%" x2="50%" y2="60%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </linearGradient>
          <filter id="starSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#705890" flood-opacity="0.3"/>
          </filter>
        </defs>
        <!-- Star base -->
        <path d="M32 6l7 18h19l-15.5 11.5 5.5 18.5L32 44 15 54l5.5-18.5L6 24h19L32 6z"
              fill="url(#starGrad)" filter="url(#starSoftShadow)"/>
        <!-- Star highlight -->
        <path d="M32 10l5 14h14l-11 8 3 12-11-8-11 8 3-12-11-8h14L32 10z"
              fill="url(#starHighlight)"/>
      </svg>
    `;
  }

  public destroy(): void {
    if (this.clockInterval) {
      window.clearInterval(this.clockInterval);
    }
  }
}
