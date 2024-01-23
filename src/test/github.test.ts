import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { graphql } from '@octokit/graphql';
import pino from 'pino';
import { GithubOrg } from '../github';

const since = new Date();

since.setDate(since.getDate() - 7);

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
}

const mockIssue = {
  title: 'Issue1',
  url: '',
  comments: { totalCount: 1 },
  createdAt: since.toISOString(),
  labels: { totalCount: 1 },
  number: 1,
  state: 'OPEN',
  closedAt: null,
  updatedAt: since.toISOString(),
};

const mockPullRequest = {
  title: 'PR1',
  url: '',
  comments: { totalCount: 1 },
  createdAt: since.toISOString(),
  mergedAt: since.toISOString(),
  number: 1,
  state: 'MERGED',
  closedAt: null,
  updatedAt: since.toISOString(),
  merged: true,
  author: {
    login: 'testUser',
    location: 'testLocation',
  },
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
  }
};

const silentLogger = pino({
  level: 'silent'
});

it('fetchOrganizationRepos should return a list of repositories', async () => {
  const mockRepos = [mockRepo];

  const mockClient = async () => {
    return {
      organization: {
        repositories: {
          edges: mockRepos,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' }
        }
      }
    }
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
      incorrectResponseObject: {}
    }
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
              cursor: `cursor${callCount}`
            },
          ],
          pageInfo: { hasNextPage: callCount < 2, endCursor: `cursor${callCount}` }
        }
      }
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

it('fetchRepoIssues should return a list of issues', async () => {
  const mockIssues = [mockIssue];

  const mockClient = async () => {
    return {
      repository: {
        issues: {
          nodes: mockIssues,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockIssues.length,
        }
      }
    }
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  const result = await githubOrg.fetchRepoIssues('Repo1');

  assert.ok(result);
  assert.equal(result.length, mockIssues.length);
});

it('fetchRepoIssues should throw error if response validation fails', async () => {
  const mockClient = async () => {
    return {
      incorrectResponseObject: {}
    }
  };

  const githubOrg = new GithubOrg({
    client: mockClient as unknown as typeof graphql,
    org: 'testOrg',
    since,
    logger: silentLogger,
  });

  try {
    await githubOrg.fetchRepoIssues('Repo1');
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});

it('fetchRepoIssues should throw error if graphql client throws', async () => {
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
    await githubOrg.fetchRepoIssues('Repo1');
    assert.fail('Expected method to throw an error');
  } catch (error) {
    assert.ok(error);
  }
});

it('fetchRepoPullRequests should return a list of pull requests', async () => {
  const mockPullRequests = [mockPullRequest];

  const mockClient = async () => {
    return {
      repository: {
        pullRequests: {
          nodes: mockPullRequests,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockPullRequests.length,
        }
      }
    }
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
      incorrectResponseObject: {}
    }
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
              ...mockPullRequest,
              title: `PR${callCount}`,
            },
          ],
          pageInfo: { hasNextPage: callCount < 2, endCursor: `cursor${callCount}` },
          totalCount: 1,
        }
      }
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
      ...mockPullRequest,
      createdAt: new Date(new Date(since).setDate(since.getDate() - 8)).toISOString(),
      updatedAt: new Date(new Date(since).setDate(since.getDate() - 8)).toISOString(),
    },
    mockPullRequest,
  ];

  const mockClient = async () => {
    return {
      repository: {
        pullRequests: {
          nodes: mockPullRequests,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockPullRequests.length,
        }
      }
    }
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

