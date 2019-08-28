import { Component } from '@angular/core'
import { Manager } from 'projects/vex/src/public-api'
import { map } from 'rxjs/operators'
import { initialState } from './feature.model'

@Component({
  selector: 'app-feature',
  template: `
    <h1>Feature works!</h1>
    <div><button (click)="addToList()">Mutate the state</button></div>
    <div><a routerLink="/">Go back</a></div>
    <div>
      <h2>List:</h2>
      <div *ngFor="let item of list$ | async">{{ item }}</div>
    </div>
  `
})
export class FeatureComponent {
  public list$ = this._manager.state$.pipe(map((state) => state.someList))
  constructor(
    private _manager: Manager<typeof initialState>,
  ) { }

  public addToList(): void {
    this._manager.dispatch({
      type: 'FEATURE_TEST',
      reduce: (state) => ({
        ...state,
        someList: [
          ...state.someList,
          (Math.random() * 10000).toFixed(0)
        ]
      })
    })
  }
}
