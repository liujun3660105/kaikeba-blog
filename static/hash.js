// 引入spark-md5
self.importScripts('spark-md5.min.js');
self.onmessage = e=>{
    const chunks = e.data.chunks;
    const spark = new self.SparkMD5.ArrayBuffer();
    chunks.forEach((chunk,index) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(chunk.file);
        reader.onload = e=>{
            spark.append(e.target.result);
            self.postMessage({
                progress:(100/chunks.length)*index
            })
        }
    });
    self.postMessage({
        progress:100,
        hash:spark.end()
    })
}