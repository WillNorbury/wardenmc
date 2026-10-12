/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  mcUsername?: string
  applicationType?: string
  status?: string
  reviewerNotes?: string
  dashboardUrl?: string
}

const Email = ({
  mcUsername = 'there',
  applicationType = 'staff',
  status = 'updated',
  reviewerNotes = '',
  dashboardUrl = 'https://warden.rip',
}: Props) => {
  const accent =
    status === 'approved' ? 'hsl(160, 84%, 39%)' :
    status === 'rejected' ? 'hsl(0, 75%, 55%)' :
    'hsl(22, 100%, 55%)'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Warden Network {applicationType} application was {status}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={{ ...h1, color: accent }}>Application {status}</Heading>
          <Text style={text}>
            Hi {mcUsername}, your <strong>{applicationType}</strong> application has been{' '}
            <strong>{status}</strong>.
          </Text>
          {reviewerNotes && (
            <Section style={quote}>
              <Text style={quoteText}>{reviewerNotes}</Text>
            </Section>
          )}
          <Button style={{ ...button, backgroundColor: accent }} href={dashboardUrl}>
            Visit WardenMC
          </Button>
          <Text style={footer}>— Warden Network Staff</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your Warden Network ${d.applicationType ?? ''} application was ${d.status ?? 'updated'}`.replace(/\s+/g, ' ').trim(),
  displayName: 'Application status update',
  previewData: { mcUsername: 'Notch', applicationType: 'builder', status: 'approved', reviewerNotes: 'Welcome aboard!' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, margin: '0 0 16px', textTransform: 'capitalize' as const }
const text = { fontSize: '14px', color: 'hsl(20, 15%, 40%)', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { borderLeft: '3px solid hsl(22, 100%, 55%)', padding: '8px 14px', background: 'hsl(20, 15%, 97%)', margin: '0 0 20px' }
const quoteText = { fontSize: '13px', color: 'hsl(20, 25%, 25%)', whiteSpace: 'pre-wrap' as const, margin: 0 }
const button = { color: '#fff', fontSize: '14px', borderRadius: '12px', padding: '12px 20px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
