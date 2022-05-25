export const BEET_PACKAGE = '@metaplex-foundation/beet'
export const BEET_SOLANA_PACKAGE = '@metaplex-foundation/beet-solana'
export const SOLANA_WEB3_PACKAGE = '@solana/web3.js'
export const SOLANA_SPL_TOKEN_PACKAGE = '@solana/spl-token'
export const BEET_EXPORT_NAME = 'beet'
export const BEET_SOLANA_EXPORT_NAME = 'beetSolana'
export const SOLANA_WEB3_EXPORT_NAME = 'web3'
export const SOLANA_SPL_TOKEN_EXPORT_NAME = 'splToken'
export type TypeMappedSerdeField = {
  name: string
  type: string
} //-------QUITAR//-------QUITAR//-------QUITAR//-------QUITAR//-------QUITAR
// -----------------
// Config
// -----------------
export type TypeAliases = Record<string, PrimitiveTypeKey>
// -----------------
// IDL
// -----------------
export type IdlField = {
  name: string
  type: IdlType
}

export type IdlInstructionAccount = {
  name: string
  isMut: boolean
  isSigner: boolean
  desc?: string
  optional?: boolean
}

export type IdlType =
  | TypeMapKey
  | 'publicKey'
  | IdlTypeDefined
  | IdlTypeOption
  | IdlTypeVec
  | IdlTypeArray
  | IdlTypeEnum

// User defined type.
export type IdlTypeDefined = {
  defined: string
}

export type IdlTypeOption = {
  option: IdlType
}

export type IdlTypeVec = {
  vec: IdlType
}

export type IdlTypeArray = {
  array: [idlType: IdlType, size: number]
}

export type IdlEnumVariant = {
  name: string
}

export type IdlTypeEnum = {
  kind: 'enum'
  variants: IdlEnumVariant[]
}

export type IdlDefinedType = {
  kind: 'struct' | 'enum'
  fields: IdlField[]
}

export type IdlDefinedTypeDefinition = {
  name: string
  type: IdlDefinedType | IdlTypeEnum
}

export type IdlInstructionArg = {
  name: string
  type: IdlType
}

export type IdlInstruction = {
  name: string
  accounts: IdlInstructionAccount[]
  args: IdlInstructionArg[]
}

export type IdlAccountType = {
  kind: 'struct' | 'enum'
  fields: IdlField[]
}

export type IdlAccount = {
  name: string
  type: IdlAccountType
}

export type IdlError = {
  code: number
  name: string
  msg?: string
}

export type Idl = {
  version: string
  name: string
  instructions: IdlInstruction[]
  accounts?: IdlAccount[]
  errors?: IdlError[]
  types?: IdlDefinedTypeDefinition[]
  metadata: {
    address: string
  }
}

export type PrimitiveTypeKey = TypeMapKey | KeysTypeMapKey
export type PrimaryTypeMap = Record<
  PrimitiveTypeKey,
  SupportedTypeDefinition & {
    idl: TypesExports | KeysExport
  }
>

export type TypesExports =
  | CollectionsExports
  | StringExports
  | CompositesExports
  | EnumsExports
  | NumbersExports
  | AliasesExports

type NumbersExports = "u8" | "u16" | "u32" | "u64" | "u128" | "u256" | "u512" | "i8" | "i16" | "i32" | "i64" | "i128" | "i256" | "i512" | "bool" | "numbersTypeMap"
type EnumsExports = "fixedScalarEnum" | "dataEnum" | "enumsTypeMap"
type CompositesExports = "isSomeBuffer" | "isNoneBuffer" | "coptionNone" | "coptionSome" | "coption" | "compositesTypeMap"
type StringExports = "fixedSizeUtf8String" | "utf8String" | "stringTypeMap"
type CollectionsExports = "uniformFixedSizeArray" | "fixedSizeArray" | "array" | "fixedSizeBuffer" | "fixedSizeUint8Array" | "uint8Array" | "collectionsTypeMap"
type KeysExport = "publicKey" | "keysTypeMap"
type AliasesExports = "bytes" | "aliasesTypeMap"

