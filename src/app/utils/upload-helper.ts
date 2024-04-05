import SparkMD5 from 'spark-md5'
import { buf } from 'crc-32'

export interface FileInfo {
  fileHash: string
  chunksHashList: string[]
  chunks: Blob[]
}

const getCrc = (arrayBuf: ArrayBuffer, seed = 0) => buf(new Uint8Array(arrayBuf), seed)
const getCrcHex = (crc: number) => (crc >>> 0).toString(16)

/**
 * 分割文件
 * @param file
 * @param baseSize 默认分块大小为 1MB
 * @private
 */
function sliceFile(file: File, baseSize = 1) {
  const chunkSize = baseSize * 1024 * 1024 // KB
  const chunks: Blob[] = []
  let startPos = 0
  while (startPos < file.size) {
    chunks.push(file.slice(startPos, startPos + chunkSize))
    startPos += chunkSize
  }
  return chunks
}

/**
 * 将 File 转成 ArrayBuffer
 * 注意: Blob 无法直接移交到 Worker 中, 所以需要放到主线程中执行
 * @param chunks
 * @private
 */
async function getArrayBufFromBlobs(chunks: Blob[]): Promise<ArrayBuffer[]> {
  async function readAsArrayBuffer(file: Blob) {
    return new Promise<ArrayBuffer>((rs) => {
      const fileReader = new FileReader()
      fileReader.onload = (e) => rs(e.target!.result as ArrayBuffer)
      fileReader.readAsArrayBuffer(file)
    })
  }
  return await Promise.all(chunks.map((chunk: Blob) => readAsArrayBuffer(chunk)))
}

/**
 * 功能同上但语法更简洁
 * @param chunks
 */
async function getArrayBufFromBlobsV2(chunks: Blob[]): Promise<ArrayBuffer[]> {
  return Promise.all(chunks.map(chunk => chunk.arrayBuffer()))
}

async function getArrayBufFromFile(file: File, baseSize = 1) {
  console.time('fileBlob')
  const fileBlob = sliceFile(file, baseSize)
  console.timeEnd('fileBlob')
  console.time('fileArrayBuf')
  const fileArrayBuf = await getArrayBufFromBlobsV2(fileBlob)
  console.time('fileArrayBuf')
  return fileArrayBuf
}

function getChunksMD5(arrayBufs: ArrayBuffer[]): [string, string[]] {
  // let fileHash = ''
  const chunksHashList: string[] = []
  // const spark = new SparkMD5.ArrayBuffer()
  arrayBufs.forEach((arrayBuf) => {
    // spark.append(arrayBuf)
    chunksHashList.push(SparkMD5.ArrayBuffer.hash(arrayBuf))
  })
  // fileHash = spark.end()
  // return [fileHash, chunksHashList]
  return ['', chunksHashList]
}

function getChunksCRC32(arrayBufs: ArrayBuffer[]): [string, string[]] {
  let fileHash = ''
  let lastCrc = 0
  const chunksHashList: string[] = []
  arrayBufs.forEach((arrayBuf) => {
    lastCrc = getCrc(arrayBuf, lastCrc)
    chunksHashList.push(getCrcHex(lastCrc))
  })
  fileHash = getCrcHex(lastCrc)
  return [fileHash, chunksHashList]
}

function getMD5FromArrayBuffer(buffer: ArrayBuffer) {
  return SparkMD5.ArrayBuffer.hash(buffer)
}

async function getMD5FromFile(file: File, chunkSize: number): Promise<FileInfo> {
  console.time('slice_file')
  const chunks = sliceFile(file, chunkSize)
  console.timeEnd('slice_file')
  const chunksBuffer = await getArrayBufFromBlobs(chunks)
  const [fileHash, chunksHashList] = getChunksMD5(chunksBuffer)
  return {
    fileHash,
    chunksHashList,
    chunks,
  }
}

async function getCRC32FromFile(file: File, chunkSize: number): Promise<FileInfo> {
  const chunks = sliceFile(file, chunkSize)
  const chunksBuffer = await getArrayBufFromBlobs(chunks)
  const [fileHash, chunksHashList] = getChunksCRC32(chunksBuffer)
  return {
    fileHash,
    chunksHashList,
    chunks,
  }
}

export {
  sliceFile,
  getArrayBufFromBlobs,
  getArrayBufFromBlobsV2,
  getMD5FromArrayBuffer,
  getCRC32FromFile,
  getChunksCRC32,
  getMD5FromFile,
  getChunksMD5,
  getArrayBufFromFile,
  getCrc,
  getCrcHex,
}
