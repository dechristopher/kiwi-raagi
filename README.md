# raagi { RCON Service }

Raagi allows communication with gameservers through commands passed by the requester by running said arbitrary commands on the remote server through the RCON protocol.

## Endpoints

All endpoints require the "**KIWI-Raagi-Auth-Token**" header to be set properly with all requests. This token can be configured in the config.json in the *authtoken* property.

* [ GET / ] Responds with service version
  * Response format:

    ```json
    {"version":"..."}
    ```

* [ POST / ] Sends command to server and responds with RCON response
  * Request Parameters:

    ```text
    sid = server index number within config.js
    command = command to send to server
    ```

  * Response format:

    ```json
    {"command":"...", "output":"..."}
    ```

## Configuration

1. Begin by running '**npm install**' from the root project directory

2. Create a **config.json** containing the following:

    ```json
    {
        "port": 3000,
        "timeout": 3000,
        "authtoken": "token",
        "ssl": {
            "enabled": true,
            "certfile": "./ssl.crt",
            "pkeyfile": "./private.key"
        },
        "servers": [
            { "id": "server1", "ip": "127.0.0.1:27015", "pw": "password" },
            { "id": "server2", "ip": "127.0.0.1:27016", "pw": "password" },
            { "id": "server3", "ip": "127.0.0.1:27017", "pw": "password" },
            ...
        ]
    }
    ```

3. Ensure your configured SSL cert and private key are placed in root project directory

4. Start the application with '**npm start**' or '**node index.js**'