import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    core.debug('Started')

    core.debug('Finished')
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    core.setFailed(error.message)
  }
}

void run()
