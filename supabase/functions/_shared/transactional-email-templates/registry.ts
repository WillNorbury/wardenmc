/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

import { template as banAppealReceived } from './ban-appeal-received.tsx'
import { template as banAppealStatus } from './ban-appeal-status.tsx'
import { template as banAppealAdmin } from './ban-appeal-admin.tsx'
import { template as applicationReceived } from './application-received.tsx'
import { template as applicationStatus } from './application-status.tsx'
import { template as applicationAdmin } from './application-admin.tsx'
import { template as emailChanged } from './email-changed.tsx'
import { template as reportAdmin } from './report-admin.tsx'
import { template as changelogUpdate } from './changelog-update.tsx'
import { template as adminBroadcast } from './admin-broadcast.tsx'
import { template as ticketReply } from './ticket-reply.tsx'
import { template as contactReply } from './contact-reply.tsx'
import { template as adminAlert } from './admin-alert.tsx'
import { template as newsUpdate } from './news-update.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as loginVerification } from './login-verification.tsx'
import { template as postPublished } from './post-published.tsx'
import { template as postReply } from './post-reply.tsx'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ban-appeal-received': banAppealReceived,
  'ban-appeal-status': banAppealStatus,
  'ban-appeal-admin': banAppealAdmin,
  'application-received': applicationReceived,
  'application-status': applicationStatus,
  'application-admin': applicationAdmin,
  'email-changed': emailChanged,
  'report-admin': reportAdmin,
  'changelog-update': changelogUpdate,
  'admin-broadcast': adminBroadcast,
  'ticket-reply': ticketReply,
  'contact-reply': contactReply,
  'admin-alert': adminAlert,
  'news-update': newsUpdate,
  'order-confirmation': orderConfirmation,
  'login-verification': loginVerification,
  'post-published': postPublished,
  'post-reply': postReply,
}
