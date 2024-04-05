import { WorkerLabelsEnum } from '../types/worker-labels.enum'

export interface WorkerRep<T = any> {
  data: WorkerMessage<T>
}

export class WorkerMessage<T = any> {
  label: WorkerLabelsEnum
  content?: T

  constructor(label: WorkerLabelsEnum, content?: T) {
    this.label = label
    this.content = content
  }
}
