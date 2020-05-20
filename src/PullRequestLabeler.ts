import * as core from '@actions/core'
import * as github from '@actions/github'
import {Webhooks} from '@octokit/webhooks'

export class PullRequestLabeler {
  private octokit: github.GitHub
  constructor(token: string) {
    this.octokit = new github.GitHub(token)
  }

  async LabelCurrentContextPullRequest(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'pull_request')
      throw new Error(`Event '${context.eventName}' is not supported`)

    const rawPayload = github.context.payload
    core.debug(`rawPayload: ${JSON.stringify(rawPayload)}`)

    const payload = rawPayload as Webhooks.WebhookPayloadIssues
    switch (payload.action) {
      case 'opened':
        await this.SetBranchLabel(payload.issue)
        break
      default:
        throw new Error(`Unhandled issue action ${payload.action}`)
    }
  }

  private async SetBranchLabel(
    issue: Webhooks.WebhookPayloadIssuesIssue
  ): Promise<void> {
    core.debug('SetBranchLabel start')

    const body = issue.body
  }

  private async SetLabel(
    issue: Webhooks.WebhookPayloadIssuesIssue,
    label: string
  ): Promise<void> {
    throw new Error('Not implemented')
  }
}
