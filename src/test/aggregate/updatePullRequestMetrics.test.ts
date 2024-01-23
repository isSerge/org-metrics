import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { updatePullRequestMetrics } from '../../aggregate';

const openPr = {
  title: 'PR1',
  url: '',
  comments: { totalCount: 1 },
  createdAt: '2021-01-01T00:00:00Z',
  mergedAt: null,
  number: 1,
  state: 'OPEN',
  closedAt: null,
  updatedAt: '2021-01-01T00:00:00Z',
  merged: false,
  participants: {
    nodes: [
      {
        login: 'testUser',
        location: 'testLocation',
      },
      {
        login: 'testUser2',
        location: 'testLocation2',
      }
    ]
  },
  author: {
    login: 'testUser',
    location: 'testLocation',
  },
  files: {
    nodes: [
      {
        additions: 1,
        deletions: 1,
      }
    ]
  }
}

const mergedPr = {
  ...openPr,
  merged: true,
  mergedAt: '2021-02-01T00:00:00Z',
  state: 'MERGED',
  title: 'PR2',
  comments: { totalCount: 2 },
}

const initialMetricsPRs = {
  openPRsCount: 0,
  mergedPRsCount: 0,
  totalTimeToMerge: 0,
  totalCommentsPerPR: 0
};

it('updatePullRequestMetrics should return 0 for all metrics when no PRs are passed', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([], metrics);
  assert.deepEqual(result, metrics);
});

it('updatePullRequestMetrics should update metrics for open pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([openPr], metrics);
  assert.equal(result.openPRsCount, 1);
});

it('updatePullRequestMetrics should update metrics for merged pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPr], metrics);
  assert.equal(result.mergedPRsCount, 1);
});

it('updatePullRequestMetrics should update metrics for both open and merged pull requests', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([openPr, mergedPr], metrics);
  assert.equal(result.openPRsCount, 1);
  assert.equal(result.mergedPRsCount, 1);
});

it('updatePullRequestMetrics should update totalTimeToMerge', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPr], metrics);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  assert.equal(result.totalTimeToMerge, new Date(mergedPr.mergedAt!).getTime() - new Date(mergedPr.createdAt).getTime());
});

it('updatePullRequestMetrics should update totalCommentsPerPR', () => {
  const metrics = { ...initialMetricsPRs };
  const result = updatePullRequestMetrics([mergedPr], metrics);
  assert.equal(result.totalCommentsPerPR, mergedPr.comments.totalCount);
});
