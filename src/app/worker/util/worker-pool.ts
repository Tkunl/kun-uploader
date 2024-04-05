import { StatusEnum, WorkerWrapper } from './worker-wrapper'
import { MiniSubject } from '../../utils/mini-subject'

export abstract class WorkerPool {
  pool: WorkerWrapper[] = []
  maxWorkerCount: number
  curRunningCount = new MiniSubject(0)
  results: any[] = []

  protected constructor(
    maxWorkers = navigator.hardwareConcurrency || 4,
  ) {
    this.maxWorkerCount = maxWorkers
  }

  exec<T>(params: ArrayBuffer[]) {
    this.results.length = 0
    const workerParams = params.map(
      (param, index) => ({ data: param, index }),
    )

    return new Promise<T[]>((rs) => {
      this.curRunningCount.subscribe(count => {
        if (count < this.maxWorkerCount && workerParams.length !== 0) {
          // 当前能跑的任务数量
          let curTaskCount = this.maxWorkerCount - count
          if (curTaskCount > params.length) {
            curTaskCount = params.length
          }

          // 此时可以用来执行任务的 Worker
          const canUseWorker: WorkerWrapper[] = []
          for (const worker of this.pool) {
            if (worker.status === StatusEnum.WAITING) {
              canUseWorker.push(worker)
              if (canUseWorker.length === curTaskCount) {
                break
              }
            }
          }

          const paramsToRun = workerParams.splice(0, curTaskCount)
          // 更新当前正在跑起来的 worker 数量

          this.curRunningCount.next(this.curRunningCount.value + curTaskCount)
          canUseWorker.forEach((workerApp, index) => {
            const param = paramsToRun[index]
            workerApp.run(param.data, params, param.index)
              .then((res) => {
                this.results[param.index] = res
              })
              .catch((e) => {
                this.results[param.index] = e
              })
              .finally(() => {
                this.curRunningCount.next(this.curRunningCount.value - 1)
              })
          })
        }

        if (this.curRunningCount.value === 0 && workerParams.length === 0) {
          rs(this.results as T[])
        }
      })
    })
  }
}
