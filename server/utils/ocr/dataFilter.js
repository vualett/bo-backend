import states from './states';
import moment from 'moment';
import stringSimilarity from 'string-similarity';

const dataFilter = (data, name) => {
  // Get string of data
  let str = '';
  data.Blocks.forEach((e) => {
    if (e.BlockType === 'WORD') {
      str = str + ' ' + e.Text.toLocaleLowerCase();
    }
  });

  // Extract just the word array
  const wordArray = data.Blocks.filter((i) => i.BlockType === 'WORD').map((i) => {
    i.Text = i.Text.toLocaleLowerCase();
    return i;
  });

  // Extract just the word and line array
  const wordLineArray = data.Blocks.filter((i) => i.BlockType === 'WORD' || i.BlockType === 'LINE').map((i) => {
    i.Text = i.Text.toLocaleLowerCase();
    return i;
  });

  // Extract just the line array
  const lineArray = data.Blocks.filter((i) => i.BlockType === 'LINE').map((i) => {
    i.Text = i.Text.toLocaleLowerCase();
    return i;
  });

  // How to get expiration date on most licenses
  const getExp = (e) => e.Text.includes('exp');
  let expIndex = wordArray.findIndex(getExp);
  let expDate = expIndex !== -1 ? wordArray[expIndex + 1].Text : null;

  //How to get DOB on most licenses
  const getDob = (e) => e.Text.includes('dob');
  let dobIndex = wordArray.findIndex(getDob);
  let dobDate = dobIndex !== -1 ? wordArray[dobIndex + 1].Text : null;

  //How to get sex on most licenses
  const getSex = (e) => e.Text.includes('sex');
  let sexIndex = wordArray.findIndex(getSex);
  let sex =
    sexIndex !== -1 && (wordArray[sexIndex + 1].Text === 'm' || wordArray[sexIndex + 1].Text === 'f')
      ? wordArray[sexIndex + 1].Text
      : null;

  // How to get the estate from the address on most licenses
  let estate;
  const abbreviations = states.map((i) => i.abbreviation.toLowerCase());

  for (let i = 0; i < wordArray.length; i++) {
    const e = wordArray[i];
    if (
      !!wordArray[i + 1] &&
      e.Text.length === 2 &&
      wordArray[i + 1].Text.length >= 5 &&
      wordArray[i + 1].Text.length <= 10 &&
      /^[0-9\-]+$/.test(wordArray[i + 1].Text) &&
      abbreviations.includes(e.Text)
    ) {
      estate = e.Text;
    }
  }

  // How to find state text on string
  const state =
    states.filter((i) => {
      let result = false;
      for (let n = 0; n < wordLineArray.length; n++) {
        const element = wordLineArray[n];
        const { Top } = element.Geometry.BoundingBox;

        if (stringSimilarity.compareTwoStrings(element.Text, i.name.toLowerCase()) > 0.9) {
          result = true;
        }
      }
      return result;
    })[0] || null;

  // state match verification
  const stateMatched = !!state ? estate === state.abbreviation.toLocaleLowerCase() : false;

  // Lets start working with the Ids

  let id;
  let preId;
  let stateValue = !!state ? state.abbreviation.toLocaleLowerCase() : '';

  switch (!!state ? stateValue : estate) {
    // Illinois
    case 'il':
      preId = wordArray.filter(
        (i) =>
          i.Text.length > 13 &&
          ((/[a-zA-Z]/.test(i.Text.charAt(0)) && /^[0-9\-]+$/.test(i.Text.substr(1))) ||
            (/[a-zA-Z]/.test(i.Text.slice(i.Text.length - 1)) && /^[0-9\-]+$/.test(i.Text.slice(0, -1))))
      );
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text : null;
      break;
    //Delaware
    case 'de':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          !!wordArray[i - 2] &&
          wordArray[i - 1].Text === 'no.' &&
          wordArray[i - 2].Text === '4did'
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Maryland
    case 'md':
      preId = wordArray.filter(
        (i) => i.Text.length > 16 && /^[0-9\-]+$/.test(i.Text.substr(1)) && /[a-zA-Z]/.test(i.Text.charAt(0))
      );
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text : null;

      // Dob
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          !!wordArray[i - 2] &&
          wordArray[i - 1].Text.includes('date:') &&
          wordArray[i - 2].Text.includes('birth') &&
          moment(element.Text, 'MM-DD-YYYY', true).isValid()
        ) {
          dobDate = element.Text;
        }
      }

      // License Type check
      //Second Type exp date
      const secondExp = lineArray.filter((e) => e.Text.includes('date of exp'));

      if (!!secondExp && secondExp.length > 0) {
        const expSearch = lineArray.filter((e) => {
          if (
            moment(e.Text.substring(0, 10), 'MM/DD/YYYY', true).isValid() &&
            e.Geometry.BoundingBox.Left > secondExp[0].Geometry.BoundingBox.Left - 0.02 &&
            e.Geometry.BoundingBox.Left < secondExp[0].Geometry.BoundingBox.Left + 0.02 &&
            e.Geometry.BoundingBox.Top > secondExp[0].Geometry.BoundingBox.Top - 0.02 &&
            e.Geometry.BoundingBox.Top < secondExp[0].Geometry.BoundingBox.Top + 0.02
          ) {
            return true;
          } else {
            return false;
          }
        });
        expDate = !!expSearch && expSearch.length > 0 ? expSearch[0].Text.substring(0, 10) : null;
      }
      // Second Type Dob
      const secondDob = lineArray.filter((e) => e.Text.includes('date of birth'));

      if (!!secondDob && secondDob.length > 0) {
        const dobSearch = lineArray.filter((e) => {
          if (
            moment(e.Text.substring(0, 10), 'MM/DD/YYYY', true).isValid() &&
            e.Geometry.BoundingBox.Left > secondDob[0].Geometry.BoundingBox.Left - 0.02 &&
            e.Geometry.BoundingBox.Left < secondDob[0].Geometry.BoundingBox.Left + 0.02 &&
            e.Geometry.BoundingBox.Top > secondDob[0].Geometry.BoundingBox.Top - 0.02 &&
            e.Geometry.BoundingBox.Top < secondDob[0].Geometry.BoundingBox.Top + 0.02
          ) {
            return true;
          } else {
            return false;
          }
        });
        dobDate = !!dobSearch && dobSearch.length > 0 ? dobSearch[0].Text.substring(0, 10) : null;
      }

      // Second type sex
      if (!!!sex) {
        const sexSearch = wordArray.filter(
          (i) =>
            i.Text.length === 1 &&
            (i.Text === 'm' || i.Text === 'f') &&
            i.Geometry.BoundingBox.Left > 0.41 &&
            i.Geometry.BoundingBox.Left < 0.51 &&
            i.Geometry.BoundingBox.Top > 0.51 &&
            i.Geometry.BoundingBox.Top < 0.61
        );

        sex = !!sexSearch && sexSearch.length > 0 ? sexSearch[0].Text : null;
      }
      break;
    // Missouri
    case 'mo':
      preId = wordArray.filter(
        (i) => i.Text.length > 9 && /^[0-9\-]+$/.test(i.Text.substr(1)) && /[a-zA-Z]/.test(i.Text.charAt(0))
      );
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text : null;
      break;
    // Florida
    case 'fl':
      preId = wordArray.filter(
        (i) => i.Text.length > 16 && /^[0-9\-]+$/.test(i.Text.substr(2)) && /[a-zA-Z]/.test(i.Text.charAt(0))
      );
      id =
        Array.isArray(preId) && preId.length > 0
          ? /[a-zA-Z]/.test(preId[0].Text.charAt(1))
            ? preId[0].Text.substr(1)
            : preId[0].Text
          : null;
      break;
    //North Carolina
    case 'nc':
      preId = wordArray.filter((i) => i.Text.length > 11 && /^[0-9\-]+$/.test(i.Text));
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text : null;
      break;
    // Ohio
    case 'oh':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          (!!wordArray[i - 1] && wordArray[i - 1].Text === '4dno') ||
          (Left > 0.3 &&
            Left < 0.38 &&
            Top > 0.47 &&
            Top < 0.55 &&
            element.Text.length === 8 &&
            /^[0-9\-]+$/.test(element.Text.substr(2)) &&
            /[a-zA-Z]/.test(element.Text.substring(0, 2)))
        ) {
          preId = element;
        }
        // exp date
        if (
          Left > 0.37 &&
          Left < 0.44 &&
          Top < 0.61 &&
          Top > 0.48 &&
          moment(element.Text, 'MM-DD-YYYY', true).isValid()
        ) {
          expDate = element.Text;
        }

        // Dob date
        if (
          !!!dobDate &&
          ((Left > 0.7 && Left < 0.8 && Top > 0.35 && Top < 0.45) ||
            (Left > 0.05 && Left < 0.15 && Top > 0.67 && Top < 0.77)) &&
          moment(element.Text, 'MM-DD-YYYY', true).isValid()
        ) {
          dobDate = element.Text;
        }
        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          ((Left > 0.29 && Left < 0.39 && Top > 0.66 && Top < 0.76) ||
            (Left > 0.34 && Left < 0.44 && Top > 0.74 && Top < 0.84))
        ) {
          sex = element.Text;
        }

        if (
          !!!sex &&
          wordArray[i].Text.includes('sex:') &&
          (wordArray[i].Text.charAt(wordArray[i].Text.length - 1) === 'm' ||
            wordArray[i].Text.charAt(wordArray[i].Text.length - 1) === 'f')
        ) {
          sex = wordArray[i].Text.charAt(wordArray[i].Text.length - 1);
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    //New York
    case 'ny':
      preId = wordLineArray.filter(
        (i) => i.Text.length >= 13 && i.Text.includes('id') && /^[0-9\-]+$/.test(i.Text.substr(3).replace(/\s/g, ''))
      );
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text.substr(3).replace(/\s/g, '') : null;
      break;
    // New Jersey
    case 'nj':
      preId = wordLineArray.filter((i) => {
        const subString = i.Text.slice(-17);
        if (
          subString.length > 16 &&
          /^[0-9\-]+$/.test(subString.substr(1).replace(/\s/g, '')) &&
          /[a-zA-Z]/.test(subString.charAt(0))
        ) {
          return true;
        }
      });
      id = Array.isArray(preId) && preId.length > 0 ? preId[0].Text.slice(-17).replace(/\s/g, '') : null;
      break;
    // Alabama
    case 'al':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text === 'no.' &&
          /^[0-9\-]+$/.test(element.Text) &&
          element.Text.length > 6
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Georgia
    case 'ga':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text === 'no.' &&
          /^[0-9\-]+$/.test(element.Text) &&
          element.Text.length > 7
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Kentucky
    case 'ky':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          !!wordArray[i - 2] &&
          wordArray[i - 1].Text === 'no.' &&
          wordArray[i - 2].Text === 'lic.'
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Maine
    case 'me':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (!!wordArray[i - 1] && wordArray[i - 1].Text === '4d') {
          preId = element;
        }
        // exp Date
        if (
          Left > 0.53 &&
          Left < 0.58 &&
          Top > 0.5 &&
          Top < 0.7 &&
          moment(element.Text, 'MM/DD/YYYY', true).isValid()
        ) {
          expDate = element.Text;
        }
        // Dob date
        if (
          Left > 0.65 &&
          Left < 0.75 &&
          Top > 0.5 &&
          Top < 0.58 &&
          moment(element.Text, 'MM/DD/YYYY', true).isValid()
        ) {
          dobDate = element.Text;
        }
        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          Left > 0.26 &&
          Left < 0.46 &&
          Top > 0.46 &&
          Top < 0.77
        ) {
          sex = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // New Hampshire
    case 'nh':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (Left > 0.58 && Left < 0.64 && Top > 0.19 && Top < 0.24) {
          preId = element;
        }
        // expDate
        if (
          Left > 0.31 &&
          Left < 0.37 &&
          Top > 0.18 &&
          Top < 0.24 &&
          moment(element.Text, 'MM/DD/YYYY', true).isValid()
        ) {
          expDate = element.Text;
        }
        // Dob date
        if (
          Left > 0.5 &&
          Left < 0.6 &&
          Top > 0.71 &&
          Top < 0.81 &&
          moment(element.Text, 'MM/DD/YYYY', true).isValid()
        ) {
          dobDate = element.Text;
        }
        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          Left > 0.29 &&
          Left < 0.39 &&
          Top > 0.62 &&
          Top < 0.72
        ) {
          sex = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    case 'pa':
      for (let i = 0; i < wordLineArray.length; i++) {
        const element = wordLineArray[i];
        if (
          !!wordLineArray[i - 1] &&
          wordLineArray[i - 1].Text.includes('dln') &&
          /^[0-9\-]+$/.test(element.Text.replace(/\s/g, ''))
        ) {
          if (element.Text.replace(/\s/g, '').length === 8) {
            preId = element.Text.replace(/\s/g, '');
          } else if ((element.Text.replace(/\s/g, '') + wordLineArray[i + 1].Text.replace(/\s/g, '')).length === 8) {
            preId = element.Text.replace(/\s/g, '') + wordLineArray[i + 1].Text.replace(/\s/g, '');
          } else {
            preId =
              element.Text.replace(/\s/g, '') +
              wordLineArray[i + 1].Text.replace(/\s/g, '') +
              wordLineArray[i + 2].Text.replace(/\s/g, '');
          }
        }
      }
      id = !!preId ? preId : null;
      break;
    //Rhode Island
    case 'ri':
      preId = wordLineArray.filter(
        (i) =>
          i.Text.length > 6 &&
          (i.Text.includes('id') || i.Text.includes('4d')) &&
          /^[0-9\-]+$/.test(i.Text.slice(-7).replace(/\s/g, ''))
      );
      id =
        Array.isArray(preId) && preId.length > 0
          ? /^[0-9\-]+$/.test(preId[0].Text.slice(-8).replace(/\s/g, ''))
            ? preId[0].Text.slice(-8).replace(/\s/g, '')
            : preId[0].Text.slice(-7).replace(/\s/g, '')
          : null;
      break;
    //Utah
    case 'ut':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text === '4d' &&
          element.Text.length === 9 &&
          /^[0-9\-]+$/.test(element.Text)
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Virginia
    case 'va':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          element.Text.length === 9 &&
          /^[0-9\-]+$/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }
        if (Left > 0.55 && Left < 0.65 && Top > 0.85 && moment(element.Text, 'MM/DD/YYYY', true).isValid()) {
          expDate = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Vermont
    case 'vt':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('no') &&
          element.Text.length === 8 &&
          /^[0-9\-]+$/.test(element.Text)
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Arizona
    case 'az':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('dln') &&
          /^[0-9\-]+$/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // California
    case 'ca':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('dl') &&
          /^[0-9\-]+$/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Conneticut
    case 'ct':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          Left > 0.38 &&
          Left < 0.5 &&
          Top > 0.3 &&
          Top < 0.45 &&
          element.Text.length > 7 &&
          /[0-9]/.test(element.Text)
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Massachusetts
    case 'ma':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          element.Text.length > 8 &&
          /[0-9]/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }

        // exp Date
        if (Left > 0.5 && Left < 0.6 && Top > 0.3 && Top < 0.6 && moment(element.Text, 'MM/DD/YYYY', true).isValid()) {
          expDate = element.Text;
        }
        // Dob date
        if (
          Left > 0.7 &&
          Left < 0.8 &&
          Top > 0.35 &&
          Top < 0.45 &&
          moment(element.Text, 'MM/DD/YYYY', true).isValid()
        ) {
          dobDate = element.Text;
        }
        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          Left > 0.45 &&
          Left < 0.55 &&
          Top > 0.78 &&
          Top < 0.88
        ) {
          sex = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Nevada
    case 'nv':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('no') &&
          element.Text.length > 9 &&
          /[0-9]/.test(element.Text)
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Oklahoma
    case 'ok':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('no') &&
          element.Text.length > 9 &&
          /[0-9]/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }

        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          Left > 0.32 &&
          Left < 0.42 &&
          Top > 0.78 &&
          Top < 0.88
        ) {
          sex = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Oregon
    case 'or':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        const { Left, Top } = element.Geometry.BoundingBox;
        if (
          element.Text.length > 5 &&
          /[0-9]/.test(element.Text.substr(1)) &&
          /[a-zA-Z]/.test(element.Text.charAt(0))
        ) {
          preId = element;
        }

        // sex
        if (
          element.Text.length === 1 &&
          (element.Text.toLowerCase() === 'm' || element.Text.toLowerCase() === 'f') &&
          Left > 0.59 &&
          Left < 0.69 &&
          Top > 0.52 &&
          Top < 0.62
        ) {
          sex = element.Text;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    // Texas
    case 'tx':
      for (let i = 0; i < wordArray.length; i++) {
        const element = wordArray[i];
        if (
          !!wordArray[i - 1] &&
          wordArray[i - 1].Text.includes('dl') &&
          element.Text.length > 7 &&
          /[0-9]/.test(element.Text)
        ) {
          preId = element;
        }
      }
      id = !!preId ? preId.Text : null;
      break;
    default:
      id = null;
      break;
  }

  // Exp depuration
  if (!!expDate && expDate.length > 5 && expDate.charAt(2) !== expDate.charAt(5)) {
    if (/[0-9]/.test(expDate.charAt(2))) {
      expDate = expDate.substring(0, 2) + expDate.charAt(5) + expDate.substring(2 + 1);
    }
    if (/[0-9]/.test(expDate.charAt(5))) {
      expDate = expDate.substring(0, 5) + expDate.charAt(2) + expDate.substring(5 + 1);
    }
  }

  // expdate validation
  const validDate = moment(expDate, 'MM/DD/YYYY', true).isValid() || moment(expDate, 'MM-DD-YYYY', true).isValid();

  // Dob depuration
  if (!!dobDate && dobDate.length > 5 && dobDate.charAt(2) !== dobDate.charAt(5)) {
    if (/[0-9]/.test(dobDate.charAt(2))) {
      dobDate = dobDate.substring(0, 2) + dobDate.charAt(5) + dobDate.substring(2 + 1);
    }
    if (/[0-9]/.test(dobDate.charAt(5))) {
      dobDate = dobDate.substring(0, 5) + dobDate.charAt(2) + dobDate.substring(5 + 1);
    }
  }

  // dobdate validation
  const validDateDob = moment(dobDate, 'MM/DD/YYYY', true).isValid() || moment(dobDate, 'MM-DD-YYYY', true).isValid();

  // Name verification
  let nameMatchPercentage = null;
  if (!!name) {
    const nameArray = name.toLowerCase().split(' ');
    let namePercentageSum = 0;

    wordArray.forEach((e) => {
      if (e.Text.includes('-')) {
        let array = e.Text.split('-');
        array.forEach((i) => {
          wordArray.push({ Text: i });
        });
      }
    });

    const nameArrayPercentages =
      nameArray.length > 0
        ? nameArray.map((e) => {
            let r = {};
            r.value = e;
            r.percentage = 0;
            for (let n = 0; n < wordArray.length; n++) {
              const element = wordArray[n];
              const comparation = stringSimilarity.compareTwoStrings(
                element.Text.replace(/[0-9]/g, ''),
                e.toLowerCase()
              );
              if (comparation > 0.7) {
                r.percentage = comparation * 100;
              }
            }

            return r;
          })
        : null;

    if (!!nameArrayPercentages && nameArrayPercentages.length > 0) {
      nameArrayPercentages.forEach((e) => (namePercentageSum = namePercentageSum + e.percentage));
      if (namePercentageSum !== 0) {
        nameMatchPercentage = namePercentageSum / nameArrayPercentages.length;
      } else {
        nameMatchPercentage = 0;
      }
    }
  }

  return {
    str,
    wordArray,
    estate,
    state,
    stateMatched,
    expDate,
    validDate,
    id,
    dobDate,
    sex,
    nameMatchPercentage,
    validDateDob,
    wordLineArray
  };
};

export default dataFilter;
