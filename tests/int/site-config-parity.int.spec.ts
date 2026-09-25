import type { Field } from 'payload'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { siteField } from '@/collections/GamePages/siteFields'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'

/**
 * The Zod schema is canonical; the Payload field tree is the authoring
 * UI for it. This test walks both structures so a field added to one
 * side without the other fails CI instead of silently diverging.
 */

type AnyZod = z.ZodType

type ZodDef = {
  element?: AnyZod
  in?: AnyZod
  innerType?: AnyZod
  out?: AnyZod
  shape?: Record<string, AnyZod>
  type: string
}

const defOf = (schema: AnyZod): ZodDef => (schema as unknown as { _zod: { def: ZodDef } })._zod.def

/** Strips optional/nullable/default/prefault wrappers and transform pipes. */
const unwrap = (schema: AnyZod): AnyZod => {
  const def = defOf(schema)
  switch (def.type) {
    case 'default':
    case 'nullable':
    case 'optional':
    case 'prefault':
    case 'readonly':
      return unwrap(def.innerType as AnyZod)
    case 'pipe': {
      const outDef = defOf(def.out as AnyZod)
      return unwrap(outDef.type === 'transform' ? (def.in as AnyZod) : (def.out as AnyZod))
    }
    default:
      return schema
  }
}

type NamedField = Extract<Field, { name: string }>

const namedFields = (fields: Field[]): NamedField[] =>
  fields.filter((field): field is NamedField => 'name' in field)

const compareFields = (fields: Field[], zodObject: AnyZod, path: string): void => {
  const objectDef = defOf(unwrap(zodObject))
  expect(objectDef.type, `${path} should be a zod object`).toBe('object')
  const shape = objectDef.shape as Record<string, AnyZod>

  const payloadNames = namedFields(fields).map((field) => field.name)
  expect([...payloadNames].sort(), `keys at ${path}`).toEqual(Object.keys(shape).sort())

  for (const field of namedFields(fields)) {
    const childPath = `${path}.${field.name}`
    const zodChild = unwrap(shape[field.name])
    const zodDef = defOf(zodChild)

    switch (field.type) {
      case 'group':
        compareFields(field.fields, zodChild, childPath)
        break
      case 'array': {
        expect(zodDef.type, `${childPath} should be a zod array`).toBe('array')
        compareFields(field.fields, zodDef.element as AnyZod, `${childPath}[]`)
        break
      }
      case 'select': {
        expect(zodDef.type, `${childPath} should be a zod enum`).toBe('enum')
        const zodValues = (zodChild as z.ZodEnum<Record<string, string>>).options
        const fieldValues = (field.options as { value: string }[]).map((option) => option.value)
        expect(fieldValues.sort(), `enum options at ${childPath}`).toEqual([...zodValues].sort())
        break
      }
      case 'upload':
        expect(zodDef.type, `${childPath} media ref should be a zod number`).toBe('number')
        break
      case 'checkbox':
        expect(zodDef.type, `${childPath} should be a zod boolean`).toBe('boolean')
        break
      case 'text':
      case 'textarea':
        expect(zodDef.type, `${childPath} should be a zod string`).toBe('string')
        break
      default:
        throw new Error(`Unhandled payload field type "${field.type}" at ${childPath}`)
    }
  }
}

describe('Payload site fields ↔ Zod schema parity', () => {
  it('the site group mirrors every SiteConfigV1 key except template/schemaVersion', () => {
    const shape = defOf(siteConfigV1Schema).shape as Record<string, AnyZod>
    const configKeys = Object.keys(shape).filter(
      (key) => key !== 'template' && key !== 'schemaVersion',
    )
    expect(siteField.type).toBe('group')
    const groupNames = namedFields((siteField as Extract<Field, { type: 'group' }>).fields).map(
      (field) => field.name,
    )
    expect(groupNames.sort()).toEqual(configKeys.sort())
  })

  it('every nested field, enum option, and value type matches the canonical schema', () => {
    compareFields(
      (siteField as Extract<Field, { type: 'group' }>).fields,
      z.strictObject(
        Object.fromEntries(
          Object.entries(defOf(siteConfigV1Schema).shape as Record<string, AnyZod>).filter(
            ([key]) => key !== 'template' && key !== 'schemaVersion',
          ),
        ),
      ),
      'site',
    )
  })
})
