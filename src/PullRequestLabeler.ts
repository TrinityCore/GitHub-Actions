import * as core from '@actions/core'
import * as github from '@actions/github'
import {WebhookEventDefinition} from '@octokit/webhooks/types'
import {GitHub} from '@actions/github/lib/utils'
import {apiVersionPlugin} from './versionedOctokit'

type WebhookPayloadPullRequest = WebhookEventDefinition<'pull-request-opened'>
type WebhookPayloadPullRequestPullRequest = WebhookPayloadPullRequest['pull_request']

export class PullRequestLabeler {
  private octokit: InstanceType<typeof GitHub>
  constructor(token: string) {
    this.octokit = github.getOctokit(token, undefined, apiVersionPlugin)
  }

  async LabelPullRequests(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'pull_request_target')
      throw new Error(`Event '${context.eventName}' is not supported`)

    const payload = context.payload as WebhookPayloadPullRequest
    core.debug(`rawPayload: ${JSON.stringify(payload)}`)


    // disabled for forks
    if (payload.repository.fork) {
      return
    }

    switch (payload.action) {
      case 'opened':
        await this.SetBranchLabel(payload.pull_request)
        break
      default:
        throw new Error(`Unhandled pr action ${payload.action}`)
    }
  }

  private async SetBranchLabel(
    pr: WebhookPayloadPullRequestPullRequest
  ): Promise<void> {
    core.debug('SetBranchLabel start')

    core.info(`Base is '${pr.base.ref}'`)

    switch (pr.base.ref) {
      case '3.3.5':
        await this.SetLabel(pr, 'Branch-3.3.5a')
        break
      case 'master':
        await this.SetLabel(pr, 'Branch-master')
        break
        case 'cata_classic':
        await this.SetLabel(pr, 'Branch-cata_classic')
        break
      default:
        core.debug(`Unhandled branch '${pr.base.ref}'`)
        break
    }

    core.debug('SetBranchLabel end')
  }

  private async SetLabel(
    pr: WebhookPayloadPullRequestPullRequest,
    label: string
  ): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pr.number,
      labels: [label]
    })
  }
}
