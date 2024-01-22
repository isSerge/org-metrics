import { graphql } from '@octokit/graphql';
import { config } from 'dotenv';

import { GithubOrg } from "./github"
import { aggregateData } from "./aggregate";
import { handleException } from './error';
import { logger } from './logger';

config();

const githubToken = process.env.GITHUB_TOKEN;

const graphqlClient = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

const githubOrg = process.env.GITHUB_ORG_NAME as string;

export async function main() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  try {
    const githubOrgApi = new GithubOrg({
      client: graphqlClient,
      org: githubOrg,
      since: oneWeekAgo,
      logger,
    });

    const data = await githubOrgApi.fetchOrganizationRepos();

    if (!data) {
      throw new Error(`No data returned from fetchOrganizationRepos`);
    }

    const aggregated = await aggregateData(githubOrgApi, data);

    console.dir(aggregated.collaborators.uniqueParticipants, { depth: null });
  } catch (error) {
    handleException(logger, error, 'main');
  }
}

main();

