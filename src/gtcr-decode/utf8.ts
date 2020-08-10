// Adapted from https://github.com/ethers-io/ethers.js/tree/a055edb5855b96fdf179403458c1694b96fd906c
import { Logger, version } from './logger'

type Bytes = ArrayLike<number>
type BytesLike = Bytes | string

enum Utf8ErrorReason {
  // A continuation byte was present where there was nothing to continue
  // - offset = the index the codepoint began in
  UNEXPECTED_CONTINUE   = "unexpected continuation byte",

  // An invalid (non-continuation) byte to start a UTF-8 codepoint was found
  // - offset = the index the codepoint began in
  BAD_PREFIX            = "bad codepoint prefix",

  // The string is too short to process the expected codepoint
  // - offset = the index the codepoint began in
  OVERRUN               = "string overrun",

  // A missing continuation byte was expected but not found
  // - offset = the index the continuation byte was expected at
  MISSING_CONTINUE      = "missing continuation byte",

  // The computed code point is outside the range for UTF-8
  // - offset       = start of this codepoint
  // - badCodepoint = the computed codepoint; outside the UTF-8 range
  OUT_OF_RANGE          = "out of UTF-8 range",

  // UTF-8 strings may not contain UTF-16 surrogate pairs
  // - offset       = start of this codepoint
  // - badCodepoint = the computed codepoint; inside the UTF-16 surrogate range
  UTF16_SURROGATE       = "UTF-16 surrogate",

  // The string is an overlong reperesentation
  // - offset       = start of this codepoint
  // - badCodepoint = the computed codepoint; already bounds checked
  OVERLONG              = "overlong representation",
};

type Utf8ErrorFunc = (reason: Utf8ErrorReason, offset: number, bytes: ArrayLike<number>, output: Array<number>, badCodepoint?: number) => number;

interface Hexable {
  toHexString(): string;
}

const Utf8ErrorFuncs: { [ name: string ]: Utf8ErrorFunc } = Object.freeze({
  error: errorFunc,
  ignore: ignoreFunc,
  replace: replaceFunc
});

const logger = new Logger(version)

function errorFunc(reason: Utf8ErrorReason, offset: number, bytes: ArrayLike<number>, output: Array<number>, badCodepoint?: number): number {
  return logger.throwArgumentError(`invalid codepoint at offset ${ offset }; ${ reason }`, "bytes", bytes);
}

function ignoreFunc(reason: Utf8ErrorReason, offset: number, bytes: ArrayLike<number>, output: Array<number>, badCodepoint?: number): number {

  // If there is an invalid prefix (including stray continuation), skip any additional continuation bytes
  if (reason === Utf8ErrorReason.BAD_PREFIX || reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
      let i = 0;
      for (let o = offset + 1; o < bytes.length; o++) {
          if (bytes[o] >> 6 !== 0x02) { break; }
          i++;
      }
      return i;
  }

  // This byte runs us past the end of the string, so just jump to the end
  // (but the first byte was read already read and therefore skipped)
  if (reason === Utf8ErrorReason.OVERRUN) {
      return bytes.length - offset - 1;
  }

  // Nothing to skip
  return 0;
}

function replaceFunc(reason: Utf8ErrorReason, offset: number, bytes: ArrayLike<number>, output: Array<number>, badCodepoint?: number): number {
  // Overlong representations are otherwise "valid" code points; just non-deistingtished
  if (reason === Utf8ErrorReason.OVERLONG) {
      output.push(badCodepoint);
      return 0;
  }

  // Put the replacement character into the output
  output.push(0xfffd);

  // Otherwise, process as if ignoring errors
  return ignoreFunc(reason, offset, bytes, output, badCodepoint);
}

function isHexable(value: any): value is Hexable {
  return !!(value.toHexString);
}

