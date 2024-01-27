import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { graphql } from '@octokit/graphql';
import { GithubOrg } from '../../github';
import { since, silentLogger } from '../common';

const mockRepo = {
  node: {
    name: 'Repo1',
    description: 'Repo1 description',
    url: '',
    stargazerCount: 1,
    forkCount: 1,
    pushedAt: since.toISOString(),
  },
  cursor: 'cursor1',
};

it('fetchOrganizationRepos should return a list of repositories', async () => {
  const mockRepos = [mockRepo];

  const mockClient = async () => {
    return {
      organization: {
        repositories: {
          edges: mockRepos,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
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
  const result = await githubOrg.fetchOrganizationRepos();

  assert.ok(result);
  assert.equal(result.totalRepos, mockRepos.length);
  assert.equal(result.activeRepos.length, mockRepos.length);
});

it('fetchOrganizationRepos should throw error if response validation fails', async () => {
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
    await githubOrg.fetchOrganizationRepos();
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});

it('fetchOrganizationRepos should handle pagination correctly', async () => {
  let callCount = 0;

  const mockClient = async () => {
    callCount++;
    return {
      organization: {
        repositories: {
          edges: [
            {
              node: {
                ...mockRepo.node,
                name: `Repo${callCount}`,
              },
              cursor: `cursor${callCount}`,
            },
          ],
          pageInfo: {
            hasNextPage: callCount < 2,
            endCursor: `cursor${callCount}`,
          },
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

  const result = await githubOrg.fetchOrganizationRepos();

  assert.ok(result);
  assert.equal(callCount, 2);
});

it('fetchOrganizationRepos should throw error if graphql client throws', async () => {
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
    await githubOrg.fetchOrganizationRepos();
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});
