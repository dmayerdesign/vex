export interface AppState {
  cart: {
    products: Product[]
    total: number
  }
}

export interface Product {
  name: string
  price: number
}

export const initialAppState: AppState = {
  cart: {
    products: [],
    total: 0
  }
}

export enum AppAction {
  CART_ADD_PRODUCT = 'CART_ADD_PRODUCT',
  CART_UPDATE_TOTAL = 'CART_UPDATE_TOTAL',
}
