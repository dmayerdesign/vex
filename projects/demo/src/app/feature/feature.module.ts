import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { VexModule } from 'projects/vex/src/public-api'
import { FeatureComponent } from './feature.component'
import { initialState } from './feature.model'

@NgModule({
  declarations: [
    FeatureComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild([
      { path: '', component: FeatureComponent }
    ]),
    VexModule.forFeature('special.feature', initialState, { allowConcurrency: false }),
  ]
})
export class FeatureModule { }
