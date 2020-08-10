const { Toolkit } = require('actions-toolkit')
const bump = require('json-bump')

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
  process.env.GITHUB_WORKSPACE = `${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`
  process.chdir(process.env.GITHUB_WORKSPACE)
}

// Run your GitHub Action!
Toolkit.run(async (tools) => {
  const fileName = process.env.VERSION_FILE_NAME || 'package.json'

  const commitMessage = 'version bump to v'

  try {
    // SET USER
    await tools.runInWorkspace('git', [
      'config',
      'user.name',
      `"${process.env.GITHUB_USER || 'Automated Version Bump'}"`,
    ])
    await tools.runInWorkspace('git', [
      'config',
      'user.email',
      `"${
        process.env.GITHUB_EMAIL ||
        'gh-action-bump-version@users.noreply.github.com'
      }"`,
    ])

    const currentBranch = /refs\/[a-zA-Z]+\/(.*)/.exec(
      process.env.GITHUB_REF,
    )[1]

    await tools.runInWorkspace('git', ['checkout', currentBranch])

    // BUMPING STARTS
    await bump(fileName)

    if (fileName === 'package.json') {
      try {
        await bump('package-lock.json')
        await bump('yarn.lock')
      } catch (error) {
        console.log(error)
      }
    }

    const newVersion = JSON.parse(tools.getFile(fileName)).version

    await tools.runInWorkspace('git', [
      'commit',
      '-a',
      '-m',
      `ci: ${commitMessage} ${newVersion}`,
    ])

    // PUSH THE CHANGES
    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
    await tools.runInWorkspace('git', ['tag', newVersion])
    await tools.runInWorkspace('git', ['push', remoteRepo, '--follow-tags'])
    await tools.runInWorkspace('git', ['push', remoteRepo, '--tags'])
  } catch (e) {
    tools.log.fatal(e)
    tools.exit.failure('Failed to bump version')
  }
  tools.exit.success('Version bumped!')
})
