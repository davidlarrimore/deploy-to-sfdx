import * as fs from 'fs-extra';
import logger from 'heroku-logger';
import { DeployRequest } from './types';
import { getCloneCommands, getaddDeployTagCommands, isMultiRepo, isByoo } from './namedUtilities';
import { CDS } from './CDS';
import { execProm } from './execProm';
import { buildScratchDef } from './multirepo/buildScratchDefs';
import { MergeProjectJSONs } from './multirepo/mergeProjectJSONs';
import axios from 'axios';

const scratchDefFileName = 'project-scratch-def.json';
const projectDefFileName = 'sfdx-project.json';

const orgInitDefault = `sfdx force:org:create -f config/project-scratch-def.json -s -d 1
sfdx force:source:push
sfdx force:org:open`;

const prepareRepo = async (msgJSON: DeployRequest, cds: CDS): Promise<CDS> => {
    if (isMultiRepo(msgJSON)) {
        // we have to create a parent project for multi-repo deploys
        await execProm(`sfdx force:project:create -n ${msgJSON.deployId}`, { cwd: 'tmp' });
    }

    const gitCloneCmds = getCloneCommands(msgJSON);

    for (const command of gitCloneCmds) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const gitCloneResult = await execProm(command, { cwd: 'tmp' });
            logger.debug(`deployQueueCheck: ${gitCloneResult.stderr}`);
            cds.commandResults.push({
                command,
                raw: gitCloneResult.stderr
            });
        } catch (err) {
            logger.warn(`deployQueueCheck: bad repo--${command}`);
            cds.errors.push({
                command,
                error: err.stderr,
                raw: err
            });
            cds.complete = true;
        }
    }
    return cds;
    };

    const addInstallTag = async (msgJSON: DeployRequest, cds: CDS): Promise<CDS> => {
        if (isMultiRepo(msgJSON)) {
            // we have to create a parent project for multi-repo deploys
            await execProm(`sfdx force:project:create -n ${msgJSON.deployId}`, { cwd: 'tmp' });
        }
    
     //TODO: Use URL parameters to install by Tag vs Latest Commit
     const githubUrl = `https://api.github.com/repos/${msgJSON.repos[0].username}/${msgJSON.repos[0].repo}/commits/master`;
    
     logger.debug('Github API URL: ' + githubUrl);
     const response = await axios.get(githubUrl);
     const githubCommitsData = response.data;
     logger.debug('githubCommitsData:');
 
     logger.debug('Commit Sha:  ' + githubCommitsData.sha);
     logger.debug('Commit Date:  ' + githubCommitsData.commit.committer.date);

     const now = new Date();
     const newDate = new Date(now.toISOString().split('.')[0]+'Z');
     //alert( now.toISOString().slice(0,-5)+"Z");


     msgJSON.repos[0].tagFile = {'name': msgJSON.repos[0].repo, 'githubBranch': msgJSON.repos[0].branch, 'githubRepositoryUrl': `https://github.com/${msgJSON.repos[0].username}/${msgJSON.repos[0].repo}`, 'installType':'Github Commit', 'installDateTime': newDate, 'commitHash':githubCommitsData.sha};

     const getaAdDeployTagCmds = getaddDeployTagCommands(msgJSON);
     logger.warn(`Running addDeployTag.addInstallTag`);
 
     for (const command of getaAdDeployTagCmds) {
         try {
             // eslint-disable-next-line no-await-in-loop
             const gitAddTagResult = await execProm(command, { cwd: 'tmp' });
             logger.debug(`deployQueueCheck: ${gitAddTagResult.stderr}`);
             cds.commandResults.push({
                 command,
                 raw: gitAddTagResult.stderr
             });
         } catch (err) {
             logger.warn(`deployQueueCheck: couldn't copy Install Tag--${command}`);
             cds.errors.push({
                 command,
                 error: err.stderr,
                 raw: err
             });
             cds.complete = true;
         }
     }
     
        return cds;
        };
    
const prepOrgInit = async (msgJSON: DeployRequest): Promise<string> => {
    const orgInitPath = `tmp/${msgJSON.deployId}/orgInit.sh`;
    logger.debug(`deployQueueCheck: going to look in the directory ${orgInitPath}`);

    if (isByoo(msgJSON)) {
        const byooInitPath = `tmp/${msgJSON.deployId}/byooInit.sh`;
        if (fs.existsSync(byooInitPath)) {
            // it's byoo and you have a special byoo file that supercedes orgInit.sh
            await fs.copyFile(byooInitPath, orgInitPath);
        } else {
            //Otherwise we use the default OrgInit.sh
            await fs.writeFile(orgInitPath, orgInitDefault);
        }
    } else if (!fs.existsSync(orgInitPath) && !isMultiRepo(msgJSON)) {
        // it's not byoo and there is no file, so we'll create one if it's not multi-deploy
        logger.debug('deployQueueCheck: no orgInit.sh.  Will use default');
        await fs.writeFile(orgInitPath, orgInitDefault);
    }
    return orgInitPath;
};

const prepProjectScratchDef = async (msgJSON: DeployRequest): Promise<void> => {
    // it's ugly, but at least it executes in parallel
    if (isMultiRepo(msgJSON)) {
        await Promise.all([
            // merge all the scratch def files
            fs.writeJSON(
                `tmp/${msgJSON.deployId}/config/${scratchDefFileName}`,
                buildScratchDef({
                    repoFileJSONs: await Promise.all(
                        msgJSON.repos.map((repo) => fs.readJSON(`tmp/${msgJSON.deployId}/${repo.repo}/config/${scratchDefFileName}`))
                    ),
                    projectname: msgJSON.deployId
                })
            ),
            // merge all the sfdx-project files
            fs.writeJSON(
                `tmp/${msgJSON.deployId}/${projectDefFileName}`,
                MergeProjectJSONs({
                    projectJSONs: await Promise.all(
                        msgJSON.repos.map((repo) => fs.readJSON(`tmp/${msgJSON.deployId}/${repo.repo}/${projectDefFileName}`))
                    ),
                    localFilePaths: msgJSON.repos.map((repo) => repo.repo)
                })
            )
        ]);
    }
    // if you passed in a custom email address, we need to edit the config file and add the adminEmail property
    if (msgJSON.email) {
        logger.debug('deployQueueCheck: write a file for custom email address', msgJSON);
        const location = `tmp/${msgJSON.deployId}/config/${scratchDefFileName}`;
        await fs.writeJSON(location, { ...(await fs.readJSON(location)), adminEmail: msgJSON.email });
    }
};

export { prepOrgInit, prepProjectScratchDef, prepareRepo, addInstallTag };
