import { Injectable } from '@angular/core'
import { throwError, timer, Observable } from 'rxjs'
import { delay, first, map, switchMapTo, tap } from 'rxjs/operators'
import { Manager } from '../../lib/vex'
import { TestAppAction, TestAppState } from './test-app.model'

@Injectable()
export class TestAppApi {
  public state$: Observable<TestAppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Manager<TestAppState>
  ) {
    // Side effect.
    // Test synchronous resolution.
    this._manager.results(TestAppAction.CART_ADD_PRODUCT).subscribe(
      ({ error, state }) => {
        if (!error) {
          this._manager.dispatch({
            type: TestAppAction.CART_UPDATE_TOTAL,
            // Synchronous resolution.
            reduce: (_state) => {
              return {
                cart: {
                  ..._state.cart,
                  total: _state.cart.products.reduce(
                    (total, { price }) => total + price, 0
                  )
                }
              }
            }
          })
        }
      }
    )
  }

  public testDispatchObservable(delayMs = 100): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Observable.
      resolve: (state$) => timer(delayMs).pipe(switchMapTo(state$.pipe(
        first(),
        map((state) => ({
          ...state,
          cart: {
            ...state.cart,
            products: [
              ...state.cart.products,
              { name: 'Product', price: 10 }
            ]
          }
        })),
      ))),
    })
  }

  public testDispatchObservableThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: (state$) => state$
        .pipe(
          delay(100),
          switchMapTo(throwError(new Error('Test error')))
        ),
    })
  }

  public testDispatchPromise(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: async (state$) => {
        const state = await state$.pipe(first()).toPromise()
        return Promise.resolve({
            name: 'Product',
            price: 10,
          })
          .then((product) => ({
            ...state,
            cart: {
              ...state.cart,
              products: [
                ...state.cart.products,
                product
              ]
            }
          }))
      },
    })
  }

  public testDispatchPromiseThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: () => Promise.reject(new Error('Test error')),
    })
  }

  public testDispatchSync(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Synchronous resolution.
      reduce: (state) => ({
        cart: {
          ...state.cart,
          products: [
            ...state.cart.products,
            {
              name: 'Product',
              price: 10,
            }
          ]
        }
      })
    })
  }

  public testDispatchSyncThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      reduce: () => {
        throw new Error('Test error')
      }
    })
  }
}
