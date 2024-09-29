import React from 'react';
import { Email, Item, Image, Box } from 'react-html-email';
import footer from './components/footer.jsx';
import { Title, P, Link } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default ({ user, payment }) => (
  <Email title="A payment initiate" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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
          <Title>Payment Pending</Title>
        </Item>

        <Item style={{ padding: 10 }}>
          <P style={{ fontSize: 18, fontWeight: 400 }}>
            A ${Number(payment.amount).toFixed(2)} payment for your cash advance have been initiated from your bank
            account {user.bankAccount.bankName} XXX{user.bankAccount.mask}.
          </P>
        </Item>

        <Item style={{ padding: 10 }}>
          <P style={{ fontSize: 16 }}>The payment may take 3-4 business days to process.</P>
          <P style={{ fontSize: 16 }}>You can follow the status of this payment in the Ualett App</P>
        </Item>

        <Item style={{ padding: 10 }}>
          <P style={{ fontSize: 18 }}>Questions? Contact us at:</P>
          <P
            style={{
              fontWeight: 500,
              color: '#0057b7',
              fontSize: 18
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
