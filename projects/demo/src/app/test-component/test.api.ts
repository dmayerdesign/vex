import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Vex } from 'projects/vex/src/lib/vex'
import { Observable } from 'rxjs'
import { AppAction, AppState } from './test.model'

@Injectable()
export class AppApi {
  public state$: Observable<AppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Vex<AppState>,
    private _httpClient: HttpClient
  ) { }

  public addProduct(): void {
    const whichPost = Math.ceil(Math.random() * 10)
    this._manager.dispatch({
      type: AppAction.CART_ADD_PRODUCT,
      resolve: () => this._httpClient.get(`https://jsonplaceholder.typicode.com/posts/${whichPost}`),
      mapToState: (state, post: any) => ({
        cart: {
          ...state.cart,
          products: [
            ...state.cart.products,
            {
              name: post.title,
              price: post.id
            }
          ]
        }
      })
    })
  }
}
