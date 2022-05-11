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
  IdlType,
  isIdlDefinedType,
  isIdlTypeDefined,
  isIdlTypeEnum,
  isShankIdl,
  PrimitiveTypeKey,
} from './types'
import {
  logDebug,
  logError,
  logTrace,
  prependGeneratedWarning,
  prepareTargetDir,
} from './utils'
import { format, Options } from 'prettier'
import { Paths } from './paths'

export * from './types'


export class Schema {
  private readonly formatCode: boolean
  private readonly formatOpts: Options
  private readonly accountsHaveImplicitDiscriminator: boolean
  private readonly prependGeneratedWarning: boolean
  private readonly typeAliases: Map<string, PrimitiveTypeKey>
  private paths: Paths | undefined
  constructor(
    private readonly idl: Idl,
    {
      formatCode = false,
      formatOpts = {},
      prependGeneratedWarning = true,
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
    this.accountsHaveImplicitDiscriminator = !isShankIdl(idl)
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

    const programId = this.idl.metadata.address
    const fixableTypes: Set<string> = new Set()
    const accountFiles = this.accountFilesByType()
    const customFiles = this.customFilesByType()

    function forceFixable(ty: IdlType) {
      if (isIdlTypeDefined(ty) && fixableTypes.has(ty.defined)) {
        return true
      }
      return false
    }

    // NOTE: we render types first in order to know which ones are 'fixable' by
    // the time we render accounts and instructions
    // However since types may depend on other types we obtain this info in 2 passes.

    // -----------------
    // Types
    // -----------------
    const types: Record<string, string> = {}
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
        let { code, isFixable } = renderType(
          ty,
          this.paths!.typesDir,
          accountFiles,
          customFiles,
          this.typeAliases,
          forceFixable
        )
        // If the type by itself does not need to be fixable, here we detect if
        // it needs to be fixable due to including a fixable type
        if (isFixable) {
          fixableTypes.add(ty.name)
        }

        types[ty.name] = code
      }
    }

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
        this.paths.instructionsDir,
        programId,
        accountFiles,
        customFiles,
        this.typeAliases,
        forceFixable
      )
      if (this.prependGeneratedWarning) {
        code = prependGeneratedWarning(code)
      }
      if (this.formatCode) {
        try {
          code = format(code, this.formatOpts)
        } catch (err) {
          logError(`Failed to format ${ix.name} instruction`)
          logError(err)
        }
      }
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
        this.paths.accountsDir,
        accountFiles,
        customFiles,
        this.typeAliases,
        forceFixable,
        this.resolveFieldType,
        this.accountsHaveImplicitDiscriminator
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
    const { instructions, accounts, types, errors } = this.renderCode()

    await this.writeSchema(instructions, accounts, types, errors)
  }

  // -----------------
  // Types
  // -----------------
  private writeTypes(types: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    let query = "type Query {\n"
    let outputcode = "";
    for (const [name, code] of Object.entries(types)) {
      logDebug('Writing type: %s', name)
      query += "\t" + this.lowerCase(name) + ": [" + name + "]\n" 
      outputcode += code
    }
    query = query + "}\n"
    return query + outputcode
  }

  // -----------------
  // Main Index File
  // -----------------

  async writeSchema(instructions: Record<string, string>, accounts: Record<string, string>, types: Record<string, string>, errors: string | null) {
    assert(this.paths != null, 'should have set paths')
    let code = ''
    await prepareTargetDir(this.paths.root)
    if (Object.keys(types).length !== 0) {
      code = this.writeTypes(types)
    }

    await fs.writeFile(path.join(this.paths.root, `schema.graphql`), code)
  }
  private lowerCase(word: string) {
    const lowerCased = word.charAt(0).toLowerCase() + word.slice(1);
    return lowerCased
  }
}

