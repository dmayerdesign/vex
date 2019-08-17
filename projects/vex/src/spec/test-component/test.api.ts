import { Injectable } from '@angular/core'
import { of, Observable } from 'rxjs'
import { delay, map } from 'rxjs/operators'
import { Vex } from '../../lib/vex'
import { AppAction, AppState, Product } from './test.model'

@Injectable()
export class AppApi {
  public state$: Observable<AppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Vex<AppState>
  ) {
    // this._manager.dispatchOf(AppAction.CART_ADD_PRODUCT).subscribe()
    this._manager.resultOf(AppAction.CART_ADD_PRODUCT).subscribe(
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

  public addProduct(): void {
    this._manager.dispatch({
      type: AppAction.CART_ADD_PRODUCT,
      resolve: (state) => of({
        name: 'Product',
        price: 10,
      })
        .pipe(
          delay(100),
          map((product: Product) => ({
            cart: {
              ...state.cart,
              products: [
                ...state.cart.products,
                product
              ]
            }
          }))
        )
    })
  }
}
