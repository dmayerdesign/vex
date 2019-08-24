import { Component, NgZone } from '@angular/core'
import { setUpDevtools } from 'projects/vex/src/lib/vex2'

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(ngZone: NgZone) {
    ngZone.run(() => setUpDevtools())
  }
}
