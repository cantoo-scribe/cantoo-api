# cantoo-api

## Creating a new connection

To create a new connection with the cantoo api you must call the static method `CantooApi.connec()`. This method will create an iframe on the current window and return a new CantooApi instance.

`CantooApi.connec()` receives an Object as param. The object should have the following properties:

| key | type | required | description |
|-----|------|----------|-------------|
| domElement | ` HTMLElement` | required | The DOM element which the iframe will be attached to |
| userId | `string` | required | The user id that wants to interact with the api (as received from the GAR) |
| fileId | `string` | optional | The file id that is going to be edited (as received in the "ready" and "completed" events) |
| idEnt | `string` | required | The idEnt as received from the GAR |
| uai | `string` | required | The UAI as received from the GAR |
| env | `'prod' \| 'preprod' \| 'develop'` | required | The environment that the client will connect to |
| readOnly | `boolean` | required | Should the user be able to edit the file, or is it only a viewer? |

**if the `fileId` is provided, connect will wait until the iframe gets ready to return the CantooApi instance**

```js
const api = await CantooAPI.connect({domElement, env: 'develop', idEnt: '1', uai: '2', userId: '10', fileId: '10', readOnly: true})
```

## The CantooApi instance

Once the connection is done you can interact with the cantoo api through the following methods:

|name|type|description|
|----|----|-----------|
| loadDocument |`(id: string, readOnly: string \| undefined) => Promise<void>`| Loads a new document on the Iframe |
| addEventListener | `(eventName: 'ready', callback: (id: string, userId: string) => void, readOnly?: boolean) => void`| Adds a new listener to the 'ready' event |
| addEventListener | `(eventName: 'completed', callback: (id: string, title: string, userId: string) => void) => void` | Adds a new listener to the `'completed'` event |
| addEventListener | `(eventName: 'closed', callback: () => void) => void`| Adds a new listener to the 'closed' event |
| removeEventListener | `(eventName: 'closed', callback: () => void) => void`| Removes a listener that is attached to some event. The callback is the function instance that was previously added to the listener |
| shutdown | `() => void`| Closes the connection with the api. This function also removes all listeners and call the listerners that were attached to the `'close'` event|

### The connection state
The CantooApi holds the connection state on the readOnly attribute `state`.

There are 4 possible states:

|name|description|
|----|-----------|
|launching| The iframe was attached to the document and it's loading its content |
|ready| The document `id` is ready for edition |
|completed| The document `id` has been created and can be retrieved or shared |
|closed| The iframe was closed and detached |
