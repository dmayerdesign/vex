import { CommonModule } from '@angular/common'
import { async, TestBed } from '@angular/core/testing'
import { first, map, tap } from 'rxjs/operators'
import { Vex } from '../lib/vex'
import { VexModule } from '../lib/vex.module'
import { TestAppApi } from './test-helpers/test-app.api'
import { TestAppAction, TestAppState } from './test-helpers/test-app.model'

const initialAppState: TestAppState = {
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
        TestAppApi
      ]
    })
  ))

  it('should be created', () => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    expect(vex).toBeTruthy()
  })

  it('should initialize the state', async () => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    expect(await vex.state$.pipe(first()).toPromise())
      .toEqual(initialAppState)
  })

  it('(Observable) should react to a result', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.dispatchOf(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(first())
      .subscribe(({ actionType, state }) => {
        expect(actionType).toBeTruthy()
        expect(state).toBeTruthy()
        done()
      })
  })

  it('(Observable) should update the state and react to a result', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        done()
      })
  })

  it('(Observable) should signal intent and react to intent', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.dispatchOf(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        expect(state.cart.total).toBe(0)
        done()
      })
  })

  it('(Observable) should handle an error', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservableThrow()
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
        done()
      })
  })

  it('(Promise) should update the state and react to a result', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromise()
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        done()
      })
  })

  it('(Promise) should signal intent and react to intent', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromise()
    vex.dispatchOf(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        expect(state.cart.total).toBe(0)
        done()
      })
  })

  it('(Promise) should handle an error', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromiseThrow()
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
        done()
      })
  })

  it('(Sync) should update the state and react to a result', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        done()
      })
    api.testDispatchSync()
  })

  it('(Sync) should signal intent and react to intent', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)

    vex.dispatchOf(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        expect(state.cart.products.length).toBe(1)
        expect(state.cart.total).toBe(0)
        done()
      })
    api.testDispatchSync()
  })

  it('(Sync) should handle an error', (done) => {
    const vex: Vex<TestAppState> = TestBed.get(Vex)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchSyncThrow()
    vex.resultOf(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
        done()
      })
  })
})
