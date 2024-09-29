import React from 'react';
import { Item, Box } from 'react-html-email';
import { P, Link } from './emailComponets.jsx';

export default () => (
  <Box>
    <Item align="center">
      <P style={{ fontSize: 13, color: '#888888' }}>2020, A Cabicash Solutions, Inc. brand. All rights reserved.</P>
      <P style={{ fontSize: 13, color: '#888888' }}>57 West 57th Street, 4th Floor New York, NY 10019</P>
      <P style={{ fontSize: 13, color: '#888888', paddingTop: 10 }}>
        You are receiving this email because you have a Ualett account. These emails are non-promotional in nature and
        contain important information regarding your account. Please do not reply to this email. Instead, contact{' '}
        <Link href="mailto:support@ualett.com" style={{ fontSize: 13, color: '#888888' }}>
          support@ualett.com
        </Link>
      </P>
    </Item>
  </Box>
);
