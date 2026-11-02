
const WebSocket = require('ws');



async function testWsRequest(){

    let strWS = "ws://127.0.0.1:1337"
    let client = new WebSocket(strWS);

    client.once('open', () => {
        const request = { 
            "type": "jsonwsp/request",
            "version": "1.0",
            "servicename": "ogmios",
            "methodname": "Query",
            "args":{
                    "query": "chainTip"
            }
        };

        client.send(JSON.stringify(request));
    });

    client.on('message', function(msg) {
        const response = JSON.parse(msg);
        console.log("message response: ", response);
      // do something with 'response'
    });

}

async function main(){
    let cmdRoute = "queryNetwork/tip";

    // await testCurl2Axios_byGet(cmdRoute);

    // await testCurl2Axios_byPost(cmdRoute);

    await testWsRequest();
}

main();
