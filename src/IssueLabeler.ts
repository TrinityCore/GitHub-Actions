import * as core from '@actions/core'
import * as github from '@actions/github'
import {WebhookEventDefinition} from '@octokit/webhooks/types'
import {GitHub} from '@actions/github/lib/utils'
import {apiVersionPlugin} from './versionedOctokit'

type WebhookPayloadIssues = WebhookEventDefinition<'issues-opened'>;
type WebhookPayloadIssuesIssue = WebhookPayloadIssues['issue']

export class IssueLabeler {
  private octokit: InstanceType<typeof GitHub>
  constructor(token: string) {
    this.octokit = github.getOctokit(token, undefined, apiVersionPlugin)
  }

  async LabelCurrentContextIssue(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'issues')
      throw new Error(`Event '${context.eventName}' is not supported`)

    const payload = github.context.payload as WebhookEventDefinition<'issues-opened'>;
    core.debug(`rawPayload: ${JSON.stringify(payload)}`)

    // disabled for forks
    if (payload.repository.fork) {
      return
    }

    switch (payload.action) {
      case 'opened':
        await this.SetBranchLabel(payload.issue)
        await this.SetMissingHashLabel(payload.issue)
        break
      default:
        throw new Error(`Unhandled issue action ${payload.action}`)
    }
  }

  private async SetBranchLabel(
    issue: WebhookPayloadIssuesIssue
  ): Promise<void> {
    core.debug('SetBranchLabel start')

    const regexCodeBlock = new RegExp('`{3}.*?`{3}', 'igs')
    const body = issue.body?.replace(regexCodeBlock, '') ?? ''
    core.debug(`Body: ${body}`)

    if (!body.includes('CHANGEME 3.3.5, master, cata_classic or all')) {
      const regex335 = new RegExp(String.raw`\b3[\.]?3[\.]?5[a]?\b`, 'i')
      const regexMaster = new RegExp('\\bmaster\\b', 'i')
      const regexCata = new RegExp('\\bcata_classic\\b', 'i')

      const has335 = regex335.test(body)
      const hasMaster = regexMaster.test(body)
      const hasCata = regexCata.test(body)
      if (has335 && !hasMaster && !hasCata) {
        core.info('3.3.5 found')
        await this.SetLabel(issue, 'Branch-3.3.5a')
      } else if (!has335 && hasMaster && !hasCata) {
        core.info('master found')
        await this.SetLabel(issue, 'Branch-master')
      } else if (!has335 && !hasMaster && hasCata) {
        core.info('cata_classic found')
        await this.SetLabel(issue, 'Branch-cata_classic')
      } else {
        core.info('branch not set')
      }
    } else {
      core.info('CHANGEME still in the issue')
    }

    core.debug('SetBranchLabel end')
  }

  private async SetMissingHashLabel(
    issue: WebhookPayloadIssuesIssue
  ): Promise<void> {
    core.debug('SetMissingHashLabel start')

    const body = issue.body
    let found = false

    if (body) {
      const regex = new RegExp('\\b[a-f0-9]{7,40}\\b', 'gi')
      let matches = regex.exec(body)

      while (matches != null) {
        const element = matches[0]
        core.debug(`Checking '${element}' as valid commit SHA`)
        matches = regex.exec(body)

        try {
          await this.octokit.rest.repos.getCommit({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            ref: element,
            mediaType: {
              format: 'sha'
            }
          })

          core.debug(`Found valid commit SHA '${element}'`)
          found = true
          break
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          core.debug(`'${element}' is not a valid SHA commit`)
          core.debug(error)
        }
      }
    }

    if (!found)
      await this.SetLabel(issue, 'Invalid-IncompleteData/OrNotTrinityCore')

    core.debug('SetMissingHashLabel end')
  }

  private async SetLabel(
    issue: WebhookPayloadIssuesIssue,
    label: string
  ): Promise<void> {
    await this.octokit.rest.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issue.number,
      labels: [label]
    })
  }
}
