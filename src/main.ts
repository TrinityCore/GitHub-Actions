import * as core from '@actions/core'
import {PullRequestLabeler} from './PullRequestLabeler'

async function run(): Promise<void> {
  try {
    core.debug('Started')

    const token = core.getInput('token', {required: true})
    const labeler = new PullRequestLabeler(token)
    await labeler.LabelCurrentContextPullRequest()

    core.debug('Finished')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
