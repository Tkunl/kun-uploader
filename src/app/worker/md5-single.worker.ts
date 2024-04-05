/// <reference lib="webworker" />

import { WorkerMessage } from './util/worker-message'
import { WorkerLabelsEnum } from './types/worker-labels.enum'
import SparkMD5 from 'spark-md5'

/**
 * 简单的直接算文件的 md5
 */
addEventListener('message', ({ data }: { data: ArrayBuffer }) => {
  const hash = SparkMD5.ArrayBuffer.hash(data)

  postMessage(
    new WorkerMessage(WorkerLabelsEnum.DONE, {
      result: hash,
      chunk: data,
    }),
    [data],
  )
})
