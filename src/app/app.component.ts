import { Component } from '@angular/core'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzProgressModule } from 'ng-zorro-antd/progress'
import { NzMessageService } from 'ng-zorro-antd/message'
import { MinioUploaderService } from './service/minio-uploader.service'
import { WorkerService } from './worker/worker.service'
import { getArrayBufFromBlobsV2, getArrayBufFromFile, getMD5FromArrayBuffer, sliceFile } from './utils/upload-helper'
import { HttpService } from './service/http.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ NzButtonModule, NzUploadModule, NzIconModule, NzProgressModule ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'kun-uploader'

  fileList: any[] = []
  curPercent = 0

  chunkSize = 10 // 单位: MB

  isDisabledUploadBtn = false
  isLoading = false
  isDisabled = true

  constructor(
    private msgSvc: NzMessageService,
    protected minioSvc: MinioUploaderService,
    private workerSvc: WorkerService,
    private http: HttpService,
  ) {
  }

  beforeUpload = (file: NzUploadFile) => {
    this.fileList = [ ...(this.fileList || []), file ]
    this.isDisabledUploadBtn = true
    this.isDisabled = false
    this.minioSvc.uploadStatus.next('Ready to upload.')
    return false
  }

  handleRemove = (file: NzUploadFile) => {
    const index = this.fileList.indexOf(file)
    const newFileList = this.fileList.slice()
    newFileList.splice(index, 1)
    this.fileList = newFileList
    this.isDisabledUploadBtn = false
    this.isDisabled = false
    this.minioSvc.uploadStatus.next('Please select a file.')
    return true
  }

  async testMd5WorkerPool() {
    const file = this.fileList[0]
    try {
      this.isLoading = true
      // console.time('md5_worker_pool')
      console.time('slice_file')
      const arrBufs = await getArrayBufFromFile(file, this.chunkSize)
      console.timeEnd('slice_file')

      console.time('#chunks_md5#')
      const chunksHash = await this.workerSvc.getMD5ForFiles(arrBufs)
      console.timeEnd('#chunks_md5#')

      console.time('#file_md5#')
      const fileHash = await this.workerSvc.getMD5ForFile(arrBufs)
      console.timeEnd('#file_md5#')

      console.timeEnd('md5_worker_pool')
      console.log('fileHash', fileHash)
      console.log('chunksHash', chunksHash)
    } finally {
      this.isLoading = false
    }
  }

  async testCrc32WorkerPool() {
    const file = this.fileList[0]
    try {
      this.isLoading = true
      console.time('crc32_worker_pool')
      console.time('slice_file')
      const arrBufs = await getArrayBufFromFile(file, this.chunkSize)
      console.timeEnd('slice_file')

      console.time('#chunks_crc32#')
      const chunksHash = await this.workerSvc.getCRC32ForFiles(arrBufs)
      console.timeEnd('#chunks_crc32#')

      console.time('#file_crc32#')
      const fileHash = await this.workerSvc.getCRC32ForFile(arrBufs)
      console.timeEnd('#file_crc32#')

      console.timeEnd('crc32_worker_pool')
      console.log('fileHash', fileHash)
      console.log('chunksHash', chunksHash)
    } finally {
      this.isLoading = false
    }
  }

  async testMtWorkerPool() {
    const file = this.fileList[0]
    const BORDER_COUNT = 100
    try {
      this.isLoading = true
      console.time('mt_worker_pool')
      console.time('slice_file')
      const chunksBlob = sliceFile(file, this.chunkSize)
      const chunksBuf = await getArrayBufFromBlobsV2(chunksBlob)
      console.timeEnd('slice_file')

      console.time('#chunks_hash#')
      // 按文件分片数量执行不同 Hash 策略
      let chunksHash: string[]
      if (chunksBuf.length === 1) {
        chunksHash = [ getMD5FromArrayBuffer(chunksBuf[0]) ]
      } else if (chunksBuf.length <= BORDER_COUNT) {
        chunksHash = await this.workerSvc.getMD5ForFiles(chunksBuf)
      } else {
        chunksHash = await this.workerSvc.getCRC32ForFiles(chunksBuf)
      }
      console.timeEnd('#chunks_hash#')

      // console.time('#file_hash#')
      // const merkleTree = new MerkleTree(chunksHash)
      // const merkleHash = merkleTree.getRootHash()
      // console.timeEnd('#file_hash#')

      console.timeEnd('mt_worker_pool')
      // console.log('merkleHash', merkleHash)
      console.log('chunksHash', chunksHash)
    } finally {
      this.isLoading = false
    }
  }

  async handleUpload2() {
    try {
      this.isLoading = true
      const file = this.fileList[0]
      await this.minioSvc.doUpload2(
        file,
        this.chunkSize,
        (progress: number) => (this.curPercent = progress),
      )
      this.msgSvc.success('Upload completed.')
    } finally {
      this.isLoading = false
    }
  }
}
