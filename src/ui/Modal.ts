export class Modal {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private contentContainer: HTMLElement;
  private onCloseCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'dc-modal-overlay';

    this.modal = document.createElement('div');
    this.modal.className = 'dc-modal';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dc-modal-close';
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-linecap="round"/>
      </svg>
    `;
    closeBtn.addEventListener('click', () => this.close());

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'dc-modal-content';

    this.modal.appendChild(closeBtn);
    this.modal.appendChild(this.contentContainer);
    this.overlay.appendChild(this.modal);
    container.appendChild(this.overlay);

    // Close on overlay click (but not modal content click)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    });
  }

  public open(): void {
    this.overlay.classList.add('active');
  }

  public close(): void {
    this.overlay.classList.remove('active');
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setTitle(title: string): void {
    // Remove existing title if any
    const existingTitle = this.modal.querySelector('.dc-modal-title');
    if (existingTitle) {
      existingTitle.remove();
    }

    const titleEl = document.createElement('h2');
    titleEl.className = 'dc-modal-title';
    titleEl.textContent = title;
    this.modal.insertBefore(titleEl, this.contentContainer);
  }

  public getContentContainer(): HTMLElement {
    return this.contentContainer;
  }

  public clearContent(): void {
    this.contentContainer.innerHTML = '';
  }

  public isOpen(): boolean {
    return this.overlay.classList.contains('active');
  }
}
