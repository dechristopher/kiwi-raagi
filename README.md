# raagi { RCON Service }

Raagi allows communication with gameservers through commands passed by the requester by running said arbitrary commands on the remote server through the RCON protocol.

## Endpoints

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

* config.js should contain the following:
    ```json
    {
        "version": "1.0.0",
        "port": 3000,
        "servers": [
            { "id": "server1", "ip": "127.0.0.1:27015", "pw": "password" },
            { "id": "server2", "ip": "127.0.0.1:27016", "pw": "password" },
            { "id": "server3", "ip": "127.0.0.1:27017", "pw": "password" },
            ...
        ]
    }
    ```

* private.key and ssl.crt should be placed in root project directory