import roundToTwo from './roundToTwo';

const getTotalAmountArray = (arr, operator) => roundToTwo(arr.map((e) => e[operator]).reduce((a, b) => a + b, 0));
export default getTotalAmountArray;
