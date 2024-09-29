export default function formatNumber(input) {
  if (typeof input !== 'string') return input;
  if (input.startsWith('+1')) return input;

  if (input.charAt(0) === '1') return `+${input}`;
  if (input.charAt(0) === '+' && input.charAt(1) !== '1') return `+1${input.substr(1)}`;

  return `+1${input}`;
}
