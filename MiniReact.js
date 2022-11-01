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
      children: children.map(child => (typeof child === 'object' ? child : this.createTextElement(child)))
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
  const isProperty = key => key !== 'children'
  Object.keys(fiber.props).filter(isProperty).forEach(name => dom[name] = fiber.props[name])

  return dom
}

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
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element]
    }
  }
}

let nextUnitOfWork = null
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

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  /**
   * 树状回溯法
   * 在每一个分叉的第一个树杈往下，直到最底层的分叉没有同级，
   * 再开始从同级的第二个开始，最底级的完成再从父级的兄弟开始一次回溯
   * 每一个分支都记录parent, 每一个父级节点都只记录第一个子分叉，
   * 第一个子分叉则记录第二个子分叉，以备回溯，一直回溯到最上层既没有parent,
   * 也没有同级层，懒回调停止
   */

  // TODO add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  // TODO create new fibers
  const elements = fiber.props.children
  let index = 0
  let prevSibling = null
  while (index < elements.length) {
    const element = elements[index]

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if (index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }

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