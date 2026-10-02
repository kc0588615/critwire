import { withRef } from '@/lib/share/kit'
import { absoluteURL } from '@/utilities/getURL'

/** A root-relative portal path as the embed links it: absolute, and tagged `ref=embed`. */
export const embedHref = (path: string): string => withRef(absoluteURL(path), 'embed')
