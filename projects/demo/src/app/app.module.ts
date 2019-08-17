import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { VexModule } from 'projects/vex/src/public-api'
import { AppComponent } from './app.component'
import { AppApi } from './test-component/test.api'
import { TestComponent } from './test-component/test.component'
import { initialAppState } from './test-component/test.model'

@NgModule({
  declarations: [
    AppComponent,
    TestComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    VexModule.forRoot(initialAppState),
  ],
  providers: [
    AppApi,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
