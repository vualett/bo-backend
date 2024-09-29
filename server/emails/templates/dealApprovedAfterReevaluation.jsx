import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import footer from './components/footer.jsx';
import { Title, P } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default (user) => (
  <Email title="Cash Advance Approved" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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
          <Image alt="ualett" src="https://ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>
            Dear {user.firstName} {user.lastName},
          </P>
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>
            We're excited to let you know that after a recent reevaluation, your cash advance request has been approved!
          </P>
        </Item>

        <Item style={{ paddingTop: 10, paddingBottom: 20 }}>
          <Title>What's Next?</Title>
        </Item>

        <Item style={{ paddingTop: 10 }}>
          <P style={{ fontSize: 16 }}>
            Please log in to your account to review the details of your new offer and proceed with the next steps.
          </P>
          <P style={{ fontSize: 16 }}>
            If you have any questions or need assistance, our support team is here to help at (844)-844-2488.
          </P>
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
