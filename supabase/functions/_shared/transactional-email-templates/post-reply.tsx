/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  replierName?: string
  reply?: string
  originalContent?: string
  postUrl?: string
}

const Email = ({
  recipientName = 'there',
  replierName = 'Someone',
  reply = '',
  originalContent = '',
  postUrl = 'https://warden.rip/posts',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{replierName} replied to your post</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New reply to your post</Heading>
        <Text style={text}>Hi {recipientName},</Text>
        <Text style={text}><strong>{replierName}</strong> replied to your post:</Text>
        <Section style={quote}>
          <Text style={quoteText}>{reply}</Text>
        </Section>
        {originalContent ? (
          <Text style={muted}>Your post: "{originalContent}"</Text>
        ) : null}
        <Button style={button} href={postUrl}>View reply</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d.replierName ?? 'Someone'} replied to your post`,
  displayName: 'Post reply',
  previewData: {
    recipientName: 'Steve',
    replierName: 'Alex',
    reply: 'This is awesome, joining now!',
    originalContent: 'Two new Minehut servers are live — come join us!',
    postUrl: 'https://warden.rip/posts',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: 'hsl(20, 25%, 12%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(20, 25%, 25%)', lineHeight: '1.6', margin: '0 0 12px' }
const muted = { fontSize: '12px', color: 'hsl(20, 10%, 50%)', margin: '16px 0 0' }
const quote = { borderLeft: '3px solid hsl(180, 80%, 40%)', padding: '12px 16px', background: 'hsl(200, 15%, 97%)', margin: '16px 0' }
const quoteText = { fontSize: '14px', color: 'hsl(20, 25%, 25%)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' as const }
const button = { backgroundColor: 'hsl(180, 80%, 38%)', color: '#ffffff', fontSize: '14px', fontWeight: 600 as const, padding: '11px 20px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }
