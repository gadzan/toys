const RENDER_TO_DOM = Symbol('render to dom');

class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  get vdom() {
    return this.render().vdom
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    // this.render()[RENDER_TO_DOM](range);
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }
  /*
  rerender() {
    let oldRange = this._range;

    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);

    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents();
  }
  */
  update() {
    // Check if node is changed.
    let isSameNode = (previous, latest) => {
      if (previous.type !== latest.type) return false;
      if (Object.keys(latest.props).some(name => latest.props[name] !== previous.props[name])) return false;
      if (Object.keys(previous.props).length > Object.keys(latest.props).length) return false;
      if (latest.type === '#text' && latest.content !== previous.content) return false;
      return true
    }
    let update = (previous, latest) => {
      // type, props, children
      // #text content
      if (!isSameNode(previous, latest)) {
        latest[RENDER_TO_DOM](previous._range);
        return;
      }
      latest._range = previous._range;

      let previousChildren = previous.vchildren;
      let latestChildren = latest.vchildren;

      if (!latestChildren || !latestChildren.length) return;

      let tailRange = previousChildren[previousChildren.length - 1]._range;

      for (let i = 0; i < latestChildren.length; i++) {
        let latestChild = latestChildren[i];
        let previousChild = previousChildren[i];
        if (i < previousChildren.length) {
          update(previousChild, latestChild);
        } else {
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          latestChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    }

    let vdom = this.vdom
    update(this._vdom, vdom);
    this._vdom = vdom
  }

  merge(oldState, newState) {
    for (let p in newState) {
      if(oldState[p] === null || typeof oldState[p] !== 'object') {
        oldState[p] = newState[p];
      } else {
        this.merge(oldState[p], newState[p]);
      }
    }
  }

  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState;
      this.update();
      return;
    }
    this.merge(this.state, newState);
    // this.rerender();
    this.update();
  }
}

class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
    // this.root = document.createElement(type);
  }

  /*
  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
    } else {
      if(name === 'className') {
        this.root.setAttribute('class', value);
      } else {
        this.root.setAttribute(name, value);
      }
    }
  }
  appendChild(component) {
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }
  */

  get vdom() {
    this.vchildren = this.children.map(child => child.vdom);
    return this;
  }

  [RENDER_TO_DOM](range) {
    // range.deleteContents();
    // range.insertNode(this.root);
    this._range = range;
    let root = document.createElement(this.type);
    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLocaleLowerCase()), value);
      } else {
        if (name === 'className') {
          root.setAttribute('class', value);
        } else {
          root.setAttribute(name, value);
        }
      }
    }

    if (!this.vchildren) {
      this.vchildren = this.children.map(child => child.vdom);
    }

    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length)
      child[RENDER_TO_DOM](childRange);
    }

    replaceContent(range, root);
  }
}

class TextWrapper extends Component {
  constructor(content) {
    // this.root = document.createTextNode(content);
    super(content);
    this.type = '#text';
    this.content = content;
  }

  get vdom() {
    return this;
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
    // range.deleteContents();
    // range.insertNode(this.root);
  }
}

function replaceContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);
}

export default {
  Component,

  createElement(type, attributes, ...children) {
    let e;
    if (typeof type === 'string') {
      e = new ElementWrapper(type);
    } else {
      e = new type;
    }
  
    for(let p in attributes) {
      e.setAttribute(p, attributes[p]);
    }
  
    let insertChildren = children => {
      for(let child of children) {
        if (typeof child === 'string') {
          child = new TextWrapper(child);
        }
        if(child === null) continue;
        if((typeof child === 'object') && (child instanceof Array)) {
          insertChildren(child);
        } else {
          e.appendChild(child);
        }
      }
    }
    insertChildren(children);
    return e;
  },

  render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
  }
}