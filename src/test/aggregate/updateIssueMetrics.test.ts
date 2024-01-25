import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { updateIssueMetrics } from '../../aggregate';

const openIssue = {
  state: 'OPEN',
  createdAt: '2021-01-01T00:00:00Z',
  closedAt: null,
  comments: { totalCount: 3 },
  number: 1,
  title: 'Issue1',
  url: '',
  updatedAt: '2021-01-01T00:00:00Z',
  labels: {
    totalCount: 1,
    nodes: [
      {
        name: 'bug',
      },
    ],
  },
};

const closedIssue = {
  ...openIssue,
  state: 'CLOSED',
  createdAt: '2021-01-01T00:00:00Z',
  closedAt: '2021-01-05T00:00:00Z',
  comments: { totalCount: 2 },
};

const initialMetricsIssues = {
  openIssuesCount: 0,
  closedIssuesCount: 0,
  totalTimeToClose: 0,
  totalCommentsPerIssue: 0,
};

it('updateIssueMetrics should return 0 for all metrics when no issues are passed', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([], metrics);
  assert.deepEqual(result, metrics);
});

it('updateIssueMetrics should update metrics for open issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([openIssue], metrics);
  assert.equal(result.openIssuesCount, 1);
});

it('updateIssueMetrics should update metrics for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssue], metrics);
  assert.equal(result.closedIssuesCount, 1);
});

it('updateIssueMetrics should update metrics for both open and closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([openIssue, closedIssue], metrics);
  assert.equal(result.openIssuesCount, 1);
  assert.equal(result.closedIssuesCount, 1);
});

it('updateIssueMetrics should update totalTimeToClose for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssue], metrics);
  const created = new Date(closedIssue.createdAt).getTime();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const closed = new Date(closedIssue.closedAt!).getTime();
  assert.equal(result.totalTimeToClose, closed - created);
});

it('updateIssueMetrics should update totalCommentsPerIssue', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssue], metrics);
  assert.equal(result.totalCommentsPerIssue, closedIssue.comments.totalCount);
});
