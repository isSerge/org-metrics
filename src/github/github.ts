import { graphql } from '@octokit/graphql';
import { fetchRepoIssues } from "./issues";
import { fetchRepoPullRequests } from "./pullRequests";

interface RepositoryNode {
  name: string;
  description: string;
  url: string;
  stargazerCount: number;
  forkCount: number;
  updatedAt: string;
}

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
}

export async function aggregateData(client: typeof graphql, org: string, repos: RepositoryNode[], since: Date) {
  let totalStars = 0;
  let totalForks = 0;
  const recentUpdatedRepos: RepositoryNode[] = [];
  let openIssuesCount = 0;
  let closedIssuesCount = 0;
  let openPRsCount = 0;
  let mergedPRsCount = 0;
  let totalTimeToMerge = 0;
  let totalTimeToClose = 0;

  for (const repo of repos) {
    totalStars += repo.stargazerCount;
    totalForks += repo.forkCount;

    const issues = await fetchRepoIssues(client, org, repo.name, since);
    const pullRequests = await fetchRepoPullRequests(client, org, repo.name, since);

    if (issues.length > 0 || pullRequests.length > 0) {
      recentUpdatedRepos.push(repo);
    }

    const open = issues.filter(issue => issue.state === 'OPEN');
    const closed = issues.filter(issue => issue.state === 'CLOSED');

    openIssuesCount += open.length;
    closedIssuesCount += closed.length;

    for (const { createdAt, closedAt } of closed) {
      const created = new Date(createdAt);
      const closed = new Date(closedAt);
      const timeToClose = closed.getTime() - created.getTime();
      totalTimeToClose += timeToClose;
    }

    const repoOpenPRs = pullRequests.filter(pr => pr.state === 'OPEN');
    const repoMergedPRs = pullRequests.filter(pr => pr.state === 'MERGED');

    openPRsCount += repoOpenPRs.length;
    mergedPRsCount += repoMergedPRs.length;

    for (const { createdAt, mergedAt } of repoMergedPRs) {
      const created = new Date(createdAt);
      const merged = new Date(mergedAt);
      const timeToMerge = merged.getTime() - created.getTime();
      totalTimeToMerge += timeToMerge;
    }
  }

  const averageTimeToClose = totalTimeToClose === 0 ? 0 : totalTimeToClose / closedIssuesCount;
  const averageTimeToMerge = totalTimeToMerge === 0 ? 0 : totalTimeToMerge / mergedPRsCount;

  return {
    totalStars,
    totalForks,
    repoCount: repos.length,
    recentUpdatedRepos,
    issues: {
      open: openIssuesCount,
      closed: closedIssuesCount,
      averageTimeToClose,
    },
    pullRequests: {
      open: openPRsCount,
      merged: mergedPRsCount,
      averageTimeToMerge,
    },
  };
}
