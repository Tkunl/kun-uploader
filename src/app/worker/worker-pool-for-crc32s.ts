import { WorkerPool } from './util/worker-pool'
import { WorkerWrapper } from './util/worker-wrapper'

export class WorkerPoolForCrc32s extends WorkerPool {
  constructor(
    maxWorkers = navigator.hardwareConcurrency || 4,
  ) {
    super(maxWorkers)
    this.pool = Array.from({ length: this.maxWorkerCount }).map(
      () =>
        new WorkerWrapper(
          new Worker(new URL('./crc32-single.worker', import.meta.url)),
        ),
    )
  }
}
