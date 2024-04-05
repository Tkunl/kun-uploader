import { BehaviorSubject } from 'rxjs'

type AsyncFunction = () => Promise<any>

export class PromisePool {
  private readonly queue: { fn: AsyncFunction, index: number }[] = []
  private readonly maxConcurrentTasks: number
  private results: any[] = []

  curRunningCount = new BehaviorSubject(0)

  constructor(
    functions: AsyncFunction[],
    maxConcurrentTasks: number = navigator.hardwareConcurrency || 8,
  ) {
    this.queue = functions.map((fn, index) => ({ fn, index }))
    this.maxConcurrentTasks = maxConcurrentTasks
  }

  exec<T>() {
    return new Promise<T[]>((rs) => {
      this.curRunningCount.subscribe((count) => {
        if (count < this.maxConcurrentTasks && this.queue.length !== 0) {
          // 当前需要跑的任务数量
          let curTaskCount = this.maxConcurrentTasks - count
          if (curTaskCount > this.queue.length) {
            curTaskCount = this.queue.length
          }
          // 当前要跑的任务
          const tasks = this.queue.splice(0, curTaskCount)
          this.curRunningCount.next(this.curRunningCount.value + curTaskCount)
          // 执行任务
          tasks.forEach((taskWrap) => {
            const { fn, index } = taskWrap
            fn().then((result) => {
              this.results[index] = result
            }).catch((error) => {
              this.results[index] = error
            }).finally(() =>
              this.curRunningCount.next(this.curRunningCount.value - 1)
            )
          })
        }

        if (this.curRunningCount.value === 0 && this.queue.length === 0) {
          rs(this.results as T[])
        }
      })
    })
  }
}
