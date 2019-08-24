import { Component } from '@angular/core'
import { Manager } from 'projects/vex/src/public-api'
import { of } from 'rxjs'
import { initialState } from './feature.model'

@Component({
  selector: 'app-feature',
  template: `<h1>Feature works!</h1><a routerLink="/">Go back</a>`
})
export class FeatureComponent {
  constructor(
    private _vex: Manager<typeof initialState>,
  ) {
    setTimeout(() => {
      this._vex.dispatch({
        type: 'FEATURE_TEST',
        resolve: () => of({ myFeature: 'boom' })
      })
    })
  }
}
