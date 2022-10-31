class MiniReact {
  createElement(tag, attr, children) {

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