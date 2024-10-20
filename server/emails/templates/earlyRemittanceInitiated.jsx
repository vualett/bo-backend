import React from 'react';
import { Email, Item, Box, Image } from 'react-html-email';
import footer from './components/footer.jsx';
import { Title, P } from './components/emailComponets.jsx';

const css = `
@media only screen and (max-device-width: 480px) {
  font-size: 20px !important;
}`.trim();

export default ({ recipientName, advancedAmount, schedule, effectiveDate, signatureBase64, signatureURL }) => (
  <Email title="Remittance Schedule Update" bodyStyle={{ backgroundColor: '#F4F4F4' }} headCSS={css}>
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
          <Image alt="Company Logo" src="https://ualett.com/static/img/blue-logo.png" height={40} width={120} />
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>Dear Mr/Mrs {recipientName},</P>
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>I hope this email finds you well.</P>
          <br />
          <P style={{ fontSize: 17 }}>
            We are writing to confirm that your Remittance Schedule has been successfully updated according to your
            recent instructions.
          </P>
          <P style={{ fontSize: 17 }}>The remittances advanced request are as follows:</P>
        </Item>

        <Item>
          <Title>Remittance Advanced Details</Title>
          <P style={{ fontSize: 16 }}>
            - Remittance Advanced Amount: {advancedAmount}
            <br />- Effective on: {effectiveDate}
          </P>
        </Item>

        <Item>
          <P style={{ fontSize: 17 }}>
            If you have any questions, need further assistance, or do not recognize these changes, please don't hesitate
            to reach out to us. You can contact us through the following options:
          </P>
          <br />
          <P style={{ fontSize: 16 }}>
            Chat: Available directly in our app for instant support.
            <br />
            Phone: Call us at 844-844-2488.
            <br />
            Email: Send us an email directly in our app.
          </P>
        </Item>

        <Item style={{ paddingTop: 10, paddingBottom: 20 }}>
          <P style={{ fontSize: 16 }}>We are here to help!</P>
        </Item>

        <Item style={{ paddingTop: 10 }}>
          <P style={{ fontSize: 16 }}>Signature</P>

          <Image
            alt="Signature"
            src={`${signatureURL}`}
            width={150}
            height={50}
            style={{ display: 'block', marginTop: 10 }}
          />
        </Item>
      </Box>
    </Item>

    <Item style={{ padding: 10, paddingTop: 20 }}>{footer()}</Item>

    <Item align="center" style={{ padding: 10 }} />
  </Email>
);
