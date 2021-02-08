import {promisify} from "util"
import {createReadStream, createWriteStream, exists } from 'fs'
import {createInterface} from 'readline'

const $exists = promisify(exists)

export default rewrite

async function rewrite(filename: string, lines: string[], eol: string) {
  const {length} = lines

  if (await $exists(filename)) {
    const lineReader = createInterface(createReadStream(filename))

    let i = 0
    , isSame = true

    for await (const line of lineReader) 
      if (!(isSame = line === lines[i++]))
        break

      
    if (isSame) {
      if (lines[length - 1] === "")
        i++
      if (length === i)
        return
    }
  }

  const stream = createWriteStream(filename)
  
  await new Promise((res, rej) => {

    stream.on('error', rej).on('finish', res)

    for (let i = 0; i < length; i++)
      stream.write(
        `${i ? eol : ''}${lines[i]}`,
        /* istanbul ignore next */
        err => err && rej(err)
      )

    stream.end()
  }) 
}