import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderAccount } from './render-account'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { determineTypeIsFixable, renderType } from './render-type'
import { strict as assert } from 'assert'
import {
  TypeAliases,
  Idl,
  isIdlDefinedType,
  isIdlTypeEnum,
  PrimitiveTypeKey,
} from '../'

import {
  logDebug,
  logError,
  logTrace,
  prependGeneratedWarning,
  prepareTargetDir,
} from '../solita/utils'

import { format, Options } from 'prettier'
import { Paths } from '../solita/paths'
/*
import { validate } from 'graphql/validation' // CommonJS
import  { buildSchema, parse } from 'graphql'
*/
import  { validateSchema, buildSchema } from 'graphql'

export class Schema {
  private readonly formatCode: boolean
  private readonly formatOpts: Options
  private readonly prependGeneratedWarning: boolean
  private readonly typeAliases: Map<string, PrimitiveTypeKey>
  private paths: Paths | undefined
  constructor(
    private readonly idl: Idl,
    {
      typeAliases: aliases = {},
    }: {
      formatCode?: boolean
      formatOpts?: Options
      prependGeneratedWarning?: boolean
      typeAliases?: TypeAliases
    } = {}
  ) {
    this.formatCode = false
    this.formatOpts = {}
    this.prependGeneratedWarning = false
    this.typeAliases = new Map(Object.entries(aliases))
  }

  // -----------------
  // Extract
  // -----------------
  accountFilesByType() {
    assert(this.paths != null, 'should have set paths')
    return new Map(
      this.idl.accounts?.map((x) => [
        x.name,
        this.paths!.accountFile(x.name),
      ]) ?? []
    )
  }

  customFilesByType() {
    assert(this.paths != null, 'should have set paths')
    return new Map(
      this.idl.types?.map((x) => [x.name, this.paths!.typeFile(x.name)]) ?? []
    )
  }

  resolveFieldType = (typeName: string) => {
    for (const acc of this.idl.accounts ?? []) {
      if (acc.name === typeName) return acc.type
    }
    for (const def of this.idl.types ?? []) {
      if (def.name === typeName) return def.type
    }
    return null
  }
  // -----------------
  // Render
  // -----------------
  renderCode() {
    assert(this.paths != null, 'should have set paths')

    const fixableTypes: Set<string> = new Set()
    const accountFiles = this.accountFilesByType()
    const customFiles = this.customFilesByType()

    // NOTE: we render types first in order to know which ones are 'fixable' by
    // the time we render accounts and instructions
    // However since types may depend on other types we obtain this info in 2 passes.

    // -----------------
    // Types
    // -----------------
    const types: Record<string, string> = {}
    let voids: string[] = []
    logDebug('Rendering %d types', this.idl.types?.length ?? 0)
    if (this.idl.types != null) {
      for (const ty of this.idl.types) {
        // Here we detect if the type itself is fixable solely based on its
        // primitive field types
        let isFixable = determineTypeIsFixable(
          ty,
          this.paths.typesDir,
          accountFiles,
          customFiles
        )

        if (isFixable) {
          fixableTypes.add(ty.name)
        }
      }
      for (const ty of this.idl.types) {
        logDebug(`Rendering type ${ty.name}`)
        logTrace('kind: %s', ty.type.kind)
        if (isIdlDefinedType(ty.type)) {
          logTrace('fields: %O', ty.type.fields)
        } else {
          if (isIdlTypeEnum(ty.type)) {
            logTrace('variants: %O', ty.type.variants)
          }
        }
        let { voidList, code, isFixable } = renderType(
          ty,
          this.paths!.typesDir,
          accountFiles,
          customFiles,
          this.typeAliases,
        )
        // If the type by itself does not need to be fixable, here we detect if
        // it needs to be fixable due to including a fixable type
        if (isFixable) {
          fixableTypes.add(ty.name)
        }
        voids.push(voidList)
        types[ty.name] = code
      }
    }
    voids = voids.filter(function(item) {
      return item !== ""
    })

    // -----------------
    // Instructions
    // -----------------
    const instructions: Record<string, string> = {}
    for (const ix of this.idl.instructions) {
      logDebug(`Rendering instruction ${ix.name}`)
      logTrace('args: %O', ix.args)
      logTrace('accounts: %O', ix.accounts)
      let code = renderInstruction(
        ix,
        accountFiles,
        customFiles,
        this.typeAliases,
        voids
      )
      instructions[ix.name] = code
    }

    // -----------------
    // Accounts
    // -----------------
    const accounts: Record<string, string> = {}
    for (const account of this.idl.accounts ?? []) {
      logDebug(`Rendering account ${account.name}`)
      logTrace('type: %O', account.type)
      let code = renderAccount(
        account,
        accountFiles,
        customFiles,
        this.typeAliases,
      )
      if (this.prependGeneratedWarning) {
        code = prependGeneratedWarning(code)
      }
      if (this.formatCode) {
        try {
          code = format(code, this.formatOpts)
        } catch (err) {
          logError(`Failed to format ${account.name} account`)
          logError(err)
        }
      }
      accounts[account.name] = code
    }

    // -----------------
    // Errors
    // -----------------
    logDebug('Rendering %d errors', this.idl.errors?.length ?? 0)
    let errors = renderErrors(this.idl.errors ?? [])

    if (errors != null && this.prependGeneratedWarning) {
      errors = prependGeneratedWarning(errors)
    }
    if (errors != null && this.formatCode) {
      try {
        errors = format(errors, this.formatOpts)
      } catch (err) {
        logError(`Failed to format errors`)
        logError(err)
      }
    }
    return { instructions, accounts, types, errors }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    this.paths = new Paths(outputDir)
    const { instructions, accounts, types } = await this.renderCode()

    await this.writeSchema(instructions, accounts, types)
  }

