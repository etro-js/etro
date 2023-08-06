const { parser } = require('keep-a-changelog')
const fs = require('fs')
const semver = require('semver')

module.exports = {
  updateChangelog: false,
  formatCommitMessage: ({ version }) => `Release v${version}`,
  formatPullRequestTitle: ({ version }) => `Release v${version}`,
  getNextVersion: ({ currentVersion, dir }) => {
    const changelog = new Changelog(`${dir}/CHANGELOG.md`)
    return changelog.nextVersion(currentVersion)
  },
  versionUpdated: async ({ version, _releaseType, dir, _exec }) => {
    const parsedVersion = semver.parse(version)
    if (parsedVersion.prerelease.length)
      return

    // Release 'Unreleased' section in changelog
    const changelogFile = `${dir}/CHANGELOG.md`
    const oldChangelog = fs.readFileSync(changelogFile, 'utf8')
    const parsed = parser(oldChangelog)
    const release = parsed.findRelease() // get 'Unreleased' section
    release.setVersion(version) // release
    release.setDate(new Date()) // today
    const newChangelog = parsed.toString()
    fs.writeFileSync(changelogFile, newChangelog, 'utf8')
  },
  releases: [
    {
      extractChangelog: ({ version, dir }) => {
        const changelogFile = `${dir}/CHANGELOG.md`
        const changelog = fs.readFileSync(changelogFile, 'utf8')
        const parsed = parser(changelog)
        const release = parsed.findRelease(version)
        return `${release.toString()}\n${release.getCompareLink()}`
      },
    }
  ]
}

class Changelog {
  constructor (path) {
    const data = fs.readFileSync(path, 'utf8')
    const lines = data.split(/\r?\n/)
    const headings = []
    let unreleased = false

    this.releaseTag = 'latest'
    lines.every((line) => {
      if (line.startsWith('## [Unreleased]')) {
        unreleased = true
        const tagMatch = line.match(/## \[Unreleased\]\[(.*)\]/)
        if (tagMatch)
          this.releaseTag = tagMatch[1].trim()
      } else if (line.startsWith('## ')) {
        return false
      }

      if (unreleased)
        if (line.startsWith('### ')) {
          headings.push(line.match(/### (.*)/)[1].trim())
        }

      return true
    })

    if (headings.includes('Changed'))
      this.releaseType = 'major'
    else if (headings.includes('Added'))
      this.releaseType = 'minor'
    else
      this.releaseType = 'patch'
  }

  nextVersion (version) {
    const parsedVersion = semver.parse(version)

    if (this.releaseTag !== 'latest')
      if (parsedVersion.prerelease.length) {
        parsedVersion.inc('prerelease', this.releaseTag)
      } else {
        parsedVersion.inc(this.releaseType)
        parsedVersion.prerelease = [this.releaseTag, 0]
        parsedVersion.format()
      }
    else
      parsedVersion.inc(this.releaseType)

    return parsedVersion.version
  }
}
