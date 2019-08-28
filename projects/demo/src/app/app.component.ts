import { Component, NgZone } from '@angular/core'
import { setUpDevTools } from 'projects/vex/src/public-api'

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(public ngZone: NgZone) {
    this.ngZone.run(() => setUpDevTools())
  }
}