  // -----------------
  // Types
  // -----------------
  private writeTypes(types: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    let outputcode = '';
    for (const [name, code] of Object.entries(types)) {
      logDebug('Writing type: %s', name)
      outputcode += code
    }
    return outputcode
  }
  // -----------------
  // Instructions
  // -----------------
  private writeInstructions(instructions: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')
    let outputcode = "";
    for (const [name, code] of Object.entries(instructions)) {
      logDebug('Writing instruction: %s', name)
      outputcode += code
    }
    return outputcode
  }

  // -----------------
  // Accounts
  // -----------------
  private writeAccounts(accounts: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    let outputcode = ""
    for (const [name, code] of Object.entries(accounts)) {
      logDebug('Writing accounts: %s', name)
      outputcode += code
    }
    return outputcode
  }

  // -----------------
  // Main Index File
  // -----------------

  async writeSchema(instructions: Record<string, string>, accounts: Record<string, string>, types: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')
    let schema = `scalar Datetime
scalar PublicKey
scalar GraphQLLong
scalar Null

schema {
\tquery: Query
}

type Query {
\tinstructionHistory(account: String, types: InstructionType, startDate: Int, endDate: Int, limit: Int, skip: Int, reverse: Boolean): [Instruction!]!
\taccounts(type: AccountType, accounts: String): [Account!]!
}

type AccessStats {
\taccesses1h: InstructionStats!
\taccesses24h: InstructionStats!
\taccesses7d: InstructionStats!
\taccessesTotal: InstructionStats!
}
`
    let code = ''
    await prepareTargetDir(this.paths.root)

    if (Object.keys(types).length !== 0) {
      code += '\n#*--------TYPES--------*#\n\n\n'
      code += this.writeTypes(types)
    }

    if (Object.keys(instructions).length !== 0) {
      code += '\n\n#*--------INSTRUCTIONS--------*#\n\n\n'
      let stats =`type InstructionStats {
`
      schema += `
interface Instruction {
\tid: String!
\ttype: InstructionType!
\ttimestamp: Datetime!
\tprogramId: String!
\taccount: String!
}

enum InstructionType {
`
      for (const [name] of Object.entries(instructions)) {
        schema += '\t'+ name.charAt(0).toUpperCase().concat(name.slice(1)) + 'Data,\n'
        stats += '\t'+ name + ': Int!,\n'
      }
      schema += `}

      
` + stats + '}\n'
      code += this.writeInstructions(instructions)
    }
    if (Object.keys(accounts).length !== 0) {
      schema += `
interface Account {
\tstats: AccessStats!
}

union Accounts = `
for (const [name] of Object.entries(accounts)) {
  schema += name.charAt(0).toUpperCase().concat(name.slice(1)) + ' | '
}
schema = schema.slice(0, schema.length-2)

schema += `
union Instructions = `
for (const [name] of Object.entries(instructions)) {
  schema += name.charAt(0).toUpperCase().concat(name.slice(1)) + 'Instruction | '
}
schema = schema.slice(0, schema.length-2)

schema += `
union InstructionAccounts = `
for (const [name] of Object.entries(instructions)) {
  schema += name.charAt(0).toUpperCase().concat(name.slice(1)) + 'InstructionAccounts | '
}
schema = schema.slice(0, schema.length-2)

schema += `
union InstructionArgs = `
for (const [name] of Object.entries(instructions)) {
  schema += name.charAt(0).toUpperCase().concat(name.slice(1)) + 'InstructionArgs | '
}
schema = schema.slice(0, schema.length-2)

schema += `

enum AccountType {
`
      for (const [name] of Object.entries(accounts)) {
        schema += '\t'+ name.charAt(0).toUpperCase().concat(name.slice(1)) + 'Data,\n'
      }
      schema += `}
`

      code += '\n\n\n#*--------ACCOUNTS--------*#\n\n'
      code += this.writeAccounts(accounts)
    }


    schema += code

    await fs.writeFile(path.join(this.paths.root, `schema.graphql`), schema)

    const schemaBuilt = buildSchema(schema)

    const schemaCheck = validateSchema(schemaBuilt)
    if(schemaCheck.length == 0) {
      console.log("Schema correct!")
    }
  }
}

