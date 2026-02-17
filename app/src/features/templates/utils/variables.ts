import type { TemplateVariable, VariableValues } from '@/types/template'

const VARIABLE_REGEX = /(?<!\\)\{\{(\w+)\}\}/g

/**
 * Extract unique variable names from template text.
 * Pattern: {{variableName}} — escaped \{\{ is ignored.
 */
export function extractVariables(text: string): string[] {
  const names: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(VARIABLE_REGEX.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    if (!names.includes(match[1])) {
      names.push(match[1])
    }
  }
  return names
}

/**
 * Substitute variables in template text.
 * Replaces {{varName}} with corresponding value.
 * Unmatched variables remain as-is.
 */
export function substituteVariables(text: string, values: VariableValues): string {
  return text.replace(VARIABLE_REGEX, (fullMatch, varName: string) => {
    return varName in values ? values[varName] : fullMatch
  })
}

/**
 * Generate TemplateVariable[] from system + user prompts.
 * Merges variables from both, deduplicates by name.
 */
export function detectVariables(
  systemPrompt: string | undefined,
  userPrompt: string,
): TemplateVariable[] {
  const systemVars = systemPrompt ? extractVariables(systemPrompt) : []
  const userVars = extractVariables(userPrompt)

  const seen = new Set<string>()
  const result: TemplateVariable[] = []

  for (const name of [...systemVars, ...userVars]) {
    if (!seen.has(name)) {
      seen.add(name)
      result.push({ name })
    }
  }

  return result
}
