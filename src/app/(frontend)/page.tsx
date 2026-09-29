import type { Metadata } from 'next'

import { MarketingHome } from '@/components/marketing/MarketingHome'

export default MarketingHome

export const metadata: Metadata = {
  description:
    'Critwire gives your indie game one hosted site for patch notes, known issues with player voting, bug reports and a contact form.',
  title: { absolute: 'Critwire: patch notes, known issues and bug reports for indie games' },
}
