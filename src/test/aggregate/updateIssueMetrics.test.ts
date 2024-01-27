import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { updateIssueMetrics } from '../../aggregate';
import { openIssueMock, closedIssueMock } from '../common';

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
  const result = updateIssueMetrics([openIssueMock], metrics);
  assert.equal(result.openIssuesCount, 1);
});

it('updateIssueMetrics should update metrics for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssueMock], metrics);
  assert.equal(result.closedIssuesCount, 1);
});

it('updateIssueMetrics should update metrics for both open and closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([openIssueMock, closedIssueMock], metrics);
  assert.equal(result.openIssuesCount, 1);
  assert.equal(result.closedIssuesCount, 1);
});

it('updateIssueMetrics should update totalTimeToClose for closed issues', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssueMock], metrics);
  const created = new Date(closedIssueMock.createdAt).getTime();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const closed = new Date(closedIssueMock.closedAt!).getTime();
  assert.equal(result.totalTimeToClose, closed - created);
});

it('updateIssueMetrics should update totalCommentsPerIssue', () => {
  const metrics = { ...initialMetricsIssues };
  const result = updateIssueMetrics([closedIssueMock], metrics);
  assert.equal(
    result.totalCommentsPerIssue,
    closedIssueMock.comments.totalCount
  );
});
