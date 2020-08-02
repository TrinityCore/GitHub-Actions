import * as core from '@actions/core'
import * as github from '@actions/github'
import {Webhooks} from '@octokit/webhooks'

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
        await this.ProcessCommit(commit, payload.repository.issues_url);
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
        const element = matches[2]
        core.debug(`Closing issue '${element}'`)
        matches = regex.exec(message)
        await this.CloseIssue(element, issues_url)
    }

    core.debug('ProcessCommit end')
  }

  private async CloseIssue(
    issueId: string,
    issues_url: string
  ) : Promise<void> {
    core.debug('CloseIssue start')
    this.octokit.request(
        `PATCH ${issues_url.replace('{/number}', '/')}${issueId}`,
        {
            state: 'closed'
        }
    )
    core.debug('CloseIssue end')
  }
}
