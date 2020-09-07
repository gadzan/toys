import ToyReact from './src/toy-react.js';

class MyComponent extends ToyReact.Component {
  render() {
    return <div>
      <h1>Toy React</h1>
      { this.children }
    </div>
  }
}

ToyReact.render(<MyComponent id="a" class="c">
  <div>1.</div>
  <div>2.</div>
  <div>3.</div>
</MyComponent>, document.body);
