export default function doDecimalSafeMath(a, operation, b, precision) {
  function decimalLength(numStr) {
    var pieces = numStr.toString().split('.');
    if (!pieces[1]) return 0;
    return pieces[1].length;
  }

  // Figure out what we need to multiply by to make everything a whole number
  precision = precision || Math.pow(10, Math.max(decimalLength(a), decimalLength(b)));

  a = a * precision;
  b = b * precision;

  // Figure out which operation to perform.
  var operator;
  switch (operation.toLowerCase()) {
    case '-':
      operator = function (a, b) {
        return a - b;
      };
      break;
    case '+':
      operator = function (a, b) {
        return a + b;
      };
      break;
    case '*':
    case 'x':
      precision = precision * precision;
      operator = function (a, b) {
        return a * b;
      };
      break;
    case '÷':
    case '/':
      precision = 1;
      operator = function (a, b) {
        return a / b;
      };
      break;

    // Let us pass in a function to perform other operations.
    default:
      operator = operation;
  }

  var result = operator(a, b);

  // Remove our multiplier to put the decimal back.
  return result / precision;
}
