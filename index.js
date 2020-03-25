const { getInput, setFailed, debug } = require('@actions/core');
const { GitHub, context } = require('@actions/github');

const { BAD_KEYWORDS, MIN_COMMIT_MESSAGE_LENGTH } = require('./constants');

function filterCommit(commit) {
  commit = commit.toLowerCase();
  const result = [];
  for(keyword of BAD_KEYWORDS) {
    if (commit.indexOf(keyword) != -1) {
      result.push(keyword);
    }
  }

  return result;
}

async function verifyCommits(repoToken) {
  const client = new GitHub(repoToken);
  debug(`context is ${JSON.stringify(context.issue, null, 2)}`);
  const res = client.pulls.listCommits({ owner: context.repo.owner, repo: context.repo.repo, pull_number: context.issue.number});
  debug(res);
  const { data: commits } = client.pulls.listCommits({ owner: context.repo.owner, repo: context.repo.repo, pull_number: context.issue.number})
  debug(`There are ${commits.length} commits in this pr`);

  let errors = [];
  for (const commit of commits) {
    const { message } = commit.commit;
    debug(message);

    if (message.length < MIN_COMMIT_MESSAGE_LENGTH) {
      errors.push(`${message} has less than ${MIN_COMMIT_MESSAGE_LENGTH} characters`);
    }

    if (message[0] !== message[0].toUpperCase()) {
      errors.push(`${message} should have first letter in upper case`);
    }

    const badKeywords = filterCommit(message);
    if (badKeywords.length) {
      errors.push(`${message} contains ${badKeywords.join()}`);
    }
  }
  if (errors.length) {
    throw Error(errors);
  }
}
async function main() {
  try {
    const repoToken = getInput('repo-token', { required: true });
    await verifyCommits(repoToken);
    debug('Recieved repo token');
  } catch (e) {
    setFailed(`Action failed with error ${e.message}`);
  }
}

main();
