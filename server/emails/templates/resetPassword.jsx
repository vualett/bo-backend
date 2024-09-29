import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import footer from './components/footer.jsx';
import { Title, P, Button, Link } from './components/emailComponets.jsx';

const css = `@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default (url) => (
  <Email title="reset password" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
    <Item align="center" style={{ padding: 10 }} />
    <Item align="center">
      <Box
        cellSpacing={10}
        width="100%"
        style={{
          backgroundColor: '#fff',
          padding: 10,
          border: '1px solid #e5e5e5'
        }}
      >
        <Item align="center" style={{ paddingTop: 20, paddingBottom: 20 }}>
          <Image alt="ualett" src="https://app.ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item align="center" style={{ paddingBottom: 20 }}>
          <Title>Here is your link to reset your password.</Title>
        </Item>

        <Item align="center">
          <Button href={url}>Click here to change your Ualett password.</Button>
        </Item>

        <Item style={{ paddingTop: 30, paddingBottom: 20, fontSize: 16 }}>
          <P style={{ textAlign: 'left' }}>
            <P>Or copy and paste this URL into your browser:</P>
            <P style={{ paddingTop: 5 }}>
              <Link
                href={url}
                style={{
                  color: 'inherit'
                }}
              >
                {url}
              </Link>
            </P>
          </P>
        </Item>

        <Item style={{ fontSize: 15, paddingTop: 10, borderTop: '1px solid #eee' }}>
          <P>If you did not request a new password, please reach out to us at:</P>
          <P
            style={{
              fontWeight: 500,
              color: '#0057b7',
              fontSize: 15
            }}
          >
            <Link href="mailto:support@ualett.com">support@ualett.com</Link>
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
