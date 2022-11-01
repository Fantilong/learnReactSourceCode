const TEXT_ELEMENT = 'TEXT_ELEMENT'

class MiniReact {
  constructor(props){}
  // 创建一个生成 ReactElement 的方法
  createElement(type, props, ...children) {
    /* 
      React 创建 element 的方式
      React.createElement(
        'div',
        {id: 'foo'},
        React.createElement('a', null, 'bar'),
        React.createElement('b'),
      )
    */
   return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : this.createTextElement(child)))
    }
   }
  }
  createTextElement(text) {
    return {
      type: TEXT_ELEMENT,
      props: {
        nodeValue: text,
        children: []
      }
    }
  }
  render(element, container) {
    const dom = element.type === TEXT_ELEMENT ? document.createTextNode('') : document.createElement(element.type)
    const isProperty = key => key !== 'children'
    Object.keys(element.props).filter(isProperty).forEach(name => dom[name] = element.props[name])

    element.props.children.forEach(child => this.render(child, dom))
    container.appendChild(dom)
  }
}

class MiniReactDOM {
  render(el, container) {
    const node = document.createElement(ele.type)
    Object.keys(el.props).filter(name => (name !== 'children')).forEach(name => {
      node[name] = el.props[name]
    })
  }
}