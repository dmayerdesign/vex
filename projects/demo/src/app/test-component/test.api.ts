import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Manager } from 'projects/vex/src/public-api'
import { Observable } from 'rxjs'
import { map, withLatestFrom } from 'rxjs/operators'
import { AppAction, AppState } from '../app.model'

@Injectable()
export class AppApi {
  public state$: Observable<AppState>
  public cartTotal$: Observable<number>

  constructor(
    private _manager: Manager<AppState>,
    private _httpClient: HttpClient
  ) { }

  public async addProduct(): Promise<AppState> {
    const whichPost = Math.ceil(Math.random() * 10)
    return this._manager
      .once({
        type: AppAction.CART_ADD_PRODUCT,
        resolve: (state$) => this._httpClient.get<any>(`https://jsonplaceholder.typicode.com/posts/${whichPost}`).pipe(
          withLatestFrom(state$),
          map(([ post, state ]) => ({
            cart: {
              ...state.cart,
              products: [
                ...state.cart.products,
                {
                  name: post.title,
                  price: post.id,
                }
              ]
            }
          }))
        )
      })
      .toPromise()
      .then(({ state }) => state)
  }
}
