import postcss from 'postcss'
import {resolve} from "path"
import { regexpize, extractDefaults, readlineSync } from './utils'
import schema from "./schema.json"
import { Options, jsOptions } from './options'
import replaceMultiplicated from './replaceMultiplicated'
import collector from './collector'
import rewrite from './rewrite'

const defaultOptions = extractDefaults(schema)
, defaultTemplate = readlineSync(resolve(__dirname, "_css-template.d.ts"), "\n")

export = postcss.plugin<Options>('postcss-plugin-css-d-ts', (opts?: Options) => {  
  const {
    eol,
    //TODO several keywords?
    identifierKeyword,
    "identifierPattern": cssP,
    identifierMatchIndex,
    "jsIdentifierPattern": jsP,
    jsIdentifierInvalidList,
    destination,
    "template": templatePath,
  } = {...defaultOptions, ...opts}
  , identifierParser = regexpize(cssP, "g")
  , jsMatcher = jsP && regexpize(jsP)
  , jsNotAllowed = new Set(jsIdentifierInvalidList)
  //TODO check `templatePath === ""`
  , templateContent = typeof templatePath === "string"
  ? readlineSync(templatePath, eol)
  : defaultTemplate

  return async (root, result) => {
    if (!destination && destination !== false)
      return result.warn("Destination is falsy")
    //TODO check sticky
    if (!identifierParser.flags.includes('g'))
      return result.warn('identifierParser should have global flag')
    /* istanbul ignore next //TODO read postcss documentation */
    const {file} = root.source?.input ?? {}

    if (!file)
    // TODO To common file?
      return //result.warn("Source is falsy")

    const identifiers = new Set<string>()

    root.walkRules(collector(
      identifiers,
      identifierParser,
      identifierMatchIndex,
      jsNotAllowed,
      jsMatcher
    ))

    const lines = replaceMultiplicated(
      templateContent,
      identifierKeyword,
      [...identifiers]
    )

    if (destination === false)
      await rewrite(`${file}.d.ts`, lines, eol)
    else
      // TODO Somehow get rid of `{}`
      (destination as jsOptions["destination"])[
        file
      ] = lines
  }
})
