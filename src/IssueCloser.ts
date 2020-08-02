import * as core from '@actions/core'
import * as github from '@actions/github'
import {Webhooks} from '@octokit/webhooks'
import {Octokit} from '@octokit/rest'

export class IssueCloser {
  private octokit: github.GitHub
  constructor(token: string) {
    this.octokit = new github.GitHub(token)
  }

  async CloseCurrentContextIssues(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'push')
        throw new Error(`Event '${context.eventName}' is not supported`)

    const rawPayload = github.context.payload
    core.debug(`rawPayload: ${JSON.stringify(rawPayload)}`)

    const payload = rawPayload as Webhooks.WebhookPayloadPush

    // disabled for forks
    if (payload.repository.fork) {
        return
    }

    for (const commit of payload.commits) {
        try
        {
            await this.ProcessCommit(commit, payload.repository.issues_url);
        }
        catch(error)
        {
            core.error(error);
        }
    }
  }

  private async ProcessCommit(
      commit: any,
      issues_url: string
  ): Promise<void> {
    core.debug('ProcessCommit start')
    
    const regex = new RegExp('[,]*\\b(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ :]*#([0-9]+)', 'gi')
    const message = commit.message;
    let matches = regex.exec(message)

    while (matches !== null) {
        const issueId = matches[2]
        core.debug(`Found issue '${issueId}'`)
        matches = regex.exec(message)

        const issue = await this.GetIssue(issueId, issues_url)
        if (issue && issue.state == 'open')
        {
            await this.AddComment(issue.comments_url, commit.id)
            await this.CloseIssue(issueId, issues_url)
        }
    }

    core.debug('ProcessCommit end')
  }

  private async GetIssue(
    issueId: string,
    issues_url: string
  ) : Promise<Octokit.IssuesGetResponse | null> {
    core.debug('GetIssue start')
    try
    {
        const response = await this.octokit.request(
            `GET ${issues_url}`,
            {
                number: issueId,
                state: 'closed'
            }
        ) as Octokit.Response<Octokit.IssuesGetResponse>

        return response.data;
    }
    catch(error)
    {
        return null
    }
    finally
    {
        core.debug('GetIssue end')
    }
  }

  private async AddComment(
    comments_url : string,
    comment: string
  ): Promise<void> {
    core.debug('AddComment start')

    await this.octokit.request(
        `POST ${comments_url}`,
        {
            body: comment
        }
    )

    core.debug('AddComment end')
  }

  private async CloseIssue(
    issueId: string,
    issues_url: string
  ) : Promise<void> {
    core.debug('CloseIssue start')
    this.octokit.request(
        `PATCH ${issues_url}`,
        {
            number: issueId,
            state: 'closed'
        }
    )
    core.debug('CloseIssue end')
  }
}
