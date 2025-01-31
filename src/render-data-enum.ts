import camelcase from 'camelcase'
import { TypeMapper } from './type-mapper'
import { BEET_EXPORT_NAME, IdlDataEnumVariant, IdlTypeDataEnum } from './types'

/**
 * Renders union type and related methods for Rust data enum.
 */
export function renderTypeDataEnumBeet(args: {
  typeMapper: TypeMapper
  dataEnum: IdlTypeDataEnum
  beetVarName: string
  typeName: string
}) {
  const { typeMapper, dataEnum, beetVarName, typeName } = args
  const enumRecordName = `${typeName}Record`

  const renderedVariants = dataEnum.variants.map((variant) => {
    const tm = typeMapper.clone()
    const beet = renderVariant(tm, enumRecordName, variant)
    for (const used of tm.serdePackagesUsed) {
      typeMapper.serdePackagesUsed.add(used)
    }
    for (const [key, val] of tm.scalarEnumsUsed) {
      typeMapper.scalarEnumsUsed.set(key, val)
    }
    typeMapper.usedFixableSerde =
      typeMapper.usedFixableSerde || tm.usedFixableSerde
    return { beet, usedFixableSerde: tm.usedFixableSerde }
  })

  const renderedBeets = renderedVariants
    .map((variant) => variant.beet)
    .join(',\n')

  // The size of a data enum is considered non-deterministic even though exceptions
  // exist, i.e. when they have a single variant
  const beetType = 'FixableBeet'
  typeMapper.usedFixableSerde = true

  return `export const ${beetVarName} = ${BEET_EXPORT_NAME}.dataEnum<${enumRecordName}>([
  ${renderedBeets} 
]) as ${BEET_EXPORT_NAME}.${beetType}<${typeName}>
`
}

function renderVariant(
  typeMapper: TypeMapper,
  enumRecordName: string,
  variant: IdlDataEnumVariant
) {
  const mappedFields = typeMapper.mapSerdeFields(variant.fields)
  const fieldDecls = mappedFields
    .map((f) => {
      const fieldName = camelcase(f.name)
      return `  ['${fieldName}', ${f.type}]`
    })
    .join(',\n    ')

  const beetArgsStructType = typeMapper.usedFixableSerde
    ? 'FixableBeetArgsStruct'
    : 'BeetArgsStruct'

  const typeName = `${enumRecordName}["${variant.name}"]`

  const beet = `
  [ 
    '${variant.name}',
    new ${BEET_EXPORT_NAME}.${beetArgsStructType}<${typeName}>(
    [
    ${fieldDecls}
    ],
    '${typeName}'
  )]`

  return beet
}

export function renderDataEnumRecord(
  typeMapper: TypeMapper,
  typeName: string,
  variants: IdlDataEnumVariant[]
) {
  const renderedVariants = variants.map((variant) => {
    const fields = variant.fields.map((f) => {
      const typescriptType = typeMapper.map(f.type, f.name)
      const fieldName = camelcase(f.name)
      return `${fieldName}: ${typescriptType}`
    })
    return `  ${variant.name}: { ${fields.join(', ')} }`
  })

  const renderedGuards = variants.map((variant) => {
    const v = variant.name
    return `export const is${typeName}${v} = (
  x: ${typeName}
): x is ${typeName} & { __kind: '${v}' } => x.__kind === '${v}'`
  })

  return `
/**
 * This type is used to derive the {@link ${typeName}} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link ${typeName}} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type ${typeName}Record = {
  ${renderedVariants.join(',\n  ')}    
}

/**
 * Union type respresenting the ${typeName} data enum defined in Rust.
 *
 * NOTE: that it includes a \`__kind\` property which allows to narrow types in
 * switch/if statements.
 * Additionally \`is${typeName}*\` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type ${typeName} = beet.DataEnumKeyAsKind<${typeName}Record>

${renderedGuards.join('\n')}    
`.trim()
}
