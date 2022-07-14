import {
  IdlInstruction,
  IdlInstructionAccount,
  IdlInstructionArg,
  PrimitiveTypeKey,
} from '../'
import { TypeMapper } from './type-mapper'
import {
  ResolvedKnownPubkey,
  resolveKnownPubkey,
} from '../solita/known-pubkeys'

type ProcessedAccountKey = IdlInstructionAccount & {
  knownPubkey?: ResolvedKnownPubkey
  optional: boolean
}

class InstructionRenderer {
  readonly upperCamelIxName: string
  readonly camelIxName: string
  readonly argsTypename: string
  readonly accountsTypename: string
  readonly instructionDiscriminatorName: string
  readonly structArgName: string
  readonly accounts: string

  constructor(
    readonly ix: IdlInstruction,
    private readonly typeMapper: TypeMapper
  ) {
    this.upperCamelIxName = ix.name
      .charAt(0)
      .toUpperCase()
      .concat(ix.name.slice(1))

    this.camelIxName = ix.name.charAt(0).toLowerCase().concat(ix.name.slice(1))

    this.argsTypename = `${this.upperCamelIxName}InstructionArgs`
    this.accountsTypename = `${this.upperCamelIxName}InstructionAccounts`
    this.accounts = `${this.upperCamelIxName}Accounts`
    this.instructionDiscriminatorName = `${this.camelIxName}InstructionDiscriminator`
    this.structArgName = `${ix.name}Struct`
  }
    // -----------------
  // Instruction Args Type
  // -----------------
  private renderIxArgField = (arg: IdlInstructionArg, listVoid: string[]) => {
    const typescriptType = this.typeMapper.map(arg.type, arg.name)
    let check = false
    for(let i = 0; i< listVoid.length; i++){
      if(typescriptType.slice(0, -1) == listVoid[i]){
        check = true
      }
    }
    if(check == true){
      return `${arg.name}: Null`
    }
    else{
      return `${arg.name}: ${typescriptType}`
    }
  }

  private renderIxArgsType(listVoid: string[]) {
    if (this.ix.args.length === 0) return ''
    const fields = this.ix.args
      .map((field) => 
        this.renderIxArgField(field, listVoid).replace("!", "")
      ).join(',\n  ')
    const code = `type ${this.argsTypename} {
\t${fields}
}`.trim()
    return code
  }

  // -----------------
  // Accounts
  // -----------------
  private processIxAccounts(): ProcessedAccountKey[] {
    return this.ix.accounts.map((acc) => {
      const knownPubkey = resolveKnownPubkey(acc.name)
      const optional = acc.optional ?? false
      return knownPubkey == null
        ? { ...acc, optional }
        : { ...acc, knownPubkey, optional }
    })
  }

  private renderAccountsType(processedKeys: ProcessedAccountKey[]) {
    if (processedKeys.length === 0) return ''
    const fields = processedKeys
      .filter((x) => x.knownPubkey == null)
      .map((x) => {
        const optional = x.optional ? '?' : ''
        return `${x.name}${optional}: PublicKey`
      })
      .join('\n\t')

    return `
type ${this.accountsTypename} {
\t${fields}
}
`
  }
  private renderAccountsArg(processedKeys: ProcessedAccountKey[]) {
    if (processedKeys.length === 0) return ''
    return `accounts: ${this.accountsTypename},`.replace("!", "")
  }

  // -----------------
  // Data Struct
  // -----------------


  render(listVoid: string[]) {
    this.typeMapper.clearUsages()

    const ixArgType = this.renderIxArgsType(listVoid)
    const processedKeys = this.processIxAccounts()
    const accountsType = this.renderAccountsType(processedKeys)
    const accountsArg = this.renderAccountsArg(processedKeys)
    const createInstructionArgs = `args: ${this.argsTypename}`

return`${accountsType}
${ixArgType}

type ${this.upperCamelIxName}Instruction implements Instruction {
\tid: String
\ttype: InstructionType
\ttimestamp: Datetime
\tprogramId: String
\taccount: String
\t${accountsArg}
\t${createInstructionArgs}
}


#*-------------------------------------------------------------------*#
`
  }
}

export function renderInstruction(
  ix: IdlInstruction,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>,
  typeAliases: Map<string, PrimitiveTypeKey>,
  listVoid: string[]
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
  )
  const renderer = new InstructionRenderer(
    ix,
    typeMapper
  )
  return renderer.render(listVoid)
}
