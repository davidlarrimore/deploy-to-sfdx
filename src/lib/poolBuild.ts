import * as util from 'util';
import * as fs from 'fs-extra';
import * as logger from 'heroku-logger';
import * as path from 'path';
import * as stripcolor from 'strip-color';

import * as utilities from './utilities';
import * as poolParse from './poolParse';
import { auth } from './hubAuth';
import { getPoolRequest, putPooledOrg } from './redisNormal';
import { build } from './commonBuild';

import { lineParserResult, poolOrg, clientDataStructure } from './types';

const exec = util.promisify(require('child_process').exec);
const execFile = util.promisify(require('child_process').execFile);

export async function poolBuild() {
  let msgJSON;
  try { 
    msgJSON = await getPoolRequest(true);
  } catch (e){
    if (e.message === 'pool request queue is empty'){
      logger.warn(`failed to build pool: ${e.message}`);
    } else {
      logger.error(`failed to build pool: ${e.message}`);
    }
    return false;
  }
  
  await auth();
  logger.debug('building a pool org!', msgJSON);

  const buildResult = await build(msgJSON);
  
  const poolMessage: poolOrg = {
    repo: msgJSON.repo,
    githubUsername: msgJSON.username,
    openCommand: 'placeholder',
    createdDate: new Date()
  };
  if (msgJSON.branch) {
    poolMessage.branch = msgJSON.branch;
  }

  await putPooledOrg(msgJSON, poolMessage);


  // utilities.loggerFunction(await exec(gitCloneCmd, { cwd: tmpDir }));
  // if (!fs.existsSync(`${cloneDir}/orgInit.sh`)) {
  //   logger.error('There is no orgInit.sh file in the repo', msgJSON);
  //   throw new Error('There is no orgInit.sh file in the repo');
  // }

  // const parseResults: lineParserResult = await poolParse(
  //   path.join(cloneDir, 'orgInit.sh')
  // );

  // a few things we have to do post-org-creation so we can still return it to the end user
  // logger.debug(`open command is ${parseResults.openLine}`);
  // poolMessage.openCommand = parseResults.openLine;
  // if (parseResults.passwordLine) {
  //   poolMessage.passwordCommand = parseResults.passwordLine;
  // }

  // run the file
  // try {
  //   await execFile('./orgInit.sh', { cwd: cloneDir, timeout: 1000000, shell: '/bin/bash' })
  // } catch (e) {
  //   throw new Error(e);
  // }

  // try {
  //   const displayResults = await exec('sfdx force:org:display --json', { cwd: cloneDir });
  //   poolMessage.displayResults = JSON.parse(stripcolor(displayResults.stdout)).result;
  // } catch (e) {
  //   // console.error('error in force:org:display');
  //   throw new Error(e);
  // // }
  // try {
  //   await fs.remove(`${tmpDir}/${msgJSON.deployId}`);
  //   return true;
  // } catch (error) {
  //   logger.error(
  //     `error runnning file for ${msgJSON.username}/${msgJSON.repo}`,
  //     error
  //   );
  //   await fs.remove(`${tmpDir}/${msgJSON.deployId}`);
  //   return false;
  // }
}
