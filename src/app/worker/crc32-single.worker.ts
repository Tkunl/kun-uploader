/// <reference lib="webworker" />

import { getCrc, getCrcHex } from '../utils/upload-helper'
import { WorkerMessage } from './util/worker-message'
import { WorkerLabelsEnum } from './types/worker-labels.enum'

/**
 * 简单的直接算文件的 crc32
 */
addEventListener('message', ({ data }: { data: ArrayBuffer }) => {
  const crc = getCrc(data)
  const hash = getCrcHex(crc)

  postMessage(
    new WorkerMessage(WorkerLabelsEnum.DONE, {
      result: hash,
      chunk: data,
    }),
    [data],
  )
})
