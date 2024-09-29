import Invitations from '../../collections/invitations';
import { check } from 'meteor/check';
import axios from 'axios';
import { SERVICES_PROMOTERS_APP } from '../../keys';

export default updatePromotersPanelInvitation = async ({ _id }) => {
  check(_id, String);

  const invitation = Invitations.findOne({ _id });

  if (invitation) {
    const data = JSON.stringify(invitation);

    const config = {
      method: 'post',
      url: `${SERVICES_PROMOTERS_APP}invitationUpdate`,
      headers: {
        'Content-Type': 'application/json'
      },
      data
    };

    await axios(config);
  }
};
