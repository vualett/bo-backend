import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import { Title, P, Button, Link, Span } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default (user, url) => (
  <Email title="welcome" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
    <Item align="center" style={{ padding: 10 }} />
    <Item align="center">
      <Box
        cellSpacing={20}
        width="100%"
        style={{
          backgroundColor: '#fff',
          padding: 10,
          border: '1px solid #e5e5e5'
        }}
      >
        <Item align="center" style={{ paddingTop: 10, paddingBottom: 20 }}>
          <Image alt="ualett" src="https://app.ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item align="center" style={{ paddingBottom: 30 }}>
          <Title>Verify your email</Title>
        </Item>

        <Item style={{ paddingBottom: 10 }}>
          <P style={{ fontSize: 19 }}>
            Hello <Span style={{ fontWeight: 'bold' }}>{user.firstName}</Span>,
          </P>
        </Item>

        <Item>
          <P style={{ fontSize: 18 }}>You have successfully created your Ualett account.</P>
          <P style={{ fontSize: 18 }}>For bank transfer we have also created an account in our partner Dwolla.</P>
        </Item>

        <Item style={{ paddingTop: 20, paddingBottom: 5 }}>
          <P style={{ fontSize: 18 }}>Please verify your email address before you continue.</P>
        </Item>

        <Item align="center">
          <Button href={url}>VERIFY YOUR EMAIL</Button>
        </Item>

        <Item style={{ paddingTop: 40 }}>
          <P style={{ fontSize: 16, textAlign: 'left' }}>
            <P>Or copy and paste this URL into your browser:</P>
            <P style={{ fontSize: 16, paddingTop: 5 }}>
              <Link href={url}>{url}</Link>
            </P>
          </P>
        </Item>

        <Item style={{ paddingTop: 20 }}>
          <P style={{ fontSize: 14, paddingTop: 10, borderTop: '1px solid #eaeaea' }}>
            <Span>By signing up you agree to our </Span>
            <Link href="https://www.ualett.com/legal/tos/" style={{ textDecoration: 'underline' }}>
              Terms and Conditions
            </Link>
            <Span> and </Span>
            <Link href="https://www.ualett.com/legal/privacy/" style={{ textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
            <Span>, as well as our partner Dwolla`s </Span>
            <Link href="https://www.dwolla.com/legal/tos/" style={{ textDecoration: 'underline' }}>
              Terms of Service
            </Link>
            <Span> and </Span>
            <Link href="https://www.dwolla.com/legal/privacy/" style={{ textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
            .
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>
      <Box>
        <Item align="center">
          <P style={{ color: '#888888', fontSize: 13 }}>2020, A Cabicash Solutions, Inc. brand. All rights reserved.</P>
          <P style={{ color: '#888888', fontSize: 13 }}>57 West 57th Street, 4th Floor New York, NY 10019</P>
          <P style={{ paddingTop: 10, fontSize: 13, color: '#888888' }}>
            You are receiving this email because you signup for an Ualett account. Please do not reply to this email.
            Instead, contact <Link href="mailto:support@ualett.com">support@ualett.com</Link>.
          </P>
        </Item>
      </Box>
    </Item>
    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
