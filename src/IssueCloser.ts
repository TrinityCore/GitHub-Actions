import * as core from '@actions/core'
import * as github from '@actions/github'
import {WebhookEventDefinition} from '@octokit/webhooks/types'
import {GitHub} from '@actions/github/lib/utils';
import {apiVersionPlugin} from './versionedOctokit'

export class IssueCloser {
  private octokit: InstanceType<typeof GitHub>;
  constructor(token: string) {
    this.octokit = github.getOctokit(token, undefined, apiVersionPlugin)
  }

  async CloseCurrentContextIssues(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'push') {
        throw new Error(`Event '${context.eventName}' is not supported`)
    }

    const payload = github.context.payload as WebhookEventDefinition<'push'>;
    core.debug(`rawPayload: ${JSON.stringify(payload)}`);

    // disabled for forks
    if (payload.repository.fork) {
        return
    }

    for (const commit of payload.commits) {
        try
        {
            await this.ProcessCommit(commit);
        }
        catch (error: any) // eslint-disable-line @typescript-eslint/no-explicit-any
        {
            core.error(error);
        }
    }
  }

  private async ProcessCommit(
      commit: WebhookEventDefinition<'push'>['commits'][number]
  ): Promise<void> {
    core.debug('ProcessCommit start')

    const regex = new RegExp('[,]*\\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ :]*#([0-9]+)', 'gi')
    const message = commit.message;
    let matches = regex.exec(message)

    while (matches !== null) {
        const issueId = +matches[2]
        core.debug(`Found issue '${issueId}'`)
        matches = regex.exec(message)

        const issue = await this.GetIssue(issueId)
        if (issue && issue.state === 'open')
        {
            await this.AddComment(issueId, commit.id)
            await this.CloseIssue(issueId)
        }
    }

    core.debug('ProcessCommit end')
  }

  private async GetIssue(
    issueId: number
  ) {
    core.debug('GetIssue start')
    try
    {
        const response = await this.octokit.rest.issues.get({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: issueId
        })

        return response.data;
    }
    catch(error) // eslint-disable-line @typescript-eslint/no-unused-vars
    {
        return null
    }
    finally
    {
        core.debug('GetIssue end')
    }
  }

  private async AddComment(
    issueId: number,
    comment: string
  ): Promise<void> {
    core.debug('AddComment start')

    await this.octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issueId,
        body: comment
    })

    core.debug('AddComment end')
  }

  private async CloseIssue(
    issueId: number
  ) : Promise<void> {
    core.debug('CloseIssue start')
    await this.octokit.rest.issues.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issueId,
        state: 'closed'
    })
    core.debug('CloseIssue end')
  }
}
