import { TypeMapper } from './type-mapper'
import { IdlAccount } from "../"
import {
  PrimitiveTypeKey,
} from './types'

function colonSeparatedTypedField(
  field: { name: string; tsType: string },
  prefix = ''
) {
  return `${prefix}${field.name}: ${field.tsType.replace("!", "")}`
}

class AccountRenderer {
  readonly upperCamelAccountName: string
  readonly camelAccountName: string
  readonly accountDataClassName: string
  readonly accountDataArgsTypeName: string

  constructor(
    private readonly account: IdlAccount,
    private readonly typeMapper: TypeMapper
  ) {
    this.upperCamelAccountName = account.name
      .charAt(0)
      .toUpperCase()
      .concat(account.name.slice(1))

    this.camelAccountName = account.name
      .charAt(0)
      .toLowerCase()
      .concat(account.name.slice(1))

    this.accountDataClassName = this.upperCamelAccountName
    this.accountDataArgsTypeName = `${this.accountDataClassName}`
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private getTypedFields() {
    return this.account.type.fields.map((f) => {
      const tsType = this.typeMapper.map(f.type, f.name)
      return { name: f.name, tsType }
    })
  }

  // -----------------
  // Account Args
  // -----------------
  private renderAccountDataArgsType(
    fields: { name: string; tsType: string }[]
  ) {
    const renderedFields = fields
      .map((f) => colonSeparatedTypedField(f))
      .join('\n\t')

    return `
type ${this.accountDataArgsTypeName} implements Account {
\tname: String
\ttype: AccountType
\taddress: String
\tstats: AccessStats
\tdata: ${this.accountDataArgsTypeName}Data
}

type ${this.accountDataArgsTypeName}Data {
\t${renderedFields}
}
`
  }


  // -----------------
  // Struct
  // -----------------

  render() {
    this.typeMapper.clearUsages()

    const typedFields = this.getTypedFields()
    const accountDataArgsType = this.renderAccountDataArgsType(typedFields)
    return `${accountDataArgsType}`
  }
}

export function renderAccount(
  account: IdlAccount,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>,
  typeAliases: Map<string, PrimitiveTypeKey>,
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
  )
  const renderer = new AccountRenderer(
    account,
    typeMapper
  )
  return renderer.render()
}
