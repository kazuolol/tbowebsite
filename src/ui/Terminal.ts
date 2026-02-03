import { Typewriter } from './Typewriter';

type TerminalState = 'intro' | 'email' | 'otp' | 'success' | 'error';

export class Terminal {
  private container: HTMLElement;
  private contentElement: HTMLElement | null = null;
  private state: TerminalState = 'intro';
  private email: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="terminal">
        <div class="terminal-scanline"></div>
        <div class="terminal-titlebar">
          <span class="terminal-title">Early Access</span>
          <div class="terminal-dots">
            <div class="terminal-dot active"></div>
            <div class="terminal-dot"></div>
            <div class="terminal-dot"></div>
          </div>
        </div>
        <div class="terminal-content"></div>
      </div>
    `;

    this.contentElement = this.container.querySelector('.terminal-content');
    this.startIntro();
  }

  private async startIntro(): Promise<void> {
    if (!this.contentElement) return;

    // First line
    const line1 = document.createElement('div');
    line1.className = 'terminal-line info';
    this.contentElement.appendChild(line1);

    const typewriter1 = new Typewriter(line1, 'System initializing...');
    await typewriter1.start();
    typewriter1.removeCursor();

    await this.delay(300);

    // Second line
    const line2 = document.createElement('div');
    line2.className = 'terminal-line';
    this.contentElement.appendChild(line2);

    const typewriter2 = new Typewriter(line2, 'Welcome, Player.');
    await typewriter2.start();
    typewriter2.removeCursor();

    await this.delay(250);

    // Third line
    const line3 = document.createElement('div');
    line3.className = 'terminal-line dim';
    this.contentElement.appendChild(line3);

    const typewriter3 = new Typewriter(line3, 'Enter your email to join the queue.');
    await typewriter3.start();
    typewriter3.removeCursor();

    await this.delay(150);

    // Show email input
    this.showEmailInput();
  }

  private showEmailInput(): void {
    if (!this.contentElement) return;
    this.state = 'email';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'terminal-input-wrapper';
    inputWrapper.innerHTML = `
      <span class="terminal-prompt-symbol">></span>
      <input type="email" class="terminal-input" placeholder="email@address.com" autocomplete="email" />
    `;

    this.contentElement.appendChild(inputWrapper);

    const input = inputWrapper.querySelector('.terminal-input') as HTMLInputElement;
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleEmailSubmit(input.value);
      }
    });
  }

  private async handleEmailSubmit(email: string): Promise<void> {
    if (!this.contentElement) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showError('Invalid format. Try again.');
      return;
    }

    this.email = email;

    // Remove input
    const inputWrapper = this.contentElement.querySelector('.terminal-input-wrapper');
    if (inputWrapper) {
      inputWrapper.remove();
    }

    // Show submitted email
    const emailLine = document.createElement('div');
    emailLine.className = 'terminal-line prompt';
    emailLine.textContent = `> ${email}`;
    this.contentElement.appendChild(emailLine);

    await this.delay(200);

    // Show sending message
    const sendingLine = document.createElement('div');
    sendingLine.className = 'terminal-line info';
    this.contentElement.appendChild(sendingLine);

    const typewriter = new Typewriter(sendingLine, 'Transmitting verification code...');
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(500);

    // Simulate OTP sent
    this.showOTPInput();
  }

  private async showOTPInput(): Promise<void> {
    if (!this.contentElement) return;
    this.state = 'otp';

    const successLine = document.createElement('div');
    successLine.className = 'terminal-line success';
    this.contentElement.appendChild(successLine);

    const typewriter = new Typewriter(successLine, 'Code dispatched. Check inbox.');
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(150);

    // OTP container
    const otpContainer = document.createElement('div');
    otpContainer.className = 'otp-container';

    for (let i = 0; i < 6; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'otp-input';
      input.setAttribute('data-index', i.toString());
      otpContainer.appendChild(input);
    }

    this.contentElement.appendChild(otpContainer);

    // Setup OTP input handlers
    this.setupOTPInputs(otpContainer);

    // Focus first input
    const firstInput = otpContainer.querySelector('.otp-input') as HTMLInputElement;
    firstInput?.focus();
  }

  private setupOTPInputs(container: HTMLElement): void {
    const inputs = container.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;

    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;

        // Move to next input
        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }

        // Check if all filled
        const otp = Array.from(inputs).map(i => i.value).join('');
        if (otp.length === 6) {
          this.handleOTPSubmit(otp);
        }
      });

      input.addEventListener('keydown', (e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });

      // Handle paste
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData?.getData('text') || '';
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);

        digits.split('').forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
          }
        });

        if (digits.length === 6) {
          this.handleOTPSubmit(digits);
        } else if (digits.length > 0) {
          inputs[Math.min(digits.length, 5)].focus();
        }
      });
    });
  }

  private async handleOTPSubmit(otp: string): Promise<void> {
    if (!this.contentElement) return;

    // Disable inputs
    const inputs = this.contentElement.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => input.disabled = true);

    await this.delay(200);

    // Show verifying message
    const verifyingLine = document.createElement('div');
    verifyingLine.className = 'terminal-line info';
    this.contentElement.appendChild(verifyingLine);

    const typewriter = new Typewriter(verifyingLine, 'Authenticating...');
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(600);

    // Simulate verification (in real app, this would validate with backend)
    this.showSuccess();
  }

  private async showSuccess(): Promise<void> {
    if (!this.contentElement) return;
    this.state = 'success';

    // Remove OTP container
    const otpContainer = this.contentElement.querySelector('.otp-container');
    if (otpContainer) {
      otpContainer.remove();
    }

    const successLine = document.createElement('div');
    successLine.className = 'terminal-line success';
    this.contentElement.appendChild(successLine);

    const typewriter = new Typewriter(successLine, 'Authentication complete.');
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(250);

    const finalLine = document.createElement('div');
    finalLine.className = 'terminal-line';
    this.contentElement.appendChild(finalLine);

    const typewriter2 = new Typewriter(finalLine, 'You have been added to the queue.');
    await typewriter2.start();
    typewriter2.removeCursor();

    await this.delay(200);

    // Status bar
    const statusWrapper = document.createElement('div');
    statusWrapper.innerHTML = `
      <div class="terminal-line dim" style="margin-top: 12px;">Queue Position: #2,847</div>
      <div class="status-bar">
        <div class="status-bar-fill" style="width: 0%"></div>
      </div>
    `;
    this.contentElement.appendChild(statusWrapper);

    // Animate status bar
    await this.delay(100);
    const fill = statusWrapper.querySelector('.status-bar-fill') as HTMLElement;
    if (fill) {
      fill.style.width = '23%';
    }
  }

  private async showError(message: string): Promise<void> {
    if (!this.contentElement) return;

    const errorLine = document.createElement('div');
    errorLine.className = 'terminal-line error';
    this.contentElement.appendChild(errorLine);

    const typewriter = new Typewriter(errorLine, `Error: ${message}`);
    await typewriter.start();
    typewriter.removeCursor();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
