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

export class GithubOrg {
  client: typeof graphql;
  org: string;
  since: Date;

  constructor(client: typeof graphql, org: string, since: Date) {
    // Validate inputs
    stringSchema.parse(org);
    dateSchema.parse(since);

    this.client = client;
    this.org = org;
    this.since = since;
  }

  /**
   * Fetches all repositories for an organization
   * @returns - Total number of repositories and active repositories for a given period
  */
  public async fetchOrganizationRepos(): Promise<{ totalRepos: number, activeRepos: RepositoryNode[] } | void> {
    logger.info(`Fetching repos for ${this.org}`);

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
        const rawResult = await this.client(query, { org: this.org, cursor });
        // Validate the raw response
        const result = organizationSchema.parse(rawResult);
        allRepos.push(...result.organization.repositories.edges.map(edge => edge.node));
        hasNextPage = result.organization.repositories.pageInfo.hasNextPage;
        cursor = result.organization.repositories.pageInfo.endCursor;
      }

      const filteredByPushedAt = allRepos.filter(repo => new Date(repo.pushedAt) >= this.since);

      logger.info(`Fetched ${filteredByPushedAt.length} repos for ${this.org}`);

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
   * @param repoName - Repository name
   * @returns - All issues for a repository since a given date till now
  */
  public async fetchRepoIssues(repoName: string): Promise<IssueNode[]> {
    // Validate inputs
    stringSchema.parse(repoName);

    logger.info(`Fetching issues for ${repoName}`);

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

        const rawResult = await this.client(query, {
          repoName,
          since: this.since.toISOString(),
          org: this.org,
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
   * @param repoName - Repository name
   * @returns - All pull requests for a repository since a given date till now
  */
  public async fetchRepoPullRequests(repoName: string): Promise<PullRequestNode[]> {
    // Validate inputs
    stringSchema.parse(repoName);

    logger.info(`Fetching pull requests for ${repoName}`);

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

        const rawResult = await this.client(query, {
          repoName,
          org: this.org,
          cursor: endCursor,
        });

        // Validate the raw response
        const result = repositoryPullRequestsSchema.parse(rawResult);

        const filteredPRs = result.repository.pullRequests.nodes.filter(pr => new Date(pr.createdAt) >= this.since || new Date(pr.updatedAt) >= this.since);
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
}
