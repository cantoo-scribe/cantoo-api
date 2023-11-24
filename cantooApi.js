//@ts-check

const hosts = {
  develop: 'https://develop.cantoo.fr',
  preprod: 'https://preprod.cantoo.fr',
  prod: 'https://cantoo.fr'
}

/**
 * @typedef {Object} ConnectProps
 * @property {HTMLElement} domElement The DOM node the iframe should be attached to
 */

/**
 * @typedef {'ready' | 'completed' | 'destroyed' | 'logout'} EventType
 */

/**
 * @typedef {Object} ReadyEvent
 * @property {string} userId The id of the user currently logged in the app
 * @property {string} fileId The id of the file being viewed/edited
 */

/**
 * @typedef {Object} LogoutEvent
 * @property {string} userId The id of the user logging out of the app
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
 * @callback LogoutHandler
 * @param {LogoutEvent} event The "ready" event
 * @return {void}
 */

/**
 * @callback CompletedHandler
 * @param {CompletedEvent} event The "completed" event
 * @return {void}
 */

/**
 * @callback BasicEventHandler
 * @return {void}
 */

/**
 * @template {EventType} EventName
 * @typedef {EventName extends 'ready' ? ReadyHandler  : EventName extends 'completed' ? CompletedEvent : BasicEventHandler} EventHandler
 */

/**
 * @template {EventType} EventName
 * @callback EventListener
 * @param {EventName} eventName The Event to listen to
 * @param {EventHandler<EventName>} listener The event listener
 * @returns {void}
 */

/**
 * @typedef {Object} UrlProps
 * @property {string} userId The useId that will own the edited document
 * @property {string} idEnt The idEnt of the user. Will be used for authentication.
 * @property {string} uai The uai of the user. Will be used for authentication.
 * @property {'develop'|'preprod'|'prod'} env The current environment
 * @property {boolean} readOnly Should we open a viewer or an editor?
 */

/**
 * @typedef {Object} FileCreationProp
 * @property {undefined=} fileId The id of the document to edit.
 * @property {string} title The title of the new document. This is required if no fileId is provided
 * @property {false=} readOnly This should be false when creating a new document
 * @property {'cabri'=} template The template model to load in the editor
 */
/**
 * @typedef {Object} FileLoadingProp
 * @property {string} fileId The id of the document to edit.
 * @property {string=} title The title of the new document. This is required if no fileId is provided
 * @property {boolean=} readOnly The title of the new document. This is required if no fileId is provided
 * @property {undefined=} template The template model to load in the editor
 */

/**
 *
 * @typedef {Object} Callbacks
 * @property {((id: string, userId: string) => void)[]} ready
 * @property {((id: string, title: string, userId: string) => void)[]} completed
 * @property {(() => void)[]} destroyed
 */

/**
 * @param {UrlProps & (FileCreationProp | FileLoadingProp)} props
 * @return {string}
 */
