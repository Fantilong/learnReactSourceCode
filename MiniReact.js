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

function render(element, container) {
  const dom = element.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(element.type)
  const isProperty = key => key !== 'children'
  Object.keys(element.props).filter(isProperty).forEach(name => dom[name] = element.props[name])

  element.props.children.forEach(child => this.render(child, dom))
  container.appendChild(dom)
}