export type TypeMapKey =
  | CollectionsTypeMapKey
  | StringTypeMapKey
  | CompositesTypeMapKey
  | EnumsTypeMapKey
  | NumbersTypeMapKey

// -----------------
// Shank Idl Extensions
// -----------------
export type ShankIdl = Idl & {
  instructions: ShankIdlInstruction[]
  metadata: ShankMetadata
}
export type ShankIdlInstruction = IdlInstruction & {
  accounts: IdlInstructionAccountWithDesc[]
  discriminant: {
    type: IdlType
    value: number
  }
}
export type IdlInstructionAccountWithDesc = IdlInstructionAccount & {
  desc: string
}
export type ShankMetadata = Idl['metadata'] & { origin: 'shank' }

// -----------------
// Resolvers
// -----------------
export type ResolveFieldType = (
  typeName: string
) => IdlAccountType | IdlTypeEnum | null
// -----------------
// Guards
// -----------------
export function isIdlTypeOption(ty: IdlType): ty is IdlTypeOption {
  return (ty as IdlTypeOption).option != null
}
export function isIdlTypeVec(ty: IdlType): ty is IdlTypeVec {
  return (ty as IdlTypeVec).vec != null
}

export function isIdlTypeArray(ty: IdlType): ty is IdlTypeArray {
  return (ty as IdlTypeArray).array != null
}

export function isIdlTypeDefined(ty: IdlType): ty is IdlTypeDefined {
  return (ty as IdlTypeDefined).defined != null
}

export function isIdlTypeEnum(
  ty: IdlType | IdlDefinedType | IdlTypeEnum
): ty is IdlTypeEnum {
  return (ty as IdlTypeEnum).variants != null
}

export function isIdlDefinedType(
  ty: IdlType | IdlDefinedType
): ty is IdlDefinedType {
  return (ty as IdlDefinedType).fields != null
}

export function isShankIdl(ty: Idl): ty is ShankIdl {
  return (ty as ShankIdl).metadata?.origin === 'shank'
}

export function isShankIdlInstruction(
  ty: IdlInstruction
): ty is ShankIdlInstruction {
  return typeof (ty as ShankIdlInstruction).discriminant === 'object'
}

export function isIdlInstructionAccountWithDesc(
  ty: IdlInstructionAccount
): ty is IdlInstructionAccountWithDesc {
  return typeof (ty as IdlInstructionAccountWithDesc).desc === 'string'
}

//--------------------------
export type SupportedTypeDefinition = {
  idl: string
  schema: string
}
//--------------------------
export type NumbersTypeMapKey = "u8" | "u16" | "u32" | "u64" | "u128" | "u256" | "u512" | "i8" | "i16" | "i32" | "i64" | "i128" | "i256" | "i512" | "bool"

export type NumbersTypeMap = Record<
  NumbersTypeMapKey,
  SupportedTypeDefinition & { idl: NumbersExports }
>

export const numbersTypeMap: NumbersTypeMap = {
  // <= 32-bit numbers and boolean
  u8   : { idl: 'u8',    schema: 'Int' },
  u16  : { idl: 'u16',   schema: 'Int' },
  u32  : { idl: 'u32',   schema: 'Int' },
  i8   : { idl: 'i8',    schema: 'Int' },
  i16  : { idl: 'i16',   schema: 'Int' },
  i32  : { idl: 'i32',   schema: 'Int' },
  bool : { idl: 'bool',  schema: 'Boolean' },
  // Big Number, they use, the 'bignum' type which is defined in this package
  u64  : { idl: 'u64',   schema: 'GraphQLLong' },
  u128 : { idl: 'u128',  schema: 'GraphQLLong' },
  u256 : { idl: 'u256',  schema: 'GraphQLLong' },
  u512 : { idl: 'u512',  schema: 'GraphQLLong' },
  i64  : { idl: 'i64',   schema: 'GraphQLLong' },
  i128 : { idl: 'i128',  schema: 'GraphQLLong' },
  i256 : { idl: 'i256',  schema: 'GraphQLLong' },
  i512 : { idl: 'i512',  schema: 'GraphQLLong' },
}
//--------------------------
export type StringTypeMapKey = 'string' | 'fixedSizeString'

