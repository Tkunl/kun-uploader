/// <reference lib="webworker" />

import { WorkerMessage } from './util/worker-message'
import SparkMD5 from 'spark-md5'
import { WorkerLabelsEnum } from './types/worker-labels.enum'

let arrBufs: ArrayBuffer[] = []
let spark = new SparkMD5.ArrayBuffer()

/**
 * 以增量的方式计算单个大文件的 md5
 */
addEventListener('message', ({ data }: { data: WorkerMessage }) => {
  const { label, content } = data
  if (label === WorkerLabelsEnum.INIT) {
    arrBufs = []
    spark = new SparkMD5.ArrayBuffer()
  }

  if (label === WorkerLabelsEnum.CHUNK) {
    arrBufs.push(content)
    spark.append(content)
  }

  if (label === WorkerLabelsEnum.DONE) {
    const hash = spark.end()
    arrBufs.forEach((chunk, index) => {
      postMessage(new WorkerMessage(WorkerLabelsEnum.CHUNK, { chunk, index }), [chunk])
    })

    postMessage(new WorkerMessage(WorkerLabelsEnum.DONE, hash))
  }
})
