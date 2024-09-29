import { startOfMonth, format } from 'date-fns/';

export default function groupByMonth(arr, operator) {
  const group = [];

  arr.forEach((element) => {
    const _toFilter = startOfMonth(element[operator]);

    if (!group[_toFilter]) {
      group[_toFilter] = {
        _toFilter,
        group: format(_toFilter, 'MMM-yy'),
        deals: [element]
      };
    } else {
      group[_toFilter].deals.push(element);
    }
  });

  const group2 = [];

  for (const key in group) {
    group2.push(group[key]);
  }

  group2.sort((a, b) => a._toFilter - b._toFilter);
  const cleaned = group2.map(({ _toFilter, ...rest }) => rest);

  return cleaned;
}
