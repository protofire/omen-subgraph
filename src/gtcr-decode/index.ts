import { decode } from './rlp'
import { toUtf8String } from './utf8'

const TEXT = 'text'
const LINK = 'link'

export const ItemTypes = { TEXT, LINK }

const solidityTypes = {
  STRING: 'string',
}

const typeToSolidity: { [typeToSolidity: string]: any } = {
  [TEXT]: solidityTypes.STRING,
  [LINK]: solidityTypes.STRING,
}

interface Column {
  type: string
  label: string
}

export function gtcrDecode({
  columns,
  values,
}: {
  columns: Column[]
  values: string[]
}): (string)[] {
  const item = decode(values) as any
  return columns.map((col, i) => {
    try {
      switch (typeToSolidity[col.type]) {
        case solidityTypes.STRING: {
          return toUtf8String(item[i])
        }
        default:
          throw new Error(`Unhandled item type ${col.type}`)
      }
    } catch (err) {
      console.error(`Error decoding ${col.type}`, err)
      return `Error decoding ${col.type}`
    }
  })
  return ['']
}
