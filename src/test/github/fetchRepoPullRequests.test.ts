import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { graphql } from '@octokit/graphql';
import { GithubOrg } from '../../github';
import { since, silentLogger, openPrMock } from '../common';

it('fetchRepoPullRequests should return a list of pull requests', async () => {
  const mockPullRequests = [openPrMock];

  const mockClient = async () => {
    return {
      repository: {
        pullRequests: {
          nodes: mockPullRequests,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockPullRequests.length,
        },
      },
    };
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  const result = await githubOrg.fetchRepoPullRequests('Repo1');

  assert.ok(result);
  assert.equal(result.length, mockPullRequests.length);
});

it('fetchRepoPullRequests should throw error if response validation fails', async () => {
  const mockClient = async () => {
    return {
      incorrectResponseObject: {},
    };
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  try {
    await githubOrg.fetchRepoPullRequests('Repo1');
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});

it('fetchRepoPullRequests should throw error if graphql client throws', async () => {
  const mockClient = async () => {
    throw new Error('Test error');
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  try {
    await githubOrg.fetchRepoPullRequests('Repo1');
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});

it('fetchRepoPullRequests should handle pagination correctly', async () => {
  let callCount = 0;

  const mockClient = async () => {
    callCount++;
    return {
      repository: {
        pullRequests: {
          nodes: [
            {
              ...openPrMock,
              title: `PR${callCount}`,
            },
          ],
          pageInfo: {
            hasNextPage: callCount < 2,
            endCursor: `cursor${callCount}`,
          },
          totalCount: 1,
        },
      },
    };
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  const result = await githubOrg.fetchRepoPullRequests('Repo1');

  assert.ok(result);
  assert.equal(callCount, 2);
});

it('fetchRepoPullRequests should filter pull requests based on since date', async () => {
  const mockPullRequests = [
    {
      ...openPrMock,
      createdAt: new Date(
        new Date(since).setDate(since.getDate() - 8)
      ).toISOString(),
      updatedAt: new Date(
        new Date(since).setDate(since.getDate() - 8)
      ).toISOString(),
    },
    openPrMock,
  ];

  const mockClient = async () => {
    return {
      repository: {
        pullRequests: {
          nodes: mockPullRequests,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockPullRequests.length,
        },
      },
    };
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  const result = await githubOrg.fetchRepoPullRequests('Repo1');

  assert.ok(result);
  assert.equal(result.length, 1);
});
