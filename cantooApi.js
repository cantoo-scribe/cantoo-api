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
  return`${appUrl}/kardi?userId=${userId}&idEnt=${idEnt}&uai=${uai}&fileId=${fileId}`
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

    this.addEventListener('ready', () => {
      this.setState('ready')
    })
    this.addEventListener('completed', () => {
      this.setState('completed')
    })
    this.addEventListener('closed', () => {
      this.setState('closed')
    })
    window.addEventListener('message', (e) => {
      if (e.data.type === 'completed') {
        this.callbacks.completed.forEach(callback => callback('', '', ''))
      }
    })
  }

  /**
   * @param {'launching'|'ready'|'completed'|'closed'} state
   * @protected
   */
  setState(state) {
    state = state
  }

  /**
   * @return {string}
   */
  getUrl () {
    return buildUrl({env: this.env, fileId: this.fileId, idEnt: this.idEnt, uai: this.uai, userId: this.userId})
  }

  /**
   * @param {ConnectProps} props
   */
  static connect(props) {
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
      return /** @type {Promise<void>} */(new Promise((resolve) => {
        window.addEventListener('message', (e) => {
          if(e.data.type === 'ready') {
            resolve()
          }
        })
      }))
    }
  }

  /**
   * @param {string} id
   * @param {string|undefined} readOnly
   */
  loadDocument(id, readOnly) {
    this.userId = id
    this.iframe.src = this.getUrl()
  }

  /**
   * @returns {Promise<void>}
   */
  async shutdown() {}

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

}

module.exports = CantooAPI
