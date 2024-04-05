/// <reference lib="webworker" />

import { WorkerMessage } from './util/worker-message'
import { WorkerLabelsEnum } from './types/worker-labels.enum'
import { getCrc, getCrcHex } from '../utils/upload-helper'

let lastCrc = 0

/**
 * 以增量的方式计算单个大文件的 crc32
 */
addEventListener('message', ({ data }: { data: WorkerMessage }) => {
  const { label, content } = data
  if (label === WorkerLabelsEnum.CHUNK) {
    const { chunk, index } = content
    lastCrc = getCrc(chunk, lastCrc)
    postMessage(new WorkerMessage(WorkerLabelsEnum.CHUNK, { chunk, index }), [chunk])
  }
  
  if (label === WorkerLabelsEnum.DONE) {
    postMessage(new WorkerMessage(WorkerLabelsEnum.DONE, getCrcHex(lastCrc)))
    lastCrc = 0
  }
})
