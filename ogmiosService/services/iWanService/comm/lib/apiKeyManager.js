const {SecretsManagerClient, GetSecretValueCommand} = require("@aws-sdk/client-secrets-manager");
const {AWS_REGION, AML_APIKEY, AML_SECKEY} = require("comm/lib/apiKeyConfig");

async function getSystemApiKey(SecretId) {
    if (global.dev) {
        return process.env[SecretId] || process.env[SecretId.slice(SecretId.indexOf('/') + 1)];
    } else {
        var secretsManagerClient = new SecretsManagerClient({ region : AWS_REGION });
        var res = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId: SecretId } ));
        var json = JSON.parse(res.SecretString)
        return json[SecretId] || json[SecretId.slice(SecretId.indexOf('/') + 1)]
    }
}

async function getAmlKeys() {
    // console.log("getAmlKeys called");
    if (global.dev) {
        // console.log("getAmlKeys called dev mode");
        return [process.env.AML_APIKEY, process.env.AML_SECKEY];
    } else {
        // console.log("getAmlKeys called prod mode");
        if (!process.env.AML_APIKEY || !process.env.AML_SECKEY) {
            var secretsManagerClient = new SecretsManagerClient({ region : AWS_REGION });
            var res = await Promise.all([
                secretsManagerClient.send(new GetSecretValueCommand({ SecretId: AML_APIKEY } )),
                secretsManagerClient.send(new GetSecretValueCommand({ SecretId: AML_SECKEY } ))
            ]);
            var jsonApiKey = JSON.parse(res[0].SecretString);
            var jsonSecKey = JSON.parse(res[1].SecretString);
            var apiKey = jsonApiKey[AML_APIKEY] || jsonApiKey[AML_APIKEY.slice(AML_APIKEY.indexOf('/') + 1)];
            var secKey = jsonSecKey[AML_SECKEY] || jsonSecKey[AML_SECKEY.slice(AML_SECKEY.indexOf('/') + 1)];
            

            process.env.AML_APIKEY = apiKey;
            process.env.AML_SECKEY = secKey;
        }
        return [process.env.AML_APIKEY, process.env.AML_SECKEY];
    }
}


exports.getSystemApiKey = getSystemApiKey;
exports.getAmlKeys = getAmlKeys;
