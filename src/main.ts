import * as core from '@actions/core'
import { IssueCloser } from './IssueCloser';

async function run(): Promise<void> {
  try {
    core.debug('Started')

    const token = core.getInput('token', {required: true})
    const closer = new IssueCloser(token);
    await closer.CloseCurrentContextIssues();

    core.debug('Finished')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
