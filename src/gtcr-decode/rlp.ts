// Adapted from https://github.com/ethereumjs/rlp/tree/e9f6388e452b28677daa715d69600ce46ff0f408
type Input = Buffer | string | null

interface Decoded {
  data: Buffer | Buffer[]
  remainder: Buffer
}

function isHexPrefixed(str: string): boolean {
  return str.slice(0, 2) === '0x'
}

/** Pad a string to be even */
function padToEven(a: string): string {
  return a.length % 2 ? `0${a}` : a
}

/** Removes 0x from a given String */
function stripHexPrefix(str: string): string {
  if (typeof str !== 'string') {
    return str
  }
  return isHexPrefixed(str) ? str.slice(2) : str
}

/**
 * Parse integers. Check if there is no leading zeros
 * @param v The value to parse
 * @param base The base to parse the integer into
 */
function safeParseInt(v: string, base: number): number {
  if (v.slice(0, 2) === '00') {
    throw new Error('invalid RLP: extra zeros')
  }

  return parseInt(v, base)
}

/** Transform string into a Buffer */
function toBuffer(v: Input): Buffer {
  if (!Buffer.isBuffer(v)) {
    if (typeof v === 'string') {
      if (isHexPrefixed(v)) {
        return Buffer.from(padToEven(stripHexPrefix(v)), 'hex')
      } else {
        return Buffer.from(v)
      }
    } else if (v === null || v === undefined) {
      return Buffer.from([])
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

/** Decode an input with RLP */
function _decode(input: Buffer): Decoded {
  let length, llength, data, innerRemainder, d
  const decoded = []
  const firstByte = input[0]

  if (firstByte <= 0x7f) {
    // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
    return {
      data: input.slice(0, 1),
      remainder: input.slice(1),
    }
  } else if (firstByte <= 0xb7) {
    // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
    // The range of the first byte is [0x80, 0xb7]
    length = firstByte - 0x7f

    // set 0x80 null to 0
    if (firstByte === 0x80) {
      data = Buffer.from([])
    } else {
      data = input.slice(1, length)
    }

    if (length === 2 && data[0] < 0x80) {
      throw new Error('invalid rlp encoding: byte must be less 0x80')
    }

    return {
      data: data,
      remainder: input.slice(length),
    }
  } else if (firstByte <= 0xbf) {
    // string is greater than 55 bytes long. A single byte with the value (0xb7 plus the length of the length),
    // followed by the length, followed by the string
    llength = firstByte - 0xb6
    if (input.length - 1 < llength) {
      throw new Error('invalid RLP: not enough bytes for string length')
    }
    length = safeParseInt(input.slice(1, llength).toString('hex'), 16)
    if (length <= 55) {
      throw new Error('invalid RLP: expected string length to be greater than 55')
    }
    data = input.slice(llength, length + llength)
    if (data.length < length) {
      throw new Error('invalid RLP: not enough bytes for string')
    }

    return {
      data: data,
      remainder: input.slice(length + llength),
    }
  } else if (firstByte <= 0xf7) {
    // a list between  0-55 bytes long
    length = firstByte - 0xbf
    innerRemainder = input.slice(1, length)
    while (innerRemainder.length) {
      d = _decode(innerRemainder)
      decoded.push(d.data as Buffer)
      innerRemainder = d.remainder
    }

    return {
      data: decoded,
      remainder: input.slice(length),
    }
  } else {
    // a list  over 55 bytes long
    llength = firstByte - 0xf6
    length = safeParseInt(input.slice(1, llength).toString('hex'), 16)
    const totalLength = llength + length
    if (totalLength > input.length) {
      throw new Error('invalid rlp: total length is larger than the data')
    }

    innerRemainder = input.slice(llength, totalLength)
    if (innerRemainder.length === 0) {
      throw new Error('invalid rlp, List has a invalid length')
    }

    while (innerRemainder.length) {
      d = _decode(innerRemainder)
      decoded.push(d.data as Buffer)
      innerRemainder = d.remainder
    }
    return {
      data: decoded,
      remainder: input.slice(totalLength),
    }
  }
}

export function decode(input: Input, stream: boolean = false): Buffer[] | Buffer | Decoded {
  if (!input || (<any>input).length === 0) {
    return Buffer.from([])
  }

  const inputBuffer = toBuffer(input)
  const decoded = _decode(inputBuffer)

  if (stream) {
    return decoded
  }
  if (decoded.remainder.length !== 0) {
    throw new Error('invalid remainder')
  }

  return decoded.data
}