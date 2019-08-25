import { CommonModule } from '@angular/common'
import { async, TestBed } from '@angular/core/testing'
import { first, map } from 'rxjs/operators'
import { Manager } from '../lib/vex'
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
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    expect(vex).toBeTruthy()
  })

  it('should initialize the state', async () => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    expect(await vex.state$.pipe(first()).toPromise())
      .toEqual(initialAppState)
  })

  it('(Observable) should react to a result', (done) => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.dispatches(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(first())
      .subscribe(({ actionType, state }) => {
        expect(actionType).toBeTruthy()
        expect(state).toBeTruthy()
        done()
      })
  })

  it('(Observable) should update the state and react to a result', (done) => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.results(TestAppAction.CART_ADD_PRODUCT)
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
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservable()
    vex.dispatches(TestAppAction.CART_UPDATE_TOTAL)
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
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchObservableThrow()
    vex.results(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error: Error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
        done()
      })
  })

  it('(Promise) should update the state and react to a result', (done) => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromise()
    vex.results(TestAppAction.CART_ADD_PRODUCT)
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
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromise()
    vex.dispatches(TestAppAction.CART_UPDATE_TOTAL)
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
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchPromiseThrow()
    vex.results(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error: Error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
        done()
      })
  })

  it('(Sync) should update the state and react to a result', () => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    let numProducts: number | null = null
    vex.results(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        numProducts = state.cart.products.length
      })
    api.testDispatchSync()
    expect(numProducts).toBe(1)
  })

  it('(Sync) should signal intent and react to intent', () => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    let numProducts: number | null = null
    let cartTotal: number | null = null
    vex.dispatches(TestAppAction.CART_UPDATE_TOTAL)
      .pipe(
        map(({ state }) => state),
        first(),
      )
      .subscribe((state) => {
        numProducts = state.cart.products.length
        cartTotal = state.cart.total
      })
    api.testDispatchSync()
    expect(numProducts).toBe(1)
    expect(cartTotal).toBe(0)
  })

  it('(Sync) should handle an error', () => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    api.testDispatchSyncThrow()
    vex.results(TestAppAction.CART_ADD_PRODUCT)
      .pipe(
        map(({ error }) => error),
        first(),
      )
      .subscribe((error: Error) => {
        expect(error).toBeTruthy()
        expect(error.message).toBe('Test error')
      })
  })

  it('(Observable) should correctly mutate state during concurrent async actions', (done) => {
    const vex: Manager<TestAppState> = TestBed.get(Manager)
    const api: TestAppApi = TestBed.get(TestAppApi)
    const getRandomDelayMs = () => Math.random() * 1000

    api.testDispatchObservable(getRandomDelayMs())
    api.testDispatchObservable(getRandomDelayMs())
    api.testDispatchObservable(getRandomDelayMs())
    api.testDispatchObservable(getRandomDelayMs())
    api.testDispatchObservable(getRandomDelayMs())

    let resolvedCount = 0
    vex.results(TestAppAction.CART_ADD_PRODUCT).subscribe(({ state }) => {
      resolvedCount++
      expect(resolvedCount).toBeLessThanOrEqual(5)
      if (resolvedCount === 5) {
        expect(state.cart.products.length).toBe(5)
        done()
      }
    })
  })
})
