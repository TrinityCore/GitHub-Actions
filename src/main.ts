import * as core from '@actions/core'
import {PullRequestLabeler} from './PullRequestLabeler'

async function run(): Promise<void> {
  try {
    core.debug('Started')

    const token = core.getInput('token', {required: true})
    const labeler = new PullRequestLabeler(token)
    await labeler.LabelPullRequests()

    core.debug('Finished')
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    core.setFailed(error.message)
  }
}

void run()
