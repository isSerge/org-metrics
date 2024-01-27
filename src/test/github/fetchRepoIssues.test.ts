import { it } from 'node:test';
import * as assert from 'node:assert/strict';
import { graphql } from '@octokit/graphql';
import { GithubOrg } from '../../github';
import { since, silentLogger, openIssueMock } from '../common';

it('fetchRepoIssues should return a list of issues', async () => {
  const mockIssues = [openIssueMock];

  const mockClient = async () => {
    return {
      repository: {
        issues: {
          nodes: mockIssues,
          pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
          totalCount: mockIssues.length,
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

  const result = await githubOrg.fetchRepoIssues('Repo1');

  assert.ok(result);
  assert.equal(result.length, mockIssues.length);
});

it('fetchRepoIssues should throw error if response validation fails', async () => {
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
