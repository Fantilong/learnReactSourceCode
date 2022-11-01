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
  // TODO add dom node
  if(!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  if(fiber.parent) {
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

    if(index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
  
    prevSibling = newFiber
    index++
  }

  // TODO return next unit of work
  if(fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if(nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}