import { Injectable } from '@angular/core'
import { throwError, Observable } from 'rxjs'
import { delay, first, map, switchMapTo } from 'rxjs/operators'
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
      ({ error }) => {
        if (!error) {
          this._manager.dispatch({
            type: TestAppAction.CART_UPDATE_TOTAL,
            // Synchronous resolution.
            resolve: (state$) => state$.pipe(map((state) => ({
              cart: {
                ...state.cart,
                total: state.cart.products.reduce(
                  (total, { price }) => total + price, 0
                )
              }
            })))
          })
        }
      }
    )
  }

  public testDispatchObservable(delayMs = 100): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Observable.
      resolve: (state$) => state$.pipe(
        map((state) => ({ ...state, name: 'Product', price: 10 })),
        delay(delayMs),
      ),
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
      resolve: (state$) => state$.pipe(map((state) => ({
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
      })))
    })
  }

  public testDispatchSyncThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      resolve: () => {
        throw new Error('Test error')
      }
    })
  }
}
