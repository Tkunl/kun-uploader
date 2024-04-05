import { Injectable } from '@angular/core'
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http'
import { last, lastValueFrom, map, Observable } from 'rxjs'

export interface AppRes<T> {
  statusCode: number
  message: string
  data: T
}

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  constructor(private http: HttpClient) {
  }

  private getEventMessage(event: HttpEvent<any>, cb?: (current: any) => void) {
    if (event.type === HttpEventType.UploadProgress) {
      cb && cb(event.loaded)
    }
  }

  get<T>(url: string, params?: any) {
    return this.http.get<AppRes<T>>(url, { params })
  }

  getP<T>(url: string, params?: any) {
    return lastValueFrom(this.get<T>(url, params))
  }

  post<T>(url: string, body: any, options: any = {}) {
    return this.http.post(url, body, options) as unknown as Observable<AppRes<T>>
  }

  postP<T>(url: string, body: any, options: any = {}) {
    return lastValueFrom(this.post<T>(url, body, options))
  }

  postPWithProgress<T>(
    url: string,
    body: any,
    cb?: (current: number) => void,
  ) {
    return lastValueFrom(
      this.http
        .request<T>(
          new HttpRequest('POST', url, body, {
            reportProgress: true,
          }),
        )
        .pipe(
          map((event) => this.getEventMessage(event, cb)),
          last(),
        ),
    )
  }
}
