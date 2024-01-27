import pino from 'pino';

export const since = new Date();

since.setDate(since.getDate() - 7);

export const silentLogger = pino({
  level: 'silent',
});

export const openIssueMock = {
  state: 'OPEN',
  createdAt: since.toISOString(),
  closedAt: null,
  comments: { totalCount: 3 },
  number: 1,
  title: 'Issue1',
  url: 'random url',
  updatedAt: since.toISOString(),
  labels: {
    totalCount: 1,
    nodes: [
      {
        name: 'bug',
      },
    ],
  },
};

export const closedIssueMock = {
  ...openIssueMock,
  state: 'CLOSED',
  createdAt: since.toISOString(),
  closedAt: new Date(
    new Date(since).setDate(since.getDate() + 1)
  ).toISOString(),
  comments: { totalCount: 2 },
};

export const openPrMock = {
  title: 'PR1',
  url: 'random url',
  comments: { totalCount: 1 },
  createdAt: since.toISOString(),
  mergedAt: null,
  number: 1,
  state: 'OPEN',
  closedAt: null,
  updatedAt: since.toISOString(),
  merged: false,
  participants: {
    nodes: [
      {
        login: 'testUser',
        location: 'testLocation',
      },
      {
        login: 'testUser2',
        location: 'testLocation2',
      },
    ],
  },
  author: {
    login: 'testUser',
  },
  files: {
    nodes: [
      {
        additions: 1,
        deletions: 1,
      },
    ],
  },
};

export const mergedPrMock = {
  ...openPrMock,
  merged: true,
  mergedAt: '2021-02-01T00:00:00Z',
  state: 'MERGED',
  title: 'PR2',
  comments: { totalCount: 2 },
};
