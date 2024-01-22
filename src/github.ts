import { graphql } from '@octokit/graphql';
import {
  RepositoryNode,
  IssueNode,
  PullRequestNode,
  organizationSchema,
  stringSchema,
  dateSchema,
  repositoryPullRequestsSchema,
  repositoryIssuesSchema
} from "./types";
import { handleException } from './error';
import { logger } from './logger';

/**
 * Fetches all repositories for an organization
 * @param client - Octokit graphql client
 * @param org - Organization name
 * @param since - Start date for filtering till now
 * @returns - Total number of repositories and active repositories for a given period
 */
export async function fetchOrganizationRepos(client: typeof graphql, org: string, since: Date): Promise<{ totalRepos: number, activeRepos: RepositoryNode[] } | void> {
  logger.info(`Fetching repos for ${org}`);

  // Validate inputs
  stringSchema.parse(org);
  dateSchema.parse(since);

  try {
    let hasNextPage = true;
    let cursor: string | null = null;
    const allRepos = [];

    const query = `
      query ($org: String!, $cursor: String) {
        organization(login: $org) {
          repositories(first: 10, after: $cursor) {
            edges {
              node {
                name
                description
                url
                stargazerCount
                forkCount
                pushedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }  
    `;

    while (hasNextPage) {
      const rawResult = await client(query, { org, cursor });
      // Validate the raw response
      const result = organizationSchema.parse(rawResult);
      allRepos.push(...result.organization.repositories.edges.map(edge => edge.node));
      hasNextPage = result.organization.repositories.pageInfo.hasNextPage;
      cursor = result.organization.repositories.pageInfo.endCursor;
    }

    const filteredByPushedAt = allRepos.filter(repo => new Date(repo.pushedAt) >= since);

    logger.info(`Fetched ${filteredByPushedAt.length} repos for ${org}`);

    return {
      totalRepos: allRepos.length,
      activeRepos: filteredByPushedAt,
    };
  } catch (error) {
    handleException(error, 'fetchOrganizationRepos');
  }
}

/**
 * Fetches all issues for a repository since a given date till now
 * @param client - Octokit graphql client
 * @param org - Organization name
 * @param repoName - Repository name
 * @param since - Start date for filtering till now
 * @returns - All issues for a repository since a given date till now
 */
export async function fetchRepoIssues(client: typeof graphql, org: string, repoName: string, since: Date): Promise<IssueNode[]> {
  logger.info(`Fetching issues for ${repoName}`);

  // Validate inputs
  stringSchema.parse(org);
  stringSchema.parse(repoName);
  dateSchema.parse(since);

  try {
    let issues: IssueNode[] = [];
    let endCursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = `
      query ($org: String!, $repoName: String!, $since: DateTime!, $cursor: String) {
        repository(owner: $org, name: $repoName) {
          issues(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}, filterBy: {since: $since}) {
            totalCount
            nodes {
              title
              url
              comments {
                totalCount
              }
              createdAt
              labels {
                totalCount
              }
              number
              state
              closedAt
              updatedAt
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    `;

      const rawResult = await client(query, {
        repoName,
        since: since.toISOString(),
        org,
        cursor: endCursor
      });

      // Validate the raw response
      const result = repositoryIssuesSchema.parse(rawResult);

      issues = issues.concat(result.repository.issues.nodes);
      endCursor = result.repository.issues.pageInfo.endCursor;
      hasNextPage = result.repository.issues.pageInfo.hasNextPage;
    }

    logger.info(`Fetched ${issues.length} issues for ${repoName}`);

    return issues;
  } catch (error) {
    handleException(error, 'fetchRepoIssues');
    return [];
  }
}

/**
 * Fetches all pull requests for a repository since a given date till now
 * @param client - Octokit graphql client
 * @param org - Organization name
 * @param repoName - Repository name
 * @param since - Start date for filtering till now
 * @returns - All pull requests for a repository since a given date till now
 */
export async function fetchRepoPullRequests(client: typeof graphql, org: string, repoName: string, since: Date): Promise<PullRequestNode[]> {
  logger.info(`Fetching pull requests for ${repoName}`);

  // Validate inputs
  stringSchema.parse(org);
  stringSchema.parse(repoName);
  dateSchema.parse(since);

  try {
    let pullRequests: PullRequestNode[] = [];
    let endCursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = `
      query ($org: String!, $repoName: String!, $cursor: String) {
        repository(owner: $org, name: $repoName) {
          pullRequests(first: 100, after: $cursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
            totalCount
            nodes {
              title
              url
              comments {
                totalCount
              }
              createdAt
              mergedAt
              number
              state
              closedAt
              updatedAt
              participants(first: 100) {
                nodes {
                  login
                  location
                }
              }
              author {
                login
              }
              merged
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    `;

      const rawResult = await client(query, {
        repoName,
        org,
        cursor: endCursor,
      });

      console.log((rawResult as any).repository.pullRequests.nodes)

      // Validate the raw response
      const result = repositoryPullRequestsSchema.parse(rawResult);

      const filteredPRs = result.repository.pullRequests.nodes.filter(pr => new Date(pr.createdAt) >= since || new Date(pr.updatedAt) >= since);
      pullRequests = pullRequests.concat(filteredPRs);
      endCursor = result.repository.pullRequests.pageInfo.endCursor;
      hasNextPage = result.repository.pullRequests.pageInfo.hasNextPage;
    }

    logger.info(`Fetched ${pullRequests.length} pull requests for ${repoName}`);

    return pullRequests;
  } catch (error) {
    handleException(error, 'fetchRepoPullRequests');
    return [];
  }
}

