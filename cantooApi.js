//@ts-check

/**
 * @typedef {Object} ConnectProps
 * @property {HTMLElement} domElement The DOM node the iframe should be attached to
 */

/**
 * @typedef {'ready' | 'completed' | 'destroyed'} EventType
 */

/**
 * @typedef {Object} ReadyEvent
 * @property {string} userId The id of the user currently logged in the app
 * @property {string} fileId The id of the file being viewed/edited
 */

/**
 * @typedef {Object} CompletedEvent
 * @property {string} userId The id of the user currently logged in the app
 * @property {string} fileId The id of the file being viewed/edited
 * @property {string} title The title of the file being viewed/edited
 */

/**
 * @callback ReadyHandler
 * @param {ReadyEvent} event The "ready" event
 * @return {void}
 */

/**
 * @callback CompletedHandler
 * @param {CompletedEvent} event The "completed" event
 * @return {void}
 */

/**
 * @callback DestroyedHandler
 * @return {void}
 */

/**
 * @template {EventType} EventName
 * @typedef {EventName extends 'ready' ? ReadyHandler  : EventName extends 'completed' ? CompletedEvent : DestroyedHandler} EventHandler
 */

/**
 * @template {EventType} EventName
 * @callback EventListener
 * @param {EventName} eventName The Event to listen to
 * @param {EventHandler<EventName>} listener The event listener
 * @returns {void}
 */

/**
 *
 * @typedef {Object} UrlProps
 * @property {string} userId The useId that will own the edited document
 * @property {string=} fileId The id of the document to edit. If not provided, will create a new document
 * @property {string} idEnt The idEnt of the user. Will be used for authentication.
 * @property {string} uai The uai of the user. Will be used for authentication.
 * @property {'develop'|'preprod'|'prod'} env The current environment
 * @property {boolean} readOnly Should we open a viewer or an editor?
 */

/**
 *
 * @typedef {Object} Callbacks
 * @property {((id: string, userId: string) => void)[]} ready
 * @property {((id: string, title: string, userId: string) => void)[]} completed
 * @property {(() => void)[]} destroyed
 */

/**
 * @param {UrlProps} props
 * @return {string}
 */
function buildUrl({ env, userId, idEnt, uai, fileId, readOnly }) {
  const hosts = {
    develop: 'develop.cantoo.fr',
    preprod: 'preprod.cantoo.fr',
    prod: 'cantoo.fr'
  }
  const host = hosts[env]
  if (!host) throw new Error(`${env} is not a valid environment value. Try 'develop', 'preprod' or 'prod'.`)
  const query = Object.entries({ userId, idEnt, uai, fileId, readOnly })
    .map(([key, value]) => value === true ? key : value ? `${key}=${value}` : undefined)
    .filter(entry => !!entry)
    .join('&')
  return `https://${host}/api/kardi?${query}`
}

class CantooAPI {
  /**
   * The current state of the iFrame
   * @type {'launching'|'ready'|'completed'|'destroyed'}
   * @readonly
   */
  state = 'launching'

  /**
   * Holds the listeners for each event type
   * @type {{
   *  ready: ReadyHandler[]
   *  completed: CompletedHandler[]
   *  destroyed: DestroyedHandler[]
   * }}
   */
  callbacks = {
    /** @type {ReadyHandler[]} */
    ready: [],
    /** @type {CompletedHandler[]} */
    completed: [],
    /** @type {DestroyedHandler[]} */
    destroyed: []
  }

  /**
   * The parent DOM element the iframe is attatched to
   * @type {ConnectProps['domElement']}
   * @private
   */
  domElement

  /**
   * The current environment
   * @type {UrlProps['env']}
   * @private
   */
  env

  /**
   * The Id of the file currently shown in the iFrame
   * @type {UrlProps['fileId']}
   * @private
   */
  fileId

  /**
   * The Id of the user's ENT
   * @type {UrlProps['idEnt']}
   * @private
   */
  idEnt

  /**
   * The establishment Id
   * @type {UrlProps['uai']}
   * @private
   */
  uai

  /**
   * The user Id currently logged in the app
   * @type {UrlProps['userId']}
   * @private
   */
  userId

  /**
   * The iframe DOM node
   * @type {HTMLIFrameElement}
   * @private
   */
  iframe

  /**
   * Should the document be made read only?
   * @type {boolean}
   * @private
   */
  readOnly

