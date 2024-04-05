import { Injectable } from '@angular/core'
import { WorkerMessage, WorkerRep } from './util/worker-message'
import { WorkerLabelsEnum } from './types/worker-labels.enum'
import { WorkerPoolForMd5s } from './worker-pool-for-md5s'
import { WorkerPoolForCrc32s } from './worker-pool-for-crc32s'

@Injectable({
  providedIn: 'root',
})
export class WorkerService {
  readonly MAX_WORKERS = 8

  md5MultipleWorker: Worker | undefined
  md5SingleWorkerPool: WorkerPoolForMd5s | undefined

  crc32MultipleWorker: Worker | undefined
  crc32SingleWorkerPool: WorkerPoolForCrc32s | undefined

  /**
   * 以追加的方式计算文件的 MD5
   * @param chunks 将所有的 chunks 视作一个文件
   */
  getMD5ForFile(chunks: ArrayBuffer[]) {
    if (this.md5MultipleWorker === undefined) {
      this.md5MultipleWorker = new Worker(new URL('./md5-multiple.worker', import.meta.url))
    }
    const md5MultipleWorker = this.md5MultipleWorker

    return new Promise<string>((rs) => {
      md5MultipleWorker.onmessage = ({ data }: WorkerRep) => {
        const { label, content } = data
        if (label === WorkerLabelsEnum.CHUNK) {
          const { chunk, index } = content
          chunks[index] = chunk
        }

        if (label === WorkerLabelsEnum.DONE) {
          rs(content)
        }
      }

      md5MultipleWorker.postMessage(new WorkerMessage(WorkerLabelsEnum.INIT))
      chunks.forEach((chunk) =>
        md5MultipleWorker.postMessage(new WorkerMessage(WorkerLabelsEnum.CHUNK, chunk), [chunk]),
      )
      md5MultipleWorker.postMessage(new WorkerMessage(WorkerLabelsEnum.DONE))
    })
  }

  /**
   * 直接计算文件的 MD5
   * @param chunks 将每个 chunk 视作独立的文件
   */
  getMD5ForFiles(chunks: ArrayBuffer[]) {
    if (this.md5SingleWorkerPool === undefined) {
      this.md5SingleWorkerPool = new WorkerPoolForMd5s(this.MAX_WORKERS)
    }
    return this.md5SingleWorkerPool.exec<string>(chunks)
  }

  /**
   * 以追加的方式计算文件的 CRC32
   * @param chunks 将所有的 chunks 视作一个文件的分片
   */
  getCRC32ForFile(chunks: ArrayBuffer[]) {
    if (this.crc32MultipleWorker === undefined) {
      this.crc32MultipleWorker = new Worker(new URL('./crc32-multiple.worker', import.meta.url))
    }
    const crc32MultipleWorker = this.crc32MultipleWorker

    return new Promise<string>((rs) => {
      crc32MultipleWorker.onmessage = ({ data }: WorkerRep) => {
        const { label, content } = data
        if (label === WorkerLabelsEnum.CHUNK) {
          const { chunk, index } = content
          chunks[index] = chunk
        }

        if (label === WorkerLabelsEnum.DONE) {
          rs(content)
        }
      }

      chunks.forEach((chunk, index) =>
        crc32MultipleWorker.postMessage(
          new WorkerMessage(WorkerLabelsEnum.CHUNK, {
            chunk,
            index,
          }),
          [chunk],
        ),
      )
      crc32MultipleWorker.postMessage(new WorkerMessage(WorkerLabelsEnum.DONE))
    })
  }

  /**
   * 直接计算文件的 CRC32
   * @param chunks 将每个 chunk 视作独立的文件
   */
  getCRC32ForFiles(chunks: ArrayBuffer[]) {
    if (this.crc32SingleWorkerPool === undefined) {
      this.crc32SingleWorkerPool = new WorkerPoolForCrc32s(this.MAX_WORKERS)
    }
    return this.crc32SingleWorkerPool.exec<string>(chunks)
  }
}
