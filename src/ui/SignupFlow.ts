import { Typewriter } from './Typewriter';

type SignupState = 'email' | 'otp' | 'success';

export class SignupFlow {
  private container: HTMLElement;
  private state: SignupState = 'email';
  private email: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.showEmailInput();
  }

  private showEmailInput(): void {
    this.state = 'email';
    this.container.innerHTML = '';

    const promptLine = document.createElement('div');
    promptLine.className = 'dc-signup-line';
    promptLine.textContent = 'Enter your email to join the early access queue.';
    this.container.appendChild(promptLine);

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'dc-signup-input-wrapper';

    const input = document.createElement('input');
    input.type = 'email';
    input.className = 'dc-signup-input';
    input.placeholder = 'email@address.com';
    input.autocomplete = 'email';

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dc-signup-submit';
    submitBtn.textContent = 'Submit';

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(submitBtn);
    this.container.appendChild(inputWrapper);

    // Focus input after a short delay (for modal animation)
    setTimeout(() => input.focus(), 350);

    const handleSubmit = () => this.handleEmailSubmit(input.value);
    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    });
  }

  private async handleEmailSubmit(email: string): Promise<void> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showError('Invalid email format. Please try again.');
      return;
    }

    this.email = email;
    this.container.innerHTML = '';

    // Show submitted email
    const emailLine = document.createElement('div');
    emailLine.className = 'dc-signup-line dim';
    emailLine.textContent = email;
    this.container.appendChild(emailLine);

    // Show sending message
    const sendingLine = document.createElement('div');
    sendingLine.className = 'dc-signup-line';
    this.container.appendChild(sendingLine);

    const typewriter = new Typewriter(sendingLine, 'Sending verification code...', { baseDelay: 30 });
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(400);

    this.showOTPInput();
  }

  private async showOTPInput(): Promise<void> {
    this.state = 'otp';

    const successLine = document.createElement('div');
    successLine.className = 'dc-signup-line success';
    this.container.appendChild(successLine);

    const typewriter = new Typewriter(successLine, 'Code sent! Check your inbox.', { baseDelay: 30 });
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(150);

    // OTP container
    const otpContainer = document.createElement('div');
    otpContainer.className = 'dc-otp-container';

    for (let i = 0; i < 6; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'dc-otp-input';
      input.setAttribute('data-index', i.toString());
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      otpContainer.appendChild(input);
    }

    this.container.appendChild(otpContainer);
    this.setupOTPInputs(otpContainer);

    // Focus first input
    const firstInput = otpContainer.querySelector('.dc-otp-input') as HTMLInputElement;
    firstInput?.focus();
  }

  private setupOTPInputs(container: HTMLElement): void {
    const inputs = container.querySelectorAll('.dc-otp-input') as NodeListOf<HTMLInputElement>;

    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        const value = input.value;

        // Only allow digits
        if (value && !/^\d$/.test(value)) {
          input.value = '';
          return;
        }

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
    // Disable inputs
    const inputs = this.container.querySelectorAll('.dc-otp-input') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => input.disabled = true);

    await this.delay(200);

    // Show verifying message
    const verifyingLine = document.createElement('div');
    verifyingLine.className = 'dc-signup-line';
    this.container.appendChild(verifyingLine);

    const typewriter = new Typewriter(verifyingLine, 'Verifying...', { baseDelay: 30 });
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(500);

    // Simulate verification success
    this.showSuccess();
  }

  private async showSuccess(): Promise<void> {
    this.state = 'success';

    // Remove OTP container
    const otpContainer = this.container.querySelector('.dc-otp-container');
    if (otpContainer) {
      otpContainer.remove();
    }

    const successLine = document.createElement('div');
    successLine.className = 'dc-signup-line success';
    this.container.appendChild(successLine);

    const typewriter = new Typewriter(successLine, 'Verified!', { baseDelay: 30 });
    await typewriter.start();
    typewriter.removeCursor();

    await this.delay(200);

    const queueLine = document.createElement('div');
    queueLine.className = 'dc-signup-line';
    this.container.appendChild(queueLine);

    const typewriter2 = new Typewriter(queueLine, 'You have been added to the early access queue.', { baseDelay: 25 });
    await typewriter2.start();
    typewriter2.removeCursor();

    await this.delay(150);

    // Queue position and status bar
    const statusWrapper = document.createElement('div');
    statusWrapper.innerHTML = `
      <div class="dc-signup-line dim" style="margin-top: 16px;">Queue Position: #2,847</div>
      <div class="dc-status-bar">
        <div class="dc-status-bar-fill" style="width: 0%"></div>
      </div>
    `;
    this.container.appendChild(statusWrapper);

    // Animate status bar
    await this.delay(100);
    const fill = statusWrapper.querySelector('.dc-status-bar-fill') as HTMLElement;
    if (fill) {
      fill.style.width = '23%';
    }
  }

  private showError(message: string): void {
    // Remove existing error if any
    const existingError = this.container.querySelector('.dc-signup-line.error');
    if (existingError) {
      existingError.remove();
    }

    const errorLine = document.createElement('div');
    errorLine.className = 'dc-signup-line error';
    errorLine.textContent = message;

    // Insert after the input wrapper
    const inputWrapper = this.container.querySelector('.dc-signup-input-wrapper');
    if (inputWrapper) {
      inputWrapper.insertAdjacentElement('afterend', errorLine);
    } else {
      this.container.appendChild(errorLine);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public reset(): void {
    this.state = 'email';
    this.email = '';
    this.showEmailInput();
  }
}