function isHexString(value: any, length?: number): boolean {
  if (typeof(value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
      return false
  }
  if (length && value.length !== 2 + 2 * length) { return false; }
  return true;
}

function addSlice(array: Uint8Array): Uint8Array {
  if (array.slice) { return array; }

  array.slice = function() {
      const args = Array.prototype.slice.call(arguments);
      return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
  }

  return array;
}

function isBytes(value: any): value is Bytes {
  if (value == null) { return false; }

  if (value.constructor === Uint8Array) { return true; }
  if (typeof(value) === "string") { return false; }
  if (value.length == null) { return false; }

  for (let i = 0; i < value.length; i++) {
      const v = value[i];
      if (v < 0 || v >= 256 || (v % 1)) {
          return false;
      }
  }

  return true;
}

function arrayify(value: BytesLike | Hexable | number): Uint8Array {
  if (typeof(value) === "number") {
      logger.checkSafeUint53(value, "invalid arrayify value");

      const result = [];
      while (value) {
          result.unshift(value & 0xff);
          value = parseInt(String(value / 256));
      }
      if (result.length === 0) { result.push(0); }

      return addSlice(new Uint8Array(result));
  }

  if (isHexable(value)) { value = value.toHexString(); }

  if (isHexString(value)) {
      let hex = (<string>value).substring(2);
      if (hex.length % 2) {
        logger.throwArgumentError("hex data is odd-length", "value", value);
      }

      const result = [];
      for (let i = 0; i < hex.length; i += 2) {
          result.push(parseInt(hex.substring(i, i + 2), 16));
      }

      return addSlice(new Uint8Array(result));
  }

  if (isBytes(value)) {
      return addSlice(new Uint8Array(value));
  }

  return logger.throwArgumentError("invalid arrayify value", "value", value);
}

// http://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript#13691499
function getUtf8CodePoints(bytes: BytesLike, onError?: Utf8ErrorFunc): Array<number> {
  if (onError == null) { onError = Utf8ErrorFuncs.error; }

  bytes = arrayify(bytes);

  const result: Array<number> = [];
  let i = 0;

  // Invalid bytes are ignored
  while(i < bytes.length) {

      const c = bytes[i++];

      // 0xxx xxxx
      if (c >> 7 === 0) {
          result.push(c);
          continue;
      }

      // Multibyte; how many bytes left for this character?
      let extraLength = null;
      let overlongMask = null;

      // 110x xxxx 10xx xxxx
      if ((c & 0xe0) === 0xc0) {
          extraLength = 1;
          overlongMask = 0x7f;

      // 1110 xxxx 10xx xxxx 10xx xxxx
      } else if ((c & 0xf0) === 0xe0) {
          extraLength = 2;
          overlongMask = 0x7ff;

      // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
      } else if ((c & 0xf8) === 0xf0) {
          extraLength = 3;
          overlongMask = 0xffff;

      } else {
          if ((c & 0xc0) === 0x80) {
              i += onError(Utf8ErrorReason.UNEXPECTED_CONTINUE, i - 1, bytes, result);
          } else {
              i += onError(Utf8ErrorReason.BAD_PREFIX, i - 1, bytes, result);
          }
          continue;
      }

      // Do we have enough bytes in our data?
      if (i - 1 + extraLength >= bytes.length) {
          i += onError(Utf8ErrorReason.OVERRUN, i - 1, bytes, result);
          continue;
      }

      // Remove the length prefix from the char
      let res = c & ((1 << (8 - extraLength - 1)) - 1);

      for (let j = 0; j < extraLength; j++) {
          let nextChar = bytes[i];

          // Invalid continuation byte
          if ((nextChar & 0xc0) != 0x80) {
              i += onError(Utf8ErrorReason.MISSING_CONTINUE, i, bytes, result);
              res = null;
              break;
          };

          res = (res << 6) | (nextChar & 0x3f);
          i++;
      }

      // See above loop for invalid contimuation byte
      if (res === null) { continue; }

      // Maximum code point
      if (res > 0x10ffff) {
          i += onError(Utf8ErrorReason.OUT_OF_RANGE, i - 1 - extraLength, bytes, result, res);
          continue;
      }

      // Reserved for UTF-16 surrogate halves
      if (res >= 0xd800 && res <= 0xdfff) {
          i += onError(Utf8ErrorReason.UTF16_SURROGATE, i - 1 - extraLength, bytes, result, res);
          continue;
      }

      // Check for overlong sequences (more bytes than needed)
      if (res <= overlongMask) {
          i += onError(Utf8ErrorReason.OVERLONG, i - 1 - extraLength, bytes, result, res);
          continue;
      }

      result.push(res);
  }

  return result;
}

function _toUtf8String(codePoints: Array<number>): string {
  return codePoints.map((codePoint) => {
      if (codePoint <= 0xffff) {
          return String.fromCharCode(codePoint);
      }
      codePoint -= 0x10000;
      return String.fromCharCode(
          (((codePoint >> 10) & 0x3ff) + 0xd800),
          ((codePoint & 0x3ff) + 0xdc00)
      );
  }).join("");
}

export function toUtf8String(bytes: BytesLike, onError?: Utf8ErrorFunc): string {
  return _toUtf8String(getUtf8CodePoints(bytes, onError));
}