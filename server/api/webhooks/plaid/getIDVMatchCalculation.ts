import stringSimilarity from 'string-similarity';

interface Match {
  fullName: string;
  address: string;
  phoneNumber: string;
}

interface MathField {
  percentage: number;
  backoffice: string;
  idv: string;
}

export interface MatchInfo {
  fullName: MathField;
  address: MathField;
  phoneNumber: MathField;
  total: number;
}

interface Parameters {
  backoffice: Match;
  idv: Match;
}

const FIELDS_LENGTH = 3;

const removeDashes = (str: string): string => {
  return str.replace(/-/g, '');
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const similarity = stringSimilarity.compareTwoStrings(str1, str2);
  return Math.round(similarity * 100);
};

const calculateFieldMatch = (backofficeValue: string, idvValue: string): MathField => {
  const percentage = calculateSimilarity(backofficeValue, idvValue);

  return {
    percentage,
    backoffice: backofficeValue,
    idv: idvValue
  };
};

export function getIDVMatchCalculation({ backoffice, idv }: Parameters): MatchInfo {
  const fullName = calculateFieldMatch(backoffice.fullName, idv.fullName);
  const address = calculateFieldMatch(backoffice.address, idv.address);
  const phoneNumber = calculateFieldMatch(removeDashes(backoffice.phoneNumber), removeDashes(idv.phoneNumber));

  const total = Math.floor((fullName.percentage + address.percentage + phoneNumber.percentage) / FIELDS_LENGTH);

  return {
    fullName,
    address,
    phoneNumber,
    total
  };
}
