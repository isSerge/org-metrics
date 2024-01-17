import { graphql } from '@octokit/graphql';
import { fetchRepoIssues, IssueNode } from "./issues";
import { fetchRepoPullRequests, PullRequestNode } from "./pullRequests";

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

  let issueMetrics = initializeIssueMetrics();
  let prMetrics = initializePRMetrics();

  for (const repo of repos) {
    totalStars += repo.stargazerCount;
    totalForks += repo.forkCount;

    const issues = await fetchRepoIssues(client, org, repo.name, since);
    const pullRequests = await fetchRepoPullRequests(client, org, repo.name, since);

    if (issues.length > 0 || pullRequests.length > 0) {
      recentUpdatedRepos.push(repo);
    }

    issueMetrics = processIssues(issues, issueMetrics);

    prMetrics = processPullRequests(pullRequests, prMetrics);
  }

  const averageTimeToClose = calculateAverageTime(issueMetrics.totalTimeToClose, issueMetrics.closedIssuesCount);
  const averageTimeToMerge = calculateAverageTime(prMetrics.totalTimeToMerge, prMetrics.mergedPRsCount);
  const averageCommentsPerIssue = calculateAverageComments(issueMetrics.totalCommentsPerIssue, issueMetrics.closedIssuesCount);
  const averageCommentsPerPR = calculateAverageComments(prMetrics.totalCommentsPerPR, prMetrics.mergedPRsCount);

  return {
    totalStars,
    totalForks,
    repoCount: repos.length,
    recentUpdatedRepos,
    issues: {
      open: issueMetrics.openIssuesCount,
      closed: issueMetrics.closedIssuesCount,
      averageTimeToClose,
      averageCommentsPerIssue,
    },
    pullRequests: {
      open: prMetrics.openPRsCount,
      merged: prMetrics.mergedPRsCount,
      averageTimeToMerge,
      averageCommentsPerPR,
    },
  };
}

function getOpenAndClosedIssues(issues: IssueNode[]) {
  return issues.reduce((acc: [IssueNode[], IssueNode[]], issue) => {
    if (issue.state === 'OPEN') {
      acc[0].push(issue);
    } else {
      acc[1].push(issue);
    }
    return acc;
  }, [[], []]);
}

function getOpenAndMergedPrs(pullRequests: PullRequestNode[]) {
  return pullRequests.reduce((acc: [PullRequestNode[], PullRequestNode[]], pr) => {
    if (pr.state === 'OPEN') {
      acc[0].push(pr);
    } else if (pr.state === 'MERGED') {
      acc[1].push(pr);
    }
    return acc;
  }, [[], []]);
}

function calculateAverageTime(totalTime: number, count: number) {
  return count === 0 ? 0 : totalTime / count;
}

function calculateAverageComments(totalComments: number, count: number) {
  return count === 0 ? 0 : totalComments / count;
}

interface IssueMetrics {
  openIssuesCount: number;
  closedIssuesCount: number;
  totalTimeToClose: number;
  totalCommentsPerIssue: number;
}

function initializeIssueMetrics(): IssueMetrics {
  return {
    openIssuesCount: 0,
    closedIssuesCount: 0,
    totalTimeToClose: 0,
    totalCommentsPerIssue: 0,
  };
}

interface PRMetrics {
  openPRsCount: number;
  mergedPRsCount: number;
  totalTimeToMerge: number;
  totalCommentsPerPR: number;
}

function initializePRMetrics(): PRMetrics {
  return {
    openPRsCount: 0,
    mergedPRsCount: 0,
    totalTimeToMerge: 0,
    totalCommentsPerPR: 0,
  };
}

function processIssues(issues: IssueNode[], metrics: IssueMetrics): IssueMetrics {
  const [open, closed] = getOpenAndClosedIssues(issues);
  metrics.openIssuesCount += open.length;
  metrics.closedIssuesCount += closed.length;

  for (const issue of closed) {
    const created = new Date(issue.createdAt);
    const closed = new Date(issue.closedAt);
    metrics.totalTimeToClose += closed.getTime() - created.getTime();
    metrics.totalCommentsPerIssue += issue.comments.totalCount;
  }

  return metrics;
}

function processPullRequests(pullRequests: PullRequestNode[], metrics: PRMetrics) {
  const [open, merged] = getOpenAndMergedPrs(pullRequests);
  metrics.openPRsCount += open.length;
  metrics.mergedPRsCount += merged.length;

  for (const pr of merged) {
    const created = new Date(pr.createdAt);
    const merged = new Date(pr.mergedAt);
    metrics.totalTimeToMerge += merged.getTime() - created.getTime();
    metrics.totalCommentsPerPR += pr.comments.totalCount;
  }

  return metrics;
}
