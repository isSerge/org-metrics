import { graphql } from '@octokit/graphql';

interface PullRequestPage {
  totalCount: number;
  nodes: PullRequestNode[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

export interface PullRequestNode {
  title: string;
  url: string;
  comments: {
    totalCount: number;
  };
  createdAt: string;
  mergedAt: string;
  number: number;
  state: string;
  closedAt: string;
  updatedAt: string;
}

export async function fetchRepoPullRequests(client: typeof graphql, org: string, repoName: string, since: Date): Promise<PullRequestNode[]> {
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
}

