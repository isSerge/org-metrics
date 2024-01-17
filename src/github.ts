import { graphql } from '@octokit/graphql';
import { RepositoryNode, IssueNode, PullRequestNode } from "./types";
import { handleException } from './error';

interface RepositoryEdge {
  node: RepositoryNode;
  cursor: string;
}

interface RepositoryPageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

interface OrganizationRepositories {
  edges: RepositoryEdge[];
  pageInfo: RepositoryPageInfo;
}

interface OrganizationDataResponse {
  organization: {
    repositories: OrganizationRepositories;
  };
}

export async function fetchOrganizationRepos(client: typeof graphql, org: string): Promise<RepositoryNode[]> {
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
      const result: OrganizationDataResponse = await client(query, { org, cursor });
      allRepos.push(...result.organization.repositories.edges.map(edge => edge.node));
      hasNextPage = result.organization.repositories.pageInfo.hasNextPage;
      cursor = result.organization.repositories.pageInfo.endCursor;
    }

    return allRepos;
  } catch (error) {
    handleException(error, 'fetchOrganizationRepos');
    return [];
  }
}


interface IssuePage {
  totalCount: number;
  nodes: IssueNode[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}


export async function fetchRepoIssues(client: typeof graphql, org: string, repoName: string, since: Date): Promise<IssueNode[]> {
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

      const result: { repository: { issues: IssuePage } } = await client(query, {
        repoName,
        since: since.toISOString(),
        org,
        cursor: endCursor
      });

      issues = issues.concat(result.repository.issues.nodes);
      endCursor = result.repository.issues.pageInfo.endCursor;
      hasNextPage = result.repository.issues.pageInfo.hasNextPage;
    }

    return issues;

  } catch (error) {
    handleException(error, 'fetchRepoIssues');
    return [];
  }
}


interface PullRequestPage {
  totalCount: number;
  nodes: PullRequestNode[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

export async function fetchRepoPullRequests(client: typeof graphql, org: string, repoName: string, since: Date): Promise<PullRequestNode[]> {
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
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    `;

      const result: { repository: { pullRequests: PullRequestPage } } = await client(query, {
        repoName,
        org,
        cursor: endCursor,
      });

      const filteredPRs = result.repository.pullRequests.nodes.filter(pr => new Date(pr.createdAt) >= since || new Date(pr.updatedAt) >= since);
      pullRequests = pullRequests.concat(filteredPRs);
      endCursor = result.repository.pullRequests.pageInfo.endCursor;
      hasNextPage = result.repository.pullRequests.pageInfo.hasNextPage;
    }

    return pullRequests;

  } catch (error) {
    handleException(error, 'fetchRepoPullRequests');
    return [];
  }
}

