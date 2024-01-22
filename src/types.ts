import { z } from 'zod';

const pageInfoSchema = z.object({
    endCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
});

const repositoryNodeSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
    url: z.string(),
    stargazerCount: z.number(),
    forkCount: z.number(),
    pushedAt: z.string(),
});

const repositoriesSchema = z.object({
    edges: z.array(z.object({
        node: repositoryNodeSchema,
        cursor: z.string(),
    })),
    pageInfo: pageInfoSchema,
});

const labelSchema = z.object({
    totalCount: z.number(),
});

const commentSchema = z.object({
    totalCount: z.number(),
});

const issueNodeSchema = z.object({
    title: z.string(),
    url: z.string(),
    comments: commentSchema,
    createdAt: z.string(),
    labels: labelSchema,
    number: z.number(),
    state: z.string(),
    closedAt: z.string().nullable(),
    updatedAt: z.string(),
});

const issuesSchema = z.object({
    totalCount: z.number(),
    nodes: z.array(issueNodeSchema),
    pageInfo: pageInfoSchema,
});

const authorSchema = z.object({
    login: z.string(),
}).nullable();

const participantSchema = z.object({
    login: z.string(),
    location: z.string().nullable(),
});

const pullRequestNodeSchema = z.object({
    title: z.string(),
    url: z.string(),
    comments: z.object({ totalCount: z.number() }),
    createdAt: z.string(),
    mergedAt: z.string().nullable(),
    number: z.number(),
    state: z.string(),
    closedAt: z.string().nullable(),
    updatedAt: z.string(),
    participants: z.object({ nodes: z.array(participantSchema) }),
    author: authorSchema,
    merged: z.boolean(),
});

const pullRequestsSchema = z.object({
    totalCount: z.number(),
    nodes: z.array(pullRequestNodeSchema),
    pageInfo: pageInfoSchema,
});

export const organizationSchema = z.object({
    organization: z.object({
        repositories: repositoriesSchema,
    }),
});

export const dateSchema = z.date();
export const stringSchema = z.string();

export const repositoryPullRequestsSchema = z.object({
    repository: z.object({
        pullRequests: pullRequestsSchema,
    }),
});

export const repositoryIssuesSchema = z.object({
    repository: z.object({
        issues: issuesSchema,
    }),
});

export type RepositoryNode = z.infer<typeof repositoryNodeSchema>;
export type IssueNode = z.infer<typeof issueNodeSchema>;
export type PullRequestNode = z.infer<typeof pullRequestNodeSchema>;
