import { Injectable } from '@angular/core'
import { of, throwError, Observable } from 'rxjs'
import { delay, switchMapTo } from 'rxjs/operators'
import { Vex } from '../../lib/vex'
import { TestAppAction, TestAppState, TestProduct } from './test-app.model'

@Injectable()
export class TestAppApi {
  public state$: Observable<TestAppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Vex<TestAppState>
  ) {
    // Side effect.
    // Test synchronous resolution.
    this._manager.resultOf(TestAppAction.CART_ADD_PRODUCT).subscribe(
      ({ error }) => {
        if (!error) {
          this._manager.dispatch({
            type: TestAppAction.CART_UPDATE_TOTAL,
            // Synchronous resolution.
            resolve: (state) => ({
              cart: {
                ...state.cart,
                total: state.cart.products.reduce(
                  (total, { price }) => total + price, 0
                )
              }
            })
          })
        }
      }
    )
  }

  public testDispatchObservable(delayMs = 100): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Observable.
      resolve: () => of({ name: 'Product', price: 10 }).pipe(delay(delayMs)),
      mapToState: (state: TestAppState, product: TestProduct) => ({
        cart: {
          ...state.cart,
          products: [
            ...state.cart.products,
            product
          ]
        }
      })
    })
  }

  public testDispatchObservableThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: () => of({
        name: 'Product',
        price: 10,
      })
        .pipe(
          delay(100),
          switchMapTo(throwError(new Error('Test error')))
        ),
      mapToState: (state: TestAppState) => state
    })
  }

  public testDispatchPromise(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: () => Promise.resolve({
        name: 'Product',
        price: 10,
      }),
      mapToState: (state, product: TestProduct) => ({
        cart: {
          ...state.cart,
          products: [
            ...state.cart.products,
            product
          ]
        }
      })
    })
  }

  public testDispatchPromiseThrow(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Async resolution using Promise.
      resolve: () => Promise.reject(new Error('Test error')),
      mapToState: (state) => state
    })
  }

  public testDispatchSync(): void {
    this._manager.dispatch({
      type: TestAppAction.CART_ADD_PRODUCT,
      // Synchronous resolution.
      resolve: (state) => ({
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
      resolve: () => {
        throw new Error('Test error')
      }
    })
  }
}
