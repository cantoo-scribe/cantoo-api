//@ts-check

/**
 *
 * @typedef {Object} ConnectProps
 * @property {HTMLElement} domElement
 * @property {string} userId
 * @property {string|undefined} fileId
 * @property {string} idEnt
 * @property {string} uai
 * @property {'develop'|'preprod'|'prod'} env
 */

/**
 *
 * @typedef {Object} UrlProps
 * @property {string} userId
 * @property {string|undefined} fileId
 * @property {string} idEnt
 * @property {string} uai
 * @property {'develop'|'preprod'|'prod'} env
 */

/**
 *
 * @typedef {Object} Callbacks
 * @property {((id: string, userId: string) => void)[]} ready
 * @property {((id: string, title: string, userId: string) => void)[]} completed
 * @property {(() => void)[]} closed
 */

/**
 * @param {UrlProps} props
 * @return {string}
 */
function buildUrl ({env, userId, idEnt, uai, fileId}) {
  const appUrl = env === 'develop' ? 'app.develop.cantoo.fr' : env === 'preprod' ? 'app.preprod.cantoo.fr' : 'app.cantoo.fr'
  const query = Object.entries({ env, userId, idEnt, uai, fileId }).reduce((queryAcc, queryParam) => {
    if (queryParam[1] !== undefined) {
      queryAcc+=`&${queryParam[0]}\=${queryParam[1]}`
    }
    return queryAcc
  }, '')
  return`https://${appUrl}/kardi?${query}`
}

class CantooAPI {
  /**
   * @type {'launching'|'ready'|'completed'|'closed'}
   * @readonly
   */
  state = 'closed'

  /**
   * @type {Callbacks}
   * @private
   */
  callbacks = {
    ready: [],
    completed: [],
    closed: []
  }

  /**
   * @type {ConnectProps['domElement']}
   * @private
   */
  domElement
  
  /**
   * @type {ConnectProps['env']}
   * @private
   */
  env

   /**
   * @type {ConnectProps['fileId']}
   * @private
   */
  fileId

   /**
   * @type {ConnectProps['idEnt']}
   * @private
   */
  idEnt
  
  /**
   * @type {ConnectProps['uai']}
   * @private
   */
   uai
  
  /**
   * @type {ConnectProps['userId']}
   * @private
   */
   userId
  
  /**
   * @type {HTMLIFrameElement}
   * @private
   */
  iframe

  /**
   * @param {ConnectProps & {iframe: HTMLIFrameElement}} params
   */
  constructor({domElement, iframe, env, fileId, idEnt, uai, userId}) {
    this.domElement = domElement
    this.iframe = iframe
    this.env = env
    this.fileId = fileId
    this.idEnt = idEnt
    this.uai = uai
    this.userId = userId
    // this might cause a memory leak
    window.addEventListener('message', event => {
      const data = JSON.parse(event.data)
      if(['ready', 'completed', 'closed'].includes(data.type)) {
        this.setState(data.type)
        this.callbacks[data.type].forEach(listener => listener(data))
      }
    })
  }

  /**
   * @param {'launching'|'ready'|'completed'|'closed'} state
   * @protected
   */
  setState(state) {
    // @ts-ignore
    this.state = state
  }

  /**
   * @return {string}
   */
  get url () {
    return buildUrl({env: this.env, fileId: this.fileId, idEnt: this.idEnt, uai: this.uai, userId: this.userId})
  }

  /**
   * @param {ConnectProps} props
   */
  static async connect(props) {
    const { domElement, fileId, userId, idEnt, uai, env } = props
    const { width, height } = domElement.getBoundingClientRect()
    const iframe = document.createElement('iframe')
    iframe.width = width + ''
    iframe.height = height + ''
    iframe.src = buildUrl({env, fileId, idEnt, uai, userId})
    const observer = new ResizeObserver(e => {
      const resizeEntry = e[0]
      const { width, height } = resizeEntry.contentRect
      iframe.width = width + ''
      iframe.height = height + ''
    })
    observer.observe(domElement)
    domElement.appendChild(iframe)
    const api = new CantooAPI({ ...props, iframe })
    api.setState('launching')

    if (fileId) {
      return /** @type {Promise<CantooAPI>} */(new Promise((resolve) => {
        const callback = () => {
          api.removeEventListener('ready', callback)
          resolve(api)
        }
        api.addEventListener('ready', callback)
      }))
    }
    return api
  }

  /**
   * @param {string} id
   * @param {string|undefined} readOnly
   */
  loadDocument(id, readOnly) {
    this.userId = id
    this.iframe.src = this.url
    return /** @type {Promise<void>} */(new Promise((resolve) => {
      const callback = () => {
        this.removeEventListener('ready', callback)
        resolve()
      }
      this.addEventListener('ready', callback)
    }))
  }

  /**
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.domElement.removeChild(this.iframe)
    this.setState('closed')
    this.callbacks['closed'].forEach(callback => callback())
    this.callbacks = {
      ready: [],
      completed: [],
      closed: []
    }
  }

  /**
   * @type {{ 
   * (eventName: 'ready', callback: (id: string, userId: string) => void, readOnly?: boolean): void;
   * (eventName: 'completed', callback: (id: string, title: string, userId: string) => void): void;
   * (eventName: 'closed', callback: () => void): void;
   * }}
   */
  addEventListener = (eventName, callback, readOnly = false) => {
    this.callbacks[eventName].push(callback)
  }

  /**
   * 
   * @param {'ready'|'completed'|'closed'} eventName 
   * @param {() => void} callback 
   */
  removeEventListener = (eventName, callback) => {
    // @ts-ignore
    this.callbacks[eventName] = this.callbacks[eventName].filter(c => c !== callback)
  }
  

}

module.exports = CantooAPI
