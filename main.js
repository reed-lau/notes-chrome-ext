let editor = undefined
let activeId = '0'
let activeItems = {}
let dom = {}
let activeChange = 0
let storeChange = 0
let isInit = false
const cacheMaxSize = 3 //后悔药


const setInputValue = (val) => {
  let input = document.getElementById('current')
  input.value = val
}
const inputEvent = () => {
  const getItems = (activeItems, value) => {
    let newList = {}
    for (let id in activeItems) {
      if (String(activeItems[id].name).indexOf(value) >= 0) {
        newList[id] = activeItems[id]
      } 
    }
    return newList
  }
  let input = document.getElementById('current')
  input.addEventListener('blur', () => {
    setTimeout(() => {
      setInputValue(activeItems[activeId].name)
      createListDom({}, false)
    }, 100)
  })
  input.addEventListener('input', (e) => {
    let value = e.target.value.trim()
    let newList = getItems(activeItems, value)
    if (Object.keys(newList).length <= 0) {
      input.classList.add('current--error')
      createListDom(newList, false)
      return
    }
    createListDom(newList, true)
  })
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      let value = e.target.value.trim()
      let newList = getItems(activeItems, value)
      let ids = Object.keys(newList)
      if (ids[0]) {
        if (ids[0] === activeId) return
        setInputValue(activeItems[ids[0]].name)
        createMD(ids[0])
      } else {
        newCache(e.target.value.trim())
      }
    }
  })
}

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
      chrome.storage.sync.set({[activeId]: content.value}, function() {
        console.log('store', activeId)
        chrome.runtime.sendMessage({
          type: 'update',
          id: activeId
        })
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
    inputEvent()
    chrome.storage.sync.get('nodeList', (data) => {
      createList(data.nodeList)
      setInputValue(data.nodeList[activeId] && data.nodeList[activeId].name || '')
      renderNewMarkDom(activeId)
    })
}

function clickListener (e) {
  let target = e.target
  let targetType = target.nodeName.toLocaleLowerCase()
  if (targetType === 'div') {
    let id = target.id || target.parentNode.id
    if (activeId === id) return
    activeItems[activeId].active = false
    activeItems[id].active = true
    activeId = id
    let children = ([].slice.call(document.getElementById('selector').children))
    children.forEach(child => {
      let method = child.id === activeId ? 'add' : 'remove'
      child.classList[method]('active')
    })
    chrome.storage.sync.set({'nodeList': activeItems}, function() {
    })
    renderNewMarkDom(activeId)
  } else if (targetType === 'img') {
    let id = target.id || target.parentNode.id
    console.log('hhhhh', id)
    deleteHandler(id)
  }
}

function createListDom (activeItems, isNeedRender) {
    if (!isNeedRender) {
    dom.selector.style.visibility = 'hidden'
    return
  }
  while (dom.selector.firstChild) {
    dom.selector.removeChild(dom.selector.firstChild);
  }

  dom.selector.style.visibility = 'visible'
  const fragment = document.createDocumentFragment()
  Object.keys(activeItems).forEach((i, idx) => {
    const div = document.createElement('div')
    const span = document.createElement('div')
    const close = document.createElement('img')
    close.src = './images/close.svg'
    close.className = 'selector__item-delete'
    span.className = 'selector__item-span'
    div.appendChild(span)
    div.appendChild(close)
    span.innerText = activeItems[i].name
    div.className = 'selector__item ' 
    if (activeItems[i].active) {
      div.className += activeItems[i] ? ' active' : ''
      activeId = i
    }
    div.id = i
    div._id = i
    fragment.appendChild(div)
  })
  dom.selector.appendChild(fragment)
}
function createList (arr = {}, isNeedRender = false) {
  const len = Object.keys(arr) // {id: isActive | boolean}
  activeItems = arr
  if (len.length === 0) { // empty
    activeItems[0] = {
      active: true,
      name: 'hello world'
    }
    chrome.storage.sync.set({'nodeList': activeItems}, function() {
      console.log('store nodelist error', arr)
    })
  } else {
    activeId = Object.keys(activeItems).find(id => {
      return activeItems[id].active
    }) || Object.keys(activeItems)[0] || '0'
  }
  createListDom(activeItems ,isNeedRender)
} 

function deleteHandler (id) {
  let keys = Object.keys(activeItems)
  if (keys.length === 1) return 

  chrome.runtime.sendMessage({
    type: 'delete',
    id: id
  })
  chrome.storage.sync.get('lastCache', function(data) {
    let res = data.lastCache
    let needDelete = undefined
    if (!res || res.length < 1) {
      res = []
    } else if (res.length >= cacheMaxSize) {
      needDelete = res.shift()
    }
    res.push({
      id: id,
      name: activeItems[id].name
    })
    chrome.storage.sync.set({'lastCache': res}, function() {
    })

    // set new active id
    let deleteChild = document.getElementById(id)
    dom.selector.removeChild(deleteChild)

    delete activeItems[id]
    if (activeId === id) {
      activeId = Object.keys(activeItems).pop()
      activeItems[activeId].active = true
      let activeChild = document.getElementById(activeId)
      activeChild.classList.add('active')
      chrome.storage.sync.set({'nodeList': activeItems}, function() {
      })

      needDelete && chrome.storage.sync.remove(String(needDelete.id), function() {})
      chrome.storage.sync.get(activeId, function(data) {
        createMD(data[activeId])
      })
    }
  })
}

function revertHandler () {
  chrome.storage.sync.get('lastCache', function(data) {
    let res = data.lastCache
    if (!res || res.length < 1) {
      return
    }
    let _active = res.pop()
    activeItems[_active.id] = {
      active: true,
      name: _active.name
    }
    activeItems[activeId].active = false
    activeId = _active
    chrome.storage.sync.get(activeId, function(data) {
      setInputValue(_active.name)
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
  // dom.newCache.addEventListener('click', newCache)
  // dom.delete.addEventListener('click', deleteHandler)
  dom.revert.addEventListener('click', revertHandler)
  chrome.runtime.onMessage.addListener((request, sender, sendRes) => {
    const _update = (id) => {
      if (id === activeId) {
        location.reload()
      } 
    }
    const _delete = (id) => {
      if (id === activeId) {
        location.reload()
      } else {
        // 移除dom即可
        let newDom = document.getElementById(id)
        newDom && dom.selector.removeChild(newDom)
      }
    }
    const _add = (id) => {
      dom.selector.appendChild(addNewDom(id, 'selector__item active', dom.selector.children.length))
    }
    const dealFunctions = {
      update: _update,
      delete: _delete,
      add: _add
    }
    let type = request.type
    dealFunctions[type](request.id)  
  })
}

function addNewDom (id, className, content) {
  let div = document.createElement('div')
  div.className = className
  div.id = id
  div.innerText = content
  return div
}

function newCache (name) {
  activeItems[activeId].active = false 
  let _newId = Math.max(...Object.keys(activeItems).map(i => Number(i))) + 1
  activeId = _newId
  activeItems[activeId] = {
    active: true,
    name: name
  }
  chrome.storage.sync.set({'nodeList': activeItems}, function() {
    chrome.runtime.sendMessage({
      type: 'add',
      id: activeId
    })
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
