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
  logInfo,
  logTrace,
  prepareTargetDir,
  prependGeneratedWarning,
} from './utils'
import { format, Options } from 'prettier'
import { Paths } from './paths'
export * from './types'
const DEFAULT_FORMAT_OPTS: Options = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  useTabs: false,
  tabWidth: 2,
  arrowParens: 'always',
  printWidth: 80,
  parser: 'typescript',
}
export class Solita {
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
    this.formatCode = formatCode
    this.formatOpts = { ...DEFAULT_FORMAT_OPTS, ...formatOpts }
    this.prependGeneratedWarning = prependGeneratedWarning
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
        if (this.prependGeneratedWarning) {
          code = prependGeneratedWarning(code)
        }
        if (this.formatCode) {
          try {
            code = format(code, this.formatOpts)
          } catch (err) {
            logError(`Failed to format ${ty.name} instruction`)
            logError(err)
          }
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
    const reexports = ['instructions']
    await this.writeInstructions(instructions)
    if (Object.keys(accounts).length !== 0) {
      reexports.push('accounts')
      await this.writeAccounts(accounts)
    }
    if (Object.keys(types).length !== 0) {
      reexports.push('types')
      await this.writeTypes(types)
    }
    if (errors != null) {
      reexports.push('errors')
      await this.writeErrors(errors)
    }
    await this.writeMainIndex(reexports, instructions, accounts, types)
  }
  // -----------------
  // Instructions
  // -----------------
  private async writeInstructions(instructions: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.instructionsDir)
    logInfo(
      'Writing instructions to directory: %s',
      this.paths.relInstructionsDir
    )
    for (const [name, code] of Object.entries(instructions)) {
      logDebug('Writing instruction: %s', name)
      await fs.writeFile(this.paths.instructionFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all instructions')
    const indexCode = this.renderImportInstructionIndex(
      Object.keys(instructions).sort(),
      'instructions',
    )
    await fs.writeFile(this.paths.instructionFile('index'), indexCode, 'utf8')
  }
  // -----------------
  // Accounts
  // -----------------
  private async writeAccounts(accounts: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.accountsDir)
    logInfo('Writing accounts to directory: %s', this.paths.relAccountsDir)
    for (const [name, code] of Object.entries(accounts)) {
      logDebug('Writing account: %s', name)
      await fs.writeFile(this.paths.accountFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all accounts')
    const indexCode = this.renderExportsIndex(
      Object.keys(accounts).sort(),
      'accounts'
    )
    await fs.writeFile(this.paths.accountFile('index'), indexCode, 'utf8')
  }
  // -----------------
  // Types
  // -----------------
  private async writeTypes(types: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.typesDir)
    logInfo('Writing types to directory: %s', this.paths.relTypesDir)
    for (const [name, code] of Object.entries(types)) {
      logDebug('Writing type: %s', name)
      await fs.writeFile(this.paths.typeFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all types')
    const reexports = Object.keys(types)
    // NOTE: this allows account types to be referenced via `defined.<AccountName>`, however
    // it would break if we have an account used that way, but no types
    // If that occurs we need to generate the `types/index.ts` just reexporting accounts
    const indexCode = this.renderExportsIndex(reexports.sort(), 'types')
    await fs.writeFile(this.paths.typeFile('index'), indexCode, 'utf8')
  }
  // -----------------
  // Errors
  // -----------------
  private async writeErrors(errorsCode: string) {
    assert(this.paths != null, 'should have set paths')
    await prepareTargetDir(this.paths.errorsDir)
    logInfo('Writing errors to directory: %s', this.paths.relErrorsDir)
    logDebug('Writing index.ts containing all errors')
    await fs.writeFile(this.paths.errorFile('index'), errorsCode, 'utf8')
  }
  // -----------------
  // Main Index File
  // -----------------
  async writeMainIndex(reexports: string[], instructions: Record<string, string>, accounts: Record<string, string>, types: Record<string, string> ) {
    assert(this.paths != null, 'should have set paths')
    const reexportCode = this.renderExportsIndex(reexports.sort(), 'main')
    const importsCode = this.renderImports(Object.keys(instructions).sort(), Object.keys(accounts).sort(), Object.keys(types).sort())
    const unionInstructions = this.renderInstructionUnion(Object.keys(instructions).sort(), 'ParsedInstructions')
    const unionAccounts = this.renderUnions(Object.keys(accounts).sort(), 'ParsedAccounts')
    const unionAccountsData = this.renderUnionsAccountsData(Object.keys(accounts).sort(), 'ParsedAccountsData')
    const unionTypes = this.renderUnions(Object.keys(types).sort(), 'ParsedTypes')
    let code = `
${reexportCode}
${importsCode}
${unionInstructions}
${unionAccounts}
${unionAccountsData}
${unionTypes}
`.trim()
    await fs.writeFile(path.join(this.paths.root, `index.ts`), code, 'utf8')
  }
  private renderExportsIndex(modules: string[], label: string) {
    const extension = label === 'main' ? '/index.js' : '.js'
    let code = modules.map((x) => `export * from './${x}${extension}';`).join('\n')
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(`Failed to format ${label} imports`)
        logError(err)
      }
    }
    return code
  }
  private renderImports(instructions: string[], accounts: string[], types: string[]) {
    let code = `import {\n`
    for(let i = 0; i < instructions.length; i++){
      code += instructions[i].charAt(0).toUpperCase().concat(instructions[i].slice(1)) + 'Instruction,\n'
    }
    code = code.slice(0, code.length-2)
    code += `\n} from './instructions/index.js';\n\nimport {\n`
    for(let i = 0; i < accounts.length; i++){
      code += accounts[i] + ',\n' + accounts[i] + 'Args ,\n'
    }
    code = code.slice(0, code.length-2)
    code += `\n} from './accounts/index.js';\n\nimport {\n`
    for(let i = 0; i < types.length; i++){
      code += types[i] + ',\n'
    }
    code = code.slice(0, code.length-2)
    code += `\n} from './types/index.js';`
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(err)
      }
    }
    return code
  }
  private renderInstructionUnion(modules: string[], label: string) {
    let code = `export type ${label} =\n`
    code += modules.map((x) => `${x.charAt(0).toUpperCase().concat(x.slice(1))}Instruction |`).join('\n')
    code = code.slice(0, code.length-2)
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(`Failed to format ${label} imports`)
        logError(err)
      }
    }
    return code
  }
  private renderUnions(modules: string[], label: string) {
    let code = `export type ${label} =\n`
    code += modules.map((x) => `${x.charAt(0).toUpperCase().concat(x.slice(1))} |`).join('\n')
    code = code.slice(0, code.length-2)
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(`Failed to format ${label} imports`)
        logError(err)
      }
    }
    return code
  }
  private renderUnionsAccountsData(modules: string[], label: string) {
    let code = `export type ${label} =\n`
    code += modules.map((x) => `${x.charAt(0).toUpperCase().concat(x.slice(1))}Args |`).join('\n')
    code = code.slice(0, code.length-2)
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(`Failed to format ${label} imports`)
        logError(err)
      }
    }
    return code
  }
  private renderImportInstructionIndex(modules: string[], label: string) {
    let code = modules.map((module) => `export * from './${module}.js';`).join('\n')
    
    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        logError(`Failed to format ${label} imports`)
        logError(err)
      }
    }
    return code
  }
}