import * as core from '@actions/core'
import * as github from '@actions/github'
import {Webhooks} from '@octokit/webhooks'

export class PullRequestLabeler {
  private octokit: github.GitHub
  constructor(token: string) {
    this.octokit = new github.GitHub(token)
  }

  async LabelPullRequests(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'schedule')
      throw new Error(`Event '${context.eventName}' is not supported`)

    const searchResult = this.octokit.search.issuesAndPullRequests({
      q: `repo:${context.repo.owner}/${context.repo.repo} type:pr state:open -label:Branch-master -label:Branch-3.3.5a`
    })

    const prs = (await searchResult).data.items
    core.info(`Found ${prs.length} pull requests`)

    for (const prSearchResult of prs) {
      const prItem = (
        await this.octokit.request(`GET ${prSearchResult.pull_request['url']}`)
      ).data as Webhooks.WebhookPayloadPullRequestPullRequest
      core.info(`Processing pull request ${prItem.html_url}`)
      await this.SetBranchLabel(prItem)
    }
  }

  private async SetBranchLabel(
    pr: Webhooks.WebhookPayloadPullRequestPullRequest
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
      default:
        core.debug(`Unhandled branch '${pr.base.ref}'`)
        break
    }

    core.debug('SetBranchLabel end')
  }

  private async SetLabel(
    pr: Webhooks.WebhookPayloadPullRequestPullRequest,
    label: string
  ): Promise<void> {
    await this.octokit.request(`POST ${pr.issue_url}/labels`, {
      labels: [label]
    })
  }
}
