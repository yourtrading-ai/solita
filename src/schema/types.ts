import { IdlTypeEnum, IdlAccountType } from "../"
import { NumbersExports, EnumsExports, CompositesExports, StringExports, CollectionsExports, AliasesExports } from "@metaplex-foundation/beet"

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

type KeysExport = "publicKey" | "keysTypeMap"

export type TypeMapKey =
  | CollectionsTypeMapKey
  | StringTypeMapKey
  | CompositesTypeMapKey
  | EnumsTypeMapKey
  | NumbersTypeMapKey

// -----------------
// Resolvers
// -----------------
export type ResolveFieldType = (
  typeName: string
) => IdlAccountType | IdlTypeEnum | null
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
    schema: '[Int]',
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