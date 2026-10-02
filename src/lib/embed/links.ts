import { withRef } from '@/lib/share/kit'
import { absoluteURL } from '@/utilities/getURL'

/** An absolute portal URL as the embed links it: tagged `ref=embed`. */
export const embedURL = (url: string): string => withRef(url, 'embed')

/** A root-relative portal path as the embed links it: absolute, and tagged `ref=embed`. */
export const embedHref = (path: string): string => embedURL(absoluteURL(path))
