import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'example-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class.primary]="primary()"
      [disabled]="disabled()"
      (click)="pressed.emit()"
    >
      {{ label() }}
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    button {
      padding: 0.8rem 1.3rem;
      border: 1px solid #d6cfeb;
      border-radius: 0.8rem;
      background: #fff;
      color: #33234d;
      font:
        600 1rem / 1.2 system-ui,
        sans-serif;
      cursor: pointer;
    }
    button.primary {
      border-color: #7133d5;
      background: #7133d5;
      color: #fff;
    }
    button:hover:not(:disabled) {
      filter: brightness(0.92);
    }
    button:focus-visible {
      outline: 3px solid #a074ee;
      outline-offset: 3px;
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
})
export class ButtonComponent {
  readonly label = input('Button');
  readonly primary = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