function buildUrl({ env, ...props }) {
  const host = hosts[env]
  if (!host) throw new Error(`${env} is not a valid environment value. Try 'develop', 'preprod' or 'prod'.`)
  const query = Object.entries(props)
    .map(([key, value]) => value === true ? key : value ? `${key}=${value}` : undefined)
    .filter(entry => !!entry)
    .join('&')
  return `${host}/api/embed?${query}`
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
   *  destroyed: BasicEventHandler[]
   *  logout: LogoutHandler[]
   * }}
   */
  callbacks = {
    /** @type {ReadyHandler[]} */
    ready: [],
    /** @type {CompletedHandler[]} */
    completed: [],
    /** @type {BasicEventHandler[]} */
    destroyed: [],
    /** @type {LogoutHandler[]} */
    logout: []
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
   * @type {FileCreationProp['title']=}
   * @private
   */
  title

  /**
   * The template to be loaded when create a document
   * @type {FileCreationProp['template']=}
   * @private
   */
  template

  /**
   * The Id of the file currently shown in the iFrame
   * @type {FileLoadingProp['fileId']=}
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
   * @param {ConnectProps & UrlProps & (FileCreationProp | FileLoadingProp)} params
   */
  constructor({ domElement, env, idEnt, uai, userId, readOnly, ...props }) {
    this.domElement = domElement
    this.env = env
    this.idEnt = idEnt
    this.uai = uai
    this.userId = userId
    this.readOnly = readOnly

    this.title = /** @type {FileCreationProp} */(props).title
    this.template = /** @type {FileCreationProp} */(props).template
    this.fileId = /** @type {FileLoadingProp} */(props).fileId

    this.iframe = document.createElement('iframe')
    this.iframe.allow = "fullscreen *; camera *; display-capture *; local-fonts *; microphone *"
    this.iframe.src = this._buildUrl()
    this.iframe.setAttribute('style', 'flex: 1 1 0;align-self: stretch;')
    domElement.appendChild(this.iframe)

    this.postMessageListener = event => {
      const type = event.data?.type
      if (['ready', 'completed', 'destroyed'].includes(type)) {
        this.setState(type)
        if(type === 'destroyed') this._doDestroy()
        else this.callbacks[type].forEach(listener => listener(event.data))
      }
    }

    // this might cause a memory leak if destroy is not called
    window.addEventListener('message', this.postMessageListener)
  }

  /**
   * @param {'launching'|'ready'|'completed'|'destroyed'} state
   * @private
   */
  setState = (state) => {
    // @ts-ignore
    this.state = state
  }

  /**
   * Create an iframe running Cantoo Scribe for the provided user
   * @param {ConnectProps & UrlProps & (FileCreationProp | FileLoadingProp)} props
   * @return {Promise<CantooAPI>} Returns a CantooApi object that lets you interact with the iframe. The 
   */
  static async connect(props) {
    const api = new CantooAPI(props)

    return /** @type {Promise<CantooAPI>} */(new Promise((resolve, reject) => {
      /** @type {ReadyHandler} */
      const callback = (event) => {
        api.removeEventListener('ready', callback)
        api.fileId = event.fileId
        resolve(api)
      }
      api.addEventListener('ready', callback)
      setTimeout(() =>
        reject(new Error('The iframe took more than 5 minute to open. Timeout.'))
        , 5 * 60000)
    }).catch(err => {
      // If the iframe failed to load, we destroy it
      api.destroy()
      throw err
    }))
  }

  _buildUrl = () => buildUrl({
    env: this.env,
    idEnt: this.idEnt,
    readOnly: this.readOnly,
    uai: this.uai,
    userId: this.userId,
    // We have to type as if we were creating or loading a file (here, loading)
    fileId: /** @type {string} **/(this.fileId),
    title: this.title,
    template: /** @type {undefined} **/(this.template)
  })

  /**
   * Load the specified document in Cantoo.
   * @param {string} fileId The document id
   * @param {boolean=} readOnly Should this viewer be made read only?
   * @return {Promise<void>} A promise that will resolve when the document was loaded and the ready event was received.
   */
  loadDocument = (fileId, readOnly) => {
    this.fileId = fileId
    this.title = undefined
    this.readOnly = !!readOnly
    this.template = undefined
    this.iframe.src = this._buildUrl()
    return /** @type {Promise<void>} */(new Promise((resolve, reject) => {
      const callback = () => {
        this.removeEventListener('ready', callback)
        resolve()
      }
      this.addEventListener('ready', callback)
      setTimeout(() => {
        reject(new Error('Loading the document took more than 60s. Timeout.'))
        this.removeEventListener('ready', callback)
      }, 60000)
    })).catch(err => {
      this.destroy()
      throw err
    })
  }

  /**
   * This method will destroy the iframe, remove existing event listeners and release all resources. Don't forget to call it when you get rid of CantooAPI object.
   * @returns {Promise<void>}
   */
  async destroy () {
    return /** @type {Promise<void>} */(new Promise(((resolve, reject) => {
      try {
        if(!this.iframe?.contentWindow) return reject(new Error('iframe doesn\'t exist'))
        const onDestroy = () => {
          resolve()
          this.removeEventListener('destroyed', onDestroy)
        }
        this.addEventListener('destroyed', onDestroy)
        this.iframe.contentWindow.postMessage({ type: 'close' }, '*')

        // Reject after 10s timeout
        setTimeout(() => reject(new Error('The iframe didn\'t respond within 10s. Destroying anyway')), 10000)
      } catch (err) {
        reject(err)
      }
    }).bind(this))).catch(err => {
      this._doDestroy()
      throw err
    })
  }

  /**
   * Remove the listeners and destroy the iframe, cutting all comunications with Cantoo Scribe
   * @private
   */
  _doDestroy = () => {
    window.removeEventListener('message', this.postMessageListener)
    this.domElement.removeChild(this.iframe)
    this.setState('destroyed')
    this.callbacks['destroyed'].forEach(callback => callback())
    this.callbacks = {
      ready: [],
      completed: [],
      destroyed: [],
      logout: []
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
    this.callbacks[eventName].push(/** @type {BasicEventHandler} */(listener))
  }

  /**
   * Remove an existing event listener. Be careful, if you added the same listener twice, all of them will be removed.
   * @template {EventType} EventName
   * @param {EventName} eventName The event the listener was recording
   * @param {EventHandler<EventName>} listener The event listener
   * @return {void}
   */
  removeEventListener = (eventName, listener) => {
    this.callbacks[/** @type {'destroyed'} **/(eventName)] = /** @type {BasicEventHandler[]} */(this.callbacks[eventName].filter(c => c !== listener))
  }
}

export default CantooAPI
