import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { processIssues } from '../../aggregate';

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
        name: 'bug'
      }
    ]
  },
};

const closedIssue = {
  ...openIssue,
  state: 'CLOSED',
  createdAt: '2021-01-01T00:00:00Z',
  closedAt: '2021-01-05T00:00:00Z',
  comments: { totalCount: 2 }
};

const initialMetricsIssues = {
  openIssuesCount: 0,
  closedIssuesCount: 0,
  totalTimeToClose: 0,
  totalCommentsPerIssue: 0
};

it('processIssues should return 0 for all metrics when no issues are passed', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([], metrics);
  assert.deepEqual(result, metrics);
});

it('processIssues should update metrics for open issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([openIssue], metrics);
  assert.equal(result.openIssuesCount, 1);
});

it('processIssues should update metrics for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([closedIssue], metrics);
  assert.equal(result.closedIssuesCount, 1);
});

it('processIssues should update metrics for both open and closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([openIssue, closedIssue], metrics);
  assert.equal(result.openIssuesCount, 1);
  assert.equal(result.closedIssuesCount, 1);
});

it('processIssues should update totalTimeToClose for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([closedIssue], metrics);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  assert.equal(result.totalTimeToClose, new Date(closedIssue.closedAt!).getTime() - new Date(closedIssue.createdAt).getTime());
});

it('processIssues should update totalCommentsPerIssue', () => {
  const metrics = { ...initialMetricsIssues };
  const result = processIssues([closedIssue], metrics);
  assert.equal(result.totalCommentsPerIssue, closedIssue.comments.totalCount);
});
