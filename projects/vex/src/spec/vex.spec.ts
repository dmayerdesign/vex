import { CommonModule } from '@angular/common'
import { async, TestBed } from '@angular/core/testing'
import { first, map, tap } from 'rxjs/operators'
import { Vex } from '../lib/vex'
import { VexModule } from '../lib/vex.module'
import { AppApi } from './test-component/test.api'
import { AppAction, AppState } from './test-component/test.model'

const initialAppState: AppState = {
  cart: {
    products: [],
    total: 0
  }
}

describe('Vex', () => {
  beforeEach(async(() => TestBed
    .configureTestingModule({
      imports: [
        CommonModule,
        VexModule.forRoot(initialAppState)
      ],
      providers: [
        AppApi
      ]
    })
  ))

  it('should be created', () => {
    const vex: Vex<AppState> = TestBed.get(Vex)
    expect(vex).toBeTruthy()
  })

  it('should initialize the state', async () => {
    const vex: Vex<AppState> = TestBed.get(Vex)
    expect(await vex.state$.pipe(first()).toPromise())
      .toEqual(initialAppState)
  })

  it('should update the state and react to a result', (done) => {
    const vex: Vex<AppState> = TestBed.get(Vex)
    const api: AppApi = TestBed.get(AppApi)
    api.addProduct()
    vex.resultOf(AppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe(async (state) => {
        await expect(state).not.toEqual(initialAppState)
        done()
      })
  })

  it('should signal intent and react to intent - case 1', (done) => {
    const vex: Vex<AppState> = TestBed.get(Vex)
    const api: AppApi = TestBed.get(AppApi)

    api.addProduct()

    vex.dispatchOf(AppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe(async (state) => {
        await expect(state.cart.products.length).toBe(0)
        await expect(state.cart.total).toBe(0)
        done()
      })

    api.addProduct()
  })

  it('should signal intent and react to intent - case 2', (done) => {
    const vex: Vex<AppState> = TestBed.get(Vex)
    const api: AppApi = TestBed.get(AppApi)

    vex.dispatchOf(AppAction.CART_UPDATE_TOTAL)
      .pipe(
        map(({ state }) => state),
        tap((state) => console.log(state.cart.total)),
        first(),
      )
      .subscribe(async (state) => {
        await expect(state.cart.products.length).toBe(1)
        // await expect(state.cart.total).toBe(0)
        done()
      })

    api.addProduct()
  })
})
