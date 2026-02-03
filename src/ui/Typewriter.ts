export interface TypewriterOptions {
  baseDelay?: number;
  punctuationDelay?: number;
  onCharacter?: (char: string) => void;
  onComplete?: () => void;
}

export class Typewriter {
  private element: HTMLElement;
  private text: string;
  private index: number = 0;
  private options: Required<TypewriterOptions>;
  private cursorElement: HTMLSpanElement | null = null;
  private isRunning: boolean = false;

  constructor(element: HTMLElement, text: string, options: TypewriterOptions = {}) {
    this.element = element;
    this.text = text;
    this.options = {
      baseDelay: options.baseDelay ?? 40,
      punctuationDelay: options.punctuationDelay ?? 300,
      onCharacter: options.onCharacter ?? (() => {}),
      onComplete: options.onComplete ?? (() => {})
    };
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = true;
      this.index = 0;
      this.element.textContent = '';

      // Add cursor
      this.cursorElement = document.createElement('span');
      this.cursorElement.className = 'cursor';
      this.element.appendChild(this.cursorElement);

      const typeNext = () => {
        if (!this.isRunning) {
          resolve();
          return;
        }

        if (this.index < this.text.length) {
          const char = this.text[this.index];

          // Insert character before cursor
          const textNode = document.createTextNode(char);
          this.element.insertBefore(textNode, this.cursorElement);

          this.options.onCharacter(char);
          this.index++;

          // Calculate delay
          let delay = this.options.baseDelay;
          if ('.!?'.includes(char)) {
            delay = this.options.punctuationDelay;
          } else if (',;:'.includes(char)) {
            delay = this.options.punctuationDelay / 2;
          } else if (char === ' ') {
            delay = this.options.baseDelay / 2;
          }

          // Add some randomness
          delay += (Math.random() - 0.5) * 20;

          setTimeout(typeNext, delay);
        } else {
          this.isRunning = false;
          this.options.onComplete();
          resolve();
        }
      };

      // Start typing after a short delay
      setTimeout(typeNext, 500);
    });
  }

  public stop(): void {
    this.isRunning = false;
  }

  public removeCursor(): void {
    if (this.cursorElement && this.cursorElement.parentNode) {
      this.cursorElement.parentNode.removeChild(this.cursorElement);
      this.cursorElement = null;
    }
  }

  public complete(): void {
    this.stop();
    this.element.textContent = this.text;
  }
}