export type StringTypeMap = Record<
  StringTypeMapKey,
  SupportedTypeDefinition & { idl: StringExports }
>

export const stringTypeMap: StringTypeMap = {
  fixedSizeString: {
    idl: 'utf8String',
    schema: 'String',
  },
  string: {
    idl: 'fixedSizeUtf8String',
    schema: 'String',
  },
}

//--------------------------
export type EnumsTypeMapKey = 'fixedScalarEnum' | 'dataEnum'

export type EnumsTypeMap = Record<
  EnumsTypeMapKey,
  SupportedTypeDefinition & { idl: EnumsExports }
>

export const enumsTypeMap: EnumsTypeMap = {
  fixedScalarEnum: {
    idl: 'fixedScalarEnum',
    schema: '<TypeName>',
  },
  dataEnum: {
    idl: 'dataEnum',
    schema: 'DataEnum<Kind, Inner>',
  },
}
//--------------------------
export type CompositesTypeMapKey = 'option'

export type CompositesTypeMap = Record<
  CompositesTypeMapKey,
  SupportedTypeDefinition & { idl: CompositesExports }
>

export const compositesTypeMap: CompositesTypeMap = {
  option: {
    idl: 'coption',
    schema: 'COption<Inner>',
  },
}
//--------------------------
export type CollectionsTypeMapKey = "Array" | "FixedSizeArray" | "UniformFixedSizeArray" | "Buffer" | "Uint8Array"  | 'FixedSizeUint8Array'

export type CollectionsTypeMap = Record<
  CollectionsTypeMapKey,
  SupportedTypeDefinition & { idl: CollectionsExports }
>

export const collectionsTypeMap: CollectionsTypeMap = {
  Array: {
    idl: 'array',
    schema: 'Array',
  },
  FixedSizeArray: {
    idl: 'fixedSizeArray',
    schema: 'Array',
  },
  UniformFixedSizeArray: {
    idl: 'uniformFixedSizeArray',
    schema: 'Array',
  },
  Buffer: {
    idl: 'fixedSizeBuffer',
    schema: 'Buffer',
  },
  FixedSizeUint8Array: {
    idl: 'fixedSizeUint8Array',
    schema: 'Uint8Array',
  },
  Uint8Array: {
    idl: 'uint8Array',
    schema: 'Uint8Array',
  },
}
//--------------------------
export type KeysTypeMapKey = 'publicKey'

export type KeysTypeMap = Record<
  KeysTypeMapKey,
  SupportedTypeDefinition & { idl: KeysExport }
>

export const keysTypeMap: KeysTypeMap = {
  publicKey: {
    idl: 'publicKey',
    schema: 'PublicKey',
  },
}
//--------------------------
export type AliasesTypeMapKey = 'bytes'

export type AliasesTypeMap = Record<
  AliasesTypeMapKey,
  SupportedTypeDefinition & { idl: AliasesExports }
>

export const aliasesTypeMap: AliasesTypeMap = {
  bytes: {
    idl: 'bytes',
    schema: '[Int!]',
  },
}
//--------------------------
export const supportedTypeMap: Record<
  TypeMapKey | KeysTypeMapKey,
  SupportedTypeDefinition & {
    idl: TypesExports | KeysExport
  }
> = {
  ...collectionsTypeMap,
  ...stringTypeMap,
  ...compositesTypeMap,
  ...enumsTypeMap,
  ...numbersTypeMap,
  ...keysTypeMap,
  ...aliasesTypeMap
}