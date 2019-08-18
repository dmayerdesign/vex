export interface TestAppState {
  cart: {
    products: TestProduct[]
    total: number
  }
}

export interface TestProduct {
  name: string
  price: number
}

export const initialAppState: TestAppState = {
  cart: {
    products: [],
    total: 0
  }
}

export enum TestAppAction {
  CART_ADD_PRODUCT = 'CART_ADD_PRODUCT',
  CART_UPDATE_TOTAL = 'CART_UPDATE_TOTAL',
}
