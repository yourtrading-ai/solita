import {
  PrimitiveTypeKey,
  supportedTypeMap,
  PrimaryTypeMap
} from './types'
import { isIdlTypeOption, isIdlTypeVec, isIdlTypeArray, isIdlTypeDefined, isIdlTypeEnum, IdlType, IdlTypeEnum, IdlEnumVariant, IdlTypeOption, IdlTypeVec, IdlTypeArray, IdlTypeDefined } from "../"
import { getOrCreate, logDebug } from '../solita/utils'
import { strict as assert } from 'assert'


export type ForceFixable = (ty: IdlType) => boolean
export const FORCE_FIXABLE_NEVER: ForceFixable = () => false

const NO_NAME_PROVIDED = '<no name provided>'
export class TypeMapper {
  readonly localImportsByPath: Map<string, Set<string>> = new Map()
  readonly scalarEnumsUsed: Map<string, string[]> = new Map()
  usedFixableSerde: boolean = false
  constructor(
    /** Account types mapped { typeName: fullPath } */
    private readonly accountTypesPaths: Map<string, string> = new Map(),
    /** Custom types mapped { typeName: fullPath } */
    private readonly customTypesPaths: Map<string, string> = new Map(),
    /** Aliases mapped { alias: actualType } */
    private readonly typeAliases: Map<string, PrimitiveTypeKey> = new Map(),
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  clearUsages() {
    this.localImportsByPath.clear()
    this.usedFixableSerde = false
    this.scalarEnumsUsed.clear()
  }
  private updateScalarEnumsUsed(name: string, ty: IdlTypeEnum) {
    const variants = ty.variants.map((x: IdlEnumVariant) => x.name)
    const currentUsed = this.scalarEnumsUsed.get(name)
    if (currentUsed != null) {
      assert.deepStrictEqual(
        variants,
        currentUsed,
        `Found two enum variant specs for ${name}, ${variants} and ${currentUsed}`
      )
    } else {
      this.scalarEnumsUsed.set(name, variants)
    }
  }

  // -----------------
  // Map TypeScript Type
  // -----------------
  private mapPrimitiveType(ty: PrimitiveTypeKey, name: string) {
    const mapped = this.primaryTypeMap[ty]

    let typescriptType = mapped.schema

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    typescriptType = `${typescriptType}`
    return typescriptType
  }

  private mapOptionType(ty: IdlTypeOption, name: string) {
    const inner = this.map(ty.option, name)
    return `${inner}`
  }

  private mapVecType(ty: IdlTypeVec, name: string) {
    const inner = this.map(ty.vec, name)
    return `[${inner}]`
  }

  private mapArrayType(ty: IdlTypeArray, name: string) {
    const inner = this.map(ty.array[0], name)
    return `[${inner}]`
  }

  private mapDefinedType(ty: IdlTypeDefined) {
    const fullFileDir = this.definedTypesImport(ty)
    const imports = getOrCreate(this.localImportsByPath, fullFileDir, new Set())
    imports.add(ty.defined)
    return ty.defined + '!'
  }

  private mapEnumType(ty: IdlTypeEnum, name: string) {
    assert.notEqual(
      name,
      NO_NAME_PROVIDED,
      'Need to provide name for enum types'
    )
    this.updateScalarEnumsUsed(name, ty)
    return name
  }

  map(ty: IdlType, name: string = NO_NAME_PROVIDED): string {
    if (typeof ty === 'string') {
      return this.mapPrimitiveType(ty, name)
    }
    if (isIdlTypeOption(ty)) {
      return this.mapOptionType(ty, name)
    }
    if (isIdlTypeVec(ty)) {
      return this.mapVecType(ty, name)
    }
    if (isIdlTypeArray(ty)) {
      return this.mapArrayType(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      const alias = this.typeAliases.get(ty.defined)
      return alias == null
        ? this.mapDefinedType(ty)
        : this.mapPrimitiveType(alias, name)
    }
    if (isIdlTypeEnum(ty)) {
      return this.mapEnumType(ty, name)
    }

    throw new Error(`Type ${ty} required for ${name} is not yet supported`)
  }
  private definedTypesImport(ty: IdlTypeDefined) {
    return (
      this.accountTypesPaths.get(ty.defined) ??
      this.customTypesPaths.get(ty.defined) ??
      assert.fail(
        `Unknown type ${ty.defined} is neither found in types nor an Account`
      )
    )
  }
  static defaultPrimaryTypeMap: PrimaryTypeMap = {
    ...supportedTypeMap,
  }
}
