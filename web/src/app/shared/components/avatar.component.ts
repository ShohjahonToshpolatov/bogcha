import { Component, Input } from '@angular/core';
import { InitialsPipe } from '../pipes/initials.pipe';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [InitialsPipe],
  template: `
    @if (photoUrl) {
      <img [src]="photoUrl" [alt]="fullName" class="rounded-full object-cover" [style.width.px]="size" [style.height.px]="size" />
    } @else {
      <div
        class="flex items-center justify-center rounded-full bg-primary font-semibold text-white"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.fontSize.px]="size / 2.5"
      >
        {{ fullName | initials }}
      </div>
    }
  `,
})
export class AvatarComponent {
  @Input() photoUrl?: string | null;
  @Input() fullName = '';
  @Input() size = 40;
}
