import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { RouterModule } from '@angular/router'
import { VexModule } from 'projects/vex/src/public-api'
// import { setUpDevtools } from 'projects/vex/src/public-api'
import { AppComponent } from './app.component'
import { initialAppState } from './app.model'
import { AppApi } from './test-component/test.api'
import { TestComponent } from './test-component/test.component'

// setUpDevtools()

@NgModule({
  declarations: [
    AppComponent,
    TestComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      {
        path: '',
        component: TestComponent
      },
      {
        path: 'feature',
        loadChildren: () => import('./feature/feature.module').then(mod => mod.FeatureModule)
      }
    ]),
    VexModule.forRoot(initialAppState, { allowConcurrency: true }),
  ],
  providers: [
    AppApi,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
