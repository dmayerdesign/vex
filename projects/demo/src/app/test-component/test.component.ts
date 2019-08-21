import { Component, OnInit } from '@angular/core'
import { Vex } from 'projects/vex/src/lib/vex'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { AppApi } from './test.api'
import { AppAction, AppState } from './test.model'

@Component({
  selector: 'app-test',
  template: `
    <h1>Cart</h1>
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
    private _manager: Vex<AppState>,
    public appApi: AppApi,
  ) {
    this.state$ = this._manager.state$
    this.cartTotal$ = this._manager.state$.pipe(
      map(({ cart }) => cart.total)
    )
  }

  public ngOnInit(): void {
    // Side effects!
    this._manager.results(AppAction.CART_ADD_PRODUCT).subscribe(
      () => this._manager.dispatch({
        type: AppAction.CART_UPDATE_TOTAL,
        resolve: (state) => ({
          cart: {
            ...state.cart,
            total: state.cart.products.reduce(
              (total, { price }) => total + price, 0
            )
          }
        })
      })
    )
  }
}
