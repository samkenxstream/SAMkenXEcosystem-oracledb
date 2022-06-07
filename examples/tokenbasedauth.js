/* Copyright (c) 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   tokenbasedauth.js
 *
 * DESCRIPTION
 *   This script shows standalone connection using token based authentication
 *   to Oracle Autonomous Database from Oracle Compute Infrastructure.
 *
 *   For more information refer to
 *   https://oracle.github.io/node-oracledb/doc/api.html#tokenbasedauth
 *
 * PREREQUISITES
 *   - node-oracledb 5.4 or later.
 *
 *   - Oracle Client libraries 19.14 (or later), or 21.5 (or later).
 *
 *   - The Oracle Cloud Infrastructure command line interface (OCI-CLI).  The
 *     command line interface (CLI) is a tool that enables you to work with
 *     Oracle Cloud Infrastructure objects and services at a command line, see
 *     https://docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm
 *
 *   - Set these environment variables (see the code explanation):
 *     NODE_ORACLEDB_ACCESS_TOKEN_LOC
 *     NODE_ORACLEDB_CONNECTIONSTRING
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const { execSync } = require('child_process');

// Execute the OCI-CLI command to generate a token.
// This should create two files "token" and "oci_db_key.pem".
// On Linux the default file location is "~/.oci/db-token".  You should set
// NODE_ORACLEDB_ACCESS_TOKEN_LOC to this directory, or to the directory where
// you move the files.
try {
  const cmdResult = execSync('oci iam db-token get', { encoding: 'utf-8' });
  console.log(cmdResult);
} catch (err) {
  console.log(err);
}

// User defined function for reading token and private key values generated by
// the OCI-CLI.
function getToken() {
  const tokenPath = process.env.NODE_ORACLEDB_ACCESS_TOKEN_LOC + '/token';
  const privateKeyPath = process.env.NODE_ORACLEDB_ACCESS_TOKEN_LOC +
      '/oci_db_key.pem';

  let token = '';
  let privateKey = '';
  try {
    // Read token file
    token = fs.readFileSync(tokenPath, 'utf8');
    // Read private key file
    const privateKeyFileContents = fs.readFileSync(privateKeyPath, 'utf-8');
    privateKeyFileContents.split(/\r?\n/).forEach(line => {
      if (line != '-----BEGIN PRIVATE KEY-----' &&
        line != '-----END PRIVATE KEY-----')
        privateKey = privateKey.concat(line);
    });
  } catch (err) {
    console.error(err);
  }

  const tokenBasedAuthData = {
    token         : token,
    privateKey    : privateKey
  };
  return tokenBasedAuthData;
}

async function run() {
  let connection;
  // Get token and private key.
  let accessTokenObj = getToken();

  // Configuration for token based authentication:
  //   accessToken:   The token values
  //   externalAuth:  Must be set to true for token based authentication.
  //   connectString: The NODE_ORACLEDB_CONNECTIONSTRING environment variable
  //                  set to the Oracle Net alias or connect descriptor of your
  //                  Oracle Autonomous Database.
  const config = {
    accessToken        : accessTokenObj,
    externalAuth       : true,
    connectString      : process.env.NODE_ORACLEDB_CONNECTIONSTRING
  };

  try {
    connection = await oracledb.getConnection(config);
    const sql = `SELECT TO_CHAR(current_date, 'DD-Mon-YYYY HH24:MI') AS D
                 FROM DUAL`;
    const result = await connection.execute(sql);
    console.log("Result is:\n", result);
  } catch (err) {
    console.error(err);
  } finally {
    try {
      if (connection)
        await connection.close();
    } catch (err) {
      console.error(err.message);
    }
  }
}

run();
