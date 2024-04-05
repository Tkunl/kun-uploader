import { Injectable } from '@angular/core'
import { HttpService } from '../service/http.service'

@Injectable({
  providedIn: 'root',
})
export class UploadApiService {
  baseUrl = 'http://localhost:3000'

  constructor(
    private http: HttpService,
  ) {
  }

  checkFileIfExist(fileHash: string, size: number) {
    return this.http.getP<string[]>(this.baseUrl + '/minio/exist', {
      hash: fileHash,
      size: size + '',
    })
  }

  getExistChunks(fileHash: string, chunksHashList: string[]) {
    return this.http.postP<string[]>(this.baseUrl + '/minio/chunks', {
      hash: fileHash,
      hashList: chunksHashList,
    })
  }

  uploadChunks(param: FormData, cb: (current: number) => void) {
    return this.http.postPWithProgress<void>(this.baseUrl + '/minio/upload', param, cb)
  }

  verifyChunks2(fileHash: string, chunksHashList: string[]) {
    return this.http.postP<string[]>(this.baseUrl + '/minio/verify2', {
      hash: fileHash,
      hashList: chunksHashList,
    })
  }

  /**
   * 合并文件分片
   * @param fileHash 整个文件的 hash
   * @param fileName 文件名
   * @param size 文件大小(KB)
   * @param metadata 文件元数据
   */
  mergeChunks(fileHash: string, fileName: string, size: number, metadata: {
    type: string,
    size: number,
    lastModified: number
  }) {
    return this.http.postP<string>(this.baseUrl + '/minio/merge2', {
      hash: fileHash,
      name: fileName,
      size: size + '',
      metadata: JSON.stringify(metadata),
    })
  }
}
