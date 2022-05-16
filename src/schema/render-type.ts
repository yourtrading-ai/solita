import { TypeMapper } from './type-mapper'
import {
  IdlDefinedTypeDefinition,
  IdlField,
  isIdlTypeEnum,
  PrimitiveTypeKey,
} from './types'
import { strict as assert } from 'assert'
import { renderScalarEnum } from './render-enums'
import { PathLike } from 'fs'

export function beetVarNameFromTypeName(ty: string) {
  const camelTyName = ty.charAt(0).toLowerCase().concat(ty.slice(1))
  return `${camelTyName}Beet`
}

class TypeRenderer {
  readonly upperCamelTyName: string
  readonly camelTyName: string
  readonly beetArgName: string
  constructor(
    readonly ty: IdlDefinedTypeDefinition,
    readonly fullFileDir: PathLike,
    readonly typeMapper = new TypeMapper()
  ) {
    this.upperCamelTyName = ty.name
      .charAt(0)
      .toUpperCase()
      .concat(ty.name.slice(1))

    this.camelTyName = ty.name.charAt(0).toLowerCase().concat(ty.name.slice(1))
    this.beetArgName = beetVarNameFromTypeName(ty.name)
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private renderTypeField = (field: IdlField) => {
    const typescriptType = this.typeMapper.map(field.type, field.name)
    return `${field.name}: ${typescriptType}`
  }
  private renderTypes() {
    if (isIdlTypeEnum(this.ty.type)) {
      return renderScalarEnum(
          this.ty.name,
          this.ty.type.variants.map((x) => x.name),
          true
      )
    }
    const fields = this.ty.type.fields
        .map((field) => `\t`+this.renderTypeField(field)).join(',\n  ')

    if(this.ty.type.fields.length == 0){
      return`type ${this.upperCamelTyName} {}`  + `\n`
    }
    else{
      return `type ${this.upperCamelTyName} {`+`\n`+
      `${fields}` + `\n` +
      `}` + `\n`
    }
  }

  // -----------------
  // Data Struct
  // -----------------

  private renderDataStructs() {
    const kind = this.ty.type.kind
    assert(
      kind === 'struct' || kind === 'enum',
      `only user defined structs or enums are supported, ${this.ty.name} is of type ${this.ty.type.kind}`
    )
    const types = this.renderTypes()

    return { types }
  }

  /**
   * Performs parts of the render process that is necessary to determine if the
   * type is fixed or fixable.
   */
  determineIsFixable() {
    this.typeMapper.clearUsages()
    this.renderDataStructs()
    return this.typeMapper.usedFixableSerde
  }

  render() {
    this.typeMapper.clearUsages()
    const { types } = this.renderDataStructs()

    return `${types}`
  }
}

/**
 * Performs parts of the render process that is necessary to determine if the
 * type is fixed or fixable.
 */
export function determineTypeIsFixable(
  ty: IdlDefinedTypeDefinition,
  fullFileDir: PathLike,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>
) {
  const typeMapper = new TypeMapper(accountFilesByType, customFilesByType)
  const renderer = new TypeRenderer(ty, fullFileDir, typeMapper)
  return renderer.determineIsFixable()
}

export function renderType(
  ty: IdlDefinedTypeDefinition,
  fullFileDir: PathLike,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>,
  typeAliases: Map<string, PrimitiveTypeKey>,
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
    
  )
  const renderer = new TypeRenderer(ty, fullFileDir, typeMapper)
  const code = renderer.render()
  const isFixable = renderer.typeMapper.usedFixableSerde
  return { code, isFixable }
}
