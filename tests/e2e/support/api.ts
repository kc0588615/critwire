import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { CollectionSlug, PaginatedDocs } from 'payload'

import type { Config } from '../../../src/payload-types'

type Doc<C extends CollectionSlug> = Config['collections'][C]

export interface ApiError {
  message: string
  data?: unknown
}

/** Every call resolves, whatever the status, so tests can assert on it. */
export interface ApiResult<T> {
  status: number
  body: T & { errors?: ApiError[] }
}

export interface DocResult<C extends CollectionSlug> {
  doc: Doc<C>
  message?: string
}

export type Query = Record<string, unknown>

/** Serializes nested objects the way Payload's REST API parses them (qs bracket syntax). */
export function toQueryString(query: Query = {}): string {
  const pairs: string[] = []
  const walk = (value: unknown, key: string): void => {
    if (value === undefined) return
    if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, `${key}[${k}]`)
      return
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }
  for (const [k, v] of Object.entries(query)) walk(v, k)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

async function toResult<T>(response: APIResponse): Promise<ApiResult<T>> {
  const text = await response.text()
  const isJSON = (response.headers()['content-type'] ?? '').includes('application/json')
  const body = (isJSON && text ? JSON.parse(text) : text) as ApiResult<T>['body']
  return { status: response.status(), body }
}

type Method = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'

export interface RawOptions {
  data?: unknown
  headers?: Record<string, string>
}

/**
 * Payload REST client for one role. The JWT travels in the Authorization
 * header; an anonymous client sends none.
 */
export class RestClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  raw<T = unknown>(method: Method, path: string, { data, headers }: RawOptions = {}): Promise<ApiResult<T>> {
    return this.request
      .fetch(path, {
        method,
        data,
        headers: { ...(this.token ? { Authorization: `JWT ${this.token}` } : {}), ...headers },
      })
      .then((response) => toResult<T>(response))
  }

  create<C extends CollectionSlug>(collection: C, data: Partial<Doc<C>>, query?: Query) {
    return this.raw<DocResult<C>>('POST', `/api/${collection}${toQueryString(query)}`, { data })
  }

  update<C extends CollectionSlug>(collection: C, id: number | string, data: Partial<Doc<C>>, query?: Query) {
    return this.raw<DocResult<C>>('PATCH', `/api/${collection}/${id}${toQueryString(query)}`, { data })
  }

  find<C extends CollectionSlug>(collection: C, query?: Query) {
    return this.raw<PaginatedDocs<Doc<C>>>('GET', `/api/${collection}${toQueryString(query)}`)
  }

  findByID<C extends CollectionSlug>(collection: C, id: number | string, query?: Query) {
    return this.raw<Doc<C>>('GET', `/api/${collection}/${id}${toQueryString(query)}`)
  }

  remove<C extends CollectionSlug>(collection: C, id: number | string) {
    return this.raw<DocResult<C>>('DELETE', `/api/${collection}/${id}`)
  }
}
