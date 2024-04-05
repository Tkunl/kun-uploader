import { WorkerWrapper } from './util/worker-wrapper'
import { WorkerPool } from './util/worker-pool'

export class WorkerPoolForMd5s extends WorkerPool {
  constructor(maxWorkers: number) {
    super(maxWorkers)
    this.pool = Array.from({ length: this.maxWorkerCount }).map(
      () =>
        new WorkerWrapper(
          new Worker(new URL('./md5-single.worker', import.meta.url)),
        ),
    )
  }
}
