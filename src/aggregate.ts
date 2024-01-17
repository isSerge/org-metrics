import { graphql } from '@octokit/graphql';
import { fetchRepoIssues, fetchRepoPullRequests } from "./github";
import { RepositoryNode, IssueNode, PullRequestNode } from "./types";

interface AggregatedData {
  totalStars: number;
  totalForks: number;
  repoCount: number;
  recentUpdatedRepos: RepositoryNode[];
  issues: {
    open: number;
    closed: number;
    averageTimeToClose: number;
    averageCommentsPerIssue: number;
  };
  pullRequests: {
    open: number;
    merged: number;
    averageTimeToMerge: number;
    averageCommentsPerPR: number;
  };
}

export async function aggregateData(client: typeof graphql, org: string, reposData: { activeRepos: RepositoryNode[]; totalRepos: number; }, since: Date): Promise<AggregatedData> {
  let totalStars = 0;
  let totalForks = 0;
  let issueMetrics = initializeIssueMetrics();
  let prMetrics = initializePRMetrics();

  for (const repo of reposData.activeRepos) {
    totalStars += repo.stargazerCount;
    totalForks += repo.forkCount;

    const issues = await fetchRepoIssues(client, org, repo.name, since);
    const pullRequests = await fetchRepoPullRequests(client, org, repo.name, since);

    issueMetrics = processIssues(issues, issueMetrics);
    prMetrics = processPullRequests(pullRequests, prMetrics);
  }

  const averageTimeToClose = calculateAverage(issueMetrics.totalTimeToClose, issueMetrics.closedIssuesCount);
  const averageTimeToMerge = calculateAverage(prMetrics.totalTimeToMerge, prMetrics.mergedPRsCount);
  const averageCommentsPerIssue = calculateAverage(issueMetrics.totalCommentsPerIssue, issueMetrics.closedIssuesCount);
  const averageCommentsPerPR = calculateAverage(prMetrics.totalCommentsPerPR, prMetrics.mergedPRsCount);

  return {
    totalStars,
    totalForks,
    repoCount: reposData.totalRepos,
    recentUpdatedRepos: reposData.activeRepos,
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

function calculateAverage(metric: number, count: number) {
  return count === 0 ? 0 : metric / count;
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
