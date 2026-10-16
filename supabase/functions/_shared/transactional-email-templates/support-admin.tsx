import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const Email = ({ subject = 'Player question', category = 'General question', body = '' }: { subject?: string; category?: string; body?: string }) => (
  <Html><Head /><Preview>New support question: {subject}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#182229' }}>
      <Container style={{ padding: '28px', maxWidth: '560px' }}>
        <Text>Warden Network Support</Text><Heading>{subject}</Heading>
        <Text>{category}</Text><Text style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{body}</Text>
        <Button href="https://warden.rip/admin?tab=tickets" style={{ backgroundColor: '#005155', color: '#ffffff', borderRadius: '6px', padding: '12px 20px' }}>Open support inbox</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) => `Support: ${String(data.subject ?? 'Player question')}`,
  displayName: 'New support question',
  to: 'william@norbury.com.au',
  previewData: { subject: 'How do I join?', category: 'Server help', body: 'I need help connecting to the server.' },
} satisfies TemplateEntry