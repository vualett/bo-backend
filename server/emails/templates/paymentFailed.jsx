import React from 'react';
import { Email, Item, Image, Box } from 'react-html-email';
import format from 'date-fns/format';
import footer from './components/footer.jsx';
import { Title, P, Link } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default ({ payment }) => (
  <Email title="payment failed" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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

        <Item align="center">
          <Title style={{ color: '#B71C1C' }}>Failed Transaction</Title>
        </Item>

        <Item style={{ padding: 10 }}>
          <P style={{ fontSize: 18, fontWeight: 400 }}>
            This email is to inform you that a payment for your cash advance has failed. More information below.
          </P>
        </Item>

        <Item style={{ fontSize: 18, padding: 10, borderTop: '1px solid #eee' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td>
                  <P style={{ fontWeight: 500 }}>Date:</P>
                </td>
                <td>
                  <P>{format(payment.date, 'MMMM DD, YYYY')}</P>
                </td>
              </tr>
              <tr>
                <td>
                  <P style={{ fontWeight: 500 }}>Amount:</P>
                </td>
                <td>
                  <P>${Number(payment.amount).toFixed(2)}</P>
                </td>
              </tr>
            </tbody>
          </table>
        </Item>

        <Item style={{ padding: 10 }}>
          <P style={{ fontSize: 18 }}>Please contact us as soon as posible at:</P>
          <P
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#0057b7'
            }}
          >
            <Link href="mailto:support@ualett.com">support@ualett.com</Link>
          </P>
          <P style={{ fontSize: 18 }}>
            or go to our{' '}
            <Link href="https://ualett.com" style={{ textDecoration: 'underline' }}>
              website
            </Link>{' '}
            to request a call.
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
