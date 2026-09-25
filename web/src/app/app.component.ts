import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly translate = inject(TranslateService);

  constructor() {
    this.translate.addLangs(['uz', 'uz-cy', 'ru', 'en']);
    const savedLocale = localStorage.getItem('bogcha_locale');
    if (savedLocale) {
      this.translate.use(savedLocale);
    }
  }
}
