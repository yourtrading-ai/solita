import { ForceFixable, TypeMapper } from './type-mapper'
import {
  IdlDefinedTypeDefinition,
  IdlField, isIdlTypeArray,
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
        .map((field) => this.renderTypeField(field))
        //.join(': ,\n  ')

    let outputcode = ""
    var BorshDecimalNotIntitialized = false //keeps track if already created type BorshDecimal
    if(this.ty.type.fields.length == 0){
      outputcode = `type ${this.upperCamelTyName} {}`  + `\n`
      return outputcode
    }
    else{
      let counter = 0
      outputcode = `type ${this.upperCamelTyName} {` + `\n`
      for (var element of this.ty.type.fields){
        if (String(element.type) == "u8" || String(element.type) == "i8" || String(element.type) == "u32" || String(element.type) == "i32") {
            outputcode += `\t` + element.name + `: Int ` + `\n`
          } else if (String(element.type) == "u64" || String(element.type) == "i64" || String(element.type) == "i128" || String(element.type) == "u128") {
            outputcode += `\t` + element.name + ": GraphQLLong " + "  \n"
          } else if (String(element.type)  == "BorshDecimal") {
            //consists of
            // mantissa: beet.bignum
            // scale: number
            if (BorshDecimalNotIntitialized){
              outputcode +=
                  "type BorshDecimal { \n" +
                  "mantissa: GraphQLLong \n" +
                  "scale: Int \n }"
              BorshDecimalNotIntitialized = true
            }
    
            outputcode += element.name + ": " + "BorshDecimalA \n"
          } else if (isIdlTypeArray(element.type)) { //Array types
    
            if (fields[counter] != null) {
    
              //numberarrays
              if (fields[counter].substring(fields[counter].indexOf(':') + 1, fields[counter].indexOf('[')).trim() === "number") {
                outputcode += `\t` + element.name + ": " + "[Int] \n"
    
                //booleanarrays
              } else if (fields[counter].substring(fields[counter].indexOf(':') + 1, fields[counter].indexOf('[')).trim() === "boolean") {
                outputcode += `\t` + element.name + ": " + "[Boolean] \n"
                //bignumnarrays
              } else if (fields[counter].substring(fields[counter].indexOf(':') + 1, fields[counter].indexOf('[')).trim() === "beet.bignum") {
                outputcode += `\t` + element.name + ": " + "[GraphQLLong] \n"
              } else{
                outputcode += `\t` + fields[counter] + "\n"       //An array but no type match? just print it then
              }
            } else {
              outputcode += `\t` + fields[counter] + "\n" //Nothing from the above? number array nothing? then just print what you are
            }
          }
          counter++
      }
      outputcode = outputcode + `}` + `\n`
      return outputcode
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
  forceFixable: ForceFixable
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
    forceFixable
  )
  const renderer = new TypeRenderer(ty, fullFileDir, typeMapper)
  const code = renderer.render()
  const isFixable = renderer.typeMapper.usedFixableSerde
  return { code, isFixable }
}
