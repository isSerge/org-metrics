import { GithubOrg } from "./github";
import { RepositoryNode, IssueNode, PullRequestNode } from "./types";

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

function millisecondsToDays(milliseconds: number) {
  return milliseconds / 1000 / 60 / 60 / 24;
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
  collaborators: {
    locations: Map<string, number>;
    uniqueParticipants: Map<string, ContributionData>;
    uniqueParticipantCount: number;
  };
}

interface ContributionData {
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestComments: number;
  // issuesCreated: number;
  // issuesComments: number;
  // issuesClosed: number;
}

/**
 * Aggregate data from GitHub API
 * @param client - Octokit graphql client
 * @param org - Organization name
 * @param reposData - Repositories data
 * @param since - Date since which data is to be fetched
 * @returns - Aggregated data
 */
export async function aggregateData(githubOrgApi: GithubOrg, reposData: { activeRepos: RepositoryNode[]; totalRepos: number; }): Promise<AggregatedData> {
  let totalStars = 0;
  let totalForks = 0;
  let issueMetrics = initializeIssueMetrics();
  let prMetrics = initializePRMetrics();
  const uniqueParticipants = new Map<string, ContributionData>();
  const locations = new Map<string, number>();

  for (const repo of reposData.activeRepos) {
    totalStars += repo.stargazerCount;
    totalForks += repo.forkCount;

    const issues = await githubOrgApi.fetchRepoIssues(repo.name);
    const pullRequests = await githubOrgApi.fetchRepoPullRequests(repo.name);

    issueMetrics = processIssues(issues, issueMetrics);
    prMetrics = processPullRequests(pullRequests, prMetrics);

    for (const { participants, author, merged } of pullRequests) {
      for (const { login, location } of participants.nodes) {
        if (!uniqueParticipants.has(login)) {
          const participartLocation = location || 'Unknown';

          locations.set(participartLocation, (locations.get(participartLocation) || 0) + 1);
          uniqueParticipants.set(login, {
            pullRequestsOpened: 0,
            pullRequestsMerged: 0,
            pullRequestComments: 0,
            // issuesCreated: 0,
            // issuesComments: 0,
            // issuesClosed: 0,
          });
        }

        const contributionData = uniqueParticipants.get(login);

        if (contributionData) {
          if (author?.login === login) {
            contributionData.pullRequestsOpened++; // Increment if the participant is the author
            if (merged) {
              contributionData.pullRequestsMerged++; // Increment if the participant is the author and the PR is merged
            }
          } else {
            contributionData.pullRequestComments++; // Increment for non-authors who comment
          }
        }
      }
    }

    // for (const { participants, author, closed } of issues) {
    //   for (const { login, location } of participants.nodes) {
    //     if (!uniqueParticipants.has(login)) {
    //       locations.set(location, (locations.get(location) || 0) + 1);
    //       uniqueParticipants.set(login, {
    //         pullRequestsOpened: 0,
    //         pullRequestsMerged: 0,
    //         pullRequestComments: 0,
    //         issuesCreated: 0,
    //         issuesComments: 0,
    //         issuesClosed: 0,
    //       });
    //     }

    //     const contributionData = uniqueParticipants.get(login);

    //     if (contributionData) {
    //       if (author.login === login) {
    //         contributionData.issuesCreated++; // Increment only if the participant is the author
    //         if (closed) {
    //           contributionData.issuesClosed++;
    //         }
    //       } else {
    //         contributionData.issuesComments++; // Increment for non-authors who comment
    //       }
    //     }
    //   }
    // }
  }

  const averageTimeToClose = millisecondsToDays(calculateAverage(issueMetrics.totalTimeToClose, issueMetrics.closedIssuesCount));
  const averageTimeToMerge = millisecondsToDays(calculateAverage(prMetrics.totalTimeToMerge, prMetrics.mergedPRsCount));
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
    collaborators: {
      locations,
      uniqueParticipants,
      uniqueParticipantCount: uniqueParticipants.size,
    }
  };
}

/**
 * Process repo issues and update metrics
 * @param issues - Issues
 * @param metrics - Issue metrics
 * @returns - Updated metrics
 */
function processIssues(issues: IssueNode[], metrics: IssueMetrics): IssueMetrics {
  const [open, closed] = getOpenAndClosedIssues(issues);
  metrics.openIssuesCount += open.length;
  metrics.closedIssuesCount += closed.length;

  for (const issue of closed) {
    const created = new Date(issue.createdAt);

    if (issue.closedAt) {
      const closed = new Date(issue.closedAt);
      metrics.totalTimeToClose += closed.getTime() - created.getTime();
    }

    metrics.totalCommentsPerIssue += issue.comments.totalCount;
  }

  return metrics;
}

/**
 * Process repo pull requests and update metrics
 * @param pullRequests - Pull requests
 * @param metrics - Pull request metrics
 * @returns - Updated metrics
 */
function processPullRequests(pullRequests: PullRequestNode[], metrics: PRMetrics) {
  const [open, merged] = getOpenAndMergedPrs(pullRequests);
  metrics.openPRsCount += open.length;
  metrics.mergedPRsCount += merged.length;

  for (const pr of merged) {
    const created = new Date(pr.createdAt);

    if (pr.mergedAt) {
      const merged = new Date(pr.mergedAt);
      metrics.totalTimeToMerge += merged.getTime() - created.getTime();
    }

    metrics.totalCommentsPerPR += pr.comments.totalCount;
  }

  return metrics;
}
