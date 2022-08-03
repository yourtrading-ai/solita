import { TypeMapper } from './type-mapper'
import { IdlTypeDef } from "../"
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
    private readonly account: IdlTypeDef,
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
    const type = this.account.type.kind
    if(type == "enum"){
      return this.account.type.variants.map((f) => {
        const tsType = this.typeMapper.map(f.type, f.name)
        return { name: f.name, tsType }
      })
    }
    else{
      return this.account.type.fields.map((f) => {
        const tsType = this.typeMapper.map(f.type, f.name)
        return { name: f.name, tsType }
      })
    }
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


    //Make sure to only print Data when it actually has content
    if(renderedFields.length==0){
      return `
type ${this.accountDataArgsTypeName} implements Account {
\tname: String
\ttype: AccountType
\taddress: String
\tstats: AccessStats
\tdata: Null
}
`
    }else {

      return `
type ${this.accountDataArgsTypeName} implements Account {
\tname: String
\ttype: AccountType
\taddress: String
\tstats: AccessStats
\tdata: ${this.accountDataArgsTypeName}_Data
}

type ${this.accountDataArgsTypeName}_Data {
\t${renderedFields}
}
`
    }
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
  account: IdlTypeDef,
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
