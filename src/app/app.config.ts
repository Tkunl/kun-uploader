import { ApplicationConfig, importProvidersFrom } from '@angular/core'
import { provideRouter, RouteReuseStrategy } from '@angular/router'

import { routes } from './app.routes'
import { HttpClientModule } from '@angular/common/http'
import { zh_CN, provideNzI18n } from 'ng-zorro-antd/i18n'
import { registerLocaleData } from '@angular/common'
import zh from '@angular/common/locales/zh'
import { FormsModule } from '@angular/forms'
import { provideAnimations } from '@angular/platform-browser/animations'
import { IconDefinition } from '@ant-design/icons-angular'
import * as AllIcons from '@ant-design/icons-angular/icons'
import { NzIconModule } from 'ng-zorro-antd/icon'

const antDesignIcons = AllIcons as {
  [key: string]: IconDefinition;
}
const icons: IconDefinition[] = Object.keys(antDesignIcons).map(key => antDesignIcons[key])

registerLocaleData(zh)

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(FormsModule),
    importProvidersFrom(HttpClientModule),
    provideNzI18n(zh_CN),
    provideAnimations(),
    provideRouter(routes),
    importProvidersFrom(NzIconModule.forRoot(icons)),
  ]
};
