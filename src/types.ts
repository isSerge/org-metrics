export interface RepositoryNode {
    name: string;
    description: string;
    url: string;
    stargazerCount: number;
    forkCount: number;
    pushedAt: string;
}

export interface IssueNode {
    title: string;
    url: string;
    comments: {
        totalCount: number;
    };
    createdAt: string;
    labels: {
        totalCount: number;
    };
    number: number;
    state: string;
    closedAt: string;
    updatedAt: string;
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
