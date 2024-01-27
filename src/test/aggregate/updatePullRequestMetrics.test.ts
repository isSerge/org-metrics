import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { updatePullRequestMetrics } from '../../aggregate';
import { openPrMock, mergedPrMock } from '../common';

const initialMetricsPRs = {
  openPRsCount: 0,
  mergedPRsCount: 0,
  totalTimeToMerge: 0,
  totalCommentsPerPR: 0,
};

it('updatePullRequestMetrics should return 0 for all metrics when no PRs are passed', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([], metrics);
  assert.deepEqual(result, metrics);
});

it('updatePullRequestMetrics should update metrics for open pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([openPrMock], metrics);
  assert.equal(result.openPRsCount, 1);
});

it('updatePullRequestMetrics should update metrics for merged pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPrMock], metrics);
  assert.equal(result.mergedPRsCount, 1);
});

it('updatePullRequestMetrics should update metrics for both open and merged pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([openPrMock, mergedPrMock], metrics);
  assert.equal(result.openPRsCount, 1);
  assert.equal(result.mergedPRsCount, 1);
});

it('updatePullRequestMetrics should update totalTimeToMerge', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPrMock], metrics);
  const created = new Date(mergedPrMock.createdAt).getTime();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const merged = new Date(mergedPrMock.mergedAt!).getTime();
  assert.equal(result.totalTimeToMerge, merged - created);
});

it('updatePullRequestMetrics should update totalCommentsPerPR', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPrMock], metrics);
  assert.equal(result.totalCommentsPerPR, mergedPrMock.comments.totalCount);
});
