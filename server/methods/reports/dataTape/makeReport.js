import getDataTape from './getDataTape';
import Reports from '../../../collections/reports';
import { groupBy } from '../../../utils/utils';
import countValueinInObjectKey from '../../../utils/countValueinInObjectKey';
import { check } from 'meteor/check';
import logger from '../../../logger/log';
export default async function dataReportsMakeReport({ custom, start, end }) {
  if (custom) {
    check(start, Date);
    check(end, Date);
  }
  const dates = custom ? { start, end } : { start: '2018/05/01', end: new Date() };

  const reportID = Reports.insert({
    type: 'fullTape',
    ...(custom ? { custom: true } : {}),
    ...(custom ? { range: dates } : {}),
    ready: false,
    created: new Date(),
    report: false
  });
  //
  const data = await getDataTape(dates);
  const allCount = data.length;

  if (!allCount === 0) logger.error('EMPTY_ARRAY');

  const groupedByStatus = groupBy(data, 'STATUS');
  const groupedByState = groupBy(data, 'CUSTOMER_STATE');
  const groupedByGrade = groupBy(data, 'CUSTOMER_GRADE');

  const avgProductAmount = data.map((d) => d.AMOUNT).reduce((a, b) => a + b, 0) / allCount;
  const totalProductPrincipal = data.map((d) => d.AMOUNT).reduce((a, b) => a + b, 0);
  const avgProductFee = data.map((d) => d.FEE).reduce((a, b) => a + b, 0) / allCount;

  const report = {
    all: allCount,
    totalProductPrincipal,
    avgProductAmount,
    avgProductFee,
    groups: {
      status: countValueinInObjectKey(groupedByStatus),
      state: countValueinInObjectKey(groupedByState),
      grade: countValueinInObjectKey(groupedByGrade)
    }
  };

  Reports.update({ _id: reportID }, { $set: { report, ready: true } });

  return true;
}
