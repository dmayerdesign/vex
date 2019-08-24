import { Component, OnInit } from '@angular/core'
import { Manager } from 'projects/vex/src/public-api'
import { Observable } from 'rxjs'
import { map, tap } from 'rxjs/operators'
import { AppAction, AppState } from '../app.model'
import { AppApi } from './test.api'

@Component({
  selector: 'app-test',
  template: `
    <h1>Cart</h1>
    <a routerLink="/feature">Feature</a>
    <button (click)="appApi.addProduct()">Add Product</button>
    <pre>
      Cart total: {{ cartTotal$ | async | json }}
      {{ state$ | async | json }}
    </pre>
  `
})
export class TestComponent implements OnInit {
  public state$: Observable<AppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Manager<AppState>,
    public appApi: AppApi,
  ) {
    this.state$ = this._manager.state$
    this.cartTotal$ = this._manager.state$.pipe(
      tap(x => console.log(x)),
      map(({ cart }) => cart.total)
    )
  }

  public ngOnInit(): void {
    // Side effects!
    this._manager.results(AppAction.CART_ADD_PRODUCT).subscribe(
      () => this._manager.dispatch({
        type: AppAction.CART_UPDATE_TOTAL,
        resolve: (state$) => state$.pipe(map((state) => ({
          cart: {
            ...state.cart,
            total: state.cart.products.reduce(
              (total, { price }) => total + price, 0
            )
          }
        })))
      })
    )
  }
}
