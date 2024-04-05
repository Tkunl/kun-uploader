import { WorkerRep } from './worker-message'
import { WorkerLabelsEnum } from '../types/worker-labels.enum'

export enum StatusEnum {
  RUNNING = 'running',
  WAITING = 'waiting',
}

export class WorkerWrapper {
  worker: Worker
  status: StatusEnum

  constructor(
    worker: Worker,
  ) {
    this.worker = worker
    this.status = StatusEnum.WAITING
  }

  run<T>(param: ArrayBuffer, params: ArrayBuffer[], index: number) {
    this.status = StatusEnum.RUNNING
    return new Promise<T>((rs, rj) => {
      this.worker.onmessage = ({ data }: WorkerRep<{ result: string; chunk: ArrayBuffer }>) => {
        const { label, content } = data
        if (label === WorkerLabelsEnum.DONE && content) {
          params[index] = content.chunk
          this.status = StatusEnum.WAITING
          rs(content.result as T)
        }
      }
      this.worker.onerror = (e) => {
        this.status = StatusEnum.WAITING
        rj(e)
      }
      this.worker.postMessage(param, [param])
    })
  }
}
