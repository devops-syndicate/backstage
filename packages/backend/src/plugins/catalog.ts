import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { GithubDiscoveryProcessor, GitHubOrgEntityProvider } from '@backstage/plugin-catalog-backend-module-github';
import { ScmIntegrations, DefaultGithubCredentialsProvider } from '@backstage/integration';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  const integrations = ScmIntegrations.fromConfig(env.config);
  const githubCredentialsProvider = DefaultGithubCredentialsProvider.fromIntegrations(integrations);
  builder.addProcessor(
    GithubDiscoveryProcessor.fromConfig(env.config, {
      logger: env.logger,
      githubCredentialsProvider,
    })
  );
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  builder.addEntityProvider(
    GitHubOrgEntityProvider.fromConfig(env.config, {
      id: 'development',
      orgUrl: `https://github.com/${env.config.getString('organization.githubOrg')}`,
      logger: env.logger,
      schedule: env.scheduler.createScheduledTaskRunner({
        frequency: { minutes: 60 },
        timeout: { minutes: 15 },
      }),
    }),
  );
  const { processingEngine, router } = await builder.build();
  await processingEngine.start();
  return router;
}
