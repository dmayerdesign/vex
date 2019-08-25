import { Component, NgZone } from '@angular/core'
import { setUpDevTools } from 'projects/vex/src/lib/vex'

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(ngZone: NgZone) {
    ngZone.run(() => setUpDevTools())
  }
}
