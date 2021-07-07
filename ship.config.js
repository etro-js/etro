const { exec } = require('child_process')
const fs = require('fs')
const semver = require('semver')

module.exports = {
  updateChangelog: false,
  formatCommitMessage: ({ version }) => `:bookmark: Release v${version}`,
  formatPullRequestTitle: ({ version }) => `Release v${version}`,
  getNextVersion: ({ currentVersion, dir }) => {
    const changelog = new Changelog(`${dir}/CHANGELOG.md`)
    return changelog.nextVersion(currentVersion)
  },
  versionUpdated: ({ version, _releaseType, dir, _exec }) => {
    const parsedVersion = semver.parse(version)
    if (parsedVersion.prerelease.length) { return }

    const changelogFile = `${dir}/CHANGELOG.md`
    fs.readFile(changelogFile, 'utf8', function (err, data) {
      if (err) {
        throw(err)
      }
      const match = data.match(/## \[Unreleased\](?:\[(.*)\])?/)
      if (!match) { throw(new Error('Release heading not found in CHANGELOG.md')) }
      const result = data.replace(match[0], `## [${version}] - ${getDateString()}`)
      fs.writeFile(changelogFile, result, 'utf8', function (err) {
        if (err) { throw(err) }
      })
    })

    exec('git commit --amend CHANGELOG.md')

    function getDateString() {
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, '0')
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const yyyy = today.getFullYear()
      return `${yyyy}-${mm}-${dd}`
    }
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