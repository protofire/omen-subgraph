import { decode } from './rlp'
// import { toUtf8String } from './utf8'

export class Column {
  public type: string;
  public label: string;

  constructor(type: string, label: string) {
    this.type = type
    this.label = label
  }
}

export function gtcrDecode(
  columns: Column[],
  values: string,
 ): string[] {
  const item = decode(values) as any
  // return columns.map((col, i) => {
  //   try {
  //     switch (typeToSolidity[col.type]) {
  //       case solidityTypes.STRING: {
  //         return toUtf8String(item[i])
  //       }
  //       default:
  //         throw new Error(`Unhandled item type ${col.type}`)
  //     }
  //   } catch (err) {
  //     console.error(`Error decoding ${col.type}`, err)
  //     return `Error decoding ${col.type}`
  //   }
  // })
  return ['']
}
