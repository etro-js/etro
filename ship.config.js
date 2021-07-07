const { updateChangelog } = require('@metamask/auto-changelog')
const { exec } = require('child_process')
const fs = require('fs')
const semver = require('semver')
const packageJson = require('./package.json')

module.exports = {
  updateChangelog: false,
  formatCommitMessage: ({ version }) => `:bookmark: Release v${version}`,
  formatPullRequestTitle: ({ version }) => `Release v${version}`,
  getNextVersion: ({ currentVersion, dir }) => {
    const changelog = new Changelog(`${dir}/CHANGELOG.md`)
    return changelog.nextVersion(currentVersion)
  },
  versionUpdated: async ({ version, _releaseType, dir, _exec }) => {
    const parsedVersion = semver.parse(version)
    if (parsedVersion.prerelease.length) { return }

    // Update changelog
    const changelogFile = `${dir}/CHANGELOG.md`
    const changelog = fs.readFileSync(changelogFile, 'utf8')
    const updatedChangelog = await updateChangelog({
      changelogContent: changelog,
      currentVersion: version,
      repoUrl: packageJson.repository.url,
      isReleaseCandidate: false
    })
    fs.writeFileSync(changelogFile, updatedChangelog, 'utf8')

    // Amend commit with new changelog
    exec('git commit --amend --no-edit CHANGELOG.md')
  }
}

class Changelog {
  releaseType = "patch"
  releaseTag = "latest"

  constructor(path) {
    const data = fs.readFileSync(path, 'utf8')
    const lines = data.split(/\r?\n/)
    const headings = []
    let unreleased = false
    lines.every((line) => {
      if (line.startsWith("## [Unreleased]")) {
        unreleased = true
        const tagMatch = line.match(/## \[Unreleased\]\[(.*)\]/)
        if (tagMatch) {
          this.releaseTag = tagMatch[1].trim()
        }
      } else if (line.startsWith("## ")) {
        return false
      }

      if (unreleased) {
        if (line.startsWith("### ")) {
          headings.push(line.match(/### (.*)/)[1].trim())
        }
      }

      return true
    })

    if (headings.includes("Changed")) {
      this.releaseType = "major"
    } else if (headings.includes("Added")) {
      this.releaseType = "minor"
    } else if (headings.includes("Fixed")) {
      this.releaseType = "patch"
    }
  }

  nextVersion(version) {
    const parsedVersion = semver.parse(version)

    if (this.releaseTag !== "latest") {
      if (parsedVersion.prerelease.length) {
        parsedVersion.inc("prerelease", this.releaseTag)
      } else {
        parsedVersion.inc(this.releaseType)
        parsedVersion.prerelease = [ this.releaseTag, 0 ]
        parsedVersion.format()
      }
    } else {
      parsedVersion.inc(this.releaseType)
    }

    return parsedVersion.version
  }
}