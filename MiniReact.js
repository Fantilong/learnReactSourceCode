const TEXT_ELEMENT = 'TEXT_ELEMENT'

/**
 * @param {String} type 
 * @param {*} props 
 * @param  {...any} children 
 * @returns 
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextElement(child)))
    }
  }
}

/**
 * @param {String} text
 */
function createTextElement(text) {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: []
    }
  }
}

/**
 * 创建DOM
 * @param {*} fiber 
 * @returns 
 */
function createDom(fiber) {
  const dom = fiber.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(fiber.type)
  Object.keys(fiber.props).filter(isProperty).forEach(name => dom[name] = fiber.props[name])

  return dom
}

const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)


/**
 * 更新 dom 属性
 * @param {*} dom 某個 fiber 的 dom 节点
 * @param {*} prevProps 上一轮渲染的 fiber 的属性
 * @param {*} nextProps 本轮渲染的 fiber 的属性
 */
function updateDom(dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent) // 过滤出 event 属性
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key)) // 就属性不存在于新属性中 或 值不相同
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name]) // 清除原有值（即：处理函数）
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps)) // 值不相同
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name]) // 更新值
    })

  // Remove all old properties
  Object.keys(prevProps)
    .filter(isProperty) // 确定是属性，不是 children 或 event 属性 
    .filter(isGone(prevProps, nextProps)) // 属性值不相同
    .forEach(name => dom[name] = '') // 清空属性值

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps)) // 属性值不相同
    .forEach(name => dom[name] = nextProps[name]) // 清空属性值
}

/**
 * 提交根节点
 */
function commitRoot() {
  // TODO add nodes to dom
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot // 存储更新过 fiber 根节点, 下次更新时使用
  wipRoot = null // 清空根节点变量
}

/**
 * 增删改 dom，以一个树杈为节点，一个组件即一个树杈节点
 * 根据 fiber 描述对每一个节点做增、删、改 操作
 * @param {*} fiber 
 */
function commitWork(fiber) {
  if (!fiber) return

  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }

  // 使用 parentDom 做增删改
  const domParent = domParentFiber.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) { // 新增
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) { // 更新
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION') { // 删除
    commitDeletion(fiber, domParent)
    // domParent.removeChild(fiber.dom)
  }

  commitWork(fiber.child) // 递归操作第一个子节点
  commitWork(fiber.sibling) // 递归操作兄弟节点
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }

}


let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

/**
 * 渲染元素到dom上
 * @param {*} element 
 * @param {*} container 
 */
function render(element, container) {
  // const dom = element.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(element.type)
  // const isProperty = key => key !== 'children'
  // Object.keys(element.props).filter(isProperty).forEach(name => dom[name] = element.props[name])

  // element.props.children.forEach(child => this.render(child, dom))
  // container.appendChild(dom)

  // TODO set next unit of work
  // 简写 work in progress (半成品) Root；半成品根节点(wipRoot)

  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }

  deletions = []
  nextUnitOfWork = wipRoot
}


/**
 * 
 * @param {*} deadline 
 */
function workLoop(deadline) {
  let shouldYield = false
  // 存在下一个运行单元，且不是暂停状态
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // 将生成的 dom 渲染到页面上
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)


/**
 * 生成带dom和性质（UPDATE, PLACEMENT, DELETION）的fiber元素，
 * @param {*} fiber 
 * @returns fiber，返回值会重新当成参数传进来使用
 */
function performUnitOfWork(fiber) {
  /**
   * 树状回溯法
   * 在每一个分叉的第一个树杈往下，直到最底层的分叉没有同级，
   * 再开始从同级的第二个开始，最底级的完成再从父级的兄弟开始一次回溯
   * 每一个分支都记录parent, 每一个父级节点都只记录第一个子分叉，
   * 第一个子分叉则记录第二个子分叉，以备回溯，一直回溯到最上层既没有parent,
   * 也没有同级层，懒回调停止
   */

  const isFunctionComponents = fiber.type instanceof Function
  if (isFunctionComponents) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // TODO add dom node
  // if (!fiber.dom) {
  //   fiber.dom = createDom(fiber)
  // }

  // TODO create new fibers
  // const elements = fiber.props.children
  // reconcileChildren(fiber, elements)

  // TODO return next unit of work
  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

/**
 * 
 * @param {*} fiber 
 */
function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

/**
 * 
 * @param {*} fiber 
 */
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  reconcileChildren(fiber, fiber.props.children)
}
/**
 * 将形成一种用 child 和 sibling 表示的父子数据结构 parent => child = firstChild; firstChild => sibling = secondChild; secondChild => sibling = thirdChild; ...
 * mei
 * @param {*} wipFiber 半成品的 fiber 节点
 * @param {*} elements 即： props 中的 children, 也就是日常说的 子组件（存储在 children 属性中，注：是 reactElement 结构的表示法）
 */
function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child // 上一轮渲染的 fiber
  let prevSibling = null

  while (index < elements.length || oldFiber !== null) {
    const element = elements[index] // 本轮要渲染的 element（即将生成该 element 的 fiber）
    let newFiber = null

    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType) {
      // TODO update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        parent: wipFiber,
        dom: oldFiber.dom,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    }

    if (element && !sameType) {
      // TODO add this node
      newFiber = {
        type: element.type,
        props: element.props,
        parent: wipFiber,
        dom: null,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    }

    if (oldFiber && !sameType) {
      // TODO delete the oldFiber's node
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const MiniReact = {
  createElement,
  render,
}

// /** @jsx MiniReact.createElement */
// function App(props) {
//   return <h1>Hi {props.name}</h1>
// }
// const element = <App name="foo" />

// // const element = MiniReact.createElement(
// //   'div',
// //   { id: 'foo' },
// //   MiniReact.createElement('a', null, 'bar'),
// //   MiniReact.createElement('b')
// // )

// const container = document.getElementById('root')

// MiniReact.render(element, container)