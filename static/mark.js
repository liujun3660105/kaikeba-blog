self.importScripts('marked.min.js');
self.importScripts('highlight.min.js');
// hljs.registerLanguage('javascript',javascript);
self.marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function(code){
    return self.hljs.highlightAuto(code).value
  }
})
self.onmessage = e=>{
    console.log(e);
    const content = e.data.content;
    self.postMessage(self.marked(content));
}
// self.postMessage()