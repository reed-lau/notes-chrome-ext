let editor = undefined
let activeId = '0'
let activeItems = {}
let dom = {}
let activeChange = 0
let storeChange = 0
let isInit = false
const cacheMaxSize = 3 //后悔药

const initDom = () => {
  dom = {
    layout: document.getElementById('layout'),
    selector: document.getElementById('selector'),
    newCache: document.getElementById('newCache'),
    delete: document.getElementById('delete'),
    revert: document.getElementById('revert'),
  }
}
const createMD = (markdown) => {
  if (editor) { // only one editormd instance
    editor.editor.remove()
  }
  createEditorDom()
  document.getElementById('content').value = markdown
  isInit = false
  activeChange = 0
  storeChange = 0
  editor = editormd('editor', {
    width: "100%",
    height: 720,
    placeholder : "think before you write...",
    taskList : true,
    tex : true,
    emoji : true,
    onchange : function () {
      let content = document.getElementById('content')
      if (!content) return
      activeChange += 1
      console.log(activeChange, 'active change')
      chrome.storage.sync.set({[activeId]: content.value}, function() {
        console.log('store', activeId)
      })
    },
    // markdown: markdown,     // dynamic set Markdown text
    path : "editor.md/lib/"  // Autoload modules mode, codemirror, marked... dependents libs path
  })
  console.log('init', activeChange, storeChange)
}
const createEditorDom = () => {
  let div = document.createElement('div')
  let textarea = document.createElement('textarea')
  div.id = 'editor'
  textarea.style = "display:none;height:100%"
  textarea.id = 'content'
  div.appendChild(textarea)

  dom.layout.appendChild(div)
}
const renderNewMarkDom = (id) => {
  chrome.storage.sync.get(id, data => {
    createMD(data[id])
  })
}

function loadHandler() {
    initDom()
    initListener()
    chrome.storage.sync.get('nodeList', (data) => {
      createList(data.nodeList)
      renderNewMarkDom(activeId)
    })
}

function clickListener(e) {
  let target = e.target
  if (target.nodeName.toLocaleLowerCase() === 'div') {
    let id = target.id
    if (activeId === id) return
    activeItems[activeId] = false
    activeItems[id] = true
    activeId = id
    let children = ([].slice.call(document.getElementById('selector').children))
    children.forEach(child => {
      let method = child.id === activeId ? 'add' : 'remove'
      child.classList[method]('active')
    })
    chrome.storage.sync.set({'nodeList': activeItems}, function() {
    })
    renderNewMarkDom(activeId)
  }
}

function createList (arr = {}) {
  const len = Object.keys(arr) // {id: isActive | boolean}
  activeItems = arr
  if (len.length === 0) { // empty
    activeItems[0] = true // set defalut
    chrome.storage.sync.set({'nodeList': activeItems}, function() {
      console.log('store nodelist error', arr)
    })
  }

  const fragment = document.createDocumentFragment()
  console.log(activeItems)
  Object.keys(activeItems).forEach((i, idx) => {
    const div = document.createElement('div')
    div.innerText = idx
    div.className = 'selector__item ' 
    if (activeItems[i]) {
      div.className += activeItems[i] ? ' active' : ''
      activeId = i
    }
    div.id = i 
    fragment.appendChild(div)
  })
  dom.selector.appendChild(fragment)
} 

function deleteHandler () {
  let keys = Object.keys(activeItems)
  if (keys.length === 1) return 

  chrome.storage.sync.get('lastCache', function(data) {
    let res = data.lastCache
    let needDelete = undefined
    if (!res || res.length < 1) {
      res = []
    } else if (res.length >= cacheMaxSize) {
      needDelete = res.shift()
    }
    res.push(activeId)
    chrome.storage.sync.set({'lastCache': res}, function() {
    })

    // set new active id
    let deleteChild = document.getElementById(activeId)
    dom.selector.removeChild(deleteChild)

    delete activeItems[activeId]
    activeId = Object.keys(activeItems).pop()
    console.log('ac', activeId)
    activeItems[activeId] = true

    let activeChild = document.getElementById(activeId)
    activeChild.classList.add('active')

    chrome.storage.sync.set({'nodeList': activeItems}, function() {
    })
    console.log(needDelete, typeof needDelete)
    needDelete && chrome.storage.sync.remove(String(needDelete), function() {
    })
    chrome.storage.sync.get(activeId, function(data) {
      createMD(data[activeId])
    })
  })
}

function revertHandler () {
  chrome.storage.sync.get('lastCache', function(data) {
    let res = data.lastCache
    if (!res || res.length < 1) {
      return
    }
    let _active = res.pop()
    activeItems[_active] = true
    activeItems[activeId] = false
    activeId = _active
    chrome.storage.sync.get(activeId, function(data) {
      createMD(data[activeId])
    })
    let children = [].slice.call(document.getElementById('selector').children)
    children.forEach(i => {
      i.classList.remove('active')
    })
    dom.selector.appendChild(addNewDom(activeId, 'selector__item active', children.length))
    chrome.storage.sync.set({'nodeList': activeItems}, function() { })
  })
}

function initListener () {
  dom.selector.addEventListener('click', clickListener)
  dom.newCache.addEventListener('click', newCache)
  dom.delete.addEventListener('click', deleteHandler)
  dom.revert.addEventListener('click', revertHandler)
  chrome.storage.onChanged.addListener((data, area) => {
    console.log(activeChange, storeChange)
    if (area === 'sync' && (activeId in data) && activeChange === storeChange) {
      createMD(data[activeId].newValue)
      storeChange += 1
    }
  })
}

function addNewDom (id, className, content) {
  let div = document.createElement('div')
  div.className = className
  div.id = id
  div.innerText = content
  return div
}

function newCache() {
  activeItems[activeId] = false 
  let _newId = Math.max(...Object.keys(activeItems).map(i => Number(i))) + 1
  activeItems[_newId] = true
  activeId = _newId
  chrome.storage.sync.set({'nodeList': activeItems}, function() {
  })
  createMD('')
  let children = [].slice.call(document.getElementById('selector').children)
  children.forEach(i => {
    i.classList.remove('active')
  })
  dom.selector.appendChild(addNewDom(activeId, 'selector__item active', children.length))
}

// 加入后悔药功能
// 加入防抖功能
// 加入监听功能，来实现多个tab页

window.addEventListener('load', loadHandler);