  /**
   * The listener listening to postMessage events
   * @type {(event: MessageEvent) => void}
   * @private
   */
  postMessageListener

  /**
   * Create a CantooApi object that you can use to create and control a Cantoo Scribe iframe
   * @param {ConnectProps & UrlProps} params
   */
  constructor({ domElement, env, fileId, idEnt, uai, userId, readOnly }) {
    this.domElement = domElement
    this.env = env
    this.fileId = fileId
    this.idEnt = idEnt
    this.uai = uai
    this.userId = userId
    this.readOnly = readOnly

    this.iframe = document.createElement('iframe')
    this.iframe.src = this._buildUrl()
    this.iframe.setAttribute('style', 'flex: 1 1 0;align-self: stretch;')
    domElement.appendChild(this.iframe)

    this.postMessageListener = event => {
      const data = JSON.parse(event.data)
      if (['ready', 'completed', 'destroyed'].includes(data.type)) {
        this.setState(data.type)
        this.callbacks[data.type].forEach(listener => listener(data))
      }
    }

    // this might cause a memory leak if destroy is not called
    window.addEventListener('message', this.postMessageListener)
  }

  /**
   * @param {'launching'|'ready'|'completed'|'destroyed'} state
   * @private
   */
  setState(state) {
    // @ts-ignore
    this.state = state
  }

  /**
   * Create an iframe running Cantoo Scribe for the provided user
   * @param {ConnectProps & UrlProps} props
   * @return {Promise<CantooAPI>} Returns a CantooApi object that lets you interact with the iframe. The 
   */
  static async connect(props) {
    const api = new CantooAPI(props)

    return /** @type {Promise<CantooAPI>} */(new Promise((resolve, reject) => {
      /** @type {ReadyHandler} */
      const callback = (event) => {
        api.removeEventListener('ready', callback)
        this.fileId = event.fileId
        resolve(api)
      }
      api.addEventListener('ready', callback)
      setTimeout(() =>
        reject(new Error('The iframe took more than a minute to open. Timeout.'))
        , 60000)
    }).catch(err => {
      // If the iframe failed to load, we destroy it
      api.destroy()
      throw err
    }))
  }

  _buildUrl() {
    return buildUrl({ env: this.env, idEnt: this.idEnt, readOnly: this.readOnly, uai: this.uai, userId: this.userId, fileId: this.fileId })
  }

  /**
   * Load the specified document in Cantoo.
   * @param {string} fileId The document id
   * @param {boolean=} readOnly Should this viewer be made read only?
   * @return {Promise<void>} A promise that will resolve when the document was loaded and the ready event was received.
   */
  loadDocument(fileId, readOnly) {
    this.fileId = fileId
    this.readOnly = !!readOnly
    this.iframe.src = this._buildUrl()
    return /** @type {Promise<void>} */(new Promise((resolve, reject) => {
      const callback = () => {
        this.removeEventListener('ready', callback)
        resolve()
      }
      this.addEventListener('ready', callback)
      setTimeout(() => {
        reject(new Error('Loading the document took more than 20s. Timeout.'))
        this.removeEventListener('ready', callback)
      }, 20000)
    }))
  }

  /**
   * This method will destroy the iframe, remove existing event listeners and release all resources. Don't forget to call it when you get rid of CantooAPI object.
   * @returns {void}
   */
  destroy() {
    window.removeEventListener('message', this.postMessageListener)
    this.domElement.removeChild(this.iframe)
    this.setState('destroyed')
    this.callbacks['destroyed'].forEach(callback => callback())
    this.callbacks = {
      ready: [],
      completed: [],
      destroyed: []
    }
  }

  /**
   * Add an event listener to one of the events
   * @template {EventType} EventName
   * @param {EventName} eventName The event to listen to
   * @param {EventHandler<EventName>} listener The event listener
   * @return {void}
   */
  addEventListener = (eventName, listener) => {
    this.callbacks[eventName].push(/** @type {DestroyedHandler} */(listener))
  }

  /**
   * Remove an existing event listener. Be careful, if you added the same listener twice, all of them will be removed.
   * @template {EventType} EventName
   * @param {EventName} eventName The event the listener was recording
   * @param {EventHandler<EventName>} listener The event listener
   * @return {void}
   */
  removeEventListener = (eventName, listener) => {
    this.callbacks[/** @type {'destroyed'} **/(eventName)] = /** @type {DestroyedHandler[]} */(this.callbacks[eventName].filter(c => c !== listener))
  }
}

export default CantooAPI
