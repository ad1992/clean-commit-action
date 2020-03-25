const { getInput, setFailed, debug, error } = require('@actions/core');
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
  const { data: commits } = await client.pulls.listCommits({ owner: context.repo.owner, repo: context.repo.repo, pull_number: context.issue.number})
  debug(`There are ${commits.length} commits in this pr`);

  let badCommits = 0;
  let isCommitBad = false;
  for (const commit of commits) {
    const { message } = commit.commit;

    if (message.length < MIN_COMMIT_MESSAGE_LENGTH) {
      error(`commit message \"${message}\" has less than ${MIN_COMMIT_MESSAGE_LENGTH} characters`);
      isCommitBad = true;
    }

    if (message[0] !== message[0].toUpperCase()) {
      error(`commit message \"${message}\" should have first letter in upper case`);
      isCommitBad = true;
    }

    const badKeywords = filterCommit(message);
    if (badKeywords.length) {
      error(`commit message \"${message}\" contains ${badKeywords.join()}`);
      isCommitBad = true;
    }

    if(isCommitBad) {
      badCommits++;
      isCommitBad = false;
    }
  }
  if (badCommits) {
    throw Error(`${badCommits} have been encountered. Please fix the above errors`);
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
