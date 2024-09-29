import Metrics from '../../collections/metrics';
const emptyMetrics = {
  active: {
    count: 0,
    total: 0,
    fee: 0,
    collected: 0
  },
  lifetime: {
    count: 0,
    total: 0,
    fee: 0,
    collected: 0
  }
};

export async function dealsMetrics() {
  const dealsAllocationMetrics = Metrics.findOne({ _id: 'dealsAllocation' });

  if (!dealsAllocationMetrics) {
    return emptyMetrics;
  }

  const { current, lifetime } = dealsAllocationMetrics;

  if (!current) {
    return emptyMetrics;
  }

  return {
    active: {
      count: current.count,
      total: current.principal,
      fee: current.fee,
      collected: current.collected
    },
    lifetime: {
      count: lifetime.count,
      total: lifetime.principal,
      fee: lifetime.fee,
      collected: lifetime.collected
    }
  };
}
