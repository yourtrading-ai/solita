export function renderScalarEnum(
  name: string,
  variants: string[],
  includeExport: boolean
) {
  const exp = includeExport ? '' : ''
  return `
${exp}enum ${name} {
  ${variants.join(',\n  ')}    
}`
}

export function renderScalarEnums(
  map: Map<string, string[]>,
  includeExport = false
) {
  const codes = []
  for (const [name, variants] of map) {
    codes.push(renderScalarEnum(name, variants, includeExport))
  }
  return codes
}
