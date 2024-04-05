type Cb<T> = (value: T) => void

export class MiniSubject<T> {
  private _value: T
  private subscribers: Map<string, Cb<T>> = new Map()

  constructor(value: T) {
    this._value = value
  }

  get value() {
    return this._value
  }

  next(value: T) {
    this._value = value
    this.subscribers.forEach((cb) => cb(value))
  }

  subscribe(cb: Cb<T>) {
    const id = crypto.randomUUID()
    this.subscribers.set(id, cb)
    cb(this.value)
    return id
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id)
  }
}