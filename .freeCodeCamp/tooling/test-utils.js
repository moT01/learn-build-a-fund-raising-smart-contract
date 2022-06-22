import { readFile, readdir } from "fs/promises";
import { promisify } from "util";
import { join } from "path";
import { exec, execSync } from "child_process";
const execute = promisify(exec);

import fs from 'fs';
import sha256 from 'crypto-js/sha256.js';
import elliptic from 'elliptic';
const ec = new elliptic.ec('p192');

const ROOT = ".";

async function getDirectory(path) {
  const files = await readdir(`${ROOT}/${path}`);
  return files;
}

/**
 * Checks if file is open in VSCode editor
 * @param {string} path Path to file
 * @returns {boolean}
 */
async function isFileOpen(path) {
  // TODO: Probably not possible
  await new Promise((resolve) => setTimeout(resolve, 10000));
  return true;
}

async function getTerminalOutput() {
  const pathToTerminalLogs = join(`${ROOT}/.logs/.terminal-out.log`);
  const terminalLogs = await readFile(pathToTerminalLogs, "utf8");

  if (!terminalLogs) {
    throw new Error("No terminal logs found");
  }

  return terminalLogs;
}

/**
 * Returns stdout of a command called from a given path
 * @param {string} command
 * @param {string} path Path relative to curriculum folder
 * @returns
 */
async function getCommandOutput(command, path = "") {
  const { stdout } = await execute(command, {
    cwd: `${ROOT}/${path}`,
    shell: "/bin/bash",
  });
  return stdout;
}

/**
 * TODO
 */
async function getLastCommand(howManyBack = 0) {
  const pathToBashLogs = join(`${ROOT}/.logs/.bash_history.log`);
  const bashLogs = await readFile(pathToBashLogs, "utf8");

  if (!bashLogs) {
    throw new Error(`Could not find ${pathToBashLogs}`);
  }

  const logs = bashLogs.split("\n");
  const lastLog = logs[logs.length - howManyBack - 2];

  return lastLog;
}

// TODO: Do not return whole file
async function getCWD() {
  const pathToCWD = join(`${ROOT}/.logs/.cwd.log`);
  const cwd = await readFile(pathToCWD, "utf8");
  return cwd;
}

async function getFile(path) {
  const file = await readFile(`${ROOT}/${path}`, "utf8");
  return file;
}

async function fileExists(path) {
  return fs.existsSync(path);
}

const projectFiles = [
  "add-transaction.js",
  "blockchain-helpers.js",
  "blockchain.json",
  "contract-wallets.json",
  "deploy-contract.js",
  "generate-wallet.js",
  "get-address-info.js",
  "init-blockchain.js",
  "mine-block.js",
  "run-contract.js",
  "smart-contracts.json",
  "transactions.json",
  "wallets.json"
];

async function copyDirectory(folderToCopy, destinationFolder) {
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder);
  }

  fs.readdirSync(folderToCopy).forEach(file => {
    fs.copyFileSync(`${folderToCopy}/${file}`, `${destinationFolder}/${file}`);
  });
}

async function copyProjectFiles(destinationFolder, arrayOfFiles = projectFiles) {
  await copyDirectory('../fundraising-contract', `./${destinationFolder}/fundraising-contract`)

  arrayOfFiles.forEach(file => {
    fs.copyFileSync(`../${file}`, `./${destinationFolder}/${file}`);
  })
}

async function runCommand(command, options) {
  execSync(command, options);
}

async function getJsonFile(file) {
  const fileString = fs.readFileSync(file);
  return JSON.parse(fileString);
}

async function writeJsonFile(path, content) {
  fs.writeFileSync(path, JSON.stringify(content, null, 2));
}

async function generateHash(content) {
  const hash = sha256(content).toString();
  return hash;
}

async function generateSignature(privateKey, content) {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const signature = keyPair.sign(content).toDER('hex');
  return signature;
}

async function validateSignature(publicKey, content, signature) {
  const keyPair = ec.keyFromPublic(publicKey, 'hex');
  const hash = await generateHash(content);
  const verifiedSignature = keyPair.verify(hash, signature);
  return verifiedSignature;
}

async function getPublicKeyFromPrivate(privateKey) {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const publicKey = keyPair.getPublic('hex');
  return publicKey;
}

async function getContract(contractAddress, cwd = '..', includePool = true) {
  // get the latest contract state from the blockchain
  const blockchain = await getJsonFile(`${cwd}/blockchain.json`);
  const latestContract = blockchain.reduce((currentContract, nextBlock) => {
    if (nextBlock.smartContracts) {
      nextBlock.smartContracts.forEach(contract => {
        if (contract.address === contractAddress) {

          // first occurrence of contract
          if (!currentContract.hasOwnProperty('address')) {
            Object.keys(contract).forEach(key => currentContract[key] = contract[key]);

            // contract found and added, only update state after that
          } else if (contract.hasOwnProperty('state')) {
            currentContract.state = contract.state;
          }
        }
      });
    }
    return currentContract;
  }, {});

  if (includePool) {
    // add contract pool to latest contract state
    const smartContracts = await getJsonFile(`${cwd}/smart-contracts.json`);
    smartContracts.forEach(contract => {
      if (contract.address === contractAddress) {
        if (!latestContract.hasOwnProperty('address')) {
          Object.keys(contract).forEach(key => latestContract[key] = contract[key]);

        } else if (latestContract.hasOwnProperty('state')) {
          latestContract.state = contract.state;
        }
      }
    });
  }

  return latestContract.hasOwnProperty('address') ? latestContract : null;
}

const __helpers = {
  getDirectory,
  isFileOpen,
  getFile,
  fileExists,
  getTerminalOutput,
  getCommandOutput,
  getLastCommand,
  getCWD,
  copyProjectFiles,
  runCommand,
  getJsonFile,
  writeJsonFile,
  generateHash,
  generateSignature,
  validateSignature,
  getPublicKeyFromPrivate,
  getContract
};

export default __helpers;
