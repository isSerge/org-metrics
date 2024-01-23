import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { processPullRequests } from '../aggregate';

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

const initialMetrics = {
  openPRsCount: 0,
  mergedPRsCount: 0,
  totalTimeToMerge: 0,
  totalCommentsPerPR: 0
};

it('processPullRequests should return 0 for all metrics when no PRs are passed', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([], metrics);
  assert.deepEqual(result, metrics);
});

it('processPullRequests should update metrics for open pull requests', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([openPr], metrics);
  assert.equal(result.openPRsCount, 1);
});

it('processPullRequests should update metrics for merged pull requests', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([mergedPr], metrics);
  assert.equal(result.mergedPRsCount, 1);
});

it('processPullRequests should update metrics for both open and merged pull requests', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([openPr, mergedPr], metrics);
  assert.equal(result.openPRsCount, 1);
  assert.equal(result.mergedPRsCount, 1);
});

it('processPullRequests should update totalTimeToMerge', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([mergedPr], metrics);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  assert.equal(result.totalTimeToMerge, new Date(mergedPr.mergedAt!).getTime() - new Date(mergedPr.createdAt).getTime());
});

it('processPullRequests should update totalCommentsPerPR', () => {
  const metrics = { ...initialMetrics };
  const result = processPullRequests([mergedPr], metrics);
  assert.equal(result.totalCommentsPerPR, mergedPr.comments.totalCount);
});
