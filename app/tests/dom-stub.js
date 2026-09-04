/** 画面コードを Node 上で動かすための最小DOM。ブラウザの代わりではなく、記述ミスの検出用。 */
class StubNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this._text = "";
  }
  get textContent() {
    return this.children.length > 0
      ? this._text + this.children.map((c) => c.textContent).join("")
      : this._text;
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); }
  remove() {}
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  click() { for (const fn of this.listeners.click ?? []) fn(); }
  get firstChild() { return this.children[0] ?? null; }
  getContext() { return null; }
  querySelectorAll(selector) {
    const want = selector.replace(/^\./, "");
    const found = [];
    const walk = (node) => {
      if (node.className.split(" ").includes(want) || node.tagName === selector.toUpperCase()) found.push(node);
      node.children.forEach(walk);
    };
    walk(this);
    return found;
  }
}

export function installDom() {
  const text = (value) => Object.assign(new StubNode("#text"), { _text: String(value) });
  globalThis.document = {
    createElement: (tag) => new StubNode(tag),
    createTextNode: text,
    getElementById: () => null,
    body: new StubNode("body"),
  };
  return StubNode;
}
