import { Injectable } from '@angular/core'
import { UploadApiService } from '../api/upload-api.service'
import {
  getArrayBufFromBlobsV2,
  getMD5FromArrayBuffer,
  sliceFile,
} from '../utils/upload-helper'
import { BehaviorSubject } from 'rxjs'
import { WorkerService } from '../worker/worker.service'
import { MerkleTree } from '../worker/util/merkle-tree'
import { PromisePool } from '../utils/promise-pool'
import { getArrParts } from '../utils/common-util'

interface IMetaData {
  size: number,
  lastModified: number,
  type: string
}

@Injectable({
  providedIn: 'root',
})
export class MinioUploaderService {
  uploadStatus = new BehaviorSubject<string>('Please select a file.')

  constructor(
    private uploadApiSvc: UploadApiService,
    private workerSvc: WorkerService,
  ) {
  }

  async doUpload2(
    file: File,
    chunkSize: number,
    cb: (progress: number) => void,
  ) {
    // 分片数量小于 borderCount 用 MD5, 否则用 CRC32 算 Hash
    const BORDER_COUNT = 100

    // 文件大小
    const fileSize = file.size / 1000

    // 文件元数据
    const metadata: IMetaData = {
      size: file.size,
      lastModified: file.lastModified,
      type: file.type,
    }

    // 文件分片
    this.uploadStatus.next('Parsing file ...')
    const chunksBlob = sliceFile(file, chunkSize)
    let chunksHash: string[] = []
    if (chunksBlob.length === 1) {
      chunksHash = [getMD5FromArrayBuffer(await chunksBlob[0].arrayBuffer())]
    } else {
      let chunksBuf: ArrayBuffer[] = []
      // 将文件分片进行分组, 组内任务并行执行, 组外任务串行执行
      const chunksPart = getArrParts<Blob>(chunksBlob, this.workerSvc.MAX_WORKERS)
      const tasks = chunksPart.map(
        (part) => async () => {
          // 手动释放上一次用于计算 Hash 的 ArrayBuffer
          // !!! 现在只会占用 MAX_WORKERS * 分片数量大小的内存 !!!
          chunksBuf.length = 0
          chunksBuf = await getArrayBufFromBlobsV2(part)
          // 按文件分片数量执行不同 Hash 策略
          return chunksBlob.length <= BORDER_COUNT ?
            await this.workerSvc.getMD5ForFiles(chunksBuf) :
            await this.workerSvc.getCRC32ForFiles(chunksBuf)
        },
      )
      for (const task of tasks) {
        const result = await task()
        chunksHash.push(...result)
      }
    }


    const merkleTree = new MerkleTree(chunksHash)
    const fileHash = merkleTree.getRootHash()

    // 检查文件是否已经上传过
    this.uploadStatus.next('Checking file if exist ...')
    const { data: existUrl } = await this.uploadApiSvc.checkFileIfExist(fileHash, fileSize)
    if (existUrl) {
      this.uploadStatus.next('Completed.')
      return existUrl
    }

    // 查询需要上传的分片
    this.uploadStatus.next('Get the chunks that need to be uploaded ...')
    const { data: _chunksNeedUpload } = await this.uploadApiSvc.getExistChunks(
      fileHash,
      chunksHash,
    )

    // 完整的上传参数
    this.uploadStatus.next('Building upload params ...')
    const paramsMap = new Map<string, FormData>()
    chunksBlob.forEach((chunk, index) => {
      const data = new FormData()
      data.append('files', chunk)
      data.set('name', file.name)
      data.set('index', index.toString())
      data.set('fileHash', fileHash)
      data.set('chunkHash', chunksHash[index])
      paramsMap.set(chunksHash[index], data)
    })

    // 获取实际需要上传的分片
    const params = _chunksNeedUpload.map((chunkHash) => paramsMap.get(chunkHash)!)
    this.uploadStatus.next('Uploading ...')

    // 基于实时上传进度的进度
    const total = file.size
    const currentProgressList: number[] = []
    const intervalId = setInterval(() => {
      const current = currentProgressList.reduce((acc, cur) => acc + cur, 0)
      cb(Math.ceil((current / total) * 100))
    }, 150)

    await new PromisePool(params.map((param, index) => () =>
      this.uploadApiSvc.uploadChunks(param, (current) => {
        currentProgressList[index] = current
      })
    )).exec()
    clearInterval(intervalId)
    cb(100)

    // 获取校验失败的分块并尝试重新上传
    this.uploadStatus.next('Verify uploaded chunks ...')
    const { data: brokenChunksList } = await this.uploadApiSvc.verifyChunks2(fileHash, chunksHash)
    if (brokenChunksList.length !== 0) {
      console.log('brokenChunksList: ', brokenChunksList)
      return ''
    }

    // 合并分片
    this.uploadStatus.next('Merging chunks ...')
    const { data: url } = await this.uploadApiSvc.mergeChunks(fileHash, file.name, fileSize, metadata)
    this.uploadStatus.next('Completed.')
    return url
  }
}

