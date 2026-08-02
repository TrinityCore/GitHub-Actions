import {Octokit} from '@octokit/core'
import {OctokitOptions} from '@octokit/core/types'

export type GitHubApiVersions =
    '2022-11-28' |
    '2026-03-10';

const DEFAULT_VERSION: GitHubApiVersions = '2026-03-10';

export function apiVersionPlugin(octokit: Octokit,
    options?: OctokitOptions & {apiVersion?: '2022-11-28' | '2026-03-10'}): void {
    octokit.request = octokit.request.defaults({
        headers: {
            'X-GitHub-Api-Version': options?.apiVersion ?? DEFAULT_VERSION
        }
    })
}
