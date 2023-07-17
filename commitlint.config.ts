import type {UserConfig} from '@commitlint/types';
import { RuleConfigSeverity } from "@commitlint/types";

const Configuration: UserConfig = {
  /*
   * Resolve and load @commitlint/format from node_modules.
   * Referenced package must be installed
   */
  formatter: '@commitlint/format',
  /*
   * Any rules defined here will override the default ones
   */
  rules: {
    'header-max-length': [RuleConfigSeverity.Error, 'always', 72],
    'body-max-line-length': [RuleConfigSeverity.Error, 'always', 72],
  },
  /*
   * Functions that return true if commitlint should ignore the given message.
   */
  ignores: [(commit) => commit === ''],
  /*
   * Whether commitlint uses the default ignore rules.
   */
  defaultIgnores: true,
  /*
   * Custom URL to show upon failure
   */
  helpUrl:
    'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
  /*
   * Custom prompt configs
   */
  prompt: {
    messages: {},
    questions: {},
  },
};

module.exports = Configuration;